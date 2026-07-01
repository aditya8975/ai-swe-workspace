import uuid
from datetime import datetime, timezone
import enum

from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Enum, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.session import Base


class FileType(str, enum.Enum):
    file = "file"
    folder = "folder"


class ProjectFile(Base):
    """
    A single node (file or folder) in a project's virtual file tree.
    Self-referential parent_id builds the explorer hierarchy.
    Content is stored directly in Postgres (fine for a portfolio-scale app;
    swap for S3/object storage later if file sizes grow).
    """
    __tablename__ = "project_files"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    parent_id = Column(UUID(as_uuid=True), ForeignKey("project_files.id"), nullable=True)

    name = Column(String, nullable=False)
    type = Column(Enum(FileType), nullable=False, default=FileType.file)
    content = Column(Text, nullable=True)  # null for folders
    language = Column(String, nullable=True)  # e.g. "python", "typescript" — drives Monaco syntax highlight

    size_bytes = Column(Integer, default=0)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    project = relationship("Project", back_populates="files")
    children = relationship("ProjectFile", backref="parent", remote_side=[id], cascade="all, delete-orphan", single_parent=True)
