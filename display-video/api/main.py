from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.core.errors import install_exception_handlers
from api.routers import (
    ads,
    advertisers,
    asset_groups,
    campaigns,
    partners,
    reports,
)

app = FastAPI(
    title="Display & Video Campaign Manager API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


install_exception_handlers(app)

app.include_router(partners.router, prefix="/v1", tags=["partners"])
app.include_router(advertisers.router, prefix="/v1", tags=["advertisers"])
app.include_router(campaigns.router, prefix="/v1", tags=["campaigns"])
app.include_router(asset_groups.router, prefix="/v1", tags=["asset-groups"])
app.include_router(ads.router, prefix="/v1", tags=["ads"])
app.include_router(reports.router, prefix="/v1", tags=["reports"])
