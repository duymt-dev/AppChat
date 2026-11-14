// Luật realtime ví (TIP-039 pha 2, AC06): `credits.low` / `credits.exhausted` / `credits.restored` → WS `billing.notice` cho mọi thành viên
// workspace đang mở app (BillingNoticeHost hiện popup / banner; người có `billing.manage` có nút nạp, người khác nhắc liên hệ Owner — FE
// quyết theo quyền của chính socket). Gói tin chỉ có loại + mốc + `event_id` (khoá chống trùng popup) — không số dư chi tiết, không PII.
// Thông báo chuông cho Owner vẫn qua `notify.requested` (billing.events.ts). `subscription.changed` → WS `billing.changed` làm mới màn Gói.
// TIP-006c: `credits.changed` → WS cùng tên: người có `billing.manage` nhận số dư sau đổi (gói / mua thêm); người khác nhận gói tin
// không số (chỉ để làm mới) — danh mục quyền không có `billing.view`.
import { creditsChangedEvent, creditsLowEvent, subscriptionChangedEvent } from '@appchat/shared';
import { registerRealtimeRule } from '../../notify/rules';
import { rooms } from '../../notify/realtime/envelope';

registerRealtimeRule('billing.credits_low', 'credits.low', (e) => {
  const p = creditsLowEvent.parse(e.payload);
  return [
    {
      ws: e.workspaceId,
      rooms: [rooms.ws(e.workspaceId)],
      event: 'billing.notice',
      data: { kind: 'low', level: p.level, event_id: e.id },
    },
  ];
});

registerRealtimeRule('billing.credits_exhausted', 'credits.exhausted', (e) => [
  {
    ws: e.workspaceId,
    rooms: [rooms.ws(e.workspaceId)],
    event: 'billing.notice',
    data: { kind: 'exhausted', event_id: e.id },
  },
]);

registerRealtimeRule('billing.credits_restored', 'credits.restored', (e) => [
  {
    ws: e.workspaceId,
    rooms: [rooms.ws(e.workspaceId)],
    event: 'billing.notice',
    data: { kind: 'restored', event_id: e.id },
  },
]);

registerRealtimeRule('billing.subscription_changed', 'subscription.changed', (e) => {
  const p = subscriptionChangedEvent.parse(e.payload);
  return [
    {
      ws: e.workspaceId,
      rooms: [rooms.ws(e.workspaceId)],
      event: 'billing.changed',
      data: { status: p.status, event_id: e.id },
    },
  ];
});

registerRealtimeRule('billing.credits_changed', 'credits.changed', (e) => {
  const p = creditsChangedEvent.parse(e.payload);
  const room = [rooms.ws(e.workspaceId)];
  return [
    { ws: e.workspaceId, rooms: room, event: 'credits.changed', data: { balance_plan: p.balance_plan, balance_topup: p.balance_topup, event_id: e.id }, require: { permission: 'billing.manage' } },
    { ws: e.workspaceId, rooms: room, event: 'credits.changed', data: { event_id: e.id }, require: { without: 'billing.manage' } },
  ];
});
