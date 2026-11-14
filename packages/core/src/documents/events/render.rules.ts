// WS render chứng từ (TIP-028b §1 "FE hiện Đang tạo PDF và tự cập nhật"): `document.rendered` / `document.render_failed` → event
// `document.render` (chỉ loại + id chứng từ + trạng thái — không tên tệp / URL / lỗi thô) cho người có quyền xem loại chứng từ đó; UI làm mới
// danh sách + chi tiết (REST chiếu theo scope hiện tại lúc đọc lại). Chỉ phụ thuộc shared + notify — nạp ở notify/events/domain.rules.ts.
import { EVENT_SCHEMAS, type PermissionKey } from '@appchat/shared';
import { registerRealtimeRule } from '../../notify/rules';
import { rooms } from '../../notify/realtime/envelope';

/** Quyền xem theo loại chứng từ đăng ký render (kind lạ → không phát). */
const VIEW: Record<string, PermissionKey> = { quote: 'quote.view' };

for (const topic of ['document.rendered', 'document.render_failed'] as const)
  registerRealtimeRule(`documents.${topic}`, topic, (e) => {
    const p = EVENT_SCHEMAS[topic].parse(e.payload);
    const permission = VIEW[p.kind];
    if (!permission) return [];
    const status = topic === 'document.rendered' ? 'rendered' : 'render_failed';
    return [{ ws: e.workspaceId, rooms: [rooms.ws(e.workspaceId)], event: 'document.render', data: { kind: p.kind, document_id: p.document_id, status }, require: { permission } }];
  });
