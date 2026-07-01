"""
OAuth login via Google and GitHub.
Both are free to register as OAuth apps (Google Cloud Console / GitHub Developer Settings).
Flow: frontend redirects to /auth/{provider}/login -> provider -> callback here ->
we create/find the user -> redirect back to frontend with tokens in the URL fragment
(frontend then stores them, same as a normal login).
"""
from authlib.integrations.starlette_client import OAuth
from fastapi import APIRouter, Request, Depends
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models.user import User, AuthProvider
from app.api.routes.auth import _issue_token_pair

router = APIRouter(prefix="/auth", tags=["oauth"])

oauth = OAuth()

oauth.register(
    name="google",
    client_id=settings.GOOGLE_CLIENT_ID,
    client_secret=settings.GOOGLE_CLIENT_SECRET,
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)

oauth.register(
    name="github",
    client_id=settings.GITHUB_CLIENT_ID,
    client_secret=settings.GITHUB_CLIENT_SECRET,
    access_token_url="https://github.com/login/oauth/access_token",
    authorize_url="https://github.com/login/oauth/authorize",
    api_base_url="https://api.github.com/",
    client_kwargs={"scope": "user:email"},
)


def _get_or_create_oauth_user(db: Session, provider: AuthProvider, provider_id: str, email: str, name: str, avatar: str) -> User:
    user = db.query(User).filter(User.email == email).first()
    if user:
        # Link provider info if this email previously registered locally
        user.auth_provider = provider
        user.provider_account_id = provider_id
        user.is_email_verified = True  # OAuth providers verify email themselves
        if not user.avatar_url:
            user.avatar_url = avatar
    else:
        user = User(
            email=email,
            full_name=name,
            avatar_url=avatar,
            auth_provider=provider,
            provider_account_id=provider_id,
            is_email_verified=True,
            hashed_password=None,
        )
        db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/google/login")
async def google_login(request: Request):
    redirect_uri = settings.GOOGLE_REDIRECT_URI
    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.get("/google/callback")
async def google_callback(request: Request, db: Session = Depends(get_db)):
    token = await oauth.google.authorize_access_token(request)
    userinfo = token.get("userinfo") or await oauth.google.parse_id_token(request, token)

    user = _get_or_create_oauth_user(
        db,
        provider=AuthProvider.google,
        provider_id=userinfo["sub"],
        email=userinfo["email"],
        name=userinfo.get("name", ""),
        avatar=userinfo.get("picture", ""),
    )
    token_pair = _issue_token_pair(user)
    redirect_url = (
        f"{settings.FRONTEND_URL}/oauth-callback"
        f"?access_token={token_pair.access_token}&refresh_token={token_pair.refresh_token}"
    )
    return RedirectResponse(redirect_url)


@router.get("/github/login")
async def github_login(request: Request):
    redirect_uri = settings.GITHUB_REDIRECT_URI
    return await oauth.github.authorize_redirect(request, redirect_uri)


@router.get("/github/callback")
async def github_callback(request: Request, db: Session = Depends(get_db)):
    token = await oauth.github.authorize_access_token(request)
    resp = await oauth.github.get("user", token=token)
    profile = resp.json()

    email = profile.get("email")
    if not email:
        # GitHub may not return public email; fetch from /user/emails
        emails_resp = await oauth.github.get("user/emails", token=token)
        emails = emails_resp.json()
        primary = next((e for e in emails if e.get("primary")), emails[0] if emails else None)
        email = primary["email"] if primary else f"{profile['id']}+{profile['login']}@users.noreply.github.com"

    user = _get_or_create_oauth_user(
        db,
        provider=AuthProvider.github,
        provider_id=str(profile["id"]),
        email=email,
        name=profile.get("name") or profile.get("login", ""),
        avatar=profile.get("avatar_url", ""),
    )
    token_pair = _issue_token_pair(user)
    redirect_url = (
        f"{settings.FRONTEND_URL}/oauth-callback"
        f"?access_token={token_pair.access_token}&refresh_token={token_pair.refresh_token}"
    )
    return RedirectResponse(redirect_url)
