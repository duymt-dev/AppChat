// Cài đặt › Ứng dụng (Blueprint §3.4 inbox · channels · identity/integrations; D28). Prototype L5892–6267, L7184–7301.
// Thẻ, câu trả lời mẫu, kênh kết nối, web widget, nền tảng kết nối (connector theo manifest, thẻ "Sắp có").
// profile_layout.*: bố cục Hồ sơ 360° theo mẫu & vai trò (REQ-F12, M05; prototype L690–735, L6397–6415).
import { z } from 'zod';
import { defineAction } from './define';

const TAG = z.object({ name: z.string().trim().min(1).max(40), description: z.string().max(200).optional(), color: z.string().max(20).optional(), emoji: z.string().max(8).optional() });
const ROLE_KEY = z.enum(['owner', 'manager', 'sales', 'cs', 'accountant']);
const LAYOUT_TAB = z.object({
  key: z.string().min(1),
  label: z.string().trim().min(1).max(40),
  enabled: z.boolean(),
  sort: z.number().int(),
  builtin: z.boolean(),
  blocks: z.array(z.string().min(1)).max(12),
});
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
  description: 'Start connecting a new personal Zalo account (one of possibly many); returns a QR code to scan with the Zalo app. Example: {}',
  input: z.object({ label: z.string().max(60).optional() }),
  output: z.object({ channel_account_id: z.string(), qr: z.string() }),
  permission: 'channels.manage',
  risk: 'config',
  agentGrantable: false,
  invalidates: ['channels'],
  // Hạn mức gói `max_channels` kiểm dưới khoá workspace ở DB nền tảng (như member.invite — TIP-014, DC-069).
  db: 'platform',
});

export const channelEmailConnect = defineAction({
  id: 'channel.email.connect',
  module: 'channels',
  title: 'actions.channel.email.connect.title',
  description:
    'Connect a new mailbox account (IMAP to receive, SMTP to send); the login is checked for real before saving. Example: {"address":"hotro@spa.vn","name":"Hỗ trợ","fields":{"imap_host":"imap.gmail.com","imap_port":"993","password":"app-password"}}',
  input: z.object({
    address: z.string().email(),
    name: z.string().max(60).optional(),
    /** Form IMAP / SMTP (emailFormSchema của @appchat/shared — chuỗi như form gửi). */
    fields: z.record(z.string(), z.string()),
  }),
  output: z.object({ channel_account_id: z.string() }),
  permission: 'channels.manage',
  risk: 'config',
  agentGrantable: false,
  invalidates: ['channels'],
  secret: { paths: ['fields.password'] },
  // Hạn mức gói `max_channels` dưới khoá workspace (như channel.zalo.start_login — DC-069).
  db: 'platform',
});

export const channelTest = defineAction({
  id: 'channel.test',
  module: 'channels',
  title: 'actions.channel.test.title',
  description:
    'Test a channel connection — either an existing account (channel_account_id) or a draft form before it is created (type + fields, e.g. email IMAP/SMTP). Example: {"type":"email","fields":{"imap_host":"imap.gmail.com"}}',
  input: z.union([
    z.object({ channel_account_id: z.string().min(1) }),
    z.object({ type: z.string().min(1), fields: z.record(z.string(), z.string()) }),
  ]),
  output: z.object({ ok: z.boolean(), message: z.string().optional() }),
  permission: 'channels.manage',
  risk: 'read',
  agentGrantable: false,
  invalidates: [],
  // Form nháp từ GenUI mang mật khẩu thật (TIP-023c G3) — che ở action_log / hash, model không được điền.
  secret: { paths: ['fields.password'] },
});

