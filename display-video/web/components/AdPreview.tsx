'use client';

import { useRef, useState, useEffect } from 'react';
import { Ad, AdInputType } from '@/lib/types';
import { normalizeBrandUrlForDisplay } from '@/lib/brandUrl';

const DISPLAY_WIDTH_FULL = 300;
const DISPLAY_HEIGHT_FULL = 250;
const DISPLAY_WIDTH_THUMB = 120;
const DISPLAY_HEIGHT_THUMB = 100;

export type AdPreviewSize = 'full' | 'thumbnail';

export interface AdPreviewProps {
  /** Ad from API (has contentUrl, inputType, tagText, etc.) */
  ad?: Ad | null;
  /** For immediate preview before upload: object URL or content URL for image/video */
  mediaSrc?: string | null;
  /** 'image' | 'video' when using mediaSrc (e.g. from file picker or after upload) */
  mediaKind?: 'image' | 'video';
  /** For tag/zip placeholders: tag text to show in code block */
  tagText?: string | null;
  /** Filename for HTML5 ZIP placeholder */
  zipFilename?: string | null;
  /** Input type when no ad (e.g. inline preview) */
  placeholderType?: AdInputType | null;
  /** Macro tokens to show below tag code block */
  macroTokensDetected?: string[];
  landingUrl?: string | null;
  brandUrl?: string | null;
  sponsoredBy?: string | null;
  ctaText?: string | null;
  /** Size: full (default) or thumbnail. Thumbnail scales overlays proportionally. */
  size?: AdPreviewSize;
  /** @deprecated Use size="thumbnail" instead */
  compact?: boolean;
  /** Parsed DCM iframe src for sandboxed preview (Display third-party tag). */
  dcmIframeSrc?: string | null;
  /** True when only <script> present (no iframe); show preview-unavailable message. */
  dcmScriptOnly?: boolean;
  /** DCM <ins class="dcmads"> + script HTML for iframe srcdoc preview. */
  dcmInsHtml?: string | null;
  /** Parsed VAST fields for Video VAST Tag preview. */
  vastParsed?: { version?: string; adId?: string; vastAdTagURI?: string; mediaFileUrl?: string } | null;
}

