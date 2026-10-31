// Luật event kho tri thức (Blueprint §2.3 `kb.source_ready` / `kb.source_failed`): WS `kb.source` → trang Dữ liệu RAG làm mới
// trạng thái "Đã học" / lỗi cho người có `kb.manage`. Lỗi nạp hiện ở hàng tài liệu (status + lý do), không thêm loại thông báo (DC-108).
import { kbSourceFailedEvent, kbSourceReadyEvent } from '@appchat/shared';
import { registerRealtimeRule } from '../../notify/rules';
import { rooms } from '../../notify/realtime/envelope';

registerRealtimeRule('kb.ready', 'kb.source_ready', (e) => {
  const p = kbSourceReadyEvent.parse(e.payload);
  return [{ ws: e.workspaceId, rooms: [rooms.ws(e.workspaceId)], event: 'kb.source', data: { source_id: p.source_id, status: 'ready', chunk_count: p.chunk_count }, require: { permission: 'kb.manage' } }];
});

registerRealtimeRule('kb.failed', 'kb.source_failed', (e) => {
  const p = kbSourceFailedEvent.parse(e.payload);
  return [{ ws: e.workspaceId, rooms: [rooms.ws(e.workspaceId)], event: 'kb.source', data: { source_id: p.source_id, status: 'failed', error: p.error }, require: { permission: 'kb.manage' } }];
});
