'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ValidationBanner from '@/components/ValidationBanner';
import BidAdjustmentRow from '@/components/BidAdjustmentRow';
import { api, ApiError } from '@/lib/api';
import { Advertiser } from '@/lib/types';
import { useSelection } from '@/lib/selection';

const OBJECTIVES = ['Reach', 'Site Engagement', 'Lead Generation', 'Purchase'] as const;

const CONVERSION_BASED_GOALS = ['OPTIMIZE_CONVERSIONS', 'MAXIMIZE_CONVERSION_VALUE', 'MAXIMIZE_CONVERSIONS_MXA'] as const;
const CUSTOM_CONVERSION_EVENT_OPTIONS = ['', 'Add-To-Cart', 'Fill-Form'] as const;

const BIDDING_TYPE_OPTIONS = [
  { value: 'OPTIMIZE_REACH', label: 'Optimize Reach' },
  { value: 'OPTIMIZE_CONVERSIONS', label: 'Optimize Conversions' },
  { value: 'OPTIMIZE_CLICKS', label: 'Optimize Clicks' },
  { value: 'MAXIMIZE_CONVERSION_VALUE', label: 'Maximize Conversion Value' },
  { value: 'MAXIMIZE_CONVERSIONS_MXA', label: 'Maximize Conversions (MXA)' },
] as const;

type BiddingType = (typeof BIDDING_TYPE_OPTIONS)[number]['value'];

const GOAL_MAPPING: Record<
  BiddingType,
  { metric: string; metricLabel: string; unit: '$' | '%'; default: number; helper: string }
> = {
  OPTIMIZE_REACH: { metric: 'vCPM', metricLabel: 'vCPM Goal Value', unit: '$', default: 7, helper: 'Default: Suggested goal value' },
  OPTIMIZE_CONVERSIONS: { metric: 'CPA', metricLabel: 'CPA Goal Value', unit: '$', default: 20, helper: 'Default: Suggested goal value' },
  OPTIMIZE_CLICKS: { metric: 'CPC', metricLabel: 'CPC Goal Value', unit: '$', default: 1, helper: 'Default: Suggested goal value' },
  MAXIMIZE_CONVERSION_VALUE: { metric: 'ROAS', metricLabel: 'ROAS Goal Value', unit: '%', default: 200, helper: 'Default: Suggested goal value' },
  MAXIMIZE_CONVERSIONS_MXA: { metric: 'BID_CAP', metricLabel: 'Bid Cap', unit: '$', default: 3, helper: 'Default: Suggested bid cap' },
};

const EXISTING_OFFERS = ['weight loss', 'insurance', 'autos', 'education'];

const PLACEMENTS = ['Header', 'Footer', 'Below The Article', 'Sidebar', 'Sticky', 'Sticky Footer', 'Sticky Header', 'Slide', 'In Article', 'Sticky Sidebar'] as const;
const AD_TYPES = ['Banner', 'NativeBanner', 'BannerWeb', 'Bannerapp', 'VideoWeb', 'VideoApp'] as const;
const ASPECT_RATIO_OPTIONS = ['1:1', '4:3', '1.91:1', '16:9', '1.5:1'] as const;
const BILLING_TYPES = ['CPM', 'CPC', 'CPA', 'CPA Payout'] as const;
const PACING_OPTIONS = ['Standard', 'Accelerated'] as const;

const CAMPAIGN_DRAWER_IDS = ['campaignSettings', 'budgetAndBilling', 'bidding', 'targeting', 'additionalSettings'] as const;
type CampaignDrawerId = (typeof CAMPAIGN_DRAWER_IDS)[number];

const defaultCampaignTargeting = () => ({
  basicTargeting: {
    locations: [] as string[],
    excludeLocations: [] as string[],
    deviceDesktop: true,
    deviceMobile: true,
    deviceTablet: true,
  },
  adProperty: {
    sizePills: [] as string[],
    aspectRatio: [...(['1:1', '4:3', '1.91:1', '16:9', '1.5:1'] as const)],
    placement: [...PLACEMENTS],
    type: [...AD_TYPES],
  },
  inventorySource: { supplyPartners: [] as string[], sponsorshipDeals: '', privateDeals: '', urlPatternsExclude: '' },
  additionalTargeting: {
    devices: '',
    browserOsAll: true,
    domains: '',
    domainPills: [] as string[],
    includeDomains: false,
    domainTiers: 'All Tiers',
    publisherIds: '',
    publisherIdPills: [] as string[],
    includePageTopics: '',
    parentPublishers: '',
    parentPublisherPills: [] as string[],
    includeParentPublishers: false,
    adSchedule: '',
    audienceSegments: { firstParty: [] as string[], thirdParty: [] as string[], custom: [] as string[] },
  },
  cappingDetails: { impressionLimit: '', clickLimit: '' },
  bidAdjustments: {
    locationType: 'increase' as 'increase' | 'decrease',
    locationValue: '',
    locationPct: '',
    devices: '',
    devicesType: 'increase' as 'increase' | 'decrease',
    devicesPct: '',
    publisherIds: '',
    publisherIdsType: 'increase' as 'increase' | 'decrease',
    publisherIdsPct: '',
    domains: '',
    domainsType: 'increase' as 'increase' | 'decrease',
    domainsPct: '',
    audienceSegments: '',
    audienceSegmentsType: 'increase' as 'increase' | 'decrease',
    audienceSegmentsPct: '',
    adType: '',
    adTypeType: 'increase' as 'increase' | 'decrease',
    adTypePct: '',
    adPlacement: '',
    adPlacementType: 'increase' as 'increase' | 'decrease',
    adPlacementPct: '',
  },
});

