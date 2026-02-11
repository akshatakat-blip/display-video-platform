'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ValidationBanner from '@/components/ValidationBanner';
import { api, ApiError } from '@/lib/api';
import { AssetGroup } from '@/lib/types';
import { useSelection } from '@/lib/selection';

export default function NewAdSelectAssetGroupPage() {
  const router = useRouter();
  const selection = useSelection();
  const [assetGroups, setAssetGroups] = useState<AssetGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [selectedAssetGroupId, setSelectedAssetGroupId] = useState(selection.assetGroupId || '');
  const [assetGroupError, setAssetGroupError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const list = await api.listAssetGroups();
        setAssetGroups((list as AssetGroup[]) || []);
        setError(null);
      } catch (err) {
        if (err instanceof ApiError) setError(err.problemDetails);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleContinue = () => {
    setAssetGroupError(null);
    if (!selectedAssetGroupId?.trim()) {
      setAssetGroupError('Please select an Asset Group.');
      return;
    }
    router.push(`/asset-groups/${selectedAssetGroupId}/ads/new`);
  };

  return (
    <div className="max-w-2xl">
      <nav className="text-xs text-slate-500 mb-4">
        <Link href="/campaigns" className="hover:text-slate-700">Campaigns</Link>
        <span className="mx-1">/</span>
        <Link href="/ads" className="hover:text-slate-700">Ads</Link>
        <span className="mx-1">/</span>
        <span className="text-slate-900">New Ad</span>
      </nav>
      <h1 className="text-lg font-semibold text-slate-900 mb-2">Create Ad</h1>
      <p className="text-xs text-slate-600 mb-4">Select an asset group to create an ad under.</p>

      <ValidationBanner problemDetails={error} onDismiss={() => setError(null)} />
      {assetGroupError && <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">{assetGroupError}</div>}

      <div className="bg-white border border-slate-200 rounded-md p-4 space-y-3">
        <div>
          <label className="block text-slate-600 mb-1">Asset Group *</label>
          {loading ? (
            <div className="text-xs text-slate-500">Loading asset groups...</div>
          ) : assetGroups.length === 0 ? (
            <div className="text-xs text-slate-500">No Asset Groups Found</div>
          ) : (
            <select
              value={selectedAssetGroupId}
              onChange={(e) => { setSelectedAssetGroupId(e.target.value); setAssetGroupError(null); }}
              className="w-full px-3 py-2 border border-slate-300 rounded text-xs"
            >
              <option value="">Select Asset Group</option>
              {assetGroups.map((ag) => (
                <option key={ag.id} value={ag.id}>{ag.name}</option>
              ))}
            </select>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={() => router.push('/ads')} className="px-4 py-2 text-xs border border-slate-300 rounded hover:bg-slate-50">Cancel</button>
          <button type="button" onClick={handleContinue} disabled={loading || assetGroups.length === 0 || !selectedAssetGroupId} className="px-4 py-2 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">Continue</button>
        </div>
      </div>
    </div>
  );
}
