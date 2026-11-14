// TIP-033: route mock Lịch hẹn đúng shape đọc dùng chung với API thật (packages/shared/src/api/calendar.ts) + luồng theo APPOINTMENT_FLOW
// (sai bước → INVALID_TRANSITION; trùng giờ → SLOT_TAKEN; huỷ cần lý do; hoàn thành ngoài gói gợi ý đơn → order.create_from_appointment).
import { beforeEach, describe, expect, it } from 'vitest';
import { appointmentRowSchema, appointmentsPageSchema, bookingSettingsSchema, calendarMetaSchema, slotsSchema } from '@appchat/shared';
import { mockTransport } from './mock-transport';
import { mockDb, setMockRole } from './store';
import { createCalendarState, isPast } from './domains/calendar';
import { calendarHandlers } from './domains/calendar-actions';

const issues = (r: { success: boolean; error?: { issues: unknown[] } }) => (r.success ? [] : r.error!.issues);
const run = (id: string, input: unknown) => calendarHandlers[id]!.execute(mockDb(), input as never) as Record<string, unknown>;
const code = async (fn: () => unknown) => {
  try {
    await fn();
    return null;
  } catch (e) {
    return (e as { error?: { code: string } }).error?.code ?? 'throw';
  }
};

describe('mock lịch hẹn — shape FE ↔ BE', () => {
  beforeEach(() => {
    mockDb().calendar = createCalendarState();
    setMockRole('owner');
  });

  it('GET /calendar · /calendar/:id · /meta · /slots · /settings/booking', async () => {
    expect(issues(appointmentsPageSchema.safeParse(await mockTransport.get('/calendar', { from: '2026-06-24', to: '2026-06-24' })))).toEqual([]);
    expect(issues(appointmentRowSchema.safeParse(await mockTransport.get('/calendar/ap_1215')))).toEqual([]);
    expect(issues(calendarMetaSchema.safeParse(await mockTransport.get('/calendar/meta')))).toEqual([]);
    expect(issues(slotsSchema.safeParse(await mockTransport.get('/calendar/slots', { service_id: 'sv2', date: '2026-06-25' })))).toEqual([]);
    expect(issues(bookingSettingsSchema.safeParse(await mockTransport.get('/settings/booking')))).toEqual([]);
  });

  it('luồng: hoàn thành từ chờ → INVALID_TRANSITION; trùng giờ → SLOT_TAKEN; ngoài gói → gợi ý đơn + tạo đơn một lần', async () => {
    expect(await code(() => run('appointment.complete', { appointment_id: 'ap_1215' }))).toBe('INVALID_TRANSITION');
    expect(await code(() => run('appointment.create', { contact_name: 'X', service_id: 'sv2', staff_id: 's2', date: '2026-06-24', start: '09:00' }))).toBe('SLOT_TAKEN');
    run('appointment.confirm', { appointment_id: 'ap_1215' });
    run('appointment.check_in', { appointment_id: 'ap_1215' });
    expect(run('appointment.complete', { appointment_id: 'ap_1215' })).toMatchObject({ suggest_order: true, package: null });
    const o = run('order.create_from_appointment', { appointment_id: 'ap_1215' }) as { order_id: string };
    expect(run('order.create_from_appointment', { appointment_id: 'ap_1215' })).toMatchObject({ order_id: o.order_id });
  });

  it('TIP-033b: hết giữ chỗ → xác nhận lại cùng mã, version +1; if_version lệch → STALE_VERSION; hoàn tác về expired', async () => {
    const db = mockDb();
    const a = db.calendar.appointments.find((x) => x.status === 'pending' && !isPast(x))!;
    a.status = 'expired';
    expect(await code(() => run('appointment.confirm', { appointment_id: a.id, if_version: 9 }))).toBe('STALE_VERSION');
    expect(run('appointment.confirm', { appointment_id: a.id, if_version: 1 })).toMatchObject({ appointment_id: a.id, status: 'confirmed', version: 2 });
    calendarHandlers['appointment.confirm']!.undo!(db, { appointment_id: a.id } as never);
    expect(a.status).toBe('expired');
  });
});
