// Luật realtime từ điển gợi ý danh mục (TIP-034b §1.4): `ticket_categories.changed` (chỉ key + version) → hai gói tin riêng theo quyền
// hiện tại của người nhận — `ticket_categories.config` cho người có settings.manage (Cài đặt), `ticket_categories.suggestions` cho người
// có ticket.view (form / bộ lọc ticket). Không thông báo / email; gói tin không mang nhãn — client đọc lại REST theo quyền + scope.
import { ticketCategoriesChangedEvent } from '@appchat/shared';
import { registerRealtimeRule } from '../../notify/rules';
import { rooms } from '../../notify/realtime/envelope';

registerRealtimeRule('support.ticket_categories.changed', 'ticket_categories.changed', (e) => {
  const p = ticketCategoriesChangedEvent.parse(e.payload);
  const data = { key: p.key, version: p.version };
  return [
    { ws: e.workspaceId, rooms: [rooms.ws(e.workspaceId)], event: 'ticket_categories.config', data, require: { permission: 'settings.manage' } },
    { ws: e.workspaceId, rooms: [rooms.ws(e.workspaceId)], event: 'ticket_categories.suggestions', data, require: { permission: 'ticket.view' } },
  ];
});
