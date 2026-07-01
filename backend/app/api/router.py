from fastapi import APIRouter

from app.api.routes import auth, oauth, projects, files, chat

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(oauth.router)
api_router.include_router(projects.router)
api_router.include_router(files.router)
api_router.include_router(chat.router)
