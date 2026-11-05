// Action đọc Hộp thư cho Trợ lý / agent (TIP-023b R2 · DC-224): `conversation.search` / `conversation.get` (≤ 20 tin gần nhất, tin đã
// thu hồi / xoá không trả nội dung) và `tag.search`. Cùng repo + scope màn Hộp thư; ngoài scope → NOT_FOUND. Không trả tệp đính kèm / URL.
import { z } from 'zod';
import { defineAction } from '../define';

const convHit = z.object({
  id: z.string(),
  title: z.string(),
  channel: z.string(),
  contact_id: z.string().nullable(),
  status: z.string(),
  assignee_user_id: z.string().nullable(),
  unread: z.number().int(),
  last_message_at: z.string(),
});

export const conversationSearch = defineAction({
  id: 'conversation.search',
  module: 'inbox',
  title: 'actions.conversation.search.title',
  description: 'Find inbox conversations by customer name / text, folder (all, mine, unread, needs_human, vip, complaint…) or channel. Returns conversation_id for message / conversation actions. Example: {"q":"Lan","folder":"unread"}',
  input: z.object({
    q: z.string().trim().max(120).optional(),
    folder: z.enum(['all', 'mine', 'unread', 'mention', 'team', 'ai_running', 'ai_pending_approval', 'needs_human', 'archived', 'closed', 'vip', 'complaint']).optional(),
    channel: z.enum(['zalo_personal', 'webchat', 'email']).optional(),
    contact_id: z.string().optional(),
    limit: z.number().int().min(1).max(20).optional(),
  }),
  output: z.object({ conversations: z.array(convHit) }),
  permission: 'inbox.view',
  risk: 'read',
  agentGrantable: true,
  invalidates: [],
});

export const conversationGet = defineAction({
  id: 'conversation.get',
  module: 'inbox',
  title: 'actions.conversation.get.title',
  description: 'Get one conversation with its latest messages (up to 20, oldest first; recalled / deleted messages have no text). Example: {"conversation_id":"…","limit":10}',
  input: z.object({ conversation_id: z.string().min(1), limit: z.number().int().min(1).max(20).optional() }),
  output: convHit.extend({
    messages: z.array(z.object({ id: z.string(), direction: z.string().nullable(), sender: z.string(), kind: z.string(), text: z.string(), at: z.string() })),
  }),
  permission: 'inbox.view',
  risk: 'read',
  agentGrantable: true,
  invalidates: [],
  uiTarget: (o) => ({ type: 'open', entity: 'conversation', id: o.id, view: 'page' }),
});

export const tagSearch = defineAction({
  id: 'tag.search',
  module: 'inbox',
  title: 'actions.tag.search.title',
  description: 'Find tags (shared by customers and conversations) by name, no accents needed; returns tag_id. Example: {"q":"vip"}',
  input: z.object({ q: z.string().trim().max(60).optional(), limit: z.number().int().min(1).max(20).optional() }),
  output: z.object({ tags: z.array(z.object({ id: z.string(), name: z.string(), scope: z.string() })) }),
  permission: 'inbox.view',
  risk: 'read',
  agentGrantable: true,
  invalidates: [],
});
