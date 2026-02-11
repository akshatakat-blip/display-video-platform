'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DataTable from '@/components/DataTable';
import ValidationBanner from '@/components/ValidationBanner';
import { api, ApiError } from '@/lib/api';
import { Ad } from '@/lib/types';
import { useSelection } from '@/lib/selection';

/** Listing-only thumbnail: 64×64 fixed size. TAG = TAG tile; VIDEO_FILE = VIDEO tile or img (gif); DISPLAY_IMAGE = img; else N/A. */
function AdThumbnail({ ad }: { ad: Ad }) {
  const inputType = ad?.inputType;
  const contentUrl = ad?.contentUrl?.trim() || null;
  const previewUrl = contentUrl || (ad as { thumbnailUrl?: string }).thumbnailUrl?.trim() || (ad as { assetUrl?: string }).assetUrl?.trim() || (ad as { previewUrl?: string }).previewUrl?.trim() || null;
  const isTag = inputType === 'DISPLAY_THIRD_PARTY_TAG' || inputType === 'VIDEO_VAST_TAG';
  const isVideoFile = inputType === 'VIDEO_FILE';
  const isDisplayImage = inputType === 'DISPLAY_IMAGE';
  const isGif = previewUrl?.toLowerCase().endsWith('.gif');
  const isImageUrl = (isDisplayImage && previewUrl) || (isVideoFile && isGif && previewUrl);
  const isVideoUrl = isVideoFile && previewUrl && !isGif;

  return (
    <div className="w-16 h-16 min-w-[64px] min-h-[64px] rounded border border-slate-200 overflow-hidden bg-slate-200 flex items-center justify-center shrink-0" style={{ width: 64, height: 64 }}>
      {isTag && (
        <div className="w-full h-full flex items-center justify-center bg-slate-400 text-white text-[10px] font-semibold uppercase tracking-wide">
          Tag
        </div>
      )}
      {!isTag && isImageUrl && <img src={previewUrl!} alt="" className="w-full h-full object-cover" />}
      {!isTag && !isImageUrl && isVideoUrl && (
        <video src={previewUrl!} muted playsInline className="w-full h-full object-cover" />
      )}
      {!isTag && !isImageUrl && !isVideoUrl && isVideoFile && (
        <div className="w-full h-full flex items-center justify-center bg-slate-500 text-white text-[10px] font-semibold uppercase tracking-wide">
          Video
        </div>
      )}
      {!isTag && !isImageUrl && !isVideoUrl && !isVideoFile && (
        <span className="text-slate-500 text-[10px]">N/A</span>
      )}
    </div>
  );
}

export default function AdsPage() {
  const router = useRouter();
  const selection = useSelection();
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await api.listAds(
        selection.assetGroupId ? { assetGroupId: selection.assetGroupId } : undefined
      );
      const list = (data as Ad[]).filter((a: Ad & { archived?: boolean }) => a.archived !== true);
      setAds(list);
      setError(null);
    } catch (err) {
      if (err instanceof ApiError) setError(err.problemDetails);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selection.assetGroupId]);

  const handleCreateClick = () => {
    if (selection.assetGroupId) router.push(`/asset-groups/${selection.assetGroupId}/ads/new`);
    else router.push('/ads/new');
  };

  const handleArchive = async (adId: string) => {
    if (!confirm('Archive this ad?')) return;
    try {
      await api.archiveAd(adId);
      setAds((prev) => prev.filter((a) => a.id !== adId));
      loadData();
    } catch (err) {
      if (err instanceof ApiError) setError(err.problemDetails);
    }
  };

  const columns = [
    {
      key: 'preview',
      label: 'Preview',
      render: (_: unknown, row: Ad) => <AdThumbnail ad={row} />,
    },
    { key: 'name', label: 'Name' },
    { key: 'id', label: 'Ad ID' },
    { key: 'assetGroupId', label: 'Asset group ID' },
    { key: 'adType', label: 'Ad type' },
    { key: 'inputType', label: 'Input type' },
    {
      key: 'updatedAt',
      label: 'Updated',
      render: (val: string) => new Date(val).toLocaleDateString(),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-slate-900">Ads</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCreateClick}
            className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create Ad
          </button>
        </div>
      </div>
      <ValidationBanner problemDetails={error} onDismiss={() => setError(null)} />
      {loading ? (
        <div className="text-xs text-slate-500">Loading...</div>
      ) : (
        <DataTable
          columns={columns}
          data={ads}
          onRowClick={(row) => router.push(`/ads?assetGroupId=${row.assetGroupId}`)}
          actions={(row) => (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleArchive(row.id); }}
              className="text-xs text-red-600 hover:text-red-800"
            >
              Archive
            </button>
          )}
        />
      )}
    </div>
  );
}
