// Phụ trách + đồng phụ trách + xin chia sẻ (D32, rbac-permissions "Chăm sóc khách — nhiều sales"):
// contact.add_collaborator · remove_collaborator · request_access · decide_access (transfer_owner: crm/ownership — TIP-015d).
import { Inject, Injectable } from '@nestjs/common';
import { AppError } from '@appchat/shared';
import type { ActionInput, contactAddCollaborator, contactDecideAccess, contactRemoveCollaborator, contactRequestAccess } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type ActionLogRow, type HandlerOutcome } from '../../kernel/actions/handler';
import { uuidv7 } from '../../kernel/ids';
import { UUID, actorUserId, canManageCollaborators, visibleContact } from '../services/access';
import { accessDecidedNotify, accessRequestedNotify } from '../services/crm-notify';
import { CrmMembers } from '../services/members.service';
import * as pv from './previews/contact-owner.handlers.preview';

const forbidOwner = () => new AppError('FORBIDDEN', 403, { permission: 'crm.reassign' });
const count = (tx: TenantTx, contactId: string) => tx.contactCollaborator.count({ where: { contactId } });

@Injectable()
@ActionHandler('contact.add_collaborator')
export class ContactAddCollaboratorHandler implements Handler<ActionInput<typeof contactAddCollaborator>, { collaborators: number }> {
  constructor(
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async preview(ctx: ActionContext, input: ActionInput<typeof contactAddCollaborator>, tx: TenantTx) {
    return pv.addCollaboratorPreview(tx, ctx.authz, this.members, input);
  }

  async execute(ctx: ActionContext, input: ActionInput<typeof contactAddCollaborator>, tx: TenantTx): Promise<HandlerOutcome<{ collaborators: number }>> {
    const { contact: c } = await visibleContact(tx, ctx.authz, input.contact_id);
    if (!canManageCollaborators(ctx.authz, c)) throw forbidOwner();
    await this.members.assertMember(ctx.workspaceId, input.user_id, 'user_id');
    if (input.user_id === c.ownerUserId) throw new AppError('VALIDATION_FAILED', 422, { user_id: 'is_owner' });
    const key = { contactId_userId: { contactId: c.id, userId: input.user_id } };
    const prev = await tx.contactCollaborator.findUnique({ where: key, select: { role: true } });
    await tx.contactCollaborator.upsert({
      where: key,
      create: { contactId: c.id, userId: input.user_id, role: input.role, addedBy: actorUserId(ctx), createdAt: this.clock.now() },
      update: { role: input.role },
    });
    return {
      result: { collaborators: await count(tx, c.id) },
      before: { id: c.id, user_id: input.user_id, role: prev?.role ?? null },
      after: { id: c.id, user_id: input.user_id, role: input.role },
      events: prev?.role === input.role ? [] : [{ topic: 'contact.collaborator_changed', payload: { contact_id: c.id, user_id: input.user_id, role: input.role } }],
    };
  }

  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    const b = log.before as { id: string; user_id: string; role: 'collaborator' | 'watcher' | null };
    const key = { contactId_userId: { contactId: b.id, userId: b.user_id } };
    if (b.role) await tx.contactCollaborator.update({ where: key, data: { role: b.role } });
    else await tx.contactCollaborator.deleteMany({ where: { contactId: b.id, userId: b.user_id } });
  }
}

@Injectable()
@ActionHandler('contact.remove_collaborator')
export class ContactRemoveCollaboratorHandler implements Handler<ActionInput<typeof contactRemoveCollaborator>, { collaborators: number }> {
  constructor(@Inject(CrmMembers) private readonly members: CrmMembers) {}

  async preview(ctx: ActionContext, input: ActionInput<typeof contactRemoveCollaborator>, tx: TenantTx) {
    return pv.removeCollaboratorPreview(tx, ctx.authz, this.members, input);
  }

  async execute(ctx: ActionContext, input: ActionInput<typeof contactRemoveCollaborator>, tx: TenantTx): Promise<HandlerOutcome<{ collaborators: number }>> {
    const { contact: c } = await visibleContact(tx, ctx.authz, input.contact_id);
    // Tự rời khỏi khách được phép; gỡ người khác cần owner của khách / crm.reassign.
    if (input.user_id !== ctx.authz.userId && !canManageCollaborators(ctx.authz, c)) throw forbidOwner();
    const prev = UUID.test(input.user_id) ? await tx.contactCollaborator.findUnique({ where: { contactId_userId: { contactId: c.id, userId: input.user_id } } }) : null;
    if (!prev) throw new AppError('NOT_FOUND', 404, { user_id: 'not_collaborator' });
    await tx.contactCollaborator.delete({ where: { contactId_userId: { contactId: c.id, userId: input.user_id } } });
    return {
      result: { collaborators: await count(tx, c.id) },
      before: { id: c.id, user_id: input.user_id, role: prev.role, added_by: prev.addedBy },
      events: [{ topic: 'contact.collaborator_changed', payload: { contact_id: c.id, user_id: input.user_id, role: null } }],
    };
  }

  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    const b = log.before as { id: string; user_id: string; role: 'collaborator' | 'watcher'; added_by: string | null };
    await tx.contactCollaborator.createMany({ data: [{ contactId: b.id, userId: b.user_id, role: b.role, addedBy: b.added_by }], skipDuplicates: true });
  }
}

