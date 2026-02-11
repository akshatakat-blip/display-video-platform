'use client';

import { useState } from 'react';

interface SidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (segments: any[]) => void;
}

export default function SidePanel({ isOpen, onClose, onSelect }: SidePanelProps) {
  const [activeTab, setActiveTab] = useState<'first' | 'third' | 'custom'>('first');
  const [selected, setSelected] = useState<any[]>([]);

  if (!isOpen) return null;

  const tabs = [
    { key: 'first' as const, label: 'First Party' },
    { key: 'third' as const, label: 'Third Party' },
    { key: 'custom' as const, label: 'Custom' },
  ];

  const handleConfirm = () => {
    onSelect(selected);
    onClose();
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-30 z-40"
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 h-full w-[500px] bg-white shadow-xl z-50 flex flex-col">
        <div className="border-b border-slate-200 px-4 py-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-slate-900">Select Audience Segments</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-lg"
          >
            ×
          </button>
        </div>
        
        <div className="border-b border-slate-200">
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 text-xs font-medium border-b-2 ${
                  activeTab === tab.key
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-xs text-slate-500">
            {activeTab === 'first' && 'Select first-party audience segments'}
            {activeTab === 'third' && 'Select third-party audience segments'}
            {activeTab === 'custom' && 'Select custom audience segments'}
          </p>
        </div>

        <div className="border-t border-slate-200 px-4 py-3 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-md hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Confirm
          </button>
        </div>
      </div>
    </>
  );
}
