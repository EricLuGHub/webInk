from openai import AsyncOpenAI
import os
API_KEY = os.getenv("OPENAI_API_KEY")

import trafilatura
from html import unescape

from Requests.CompletionRequest import CompletionRequest

class PromptService:

    def __init__(self):
        self.client = AsyncOpenAI(api_key=API_KEY)
        with open("examples/prompts/system.txt", "r") as f:
            self.system_prompt = f.read()

    async def create_completion(self, request: CompletionRequest):
        html_content = unescape(request.web_page)

        html_extracted = trafilatura.html2txt(html_content, clean=True)
        completion = await self.client.responses.create(
            model='gpt-4.1',
            instructions=self.system_prompt,
            input=html_extracted,
            temperature=0.5,
        )
        print(completion.usage)
        return completion.text

