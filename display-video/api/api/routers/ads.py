from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse, Response
from starlette import status

from api.core.ids import new_id
from api.core.serving import recompute_all
from api.core.store import STORE
from api.models.ad import AdCreateTagBody, AdOut, AdUpdate
from api.validators.ad_validator import (
    extract_display_image_metadata,
    extract_video_metadata_demo,
    generate_vast_wrapper_demo,
    get_image_dimensions_from_bytes,
    parse_bulk_display_zip,
    parse_bulk_video_zip,
    substitute_macros,
    validate_dcm_tag,
    validate_display_image,
    validate_html5_zip,
    validate_tracking_tags,
    validate_vast_tag,
    validate_video_file,
)

CONTENT_BASE = "http://localhost:8000/v1"

router = APIRouter()


def _problem_details(status_code: int, detail: str, errors: Optional[list] = None):
    payload = {"type": "about:blank", "title": "Validation Error", "status": status_code, "detail": detail, "code": "VALIDATION_ERROR"}
    if errors:
        payload["errors"] = errors
    return JSONResponse(status_code=status_code, content=payload, media_type="application/problem+json")


def _ad_to_out(ad: dict) -> AdOut:
    adid = ad["id"]
    content_url = f"{CONTENT_BASE}/ads/{adid}/content" if adid in STORE.ad_content else None
    return AdOut(
        id=ad["id"],
        assetGroupId=ad["assetGroupId"],
        name=ad["name"],
        adType=ad.get("adType", "DISPLAY"),
        inputType=ad.get("inputType", "DISPLAY_IMAGE"),
        landingUrl=ad.get("landingUrl"),
        brandUrl=ad.get("brandUrl"),
        sponsoredBy=ad.get("sponsoredBy"),
        ctaText=ad.get("ctaText"),
        tagText=ad.get("tagText"),
        filename=ad.get("filename"),
        metadata=ad.get("metadata"),
        trackingTags=ad.get("trackingTags"),
        substitutedPreview=ad.get("substitutedPreview"),
        generatedVastWrapper=ad.get("generatedVastWrapper"),
        archived=ad.get("archived", False),
        createdAt=ad["createdAt"],
        updatedAt=ad["updatedAt"],
        servingStatus=ad.get("servingStatus", "NOT_SERVING"),
        servingReasons=ad.get("servingReasons", []),
        contentUrl=content_url,
    )


@router.get("/ads", response_model=List[AdOut], summary="List ads")
def list_ads(assetGroupId: Optional[str] = None):
    ads = list(STORE.ads.values())
    if assetGroupId:
        ads = [a for a in ads if a.get("assetGroupId") == assetGroupId]
    return [_ad_to_out(a) for a in ads]


def _parse_tracking_tags(tags_form: Optional[str]) -> List[str]:
    if not tags_form or not tags_form.strip():
        return []
    try:
        parsed = json.loads(tags_form)
        if isinstance(parsed, list):
            return [str(x).strip() for x in parsed if str(x).strip()][:5]
        return []
    except Exception:
        return []


