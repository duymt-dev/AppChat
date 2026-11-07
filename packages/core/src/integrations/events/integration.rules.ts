// Luật realtime runtime kết nối (TIP-012b P3 §5.2): outbox `integration.connected` / `.disconnected` / `.error` → WS cùng tên tới phòng
// `ws:{id}`, chỉ người còn `integrations.manage` lúc phát. Payload chỉ là tín hiệu làm mới (id kết nối, connector, op, MÃ lỗi đã làm
// sạch) — FE đọc lại chi tiết qua GET /v1/integrations/connections/:id. Không bí mật / số tiền.
import { integrationConnectedEvent, integrationDisconnectedEvent, integrationErrorEvent } from '@appchat/shared';
import { registerRealtimeRule } from '../../notify/rules';
import { rooms } from '../../notify/realtime/envelope';

const SCHEMA = { 'integration.connected': integrationConnectedEvent, 'integration.disconnected': integrationDisconnectedEvent, 'integration.error': integrationErrorEvent } as const;

for (const topic of Object.keys(SCHEMA) as (keyof typeof SCHEMA)[]) {
  registerRealtimeRule(topic, topic, (e) => {
    const p = SCHEMA[topic].parse(e.payload) as { connection_id: string; connector_key: string; op?: string; error?: string };
    const data = { connection_id: p.connection_id, connector_key: p.connector_key, ...(p.op ? { op: p.op, error: p.error } : {}) };
    return [{ ws: e.workspaceId, rooms: [rooms.ws(e.workspaceId)], event: topic, data, require: { permission: 'integrations.manage' } }];
  });
}
