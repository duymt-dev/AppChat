// Preview tin / ghi chú (TIP-023b R2.8): gửi → người nhận (hội thoại) + kênh + nội dung + số tệp; chuyển tiếp → hội thoại đích + kênh đích +
// trích tin; thu hồi / xoá / ghim / cảm xúc → tin bị tác động (trích ≤ 80 ký tự); ghi chú → nội dung + người được @nhắc. Tin đã thu hồi / xoá
// không trích nội dung. Chỉ đọc — kiểm kênh hỗ trợ tệp / cảm xúc vẫn ở execute.
import type { ActionInput, ActionPreview, messageDelete, messageForward, messagePin, messageReact, messageRecall, messageSend, noteAdd } from '@appchat/actions';
import type { AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../../../kernel/actions/action-context';
import { created, line, preview, removed, updated } from '../../../kernel/actions/preview-kit';
import { messageOf, writableConversation } from '../../services/access';
import { convTitle } from './conversation-state.handlers.preview';

const clip = (s: string, n = 80) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
type Msg = Awaited<ReturnType<typeof messageOf>>;
const excerpt = (m: Msg) => (m.deletedAt || m.recalledAt ? '' : clip(m.body ?? ''));

async function target(tx: TenantTx, a: AuthzContext, id: string) {
  const c = await writableConversation(tx, a, id);
  return { c, title: await convTitle(tx, c) };
}

export async function sendPreview(tx: TenantTx, a: AuthzContext, i: ActionInput<typeof messageSend>): Promise<ActionPreview> {
  const { c, title } = await target(tx, a, i.conversation_id);
  const files = i.attachments?.length ?? 0;
  return preview('send', line(title, c.channelType, clip((i.text ?? '').trim())), {
    changes: [created('message', { to: title, channel: c.channelType, text: (i.text ?? '').trim(), attachments: files || undefined, reply_to_id: i.reply_to_id })],
  });
}

export async function forwardPreview(tx: TenantTx, a: AuthzContext, i: ActionInput<typeof messageForward>): Promise<ActionPreview> {
  const src = await writableConversation(tx, a, i.conversation_id);
  const m = await messageOf(tx, src.id, i.message_id);
  const to = await target(tx, a, i.target_conversation_id);
  return preview('send', line(to.title, to.c.channelType, excerpt(m)), { changes: [created('message', { to: to.title, channel: to.c.channelType, text: excerpt(m), forwarded_from_id: m.id })] });
}

async function onMessage(tx: TenantTx, a: AuthzContext, conversationId: string, messageId: string) {
  const { c, title } = await target(tx, a, conversationId);
  return { c, title, m: await messageOf(tx, c.id, messageId) };
}

export async function recallPreview(tx: TenantTx, a: AuthzContext, i: ActionInput<typeof messageRecall>): Promise<ActionPreview> {
  const { title, m } = await onMessage(tx, a, i.conversation_id, i.message_id);
  return preview('send', line(title, excerpt(m)), { changes: updated('message', m.id, { recalled: !!m.recalledAt }, { recalled: true }) });
}

export async function deletePreview(tx: TenantTx, a: AuthzContext, i: ActionInput<typeof messageDelete>): Promise<ActionPreview> {
  const { title, m } = await onMessage(tx, a, i.conversation_id, i.message_id);
  return preview('delete', line(title, excerpt(m)), { changes: [removed('message', m.id, { text: excerpt(m) })] });
}

export async function reactPreview(tx: TenantTx, a: AuthzContext, i: ActionInput<typeof messageReact>): Promise<ActionPreview> {
  const { title, m } = await onMessage(tx, a, i.conversation_id, i.message_id);
  return preview('write', line(title, i.emoji, excerpt(m)), { changes: [{ entity: 'message', id: m.id, after: { reaction: i.emoji } }] });
}

export async function pinPreview(tx: TenantTx, a: AuthzContext, i: ActionInput<typeof messagePin>): Promise<ActionPreview> {
  const { c, title, m } = await onMessage(tx, a, i.conversation_id, i.message_id);
  return preview('write', line(title, excerpt(m)), { changes: updated('conversation', c.id, { pinned_message_id: c.pinnedMessageId }, { pinned_message_id: i.pinned ? m.id : null }) });
}

export async function notePreview(tx: TenantTx, a: AuthzContext, i: ActionInput<typeof noteAdd>): Promise<ActionPreview> {
  const { title } = await target(tx, a, i.conversation_id);
  return preview('write', line(title, clip(i.text)), { changes: [created('note', { text: i.text, mentions: i.mentions?.length ? i.mentions : undefined })] });
}
