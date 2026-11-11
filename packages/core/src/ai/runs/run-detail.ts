// Chi tiết run có scope (TIP-019b §5.2, DC-380): `GET /v1/runs/:id` + `/steps` + `/children`. Quyền đọc qua `readableRun` (cùng
// `runScope` với danh sách); không có / ngoài phạm vi → null (controller trả 404 như nhau). Chỉ trường an toàn — không state, system,
// input duyệt, output thô. Bước / con phân trang keyset: chọn trang id theo index trước rồi mới đọc phần cần cho đúng N dòng.
// Run thuộc kỹ năng tiện ích (TIP-019c §3.7) — nhận theo `title` (4 action id dành riêng, 019c §3.1 — không nơi khác đặt run title bằng
// đúng các chuỗi này, kể cả run sửa lại dưới cùng operation): `result_text` LUÔN null dù run đã `completed` — đề xuất công khai chỉ qua
// `GET /ai-utilities/:runId/result` sau khi kiểm xong (phase validated), không rò qua đọc run chung.
// TIP-021b: run có kết quả RIÊNG (`output.protected` — soạn agent, binding `agent_draft_publication` theo run_id, không theo tiêu đề) cũng
// không bao giờ trả `result_text`; đề xuất chỉ đọc qua action soạn (binding đã công bố + chiếu quyền hiện hành).
import type { TenantDb } from '@appchat/db';
import { UTILITY_ACTIONS, type AuthzContext, type RunChildDto, type RunDetailDto, type RunLifecycle, type RunStepDto } from '@appchat/shared';
import { TenantSql as Prisma } from '@appchat/db';
import { readableRun } from './run-status';
import { parseAgentReply } from '@appchat/ai';
import { knowledgeCurrent } from '../kb/scope/provenance';
import { citationsOf } from '../citations/projection';
import { bindingOf } from '../citations/publication';
import { replyDigest, textRevision } from '../citations/text-revision';

type Db = Pick<TenantDb, 'aiRun' | 'aiRunStep' | 'aiAgent' | 'aiRootBudget' | 'aiUsageReceipt' | '$queryRaw'>;
const UTILITY_TITLES: ReadonlySet<string> = new Set(UTILITY_ACTIONS);

export const PAGE_DEFAULT = 30;
export const PAGE_MAX = 100;

const agentNames = async (db: Pick<TenantDb, 'aiAgent'>, ids: (string | null)[]) => {
  const uniq = [...new Set(ids.filter((x): x is string => !!x && /^[0-9a-f-]{36}$/i.test(x)))];
  return new Map((uniq.length ? await db.aiAgent.findMany({ where: { id: { in: uniq } }, select: { id: true, name: true } }) : []).map((a) => [a.id, a.name]));
};

/** Mã lỗi an toàn từ `ai_run.error` (`CODE: message` → CODE); thông báo thô của nhà cung cấp không ra ngoài. */
const errorCode = (e: string | null) => (e ? (/^[A-Z_]{2,40}/.exec(e)?.[0] ?? 'ERROR') : null);

export async function runDetail(db: Db, authz: AuthzContext, runId: string): Promise<RunDetailDto | null> {
  const ok = await readableRun(db, authz, runId);
  if (!ok) return null;
  const r = await db.aiRun.findUniqueOrThrow({ where: { id: ok.id } });
  const isRoot = r.rootRunId === r.id;
  const [steps, children, root, budget, unresolved] = await Promise.all([
    db.aiRunStep.count({ where: { runId: r.id } }),
    db.aiRun.count({ where: { parentRunId: r.id } }),
    isRoot ? Promise.resolve(r) : db.aiRun.findUnique({ where: { id: r.rootRunId }, select: { eventSeq: true } }),
    isRoot ? db.aiRootBudget.findUnique({ where: { rootRunId: r.id }, select: { unbilled: true, quarantined: true } }) : Promise.resolve(null),
    isRoot ? db.aiUsageReceipt.count({ where: { rootRunId: r.id, status: { in: ['dispatched', 'unknown'] } } }) : Promise.resolve(0),
  ]);
  const names = await agentNames(db, [r.agentId]);
  const out = (r.output ?? {}) as { text?: string; protected?: boolean };
  const isUtility = UTILITY_TITLES.has(r.title) || out.protected === true;
  return {
    id: r.id,
    root_run_id: r.rootRunId,
    parent_run_id: r.parentRunId,
    depth: r.depth,
    kind: r.kind,
    task: r.title,
    agent: r.agentId ? (names.get(r.agentId) ?? '') : '',
    lifecycle: r.status as RunLifecycle,
    stop_reason: r.stopReason,
    error_code: errorCode(r.error),
    started_at: r.startedAt.toISOString(),
    finished_at: r.finishedAt?.toISOString() ?? null,
    credits_local: r.creditsUsed,
    credits_subtree: r.subtreeCredits,
    credits_unbilled: isRoot ? (budget?.unbilled ?? 0) : null,
    accounting_pending: isRoot ? !!budget?.quarantined || unresolved > 0 : false,
    approval_id: r.status === 'waiting_approval' ? ((r.state as { approval_id?: string } | null)?.approval_id ?? null) : null,
    children,
    steps,
    // TIP-020c: kết quả dựa trên nguồn tri thức đã hết hiệu lực → không chiếu chữ (ẩn cả kết quả, không chỉ trích dẫn).
    result_text: await resultText(db, r, isUtility, out.text),
    // TIP-020d: nguồn của câu trả lời theo quyền xem hiện tại; ứng viên chưa kiểm không bao giờ ra đây.
    citations: r.citationPhase ? await citationsOf(db as never, r.id, authz) : null,
    answer_step_idx: r.citationPhase === 'validated' ? (bindingOf(r.answerCitations)?.answer_step_idx ?? null) : null,
    event_seq: root?.eventSeq ?? 0,
  };
}

