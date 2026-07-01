"""
Password hashing and JWT helpers.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional, Literal
import secrets

from jose import jwt, JWTError
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

TokenType = Literal["access", "refresh", "email_verify", "password_reset"]


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_token(subject: str, token_type: TokenType, expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta is None:
        expires_delta = {
            "access": timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
            "refresh": timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
            "email_verify": timedelta(hours=settings.EMAIL_VERIFICATION_EXPIRE_HOURS),
            "password_reset": timedelta(minutes=settings.PASSWORD_RESET_EXPIRE_MINUTES),
        }[token_type]

    now = datetime.now(timezone.utc)
    payload = {
        "sub": subject,
        "type": token_type,
        "iat": now,
        "exp": now + expires_delta,
        "jti": secrets.token_hex(8),  # unique id, useful for revocation lists later
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str, expected_type: Optional[TokenType] = None) -> dict:
    """Raises JWTError (or ValueError for wrong type) on failure."""
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    if expected_type and payload.get("type") != expected_type:
        raise ValueError(f"Expected token type '{expected_type}', got '{payload.get('type')}'")
    return payload


def get_subject_uuid(payload: dict):
    """
    Safely parse the 'sub' claim (a string) into a uuid.UUID for DB lookups
    against UUID primary key columns. Raises ValueError if missing/malformed.
    """
    import uuid as _uuid
    sub = payload.get("sub")
    if sub is None:
        raise ValueError("Token payload missing 'sub' claim")
    return _uuid.UUID(sub)


def generate_totp_secret() -> str:
    """Placeholder hook for future 2FA (TOTP) support — base32 secret generation."""
    import pyotp  # noqa: F401  (only imported if/when 2FA phase is added)
    return pyotp.random_base32()
