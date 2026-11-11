// Hợp đồng đọc của màn Quản trị nền tảng /admin (TIP-040, DC-368…373). Ghi = action `admin.*` qua useAction (ngữ cảnh nền tảng).
// Tiền là string VND; provider không bao giờ có key / giá trị header (chỉ `has_api_key` + tên header).
import { z } from 'zod';

const tier = z.enum(['standard', 'advanced', 'max']);
const purpose = z.enum(['chat', 'embed', 'rerank']);

export const adminSessionSchema = z.object({ user_id: z.string(), name: z.string().nullable(), email: z.string(), locale: z.string(), platform_admin: z.literal(true) });
export const adminPlanSchema = z.object({
  key: z.string(),
  version: z.number().int(),
  segment: z.enum(['personal', 'business']),
  name: z.string(),
  price_month: z.string().nullable(),
  price_year: z.string().nullable(),
  credits_month: z.number().nullable(),
  max_users: z.number().nullable(),
  max_channels: z.number().nullable(),
  max_agents: z.number().nullable(),
  desc: z.string(),
  popular: z.boolean(),
  features: z.array(z.string()),
  active: z.boolean(),
  sort: z.number().int(),
  is_trial_plan: z.boolean(),
});
export const adminProviderSchema = z.object({
  key: z.string(),
  version: z.number().int(),
  kind: z.enum(['anthropic', 'openai', 'google', 'deepseek', 'openai_compatible']),
  name: z.string(),
  base_url: z.string().nullable(),
  has_api_key: z.boolean(),
  header_names: z.array(z.string()),
  capabilities: z.record(z.string(), z.boolean()),
  status: z.enum(['active', 'disabled']),
  last_probe_at: z.string().nullable(),
  last_error: z.string().nullable(),
});
export const adminRouteGroupSchema = z.object({ tier, purpose, version: z.number().int(), routes: z.array(z.object({ provider_key: z.string(), model: z.string(), vision: z.boolean().optional() })) });
export const adminPriceSchema = z.object({
  provider_key: z.string(),
  model: z.string(),
  version: z.number().int(),
  tier,
  credits_per_1k_in: z.string(),
  credits_per_1k_out: z.string(),
  active: z.boolean(),
  updated_at: z.string(),
});
export const adminTemplateSchema = z.object({
  key: z.string(),
  version: z.number().int(),
  role: z.string(),
  industry_group: z.string().nullable(),
  industry: z.string(),
  name: z.string(),
  description: z.string(),
  color: z.string(),
  tint: z.string(),
  icon: z.string(),
  defaults: z.object({ tools: z.array(z.string()), intents: z.array(z.number()), model_tier: z.string(), threshold: z.number(), prompt: z.string() }),
  active: z.boolean(),
  sort: z.number().int(),
});
export const adminWorkspaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  status: z.enum(['active', 'suspended']),
  db_status: z.string(),
  version: z.number().int(),
  suspended_at: z.string().nullable(),
  suspend_reason: z.string().nullable(),
  owner: z.object({ name: z.string().nullable(), email: z.string() }).nullable(),
  subscription: z.object({ plan_key: z.string().nullable(), plan_name: z.string().nullable(), status: z.string(), ends_at: z.string().nullable() }).nullable(),
  stats: z.object({ contacts: z.number(), conversations_30d: z.number(), messages_30d: z.number(), db_size_bytes: z.string(), last_active_at: z.string().nullable() }).nullable(),
  refreshed_at: z.string().nullable(),
  created_at: z.string(),
});
export const adminTransferSchema = z.object({
  id: z.string(),
  code: z.string(),
  workspace_id: z.string(),
  workspace_name: z.string(),
  kind: z.string(),
  item: z.string(),
  amount: z.string(),
  transfer_code: z.string(),
  status: z.string(),
  reported_at: z.string().nullable(),
  created_at: z.string(),
  vat_info: z.unknown(),
});
export const adminBankTxSchema = z.object({ id: z.string(), provider: z.string(), provider_tx_id: z.string(), amount: z.string(), content: z.string(), occurred_at: z.string() });
export const adminInquirySchema = z.object({ id: z.string(), workspace_id: z.string(), workspace_name: z.string(), name: z.string(), email: z.string(), phone: z.string(), message: z.string(), status: z.string(), created_at: z.string() });

export type AdminSessionDto = z.infer<typeof adminSessionSchema>;
export type AdminPlanDto = z.infer<typeof adminPlanSchema>;
export type AdminProviderDto = z.infer<typeof adminProviderSchema>;
export type AdminRouteGroupDto = z.infer<typeof adminRouteGroupSchema>;
export type AdminPriceDto = z.infer<typeof adminPriceSchema>;
export type AdminTemplateDto = z.infer<typeof adminTemplateSchema>;
export type AdminWorkspaceDto = z.infer<typeof adminWorkspaceSchema>;
export type AdminTransferDto = z.infer<typeof adminTransferSchema>;
export type AdminBankTxDto = z.infer<typeof adminBankTxSchema>;
export type AdminInquiryDto = z.infer<typeof adminInquirySchema>;
