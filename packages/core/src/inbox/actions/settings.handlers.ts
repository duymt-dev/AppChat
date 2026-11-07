// Cài đặt › Thẻ (`tag.*` — nguồn thẻ dùng chung khách + hội thoại) và › Câu trả lời mẫu (`canned_reply.*`) (Blueprint §3.4
// settings; quyền inbox.manage). Trùng tên thẻ (không dấu) / phím tắt → 409 CONFLICT; xoá có undo (khôi phục cả liên kết thẻ).
import { Inject, Injectable } from '@nestjs/common';
import { AppError, foldText } from '@appchat/shared';
import type { ActionInput, cannedReplyCreate, cannedReplyDelete, cannedReplyUpdate, tagCreate, tagDelete, tagUpdate } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type ActionLogRow, type HandlerOutcome } from '../../kernel/actions/handler';
import { uuidv7 } from '../../kernel/ids';
import { UUID } from '../services/access';
import { me } from './kit';
import * as pv from './previews/settings.handlers.preview';

async function assertTagName(tx: TenantTx, name: string, exceptId?: string) {
  const want = foldText(name);
  const all = await tx.tag.findMany({ select: { id: true, name: true } });
  if (all.some((t) => t.id !== exceptId && foldText(t.name) === want)) throw new AppError('CONFLICT', 409, { name: 'duplicate' });
}

async function tagOr404(tx: TenantTx, id: string) {
  const t = UUID.test(id) ? await tx.tag.findUnique({ where: { id } }) : null;
  if (!t) throw new AppError('NOT_FOUND', 404, { tag_id: 'not_found' });
  return t;
}

async function replyOr404(tx: TenantTx, id: string) {
  const r = UUID.test(id) ? await tx.cannedReply.findUnique({ where: { id } }) : null;
  if (!r) throw new AppError('NOT_FOUND', 404, { reply_id: 'not_found' });
  return r;
}

async function assertShortcut(tx: TenantTx, shortcut: string, exceptId?: string) {
  const hit = await tx.cannedReply.findUnique({ where: { shortcut }, select: { id: true } });
  if (hit && hit.id !== exceptId) throw new AppError('CONFLICT', 409, { shortcut: 'duplicate' });
}

const iso = (d: Date) => d.toISOString();

@Injectable()
@ActionHandler('tag.create')
export class TagCreateHandler implements Handler<ActionInput<typeof tagCreate>, { tag_id: string }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof tagCreate>, tx: TenantTx): Promise<HandlerOutcome<{ tag_id: string }>> {
    await assertTagName(tx, input.name);
    const now = this.clock.now();
    const id = uuidv7(now.getTime());
    await tx.tag.create({
      data: { id, name: input.name.trim(), color: input.color ?? '#6B7280', emoji: input.emoji ?? '', description: input.description ?? '', createdByUserId: me(ctx), createdAt: now, updatedAt: now },
    });
    return { result: { tag_id: id }, after: { id }, events: [{ topic: 'tag.created', payload: { id } }] };
  }

  async preview(_ctx: ActionContext, input: ActionInput<typeof tagCreate>) {
    return pv.tagCreatePreview(input);
  }
}

@Injectable()
@ActionHandler('tag.update')
export class TagUpdateHandler implements Handler<ActionInput<typeof tagUpdate>, { tag_id: string }> {
  async execute(ctx: ActionContext, input: ActionInput<typeof tagUpdate>, tx: TenantTx): Promise<HandlerOutcome<{ tag_id: string }>> {
    const t = await tagOr404(tx, input.tag_id);
    if (input.name !== undefined) await assertTagName(tx, input.name, t.id);
    await tx.tag.update({
      where: { id: t.id },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.color !== undefined ? { color: input.color } : {}),
        ...(input.emoji !== undefined ? { emoji: input.emoji } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        updatedByUserId: me(ctx),
      },
    });
    return { result: { tag_id: t.id } };
  }

  async preview(_ctx: ActionContext, input: ActionInput<typeof tagUpdate>, tx: TenantTx) {
    return pv.tagUpdatePreview(tx, input);
  }
}

interface TagBackup {
  tag: { id: string; name: string; color: string; emoji: string; description: string; scope: 'all' | 'contact' | 'conversation'; createdByUserId: string | null; createdAt: string };
  contacts: string[];
  conversations: string[];
}

