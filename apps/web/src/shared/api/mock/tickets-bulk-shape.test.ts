// TIP-034c: mock sửa ticket hàng loạt đúng hợp đồng native — kết quả từng id theo thứ tự nhập (đóng → INVALID_TRANSITION, id lạ →
// NOT_FOUND, đã đúng → no-op, version lệch → STALE_VERSION, trùng gộp một lần), luôn xem trước; > 50 → 202 rồi đọc /data-jobs/:id/result;
// hoàn tác thô log cha → 409 UNDO_REQUIRES_ACTION; ticket.bulk_undo khôi phục chỉ ticket chưa bị sửa sau (còn lại CONFLICT), hội tụ, niêm
// phong (thử lại đi → 409); log cha chỉ thành "đã hoàn tác" khi hoàn tác hết.
import { beforeEach, describe, expect, it } from 'vitest';
import { ticketBulkResultSchema, ticketBulkUndoResultSchema, type TicketBulkResult, type TicketBulkUndoResult } from '@appchat/shared';
import { mockTransport } from './mock-transport';
import { mockDb, setMockRole } from './store';
import { createTicketsState } from './domains/tickets';
import { createAssistantState } from './domains/assistant';

type Res = Awaited<ReturnType<typeof mockTransport.action>>;
const MINH = 'u_minh';

/** Gửi action có xem trước: lần 1 → preview_required, lần 2 kèm confirm_token. */
async function confirmed(id: string, input: unknown): Promise<Res> {
  const first = await mockTransport.action(id, input);
  if (first.status !== 202 || first.data.status !== 'preview_required') return first;
  return mockTransport.action(id, input, { confirmToken: first.data.confirm_token });
}
const tk = (id: string) => mockDb().tickets.tickets.find((t) => t.id === id)!;

