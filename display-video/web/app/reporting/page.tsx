'use client';

import { useState, useEffect, useMemo } from 'react';
import FilterBar from '@/components/FilterBar';
import ValidationBanner from '@/components/ValidationBanner';
import { api, ApiError } from '@/lib/api';
import { Partner, Advertiser, Campaign, AssetGroup } from '@/lib/types';

/** One row of report metrics (raw numbers for sorting; display uses formatters). */
export interface ReportTableRow {
  id: string;
  entityName: string;
  impressions: number;
  clicks: number;
  conversions: number;
  advertiserCost: number;
  viewableImpressions: number;
  videoStarts: number;
  firstQuartile: number;
  midpoint: number;
  thirdQuartile: number;
  completes: number;
  averageWatchTime: number; // seconds
}

const REPORT_COLUMNS: { key: keyof ReportTableRow | string; label: string; type: 'number' | 'currency' | 'percent' | 'vcpm' }[] = [
  { key: 'impressions', label: 'Impressions', type: 'number' },
  { key: 'clicks', label: 'Clicks', type: 'number' },
  { key: 'conversions', label: 'Conversions', type: 'number' },
  { key: 'advertiserCost', label: 'Advertiser Cost', type: 'currency' },
  { key: 'advertiserCpc', label: 'Advertiser CPC', type: 'currency' },
  { key: 'cpa', label: 'CPA', type: 'currency' },
  { key: 'ctr', label: 'CTR', type: 'percent' },
  { key: 'conversionRate', label: 'Conversion Rate', type: 'percent' },
  { key: 'viewableImpressions', label: 'Viewable Impressions', type: 'number' },
  { key: 'viewabilityPct', label: 'Viewability %', type: 'percent' },
  { key: 'vcpm', label: 'VCPM', type: 'vcpm' },
  { key: 'videoStarts', label: 'Video Starts', type: 'number' },
  { key: 'startPct', label: 'Start %', type: 'percent' },
  { key: 'firstQuartile', label: 'First Quartile', type: 'number' },
  { key: 'midpoint', label: 'Midpoint', type: 'number' },
  { key: 'thirdQuartile', label: 'Third Quartile', type: 'number' },
  { key: 'completes', label: 'Completes', type: 'number' },
  { key: 'averageWatchTime', label: 'Average Watch Time', type: 'number' },
];

function safeDiv(a: number, b: number): number | null {
  if (b == null || b === 0 || !Number.isFinite(b)) return null;
  const v = a / b;
  return Number.isFinite(v) ? v : null;
}

function formatCell(value: number | null, type: 'number' | 'currency' | 'percent' | 'vcpm'): string {
  if (value == null || !Number.isFinite(value)) return '—';
  switch (type) {
    case 'currency':
    case 'vcpm':
      return `$${value.toFixed(2)}`;
    case 'percent':
      return `${value.toFixed(2)}%`;
    default:
      return value.toLocaleString();
  }
}

function getCalculatedValues(row: ReportTableRow): Record<string, number | null> {
  const imp = row.impressions;
  const clk = row.clicks;
  const conv = row.conversions;
  const cost = row.advertiserCost;
  const viewable = row.viewableImpressions;
  const starts = row.videoStarts;
  return {
    advertiserCpc: safeDiv(cost, clk),
    cpa: safeDiv(cost, conv),
    ctr: safeDiv(clk, imp),
    conversionRate: safeDiv(conv, clk),
    viewabilityPct: safeDiv(viewable, imp),
    vcpm: viewable > 0 ? safeDiv(cost * 1000, viewable) : null,
    startPct: safeDiv(starts, imp),
  };
}

