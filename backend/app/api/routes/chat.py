import uuid
import json

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.models.chat_message import ChatMessage, ChatRole
from app.models.project_file import ProjectFile
from app.schemas.chat import ChatRequest, ChatMessageOut, ChatHistoryOut
from app.api.deps import get_current_user
from app.api.routes.projects import _get_owned_project_or_404
from app.services.ai_service import stream_ai_response

router = APIRouter(prefix="/ai", tags=["ai"])


@router.get("/projects/{project_id}/history", response_model=ChatHistoryOut)
def get_chat_history(project_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _get_owned_project_or_404(db, project_id, current_user)
    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.project_id == project_id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )
    return ChatHistoryOut(messages=messages)


@router.post("/chat/stream")
async def chat_stream(payload: ChatRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Server-Sent-Events style streaming endpoint. Frontend reads this as a
    plain streaming fetch response (chunked transfer), not requiring a special
    EventSource client, so it works smoothly with React state updates.
    """
    project = _get_owned_project_or_404(db, payload.project_id, current_user)

    code_context = payload.code_context
    language = None
    if payload.file_id and code_context is None:
        file = db.query(ProjectFile).filter(
            ProjectFile.id == payload.file_id, ProjectFile.project_id == project.id
        ).first()
        if not file:
            raise HTTPException(status_code=404, detail="File not found")
        code_context = file.content
        language = file.language

    # Persist the user's message
    user_msg = ChatMessage(
        project_id=project.id,
        user_id=current_user.id,
        file_id=payload.file_id,
        role=ChatRole.user,
        action=payload.action,
        content=payload.message,
    )
    db.add(user_msg)
    db.commit()

    # Pull recent history for multi-turn context (last 10 messages, chat action only)
    recent = (
        db.query(ChatMessage)
        .filter(ChatMessage.project_id == project.id, ChatMessage.action == payload.action)
        .order_by(ChatMessage.created_at.desc())
        .limit(10)
        .all()
    )
    history = [
        {"role": m.role.value, "content": m.content}
        for m in reversed(recent)
        if m.id != user_msg.id
    ]
    user_id = current_user.id
    project_id = project.id


    async def event_generator():
        full_response = ""
        try:
            async for chunk in stream_ai_response(
                action=payload.action,
                message=payload.message,
                code_context=code_context,
                language=language,
                history=history,
            ):
                full_response += chunk
                yield f"data: {json.dumps({'delta': chunk})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            return
        finally:
            if full_response:
                assistant_msg = ChatMessage(
                    project_id=project_id,
                    user_id=user_id,
                    file_id=payload.file_id,
                    role=ChatRole.assistant,
                    action=payload.action,
                    content=full_response,
                )
                db.add(assistant_msg)
                db.commit()
        yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
