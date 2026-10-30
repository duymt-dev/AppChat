// Hộp thư (Blueprint §3.4 inbox). Prototype L1505–2226. `message.delete` / `conversation.clear_history` chưa có trong §3.4 — đề xuất bổ sung (Completion Report F2).
import { z } from 'zod';
import { defineAction } from './define';

const convId = z.string().min(1);

export const conversationMarkRead = defineAction({
  id: 'conversation.mark_read',
  module: 'inbox',
  title: 'actions.conversation.mark_read.title',
  description: 'Mark a conversation as read for the current user. Example: {"conversation_id":"c_lan"}',
  input: z.object({ conversation_id: convId }),
  output: z.object({ unread_count: z.number().int() }),
  permission: 'inbox.view',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['inbox'],
});

export const conversationSetStatus = defineAction({
  id: 'conversation.set_status',
  module: 'inbox',
  title: 'actions.conversation.set_status.title',
  description: 'Close, reopen or snooze a conversation. Example: {"conversation_id":"c_lan","status":"snoozed","snooze_hours":4}',
  input: z.object({ conversation_id: convId, status: z.enum(['open', 'pending', 'snoozed', 'closed']), snooze_hours: z.number().int().positive().optional() }),
  output: z.object({ status: z.string() }),
  permission: 'inbox.reply',
  risk: 'write',
  agentGrantable: true,
  undo: { windowSec: 86_400 },
  invalidates: ['inbox'],
});

export const conversationAssign = defineAction({
  id: 'conversation.assign',
  module: 'inbox',
  title: 'actions.conversation.assign.title',
  description: 'Assign a conversation to a team member or an AI Agent (exactly one of user_id / agent_id). Example: {"conversation_id":"c_lan","user_id":"u_tram"}',
  input: z
    .object({ conversation_id: convId, user_id: z.string().min(1).optional(), agent_id: z.string().min(1).optional() })
    .refine((v) => !!v.user_id !== !!v.agent_id, { message: 'exactly one of user_id / agent_id' }),
  output: z.object({ assignee_user_id: z.string().nullable(), assignee_agent_id: z.string().nullable() }),
  permission: 'inbox.assign',
  risk: 'write',
  agentGrantable: true,
  undo: { windowSec: 86_400 },
  invalidates: ['inbox'],
});

export const conversationTag = defineAction({
  id: 'conversation.tag',
  module: 'inbox',
  title: 'actions.conversation.tag.title',
  description: 'Attach a tag to a conversation. Example: {"conversation_id":"c_lan","tag":"VIP"}',
  input: z.object({ conversation_id: convId, tag: z.string().min(1).max(40) }),
  output: z.object({ tags: z.array(z.string()) }),
  permission: 'inbox.reply',
  risk: 'write',
  agentGrantable: true,
  undo: { windowSec: 86_400 },
  invalidates: ['inbox'],
});

export const conversationPin = defineAction({
  id: 'conversation.pin',
  module: 'inbox',
  title: 'actions.conversation.pin.title',
  description: 'Pin or unpin the highlighted note of a conversation. Example: {"conversation_id":"c_lan","pinned":false}',
  input: z.object({ conversation_id: convId, pinned: z.boolean() }),
  output: z.object({ pinned: z.boolean() }),
  permission: 'inbox.reply',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['inbox'],
});

export const conversationArchive = defineAction({
  id: 'conversation.archive',
  module: 'inbox',
  title: 'actions.conversation.archive.title',
  description: 'Archive a conversation (hidden from the active folders). Example: {"conversation_id":"c_lan"}',
  input: z.object({ conversation_id: convId }),
  output: z.object({ archived: z.boolean() }),
  permission: 'inbox.reply',
  risk: 'write',
  agentGrantable: false,
  undo: { windowSec: 604_800 },
  invalidates: ['inbox'],
});

export const conversationSetAiMode = defineAction({
  id: 'conversation.set_ai_mode',
  module: 'inbox',
  title: 'actions.conversation.set_ai_mode.title',
  description: 'Switch the AI mode of a conversation: off, copilot (suggest) or auto. Example: {"conversation_id":"c_lan","ai_mode":"copilot"}',
  input: z.object({ conversation_id: convId, ai_mode: z.enum(['off', 'copilot', 'auto']) }),
  output: z.object({ ai_mode: z.string() }),
  permission: 'inbox.reply',
  risk: 'write',
  agentGrantable: false,
  undo: { windowSec: 86_400 },
  invalidates: ['inbox'],
});

export const conversationHandoff = defineAction({
  id: 'conversation.handoff',
  module: 'inbox',
  title: 'actions.conversation.handoff.title',
  description: 'Take over a conversation the AI handed off (status needs_human → assigned to me, AI paused). Example: {"conversation_id":"c_hieu"}',
  input: z.object({ conversation_id: convId }),
  output: z.object({ ai_state: z.string() }),
  permission: 'inbox.reply',
  risk: 'write',
  agentGrantable: true,
  invalidates: ['inbox'],
});

export const conversationClearHistory = defineAction({
  id: 'conversation.clear_history',
  module: 'inbox',
  title: 'actions.conversation.clear_history.title',
  description: 'Hide all past messages of a conversation from the AppChat view (channel history is untouched). Example: {"conversation_id":"c_lan"}',
  input: z.object({ conversation_id: convId }),
  output: z.object({ cleared: z.number().int() }),
  permission: 'inbox.manage',
  risk: 'delete',
  agentGrantable: false,
  undo: { windowSec: 86_400 },
  invalidates: ['inbox'],
});