/** Seeded PRNG so same (level, entityId, startDate, endDate) yields same data. */
function mulberry32(seed: number) {
  return function next() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** One row per entity (Campaign or Asset Group). Deterministic by level, entityId, startDate, endDate. */
function generateReportRows(p: {
  level: string;
  entityId: string;
  startDate: string;
  endDate: string;
  entities: { id: string; name: string }[];
}): ReportTableRow[] {
  const list = p.entityId
    ? p.entities.filter((e) => e.id === p.entityId)
    : p.entities;
  if (list.length === 0) return [];
  const rows: ReportTableRow[] = [];
  for (let i = 0; i < list.length; i++) {
    const entity = list[i];
    const seed = hashStr(`${p.level}|${entity.id}|${p.startDate}|${p.endDate}`);
    const rnd = mulberry32(seed);
    const isVideo = i % 3 === 0;
    const impressions = Math.floor(50000 + rnd() * 450000);
    const ctrPct = 0.002 + rnd() * 0.023;
    const clicks = Math.max(0, Math.floor(impressions * ctrPct));
    const convRate = 0.01 + rnd() * 0.14;
    const conversions = Math.max(0, Math.floor(clicks * convRate));
    const advertiserCost = Math.round((500 + rnd() * 49500) * 100) / 100;
    const viewablePct = 0.4 + rnd() * 0.45;
    const viewableImpressions = Math.floor(impressions * viewablePct);
    const videoStartsPct = isVideo ? 0.2 + rnd() * 0.7 : 0;
    const videoStarts = Math.floor(impressions * videoStartsPct);
    const firstQuartile = isVideo ? Math.floor(videoStarts * (0.85 + rnd() * 0.14)) : 0;
    const midpoint = isVideo ? Math.floor(firstQuartile * (0.7 + rnd() * 0.25)) : 0;
    const thirdQuartile = isVideo ? Math.floor(midpoint * (0.6 + rnd() * 0.35)) : 0;
    const completes = isVideo ? Math.floor(thirdQuartile * (0.4 + rnd() * 0.5)) : 0;
    const averageWatchTime = isVideo ? Math.round((2 + rnd() * 23) * 10) / 10 : 0;
    rows.push({
      id: `row-${p.level}-${entity.id}-${p.startDate}-${p.endDate}`,
      entityName: entity.name,
      impressions,
      clicks,
      conversions,
      advertiserCost,
      viewableImpressions,
      videoStarts,
      firstQuartile,
      midpoint,
      thirdQuartile,
      completes,
      averageWatchTime,
    });
  }
  return rows;
}

function getCellValue(row: ReportTableRow, colKey: string): number | null {
  if (colKey in row) {
    const v = (row as unknown as Record<string, number>)[colKey];
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
  }
  const calc = getCalculatedValues(row);
  return calc[colKey] ?? null;
}

export default function ReportingPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [advertisers, setAdvertisers] = useState<Advertiser[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [assetGroups, setAssetGroups] = useState<AssetGroup[]>([]);
  const [error, setError] = useState<any>(null);

  const [filterPartnerId, setFilterPartnerId] = useState('');
  const [filterAdvertiserId, setFilterAdvertiserId] = useState('');
  const [filterCampaignId, setFilterCampaignId] = useState('');
  const [reportLevel, setReportLevel] = useState<'Campaign' | 'Asset Group'>('Campaign');
  const [selectedAssetGroupId, setSelectedAssetGroupId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [hasRunReport, setHasRunReport] = useState(false);

  const [loading, setLoading] = useState(false);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  const entityId = reportLevel === 'Campaign' ? filterCampaignId : selectedAssetGroupId;
  const entities = reportLevel === 'Campaign' ? campaigns : assetGroups;
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const startParsed = startDate.trim() ? new Date(startDate) : null;
  const endParsed = endDate.trim() ? new Date(endDate) : null;
  const noFutureDates = (startDate.trim() === '' || startDate.trim() <= todayStr) && (endDate.trim() === '' || endDate.trim() <= todayStr);
  const dateRangeValid = startDate.trim() !== '' && endDate.trim() !== '' && startParsed !== null && endParsed !== null && startParsed <= endParsed;
  const datesValid = dateRangeValid && noFutureDates;

  const tableRows = useMemo(() => {
    if (!hasRunReport || !datesValid) return [];
    return generateReportRows({
      level: reportLevel,
      entityId,
      startDate: startDate.trim(),
      endDate: endDate.trim(),
      entities: entities.map((e) => ({ id: e.id, name: e.name })),
    });
  }, [hasRunReport, datesValid, reportLevel, entityId, startDate, endDate, entities]);

  const sortedRows = useMemo(() => {
    if (!sortKey) return tableRows;
    return [...tableRows].sort((a, b) => {
      const va = getCellValue(a, sortKey);
      const vb = getCellValue(b, sortKey);
      const aNull = va == null || !Number.isFinite(va);
      const bNull = vb == null || !Number.isFinite(vb);
      if (aNull && bNull) return 0;
      if (aNull) return 1;
      if (bNull) return -1;
      const diff = (va as number) - (vb as number);
      return sortAsc ? (diff < 0 ? -1 : diff > 0 ? 1 : 0) : (diff > 0 ? -1 : diff < 0 ? 1 : 0);
    });
  }, [tableRows, sortKey, sortAsc]);

  const runReport = () => {
    if (datesValid) setHasRunReport(true);
  };

  useEffect(() => {
    const loadFilters = async () => {
      try {
        const [partnersData, advertisersData, campaignsData, assetGroupsData] = await Promise.all([
          api.listPartners(),
          api.listAdvertisers(),
          api.listCampaigns(),
          api.listAssetGroups(),
        ]);
        setPartners(partnersData as Partner[]);
        setAdvertisers(advertisersData as Advertiser[]);
        setCampaigns(campaignsData as Campaign[]);
        setAssetGroups((assetGroupsData as AssetGroup[]) || []);
      } catch (err) {
        if (err instanceof ApiError) setError(err.problemDetails);
      }
    };
    loadFilters();
  }, []);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortAsc((a) => !a);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-900 mb-6">Reporting</h1>

      <ValidationBanner problemDetails={error} onDismiss={() => setError(null)} />

      <div className="bg-white border border-slate-200 rounded-md p-4 mb-4">
        <h2 className="text-sm font-medium text-slate-900 mb-3">Report Configuration</h2>
        <div className="space-y-3">
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
              {
                label: 'Advertiser',
                value: filterAdvertiserId,
                onChange: setFilterAdvertiserId,
                options: [
                  { label: 'All', value: '' },
                  ...advertisers.map((a) => ({ label: a.name, value: a.id })),
                ],
              },
              {
                label: 'Campaign',
                value: filterCampaignId,
                onChange: setFilterCampaignId,
                options: [
                  { label: 'All', value: '' },
                  ...campaigns.map((c) => ({ label: c.name, value: c.id })),
                ],
              },
            ]}
          />

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-600 mb-1">Report Level</label>
                <select
                  value={reportLevel}
                  onChange={(e) => setReportLevel(e.target.value as 'Campaign' | 'Asset Group')}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs"
                >
                  <option value="Campaign">Campaign</option>
                  <option value="Asset Group">Asset Group</option>
                </select>
              </div>
              {reportLevel === 'Campaign' ? (
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Campaign</label>
                  <select
                    value={filterCampaignId}
                    onChange={(e) => setFilterCampaignId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs"
                  >
                    <option value="">All</option>
                    {campaigns.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Asset Group</label>
                  <select
                    value={selectedAssetGroupId}
                    onChange={(e) => setSelectedAssetGroupId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs"
                  >
                    <option value="">All</option>
                    {assetGroups.map((ag) => (
                      <option key={ag.id} value={ag.id}>{ag.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-600 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                max={todayStr}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                max={todayStr}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs"
              />
            </div>
          </div>
          {dateRangeValid && !noFutureDates && (
            <p className="text-sm text-amber-700">Start and End dates cannot be in the future.</p>
          )}

          <div>
            <button
              type="button"
              onClick={runReport}
              disabled={!datesValid}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Run Report
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-md overflow-hidden mb-4">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-slate-700">{reportLevel === 'Campaign' ? 'Campaign' : 'Asset Group'}</th>
                {REPORT_COLUMNS.map((col) => (
                  <th key={col.key} className="px-3 py-2 text-right font-medium text-slate-700">
                    <button
                      type="button"
                      onClick={() => handleSort(col.key)}
                      className="inline-flex items-center gap-0.5 hover:text-slate-900"
                    >
                      {col.label}
                      <span className="text-slate-400" aria-hidden>
                        {sortKey === col.key ? (sortAsc ? ' ↑' : ' ↓') : ' ↕'}
                      </span>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {tableRows.length === 0 && (
                <tr>
                  <td colSpan={REPORT_COLUMNS.length + 1} className="px-3 py-4 text-center text-slate-500 text-sm">
                    {!hasRunReport || !dateRangeValid
                      ? 'Select Start Date And End Date To Run Report.'
                      : !noFutureDates
                        ? 'Start and End dates cannot be in the future.'
                        : 'No data for the selected range.'}
                  </td>
                </tr>
              )}
              {tableRows.length > 0 && (
                <>
                  {sortedRows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 text-slate-900">{row.entityName}</td>
                      {REPORT_COLUMNS.map((col) => {
                        const isCalculated = ['advertiserCpc', 'cpa', 'ctr', 'conversionRate', 'viewabilityPct', 'vcpm', 'startPct'].includes(col.key);
                        const raw = isCalculated ? getCalculatedValues(row)[col.key] : getCellValue(row, col.key);
                        const display = col.key === 'ctr' || col.key === 'conversionRate' || col.key === 'viewabilityPct' || col.key === 'startPct'
                          ? (raw != null && Number.isFinite(raw) ? (raw * 100).toFixed(2) + '%' : '—')
                          : formatCell(raw, col.type);
                        return (
                          <td key={col.key} className="px-3 py-2 text-right text-slate-900">
                            {display}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  <tr className="bg-slate-100 font-medium border-t-2 border-slate-300">
                    <td className="px-3 py-2 text-slate-900">Grand Total</td>
                    {REPORT_COLUMNS.map((col) => {
                      const key = col.key;
                      if (key === 'entityName' || key === 'id') {
                        return <td key={col.key} className="px-3 py-2 text-right font-medium text-slate-900">—</td>;
                      }
                      const baseKeys = ['impressions', 'clicks', 'conversions', 'advertiserCost', 'viewableImpressions', 'videoStarts', 'firstQuartile', 'midpoint', 'thirdQuartile', 'completes'];
                      const sum = (k: string) => sortedRows.reduce((acc, r) => acc + (getCellValue(r, k) ?? 0), 0);
                      const imp = sum('impressions');
                      const clk = sum('clicks');
                      const conv = sum('conversions');
                      const cost = sum('advertiserCost');
                      const viewable = sum('viewableImpressions');
                      const starts = sum('videoStarts');
                      const watchTimeWeighted = sortedRows.reduce((acc, r) => acc + (getCellValue(r, 'averageWatchTime') ?? 0) * (getCellValue(r, 'videoStarts') ?? 0), 0);
                      const avgWatchTime = starts > 0 ? watchTimeWeighted / starts : null;
                      let display: string;
                      if (key === 'averageWatchTime') {
                        display = avgWatchTime != null && Number.isFinite(avgWatchTime) ? avgWatchTime.toFixed(1) : '—';
                      } else if (['advertiserCpc', 'cpa', 'ctr', 'conversionRate', 'viewabilityPct', 'vcpm', 'startPct'].includes(key)) {
                        const val = key === 'advertiserCpc' ? safeDiv(cost, clk) : key === 'cpa' ? safeDiv(cost, conv) : key === 'ctr' ? safeDiv(clk, imp) : key === 'conversionRate' ? safeDiv(conv, clk) : key === 'viewabilityPct' ? safeDiv(viewable, imp) : key === 'vcpm' ? (viewable > 0 ? safeDiv(cost * 1000, viewable) : null) : safeDiv(starts, imp);
                        display = val != null && Number.isFinite(val) ? (['ctr', 'conversionRate', 'viewabilityPct', 'startPct'].includes(key) ? (val * 100).toFixed(2) + '%' : `$${val.toFixed(2)}`) : '—';
                      } else if (baseKeys.includes(key)) {
                        display = formatCell(sum(key), col.type);
                      } else {
                        display = formatCell(sum(key), col.type);
                      }
                      return (
                        <td key={col.key} className="px-3 py-2 text-right font-medium text-slate-900">
                          {display}
                        </td>
                      );
                    })}
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
