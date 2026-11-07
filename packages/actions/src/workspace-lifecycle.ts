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

/**
 * Thành viên mở workspace (TIP-041 §1 "workspace.open"): OnboardingGate gọi MỘT lần mỗi lần mở (idempotency key mỗi lần) — ghi mốc hoạt
 * động của chính workspace (không phải mọi workspace của user) và, nếu workspace đã lưu trữ, tạo lệnh khôi phục (gộp nhiều thành viên).
 * Ngữ cảnh lifecycle chỉ cần membership ở DB nền tảng — chạy được khi DB tenant đã DROP. Tạm dừng / đang xoá → không tự mở / khôi phục.
 */
export const workspaceOpen = defineAction({
  id: 'workspace.open',
  module: 'identity',
  title: 'actions.workspace.open.title',
  description: 'Record that the signed-in member opened this workspace (keeps it active) and request a restore if it is archived. UI only.',
  input: z.object({}).strict(),
  output: z.object({
    workspace_id: z.string(),
    db_status: z.string(),
    restore_job_id: z.string().nullable(),
  }),
  permission: 'self',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['session'],
  db: 'platform',
});
