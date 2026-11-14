// Shape đọc runtime kết nối (TIP-012b P3 §1.3, §5.1): GET /v1/integrations/connections/:id · /logs · /calls/:callId + action
// integration.get / integration.list_calls / integration.sync_now. KHÔNG bí mật, không giao dịch / số tiền / nội dung khách.
// `connected` cũ = "đã cấu hình", không phải bằng chứng nhận tiền — trạng thái thật ở `health`.
import { z } from 'zod';

/** configured_unverified = đã lưu khoá chưa có bằng chứng; verified = thăm dò / kéo thành công cho khoá hiện tại; degraded = lỗi gần nhất. */
export const connectionHealthSchema = z.enum(['configured_unverified', 'probing', 'verified', 'degraded', 'disconnected', 'sandbox']);
export type ConnectionHealth = z.infer<typeof connectionHealthSchema>;

export const capabilitiesSchema = z.object({ webhook: z.boolean(), probe: z.boolean(), pull: z.boolean() });

export const callStatusSchema = z.enum(['queued', 'running', 'succeeded', 'failed', 'unknown', 'cancelled']);
export type CallStatusDto = z.infer<typeof callStatusSchema>;

export const callReceiptSchema = z.object({
  id: z.string(),
  op: z.string(),
  status: callStatusSchema,
  /** Mã lỗi đã làm sạch (auth_failed / rate_limited / timeout / unsupported / provider_unavailable / superseded / internal). */
  reason: z.string().nullable(),
  attempts: z.number().int(),
  latency_ms: z.number().int().nullable(),
  created_at: z.string(),
  finished_at: z.string().nullable(),
  next_attempt_at: z.string().nullable(),
  /** Đếm an toàn (trang / giao dịch mới / trùng) — chỉ ở chi tiết lệnh. */
  outcome: z.record(z.string(), z.union([z.number(), z.string(), z.boolean()])).nullable().optional(),
});
export type CallReceiptDto = z.infer<typeof callReceiptSchema>;

export const connectionDetailSchema = z.object({
  id: z.string(),
  connector_key: z.string(),
  name: z.string(),
  port: z.string(),
  mode: z.enum(['live', 'sandbox']),
  status: z.enum(['connected', 'error', 'disconnected']),
  health: connectionHealthSchema,
  credential_rev: z.number().int(),
  capabilities: capabilitiesSchema,
  probe: z.object({ status: z.enum(['verified', 'failed', 'unsupported']).nullable(), reason: z.string().nullable(), at: z.string().nullable(), current: z.boolean() }),
  last_sync_at: z.string().nullable(),
  last_event_at: z.string().nullable(),
  last_error: z.string().nullable(),
  /** Feed đối soát tiền (finance) gắn với kết nối — chỉ trạng thái, tài khoản che (••3456); không số dư / giao dịch. */
  bank_binding: z.object({ active: z.boolean(), account_masked: z.string() }).nullable(),
  /** Lệnh kéo đang chờ / chạy (nếu có) — accepted ≠ finished. */
  pending_call: callReceiptSchema.nullable(),
  connected_at: z.string(),
});
export type ConnectionDetailDto = z.infer<typeof connectionDetailSchema>;

export const callLogPageSchema = z.object({ items: z.array(callReceiptSchema), next_cursor: z.string().nullable() });
export type CallLogPageDto = z.infer<typeof callLogPageSchema>;

/** Catalog connector + kết nối đang dùng (GET /v1/integrations/connectors). */
export const runtimeConnectorSchema = z.object({
  key: z.string(),
  name: z.string(),
  port: z.string(),
  status: z.enum(['ga', 'beta', 'coming_soon']),
  modes: z.array(z.enum(['live', 'sandbox'])),
  capabilities: capabilitiesSchema,
  connection_id: z.string().nullable(),
  health: connectionHealthSchema.nullable(),
});
export const runtimeConnectorListSchema = z.array(runtimeConnectorSchema);
export type RuntimeConnectorDto = z.infer<typeof runtimeConnectorSchema>;
