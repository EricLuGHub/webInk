from fastapi import APIRouter, Depends

from Requests.CompletionRequest import CompletionRequest
from dependencies import get_prompt_service
from prompt_service import PromptService

prompt_router = APIRouter(prefix="", tags=[])

@prompt_router.post("/prompt")
async def create_badge(completion_prompt : CompletionRequest, svc: PromptService = Depends(get_prompt_service)):
    await svc.create_completion(completion_prompt)
