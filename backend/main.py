from contextlib import asynccontextmanager
from fastapi import FastAPI

import prompt_router
from config import Settings
from db import Base, engine, SessionLocal
from prompt_service import PromptService

settings = Settings()


@asynccontextmanager
async def lifespan(app: FastAPI):


    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    app.state.db = db

    app.state.settings = settings
    app.state.prompt_service = PromptService()

    yield

    db.close()

app = FastAPI(
    title="SamozaOS World Interface",
    lifespan=lifespan,
)


app.include_router(prompt_router, prefix="/sap", tags=[])

@app.get("/")
async def root():
    return {"message": "Hello"}

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=True,
    )
