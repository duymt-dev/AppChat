// contact.add_note / contact.add_comment / contact_activity.list (TIP-026b §2). Ghi chú / bình luận nội bộ — không gửi ra kênh, không
// thông báo / nhắc tên giả. Hoàn tác = xoá mềm nếu bản ghi chưa đổi (version) và người gọi còn quyền sửa khách.
import { Inject, Injectable } from '@nestjs/common';
import type { ActionInput, contactActivityList, contactAddComment, contactAddNote } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type ActionLogRow, type HandlerOutcome } from '../../kernel/actions/handler';
import { uuidv7 } from '../../kernel/ids';
import { CrmMembers } from '../services/members.service';
import { authorOf, checkSource, writableParent } from './authority';
import { activityEvent, activityTimeline, lockForUndo } from './undo';
import { activityPage } from './read.service';
import { notePreview } from './previews';

type NoteOut = { note_id: string; kind: 'note' | 'comment'; version: number };
type NoteIn = ActionInput<typeof contactAddNote>;

async function addNote(ctx: ActionContext, input: NoteIn, tx: TenantTx, kind: 'note' | 'comment', now: Date): Promise<HandlerOutcome<NoteOut>> {
  await writableParent(tx, ctx.authz, input.contact_id);
  const src = await checkSource(tx, ctx.authz, input.contact_id, input);
  const a = authorOf(ctx);
  const id = uuidv7(now.getTime());
  await tx.contactNote.create({ data: { id, contactId: input.contact_id, kind, body: input.body.trim(), authorUserId: a.userId, actorType: a.actorType, actorId: a.actorId, ...src, createdAt: now } });
  await activityTimeline(tx, { contactId: input.contact_id, type: kind, key: kind === 'note' ? 'note_added' : 'comment_added', ref: { type: 'contact_note', id }, actor: { type: ctx.actor.type, id: a.userId }, at: now });
  return {
    result: { note_id: id, kind, version: 1 },
    after: { id, version: 1 },
    events: [activityEvent(kind === 'note' ? 'contact.note_added' : 'contact.comment_added', input.contact_id, id, 1)],
  };
}

async function undoNote(ctx: ActionContext, log: ActionLogRow, tx: TenantTx, now: Date) {
  const a = log.after as { id: string; version: number };
  await lockForUndo(tx, ctx.authz, 'contact_note', a.id, a.version);
  await tx.contactNote.update({ where: { id: a.id }, data: { deletedAt: now, version: { increment: 1 } } });
}

@Injectable()
@ActionHandler('contact.add_note')
export class ContactAddNoteHandler implements Handler<NoteIn, NoteOut> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}
  async preview(ctx: ActionContext, input: NoteIn, tx: TenantTx) {
    return notePreview(tx, ctx.authz, input, 'note');
  }
  execute(ctx: ActionContext, input: NoteIn, tx: TenantTx) {
    return addNote(ctx, input, tx, 'note', this.clock.now());
  }
  undo(ctx: ActionContext, log: ActionLogRow, tx: TenantTx) {
    return undoNote(ctx, log, tx, this.clock.now());
  }
}

@Injectable()
@ActionHandler('contact.add_comment')
export class ContactAddCommentHandler implements Handler<ActionInput<typeof contactAddComment>, NoteOut> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}
  async preview(ctx: ActionContext, input: ActionInput<typeof contactAddComment>, tx: TenantTx) {
    return notePreview(tx, ctx.authz, input, 'comment');
  }
  execute(ctx: ActionContext, input: ActionInput<typeof contactAddComment>, tx: TenantTx) {
    return addNote(ctx, input, tx, 'comment', this.clock.now());
  }
  undo(ctx: ActionContext, log: ActionLogRow, tx: TenantTx) {
    return undoNote(ctx, log, tx, this.clock.now());
  }
}

@Injectable()
@ActionHandler('contact_activity.list')
export class ContactActivityListHandler implements Handler<ActionInput<typeof contactActivityList>, unknown> {
  constructor(@Inject(CrmMembers) private readonly members: CrmMembers | null) {}
  async execute(ctx: ActionContext, input: ActionInput<typeof contactActivityList>, tx: TenantTx) {
    const m = this.members;
    const place = m ? await m.place(ctx.workspaceId, ctx.authz.userId) : { locale: 'vi' };
    const page = await activityPage(tx, input.contact_id, { kind: input.kind, cursor: input.cursor, limit: input.limit, activityId: input.activity_id }, {
      authz: ctx.authz,
      locale: place.locale,
      names: (ids) => (m ? m.names(ids) : Promise.resolve(new Map())),
      activeMembers: async () => new Set(m ? (await m.list(ctx.workspaceId)).map((x) => x.id) : []),
    });
    return { result: page };
  }
}
