// TIP-025b §B.6 — Chọn người phụ trách: ứng viên từ /conversations/:id/assignees (người + agent kèm tải mở, phiên bản agent), "Xem thêm"
// tải trang kế, tìm theo tên gửi q; chọn → onPick đúng loại; không inbox.assign → không gọi server, báo không quyền.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const calls: [string, Record<string, unknown> | undefined][] = [];
let allowed = true;
vi.mock('next-intl', () => ({ useTranslations: (ns: string) => (k: string, v?: Record<string, unknown>) => `${ns}.${k}${v ? JSON.stringify(v) : ''}` }));
vi.mock('@/shared/authz/useCan', () => ({ useCan: () => allowed }));
vi.mock('@/shared/api/client', () => ({
  transport: {
    get: async (path: string, p?: Record<string, unknown>) => {
      calls.push([path, p]);
      if (p?.cursor) return { data: [{ kind: 'agent', id: 'a2', name: 'Bot 2', role: 'Sales', load: 0, current: false, version: 1 }], next_cursor: null };
      return {
        data: [
          { kind: 'user', id: 'u1', name: 'Lan', role: 'Sales', load: 4, current: true },
          { kind: 'agent', id: 'a1', name: 'Bot CSKH', role: 'CSKH', load: 2, current: false, version: 3 },
        ],
        next_cursor: '2',
      };
    },
  },
}));

import { AssignPicker } from './AssignPicker';

const wrap = (onPick = vi.fn()) => (render(<QueryClientProvider client={new QueryClient()}><AssignPicker convId="c1" onPick={onPick} /></QueryClientProvider>), onPick);

describe('AssignPicker', () => {
  afterEach(() => {
    cleanup();
    calls.length = 0;
    allowed = true;
  });

  it('tải mở + phiên bản agent; chọn agent → onPick(id, true); xem thêm tải trang kế', async () => {
    const onPick = wrap();
    await waitFor(() => expect(screen.getByTestId('assign-agent-a1')).toBeTruthy());
    expect(screen.getByTestId('assign-user-u1').textContent).toContain('"load":4');
    expect(screen.getByTestId('assign-agent-a1').textContent).toContain('"version":3');
    fireEvent.click(screen.getByText('inbox.list.assignMore'));
    await waitFor(() => expect(screen.getByTestId('assign-agent-a2')).toBeTruthy());
    fireEvent.click(screen.getByTestId('assign-agent-a1'));
    expect(onPick).toHaveBeenCalledWith('a1', true);
  });

  it('tìm theo tên gửi q', async () => {
    wrap();
    fireEvent.change(screen.getByTestId('assign-search'), { target: { value: 'bot' } });
    await waitFor(() => expect(calls.some(([, p]) => p?.q === 'bot')).toBe(true));
  });

  it('không inbox.assign → không gọi server', async () => {
    allowed = false;
    wrap();
    expect(screen.getByText('inbox.list.assignDenied')).toBeTruthy();
    await new Promise((r) => setTimeout(r, 20));
    expect(calls).toHaveLength(0);
  });
});
