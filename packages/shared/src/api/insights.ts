// Shape đọc số liệu (Blueprint §4.4 dashboard / insights, TIP-038): `GET /v1/insights/:metric?from&to&bucket…` và action `insight.query`
// (Trợ lý `query_data`) trả CÙNG kết quả. Tiền là chuỗi VND (bigint, không float). Nguồn người xem không đủ quyền → loại khỏi tổng và ghi
// rõ ở `availability.excluded` (không bao giờ trả tổng đã chứa nguồn đó); mẫu số rỗng → `null` + n = 0 (không phải 0 đo được).
// `GET /v1/agents/:id/stats` — thống kê agent có nguồn + định nghĩa, chỉ số thiếu dữ liệu → `available: false` kèm lý do.
import { z } from 'zod';
import { CHART_KINDS, FORMATS } from '../genui/schema';
import { METRIC_BUCKETS, METRIC_KEYS } from '../insights/metrics';

const cell = z.union([z.string(), z.number(), z.null()]);

export const insightColumnSchema = z.object({ key: z.string(), format: z.enum(FORMATS) });
export const insightSourceSchema = z.object({
  /** Loại nguồn (order, customer_payment, contact, ticket, ai_run) — mô tả aggregate, không PII. */
  type: z.string(),
  /** Màn xem bản ghi gốc (người xem có quyền module). */
  route: z.string().optional(),
  /** Id bản ghi (chỉ metric dạng danh sách — bản ghi trong scope người xem). */
  ids: z.array(z.string()).optional(),
  description: z.string(),
});
export const insightAvailabilitySchema = z.object({
  status: z.enum(['ok', 'partial', 'unavailable']),
  /** Nguồn bị loại vì người xem thiếu quyền / scope (`permission:order.view`, `scope:sales`). */
  excluded: z.array(z.object({ source: z.string(), reason: z.string() })),
});

export const insightResultSchema = z.object({
  metric: z.enum(METRIC_KEYS),
  params: z.record(z.string(), z.unknown()),
  window: z.object({ from: z.string(), to: z.string(), timezone: z.string(), bucket: z.enum(METRIC_BUCKETS).optional() }),
  as_of: z.string(),
  columns: z.array(insightColumnSchema),
  rows: z.array(z.record(z.string(), cell)).max(100),
  /** Gợi ý biểu đồ cho GenUI (`chart` khối dựng sẵn — `$ref` tới `rows`). */
  chart: z.object({ kind: z.enum(CHART_KINDS), x: z.string(), y: z.string() }).optional(),
  sources: z.array(insightSourceSchema),
  sample_count: z.number().int(),
  availability: insightAvailabilitySchema,
});
export type InsightResultDto = z.infer<typeof insightResultSchema>;

/** Một chỉ số có provenance: giá trị (null = chưa có dữ liệu / không khả dụng) + cỡ mẫu + định nghĩa nguồn. */
export const statValueSchema = z.object({
  value: z.number().nullable(),
  n: z.number().int(),
  available: z.boolean(),
  /** Vì sao không khả dụng (`permission:order.view`, `no_samples`, `no_linkage`). */
  reason: z.string().optional(),
});
export type StatValueDto = z.infer<typeof statValueSchema>;

export const agentStatsSchema = z.object({
  agent_id: z.string(),
  window: z.object({ from: z.string(), to: z.string(), timezone: z.string() }),
  /** Hội thoại khác nhau (trong scope Hộp thư người xem) có lượt `agent_reply` không dry-run trong kỳ; n = số lượt. */
  conversations: statValueSchema,
  /** Tỷ lệ LƯỢT tự xử lý = completed / (completed + handoff) — không phải tỷ lệ khách. n = completed + handoff. */
  resolve_rate: statValueSchema,
  /** TB `ticket.csat` (1–5) của ticket GIAO cho agent, đóng trong kỳ; n = số ticket có điểm. Không khẳng định quan hệ nhân quả. */
  csat: statValueSchema,
  /** Tương quan: khách có hội thoại agent phục vụ trong kỳ (n) → % có đơn hoàn tất trong kỳ (mỗi khách một lần). Không dùng tính hoa hồng. */
  close_rate: statValueSchema,
  /** Credit đã trừ thật (sổ run, không dry-run) cho lượt của agent trong kỳ. */
  credits: statValueSchema,
  /** So sánh người thật cùng kỳ + cùng định nghĩa: ticket giao cho người, khách chỉ có người phản hồi (không agent). */
  human: z.object({ csat: statValueSchema, close_rate: statValueSchema }),
});
export type AgentStatsDto = z.infer<typeof agentStatsSchema>;
