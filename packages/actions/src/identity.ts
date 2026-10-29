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
