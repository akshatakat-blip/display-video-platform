'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DataTable from '@/components/DataTable';
import ValidationBanner from '@/components/ValidationBanner';
import { api, ApiError } from '@/lib/api';
import { AssetGroup } from '@/lib/types';
import { useSelection } from '@/lib/selection';

export default function AssetGroupsPage() {
  const router = useRouter();
  const selection = useSelection();
  const [assetGroups, setAssetGroups] = useState<AssetGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await api.listAssetGroups(
        selection.campaignId ? { campaignId: selection.campaignId } : undefined
      );
      const list = (data as AssetGroup[]).filter((ag: AssetGroup & { archived?: boolean }) => ag.archived !== true);
      setAssetGroups(list);
      setError(null);
    } catch (err) {
      if (err instanceof ApiError) setError(err.problemDetails);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selection.campaignId]);

  useEffect(() => {
    const onVisibility = () => { if (document.visibilityState === 'visible') loadData(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [selection.campaignId]);

  const handleCreateClick = () => {
    if (selection.campaignId) router.push(`/campaigns/${selection.campaignId}/asset-groups/new`);
    else router.push('/asset-groups/new');
  };

  const handleArchive = async (assetGroupId: string) => {
    if (!confirm('Archive this asset group?')) return;
    try {
      await api.archiveAssetGroup(assetGroupId);
      setAssetGroups((prev) => prev.filter((ag) => ag.id !== assetGroupId));
      loadData();
    } catch (err) {
      if (err instanceof ApiError) setError(err.problemDetails);
    }
  };

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'id', label: 'Asset group ID' },
    { key: 'campaignId', label: 'Campaign ID' },
    {
      key: 'defaultBid',
      label: 'Default bid',
      render: (val: any) => (val ? `$${val.amount ?? 0} USD` : '—'),
    },
    {
      key: 'updatedAt',
      label: 'Updated',
      render: (val: string) => new Date(val).toLocaleDateString(),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-slate-900">Asset groups</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCreateClick}
            className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create Asset Group
          </button>
        </div>
      </div>
      <ValidationBanner problemDetails={error} onDismiss={() => setError(null)} />
      {loading ? (
        <div className="text-xs text-slate-500">Loading...</div>
      ) : (
        <DataTable
          columns={columns}
          data={assetGroups}
          onRowClick={(row) => router.push(`/ads?assetGroupId=${row.id}`)}
          actions={(row) => (
            <>
              <button
                type="button"
                onClick={() => router.push(`/ads?assetGroupId=${row.id}`)}
                className="text-xs text-blue-600 hover:underline"
              >
                View ads
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleArchive(row.id); }}
                className="text-xs text-red-600 hover:text-red-800 ml-2"
              >
                Archive
              </button>
            </>
          )}
        />
      )}
    </div>
  );
}
