// follow_up.complete + follow_up.reconcile (TIP-038 pha 2, DC-241).
//   complete — `crm.edit` + khách GHI được (watcher không complete), khoá dòng việc rồi CAS theo version: việc đã xong → trả lại kết quả cũ
//              (bấm lại / retry không trừ "còn lại" hai lần); việc đã bị thay (khách có tương tác mới) → 409 STALE_VERSION. Undo 24h chỉ khi
//              việc còn đúng phiên bản đã đóng và nguồn chưa đổi — không hồi sinh việc cũ. Outbox `follow_up.completed` / `follow_up.undone`.
//   reconcile — system-only (`system:follow-up`, job ROLE=jobs): thay việc cũ + sinh việc tới hạn, một lô bounded.
import { Inject, Injectable } from '@nestjs/common';
import type { ActionInput, ActionPreview, followUpComplete, followUpReconcile } from '@appchat/actions';
import { AppError } from '@appchat/shared';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type ActionLogRow, type HandlerOutcome } from '../../kernel/actions/handler';
import { CLOCK, type Clock } from '../../kernel/clock';
import { writeOutbox } from '../../kernel/outbox/outbox';
import { preview, updated } from '../../kernel/actions/preview-kit';
import { actorUserId, editableContact } from '../../crm/public';
import { seedDue, supersedeStale, visibleFollowUps } from '../services/follow-ups';

export const FOLLOW_UP_ACTOR = 'system:follow-up';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NF = { follow_up_id: 'not_found' };

interface Snapshot { id: string; contact_id: string; version: number; source_at: string }

@Injectable()
@ActionHandler('follow_up.complete')
export class FollowUpCompleteHandler implements Handler<ActionInput<typeof followUpComplete>, { remaining: number }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(ctx: ActionContext, i: ActionInput<typeof followUpComplete>, tx: TenantTx): Promise<HandlerOutcome<{ remaining: number }>> {
    if (!UUID.test(i.follow_up_id)) throw new AppError('NOT_FOUND', 404, NF);
    await tx.$queryRaw`SELECT 1 FROM follow_up WHERE id = ${i.follow_up_id}::uuid FOR UPDATE`;
    const f = await tx.followUp.findUnique({ where: { id: i.follow_up_id } });
    if (!f) throw new AppError('NOT_FOUND', 404, NF);
    // Khách ngoài scope → 404 (không lộ tồn tại); thấy nhưng không ghi được (watcher / scope ghi hẹp) → 403.
    const { contact } = await editableContact(tx, ctx.authz, f.contactId).catch((e: unknown) => {
      if (e instanceof AppError && e.code === 'NOT_FOUND') throw new AppError('NOT_FOUND', 404, NF);
      throw e;
    });
    const remaining = async () => (await visibleFollowUps(tx, ctx.authz, 1)).total;
    if (f.status === 'done') return { result: { remaining: await remaining() } };
    // Khách đã có tương tác mới / won / lost (sweep chưa kịp thay) — việc cũ không còn hiệu lực.
    const stale = contact.stage === 'won' || contact.stage === 'lost' || contact.lastInteractionAt.getTime() !== f.sourceAt.getTime();
    if (f.status === 'superseded' || stale) throw new AppError('STALE_VERSION', 409, { follow_up_id: 'superseded' });
    const now = this.clock.now();
    const r = await tx.followUp.updateMany({
      where: { id: f.id, status: 'pending', version: f.version },
      data: { status: 'done', version: f.version + 1, completedAt: now, completedByUserId: actorUserId(ctx) },
    });
    if (r.count !== 1) throw new AppError('STALE_VERSION', 409, { follow_up_id: 'changed' });
    const after: Snapshot = { id: f.id, contact_id: f.contactId, version: f.version + 1, source_at: f.sourceAt.toISOString() };
    return {
      result: { remaining: await remaining() },
      before: { status: 'pending', version: f.version },
      after,
      events: [{ topic: 'follow_up.completed', payload: { follow_up_id: f.id, contact_id: f.contactId, version: after.version } }],
    };
  }

  /** Thẻ xác nhận (Trợ lý / agent): việc + khách, trạng thái trước / sau — cùng kiểm quyền với execute (không lộ việc ngoài scope). */
  async preview(ctx: ActionContext, i: ActionInput<typeof followUpComplete>, tx: TenantTx): Promise<ActionPreview> {
    const f = UUID.test(i.follow_up_id) ? await tx.followUp.findUnique({ where: { id: i.follow_up_id } }) : null;
    if (!f) throw new AppError('NOT_FOUND', 404, NF);
    const { contact } = await editableContact(tx, ctx.authz, f.contactId).catch((e: unknown) => {
      if (e instanceof AppError && e.code === 'NOT_FOUND') throw new AppError('NOT_FOUND', 404, NF);
      throw e;
    });
    return preview('write', contact.name, { changes: updated('follow_up', f.id, { status: f.status }, { status: 'done' }) });
  }

  async undo(ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    const a = log.after as Snapshot | null;
    if (!a) return; // lần bấm lại việc đã xong — không có thay đổi để hoàn tác.
    await tx.$queryRaw`SELECT 1 FROM follow_up WHERE id = ${a.id}::uuid FOR UPDATE`;
    const f = await tx.followUp.findUnique({ where: { id: a.id } });
    const c = f ? await tx.contact.findUnique({ where: { id: f.contactId }, select: { lastInteractionAt: true, deletedAt: true, stage: true } }) : null;
    // Đúng phiên bản đã đóng + nguồn chưa đổi; khách có tương tác mới / won / lost → việc cũ không quay lại.
    const fresh = f && c && !c.deletedAt && c.stage !== 'won' && c.stage !== 'lost' && c.lastInteractionAt.getTime() === f.sourceAt.getTime();
    if (!f || f.status !== 'done' || f.version !== a.version || !fresh) throw new AppError('STALE_VERSION', 409, { follow_up_id: 'changed' });
    await tx.followUp.update({ where: { id: f.id }, data: { status: 'pending', version: f.version + 1, completedAt: null, completedByUserId: null } });
    await writeOutbox(tx, ctx.workspaceId, [{ topic: 'follow_up.undone', payload: { follow_up_id: f.id, contact_id: f.contactId, version: f.version + 1 } }], this.clock.now());
  }
}

@Injectable()
@ActionHandler('follow_up.reconcile')
export class FollowUpReconcileHandler implements Handler<ActionInput<typeof followUpReconcile>, { created: number; superseded: number }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async preview(ctx: ActionContext): Promise<never> {
    throw new AppError('FORBIDDEN', 403, { source: ctx.source });
  }

  async execute(ctx: ActionContext, _i: ActionInput<typeof followUpReconcile>, tx: TenantTx): Promise<HandlerOutcome<{ created: number; superseded: number }>> {
    if (ctx.source !== 'system' || ctx.actor.type !== 'system' || ctx.actor.id !== FOLLOW_UP_ACTOR) throw new AppError('FORBIDDEN', 403, { source: ctx.source });
    const now = this.clock.now();
    const superseded = await supersedeStale(tx);
    const created = await seedDue(tx, now);
    return { result: { created, superseded } };
  }
}