export default function NewCampaignPage() {
  const router = useRouter();
  const selection = useSelection();
  const [advertisers, setAdvertisers] = useState<Advertiser[]>([]);
  const [error, setError] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [openDrawer, setOpenDrawer] = useState<CampaignDrawerId | null>('campaignSettings');
  const [showAdditionalTargeting, setShowAdditionalTargeting] = useState(false);
  const [adPropertyErrors, setAdPropertyErrors] = useState<{ aspectRatio?: string; placement?: string; type?: string }>({});
  const [formData, setFormData] = useState({
    name: '',
    advertiserId: '',
    objective: 'Reach' as string,
    startDate: '',
    endDateEnabled: false,
    endDate: '',
    offerMode: 'EXISTING' as 'EXISTING' | 'NEW',
    offerName: '',
    advertiserGoalType: 'OPTIMIZE_REACH' as BiddingType,
    advertiserGoalValue: '7',
    useAdvertiserGoalForBidding: true,
    biddingGoalType: 'OPTIMIZE_REACH' as BiddingType,
    biddingGoalValue: '7',
    targeting: defaultCampaignTargeting(),
    budgetType: 'individual' as 'individual' | 'shared' | 'io',
    dailyBudgetAmount: '',
    dailyBudgetUnlimited: false,
    billingType: 'CPM',
    pacing: 'Standard',
    customConversionEvent: '',
  });

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.listAdvertisers(selection.partnerId ? { partnerId: selection.partnerId } : undefined);
        setAdvertisers(data as Advertiser[]);
      } catch (err) {
        if (err instanceof ApiError) setError(err.problemDetails);
      }
    };
    load();
  }, [selection.partnerId]);

  useEffect(() => {
    if (selection.advertiserId && advertisers.some((a) => a.id === selection.advertiserId)) {
      setFormData((prev) => (prev.advertiserId ? prev : { ...prev, advertiserId: selection.advertiserId! }));
    }
  }, [selection.advertiserId, advertisers]);

  const prevAdvGoalRef = useRef(formData.advertiserGoalType);
  useEffect(() => {
    if (prevAdvGoalRef.current !== formData.advertiserGoalType) {
      prevAdvGoalRef.current = formData.advertiserGoalType;
      const mapping = GOAL_MAPPING[formData.advertiserGoalType];
      if (mapping) {
        setFormData((prev) => ({
          ...prev,
          advertiserGoalValue: String(mapping.default),
          ...(prev.useAdvertiserGoalForBidding
            ? { biddingGoalType: formData.advertiserGoalType, biddingGoalValue: String(mapping.default) }
            : {}),
        }));
      }
    }
  }, [formData.advertiserGoalType]);

  const prevBidGoalRef = useRef(formData.biddingGoalType);
  useEffect(() => {
    if (formData.useAdvertiserGoalForBidding) {
      prevBidGoalRef.current = formData.advertiserGoalType;
      return;
    }
    if (prevBidGoalRef.current !== formData.biddingGoalType) {
      prevBidGoalRef.current = formData.biddingGoalType;
      const mapping = GOAL_MAPPING[formData.biddingGoalType];
      if (mapping) setFormData((prev) => ({ ...prev, biddingGoalValue: String(mapping.default) }));
    }
  }, [formData.biddingGoalType, formData.advertiserGoalType, formData.useAdvertiserGoalForBidding]);

  useEffect(() => {
    if (formData.useAdvertiserGoalForBidding) {
      setFormData((prev) => ({
        ...prev,
        biddingGoalType: prev.advertiserGoalType,
        biddingGoalValue: prev.advertiserGoalValue,
        customConversionEvent: '',
      }));
    }
  }, [formData.useAdvertiserGoalForBidding]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.advertiserId) {
      setError({ detail: 'Select an advertiser.' });
      return;
    }
    const offerNameTrimmed = (formData.offerName || '').trim();
    if (!offerNameTrimmed) {
      setError({ detail: 'Campaign Offer is required. Select or enter an offer.' });
      return;
    }
    const ap = formData.targeting.adProperty;
    const err: { aspectRatio?: string; placement?: string; type?: string } = {};
    if (!ap.aspectRatio?.length) err.aspectRatio = 'Select at least one Aspect Ratio.';
    if (!ap.placement?.length) err.placement = 'Select at least one Ad Placement.';
    if (!ap.type?.length) err.type = 'Select at least one Ad Type.';
    setAdPropertyErrors(err);
    if (Object.keys(err).length) return;
    setSubmitting(true);
    setError(null);
    try {
      const t = formData.targeting;
      const bt = t.basicTargeting;
      const ap = t.adProperty;
      const targetingPayload = {
        basicTargeting: {
          location: bt.locations?.join(', ') ?? '',
          excludeLocations: bt.excludeLocations?.join(', ') ?? '',
          deviceDesktop: bt.deviceDesktop,
          deviceMobile: bt.deviceMobile,
          deviceTablet: bt.deviceTablet,
        },
        adProperty: {
          size: ap.sizePills?.join(', ') ?? '',
          aspectRatio: Array.isArray(ap.aspectRatio) ? ap.aspectRatio.join(', ') : '',
          placement: ap.placement,
          type: ap.type,
        },
        inventorySource: t.inventorySource,
        additionalTargeting: {
          devices: t.additionalTargeting.devices,
          browserOsAll: t.additionalTargeting.browserOsAll,
          domains: (t.additionalTargeting.domainPills ?? []).join(', '),
          includeDomains: t.additionalTargeting.includeDomains,
          domainTiers: t.additionalTargeting.domainTiers || 'All Tiers',
          publisherIds: (t.additionalTargeting.publisherIdPills ?? []).join(', '),
          includePageTopics: t.additionalTargeting.includePageTopics,
          parentPublishers: (t.additionalTargeting.parentPublisherPills ?? []).join(', '),
          includeParentPublishers: t.additionalTargeting.includeParentPublishers,
          adSchedule: t.additionalTargeting.adSchedule,
          audienceSegments: t.additionalTargeting.audienceSegments,
        },
        cappingDetails: t.cappingDetails,
        bidAdjustments: t.bidAdjustments,
      };
      const result: any = await api.createCampaign({
        name: formData.name,
        advertiserId: formData.advertiserId,
        startDate: formData.startDate || undefined,
        endDate: formData.endDateEnabled && formData.endDate ? formData.endDate : undefined,
        targeting: targetingPayload,
      });
      router.push(`/campaigns/${result.id}/asset-groups/new?mode=flow`);
    } catch (err) {
      if (err instanceof ApiError) setError(err.problemDetails);
    } finally {
      setSubmitting(false);
    }
  };

  const update = (partial: Partial<typeof formData>) => setFormData((prev) => ({ ...prev, ...partial }));

  const advMapping = GOAL_MAPPING[formData.advertiserGoalType];
  const bidMapping = GOAL_MAPPING[formData.biddingGoalType];

  const toggleDrawer = (id: CampaignDrawerId) => setOpenDrawer((current) => (current === id ? null : id));

  type PillKey = 'locations' | 'excludeLocations' | 'sizePills' | 'domainPills' | 'publisherIdPills' | 'parentPublisherPills';
  const addPill = (key: PillKey, value: string) => {
    const v = value.trim();
    if (!v) return;
    const t = formData.targeting;
    const bt = t.basicTargeting;
    const ap = t.adProperty;
    const at = t.additionalTargeting;
    if (key === 'locations') update({ targeting: { ...t, basicTargeting: { ...bt, locations: [...bt.locations, v] } } });
    else if (key === 'excludeLocations') update({ targeting: { ...t, basicTargeting: { ...bt, excludeLocations: [...bt.excludeLocations, v] } } });
    else if (key === 'sizePills') update({ targeting: { ...t, adProperty: { ...ap, sizePills: [...ap.sizePills, v] } } });
    else if (key === 'domainPills') update({ targeting: { ...t, additionalTargeting: { ...at, domainPills: [...at.domainPills, v] } } });
    else if (key === 'publisherIdPills') update({ targeting: { ...t, additionalTargeting: { ...at, publisherIdPills: [...at.publisherIdPills, v] } } });
    else update({ targeting: { ...t, additionalTargeting: { ...at, parentPublisherPills: [...at.parentPublisherPills, v] } } });
  };

  const removePill = (key: PillKey, index: number) => {
    const t = formData.targeting;
    const bt = t.basicTargeting;
    const ap = t.adProperty;
    const at = t.additionalTargeting;
    if (key === 'locations') update({ targeting: { ...t, basicTargeting: { ...bt, locations: bt.locations.filter((_, i) => i !== index) } } });
    else if (key === 'excludeLocations') update({ targeting: { ...t, basicTargeting: { ...bt, excludeLocations: bt.excludeLocations.filter((_, i) => i !== index) } } });
    else if (key === 'sizePills') update({ targeting: { ...t, adProperty: { ...ap, sizePills: ap.sizePills.filter((_, i) => i !== index) } } });
    else if (key === 'domainPills') update({ targeting: { ...t, additionalTargeting: { ...at, domainPills: at.domainPills.filter((_, i) => i !== index) } } });
    else if (key === 'publisherIdPills') update({ targeting: { ...t, additionalTargeting: { ...at, publisherIdPills: at.publisherIdPills.filter((_, i) => i !== index) } } });
    else update({ targeting: { ...t, additionalTargeting: { ...at, parentPublisherPills: at.parentPublisherPills.filter((_, i) => i !== index) } } });
  };

  const drawerList: { id: CampaignDrawerId; title: string }[] = [
    { id: 'campaignSettings', title: 'Campaign Settings' },
    { id: 'budgetAndBilling', title: 'Budget And Billing' },
    { id: 'bidding', title: 'Bidding' },
    { id: 'targeting', title: 'Targeting' },
    { id: 'additionalSettings', title: 'Additional Settings' },
  ];

  return (
    <div className="max-w-2xl">
      <nav className="text-xs text-slate-500 mb-4">
        <Link href="/campaigns" className="hover:text-slate-700">Campaigns</Link>
        <span className="mx-1">/</span>
        <span className="text-slate-900">New Campaign</span>
      </nav>
      <h1 className="text-lg font-semibold text-slate-900 mb-2">Step 1: Campaign Details</h1>
      <p className="text-xs text-slate-600 mb-4">Create a campaign. You will set up the asset group next.</p>

      <ValidationBanner problemDetails={error} onDismiss={() => setError(null)} />

      <form onSubmit={handleSubmit} className="space-y-2">
        <section className="bg-white border border-slate-200 rounded-md overflow-hidden">
          {drawerList.map(({ id, title }) => {
            const isOpen = openDrawer === id;
            return (
              <div key={id} className="border-b border-slate-100 last:border-b-0">
                <button
                  type="button"
                  onClick={() => toggleDrawer(id)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-left text-xs font-medium text-slate-800 bg-slate-50/50 hover:bg-slate-100"
                >
                  {title}
                  <span className="text-slate-400">{isOpen ? '−' : '+'}</span>
                </button>
                {isOpen && (
                  <div className="p-4 border-t border-slate-100 space-y-3 text-xs">
                    {/* 1) Campaign Settings */}
                    {id === 'campaignSettings' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-slate-600 mb-1">Advertiser *</label>
                          <select
                            required
                            value={formData.advertiserId}
                            onChange={(e) => {
                              update({ advertiserId: e.target.value });
                              selection.setSelection({ advertiserId: e.target.value || null });
                            }}
                            className="w-full px-3 py-2 border border-slate-300 rounded"
                          >
                            <option value="">Select Advertiser</option>
                            {advertisers.map((a) => (
                              <option key={a.id} value={a.id}>{a.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-slate-600 mb-1.5">Campaign Objective</label>
                          <div className="flex flex-wrap items-center gap-3">
                            {OBJECTIVES.map((obj) => (
                              <label key={obj} className="flex items-center gap-1.5 cursor-pointer">
                                <input type="radio" name="objective" value={obj} checked={formData.objective === obj} onChange={() => update({ objective: obj })} className="rounded-full border-slate-300" />
                                {obj}
                              </label>
                            ))}
                          </div>
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-slate-600 mb-1">Campaign Name *</label>
                          <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => update({ name: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded"
                          />
                        </div>
                        <div className="sm:col-span-2 flex flex-wrap items-end gap-3">
                          <div className="min-w-[140px]">
                            <label className="block text-slate-600 mb-1">Start Date *</label>
                            <input type="date" required value={formData.startDate} onChange={(e) => update({ startDate: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded" />
                          </div>
                          <label className="flex items-center gap-1.5 text-slate-600 whitespace-nowrap pb-2">
                            <input type="checkbox" checked={formData.endDateEnabled} onChange={(e) => update({ endDateEnabled: e.target.checked })} className="rounded border-slate-300" />
                            Add End Date
                          </label>
                          {formData.endDateEnabled && (
                            <div className="min-w-[140px]">
                              <label className="block text-slate-600 mb-1">End Date</label>
                              <input type="date" value={formData.endDate} min={formData.startDate || undefined} onChange={(e) => update({ endDate: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded" />
                            </div>
                          )}
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-slate-600 mb-1.5">Campaign Offer *</label>
                          <div className="flex flex-wrap items-center gap-4 mb-2">
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input type="radio" name="offerMode" value="EXISTING" checked={formData.offerMode === 'EXISTING'} onChange={() => update({ offerMode: 'EXISTING' })} className="rounded-full border-slate-300" />
                              Add To Existing Offer
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input type="radio" name="offerMode" value="NEW" checked={formData.offerMode === 'NEW'} onChange={() => update({ offerMode: 'NEW' })} className="rounded-full border-slate-300" />
                              Create New Offer
                            </label>
                          </div>
                          {formData.offerMode === 'EXISTING' && (
                            <input type="text" list="existing-offers-list" value={formData.offerName} onChange={(e) => update({ offerName: e.target.value })} className="w-full max-w-xs px-3 py-2 border border-slate-300 rounded" />
                          )}
                          {formData.offerMode === 'NEW' && (
                            <input type="text" value={formData.offerName} onChange={(e) => update({ offerName: e.target.value })} className="w-full max-w-xs px-3 py-2 border border-slate-300 rounded" />
                          )}
                          <datalist id="existing-offers-list">
                            {EXISTING_OFFERS.map((o) => (<option key={o} value={o} />))}
                          </datalist>
                        </div>
                      </div>
                    )}

                    {/* 2) Budget And Billing */}
                    {id === 'budgetAndBilling' && (
                      <div className="space-y-3">
                        <div className="flex gap-2 border-b border-slate-200 pb-2">
                          {(['individual', 'shared', 'io'] as const).map((tab) => (
                            <button key={tab} type="button" onClick={() => update({ budgetType: tab })} className={`px-3 py-1.5 text-xs rounded ${formData.budgetType === tab ? 'bg-slate-200 font-medium' : 'bg-slate-100'}`}>
                              {tab === 'individual' ? 'Individual Budget' : tab === 'shared' ? 'Shared Budget' : 'I/O Budget'}
                            </button>
                          ))}
                        </div>
                        {formData.budgetType === 'individual' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-slate-600 mb-1">Daily Budget</label>
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-2 bg-slate-100 text-slate-600 border border-slate-300 rounded-l">$</span>
                                <input type="text" value={formData.dailyBudgetAmount} onChange={(e) => update({ dailyBudgetAmount: e.target.value })} className="flex-1 px-3 py-2 border border-slate-300 rounded-r" disabled={formData.dailyBudgetUnlimited} />
                              </div>
                            </div>
                            <div className="flex items-end">
                              <label className="flex items-center gap-2 text-slate-600">
                                <input type="checkbox" checked={formData.dailyBudgetUnlimited} onChange={(e) => { const on = e.target.checked; update({ dailyBudgetUnlimited: on, ...(on ? { dailyBudgetAmount: '' } : {}) }); }} className="rounded border-slate-300" />
                                Unlimited
                              </label>
                            </div>
                            <div>
                              <label className="block text-slate-600 mb-1">Billing Type</label>
                              <select value={formData.billingType} onChange={(e) => update({ billingType: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded">
                                {BILLING_TYPES.map((b) => (<option key={b} value={b}>{b}</option>))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-slate-600 mb-1">Pacing</label>
                              <select value={formData.pacing} onChange={(e) => update({ pacing: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded">
                                {PACING_OPTIONS.map((p) => (<option key={p} value={p}>{p}</option>))}
                              </select>
                            </div>
                          </div>
                        )}
                        {formData.budgetType !== 'individual' && <p className="text-slate-500">Configure in campaign settings.</p>}
                      </div>
                    )}

                    {/* 3) Bidding */}
                    {id === 'bidding' && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-slate-600 mb-1">Advertiser Goal *</label>
                            <select value={formData.advertiserGoalType} onChange={(e) => update({ advertiserGoalType: e.target.value as BiddingType })} className="w-full px-3 py-2 border border-slate-300 rounded">
                              {BIDDING_TYPE_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                            </select>
                          </div>
                          {advMapping && (
                            <div>
                              <label className="block text-slate-600 mb-1">{advMapping.metricLabel} *</label>
                              <div className="flex items-center gap-2">
                                {advMapping.unit === '$' && <span className="px-2 py-2 bg-slate-100 text-slate-600 border border-slate-300 rounded-l">$</span>}
                                <input type="number" step="0.01" min={0} value={formData.advertiserGoalValue} onChange={(e) => update({ advertiserGoalValue: e.target.value })} className="flex-1 px-3 py-2 border border-slate-300 rounded" />
                                {advMapping.unit === '%' && <span className="px-2 py-2 bg-slate-100 text-slate-600 border border-slate-300 rounded-r">%</span>}
                              </div>
                              <p className="text-[10px] text-slate-500 mt-0.5">{advMapping.helper}</p>
                            </div>
                          )}
                        </div>
                        <label className="flex items-center gap-2 text-slate-600">
                          <input type="checkbox" checked={formData.useAdvertiserGoalForBidding} onChange={(e) => update({ useAdvertiserGoalForBidding: e.target.checked })} className="rounded border-slate-300" />
                          Use Advertiser Goal And Goal Value For Bidding
                        </label>
                        {!formData.useAdvertiserGoalForBidding && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-slate-600 mb-1">Bidding Goal</label>
                              <select value={formData.biddingGoalType} onChange={(e) => update({ biddingGoalType: e.target.value as BiddingType })} className="w-full px-3 py-2 border border-slate-300 rounded">
                                {BIDDING_TYPE_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                              </select>
                            </div>
                            {bidMapping && (
                              <div>
                                <label className="block text-slate-600 mb-1">{bidMapping.metricLabel}</label>
                                <div className="flex items-center gap-2">
                                  {bidMapping.unit === '$' && <span className="px-2 py-2 bg-slate-100 text-slate-600 border border-slate-300 rounded-l">$</span>}
                                  <input type="number" step="0.01" min={0} value={formData.biddingGoalValue} onChange={(e) => update({ biddingGoalValue: e.target.value })} className="flex-1 px-3 py-2 border border-slate-300 rounded" />
                                  {bidMapping.unit === '%' && <span className="px-2 py-2 bg-slate-100 text-slate-600 border border-slate-300 rounded-r">%</span>}
                                </div>
                                <p className="text-[10px] text-slate-500 mt-0.5">{bidMapping.helper}</p>
                              </div>
                            )}
                          </div>
                        )}
                        {!formData.useAdvertiserGoalForBidding && (() => {
                          const effectiveGoal = formData.biddingGoalType;
                          const showCustomConversion = CONVERSION_BASED_GOALS.includes(effectiveGoal as any);
                          return showCustomConversion ? (
                            <div className="max-w-xs">
                              <label className="block text-slate-600 mb-1">Custom Conversion Event</label>
                              <select value={formData.customConversionEvent} onChange={(e) => update({ customConversionEvent: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded text-xs">
                                <option value="">—</option>
                                {CUSTOM_CONVERSION_EVENT_OPTIONS.filter((v) => v).map((v) => (
                                  <option key={v} value={v}>{v}</option>
                                ))}
                              </select>
                            </div>
                          ) : null;
                        })()}
                      </div>
                    )}

                    {/* 4) Targeting */}
                    {id === 'targeting' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-slate-600 mb-1">Locations</label>
                          <PillInput values={formData.targeting.basicTargeting.locations} onAdd={(v) => addPill('locations', v)} onRemove={(i) => removePill('locations', i)} />
                        </div>
                        <div>
                          <label className="block text-slate-600 mb-1">Exclude Locations</label>
                          <PillInput values={formData.targeting.basicTargeting.excludeLocations} onAdd={(v) => addPill('excludeLocations', v)} onRemove={(i) => removePill('excludeLocations', i)} />
                        </div>
                        <div>
                          <h3 className="text-slate-700 font-medium mb-2">Ad Properties</h3>
                          <div className="space-y-2">
                            <label className="block text-slate-600 mb-1">Aspect Ratio</label>
                            <div className="flex flex-wrap gap-x-4 gap-y-1">
                              {ASPECT_RATIO_OPTIONS.map((ratio) => (
                                <label key={ratio} className="flex items-center gap-1.5">
                                  <input type="checkbox" checked={formData.targeting.adProperty.aspectRatio.includes(ratio)} onChange={() => update({ targeting: { ...formData.targeting, adProperty: { ...formData.targeting.adProperty, aspectRatio: formData.targeting.adProperty.aspectRatio.includes(ratio) ? formData.targeting.adProperty.aspectRatio.filter((x) => x !== ratio) : [...formData.targeting.adProperty.aspectRatio, ratio] } } })} className="rounded border-slate-300" />
                                  {ratio}
                                </label>
                              ))}
                            </div>
                            {adPropertyErrors.aspectRatio && <p className="text-xs text-red-600 mt-1">{adPropertyErrors.aspectRatio}</p>}
                            <label className="block text-slate-600 mb-1 mt-2">Ad Size</label>
                            <PillInput values={formData.targeting.adProperty.sizePills} onAdd={(v) => addPill('sizePills', v)} onRemove={(i) => removePill('sizePills', i)} />
                            <div>
                              <span className="block text-slate-600 mb-1.5">Placement</span>
                              <div className="flex flex-wrap gap-x-4 gap-y-1">
                                {PLACEMENTS.map((p) => (
                                  <label key={p} className="flex items-center gap-1.5">
                                    <input type="checkbox" checked={formData.targeting.adProperty.placement.includes(p)} onChange={() => update({ targeting: { ...formData.targeting, adProperty: { ...formData.targeting.adProperty, placement: formData.targeting.adProperty.placement.includes(p) ? formData.targeting.adProperty.placement.filter((x) => x !== p) : [...formData.targeting.adProperty.placement, p] } } })} className="rounded border-slate-300" />
                                    {p}
                                  </label>
                                ))}
                              </div>
                              {adPropertyErrors.placement && <p className="text-xs text-red-600 mt-1">{adPropertyErrors.placement}</p>}
                            </div>
                            <div>
                              <span className="block text-slate-600 mb-1.5">Type</span>
                              <div className="flex flex-wrap gap-x-4 gap-y-1">
                                {AD_TYPES.map((t) => (
                                  <label key={t} className="flex items-center gap-1.5">
                                    <input type="checkbox" checked={formData.targeting.adProperty.type.includes(t)} onChange={() => update({ targeting: { ...formData.targeting, adProperty: { ...formData.targeting.adProperty, type: formData.targeting.adProperty.type.includes(t) ? formData.targeting.adProperty.type.filter((x) => x !== t) : [...formData.targeting.adProperty.type, t] } } })} className="rounded border-slate-300" />
                                    {t}
                                  </label>
                                ))}
                              </div>
                              {adPropertyErrors.type && <p className="text-xs text-red-600 mt-1">{adPropertyErrors.type}</p>}
                            </div>
                          </div>
                        </div>
                        <div>
                          <h3 className="text-slate-700 font-medium mb-2">Inventory Source</h3>
                          <div className="space-y-2">
                            <div>
                              <label className="block text-slate-600 mb-1">Supply Partners</label>
                              <textarea value={(formData.targeting.inventorySource.supplyPartners || []).join('\n')} onChange={(e) => update({ targeting: { ...formData.targeting, inventorySource: { ...formData.targeting.inventorySource, supplyPartners: e.target.value.split('\n').filter(Boolean) } } })} rows={2} className="w-full px-3 py-2 border border-slate-300 rounded" />
                            </div>
                            <div>
                              <label className="block text-slate-600 mb-1">Sponsorship Deals</label>
                              <input type="text" value={formData.targeting.inventorySource.sponsorshipDeals} onChange={(e) => update({ targeting: { ...formData.targeting, inventorySource: { ...formData.targeting.inventorySource, sponsorshipDeals: e.target.value } } })} className="w-full px-3 py-2 border border-slate-300 rounded" />
                            </div>
                            <div>
                              <label className="block text-slate-600 mb-1">Private Deals</label>
                              <input type="text" value={formData.targeting.inventorySource.privateDeals} onChange={(e) => update({ targeting: { ...formData.targeting, inventorySource: { ...formData.targeting.inventorySource, privateDeals: e.target.value } } })} className="w-full px-3 py-2 border border-slate-300 rounded" />
                            </div>
                            <div>
                              <label className="block text-slate-600 mb-1">Url Patterns</label>
                              <input type="text" value={formData.targeting.inventorySource.urlPatternsExclude} onChange={(e) => update({ targeting: { ...formData.targeting, inventorySource: { ...formData.targeting.inventorySource, urlPatternsExclude: e.target.value } } })} className="w-full px-3 py-2 border border-slate-300 rounded" />
                            </div>
                          </div>
                        </div>
                        <div>
                          <button type="button" onClick={() => setShowAdditionalTargeting((x) => !x)} className="text-slate-600 underline hover:text-slate-800">
                            {showAdditionalTargeting ? '−' : '+'} Additional Targeting
                          </button>
                          {showAdditionalTargeting && (
                            <div className="mt-2 pl-2 border-l-2 border-slate-200 space-y-3">
                              <div>
                                <span className="block text-slate-600 mb-1.5">Device Targeting</span>
                                <div className="flex flex-wrap gap-4">
                                  {(['deviceDesktop', 'deviceMobile', 'deviceTablet'] as const).map((key, i) => (
                                    <label key={key} className="flex items-center gap-1.5">
                                      <input type="checkbox" checked={formData.targeting.basicTargeting[key]} onChange={(e) => update({ targeting: { ...formData.targeting, basicTargeting: { ...formData.targeting.basicTargeting, [key]: e.target.checked } } })} className="rounded border-slate-300" />
                                      {['Desktop', 'Mobile', 'Tablet'][i]}
                                    </label>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <label className="block text-slate-600 mb-1">Domains</label>
                                <PillInput values={formData.targeting.additionalTargeting.domainPills} onAdd={(v) => addPill('domainPills', v)} onRemove={(i) => removePill('domainPills', i)} />
                              </div>
                              <div>
                                <span className="block text-slate-600 mb-1.5">Domain Tiers</span>
                                <div className="flex flex-wrap gap-x-4 gap-y-1">
                                  {['All Tiers', 'Standard Quality', 'High Quality'].map((tier) => (
                                    <label key={tier} className="flex items-center gap-1.5">
                                      <input type="radio" name="domainTiers" value={tier} checked={formData.targeting.additionalTargeting.domainTiers === tier} onChange={() => update({ targeting: { ...formData.targeting, additionalTargeting: { ...formData.targeting.additionalTargeting, domainTiers: tier } } })} className="rounded-full border-slate-300" />
                                      {tier}
                                    </label>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <label className="block text-slate-600 mb-1">Publisher Ids</label>
                                <PillInput values={formData.targeting.additionalTargeting.publisherIdPills} onAdd={(v) => addPill('publisherIdPills', v)} onRemove={(i) => removePill('publisherIdPills', i)} />
                              </div>
                              <div>
                                <label className="block text-slate-600 mb-1">Parent Publishers</label>
                                <PillInput values={formData.targeting.additionalTargeting.parentPublisherPills} onAdd={(v) => addPill('parentPublisherPills', v)} onRemove={(i) => removePill('parentPublisherPills', i)} />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 5) Additional Settings */}
                    {id === 'additionalSettings' && (
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-slate-700 font-medium mb-2">Capping Details</h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-slate-600 mb-1">Impression Limit</label>
                              <input type="text" value={formData.targeting.cappingDetails.impressionLimit} onChange={(e) => update({ targeting: { ...formData.targeting, cappingDetails: { ...formData.targeting.cappingDetails, impressionLimit: e.target.value } } })} className="w-full px-3 py-2 border border-slate-300 rounded" />
                            </div>
                            <div>
                              <label className="block text-slate-600 mb-1">Click Limit</label>
                              <input type="text" value={formData.targeting.cappingDetails.clickLimit} onChange={(e) => update({ targeting: { ...formData.targeting, cappingDetails: { ...formData.targeting.cappingDetails, clickLimit: e.target.value } } })} className="w-full px-3 py-2 border border-slate-300 rounded" />
                            </div>
                          </div>
                        </div>
                        <div>
                          <h3 className="text-slate-700 font-medium mb-2">Bid Adjustments</h3>
                          <div className="space-y-2">
                            <BidAdjustmentRow
                              label="Location"
                              inputValue={formData.targeting.bidAdjustments.locationValue}
                              onInputChange={(v) => update({ targeting: { ...formData.targeting, bidAdjustments: { ...formData.targeting.bidAdjustments, locationValue: v } } })}
                              typeValue={formData.targeting.bidAdjustments.locationType}
                              onTypeChange={(v) => update({ targeting: { ...formData.targeting, bidAdjustments: { ...formData.targeting.bidAdjustments, locationType: v } } })}
                              pctValue={formData.targeting.bidAdjustments.locationPct}
                              onPctChange={(v) => update({ targeting: { ...formData.targeting, bidAdjustments: { ...formData.targeting.bidAdjustments, locationPct: v } } })}
                            />
                            {(['devices', 'publisherIds', 'domains', 'audienceSegments', 'adType', 'adPlacement'] as const).map((key) => {
                              const rowLabel = key === 'publisherIds' ? 'Publisher Ids' : key === 'audienceSegments' ? 'Audience Segments' : key === 'adType' ? 'Ad Type' : key === 'adPlacement' ? 'Ad Placement' : key.charAt(0).toUpperCase() + key.slice(1);
                              const typeKey = `${key}Type` as keyof typeof formData.targeting.bidAdjustments;
                              const pctKey = `${key}Pct` as keyof typeof formData.targeting.bidAdjustments;
                              return (
                                <BidAdjustmentRow
                                  key={key}
                                  label={rowLabel}
                                  inputValue={(formData.targeting.bidAdjustments as any)[key] ?? ''}
                                  onInputChange={(v) => update({ targeting: { ...formData.targeting, bidAdjustments: { ...formData.targeting.bidAdjustments, [key]: v } } })}
                                  typeValue={(formData.targeting.bidAdjustments as any)[typeKey] ?? 'increase'}
                                  onTypeChange={(v) => update({ targeting: { ...formData.targeting, bidAdjustments: { ...formData.targeting.bidAdjustments, [typeKey]: v } } })}
                                  pctValue={(formData.targeting.bidAdjustments as any)[pctKey] ?? ''}
                                  onPctChange={(v) => update({ targeting: { ...formData.targeting, bidAdjustments: { ...formData.targeting.bidAdjustments, [pctKey]: v } } })}
                                />
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </section>

        <div className="flex justify-end gap-2 pt-2">
          <Link href="/campaigns" className="px-4 py-2 text-xs border border-slate-300 rounded hover:bg-slate-50">Cancel</Link>
          <button type="submit" disabled={submitting} className="px-4 py-2 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">Save & Continue</button>
        </div>
      </form>
    </div>
  );
}

function PillInput({ values, onAdd, onRemove }: { values: string[]; onAdd: (value: string) => void; onRemove: (index: number) => void }) {
  const [input, setInput] = useState('');
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onAdd(input);
      setInput('');
    }
  };
  return (
    <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 border border-slate-300 rounded min-h-[36px]">
      {values.map((v, i) => (
        <span key={`${v}-${i}`} className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-200 rounded text-xs">
          {v}
          <button type="button" onClick={() => onRemove(i)} className="text-slate-500 hover:text-slate-700 leading-none" aria-label="Remove">×</button>
        </span>
      ))}
      <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={onKeyDown} className="flex-1 min-w-[80px] border-0 p-0 text-xs focus:ring-0 focus:outline-none" />
    </div>
  );
}
