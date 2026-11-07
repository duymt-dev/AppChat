// TIP-025b §G.2 — thẻ duyệt Hộp thư: không có thẻ → ẩn hẳn; mặc định chỉ thẻ chờ duyệt, "Xem tất cả" mở thẻ đã xử lý; đã duyệt chưa chạy
// → nhãn "đang chờ chạy" (không phải đã gửi); duyệt gọi approval.approve đúng một lần; không có quyền duyệt → nút khoá; lỗi tải có trạng thái.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const runs: [string, unknown][] = [];
let data: unknown = null;
vi.mock('next-intl', () => ({ useTranslations: (ns: string) => (k: string) => `${ns}.${k}` }));
vi.mock('@/shared/actions/useAction', () => ({ useAction: (id: string) => ({ isPending: false, run: async (i: unknown) => (runs.push([id, i]), { result: {} }) }) }));
vi.mock('@/shared/api/client', () => ({
  transport: {
    get: async () => {
      if (data instanceof Error) throw data;
      return data;
    },
  },
}));

import { InboxApprovals } from './InboxApprovals';

const row = (id: string, o: Record<string, unknown>) => ({
  id, action_id: 'quote.approve', risk: 'money', permission: 'quote.approve', agent: 'Sale AI', title: `T ${id}`, summary: 's', reason: 'r', day: 'today', time: '09:00',
  status: 'pending', can_decide: true, input: {}, fields: [], ...o,
});
const wrap = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><InboxApprovals conversationId="c1" /></QueryClientProvider>);

describe('InboxApprovals', () => {
  afterEach(() => {
    cleanup();
    runs.length = 0;
  });

  it('không có thẻ → không render gì', async () => {
    data = { items: [], pending: 0 };
    const { container } = wrap();
    await new Promise((r) => setTimeout(r, 20));
    expect(container.innerHTML).toBe('');
  });

  it('chỉ chờ duyệt mặc định; Xem tất cả hiện đã duyệt chờ chạy; duyệt gọi action một lần', async () => {
    data = { items: [row('a1', {}), row('a2', { status: 'approved', executed: false })], pending: 1 };
    wrap();
    await waitFor(() => expect(screen.getAllByTestId('ap-card')).toHaveLength(1));
    expect(screen.queryByTestId('inbox-approval-waiting')).toBeNull();
    fireEvent.click(screen.getByTestId('inbox-approvals-all'));
    expect(screen.getAllByTestId('ap-card')).toHaveLength(2);
    expect(screen.getByTestId('inbox-approval-waiting').textContent).toBe('inbox.approvals.waitingRun');
    fireEvent.click(screen.getByTestId('ap-approve'));
    expect(runs).toEqual([['approval.approve', { approval_id: 'a1' }]]);
  });

  it('không có quyền duyệt action gốc → nút khoá; lỗi tải có trạng thái', async () => {
    data = { items: [row('a1', { can_decide: false })], pending: 1 };
    wrap();
    await waitFor(() => expect((screen.getByTestId('ap-approve') as HTMLButtonElement).disabled).toBe(true));
    cleanup();
    data = new Error('x');
    wrap();
    await waitFor(() => expect(screen.getByTestId('inbox-approvals-error')).toBeTruthy());
  });
});
