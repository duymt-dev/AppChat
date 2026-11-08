// Ứng viên khách trùng (TIP-015e §1.1–§1.2): cặp khách sống CẢ HAI phía đều trong scope đọc crm hiện tại (áp TRƯỚC khớp / đếm / phân
// trang — khách ẩn không quyết định cặp hay số đếm). Khoá khớp: email (lower), MST, họ tên không dấu — mỗi khoá một nhánh self-join đi index
// biểu thức một phần (không quét O(n²) trong JS, không cắt 500 bản ghi). Cặp ổn định `<a.id>~<b.id>` theo UUID tăng dần; gợi ý bản chính =
// khách tạo trước. `score_kind: 'rule'` — luật khớp, KHÔNG phải xác suất AI. Cursor seek (rank, a, b) + dấu thế hệ: scope / truy vấn /
// dữ liệu khớp đổi → 409 STALE_VERSION `{cursor:'stale'}` (bắt đầu lại), không âm thầm bỏ / lặp cặp. Cursor không chứa PII.
import { createHash } from 'node:crypto';
import { TenantSql as Prisma } from '@appchat/db';
import { AppError, foldText, type AuthzContext, type DuplicateCandidate } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { scopeSql } from '../services/access';

type Pair = { a: string; b: string; email: boolean; tax: boolean; name: boolean };
type Side = { id: string; code: string; name: string; email: string | null; phone: string | null; source: string; created_at: Date; version: number };

/** Hạng luật (cao trước): email + tên > email > MST > tên. */
const rankOf = (p: Pick<Pair, 'email' | 'tax' | 'name'>) => (p.email && p.name ? 4 : p.email ? 3 : p.tax ? 2 : 1);
const scopeFor = (alias: string, authz: AuthzContext) => Prisma.sql`${Prisma.raw(alias)}.id IN (SELECT c.id FROM contact c WHERE c.deleted_at IS NULL AND ${scopeSql(authz, 'read')})`;

/** Dấu thế hệ của tập ứng viên trong scope: số khách sống + max(version) theo khoá khớp — đổi tên / email / MST / gộp / xoá đều đổi dấu. */
async function generation(tx: TenantTx, authz: AuthzContext, q: string): Promise<string> {
  const [g] = await tx.$queryRaw<{ n: bigint; v: bigint; u: Date | null }[]>`
    SELECT count(*) AS n, coalesce(sum(c.version), 0) AS v, max(c.updated_at) AS u
    FROM contact c WHERE c.deleted_at IS NULL AND ${scopeSql(authz, 'read')}`;
  const scope = JSON.stringify([authz.userId, authz.isOwner, [...authz.permissions].sort(), authz.scope, [...authz.teamIds].sort()]);
  return createHash('sha256').update(`${scope}|${q}|${g?.n ?? 0}|${g?.v ?? 0}|${g?.u?.toISOString() ?? ''}`).digest('base64url').slice(0, 16);
}

const enc = (gen: string, rank: number, a: string, b: string) => Buffer.from(`${gen}|${rank}|${a}|${b}`).toString('base64url');
function dec(c: string) {
  const [gen, r, a, b] = Buffer.from(c, 'base64url').toString('utf8').split('|');
  const rank = Number(r);
  if (!gen || !a || !b || !Number.isInteger(rank)) throw new AppError('VALIDATION_FAILED', 400, { cursor: 'invalid' });
  return { gen, rank, a, b };
}

