// Action hàng chờ học từ hội thoại (TIP-043, Blueprint §3.4 `kb.suggestion.*`, rag §9). `propose` system-only (actor `system:kb-suggest`,
// job đề xuất gọi qua Executor): ghi pending đã che PII + `kb.suggestion_created` (chỉ id) cùng transaction; fingerprint trùng → bỏ qua.
// `approve` / `reject` (kb.manage, không agentGrantable): khoá dòng + CAS version; approve che lại + kiểm còn PII trên nội dung người sửa,
// tạo đúng một nguồn origin conversation (source-publisher) + `kb.suggestion_approved` (consumer đẩy `kb-ingest`), đẩy ingest sau commit.
import { Inject, Injectable, Optional } from '@nestjs/common';
import { AppError } from '@appchat/shared';
import type { ActionInput, ActionPreview, kbSuggestionApprove, kbSuggestionPropose, kbSuggestionReject } from '@appchat/actions';
import { CLOCK, type Clock } from '../../../kernel/clock';
import { uuidv7 } from '../../../kernel/ids';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../../kernel/actions/handler';
import { created, line, preview, updated } from '../../../kernel/actions/preview-kit';
import { KbIngestQueue } from '../kb.queue';
import { folderVisibility, resolveVisibility } from '../source-policy';
import { lockPending, piiContext } from './suggestion.repo';
import { fingerprintOf, reviewText } from './suggestion.rules';
import { publishSource } from './source-publisher';

export const KB_SUGGEST_ACTOR = 'kb-suggest';
type ProposeIn = ActionInput<typeof kbSuggestionPropose>;
type ApproveIn = ActionInput<typeof kbSuggestionApprove>;
type RejectIn = ActionInput<typeof kbSuggestionReject>;
type ProposeOut = { created: string[]; duplicates: number; skipped: string | null };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const reviewer = (ctx: ActionContext) => ctx.onBehalfOfUserId ?? (ctx.actor.type === 'user' ? ctx.actor.id : null);

function systemGuard(ctx: ActionContext) {
  if (ctx.source !== 'system' || ctx.actor.type !== 'system' || ctx.actor.id !== KB_SUGGEST_ACTOR) throw new AppError('FORBIDDEN', 403, { source: ctx.source });
}

/** Hội thoại phải còn đóng tại lúc ghi (mở lại trong lúc model chạy → bỏ, không đề xuất). */
async function stillClosed(tx: TenantTx, id: string) {
  const c = await tx.conversation.findUnique({ where: { id }, select: { status: true } });
  return c?.status === 'closed';
}

@Injectable()
@ActionHandler('kb.suggestion.propose')
export class KbSuggestionProposeHandler implements Handler<ProposeIn, ProposeOut> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(ctx: ActionContext, i: ProposeIn, tx: TenantTx): Promise<HandlerOutcome<ProposeOut>> {
    systemGuard(ctx);
    if (!(await stillClosed(tx, i.conversation_id))) return { result: { created: [], duplicates: 0, skipped: 'not_closed' } };
    const pii = await piiContext(tx, i.conversation_id);
    const now = this.clock.now();
    const ids: string[] = [];
    let duplicates = 0;
    for (const p of i.pairs) {
      // Lớp chặn cuối ở server: nội dung phải sạch (job đã che + kiểm) — còn dấu vết thì bỏ cặp, không ghi.
      const t = reviewText(p.question, p.answer, pii);
      if ('field' in t) continue;
      const fingerprint = fingerprintOf(i.conversation_id, { ...p, ...t });
      const r = await tx.kbSuggestion.createMany({
        data: [{ id: uuidv7(), conversationId: i.conversation_id, question: t.question, answer: t.answer, sourceMessageIds: [...new Set(p.source_message_ids)], fingerprint, cutoffMessageId: i.cutoff_message_id, runId: i.run_id, createdAt: now }],
        skipDuplicates: true,
      });
      if (!r.count) {
        duplicates++;
        continue;
      }
      ids.push((await tx.kbSuggestion.findUniqueOrThrow({ where: { fingerprint }, select: { id: true } })).id);
    }
    const result = { created: ids, duplicates, skipped: null };
    return { result, after: { created: ids.length }, ...(ids.length ? { events: [{ topic: 'kb.suggestion_created', payload: { suggestion_ids: ids, conversation_id: i.conversation_id } }] } : {}) };
  }

  async preview(ctx: ActionContext): Promise<never> {
    systemGuard(ctx);
    throw new AppError('FORBIDDEN', 403, { source: ctx.source });
  }
}

/** Nội dung sẽ xuất bản (input sửa > bản đề xuất) đã kiểm PII + độ dài; lỗi → 422 theo field. */
async function finalText(tx: TenantTx, s: { conversationId: string; question: string; answer: string }, i: ApproveIn) {
  const t = reviewText(i.question ?? s.question, i.answer ?? s.answer, await piiContext(tx, s.conversationId));
  if ('field' in t) throw new AppError('VALIDATION_FAILED', 422, { [t.field]: t.code });
  return { ...t, edited: t.question !== s.question || t.answer !== s.answer };
}

