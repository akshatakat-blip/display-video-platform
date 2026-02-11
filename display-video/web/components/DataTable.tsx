'use client';

import { useState } from 'react';

interface Column {
  key: string;
  label: string;
  render?: (value: any, row: any) => React.ReactNode;
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  onRowClick?: (row: any) => void;
  actions?: (row: any) => React.ReactNode;
  /** Optional: return className and/or data attributes per row (e.g. for highlight + scroll target) */
  getRowProps?: (row: any) => { className?: string; 'data-row-id'?: string };
}

export default function DataTable({ columns, data, onRowClick, actions, getRowProps }: DataTableProps) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const sortedData = [...data].sort((a, b) => {
    if (!sortKey) return 0;
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    if (aVal === bVal) return 0;
    const comparison = aVal < bVal ? -1 : 1;
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  return (
    <div className="border border-slate-200 rounded-md bg-white overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-3 py-2 text-left font-medium text-slate-700 cursor-pointer hover:bg-slate-100"
                  onClick={() => handleSort(col.key)}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {sortKey === col.key && (
                      <span className="text-slate-400">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
              {actions && <th className="px-3 py-2 text-right font-medium text-slate-700">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {sortedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (actions ? 1 : 0)}
                  className="px-3 py-8 text-center text-slate-500"
                >
                  No data available
                </td>
              </tr>
            ) : (
              sortedData.map((row, idx) => {
                const rowProps = getRowProps?.(row) ?? {};
                const { className: rowClassName, 'data-row-id': dataRowId, ...rest } = rowProps;
                return (
                <tr
                  key={row.id ?? idx}
                  className={`hover:bg-slate-50 ${onRowClick ? 'cursor-pointer' : ''} ${rowClassName ?? ''}`}
                  onClick={() => onRowClick?.(row)}
                  data-row-id={dataRowId}
                  {...rest}
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-3 py-2 text-slate-900">
                      {col.render ? col.render(row[col.key], row) : row[col.key] || '—'}
                    </td>
                  ))}
                  {actions && (
                    <td className="px-3 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                      {actions(row)}
                    </td>
                  )}
                </tr>
              );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
