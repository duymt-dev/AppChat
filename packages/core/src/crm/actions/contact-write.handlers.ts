// contact.create · update · set_stage · tag · delete (Blueprint §3.4 crm; D32 scope; undo theo khai báo action).
// Ghi trong transaction của executor; timeline + outbox cùng transaction.
import { Inject, Injectable } from '@nestjs/common';
import { AppError, mergeCustomValues, type CustomValues } from '@appchat/shared';
import type { ActionInput, contactCreate, contactDelete, contactSetStage, contactTag, contactUpdate } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type ActionLogRow, type HandlerOutcome } from '../../kernel/actions/handler';
import { uuidv7 } from '../../kernel/ids';
import { actorUserId, editableContact } from '../services/access';
import { assertNoDuplicate, checkCustom, columnsOf, createContact, fieldRole } from '../services/contacts.service';
import { CrmMembers } from '../services/members.service';
import { writeTimeline } from '../services/timeline.service';

const actor = (ctx: ActionContext) => ({ type: ctx.actor.type, id: actorUserId(ctx) });

/** Ảnh chụp cột có thể sửa (undo của update). */
const SNAP = ['name', 'title', 'kind', 'group', 'phone', 'phoneNorm', 'email', 'zalo', 'city', 'district', 'source', 'status', 'ownerUserId', 'custom'] as const;
const snapshot = (c: Record<string, unknown>) => Object.fromEntries(SNAP.map((k) => [k, c[k] ?? null]));

/** Ghi lại khách đã xoá mềm / phục hồi — trùng SĐT với khách tạo sau → 409 (index partial `contact_phone_norm_key`). */
async function restoreOr409(fn: () => Promise<unknown>) {
  try {
    await fn();
  } catch (e) {
    if ((e as { code?: string }).code === 'P2002') throw new AppError('CONFLICT', 409, { phone: 'duplicate' });
    throw e;
  }
}

@Injectable()
@ActionHandler('contact.create')
export class ContactCreateHandler implements Handler<ActionInput<typeof contactCreate>, { contact_id: string; code: string }> {
  constructor(
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof contactCreate>, tx: TenantTx): Promise<HandlerOutcome<{ contact_id: string; code: string }>> {
    const now = this.clock.now();
    const me = actorUserId(ctx);
    const c = await createContact(tx, input, { workspaceId: ctx.workspaceId, authz: ctx.authz, roleKey: await this.members.roleOf(ctx.workspaceId, me), actorUserId: me, now, members: this.members });
    await writeTimeline(tx, { contactId: c.id, type: 'stage', key: 'created', params: { source: c.source }, actor: actor(ctx), at: now });
    if (input.note?.trim()) await tx.contactNote.create({ data: { id: uuidv7(now.getTime()), contactId: c.id, body: input.note.trim(), authorUserId: me ?? c.id, createdAt: now } });
    return {
      result: { contact_id: c.id, code: c.code },
      after: { id: c.id },
      events: [{ topic: 'contact.created', payload: { contact_id: c.id, owner_user_id: c.ownerUserId, source: c.source } }],
    };
  }

  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    const id = (log.after as { id: string }).id;
    await tx.contact.deleteMany({ where: { id } });
  }
}

@Injectable()
@ActionHandler('contact.update')
export class ContactUpdateHandler implements Handler<ActionInput<typeof contactUpdate>, { contact_id: string }> {
  constructor(
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof contactUpdate>, tx: TenantTx): Promise<HandlerOutcome<{ contact_id: string }>> {
    const { contact: c } = await editableContact(tx, ctx.authz, input.contact_id);
    const { owner_user_id, custom, ...rest } = input.patch;
    // Đổi người phụ trách đi qua contact.transfer_owner (crm.reassign) — form sửa gửi lại owner hiện tại thì bỏ qua.
    if (owner_user_id && owner_user_id !== c.ownerUserId) throw new AppError('FORBIDDEN', 403, { owner_user_id: 'use_transfer_owner' });
    const cols = columnsOf(rest);
    if ('name' in cols && !cols.name) throw new AppError('VALIDATION_FAILED', 422, { 'patch.full_name': 'too_small' });
    const me = actorUserId(ctx);
    await assertNoDuplicate(tx, this.members, c.ownerUserId ?? me, { phoneNorm: cols.phoneNorm, email: cols.email }, c.id);
    await checkCustom(tx, custom, fieldRole(ctx.authz, await this.members.roleOf(ctx.workspaceId, me)), 'update');
    const before = snapshot(c);
    const merged = custom === undefined ? undefined : mergeCustomValues(c.custom as CustomValues, custom);
    await tx.contact.update({ where: { id: c.id }, data: { ...cols, ...(merged ? { custom: merged } : {}), updatedAt: this.clock.now() } });
    return { result: { contact_id: c.id }, before: { id: c.id, ...before }, after: { id: c.id } };
  }

  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    const { id, ...b } = log.before as { id: string } & Record<string, unknown>;
    await restoreOr409(() => tx.contact.update({ where: { id }, data: { ...(b as object), custom: (b.custom ?? {}) as object } }));
  }
}

