// contact.merge (crm.edit, bulk → preview, undo 7 ngày — F03): mỗi nhóm `<chính>~<phụ>` (GET /v1/contacts/duplicates).
// Chuyển identity / thẻ / ghi chú / timeline / trí nhớ AI / collaborator của bản phụ sang bản chính; bản phụ xoá mềm +
// `merged_into_id`. Ghi lại id đã chuyển để hoàn tác trả đúng về bản phụ.
import { Inject, Injectable } from '@nestjs/common';
import { AppError, interpolate, serverMessages } from '@appchat/shared';
import type { ActionPreview, ActionInput, contactMerge } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type ActionLogRow, type HandlerOutcome } from '../../kernel/actions/handler';
import { UUID, actorUserId, editableContact } from '../services/access';
import { writeTimeline } from '../services/timeline.service';

type Input = ActionInput<typeof contactMerge>;

interface Moved {
  primary: string;
  dup: string;
  identities: string[];
  notes: string[];
  timeline: string[];
  memory: string[];
  tags: string[];
  collaborators: { userId: string; role: 'collaborator' | 'watcher'; addedBy: string | null }[];
  fill: Record<string, string | null>;
  /** Dòng timeline "gộp" ghi ở bản chính. */
  event?: string;
}

const pairs = (ids: string[]) =>
  ids.map((g) => {
    const [a, b] = g.split('~');
    if (!a || !b || a === b || !UUID.test(a) || !UUID.test(b)) throw new AppError('VALIDATION_FAILED', 422, { group_ids: 'invalid' });
    return [a, b] as const;
  });

/** Trường liên hệ còn trống ở bản chính lấy từ bản phụ (không đổi khoá chống trùng phone_norm). */
const FILL = ['email', 'zalo', 'title', 'city', 'district', 'taxCode', 'address'] as const;

@Injectable()
@ActionHandler('contact.merge')
export class ContactMergeHandler implements Handler<Input, { merged: number }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async preview(_ctx: ActionContext, input: Input): Promise<ActionPreview> {
    const n = pairs(input.group_ids).length;
    return { summary: interpolate(serverMessages('vi').crm.preview.merge, { count: n }), risk: 'write', count: n };
  }

  async execute(ctx: ActionContext, input: Input, tx: TenantTx): Promise<HandlerOutcome<{ merged: number }>> {
    const now = this.clock.now();
    const moved: Moved[] = [];
    for (const [pid, did] of pairs(input.group_ids)) {
      const { contact: p } = await editableContact(tx, ctx.authz, pid);
      const { contact: d } = await editableContact(tx, ctx.authz, did);
      const ids = async (rows: Promise<{ id: string }[]>) => (await rows).map((r) => r.id);
      const m: Moved = {
        primary: p.id,
        dup: d.id,
        identities: await ids(tx.contactIdentity.findMany({ where: { contactId: d.id }, select: { id: true } })),
        notes: await ids(tx.contactNote.findMany({ where: { contactId: d.id }, select: { id: true } })),
        timeline: await ids(tx.timelineEvent.findMany({ where: { contactId: d.id }, select: { id: true } })),
        memory: await ids(tx.contactMemory.findMany({ where: { contactId: d.id }, select: { id: true } })),
        tags: [],
        collaborators: [],
        fill: {},
      };
      const where = { contactId: d.id };
      await tx.contactIdentity.updateMany({ where, data: { contactId: p.id } });
      await tx.contactNote.updateMany({ where, data: { contactId: p.id } });
      await tx.timelineEvent.updateMany({ where, data: { contactId: p.id } });
      await tx.contactMemory.updateMany({ where, data: { contactId: p.id } });
      const pTags = new Set((await tx.contactTag.findMany({ where: { contactId: p.id }, select: { tagId: true } })).map((t) => t.tagId));
      m.tags = (await tx.contactTag.findMany({ where, select: { tagId: true } })).map((t) => t.tagId).filter((t) => !pTags.has(t));
      if (m.tags.length) await tx.contactTag.createMany({ data: m.tags.map((tagId) => ({ contactId: p.id, tagId })), skipDuplicates: true });
      const pCol = new Set((await tx.contactCollaborator.findMany({ where: { contactId: p.id }, select: { userId: true } })).map((c) => c.userId));
      m.collaborators = (await tx.contactCollaborator.findMany({ where })).filter((c) => !pCol.has(c.userId) && c.userId !== p.ownerUserId).map((c) => ({ userId: c.userId, role: c.role, addedBy: c.addedBy }));
      // Phụ trách bản phụ (khác bản chính) được giữ quyền theo dõi khách sau khi gộp.
      if (d.ownerUserId && d.ownerUserId !== p.ownerUserId && !pCol.has(d.ownerUserId)) m.collaborators.push({ userId: d.ownerUserId, role: 'collaborator', addedBy: actorUserId(ctx) });
      if (m.collaborators.length) await tx.contactCollaborator.createMany({ data: m.collaborators.map((c) => ({ contactId: p.id, ...c })), skipDuplicates: true });
      for (const k of FILL) if (!p[k] && d[k]) m.fill[k] = d[k] as string;
      await tx.contact.update({ where: { id: d.id }, data: { deletedAt: now, mergedIntoId: p.id } });
      await tx.contact.update({ where: { id: p.id }, data: { ...m.fill, updatedAt: now } });
      m.event = await writeTimeline(tx, { contactId: p.id, type: 'merge', key: 'merge', params: { count: 1 }, actor: { type: ctx.actor.type, id: actorUserId(ctx) }, at: now });
      moved.push(m);
    }
    return {
      result: { merged: moved.length },
      before: { moved },
      events: moved.map((m) => ({ topic: 'contact.merged', payload: { contact_id: m.primary, merged_ids: [m.dup] } })),
    };
  }

  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    for (const m of [...(log.before as { moved: Moved[] }).moved].reverse()) {
      const back = { contactId: m.dup };
      await tx.contact.update({ where: { id: m.dup }, data: { deletedAt: null, mergedIntoId: null } });
      await tx.contactIdentity.updateMany({ where: { id: { in: m.identities } }, data: back });
      await tx.contactNote.updateMany({ where: { id: { in: m.notes } }, data: back });
      await tx.timelineEvent.updateMany({ where: { id: { in: m.timeline } }, data: back });
      await tx.contactMemory.updateMany({ where: { id: { in: m.memory } }, data: back });
      await tx.contactTag.deleteMany({ where: { contactId: m.primary, tagId: { in: m.tags } } });
      await tx.contactCollaborator.deleteMany({ where: { contactId: m.primary, userId: { in: m.collaborators.map((c) => c.userId) } } });
      if (m.event) await tx.timelineEvent.deleteMany({ where: { id: m.event } });
      if (Object.keys(m.fill).length) await tx.contact.update({ where: { id: m.primary }, data: Object.fromEntries(Object.keys(m.fill).map((k) => [k, null])) });
    }
  }
}
