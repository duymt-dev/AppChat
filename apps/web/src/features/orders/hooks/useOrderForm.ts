// State form tạo đơn (crmSpec.orders L8409 + COMMERCE §4): khách, dòng hàng từ catalog, cọc (≤ tổng), phụ trách, giao hàng, ghi chú → input order.create.
'use client';
import { useMemo, useState } from 'react';
import { quoteTotals } from '@appchat/shared';
import type { OrderItem } from '../types';

export interface OrderDraft {
  contact_id: string;
  items: OrderItem[];
  deposit: string;
  owner_user_id: string;
  shipping: { address: string; receiver: string; receiver_phone: string; eta: string };
  note: string;
}

const digits = (v: unknown) => String(v ?? '').replace(/\D/g, '');
const str = (v: unknown) => (typeof v === 'string' ? v : '');

export function initialOrderDraft(prefill?: Record<string, unknown> | null): OrderDraft {
  const p = prefill ?? {};
  return {
    contact_id: str(p.contact_id),
    items: Array.isArray(p.items) ? (p.items as OrderItem[]) : [],
    deposit: digits(p.deposit_amount),
    owner_user_id: str(p.owner_user_id),
    shipping: { address: '', receiver: '', receiver_phone: '', eta: '' },
    note: str(p.note),
  };
}

export function useOrderForm(init: OrderDraft) {
  const [d, setD] = useState(init);
  const set = <K extends keyof OrderDraft>(k: K, v: OrderDraft[K]) => setD((s) => ({ ...s, [k]: v }));
  const setShip = (k: keyof OrderDraft['shipping'], v: string) =>
    setD((s) => ({ ...s, shipping: { ...s.shipping, [k]: v } }));
  const totals = useMemo(() => quoteTotals(d.items), [d.items]);
  const lines = {
    add: (it: OrderItem) =>
      setD((s) => {
        const i = s.items.findIndex((x) => x.product_id && x.product_id === it.product_id);
        if (i < 0) return { ...s, items: [...s.items, it] };
        return { ...s, items: s.items.map((x, j) => (j === i ? { ...x, qty: x.qty + 1 } : x)) };
      }),
    del: (i: number) => setD((s) => ({ ...s, items: s.items.filter((_, j) => j !== i) })),
  };
  const valid = !!d.contact_id && d.items.length > 0;
  const depositOver = Number(d.deposit || 0) > Number(totals.total);
  const input = {
    contact_id: d.contact_id,
    items: d.items,
    ...(Number(d.deposit) > 0 ? { deposit_amount: d.deposit } : {}),
    ...(d.owner_user_id ? { owner_user_id: d.owner_user_id } : {}),
    ...(Object.values(d.shipping).some(Boolean) ? { shipping: d.shipping } : {}),
    ...(d.note.trim() ? { note: d.note.trim() } : {}),
  };
  return { d, set, setShip, lines, totals, money: digits, valid, depositOver, input };
}
