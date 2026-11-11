// Đồng phụ trách (conversation_assignee) trong submenu "Phân công": hiện chip hiện có + nút gỡ gọi conversation.remove_assignee; mở
// picker → lọc bỏ người đã current/co_assignee, chọn → gọi conversation.add_assignee; không inbox.assign → không hiện gì.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const runCalls: [string, Record<string, unknown> | undefined][] = [];
let allowed = true;
vi.mock('next-intl', () => ({ useTranslations: (ns: string) => (k: string, v?: Record<string, unknown>) => `${ns}.${k}${v ? JSON.stringify(v) : ''}` }));
vi.mock('@/shared/authz/useCan', () => ({ useCan: () => allowed }));
vi.mock('@/shared/actions/useAction', () => ({
  useAction: (id: string) => ({ run: async (input: Record<string, unknown>) => { runCalls.push([id, input]); return { ok: true }; } }),
}));
vi.mock('@/shared/api/client', () => ({
  transport: {
    get: async () => ({
      data: [
        { kind: 'user', id: 'u1', name: 'Lan', role: 'Sales', load: 1, current: true, co_assignee: false },
        { kind: 'user', id: 'u2', name: 'Trâm', role: 'Sales', load: 0, current: false, co_assignee: true },
        { kind: 'agent', id: 'a1', name: 'Bot CSKH', role: 'CSKH', load: 0, current: false, co_assignee: false, version: 1 },
      ],
      next_cursor: null,
    }),
  },
}));

import { CoAssigneesSection } from './CoAssigneesSection';
import type { Conversation } from '../types';

const conv = { id: 'c1', co_assignees: [{ kind: 'agent' as const, id: 'a9', name: 'Bot Mọi kênh' }] } as unknown as Conversation;

const wrap = (c = conv) => render(<QueryClientProvider client={new QueryClient()}><CoAssigneesSection conv={c} /></QueryClientProvider>);

describe('CoAssigneesSection', () => {
  afterEach(() => {
    cleanup();
    runCalls.length = 0;
    allowed = true;
  });

  it('hiện chip hiện có; bấm chip → gọi remove_assignee', () => {
    wrap();
    expect(screen.getByText(/Bot Mọi kênh/)).toBeTruthy();
    fireEvent.click(screen.getByText(/Bot Mọi kênh/));
    expect(runCalls).toEqual([['conversation.remove_assignee', { conversation_id: 'c1', kind: 'agent', assignee_id: 'a9' }]]);
  });

  it('chưa có đồng phụ trách → báo trống', () => {
    wrap({ id: 'c2' } as unknown as Conversation);
    expect(screen.getByText('inbox.list.coAssigneesNone')).toBeTruthy();
  });

  it('mở picker: lọc bỏ current + co_assignee, chọn → gọi add_assignee', async () => {
    wrap();
    fireEvent.click(screen.getByTestId('co-assignee-open-picker'));
    await waitFor(() => expect(screen.getByTestId('co-assignee-pick-agent-a1')).toBeTruthy());
    expect(screen.queryByTestId('co-assignee-pick-user-u1')).toBeNull();
    expect(screen.queryByTestId('co-assignee-pick-user-u2')).toBeNull();
    fireEvent.click(screen.getByTestId('co-assignee-pick-agent-a1'));
    expect(runCalls).toEqual([['conversation.add_assignee', { conversation_id: 'c1', kind: 'agent', assignee_id: 'a1' }]]);
  });

  it('không inbox.assign → không hiện gì', () => {
    allowed = false;
    const { container } = wrap();
    expect(container.textContent).toBe('');
  });
});
