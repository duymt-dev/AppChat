// Runtime AI (TIP-019): mức AI (D29 — ẩn tên model), mức theo gói (bảng so sánh gói "Mức AI"), Cài đặt › Mô hình AI
// (`GET /v1/settings/ai` — FE `features/settings/types.ts` AiSettings), hàng "Trợ lý AI đang điều phối" (`GET /v1/runs` — FE Run).
import { z } from 'zod';
import { KB_ORIGINS, kbFolderSchema } from './kb-management';
import { SCHEDULE_STATES, weeklyScheduleSchema } from './agent-channel-behavior';
import { agentStatsSchema } from './insights';

export const AI_TIERS = ['standard', 'advanced', 'max'] as const;
export type AiTierKey = (typeof AI_TIERS)[number];

/** Mức AI cao nhất theo gói (catalog "Mức AI"): Miễn phí tiêu chuẩn, Cá nhân + nâng cao, còn lại toàn bộ. Gói lạ → tiêu chuẩn. */
const MAX_TIER: Record<string, AiTierKey> = {
  free: 'standard',
  personal: 'advanced',
  personal_pro: 'max',
  personal_max: 'max',
  team: 'max',
  business: 'max',
  ultimate: 'max',
  enterprise: 'max',
};

export const maxTierOf = (planKey: string | null | undefined): AiTierKey => MAX_TIER[planKey ?? ''] ?? 'standard';
export const tierAllowed = (tier: AiTierKey, planKey: string | null | undefined) => AI_TIERS.indexOf(tier) <= AI_TIERS.indexOf(maxTierOf(planKey));

/** Tác vụ AI có mức riêng (Cài đặt › Mô hình AI — prototype). */
export const AI_TASKS = ['copilot', 'auto_reply', 'order_analysis', 'insights', 'content'] as const;
export const AI_TASK_DEFAULT_TIER: Record<(typeof AI_TASKS)[number], AiTierKey> = {
  copilot: 'standard',
  auto_reply: 'standard',
  order_analysis: 'advanced',
  insights: 'advanced',
  content: 'standard',
};

const tier = z.enum(AI_TIERS);

export const aiSettingsSchema = z.object({
  default_tier: tier,
  tiers: z.array(z.object({ key: tier, credits: z.string(), badge: z.enum(['', 'using', 'hot']), active: z.boolean(), locked: z.boolean() })),
  tasks: z.array(z.object({ key: z.string(), tier })),
  budget: z.number().int(),
  rate_limit: z.number().int(),
});
export type AiSettingsDto = z.infer<typeof aiSettingsSchema>;

export const runRowSchema = z.object({
  id: z.string(),
  root_run_id: z.string(),
  task: z.string(),
  agent: z.string(),
  meta: z.string(),
  /** Tiến độ ước theo bước (run đang chạy); null khi run đã dừng / đang chờ — không giả 100% (TIP-019b §5.4). */
  pct: z.number().int().min(0).max(100).nullable(),
  status: z.enum(['running', 'waiting_approval', 'done']),
  /** Trạng thái thật (DC-380) — `status` giữ 3 nhóm cho tương thích. */
  lifecycle: z.enum(['queued', 'running', 'waiting_approval', 'waiting_child', 'waiting_operation', 'waiting_usage', 'completed', 'failed', 'cancelled', 'handoff']),
  stop_reason: z.string().nullable(),
  approval_id: z.string().optional(),
});
export const runsListSchema = z.object({ data: z.array(runRowSchema) });

/** Trang Dữ liệu RAG (TIP-020, `GET /v1/settings/kb` — FE `features/settings/types.ts` KbData). `status` / `error` thêm cho http. */
export const kbDocSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  tags: z.array(z.string()),
  learned: z.boolean(),
  size: z.string(),
  source: z.string(),
  by: z.string(),
  date: z.string(),
  folder_id: z.string().nullable(),
  starred: z.boolean(),
  visibility: z.enum(['public', 'internal']),
  status: z.enum(['pending', 'processing', 'ready', 'failed']).optional(),
  error: z.string().optional(),
  /** TIP-020b: nguồn gốc — `catalog` đồng bộ từ sản phẩm (không sửa / xoá trực tiếp). */
  origin: z.enum(KB_ORIGINS).optional(),
});
export const kbDataSchema = z.object({
  types: z.record(z.string(), z.tuple([z.string(), z.string(), z.string()])),
  folders: z.array(kbFolderSchema),
  nav: z.record(z.string(), z.number().int()),
  learned_total: z.number().int(),
  size: z.string(),
  data: z.array(kbDocSchema),
});