@Injectable()
@ActionHandler('tag.delete')
export class TagDeleteHandler implements Handler<ActionInput<typeof tagDelete>, { ok: boolean }> {
  async execute(_ctx: ActionContext, input: ActionInput<typeof tagDelete>, tx: TenantTx): Promise<HandlerOutcome<{ ok: boolean }>> {
    const t = await tagOr404(tx, input.tag_id);
    const [contacts, conversations] = await Promise.all([
      tx.contactTag.findMany({ where: { tagId: t.id }, select: { contactId: true } }),
      tx.conversationTag.findMany({ where: { tagId: t.id }, select: { conversationId: true } }),
    ]);
    // FK ON DELETE CASCADE gỡ liên kết khách / hội thoại; ảnh chụp giữ để undo.
    await tx.tag.delete({ where: { id: t.id } });
    const before: TagBackup = {
      tag: { id: t.id, name: t.name, color: t.color, emoji: t.emoji, description: t.description, scope: t.scope, createdByUserId: t.createdByUserId, createdAt: iso(t.createdAt) },
      contacts: contacts.map((c) => c.contactId),
      conversations: conversations.map((c) => c.conversationId),
    };
    return { result: { ok: true }, before };
  }

  async preview(_ctx: ActionContext, input: ActionInput<typeof tagDelete>, tx: TenantTx) {
    return pv.tagDeletePreview(tx, input);
  }

  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    const b = log.before as TagBackup;
    await assertTagName(tx, b.tag.name);
    await tx.tag.create({ data: { ...b.tag, createdAt: new Date(b.tag.createdAt) } });
    const liveContacts = await tx.contact.findMany({ where: { id: { in: b.contacts } }, select: { id: true } });
    const liveConvs = await tx.conversation.findMany({ where: { id: { in: b.conversations } }, select: { id: true } });
    await tx.contactTag.createMany({ data: liveContacts.map((c) => ({ contactId: c.id, tagId: b.tag.id })), skipDuplicates: true });
    await tx.conversationTag.createMany({ data: liveConvs.map((c) => ({ conversationId: c.id, tagId: b.tag.id })), skipDuplicates: true });
  }
}

@Injectable()
@ActionHandler('canned_reply.create')
export class CannedReplyCreateHandler implements Handler<ActionInput<typeof cannedReplyCreate>, { reply_id: string }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof cannedReplyCreate>, tx: TenantTx): Promise<HandlerOutcome<{ reply_id: string }>> {
    await assertShortcut(tx, input.shortcut);
    const now = this.clock.now();
    const id = uuidv7(now.getTime());
    await tx.cannedReply.create({ data: { id, ...input, createdByUserId: me(ctx), createdAt: now, updatedAt: now } });
    return { result: { reply_id: id }, after: { id } };
  }

  async preview(_ctx: ActionContext, input: ActionInput<typeof cannedReplyCreate>) {
    return pv.cannedReplyCreatePreview(input);
  }
}

@Injectable()
@ActionHandler('canned_reply.update')
export class CannedReplyUpdateHandler implements Handler<ActionInput<typeof cannedReplyUpdate>, { reply_id: string }> {
  async execute(_ctx: ActionContext, input: ActionInput<typeof cannedReplyUpdate>, tx: TenantTx): Promise<HandlerOutcome<{ reply_id: string }>> {
    const r = await replyOr404(tx, input.reply_id);
    if (input.shortcut !== undefined) await assertShortcut(tx, input.shortcut, r.id);
    await tx.cannedReply.update({
      where: { id: r.id },
      data: { shortcut: input.shortcut, title: input.title, body: input.body, category: input.category },
    });
    return { result: { reply_id: r.id } };
  }

  async preview(_ctx: ActionContext, input: ActionInput<typeof cannedReplyUpdate>, tx: TenantTx) {
    return pv.cannedReplyUpdatePreview(tx, input);
  }
}

@Injectable()
@ActionHandler('canned_reply.delete')
export class CannedReplyDeleteHandler implements Handler<ActionInput<typeof cannedReplyDelete>, { ok: boolean }> {
  async execute(_ctx: ActionContext, input: ActionInput<typeof cannedReplyDelete>, tx: TenantTx): Promise<HandlerOutcome<{ ok: boolean }>> {
    const r = await replyOr404(tx, input.reply_id);
    await tx.cannedReply.delete({ where: { id: r.id } });
    return { result: { ok: true }, before: { ...r, attachments: r.attachments ?? [], createdAt: iso(r.createdAt), updatedAt: iso(r.updatedAt) } };
  }

  async preview(_ctx: ActionContext, input: ActionInput<typeof cannedReplyDelete>, tx: TenantTx) {
    return pv.cannedReplyDeletePreview(tx, input);
  }

  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    const b = log.before as { id: string; shortcut: string; title: string; body: string; category: string; attachments: object; createdByUserId: string | null; createdAt: string; updatedAt: string };
    await assertShortcut(tx, b.shortcut);
    await tx.cannedReply.create({ data: { ...b, createdAt: new Date(b.createdAt), updatedAt: new Date(b.updatedAt) } });
  }
}
