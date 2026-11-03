// Vết một lượt Trợ lý cho bộ câu thử model thật (TIP-023b R1.4 `tools/ai-live`, eval.md §6): bước tool (action gọi, input đã che bí mật — SĐT / email thành dấu vân tay,
// kết quả rút gọn) + bước LLM (provider / model / token) + version prompt. Chỉ run `assistant` do chính người gọi tạo — run của người
// khác trả NOT_FOUND (không xác nhận tồn tại). Không trả nội dung tin nhắn / system prompt.
import { createHash } from 'node:crypto';
import { prompt } from '@appchat/ai';
import type { TenantDb } from '@appchat/db';
import { AppError, REDACT_CENSOR, REDACT_KEYS } from '@appchat/shared';
import type { AssistantRunInput } from './assistant-prompt';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_STEPS_READ = 64;
const SECRET = new Set<string>(REDACT_KEYS);
/** PII người dùng tự nói trong câu (SĐT / email): vết trả dấu vân tay thay giá trị — bộ chấm so khớp mà không lộ dữ liệu khách. */
const PII = new Set(['phone', 'email']);

/** `sha256:<16 hex>` của giá trị đã bỏ khoảng trắng + chữ thường (cùng cách chuẩn hoá với bộ chấm tools/ai-live). */
export const traceFingerprint = (v: string) => `sha256:${createHash('sha256').update(v.replace(/\s+/g, '').toLowerCase()).digest('hex').slice(0, 16)}`;

function traceInput(v: unknown, depth = 0): unknown {
  if (depth > 6 || v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map((x) => traceInput(x, depth + 1));
  return Object.fromEntries(
    Object.entries(v).map(([k, x]) => [k, PII.has(k) && typeof x === 'string' ? traceFingerprint(x) : SECRET.has(k) ? REDACT_CENSOR : traceInput(x, depth + 1)]),
  );
}

export interface RunTraceStep {
  idx: number;
  type: 'llm' | 'tool';
  tool?: string;
  /** `call_action` → action thật được gọi; tool khác → tên tool. */
  action_id?: string;
  input?: unknown;
  outcome?: string;
  error_code?: string;
  status: string;
  provider?: string;
  model?: string;
  tokens_in: number;
  tokens_out: number;
}

export interface RunTrace {
  run_id: string;
  status: string;
  prompt: { name: string; version: number; locale: string; hash: string };
  credits: number;
  steps: RunTraceStep[];
}

type StepRow = { idx: number; type: string; actionId: string | null; input: unknown; output: unknown; status: string; provider: string | null; model: string | null; tokensIn: number; tokensOut: number };

function toolStep(s: StepRow): RunTraceStep {
  const out = (s.output ?? {}) as { kind?: string; code?: string };
  const input = (s.input ?? {}) as { action_id?: unknown; input?: unknown };
  const called = s.actionId === 'call_action' && typeof input.action_id === 'string';
  return {
    idx: s.idx,
    type: 'tool',
    tool: s.actionId ?? '',
    action_id: called ? (input.action_id as string) : (s.actionId ?? ''),
    input: traceInput(called ? input.input : s.input),
    ...(out.kind ? { outcome: out.kind } : {}),
    ...(out.code ? { error_code: out.code } : {}),
    status: s.status,
    tokens_in: 0,
    tokens_out: 0,
  };
}

export async function runTrace(db: Pick<TenantDb, 'aiRun' | 'aiRunStep'>, userId: string, runId: string): Promise<RunTrace> {
  const run = UUID.test(runId) ? await db.aiRun.findUnique({ where: { id: runId }, select: { id: true, kind: true, status: true, input: true, initiatedByUserId: true, creditsUsed: true } }) : null;
  if (!run || run.kind !== 'assistant' || run.initiatedByUserId !== userId) throw new AppError('NOT_FOUND', 404, { run_id: 'not_found' });
  const rows = await db.aiRunStep.findMany({
    where: { runId: run.id },
    orderBy: { idx: 'asc' },
    take: MAX_STEPS_READ,
    select: { idx: true, type: true, actionId: true, input: true, output: true, status: true, provider: true, model: true, tokensIn: true, tokensOut: true },
  });
  const locale = (run.input as unknown as AssistantRunInput | null)?.locale ?? 'vi';
  const p = prompt('assistant', locale);
  return {
    run_id: run.id,
    status: run.status,
    // Băm prompt (không điền biến) — báo cáo so được hai lượt chạy cùng prompt hay không, không lộ nội dung.
    prompt: { name: p.name, version: p.version, locale: p.locale, hash: createHash('sha256').update(p.text).digest('hex').slice(0, 12) },
    credits: run.creditsUsed,
    steps: rows.map((s) =>
      s.type === 'tool'
        ? toolStep(s)
        : { idx: s.idx, type: 'llm' as const, status: s.status, ...(s.provider ? { provider: s.provider } : {}), ...(s.model ? { model: s.model } : {}), tokens_in: s.tokensIn, tokens_out: s.tokensOut },
    ),
  };
}
