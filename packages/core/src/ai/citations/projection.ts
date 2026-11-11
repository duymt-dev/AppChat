// Chiếu trích dẫn cho người xem (TIP-020d §3.1, §2.4): đọc binding đã công bố của run trả lời → kiểm lại nguồn hiện hành (TIP-020c) → nhãn
// an toàn theo quyền xem HIỆN TẠI. Nguồn mất / nạp lại / bị thu hồi → `unavailable` (cả câu trả lời phụ thuộc đã bị ẩn ở chỗ khác — ở đây
// không lộ tên / đường dẫn / số nguồn bị cấm). Trích dẫn trỏ đúng (nguồn, đoạn, thế hệ) — không bao giờ ánh xạ sang đoạn mới cùng thứ tự.
import { TenantSql as Prisma, type TenantDb } from '@appchat/db';
import type { AiCitationsDto, AuthzContext } from '@appchat/shared';
import { internalRights } from '../kb/scope/authority';
import { entriesCurrent } from './validation';
import { bindingOf } from './publication';

type Db = Pick<TenantDb, 'aiRun' | 'aiAgent' | 'aiAgentVersion' | '$queryRaw'>;

/** Binding câu trả lời của run → DTO trích dẫn; null = run không có câu trả lời ở chế độ trích dẫn (không hiện khối nguồn). */
export async function citationsOf(db: Db, runId: string, viewer: AuthzContext, o: { originalDraft?: boolean } = {}): Promise<AiCitationsDto | null> {
  const r = await db.aiRun.findUnique({ where: { id: runId }, select: { citationPhase: true, answerCitations: true } });
  if (!r?.citationPhase) return null;
  const answer = { run_id: runId, generation: 1 };
  const b = r.citationPhase === 'validated' ? bindingOf(r.answerCitations) : null;
  if (!b) return r.citationPhase === 'invalidated' || r.citationPhase === 'failed' ? { answer, state: 'unavailable', entries: [] } : null;
  if (b.state !== 'validated' || !b.citations.length) return { answer, state: 'none', entries: [] };
  // Kiểm lại nguồn hiện hành theo binding đã cho phép (sổ của run) — một nguồn đổi → cả khối không còn hiệu lực.
  const reg = ((await db.aiRun.findUnique({ where: { id: runId }, select: { citationRegistry: true } }))?.citationRegistry ?? []) as { a: string; s: string; c: string; g: number; d: string; b: string }[];
  const used = reg.filter((e) => b.citations.some((c) => c.chunk_id === e.c && c.source_id === e.s && c.source_generation === e.g));
  if (used.length !== new Set(b.citations.map((c) => c.chunk_id)).size || !(await entriesCurrent(db, used))) return { answer, state: 'unavailable', entries: [] };
  const names = await visibleNames(db, viewer, [...new Set(b.citations.map((c) => c.source_id))], [...new Set(b.citations.map((c) => c.chunk_id))]);
  return {
    answer,
    state: o.originalDraft ? 'original_draft' : 'validated',
    entries: b.citations.map((c) => ({ source_id: c.source_id, name: names.source.get(c.source_id) ?? null, heading: names.heading.get(c.chunk_id) ?? null, claim_start: c.claim_start, claim_end: c.claim_end })),
  };
}

/** Tên nguồn + mục (đường dẫn trong tài liệu) người xem được đọc: public cho mọi người; internal theo quyền module (TIP-020c). */
async function visibleNames(db: Pick<TenantDb, '$queryRaw'>, a: AuthzContext, sourceIds: string[], chunkIds: string[]) {
  const x = internalRights(a);
  const internal: Prisma.Sql[] = [];
  if (x.documents) internal.push(Prisma.sql`(s.product_id IS NULL AND s.origin IN ('upload', 'url', 'text', 'drive'))`);
  if (x.catalog) internal.push(Prisma.sql`s.product_id IS NOT NULL`);
  if (x.inbox) internal.push(Prisma.sql`s.origin = 'conversation'`);
  const allow = internal.length ? Prisma.sql`(s.visibility = 'public' OR (${Prisma.join(internal, ' OR ')}))` : Prisma.sql`s.visibility = 'public'`;
  const src = await db.$queryRaw<{ id: string; name: string }[]>(Prisma.sql`SELECT s.id::text AS id, s.name FROM kb_source s WHERE s.id = ANY(${sourceIds}::uuid[]) AND s.deleted_at IS NULL AND ${allow}`);
  const source = new Map(src.map((s) => [s.id, s.name]));
  const ch = await db.$queryRaw<{ id: string; source_id: string; meta: { path?: string[] } | null }[]>(Prisma.sql`SELECT c.id::text AS id, c.source_id::text AS source_id, c.meta FROM kb_chunk c WHERE c.id = ANY(${chunkIds}::uuid[])`);
  const heading = new Map(ch.filter((c) => source.has(c.source_id) && c.meta?.path?.length).map((c) => [c.id, c.meta!.path!.join(' › ').slice(0, 200)]));
  return { source, heading };
}
