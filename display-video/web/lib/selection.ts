'use client';

import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo } from 'react';

const STORAGE_KEY = 'campaign-manager-selection';

export interface Selection {
  partnerId: string | null;
  advertiserId: string | null;
  campaignId: string | null;
  assetGroupId: string | null;
}

function getFromStorage(): Selection {
  if (typeof window === 'undefined')
    return { partnerId: null, advertiserId: null, campaignId: null, assetGroupId: null };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { partnerId: null, advertiserId: null, campaignId: null, assetGroupId: null };
    const parsed = JSON.parse(raw);
    return {
      partnerId: parsed.partnerId ?? null,
      advertiserId: parsed.advertiserId ?? null,
      campaignId: parsed.campaignId ?? null,
      assetGroupId: parsed.assetGroupId ?? null,
    };
  } catch {
    return { partnerId: null, advertiserId: null, campaignId: null, assetGroupId: null };
  }
}

function writeStorage(s: Selection) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {}
}

/** Extract campaignId from path like /campaigns/abc123 or /campaigns/abc123/asset-groups/new */
function campaignIdFromPath(pathname: string): string | null {
  const m = pathname.match(/^\/campaigns\/([^/]+)/);
  return m ? m[1] : null;
}

/** Extract assetGroupId from path like /asset-groups/abc123 or /asset-groups/abc123/ads/new */
function assetGroupIdFromPath(pathname: string): string | null {
  const m = pathname.match(/^\/asset-groups\/([^/]+)/);
  return m ? m[1] : null;
}

export function useSelection(): Selection & { setSelection: (s: Partial<Selection>) => void } {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const fromPath = useMemo(() => ({
    campaignId: campaignIdFromPath(pathname ?? ''),
    assetGroupId: assetGroupIdFromPath(pathname ?? ''),
  }), [pathname]);

  const selection: Selection = useMemo(() => {
    const fromQuery = {
      partnerId: searchParams?.get('partnerId') ?? null,
      advertiserId: searchParams?.get('advertiserId') ?? null,
      campaignId: searchParams?.get('campaignId') ?? null,
      assetGroupId: searchParams?.get('assetGroupId') ?? null,
    };
    const fromStorage = getFromStorage();
    return {
      partnerId: fromQuery.partnerId || fromStorage.partnerId,
      advertiserId: fromQuery.advertiserId || fromStorage.advertiserId,
      campaignId: fromPath.campaignId || fromQuery.campaignId || fromStorage.campaignId,
      assetGroupId: fromPath.assetGroupId || fromQuery.assetGroupId || fromStorage.assetGroupId,
    };
  }, [searchParams, fromPath.campaignId, fromPath.assetGroupId]);

  useEffect(() => {
    writeStorage(selection);
  }, [selection.partnerId, selection.advertiserId, selection.campaignId, selection.assetGroupId]);

  const setSelection = useCallback(
    (partial: Partial<Selection>) => {
      const next: Selection = {
        partnerId: partial.partnerId !== undefined ? partial.partnerId : selection.partnerId,
        advertiserId: partial.advertiserId !== undefined ? partial.advertiserId : selection.advertiserId,
        campaignId: partial.campaignId !== undefined ? partial.campaignId : selection.campaignId,
        assetGroupId: partial.assetGroupId !== undefined ? partial.assetGroupId : selection.assetGroupId,
      };
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      if (next.partnerId) params.set('partnerId', next.partnerId);
      else params.delete('partnerId');
      if (next.advertiserId) params.set('advertiserId', next.advertiserId);
      else params.delete('advertiserId');
      if (next.campaignId) params.set('campaignId', next.campaignId);
      else params.delete('campaignId');
      if (next.assetGroupId) params.set('assetGroupId', next.assetGroupId);
      else params.delete('assetGroupId');
      const q = params.toString();
      const path = pathname ?? '/';
      router.replace(q ? `${path}?${q}` : path);
    },
    [selection, searchParams, pathname, router]
  );

  return { ...selection, setSelection };
}
