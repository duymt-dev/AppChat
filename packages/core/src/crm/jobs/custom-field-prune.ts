// Dọn giá trị trường tuỳ biến đã xoá (custom-fields §2, TIP-045b annex C): `custom_field.delete` chỉ xoá mềm — giá trị giữ 30 ngày để
// khôi phục; quá hạn thì job ROLE=jobs bỏ key khỏi `custom` của bản ghi thực thể theo lô (khoá dòng SKIP LOCKED, chạy lại idempotent),
// xong hết mới xoá hẳn định nghĩa. Key chỉ được dùng lại sau khi định nghĩa cũ đã xoá hẳn (`defineField` coi key còn trong bảng là đã
// chiếm) → trường mới cùng tên không bao giờ "thừa hưởng" giá trị cũ. Định nghĩa được khôi phục (deleted_at = null) giữa chừng → dừng.
import { TenantSql, type TenantDb } from '@appchat/db';
import type { CustomFieldEntity } from '@appchat/shared';

export const CUSTOM_FIELD_RETENTION_MS = 30 * 86_400_000;
export const PRUNE_BATCH = 500;

/** Bảng của entity (tên SQL cố định — không lấy từ input). */
const TABLE: Record<CustomFieldEntity, string> = {
  contact: 'contact',
  product: 'product',
  quote: 'quote',
  order: '"order"',
  ticket: 'ticket',
  appointment: 'appointment',
};

const sql = TenantSql.sql;

/** jsonpath tồn tại key — GIN `custom jsonb_path_ops` hỗ trợ `@?` (không hỗ trợ `?`). Key định nghĩa luôn `[a-z0-9_]`. */
const hasKey = (key: string) => sql`custom @? ${`$."${key.replace(/[^a-z0-9_]/g, '')}"`}::jsonpath`;

/** Bỏ `key` khỏi một lô dòng còn mang key; trả số dòng đã sửa. */
async function stripBatch(db: TenantDb, entity: CustomFieldEntity, key: string): Promise<number> {
  const t = TenantSql.raw(TABLE[entity]);
  return db.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ id: string }[]>(sql`SELECT id FROM ${t} WHERE ${hasKey(key)} ORDER BY id LIMIT ${PRUNE_BATCH} FOR UPDATE SKIP LOCKED`);
    if (!rows.length) return 0;
    const ids = rows.map((r) => r.id);
    // Kiểm lại dưới khoá: định nghĩa vẫn đang xoá (không được khôi phục trong lúc chạy).
    const live = await tx.customFieldDef.findUnique({ where: { entity_key: { entity, key } }, select: { deletedAt: true } });
    if (!live?.deletedAt) return 0;
    await tx.$executeRaw(sql`UPDATE ${t} SET custom = custom - ${key} WHERE id = ANY(${ids}::uuid[])`);
    return ids.length;
  });
}

export interface PruneResult {
  values: number;
  defs: number;
}

/** Một workspace: mọi định nghĩa xoá mềm quá 30 ngày → bỏ giá trị theo lô → xoá hẳn định nghĩa khi không còn dòng mang key. */
export async function pruneDeletedFields(db: TenantDb, now: Date): Promise<PruneResult> {
  const cutoff = new Date(now.getTime() - CUSTOM_FIELD_RETENTION_MS);
  const due = await db.customFieldDef.findMany({ where: { deletedAt: { lt: cutoff }, sys: false }, select: { id: true, entity: true, key: true }, orderBy: { deletedAt: 'asc' } });
  const out: PruneResult = { values: 0, defs: 0 };
  for (const d of due) {
    const entity = d.entity as CustomFieldEntity;
    if (!TABLE[entity]) continue;
    for (;;) {
      const n = await stripBatch(db, entity, d.key);
      out.values += n;
      if (n < PRUNE_BATCH) break;
    }
    // Còn dòng (bị khoá bởi giao dịch khác) → để lần quét sau; chỉ xoá hẳn khi sạch và vẫn đang xoá mềm quá hạn.
    const t = TenantSql.raw(TABLE[entity]);
    const [left] = await db.$queryRaw<{ n: bigint }[]>(sql`SELECT count(*)::bigint AS n FROM (SELECT 1 FROM ${t} WHERE ${hasKey(d.key)} LIMIT 1) s`);
    if (Number(left?.n ?? 0) > 0) continue;
    out.defs += (await db.customFieldDef.deleteMany({ where: { id: d.id, deletedAt: { lt: cutoff } } })).count;
  }
  return out;
}
