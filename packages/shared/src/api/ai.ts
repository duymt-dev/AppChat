// Runtime AI (TIP-019): mức AI (D29 — ẩn tên model), mức theo gói (bảng so sánh gói "Mức AI"), Cài đặt › Mô hình AI
// (`GET /v1/settings/ai` — FE `features/settings/types.ts` AiSettings), hàng "Trợ lý AI đang điều phối" (`GET /v1/runs` — FE Run).
import { z } from 'zod';

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
  pct: z.number().int().min(0).max(100),
  status: z.enum(['running', 'waiting_approval', 'done']),
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
});
export const kbDataSchema = z.object({
  types: z.record(z.string(), z.tuple([z.string(), z.string(), z.string()])),
  folders: z.array(z.object({ id: z.string(), name: z.string() })),
  nav: z.record(z.string(), z.number().int()),
  learned_total: z.number().int(),
  size: z.string(),
  data: z.array(kbDocSchema),
});
