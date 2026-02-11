from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


TimeGrain = Literal["NONE", "DAY", "WEEK", "MONTH"]
Metric = Literal["IMPRESSIONS", "CLICKS", "SPEND"]
Dimension = Literal["DATE", "CAMPAIGN_ID", "ASSET_GROUP_ID", "AD_ID"]


class ReportQuery(BaseModel):
    startDate: str = Field(..., min_length=8, max_length=32)
    endDate: str = Field(..., min_length=8, max_length=32)
    timeGrain: TimeGrain = "NONE"
    metrics: List[Metric] = Field(default_factory=lambda: ["IMPRESSIONS"])
    dimensions: List[Dimension] = Field(default_factory=list)
    filters: Dict[str, Any] = Field(default_factory=dict)
    limit: int = Field(100, ge=1, le=1000)
    offset: int = Field(0, ge=0)


class ReportResponse(BaseModel):
    rows: List[Dict[str, Any]]
    totals: Dict[str, Any]
    timeSeries: Optional[List[Dict[str, Any]]] = None
