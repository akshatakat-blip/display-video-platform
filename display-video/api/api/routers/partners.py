from __future__ import annotations

from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, HTTPException
from starlette import status

from api.core.ids import new_id
from api.core.store import STORE
from api.core.serving import recompute_all
from api.models.partner import PartnerCreate, PartnerOut, PartnerUpdate

router = APIRouter()


@router.get("/partners", response_model=List[PartnerOut], summary="List partners")
def list_partners():
    return list(STORE.partners.values())


@router.post("/partners", response_model=PartnerOut, summary="Create partner", status_code=status.HTTP_201_CREATED)
def create_partner(body: PartnerCreate):
    now = datetime.now(timezone.utc)
    pid = new_id("partner")
    partner = {
        "id": pid,
        "name": body.name,
        "archived": False,
        "createdAt": now,
        "updatedAt": now,
        "servingStatus": "SERVING",
        "servingReasons": [],
    }
    STORE.partners[pid] = partner
    recompute_all(STORE)
    return partner


@router.get("/partners/{partnerId}", response_model=PartnerOut, summary="Get partner")
def get_partner(partnerId: str):
    p = STORE.partners.get(partnerId)
    if not p:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Partner not found")
    return p


@router.patch("/partners/{partnerId}", response_model=PartnerOut, summary="Update partner")
def update_partner(partnerId: str, body: PartnerUpdate):
    p = STORE.partners.get(partnerId)
    if not p:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Partner not found")
    if body.name is not None:
        p["name"] = body.name
    p["updatedAt"] = datetime.now(timezone.utc)
    recompute_all(STORE)
    return p


@router.post("/partners/{partnerId}:archive", response_model=PartnerOut, summary="Archive partner")
def archive_partner(partnerId: str):
    p = STORE.partners.get(partnerId)
    if not p:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Partner not found")
    p["archived"] = True
    p["updatedAt"] = datetime.now(timezone.utc)
    recompute_all(STORE)
    return p
