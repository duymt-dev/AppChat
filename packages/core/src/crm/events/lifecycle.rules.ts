// WS vòng đời khách (TIP-015f §4.3–§4.4): `contact.deleted` / `contact.restored` → event `contact.lifecycle` (chỉ id + thế hệ, không PII) cho
// người có crm.view trong workspace — UI làm mới danh sách khách / thùng rác / 360 / Hộp thư (REST chiếu theo quyền hiện tại lúc đọc lại).
// Chỉ phụ thuộc shared + notify — nạp ở notify/events/domain.rules.ts.
import { EVENT_SCHEMAS } from '@appchat/shared';
import { registerRealtimeRule } from '../../notify/rules';
import { rooms } from '../../notify/realtime/envelope';

for (const topic of ['contact.deleted', 'contact.restored'] as const)
  registerRealtimeRule(`crm.${topic}`, topic, (e) => {
    const p = EVENT_SCHEMAS[topic].parse(e.payload);
    return [{ ws: e.workspaceId, rooms: [rooms.ws(e.workspaceId)], event: 'contact.lifecycle', data: { contact_id: p.contact_id, lifecycle_revision: p.lifecycle_revision, deleted: topic === 'contact.deleted' }, require: { permission: 'crm.view' } }];
  });
