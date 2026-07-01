import uuid
from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel

from app.models.project_file import FileType


# ---- Project ----

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    github_repo_url: Optional[str] = None
    github_default_branch: Optional[str] = None


class ProjectOut(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str] = None
    owner_id: uuid.UUID
    github_repo_url: Optional[str] = None
    github_default_branch: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ---- Files ----

class FileCreate(BaseModel):
    name: str
    type: FileType = FileType.file
    parent_id: Optional[uuid.UUID] = None
    content: Optional[str] = ""
    language: Optional[str] = None


class FileUpdate(BaseModel):
    name: Optional[str] = None
    content: Optional[str] = None
    parent_id: Optional[uuid.UUID] = None
    language: Optional[str] = None


class FileOut(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    parent_id: Optional[uuid.UUID] = None
    name: str
    type: FileType
    content: Optional[str] = None
    language: Optional[str] = None
    size_bytes: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class FileTreeNode(BaseModel):
    """Lightweight node used to render the explorer tree (no full content)."""
    id: uuid.UUID
    parent_id: Optional[uuid.UUID] = None
    name: str
    type: FileType
    children: List["FileTreeNode"] = []

    model_config = {"from_attributes": True}
