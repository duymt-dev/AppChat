// State form soạn báo giá: dòng hàng (catalog hoặc ngoài danh mục), chiết khấu dòng / tổng, tổng tiền + lý do cần duyệt (COMMERCE §3).
// TIP-026c: "Thuộc cơ hội" (không bắt buộc — D60 #11; null = không gắn) + hai cờ áp lúc gửi (cập nhật giá trị, việc theo dõi +2 ngày).
'use client';
import { useMemo, useState } from 'react';
import { approvalReasons, quoteTotals, QUOTE_VALID_DAYS, type ApprovalPolicy, type Discount } from '@appchat/shared';
import { sourceLinkOf, type SourceLink } from '@/shared/crm-forms/source-link';
import type { QuoteItem } from '../types';

export interface QuoteDraft {
  contact_id: string;
  owner_user_id: string;
  valid_days: number;
  items: QuoteItem[];
  header_pct: number;
  payment_terms: string;
  note: string;
  /** Nguồn Hộp thư (TIP-025b §D.3) — chỉ gửi kèm lệnh tạo. */
  source: SourceLink;
  opportunity_id: string | null;
  opportunity_sync_value: boolean;
  opportunity_follow_up: boolean;
}

const digits = (v: unknown) => String(v ?? '').replace(/\D/g, '');

export function initialQuoteDraft(prefill?: Record<string, unknown> | null): QuoteDraft {
  const pre = prefill ?? {};
  const items = Array.isArray(pre.items) ? (pre.items as QuoteItem[]) : [];
  const hd = pre.header_discount as Discount | undefined;
  return {
    contact_id: String(pre.contact_id ?? ''),
    owner_user_id: String(pre.owner_user_id ?? ''),
    valid_days: Number(pre.valid_days ?? QUOTE_VALID_DAYS),
    items,
    header_pct: hd?.kind === 'pct' ? hd.value : 0,
    payment_terms: String(pre.payment_terms ?? ''),
    note: String(pre.note ?? ''),
    source: sourceLinkOf(pre),
    opportunity_id: typeof pre.opportunity_id === 'string' && pre.opportunity_id ? pre.opportunity_id : null,
    opportunity_sync_value: pre.opportunity_sync_value !== false,
    opportunity_follow_up: pre.opportunity_follow_up !== false,
  };
}

export function useQuoteDraft(init: QuoteDraft, policy?: ApprovalPolicy) {
  const [d, setD] = useState(init);
  const set = <K extends keyof QuoteDraft>(k: K, v: QuoteDraft[K]) => setD((s) => ({ ...s, [k]: v }));
  const header: Discount | null = d.header_pct ? { kind: 'pct', value: d.header_pct } : null;
  const totals = useMemo(() => quoteTotals(d.items, header), [d.items, header?.value]); // eslint-disable-line react-hooks/exhaustive-deps
  const offCatalog = d.items.some((i) => !i.product_id);
  const reasons = approvalReasons(totals, { offCatalog, policy });
  const lines = {
    add: (item: QuoteItem) => setD((s) => ({ ...s, items: [...s.items, item] })),
    del: (i: number) => setD((s) => ({ ...s, items: s.items.filter((_, j) => j !== i) })),
    edit: (i: number, p: Partial<QuoteItem>) =>
      setD((s) => ({ ...s, items: s.items.map((r, j) => (j === i ? { ...r, ...p } : r)) })),
    money: (v: string) => digits(v),
  };
  const valid =
    !!d.contact_id &&
    d.items.length > 0 &&
    d.items.every((i) => i.name.trim() && i.qty > 0 && Number(i.unit_price) > 0);
  const input = {
    contact_id: d.contact_id,
    ...(d.owner_user_id ? { owner_user_id: d.owner_user_id } : {}),
    items: d.items.map((i) => ({ ...i, name: i.name.trim() })),
    header_discount: header,
    valid_days: d.valid_days,
    ...(d.payment_terms.trim() ? { payment_terms: d.payment_terms.trim() } : {}),
    ...(d.note.trim() ? { note: d.note.trim() } : {}),
    opportunity_id: d.opportunity_id,
    opportunity_sync_value: d.opportunity_sync_value,
    opportunity_follow_up: d.opportunity_follow_up,
  };
  return { d, set, lines, totals, reasons, valid, input };
}

export type QuoteDraftApi = ReturnType<typeof useQuoteDraft>;
