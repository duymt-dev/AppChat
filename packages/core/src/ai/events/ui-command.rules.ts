// Luật realtime lệnh UI của Trợ lý (TIP-006c, Blueprint §4.6 `ui.command` — chỉ gửi user ra lệnh): outbox `ui.command_issued` → WS
// `ui.command` tới phòng `tab:{user}:{tab}` của đúng tab đã gửi lượt (gateway ghép userId của JWT), còn quyền `assistant.use`. Payload
// = lệnh đã qua schema đóng `uiCommandSchema` (route / entity / id / giá trị form do Trợ lý điền) + run.
import { uiCommandIssuedEvent } from '@appchat/shared';
import { registerRealtimeRule } from '../../notify/rules';
import { rooms } from '../../notify/realtime/envelope';
import { UI_COMMAND_TOPIC } from '../assistant/ui-command';

registerRealtimeRule('assistant.ui_command', UI_COMMAND_TOPIC, (e) => {
  const p = uiCommandIssuedEvent.parse(e.payload);
  return [{ ws: e.workspaceId, rooms: [rooms.tab(p.user_id, p.tab_id)], event: 'ui.command', data: { run_id: p.run_id, command: p.command, event_id: e.id }, require: { permission: 'assistant.use' } }];
});