export async function duplicateCandidates(tx: TenantTx, authz: AuthzContext, input: { q?: string; cursor?: string; limit?: number }): Promise<{ data: DuplicateCandidate[]; next_cursor: string | null }> {
  const limit = Math.min(Math.max(input.limit ?? 20, 1), 50);
  const term = input.q?.trim().slice(0, 200) ?? '';
  const gen = await generation(tx, authz, term);
  const after = input.cursor ? dec(input.cursor) : null;
  if (after && after.gen !== gen) throw new AppError('STALE_VERSION', 409, { cursor: 'stale' });
  const like = term ? `%${foldText(term).replace(/[\\%_]/g, (x) => `\\${x}`)}%` : null;
  const filter = like ? Prisma.sql`AND (f_unaccent(lower(a.name)) LIKE ${like} OR f_unaccent(lower(b.name)) LIKE ${like} OR lower(a.email) LIKE ${like} OR lower(b.email) LIKE ${like})` : Prisma.empty;
  const live = Prisma.sql`a.deleted_at IS NULL AND b.deleted_at IS NULL AND a.id < b.id AND ${scopeFor('a', authz)} AND ${scopeFor('b', authz)} ${filter}`;
  // Ba nhánh khớp (mỗi nhánh dùng index biểu thức của khoá) → gộp theo cặp → hạng luật. Seek sau cặp cuối của trang trước.
  const rows = await tx.$queryRaw<(Pair & { rank: number })[]>`
    WITH m AS (
      SELECT a.id AS a, b.id AS b, true AS email, false AS tax, false AS name FROM contact a JOIN contact b ON lower(a.email) = lower(b.email)
        WHERE a.email IS NOT NULL AND b.email IS NOT NULL AND ${live}
      UNION ALL
      SELECT a.id, b.id, false, true, false FROM contact a JOIN contact b ON a.tax_code = b.tax_code
        WHERE a.tax_code IS NOT NULL AND b.tax_code IS NOT NULL AND ${live}
      UNION ALL
      SELECT a.id, b.id, false, false, true FROM contact a JOIN contact b ON f_unaccent(lower(a.name)) = f_unaccent(lower(b.name))
        WHERE ${live}
    ), p AS (
      SELECT a, b, bool_or(email) AS email, bool_or(tax) AS tax, bool_or(name) AS name FROM m GROUP BY a, b
    ), r AS (
      SELECT a, b, email, tax, name, (CASE WHEN email AND name THEN 4 WHEN email THEN 3 WHEN tax THEN 2 ELSE 1 END)::int AS rank FROM p
    )
    SELECT a::text, b::text, email, tax, name, rank FROM r
    ${after ? Prisma.sql`WHERE (r.rank < ${after.rank} OR (r.rank = ${after.rank} AND (r.a, r.b) > (${after.a}::uuid, ${after.b}::uuid)))` : Prisma.empty}
    ORDER BY rank DESC, a, b LIMIT ${limit + 1}`;
  const more = rows.length > limit;
  const page = rows.slice(0, limit);
  if (!page.length) return { data: [], next_cursor: null };
  const ids = [...new Set(page.flatMap((p) => [p.a, p.b]))];
  const sides = await tx.$queryRaw<Side[]>`
    SELECT id::text, code, name, email, phone, source, created_at, version FROM contact WHERE id = ANY(${ids}::uuid[])`;
  const by = new Map(sides.map((s) => [s.id, s]));
  const view = (s: Side) => ({ id: s.id, code: s.code, name: s.name, email: s.email, phone: s.phone, source: s.source, created_at: s.created_at.toISOString(), version: s.version });
  const data = page.flatMap((p): DuplicateCandidate[] => {
    const a = by.get(p.a);
    const b = by.get(p.b);
    if (!a || !b) return [];
    const primary = a.created_at.getTime() <= b.created_at.getTime() ? a : b;
    const evidence = [...(p.email ? (['email'] as const) : []), ...(p.tax ? (['tax_code'] as const) : []), ...(p.name ? (['name'] as const) : [])];
    return [{ key: `${p.a}~${p.b}`, score_kind: 'rule', rank: rankOf(p), evidence, primary_id: primary.id, a: view(a), b: view(b) }];
  });
  const last = page[page.length - 1]!;
  return { data, next_cursor: more ? enc(gen, last.rank, last.a, last.b) : null };
}
