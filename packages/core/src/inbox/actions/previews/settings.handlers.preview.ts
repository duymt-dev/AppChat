// Preview Cài đặt › Thẻ / Câu trả lời mẫu (TIP-023b R2.8): tạo → dữ liệu mới; sửa → trước / sau từng trường đổi; xoá → tên + số khách /
// hội thoại đang gắn thẻ (hệ quả gỡ liên kết). Chỉ đọc; trùng tên / phím tắt vẫn do execute chặn (409).
import type { ActionInput, ActionPreview, cannedReplyCreate, cannedReplyDelete, cannedReplyUpdate, tagCreate, tagDelete, tagUpdate } from '@appchat/actions';
import { AppError } from '@appchat/shared';
import type { TenantTx } from '../../../kernel/actions/action-context';
import { created, line, preview, removed, updated } from '../../../kernel/actions/preview-kit';
import { UUID } from '../../services/access';

async function tag(tx: TenantTx, id: string) {
  const t = UUID.test(id) ? await tx.tag.findUnique({ where: { id } }) : null;
  if (!t) throw new AppError('NOT_FOUND', 404, { tag_id: 'not_found' });
  return t;
}

async function reply(tx: TenantTx, id: string) {
  const r = UUID.test(id) ? await tx.cannedReply.findUnique({ where: { id } }) : null;
  if (!r) throw new AppError('NOT_FOUND', 404, { reply_id: 'not_found' });
  return r;
}

export function tagCreatePreview(i: ActionInput<typeof tagCreate>): ActionPreview {
  return preview('config', i.name, { changes: [created('tag', { name: i.name, color: i.color, emoji: i.emoji, description: i.description })] });
}

export async function tagUpdatePreview(tx: TenantTx, i: ActionInput<typeof tagUpdate>): Promise<ActionPreview> {
  const t = await tag(tx, i.tag_id);
  const changes = updated('tag', t.id, { name: t.name, color: t.color, emoji: t.emoji, description: t.description }, { name: i.name, color: i.color, emoji: i.emoji, description: i.description });
  return preview('config', i.name && i.name !== t.name ? `${t.name} → ${i.name}` : t.name, { changes });
}

export async function tagDeletePreview(tx: TenantTx, i: ActionInput<typeof tagDelete>): Promise<ActionPreview> {
  const t = await tag(tx, i.tag_id);
  const [contacts, conversations] = await Promise.all([tx.contactTag.count({ where: { tagId: t.id } }), tx.conversationTag.count({ where: { tagId: t.id } })]);
  return preview('delete', t.name, { count: contacts + conversations, changes: [removed('tag', t.id, { name: t.name, contacts, conversations })] });
}

export function cannedReplyCreatePreview(i: ActionInput<typeof cannedReplyCreate>): ActionPreview {
  return preview('config', line(i.shortcut, i.title), { changes: [created('canned_reply', { shortcut: i.shortcut, title: i.title, body: i.body, category: i.category })] });
}

export async function cannedReplyUpdatePreview(tx: TenantTx, i: ActionInput<typeof cannedReplyUpdate>): Promise<ActionPreview> {
  const r = await reply(tx, i.reply_id);
  const changes = updated('canned_reply', r.id, { shortcut: r.shortcut, title: r.title, body: r.body, category: r.category }, { shortcut: i.shortcut, title: i.title, body: i.body, category: i.category });
  return preview('config', line(r.shortcut, r.title), { changes });
}

export async function cannedReplyDeletePreview(tx: TenantTx, i: ActionInput<typeof cannedReplyDelete>): Promise<ActionPreview> {
  const r = await reply(tx, i.reply_id);
  return preview('delete', line(r.shortcut, r.title), { changes: [removed('canned_reply', r.id, { shortcut: r.shortcut, title: r.title })] });
}
