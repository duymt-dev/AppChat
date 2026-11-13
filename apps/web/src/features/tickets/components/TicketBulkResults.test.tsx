// TIP-034c §3.5 / §4.1: khung kết quả hàng loạt — đang chạy nền: không có nút Hoàn tác, có Dừng, báo còn bao nhiêu (không phải "đã xong");
// xong: tổng đổi / đúng sẵn / chưa áp dụng + mã an toàn từng id (không lộ tên ticket ẩn), Hoàn tác chỉ khi có ticket đã đổi; giao agent
// ghi rõ "agent chưa chạy"; hoàn tác một phần báo số xung đột, không giả "đã hoàn tác".
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import tickets from '../../../../messages/vi/tickets.json';
import { TicketBulkResults, type TicketBulkResultsProps } from './TicketBulkResults';
import type { BulkOp, TicketBulkResult, TicketBulkUndoResult } from '../bulk-types';

const OP: BulkOp = { ws: 'w1', jobId: 'j1', logId: 'al1', ids: ['a', 'b', 'c', 'd'], agent: false, undoJobId: null, settled: true };
const op = (status: TicketBulkResult['operation']['status'], pending = 0) => ({ job_id: 'j1', status, total: 4, pending });
const DONE: TicketBulkResult = {
  updated: 2,
  changed_count: 1,
  failed: 2,
  duplicates: 1,
  outcomes: [
    { id: 'a', ok: true, changed: true },
    { id: 'b', ok: true, changed: false },
    { id: 'c', ok: false, error: { code: 'INVALID_TRANSITION' } },
    { id: 'd', ok: false, error: { code: 'NOT_FOUND' } },
  ],
  operation: op('completed'),
};

function view(p: Partial<TicketBulkResultsProps>) {
  const props: TicketBulkResultsProps = { op: OP, result: DONE, undoResult: undefined, codeOf: (id) => `TKT-${id}`, onUndo: vi.fn(), onCancel: vi.fn(), onRetry: vi.fn(), onClose: vi.fn(), ...p };
  render(
    <NextIntlClientProvider locale="vi" messages={{ tickets }}>
      <TicketBulkResults {...props} />
    </NextIntlClientProvider>,
  );
  return props;
}

describe('TicketBulkResults', () => {
  afterEach(cleanup);

  it('xong: tổng + mã từng id + gộp trùng; Hoàn tác gọi action chuẩn', () => {
    const p = view({});
    expect(screen.getByTestId('tk-bulk-summary').textContent).toBe('1 ticket đã đổi · 1 đã đúng sẵn · 2 chưa áp dụng · Đã gộp 1 id trùng');
    const rows = screen.getByTestId('tk-bulk-failures').querySelectorAll('li');
    expect([...rows].map((r) => r.textContent)).toEqual(['TKT-cTicket đã đóng', 'TKT-dKhông tìm thấy hoặc không có quyền xem']);
    expect(screen.queryByTestId('tk-bulk-cancel')).toBeNull();
    fireEvent.click(screen.getByTestId('tk-bulk-undo'));
    expect(p.onUndo).toHaveBeenCalledOnce();
  });

  it('đang chạy nền: không Hoàn tác / Đóng, có Dừng, báo còn lại; không có ticket đã đổi → không Hoàn tác', () => {
    const p = view({ result: { ...DONE, outcomes: DONE.outcomes.map((o, n) => (n > 1 ? { id: o.id, ok: false, pending: true } : o)), operation: op('running', 2) } });
    expect(screen.getByTestId('tk-bulk-running').textContent).toContain('còn 2/4');
    expect(screen.queryByTestId('tk-bulk-undo')).toBeNull();
    expect(screen.queryByTestId('tk-bulk-close')).toBeNull();
    fireEvent.click(screen.getByTestId('tk-bulk-cancel'));
    expect(p.onCancel).toHaveBeenCalledOnce();
    cleanup();
    view({ result: { ...DONE, changed_count: 0, outcomes: DONE.outcomes.map((o) => (o.ok ? { ...o, changed: false } : o)) } });
    expect(screen.queryByTestId('tk-bulk-undo')).toBeNull();
  });

  it('giao agent ghi rõ chưa chạy; hoàn tác một phần báo xung đột (không giả đã hoàn tác)', () => {
    const undo: TicketBulkUndoResult = { undone: 0, conflicts: 1, failed: 1, outcomes: [{ id: 'a', ok: false, error: { code: 'CONFLICT' } }], operation: { job_id: 'u1', status: 'completed', total: 1, pending: 0 } };
    view({ op: { ...OP, agent: true, undoJobId: 'u1' }, undoResult: undo });
    expect(screen.getByTestId('tk-bulk-agent-note').textContent).toContain('agent chưa chạy');
    expect(screen.getByTestId('tk-bulk-undo-summary').textContent).toBe('Đã hoàn tác 0 ticket · 1 xung đột giữ nguyên · 0 không hoàn tác được');
    expect(screen.queryByTestId('tk-bulk-undo')).toBeNull();
    expect(screen.getAllByTestId('tk-bulk-failures')[1]!.textContent).toContain('Đã bị sửa sau thao tác này');
  });
});
