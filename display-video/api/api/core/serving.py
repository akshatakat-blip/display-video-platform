from __future__ import annotations

from typing import Any, Dict, List, Tuple


def _is_archived(entity: Dict[str, Any]) -> bool:
    return bool(entity.get("archived", False))


def compute_serving(entity_type: str, entity: Dict[str, Any], store: Any) -> Tuple[str, List[str]]:
    """
    Demo serving rules:
    - If archived => NOT_SERVING, reason ARCHIVED
    - Campaign:
        - If status != ACTIVE => NOT_SERVING, reason CAMPAIGN_NOT_ACTIVE
        - If advertiserId missing or advertiser archived => NOT_SERVING, reason ADVERTISER_NOT_FOUND/ADVERTISER_ARCHIVED
    - AssetGroup:
        - If campaign missing or campaign not ACTIVE => NOT_SERVING, reason CAMPAIGN_NOT_ACTIVE/CAMPAIGN_NOT_FOUND
        - If no creatives => NOT_SERVING, reason NO_CREATIVES
    - Ad:
        - If assetGroup missing or not serving => NOT_SERVING, reason ASSET_GROUP_NOT_SERVING/ASSET_GROUP_NOT_FOUND
    - Others default SERVING unless archived.
    """
    reasons: List[str] = []
    if _is_archived(entity):
        return "NOT_SERVING", ["ARCHIVED"]

    if entity_type == "campaign":
        if entity.get("status") != "ACTIVE":
            reasons.append("CAMPAIGN_NOT_ACTIVE")

        adv_id = entity.get("advertiserId")
        if not adv_id:
            reasons.append("ADVERTISER_NOT_FOUND")
        else:
            adv = store.advertisers.get(adv_id)
            if not adv:
                reasons.append("ADVERTISER_NOT_FOUND")
            elif _is_archived(adv):
                reasons.append("ADVERTISER_ARCHIVED")

    elif entity_type == "asset_group":
        camp_id = entity.get("campaignId")
        camp = store.campaigns.get(camp_id) if camp_id else None
        if not camp:
            reasons.append("CAMPAIGN_NOT_FOUND")
        else:
            if camp.get("status") != "ACTIVE":
                reasons.append("CAMPAIGN_NOT_ACTIVE")
            if _is_archived(camp):
                reasons.append("CAMPAIGN_ARCHIVED")

        ag_id = entity.get("id")
        ad_count = sum(1 for a in store.ads.values() if a.get("assetGroupId") == ag_id)
        if ad_count == 0:
            reasons.append("NO_ADS")

    elif entity_type == "ad":
        ag_id = entity.get("assetGroupId")
        ag = store.asset_groups.get(ag_id) if ag_id else None
        if not ag:
            reasons.append("ASSET_GROUP_NOT_FOUND")
        else:
            if ag.get("servingStatus") != "SERVING":
                reasons.append("ASSET_GROUP_NOT_SERVING")
            if _is_archived(ag):
                reasons.append("ASSET_GROUP_ARCHIVED")

    status = "SERVING" if len(reasons) == 0 else "NOT_SERVING"
    return status, reasons


def recompute_all(store: Any) -> None:
    # Order matters: campaign -> asset_group -> ad
    for cid, c in list(store.campaigns.items()):
        c["servingStatus"], c["servingReasons"] = compute_serving("campaign", c, store)

    for agid, ag in list(store.asset_groups.items()):
        ag["servingStatus"], ag["servingReasons"] = compute_serving("asset_group", ag, store)

    for adid, ad in list(store.ads.items()):
        ad["servingStatus"], ad["servingReasons"] = compute_serving("ad", ad, store)

    # Partners/Advertisers/Creatives: set SERVING unless archived
    for pid, p in list(store.partners.items()):
        p["servingStatus"], p["servingReasons"] = compute_serving("partner", p, store)

    for aid, a in list(store.advertisers.items()):
        a["servingStatus"], a["servingReasons"] = compute_serving("advertiser", a, store)

