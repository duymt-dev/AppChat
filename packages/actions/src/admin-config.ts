// Cấu hình nền tảng (TIP-040 pha 2, DC-370) — Quản trị nền tảng sửa gói / giá model / định tuyến model / mẫu agent. Tất cả
// `platform_admin`, `db: platform`, không cấp agent, risk `config`; chạy ở ngữ cảnh nền tảng (DC-368 — chỉ màn /admin).
// Sửa = CAS `if_version` (lệch → 409); tạo = khoá ổn định (trùng → 409). Không JSON tự do: mọi ô có schema đóng.
import { z } from 'zod';
import { defineAction } from './define';

const money = z.string().regex(/^\d{1,13}$/);
const key = z.string().regex(/^[a-z0-9][a-z0-9_-]{1,39}$/);
const tier = z.enum(['standard', 'advanced', 'max']);
const purpose = z.enum(['chat', 'embed', 'rerank']);
/** credit / 1k token: thập phân không âm, tối đa 8 chữ số nguyên + 4 lẻ (Decimal(12,4)). */
const credits = z.string().regex(/^\d{1,8}(\.\d{1,4})?$/);
const quota = z.number().int().positive().max(100_000).nullable();
const ifVersion = z.number().int().positive();

export const adminPlanUpsert = defineAction({
  id: 'admin.plan.upsert',
  module: 'billing',
  title: 'actions.admin.plan.upsert.title',
  description: 'Platform admin: create or update a subscription plan (prices VND, monthly credits, limits, card features, active). Does not change paid invoices or active subscriptions. Example: {"key":"team","if_version":2,"segment":"business","name":"Team","price_month":"990000","price_year":null,"credits_month":3000,"max_users":5,"max_channels":3,"max_agents":3,"desc":"For small teams","popular":false,"features":["5 users"],"active":true,"sort":4}',
  input: z
    .object({
      key,
      if_version: ifVersion.optional(),
      segment: z.enum(['personal', 'business']),
      name: z.string().trim().min(1).max(60),
      price_month: money.nullable(),
      price_year: money.nullable(),
      credits_month: z.number().int().min(0).max(100_000_000).nullable(),
      max_users: quota,
      max_channels: quota,
      max_agents: quota,
      desc: z.string().trim().max(200),
      popular: z.boolean(),
      features: z.array(z.string().trim().min(1).max(120)).max(20),
      active: z.boolean(),
      sort: z.number().int().min(0).max(1000),
    })
    .strict(),
  output: z.object({ key: z.string(), version: z.number().int(), created: z.boolean() }),
  permission: 'platform_admin',
  risk: 'config',
  agentGrantable: false,
  invalidates: ['billing', 'admin'],
  db: 'platform',
});

export const adminModelPriceUpsert = defineAction({
  id: 'admin.model_price.upsert',
  module: 'ai',
  title: 'actions.admin.model_price.upsert.title',
  description: 'Platform admin: set credit price per 1k input/output tokens for a provider model. New AI steps use the new price; recorded usage keeps its price. Example: {"provider_key":"router","model":"gpt-4.1-mini","if_version":1,"tier":"standard","credits_per_1k_in":"0.4","credits_per_1k_out":"1.6","active":true}',
  input: z
    .object({
      provider_key: key,
      model: z.string().trim().min(1).max(120),
      if_version: ifVersion.optional(),
      tier,
      credits_per_1k_in: credits,
      credits_per_1k_out: credits,
      active: z.boolean(),
    })
    .strict(),
  output: z.object({ provider_key: z.string(), model: z.string(), version: z.number().int(), created: z.boolean() }),
  permission: 'platform_admin',
  risk: 'config',
  agentGrantable: false,
  invalidates: ['ai', 'admin'],
  db: 'platform',
});

export const adminModelRouteUpsert = defineAction({
  id: 'admin.model_route.upsert',
  module: 'ai',
  title: 'actions.admin.model_route.upsert.title',
  description: 'Platform admin: replace the ordered fallback list of models for one AI tier and purpose (first = primary). Each provider must be active and support the purpose; each model must have an active price. Example: {"tier":"advanced","purpose":"chat","if_version":3,"routes":[{"provider_key":"router","model":"gpt-4.1"},{"provider_key":"router","model":"gpt-4.1-mini"}]}',
  input: z
    .object({
      tier,
      purpose,
      /** Phiên bản nhóm (tier, purpose) đọc được ở GET /admin/config/routes — 0 khi nhóm chưa từng sửa. */
      if_version: z.number().int().min(0),
      routes: z
        .array(z.object({ provider_key: key, model: z.string().trim().min(1).max(120) }).strict())
        .max(10),
    })
    .strict(),
  output: z.object({ tier, purpose, version: z.number().int(), count: z.number().int() }),
  permission: 'platform_admin',
  risk: 'config',
  agentGrantable: false,
  invalidates: ['ai', 'admin'],
  db: 'platform',
});

export const adminAgentTemplateUpsert = defineAction({
  id: 'admin.agent_template.upsert',
  module: 'ai',
  title: 'actions.admin.agent_template.upsert.title',
  description: 'Platform admin: create or update an AI agent template in the catalogue. Tools must be agent-grantable actions; existing agents cloned from it do not change. Example: {"key":"spa-sales","role":"sales","industry_group":null,"industry":"Spa","name":"Spa sales","description":"Books treatments","color":"#16A34A","tint":"#DCFCE7","icon":"store","defaults":{"tools":["contact.search"],"intents":[0],"model_tier":"standard","threshold":70,"prompt":"You are a sales assistant."},"active":true,"sort":10}',
  input: z
    .object({
      key,
      if_version: ifVersion.optional(),
      role: z.enum(['sales', 'cs', 'booking', 'marketing', 'accounting', 'ops']),
      industry_group: z.string().trim().max(60).nullable(),
      industry: z.string().trim().min(1).max(60),
      name: z.string().trim().min(1).max(80),
      description: z.string().trim().max(300),
      color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
      tint: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
      icon: z.string().regex(/^[a-z0-9-]{1,40}$/),
      defaults: z
        .object({
          tools: z.array(z.string().max(80)).max(60),
          intents: z.array(z.number().int().min(0).max(20)).max(10),
          model_tier: tier,
          threshold: z.number().int().min(0).max(100),
          prompt: z.string().trim().min(1).max(8000),
        })
        .strict(),
      active: z.boolean(),
      sort: z.number().int().min(0).max(1000),
    })
    .strict(),
  output: z.object({ key: z.string(), version: z.number().int(), created: z.boolean() }),
  permission: 'platform_admin',
  risk: 'config',
  agentGrantable: false,
  invalidates: ['ai', 'admin'],
  db: 'platform',
});
