// TIP-026b §4.2–4.3: kanban phân trang theo cột — "Tải thêm" gộp trang + bỏ trùng theo id, cột khác không đổi; kéo thẻ gửi if_version của
// thẻ; 409 → báo + làm mới bảng (không giả cột mới).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { ApiRequestError } from '@appchat/shared';

const s = vi.hoisted(() => ({ get: vi.fn(), run: vi.fn(), warn: vi.fn() }));
vi.mock('@/shared/api/client', () => ({ transport: { get: s.get } }));
vi.mock('@/shared/actions/useAction', () => ({ useAction: () => ({ run: s.run, isPending: false }) }));
vi.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
vi.mock('antd', () => ({ App: { useApp: () => ({ message: { warning: s.warn } }) } }));

import { useCustomerBoard } from './useCustomerBoard';

const row = (id: string, stage: string, version = 1) => ({ id, stage, version }) as never;
const BOARD = {
  columns: [
    { key: 'lead', color: '#000', total: 3, rows: [row('a', 'lead'), row('b', 'lead')], next_cursor: 'c1' },
    { key: 'quote', color: '#111', total: 1, rows: [row('q', 'quote', 4)], next_cursor: null },
  ],
  limit: 2,
};

let qc: QueryClient;
const wrap = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;

describe('useCustomerBoard', () => {
  beforeEach(() => {
    qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    s.get.mockReset();
    s.run.mockReset();
    s.warn.mockReset();
  });
  afterEach(cleanup);

  it('Tải thêm: gộp + bỏ trùng; cursor cột hết; cột khác giữ nguyên', async () => {
    s.get.mockImplementation(async (path: string) => (path === '/contacts/board' ? BOARD : { data: [row('b', 'lead'), row('c', 'lead')], next_cursor: null }));
    const { result } = renderHook(() => useCustomerBoard({ stage: 'all' } as never, true), { wrapper: wrap });
    await waitFor(() => expect(result.current.columns).toHaveLength(2));
    await act(() => result.current.loadMore('lead'));
    const lead = result.current.columns.find((c) => c.key === 'lead')!;
    expect(lead.rows.map((r) => r.id)).toEqual(['a', 'b', 'c']);
    expect(lead.next_cursor).toBeNull();
    expect(s.get).toHaveBeenCalledWith('/contacts/board/lead', expect.objectContaining({ cursor: 'c1' }));
    expect(result.current.columns.find((c) => c.key === 'quote')!.rows).toHaveLength(1);
  });

  it('kéo thẻ gửi if_version; 409 → cảnh báo + làm mới bảng', async () => {
    s.get.mockResolvedValue(BOARD);
    s.run.mockImplementation(async (_i: unknown, opts: { onError: (e: ApiRequestError) => boolean }) => {
      opts.onError(new ApiRequestError(409, { code: 'STALE_VERSION', message: 'v' }));
      return null;
    });
    const { result } = renderHook(() => useCustomerBoard({ stage: 'all' } as never, true), { wrapper: wrap });
    await waitFor(() => expect(result.current.rows).toHaveLength(3));
    const calls = s.get.mock.calls.length;
    await act(() => result.current.move(row('q', 'quote', 4), 'contract'));
    expect(s.run).toHaveBeenCalledWith({ contact_id: 'q', stage: 'contract', if_version: 4 }, expect.anything());
    expect(s.warn).toHaveBeenCalledWith('stale');
    await waitFor(() => expect(s.get.mock.calls.length).toBeGreaterThan(calls));
  });
});
