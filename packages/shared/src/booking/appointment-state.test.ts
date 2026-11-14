import { describe, expect, it } from 'vitest';
import { nextState } from '../state/flow';
import { APPOINTMENT_FLOW, dueReminder, holdUntil, noShowAllowed } from './appointment-state';

const at = (s: string) => new Date(`2026-11-05T${s}:00+07:00`);

describe('APPOINTMENT_FLOW', () => {
  it('vòng đời: chờ → xác nhận → đã đến → hoàn thành; huỷ / không đến chỉ khi chưa đến; cuối không đi tiếp', () => {
    expect(nextState(APPOINTMENT_FLOW, 'pending', 'appointment.confirm')).toBe('confirmed');
    expect(nextState(APPOINTMENT_FLOW, 'confirmed', 'appointment.check_in')).toBe('in_progress');
    expect(nextState(APPOINTMENT_FLOW, 'in_progress', 'appointment.complete')).toBe('done');
    expect(nextState(APPOINTMENT_FLOW, 'pending', 'appointment.complete')).toBeNull();
    expect(nextState(APPOINTMENT_FLOW, 'in_progress', 'appointment.cancel')).toBeNull();
    expect(nextState(APPOINTMENT_FLOW, 'confirmed', 'appointment.reschedule')).toBe('confirmed');
    expect(nextState(APPOINTMENT_FLOW, 'confirmed', 'appointment.expire')).toBeNull();
    for (const s of ['done', 'no_show', 'cancelled', 'expired'] as const) expect(nextState(APPOINTMENT_FLOW, s, 'appointment.reschedule')).toBeNull();
  });

  it('TIP-033b: hết giữ chỗ chỉ xác nhận lại hoặc huỷ — không dời / check-in / hoàn thành trực tiếp; cuối = done / no_show / cancelled', () => {
    expect(nextState(APPOINTMENT_FLOW, 'expired', 'appointment.confirm')).toBe('confirmed');
    expect(nextState(APPOINTMENT_FLOW, 'expired', 'appointment.cancel')).toBe('cancelled');
    for (const a of ['appointment.check_in', 'appointment.complete', 'appointment.mark_no_show', 'appointment.expire']) expect(nextState(APPOINTMENT_FLOW, 'expired', a)).toBeNull();
    expect([...APPOINTMENT_FLOW.terminal].sort()).toEqual(['cancelled', 'done', 'no_show']);
  });
});

describe('giữ chỗ / ân hạn / nhắc', () => {
  it('giữ chỗ 2 giờ, không quá giờ hẹn', () => {
    expect(holdUntil(at('09:00'), at('15:00')).toISOString()).toBe(at('11:00').toISOString());
    expect(holdUntil(at('09:00'), at('10:00')).toISOString()).toBe(at('10:00').toISOString());
  });
  it('không đến sau 20 phút', () => {
    expect(noShowAllowed(at('09:00'), at('09:19'))).toBe(false);
    expect(noShowAllowed(at('09:00'), at('09:20'))).toBe(true);
  });
  it('nhắc 24 giờ rồi 2 giờ, mỗi mốc một lần; qua giờ hẹn thì thôi', () => {
    const start = new Date('2026-11-06T09:00:00+07:00');
    expect(dueReminder(start, new Date('2026-11-05T08:00:00+07:00'), [])).toBeNull();
    expect(dueReminder(start, new Date('2026-11-05T09:30:00+07:00'), [])?.key).toBe('h24');
    expect(dueReminder(start, new Date('2026-11-05T09:30:00+07:00'), ['h24'])).toBeNull();
    expect(dueReminder(start, new Date('2026-11-06T07:30:00+07:00'), ['h24'])?.key).toBe('h2');
    expect(dueReminder(start, new Date('2026-11-06T07:30:00+07:00'), [])?.key).toBe('h2');
    expect(dueReminder(start, new Date('2026-11-06T09:01:00+07:00'), [])).toBeNull();
  });
});
