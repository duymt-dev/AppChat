// Đọc / khoá hoạt động CRM (TIP-026b §3.1, §6). Trang cursor theo đúng thứ tự index (bằng trước, sắp xếp sau): ghi chú / bình luận
// (contact_id, kind, created_at DESC, id DESC); việc (contact_id, state, due_at ASC NULLS LAST, id) — mở, xong, huỷ;
// cơ hội chưa lưu trữ (contact_id, updated_at DESC, id DESC). Cursor mang loại + bộ sắp xếp, lệch loại / hỏng → 400.
import { AppError } from '@appchat/shared';
import { TenantSql as Prisma } from '@appchat/db';
import type { TenantTx } from '../../kernel/actions/action-context';
import type { ActivityKind } from '@appchat/shared';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Cur = { k: ActivityKind; v: (string | number | null)[]; id: string };

export function encodeCursor(c: Cur): string {
  return Buffer.from(JSON.stringify(c), 'utf8').toString('base64url');
}
export function decodeCursor(raw: string | undefined, kind: ActivityKind): Cur | null {
  if (!raw) return null;
  try {
    const c = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as Cur;
    if (c.k === kind && UUID.test(c.id) && Array.isArray(c.v)) return c;
  } catch {
    /* rơi xuống lỗi chung */
  }
  throw new AppError('VALIDATION_FAILED', 400, { cursor: 'invalid' });
}

/** Một trang id + giá trị sắp xếp (rồi nạp bản ghi theo id — deferred join qua PK). */
export async function pageIds(tx: TenantTx, contactId: string, kind: ActivityKind, cursor: Cur | null, limit: number): Promise<{ ids: string[]; next: string | null }> {
  // Mốc thời gian giữ dạng chữ đủ micro giây (Date JS cắt về mili giây → lặp dòng ở trang sau).
  let rows: { id: string; s1: string; s2: string | null }[];
  if (kind === 'notes' || kind === 'comments') {
    const k = kind === 'notes' ? 'note' : 'comment';
    const after = cursor ? Prisma.sql`AND (created_at, id) < (${String(cursor.v[0])}::timestamptz, ${cursor.id}::uuid)` : Prisma.empty;
    rows = await tx.$queryRaw`SELECT id, created_at::text AS s1, NULL::text AS s2 FROM contact_note
      WHERE contact_id = ${contactId}::uuid AND kind = ${k}::contact_note_kind AND deleted_at IS NULL ${after}
      ORDER BY created_at DESC, id DESC LIMIT ${limit + 1}`;
  } else if (kind === 'tasks') {
    // Enum Postgres sắp theo thứ tự khai báo (open, done, cancelled) → ORDER BY state dùng thẳng index; NULL hạn ở cuối mỗi trạng thái.
    let after = Prisma.empty;
    if (cursor) {
      const [st, due] = [String(cursor.v[0]), cursor.v[1]];
      const same =
        due === null
          ? Prisma.sql`due_at IS NULL AND id > ${cursor.id}::uuid`
          : Prisma.sql`(due_at > ${String(due)}::timestamptz OR due_at IS NULL OR (due_at = ${String(due)}::timestamptz AND id > ${cursor.id}::uuid))`;
      after = Prisma.sql`AND (state > ${st}::contact_task_state OR (state = ${st}::contact_task_state AND ${same}))`;
    }
    rows = await tx.$queryRaw`SELECT id, state::text AS s1, due_at::text AS s2 FROM contact_task
      WHERE contact_id = ${contactId}::uuid ${after}
      ORDER BY state ASC, due_at ASC NULLS LAST, id ASC LIMIT ${limit + 1}`;
  } else {
    const after = cursor ? Prisma.sql`AND (updated_at, id) < (${String(cursor.v[0])}::timestamptz, ${cursor.id}::uuid)` : Prisma.empty;
    rows = await tx.$queryRaw`SELECT id, updated_at::text AS s1, NULL::text AS s2 FROM contact_opportunity
      WHERE contact_id = ${contactId}::uuid AND archived_at IS NULL ${after}
      ORDER BY updated_at DESC, id DESC LIMIT ${limit + 1}`;
  }
  const more = rows.length > limit;
  const page = rows.slice(0, limit);
  const last = page.at(-1);
  const next = more && last ? encodeCursor({ k: kind, v: [last.s1, last.s2], id: last.id }) : null;
  return { ids: page.map((r) => r.id), next };
}

/** Khoá dòng hoạt động (FOR UPDATE) trước khi đối chiếu version / đổi — hai lệnh cùng version → một thắng. */
export async function lockRow(tx: TenantTx, table: 'contact_note' | 'contact_task' | 'contact_opportunity', id: string) {
  if (!UUID.test(id)) return false;
  const r = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM ${Prisma.raw(table)} WHERE id = ${id}::uuid FOR UPDATE`;
  return r.length === 1;
}