const folderOf = (v: string | undefined) => {
  if (v && !UUID.test(v)) throw new AppError('NOT_FOUND', 404, { folder_id: 'not_found' });
  return v ?? null;
};

@Injectable()
@ActionHandler('kb.suggestion.approve')
export class KbSuggestionApproveHandler implements Handler<ApproveIn, { suggestion_id: string; status: 'approved'; kb_source_id: string }> {
  constructor(
    @Optional() @Inject(KbIngestQueue) private readonly queue: KbIngestQueue | null,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, i: ApproveIn, tx: TenantTx): Promise<HandlerOutcome<{ suggestion_id: string; status: 'approved'; kb_source_id: string }>> {
    const s = await lockPending(tx, i.suggestion_id, i.if_version);
    const t = await finalText(tx, s, i);
    const now = this.clock.now();
    const by = reviewer(ctx);
    const src = await publishSource(tx, { question: t.question, answer: t.answer, folderId: folderOf(i.folder_id), visibility: i.visibility, createdBy: by, now });
    await tx.kbSuggestion.update({
      where: { id: s.id },
      data: { status: 'approved', edited: t.edited, question: t.question, answer: t.answer, reviewedBy: by, reviewedAt: now, kbSourceId: src.id, version: { increment: 1 } },
    });
    const queue = this.queue;
    return {
      result: { suggestion_id: s.id, status: 'approved', kb_source_id: src.id },
      before: { status: 'pending', version: s.version },
      after: { status: 'approved', kb_source_id: src.id, visibility: src.visibility, edited: t.edited },
      events: [{ topic: 'kb.suggestion_approved', payload: { suggestion_id: s.id, source_id: src.id, ingest_seq: src.seq } }],
      ...(queue ? { afterCommit: () => queue.push(ctx.workspaceId, [{ id: src.id, seq: src.seq }]) } : {}),
    };
  }

  async preview(_ctx: ActionContext, i: ApproveIn, tx: TenantTx): Promise<ActionPreview> {
    const s = UUID.test(i.suggestion_id) ? await tx.kbSuggestion.findUnique({ where: { id: i.suggestion_id } }) : null;
    if (!s) throw new AppError('NOT_FOUND', 404, { suggestion_id: 'not_found' });
    if (s.status !== 'pending') throw new AppError('CONFLICT', 409, { suggestion_id: s.status });
    if (s.version !== i.if_version) throw new AppError('STALE_VERSION', 409, { version: String(s.version) });
    const t = await finalText(tx, s, i);
    const folderId = folderOf(i.folder_id);
    const visibility = resolveVisibility(i.visibility, await folderVisibility(tx, folderId));
    return preview('write', line(t.question), {
      changes: [...updated('kb_suggestion', s.id, { question: s.question, answer: s.answer, status: s.status }, { question: t.question, answer: t.answer, status: 'approved' }), created('kb_source', { name: t.question, origin: 'conversation', visibility, ...(folderId ? { folder_id: folderId } : {}) })],
    });
  }
}

@Injectable()
@ActionHandler('kb.suggestion.reject')
export class KbSuggestionRejectHandler implements Handler<RejectIn, { suggestion_id: string; status: 'rejected' }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(ctx: ActionContext, i: RejectIn, tx: TenantTx): Promise<HandlerOutcome<{ suggestion_id: string; status: 'rejected' }>> {
    const s = await lockPending(tx, i.suggestion_id, i.if_version);
    const reason = i.reason?.trim() || null;
    await tx.kbSuggestion.update({ where: { id: s.id }, data: { status: 'rejected', reviewedBy: reviewer(ctx), reviewedAt: this.clock.now(), rejectReason: reason, version: { increment: 1 } } });
    return {
      result: { suggestion_id: s.id, status: 'rejected' },
      before: { status: 'pending', version: s.version },
      after: { status: 'rejected' },
      events: [{ topic: 'kb.suggestion_rejected', payload: { suggestion_id: s.id } }],
    };
  }

  async preview(_ctx: ActionContext, i: RejectIn, tx: TenantTx): Promise<ActionPreview> {
    const s = UUID.test(i.suggestion_id) ? await tx.kbSuggestion.findUnique({ where: { id: i.suggestion_id } }) : null;
    if (!s) throw new AppError('NOT_FOUND', 404, { suggestion_id: 'not_found' });
    if (s.status !== 'pending') throw new AppError('CONFLICT', 409, { suggestion_id: s.status });
    if (s.version !== i.if_version) throw new AppError('STALE_VERSION', 409, { version: String(s.version) });
    return preview('write', line(s.question), { changes: updated('kb_suggestion', s.id, { status: s.status }, { status: 'rejected', ...(i.reason ? { reason: i.reason } : {}) }) });
  }
}
