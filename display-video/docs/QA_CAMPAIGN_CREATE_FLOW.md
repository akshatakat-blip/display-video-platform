# Manual QA Checklist: Campaign Creation Flow

Use this checklist when verifying the Campaign creation UI/UX changes.

## 1. Title case
- [ ] All visible labels, titles, and button text in the Campaign creation flow use Title Case (first letter of each word capitalized).
- [ ] API field names and request payloads are unchanged.

## 2. Five drawers (order and behavior)
- [ ] Exactly 5 drawers appear in this order: **Campaign Settings**, **Budget And Billing**, **Bidding**, **Targeting**, **Additional Settings**.
- [ ] Only the first drawer (**Campaign Settings**) is open by default.
- [ ] Only one drawer is open at a time; opening a drawer closes the currently open one.

## 3. Campaign Offer mandatory
- [ ] Label is **Campaign Offer** (singular) with a required asterisk (*).
- [ ] Offer modes: **Add To Existing Offer** (typeahead) and **Create New Offer** (text input).
- [ ] Submitting without an offer selected/entered shows validation error and blocks submit.

## 4. Budget tabs before Bidding
- [ ] **Budget And Billing** drawer appears before **Bidding** in the list.
- [ ] Budget drawer has tabs: **Individual Budget** (default), **Shared Budget**, **I/O Budget**.
- [ ] Individual Budget has: Daily Budget ($), Unlimited toggle, Billing Type (CPM default), Pacing (Standard default). Currency is USD with no dropdown.

## 5. Bidding required asterisks
- [ ] **Advertiser Goal** and **Advertiser Goal Value** (or the mapped metric label) show a required indicator (*).
- [ ] Goal mapping logic is unchanged (changing goal updates value defaults; “Use advertiser goal for bidding” still syncs bidding to advertiser goal).

## 6. Targeting default sections
- [ ] No “Basic Targeting” label.
- [ ] By default the Targeting drawer shows: **Locations**, **Ad Properties**, **Inventory Source** (and **Additional Targeting** as a link).

## 7. Pill inputs (Locations and Ad Sizes)
- [ ] **Locations** and **Exclude Locations**: typing a value and pressing **Enter** adds a pill; **X** on a pill removes it; multiple entries supported.
- [ ] **Ad Size**: same pill/chip behavior; chosen sizes appear as pills.

## 8. Aspect ratio checkboxes
- [ ] **Aspect Ratio** is implemented as checkboxes (not a free-text input).
- [ ] Options shown (including duplicates as specified): 1:1, 4:3, 1.91:1, 1:1, 4:3, 1.91:1, 16:9, 1.5:1, 1:1, 4:3, 1.91:1.

## 9. Additional Targeting (expand in same drawer)
- [ ] **Additional Targeting** is a clickable link in the Targeting drawer.
- [ ] Clicking it expands content in the same drawer (no navigation).
- [ ] Expanded content shows only **Device Targeting** checkboxes: Desktop, Mobile, Tablet.
- [ ] Parent Publishers, Ad Schedule, and Audience Segments are not shown in this flow.

## 10. Additional Settings (Capping + Bid Adjustments)
- [ ] **Additional Settings** drawer contains **Capping Details** (Impression Limit, Click Limit) and **Bid Adjustments** (Location increase/decrease, Devices, Publisher IDs, Domains, Ad Type, Ad Placement).
- [ ] Capping and Bid Adjustments do not appear inside the Targeting drawer.

## Safety
- [ ] No API endpoint paths or backend field names were changed.
- [ ] Save/Continue still creates the campaign and navigates to asset group creation; only client-side validation was added for Campaign Offer.

## Files changed
- `web/app/campaigns/new/page.tsx` — Campaign creation form: 5-drawer structure, title case, mandatory offer, Budget drawer, Bidding/Targeting/Additional Settings content, pill inputs, aspect ratio checkboxes, serialization of targeting for API.
- `web/components/Sidebar.tsx` — Route-based active state so only one nav item is highlighted (Campaigns vs Asset Groups vs Ads).

## Incremental fixes (latest)
- Campaign Settings: Advertiser row first; Campaign Objective on full-width row below.
- Budget And Billing: Billing Type first, Pacing immediately below; then Daily Budget + Unlimited.
- Bidding: Advertiser Goal and Advertiser Goal Value on same line (2-col); Bidding Goal and Bidding Goal Value on same line (2-col).
- Ad Properties: Aspect ratio options deduped to 1:1, 4:3, 1.91:1, 16:9, 1.5:1; Aspect Ratio, Placement, Type all default-checked on create.
- Additional Targeting (expandable): Domains (pill input), Include Domains checkbox, Domain Tiers (All Tiers, Standard Quality, High Quality), Publisher Ids (pill input), Parent Publishers (pill input), Device Targeting (Desktop/Mobile/Tablet). No Ad Schedule, Audience Segments, or Include Parent Publishers.
- Sidebar: Campaigns active only on `/campaigns` and `/campaigns/[id]`; Asset Groups active on asset-group routes but not when path contains `/ads`; Ads active when path contains `/ads`.
