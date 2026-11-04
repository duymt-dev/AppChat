// contact.remember · contact.memory_forget (TIP-015b). Quyền: crm.edit + khách sửa được (watcher → 403, ngoài scope → 404). Agent trực kênh
// chỉ được nhớ về KHÁCH CỦA HỘI THOẠI ĐANG PHỤC VỤ (ngoài → 403, không đọc fact). Nguồn (run / bước / người ghi) lấy từ ActionContext — input
// không có ô nguồn. Mọi ghi khoá dòng contact trước, tăng `contact_revision` + outbox `contact.memory_changed` cùng transaction.
import { Inject, Injectable } from '@nestjs/common';
import { AppError } from '@appchat/shared';
import type { ActionInput, ActionPreview, contactMemoryForget, contactRemember } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import { writeOutbox } from '../../kernel/outbox/outbox';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type ActionLogRow, type HandlerOutcome } from '../../kernel/actions/handler';
import { created, line, preview, removed } from '../../kernel/actions/preview-kit';
import { UUID, actorUserId, editableContact } from '../services/access';
import { MEMORY_CAP, checkFact, evictionOrder } from './normalize';
import { allOf, lockContact, restoreRows, similarOf, snap, unsnap, writeFact, type MemorySnap } from './repository';
import { bump, memoryChanged } from './revision';

type RememberIn = ActionInput<typeof contactRemember>;
type ForgetIn = ActionInput<typeof contactMemoryForget>;
type RememberOut = { memory_id: string; status: 'created' | 'refreshed'; evicted_id: string | null };

/** Khách được ghi nhớ: agent trực kênh → đúng khách của hội thoại đang phục vụ; còn lại → khách sửa được theo scope. */
async function writable(ctx: ActionContext, tx: TenantTx, contactId: string) {
  if (!UUID.test(contactId)) throw new AppError('NOT_FOUND', 404, { contact_id: 'not_found' });
  if (ctx.source === 'agent' && !ctx.onBehalfOfUserId) {
    const conv = ctx.servedConversationId ? await tx.conversation.findUnique({ where: { id: ctx.servedConversationId }, select: { contactId: true } }) : null;
    if (!conv?.contactId || conv.contactId !== contactId) throw new AppError('FORBIDDEN', 403, { contact_id: 'not_served_conversation' });
  }
  return (await editableContact(tx, ctx.authz, contactId)).contact;
}

const provenance = (ctx: ActionContext) => ({
  runId: ctx.runId && UUID.test(ctx.runId) ? ctx.runId : null,
  stepId: ctx.stepId && UUID.test(ctx.stepId) ? ctx.stepId : null,
  actorType: ctx.actor.type,
  actorId: ctx.actor.type === 'user' ? actorUserId(ctx) : ctx.actor.id,
});

@Injectable()
@ActionHandler('contact.remember')
export class ContactRememberHandler implements Handler<RememberIn, RememberOut> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(ctx: ActionContext, input: RememberIn, tx: TenantTx): Promise<HandlerOutcome<RememberOut>> {
    const f = checkFact(input.fact, input.confidence);
    const c = await writable(ctx, tx, input.contact_id);
    await lockContact(tx, c.id);
    const now = this.clock.now();
    const w = await writeFact(tx, c.id, f, provenance(ctx), now);
    const rev = await bump(tx, c.id, 'memory', now);
    return {
      result: { memory_id: w.row.id, status: w.status, evicted_id: w.evicted?.id ?? null },
      after: { memory_id: w.row.id, status: w.status, ...(w.evicted ? { evicted: snap(w.evicted) } : {}) },
      events: [memoryChanged(c.id, rev)],
    };
  }

  async preview(ctx: ActionContext, input: RememberIn, tx: TenantTx): Promise<ActionPreview> {
    const f = checkFact(input.fact, input.confidence);
    const c = await writable(ctx, tx, input.contact_id);
    const dup = await similarOf(tx, c.id, f.norm);
    if (dup) return preview('write', line(c.name, f.fact), { changes: [], warnings: ['existing'] });
    const all = await allOf(tx, c.id);
    const out = all.length >= MEMORY_CAP ? evictionOrder(all)[0] : undefined;
    return preview('write', line(c.name, f.fact), {
      changes: [created('contact_memory', { contact: c.code, fact: f.fact, confidence: f.confidence }), ...(out ? [removed('contact_memory', out.id, { fact: out.fact })] : [])],
      ...(out ? { warnings: [`cap:${MEMORY_CAP}`] } : {}),
    });
  }
}

/** Fact + khách của nó; id lạ / khách ngoài quyền → 404 (không lộ fact). */
async function factOf(ctx: ActionContext, tx: TenantTx, memoryId: string) {
  const m = UUID.test(memoryId) ? await tx.contactMemory.findUnique({ where: { id: memoryId } }) : null;
  if (!m) throw new AppError('NOT_FOUND', 404, { memory_id: 'not_found' });
  const c = await writable(ctx, tx, m.contactId).catch((e: AppError) => {
    throw e.httpStatus === 403 ? e : new AppError('NOT_FOUND', 404, { memory_id: 'not_found' });
  });
  return { m, c };
}

@Injectable()
@ActionHandler('contact.memory_forget')
export class ContactMemoryForgetHandler implements Handler<ForgetIn, { memory_id: string; contact_id: string }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(ctx: ActionContext, input: ForgetIn, tx: TenantTx): Promise<HandlerOutcome<{ memory_id: string; contact_id: string }>> {
    const { m, c } = await factOf(ctx, tx, input.memory_id);
    await lockContact(tx, c.id);
    const row = await tx.contactMemory.findUnique({ where: { id: m.id } });
    if (!row) throw new AppError('NOT_FOUND', 404, { memory_id: 'not_found' });
    await tx.contactMemory.delete({ where: { id: row.id } });
    const now = this.clock.now();
    const rev = await bump(tx, c.id, 'memory', now);
    return { result: { memory_id: row.id, contact_id: c.id }, before: { row: snap(row) }, events: [memoryChanged(c.id, rev)] };
  }

  async preview(ctx: ActionContext, input: ForgetIn, tx: TenantTx): Promise<ActionPreview> {
    const { m, c } = await factOf(ctx, tx, input.memory_id);
    return preview('delete', line(c.name, m.fact), { changes: [removed('contact_memory', m.id, { fact: m.fact })] });
  }

  /**
   * Khôi phục fact đã xoá — kiểm lại scope hiện tại; khách đã đủ 50 fact hoặc đã có fact trùng (ghi lại sau khi xoá) → 409 STALE_VERSION,
   * không tự bỏ fact khác / không tạo dòng thứ 51.
   */
  async undo(ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    const row = unsnap((log.before as { row: MemorySnap }).row);
    await writable(ctx, tx, row.contactId);
    await lockContact(tx, row.contactId);
    if (await tx.contactMemory.findUnique({ where: { id: row.id } })) return;
    const all = await allOf(tx, row.contactId);
    if (all.length >= MEMORY_CAP || (await similarOf(tx, row.contactId, row.factNorm))) throw new AppError('STALE_VERSION', 409, { memory: all.length >= MEMORY_CAP ? 'cap_full' : 'replaced' });
    await restoreRows(tx, [row]);
    const now = this.clock.now();
    const rev = await bump(tx, row.contactId, 'memory', now);
    // Executor không ghi event cho undo — phát gợi ý làm mới ở đây.
    await writeOutbox(tx, ctx.workspaceId, [memoryChanged(row.contactId, rev)], now);
  }
}