@Injectable()
@ActionHandler('contact.set_stage')
export class ContactSetStageHandler implements Handler<ActionInput<typeof contactSetStage>, { stage: string }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof contactSetStage>, tx: TenantTx): Promise<HandlerOutcome<{ stage: string }>> {
    const { contact: c } = await editableContact(tx, ctx.authz, input.contact_id);
    const now = this.clock.now();
    const before = { id: c.id, stage: c.stage, at: c.stageSetManuallyAt?.toISOString() ?? null };
    if (c.stage === input.stage) return { result: { stage: c.stage }, before, after: before };
    await tx.contact.update({ where: { id: c.id }, data: { stage: input.stage, stageSetManuallyAt: now, lastInteractionAt: now } });
    await writeTimeline(tx, { contactId: c.id, type: 'stage', key: 'stage', params: { from: c.stage, to: input.stage }, actor: actor(ctx), at: now });
    return {
      result: { stage: input.stage },
      before,
      after: { id: c.id, stage: input.stage },
      events: [{ topic: 'contact.stage_changed', payload: { contact_id: c.id, from: c.stage, to: input.stage, manual: true } }],
    };
  }

  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    const b = log.before as { id: string; stage: 'lead'; at: string | null };
    await tx.contact.update({ where: { id: b.id }, data: { stage: b.stage, stageSetManuallyAt: b.at ? new Date(b.at) : null } });
  }
}

/** Thẻ theo TÊN (không phân biệt hoa thường); chưa có → tạo thẻ mới (một nguồn thẻ với hội thoại — Blueprint §2.2 tag). */
async function tagByName(tx: TenantTx, name: string, me: string | null, now: Date, create: boolean) {
  const rows = await tx.$queryRaw<{ id: string; name: string }[]>`SELECT id, name FROM tag WHERE lower(name) = lower(${name.trim()}) LIMIT 1`;
  if (rows[0] || !create) return rows[0] ?? null;
  const id = uuidv7(now.getTime());
  await tx.tag.create({ data: { id, name: name.trim(), createdByUserId: me, createdAt: now } });
  return { id, name: name.trim() };
}

async function tagNames(tx: TenantTx, contactId: string) {
  const links = await tx.contactTag.findMany({ where: { contactId }, select: { tagId: true }, orderBy: { createdAt: 'asc' } });
  const tags = await tx.tag.findMany({ where: { id: { in: links.map((l) => l.tagId) } }, select: { id: true, name: true } });
  const by = new Map(tags.map((t) => [t.id, t.name]));
  return links.map((l) => by.get(l.tagId) ?? '').filter(Boolean);
}

@Injectable()
@ActionHandler('contact.tag')
export class ContactTagHandler implements Handler<ActionInput<typeof contactTag>, { tags: string[] }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof contactTag>, tx: TenantTx): Promise<HandlerOutcome<{ tags: string[] }>> {
    const { contact: c } = await editableContact(tx, ctx.authz, input.contact_id);
    const now = this.clock.now();
    const tag = await tagByName(tx, input.tag, actorUserId(ctx), now, input.op === 'add');
    let changed = false;
    if (tag && input.op === 'add') changed = (await tx.contactTag.createMany({ data: [{ contactId: c.id, tagId: tag.id, createdAt: now }], skipDuplicates: true })).count > 0;
    if (tag && input.op === 'remove') changed = (await tx.contactTag.deleteMany({ where: { contactId: c.id, tagId: tag.id } })).count > 0;
    return { result: { tags: await tagNames(tx, c.id) }, before: { id: c.id, tag_id: tag?.id ?? null, op: input.op, changed }, after: { id: c.id } };
  }

  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    const b = log.before as { id: string; tag_id: string | null; op: 'add' | 'remove'; changed: boolean };
    if (!b.changed || !b.tag_id) return;
    if (b.op === 'add') await tx.contactTag.deleteMany({ where: { contactId: b.id, tagId: b.tag_id } });
    else await tx.contactTag.createMany({ data: [{ contactId: b.id, tagId: b.tag_id }], skipDuplicates: true });
  }
}

@Injectable()
@ActionHandler('contact.delete')
export class ContactDeleteHandler implements Handler<ActionInput<typeof contactDelete>, { deleted: boolean }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof contactDelete>, tx: TenantTx): Promise<HandlerOutcome<{ deleted: boolean }>> {
    const { contact: c } = await editableContact(tx, ctx.authz, input.contact_id);
    await tx.contact.update({ where: { id: c.id }, data: { deletedAt: this.clock.now() } });
    return { result: { deleted: true }, before: { id: c.id }, after: { id: c.id, deleted: true } };
  }

  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    const id = (log.before as { id: string }).id;
    await restoreOr409(() => tx.contact.update({ where: { id }, data: { deletedAt: null } }));
  }
}
