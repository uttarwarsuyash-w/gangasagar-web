'use client';

import { useSyncExternalStore } from 'react';

export interface CartItem {
  variantId: string;
  qty?: number;
  grams?: number;
}

export const CART_KEY = 'gks-cart-v1';
const MAX_QTY = 999;
const MAX_GRAMS = 100000;

type Listener = () => void;
let items: CartItem[] | null = null;
const listeners = new Set<Listener>();
const EMPTY: CartItem[] = [];

function validItem(x: unknown): CartItem | null {
  if (!x || typeof x !== 'object') return null;
  const o = x as Record<string, unknown>;
  if (typeof o.variantId !== 'string' || o.variantId === '') return null;
  if (typeof o.qty === 'number' && Number.isInteger(o.qty) && o.qty > 0 && o.qty <= MAX_QTY && o.grams === undefined)
    return { variantId: o.variantId, qty: o.qty };
  if (typeof o.grams === 'number' && Number.isInteger(o.grams) && o.grams > 0 && o.grams <= MAX_GRAMS && o.qty === undefined)
    return { variantId: o.variantId, grams: o.grams };
  return null;
}

function read(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    const list = parsed && typeof parsed === 'object' ? (parsed as { items?: unknown }).items : null;
    if (!Array.isArray(list)) return [];
    return list.map(validItem).filter((x): x is CartItem => x !== null);
  } catch {
    return [];
  }
}

function current(): CartItem[] {
  if (items === null) items = typeof window === 'undefined' ? EMPTY : read();
  return items;
}

function write(next: CartItem[]) {
  items = next;
  try {
    window.localStorage.setItem(CART_KEY, JSON.stringify({ items: next }));
  } catch {
    // Storage full or blocked: keep the cart in memory for this visit.
  }
  listeners.forEach((l) => l());
}

function subscribe(l: Listener) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => {
    if (e.key === CART_KEY) {
      items = read();
      l();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener('storage', onStorage);
  };
}

export function add(item: CartItem) {
  const list = current();
  const existing = list.find((i) => i.variantId === item.variantId);
  if (!existing) {
    const v = validItem(item);
    if (v) write([...list, v]);
    return;
  }
  const merged =
    item.grams !== undefined
      ? { variantId: item.variantId, grams: Math.min(MAX_GRAMS, (existing.grams ?? 0) + item.grams) }
      : { variantId: item.variantId, qty: Math.min(MAX_QTY, (existing.qty ?? 0) + (item.qty ?? 1)) };
  write(list.map((i) => (i.variantId === item.variantId ? merged : i)));
}

/** Sets qty (packs) or grams (loose) for a line; 0 or less removes it. */
export function setQuantity(variantId: string, value: number) {
  const list = current();
  if (!(value > 0)) {
    write(list.filter((i) => i.variantId !== variantId));
    return;
  }
  write(
    list.map((i) =>
      i.variantId !== variantId
        ? i
        : i.grams !== undefined
          ? { variantId, grams: Math.min(MAX_GRAMS, Math.round(value)) }
          : { variantId, qty: Math.min(MAX_QTY, Math.round(value)) },
    ),
  );
}

export function remove(variantId: string) {
  write(current().filter((i) => i.variantId !== variantId));
}

export function clear() {
  write([]);
}

export function useCart() {
  const list = useSyncExternalStore(subscribe, current, () => EMPTY);
  const count = list.reduce((n, i) => n + (i.qty ?? 1), 0);
  return { items: list, count, add, setQuantity, remove, clear };
}
