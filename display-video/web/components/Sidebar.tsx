'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSelection } from '@/lib/selection';

const navItems = [
  { label: 'Partners', href: '/partners' },
  { label: 'Advertisers', href: '/advertisers' },
  { label: 'Campaigns', href: '/campaigns' },
  { label: 'Asset groups', href: '/asset-groups' },
  { label: 'Ads', href: '/ads' },
  { label: 'Reporting', href: '/reporting' },
];

function isCampaignsActive(pathname: string) {
  return pathname === '/campaigns' || /^\/campaigns\/[^/]+$/.test(pathname);
}

function isAssetGroupsActive(pathname: string) {
  const hasAssetGroups = pathname === '/asset-groups' || pathname.startsWith('/asset-groups/') || pathname.includes('/asset-groups');
  const hasAds = pathname.includes('/ads');
  return hasAssetGroups && !hasAds;
}

function isAdsActive(pathname: string) {
  return pathname === '/ads' || pathname.startsWith('/ads/') || pathname.includes('/ads');
}

export default function Sidebar() {
  const pathname = usePathname();
  const selection = useSelection();

  const getIsActive = (item: (typeof navItems)[0]) => {
    if (item.href === '/campaigns') return isCampaignsActive(pathname ?? '');
    if (item.href === '/asset-groups') return isAssetGroupsActive(pathname ?? '');
    if (item.href === '/ads') return isAdsActive(pathname ?? '');
    return pathname?.startsWith(item.href) ?? false;
  };

  return (
    <aside className="w-48 bg-white border-r border-slate-200 h-screen fixed left-0 top-0 flex flex-col">
      <div className="p-4 border-b border-slate-200">
        <h1 className="text-sm font-semibold text-slate-900">Campaign Manager</h1>
      </div>

      <nav className="p-2 flex-1">
        {navItems.map((item) => {
          const isActive = getIsActive(item);
          const href =
            item.href === '/asset-groups' && selection.campaignId
              ? `/asset-groups?campaignId=${selection.campaignId}`
              : item.href === '/ads' && selection.assetGroupId
              ? `/ads?assetGroupId=${selection.assetGroupId}`
              : item.href;
          return (
            <Link
              key={item.href}
              href={href}
              className={`block px-3 py-2 text-xs rounded-md mb-1 transition-colors ${
                isActive ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
