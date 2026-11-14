// State form tạo đề nghị thanh toán (crmSpec.invoices L8413 + COMMERCE §5): khách, đơn liên quan (điền sẵn khách / số còn phải thu),
// loại cọc / đợt / toàn bộ, số tiền (≤ đơn còn phải thu), hạn (mặc định +7 ngày), nội dung, ghi chú → input invoice.create.
'use client';
import { useState } from 'react';
import type { InvoiceKind } from '../types';

export interface InvoiceDraft {
  contact_id: string;
  order_id: string;
  kind: InvoiceKind;
  amount: string;
  due_date: string;
  title: string;
  note: string;
}

export interface OrderPick {
  id: string;
  code: string;
  contact_id: string;
  contact_name: string;
  left: number;
  title: string;
}

const digits = (v: string) => v.replace(/\D/g, '');
const str = (v: unknown) => (typeof v === 'string' ? v : '');
export const addDays = (d: string, n: number) =>
  new Date(Date.parse(`${d}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

/** Draft ban đầu; prefill `order_id` (từ đơn / Trợ lý) điền khách + số đơn còn phải thu + nội dung. */
export function initialInvoiceDraft(
  today: string,
  prefill: Record<string, unknown> | null,
  orders: OrderPick[],
): InvoiceDraft {
  const p = prefill ?? {};
  const o = orders.find((x) => x.id === str(p.order_id));
  return {
    contact_id: str(p.contact_id) || (o?.contact_id ?? ''),
    order_id: o?.id ?? '',
    kind: (['deposit', 'installment', 'full'].includes(str(p.kind)) ? p.kind : 'full') as InvoiceKind,
    amount: digits(str(p.amount)) || (o ? String(o.left) : ''),
    due_date: str(p.due_date) || addDays(today, 7),
    title: str(p.title) || (o?.title ?? ''),
    note: str(p.note),
  };
}

export function useInvoiceForm(init: InvoiceDraft, orders: OrderPick[]) {
  const [d, setD] = useState(init);
  const set = <K extends keyof InvoiceDraft>(k: K, v: InvoiceDraft[K]) => setD((s) => ({ ...s, [k]: v }));
  const order = orders.find((o) => o.id === d.order_id);
  /** Chọn đơn → điền khách + số còn phải thu (loại Toàn bộ) + nội dung. */
  const pickOrder = (id: string) => {
    const o = orders.find((x) => x.id === id);
    setD((s) => ({
      ...s,
      order_id: id,
      ...(o
        ? { contact_id: o.contact_id, amount: s.amount || String(o.left), title: s.title || o.title }
        : {}),
    }));
  };
  const valid = !!d.contact_id && Number(d.amount) > 0;
  const over = !!order && Number(d.amount) > order.left;
  const input = {
    contact_id: d.contact_id,
    kind: d.kind,
    amount: d.amount,
    due_date: d.due_date,
    ...(d.order_id ? { order_id: d.order_id } : {}),
    ...(d.title.trim() ? { title: d.title.trim() } : {}),
    ...(d.note.trim() ? { note: d.note.trim() } : {}),
  };
  return { d, set, pickOrder, order, money: digits, valid, over, input };
}
