// Chạy một suite qua HTTP thật (TIP-023b R1.4 · SPEC E): mỗi ca một phiên Trợ lý mới → `POST /assistant/messages` → vết run
// (`GET /assistant/runs/:id/trace`) → chấm (safety.ts). Thẻ xác nhận luôn được HUỶ — bộ câu thử không ghi dữ liệu thật, chỉ đo model gọi
// đúng action / input và dừng ở thẻ. Lỗi mạng / 5xx không bao giờ tính pass: attempt ghi `error`, thử lại giữ attempt riêng.
import type { LiveCase, Suite } from './cases';
import { judge, expand, type TraceStep, type Verdict } from './safety';
import { judgeDraft, judgeUi } from './genui-judge';
import { contractCase } from './contract-judge';
import { memoryCase } from './memory-judge';
import { loyaltyCase } from './loyalty-judge';
import { insightsCase } from './insights-judge';
import { hardeningCase } from './hardening-judge';
import { channelCase } from './channel-judge';
import { marketingCase } from './marketing-judge';
import { transferCase } from './transfer-judge';
import { activityCase } from './activity-judge';
import { runtimeCase } from './runtime-judge';

export interface Api {
  req(method: string, path: string, body?: unknown, headers?: Record<string, string>): Promise<{ status: number; body: unknown }>;
}

export interface Attempt {
  case_id: string;
  attempt: number;
  status: 'pass' | 'fail' | 'error';
  expected: LiveCase['expect'];
  actual?: Verdict['actual'];
  safety?: Verdict['safety'] & { secret_prefill?: boolean; injected_action_ui?: boolean; draft_not_text_only?: boolean };
  reasons: string[];
  run_id?: string;
  model?: string;
  prompt_hash?: string;
  prompt_version?: number;
  tokens: { in: number; out: number };
  credits?: number;
}

export interface RunOptions {
  /** Số lần chạy mỗi ca (eval.md §4: 3, đạt khi ≥ 2/3); mặc định 1. */
  attempts: number;
  seed: unknown;
  writes: ReadonlySet<string>;
  allowed: ReadonlySet<string>;
  log?: (line: string) => void;
}

type Turn = { session_id: string; run_id: string; events: { type: string; action_id?: string; confirm_token?: string; text?: string; code?: string }[] };
/** Lỗi phía provider / hạ tầng trong lượt (stream đứt, hết credit, timeout) — không phải model chọn sai, ghi `error` riêng. */
const INFRA = new Set(['LLM_ERROR', 'LLM_TIMEOUT', 'CREDIT_EXHAUSTED', 'PROVIDER_UNAVAILABLE']);
type Trace = { run_id: string; prompt: { version: number; hash: string }; credits: number; steps: TraceStep[] };

const data = <T>(b: unknown) => (b as { data: T }).data;

/** Chỗ trống trong câu hỏi (mã chỉ biết sau seed): `$QUOTE` = mã báo giá seed, `$HOA_CODE` = mã KH Nguyễn Thị Hoa, `$LY_INVOICE` = mã
 *  đề nghị thanh toán của suite loyalty, `$HD_ORDER` = mã đơn mang trường bị thu hồi của suite hardening. */
export function fillInput(text: string, seed: unknown): string {
  const s = (seed ?? {}) as { quote?: { code?: string }; contacts?: Record<string, { code?: string }>; loyalty?: { invoice?: { code?: string } }; hardening?: { order?: { code?: string } } };
  return text
    .replaceAll('$QUOTE', s.quote?.code ?? '$QUOTE')
    .replaceAll('$HOA_CODE', s.contacts?.['Nguyễn Thị Hoa']?.code ?? '$HOA_CODE')
    .replaceAll('$LY_INVOICE', s.loyalty?.invoice?.code ?? '$LY_INVOICE')
    .replaceAll('$HD_ORDER', s.hardening?.order?.code ?? '$HD_ORDER');
}

/** Ngữ cảnh màn của ca (id `$seed.<…>` → id thật). */
const contextOf = (c: LiveCase, seed: unknown) =>
  c.context ? { route: c.context.route, surface: c.context.surface, ...(c.context.entity ? { entity: c.context.entity } : {}), ...(c.context.id ? { id: String(expand(c.context.id, seed)) } : {}) } : undefined;

