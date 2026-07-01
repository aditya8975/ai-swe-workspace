"""initial schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-06-30

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    auth_provider_enum = postgresql.ENUM(
        "local", "google", "github",
        name="authprovider",
        create_type=False
        )
    project_role_enum = postgresql.ENUM(
        "owner", "editor", "viewer",
        name="projectrole",
        create_type=False
        )
    file_type_enum = postgresql.ENUM(
        "file", "folder",
        name="filetype",
        create_type=False
        )
    chat_role_enum = postgresql.ENUM(
        "user", "assistant", "system",
        name="chatrole",
        create_type=False
        )
    chat_action_enum = postgresql.ENUM(
        "chat",
        "explain",
        "generate",
        "refactor",
        "find_bugs",
        "generate_tests",
        "write_docs",
        "optimize",
        name="chataction",
        create_type=False
        )

    

    bind = op.get_bind()
    auth_provider_enum.create(bind, checkfirst=True)
    project_role_enum.create(bind, checkfirst=True)
    file_type_enum.create(bind, checkfirst=True)
    chat_role_enum.create(bind, checkfirst=True)
    chat_action_enum.create(bind, checkfirst=True)

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("hashed_password", sa.String(), nullable=True),
        sa.Column("full_name", sa.String(), nullable=True),
        sa.Column("avatar_url", sa.String(), nullable=True),
        sa.Column("auth_provider", auth_provider_enum, nullable=False, server_default="local"),
        sa.Column("provider_account_id", sa.String(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("is_email_verified", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("is_2fa_enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("totp_secret", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "projects",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("github_repo_url", sa.String(), nullable=True),
        sa.Column("github_default_branch", sa.String(), nullable=True, server_default="main"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "project_members",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("role", project_role_enum, nullable=False, server_default="viewer"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "project_files",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id"), nullable=False),
        sa.Column("parent_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("project_files.id"), nullable=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("type", file_type_enum, nullable=False, server_default="file"),
        sa.Column("content", sa.Text(), nullable=True),
        sa.Column("language", sa.String(), nullable=True),
        sa.Column("size_bytes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "chat_messages",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("file_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("project_files.id"), nullable=True),
        sa.Column("role", chat_role_enum, nullable=False),
        sa.Column("action", chat_action_enum, nullable=False, server_default="chat"),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("chat_messages")
    op.drop_table("project_files")
    op.drop_table("project_members")
    op.drop_table("projects")
    op.drop_table("users")

    bind = op.get_bind()
    postgresql.ENUM(name="chataction").drop(bind, checkfirst=True)
    postgresql.ENUM(name="chatrole").drop(bind, checkfirst=True)
    postgresql.ENUM(name="filetype").drop(bind, checkfirst=True)
    postgresql.ENUM(name="projectrole").drop(bind, checkfirst=True)
    postgresql.ENUM(name="authprovider").drop(bind, checkfirst=True)