export const messageSend = defineAction({
  id: 'message.send',
  module: 'inbox',
  title: 'actions.message.send.title',
  description: 'Send a text reply to the customer in a conversation through its channel. Example: {"conversation_id":"c_lan","text":"Dạ em chào chị"}',
  input: z.object({ conversation_id: convId, text: z.string().min(1).max(4000), reply_to_id: z.string().optional() }),
  output: z.object({ message_id: z.string() }),
  permission: 'inbox.reply',
  risk: 'send',
  agentGrantable: true,
  invalidates: ['inbox'],
});

export const messageRecall = defineAction({
  id: 'message.recall',
  module: 'inbox',
  title: 'actions.message.recall.title',
  description: 'Recall (unsend) a message on the channel when supported. Example: {"conversation_id":"c_lan","message_id":"m7"}',
  input: z.object({ conversation_id: convId, message_id: z.string().min(1) }),
  output: z.object({ recalled: z.boolean() }),
  permission: 'inbox.reply',
  risk: 'send',
  agentGrantable: false,
  invalidates: ['inbox'],
});

export const messageDelete = defineAction({
  id: 'message.delete',
  module: 'inbox',
  title: 'actions.message.delete.title',
  description: 'Delete a message from the AppChat view only (the customer still sees it). Example: {"conversation_id":"c_lan","message_id":"m3"}',
  input: z.object({ conversation_id: convId, message_id: z.string().min(1) }),
  output: z.object({ deleted: z.boolean() }),
  permission: 'inbox.reply',
  risk: 'delete',
  agentGrantable: false,
  undo: { windowSec: 86_400 },
  invalidates: ['inbox'],
});

export const messageReact = defineAction({
  id: 'message.react',
  module: 'inbox',
  title: 'actions.message.react.title',
  description: 'React to a message with an emoji; sending the same emoji again removes it. Example: {"conversation_id":"c_lan","message_id":"m7","emoji":"👍"}',
  input: z.object({ conversation_id: convId, message_id: z.string().min(1), emoji: z.enum(['👍', '❤️', '😂', '😮', '😢', '🙏']) }),
  output: z.object({ emoji: z.string().nullable() }),
  permission: 'inbox.reply',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['inbox'],
});

export const messagePin = defineAction({
  id: 'message.pin',
  module: 'inbox',
  title: 'actions.message.pin.title',
  description: 'Pin or unpin a message to the top of the conversation. Example: {"conversation_id":"c_lan","message_id":"m7","pinned":true}',
  input: z.object({ conversation_id: convId, message_id: z.string().min(1), pinned: z.boolean() }),
  output: z.object({ pinned: z.boolean() }),
  permission: 'inbox.reply',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['inbox'],
});

export const messageForward = defineAction({
  id: 'message.forward',
  module: 'inbox',
  title: 'actions.message.forward.title',
  description: 'Forward a message to another conversation. Example: {"conversation_id":"c_lan","message_id":"m7","target_conversation_id":"c_hieu"}',
  input: z.object({ conversation_id: convId, message_id: z.string().min(1), target_conversation_id: z.string().min(1) }),
  output: z.object({ message_id: z.string() }),
  permission: 'inbox.reply',
  risk: 'send',
  agentGrantable: false,
  invalidates: ['inbox'],
});

export const conversationSetTags = defineAction({
  id: 'conversation.set_tags',
  module: 'inbox',
  title: 'actions.conversation.set_tags.title',
  description: 'Replace a conversation tags with this exact list (multi-select). Example: {"conversation_id":"c_lan","tags":["VIP","Cần gọi lại"]}',
  input: z.object({ conversation_id: convId, tags: z.array(z.string().min(1).max(40)).max(20) }),
  output: z.object({ tags: z.array(z.string()) }),
  permission: 'inbox.reply',
  risk: 'write',
  agentGrantable: true,
  undo: { windowSec: 86_400 },
  invalidates: ['inbox'],
});

export const conversationHide = defineAction({
  id: 'conversation.hide',
  module: 'inbox',
  title: 'actions.conversation.hide.title',
  description: 'Hide (D50) or unhide a conversation from the list; a new incoming message unhides it automatically. Example: {"conversation_id":"c_lan","hidden":true}',
  input: z.object({ conversation_id: convId, hidden: z.boolean() }),
  output: z.object({ hidden: z.boolean() }),
  permission: 'inbox.reply',
  risk: 'write',
  agentGrantable: false,
  undo: { windowSec: 86_400 },
  invalidates: ['inbox'],
});

export const noteAdd = defineAction({
  id: 'note.add',
  module: 'inbox',
  title: 'actions.note.add.title',
  description: 'Add an internal note to a conversation (never sent to the customer). Example: {"conversation_id":"c_lan","text":"Khách hẹn chiều"}',
  input: z.object({ conversation_id: convId, text: z.string().min(1).max(4000) }),
  output: z.object({ message_id: z.string() }),
  permission: 'inbox.reply',
  risk: 'write',
  agentGrantable: false,
  undo: { windowSec: 86_400 },
  invalidates: ['inbox'],
});
