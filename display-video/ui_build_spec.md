# UI Build Spec — Display & Video Campaign Manager (Gemini)

## Do exactly this
Build ONLY the frontend using **Next.js (App Router) + TypeScript + Tailwind**.

Hard rules:
- Do NOT invent API endpoints or fields.
- Use the API exactly as described in `openapi.yaml`.
- API base URL: `http://localhost:8000/v1`

## Goal (what the UI should do)
Internal users can:
- Create Partners, Advertisers
- Create Campaigns (no Draft; required fields only)
- Create/Manage Asset Groups, Ads, Creatives
- View Reporting with selectable columns + totals + optional timeseries (hour/day/week/month/year)

Visual requirements:
- Minimalist, professional
- Small fonts, thin lines, dense tables
- Drawers/side-panels for advanced options (Google Ads-like feel)

## Entities
Partner → Advertiser → Campaign → AssetGroup → Ad → Creative  
Single Campaign supports both Display and Video.

## Pages (routes)
Create these pages:
- `/partners` (list + create)
- `/advertisers` (list + create)
- `/campaigns` (list)
- `/campaigns/new` (create)
- `/campaigns/[campaignId]` (detail)
- `/asset-groups/[assetGroupId]` (detail)
- `/creatives` (asset library / upload)
- `/reporting` (workspace)

## Global layout
- Left sidebar nav: Partners, Advertisers, Campaigns, Creatives, Reporting
- Main content: dense table layout

Tailwind styling guidance:
- Base font: `text-xs` / `text-[13px]`
- Section titles: `text-sm font-medium`
- Borders: `border border-slate-200`, `divide-y divide-slate-200`
- Buttons: mostly subtle/outline; primary only for Create/Save
- Status chips: tiny pills

## Shared components (build once)
- DataTable: dense rows, sorting, pagination, row actions
- FilterBar: search + dropdown filters
- Drawer: right-side drawer for “Tags” and “Advanced”
- SidePanel: right-side panel for selecting Audience Segments (tabs First/Third/Custom)
- StatusChips: userStatus + servingStatus + lifecycleStatus
- ValidationBanner: displays API ProblemDetails errors (field + message)

## Required campaign creation fields (NO draft)
Campaign creation must require:
- campaign.name
- campaign.advertiserId
- campaign.dailyBudget (amount+currency OR unlimited=true)
- campaign.billingType (default CPM)
- campaign.advertiserGoal (type + value)
AND it must create an initial asset group:
- initialAssetGroup.name
- initialAssetGroup.defaultBid (amount + currency)

Defaults shown as hints:
- billingType defaults to CPM
- pacing defaults to STANDARD
- biddingMode defaults to MANUAL
- asset group bidding is “defaultBid” only (one field)

## Page details

### /partners
- Table: name, updatedAt
- Actions: Create Partner, Archive Partner

API:
- GET /partners
- POST /partners
- POST /partners/{partnerId}:archive

### /advertisers
- Filters: partnerId
- Table: name, partnerId, updatedAt
- Actions: Create Advertiser, Archive Advertiser

API:
- GET /advertisers?partnerId=
- POST /advertisers
- POST /advertisers/{advertiserId}:archive

### /campaigns
- Filters: partnerId, advertiserId, q
- Table columns: name, advertiserId, objective, userStatus, servingStatus, startDate/endDate, dailyBudget, billingType, updatedAt
- Row actions: Open, Activate, Deactivate, Archive

API:
- GET /campaigns
- POST /campaigns/{campaignId}:activate
- POST /campaigns/{campaignId}:deactivate
- POST /campaigns/{campaignId}:archive

### /campaigns/new
Form sections (simple, not over-engineered):
1) Basics: name, advertiserId, objective, dates
2) Budget/Billing: dailyBudget, billingType, pacing
3) Bidding/KPI: biddingMode, advertiserGoal(type+value)
4) Initial Asset Group: name + defaultBid
(You may include targeting fields as a JSON editor in v1 to keep UI simple; endpoint supports targeting as object.)

Submit:
- POST /campaigns (creates campaign + initial asset group)
Then route to /campaigns/[campaignId]

### /campaigns/[campaignId]
Tabs:
- Overview: show campaign fields + status chips + servingReasons list
- Asset Groups: table of asset groups for the campaign; create new
- Reporting: embedded reporting view scoped to campaignId

API:
- GET /campaigns/{campaignId}
- PATCH /campaigns/{campaignId}
- GET /asset-groups?campaignId=
- POST /asset-groups

### /asset-groups/[assetGroupId]
- Edit: name, defaultBid, delivery settings
- Ads table for this asset group
- Attach creative to ad via creativeId

API:
- GET /asset-groups/{assetGroupId}
- PATCH /asset-groups/{assetGroupId}
- GET /ads?assetGroupId=
- POST /ads
- PATCH /ads/{adId}
- GET /creatives?advertiserId=

### /creatives
- Filters: advertiserId, creativeType
- Create creative flows (v1 can be simple forms):
  - Display image: accept “fileName + fileSize + width + height + mime” (simulate upload)
  - Display third-party tag: textarea
  - Display html5 zip: simulate as file metadata
  - Video file: accept “fileName + fileSize + codec + duration”
  - Video vast tag: textarea
- Tracking tags: up to 5 strings
- Show macroTokensDetected (from backend)

API:
- GET /creatives?advertiserId=&creativeType=
- POST /creatives/display:image
- POST /creatives/display:thirdPartyTag
- POST /creatives/display:html5Zip
- POST /creatives/video:file
- POST /creatives/video:vastTag
- POST /creatives/bulkUpload (stub ok)

Allowed macro tokens ONLY:
[APIFRAMEWORKS], [OMIDPARTNER], {clickurl}, ${GDPR}, ${GDPR_CONSENT_755}, ${ADDTL_CONSENT}

### /reporting
Controls:
- scope: partnerId/advertiserId/campaignId (any combination)
- entityLevel: ADVERTISER|CAMPAIGN|ASSET_GROUP|AD|CREATIVE
- timeGrain: NONE|HOUR|DAY|WEEK|MONTH|YEAR
- dateRange
- columns (pill selector, reorder)
Show:
- rows table
- totals row
- if timeGrain != NONE: show timeSeries section

Definition:
- pageLandPct = landingPageViews / clicks

API:
- POST /reports/query

## Data fetching
Keep it simple:
- use fetch() with a small wrapper
- parse ProblemDetails errors and show in ValidationBanner + inline errors if field is known
