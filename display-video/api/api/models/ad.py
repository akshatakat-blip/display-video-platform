from __future__ import annotations

from datetime import datetime
from typing import Optional, List, Literal

from pydantic import BaseModel, Field


AdType = Literal["DISPLAY", "VIDEO"]
InputType = Literal[
    "DISPLAY_IMAGE",
    "DISPLAY_HTML5_ZIP",
    "DISPLAY_THIRD_PARTY_TAG",
    "VIDEO_FILE",
    "VIDEO_VAST_TAG",
]


class AdBase(BaseModel):
    assetGroupId: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1, max_length=200)
    adType: AdType = "DISPLAY"
    inputType: InputType = Field(...)
    landingUrl: Optional[str] = None
    brandUrl: Optional[str] = None
    sponsoredBy: Optional[str] = None
    ctaText: Optional[str] = None
    tagText: Optional[str] = None
    filename: Optional[str] = None
    metadata: Optional[dict] = None
    trackingTags: Optional[List[str]] = Field(None, max_length=5)
    substitutedPreview: Optional[str] = None
    generatedVastWrapper: Optional[str] = None


class AdCreate(AdBase):
    pass


class AdUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    assetGroupId: Optional[str] = Field(None, min_length=1)
    adType: Optional[AdType] = None
    inputType: Optional[InputType] = None
    landingUrl: Optional[str] = None
    brandUrl: Optional[str] = None
    sponsoredBy: Optional[str] = None
    ctaText: Optional[str] = None
    tagText: Optional[str] = None
    filename: Optional[str] = None
    metadata: Optional[dict] = None
    trackingTags: Optional[List[str]] = Field(None, max_length=5)
    substitutedPreview: Optional[str] = None
    generatedVastWrapper: Optional[str] = None


class AdOut(AdBase):
    id: str
    archived: bool = False
    createdAt: datetime
    updatedAt: datetime
    servingStatus: str = "NOT_SERVING"
    servingReasons: List[str] = []
    contentUrl: Optional[str] = None  # only for file-based ads


class AdCreateTagBody(BaseModel):
    assetGroupId: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1, max_length=200)
    adType: AdType = "DISPLAY"
    inputType: Literal["DISPLAY_THIRD_PARTY_TAG", "VIDEO_VAST_TAG"] = Field(...)
    tagText: str = Field(..., min_length=1, max_length=50000)
    landingUrl: Optional[str] = None
    brandUrl: Optional[str] = None
    sponsoredBy: Optional[str] = None
    ctaText: Optional[str] = None
    trackingTags: Optional[List[str]] = Field(None, max_length=5)