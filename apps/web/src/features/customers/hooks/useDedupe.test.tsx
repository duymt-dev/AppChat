// TIP-015e §1.3: kiểm tra trùng — đọc ứng viên thật (tìm, Xem thêm); "Hợp nhất đã chọn" chỉ gửi cặp đã chọn theo bản chính người dùng
// chọn (`<chính>~<phụ>`); đổi tìm bỏ chọn cũ; 409 giữ lựa chọn + báo xung đột (không tự thử lại).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiRequestError, type DuplicateCandidate } from '@appchat/shared';

type Opts = { onError?: (e: ApiRequestError) => boolean };
const s = vi.hoisted(() => ({ run: vi.fn(), get: vi.fn() }));
vi.mock('@/shared/actions/useAction', () => ({ useAction: () => ({ run: s.run, isPending: false }) }));
vi.mock('@/shared/api/client', () => ({ transport: { get: s.get } }));

import { groupId, useDedupe } from './useDedupe';

const side = (id: string, day: string): DuplicateCandidate['a'] => ({ id, code: `KH-${id}`, name: id, email: null, phone: null, source: 'manual', created_at: `2026-11-0${day}T00:00:00.000Z`, version: 1 });
const cand = (a: string, b: string, rank = 3): DuplicateCandidate => ({ key: `${a}~${b}`, score_kind: 'rule', rank, evidence: ['email'], primary_id: a, a: side(a, '1'), b: side(b, '2') });
const wrap = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  return Wrapper;
};

describe('useDedupe', () => {
  beforeEach(() => {
    s.run.mockReset();
    s.get.mockReset();
  });
  afterEach(cleanup);

  it('Hợp nhất đã chọn chỉ gửi cặp đã chọn, theo bản chính đổi tay', async () => {
    s.get.mockResolvedValue({ data: [cand('a1', 'b1'), cand('a2', 'b2'), cand('a3', 'b3')], next_cursor: null });
    s.run.mockResolvedValue({ merged: 2 });
    const { result } = renderHook(() => useDedupe(), { wrapper: wrap() });
    await waitFor(() => expect(result.current.rows).toHaveLength(3));
    act(() => {
      result.current.toggle('a1~b1');
      result.current.toggle('a3~b3');
      result.current.choosePrimary('a3~b3', 'b3');
    });
    await act(async () => {
      await result.current.mergePicked();
    });
    expect(s.run.mock.calls[0]![0]).toEqual({ group_ids: ['a1~b1', 'b3~a3'] });
    expect(result.current.picked.size).toBe(0);
  });

  it('tìm gửi q và bỏ lựa chọn cũ; Xem thêm nối trang', async () => {
    s.get.mockImplementation(async (_p: string, q: { q?: string; cursor?: string }) =>
      q.cursor ? { data: [cand('c', 'd', 1)], next_cursor: null } : { data: [cand('a', 'b')], next_cursor: q.q ? null : 'x' },
    );
    const { result } = renderHook(() => useDedupe(), { wrapper: wrap() });
    await waitFor(() => expect(result.current.more).toBe(true));
    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.rows.map((r) => r.key)).toEqual(['a~b', 'c~d']));
    act(() => result.current.toggle('a~b'));
    act(() => result.current.setDraft(' Lan '));
    act(() => result.current.search());
    await waitFor(() => expect(s.get.mock.calls.at(-1)![1]).toMatchObject({ q: 'Lan', limit: 20 }));
    expect(result.current.picked.size).toBe(0);
  });

  it('409 → giữ lựa chọn, báo xung đột, không thử lại', async () => {
    s.get.mockResolvedValue({ data: [cand('a', 'b')], next_cursor: null });
    s.run.mockImplementation(async (_i: unknown, o: Opts) => {
      expect(o.onError?.(new ApiRequestError(409, { code: 'STALE_VERSION', message: 'x' }))).toBe(true);
      return null;
    });
    const { result } = renderHook(() => useDedupe(), { wrapper: wrap() });
    await waitFor(() => expect(result.current.rows).toHaveLength(1));
    act(() => result.current.toggle('a~b'));
    await act(async () => {
      await result.current.mergePicked();
    });
    expect(s.run).toHaveBeenCalledTimes(1);
    expect(result.current.conflict).toBe(true);
    expect(result.current.picked.has('a~b')).toBe(true);
  });

  it('groupId theo bản chính', () => {
    expect(groupId(cand('a', 'b'), 'b')).toBe('b~a');
    expect(groupId(cand('a', 'b'), 'a')).toBe('a~b');
  });
});
