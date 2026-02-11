from __future__ import annotations

from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, HTTPException
from starlette import status

from api.core.ids import new_id
from api.core.store import STORE
from api.core.serving import recompute_all
from api.models.campaign import CampaignCreate, CampaignCreateOut, CampaignOut, CampaignUpdate

router = APIRouter()


@router.get("/campaigns", response_model=List[CampaignOut], summary="List campaigns")
def list_campaigns():
    return list(STORE.campaigns.values())


@router.post("/campaigns", response_model=CampaignCreateOut, summary="Create campaign", status_code=status.HTTP_201_CREATED)
def create_campaign(body: CampaignCreate):
    if body.advertiserId not in STORE.advertisers:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="advertiserId does not exist")

    now = datetime.now(timezone.utc)
    cid = new_id("campaign")
    campaign = {
        "id": cid,
        "advertiserId": body.advertiserId,
        "name": body.name,
        "startDate": body.startDate,
        "endDate": body.endDate,
        "targeting": body.targeting or {},
        "status": "DRAFT",
        "archived": False,
        "createdAt": now,
        "updatedAt": now,
        "servingStatus": "NOT_SERVING",
        "servingReasons": [],
    }
    STORE.campaigns[cid] = campaign
    recompute_all(STORE)
    return campaign


@router.get("/campaigns/{campaignId}", response_model=CampaignOut, summary="Get campaign")
def get_campaign(campaignId: str):
    c = STORE.campaigns.get(campaignId)
    if not c:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    return c


@router.patch("/campaigns/{campaignId}", response_model=CampaignOut, summary="Update campaign")
def update_campaign(campaignId: str, body: CampaignUpdate):
    c = STORE.campaigns.get(campaignId)
    if not c:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")

    if body.advertiserId is not None:
        if body.advertiserId not in STORE.advertisers:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="advertiserId does not exist")
        c["advertiserId"] = body.advertiserId
    if body.name is not None:
        c["name"] = body.name
    if body.startDate is not None:
        c["startDate"] = body.startDate
    if body.endDate is not None:
        c["endDate"] = body.endDate
    if body.targeting is not None:
        c["targeting"] = body.targeting

    c["updatedAt"] = datetime.now(timezone.utc)
    recompute_all(STORE)
    return c


@router.post("/campaigns/{campaignId}:activate", response_model=CampaignOut, summary="Activate campaign")
def activate_campaign(campaignId: str):
    c = STORE.campaigns.get(campaignId)
    if not c:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    c["status"] = "ACTIVE"
    c["updatedAt"] = datetime.now(timezone.utc)
    recompute_all(STORE)
    return c


@router.post("/campaigns/{campaignId}:deactivate", response_model=CampaignOut, summary="Deactivate campaign")
def deactivate_campaign(campaignId: str):
    c = STORE.campaigns.get(campaignId)
    if not c:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    c["status"] = "INACTIVE"
    c["updatedAt"] = datetime.now(timezone.utc)
    recompute_all(STORE)
    return c


@router.post("/campaigns/{campaignId}:archive", response_model=CampaignOut, summary="Archive campaign")
def archive_campaign(campaignId: str):
    c = STORE.campaigns.get(campaignId)
    if not c:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    c["archived"] = True
    c["updatedAt"] = datetime.now(timezone.utc)
    recompute_all(STORE)
    return c
