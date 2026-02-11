'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

/** Asset group "detail" redirects to Ads list for this asset group (no mixed creation + summary). */
export default function AssetGroupDetailPage() {
  const router = useRouter();
  const params = useParams();
  const assetGroupId = params?.assetGroupId as string | undefined;

  useEffect(() => {
    if (assetGroupId) {
      router.replace(`/ads?assetGroupId=${assetGroupId}`);
    }
  }, [assetGroupId, router]);

  return <div className="text-xs text-slate-500">Redirecting to ads...</div>;
}
