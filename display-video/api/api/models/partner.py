from __future__ import annotations

from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, Field


class PartnerBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)


class PartnerCreate(PartnerBase):
    pass


class PartnerUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)


class PartnerOut(PartnerBase):
    id: str
    archived: bool = False
    createdAt: datetime
    updatedAt: datetime
    servingStatus: str = "SERVING"
    servingReasons: List[str] = []
