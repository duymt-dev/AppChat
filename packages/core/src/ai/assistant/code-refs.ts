// Mã hiển thị → id cho Trợ lý / agent: người dùng và model nói theo mã (KH-1016, BG-1003, DH-…), action nhận id (uuid). Trước khi chạy
// action, ô `<thực thể>_id` (và `id` của action thực thể đó) mang giá trị không phải uuid được tra theo cột `code` trong scope DB tenant;
// không thấy → giữ nguyên (validation / handler báo lỗi như cũ). Báo giá: mã dùng chung các lần sửa → bản mới nhất.
import type { TenantDb } from '@appchat/db';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Mã hiển thị: chữ + số, có gạch ngang (KH-1016, BG-1003, TKT-0001, LH-1001). */
const CODE = /^[A-Za-zĐđ]{1,6}-?\d{1,8}$/;

type Lookup = (db: TenantDb, code: string) => Promise<string | null>;

const byCode = (find: (db: TenantDb, code: string) => Promise<{ id: string } | null>): Lookup => async (db, code) => (await find(db, code))?.id ?? null;

/** Thực thể có cột `code` → cách tra. Khoá = tiền tố tên ô (`contact_id`) và tên đối tượng của action (`contact.update`). */
const LOOKUPS: Record<string, Lookup> = {
  contact: byCode((db, code) => db.contact.findFirst({ where: { code, deletedAt: null }, select: { id: true } })),
  quote: byCode((db, code) => db.quote.findFirst({ where: { code }, orderBy: { version: 'desc' }, select: { id: true } })),
  order: byCode((db, code) => db.order.findFirst({ where: { code }, select: { id: true } })),
  invoice: byCode((db, code) => db.invoice.findFirst({ where: { code }, select: { id: true } })),
  contract: byCode((db, code) => db.contract.findFirst({ where: { code }, select: { id: true } })),
  appointment: byCode((db, code) => db.appointment.findFirst({ where: { code }, select: { id: true } })),
  ticket: byCode((db, code) => db.ticket.findFirst({ where: { code }, select: { id: true } })),
  product: byCode((db, code) => db.product.findFirst({ where: { code }, select: { id: true } })),
};

/** Thực thể đổi được mã → id (test phủ Trợ lý — TIP-023b R1.3). */
export const CODE_REF_ENTITIES: readonly string[] = Object.keys(LOOKUPS);

const norm = (v: string) => v.trim().toUpperCase().replace(/^([A-ZĐ]+)(\d)/, '$1-$2');

/** Đổi mã → id trong input (một tầng); trả input mới + danh sách ô đã đổi (ghi vào bước run để soát). */
export async function resolveCodes(db: TenantDb, actionId: string, input: unknown): Promise<{ input: unknown; resolved: string[] }> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { input, resolved: [] };
  const entity = actionId.split('.')[0]!;
  const out: Record<string, unknown> = { ...(input as Record<string, unknown>) };
  const resolved: string[] = [];
  for (const [key, value] of Object.entries(out)) {
    if (typeof value !== 'string' || UUID.test(value) || !CODE.test(value.trim())) continue;
    const kind = key === 'id' ? entity : key.endsWith('_id') ? key.slice(0, -3) : null;
    const lookup = kind ? LOOKUPS[kind] : undefined;
    if (!lookup) continue;
    const id = (await lookup(db, value.trim())) ?? (await lookup(db, norm(value)));
    if (id) {
      // `id` không phải tên ô thật của action → đặt đúng `<thực thể>_id`.
      if (key === 'id') {
        delete out.id;
        out[`${entity}_id`] ??= id;
      } else out[key] = id;
      resolved.push(key);
    }
  }
  return { input: out, resolved };
}