function isValidLandingUrl(s: string | null | undefined): boolean {
  if (!s || !s.trim()) return false;
  try {
    const u = s.trim();
    if (!/^https?:\/\//i.test(u)) return false;
    new URL(u);
    return true;
  } catch {
    return false;
  }
}

export default function AdPreview({
  ad,
  mediaSrc,
  mediaKind,
  tagText,
  zipFilename,
  placeholderType,
  macroTokensDetected = [],
  landingUrl,
  brandUrl,
  sponsoredBy,
  ctaText,
  size = 'full',
  compact = false,
  dcmIframeSrc = null,
  dcmScriptOnly = false,
  dcmInsHtml = null,
  vastParsed = null,
}: AdPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoLoadError, setVideoLoadError] = useState(false);

  const effectiveSize: AdPreviewSize = compact ? 'thumbnail' : size;
  const isThumb = effectiveSize === 'thumbnail';
  const effectiveLanding = (landingUrl ?? ad?.landingUrl)?.trim() || '';
  const canClickCta = isValidLandingUrl(effectiveLanding);
  const displayCtaText = (ctaText ?? ad?.ctaText)?.trim() || 'Learn more';
  const effectiveSponsored = (sponsoredBy ?? ad?.sponsoredBy)?.trim() || 'Advertiser';
  const rawBrand = (brandUrl ?? ad?.brandUrl)?.trim() || '';
  const displayBrandFooter = normalizeBrandUrlForDisplay(rawBrand || '');

  const inputType = ad?.inputType ?? placeholderType;
  const contentUrl = ad?.contentUrl ?? null;
  const isImageOrVideoType = mediaKind === 'image' || mediaKind === 'video' || inputType === 'DISPLAY_IMAGE' || inputType === 'VIDEO_FILE';
  const imageOrVideoSrc = mediaSrc ?? (contentUrl && isImageOrVideoType ? contentUrl : null);

  useEffect(() => {
    if (mediaKind === 'video' && mediaSrc) {
      setVideoLoadError(false);
      videoRef.current?.load();
    }
  }, [mediaKind, mediaSrc]);

  const handleCtaClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (canClickCta) {
      window.open(effectiveLanding, '_blank', 'noopener,noreferrer');
    }
  };

  const isVideo = (): boolean => {
    if (mediaKind === 'video') return true;
    if (inputType === 'VIDEO_FILE') return true;
    if (inputType === 'VIDEO_VAST_TAG') return false;
    return false;
  };

  const isImage = (): boolean => {
    if (mediaKind === 'image') return true;
    if (inputType === 'DISPLAY_IMAGE') return true;
    return false;
  };

  const isTagPlaceholder = (): boolean => {
    if (placeholderType === 'DISPLAY_THIRD_PARTY_TAG' || placeholderType === 'VIDEO_VAST_TAG') return true;
    if (inputType === 'DISPLAY_THIRD_PARTY_TAG' || inputType === 'VIDEO_VAST_TAG') return true;
    return false;
  };

  const isZipPlaceholder = (): boolean => {
    if (placeholderType === 'DISPLAY_HTML5_ZIP') return true;
    if (inputType === 'DISPLAY_HTML5_ZIP') return true;
    return false;
  };

  const tagDisplayText = tagText ?? ad?.tagText ?? '';
  const zipDisplayName = zipFilename ?? ad?.filename ?? (ad?.metadata?.filename as string) ?? 'bundle.zip';
  const macros = macroTokensDetected.length ? macroTokensDetected : [];

  const width = isThumb ? DISPLAY_WIDTH_THUMB : DISPLAY_WIDTH_FULL;
  const height = isThumb ? DISPLAY_HEIGHT_THUMB : DISPLAY_HEIGHT_FULL;
  const scale = isThumb ? DISPLAY_WIDTH_THUMB / DISPLAY_WIDTH_FULL : 1;
  const overlayFontSize = isThumb ? `${Math.max(8, 10 * scale)}px` : '10px';
  const overlayPadding = isThumb ? '2px 4px' : '4px 6px';
  const ctaPadding = isThumb ? '2px 6px' : '6px 12px';
  const ctaFontSize = isThumb ? `${Math.max(9, 12 * scale)}px` : '12px';

  const overlayBlock = (
    <>
      <div
        className="absolute top-0 left-0 z-10 flex items-center gap-0.5 max-w-full"
        style={{ padding: '0.15em 0.25em', fontSize: '0.5em' }}
      >
        <span
          className="rounded bg-black/60 text-white shrink-0 truncate"
          style={{ padding: overlayPadding, fontSize: overlayFontSize }}
        >
          Sponsored by {effectiveSponsored}
        </span>
      </div>
      <div className="absolute bottom-0 left-0 right-0 flex justify-center z-10" style={{ padding: '0.3em' }}>
        <button
          type="button"
          onClick={handleCtaClick}
          disabled={!canClickCta}
          className="rounded bg-white/95 text-slate-800 font-medium shadow-md border border-slate-200 disabled:opacity-60 disabled:cursor-not-allowed hover:enabled:bg-white"
          style={{ padding: ctaPadding, fontSize: ctaFontSize }}
        >
          {displayCtaText}
        </button>
      </div>
    </>
  );

  /* Rollback: match-intrinsic-dimensions change removed. Preview uses fixed responsive box; media uses object-fit: contain. */
  const renderMediaCanvas = () => {
    if (isImage() && imageOrVideoSrc) {
      return (
        <img
          src={imageOrVideoSrc}
          alt="Ad content"
          className="w-full h-full object-contain"
          draggable={false}
        />
      );
    }
    if (isVideo() && imageOrVideoSrc) {
      return (
        <video
          ref={videoRef}
          controls
          muted
          playsInline
          className="w-full h-full max-h-[280px] object-contain bg-black"
          onError={() => setVideoLoadError(true)}
          onLoadedData={() => setVideoLoadError(false)}
        >
          <source src={imageOrVideoSrc} />
        </video>
      );
    }
    if (inputType === 'DISPLAY_THIRD_PARTY_TAG' && dcmIframeSrc) {
      return (
        <div className="w-full h-full min-h-0 flex flex-col">
          <iframe
            src={dcmIframeSrc}
            title="Third-party tag preview"
            sandbox="allow-scripts allow-same-origin"
            className="w-full h-full min-h-0 border-0"
          />
        </div>
      );
    }
    if (inputType === 'DISPLAY_THIRD_PARTY_TAG' && dcmInsHtml) {
      const srcdoc = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${dcmInsHtml}</body></html>`;
      return (
        <div className="w-full h-full min-h-0 flex flex-col">
          <iframe
            title="DCM tag preview"
            sandbox="allow-scripts allow-same-origin"
            className="w-full h-full min-h-0 border-0"
            srcDoc={srcdoc}
          />
        </div>
      );
    }
    if (inputType === 'DISPLAY_THIRD_PARTY_TAG' && dcmScriptOnly) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 text-slate-300 p-2 text-center">
          <span className="text-[10px]">
            Preview Not Available For Script Tags. Please Use IFrame Tag For Preview.
          </span>
        </div>
      );
    }
    if (inputType === 'VIDEO_VAST_TAG' && vastParsed) {
      return (
        <div className="w-full h-full flex flex-col bg-slate-800 text-slate-300 p-2 overflow-hidden">
          <div className="text-[10px] font-medium text-slate-400 mb-1 shrink-0">VAST Parsed</div>
          <div className="flex-1 min-h-0 overflow-auto text-[9px] space-y-0.5 shrink-0">
            {vastParsed.version != null && <div>Version: {vastParsed.version}</div>}
            {vastParsed.adId != null && <div>Ad Id: {vastParsed.adId}</div>}
            {vastParsed.vastAdTagURI != null && (
              <div className="truncate" title={vastParsed.vastAdTagURI}>VASTAdTagURI: {vastParsed.vastAdTagURI}</div>
            )}
          </div>
          {vastParsed.mediaFileUrl ? (
            <div className="mt-1 flex-1 min-h-0 rounded overflow-hidden bg-black">
              <video
                src={vastParsed.mediaFileUrl}
                controls
                muted
                playsInline
                className="w-full h-full max-h-24 object-contain"
              />
            </div>
          ) : (
            <div className="text-[9px] text-amber-300 mt-1 shrink-0">No Media File Found In VAST</div>
          )}
        </div>
      );
    }
    if (isTagPlaceholder()) {
      return (
        <div className="w-full h-full flex flex-col bg-slate-800 text-slate-300 p-2 overflow-hidden">
          <div className="text-[10px] font-medium text-slate-400 mb-1">Tag Placeholder Preview</div>
          <div className="flex-1 min-h-0 overflow-hidden" />
          {macros.length > 0 && (
            <div className="text-[9px] text-amber-300 mt-1 shrink-0">
              Macros: {macros.join(', ')}
            </div>
          )}
        </div>
      );
    }
    if (isZipPlaceholder()) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-700 text-slate-300 p-2">
          <span className="text-xs font-medium">HTML5 ZIP uploaded</span>
          <span className="text-[10px] mt-1 truncate max-w-full">{zipDisplayName}</span>
        </div>
      );
    }
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-200 text-slate-500 text-xs">
        No ad content
      </div>
    );
  };

  const hasMedia = (isImage() || isVideo()) && imageOrVideoSrc;
  const canvas = (
    <div
      className={`relative rounded border border-slate-200 overflow-hidden max-h-[320px] ${hasMedia ? 'bg-black' : 'bg-slate-100'}`}
      style={{ width, minHeight: height }}
    >
      <div className="relative w-full h-full min-h-0" style={{ minHeight: height }}>
        {renderMediaCanvas()}
        {overlayBlock}
      </div>
    </div>
  );

  const showVideoPreviewFallback = videoLoadError && isVideo() && imageOrVideoSrc;

  return (
    <div className={isThumb ? 'inline-block' : 'space-y-1'}>
      {canvas}
      {showVideoPreviewFallback && (
        <p className="text-[10px] text-amber-600 mt-1 text-center">
          Preview Not Available In This Browser For This File, But Upload Is Accepted.
        </p>
      )}
      {!canClickCta && (
        <div
          className="flex justify-center mt-1 text-slate-500"
          style={{ fontSize: isThumb ? '9px' : '10px' }}
        >
          Add landing URL to enable CTA
        </div>
      )}
      {displayBrandFooter && (
        <div
          className="text-slate-500 truncate max-w-full text-center"
          style={{ fontSize: isThumb ? '9px' : '11px' }}
        >
          {displayBrandFooter}
        </div>
      )}
      {!isThumb && isTagPlaceholder() && tagDisplayText && !dcmIframeSrc && !dcmInsHtml && (
        <div className="mt-2 rounded border border-slate-200 bg-slate-50 p-2 max-h-40 overflow-auto">
          <div className="text-[10px] font-medium text-slate-600 mb-1">Tag / VAST</div>
          <pre className="text-[10px] font-mono whitespace-pre-wrap break-all text-slate-800">
            {tagDisplayText}
          </pre>
          {macros.length > 0 && (
            <div className="text-[10px] text-amber-700 mt-1">Macros: {macros.join(', ')}</div>
          )}
        </div>
      )}
    </div>
  );
}