export const channelUpdateSettings = defineAction({
  id: 'channel.update_settings',
  module: 'channels',
  title: 'actions.channel.update_settings.title',
  description:
    'Update an account\'s auto-reply, assignment/SLA and sync settings. Example: {"channel_account_id":"acc_1","patch":{"ai_mode":"auto","agent_id":"ag_1"}}',
  input: z.object({
    channel_account_id: z.string().min(1),
    patch: z.object({
      name: z.string().trim().min(1).max(60).optional(),
      agent_id: z.string().optional(),
      ai_mode: z.enum(['auto', 'suggest', 'off']).optional(),
      hours: z.string().max(60).optional(),
      greeting: z.string().max(300).optional(),
      // Nhãn cũ (TIP-014): chỉ là bản chiếu tương thích — chia lead thật cấu hình qua `lead_routing.update` (TIP-042b). Không nhận `shift` mới.
      assign_mode: z.enum(['round_robin', 'least_busy']).optional(),
      sla_policy: z.string().max(60).optional(),
      sync_messages: z.boolean().optional(),
      sync_auto_create_contact: z.boolean().optional(),
    }),
  }),
  output: z.object({ ok: z.boolean() }),
  permission: 'channels.manage',
  risk: 'config',
  agentGrantable: false,
  invalidates: ['channels'],
});

export const channelPause = defineAction({
  id: 'channel.pause',
  module: 'channels',
  title: 'actions.channel.pause.title',
  description: 'Pause an account; it stops sending/receiving until resumed. Example: {"channel_account_id":"acc_1"}',
  input: z.object({ channel_account_id: z.string().min(1) }),
  output: z.object({ ok: z.boolean() }),
  permission: 'channels.manage',
  risk: 'config',
  agentGrantable: false,
  invalidates: ['channels'],
});

export const channelResume = defineAction({
  id: 'channel.resume',
  module: 'channels',
  title: 'actions.channel.resume.title',
  description: 'Resume a paused account. Example: {"channel_account_id":"acc_1"}',
  input: z.object({ channel_account_id: z.string().min(1) }),
  output: z.object({ ok: z.boolean() }),
  permission: 'channels.manage',
  risk: 'config',
  agentGrantable: false,
  invalidates: ['channels'],
});

export const channelSyncHistory = defineAction({
  id: 'channel.sync_history',
  module: 'channels',
  title: 'actions.channel.sync_history.title',
  description:
    'Re-sync an account\'s message history for the last N days (0 = off). On Zalo this is a background job (202 job_accepted) that reports the range the provider actually returned; history never triggers AI replies or notifications. Example: {"channel_account_id":"acc_1","history_days":30}',
  input: z.object({ channel_account_id: z.string().min(1), history_days: z.union([z.literal(0), z.literal(7), z.literal(30), z.literal(90)]) }),
  output: z.object({ ok: z.boolean() }),
  permission: 'channels.manage',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['channels'],
});

export const channelReconnect = defineAction({
  id: 'channel.reconnect',
  module: 'channels',
  title: 'actions.channel.reconnect.title',
  description: 'Reconnect an account whose session expired. Example: {"channel_account_id":"acc_1"}',
  input: z.object({ channel_account_id: z.string().min(1) }),
  output: z.object({ channel_account_id: z.string(), status: z.string() }),
  permission: 'channels.manage',
  risk: 'config',
  agentGrantable: false,
  invalidates: ['channels'],
});

export const channelDisconnect = defineAction({
  id: 'channel.disconnect',
  module: 'channels',
  title: 'actions.channel.disconnect.title',
  description:
    'Disconnect an account; history is kept, new messages stop. Disconnecting the last account of a channel type leaves it "not connected". Example: {"channel_account_id":"acc_1"}',
  input: z.object({ channel_account_id: z.string().min(1) }),
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
    'Update the website chat widget: turn it on/off, display name, greeting, colour, allowed domains, AI chat, pre-chat form, handoff threshold, reply mode, tone. The first call creates the widget (counts toward the plan channel limit). Example: {"name":"Trợ lý Hương Sen","handoff":70}',
  input: z.object({
    /** Bật / tắt widget (tắt = tạm dừng tài khoản webchat). Lần cập nhật đầu tiên tự bật. */
    enabled: z.boolean().optional(),
    name: z.string().trim().min(1).max(40).optional(),
    greeting: z.string().max(300).optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    /** Domain được nhúng (vd. `spa.vn`, `*.spa.vn`); rỗng = mọi domain. */
    allowed_domains: z.array(z.string().trim().toLowerCase().regex(/^(\*\.)?[a-z0-9-]+(\.[a-z0-9-]+)*(:\d+)?$/)).max(20).optional(),
    ai_chat: z.boolean().optional(),
    prechat: z.boolean().optional(),
    agent_id: z.string().optional(),
    handoff: z.number().int().min(50).max(95).optional(),
    tone: z.enum(['friendly', 'professional', 'brief']).optional(),
    mode: z.enum(['auto', 'human', 'hybrid']).optional(),
    ai_on: z.boolean().optional(),
    /** Nguồn kiến thức Agent được dùng (kb folder / nhóm). */
    knowledge_on: z.array(z.string().max(60)).max(30).optional(),
    /** Nghiệp vụ AI được tạo bản ghi từ hội thoại widget (lead, ticket, booking…). */
    collect_on: z.array(z.string().max(30)).max(10).optional(),
    actions: z.array(z.object({ key: z.string().max(30), on: z.boolean() })).max(10).optional(),
  }),
  output: z.object({ ok: z.boolean(), channel_account_id: z.string().optional(), public_key: z.string().optional() }),
  permission: 'channels.manage',
  risk: 'config',
  agentGrantable: false,
  // Bật widget lần đầu = thêm tài khoản kênh: khoá workspace + hạn mức gói + route ở DB nền tảng (như channel.zalo.start_login).
  db: 'platform',
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
  secret: { connector: { provider: 'provider', fields: 'fields' } },
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
  db: 'platform',
});

