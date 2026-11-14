// TIP-033b §5.3: booking.config_changed (outbox chuẩn, khai trong EVENT_SCHEMAS) → WS `booking.config` chỉ phạm vi + id / version, cần
// booking.view; nạp ở notify/events/domain.rules (ROLE=jobs). Payload lạ (thiếu version) bị từ chối, không phát.
import { describe, expect, it } from 'vitest';
import { EVENT_SCHEMAS } from '@appchat/shared';
import '../src/notify/events/domain.rules';
import { realtimeEnvelopes, realtimeTopics } from '../src/notify/rules';

const WS = '0190f000-0000-7000-8000-000000000001';
const STAFF = '0190f000-0000-7000-8000-000000000002';
const base = { ws: WS, occurred_at: '2026-11-09T00:00:00.000Z' };

describe('WS cấu hình lịch hẹn', () => {
  it('booking.config_changed → booking.config (scope + staff_id + version), cần booking.view', () => {
    expect(realtimeTopics()).toContain('booking.config_changed');
    const env = realtimeEnvelopes({ id: 'e1', topic: 'booking.config_changed', workspaceId: 'w1', traceId: null, payload: { ...base, scope: 'staff', staff_id: STAFF, version: 3 } });
    expect(env).toEqual([expect.objectContaining({ event: 'booking.config', data: { scope: 'staff', staff_id: STAFF, version: 3 }, require: { permission: 'booking.view' } })]);
    const hours = realtimeEnvelopes({ id: 'e2', topic: 'booking.config_changed', workspaceId: 'w1', traceId: null, payload: { ...base, scope: 'hours', staff_id: null, version: 2 } });
    expect(hours[0]).toMatchObject({ data: { scope: 'hours', staff_id: null, version: 2 } });
  });

  it('schema: thiếu version / scope lạ → không hợp lệ', () => {
    expect(EVENT_SCHEMAS['booking.config_changed'].safeParse({ ...base, scope: 'hours' }).success).toBe(false);
    expect(EVENT_SCHEMAS['booking.config_changed'].safeParse({ ...base, scope: 'pay', version: 1 }).success).toBe(false);
  });
});
