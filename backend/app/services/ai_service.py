"""
AI assistant service, backed by Groq's free-tier API (Llama 3.3 / Mistral models).
Centralizes all prompt engineering for the different assistant actions
(explain, generate, refactor, find_bugs, generate_tests, write_docs, optimize, chat)
so routes stay thin and prompts stay consistent/testable.
"""
from typing import AsyncGenerator, Optional

from groq import AsyncGroq

from app.core.config import settings
from app.models.chat_message import ChatAction

_client: Optional[AsyncGroq] = None


def get_groq_client() -> AsyncGroq:
    global _client
    if _client is None:
        if not settings.GROQ_API_KEY:
            raise RuntimeError(
                "GROQ_API_KEY is not set. Get a free key at https://console.groq.com/keys "
                "and add it to your .env file."
            )
        _client = AsyncGroq(api_key=settings.GROQ_API_KEY)
    return _client


SYSTEM_PROMPTS: dict[ChatAction, str] = {
    ChatAction.chat: (
        "You are an expert AI pair-programming assistant embedded in a code editor. "
        "Be concise, accurate, and practical. When you show code, use fenced code blocks "
        "with the correct language tag."
    ),
    ChatAction.explain: (
        "You are a senior engineer explaining code to a teammate. Explain what the given code "
        "does, how it works, and call out any non-obvious behavior or edge cases. Be clear and concise."
    ),
    ChatAction.generate: (
        "You are an expert software engineer. Generate clean, correct, well-structured code "
        "for the user's request. Include brief inline comments only where they add real value. "
        "Output the code in a single fenced code block with the correct language tag, "
        "followed by a short explanation if useful."
    ),
    ChatAction.refactor: (
        "You are a senior engineer doing a code review and refactor. Improve readability, "
        "structure, and adherence to best practices WITHOUT changing external behavior. "
        "Return the refactored code in a fenced code block, then a short bullet list of what changed and why."
    ),
    ChatAction.find_bugs: (
        "You are a meticulous code reviewer focused on finding bugs, edge cases, race conditions, "
        "security issues, and logic errors. List each issue found with: severity, location, "
        "explanation, and a suggested fix. If no bugs are found, say so explicitly and explain why "
        "the code looks correct."
    ),
    ChatAction.generate_tests: (
        "You are an expert in test-driven development. Write thorough unit tests for the given code, "
        "covering happy paths, edge cases, and error conditions. Infer the appropriate testing "
        "framework from the language (e.g. pytest for Python, Jest for TypeScript/JavaScript) unless "
        "told otherwise. Return tests in a single fenced code block."
    ),
    ChatAction.write_docs: (
        "You are a technical writer embedded with the engineering team. Write clear documentation "
        "for the given code: docstrings/comments where appropriate, plus a short markdown summary "
        "of purpose, parameters, return values, and usage examples."
    ),
    ChatAction.optimize: (
        "You are a performance engineer. Analyze the given code for performance issues "
        "(time complexity, unnecessary allocations, N+1 queries, blocking I/O, etc.) and provide "
        "an optimized version in a fenced code block, followed by a short explanation of the "
        "performance impact of each change."
    ),
}


def _build_user_prompt(action: ChatAction, message: str, code_context: Optional[str], language: Optional[str]) -> str:
    if not code_context:
        return message

    lang_tag = language or ""
    code_block = f"```{lang_tag}\n{code_context}\n```"

    if action == ChatAction.chat:
        return f"{message}\n\nRelevant code:\n{code_block}"

    # For action-specific prompts, the code is the primary subject; `message` is
    # additional user instruction/context (often empty).
    extra = f"\n\nAdditional instructions from the user: {message}" if message.strip() else ""
    return f"Here is the code:\n{code_block}{extra}"


async def stream_ai_response(
    action: ChatAction,
    message: str,
    code_context: Optional[str] = None,
    language: Optional[str] = None,
    history: Optional[list[dict]] = None,
) -> AsyncGenerator[str, None]:
    """
    Yields response text chunks as they arrive from Groq.
    `history` is a list of {"role": "user"|"assistant", "content": str} for multi-turn chat context.
    """
    client = get_groq_client()

    messages = [{"role": "system", "content": SYSTEM_PROMPTS[action]}]
    if history:
        messages.extend(history)
    messages.append({"role": "user", "content": _build_user_prompt(action, message, code_context, language)})

    stream = await client.chat.completions.create(
        model=settings.GROQ_MODEL,
        messages=messages,
        temperature=0.3,
        max_tokens=4096,
        stream=True,
    )

    async for chunk in stream:
        delta = chunk.choices[0].delta.content
        if delta:
            yield delta
