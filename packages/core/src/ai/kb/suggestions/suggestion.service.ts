// Job đề xuất tri thức từ một hội thoại đã đóng (TIP-043, rag §9) — chạy ở ROLE=ai, ngoài transaction:
// 1. Hội thoại còn `closed` + tin cuối = mốc cutoff (mở lại / có tin mới → bỏ, job mới theo mốc mới sẽ chạy khi đóng lại).
// 2. Lấy ≤ 100 tin văn bản gần mốc (bỏ ghi chú nội bộ / hệ thống / đã xoá / thu hồi / tệp không chữ), che PII (không bảng khôi phục).
//    Tin gửi model mang mã ngắn `[m<số>]` — server đổi lại mã thật trước khi kiểm cặp.
// 3. Gọi model MỘT lần qua AiRunner (run kind `suggestion`, gateway + meter + ngân sách credit, không tool) với prompt `kb-suggestion`.
// 4. Kiểm cặp ở server (mã tin thuộc tập đã gửi, khách xác nhận, không dữ liệu biến động / PII) → `kb.suggestion.propose` qua Executor.
// Model lỗi / hết credit / sai khung → run failed (lý do đã rút gọn), KHÔNG ghi đề xuất nửa vời; retry job dùng lại run đã xong theo mốc.
import { prompt, redactForKnowledge } from '@appchat/ai';
import type { TenantDb } from '@appchat/db';
import type { ActionExecutor } from '../../../kernel/actions/executor';
import type { ActionContext } from '../../../kernel/actions/action-context';
import { runOnce } from '../../agents/agent.runtime';
import type { AiRunner } from '../../runs/runner';
import { KB_SUGGEST_ACTOR } from './suggestion.handlers';
import { piiContext } from './suggestion.repo';
import { MAX_MESSAGES, checkPairs, type InputMessage, type ProposedPair } from './suggestion.rules';

export interface ProposeDeps {
  executor: Pick<ActionExecutor, 'execute'>;
  runner: AiRunner | null;
  now: () => Date;
  locale: (ws: string) => Promise<string>;
}

export type ProposeOutcome =
  | { status: 'proposed'; created: number; duplicates: number; rejected: string[]; run_id: string }
  | { status: 'skipped'; reason: string }
  | { status: 'failed'; reason: string; run_id?: string };

const RUN_TITLE = 'kb.suggestion';
/** Trần credit một lượt đề xuất (một lời gọi model, không tool). */
export const SUGGEST_MAX_CREDITS = 20;
const LABEL = { vi: { contact: 'KHÁCH', user: 'NHÂN VIÊN', agent: 'AGENT' }, en: { contact: 'CUSTOMER', user: 'STAFF', agent: 'AGENT' } } as const;

/** Mã tin ngắn gửi model (`m1`, `m2`… theo thứ tự) — model chép sai UUID dài (ai:live TIP-043, DC-353); server đổi lại mã thật. */
export const msgRef = (i: number) => `m${i + 1}`;

/** Mã model trả → mã tin thật: nhận `m3` / `[m3]` / `m:3` / `[m:3]`; mã lạ giữ nguyên để kiểm cặp loại (`unknown_message`). */
export function resolveRef(raw: string, msgs: readonly InputMessage[]): string {
  const m = /^\[?m:?(\d{1,3})\]?$/i.exec(raw.trim());
  return (m && msgs[Number(m[1]) - 1]?.id) || raw;
}

/** JSON `{pairs:[…]}` trong câu trả lời model; sai khung → null. */
export function parsePairs(text: string): ProposedPair[] | null {
  const a = text.indexOf('{');
  const b = text.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  try {
    const v = JSON.parse(text.slice(a, b + 1)) as { pairs?: unknown };
    if (!Array.isArray(v.pairs)) return null;
    return v.pairs
      .filter((p): p is Record<string, unknown> => !!p && typeof p === 'object')
      .map((p) => ({
        question: typeof p.question === 'string' ? p.question : '',
        answer: typeof p.answer === 'string' ? p.answer : '',
        source_message_ids: Array.isArray(p.source_message_ids) ? p.source_message_ids.filter((x): x is string => typeof x === 'string') : [],
      }));
  } catch {
    return null;
  }
}

