# Manual test: IA and creation flow

## Hierarchy (enforced)

Partner → Advertiser → Campaign → Asset group → Ads

## Test script

### 1) Select partner + advertiser

1. Go to **Partners**. Create a partner if needed.
2. Go to **Advertisers**. Select a partner in the filter (optional). Create an advertiser if needed.
3. Go to **Campaigns**. In the filter, select an **Advertiser**. Confirm the left nav context shows "Advertiser: &lt;name&gt;".
4. Confirm **Create Campaign** is enabled (no longer disabled with "Select an advertiser to create a campaign.").

### 2) Create campaign → auto route to asset group create

1. Click **Create Campaign**. You should land on `/campaigns/new` (Step 1: Campaign details only).
2. Fill campaign name, advertiser, start date (optional), initial asset group name. Click **Save & continue**.
3. After POST succeeds you must be navigated to `/campaigns/{campaignId}/asset-groups/new` (Step 2: Create asset group). Left nav should highlight **Asset groups**.

### 3) Create asset group → auto route to ad create

1. On asset group create page, fill name and default bid. Click **Save & continue**.
2. After POST succeeds you must be navigated to `/asset-groups/{assetGroupId}/ads/new` (Step 3: Create ad). Left nav should highlight **Ads**.

### 4) Create ad → route to ads table; ad create closed

1. On ad create page, fill ad name and content (file or tag). Click **Save & continue** (or submit).
2. After ad is created you must be navigated to **Ads list**: `/ads?assetGroupId={assetGroupId}`. The ad creation screen is closed. The list shows ads for that asset group. Left nav still highlights **Ads**.

### 5) Left nav: list pages only, never embedded forms

1. Click **Campaigns** in the left nav. You must see the **campaign list** (table + Create Campaign). No campaign creation form on this page.
2. Click **Asset groups**. You must see the **asset group list** (table + Create Asset group). No creation form.
3. Click **Ads**. You must see the **ads list** (table + Create Ad). No creation form.
4. **Create** on each list page must navigate to the corresponding `/new` route (campaign → `/campaigns/new`, asset group → `/campaigns/{campaignId}/asset-groups/new`, ad → `/asset-groups/{assetGroupId}/ads/new`) when the required context is selected.

### 6) Left nav context

1. While moving through the 3-step flow (campaign → asset group → ad), the left nav **Context** block must show the current selection: Partner, Advertiser, Campaign, Asset group (names or IDs).
2. After creating an ad and landing on `/ads?assetGroupId=...`, context must show the asset group (and campaign if available).
3. Refresh the page on any list or create page: context should persist (from URL and/or localStorage).

### 7) No right panels; no creation + summary on same view

1. Confirm there is no "right section" panel for ad asset/ad in the main content.
2. Confirm list pages show only the table and Create button (no embedded wizard steps).
3. Confirm asset group "detail" (`/asset-groups/{id}`) redirects to the ads list for that asset group.

### 8) Campaign detail: View ads

1. From **Campaigns** list, click **Open** on a campaign. You see campaign detail (overview, Asset Groups tab, etc.).
2. In the Asset Groups tab, click **View ads** on an asset group row. You must land on **Ads** list filtered by that asset group (`/ads?assetGroupId=...`), not the old combined asset group page.
