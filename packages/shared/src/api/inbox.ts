// Shape đọc Hộp thư (FE ↔ BE — gap-filling §5, TIP-016; Blueprint §4.4 inbox): GET /v1/conversations (cursor), /conversations/counts,
// /conversations/:id, /conversations/:id/messages (cursor — trang mới nhất trước, trong trang cũ → mới), /messages/search,
// /inbox/accounts, /inbox/channels, /inbox/connect-channels, /groups/:id, /canned-replies, /tags, /settings/tags, /settings/replies.
// Mock transport (apps/web) và API thật parse cùng các schema này.
import { z } from 'zod';

export const INBOX_FOLDERS = ['all', 'mine', 'unread', 'mention', 'team', 'ai_running', 'ai_pending_approval', 'needs_human', 'archived', 'closed', 'vip', 'complaint'] as const;
export type InboxFolder = (typeof INBOX_FOLDERS)[number];
/** Sắp xếp danh sách (TIP-025): mới nhất (keyset) · chưa đọc trước. Các khoá khác của FE (ưu tiên / VIP / SLA) = mới nhất. */
export const INBOX_SORTS = ['latest', 'unread'] as const;
export type InboxSort = (typeof INBOX_SORTS)[number];

export const CONV_TAG_TONES = ['vip', 'channel', 'hot', 'group', 'warn', 'ai', 'violet'] as const;
export const AI_STATES = ['idle', 'running', 'waiting_approval', 'handoff'] as const;
export const AI_MODES = ['off', 'copilot', 'auto'] as const;

const convTag = z.object({ label: z.string(), tone: z.enum(CONV_TAG_TONES) });

export const conversationSchema = z.object({
  id: z.string(),
  kind: z.enum(['direct', 'group']),
  title: z.string(),
  initials: z.string(),
  hue: z.string(),
  more: z.string().optional(),
  more_hue: z.string().optional(),
  channel: z.string(),
  /** Tên tài khoản kênh nhận tin. */
  account: z.string(),
  time: z.string(),
  preview: z.string(),
  preview_sender: z.string().optional(),
  tags: z.array(convTag),
  unread: z.number().int(),
  online: z.boolean().optional(),
  members: z.number().int().optional(),
  online_count: z.number().int().optional(),
  contact_id: z.string().nullable(),
  presence: z.string().optional(),
  pinned_note: z.string().optional(),
  pinned: z.boolean(),
  ai_state: z.enum(AI_STATES),
  ai_mode: z.enum(AI_MODES),
  handoff_reason: z.string().optional(),
  ai_draft: z.string().optional(),
  status: z.enum(['open', 'pending', 'snoozed', 'closed']),
  pinned_message_id: z.string().nullable().optional(),
  hidden: z.boolean().optional(),
  // Cột bổ sung của API thật (FE chưa dùng): lọc / gán / thời điểm.
  channel_account_id: z.string().optional(),
  assignee_user_id: z.string().nullable().optional(),
  assignee_agent_id: z.string().nullable().optional(),
  archived: z.boolean().optional(),
  last_message_at: z.string().optional(),
});
export type ConversationDto = z.infer<typeof conversationSchema>;

export const conversationsPageSchema = z.object({ data: z.array(conversationSchema), next_cursor: z.string().nullable() });

export const MESSAGE_KINDS = ['system', 'date', 'text', 'image', 'audio', 'ai_insight', 'sticker', 'card', 'file', 'typing', 'group_alert', 'note'] as const;

export const messageSchema = z.object({
  id: z.string(),
  kind: z.enum(MESSAGE_KINDS),
  direction: z.enum(['in', 'out']).optional(),
  body: z.string().optional(),
  time: z.string().optional(),
  status: z.string().optional(),
  menu: z.boolean().optional(),
  agent: z.boolean().optional(),
  sender: z.string().optional(),
  sender_initials: z.string().optional(),
  sender_hue: z.string().optional(),
  sender_color: z.string().optional(),
  title: z.string().optional(),
  sub: z.string().optional(),
  price: z.string().optional(),
  unit: z.string().optional(),
  meta: z.string().optional(),
  confidence: z.number().optional(),
  plain: z.boolean().optional(),
  recalled: z.boolean().optional(),
  deleted: z.boolean().optional(),
  reaction: z.string().nullable().optional(),
  /**
   * Thao tác kênh đang chờ / chưa rõ trên tin (TIP-014b): `recall` / `react` → trạng thái lệnh mới nhất chưa xác nhận. Vắng = không có
   * gì chờ. `recalled` chỉ true khi nhà cung cấp đã xác nhận.
   */
  provider_op: z.object({ recall: z.enum(['pending', 'failed', 'unknown', 'partial']).optional(), react: z.enum(['pending', 'failed', 'unknown']).optional() }).optional(),
  reply_to: z.object({ id: z.string(), preview: z.string() }).optional(),
  forwarded: z.boolean().optional(),
  /** Tệp / ảnh của tin (API thật). */
  attachments: z.array(z.object({ url: z.string(), mime: z.string(), name: z.string().optional(), size: z.number().optional() })).optional(),
});
export type MessageDto = z.infer<typeof messageSchema>;

