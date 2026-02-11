'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DataTable from '@/components/DataTable';
import FilterBar from '@/components/FilterBar';
import StatusChips from '@/components/StatusChips';
import ValidationBanner from '@/components/ValidationBanner';
import { api, ApiError } from '@/lib/api';
import { Campaign, Partner, Advertiser } from '@/lib/types';
import { useSelection } from '@/lib/selection';

export default function CampaignsPage() {
  const router = useRouter();
  const selection = useSelection();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [advertisers, setAdvertisers] = useState<Advertiser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [filterPartnerId, setFilterPartnerId] = useState('');
  const [filterAdvertiserId, setFilterAdvertiserId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filterPartnerId) params.partnerId = filterPartnerId;
      if (filterAdvertiserId) params.advertiserId = filterAdvertiserId;
      if (searchQuery) params.q = searchQuery;

      const [campaignsData, partnersData, advertisersData] = await Promise.all([
        api.listCampaigns(params),
        api.listPartners(),
        api.listAdvertisers(),
      ]);
      let list = (campaignsData as Campaign[]).filter((c: Campaign & { archived?: boolean }) => c.archived !== true);
      if (filterAdvertiserId) list = list.filter((c) => c.advertiserId === filterAdvertiserId);
      setCampaigns(list);
      setPartners(partnersData as Partner[]);
      setAdvertisers(advertisersData as Advertiser[]);
      setError(null);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.problemDetails);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterPartnerId, filterAdvertiserId, searchQuery]);

  useEffect(() => {
    if (selection.advertiserId && filterAdvertiserId !== selection.advertiserId) {
      setFilterAdvertiserId(selection.advertiserId);
    }
  }, [selection.advertiserId]);

  const handleActivate = async (campaignId: string) => {
    try {
      await api.activateCampaign(campaignId);
      loadData();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.problemDetails);
      }
    }
  };

  const handleDeactivate = async (campaignId: string) => {
    try {
      await api.deactivateCampaign(campaignId);
      loadData();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.problemDetails);
      }
    }
  };

  const handleArchive = async (campaignId: string) => {
    if (!confirm('Archive this campaign?')) return;
    try {
      await api.archiveCampaign(campaignId);
      setCampaigns((prev) => prev.filter((c) => c.id !== campaignId));
      loadData();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.problemDetails);
      }
    }
  };

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'advertiserId', label: 'Advertiser ID' },
    { key: 'objective', label: 'Objective' },
    {
      key: 'userStatus',
      label: 'Status',
      render: (_: any, row: Campaign) => (
        <StatusChips
          userStatus={row.userStatus}
          servingStatus={row.servingStatus}
          lifecycleStatus={row.lifecycleStatus}
        />
      ),
    },
    {
      key: 'startDate',
      label: 'Start Date',
      render: (val: string) => val ? new Date(val).toLocaleDateString() : '—',
    },
    {
      key: 'endDate',
      label: 'End Date',
      render: (val: string) => val ? new Date(val).toLocaleDateString() : '—',
    },
    {
      key: 'dailyBudget',
      label: 'Daily Budget',
      render: (val: any) =>
        val?.unlimited ? 'Unlimited' : val ? `${val.currency} ${val.amount}` : '—',
    },
    { key: 'billingType', label: 'Billing' },
    {
      key: 'updatedAt',
      label: 'Updated',
      render: (val: string) => new Date(val).toLocaleDateString(),
    },
  ];

  const handleCreateClick = () => {
    if (!selection.advertiserId) return;
    router.push('/campaigns/new');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-slate-900">Campaigns</h1>
        <div className="flex items-center gap-2">
          {!selection.advertiserId && (
            <span className="text-xs text-amber-600">Select an advertiser to create a campaign.</span>
          )}
          <button
            onClick={handleCreateClick}
            disabled={!selection.advertiserId}
            className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create Campaign
          </button>
        </div>
      </div>

      <ValidationBanner problemDetails={error} onDismiss={() => setError(null)} />

      <FilterBar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        filters={[
          {
            label: 'Partner',
            value: filterPartnerId,
            onChange: setFilterPartnerId,
            options: [
              { label: 'All', value: '' },
              ...partners.map((p) => ({ label: p.name, value: p.id })),
            ],
          },
          {
            label: 'Advertiser',
            value: filterAdvertiserId,
            onChange: (v) => {
              setFilterAdvertiserId(v);
              selection.setSelection({ advertiserId: v || null });
            },
            options: [
              { label: 'All', value: '' },
              ...advertisers.map((a) => ({ label: a.name, value: a.id })),
            ],
          },
        ]}
      />

      {loading ? (
        <div className="text-xs text-slate-500">Loading...</div>
      ) : (
        <DataTable
          columns={columns}
          data={campaigns}
onRowClick={(row) => router.push(`/campaigns/${row.id}`)}
            actions={(row) => (
              <div className="flex gap-2">
              <button
                type="button"
                onClick={() => router.push(`/campaigns/${row.id}`)}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Open
              </button>
              {row.userStatus === 'PAUSED' && (
                <button
                  onClick={() => handleActivate(row.id)}
                  className="text-xs text-green-600 hover:text-green-800"
                >
                  Activate
                </button>
              )}
              {row.userStatus === 'ACTIVE' && (
                <button
                  onClick={() => handleDeactivate(row.id)}
                  className="text-xs text-yellow-600 hover:text-yellow-800"
                >
                  Deactivate
                </button>
              )}
              <button
                onClick={() => handleArchive(row.id)}
                className="text-xs text-red-600 hover:text-red-800"
              >
                Archive
              </button>
            </div>
          )}
        />
      )}
    </div>
  );
}
