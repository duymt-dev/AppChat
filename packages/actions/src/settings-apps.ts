// Cài đặt › Ứng dụng (Blueprint §3.4 inbox · channels · identity/integrations; D28). Prototype L5892–6267, L7184–7301.
// Thẻ, câu trả lời mẫu, kênh kết nối, web widget, nền tảng kết nối (connector theo manifest, thẻ "Sắp có").
import { z } from 'zod';
import { defineAction } from './define';

const TAG = z.object({ name: z.string().trim().min(1).max(40), description: z.string().max(200).optional(), color: z.string().max(20).optional() });
const REPLY = z.object({
  shortcut: z.string().regex(/^\/[a-z0-9_-]{1,30}$/),
  title: z.string().trim().min(1).max(80),
  body: z.string().trim().min(1).max(2000),
  category: z.string().trim().min(1).max(40),
});

export const tagCreate = defineAction({
  id: 'tag.create',
  module: 'inbox',
  title: 'actions.tag.create.title',
  description: 'Create a tag usable on conversations and contacts. Example: {"name":"VIP","description":"Khách chi tiêu cao"}',
  input: TAG,
  output: z.object({ tag_id: z.string() }),
  permission: 'inbox.manage',
  risk: 'config',
  agentGrantable: false,
  invalidates: ['tags'],
});

export const tagUpdate = defineAction({
  id: 'tag.update',
  module: 'inbox',
  title: 'actions.tag.update.title',
  description: 'Rename or re-describe a tag. Example: {"tag_id":"tg_1","name":"Khách VIP"}',
  input: TAG.partial().extend({ tag_id: z.string().min(1) }),
  output: z.object({ tag_id: z.string() }),
  permission: 'inbox.manage',
  risk: 'config',
  agentGrantable: false,
  invalidates: ['tags'],
});

export const tagDelete = defineAction({
  id: 'tag.delete',
  module: 'inbox',
  title: 'actions.tag.delete.title',
  description: 'Delete a tag; it is removed from all conversations and contacts. Example: {"tag_id":"tg_1"}',
  input: z.object({ tag_id: z.string().min(1) }),
  output: z.object({ ok: z.boolean() }),
  permission: 'inbox.manage',
  risk: 'delete',
  agentGrantable: false,
  undo: { windowSec: 86_400 },
  invalidates: ['tags'],
});

export const cannedReplyCreate = defineAction({
  id: 'canned_reply.create',
  module: 'inbox',
  title: 'actions.canned_reply.create.title',
  description: 'Create a canned reply used with "/" in the composer. Example: {"shortcut":"/gia","title":"Báo giá","body":"Dạ…","category":"Bán hàng"}',
  input: REPLY,
  output: z.object({ reply_id: z.string() }),
  permission: 'inbox.manage',
  risk: 'config',
  agentGrantable: false,
  invalidates: ['replies'],
});

export const cannedReplyUpdate = defineAction({
  id: 'canned_reply.update',
  module: 'inbox',
  title: 'actions.canned_reply.update.title',
  description: 'Update a canned reply. Example: {"reply_id":"rp_1","body":"Dạ em gửi…"}',
  input: REPLY.partial().extend({ reply_id: z.string().min(1) }),
  output: z.object({ reply_id: z.string() }),
  permission: 'inbox.manage',
  risk: 'config',
  agentGrantable: false,
  invalidates: ['replies'],
});

export const cannedReplyDelete = defineAction({
  id: 'canned_reply.delete',
  module: 'inbox',
  title: 'actions.canned_reply.delete.title',
  description: 'Delete a canned reply. Example: {"reply_id":"rp_1"}',
  input: z.object({ reply_id: z.string().min(1) }),
  output: z.object({ ok: z.boolean() }),
  permission: 'inbox.manage',
  risk: 'delete',
  agentGrantable: false,
  undo: { windowSec: 86_400 },
  invalidates: ['replies'],
});

export const channelZaloStartLogin = defineAction({
  id: 'channel.zalo.start_login',
  module: 'channels',
  title: 'actions.channel.zalo.start_login.title',
  description: 'Start connecting a personal Zalo account; returns a QR code to scan with the Zalo app. Example: {}',
  input: z.object({ label: z.string().max(60).optional() }),
  output: z.object({ channel_id: z.string(), qr: z.string() }),
  permission: 'channels.manage',
  risk: 'config',
  agentGrantable: false,
  invalidates: ['channels'],
});

