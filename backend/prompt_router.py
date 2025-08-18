from fastapi import APIRouter, Depends

from Requests.CompletionRequest import ConnectorAuthorizeRequest
from dependencies import get_prompt_service
from prompt_service import PromptService

prompt_router = APIRouter(prefix="", tags=[])

@prompt_router.post("/prompt")
async def create_badge(completion_prompt : ConnectorAuthorizeRequest, svc:  PromptService = Depends(get_prompt_service)):
    svc.create_completion(ConnectorAuthorizeRequest)
