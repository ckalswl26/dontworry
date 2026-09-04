from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import briefing, demo, documents, finance, health, intent, locations, planner, rules, sources
from app.config import get_settings

settings = get_settings()

app = FastAPI(title="Don't Worry / 돈워리 API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=settings.cors_allow_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(intent.router)
app.include_router(rules.router)
app.include_router(documents.router)
app.include_router(finance.router)
app.include_router(finance.products_router)
app.include_router(planner.router)
app.include_router(briefing.router)
app.include_router(sources.router)
app.include_router(demo.router)
app.include_router(locations.router)


@app.get("/")
def root():
    return {"service": "dontworry-api", "status": "ok"}