export const channelEmailConnect = defineAction({
  id: 'channel.email.connect',
  module: 'channels',
  title: 'actions.channel.email.connect.title',
  description: 'Connect a support mailbox (forwarding address). Example: {"address":"hotro@spa.vn","name":"Hỗ trợ"}',
  input: z.object({ address: z.string().email(), name: z.string().max(60).optional() }),
  output: z.object({ channel_id: z.string() }),
  permission: 'channels.manage',
  risk: 'config',
  agentGrantable: false,
  invalidates: ['channels'],
});

export const channelReconnect = defineAction({
  id: 'channel.reconnect',
  module: 'channels',
  title: 'actions.channel.reconnect.title',
  description: 'Reconnect a channel whose session expired. Example: {"channel_id":"ch_zalo_1"}',
  input: z.object({ channel_id: z.string().min(1) }),
  output: z.object({ channel_id: z.string(), status: z.string() }),
  permission: 'channels.manage',
  risk: 'config',
  agentGrantable: false,
  invalidates: ['channels'],
});

export const channelDisconnect = defineAction({
  id: 'channel.disconnect',
  module: 'channels',
  title: 'actions.channel.disconnect.title',
  description: 'Disconnect a channel; history is kept, new messages stop. Example: {"channel_id":"ch_zalo_1"}',
  input: z.object({ channel_id: z.string().min(1) }),
  output: z.object({ ok: z.boolean() }),
  permission: 'channels.manage',
  risk: 'delete',
  agentGrantable: false,
  invalidates: ['channels'],
});

export const webchatUpdateWidget = defineAction({
  id: 'webchat.update_widget',
  module: 'channels',
  title: 'actions.webchat.update_widget.title',
  description:
    'Update the website chat widget: display name, greeting, AI chat, pre-chat form, handoff threshold, reply mode, tone. Example: {"name":"Trợ lý Hương Sen","handoff":70}',
  input: z.object({
    name: z.string().trim().min(1).max(40).optional(),
    greeting: z.string().max(300).optional(),
    ai_chat: z.boolean().optional(),
    prechat: z.boolean().optional(),
    agent_id: z.string().optional(),
    handoff: z.number().int().min(50).max(95).optional(),
    tone: z.enum(['friendly', 'professional', 'luxury']).optional(),
    mode: z.enum(['ai', 'human', 'hybrid']).optional(),
  }),
  output: z.object({ ok: z.boolean() }),
  permission: 'channels.manage',
  risk: 'config',
  agentGrantable: false,
  invalidates: ['channels'],
});

export const integrationConnect = defineAction({
  id: 'integration.connect',
  module: 'integrations',
  title: 'actions.integration.connect.title',
  description: 'Connect a provider from the connector registry with the fields its manifest asks for. Example: {"provider":"sepay","fields":{"api_key":"…"}}',
  input: z.object({ provider: z.string().min(1), fields: z.record(z.string(), z.string()) }),
  output: z.object({ connection_id: z.string(), status: z.string() }),
  permission: 'integrations.manage',
  risk: 'config',
  agentGrantable: false,
  invalidates: ['integrations'],
});

export const integrationDisconnect = defineAction({
  id: 'integration.disconnect',
  module: 'integrations',
  title: 'actions.integration.disconnect.title',
  description: 'Disconnect a connected provider. Example: {"provider":"sepay"}',
  input: z.object({ provider: z.string().min(1) }),
  output: z.object({ ok: z.boolean() }),
  permission: 'integrations.manage',
  risk: 'delete',
  agentGrantable: false,
  invalidates: ['integrations'],
});

export const integrationRegisterInterest = defineAction({
  id: 'integration.register_interest',
  module: 'integrations',
  title: 'actions.integration.register_interest.title',
  description: 'Register interest in a connector marked "coming soon". Example: {"provider":"misa"}',
  input: z.object({ provider: z.string().min(1) }),
  output: z.object({ ok: z.boolean() }),
  permission: 'integrations.manage',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['integrations'],
});
