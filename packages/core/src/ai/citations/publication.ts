// Công bố câu trả lời mang trích dẫn (TIP-020d §2): chế độ `validated_citations` do server đặt lúc tạo run trả lời kênh (client không đặt
// được). Pha: awaiting_generation (run đang sinh) → validating (ứng viên riêng: chữ thô + trích dẫn model chọn, lease) → validated | invalidated
// | failed. CAS theo pha + token lease: huỷ / bị thay / finalizer cũ không thắng. Chi tiết run / sự kiện / lịch sử chỉ thấy "đang chờ" cho
// tới khi công bố. Khôi phục sau khi engine xong mà finalizer chết: nạp lại ứng viên + sổ + quyền nguồn hiện hành, kiểm lại CỤC BỘ (không
// gọi lại provider — `recovery.ts`); thiếu ứng viên → failed USAGE_UNKNOWN. Lượt mất (khôi phục) không tự gửi khách — chỉ chốt binding.
import { randomUUID } from 'node:crypto';
import type { TenantDb } from '@appchat/db';
import { parseAgentReply } from '@appchat/ai';
import { registryFor } from './binding';
import { validateAnswer, type Citation, type CitationOutcome } from './validation';

export const CITATION_SCHEMA_VERSION = 1;
export const CITATION_LEASE_MS = 120_000;
export const OPEN_PHASES = ['awaiting_generation', 'validating'] as const;
const OPEN = OPEN_PHASES;

export type CitationState = 'validated' | 'none' | 'missing' | 'invalid';

/** Binding đã công bố (cột `answer_citations` sau khi chốt) — không còn chữ thô / ứng viên. */
export interface AnswerBinding {
  v: number;
  state: CitationState;
  answer_generation: number;
  answer_step_idx: number | null;
  reply_digest: string | null;
  citations: Citation[];
  reason: string | null;
}

type Db = Pick<TenantDb, 'aiRun' | 'aiRunStep' | 'aiAgent' | 'aiAgentVersion' | '$queryRaw'>;

export function bindingOf(v: unknown): AnswerBinding | null {
  const b = v as Partial<AnswerBinding> | null;
  return b && b.v === CITATION_SCHEMA_VERSION && typeof b.state === 'string' && Array.isArray(b.citations) ? (b as AnswerBinding) : null;
}

/** Giữ ứng viên riêng + lease. Trả token; null = run không ở pha mở (đã chốt / không áp dụng) → không công bố. */
export async function beginValidation(db: Pick<TenantDb, 'aiRun'>, runId: string, raw: string, now: Date): Promise<string | null> {
  const token = randomUUID();
  const r = await db.aiRun.updateMany({
    where: { id: runId, citationPhase: { in: [...OPEN] }, status: { not: 'cancelled' } },
    data: { citationPhase: 'validating', answerCitations: { v: CITATION_SCHEMA_VERSION, candidate: { raw }, lease: token, lease_until: new Date(now.getTime() + CITATION_LEASE_MS).toISOString() } },
  });
  return r.count ? token : null;
}

/** Bước trả lời = bước LLM cuối của run. */
async function answerStep(db: Pick<TenantDb, 'aiRunStep'>, runId: string): Promise<number | null> {
  return (await db.aiRunStep.findFirst({ where: { runId, type: 'llm' }, orderBy: { idx: 'desc' }, select: { idx: true } }))?.idx ?? null;
}

/** Chốt kết quả kiểm (CAS theo token lease). false = mất lease (huỷ / bị thay / khôi phục đã chốt) → người gọi không dùng kết quả. */
export async function publishOutcome(db: Db, runId: string, token: string, o: CitationOutcome): Promise<boolean> {
  const step = await answerStep(db, runId);
  const state: CitationState = o.kind === 'validated' ? 'validated' : o.kind;
  const binding: AnswerBinding = {
    v: CITATION_SCHEMA_VERSION,
    state,
    answer_generation: 1,
    answer_step_idx: step,
    reply_digest: o.kind === 'invalid' ? null : o.digest,
    citations: o.kind === 'validated' ? o.citations : [],
    reason: o.kind === 'invalid' ? o.reason : null,
  };
  const r = await db.aiRun.updateMany({
    where: { id: runId, citationPhase: 'validating', status: { not: 'cancelled' }, answerCitations: { path: ['lease'], equals: token } },
    data: { citationPhase: o.kind === 'invalid' ? 'invalidated' : 'validated', answerCitations: binding as object },
  });
  if (!r.count) return false;
  // Trích dẫn chuẩn hoá trên bước trả lời (kết quả tool truy hồi giữ hit riêng, không gọi là trích dẫn của câu trả lời).
  if (step !== null && binding.citations.length) {
    const s = await db.aiRunStep.findFirst({ where: { runId, idx: step }, select: { id: true, output: true } });
    if (s) await db.aiRunStep.update({ where: { id: s.id }, data: { output: { ...((s.output as object | null) ?? {}), citations: binding.citations } as object } });
  }
  return true;
}

/** Kiểm + chốt một lượt (đường chính). */
export async function finalizeAnswer(db: Db, runId: string, raw: string, out: ReturnType<typeof parseAgentReply>, pii: Record<string, string>, now: Date): Promise<CitationOutcome | null> {
  const token = await beginValidation(db, runId, raw, now);
  if (!token) return null;
  const o = await validateAnswer(db, out, pii, await registryFor(db, runId));
  return (await publishOutcome(db, runId, token, o)) ? o : null;
}

/** Huỷ / thu hồi: đóng binding đang mở (không công bố nữa). */
export async function failOpen(db: Pick<TenantDb, 'aiRun'>, runId: string, reason: string): Promise<void> {
  await db.aiRun.updateMany({ where: { id: runId, citationPhase: { in: [...OPEN] } }, data: { citationPhase: 'failed', answerCitations: { v: CITATION_SCHEMA_VERSION, state: 'invalid', answer_generation: 1, answer_step_idx: null, reply_digest: null, citations: [], reason } } });
}
