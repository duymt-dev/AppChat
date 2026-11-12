// TIP-034: route mock Ticket đúng shape đọc dùng chung với API thật (packages/shared/src/api/tickets.ts) + luồng theo TICKET_FLOW (sai
// bước → INVALID_TRANSITION; phụ trách đúng một; trùng khách + danh mục 24 giờ → CONFLICT duplicate_of / gộp; hạn SLA theo chính sách mặc định).
import { beforeEach, describe, expect, it } from 'vitest';
import { ticketRowSchema, ticketsMetaSchema, ticketsPageSchema } from '@appchat/shared';
import { mockTransport } from './mock-transport';
import { mockDb, setMockRole } from './store';
import { createTicketsState } from './domains/tickets';
import { ticketsHandlers } from './domains/tickets-actions';

const issues = (r: { success: boolean; error?: { issues: unknown[] } }) => (r.success ? [] : r.error!.issues);
const run = (id: string, input: unknown) => ticketsHandlers[id]!.execute(mockDb(), input as never) as Record<string, unknown>;
const code = async (fn: () => unknown) => {
  try {
    await fn();
    return null;
  } catch (e) {
    return (e as { error?: { code: string } }).error?.code ?? 'throw';
  }
};

describe('mock ticket — shape FE ↔ BE', () => {
  beforeEach(() => {
    mockDb().tickets = createTicketsState();
    setMockRole('owner');
  });

  it('GET /tickets (D42) · /tickets/:id · /tickets/meta', async () => {
    expect(issues(ticketsPageSchema.safeParse(await mockTransport.get('/tickets', { page: 1, limit: 20 })))).toEqual([]);
    expect(issues(ticketRowSchema.safeParse(await mockTransport.get('/tickets/tk_2041')))).toEqual([]);
    expect(issues(ticketsMetaSchema.safeParse(await mockTransport.get('/tickets/meta')))).toEqual([]);
  });

  it('luồng: sai bước INVALID_TRANSITION; phụ trách đúng một; trùng 24 giờ → hỏi gộp / gộp; hạn SLA mặc định', async () => {
    expect(await code(() => run('ticket.reopen', { ticket_id: 'tk_2041' }))).toBe('INVALID_TRANSITION');
    expect(await code(() => run('ticket.assign', { ticket_id: 'tk_2041' }))).toBe('VALIDATION_FAILED');
    const base = { title: 'Giao sai màu', channel: 'zalo_personal', category: 'Delivery', priority: 'high', contact_id: 'ct_x' };
    const first = run('ticket.create', base);
    expect(await code(() => run('ticket.create', base))).toBe('CONFLICT');
    expect(run('ticket.create', { ...base, on_duplicate: 'merge' })).toMatchObject({ ticket_id: first.ticket_id, merged: true });
    const t = ticketRowSchema.parse(await mockTransport.get(`/tickets/${String(first.ticket_id)}`));
    expect([t.frt_target_min, t.ttr_target_min]).toEqual([10, 240]);
    run('ticket.close', { ticket_id: t.id, reason: 'resolved' });
    expect(await code(() => run('ticket.set_status', { ticket_id: t.id, status: 'open' }))).toBe('INVALID_TRANSITION');
  });
});
