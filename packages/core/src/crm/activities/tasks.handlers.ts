// contact_task.create / update / set_state (TIP-026b §1.2, §2). Việc chăm sóc thủ công — không chạy nền, không đặt lịch, không tính credit.
// CAS version (khoá dòng → đối chiếu if_version → đổi đúng một lần); không đổi gì → trả trạng thái hiện tại, không sự kiện trùng. Hoàn
// thành: thời điểm + người do server suy ra khi chuyển SANG done, xoá khi mở lại; done lặp lại không phát sự kiện mới.
import { Inject, Injectable } from '@nestjs/common';
import { AppError, taskMoveAllowed, type AuthzContext } from '@appchat/shared';
import type { ActionInput, contactTaskCreate, contactTaskSetState, contactTaskUpdate } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type ActionLogRow, type HandlerOutcome } from '../../kernel/actions/handler';
import { uuidv7 } from '../../kernel/ids';
import { authorOf, checkAssignee, checkSource, checkVersion, writableParent } from './authority';
import { lockRow } from './repository';
import { activityEvent, activityTimeline, lockForUndo } from './undo';
import { MemberAuthz } from './member-authz';
import { taskCreatePreview, taskStatePreview, taskUpdatePreview } from './previews';

type Out = { task_id: string; version: number };

/** Khoá việc + kiểm khách cha ghi được + version. */
async function lockTask(tx: TenantTx, authz: AuthzContext, id: string, ifVersion?: number) {
  const t = (await lockRow(tx, 'contact_task', id)) ? await tx.contactTask.findUnique({ where: { id } }) : null;
  if (!t) throw new AppError('NOT_FOUND', 404, { task_id: 'not_found' });
  await writableParent(tx, authz, t.contactId);
  checkVersion(t.version, ifVersion);
  return t;
}

@Injectable()
@ActionHandler('contact_task.create')
export class ContactTaskCreateHandler implements Handler<ActionInput<typeof contactTaskCreate>, Out> {
  constructor(
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(MemberAuthz) private readonly members: MemberAuthz,
  ) {}

  async preview(ctx: ActionContext, input: ActionInput<typeof contactTaskCreate>, tx: TenantTx) {
    return taskCreatePreview(tx, ctx.authz, input);
  }

  async execute(ctx: ActionContext, input: ActionInput<typeof contactTaskCreate>, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    await writableParent(tx, ctx.authz, input.contact_id);
    const src = await checkSource(tx, ctx.authz, input.contact_id, input);
    const a = authorOf(ctx);
    // Mặc định giao cho người thật đang ra lệnh (nếu đủ điều kiện); agent kênh không đóng vai người.
    const assignee = input.assignee_user_id !== undefined ? input.assignee_user_id : a.userId;
    if (assignee) await checkAssignee(tx, input.contact_id, assignee, (u) => this.members.of(ctx.workspaceId, u));
    const now = this.clock.now();
    const id = uuidv7(now.getTime());
    await tx.contactTask.create({
      data: { id, contactId: input.contact_id, title: input.title.trim(), description: input.description ?? '', dueAt: input.due_at ? new Date(input.due_at) : null, assigneeUserId: assignee, ...src, createdBy: a.userId, actorType: a.actorType, actorId: a.actorId, createdAt: now, updatedAt: now },
    });
    await activityTimeline(tx, { contactId: input.contact_id, type: 'contact_task', key: 'task_created', ref: { type: 'contact_task', id }, actor: { type: ctx.actor.type, id: a.userId }, at: now });
    return { result: { task_id: id, version: 1 }, after: { id, version: 1 }, events: [activityEvent('contact_task.created', input.contact_id, id, 1)] };
  }

  async undo(ctx: ActionContext, log: ActionLogRow, tx: TenantTx) {
    const a = log.after as { id: string; version: number };
    await lockForUndo(tx, ctx.authz, 'contact_task', a.id, a.version);
    // Việc mới tạo hoàn tác = huỷ (giữ audit), không xoá cứng.
    await tx.contactTask.update({ where: { id: a.id }, data: { state: 'cancelled', completedAt: null, completedBy: null, version: { increment: 1 }, updatedAt: this.clock.now() } });
  }
}

@Injectable()
@ActionHandler('contact_task.update')
export class ContactTaskUpdateHandler implements Handler<ActionInput<typeof contactTaskUpdate>, Out> {
  constructor(
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(MemberAuthz) private readonly members: MemberAuthz,
  ) {}

  async preview(ctx: ActionContext, input: ActionInput<typeof contactTaskUpdate>, tx: TenantTx) {
    return taskUpdatePreview(tx, ctx.authz, input);
  }

