// Kanban phân trang theo cột (TIP-026b §4.1, §6): mỗi cột một trang id theo index (stage `=` trước, sort + id sau) + cursor seek theo
// bộ (giá trị sort, id) — không window toàn bảng, không OFFSET. Cursor gắn với cột + vân tay bộ lọc / sắp xếp: dùng cursor của truy vấn
// khác → 400. Giá trị sort giữ dạng text (timestamp micro giây, bigint) để không lệch / lặp dòng giữa trang.
import { createHash } from 'node:crypto';
import { TenantSql as Prisma } from '@appchat/db';
import { AppError, type AuthzContext, type ContactSort } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { where, type ContactFilter } from './contacts.repo';

export const BOARD_DEFAULT = 50;
export const BOARD_MAX = 100;

interface Cursor {
  s: string;
  f: string;
  v: string;
  id: string;
}

/** Vân tay bộ lọc (bỏ stage — cột quyết định) + sắp xếp: cursor không dùng chéo truy vấn. */
const print = (f: ContactFilter) => {
  const { stage: _s, ...rest } = f; // eslint-disable-line @typescript-eslint/no-unused-vars
  const keys = Object.keys(rest).sort();
  return createHash('sha256').update(JSON.stringify(keys.map((k) => [k, (rest as Record<string, unknown>)[k]]))).digest('hex').slice(0, 16);
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const encodeBoardCursor = (c: Cursor) => Buffer.from(JSON.stringify(c)).toString('base64url');
export function decodeBoardCursor(raw: string | undefined, stage: string, f: ContactFilter): Cursor | null {
  if (!raw) return null;
  try {
    const c = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as Cursor;
    if (c.s === stage && c.f === print(f) && typeof c.v === 'string' && UUID.test(c.id)) return c;
  } catch {
    /* rơi xuống lỗi chung */
  }
  throw new AppError('VALIDATION_FAILED', 400, { cursor: 'invalid' });
}

/** Cột sort + biểu thức text của nó + chiều — khớp đúng index `contact_stage_*`. */
const SORTS: Record<ContactSort, { col: Prisma.Sql; text: Prisma.Sql; cast: Prisma.Sql; desc: boolean }> = {
  recent: { col: Prisma.sql`c.last_interaction_at`, text: Prisma.sql`c.last_interaction_at::text`, cast: Prisma.sql`::timestamptz`, desc: true },
  name: { col: Prisma.sql`c.name`, text: Prisma.sql`c.name`, cast: Prisma.empty, desc: false },
  created: { col: Prisma.sql`c.created_at`, text: Prisma.sql`c.created_at::text`, cast: Prisma.sql`::timestamptz`, desc: true },
  value: { col: Prisma.sql`c.total_spent`, text: Prisma.sql`c.total_spent::text`, cast: Prisma.sql`::bigint`, desc: true },
};

/** Một trang id của một cột + cursor trang sau (null = hết). */
export async function boardColumnIds(tx: TenantTx, authz: AuthzContext, f: ContactFilter, stage: string, cursor: Cursor | null, limit: number) {
  const s = SORTS[f.sort ?? 'recent'] ?? SORTS.recent;
  const dir = s.desc ? Prisma.sql`DESC` : Prisma.sql`ASC`;
  const after = cursor
    ? s.desc
      ? Prisma.sql`AND (${s.col}, c.id) < (${cursor.v}${s.cast}, ${cursor.id}::uuid)`
      : Prisma.sql`AND (${s.col}, c.id) > (${cursor.v}${s.cast}, ${cursor.id}::uuid)`
    : Prisma.empty;
  const rows = await tx.$queryRaw<{ id: string; v: string }[]>`
    SELECT c.id, ${s.text} AS v FROM contact c
    WHERE ${where(authz, { ...f, stage })} ${after}
    ORDER BY ${s.col} ${dir}, c.id ${dir}
    LIMIT ${limit + 1}`;
  const page = rows.slice(0, limit);
  const last = page.at(-1);
  return { ids: page.map((r) => r.id), next: rows.length > limit && last ? encodeBoardCursor({ s: stage, f: print(f), v: last.v, id: last.id }) : null };
}
