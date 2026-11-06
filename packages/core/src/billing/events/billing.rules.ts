// Luật realtime ví (TIP-039 pha 2, AC06): `credits.low` / `credits.exhausted` / `credits.restored` → WS `billing.notice` cho mọi thành viên
// workspace đang mở app (BillingNoticeHost hiện popup / banner; người có `billing.manage` có nút nạp, người khác nhắc liên hệ Owner — FE
// quyết theo quyền của chính socket). Gói tin chỉ có loại + mốc + `event_id` (khoá chống trùng popup) — không số dư chi tiết, không PII.
// Thông báo chuông cho Owner vẫn qua `notify.requested` (billing.events.ts). `subscription.changed` → WS `billing.changed` làm mới màn Gói.
import { creditsLowEvent, subscriptionChangedEvent } from '@appchat/shared';
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
