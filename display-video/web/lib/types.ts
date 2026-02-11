export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  code: string;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

export interface Partner {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Advertiser {
  id: string;
  partnerId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Campaign {
  id: string;
  advertiserId: string;
  name: string;
  objective?: string;
  userStatus: 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
  servingStatus: 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'PENDING';
  lifecycleStatus?: 'ACTIVE' | 'ENDED' | 'SCHEDULED';
  servingReasons?: string[];
  startDate?: string;
  endDate?: string;
  dailyBudget?: {
    amount: number;
    currency: string;
    unlimited?: boolean;
  };
  billingType: 'CPM' | 'CPC' | 'CPA';
  pacing?: 'STANDARD' | 'ACCELERATED';
  biddingMode?: 'MANUAL' | 'AUTO';
  advertiserGoal?: {
    type: string;
    value: number;
  };
  targeting?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AssetGroup {
  id: string;
  campaignId: string;
  name: string;
  defaultBid: {
    amount: number;
    currency: string;
  };
  targeting?: Record<string, unknown>;
  deliverySettings?: Record<string, unknown>;
  userStatus?: 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
  servingStatus?: 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'PENDING';
  servingReasons?: string[];
  createdAt: string;
  updatedAt: string;
}

export type AdType = 'DISPLAY' | 'VIDEO';

export type AdInputType =
  | 'DISPLAY_IMAGE'
  | 'DISPLAY_HTML5_ZIP'
  | 'DISPLAY_THIRD_PARTY_TAG'
  | 'VIDEO_FILE'
  | 'VIDEO_VAST_TAG';

export interface Ad {
  id: string;
  assetGroupId: string;
  name: string;
  adType: AdType;
  inputType: AdInputType;
  landingUrl?: string | null;
  brandUrl?: string | null;
  sponsoredBy?: string | null;
  ctaText?: string | null;
  tagText?: string | null;
  filename?: string | null;
  metadata?: Record<string, unknown> | null;
  trackingTags?: string[] | null;
  substitutedPreview?: string | null;
  generatedVastWrapper?: string | null;
  contentUrl?: string | null;
  userStatus?: string;
  servingStatus?: string;
  servingReasons?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ReportRow {
  [key: string]: string | number;
}

export interface ReportTotals {
  [key: string]: number;
}

export interface TimeSeriesDataPoint {
  timestamp: string;
  [key: string]: string | number;
}

export interface ReportQueryResponse {
  rows: ReportRow[];
  totals: ReportTotals;
  timeSeries?: TimeSeriesDataPoint[];
}