async function transcript(db: TenantDb, conversationId: string, cutoffId: string) {
  const cut = await db.message.findUnique({ where: { id: cutoffId }, select: { createdAt: true, conversationId: true } });
  if (!cut || cut.conversationId !== conversationId) return null;
  const rows = await db.message.findMany({
    where: { conversationId, createdAt: { lte: cut.createdAt }, deletedAt: null, recalledAt: null, senderType: { in: ['contact', 'user', 'agent'] }, kind: { in: ['text', 'card'] }, body: { not: '' } },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: MAX_MESSAGES,
    select: { id: true, senderType: true, body: true },
  });
  return rows.reverse().map((m): InputMessage => ({ id: m.id, sender: m.senderType as InputMessage['sender'], body: m.body }));
}

const sysCtx = (ws: string, key: string): ActionContext => ({ workspaceId: ws, source: 'system', actor: { type: 'system', id: KB_SUGGEST_ACTOR }, authz: { isOwner: true } as never, idempotencyKey: key });

export async function proposeFromConversation(d: ProposeDeps, db: TenantDb, ws: string, conversationId: string, cutoffId: string): Promise<ProposeOutcome> {
  const c = await db.conversation.findUnique({ where: { id: conversationId }, select: { status: true } });
  if (c?.status !== 'closed') return { status: 'skipped', reason: 'not_closed' };
  const last = await db.message.findFirst({ where: { conversationId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], select: { id: true } });
  if (last?.id !== cutoffId) return { status: 'skipped', reason: 'stale_cutoff' };
  if (await db.kbSuggestion.findFirst({ where: { conversationId, cutoffMessageId: cutoffId }, select: { id: true } })) return { status: 'skipped', reason: 'already_proposed' };
  // Đã có run xong cho mốc này (job chạy lại sau khi ghi run nhưng trước propose) → không gọi model lần hai.
  const done = await db.aiRun.findFirst({ where: { kind: 'suggestion', title: RUN_TITLE, conversationId, input: { path: ['cutoff'], equals: cutoffId }, status: { in: ['completed', 'failed'] } }, orderBy: { startedAt: 'desc' } });
  const msgs = await transcript(db, conversationId, cutoffId);
  if (!msgs?.some((m) => m.sender === 'contact') || !msgs.some((m) => m.sender !== 'contact')) return { status: 'skipped', reason: 'no_exchange' };
  const locale = (await d.locale(ws)) === 'en' ? 'en' : 'vi';
  const pii = { ...(await piiContext(db, conversationId)), locale };
  const lines = msgs.map((m, i) => `[${msgRef(i)}] ${LABEL[locale][m.sender]}: ${redactForKnowledge(m.body, pii).replace(/\s+/g, ' ').slice(0, 1000)}`);
  let runId = done?.id;
  let text = done?.status === 'completed' ? (((done.output ?? {}) as { text?: string }).text ?? '') : null;
  if (done?.status === 'failed') return { status: 'failed', reason: (done.error ?? 'model_failed').slice(0, 120), run_id: done.id };
  if (text === null) {
    if (!d.runner) return { status: 'failed', reason: 'no_model' };
    const r = await runOnce(db, d.runner, d.now, ws, {
      run: { kind: 'suggestion', title: RUN_TITLE, tier: 'standard', conversationId, input: { cutoff: cutoffId, messages: msgs.length } },
      system: prompt('kb-suggestion', locale).text,
      prompt: `${locale === 'en' ? 'CONVERSATION' : 'HỘI THOẠI'}:\n${lines.join('\n')}`,
      source: 'kb_suggestion',
      maxCredits: SUGGEST_MAX_CREDITS,
    });
    runId = r.runId;
    if (r.status !== 'completed') return { status: 'failed', reason: (r.error?.code ?? r.status).slice(0, 120), run_id: r.runId };
    text = r.text;
  }
  const pairs = parsePairs(text)?.map((p) => ({ ...p, source_message_ids: p.source_message_ids.map((r) => resolveRef(r, msgs)) }));
  if (!pairs) return { status: 'failed', reason: 'bad_output', ...(runId ? { run_id: runId } : {}) };
  const checked = checkPairs(conversationId, pairs, msgs, pii);
  const out = await d.executor.execute(sysCtx(ws, `kb-suggest:${conversationId}:${cutoffId}`), 'kb.suggestion.propose', {
    conversation_id: conversationId,
    cutoff_message_id: cutoffId,
    run_id: runId ?? null,
    pairs: checked.pairs.map(({ question, answer, source_message_ids }) => ({ question, answer, source_message_ids })),
  });
  const res = (out.data as { result?: { created: string[]; duplicates: number; skipped: string | null } }).result;
  if (res?.skipped) return { status: 'skipped', reason: res.skipped };
  return { status: 'proposed', created: res?.created.length ?? 0, duplicates: res?.duplicates ?? 0, rejected: checked.rejected, run_id: runId! };
}
