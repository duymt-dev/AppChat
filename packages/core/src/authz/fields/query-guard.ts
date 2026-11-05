// Chặn lọc / đếm trên trường bị ẩn (TIP-045b annex C): `cf.<key>` hoặc trường hệ thống ẩn → 422 `FIELD_FORBIDDEN` TRƯỚC khi truy vấn —
// không để số đếm / kết quả rỗng làm kênh dò giá trị. Key không tồn tại cùng mã (không phân biệt "ẩn" với "không có").
import { AppError, type AuthzContext, type CustomFieldEntity } from '@appchat/shared';
import { hiddenSystemFields } from './entity-bindings';
import type { FieldView } from './types';

export function assertQueryFields(v: FieldView, custom: Record<string, string> | undefined, system: string[] = []): void {
  const bad = [...Object.keys(custom ?? {}).filter((k) => !v.custom.has(k)).map((k) => `cf.${k}`), ...system.filter((f) => v.hiddenSystem.has(f))];
  if (bad.length) throw new AppError('FIELD_FORBIDDEN', 422, Object.fromEntries(bad.map((k) => [k, 'forbidden'])));
}

/** Ghi trường hệ thống bị ẩn (vd. giá vốn khi thiếu `catalog.cost_view`) → 422 — không ghi mù đè giá trị người ghi không được xem. */
export function assertWritableSystem(entity: CustomFieldEntity, a: AuthzContext, input: Record<string, unknown>): void {
  const bad = [...hiddenSystemFields(entity, a)].filter((f) => input[f] !== undefined);
  if (bad.length) throw new AppError('FIELD_FORBIDDEN', 422, Object.fromEntries(bad.map((k) => [k, 'forbidden'])));
}
