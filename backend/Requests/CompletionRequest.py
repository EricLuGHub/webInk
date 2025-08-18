from pydantic import BaseModel

class ConnectorAuthorizeRequest(BaseModel):
    web_page : str