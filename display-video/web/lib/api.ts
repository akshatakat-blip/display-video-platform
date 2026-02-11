import { ProblemDetails } from './types';

const API_BASE_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL}/v1`;

export class ApiError extends Error {
  constructor(
    public problemDetails: ProblemDetails,
    message?: string
  ) {
    super(message || problemDetails.detail);
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/problem+json')) {
      const problemDetails: ProblemDetails = await response.json();
      throw new ApiError(problemDetails);
    }
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  if (response.status === 204) {
    return {} as T;
  }
  
  return response.json();
}

export const api = {
  // Partners
  async listPartners() {
    const response = await fetch(`${API_BASE_URL}/partners`);
    return handleResponse(response);
  },
  
  async createPartner(data: { name: string }) {
    const url = `${API_BASE_URL}/partners`;
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Network error';
      throw new ApiError({
        type: 'about:blank',
        title: 'Request failed',
        status: 0,
        code: 'NETWORK_ERROR',
        detail: `Request failed: ${message}. Is the API running at ${url}?`,
      });
    }
    if (!response.ok) {
      const text = await response.text();
      let problemDetails: ProblemDetails = {
        type: 'about:blank',
        title: 'Request failed',
        status: response.status,
        code: String(response.status),
        detail: `HTTP ${response.status}: ${response.statusText}`,
      };
      try {
        const parsed = text ? JSON.parse(text) : null;
        if (parsed && typeof parsed === 'object' && (parsed.detail || parsed.title)) {
          problemDetails = parsed as ProblemDetails;
        } else if (text) {
          problemDetails.detail = `${response.status}: ${text.slice(0, 200)}`;
        }
      } catch {
        if (text) problemDetails.detail = `${response.status}: ${text.slice(0, 200)}`;
      }
      throw new ApiError(problemDetails);
    }
    return response.status === 204 ? ({} as any) : response.json();
  },
  
  async getPartner(partnerId: string) {
    const response = await fetch(`${API_BASE_URL}/partners/${partnerId}`);
    return handleResponse(response);
  },
  
  async updatePartner(partnerId: string, data: Partial<{ name: string }>) {
    const response = await fetch(`${API_BASE_URL}/partners/${partnerId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },
  
  async archivePartner(partnerId: string) {
    const response = await fetch(`${API_BASE_URL}/partners/${partnerId}:archive`, {
      method: 'POST',
    });
    return handleResponse(response);
  },

  // Advertisers
  async listAdvertisers(params?: { partnerId?: string }) {
    const url = new URL(`${API_BASE_URL}/advertisers`);
    if (params?.partnerId) url.searchParams.set('partnerId', params.partnerId);
    const response = await fetch(url.toString());
    return handleResponse(response);
  },
  
  async createAdvertiser(data: { partnerId: string; name: string }) {
    const response = await fetch(`${API_BASE_URL}/advertisers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },
  
  async getAdvertiser(advertiserId: string) {
    const response = await fetch(`${API_BASE_URL}/advertisers/${advertiserId}`);
    return handleResponse(response);
  },
  
  async updateAdvertiser(advertiserId: string, data: Partial<{ name: string }>) {
    const response = await fetch(`${API_BASE_URL}/advertisers/${advertiserId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },
  
  async archiveAdvertiser(advertiserId: string) {
    const response = await fetch(`${API_BASE_URL}/advertisers/${advertiserId}:archive`, {
      method: 'POST',
    });
    return handleResponse(response);
  },

  // Campaigns
  async listCampaigns(params?: { partnerId?: string; advertiserId?: string; q?: string }) {
    const url = new URL(`${API_BASE_URL}/campaigns`);
    if (params?.partnerId) url.searchParams.set('partnerId', params.partnerId);
    if (params?.advertiserId) url.searchParams.set('advertiserId', params.advertiserId);
    if (params?.q) url.searchParams.set('q', params.q);
    const response = await fetch(url.toString());
    return handleResponse(response);
  },
  
  async createCampaign(data: any) {
    const response = await fetch(`${API_BASE_URL}/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },
  
  async getCampaign(campaignId: string) {
    const response = await fetch(`${API_BASE_URL}/campaigns/${campaignId}`);
    return handleResponse(response);
  },
  
  async updateCampaign(campaignId: string, data: any) {
    const response = await fetch(`${API_BASE_URL}/campaigns/${campaignId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },
  
  async activateCampaign(campaignId: string) {
    const response = await fetch(`${API_BASE_URL}/campaigns/${campaignId}:activate`, {
      method: 'POST',
    });
    return handleResponse(response);
  },
  
  async deactivateCampaign(campaignId: string) {
    const response = await fetch(`${API_BASE_URL}/campaigns/${campaignId}:deactivate`, {
      method: 'POST',
    });
    return handleResponse(response);
  },
  
  async archiveCampaign(campaignId: string) {
    const response = await fetch(`${API_BASE_URL}/campaigns/${campaignId}:archive`, {
      method: 'POST',
    });
    return handleResponse(response);
  },

  // Asset Groups
  async listAssetGroups(params?: { campaignId?: string }) {
    const url = new URL(`${API_BASE_URL}/asset-groups`);
    if (params?.campaignId) url.searchParams.set('campaignId', params.campaignId);
    const response = await fetch(url.toString());
    return handleResponse(response);
  },
  
  async createAssetGroup(data: any) {
    const response = await fetch(`${API_BASE_URL}/asset-groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },
  
  async getAssetGroup(assetGroupId: string) {
    const response = await fetch(`${API_BASE_URL}/asset-groups/${assetGroupId}`);
    return handleResponse(response);
  },
  
  async updateAssetGroup(assetGroupId: string, data: any) {
    const response = await fetch(`${API_BASE_URL}/asset-groups/${assetGroupId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },
  
  async archiveAssetGroup(assetGroupId: string) {
    const response = await fetch(`${API_BASE_URL}/asset-groups/${assetGroupId}:archive`, {
      method: 'POST',
    });
    return handleResponse(response);
  },

  // Ads
  async listAds(params?: { assetGroupId?: string }) {
    const url = new URL(`${API_BASE_URL}/ads`);
    if (params?.assetGroupId) url.searchParams.set('assetGroupId', params.assetGroupId);
    const response = await fetch(url.toString());
    return handleResponse(response);
  },

  getAdContentUrl(adId: string): string {
    return `${API_BASE_URL}/ads/${adId}/content`;
  },

  /** Create ad with file (multipart). FormData: assetGroupId, name, adType, inputType, landingUrl?, brandUrl?, sponsoredBy?, ctaText?, trackingTags? (JSON array string), file */
  async createAdFile(formData: FormData) {
    const response = await fetch(`${API_BASE_URL}/ads`, {
      method: 'POST',
      body: formData,
    });
    return handleResponse(response);
  },

  /** Create ad with tag (JSON). Body includes trackingTags (up to 5). */
  async createAdTag(data: {
    assetGroupId: string;
    name: string;
    adType: 'DISPLAY' | 'VIDEO';
    inputType: 'DISPLAY_THIRD_PARTY_TAG' | 'VIDEO_VAST_TAG';
    tagText: string;
    landingUrl?: string;
    brandUrl?: string;
    sponsoredBy?: string;
    ctaText?: string;
    trackingTags?: string[];
  }) {
    const response = await fetch(`${API_BASE_URL}/ads/tag`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  /** Bulk upload: zip + optional manifest. mode = DISPLAY | VIDEO, create = true to create ads. Returns { globalErrors, items: [{ filename, trackingTags, errors }], created? }. */
  async bulkUploadAds(assetGroupId: string, mode: 'DISPLAY' | 'VIDEO', file: File, create: boolean) {
    const formData = new FormData();
    formData.append('assetGroupId', assetGroupId);
    formData.append('mode', mode);
    formData.append('create', String(create));
    formData.append('file', file);
    const response = await fetch(`${API_BASE_URL}/ads/bulk`, {
      method: 'POST',
      body: formData,
    });
    return handleResponse(response);
  },

  async getAd(adId: string) {
    const response = await fetch(`${API_BASE_URL}/ads/${adId}`);
    return handleResponse(response);
  },

  async updateAd(adId: string, data: any) {
    const response = await fetch(`${API_BASE_URL}/ads/${adId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async archiveAd(adId: string) {
    const response = await fetch(`${API_BASE_URL}/ads/${adId}:archive`, {
      method: 'POST',
    });
    return handleResponse(response);
  },

  // Reporting
  async queryReport(data: any) {
    const response = await fetch(`${API_BASE_URL}/reports/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },
};