export const profileLayoutCreate = defineAction({
  id: 'profile_layout.create',
  module: 'settings',
  title: 'actions.profile_layout.create.title',
  description: 'Create a Hồ sơ 360° layout template (tabs + blocks per tab). Example: {"name":"Marketing","tabs":[{"key":"overview","label":"Tổng quan","enabled":true,"sort":0,"builtin":true,"blocks":[]}]}',
  input: z.object({ name: z.string().trim().min(1).max(60), tabs: z.array(LAYOUT_TAB).min(1) }),
  output: z.object({ layout_id: z.string() }),
  permission: 'settings.manage',
  risk: 'config',
  agentGrantable: false,
  invalidates: ['profile_layouts'],
});

export const profileLayoutUpdate = defineAction({
  id: 'profile_layout.update',
  module: 'settings',
  title: 'actions.profile_layout.update.title',
  description: 'Edit a layout\'s name or tabs (order, visibility, rename, blocks); at least one tab must stay enabled. Example: {"layout_id":"pl_1","patch":{"name":"Hồ sơ spa"}}',
  input: z.object({ layout_id: z.string().min(1), patch: z.object({ name: z.string().trim().min(1).max(60).optional(), tabs: z.array(LAYOUT_TAB).min(1).optional() }) }),
  output: z.object({ layout_id: z.string() }),
  permission: 'settings.manage',
  risk: 'config',
  agentGrantable: false,
  invalidates: ['profile_layouts'],
});

export const profileLayoutDuplicate = defineAction({
  id: 'profile_layout.duplicate',
  module: 'settings',
  title: 'actions.profile_layout.duplicate.title',
  description: 'Duplicate a layout template as a new, unassigned, non-system copy. Example: {"layout_id":"pl_1"}',
  input: z.object({ layout_id: z.string().min(1) }),
  output: z.object({ layout_id: z.string() }),
  permission: 'settings.manage',
  risk: 'config',
  agentGrantable: false,
  invalidates: ['profile_layouts'],
});

export const profileLayoutDelete = defineAction({
  id: 'profile_layout.delete',
  module: 'settings',
  title: 'actions.profile_layout.delete.title',
  description: 'Delete a non-system layout; roles assigned to it fall back to the default layout. Example: {"layout_id":"pl_2"}',
  input: z.object({ layout_id: z.string().min(1) }),
  output: z.object({ ok: z.boolean() }),
  permission: 'settings.manage',
  risk: 'delete',
  agentGrantable: false,
  invalidates: ['profile_layouts'],
});

export const profileLayoutAssignRole = defineAction({
  id: 'profile_layout.assign_role',
  module: 'settings',
  title: 'actions.profile_layout.assign_role.title',
  description: 'Assign a layout template to a system role (one template per role). Example: {"role":"cs","layout_id":"pl_2"}',
  input: z.object({ role: ROLE_KEY, layout_id: z.string().min(1) }),
  output: z.object({ role: z.string(), layout_id: z.string() }),
  permission: 'settings.manage',
  risk: 'config',
  agentGrantable: false,
  invalidates: ['profile_layouts'],
});
