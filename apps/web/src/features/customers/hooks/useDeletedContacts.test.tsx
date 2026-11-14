// TIP-015f §5.4: thùng rác — trang cursor + tìm; khôi phục gửi if_version; 409 quá hạn / trùng SĐT / đã đổi → lý do riêng gắn đúng dòng,
// không toast chung; lỗi khác để useAction báo; luôn làm mới danh sách sau khi khôi phục.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiRequestError, type DeletedContact } from '@appchat/shared';

type Opts = { onError?: (e: ApiRequestError) => boolean };
const s = vi.hoisted(() => ({ run: vi.fn(), get: vi.fn() }));
vi.mock('@/shared/actions/useAction', () => ({ useAction: () => ({ run: s.run, isPending: false }) }));
vi.mock('@/shared/api/client', () => ({ transport: { get: s.get } }));

import { restoreProblem, useDeletedContacts } from './useDeletedContacts';

const row = (id: string): DeletedContact => ({ id, code: `KH-${id}`, name: id, phone: null, owner_user_id: null, deleted_at: '2026-11-01T00:00:00.000Z', restore_until: '2026-12-01T00:00:00.000Z', version: 3, status: 'restorable' });
const wrap = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  return Wrapper;
};

describe('useDeletedContacts', () => {
  beforeEach(() => {
    s.run.mockReset();
    s.get.mockReset();
  });
  afterEach(cleanup);

  it('trang cursor: trang 2 nối sau trang 1', async () => {
    s.get.mockImplementation(async (_p: string, q: { cursor?: string }) => (q.cursor ? { data: [row('c')], next_cursor: null } : { data: [row('a'), row('b')], next_cursor: 'b' }));
    const { result } = renderHook(() => useDeletedContacts(true), { wrapper: wrap() });
    await waitFor(() => expect(result.current.rows).toHaveLength(2));
    expect(s.get.mock.calls[0]![1]).toMatchObject({ limit: 30 });
    await act(async () => {
      await result.current.list.fetchNextPage();
    });
    await waitFor(() => expect(result.current.rows.map((r) => r.id)).toEqual(['a', 'b', 'c']));
  });

  it('khôi phục gửi if_version; 409 trùng SĐT → lý do gắn đúng dòng, không toast chung', async () => {
    s.get.mockResolvedValue({ data: [row('a')], next_cursor: null });
    s.run.mockImplementation(async (_i: unknown, o: Opts) => {
      expect(o.onError?.(new ApiRequestError(409, { code: 'CONFLICT', message: 'x', fields: { phone: 'taken' } }))).toBe(true);
      return null;
    });
    const { result } = renderHook(() => useDeletedContacts(true), { wrapper: wrap() });
    await waitFor(() => expect(result.current.rows).toHaveLength(1));
    let ok = true;
    await act(async () => {
      ok = await result.current.restore(row('a'));
    });
    expect(ok).toBe(false);
    expect(s.run.mock.calls[0]![0]).toEqual({ contact_id: 'a', if_version: 3 });
    expect(result.current.problem).toEqual({ id: 'a', kind: 'phone_taken' });
  });

  it('phân loại 409', () => {
    expect(restoreProblem(new ApiRequestError(409, { code: 'INVALID_STATE', message: 'x', fields: { contact_id: 'restore_expired' } }))).toBe('expired');
    expect(restoreProblem(new ApiRequestError(409, { code: 'STALE_VERSION', message: 'x' }))).toBe('changed');
    expect(restoreProblem(new ApiRequestError(403, { code: 'FORBIDDEN', message: 'x' }))).toBeNull();
  });
});
