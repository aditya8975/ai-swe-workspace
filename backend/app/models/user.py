"""
User model — supports email/password auth and OAuth (Google/GitHub).
2FA fields are present but unused until that phase is implemented.
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Boolean, DateTime, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import enum

from app.db.session import Base


class AuthProvider(str, enum.Enum):
    local = "local"
    google = "google"
    github = "github"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=True)  # null if OAuth-only user
    full_name = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)

    auth_provider = Column(Enum(AuthProvider), default=AuthProvider.local, nullable=False)
    provider_account_id = Column(String, nullable=True)  # google/github user id

    is_active = Column(Boolean, default=True, nullable=False)
    is_email_verified = Column(Boolean, default=False, nullable=False)

    # 2FA placeholders (future phase)
    is_2fa_enabled = Column(Boolean, default=False, nullable=False)
    totp_secret = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    projects = relationship("Project", back_populates="owner", cascade="all, delete-orphan")
    memberships = relationship("ProjectMember", back_populates="user", cascade="all, delete-orphan")
