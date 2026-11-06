import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

const KEY = 'gks-cart-v1';

async function freshStore() {
  vi.resetModules();
  return import('./store');
}

describe('useCart', () => {
  beforeEach(() => localStorage.clear());

  it('merges the same variant added twice', async () => {
    const { useCart } = await freshStore();
    const { result } = renderHook(() => useCart());
    act(() => result.current.add({ variantId: 'v1', qty: 1 }));
    act(() => result.current.add({ variantId: 'v1', qty: 2 }));
    act(() => result.current.add({ variantId: 'loose', grams: 250 }));
    act(() => result.current.add({ variantId: 'loose', grams: 500 }));
    expect(result.current.items).toEqual([
      { variantId: 'v1', qty: 3 },
      { variantId: 'loose', grams: 750 },
    ]);
  });

  it('survives a reload', async () => {
    const first = await freshStore();
    const a = renderHook(() => first.useCart());
    act(() => a.result.current.add({ variantId: 'v1', qty: 2 }));
    expect(JSON.parse(localStorage.getItem(KEY)!)).toMatchObject({ items: [{ variantId: 'v1', qty: 2 }] });
    a.unmount();
    const second = await freshStore();
    const b = renderHook(() => second.useCart());
    expect(b.result.current.items).toEqual([{ variantId: 'v1', qty: 2 }]);
  });

  it.each(['{not json', '"a string"', '{"items": "nope"}', '{"items":[{"qty":2}]}', 'null'])(
    'treats corrupted storage %j as an empty cart',
    async (raw) => {
      localStorage.setItem(KEY, raw);
      const { useCart } = await freshStore();
      const { result } = renderHook(() => useCart());
      expect(result.current.items).toEqual([]);
    },
  );

  it('drops invalid entries but keeps valid ones', async () => {
    localStorage.setItem(KEY, JSON.stringify({ items: [{ variantId: 'ok', qty: 1 }, { variantId: 5 }, { variantId: 'bad', qty: -1 }] }));
    const { useCart } = await freshStore();
    const { result } = renderHook(() => useCart());
    expect(result.current.items).toEqual([{ variantId: 'ok', qty: 1 }]);
  });

  it('sets, removes and clears', async () => {
    const { useCart } = await freshStore();
    const { result } = renderHook(() => useCart());
    act(() => result.current.add({ variantId: 'v1', qty: 1 }));
    act(() => result.current.add({ variantId: 'l', grams: 250 }));
    act(() => result.current.setQuantity('v1', 5));
    act(() => result.current.setQuantity('l', 1000));
    expect(result.current.items).toEqual([
      { variantId: 'v1', qty: 5 },
      { variantId: 'l', grams: 1000 },
    ]);
    act(() => result.current.setQuantity('v1', 0));
    expect(result.current.items).toEqual([{ variantId: 'l', grams: 1000 }]);
    act(() => result.current.remove('l'));
    expect(result.current.items).toEqual([]);
    act(() => result.current.add({ variantId: 'v1', qty: 1 }));
    act(() => result.current.clear());
    expect(result.current.items).toEqual([]);
    expect(result.current.count).toBe(0);
  });

  it('counts lines for the header badge', async () => {
    const { useCart } = await freshStore();
    const { result } = renderHook(() => useCart());
    act(() => result.current.add({ variantId: 'v1', qty: 3 }));
    act(() => result.current.add({ variantId: 'l', grams: 500 }));
    expect(result.current.count).toBe(4);
  });
});
