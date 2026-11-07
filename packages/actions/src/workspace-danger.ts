// Vùng nguy hiểm của Owner (TIP-041 pha 3, DC-245, DC-376): xoá workspace có xác thực bước hai + yêu cầu đóng băng (admin nền tảng duyệt).
// Ngữ cảnh lifecycle (membership ở DB nền tảng — chạy được cả khi DB tenant đã lưu trữ); Owner kiểm trực tiếp `workspace.owner_user_id`,
// không theo tên vai trò / quyền uỷ. Không cấp agent / Trợ lý, chỉ nguồn UI. Admin nền tảng KHÔNG xoá thay Owner bằng các action này.
import { z } from 'zod';
import { defineAction } from './define';

const UUID = '0190f000-0000-7000-8000-000000000001';

/** Bước 1: Owner xin mã OTP xoá (gắn băm bản xem trước + status_version) — mã gửi email đã xác minh của Owner, hạn 5 phút. */
export const workspaceDeleteChallenge = defineAction({
  id: 'workspace.delete_challenge',
  module: 'settings',
  title: 'actions.workspace.delete_challenge.title',
  description: `Owner only, UI only: email a 5-minute code to confirm deleting this workspace; bound to the current delete preview. Never agent-run. Example: {"confirm_name":"Spa Hoa Mai"}`,
  input: z.object({ confirm_name: z.string().trim().min(1).max(120) }).strict(),
  output: z.object({ challenge_id: z.string(), sent_to: z.string(), expires_at: z.string(), preview_hash: z.string() }),
  permission: 'self',
  risk: 'config',
  agentGrantable: false,
  invalidates: [],
  db: 'platform',
});

/**
 * Bước 2: xác nhận mã → lệnh xoá bền (sao lưu mã hoá giữ 30 ngày → DROP → tombstone). Không hoàn tiền tự động (DC-376): Owner xác nhận đã
 * hiểu phần gói / Credit còn lại sẽ mất; hoá đơn / sổ ví / audit giữ nguyên.
 */
export const workspaceDelete = defineAction({
  id: 'workspace.delete',
  module: 'settings',
  title: 'actions.workspace.delete.title',
  description: `Owner only, UI only: delete this workspace with the emailed code (encrypted backup kept 30 days, then purged). No automatic refund. Never agent-run. Example: {"challenge_id":"${UUID}","otp":"123456","acknowledge_loss":true}`,
  input: z.object({ challenge_id: z.string().uuid(), otp: z.string().regex(/^\d{6}$/), acknowledge_loss: z.literal(true) }).strict(),
  output: z.object({ workspace_id: z.string(), job_id: z.string(), db_status: z.literal('deleting'), backup_expires_on: z.string() }),
  permission: 'self',
  risk: 'delete',
  agentGrantable: false,
  secret: { paths: ['otp'] },
  invalidates: ['session', 'me'],
  db: 'platform',
});

/** Owner gửi yêu cầu đóng băng (tạm dừng) cho admin nền tảng — không tự tạm dừng. Một yêu cầu chờ mỗi workspace. */
export const workspaceFreezeRequest = defineAction({
  id: 'workspace.freeze_request',
  module: 'settings',
  title: 'actions.workspace.freeze_request.title',
  description: 'Owner only, UI only: ask the platform team to freeze (suspend) this workspace; the team approves or rejects. Never agent-run. Example: {"reason":"Tạm nghỉ kinh doanh 2 tháng"}',
  input: z.object({ reason: z.string().trim().min(3).max(500) }).strict(),
  output: z.object({ request_id: z.string(), status: z.literal('pending') }),
  permission: 'self',
  risk: 'config',
  agentGrantable: false,
  invalidates: ['workspace-lifecycle'],
  db: 'platform',
});

/** Admin nền tảng quyết định yêu cầu đóng băng: approve → tạm dừng workspace (luồng 040, CAS); reject → không đổi workspace. */
export const adminWorkspaceFreezeDecide = defineAction({
  id: 'admin.workspace.freeze_decide',
  module: 'settings',
  title: 'actions.admin.workspace.freeze_decide.title',
  description: `Platform admin: approve (suspends the workspace) or reject an Owner freeze request. Example: {"request_id":"${UUID}","if_version":1,"decision":"approve","reason":"Owner xác nhận qua điện thoại"}`,
  input: z
    .object({ request_id: z.string().uuid(), if_version: z.number().int().min(1), decision: z.enum(['approve', 'reject']), reason: z.string().trim().min(3).max(300) })
    .strict(),
  output: z.object({ request_id: z.string(), status: z.enum(['approved', 'rejected', 'cancelled']), version: z.number().int() }),
  permission: 'platform_admin',
  risk: 'config',
  agentGrantable: false,
  invalidates: ['admin'],
  db: 'platform',
});