// contact.transfer_owner — một transaction kèm biên nhận + port domain (TIP-015d): crm/ownership/transfer.handler.ts.
export { ContactTransferOwnerHandler } from '../ownership/transfer.handler';

@Injectable()
@ActionHandler('contact.request_access')
export class ContactRequestAccessHandler implements Handler<ActionInput<typeof contactRequestAccess>, { request_id: string; status: 'pending' }> {
  constructor(
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** Không cần thấy khách (đó là mục đích): chỉ cần khách tồn tại + có người phụ trách khác — id lấy từ lỗi CONTACT_OWNED. */
  async preview(ctx: ActionContext, input: ActionInput<typeof contactRequestAccess>, tx: TenantTx) {
    return pv.requestAccessPreview(tx, input);
  }

  async execute(ctx: ActionContext, input: ActionInput<typeof contactRequestAccess>, tx: TenantTx): Promise<HandlerOutcome<{ request_id: string; status: 'pending' }>> {
    const me = actorUserId(ctx);
    if (!me) throw new AppError('FORBIDDEN', 403, { actor: 'user_only' });
    const c = UUID.test(input.contact_id) ? await tx.contact.findUnique({ where: { id: input.contact_id }, select: { id: true, name: true, ownerUserId: true, deletedAt: true } }) : null;
    if (!c || c.deletedAt) throw new AppError('NOT_FOUND', 404, { contact_id: 'not_found' });
    if (c.ownerUserId === me || (await tx.contactCollaborator.findUnique({ where: { contactId_userId: { contactId: c.id, userId: me } } }))) {
      throw new AppError('CONFLICT', 409, { contact_id: 'already_shared' });
    }
    if (await tx.contactAccessRequest.findFirst({ where: { contactId: c.id, requesterUserId: me, status: 'pending' } })) throw new AppError('CONFLICT', 409, { request: 'pending' });
    const now = this.clock.now();
    const id = uuidv7(now.getTime());
    await tx.contactAccessRequest.create({ data: { id, contactId: c.id, requesterUserId: me, note: input.note?.trim() || null, createdAt: now } });
    return {
      result: { request_id: id, status: 'pending' },
      after: { id },
      // Người duyệt (người phụ trách / crm.reassign) được thông báo `crm_access` (DC-150).
      events: [
        { topic: 'contact.access_requested', payload: { contact_id: c.id, request_id: id, requester_user_id: me } },
        ...(await accessRequestedNotify(this.members, { requesterId: me, ownerId: c.ownerUserId, contact: c })),
      ],
    };
  }
}

@Injectable()
@ActionHandler('contact.decide_access')
export class ContactDecideAccessHandler implements Handler<ActionInput<typeof contactDecideAccess>, { status: string }> {
  constructor(
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async preview(ctx: ActionContext, input: ActionInput<typeof contactDecideAccess>, tx: TenantTx) {
    return pv.decideAccessPreview(tx, this.members, input);
  }

  async execute(ctx: ActionContext, input: ActionInput<typeof contactDecideAccess>, tx: TenantTx): Promise<HandlerOutcome<{ status: string }>> {
    const r = UUID.test(input.request_id) ? await tx.contactAccessRequest.findUnique({ where: { id: input.request_id } }) : null;
    if (!r) throw new AppError('NOT_FOUND', 404, { request_id: 'not_found' });
    const c = await tx.contact.findUniqueOrThrow({ where: { id: r.contactId }, select: { id: true, name: true, ownerUserId: true } });
    if (!canManageCollaborators(ctx.authz, c)) throw forbidOwner();
    if (r.status !== 'pending') throw new AppError('CONFLICT', 409, { status: r.status });
    const now = this.clock.now();
    await tx.contactAccessRequest.update({ where: { id: r.id }, data: { status: input.decision, decidedBy: actorUserId(ctx), decidedAt: now } });
    if (input.decision === 'approved') {
      await tx.contactCollaborator.createMany({ data: [{ contactId: c.id, userId: r.requesterUserId, role: 'collaborator', addedBy: actorUserId(ctx), createdAt: now }], skipDuplicates: true });
    }
    return {
      result: { status: input.decision },
      events: [
        { topic: 'contact.access_decided', payload: { contact_id: c.id, request_id: r.id, requester_user_id: r.requesterUserId, status: input.decision } },
        ...(input.decision === 'approved' ? [{ topic: 'contact.collaborator_changed', payload: { contact_id: c.id, user_id: r.requesterUserId, role: 'collaborator' } }] : []),
        ...(await accessDecidedNotify(this.members, { deciderId: actorUserId(ctx), requesterId: r.requesterUserId, status: input.decision, contact: c })),
      ],
    };
  }
}
