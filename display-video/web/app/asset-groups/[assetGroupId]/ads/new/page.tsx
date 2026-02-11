'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import ValidationBanner from '@/components/ValidationBanner';
import AdPreview from '@/components/AdPreview';
import { api, ApiError } from '@/lib/api';
import { AssetGroup, Campaign, AdType, AdInputType } from '@/lib/types';

const DISPLAY_INPUT_TYPES: AdInputType[] = ['DISPLAY_IMAGE', 'DISPLAY_HTML5_ZIP', 'DISPLAY_THIRD_PARTY_TAG'];
const VIDEO_INPUT_TYPES: AdInputType[] = ['VIDEO_FILE', 'VIDEO_VAST_TAG'];
const FILE_INPUT_TYPES: AdInputType[] = ['DISPLAY_IMAGE', 'DISPLAY_HTML5_ZIP', 'VIDEO_FILE'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

function getInputTypesForAdType(adType: AdType): AdInputType[] {
  return adType === 'VIDEO' ? VIDEO_INPUT_TYPES : DISPLAY_INPUT_TYPES;
}

function isDcmInsScriptPattern(doc: Document): boolean {
  const ins = doc.querySelector('ins[class*="dcmads"]');
  const scripts = doc.querySelectorAll('script[src]');
  const hasDcmScript = Array.from(scripts).some((s) => (s.getAttribute('src') || '').includes('googletagservices.com/dcm/dcmads.js'));
  return !!ins && hasDcmScript;
}

function validateThirdPartyTag(text: string): string | null {
  const t = text.trim();
  if (!t) return 'Tag content is required.';
  if (t.includes('<')) {
    try {
      const doc = new DOMParser().parseFromString(t, 'text/html');
      if (doc.querySelector('parsererror')) return 'Tag content must be valid HTML.';
      const hasIframe = doc.querySelector('iframe') != null;
      const hasScript = doc.querySelector('script') != null;
      const dcmPattern = isDcmInsScriptPattern(doc);
      if (hasIframe || hasScript || dcmPattern) {
        if (dcmPattern) return null;
        if (hasIframe) return null;
        if (hasScript) return null;
      }
      return 'Tag must contain an iframe, script tag, or DCM format (<ins class="dcmads"> with script src containing dcm/dcmads.js).';
    } catch {
      return 'Tag content must be valid HTML.';
    }
  }
  return 'Third-party tag must contain HTML (iframe, script, or DCM ins+script).';
}

function validateVastTag(text: string): string | null {
  const t = text.trim();
  if (!t) return 'VAST tag content is required.';
  if (!/<\/?VAST/i.test(t)) return 'VAST tag must include "<VAST".';
  try {
    const doc = new DOMParser().parseFromString(t, 'text/xml');
    const err = doc.querySelector('parsererror');
    if (err) return 'VAST must be well-formed XML.';
  } catch {
    return 'VAST must be well-formed XML.';
  }
  return null;
}

/** Parse DCM-style tag: iframe src, script-only, or DCM ins HTML for iframe injection. */
function parseDcmTag(html: string): {
  iframeSrc: string | null;
  scriptOnly: boolean;
  dcmInsHtml: string | null;
} {
  const t = html.trim();
  if (!t) return { iframeSrc: null, scriptOnly: false, dcmInsHtml: null };
  try {
    const doc = new DOMParser().parseFromString(t, 'text/html');
    const iframe = doc.querySelector('iframe[src]');
    const src = iframe?.getAttribute('src')?.trim() || null;
    const hasScript = doc.querySelector('script') != null;
    const hasIframe = doc.querySelector('iframe') != null;
    const scriptOnly = hasScript && !hasIframe && !isDcmInsScriptPattern(doc);
    let dcmInsHtml: string | null = null;
    if (isDcmInsScriptPattern(doc) && !src) {
      const body = doc.body || doc.querySelector('body');
      const root = body || doc.documentElement;
      dcmInsHtml = root ? root.innerHTML : t;
    }
    return { iframeSrc: src, scriptOnly, dcmInsHtml };
  } catch {
    return { iframeSrc: null, scriptOnly: false, dcmInsHtml: null };
  }
}

type VastParsed = {
  version?: string;
  adId?: string;
  vastAdTagURI?: string;
  mediaFileUrl?: string;
};

/** Parse VAST XML and extract key fields + MediaFile URL. */
function parseVastTag(xml: string): VastParsed | null {
  const t = xml.trim();
  if (!t || !/<\/?VAST/i.test(t)) return null;
  try {
    const doc = new DOMParser().parseFromString(t, 'text/xml');
    if (doc.querySelector('parsererror')) return null;
    const vast = doc.querySelector('VAST');
    if (!vast) return null;
    const version = vast.getAttribute('version') ?? undefined;
    const ad = doc.querySelector('Ad');
    const adId = ad?.getAttribute('id') ?? undefined;
    const wrapper = doc.querySelector('VASTAdTagURI');
    const vastAdTagURI = wrapper?.textContent?.trim() ?? undefined;
    const mediaFile = doc.querySelector('MediaFile');
    const mediaFileUrl =
      mediaFile?.querySelector('URL')?.textContent?.trim() ||
      mediaFile?.textContent?.trim() ||
      undefined;
    return { version, adId, vastAdTagURI, mediaFileUrl };
  } catch {
    return null;
  }
}

export default function NewAdPage({ params }: { params: { assetGroupId: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isFlowMode = searchParams.get('mode') === 'flow';
  const [assetGroups, setAssetGroups] = useState<AssetGroup[]>([]);
  const [assetGroupsLoading, setAssetGroupsLoading] = useState(true);
  const [selectedAssetGroupId, setSelectedAssetGroupId] = useState(params.assetGroupId);
  const [assetGroupError, setAssetGroupError] = useState<string | null>(null);
  const effectiveAssetGroupId = isFlowMode ? params.assetGroupId : selectedAssetGroupId;
  const [assetGroup, setAssetGroup] = useState<AssetGroup | null>(null);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [error, setError] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [newAd, setNewAd] = useState({
    name: '',
    adType: 'DISPLAY' as AdType,
    inputType: 'DISPLAY_IMAGE' as AdInputType,
    landingUrl: '',
    brandUrl: '',
    sponsoredBy: '',
    ctaText: 'Learn More',
    tagText: '',
    trackingTags: ['', '', '', '', ''] as string[],
  });
  const [file, setFile] = useState<File | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [trackingTagCount, setTrackingTagCount] = useState(1);
  const [landingUrlError, setLandingUrlError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const landerUrlInputRef = useRef<HTMLInputElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const inputTypeOptions = getInputTypesForAdType(newAd.adType);

  useEffect(() => {
    const allowed = getInputTypesForAdType(newAd.adType);
    if (!allowed.includes(newAd.inputType)) {
      setNewAd((prev) => ({ ...prev, inputType: allowed[0] }));
      setFile(null);
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      setObjectUrl(null);
    }
  }, [newAd.adType, newAd.inputType]);

  useEffect(() => {
    const load = async () => {
      try {
        setAssetGroupsLoading(true);
        const list = await api.listAssetGroups();
        setAssetGroups((list as AssetGroup[]) || []);
        setError(null);
      } catch (err) {
        if (err instanceof ApiError) setError(err.problemDetails);
      } finally {
        setAssetGroupsLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!effectiveAssetGroupId) {
      setAssetGroup(null);
      setCampaign(null);
      return;
    }
    const load = async () => {
      try {
        const ag = await api.getAssetGroup(effectiveAssetGroupId);
        setAssetGroup(ag as AssetGroup);
        const c = (ag as AssetGroup)?.campaignId
          ? await api.getCampaign((ag as AssetGroup).campaignId)
          : null;
        setCampaign(c as Campaign | null);
      } catch (err) {
        if (err instanceof ApiError) setError(err.problemDetails);
      }
    };
    load();
  }, [effectiveAssetGroupId]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    const f = e.target.files?.[0];
    setFile(f || null);
    const newUrl = f ? URL.createObjectURL(f) : null;
    objectUrlRef.current = newUrl;
    setObjectUrl(newUrl);
    setValidationError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAssetGroupError(null);
    setValidationError(null);
    setLandingUrlError(null);
    setError(null);
    if (!isFlowMode && !selectedAssetGroupId?.trim()) {
      setAssetGroupError('Please select an Asset Group.');
      return;
    }
    if (!newAd.landingUrl?.trim()) {
      setLandingUrlError('Lander Url is required.');
      setTimeout(() => landerUrlInputRef.current?.focus(), 100);
      return;
    }

    const isFileType = FILE_INPUT_TYPES.includes(newAd.inputType);

    if (isFileType && file && newAd.inputType !== 'VIDEO_FILE') {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setValidationError('File size must not exceed 5 MB.');
        return;
      }
      if (newAd.inputType === 'DISPLAY_IMAGE') {
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (ext === 'gif') {
          setValidationError('Display image does not accept GIF. Use jpg, jpeg, or png.');
          return;
        }
      }
    }

    if (!isFileType) {
      const tagText = newAd.tagText.trim();
      if (newAd.inputType === 'DISPLAY_THIRD_PARTY_TAG') {
        const err = validateThirdPartyTag(tagText);
        if (err) {
          setValidationError(err);
          return;
        }
      }
      if (newAd.inputType === 'VIDEO_VAST_TAG') {
        const err = validateVastTag(tagText);
        if (err) {
          setValidationError(err);
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      const trackingTagsFiltered = newAd.trackingTags.filter((t) => t.trim());
      let createdId: string;
      if (isFileType) {
        if (!file) {
          setError({ detail: 'Please select a file.' });
          setSubmitting(false);
          return;
        }
        const formData = new FormData();
        formData.append('assetGroupId', effectiveAssetGroupId);
        formData.append('name', newAd.name);
        formData.append('adType', newAd.adType);
        formData.append('inputType', newAd.inputType);
        if (newAd.landingUrl) formData.append('landingUrl', newAd.landingUrl);
        if (newAd.brandUrl) formData.append('brandUrl', newAd.brandUrl);
        if (newAd.sponsoredBy) formData.append('sponsoredBy', newAd.sponsoredBy);
        if (newAd.ctaText) formData.append('ctaText', newAd.ctaText);
        if (trackingTagsFiltered.length) formData.append('trackingTags', JSON.stringify(trackingTagsFiltered));
        formData.append('file', file);
        const result: any = await api.createAdFile(formData);
        createdId = result.id;
      } else {
        if (!newAd.tagText.trim()) {
          setError({ detail: 'Please enter tag content.' });
          setSubmitting(false);
          return;
        }
        const result: any = await api.createAdTag({
          assetGroupId: effectiveAssetGroupId,
          name: newAd.name,
          adType: newAd.adType,
          inputType: newAd.inputType as 'DISPLAY_THIRD_PARTY_TAG' | 'VIDEO_VAST_TAG',
          tagText: newAd.tagText.trim(),
          landingUrl: newAd.landingUrl || undefined,
          brandUrl: newAd.brandUrl || undefined,
          sponsoredBy: newAd.sponsoredBy || undefined,
          ctaText: newAd.ctaText || undefined,
          trackingTags: trackingTagsFiltered.length ? trackingTagsFiltered : undefined,
        });
        createdId = result.id;
      }
      router.push(`/ads?assetGroupId=${effectiveAssetGroupId}`);
    } catch (err) {
      if (err instanceof ApiError) {
        const pd = err.problemDetails;
        const detail = (pd?.detail ?? '')?.toString().toLowerCase() || '';
        const errors = (pd as { errors?: Array<{ message?: string }> })?.errors ?? [];
        const hasVideoValidationMessage = detail.includes('video') && detail.includes('validation');
        const hasLegacyVideoError = errors.some((e: { message?: string }) => /supported:?\s*mp4|h\.264|100\s*mb/i.test((e.message ?? '')));
        if (detail.includes('assetgroup') || (detail.includes('asset') && detail.includes('group')) || detail.includes('does not exist')) {
          setAssetGroupError('You Need To Create An Asset Group To Create An Ad.');
          setError(null);
        } else if (hasVideoValidationMessage || hasLegacyVideoError) {
          setError({ detail: 'Video upload failed. Please ensure the file is .mp4, .mov, or .gif and try again.' });
        } else {
          setError(pd);
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isFileType = FILE_INPUT_TYPES.includes(newAd.inputType);
  const previewMediaSrc = objectUrl ?? null;
  const isVideoGif = newAd.inputType === 'VIDEO_FILE' && file?.name?.toLowerCase().endsWith('.gif');
  const previewMediaKind = newAd.inputType === 'VIDEO_FILE' ? (isVideoGif ? 'image' : 'video') : newAd.inputType === 'DISPLAY_IMAGE' ? 'image' : undefined;
  const isDisplayImage = newAd.inputType === 'DISPLAY_IMAGE';
  const isVideo = newAd.adType === 'VIDEO';

  const dcmParse = newAd.inputType === 'DISPLAY_THIRD_PARTY_TAG' && newAd.tagText.trim()
    ? parseDcmTag(newAd.tagText)
    : { iframeSrc: null, scriptOnly: false, dcmInsHtml: null };
  const dcmIframeSrc = dcmParse.iframeSrc;
  const dcmScriptOnly = dcmParse.scriptOnly;
  const dcmInsHtml = dcmParse.dcmInsHtml;
  const vastParsed =
    newAd.inputType === 'VIDEO_VAST_TAG' && newAd.tagText.trim()
      ? parseVastTag(newAd.tagText)
      : null;

  return (
    <div className="max-w-3xl">
      <nav className="text-xs text-slate-500 mb-4">
        <Link href="/campaigns" className="hover:text-slate-700">Campaigns</Link>
        <span className="mx-1">/</span>
        {assetGroup && campaign ? (
          <>
            <Link href={`/campaigns/${assetGroup.campaignId}`} className="hover:text-slate-700">
              {campaign.name}
            </Link>
            <span className="mx-1">/</span>
            <Link href={`/asset-groups/${effectiveAssetGroupId}`} className="hover:text-slate-700">{assetGroup.name}</Link>
            <span className="mx-1">/</span>
          </>
        ) : null}
        <span className="text-slate-900">New Ad</span>
      </nav>
      <h1 className="text-lg font-semibold text-slate-900 mb-2">Create Ad</h1>

      <ValidationBanner problemDetails={error} onDismiss={() => setError(null)} />
      {validationError && (
        <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          {validationError}
        </div>
      )}

      <form id="create-ad-form" onSubmit={handleSubmit} className="space-y-6 flex gap-6">
        <div className="flex-1 space-y-3">
          {!isFlowMode && (
            <div>
              <label className="block text-xs text-slate-600 mb-1">Asset Group *</label>
              {assetGroupsLoading ? (
                <p className="text-xs text-slate-500 py-2">Loading asset groups…</p>
              ) : assetGroups.length === 0 ? (
                <div className="space-y-2">
                  <p className="text-xs text-amber-700">You Need To Create An Asset Group To Create An Ad.</p>
                  <Link href="/asset-groups" className="inline-block px-3 py-2 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700">
                    Create Asset Group
                  </Link>
                </div>
              ) : (
                <>
                  <select
                    value={selectedAssetGroupId || ''}
                    onChange={(e) => {
                      setSelectedAssetGroupId(e.target.value);
                      setAssetGroupError(null);
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs"
                  >
                    <option value="">Select Asset Group</option>
                    {assetGroups.map((ag) => (
                      <option key={ag.id} value={ag.id}>{ag.name}</option>
                    ))}
                  </select>
                  {assetGroupError && (
                    <p className="text-xs text-red-600 mt-1">{assetGroupError}</p>
                  )}
                </>
              )}
            </div>
          )}
          <div>
            <label className="block text-xs text-slate-600 mb-1">Ad Name *</label>
            <input
              type="text"
              required
              value={newAd.name}
              onChange={(e) => setNewAd({ ...newAd, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-slate-600 mb-1">Ad Type</label>
              <select
                value={newAd.adType}
                onChange={(e) => setNewAd({ ...newAd, adType: e.target.value as AdType })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs"
              >
                <option value="DISPLAY">Display</option>
                <option value="VIDEO">Video</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">Input Type</label>
              <select
                value={newAd.inputType}
                onChange={(e) => {
                  setNewAd({ ...newAd, inputType: e.target.value as AdInputType });
                  setFile(null);
                  if (objectUrlRef.current) {
                    URL.revokeObjectURL(objectUrlRef.current);
                    objectUrlRef.current = null;
                  }
                  setObjectUrl(null);
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs"
              >
                {newAd.adType === 'DISPLAY' && (
                  <>
                    <option value="DISPLAY_IMAGE">Image File Upload (jpg/jpeg/png)</option>
                    <option value="DISPLAY_HTML5_ZIP">HTML5 Zip Upload</option>
                    <option value="DISPLAY_THIRD_PARTY_TAG">Third-Party Tag</option>
                  </>
                )}
                {newAd.adType === 'VIDEO' && (
                  <>
                    <option value="VIDEO_FILE">Video File (Mp4, Mov, Gif)</option>
                    <option value="VIDEO_VAST_TAG">Video VAST Tag</option>
                  </>
                )}
              </select>
            </div>
          </div>
          {isFileType && (
            <div>
              <label className="block text-xs text-slate-600 mb-1">
                {newAd.inputType === 'VIDEO_FILE' ? 'Video File (Mp4, Mov, Gif)' : newAd.inputType === 'DISPLAY_IMAGE' ? 'Image File (jpg/jpeg/png)' : 'HTML5 Zip'}
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept={
                  newAd.inputType === 'VIDEO_FILE'
                    ? '.mp4,.mov,.gif,video/mp4,video/quicktime,image/gif'
                    : newAd.inputType === 'DISPLAY_IMAGE'
                    ? 'image/jpeg,image/png,.jpg,.jpeg,.png'
                    : '.zip'
                }
                onChange={onFileChange}
                className="w-full text-xs"
              />
              {file && newAd.inputType !== 'VIDEO_FILE' && file.size > MAX_FILE_SIZE_BYTES && (
                <p className="text-xs text-red-600 mt-1">File size must not exceed 5 MB.</p>
              )}
            </div>
          )}
          {!isFileType && (
            <div>
              <label className="block text-xs text-slate-600 mb-1">
                {newAd.inputType === 'VIDEO_VAST_TAG' ? 'Video VAST Tag' : 'Third-Party Tag'}
              </label>
              <textarea
                value={newAd.tagText}
                onChange={(e) => setNewAd({ ...newAd, tagText: e.target.value })}
                rows={6}
                placeholder={
                  newAd.inputType === 'VIDEO_VAST_TAG'
                    ? 'Paste VAST XML Tag Here. Must Contain <VAST Version=…>'
                    : 'Paste Third-Party Display Tag (IFrame, Script, Or DCM <ins class="dcmads"> + script dcm/dcmads.js)'
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs font-mono"
              />
            </div>
          )}

          {newAd.brandUrl?.trim() && (
            <p className="text-xs text-slate-500 truncate" title={newAd.brandUrl.trim()}>
              {newAd.brandUrl.trim()}
            </p>
          )}

          {(isDisplayImage || newAd.inputType === 'DISPLAY_HTML5_ZIP' || newAd.inputType === 'VIDEO_FILE') && (
            <div>
              <div className="space-y-2">
                {Array.from({ length: trackingTagCount }, (_, i) => (
                  <div key={i}>
                    <label className="block text-xs text-slate-500 mb-0.5">
                      {trackingTagCount === 1 ? 'Tracking Tag' : `Tracking Tag ${i + 1}`}
                    </label>
                    <textarea
                      value={newAd.trackingTags[i] ?? ''}
                      onChange={(e) => {
                        const next = [...newAd.trackingTags];
                        next[i] = e.target.value;
                        setNewAd({ ...newAd, trackingTags: next });
                      }}
                      rows={2}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs font-mono"
                    />
                  </div>
                ))}
                {trackingTagCount < 5 && (
                  <button
                    type="button"
                    onClick={() => setTrackingTagCount((c) => c + 1)}
                    className="text-xs text-blue-600 hover:underline mt-1"
                  >
                    + Add Another Tracking Tag
                  </button>
                )}
              </div>
            </div>
          )}

          {isVideo && file && objectUrl && (
            <div>
              <h4 className="text-xs font-medium text-slate-700 mb-2">Metadata</h4>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-md p-3">
                <div>Duration: 15s</div>
                <div>Bitrate: 2,500 kbps</div>
                <div>Resolution: 1920×1080</div>
                <div>File Size: 4.2 MB</div>
                <div className="col-span-2">Asset Url: https://cdn.example.com/assets/video/asset.mp4</div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div>
              <label className="block text-xs text-slate-600 mb-1">CTA Text</label>
              <input
                type="text"
                value={newAd.ctaText}
                onChange={(e) => setNewAd({ ...newAd, ctaText: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">Lander Url *</label>
              <input
                ref={landerUrlInputRef}
                type="url"
                value={newAd.landingUrl}
                onChange={(e) => { setNewAd({ ...newAd, landingUrl: e.target.value }); setLandingUrlError(null); }}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs"
              />
              {landingUrlError && <p className="text-xs text-red-600 mt-1">{landingUrlError}</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-600 mb-1">Sponsored By</label>
            <input
              type="text"
              value={newAd.sponsoredBy}
              onChange={(e) => setNewAd({ ...newAd, sponsoredBy: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-600 mb-1">Brand Url</label>
            <input
              type="text"
              value={newAd.brandUrl}
              onChange={(e) => setNewAd({ ...newAd, brandUrl: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs"
            />
          </div>
        </div>

        <div className="w-[320px] shrink-0 flex flex-col">
          <div className="text-xs text-slate-600 mb-2">Preview</div>
          <AdPreview
            ad={null}
            mediaSrc={previewMediaSrc}
            mediaKind={previewMediaKind}
            tagText={newAd.tagText || undefined}
            placeholderType={newAd.inputType}
            landingUrl={newAd.landingUrl || undefined}
            brandUrl={newAd.brandUrl || undefined}
            sponsoredBy={newAd.sponsoredBy || undefined}
            ctaText={newAd.ctaText || undefined}
            dcmIframeSrc={dcmIframeSrc}
            dcmScriptOnly={dcmScriptOnly}
            dcmInsHtml={dcmInsHtml}
            vastParsed={vastParsed}
          />
        </div>
      </form>

      <div className="flex justify-end gap-2 mt-8 pt-4">
        <button
          type="button"
          onClick={() => router.push(effectiveAssetGroupId ? `/asset-groups/${effectiveAssetGroupId}` : '/ads')}
          className="px-4 py-2 text-xs border border-slate-300 rounded-md hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          form="create-ad-form"
          disabled={Boolean(
            submitting ||
            (!isFlowMode && assetGroups.length === 0) ||
            !newAd.name ||
            (isFileType && !file) ||
            (!isFileType && !newAd.tagText.trim()) ||
            (isFileType && file && newAd.inputType !== 'VIDEO_FILE' && file.size > MAX_FILE_SIZE_BYTES)
          )}
          className="px-4 py-2 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          Save & Continue
        </button>
      </div>
    </div>
  );
}