  async execute(ctx: ActionContext, input: ActionInput<typeof contactTaskUpdate>, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    const t = await lockTask(tx, ctx.authz, input.task_id, input.if_version);
    const p = input.patch;
    const data: Record<string, unknown> = {};
    if (p.title !== undefined && p.title.trim() !== t.title) data.title = p.title.trim();
    if (p.description !== undefined && p.description !== t.description) data.description = p.description;
    if (p.due_at !== undefined && (p.due_at ? new Date(p.due_at).getTime() : null) !== (t.dueAt?.getTime() ?? null)) data.dueAt = p.due_at ? new Date(p.due_at) : null;
    if (p.assignee_user_id !== undefined && p.assignee_user_id !== t.assigneeUserId) {
      if (p.assignee_user_id) await checkAssignee(tx, t.contactId, p.assignee_user_id, (u) => this.members.of(ctx.workspaceId, u));
      data.assigneeUserId = p.assignee_user_id;
    }
    if (!Object.keys(data).length) return { result: { task_id: t.id, version: t.version } };
    const now = this.clock.now();
    const before = { id: t.id, version: t.version + 1, title: t.title, description: t.description, dueAt: t.dueAt?.toISOString() ?? null, assigneeUserId: t.assigneeUserId };
    await tx.contactTask.update({ where: { id: t.id }, data: { ...data, version: { increment: 1 }, updatedAt: now } });
    await activityTimeline(tx, { contactId: t.contactId, type: 'contact_task', key: 'task_updated', ref: { type: 'contact_task', id: t.id }, actor: { type: ctx.actor.type, id: authorOf(ctx).userId }, at: now });
    return { result: { task_id: t.id, version: t.version + 1 }, before, after: { id: t.id, version: t.version + 1 }, events: [activityEvent('contact_task.updated', t.contactId, t.id, t.version + 1)] };
  }

  async undo(ctx: ActionContext, log: ActionLogRow, tx: TenantTx) {
    const b = log.before as { id: string; version: number; title: string; description: string; dueAt: string | null; assigneeUserId: string | null };
    await lockForUndo(tx, ctx.authz, 'contact_task', b.id, b.version);
    await tx.contactTask.update({ where: { id: b.id }, data: { title: b.title, description: b.description, dueAt: b.dueAt ? new Date(b.dueAt) : null, assigneeUserId: b.assigneeUserId, version: { increment: 1 }, updatedAt: this.clock.now() } });
  }
}

@Injectable()
@ActionHandler('contact_task.set_state')
export class ContactTaskSetStateHandler implements Handler<ActionInput<typeof contactTaskSetState>, Out & { state: 'open' | 'done' | 'cancelled' }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async preview(ctx: ActionContext, input: ActionInput<typeof contactTaskSetState>, tx: TenantTx) {
    return taskStatePreview(tx, ctx.authz, input);
  }

  async execute(ctx: ActionContext, input: ActionInput<typeof contactTaskSetState>, tx: TenantTx) {
    const t = await lockTask(tx, ctx.authz, input.task_id, input.if_version);
    if (t.state === input.state) return { result: { task_id: t.id, state: t.state, version: t.version } };
    if (!taskMoveAllowed(t.state, input.state)) throw new AppError('VALIDATION_FAILED', 422, { state: 'transition' });
    const now = this.clock.now();
    const done = input.state === 'done';
    const before = { id: t.id, version: t.version + 1, state: t.state, completedAt: t.completedAt?.toISOString() ?? null, completedBy: t.completedBy };
    await tx.contactTask.update({ where: { id: t.id }, data: { state: input.state, completedAt: done ? now : null, completedBy: done ? authorOf(ctx).userId : null, version: { increment: 1 }, updatedAt: now } });
    await activityTimeline(tx, { contactId: t.contactId, type: 'contact_task', key: 'task_state_changed', ref: { type: 'contact_task', id: t.id }, actor: { type: ctx.actor.type, id: authorOf(ctx).userId }, at: now, state: input.state });
    return {
      result: { task_id: t.id, state: input.state, version: t.version + 1 },
      before,
      after: { id: t.id, version: t.version + 1 },
      events: [activityEvent('contact_task.state_changed', t.contactId, t.id, t.version + 1)],
    };
  }

  async undo(ctx: ActionContext, log: ActionLogRow, tx: TenantTx) {
    const b = log.before as { id: string; version: number; state: 'open' | 'done' | 'cancelled'; completedAt: string | null; completedBy: string | null };
    await lockForUndo(tx, ctx.authz, 'contact_task', b.id, b.version);
    await tx.contactTask.update({ where: { id: b.id }, data: { state: b.state, completedAt: b.completedAt ? new Date(b.completedAt) : null, completedBy: b.completedBy, version: { increment: 1 }, updatedAt: this.clock.now() } });
  }
}
