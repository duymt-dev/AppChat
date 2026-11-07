// Workspace ở Quản trị nền tảng (TIP-040 pha 4, DC-373): tạm dừng / mở lại. platform_admin, db platform, không cấp agent, risk config,
// CAS `if_version` (= workspace.status_version). Không có xoá / lưu trữ / khôi phục ở đây (TIP-041).
import { z } from 'zod';
import { defineAction } from './define';

export const adminWorkspaceSuspend = defineAction({
  id: 'admin.workspace.suspend',
  module: 'settings',
  title: 'actions.admin.workspace.suspend.title',
  description: 'Platform admin: suspend a workspace (no new logins to its data, AI steps or outbound messages; data is kept). Example: {"workspace_id":"0190f000-0000-7000-8000-000000000001","if_version":0,"reason":"payment dispute"}',
  input: z.object({ workspace_id: z.string().uuid(), if_version: z.number().int().min(0), reason: z.string().trim().min(3).max(300) }).strict(),
  output: z.object({ workspace_id: z.string(), status: z.literal('suspended'), version: z.number().int() }),
  permission: 'platform_admin',
  risk: 'config',
  agentGrantable: false,
  invalidates: ['admin'],
  db: 'platform',
});

export const adminWorkspaceResume = defineAction({
  id: 'admin.workspace.resume',
  module: 'settings',
  title: 'actions.admin.workspace.resume.title',
  description: 'Platform admin: resume a suspended workspace once its database is verified ready. Does not restore archived workspaces. Example: {"workspace_id":"0190f000-0000-7000-8000-000000000001","if_version":1}',
  input: z.object({ workspace_id: z.string().uuid(), if_version: z.number().int().min(0) }).strict(),
  output: z.object({ workspace_id: z.string(), status: z.literal('active'), version: z.number().int() }),
  permission: 'platform_admin',
  risk: 'config',
  agentGrantable: false,
  invalidates: ['admin'],
  db: 'platform',
});
