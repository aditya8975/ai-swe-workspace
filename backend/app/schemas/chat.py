import uuid
from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel

from app.models.chat_message import ChatRole, ChatAction


class ChatRequest(BaseModel):
    project_id: uuid.UUID
    file_id: Optional[uuid.UUID] = None
    message: str
    action: ChatAction = ChatAction.chat
    # Optional explicit code context (e.g. a selected snippet) overriding the full file
    code_context: Optional[str] = None


class ChatMessageOut(BaseModel):
    id: uuid.UUID
    role: ChatRole
    action: ChatAction
    content: str
    file_id: Optional[uuid.UUID] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatHistoryOut(BaseModel):
    messages: List[ChatMessageOut]