describe('mock ticket.bulk_update / ticket.bulk_undo', () => {
  beforeEach(() => {
    setMockRole('owner');
    mockDb().tickets = createTicketsState();
    mockDb().assistant = createAssistantState();
  });

  it('≤ 50: luôn xem trước; kết quả từng id theo thứ tự nhập; trùng gộp; version lệch → STALE_VERSION', async () => {
    const first = await mockTransport.action('ticket.bulk_update', { ticket_ids: ['tk_2041'], priority: 'low' });
    expect(first.status === 202 && first.data.status).toBe('preview_required');
    const ids = ['tk_2041', 'tk_2037', 'tk_x', 'tk_2041', 'tk_2034', 'tk_2033'];
    tk('tk_2033').priority = 'low';
    const r = await confirmed('ticket.bulk_update', { ticket_ids: ids, priority: 'low', if_versions: { tk_2034: 9 } });
    expect(r.status).toBe(200);
    const out = (r.status === 200 ? r.data.result : null) as TicketBulkResult;
    expect(ticketBulkResultSchema.safeParse(out).success).toBe(true);
    expect(out.outcomes).toEqual([
      { id: 'tk_2041', ok: true, changed: true },
      { id: 'tk_2037', ok: false, error: { code: 'INVALID_TRANSITION' } },
      { id: 'tk_x', ok: false, error: { code: 'NOT_FOUND' } },
      { id: 'tk_2034', ok: false, error: { code: 'STALE_VERSION' } },
      { id: 'tk_2033', ok: true, changed: false },
    ]);
    expect(out).toMatchObject({ updated: 2, changed_count: 1, failed: 3, duplicates: 1, operation: { status: 'completed', pending: 0 } });
    expect(tk('tk_2041')).toMatchObject({ priority: 'low', version: 2 });
  });

  it('hoàn tác thô → 409 UNDO_REQUIRES_ACTION; bulk_undo: CONFLICT cho ticket sửa sau, hội tụ, niêm phong', async () => {
    const r = await confirmed('ticket.bulk_update', { ticket_ids: ['tk_2041', 'tk_2034'], assignee_user_id: MINH });
    const logId = r.status === 200 ? r.data.action_log_id : '';
    await expect(mockTransport.undo(logId)).rejects.toMatchObject({ status: 409, error: { code: 'UNDO_REQUIRES_ACTION', fields: { undo_action: 'ticket.bulk_undo', parent_action_log_id: logId } } });
    // Sửa sau thao tác → hoàn tác giữ nguyên ticket đó.
    tk('tk_2034').version = (tk('tk_2034').version ?? 1) + 1;
    const u = await confirmed('ticket.bulk_undo', { parent_action_log_id: logId });
    const undo = (u.status === 200 ? u.data.result : null) as TicketBulkUndoResult;
    expect(ticketBulkUndoResultSchema.safeParse(undo).success).toBe(true);
    expect(undo).toMatchObject({ undone: 1, conflicts: 1, failed: 1 });
    expect(tk('tk_2041').assignee_user_id).not.toBe(MINH);
    expect(tk('tk_2034').assignee_user_id).toBe(MINH);
    // Một phần → log cha KHÔNG thành "đã hoàn tác".
    expect(mockDb().assistant.logs.find((l) => l.id === logId)?.undone).toBeFalsy();
    // Hội tụ: gửi lại → cùng lượt hoàn tác, không ghi thêm.
    const again = await confirmed('ticket.bulk_undo', { parent_action_log_id: logId });
    expect(again.status === 200 && (again.data.result as TicketBulkUndoResult).operation.job_id).toBe(undo.operation.job_id);
    // Niêm phong: thử lại thao tác đi → 409.
    await expect(mockTransport.action('data_job.retry', { job_id: (r.status === 200 ? (r.data.result as TicketBulkResult) : null)!.operation.job_id })).rejects.toMatchObject({ status: 409 });
  });

  it('> 50: 202 job_accepted → /data-jobs/:id/result chạy dần (pending → completed); hoàn tác hết → log cha đã hoàn tác', async () => {
    const base = mockDb().tickets.tickets[0]!;
    for (let n = 0; n < 60; n++) mockDb().tickets.tickets.push({ ...structuredClone(base), id: `tk_b${n}`, code: `TKT-B${n}`, status: 'open', priority: 'medium' });
    const ids = Array.from({ length: 60 }, (_, n) => `tk_b${n}`);
    const r = await confirmed('ticket.bulk_update', { ticket_ids: ids, priority: 'high' });
    expect(r.status === 202 && r.data.status).toBe('job_accepted');
    const acc = r.status === 202 && r.data.status === 'job_accepted' ? r.data : null;
    const p1 = await mockTransport.get<TicketBulkResult>(`/data-jobs/${acc!.job_id}/result`);
    expect(p1.operation.status).toBe('running');
    expect(p1.outcomes[0]).toEqual({ id: 'tk_b0', ok: false, pending: true });
    // Chưa xong → hoàn tác báo OPERATION_BUSY.
    await expect(mockTransport.action('ticket.bulk_undo', { parent_action_log_id: acc!.action_log_id })).rejects.toMatchObject({ status: 409, error: { code: 'OPERATION_BUSY' } });
    const p2 = await mockTransport.get<TicketBulkResult>(`/data-jobs/${acc!.job_id}/result`);
    expect(p2).toMatchObject({ changed_count: 60, operation: { status: 'completed', pending: 0 } });
    const u = await confirmed('ticket.bulk_undo', { parent_action_log_id: acc!.action_log_id });
    expect(u.status === 202 && u.data.status).toBe('job_accepted');
    const uid = u.status === 202 && u.data.status === 'job_accepted' ? u.data.job_id : '';
    await mockTransport.get(`/data-jobs/${uid}/result`);
    expect(await mockTransport.get<TicketBulkUndoResult>(`/data-jobs/${uid}/result`)).toMatchObject({ undone: 60, failed: 0 });
    expect(mockDb().assistant.logs.find((l) => l.id === acc!.action_log_id)?.undone).toBe(true);
    expect(tk('tk_b0').priority).toBe('medium');
  });
});
