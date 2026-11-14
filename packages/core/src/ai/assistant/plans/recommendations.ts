// Gợi ý tái dùng (TIP-023d §4.1): xếp hạng tất định — trùng action / module với yêu cầu mới + trùng token tiêu đề chung (không dấu), không
// "điểm tin cậy" bịa, không gửi lịch sử phiên cho model. Không ứng viên an toàn → rỗng (FE hiện "không có"). Chỉ ứng viên của CHÍNH người
// gọi; cấu trúc tham chiếu action không còn / không còn handler bị loại (quyền hiện hành).
import { registry } from '@appchat/actions';
import type { TenantDb } from '@appchat/db';
import type { ReuseStep } from './reuse';

const DEFS = new Map(registry.map((a) => [a.id, a]));
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
const tokens = (s: string) => new Set(norm(s).split(/[^a-z0-9]+/).filter((t) => t.length > 1));

export interface ReuseQuery {
  /** Action dự kiến của yêu cầu mới (từ kế hoạch đang đề xuất); vắng → chỉ theo chữ. */
  actions?: readonly string[];
  text?: string;
}

export interface ReuseSuggestion {
  id: string;
  source_plan_id: string;
  source_revision: number;
  generic_title: string;
  step_count: number;
  score: number;
}

/** Điểm: 3 × action trùng + 1 × module trùng + 1 × token tiêu đề trùng. Không trùng gì → 0 (bị loại khi có truy vấn). */
export function scoreOf(structure: readonly ReuseStep[], title: string, q: ReuseQuery): number {
  const acts = new Set(structure.filter((s) => s.kind === 'action' && s.target).map((s) => s.target!));
  const mods = new Set([...acts].map((a) => DEFS.get(a)?.module).filter(Boolean));
  const want = new Set(q.actions ?? []);
  const wantMods = new Set([...want].map((a) => DEFS.get(a)?.module).filter(Boolean));
  const tt = tokens(title);
  const qt = q.text ? tokens(q.text) : new Set<string>();
  let score = 0;
  for (const a of want) if (acts.has(a)) score += 3;
  for (const m of wantMods) if (mods.has(m)) score += 1;
  for (const t of qt) if (tt.has(t)) score += 1;
  return score;
}

export async function suggestReuse(db: Pick<TenantDb, 'assistantPlanReuseCandidate'>, ownerUserId: string, q: ReuseQuery, isImplemented: (id: string) => boolean, limit = 3): Promise<ReuseSuggestion[]> {
  // Mới nhất trước qua index (owner, updated_at) — đủ rộng để xếp hạng, không quét bảng.
  const rows = await db.assistantPlanReuseCandidate.findMany({ where: { ownerUserId, eligible: true }, orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }], take: 50 });
  const query = !!(q.actions?.length || q.text?.trim());
  return rows
    .map((r) => ({ r, structure: r.structure as unknown as ReuseStep[] }))
    .filter(({ structure }) => structure.every((s) => s.kind !== 'action' || (!!s.target && DEFS.has(s.target) && isImplemented(s.target))))
    .map(({ r, structure }) => ({ id: r.id, source_plan_id: r.sourcePlanId, source_revision: r.sourceRevision, generic_title: r.genericTitle, step_count: structure.length, score: query ? scoreOf(structure, r.genericTitle, q) : 0 }))
    .filter((s) => !query || s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