@router.post("/ads", response_model=AdOut, summary="Create ad (file-based, multipart)", status_code=status.HTTP_201_CREATED)
async def create_ad_file(
    assetGroupId: str = Form(..., min_length=1),
    name: str = Form(..., min_length=1, max_length=200),
    adType: str = Form("DISPLAY"),
    inputType: str = Form(...),
    landingUrl: Optional[str] = Form(None),
    brandUrl: Optional[str] = Form(None),
    sponsoredBy: Optional[str] = Form(None),
    ctaText: Optional[str] = Form(None),
    trackingTags: Optional[str] = Form(None),
    file: UploadFile = File(...),
):
    if assetGroupId not in STORE.asset_groups:
        return _problem_details(400, "assetGroupId does not exist", [{"field": "assetGroupId", "message": "Asset group not found."}])
    if adType not in ("DISPLAY", "VIDEO"):
        return _problem_details(400, "Invalid adType", [{"field": "adType", "message": "adType must be DISPLAY or VIDEO."}])
    valid_input: List[str] = ["DISPLAY_IMAGE", "DISPLAY_HTML5_ZIP", "VIDEO_FILE"]
    if inputType not in valid_input:
        return _problem_details(400, "Invalid inputType", [{"field": "inputType", "message": f"inputType for file must be one of {valid_input}."}])

    tags_list = _parse_tracking_tags(trackingTags)
    ok, errs = validate_tracking_tags(tags_list)
    if not ok:
        return _problem_details(400, "Invalid tracking tags", errs)

    bytes_data = await file.read()
    content_type = file.content_type or ("video/mp4" if inputType == "VIDEO_FILE" else "image/png")
    filename = file.filename or "file"

    if inputType == "DISPLAY_IMAGE":
        dims = get_image_dimensions_from_bytes(bytes_data)
        w, h = (dims[0], dims[1]) if dims else (None, None)
        ok, errs = validate_display_image(content_type, filename, len(bytes_data), w, h)
        if not ok:
            return _problem_details(400, "Display image validation failed", errs)
        meta = extract_display_image_metadata(bytes_data, content_type, filename)
        # Stitch tracking: substituted preview with macro-substituted tracking tags
        stitched_parts = []
        for t in tags_list:
            if t.strip():
                stitched_parts.append(substitute_macros(t.strip()))
        stitched = "\n".join(stitched_parts) if stitched_parts else None
        vast = None
    elif inputType == "DISPLAY_HTML5_ZIP":
        ok, errs = validate_html5_zip(filename, len(bytes_data))
        if not ok:
            return _problem_details(400, "HTML5 ZIP validation failed", errs)
        meta = {"fileType": content_type, "fileSizeBytes": len(bytes_data), "assetUrl": None, "filename": filename}
        stitched = None
        vast = None
    elif inputType == "VIDEO_FILE":
        ok, errs = validate_video_file(filename, content_type, len(bytes_data))
        if not ok:
            return _problem_details(400, "Video file validation failed", errs)
        meta = extract_video_metadata_demo(bytes_data, filename)
        vast = None  # set below after we have adid
        stitched = None
    else:
        meta = {}
        stitched = None
        vast = None

    now = datetime.now(timezone.utc)
    adid = new_id("ad")
    if inputType == "VIDEO_FILE":
        content_url = f"{CONTENT_BASE}/ads/{adid}/content"
        vast = generate_vast_wrapper_demo(content_url, tags_list)
    ad = {
        "id": adid,
        "assetGroupId": assetGroupId,
        "name": name,
        "adType": adType,
        "inputType": inputType,
        "landingUrl": landingUrl,
        "brandUrl": brandUrl,
        "sponsoredBy": sponsoredBy,
        "ctaText": ctaText,
        "tagText": None,
        "filename": filename,
        "metadata": meta,
        "trackingTags": tags_list,
        "substitutedPreview": stitched,
        "generatedVastWrapper": vast,
        "archived": False,
        "createdAt": now,
        "updatedAt": now,
        "servingStatus": "NOT_SERVING",
        "servingReasons": [],
    }
    STORE.ads[adid] = ad
    STORE.ad_content[adid] = (bytes_data, content_type)
    recompute_all(STORE)
    return _ad_to_out(ad)


@router.post("/ads/tag", response_model=AdOut, summary="Create ad (tag-based, JSON)", status_code=status.HTTP_201_CREATED)
def create_ad_tag(body: AdCreateTagBody):
    if body.assetGroupId not in STORE.asset_groups:
        return _problem_details(400, "Asset group not found", [{"field": "assetGroupId", "message": "Asset group does not exist."}])
    tags_list = body.trackingTags or []
    ok, errs = validate_tracking_tags(tags_list)
    if not ok:
        return _problem_details(400, "Invalid tracking tags", errs)
    if body.inputType == "DISPLAY_THIRD_PARTY_TAG":
        ok, errs = validate_dcm_tag(body.tagText)
        if not ok:
            return _problem_details(400, "DCM tag validation failed", errs)
        substituted = substitute_macros(body.tagText)
    else:
        ok, errs = validate_vast_tag(body.tagText)
        if not ok:
            return _problem_details(400, "VAST tag validation failed", errs)
        substituted = substitute_macros(body.tagText)
    now = datetime.now(timezone.utc)
    adid = new_id("ad")
    ad = {
        "id": adid,
        "assetGroupId": body.assetGroupId,
        "name": body.name,
        "adType": body.adType,
        "inputType": body.inputType,
        "landingUrl": body.landingUrl,
        "brandUrl": body.brandUrl,
        "sponsoredBy": body.sponsoredBy,
        "ctaText": body.ctaText,
        "tagText": body.tagText,
        "filename": None,
        "metadata": {},
        "trackingTags": tags_list,
        "substitutedPreview": substituted,
        "generatedVastWrapper": None,
        "archived": False,
        "createdAt": now,
        "updatedAt": now,
        "servingStatus": "NOT_SERVING",
        "servingReasons": [],
    }
    STORE.ads[adid] = ad
    recompute_all(STORE)
    return _ad_to_out(ad)


