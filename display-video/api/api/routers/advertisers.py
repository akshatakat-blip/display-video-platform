from __future__ import annotations

from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, HTTPException
from starlette import status

from api.core.ids import new_id
from api.core.store import STORE
from api.core.serving import recompute_all
from api.models.advertiser import AdvertiserCreate, AdvertiserOut, AdvertiserUpdate

router = APIRouter()


@router.get("/advertisers", response_model=List[AdvertiserOut], summary="List advertisers")
def list_advertisers():
    return list(STORE.advertisers.values())


@router.post("/advertisers", response_model=AdvertiserOut, summary="Create advertiser", status_code=status.HTTP_201_CREATED)
def create_advertiser(body: AdvertiserCreate):
    if body.partnerId not in STORE.partners:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="partnerId does not exist")

    now = datetime.now(timezone.utc)
    aid = new_id("advertiser")
    adv = {
        "id": aid,
        "partnerId": body.partnerId,
        "name": body.name,
        "archived": False,
        "createdAt": now,
        "updatedAt": now,
        "servingStatus": "SERVING",
        "servingReasons": [],
    }
    STORE.advertisers[aid] = adv
    recompute_all(STORE)
    return adv


@router.get("/advertisers/{advertiserId}", response_model=AdvertiserOut, summary="Get advertiser")
def get_advertiser(advertiserId: str):
    a = STORE.advertisers.get(advertiserId)
    if not a:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Advertiser not found")
    return a


@router.patch("/advertisers/{advertiserId}", response_model=AdvertiserOut, summary="Update advertiser")
def update_advertiser(advertiserId: str, body: AdvertiserUpdate):
    a = STORE.advertisers.get(advertiserId)
    if not a:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Advertiser not found")

    if body.partnerId is not None:
        if body.partnerId not in STORE.partners:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="partnerId does not exist")
        a["partnerId"] = body.partnerId
    if body.name is not None:
        a["name"] = body.name

    a["updatedAt"] = datetime.now(timezone.utc)
    recompute_all(STORE)
    return a


@router.post("/advertisers/{advertiserId}:archive", response_model=AdvertiserOut, summary="Archive advertiser")
def archive_advertiser(advertiserId: str):
    a = STORE.advertisers.get(advertiserId)
    if not a:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Advertiser not found")
    a["archived"] = True
    a["updatedAt"] = datetime.now(timezone.utc)
    recompute_all(STORE)
    return a
