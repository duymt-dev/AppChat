// TIP-022b AC1 — lịch tuần theo THỜI ĐIỂM (FixedClock): khoảng nửa mở, qua đêm tách hai ngày, múi IANA + DST (gap / fold), giao lịch tài
// khoản ∩ agent, `office` cũ giữ 08:00–17:30 VN, `custom` chưa có lịch = needs_configuration (không tự nới / thu hẹp), validate server.
import { describe, expect, it } from 'vitest';
import { OFFICE_SCHEDULE, canonicalSchedule, emptySchedule, inSchedule, nextOpening, splitOvernight, validateSchedule, type WeeklySchedule } from '@appchat/shared';
import { weeklyScheduleSchema } from '@appchat/shared';
import { agentSchedule, assertPublishable, assertSchedule, scheduleOf, scheduleState } from '../src/ai/agents/schedule-config';
import { availability } from '../src/ai/reply/availability';
import { withinHours } from '../src/ai/agents/agent.runtime';
import { blankConfig } from '../src/ai/agents/agent.store';

const at = (iso: string) => new Date(iso);
const days = (fill: (d: number) => { from: string; to: string }[]) => Array.from({ length: 7 }, (_, d) => fill(d));

describe('lịch tuần', () => {
  // 2026-11-02 là Thứ Hai.
  const weekday: WeeklySchedule = { timezone: 'Asia/Ho_Chi_Minh', days: days((d) => (d < 5 ? [{ from: '09:00', to: '12:00' }, { from: '13:30', to: '18:00' }] : [])) };

  it('khoảng nửa mở [from, to) theo giờ tường của múi', () => {
    expect(inSchedule(weekday, at('2026-11-02T02:00:00Z'))).toBe(true); // 09:00 VN Thứ Hai — gồm
    expect(inSchedule(weekday, at('2026-11-02T01:59:00Z'))).toBe(false); // 08:59
    expect(inSchedule(weekday, at('2026-11-02T05:00:00Z'))).toBe(false); // 12:00 — không gồm
    expect(inSchedule(weekday, at('2026-11-02T06:30:00Z'))).toBe(true); // 13:30
    expect(inSchedule(weekday, at('2026-11-07T03:00:00Z'))).toBe(false); // Thứ Bảy nghỉ
  });

  it('qua đêm tách thành hai ngày; validate chặn from ≥ to, chồng lấn, quá 4 khoảng, múi sai', () => {
    const split = splitOvernight(emptySchedule().days, 4, '22:00', '02:00');
    expect(split[4]).toEqual([{ from: '22:00', to: '24:00' }]);
    expect(split[5]).toEqual([{ from: '00:00', to: '02:00' }]);
    const s: WeeklySchedule = { timezone: 'Asia/Ho_Chi_Minh', days: split };
    expect(inSchedule(s, at('2026-11-06T15:30:00Z'))).toBe(true); // Thứ Sáu 22:30
    expect(inSchedule(s, at('2026-11-06T18:30:00Z'))).toBe(true); // Thứ Bảy 01:30
    expect(inSchedule(s, at('2026-11-06T19:00:00Z'))).toBe(false); // Thứ Bảy 02:00
    expect(validateSchedule({ timezone: 'Asia/Ho_Chi_Minh', days: days((d) => (d === 0 ? [{ from: '22:00', to: '02:00' }] : [])) })).toEqual({ 'days.0.0': 'order' });
    expect(validateSchedule({ timezone: 'Asia/Ho_Chi_Minh', days: days((d) => (d === 1 ? [{ from: '09:00', to: '11:00' }, { from: '10:00', to: '12:00' }] : [])) })).toEqual({ 'days.1.1': 'overlap' });
    expect(validateSchedule({ timezone: 'Asia/Ho_Chi_Minh', days: days(() => Array.from({ length: 5 }, (_, i) => ({ from: `0${i}:00`, to: `0${i}:30` }))) })).toEqual({ 'days.0': 'too_many' });
    expect(validateSchedule({ timezone: 'Mars/Base', days: emptySchedule().days })).toEqual({ timezone: 'timezone' });
    expect(validateSchedule({ timezone: 'UTC', days: days(() => [{ from: '9:00', to: '10:00' }]) })).toEqual({ 'days.0.0': 'format' });
    expect(weeklyScheduleSchema.safeParse({ timezone: 'UTC', days: days(() => [{ from: '10:00', to: '09:00' }]) }).success).toBe(false);
    // Chuẩn hoá chỉ sắp thứ tự, không tự sửa khoảng lệch.
    expect(canonicalSchedule({ timezone: 'UTC', days: days((d) => (d ? [] : [{ from: '13:00', to: '14:00' }, { from: '08:00', to: '09:00' }])) }).schedule.days[0]![0]!.from).toBe('08:00');
  });

  it('DST theo thời điểm: khoảng trống 02:00–03:00 không có thời điểm nào; giờ lặp lại tính theo giờ tường', () => {
    // America/New_York 2026: bắt đầu DST 08/03 (02:00 → 03:00), kết thúc 01/11 (02:00 → 01:00). 08/03/2026 là Chủ nhật (index 6).
    const ny: WeeklySchedule = { timezone: 'America/New_York', days: days((d) => (d === 6 ? [{ from: '01:30', to: '03:30' }] : [])) };
    expect(inSchedule(ny, at('2026-03-08T06:45:00Z'))).toBe(true); // 01:45 EST
    expect(inSchedule(ny, at('2026-03-08T07:15:00Z'))).toBe(true); // 03:15 EDT (02:15 không tồn tại)
    expect(inSchedule(ny, at('2026-03-08T07:45:00Z'))).toBe(false); // 03:45 EDT
    // 01/11/2026 (Chủ nhật): 01:30 xảy ra hai lần — cả hai thời điểm đều trong lịch theo giờ tường.
    expect(inSchedule(ny, at('2026-11-01T05:30:00Z'))).toBe(true); // 01:30 EDT
    expect(inSchedule(ny, at('2026-11-01T06:30:00Z'))).toBe(true); // 01:30 EST
    expect(inSchedule(ny, at('2026-11-01T08:45:00Z'))).toBe(false); // 03:45 EST
  });

  it('mốc mở kế tiếp', () => {
    expect(nextOpening(weekday, at('2026-11-02T05:30:00Z'))).toEqual({ weekday: 0, at: '13:30' }); // 12:30 Thứ Hai
    expect(nextOpening(weekday, at('2026-11-06T12:00:00Z'))).toEqual({ weekday: 0, at: '09:00' }); // Thứ Sáu 19:00 → Thứ Hai
    expect(nextOpening(emptySchedule(), at('2026-11-02T00:00:00Z'))).toBeNull();
  });
});

