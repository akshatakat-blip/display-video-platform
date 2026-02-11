'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import ValidationBanner from '@/components/ValidationBanner';
import BidAdjustmentRow from '@/components/BidAdjustmentRow';
import { api, ApiError } from '@/lib/api';
import { Campaign } from '@/lib/types';

const PLACEMENTS = ['Header', 'Footer', 'Below The Article', 'Sidebar', 'Sticky', 'Sticky Footer', 'Sticky Header', 'Slide', 'In Article', 'Sticky Sidebar'] as const;
const AD_TYPES = ['Banner', 'NativeBanner', 'BannerWeb', 'Bannerapp', 'VideoWeb', 'VideoApp'] as const;
const ASPECT_RATIO_OPTIONS = ['1:1', '4:3', '1.91:1', '16:9', '1.5:1'] as const;
const TARGETING_STRATEGIES = ['Contextual', 'Expanded Contextual', 'Custom LID'] as const;

const defaultTargeting = () => ({
  overrideCampaignSettings: false,
  domains: '',
  domainPills: [] as string[],
  includeDomains: false,
  pageTopics: [] as string[],
  pageTopicInput: '',
  targetingStrategy: 'Contextual' as string,
  adProperty: {
    sizePills: [] as string[],
    size: '',
    aspectRatio: [...ASPECT_RATIO_OPTIONS] as string[],
    placement: [...PLACEMENTS] as string[],
    type: [...AD_TYPES] as string[],
  },
});

const defaultAdvanced = () => ({
  parentPublishers: '',
  parentPublisherPills: [] as string[],
  includeParentPublishers: false,
  adSchedule: '',
  inventorySource: '',
  urlPatternsExclude: '',
});

const defaultBidAdjustments = () => ({
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
  adType: '',
  adTypeType: 'increase' as 'increase' | 'decrease',
  adTypePct: '',
  adPlacement: '',
  adPlacementType: 'increase' as 'increase' | 'decrease',
  adPlacementPct: '',
});

const defaultDelivery = () => ({
  frequencyCappingEnabled: false,
  impressionLimit: '',
  clickLimit: '',
  adRotation: 'Rotate Evenly',
});

