from fastapi import APIRouter

from app.api import admin, categories, groups, matches, players, teams

api_router = APIRouter()
api_router.include_router(admin.router)
api_router.include_router(categories.router)
api_router.include_router(groups.router)
api_router.include_router(players.router)
api_router.include_router(teams.router)
api_router.include_router(matches.router)
