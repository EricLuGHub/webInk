from fastapi import APIRouter, Depends

from dependencies import get_prompt_service

prompt_router = APIRouter(prefix="", tags=[])

@prompt_router.post("/prompt")
async def create_badge(new_badge : object, svc = Depends(get_prompt_service)):
    pass
