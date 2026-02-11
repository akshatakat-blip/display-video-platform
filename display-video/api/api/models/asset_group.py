from __future__ import annotations

from datetime import datetime
from typing import Optional, List, Any, Dict

from pydantic import BaseModel, Field


class AssetGroupBase(BaseModel):
    campaignId: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1, max_length=200)
    defaultBid: Optional[Dict[str, Any]] = Field(default_factory=lambda: {"amount": 0, "currency": "USD"})
    targeting: Optional[Dict[str, Any]] = None
    deliverySettings: Optional[Dict[str, Any]] = None


class AssetGroupCreate(AssetGroupBase):
    pass


class AssetGroupUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    defaultBid: Optional[Dict[str, Any]] = None
    targeting: Optional[Dict[str, Any]] = None
    deliverySettings: Optional[Dict[str, Any]] = None


class AssetGroupOut(AssetGroupBase):
    id: str
    archived: bool = False
    createdAt: datetime
    updatedAt: datetime
    servingStatus: str = "NOT_SERVING"
    servingReasons: List[str] = []
