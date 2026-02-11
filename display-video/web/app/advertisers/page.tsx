'use client';

import { useState, useEffect } from 'react';
import DataTable from '@/components/DataTable';
import FilterBar from '@/components/FilterBar';
import ValidationBanner from '@/components/ValidationBanner';
import { api, ApiError } from '@/lib/api';
import { Advertiser, Partner } from '@/lib/types';

export default function AdvertisersPage() {
  const [advertisers, setAdvertisers] = useState<Advertiser[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [filterPartnerId, setFilterPartnerId] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAdvertiser, setNewAdvertiser] = useState({ name: '', partnerId: '' });

  const loadData = async () => {
    try {
      setLoading(true);
      const [advertisersData, partnersData] = await Promise.all([
        api.listAdvertisers(filterPartnerId ? { partnerId: filterPartnerId } : undefined),
        api.listPartners(),
      ]);
      const advList = (advertisersData as Advertiser[]).filter((a: Advertiser & { archived?: boolean }) => a.archived !== true);
      setAdvertisers(advList);
      setPartners(partnersData as Partner[]);
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
  }, [filterPartnerId]);

  const handleCreate = async () => {
    try {
      await api.createAdvertiser(newAdvertiser);
      setShowCreateModal(false);
      setNewAdvertiser({ name: '', partnerId: '' });
      loadData();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.problemDetails);
      }
    }
  };

  const handleArchive = async (advertiserId: string) => {
    if (!confirm('Archive this advertiser?')) return;
    try {
      await api.archiveAdvertiser(advertiserId);
      setAdvertisers((prev) => prev.filter((a) => a.id !== advertiserId));
      loadData();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.problemDetails);
      }
    }
  };

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'id', label: 'Advertiser ID' },
    { key: 'partnerId', label: 'Partner ID' },
    {
      key: 'updatedAt',
      label: 'Updated',
      render: (val: string) => new Date(val).toLocaleDateString(),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-slate-900">Advertisers</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Create Advertiser
        </button>
      </div>

      <ValidationBanner problemDetails={error} onDismiss={() => setError(null)} />

      <FilterBar
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
        ]}
      />

      {loading ? (
        <div className="text-xs text-slate-500">Loading...</div>
      ) : (
        <DataTable
          columns={columns}
          data={advertisers}
          actions={(row) => (
            <button
              onClick={() => handleArchive(row.id)}
              className="text-xs text-red-600 hover:text-red-800"
            >
              Archive
            </button>
          )}
        />
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h2 className="text-sm font-medium mb-4">Create Advertiser</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-600 mb-1">Name</label>
                <input
                  type="text"
                  value={newAdvertiser.name}
                  onChange={(e) => setNewAdvertiser({ ...newAdvertiser, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Partner</label>
                <select
                  value={newAdvertiser.partnerId}
                  onChange={(e) => setNewAdvertiser({ ...newAdvertiser, partnerId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs"
                >
                  <option value="">Select partner</option>
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-3 py-1.5 text-xs border border-slate-300 rounded-md hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
