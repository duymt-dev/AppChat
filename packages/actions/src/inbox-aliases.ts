// Alias tường minh của Hộp thư (TIP-025b §C.4): tên "bỏ" cho thao tác vốn là cờ bật / tắt — model / người đọc không phải đoán `hidden:false`.
// Cùng quyền / rủi ro / agentGrantable / undo với action gốc; handler dùng chung luật ghi của action gốc (không gọi lồng executor). Gỡ là
// trạng thái mong muốn: chưa có thì không làm gì (không bao giờ bật lại do bấm lặp).
import { z } from 'zod';
import { defineAction } from './define';

const convId = z.string().min(1);

export const conversationUnhide = defineAction({
  id: 'conversation.unhide',
  module: 'inbox',
  title: 'actions.conversation.unhide.title',
  description: 'Show a hidden conversation in the list again (same as conversation.hide with hidden:false). Example: {"conversation_id":"c_lan"}',
  input: z.object({ conversation_id: convId }),
  output: z.object({ hidden: z.literal(false) }),
  permission: 'inbox.reply',
  risk: 'write',
  agentGrantable: false,
  undo: { windowSec: 86_400 },
  invalidates: ['inbox'],
});

export const conversationUntag = defineAction({
  id: 'conversation.untag',
  module: 'inbox',
  title: 'actions.conversation.untag.title',
  description: 'Remove one tag from a conversation; other tags (even ones added meanwhile) stay. Example: {"conversation_id":"c_lan","tag":"VIP"}',
  input: z.object({ conversation_id: convId, tag: z.string().min(1).max(40) }),
  output: z.object({ tags: z.array(z.string()) }),
  permission: 'inbox.reply',
  risk: 'write',
  agentGrantable: true,
  undo: { windowSec: 86_400 },
  invalidates: ['inbox'],
});

export const messageUnpin = defineAction({
  id: 'message.unpin',
  module: 'inbox',
  title: 'actions.message.unpin.title',
  description: 'Unpin a pinned message of a conversation (same as message.pin with pinned:false). Example: {"conversation_id":"c_lan","message_id":"m7"}',
  input: z.object({ conversation_id: convId, message_id: z.string().min(1) }),
  output: z.object({ pinned: z.literal(false) }),
  permission: 'inbox.reply',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['inbox'],
});

export const messageUnreact = defineAction({
  id: 'message.unreact',
  module: 'inbox',
  title: 'actions.message.unreact.title',
  description:
    'Remove the current reaction on a message (no reaction → nothing happens; never adds one). On Zalo it is applied after the provider confirms (202 job_accepted). Example: {"conversation_id":"c_lan","message_id":"m7"}',
  input: z.object({ conversation_id: convId, message_id: z.string().min(1) }),
  output: z.object({ emoji: z.null() }),
  permission: 'inbox.reply',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['inbox'],
});
