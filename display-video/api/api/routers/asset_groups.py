from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from starlette import status

from api.core.ids import new_id
from api.core.store import STORE
from api.core.serving import recompute_all
from api.models.asset_group import AssetGroupCreate, AssetGroupOut, AssetGroupUpdate

router = APIRouter()


@router.get("/asset-groups", response_model=List[AssetGroupOut], summary="List asset groups")
def list_asset_groups(campaignId: Optional[str] = None):
    groups = list(STORE.asset_groups.values())
    if campaignId:
        groups = [g for g in groups if g.get("campaignId") == campaignId]
    return groups


@router.post("/asset-groups", response_model=AssetGroupOut, summary="Create asset group", status_code=status.HTTP_201_CREATED)
def create_asset_group(body: AssetGroupCreate):
    if body.campaignId not in STORE.campaigns:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="campaignId does not exist")

    now = datetime.now(timezone.utc)
    agid = new_id("asset_group")
    raw_bid = body.defaultBid or {"amount": 0, "currency": "USD"}
    default_bid = {"amount": raw_bid.get("amount", 0), "currency": raw_bid.get("currency") or "USD"}
    ag = {
        "id": agid,
        "campaignId": body.campaignId,
        "name": body.name,
        "defaultBid": default_bid,
        "targeting": body.targeting or {},
        "deliverySettings": body.deliverySettings or {},
        "archived": False,
        "createdAt": now,
        "updatedAt": now,
        "servingStatus": "NOT_SERVING",
        "servingReasons": [],
    }
    STORE.asset_groups[agid] = ag
    recompute_all(STORE)
    return ag


@router.get("/asset-groups/{assetGroupId}", response_model=AssetGroupOut, summary="Get asset group")
def get_asset_group(assetGroupId: str):
    ag = STORE.asset_groups.get(assetGroupId)
    if not ag:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset group not found")
    return ag


@router.patch("/asset-groups/{assetGroupId}", response_model=AssetGroupOut, summary="Update asset group")
def update_asset_group(assetGroupId: str, body: AssetGroupUpdate):
    ag = STORE.asset_groups.get(assetGroupId)
    if not ag:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset group not found")

    if body.name is not None:
        ag["name"] = body.name
    if body.defaultBid is not None:
        raw = body.defaultBid
        ag["defaultBid"] = {"amount": raw.get("amount", 0), "currency": raw.get("currency") or "USD"}
    if body.targeting is not None:
        ag["targeting"] = body.targeting
    if body.deliverySettings is not None:
        ag["deliverySettings"] = body.deliverySettings

    ag["updatedAt"] = datetime.now(timezone.utc)
    recompute_all(STORE)
    return ag


@router.post("/asset-groups/{assetGroupId}:archive", response_model=AssetGroupOut, summary="Archive asset group")
def archive_asset_group(assetGroupId: str):
    ag = STORE.asset_groups.get(assetGroupId)
    if not ag:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset group not found")
    ag["archived"] = True
    ag["updatedAt"] = datetime.now(timezone.utc)
    recompute_all(STORE)
    return ag
