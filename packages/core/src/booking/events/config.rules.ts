// WS cấu hình lịch hẹn (TIP-033b §5.3): `booking.config_changed` → event `booking.config` (chỉ phạm vi + id / version) cho người có
// booking.view trong workspace — Cài đặt Lịch hẹn + lịch / slot tải lại (REST chiếu theo quyền lúc đọc). Chỉ phụ thuộc shared + notify — nạp
// ở notify/events/domain.rules.ts.
import { EVENT_SCHEMAS } from '@appchat/shared';
import { registerRealtimeRule } from '../../notify/rules';
import { rooms } from '../../notify/realtime/envelope';

registerRealtimeRule('booking.config_changed', 'booking.config_changed', (e) => {
  const p = EVENT_SCHEMAS['booking.config_changed'].parse(e.payload);
  return [{ ws: e.workspaceId, rooms: [rooms.ws(e.workspaceId)], event: 'booking.config', data: { scope: p.scope, staff_id: p.staff_id ?? null, version: p.version }, require: { permission: 'booking.view' } }];
});
