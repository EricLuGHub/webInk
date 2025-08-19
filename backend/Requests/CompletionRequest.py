from pydantic import BaseModel

class CompletionRequest(BaseModel):
    web_page : str