/**
 * Chữ kết quả an toàn: run kỹ năng tiện ích / được bảo vệ → không; tri thức hết hiệu lực (TIP-020c) → không. Run trả lời có chế độ trích
 * dẫn (TIP-020d) → CHỈ chữ đã kiểm và công bố (`validated`), chưa kiểm / không hợp lệ → không (output thô là khối JSON của model).
 */
async function resultText(db: Db, r: { id: string; status: string; citationPhase: string | null; answerCitations: unknown; input: unknown }, isUtility: boolean, text: unknown): Promise<string | null> {
  if (isUtility || r.status !== 'completed' || typeof text !== 'string' || !(await knowledgeCurrent(db as never, r.id))) return null;
  if (!r.citationPhase) return text.slice(0, 2000);
  const b = r.citationPhase === 'validated' ? bindingOf(r.answerCitations) : null;
  if (!b) return null;
  const out = parseAgentReply(text);
  const pii = ((r.input ?? {}) as { pii?: Record<string, string> }).pii ?? {};
  const rev = textRevision(out.raw_reply ?? out.reply ?? '', pii);
  return replyDigest(rev.text) === b.reply_digest ? rev.text.slice(0, 2000) : null;
}

const limitOf = (n?: number) => Math.min(PAGE_MAX, Math.max(1, n ?? PAGE_DEFAULT));

/** Kết quả rút gọn của bước (không dữ liệu nghiệp vụ): ok · error:<mã> · needs_approval · job_accepted · … */
function outcomeOf(type: string, output: unknown): string | null {
  if (type !== 'tool' || !output || typeof output !== 'object') return null;
  const o = output as { kind?: string; code?: string };
  return o.kind === 'error' ? `error:${String(o.code ?? 'ERROR').slice(0, 40)}` : (o.kind ?? null);
}

/** Bước của run, theo idx tăng; `cursor` = idx cuối trang trước. */
export async function runSteps(db: Db, authz: AuthzContext, runId: string, q: { cursor?: string; limit?: number }): Promise<{ data: RunStepDto[]; next_cursor: string | null } | null> {
  const ok = await readableRun(db, authz, runId);
  if (!ok) return null;
  const after = q.cursor && /^\d{1,9}$/.test(q.cursor) ? Number(q.cursor) : -1;
  const n = limitOf(q.limit);
  // Index (run_id, idx) INCLUDE (id, type, status, credits, created_at): trang idx trước, output chỉ đọc cho đúng N dòng.
  const page = await db.aiRunStep.findMany({ where: { runId: ok.id, idx: { gt: after } }, orderBy: { idx: 'asc' }, take: n + 1, select: { id: true } });
  const ids = page.slice(0, n).map((p) => p.id);
  const rows = ids.length ? await db.aiRunStep.findMany({ where: { id: { in: ids } }, orderBy: { idx: 'asc' }, select: { idx: true, type: true, status: true, actionId: true, credits: true, createdAt: true, output: true } }) : [];
  return {
    data: rows.map((s) => ({ idx: s.idx, type: s.type, status: s.status, action_id: s.actionId, credits: s.credits, created_at: s.createdAt.toISOString(), outcome: outcomeOf(s.type, s.output) })),
    next_cursor: page.length > n && rows.length ? String(rows[rows.length - 1]!.idx) : null,
  };
}

/** Run con trực tiếp, theo thời điểm bắt đầu; `cursor` = `<started_at ms>.<id>` của dòng cuối. */
export async function runChildren(db: Db, authz: AuthzContext, runId: string, q: { cursor?: string; limit?: number }): Promise<{ data: RunChildDto[]; next_cursor: string | null } | null> {
  const ok = await readableRun(db, authz, runId);
  if (!ok) return null;
  const n = limitOf(q.limit);
  const m = q.cursor ? /^(\d{1,15})\.([0-9a-f-]{36})$/i.exec(q.cursor) : null;
  const at = m ? new Date(Number(m[1])) : null;
  // Index (parent_run_id, started_at, id) INCLUDE (status, kind) — keyset trên (started_at, id).
  const ids = await db.$queryRaw<{ id: string }[]>(Prisma.sql`
    SELECT id::text FROM ai_run WHERE parent_run_id = ${ok.id}::uuid
      ${at ? Prisma.sql`AND (started_at, id) > (${at}, ${m![2]}::uuid)` : Prisma.empty}
    ORDER BY started_at, id LIMIT ${n + 1}`);
  const pageIds = ids.slice(0, n).map((x) => x.id);
  const rows = pageIds.length ? await db.aiRun.findMany({ where: { id: { in: pageIds } }, orderBy: [{ startedAt: 'asc' }, { id: 'asc' }], select: { id: true, kind: true, title: true, agentId: true, status: true, subtreeCredits: true, startedAt: true } }) : [];
  const names = await agentNames(db, rows.map((r) => r.agentId));
  const last = rows[rows.length - 1];
  return {
    data: rows.map((r) => ({ id: r.id, kind: r.kind, task: r.title, agent: r.agentId ? (names.get(r.agentId) ?? '') : '', lifecycle: r.status as RunLifecycle, credits_subtree: r.subtreeCredits, started_at: r.startedAt.toISOString() })),
    next_cursor: ids.length > n && last ? `${last.startedAt.getTime()}.${last.id}` : null,
  };
}
