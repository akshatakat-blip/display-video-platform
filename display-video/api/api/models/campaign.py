from __future__ import annotations

from datetime import datetime, date
from typing import Optional, List, Any, Dict

from pydantic import BaseModel, Field


class CampaignBase(BaseModel):
    advertiserId: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1, max_length=200)
    startDate: Optional[date] = None
    endDate: Optional[date] = None
    targeting: Optional[Dict[str, Any]] = None


class CampaignCreate(CampaignBase):
    pass


class CampaignUpdate(BaseModel):
    advertiserId: Optional[str] = Field(None, min_length=1)
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    startDate: Optional[date] = None
    endDate: Optional[date] = None
    targeting: Optional[Dict[str, Any]] = None


class CampaignOut(CampaignBase):
    id: str
    status: str = "DRAFT"  # DRAFT|ACTIVE|INACTIVE
    archived: bool = False
    createdAt: datetime
    updatedAt: datetime
    servingStatus: str = "NOT_SERVING"
    servingReasons: List[str] = []


class CampaignCreateOut(CampaignOut):
    pass