describe('lịch agent theo phiên bản + giao lịch tài khoản', () => {
  const morning: WeeklySchedule = { timezone: 'Asia/Ho_Chi_Minh', days: days(() => [{ from: '08:00', to: '12:00' }]) };
  const evening: WeeklySchedule = { timezone: 'Asia/Ho_Chi_Minh', days: days(() => [{ from: '10:00', to: '20:00' }]) };

  it('office cũ giữ nguyên 08:00–17:30 VN; always luôn chạy; custom có lịch theo lịch', () => {
    expect(agentSchedule({ working_hours: 'office', weekly_schedule: null })).toBe(OFFICE_SCHEDULE);
    expect(withinHours('office', at('2026-11-02T01:00:00Z'))).toBe(true);
    expect(withinHours('office', at('2026-11-02T10:30:00Z'))).toBe(false);
    expect(withinHours('always', at('2026-11-02T20:00:00Z'))).toBe(true);
    expect(withinHours('custom', at('2026-11-02T06:00:00Z'), morning)).toBe(false); // 13:00
  });

  it('custom chưa có lịch: giữ hành vi đã xuất bản (chạy) + needs_configuration + chặn xuất bản mới', () => {
    const legacy = { ...blankConfig('A'), working_hours: 'custom' as const };
    expect(scheduleState(legacy)).toBe('needs_configuration');
    expect(withinHours('custom', at('2026-11-02T20:00:00Z'))).toBe(true);
    expect(() => assertPublishable(legacy)).toThrow(/VALIDATION_FAILED|needs_configuration/);
    expect(() => assertPublishable({ ...legacy, weekly_schedule: morning })).not.toThrow();
    expect(scheduleState({ ...legacy, weekly_schedule: morning })).toBe('ok');
  });

  it('giao: tài khoản 10–20 ∩ agent 08–12 → chỉ 10–12; đóng kèm nguồn + mốc mở', () => {
    const cfg = { working_hours: 'custom' as const, weekly_schedule: morning };
    expect(availability(cfg, evening, at('2026-11-02T03:30:00Z')).open).toBe(true); // 10:30
    expect(availability(cfg, evening, at('2026-11-02T01:30:00Z'))).toMatchObject({ open: false, closedBy: 'account', next: { at: '10:00' } }); // 08:30
    expect(availability(cfg, evening, at('2026-11-02T06:00:00Z'))).toMatchObject({ open: false, closedBy: 'agent' }); // 13:00
    // Tài khoản chưa lưu lịch có cấu trúc (chỉ chữ `hours` cũ) → chỉ lịch agent.
    expect(availability(cfg, null, at('2026-11-02T01:30:00Z')).open).toBe(true);
  });

  it('jsonb hỏng → null (không đoán); ghi lịch sai → 422 theo đường dẫn', () => {
    expect(scheduleOf({ timezone: 'Asia/Ho_Chi_Minh', days: [] })).toBeNull();
    expect(scheduleOf('8h-17h')).toBeNull();
    expect(() => assertSchedule({ timezone: 'Asia/Ho_Chi_Minh', days: days(() => [{ from: '12:00', to: '08:00' }]) })).toThrow();
  });
});
