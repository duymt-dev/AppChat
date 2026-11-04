// Audit workspace + AI audit (TIP-045b annex A2, Blueprint §4.4 settings) — hợp đồng FE ↔ BE của GET /v1/settings/audit và
// /v1/settings/ai-audit. Hai chế độ: KHÔNG tham số → mảng cũ (tương thích bản trước — DTO adapter); `?page=1` / `?cursor=` → trang 50
// dòng `{ data, next_cursor }`, thứ tự created_at DESC, id DESC. Dòng chỉ là chiếu an toàn (không input / kết quả thô, không prompt /
// nội dung tin, không mã / token): hành động = action_id + nhãn i18n, chủ thể = tên hiện tại theo membership.
import { z } from 'zod';

export const AUDIT_PAGE_SIZE = 50;
export const AUDIT_STATUSES = ['ok', 'warn', 'escalated'] as const;
export type AuditStatus = (typeof AUDIT_STATUSES)[number];

/** Bộ lọc dùng chung (actor / action / trạng thái / khoảng thời gian ISO). */
export const auditQuerySchema = z.object({
  cursor: z.string().max(200).optional(),
  page: z.literal('1').optional(),
  actor: z.string().max(64).optional(),
  action: z.string().max(80).optional(),
  status: z.enum(AUDIT_STATUSES).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});
export type AuditQuery = z.infer<typeof auditQuerySchema>;

/** Một dòng audit workspace (action_log + sự kiện bảo mật). `time` = ISO; FE định dạng theo múi giờ workspace. */
export const auditRowSchema = z.object({
  id: z.string(),
  time: z.string(),
  /** Tên hiện tại của người làm (null = hệ thống / AI). */
  name: z.string().nullable(),
  /** Vai trò hiện tại (`owner` · `manager` …) hoặc `system` / `ai`. */
  role: z.string(),
  actor_id: z.string().nullable(),
  action_id: z.string(),
  /** API thật = action_id (FE dịch `actions.<id>.title` / `event.<id>`); khác action_id = nhãn hiển thị sẵn (mock prototype). Không chứa input. */
  action: z.string(),
  source: z.string(),
  status: z.enum(AUDIT_STATUSES),
  ip: z.string().nullable(),
  trace_id: z.string().nullable(),
});
export type AuditRowDto = z.infer<typeof auditRowSchema>;

/** Một dòng AI audit: metadata run có scope — tác vụ, actor, mức AI, credit / token, trạng thái, thời gian, trace. */
export const aiAuditRowSchema = z.object({
  id: z.string(),
  time: z.string(),
  /** `copilot` (Trợ lý) · `agent` · `task` · `suggestion` … */
  actor: z.string(),
  agent_name: z.string().nullable(),
  /** Tên tác vụ hiển thị (title của run) — không phải prompt. */
  action: z.string(),
  /** Ngữ cảnh rút gọn (module / loại run), không có nội dung khách. */
  context: z.string(),
  /** Mức AI (standard / advanced / max) — không trả tên model nhà cung cấp (D29). */
  tier: z.string(),
  credits: z.number().int(),
  tokens: z.number().int(),
  status: z.enum(AUDIT_STATUSES),
  trace_id: z.string().nullable(),
});
export type AiAuditRowDto = z.infer<typeof aiAuditRowSchema>;

export const auditPageSchema = z.object({ data: z.array(auditRowSchema), next_cursor: z.string().nullable() });
export const aiAuditPageSchema = z.object({ data: z.array(aiAuditRowSchema), next_cursor: z.string().nullable() });
export type AuditPage = z.infer<typeof auditPageSchema>;
export type AiAuditPage = z.infer<typeof aiAuditPageSchema>;

