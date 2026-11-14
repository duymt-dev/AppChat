// Khoá gốc khách cho writer con (TIP-015d §2.3): writer đổi người được gán / gắn lại quan hệ của hội thoại / báo giá / lịch hẹn khoá dòng
// KHÁCH trước, rồi mới khoá dòng con — cùng thứ tự với chuyển phụ trách (khách → hội thoại → báo giá → lịch hẹn), không deadlock ngược.
// Đọc `contact_id` của con KHÔNG khoá → khoá khách → đọc lại: con đã đổi khách giữa chừng → 409 CONFLICT (không khoá khách thứ hai lệch
// thứ tự). Ảnh chụp trước khoá không có giá trị quyết định. Trung lập — domain nào cũng gọi được, không import CRM.
import { AppError } from '@appchat/shared';
import { TenantSql as Prisma } from '@appchat/db';
import type { TenantTx } from '../actions/action-context';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// TIP-015f §2.5: thêm hợp đồng (gia hạn / tạo đơn từ hợp đồng khoá khách trước hợp đồng).
export type RootChild = 'conversation' | 'quote' | 'appointment' | 'contract';
const TABLE: Record<RootChild, Prisma.Sql> = { conversation: Prisma.raw('conversation'), quote: Prisma.raw('quote'), appointment: Prisma.raw('appointment'), contract: Prisma.raw('contract') };

/** Khoá dòng khách tới hết transaction (id không hợp lệ / null → không làm gì). */
export async function lockContactRow(tx: Pick<TenantTx, '$queryRaw'>, contactId: string | null | undefined): Promise<void> {
  if (contactId && UUID.test(contactId)) await tx.$queryRaw`SELECT id FROM contact WHERE id = ${contactId}::uuid FOR UPDATE`;
}

const contactOf = async (tx: Pick<TenantTx, '$queryRaw'>, child: RootChild, id: string) =>
  (await tx.$queryRaw<{ contact_id: string | null }[]>`SELECT contact_id FROM ${TABLE[child]} WHERE id = ${id}::uuid`)[0];

/**
 * Khoá khách gốc của một bản ghi con TRƯỚC khi người gọi khoá / ghi bản ghi con. Không có bản ghi / không gắn khách → bỏ qua (người gọi tự
 * trả 404 theo quyền). Con đổi khách trong lúc chờ khoá → 409 (người gọi thử lại với khách mới).
 */
export async function lockRootOf(tx: Pick<TenantTx, '$queryRaw'>, child: RootChild, id: string): Promise<void> {
  if (!UUID.test(id)) return;
  const before = await contactOf(tx, child, id);
  if (!before?.contact_id) return;
  await lockContactRow(tx, before.contact_id);
  const after = await contactOf(tx, child, id);
  if (after && after.contact_id !== before.contact_id) throw new AppError('CONFLICT', 409, { contact_id: 'changed' });
}

/**
 * Nhiều bản ghi con trong một transaction (bulk): khoá MỌI khách gốc một lần theo id tăng dần (thứ tự toàn cục), rồi đọc lại — trả tập id
 * con đã đổi khách trong lúc chờ (người gọi báo lỗi CONFLICT riêng bản ghi đó). Không khoá khách lẻ theo thứ tự duyệt danh sách.
 */
export async function lockRootsOf(tx: Pick<TenantTx, '$queryRaw'>, child: RootChild, ids: readonly string[]): Promise<Set<string>> {
  const valid = ids.filter((id) => UUID.test(id));
  if (!valid.length) return new Set();
  const read = async () => new Map((await tx.$queryRaw<{ id: string; contact_id: string | null }[]>`SELECT id, contact_id FROM ${TABLE[child]} WHERE id = ANY(${valid}::uuid[])`).map((r) => [r.id, r.contact_id]));
  const before = await read();
  const roots = [...new Set([...before.values()].filter((x): x is string => !!x))].sort();
  if (roots.length) await tx.$queryRaw`SELECT id FROM contact WHERE id = ANY(${roots}::uuid[]) ORDER BY id FOR UPDATE`;
  const after = await read();
  return new Set(valid.filter((id) => before.has(id) && after.get(id) !== before.get(id)));
}
