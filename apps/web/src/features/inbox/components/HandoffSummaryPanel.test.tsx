// TIP-022b AC4 / AC8 — tóm tắt bàn giao trong thẻ "Cần người": đang tải / lỗi + thử lại / không có tóm tắt → không hiện; hành động AI giữ
// kết quả thật (pending ≠ xong, có tông cảnh báo); chưa giải quyết + tệp đính kèm chưa đọc được hiển thị qua i18n.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { HandoffSummaryDto } from '@appchat/shared';

const get = vi.hoisted(() => vi.fn());
vi.mock('next-intl', () => ({ useTranslations: (ns: string) => (k: string, v?: Record<string, unknown>) => `${ns}.${k}${v ? JSON.stringify(v) : ''}` }));
vi.mock('@/shared/api/client', () => ({ transport: { get } }));

import { HandoffSummaryPanel } from './HandoffSummaryPanel';

const SUMMARY: HandoffSummaryDto = {
  version: 2,
  reason: 'needs_human',
  request: 'Khách muốn chuyển khoản',
  facts: [{ label: 'Báo giá', value: 'BG-1', ref: { type: 'quote', id: 'q1' } }],
  actions: [
    { action_id: 'quote.get', status: 'ok', detail: '' },
    { action_id: 'payment_request.create', status: 'pending', detail: 'chờ duyệt' },
  ],
  unresolved: 'Số tài khoản',
  last_message_id: null,
  source: 'extractive',
  intent: 'buy',
  attachments_unreadable: 1,
  created_at: '2026-11-02T02:00:00Z',
};

const mount = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <HandoffSummaryPanel conversationId="c1" />
    </QueryClientProvider>,
  );
};

describe('HandoffSummaryPanel', () => {
  afterEach(() => {
    cleanup();
    get.mockReset();
  });

  it('đang tải → dòng tải; có tóm tắt → yêu cầu, dữ kiện, hành động theo kết quả thật', async () => {
    get.mockResolvedValue(SUMMARY);
    mount();
    expect(screen.getByTestId('handoff-summary-loading')).toBeTruthy();
    await screen.findByTestId('handoff-summary');
    expect(get).toHaveBeenCalledWith('/conversations/c1/handoff-summary');
    expect(screen.getByTestId('handoff-summary-request').textContent).toBe('Khách muốn chuyển khoản');
    expect(screen.getByTestId('handoff-summary-facts').textContent).toContain('Báo giá: BG-1');
    const acts = screen.getByTestId('handoff-summary-actions').querySelectorAll('[data-status]');
    expect([...acts].map((a) => a.getAttribute('data-status'))).toEqual(['ok', 'pending']);
    expect(acts[1]!.textContent).toContain('inbox.summary.status.pending');
    expect(screen.queryByText(/status\.ok.*payment_request/)).toBeNull();
    expect(screen.getByTestId('handoff-summary-unresolved').textContent).toBe('inbox.summary.unresolved{"text":"Số tài khoản"}');
    expect(screen.getByTestId('handoff-summary-attachments').textContent).toBe('inbox.summary.attachmentUnreadable{"n":1}');
  });

  it('không có tóm tắt (null) → không hiện gì', async () => {
    get.mockResolvedValue(null);
    const { container } = mount();
    await waitFor(() => expect(screen.queryByTestId('handoff-summary-loading')).toBeNull());
    expect(container.textContent).toBe('');
  });

  it('lỗi tải → thông báo + Thử lại gọi lại API', async () => {
    get.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce({ ...SUMMARY, request: '' });
    mount();
    fireEvent.click(await screen.findByTestId('handoff-summary-retry'));
    await screen.findByTestId('handoff-summary');
    expect(get).toHaveBeenCalledTimes(2);
    expect(screen.getByText('inbox.summary.unknown')).toBeTruthy();
  });
});
