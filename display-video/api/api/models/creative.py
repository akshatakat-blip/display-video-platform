from __future__ import annotations

import re
from datetime import datetime
from typing import Optional, List, Literal

from pydantic import BaseModel, Field, HttpUrl


CreativeType = Literal[
    "DISPLAY_IMAGE",
    "DISPLAY_THIRD_PARTY_TAG",
    "DISPLAY_HTML5_ZIP",
    "VIDEO_FILE",
    "VIDEO_VAST_TAG",
]

SOURCE_FILE = "FILE"
SOURCE_TAG = "TAG"

# Macros we detect in tag content (for macroTokensDetected)
MACRO_PATTERN = re.compile(
    r"\[APIFRAMEWORKS\]|\[OMIDPARTNER\]|\{clickurl\}|\$\{GDPR\}|\$\{GDPR_CONSENT_755\}|\$\{ADDTL_CONSENT\}|%%CLICK_URL%%|%%CACHEBUSTER%%",
    re.IGNORECASE,
)


def detect_macro_tokens(text: str) -> List[str]:
    return list(dict.fromkeys(MACRO_PATTERN.findall(text)))


class CreativeOut(BaseModel):
    id: str
    advertiserId: str
    creativeType: CreativeType
    source: str  # "FILE" or "TAG"
    name: str
    archived: bool = False
    createdAt: datetime
    updatedAt: datetime
    servingStatus: str = "SERVING"
    servingReasons: List[str] = []
    metadata: dict = Field(default_factory=dict, alias="metadata")
    trackingTags: List[str] = Field(default_factory=list)
    macroTokensDetected: List[str] = Field(default_factory=list)
    contentUrl: Optional[str] = None  # only for file-based creatives

    class Config:
        populate_by_name = True


class CreateDisplayImageCreative(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    filename: str = Field(..., min_length=1, max_length=300)
    width: int = Field(..., ge=1)
    height: int = Field(..., ge=1)


class CreateDisplayThirdPartyTagCreative(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    tag: str = Field(..., min_length=1, max_length=20000)


class CreateDisplayHtml5ZipCreative(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    filename: str = Field(..., min_length=1, max_length=300)


class CreateVideoFileCreative(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    filename: str = Field(..., min_length=1, max_length=300)
    durationSeconds: int = Field(..., ge=1)


class CreateVideoVastTagCreative(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    vastUrl: HttpUrl


# JSON body for tag-based creatives (no file)
class CreateDisplayThirdPartyTagBody(BaseModel):
    advertiserId: str = Field(..., min_length=1)
    tag: str = Field(..., min_length=1, max_length=50000)
    trackingTags: List[str] = Field(default_factory=list, max_length=5)


class CreateVideoVastTagBody(BaseModel):
    advertiserId: str = Field(..., min_length=1)
    vastTag: str = Field(..., min_length=1, max_length=50000)
    trackingTags: List[str] = Field(default_factory=list, max_length=5)


class BulkUploadCreatives(BaseModel):
    items: List[dict] = Field(default_factory=list)
    note: Optional[str] = None
