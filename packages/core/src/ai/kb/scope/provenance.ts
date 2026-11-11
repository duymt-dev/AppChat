// Nguồn đã dùng của run + kiểm lại lúc dùng (TIP-020c §3.4): mỗi lần `kb.search` trả đoạn, nguồn + thế hệ (`ingest_seq`) ghi vào
// `ai_run.knowledge_refs` của run binding (≤ 64, không nội dung / tên). Trước lời gọi model kế, công bố nháp / gợi ý, đọc lại lịch sử và đặt
// chỗ gửi: binding + phạm vi hiện hành + quyền nguồn hiện hành + thế hệ phải còn khớp — nguồn bị xoá / chuyển thư mục / đổi thẻ / đổi
// visibility / nạp lại / agent tạm dừng / thu hẹp phạm vi / người ra lệnh mất quyền → nội dung phụ thuộc không còn dùng được (ẩn cả
// artifact, không chỉ trích dẫn). Không khoá qua lời gọi mạng: mỗi lần kiểm là một truy vấn ngắn tại thời điểm dùng.
import { TenantSql as Prisma, type TenantDb } from '@appchat/db';
import type { AuthzContext } from '@appchat/shared';
import { admit, type Restriction } from './authority';
import { parseKnowledge } from './context';
import { sourceSql } from './query';
import { MAX_KNOWLEDGE_REFS, type KnowledgeContext, type KnowledgeRef } from './types';

type Db = Pick<TenantDb, 'aiRun' | 'aiAgent' | 'aiAgentVersion' | '$queryRaw'>;

/** Người hiệu lực hiện tại theo id (người ra lệnh / người hỏi) — null khi rời workspace. Vắng resolver → không đánh giá lại quyền người. */
export type WhoResolver = ((userId: string) => Promise<AuthzContext | null>) | null;

export function refsOf(v: unknown): KnowledgeRef[] {
  return Array.isArray(v) ? v.filter((x): x is KnowledgeRef => !!x && typeof x.s === 'string' && typeof x.b === 'string' && Number.isInteger(x.g)) : [];
}

/**
 * Ghi nguồn vừa đưa vào run VÀ các run tổ tiên (≤ 6 tầng): cha nhận kết quả của con (delegate / consult) cũng phụ thuộc nguồn đó — mỗi
 * nguồn mang binding đã cho phép nó (`b`) để kiểm theo đúng phạm vi con. Gộp theo (binding, nguồn); vượt 64 → giữ 64 đầu.
 */
export async function recordRefs(db: Pick<TenantDb, 'aiRun'>, runId: string, refs: readonly KnowledgeRef[]): Promise<void> {
  if (!refs.length) return;
  let id: string | null = runId;
  for (let i = 0; id && i < 6; i++) {
    const cur: { knowledgeRefs: unknown; parentRunId: string | null } | null = await db.aiRun.findUnique({ where: { id }, select: { knowledgeRefs: true, parentRunId: true } });
    if (!cur) return;
    const map = new Map(refsOf(cur.knowledgeRefs).map((r) => [`${r.b}:${r.s}`, r]));
    for (const r of refs) map.set(`${r.b}:${r.s}`, r);
    const next = [...map.values()].slice(0, MAX_KNOWLEDGE_REFS).map(({ s, g, b }) => ({ s, g, b }));
    await db.aiRun.update({ where: { id }, data: { knowledgeRefs: next } });
    id = cur.parentRunId;
  }
}

const userOf = (k: KnowledgeContext): string | null => (k.kind === 'assistant_unscoped' ? k.user_id : 'commander_id' in k ? (k.commander_id ?? null) : null);

/** Restriction của binding tại thời điểm kiểm (quyền người đọc lại khi có resolver; không có → chỉ kiểm nguồn / phạm vi). */
async function restrictionOf(db: Db, k: KnowledgeContext, who: WhoResolver): Promise<Restriction | null> {
  const uid = userOf(k);
  const principal = uid && who ? await who(uid) : null;
  if (uid && who && !principal) return null;
  // Không resolver: người coi như đủ quyền module (chỉ kiểm vòng đời / phạm vi / thế hệ) — quyền người đã kiểm ở mỗi lời gọi tool.
  const stand: AuthzContext = principal ?? { userId: uid ?? '', isOwner: true, permissions: new Set(), scope: { inbox: 'all', crm: 'all', sales: 'all', booking: 'all', support: 'all', insights: 'all' }, teamIds: [] };
  const a = await admit(db, k, stand);
  return a.ok ? a.r : null;
}

/**
 * Run còn dùng được nội dung tri thức không. Run không có nguồn → luôn được. Có nguồn mà thiếu / hỏng binding (run cũ) → không.
 * Có nguồn → mọi nguồn phải còn khớp vị từ hiện hành VÀ cùng thế hệ.
 */
export async function knowledgeCurrent(db: Db, runId: string, who: WhoResolver = null): Promise<boolean> {
  const run = await db.aiRun.findUnique({ where: { id: runId }, select: { knowledgeRefs: true } });
  if (!run) return false;
  const refs = refsOf(run.knowledgeRefs);
  if (!refs.length) return true;
  // Mỗi nguồn kiểm theo binding đã cho phép nó (run con consult / delegate có phạm vi riêng, không theo phạm vi của run tiêu thụ).
  const byBinding = new Map<string, KnowledgeRef[]>();
  for (const x of refs) byBinding.set(x.b, [...(byBinding.get(x.b) ?? []), x]);
  for (const [b, group] of byBinding) {
    const owner = await db.aiRun.findUnique({ where: { id: b }, select: { knowledge: true } });
    const k = parseKnowledge(owner?.knowledge);
    if (!k) return false;
    const r = await restrictionOf(db, k, who);
    if (!r) return false;
    const ok = await db.$queryRaw<{ id: string; seq: number }[]>`
      SELECT s.id::text AS id, s.ingest_seq AS seq FROM kb_source s WHERE s.id = ANY(${group.map((x) => x.s)}::uuid[]) AND ${sourceSql(r)}`;
    const live = new Map(ok.map((x) => [x.id, Number(x.seq)]));
    if (!group.every((x) => live.get(x.s) === x.g)) return false;
  }
  return true;
}

/** Nhiều run cùng lúc (danh sách hội thoại / lịch sử phiên) → tập run KHÔNG còn dùng được. */
export async function staleRuns(db: Db, runIds: readonly (string | null | undefined)[], who: WhoResolver = null): Promise<Set<string>> {
  const ids = [...new Set(runIds.filter((x): x is string => !!x))];
  if (!ids.length) return new Set();
  const withRefs = await db.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT id::text FROM ai_run WHERE id = ANY(${ids}::uuid[]) AND knowledge_refs IS NOT NULL AND jsonb_array_length(knowledge_refs) > 0`);
  const out = new Set<string>();
  for (const { id } of withRefs) if (!(await knowledgeCurrent(db, id, who))) out.add(id);
  return out;
}
