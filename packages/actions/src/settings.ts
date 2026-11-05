// identity / settings (Blueprint §3.4 identity · settings; §7.2 settings registry). Prototype L5754–7421.
// Thành viên, workspace, giờ làm việc, SLA mặc định, thông báo cá nhân. Vai trò tuỳ biến / nhóm (role.* / team.*) ở authz.ts (TIP-042).
import { z } from 'zod';
import { defineAction } from './define';

// Bốn vai trò hệ thống (trừ Chủ sở hữu) hoặc vai trò tuỳ biến `custom:*` (TIP-042) — handler kiểm vai trò còn sống trong tenant + không vượt quyền người gán.
const ROLE = z.union([z.enum(['manager', 'sales', 'cs', 'accountant']), z.string().regex(/^custom:[0-9a-f-]{36}$/)]);
const HHMM = z.string().regex(/^\d{2}:\d{2}$/);

export const workspaceUpdate = defineAction({
  id: 'workspace.update',
  module: 'settings',
  title: 'actions.workspace.update.title',
  description:
    'Update workspace general info and locale settings. Example: {"name":"Spa Hương Sen","tax_code":"0312345678","timezone":"Asia/Ho_Chi_Minh"}',
  input: z.object({
    name: z.string().trim().min(1).max(120).optional(),
    website: z.string().max(200).optional(),
    tax_code: z.string().max(20).optional(),
    address: z.string().max(300).optional(),
    support_phone: z.string().max(20).optional(),
    admin_email: z.string().email().optional(),
    locale: z.enum(['vi', 'en']).optional(),
    timezone: z.string().max(60).optional(),
    date_format: z.enum(['DD/MM/YYYY', 'YYYY-MM-DD', 'MM/DD/YYYY']).optional(),
  }),
  output: z.object({ workspace_id: z.string() }),
  permission: 'settings.manage',
  risk: 'config',
  agentGrantable: false,
  invalidates: ['workspace'],
  db: 'platform',
});

export const memberInvite = defineAction({
  id: 'member.invite',
  module: 'settings',
  title: 'actions.member.invite.title',
  description: 'Invite a member by email with a system role or a custom role key (custom:…). Example: {"email":"lan@spa.vn","role":"sales"}',
  input: z.object({ email: z.string().email(), name: z.string().max(120).optional(), role: ROLE }),
  output: z.object({ invite_id: z.string() }),
  permission: 'members.manage',
  risk: 'send',
  agentGrantable: false,
  invalidates: ['members'],
  db: 'platform',
});

export const inviteRevoke = defineAction({
  id: 'invite.revoke',
  module: 'settings',
  title: 'actions.invite.revoke.title',
  description: 'Revoke a pending invite. Example: {"invite_id":"inv_1"}',
  input: z.object({ invite_id: z.string().min(1) }),
  output: z.object({ ok: z.boolean() }),
  permission: 'members.manage',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['members'],
  db: 'platform',
});

export const memberSetRole = defineAction({
  id: 'member.set_role',
  module: 'settings',
  title: 'actions.member.set_role.title',
  description: 'Change the role of a member — system role or custom role key (custom:…); the owner role cannot be assigned here. Example: {"user_id":"u_2","role":"manager"}',
  input: z.object({ user_id: z.string().min(1), role: ROLE }),
  output: z.object({ user_id: z.string(), role: z.string() }),
  permission: 'members.manage',
  risk: 'config',
  agentGrantable: false,
  undo: { windowSec: 86_400 },
  invalidates: ['members'],
  db: 'platform',
});

export const memberRemove = defineAction({
  id: 'member.remove',
  module: 'settings',
  title: 'actions.member.remove.title',
  description: 'Remove a member from the workspace; their records stay and must be reassigned. Example: {"user_id":"u_6"}',
  input: z.object({ user_id: z.string().min(1) }),
  output: z.object({ ok: z.boolean() }),
  permission: 'members.manage',
  risk: 'delete',
  agentGrantable: false,
  invalidates: ['members'],
  db: 'platform',
});

export const workingHoursUpdate = defineAction({
  id: 'working_hours.update',
  module: 'settings',
  title: 'actions.working_hours.update.title',
  description:
    'Set human working hours per weekday (0 = Monday) and whether the human SLA clock pauses outside them. Example (days = 7 entries, 0 = Monday): {"days":[{"day":0,"on":true,"from":"08:00","to":"18:00"},{"day":1,"on":true,"from":"08:00","to":"18:00"},{"day":2,"on":true,"from":"08:00","to":"18:00"},{"day":3,"on":true,"from":"08:00","to":"18:00"},{"day":4,"on":true,"from":"08:00","to":"18:00"},{"day":5,"on":true,"from":"08:00","to":"18:00"},{"day":6,"on":false,"from":"08:00","to":"18:00"}],"pause_sla":true}',
  input: z.object({
    days: z.array(z.object({ day: z.number().int().min(0).max(6), on: z.boolean(), from: HHMM, to: HHMM })).length(7),
    pause_sla: z.boolean(),
  }),
  output: z.object({ ok: z.boolean() }),
  permission: 'settings.manage',
  risk: 'config',
  agentGrantable: false,
  invalidates: ['settings'],
  db: 'platform',
});

export const slaUpdateDefault = defineAction({
  id: 'sla.update_default',
  module: 'support',
  title: 'actions.sla.update_default.title',
  description:
    'Update the default SLA policy (minutes; 0 = immediate): first response and resolution for AI and humans, and escalation rules. Example: {"frt_human":15,"ttr_human":480,"escalation":{"vip_wait":true}}',
  input: z.object({
    /** 0 = tức thì / không áp dụng (prototype L7616). */
    frt_ai: z.number().int().min(0).max(1440).optional(),
    frt_human: z.number().int().min(1).max(10_080).optional(),
    ttr_ai: z.number().int().min(0).max(10_080).optional(),
    ttr_human: z.number().int().min(1).max(43_200).optional(),
    /** Quy tắc leo thang bật / tắt — `sla_policy.escalation` (Blueprint §2). */
    escalation: z.partialRecord(z.enum(['warn_80', 'frt_breach', 'ttr_breach', 'ai_low', 'vip_wait']), z.boolean()).optional(),
  }),
  output: z.object({ ok: z.boolean() }),
  permission: 'sla.manage',
  risk: 'config',
  agentGrantable: false,
  invalidates: ['settings', 'tickets'],
});

export const notificationUpdatePrefs = defineAction({
  id: 'notification.update_prefs',
  module: 'notifications',
  title: 'actions.notification.update_prefs.title',
  description:
    'Update the current user notification preferences: per-event channels, do-not-disturb, sound, digest. Example: {"events":{"msg_new":{"desktop":true,"email":false,"mobile":true}},"digest":"daily"}',
  input: z.object({
    events: z.record(z.string(), z.object({ desktop: z.boolean(), email: z.boolean(), mobile: z.boolean() })).optional(),
    dnd: z.object({ on: z.boolean(), from: HHMM, to: HHMM }).optional(),
    sound: z.boolean().optional(),
    digest: z.enum(['off', 'daily', 'weekly']).optional(),
  }),
  output: z.object({ ok: z.boolean() }),
  permission: 'self',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['me'],
  db: 'platform',
});
