// Trình duyệt phiên (REQ-E10a): debounce tìm kiếm, tải thêm theo cursor, khoá query theo workspace.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { mockTransport } from '@/shared/api/mock/mock-transport';
import { resetSessions } from '@/shared/api/mock/domains/assistant-sessions';
import { SESSIONS_DEBOUNCE_MS, sessionsQuery, useAssistantSessions } from './useAssistantSessions';

const wrap = ({ children }: { children: ReactNode }) => <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>;

beforeEach(async () => {
  resetSessions();
  for (let i = 0; i < 23; i++) await mockTransport.post('/assistant/messages', { text: i % 2 ? `Báo giá ${i}` : `Khách hàng ${i}`, mode: 'chat' });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('useAssistantSessions', () => {
  it('trang 20 + tải thêm theo cursor (không trùng); khoá query có workspace', async () => {
    const { result } = renderHook(() => useAssistantSessions(true), { wrapper: wrap });
    await waitFor(() => expect(result.current.rows).toHaveLength(20));
    expect(result.current.list.hasNextPage).toBe(true);
    await act(() => result.current.list.fetchNextPage());
    await waitFor(() => expect(result.current.rows).toHaveLength(23));
    expect(new Set(result.current.rows.map((r) => r.id)).size).toBe(23);
    expect(sessionsQuery('ws_a', '').queryKey).not.toEqual(sessionsQuery('ws_b', '').queryKey);
  });

  it('tìm kiếm chờ debounce rồi mới gọi', async () => {
    const { result } = renderHook(() => useAssistantSessions(true), { wrapper: wrap });
    await waitFor(() => expect(result.current.rows.length).toBeGreaterThan(0));
    act(() => result.current.setText('báo giá'));
    expect(result.current.q).toBe('');
    await waitFor(() => expect(result.current.q).toBe('báo giá'), { timeout: SESSIONS_DEBOUNCE_MS * 4 });
    await waitFor(() => expect(result.current.rows.every((r) => r.title.startsWith('Báo giá'))).toBe(true));
    expect(result.current.rows).toHaveLength(11);
  });
});
