// Lịch sử ví lọc phía server (TIP-039 pha 3, AC07): `GET /billing/ledger?dir&source&from&to&cursor` — lọc trước LIMIT (không lọc 50 dòng
// đầu ở FE rồi bỏ bản ghi), tải thêm theo `next_cursor`. Khoá query dưới `['billing']` → mua / nạp / ghi nhận làm mới cùng màn Ví.
'use client';
import { useState } from 'react';
import { infiniteQueryOptions, useInfiniteQuery } from '@tanstack/react-query';
import { transport } from '@/shared/api/client';
import type { WalletData } from '../types';

export const LEDGER_DIRS = ['all', 'in', 'out'] as const;
export const LEDGER_SOURCES = ['all', 'plan', 'inbox', 'assistant', 'marketing', 'ai', 'qr', 'bank'] as const;
export const LEDGER_PERIODS = ['all', 'month', 'd30'] as const;
const PAGE = 50;

export interface LedgerFilters {
  dir: (typeof LEDGER_DIRS)[number];
  source: (typeof LEDGER_SOURCES)[number];
  period: (typeof LEDGER_PERIODS)[number];
}

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Kỳ → from / to (ngày theo giờ máy người xem; `to` là ngày cuối, gồm cả ngày đó). */
export function periodRange(p: LedgerFilters['period'], now = new Date()): { from?: string; to?: string } {
  if (p === 'month') return { from: ymd(new Date(now.getFullYear(), now.getMonth(), 1)), to: ymd(now) };
  if (p === 'd30')
    return { from: ymd(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29)), to: ymd(now) };
  return {};
}

export const ledgerQuery = (f: LedgerFilters) =>
  infiniteQueryOptions({
    queryKey: ['billing', 'ledger', f.dir, f.source, f.period],
    queryFn: ({ pageParam }) =>
      transport.get<{ data: WalletData['ledger']; next_cursor: string | null }>('/billing/ledger', {
        limit: PAGE,
        ...(f.dir !== 'all' ? { dir: f.dir } : {}),
        ...(f.source !== 'all' ? { source: f.source } : {}),
        ...periodRange(f.period),
        ...(pageParam ? { cursor: pageParam } : {}),
      }),
    initialPageParam: '',
    getNextPageParam: (last) => last.next_cursor ?? undefined,
  });

export function useWalletLedger() {
  const [f, setF] = useState<LedgerFilters>({ dir: 'all', source: 'all', period: 'all' });
  const q = useInfiniteQuery(ledgerQuery(f));
  const rows = q.data?.pages.flatMap((p) => p.data) ?? [];
  return { f, set: (patch: Partial<LedgerFilters>) => setF((cur) => ({ ...cur, ...patch })), rows, q };
}
