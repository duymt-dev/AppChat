// Chiếu theo họ khách (TIP-015e §3.4–§3.5): bản ghi lịch sử (timeline, báo giá / đơn / đề nghị / hợp đồng / khoản thu / lịch hẹn / ticket)
// GIỮ contact_id gốc sau gộp — đọc theo khách gốc thì lọc `cột ∈ họ(gốc)` = gốc + mọi nguồn đã gộp vào (đệ quy merged_into, tối đa 32 bước
// như lock.ts; index `contact_merged_into_idx`). Một fact vẫn đếm một lần theo khoá chính của chính nó. Không cấp quyền: chỉ thay phép bằng
// `contact_id = gốc`; scope từng domain vẫn áp riêng. Người gọi đã kiểm khách gốc nhìn thấy được (visibleContact).
import { TenantSql as Prisma } from '@appchat/db';

const MAX_HOPS = 32;

/** Câu con id họ của `rootId` (gốc + nguồn đã gộp). */
export const familyIdsSql = (rootId: string) => Prisma.sql`(
  WITH RECURSIVE fam(id, depth) AS (
    SELECT ${rootId}::uuid, 0
    UNION
    SELECT c.id, fam.depth + 1 FROM contact c JOIN fam ON c.merged_into_id = fam.id WHERE fam.depth < ${MAX_HOPS}
  ) SELECT id FROM fam)`;

/** `<cột> IN (họ của rootId)` — thay cho `<cột> = rootId` ở đọc theo khách. */
export const inFamilySql = (column: string, rootId: string) => Prisma.sql`${Prisma.raw(column)} IN ${familyIdsSql(rootId)}`;

/** `parentContactId` (id gốc lưu trên chứng từ cha) thuộc họ của khách gốc còn sống `rootId` — chuyển đổi chứng từ cũ của bản phụ đã gộp sang bản chính. */
export async function inSameFamily(tx: { $queryRaw: <T>(q: ReturnType<typeof Prisma.sql>) => Promise<T> }, parentContactId: string, rootId: string): Promise<boolean> {
  if (parentContactId === rootId) return true;
  const r = await tx.$queryRaw<{ ok: boolean }[]>(Prisma.sql`SELECT ${parentContactId}::uuid IN ${familyIdsSql(rootId)} AS ok`);
  return !!r[0]?.ok;
}
