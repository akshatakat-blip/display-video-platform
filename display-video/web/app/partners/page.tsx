'use client';

import { useState, useEffect } from 'react';
import DataTable from '@/components/DataTable';
import ValidationBanner from '@/components/ValidationBanner';
import { api, ApiError } from '@/lib/api';
import { Partner } from '@/lib/types';

export default function PartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPartnerName, setNewPartnerName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadPartners = async () => {
    try {
      setLoading(true);
      const data = await api.listPartners();
      const list = (data as Partner[]).filter((p: Partner & { archived?: boolean }) => p.archived !== true);
      setPartners(list);
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
    loadPartners();
  }, []);

  const handleCreate = async () => {
    const trimmed = newPartnerName.trim();
    if (!trimmed) {
      setError({ detail: 'Partner name is required.' });
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.createPartner({ name: trimmed });
      setShowCreateModal(false);
      setNewPartnerName('');
      await loadPartners();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.problemDetails);
      } else {
        const message = err instanceof Error ? err.message : 'Create partner failed.';
        setError({ detail: message });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchive = async (partnerId: string) => {
    if (!confirm('Archive this partner?')) return;
    try {
      await api.archivePartner(partnerId);
      setPartners((prev) => prev.filter((p) => p.id !== partnerId));
      loadPartners();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.problemDetails);
      }
    }
  };

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'id', label: 'Partner ID' },
    {
      key: 'updatedAt',
      label: 'Updated',
      render: (val: string) => new Date(val).toLocaleDateString(),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4 relative z-10">
        <h1 className="text-lg font-semibold text-slate-900">Partners</h1>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer"
        >
          Create Partner
        </button>
      </div>

      <ValidationBanner problemDetails={error} onDismiss={() => setError(null)} />

      {loading ? (
        <div className="text-xs text-slate-500">Loading...</div>
      ) : (
        <DataTable
          columns={columns}
          data={partners}
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
        <div
          className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50"
          onClick={() => !submitting && setShowCreateModal(false)}
        >
          <div
            className="bg-white rounded-lg p-6 w-96"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-sm font-medium mb-4">Create Partner</h2>
            <div>
              <label className="block text-xs text-slate-600 mb-1">Partner name</label>
              <input
                type="text"
                value={newPartnerName}
                onChange={(e) => setNewPartnerName(e.target.value)}
                placeholder="Partner name"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                disabled={submitting}
                className="px-3 py-1.5 text-xs border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleCreate}
                className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