/** AI Agents (TIP-021, `GET /v1/agents` · `/agents/:id` — FE `features/agents/types.ts` Agent). Cấu hình = bản nháp. */
export const agentSchema = z.object({
  id: z.string(),
  name: z.string(),
  emoji: z.string(),
  role: z.enum(['sales', 'cs', 'booking', 'marketing', 'accounting', 'ops', 'custom']),
  role_label: z.string(),
  language: z.enum(['vi', 'en', 'bilingual', 'auto']),
  prompt: z.string(),
  intents: z.array(z.number().int()),
  model_tier: tier,
  tools: z.array(z.string()),
  channels: z.array(z.string()),
  threshold: z.number().int(),
  handoff_to: z.enum(['staff', 'team', 'lead']),
  governance: z.record(z.string(), z.boolean()),
  kb_scope: z.object({ folder_ids: z.array(z.string()), tags: z.array(z.string()) }),
  template_id: z.string().optional(),
  keywords: z.array(z.string()),
  working_hours: z.enum(['always', 'office', 'custom']),
  /** TIP-022b: lịch tuần có cấu trúc (custom); `schedule_state = needs_configuration` = custom cũ chưa lưu lịch (cảnh báo, chặn xuất bản mới). */
  weekly_schedule: weeklyScheduleSchema.nullable().optional(),
  schedule_state: z.enum(SCHEDULE_STATES).optional(),
  status: z.enum(['draft', 'active', 'paused']),
  conversations: z.number().int(),
  resolve_rate: z.number(),
  csat: z.number(),
  /** TIP-038: thống kê có nguồn (30 ngày) — `available: false` = chưa có dữ liệu / không quyền nguồn (khác 0 thật). */
  stats: agentStatsSchema.optional(),
  persona: z.string(),
  version: z.number().int(),
  dirty: z.boolean().optional(),
});
export type AgentDto = z.infer<typeof agentSchema>;
export const agentVersionSchema = z.object({ version: z.number().int(), published_at: z.string(), published_by: z.string(), note: z.string() });
/** Cấu hình mặc định theo vai trò của mẫu (D15) — Builder "Từ mẫu" dựng bản nháp từ đây. */
export const agentTemplateDefaultsSchema = z.object({
  tools: z.array(z.string()),
  intents: z.array(z.number().int()),
  model_tier: tier,
  threshold: z.number().int(),
  prompt: z.string(),
});
export type AgentTemplateDefaultsDto = z.infer<typeof agentTemplateDefaultsSchema>;
export const agentTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  desc: z.string(),
  tag: z.string(),
  color: z.string(),
  tint: z.string(),
  icon: z.string(),
  role: z.enum(['sales', 'cs', 'booking', 'marketing', 'accounting', 'ops', 'custom']),
  defaults: agentTemplateDefaultsSchema,
});

/** Quyền agent (D51, `GET /v1/agents/:id/tools` · `/conversations/:id/agent-tools`): nhóm theo module + Kỹ năng AI. */
export const agentToolSchema = z.object({
  id: z.string(),
  risk: z.string(),
  granted: z.boolean(),
  badge: z.enum(['needs_connector', 'coming_soon']).nullable(),
  connector: z.string().nullable(),
});
export const agentToolsSchema = z.object({
  agent: z.object({ id: z.string(), name: z.string() }).nullable(),
  groups: z.array(z.object({ key: z.string(), granted: z.number().int(), total: z.number().int(), tools: z.array(agentToolSchema) })),
});
export type AgentToolsDto = z.infer<typeof agentToolsSchema>;

/** Hàng chờ duyệt (`GET /v1/approvals?status=` — FE `features/assistant/types.ts` ApprovalRow). */
export const approvalRowSchema = z.object({
  id: z.string(),
  action_id: z.string(),
  risk: z.string(),
  permission: z.string(),
  agent: z.string(),
  title: z.string(),
  summary: z.string(),
  reason: z.string(),
  day: z.enum(['today', 'yesterday', '2d', '3d', '7d']),
  time: z.string(),
  status: z.enum(['pending', 'approved', 'edited', 'rejected', 'expired']),
  can_decide: z.boolean(),
  /** Input agent xin chạy + các trường cấp 1 sửa được (chuỗi / số / boolean của input schema action gốc) — nút "Sửa & duyệt". */
  input: z.record(z.string(), z.unknown()),
  fields: z.array(z.object({ key: z.string(), type: z.enum(['string', 'number', 'boolean']), required: z.boolean() })),
  note: z.string().optional(),
  /** Đã duyệt: thao tác gốc đã chạy xong chưa (false = đã duyệt, đang chờ chạy — không phải "đã gửi"). TIP-025b §G.2. */
  executed: z.boolean().optional(),
});
export type ApprovalRowDto = z.infer<typeof approvalRowSchema>;

/** Cài đặt › AI Governance (`GET /v1/settings/governance` — FE `features/settings/types.ts` Governance). */
export const governanceSchema = z.object({
  scopes: z.array(z.object({ key: z.string(), on: z.boolean(), sensitive: z.boolean() })),
  bounds: z.array(z.object({ key: z.string(), on: z.boolean(), risky: z.boolean() })),
  keywords: z.array(z.string()),
  filter: z.enum(['strict', 'balanced', 'relaxed']),
  long_review: z.boolean(),
  retention: z.enum(['30', '90', '180', '365']),
  no_external_train: z.boolean(),
  anonymize_pii: z.boolean(),
  residency: z.enum(['sg', 'vn', 'us', 'eu']),
  applied: z.number().int(),
  total: z.number().int(),
});
export type GovernanceDto = z.infer<typeof governanceSchema>;