function PillInput({ values, onAdd, onRemove }: { values: string[]; onAdd: (value: string) => void; onRemove: (index: number) => void }) {
  const [input, setInput] = useState('');
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const v = input.trim();
      if (v) {
        onAdd(v);
        setInput('');
      }
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

export default function NewAssetGroupPage({ params }: { params: { campaignId: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isFlowMode = searchParams.get('mode') === 'flow';
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(true);
  const [selectedCampaignId, setSelectedCampaignId] = useState(params.campaignId);
  const [campaignError, setCampaignError] = useState<string | null>(null);
  const [adPropertyErrors, setAdPropertyErrors] = useState<{ aspectRatio?: string; placement?: string; type?: string }>({});
  const effectiveCampaignId = isFlowMode ? params.campaignId : selectedCampaignId;
  const [error, setError] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [openDrawer, setOpenDrawer] = useState<string | null>('details');
  const [showAdditionalSettings, setShowAdditionalSettings] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    bidAmount: '',
    targeting: defaultTargeting(),
    advancedSettings: defaultAdvanced(),
    bidAdjustments: defaultBidAdjustments(),
    deliverySettings: defaultDelivery(),
  });

  useEffect(() => {
    const load = async () => {
      try {
        setCampaignsLoading(true);
        const list = await api.listCampaigns();
        setCampaigns((list as Campaign[]) || []);
        setError(null);
      } catch (err) {
        if (err instanceof ApiError) setError(err.problemDetails);
      } finally {
        setCampaignsLoading(false);
      }
    };
    load();
  }, []);

  const selectedCampaign = campaigns.find((c) => c.id === effectiveCampaignId);

  const update = (partial: Partial<typeof formData>) => setFormData((prev) => ({ ...prev, ...partial }));

  const addPageTopic = () => {
    const t = formData.targeting.pageTopicInput.trim();
    if (!t || formData.targeting.pageTopics.includes(t)) return;
    update({ targeting: { ...formData.targeting, pageTopics: [...formData.targeting.pageTopics, t], pageTopicInput: '' } });
  };

  const removePageTopic = (i: number) => {
    update({ targeting: { ...formData.targeting, pageTopics: formData.targeting.pageTopics.filter((_, idx) => idx !== i) } });
  };

  const addPill = (key: 'domainPills' | 'sizePills' | 'parentPublisherPills', value: string) => {
    const v = value.trim();
    if (!v) return;
    if (key === 'domainPills') update({ targeting: { ...formData.targeting, domainPills: [...formData.targeting.domainPills, v] } });
    else if (key === 'sizePills') update({ targeting: { ...formData.targeting, adProperty: { ...formData.targeting.adProperty, sizePills: [...formData.targeting.adProperty.sizePills, v] } } });
    else update({ advancedSettings: { ...formData.advancedSettings, parentPublisherPills: [...formData.advancedSettings.parentPublisherPills, v] } });
  };

  const removePill = (key: 'domainPills' | 'sizePills' | 'parentPublisherPills', index: number) => {
    if (key === 'domainPills') update({ targeting: { ...formData.targeting, domainPills: formData.targeting.domainPills.filter((_, i) => i !== index) } });
    else if (key === 'sizePills') update({ targeting: { ...formData.targeting, adProperty: { ...formData.targeting.adProperty, sizePills: formData.targeting.adProperty.sizePills.filter((_, i) => i !== index) } } });
    else update({ advancedSettings: { ...formData.advancedSettings, parentPublisherPills: formData.advancedSettings.parentPublisherPills.filter((_, i) => i !== index) } });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCampaignError(null);
    setAdPropertyErrors({});
    if (!isFlowMode && !selectedCampaignId?.trim()) {
      setCampaignError('Please select a Campaign.');
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
    try {
      const t = formData.targeting;
      const adv = formData.advancedSettings;
      const targetingPayload = {
        overrideCampaignSettings: t.overrideCampaignSettings,
        domains: (t.domainPills ?? []).join(', ') || t.domains,
        includeDomains: t.includeDomains,
        pageTopics: t.pageTopics,
        targetingStrategy: t.targetingStrategy,
        adProperty: {
          size: (t.adProperty.sizePills ?? []).join(', ') || t.adProperty.size,
          aspectRatio: Array.isArray(t.adProperty.aspectRatio) ? t.adProperty.aspectRatio.join(', ') : t.adProperty.aspectRatio,
          placement: t.adProperty.placement,
          type: t.adProperty.type,
        },
        advanced: {
          parentPublishers: (adv.parentPublisherPills ?? []).join(', ') || adv.parentPublishers,
          includeParentPublishers: adv.includeParentPublishers,
          adSchedule: adv.adSchedule,
          inventorySource: adv.inventorySource,
          urlPatternsExclude: adv.urlPatternsExclude,
        },
        bidAdjustments: formData.bidAdjustments,
      };
      const result: any = await api.createAssetGroup({
        campaignId: effectiveCampaignId,
        name: formData.name,
        defaultBid: { amount: parseFloat(formData.bidAmount) || 0, currency: 'USD' },
        targeting: targetingPayload,
        deliverySettings: formData.deliverySettings,
      });
      router.push(`/asset-groups/${result.id}/ads/new?mode=flow`);
    } catch (err) {
      if (err instanceof ApiError) {
        const detail = (err.problemDetails?.detail ?? '')?.toString().toLowerCase() || '';
        if (detail.includes('campaign') || detail.includes('campaignid') || detail.includes('does not exist')) {
          setCampaignError('You Need To Create A Campaign To Create An Asset Group.');
          setError(null);
        } else {
          setError(err.problemDetails);
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const drawerList = [
    { id: 'details', title: 'Details' },
    { id: 'settings', title: 'Settings' },
  ];

  return (
    <div className="max-w-2xl">
      <nav className="text-xs text-slate-500 mb-4">
        <Link href="/campaigns" className="hover:text-slate-700">Campaigns</Link>
        <span className="mx-1">/</span>
        {selectedCampaign ? (
          <Link href={`/campaigns/${effectiveCampaignId}`} className="hover:text-slate-700">{selectedCampaign.name}</Link>
        ) : (
          <span className="text-slate-500">New Asset Group</span>
        )}
        <span className="mx-1">/</span>
        <span className="text-slate-900">New Asset Group</span>
      </nav>
      <h1 className="text-lg font-semibold text-slate-900 mb-2">Create Asset Group</h1>
        {effectiveCampaignId && selectedCampaign && <p className="text-xs text-slate-600 mb-4">Campaign: {selectedCampaign.name}</p>}

      <ValidationBanner problemDetails={error} onDismiss={() => setError(null)} />
      {campaignError && <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">{campaignError}</div>}

      <form onSubmit={handleSubmit} className="space-y-2">
        {!isFlowMode && (
          <div className="bg-white border border-slate-200 rounded-md p-4 mb-3">
            <label className="block text-slate-600 mb-1">Campaign *</label>
            {campaignsLoading ? (
              <div className="text-xs text-slate-500">Loading campaigns...</div>
            ) : campaigns.length === 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-amber-700">You Need To Create A Campaign To Create An Asset Group.</p>
                <Link href="/campaigns/new" className="inline-block px-3 py-2 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700">
                  Create Campaign
                </Link>
              </div>
            ) : (
              <select
                value={selectedCampaignId}
                onChange={(e) => { setSelectedCampaignId(e.target.value); setCampaignError(null); }}
                className="w-full px-3 py-2 border border-slate-300 rounded text-xs"
                required
              >
                <option value="">Select Campaign</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
          </div>
        )}
        <section className="bg-white border border-slate-200 rounded-md overflow-hidden">
          {drawerList.map(({ id, title }) => {
            const isOpen = openDrawer === id;
            return (
              <div key={id} className="border-b border-slate-100 last:border-b-0">
                <button
                  type="button"
                  onClick={() => setOpenDrawer(isOpen ? null : id)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-left text-xs font-medium text-slate-800 bg-slate-50/50 hover:bg-slate-100"
                >
                  {title}
                  <span className="text-slate-400">{isOpen ? '−' : '+'}</span>
                </button>
                {isOpen && (
                  <div className="p-4 border-t border-slate-100 space-y-3 text-xs">
                    {id === 'details' && (
                      <>
                        <div>
                          <label className="block text-slate-600 mb-1">Asset Group Name *</label>
                          <input type="text" required value={formData.name} onChange={(e) => update({ name: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded" />
                        </div>
                        <div>
                          <label className="block text-slate-600 mb-1">Default Bid (USD) *</label>
                          <div className="flex items-center border border-slate-300 rounded overflow-hidden max-w-[200px]">
                            <span className="px-3 py-2 bg-slate-100 text-slate-600 border-r border-slate-300">$</span>
                            <input type="number" step="0.01" min={0} required value={formData.bidAmount} onChange={(e) => update({ bidAmount: e.target.value })} className="flex-1 px-3 py-2 min-w-0" />
                          </div>
                        </div>
                      </>
                    )}

                    {id === 'settings' && (
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-slate-700 font-medium mb-3">Targeting</h3>

                          <div className="space-y-3">
                            <div>
                              <label className="block text-slate-600 mb-1">Domains / App Ids</label>
                              <PillInput values={formData.targeting.domainPills} onAdd={(v) => addPill('domainPills', v)} onRemove={(i) => removePill('domainPills', i)} />
                            </div>
                            <div>
                              <label className="block text-slate-600 mb-1">Page Topics</label>
                              <div className="flex flex-wrap gap-1.5 mb-2">
                                {formData.targeting.pageTopics.map((t, idx) => (
                                  <span key={`${t}-${idx}`} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-200 text-slate-800">
                                    {t}
                                    <button type="button" onClick={() => removePageTopic(idx)} className="text-slate-500 hover:text-slate-700">×</button>
                                  </span>
                                ))}
                              </div>
                              <div className="flex gap-2">
                                <input type="text" value={formData.targeting.pageTopicInput} onChange={(e) => update({ targeting: { ...formData.targeting, pageTopicInput: e.target.value } })} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPageTopic())} className="flex-1 px-3 py-2 border border-slate-300 rounded" />
                                <button type="button" onClick={addPageTopic} className="px-3 py-2 border border-slate-300 rounded hover:bg-slate-50">Add</button>
                              </div>
                            </div>
                            <div>
                              <span className="block text-slate-600 mb-1.5">Targeting Strategy</span>
                              <div className="flex flex-wrap gap-4">
                                {TARGETING_STRATEGIES.map((s) => (
                                  <label key={s} className="flex items-center gap-1.5">
                                    <input type="radio" name="strategy" checked={formData.targeting.targetingStrategy === s} onChange={() => update({ targeting: { ...formData.targeting, targetingStrategy: s } })} className="rounded-full border-slate-300" />
                                    {s}
                                  </label>
                                ))}
                              </div>
                            </div>

                            <div>
                              <h4 className="text-slate-700 font-medium mb-3">Ad Properties</h4>
                              <div className="space-y-4">
                                <div>
                                  <span className="block text-slate-600 mb-2">Aspect Ratio</span>
                                  <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                                    {ASPECT_RATIO_OPTIONS.map((ratio) => (
                                      <label key={ratio} className="flex items-center gap-1.5">
                                    <input type="checkbox" checked={formData.targeting.adProperty.aspectRatio.includes(ratio)} onChange={() => update({ targeting: { ...formData.targeting, adProperty: { ...formData.targeting.adProperty, aspectRatio: formData.targeting.adProperty.aspectRatio.includes(ratio) ? formData.targeting.adProperty.aspectRatio.filter((x) => x !== ratio) : [...formData.targeting.adProperty.aspectRatio, ratio] } } })} className="rounded border-slate-300" />
                                    {ratio}
                                  </label>
                                ))}
                              </div>
                              {adPropertyErrors.aspectRatio && <p className="text-xs text-red-600 mt-1">{adPropertyErrors.aspectRatio}</p>}
                            </div>
                            <div>
                              <span className="block text-slate-600 mb-2">Ad Placement</span>
                                  <div className="flex flex-wrap gap-x-4 gap-y-1.5">
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
                              <span className="block text-slate-600 mb-2">Ad Type</span>
                                  <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                                    {AD_TYPES.map((t) => (
                                      <label key={t} className="flex items-center gap-1.5">
                                    <input type="checkbox" checked={formData.targeting.adProperty.type.includes(t)} onChange={() => update({ targeting: { ...formData.targeting, adProperty: { ...formData.targeting.adProperty, type: formData.targeting.adProperty.type.includes(t) ? formData.targeting.adProperty.type.filter((x) => x !== t) : [...formData.targeting.adProperty.type, t] } } })} className="rounded border-slate-300" />
                                    {t}
                                  </label>
                                ))}
                              </div>
                              {adPropertyErrors.type && <p className="text-xs text-red-600 mt-1">{adPropertyErrors.type}</p>}
                            </div>
                            <div>
                              <label className="block text-slate-600 mb-2">Ad Size</label>
                                  <PillInput values={formData.targeting.adProperty.sizePills} onAdd={(v) => addPill('sizePills', v)} onRemove={(i) => removePill('sizePills', i)} />
                                </div>
                              </div>
                            </div>

                            <div>
                              <label className="block text-slate-600 mb-1">Parent Publishers</label>
                              <PillInput values={formData.advancedSettings.parentPublisherPills} onAdd={(v) => addPill('parentPublisherPills', v)} onRemove={(i) => removePill('parentPublisherPills', i)} />
                            </div>
                            <div>
                              <label className="block text-slate-600 mb-1">Inventory Source</label>
                              <input type="text" value={formData.advancedSettings.inventorySource} onChange={(e) => update({ advancedSettings: { ...formData.advancedSettings, inventorySource: e.target.value } })} className="w-full px-3 py-2 border border-slate-300 rounded" />
                            </div>
                            <div>
                              <label className="block text-slate-600 mb-1">Url Patterns</label>
                              <input type="text" value={formData.advancedSettings.urlPatternsExclude} onChange={(e) => update({ advancedSettings: { ...formData.advancedSettings, urlPatternsExclude: e.target.value } })} className="w-full px-3 py-2 border border-slate-300 rounded" />
                            </div>
                          </div>
                        </div>

                        <div>
                          <button type="button" onClick={() => setShowAdditionalSettings((x) => !x)} className="text-slate-600 underline hover:text-slate-800">
                            {showAdditionalSettings ? '−' : '+'} Additional Settings
                          </button>
                          {showAdditionalSettings && (
                            <div className="mt-3 pl-2 border-l-2 border-slate-200 space-y-4">
                              <div>
                                <h4 className="text-slate-700 font-medium mb-2">Bid Adjustments</h4>
                                <div className="space-y-2">
                                  <BidAdjustmentRow
                                    label="Location"
                                    inputValue={formData.bidAdjustments.locationValue}
                                    onInputChange={(v) => update({ bidAdjustments: { ...formData.bidAdjustments, locationValue: v } })}
                                    typeValue={formData.bidAdjustments.locationType}
                                    onTypeChange={(v) => update({ bidAdjustments: { ...formData.bidAdjustments, locationType: v } })}
                                    pctValue={formData.bidAdjustments.locationPct}
                                    onPctChange={(v) => update({ bidAdjustments: { ...formData.bidAdjustments, locationPct: v } })}
                                  />
                                  {(['devices', 'publisherIds', 'domains', 'adType', 'adPlacement'] as const).map((key) => {
                                    const rowLabel = key === 'publisherIds' ? 'Publisher Ids' : key === 'adType' ? 'Ad Type' : key === 'adPlacement' ? 'Ad Placement' : key.charAt(0).toUpperCase() + key.slice(1);
                                    const typeKey = `${key}Type` as keyof typeof formData.bidAdjustments;
                                    const pctKey = `${key}Pct` as keyof typeof formData.bidAdjustments;
                                    return (
                                      <BidAdjustmentRow
                                        key={key}
                                        label={rowLabel}
                                        inputValue={(formData.bidAdjustments as any)[key] ?? ''}
                                        onInputChange={(v) => update({ bidAdjustments: { ...formData.bidAdjustments, [key]: v } })}
                                        typeValue={(formData.bidAdjustments as any)[typeKey] ?? 'increase'}
                                        onTypeChange={(v) => update({ bidAdjustments: { ...formData.bidAdjustments, [typeKey]: v } })}
                                        pctValue={(formData.bidAdjustments as any)[pctKey] ?? ''}
                                        onPctChange={(v) => update({ bidAdjustments: { ...formData.bidAdjustments, [pctKey]: v } })}
                                      />
                                    );
                                  })}
                                </div>
                              </div>
                              <div>
                                <h4 className="text-slate-700 font-medium mb-2">Delivery Settings</h4>
                                <div className="space-y-2">
                                  <label className="flex items-center gap-2 text-slate-600">
                                    <input type="checkbox" checked={formData.deliverySettings.frequencyCappingEnabled} onChange={(e) => update({ deliverySettings: { ...formData.deliverySettings, frequencyCappingEnabled: e.target.checked } })} className="rounded border-slate-300" />
                                    Enable Frequency Capping
                                  </label>
                                  {formData.deliverySettings.frequencyCappingEnabled && (
                                    <>
                                      <div>
                                        <label className="block text-slate-600 mb-1">Impression Limit</label>
                                        <input type="text" value={formData.deliverySettings.impressionLimit} onChange={(e) => update({ deliverySettings: { ...formData.deliverySettings, impressionLimit: e.target.value } })} className="w-full px-3 py-2 border border-slate-300 rounded" />
                                      </div>
                                      <div>
                                        <label className="block text-slate-600 mb-1">Click Limit</label>
                                        <input type="text" value={formData.deliverySettings.clickLimit} onChange={(e) => update({ deliverySettings: { ...formData.deliverySettings, clickLimit: e.target.value } })} className="w-full px-3 py-2 border border-slate-300 rounded" />
                                      </div>
                                    </>
                                  )}
                                  <div>
                                    <span className="block text-slate-600 mb-1.5">Ad Rotation</span>
                                    <div className="flex flex-wrap gap-4">
                                      <label className="flex items-center gap-1.5">
                                        <input type="radio" name="adRotation" value="Rotate Evenly" checked={formData.deliverySettings.adRotation === 'Rotate Evenly'} onChange={() => update({ deliverySettings: { ...formData.deliverySettings, adRotation: 'Rotate Evenly' } })} className="rounded-full border-slate-300" />
                                        Rotate Evenly
                                      </label>
                                      <label className="flex items-center gap-1.5">
                                        <input type="radio" name="adRotation" value="Smart Rotation" checked={formData.deliverySettings.adRotation === 'Smart Rotation'} onChange={() => update({ deliverySettings: { ...formData.deliverySettings, adRotation: 'Smart Rotation' } })} className="rounded-full border-slate-300" />
                                        Smart Rotation
                                      </label>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
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
          <button type="button" onClick={() => router.push(effectiveCampaignId ? `/campaigns/${effectiveCampaignId}` : '/asset-groups')} className="px-4 py-2 text-xs border border-slate-300 rounded hover:bg-slate-50">Cancel</button>
          <button type="submit" disabled={submitting || (!isFlowMode && campaigns.length === 0)} className="px-4 py-2 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">Save & Continue</button>
        </div>
      </form>
    </div>
  );
}
