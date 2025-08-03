from urllib.request import Request


def get_prompt_service(request: Request):
    return request.app.state.prompt_service