// identity / settings actions dùng ở shell (Blueprint §3.4). Domain khác thêm ở file riêng theo TIP.
import { z } from 'zod';
import { defineAction } from './define';

export const notificationMarkRead = defineAction({
  id: 'notification.mark_read',
  module: 'notifications',
  title: 'actions.notification.mark_read.title',
  description: 'Mark in-app notifications of the current user as read. Example: {"ids":"all"}',
  input: z.object({ ids: z.union([z.literal('all'), z.array(z.string()).min(1)]) }),
  output: z.object({ updated: z.number().int() }),
  permission: 'self',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['notifications'],
});

export const profileUpdate = defineAction({
  id: 'profile.update',
  module: 'identity',
  title: 'actions.profile.update.title',
  description: 'Update the current user profile (name, phone, locale). Example: {"locale":"en"}',
  input: z.object({
    name: z.string().min(1).max(120).optional(),
    phone: z.string().max(20).optional(),
    locale: z.string().min(2).max(10).optional(),
  }),
  output: z.object({ user_id: z.string() }),
  permission: 'self',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['me'],
  db: 'platform',
});

export const workspaceSwitch = defineAction({
  id: 'workspace.switch',
  module: 'identity',
  title: 'actions.workspace.switch.title',
  description: 'Switch the active workspace of the current session. Example: {"workspace_id":"…"}',
  input: z.object({ workspace_id: z.string().min(1) }),
  output: z.object({ workspace_id: z.string() }),
  permission: 'self',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['*'],
  db: 'platform',
  uiTarget: () => ({ type: 'navigate', route: '/dashboard' }),
});

/**
 * Đổi Chủ sở hữu (TIP-045b annex A3) — bước 1: gửi OTP tới email đã xác minh của Owner hiện tại, gắn với người nhận + phiên bản quyền.
 * Chỉ chính Owner (`workspace.owner_user_id`) gọi được từ UI; không agent / Trợ lý.
 */
export const workspaceRequestTransferOtp = defineAction({
  id: 'workspace.request_transfer_otp',
  module: 'settings',
  title: 'actions.workspace.request_transfer_otp.title',
  description: 'Owner only, UI only: email a one-time code to the current Owner to confirm transferring ownership to an active member. Never agent-run.',
  input: z.object({ to_user_id: z.string().min(1) }),
  output: z.object({ sent_to: z.string(), expires_at: z.string() }),
  permission: 'workspace.transfer_ownership',
  risk: 'config',
  agentGrantable: false,
  invalidates: [],
  db: 'platform',
});

/** Bước 2: xác nhận OTP → đổi Owner nguyên tử (Owner cũ thành manager). Không hoàn tác chung — đổi lại là một lần chuyển có OTP khác. */
export const workspaceTransferOwnership = defineAction({
  id: 'workspace.transfer_ownership',
  module: 'settings',
  title: 'actions.workspace.transfer_ownership.title',
  description: 'Owner only, UI only: transfer workspace ownership to an active member with the emailed code; the former Owner becomes manager. Never agent-run.',
  input: z.object({ to_user_id: z.string().min(1), otp: z.string().regex(/^\d{6}$/) }),
  output: z.object({ owner_user_id: z.string(), previous_owner_role: z.literal('manager') }),
  permission: 'workspace.transfer_ownership',
  risk: 'config',
  agentGrantable: false,
  secret: { paths: ['otp'] },
  invalidates: ['members', 'me', 'workspace'],
  db: 'platform',
});
