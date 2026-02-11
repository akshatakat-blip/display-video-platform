from __future__ import annotations

from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, Field


class AdvertiserBase(BaseModel):
    partnerId: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1, max_length=200)


class AdvertiserCreate(AdvertiserBase):
    pass


class AdvertiserUpdate(BaseModel):
    partnerId: Optional[str] = Field(None, min_length=1)
    name: Optional[str] = Field(None, min_length=1, max_length=200)


class AdvertiserOut(AdvertiserBase):
    id: str
    archived: bool = False
    createdAt: datetime
    updatedAt: datetime
    servingStatus: str = "SERVING"
    servingReasons: List[str] = []
