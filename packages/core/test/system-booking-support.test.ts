// TIP-003c §3.4, §4.4 (AC4): lịch hẹn (giữ chỗ / nhắc theo giờ bắt đầu) và ticket (tin nguồn cùng hội thoại / mốc SLA theo hạn hiện
// hành). Dời lịch / gia hạn SLA làm đổi thế hệ → trigger cũ 409; tin của hội thoại khác → 404 (không chép nội dung lạ vào ticket).
import { describe, expect, it, vi } from 'vitest';
import type { TenantDb } from '@appchat/db';
import { appointmentRemindTrigger, holdExpireTrigger, verifyBookingTrigger } from '../src/booking/system/sources';
import { messageTrigger, slaTrigger, verifyTicketTrigger } from '../src/support/system/sources';

const WS = '0190f000-0000-7000-8000-00000000aa01';
const A = '0190f000-0000-7000-8000-00000000b001';
const M = '0190f000-0000-7000-8000-00000000c001';
const CONV = '0190f000-0000-7000-8000-00000000d001';
const start = new Date('2026-11-20T09:00:00Z');
const conflict = { httpStatus: 409 };

const bookingDb = (a: unknown) => ({ appointment: { findUnique: vi.fn(async () => a) } }) as unknown as TenantDb;
const ticketDb = (tk: unknown, msg: unknown = null) => ({ ticket: { findUnique: vi.fn(async () => tk) }, message: { findUnique: vi.fn(async () => msg) } }) as unknown as TenantDb;

describe('appointment.system_transition', () => {
  it('dời lịch sau khi quét → nhắc cũ 409; mốc nhắc khác → khoá khác', async () => {
    const t = appointmentRemindTrigger(WS, { id: A, startAt: start }, 'H-24');
    expect(t.idempotencyKey).not.toBe(appointmentRemindTrigger(WS, { id: A, startAt: start }, 'H-2').idempotencyKey);
    await expect(verifyBookingTrigger(t, bookingDb({ startAt: new Date('2026-11-21T09:00:00Z'), holdExpiresAt: null, deletedAt: null }))).rejects.toMatchObject(conflict);
    await expect(verifyBookingTrigger(t, bookingDb({ startAt: start, holdExpiresAt: null, deletedAt: null }))).resolves.toBeUndefined();
  });

  it('giữ chỗ: lịch đã xoá → 404', async () => {
    const t = holdExpireTrigger(WS, { id: A, holdExpiresAt: start });
    await expect(verifyBookingTrigger(t, bookingDb({ startAt: start, holdExpiresAt: start, deletedAt: new Date() }))).rejects.toMatchObject({ httpStatus: 404 });
  });
});

describe('ticket.system_transition', () => {
  it('tin nguồn phải cùng hội thoại với ticket', async () => {
    const t = messageTrigger(WS, 'customer_message', A, M);
    await expect(verifyTicketTrigger(t, ticketDb({ conversationId: CONV, ttrDueAt: start, frtDueAt: start }, { conversationId: 'khác' }))).rejects.toMatchObject({ httpStatus: 404 });
    await expect(verifyTicketTrigger(t, ticketDb({ conversationId: CONV, ttrDueAt: start, frtDueAt: start }, { conversationId: CONV }))).resolves.toBeUndefined();
  });

  it('SLA: hạn đổi (tạm dừng / gia hạn) → 409; đúng hạn hiện hành → qua', async () => {
    const t = slaTrigger(WS, 'ttr_breach', { id: A, ttrDueAt: start, frtDueAt: start });
    await expect(verifyTicketTrigger(t, ticketDb({ conversationId: CONV, ttrDueAt: new Date('2026-11-22T00:00:00Z'), frtDueAt: start }))).rejects.toMatchObject(conflict);
    await expect(verifyTicketTrigger(t, ticketDb({ conversationId: CONV, ttrDueAt: start, frtDueAt: start }))).resolves.toBeUndefined();
  });

  it('nguồn sự kiện đúc thành lịch (sourceKind sai) → 409', async () => {
    const t = messageTrigger(WS, 'first_response', A, M);
    await expect(verifyTicketTrigger({ ...t, sourceKind: 'schedule' }, ticketDb({ conversationId: CONV, ttrDueAt: start, frtDueAt: start }))).rejects.toMatchObject(conflict);
  });
});
