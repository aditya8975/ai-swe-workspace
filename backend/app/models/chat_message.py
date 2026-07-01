import uuid
from datetime import datetime, timezone
import enum

from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.session import Base


class ChatRole(str, enum.Enum):
    user = "user"
    assistant = "assistant"
    system = "system"


class ChatAction(str, enum.Enum):
    chat = "chat"
    explain = "explain"
    generate = "generate"
    refactor = "refactor"
    find_bugs = "find_bugs"
    generate_tests = "generate_tests"
    write_docs = "write_docs"
    optimize = "optimize"


class ChatMessage(Base):
    """Stores AI assistant conversation history per project, so the chat panel persists."""
    __tablename__ = "chat_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    file_id = Column(UUID(as_uuid=True), ForeignKey("project_files.id"), nullable=True)

    role = Column(Enum(ChatRole), nullable=False)
    action = Column(Enum(ChatAction), default=ChatAction.chat, nullable=False)
    content = Column(Text, nullable=False)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    project = relationship("Project", back_populates="chat_messages")
