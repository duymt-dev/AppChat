// Vòng đời workspace (TIP-041, Blueprint §2.0 bước 5, DC-245): lưu trữ (dump mã hoá + DROP) / khôi phục DB tenant. platform_admin, db
// platform, risk config, LUÔN xem trước (§2.0 bước 5), không cấp agent, CAS `if_version` (= workspace.status_version). Owner không tự lưu
// trữ (chỉ `workspace.delete` — pha sau); quản trị không tải bản dump thô.
import { z } from 'zod';
import { defineAction } from './define';

const job = z.object({ workspace_id: z.string(), job_id: z.string(), generation: z.number().int(), status: z.literal('pending'), version: z.number().int() });

export const adminWorkspaceArchive = defineAction({
  id: 'admin.workspace.archive',
  module: 'settings',
  title: 'actions.admin.workspace.archive.title',
  description:
    'Platform admin: archive a workspace database (encrypted verified backup, then the database is dropped; members restore it by opening the workspace). Always previews. Example: {"workspace_id":"0190f000-0000-7000-8000-000000000001","if_version":2,"reason":"inactive free plan"}',
  input: z.object({ workspace_id: z.string().uuid(), if_version: z.number().int().min(0), reason: z.string().trim().min(3).max(300) }).strict(),
  output: job,
  permission: 'platform_admin',
  risk: 'config',
  agentGrantable: false,
  invalidates: ['admin'],
  db: 'platform',
});

export const adminWorkspaceRestore = defineAction({
  id: 'admin.workspace.restore',
  module: 'settings',
  title: 'actions.admin.workspace.restore.title',
  description:
    'Platform admin: restore an archived workspace database from its latest verified archive (migrated to the current schema before it opens). Always previews. Example: {"workspace_id":"0190f000-0000-7000-8000-000000000001","if_version":3}',
  input: z.object({ workspace_id: z.string().uuid(), if_version: z.number().int().min(0) }).strict(),
  output: job,
  permission: 'platform_admin',
  risk: 'config',
  agentGrantable: false,
  invalidates: ['admin'],
  db: 'platform',
});
