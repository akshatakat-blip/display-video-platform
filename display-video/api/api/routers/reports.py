from __future__ import annotations

import hashlib
import random
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter
from starlette import status

from api.models.report import ReportQuery, ReportResponse

router = APIRouter()


def _seed_from_query(q: ReportQuery) -> int:
    raw = f"{q.startDate}|{q.endDate}|{q.timeGrain}|{q.metrics}|{q.dimensions}|{sorted(q.filters.items())}|{q.limit}|{q.offset}"
    h = hashlib.sha256(raw.encode("utf-8")).hexdigest()
    return int(h[:16], 16)


def _rand_metric(rng: random.Random, metric: str) -> int:
    if metric == "IMPRESSIONS":
        return rng.randint(1_000, 100_000)
    if metric == "CLICKS":
        return rng.randint(0, 5_000)
    if metric == "SPEND":
        return rng.randint(100, 50_000)  # cents
    return rng.randint(0, 1000)


def _make_row(rng: random.Random, q: ReportQuery, date_value: Optional[str] = None) -> Dict[str, Any]:
    row: Dict[str, Any] = {}
    for d in q.dimensions:
        if d == "DATE":
            row["date"] = date_value or q.startDate
        elif d == "CAMPAIGN_ID":
            row["campaignId"] = f"campaign_{rng.randint(1, 50)}"
        elif d == "ASSET_GROUP_ID":
            row["assetGroupId"] = f"asset_group_{rng.randint(1, 100)}"
        elif d == "AD_ID":
            row["adId"] = f"ad_{rng.randint(1, 200)}"

    for m in q.metrics:
        key = m.lower()
        row[key] = _rand_metric(rng, m)
    return row


@router.post("/reports/query", response_model=ReportResponse, summary="Query reporting (rows + totals + timeSeries)", status_code=status.HTTP_200_OK)
def query_report(body: ReportQuery):
    seed = _seed_from_query(body)
    rng = random.Random(seed)

    rows: List[Dict[str, Any]] = []
    for _ in range(body.limit):
        rows.append(_make_row(rng, body))

    totals: Dict[str, Any] = {}
    for m in body.metrics:
        key = m.lower()
        totals[key] = sum(r.get(key, 0) for r in rows)

    time_series: Optional[List[Dict[str, Any]]] = None
    if body.timeGrain != "NONE":
        # Deterministic pseudo timeSeries: 7 points
        base = datetime(2025, 1, 1, tzinfo=timezone.utc)
        step = {"DAY": 1, "WEEK": 7, "MONTH": 30}[body.timeGrain]
        time_series = []
        for i in range(7):
            dt = base + timedelta(days=i * step)
            date_str = dt.date().isoformat()
            point = _make_row(rng, ReportQuery(**body.model_dump(exclude={"limit", "offset"})), date_value=date_str)
            # Ensure it always has a date key when timeSeries is present
            point.setdefault("date", date_str)
            time_series.append(point)

    return {"rows": rows, "totals": totals, "timeSeries": time_series}