@router.post("/ads/bulk", summary="Bulk upload (zip + optional manifest); parse and optionally create ads")
async def bulk_upload_ads(
    assetGroupId: str = Form(..., min_length=1),
    mode: str = Form(...),  # DISPLAY | VIDEO
    create: bool = Form(False),
    file: UploadFile = File(...),
):
    if assetGroupId not in STORE.asset_groups:
        return _problem_details(400, "Asset group not found", [{"field": "assetGroupId", "message": "Asset group does not exist."}])
    if mode not in ("DISPLAY", "VIDEO"):
        return _problem_details(400, "Invalid mode", [{"field": "mode", "message": "mode must be DISPLAY or VIDEO."}])
    if not file.filename or not file.filename.lower().endswith(".zip"):
        return _problem_details(400, "Bulk upload requires a ZIP file", [{"field": "file", "message": "Upload a .zip file."}])

    zip_bytes = await file.read()
    if mode == "DISPLAY":
        parsed, global_errors = parse_bulk_display_zip(zip_bytes)
    else:
        parsed, global_errors = parse_bulk_video_zip(zip_bytes)

    # Build response items (no raw bytes)
    items = [
        {
            "filename": p["filename"],
            "trackingTags": p.get("trackingTags", []),
            "errors": p.get("errors", []),
        }
        for p in parsed
    ]
    response: dict = {"globalErrors": global_errors, "items": items}

    if create and not global_errors and all(not p.get("errors") for p in parsed):
        created = []
        for p in parsed:
            name = p["filename"].rsplit(".", 1)[0] if "." in p["filename"] else p["filename"]
            ad_type = "DISPLAY" if mode == "DISPLAY" else "VIDEO"
            input_type = "DISPLAY_IMAGE" if mode == "DISPLAY" else "VIDEO_FILE"
            now = datetime.now(timezone.utc)
            adid = new_id("ad")
            meta = extract_display_image_metadata(p["bytes"], p["contentType"], p["filename"]) if mode == "DISPLAY" else extract_video_metadata_demo(p["bytes"], p["filename"])
            vast = None
            if mode == "VIDEO":
                content_url = f"{CONTENT_BASE}/ads/{adid}/content"
                vast = generate_vast_wrapper_demo(content_url, p.get("trackingTags"))
            ad = {
                "id": adid,
                "assetGroupId": assetGroupId,
                "name": name,
                "adType": ad_type,
                "inputType": input_type,
                "landingUrl": None,
                "brandUrl": None,
                "sponsoredBy": None,
                "ctaText": None,
                "tagText": None,
                "filename": p["filename"],
                "metadata": meta,
                "trackingTags": p.get("trackingTags", []),
                "substitutedPreview": None,
                "generatedVastWrapper": vast,
                "archived": False,
                "createdAt": now,
                "updatedAt": now,
                "servingStatus": "NOT_SERVING",
                "servingReasons": [],
            }
            STORE.ads[adid] = ad
            STORE.ad_content[adid] = (p["bytes"], p["contentType"])
            created.append(_ad_to_out(ad))
        response["created"] = [c.model_dump() for c in created]
        recompute_all(STORE)
    return response


@router.get("/ads/{adId}/content", summary="Get ad file bytes")
def get_ad_content(adId: str):
    if adId not in STORE.ads:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ad not found")
    if adId not in STORE.ad_content:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No content for this ad")
    data, content_type = STORE.ad_content[adId]
    return Response(content=data, media_type=content_type)


@router.get("/ads/{adId}", response_model=AdOut, summary="Get ad")
def get_ad(adId: str):
    ad = STORE.ads.get(adId)
    if not ad:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ad not found")
    return _ad_to_out(ad)


@router.patch("/ads/{adId}", response_model=AdOut, summary="Update ad")
def update_ad(adId: str, body: AdUpdate):
    ad = STORE.ads.get(adId)
    if not ad:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ad not found")

    updates = body.model_dump(exclude_unset=True)
    if "assetGroupId" in updates:
        if updates["assetGroupId"] not in STORE.asset_groups:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="assetGroupId does not exist")
        ad["assetGroupId"] = updates["assetGroupId"]
    for key in ("name", "adType", "inputType", "landingUrl", "brandUrl", "sponsoredBy", "ctaText", "tagText", "filename", "metadata"):
        if key in updates:
            ad[key] = updates[key]

    ad["updatedAt"] = datetime.now(timezone.utc)
    recompute_all(STORE)
    return _ad_to_out(ad)


@router.post("/ads/{adId}:archive", response_model=AdOut, summary="Archive ad")
def archive_ad(adId: str):
    ad = STORE.ads.get(adId)
    if not ad:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ad not found")
    ad["archived"] = True
    ad["updatedAt"] = datetime.now(timezone.utc)
    recompute_all(STORE)
    return _ad_to_out(ad)
