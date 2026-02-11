'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DataTable from '@/components/DataTable';
import StatusChips from '@/components/StatusChips';
import ValidationBanner from '@/components/ValidationBanner';
import { api, ApiError } from '@/lib/api';
import { Campaign, AssetGroup } from '@/lib/types';

export default function CampaignDetailPage({ params }: { params: { campaignId: string } }) {
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [assetGroups, setAssetGroups] = useState<AssetGroup[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'assetGroups' | 'reporting'>('overview');
  const [error, setError] = useState<any>(null);

  const loadData = async () => {
    try {
      const [campaignData, assetGroupsData] = await Promise.all([
        api.getCampaign(params.campaignId),
        api.listAssetGroups({ campaignId: params.campaignId }),
      ]);
      setCampaign(campaignData as Campaign);
      setAssetGroups(assetGroupsData as AssetGroup[]);
      setError(null);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.problemDetails);
      }
    }
  };

  useEffect(() => {
    loadData();
  }, [params.campaignId]);

  if (!campaign) {
    return <div className="text-xs text-slate-500">Loading...</div>;
  }

  const assetGroupColumns = [
    { key: 'name', label: 'Name' },
    { key: 'id', label: 'Asset Group ID' },
    {
      key: 'userStatus',
      label: 'Status',
      render: (_: any, row: AssetGroup) => (
        <StatusChips userStatus={row.userStatus} servingStatus={row.servingStatus} />
      ),
    },
    {
      key: 'defaultBid',
      label: 'Default Bid',
      render: (val: any) => `$${val?.amount ?? 0} USD`,
    },
    {
      key: 'updatedAt',
      label: 'Updated',
      render: (val: string) => new Date(val).toLocaleDateString(),
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-slate-900 mb-2">{campaign.name}</h1>
        <StatusChips
          userStatus={campaign.userStatus}
          servingStatus={campaign.servingStatus}
          lifecycleStatus={campaign.lifecycleStatus}
        />
      </div>

      <ValidationBanner problemDetails={error} onDismiss={() => setError(null)} />

      <div className="border-b border-slate-200 mb-6">
        <div className="flex gap-4">
          {['overview', 'assetGroups', 'reporting'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-3 py-2 text-xs font-medium border-b-2 ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab === 'overview' && 'Overview'}
              {tab === 'assetGroups' && 'Asset Groups'}
              {tab === 'reporting' && 'Reporting'}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-md p-4">
            <h2 className="text-sm font-medium text-slate-900 mb-3">Campaign Details</h2>
            <dl className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <dt className="text-slate-600">Campaign ID</dt>
                <dd className="text-slate-900 font-medium">{campaign.id}</dd>
              </div>
              <div>
                <dt className="text-slate-600">Advertiser ID</dt>
                <dd className="text-slate-900 font-medium">{campaign.advertiserId}</dd>
              </div>
              <div>
                <dt className="text-slate-600">Objective</dt>
                <dd className="text-slate-900 font-medium">{campaign.objective || '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-600">Billing Type</dt>
                <dd className="text-slate-900 font-medium">{campaign.billingType}</dd>
              </div>
              <div>
                <dt className="text-slate-600">Daily Budget</dt>
                <dd className="text-slate-900 font-medium">
                  {campaign.dailyBudget?.unlimited
                    ? 'Unlimited'
                    : campaign.dailyBudget
                    ? `$${campaign.dailyBudget.amount ?? 0} USD`
                    : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-slate-600">Pacing</dt>
                <dd className="text-slate-900 font-medium">{campaign.pacing || '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-600">Bidding Mode</dt>
                <dd className="text-slate-900 font-medium">{campaign.biddingMode || '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-600">Start Date</dt>
                <dd className="text-slate-900 font-medium">
                  {campaign.startDate ? new Date(campaign.startDate).toLocaleDateString() : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-slate-600">End Date</dt>
                <dd className="text-slate-900 font-medium">
                  {campaign.endDate ? new Date(campaign.endDate).toLocaleDateString() : '—'}
                </dd>
              </div>
            </dl>
          </div>

          {campaign.servingReasons && campaign.servingReasons.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-md p-4">
              <h2 className="text-sm font-medium text-slate-900 mb-2">Serving Reasons</h2>
              <ul className="space-y-1">
                {campaign.servingReasons.map((reason, idx) => (
                  <li key={idx} className="text-xs text-slate-700">
                    • {reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {activeTab === 'assetGroups' && (
        <div>
          <div className="flex justify-end mb-4">
            <Link
              href={`/campaigns/${params.campaignId}/asset-groups/new`}
              className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Create Asset Group
            </Link>
          </div>
          <DataTable
            columns={assetGroupColumns}
            data={assetGroups}
            onRowClick={(row) => router.push(`/ads?assetGroupId=${row.id}`)}
            actions={(row) => (
              <button
                type="button"
                onClick={() => router.push(`/ads?assetGroupId=${row.id}`)}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                View ads
              </button>
            )}
          />
        </div>
      )}

      {activeTab === 'reporting' && (
        <div className="bg-white border border-slate-200 rounded-md p-4">
          <p className="text-xs text-slate-500">
            Campaign-scoped reporting (to be implemented with full reporting interface)
          </p>
        </div>
      )}

    </div>
  );
}
