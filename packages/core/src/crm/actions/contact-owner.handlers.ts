// Phụ trách + đồng phụ trách + xin chia sẻ (D32, rbac-permissions "Chăm sóc khách — nhiều sales"):
// contact.add_collaborator · remove_collaborator · transfer_owner · request_access · decide_access.
import { Inject, Injectable } from '@nestjs/common';
import { AppError } from '@appchat/shared';
import type { ActionInput, contactAddCollaborator, contactDecideAccess, contactRemoveCollaborator, contactRequestAccess, contactTransferOwner } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type ActionLogRow, type HandlerOutcome } from '../../kernel/actions/handler';
import { uuidv7 } from '../../kernel/ids';
import { UUID, actorUserId, canManageCollaborators, visibleContact } from '../services/access';
import { CrmMembers } from '../services/members.service';
import { writeTimeline } from '../services/timeline.service';

const forbidOwner = () => new AppError('FORBIDDEN', 403, { permission: 'crm.reassign' });
const count = (tx: TenantTx, contactId: string) => tx.contactCollaborator.count({ where: { contactId } });

@Injectable()
@ActionHandler('contact.add_collaborator')
export class ContactAddCollaboratorHandler implements Handler<ActionInput<typeof contactAddCollaborator>, { collaborators: number }> {
  constructor(
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

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

type Moved = { conversations: number; quotes: number; appointments: number };

@Injectable()
@ActionHandler('contact.transfer_owner')
export class ContactTransferOwnerHandler implements Handler<ActionInput<typeof contactTransferOwner>, { owner_user_id: string; moved: Moved }> {
  constructor(
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof contactTransferOwner>, tx: TenantTx): Promise<HandlerOutcome<{ owner_user_id: string; moved: Moved }>> {
    const { contact: c } = await visibleContact(tx, ctx.authz, input.contact_id);
    const to = await this.members.assertMember(ctx.workspaceId, input.to_user_id, 'to_user_id');
    const now = this.clock.now();
    const prevCollab = await tx.contactCollaborator.findUnique({ where: { contactId_userId: { contactId: c.id, userId: to.id } } });
    await tx.contactCollaborator.deleteMany({ where: { contactId: c.id, userId: to.id } });
    await tx.contact.update({ where: { id: c.id }, data: { ownerUserId: to.id, updatedAt: now } });
    await writeTimeline(tx, { contactId: c.id, type: 'owner', key: 'owner', params: { to: to.name }, actor: { type: ctx.actor.type, id: actorUserId(ctx) }, at: now });
    // Hội thoại / báo giá / lịch hẹn chưa có bảng ở TIP-015 — domain chủ (016 / 028 / 033) chuyển theo cờ `move` của event.
    const moved: Moved = { conversations: 0, quotes: 0, appointments: 0 };
    return {
      result: { owner_user_id: to.id, moved },
      before: { id: c.id, owner: c.ownerUserId, collab: prevCollab ? { role: prevCollab.role, added_by: prevCollab.addedBy } : null },
      after: { id: c.id, owner: to.id },
      // Thông báo người nhận: chờ loại thông báo crm (Q-012) — consumer notify đọc `contact.owner_changed`.
      events: c.ownerUserId === to.id ? [] : [{ topic: 'contact.owner_changed', payload: { contact_id: c.id, from: c.ownerUserId, to: to.id, move: input.move } }],
    };
  }

  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    const b = log.before as { id: string; owner: string | null; collab: { role: 'collaborator' | 'watcher'; added_by: string | null } | null };
    const a = log.after as { owner: string };
    const cur = await tx.contact.findUnique({ where: { id: b.id }, select: { ownerUserId: true } });
    if (cur?.ownerUserId !== a.owner) throw new AppError('CONFLICT', 409, { owner_user_id: 'changed' });
    await tx.contact.update({ where: { id: b.id }, data: { ownerUserId: b.owner } });
    if (b.collab) await tx.contactCollaborator.createMany({ data: [{ contactId: b.id, userId: a.owner, role: b.collab.role, addedBy: b.collab.added_by }], skipDuplicates: true });
  }
}

@Injectable()
@ActionHandler('contact.request_access')
export class ContactRequestAccessHandler implements Handler<ActionInput<typeof contactRequestAccess>, { request_id: string; status: 'pending' }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  /** Không cần thấy khách (đó là mục đích): chỉ cần khách tồn tại + có người phụ trách khác — id lấy từ lỗi CONTACT_OWNED. */
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
      // Thông báo người duyệt: chờ loại thông báo crm (Q-012) — consumer notify đọc `contact.access_requested`.
      events: [{ topic: 'contact.access_requested', payload: { contact_id: c.id, request_id: id, requester_user_id: me } }],
    };
  }
}

@Injectable()
@ActionHandler('contact.decide_access')
export class ContactDecideAccessHandler implements Handler<ActionInput<typeof contactDecideAccess>, { status: string }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof contactDecideAccess>, tx: TenantTx): Promise<HandlerOutcome<{ status: string }>> {
    const r = UUID.test(input.request_id) ? await tx.contactAccessRequest.findUnique({ where: { id: input.request_id } }) : null;
    if (!r) throw new AppError('NOT_FOUND', 404, { request_id: 'not_found' });
    const c = await tx.contact.findUniqueOrThrow({ where: { id: r.contactId }, select: { id: true, ownerUserId: true } });
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
      ],
    };
  }
}
