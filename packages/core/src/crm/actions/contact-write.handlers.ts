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
import { tagByName, tagNames } from '../services/contact-tags';
import { changedFields, lockContactVersion, updateAtVersion } from '../services/contact-version';
import * as pv from './previews/contact-write.handlers.preview';

const actor = (ctx: ActionContext) => ({ type: ctx.actor.type, id: actorUserId(ctx) });

/** Ảnh chụp cột có thể sửa (undo của update). */
const SNAP = ['name', 'title', 'kind', 'group', 'phone', 'phoneNorm', 'email', 'zalo', 'city', 'district', 'address', 'birthday', 'gender', 'source', 'status', 'ownerUserId', 'custom'] as const;
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

  async preview(_ctx: ActionContext, input: ActionInput<typeof contactCreate>) {
    return pv.createPreview(input);
  }

  async execute(ctx: ActionContext, input: ActionInput<typeof contactCreate>, tx: TenantTx): Promise<HandlerOutcome<{ contact_id: string; code: string }>> {
    const now = this.clock.now();
    const me = actorUserId(ctx);
    const c = await createContact(tx, input, { workspaceId: ctx.workspaceId, authz: ctx.authz, roleKey: await this.members.roleOf(ctx.workspaceId, me), actorUserId: me, now, members: this.members });
    await writeTimeline(tx, { contactId: c.id, type: 'stage', key: 'created', params: { source: c.source }, actor: actor(ctx), at: now });
    if (input.note?.trim()) await tx.contactNote.create({ data: { id: uuidv7(now.getTime()), contactId: c.id, body: input.note.trim(), authorUserId: me, actorType: me ? 'user' : ctx.actor.type, actorId: me ? null : ctx.actor.id, createdAt: now } });
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
export class ContactUpdateHandler implements Handler<ActionInput<typeof contactUpdate>, { contact_id: string; version: number }> {
  constructor(
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async preview(ctx: ActionContext, input: ActionInput<typeof contactUpdate>, tx: TenantTx) {
    return pv.updatePreview(tx, ctx.authz, input);
  }

  async execute(ctx: ActionContext, input: ActionInput<typeof contactUpdate>, tx: TenantTx): Promise<HandlerOutcome<{ contact_id: string; version: number }>> {
    await editableContact(tx, ctx.authz, input.contact_id);
    // TIP-025b §D.4: khoá + đối chiếu version trước khi đọc bản để so (hai lệnh cùng version → một thắng, một 409).
    const at = await lockContactVersion(tx, input.contact_id, input.if_version);
    const { contact: c } = await editableContact(tx, ctx.authz, input.contact_id);
    const { owner_user_id, custom, ...rest } = input.patch;
    // Đổi người phụ trách đi qua contact.transfer_owner (crm.reassign) — form sửa gửi lại owner hiện tại thì bỏ qua.
    if (owner_user_id && owner_user_id !== c.ownerUserId) throw new AppError('FORBIDDEN', 403, { owner_user_id: 'use_transfer_owner' });
    const cols = columnsOf(rest);
    if ('name' in cols && !cols.name) throw new AppError('VALIDATION_FAILED', 422, { 'patch.full_name': 'too_small' });
    const me = actorUserId(ctx);
    await assertNoDuplicate(tx, this.members, c.ownerUserId ?? me, { phoneNorm: cols.phoneNorm, email: cols.email }, c.id);
    await checkCustom(tx, custom, fieldRole(ctx.authz, await this.members.roleOf(ctx.workspaceId, me)), 'update');
    const merged = custom === undefined ? undefined : mergeCustomValues(c.custom as CustomValues, custom);
    const data: Record<string, unknown> = { ...cols, ...(merged ? { custom: merged } : {}) };
    const changed = changedFields(c as unknown as Record<string, unknown>, data);
    if (!changed.length) return { result: { contact_id: c.id, version: at } };
    const pick = (src: Record<string, unknown>) => Object.fromEntries(changed.map((k) => [k, src[k] ?? null]));
    const version = await updateAtVersion(tx, c.id, at, { ...pick(data), updatedAt: this.clock.now() });
    return { result: { contact_id: c.id, version }, before: { id: c.id, ...pick(snapshot(c)) }, after: { id: c.id, version, ...pick(data) } };
  }

  /** Chỉ khôi phục trường lần sửa này đã đổi, khi vẫn đúng version sau-ghi (có sửa / chuyển phụ trách / hệ thống sau đó → 409). */
  async undo(ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    const { id, ...b } = log.before as { id: string } & Record<string, unknown>;
    const a = log.after as { version?: number } | null;
    await editableContact(tx, ctx.authz, id);
    if (a?.version === undefined) {
      // Bản ghi log cũ (trước TIP-025b) — giữ hành vi khôi phục ảnh chụp.
      await restoreOr409(() => tx.contact.update({ where: { id }, data: { ...(b as object), custom: (b.custom ?? {}) as object } }));
      return;
    }
    await lockContactVersion(tx, id, a.version);
    await restoreOr409(() => updateAtVersion(tx, id, a.version!, { ...b, ...('custom' in b ? { custom: (b.custom ?? {}) as object } : {}), updatedAt: this.clock.now() }));
  }
}

@Injectable()
@ActionHandler('contact.set_stage')
export class ContactSetStageHandler implements Handler<ActionInput<typeof contactSetStage>, { stage: string; version?: number }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async preview(ctx: ActionContext, input: ActionInput<typeof contactSetStage>, tx: TenantTx) {
    return pv.setStagePreview(tx, ctx.authz, input);
  }

  async execute(ctx: ActionContext, input: ActionInput<typeof contactSetStage>, tx: TenantTx): Promise<HandlerOutcome<{ stage: string; version?: number }>> {
    // TIP-026b §4.3: khoá + đối chiếu version (025b trigger tăng — không tăng tay); hai lần kéo đồng thời → một thắng, một 409.
    await editableContact(tx, ctx.authz, input.contact_id);
    const version = await lockContactVersion(tx, input.contact_id, input.if_version);
    const c = await tx.contact.findUniqueOrThrow({ where: { id: input.contact_id } });
    const now = this.clock.now();
    const before = { id: c.id, stage: c.stage, at: c.stageSetManuallyAt?.toISOString() ?? null };
    if (c.stage === input.stage) return { result: { stage: c.stage, version }, before, after: before };
    const next = await updateAtVersion(tx, c.id, version, { stage: input.stage, stageSetManuallyAt: now, lastInteractionAt: now });
    await writeTimeline(tx, { contactId: c.id, type: 'stage', key: 'stage', params: { from: c.stage, to: input.stage }, actor: actor(ctx), at: now });
    return {
      result: { stage: input.stage, version: next },
      before,
      after: { id: c.id, stage: input.stage, version: next },
      events: [{ topic: 'contact.stage_changed', payload: { contact_id: c.id, from: c.stage, to: input.stage, manual: true } }],
    };
  }

  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    const b = log.before as { id: string; stage: 'lead'; at: string | null };
    const a = log.after as { version?: number } | null;
    // Chỉ hoàn tác bản sau-ghi hiện tại: khách đã đổi tiếp (version khác) → 409, không đè.
    if (a?.version !== undefined) {
      await lockContactVersion(tx, b.id, a.version);
      await updateAtVersion(tx, b.id, a.version, { stage: b.stage, stageSetManuallyAt: b.at ? new Date(b.at) : null });
      return;
    }
    await tx.contact.update({ where: { id: b.id }, data: { stage: b.stage, stageSetManuallyAt: b.at ? new Date(b.at) : null } });
  }
}

@Injectable()
@ActionHandler('contact.tag')
export class ContactTagHandler implements Handler<ActionInput<typeof contactTag>, { tags: string[] }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async preview(ctx: ActionContext, input: ActionInput<typeof contactTag>, tx: TenantTx) {
    return pv.tagPreview(tx, ctx.authz, input);
  }

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

  async preview(ctx: ActionContext, input: ActionInput<typeof contactDelete>, tx: TenantTx) {
    return pv.deletePreview(tx, ctx.authz, input);
  }

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
