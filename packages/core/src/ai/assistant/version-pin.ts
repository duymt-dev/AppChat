// Chốt phiên bản lúc xem trước (TIP-032c §4.2): thẻ xác nhận của Trợ lý / agent gắn ĐÚNG `if_version` của bản ghi tại lúc xem trước.
// Model gửi `if_version` → giữ nguyên (đã đọc bản ghi); không gửi → server điền phiên bản hiện tại vào input chuẩn hoá trước preview, nên
// một ghi khác chen giữa xem trước và xác nhận làm lần chạy 409 STALE_VERSION (không ghi đè, không lấy bản mới rồi chạy lại mù).
import { TenantSql as Prisma } from '@appchat/db';
import type { TenantDb } from '@appchat/db';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Action có `if_version` → ô id + bảng mang `version`. */
const PINNED: Record<string, { field: string; table: Prisma.Sql }> = {
  'order.update': { field: 'order_id', table: Prisma.raw('"order"') },
  'order.set_deposit': { field: 'order_id', table: Prisma.raw('"order"') },
  'order.update_shipping': { field: 'order_id', table: Prisma.raw('"order"') },
  'contract.update': { field: 'contract_id', table: Prisma.raw('contract') },
  'contract.delete': { field: 'contract_id', table: Prisma.raw('contract') },
};

export async function pinVersion(db: Pick<TenantDb, '$queryRaw'>, actionId: string, input: unknown): Promise<unknown> {
  const p = PINNED[actionId];
  const i = input as Record<string, unknown> | null;
  if (!p || !i || typeof i !== 'object' || i.if_version !== undefined) return input;
  const id = i[p.field];
  if (typeof id !== 'string' || !UUID.test(id)) return input;
  // Chỉ đọc số phiên bản (không trả cho model); quyền / scope do preview + execute kiểm như mọi lời gọi.
  const rows = await db.$queryRaw<{ version: number }[]>`SELECT version FROM ${p.table} WHERE id = ${id}::uuid AND deleted_at IS NULL`;
  return rows[0] ? { ...i, if_version: rows[0].version } : input;
}