export const threadSchema = z.object({
  data: z.array(messageSchema),
  next_cursor: z.string().nullable(),
  /** Gợi ý copilot — AI (TIP-022); tới lúc đó null. */
  suggestion: z.object({ text: z.string(), confidence: z.number() }).nullable(),
});

export const messageSearchSchema = z.array(
  z.object({ message_id: z.string(), body: z.string(), sender: z.enum(['contact', 'user', 'agent', 'system']), time: z.string(), ranges: z.array(z.tuple([z.number().int(), z.number().int()])) }),
);

const folderRow = z.tuple([z.string(), z.string(), z.number().int()]);
export const folderCountsSchema = z.object({
  tabs: z.array(z.tuple([z.string(), z.number().int(), z.enum(['brand', 'amber', 'violet']).nullable()])),
  mailbox: z.array(folderRow),
  ai: z.array(folderRow),
  channels: z.array(z.tuple([z.string(), z.number().int()])),
  saved: z.array(z.tuple([z.string(), z.number().int()])),
  synced: z.number().int(),
  empty: z.boolean().optional(),
});
export type FolderCountsDto = z.infer<typeof folderCountsSchema>;

export const inboxAccountsSchema = z.array(z.object({ id: z.string(), channel: z.string(), name: z.string(), count: z.number().int() }));
export const inboxChannelsSchema = z.record(z.string(), z.object({ label: z.string(), short: z.string(), color: z.string() }));
export const connectChannelsSchema = z.array(
  z.object({ type: z.string(), name: z.string(), tag: z.string(), status: z.enum(['ga', 'beta', 'coming_soon']), time: z.string(), short: z.string(), color: z.string(), cat: z.enum(['social', 'web']) }),
);

export const groupInfoSchema = z.object({
  members_total: z.number().int(),
  members_hint: z.string(),
  members: z.array(z.tuple([z.string(), z.string(), z.string(), z.string()])),
  pinned_sub: z.string(),
  media: z.array(z.tuple([z.string(), z.number(), z.string()])),
  files: z.array(z.tuple([z.string(), z.string(), z.string()])),
  links: z.array(z.tuple([z.string(), z.string()])),
  join_link: z.string(),
  unanswered: z.number().int(),
  ai_policy: z.enum(['mention', 'auto', 'off']),
});

export const cannedGroupsSchema = z.array(z.object({ group: z.string(), items: z.array(z.tuple([z.string(), z.string(), z.string()])) }));

export const tagOptionsSchema = z.array(z.object({ id: z.string(), name: z.string(), color: z.string(), emoji: z.string() }));

export const settingsTagSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
  emoji: z.string(),
  description: z.string(),
  count: z.number().int(),
  created_by: z.string(),
  source: z.string(),
  created_at: z.string(),
  updated_by: z.string().nullable(),
  updated_at: z.string(),
});
export const settingsTagsSchema = z.object({ data: z.array(settingsTagSchema), palette: z.array(z.string()) });
export const settingsRepliesSchema = z.array(z.object({ id: z.string(), category: z.string(), shortcut: z.string(), title: z.string(), body: z.string() }));

/** Bảng màu thẻ (Cài đặt › Thẻ — prototype tag_palette). */
export const TAG_PALETTE = ['#DC2626', '#F59E0B', '#2563EB', '#16A34A', '#7C3AED', '#0E9B94', '#DB2777', '#E8602C', '#6B7280', '#06B6D4'] as const;

/** Tông chip thẻ ở danh sách hội thoại theo màu thẻ (màu ngoài bảng → `channel`). */
export const CONV_TAG_TONE_OF: Record<string, (typeof CONV_TAG_TONES)[number]> = {
  '#DB2777': 'vip',
  '#DC2626': 'hot',
  '#E8602C': 'hot',
  '#F59E0B': 'warn',
  '#7C3AED': 'violet',
  '#16A34A': 'ai',
  '#0E9B94': 'ai',
};
