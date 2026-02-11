'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ValidationBanner from '@/components/ValidationBanner';
import { api, ApiError } from '@/lib/api';
import { Campaign } from '@/lib/types';

export default function NewAssetGroupSelectCampaignPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [campaignError, setCampaignError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const list = await api.listCampaigns();
        setCampaigns((list as Campaign[]) || []);
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
    setCampaignError(null);
    if (!selectedCampaignId?.trim()) {
      setCampaignError('Please select a Campaign.');
      return;
    }
    router.push(`/campaigns/${selectedCampaignId}/asset-groups/new?mode=flow`);
  };

  return (
    <div className="max-w-2xl">
      <nav className="text-xs text-slate-500 mb-4">
        <Link href="/campaigns" className="hover:text-slate-700">Campaigns</Link>
        <span className="mx-1">/</span>
        <Link href="/asset-groups" className="hover:text-slate-700">Asset Groups</Link>
        <span className="mx-1">/</span>
        <span className="text-slate-900">New Asset Group</span>
      </nav>
      <h1 className="text-lg font-semibold text-slate-900 mb-2">Create Asset Group</h1>
      <p className="text-xs text-slate-600 mb-4">Select a campaign to create an asset group under.</p>

      <ValidationBanner problemDetails={error} onDismiss={() => setError(null)} />
      {campaignError && <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">{campaignError}</div>}

      <div className="bg-white border border-slate-200 rounded-md p-4 space-y-3">
        <div>
          <label className="block text-slate-600 mb-1">Campaign *</label>
          {loading ? (
            <div className="text-xs text-slate-500">Loading campaigns...</div>
          ) : campaigns.length === 0 ? (
            <div className="text-xs text-slate-500">No Campaigns Found</div>
          ) : (
            <select
              value={selectedCampaignId}
              onChange={(e) => { setSelectedCampaignId(e.target.value); setCampaignError(null); }}
              className="w-full px-3 py-2 border border-slate-300 rounded text-xs"
            >
              <option value="">Select Campaign</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={() => router.push('/asset-groups')} className="px-4 py-2 text-xs border border-slate-300 rounded hover:bg-slate-50">Cancel</button>
          <button type="button" onClick={handleContinue} disabled={loading || campaigns.length === 0 || !selectedCampaignId} className="px-4 py-2 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">Continue</button>
        </div>
      </div>
    </div>
  );
}
