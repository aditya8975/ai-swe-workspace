import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.project import Project
from app.models.project_file import ProjectFile, FileType
from app.models.user import User
from app.schemas.project import FileCreate, FileUpdate, FileOut, FileTreeNode
from app.api.deps import get_current_user
from app.api.routes.projects import _get_owned_project_or_404

router = APIRouter(prefix="/projects/{project_id}/files", tags=["files"])


def _build_tree(files: List[ProjectFile], parent_id: Optional[uuid.UUID] = None) -> List[FileTreeNode]:
    nodes = []
    for f in files:
        if f.parent_id == parent_id:
            node = FileTreeNode(
                id=f.id,
                parent_id=f.parent_id,
                name=f.name,
                type=f.type,
                children=_build_tree(files, f.id),
            )
            nodes.append(node)
    return nodes


@router.get("/tree", response_model=List[FileTreeNode])
def get_file_tree(project_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _get_owned_project_or_404(db, project_id, current_user)
    files = db.query(ProjectFile).filter(ProjectFile.project_id == project_id).all()
    return _build_tree(files, None)


@router.get("", response_model=List[FileOut])
def list_files(project_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Flat list including content — convenient for client-side caching of the whole project."""
    _get_owned_project_or_404(db, project_id, current_user)
    return db.query(ProjectFile).filter(ProjectFile.project_id == project_id).all()


@router.post("", response_model=FileOut, status_code=status.HTTP_201_CREATED)
def create_file(
    project_id: uuid.UUID,
    payload: FileCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_owned_project_or_404(db, project_id, current_user)

    if payload.parent_id:
        parent = db.query(ProjectFile).filter(
            ProjectFile.id == payload.parent_id, ProjectFile.project_id == project_id
        ).first()
        if not parent:
            raise HTTPException(status_code=404, detail="Parent folder not found")
        if parent.type != FileType.folder:
            raise HTTPException(status_code=400, detail="Parent must be a folder")

    content = payload.content if payload.type == FileType.file else None
    file = ProjectFile(
        project_id=project_id,
        parent_id=payload.parent_id,
        name=payload.name,
        type=payload.type,
        content=content,
        language=payload.language,
        size_bytes=len(content.encode()) if content else 0,
    )
    db.add(file)
    db.commit()
    db.refresh(file)
    return file


def _get_file_or_404(db: Session, project_id: uuid.UUID, file_id: uuid.UUID) -> ProjectFile:
    file = db.query(ProjectFile).filter(ProjectFile.id == file_id, ProjectFile.project_id == project_id).first()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    return file


@router.get("/{file_id}", response_model=FileOut)
def get_file(
    project_id: uuid.UUID, file_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    _get_owned_project_or_404(db, project_id, current_user)
    return _get_file_or_404(db, project_id, file_id)


@router.patch("/{file_id}", response_model=FileOut)
def update_file(
    project_id: uuid.UUID,
    file_id: uuid.UUID,
    payload: FileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_owned_project_or_404(db, project_id, current_user)
    file = _get_file_or_404(db, project_id, file_id)

    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(file, field, value)
    if "content" in data and data["content"] is not None:
        file.size_bytes = len(data["content"].encode())

    db.commit()
    db.refresh(file)
    return file


@router.delete("/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_file(
    project_id: uuid.UUID, file_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    _get_owned_project_or_404(db, project_id, current_user)
    file = _get_file_or_404(db, project_id, file_id)
    db.delete(file)
    db.commit()