/** Ca nháp Hộp thư (REQ-C05c): một request purpose, không phiên Trợ lý; chấm chữ đề xuất, phản hồi không có event / cây. */
async function draftCase(api: Api, c: LiveCase, attempt: number, o: RunOptions): Promise<Attempt> {
  const base = { case_id: c.id, attempt, expected: c.expect, tokens: { in: 0, out: 0 } };
  const d = c.draft!;
  const r = await api.req('POST', '/assistant/messages', { purpose: d.purpose, conversation_id: String(expand(d.conversation, o.seed)), base_version: 0, draft: fillInput(c.input, o.seed) });
  if (r.status !== 200) return { ...base, status: 'error', reasons: [`draft_http_${r.status}`] };
  const out = data<{ proposed_text: string; run_id: string; credits_used: number }>(r.body);
  // Run consult không có tool (cổng chỉ-đề-xuất, đã kiểm ở inbox-assistant-draft test) — chấm hình dạng phản hồi + chữ.
  const v = judgeDraft(r.body && typeof r.body === 'object' ? (r.body as { data: unknown }).data : null, []);
  return {
    ...base,
    status: v.reasons.length ? 'fail' : 'pass',
    safety: { unconfirmed_write: false, secret_leak: false, forbidden_success: false, draft_not_text_only: v.unsafe },
    reasons: v.reasons,
    run_id: out.run_id,
    credits: out.credits_used,
  };
}

async function one(api: Api, c: LiveCase, attempt: number, o: RunOptions): Promise<Attempt> {
  if (c.draft) return draftCase(api, c, attempt, o);
  if (c.contract) return contractCase(api, c, attempt, o);
  if (c.memory) return memoryCase(api, c, attempt, o, (s) => fillInput(s, o.seed));
  if (c.loyalty) return loyaltyCase(api, c, attempt, o, (s) => fillInput(s, o.seed));
  if (c.channel) return channelCase(api, c, attempt, o, (s) => fillInput(s, o.seed));
  if (c.insights) return insightsCase(api, c, attempt, o, (s) => fillInput(s, o.seed));
  if (c.marketing) return marketingCase(api, c, attempt, o, (s) => fillInput(s, o.seed));
  if (c.runtime) return runtimeCase(api, c, attempt, o, (s) => fillInput(s, o.seed));
  if (c.activity) return activityCase(api, c, attempt, o, (s) => fillInput(s, o.seed));
  if (c.transfer) return transferCase(api, c, attempt, o, (s) => fillInput(s, o.seed));
  if (c.hardening) return hardeningCase(api, c, attempt, o, (s) => fillInput(s, o.seed), contextOf(c, o.seed));
  const base = { case_id: c.id, attempt, expected: c.expect, tokens: { in: 0, out: 0 } };
  const context = contextOf(c, o.seed);
  const t = await api.req('POST', '/assistant/messages', { text: fillInput(c.input, o.seed), mode: c.mode, ...(context ? { context } : {}) });
  if (t.status !== 200) return { ...base, status: 'error', reasons: [`turn_http_${t.status}`] };
  const turn = data<Turn>(t.body);
  const tr = await api.req('GET', `/assistant/runs/${turn.run_id}/trace`);
  if (tr.status !== 200) return { ...base, status: 'error', reasons: [`trace_http_${tr.status}`], run_id: turn.run_id };
  const trace = data<Trace>(tr.body);
  const infra = turn.events.find((e) => e.type === 'error' && e.code && INFRA.has(e.code));
  if (infra) return { ...base, status: 'error', reasons: [`infra:${infra.code}`], run_id: turn.run_id };
  // Không xác nhận gì: huỷ mọi thẻ còn treo để run kết thúc sạch.
  for (const e of turn.events) if (e.type === 'confirm' && e.confirm_token) await api.req('POST', '/assistant/confirm', { confirm_token: e.confirm_token, decision: 'cancel' });
  const v = judge(c, { steps: trace.steps, events: turn.events, writes: o.writes, allowed: o.allowed }, o.seed);
  const u = c.expect.ui ? judgeUi(turn.events, c.expect.ui) : judgeUi(turn.events, undefined);
  const reasons = [...v.reasons, ...u.reasons];
  const llm = trace.steps.filter((s) => s.type === 'llm');
  const model = llm.find((s) => s.model)?.model;
  return {
    ...base,
    status: reasons.length ? 'fail' : 'pass',
    actual: v.actual,
    safety: { ...v.safety, ...u.safety },
    reasons,
    run_id: trace.run_id,
    ...(model ? { model } : {}),
    prompt_hash: trace.prompt.hash,
    prompt_version: trace.prompt.version,
    tokens: { in: llm.reduce((n, s) => n + s.tokens_in, 0), out: llm.reduce((n, s) => n + s.tokens_out, 0) },
    credits: trace.credits,
  };
}

export async function runSuite(api: Api, suite: Suite, o: RunOptions): Promise<Attempt[]> {
  const out: Attempt[] = [];
  for (const c of suite.cases) {
    for (let a = 1; a <= o.attempts; a++) {
      let r: Attempt;
      try {
        r = await one(api, c, a, o);
      } catch (e) {
        r = { case_id: c.id, attempt: a, status: 'error', expected: c.expect, reasons: [`network:${(e as Error).message.slice(0, 120)}`], tokens: { in: 0, out: 0 } };
      }
      out.push(r);
      o.log?.(`${r.status === 'pass' ? '✓' : r.status === 'fail' ? '✗' : '!'} ${c.id}#${a} ${r.reasons.join(' ')}`);
    }
  }
  return out;
}
