// Realtime theo quyền trường (TIP-045b annex C): gói tin socket chỉ mang id + loại thay đổi — FE tải lại qua REST (đã chiếu theo người
// xem). Lưới an toàn ở điểm emit: bỏ mọi khoá `custom` và trường hệ thống có ràng buộc quyền (vd. `cost`) khỏi data trước khi gửi, để một
// luật realtime mới không thể lộ giá trị trường ẩn. Đổi định nghĩa trường → `fields.changed` (không có giá trị) để FE làm mới cache.
import { SYSTEM_FIELD_BINDINGS } from './entity-bindings';

const MAX_DEPTH = 6;
/** Mọi trường hệ thống có ràng buộc quyền (gộp các entity) — socket không mang giá trị của chúng. */
const BOUND = new Set(Object.values(SYSTEM_FIELD_BINDINGS).flatMap((b) => Object.keys(b)));

export const FIELDS_CHANGED_EVENT = 'fields.changed';

export function stripRealtimeFields(v: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH || v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map((x) => stripRealtimeFields(x, depth + 1));
  return Object.fromEntries(Object.entries(v).filter(([k]) => k !== 'custom' && !BOUND.has(k)).map(([k, x]) => [k, stripRealtimeFields(x, depth + 1)]));
}
