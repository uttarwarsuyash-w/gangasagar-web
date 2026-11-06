'use client';

import { useEffect, useMemo, useState } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import type { PublicVariant } from './types';

/**
 * Fresh prices and stock labels for products shown on a static page.
 * Returns null until loaded (or when the request fails), so callers keep the build-time values.
 */
export function useLiveVariants(productIds: string[]): Record<string, PublicVariant[]> | null {
  const key = useMemo(() => [...productIds].sort().join(','), [productIds]);
  const [live, setLive] = useState<{ key: string; data: Record<string, PublicVariant[]> } | null>(null);

  useEffect(() => {
    if (!key) return;
    let active = true;
    const ids = key.split(',');
    Promise.resolve(getSupabase().from('variant_public').select('*').in('product_id', ids))
      .then(({ data, error }) => {
        if (!active || error || !data) return;
        const byProduct: Record<string, PublicVariant[]> = Object.fromEntries(ids.map((id) => [id, []]));
        for (const raw of data as Array<Record<string, unknown>>) {
          const v = {
            ...(raw as unknown as PublicVariant),
            price: Number(raw.price),
            retail_price: Number(raw.retail_price),
            mrp: raw.mrp == null ? null : Number(raw.mrp),
          };
          (byProduct[v.product_id] ??= []).push(v);
        }
        for (const list of Object.values(byProduct)) list.sort((a, b) => a.sort - b.sort || a.net_weight_g - b.net_weight_g);
        setLive({ key, data: byProduct });
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [key]);

  return live && live.key === key ? live.data : null;
}
