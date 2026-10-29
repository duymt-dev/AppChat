// Cài đặt › AI + Gói & ví (Blueprint §3.4 ai · billing; §5; D29). Prototype L6463–6605, L6878–7043, popup L915–1028.
// Mức AI (không lộ tên model — D29), kho tri thức RAG, AI Governance, hoá đơn gói / credit qua chuyển khoản QR.
import { z } from 'zod';
import { defineAction } from './define';

const TIER = z.enum(['fast', 'balanced', 'deep']);

export const aiSettingsUpdate = defineAction({
  id: 'ai_settings.update',
  module: 'ai',
  title: 'actions.ai_settings.update.title',
  description:
    'Set the default AI tier and per-task tiers (model names stay hidden — D29), monthly credit budget and auto-downgrade. Example: {"default_tier":"balanced","tasks":{"reply":"fast"},"budget":5000000}',
  input: z.object({
    default_tier: TIER.optional(),
    tasks: z.record(z.string(), TIER).optional(),
    budget: z.number().int().min(0).optional(),
    rate_limit: z.number().int().min(1).max(1000).optional(),
    auto_downgrade: z.boolean().optional(),
  }),
  output: z.object({ ok: z.boolean() }),
  permission: 'ai.governance',
  risk: 'config',
  agentGrantable: false,
  invalidates: ['ai'],
});

export const kbAddSource = defineAction({
  id: 'kb.add_source',
  module: 'ai',
  title: 'actions.kb.add_source.title',
  description: 'Add a file or URL to the knowledge base for AI to learn. Example: {"name":"Bảng giá 2026.pdf","folder_id":"f_price","visibility":"all"}',
  input: z.object({
    name: z.string().trim().min(1).max(200),
    folder_id: z.string().optional(),
    url: z.string().url().optional(),
    tags: z.array(z.string().max(30)).max(10).optional(),
    visibility: z.enum(['all', 'agents', 'staff']).default('all'),
  }),
  output: z.object({ source_id: z.string() }),
  permission: 'kb.manage',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['kb'],
});

export const kbRemoveSource = defineAction({
  id: 'kb.remove_source',
  module: 'ai',
  title: 'actions.kb.remove_source.title',
  description: 'Remove a knowledge source; AI stops using it. Example: {"source_id":"kb_1"}',
  input: z.object({ source_id: z.string().min(1) }),
  output: z.object({ ok: z.boolean() }),
  permission: 'kb.manage',
  risk: 'delete',
  agentGrantable: false,
  undo: { windowSec: 2_592_000 },
  invalidates: ['kb'],
});

export const kbRefreshSource = defineAction({
  id: 'kb.refresh_source',
  module: 'ai',
  title: 'actions.kb.refresh_source.title',
  description: 'Re-index a knowledge source, or all of them. Example: {"source_id":"all"}',
  input: z.object({ source_id: z.string().min(1) }),
  output: z.object({ queued: z.number().int() }),
  permission: 'kb.manage',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['kb'],
});

export const kbFolderCreate = defineAction({
  id: 'kb.folder.create',
  module: 'ai',
  title: 'actions.kb.folder.create.title',
  description: 'Create a knowledge base folder. Example: {"name":"Quy trình dịch vụ"}',
  input: z.object({ name: z.string().trim().min(1).max(60) }),
  output: z.object({ folder_id: z.string() }),
  permission: 'kb.manage',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['kb'],
});

export const governanceUpdate = defineAction({
  id: 'governance.update',
  module: 'ai',
  title: 'actions.governance.update.title',
  description:
    'Update AI governance: data scopes AI may read, behaviour boundaries, banned keywords, output filter, retention. Example: {"scopes":{"orders":true},"bounds":{"refund":false},"keywords":["cam kết khỏi"]}',
  input: z.object({
    scopes: z.record(z.string(), z.boolean()).optional(),
    bounds: z.record(z.string(), z.boolean()).optional(),
    keywords: z.array(z.string().trim().min(1).max(40)).max(100).optional(),
    filter: z.enum(['strict', 'standard', 'off']).optional(),
    retention: z.enum(['30d', '90d', '1y']).optional(),
  }),
  output: z.object({ ok: z.boolean() }),
  permission: 'ai.governance',
  risk: 'config',
  agentGrantable: false,
  invalidates: ['ai'],
});

export const billingCreateInvoice = defineAction({
  id: 'billing.create_invoice',
  module: 'billing',
  title: 'actions.billing.create_invoice.title',
  description: 'Create a platform invoice to buy a plan or a credit pack; returns a bank transfer QR. Example: {"kind":"credit","item":"credit_1000"}',
  input: z.object({ kind: z.enum(['plan', 'credit', 'addon']), item: z.string().min(1), period: z.enum(['month', 'year']).optional() }),
  output: z.object({ invoice_id: z.string(), amount: z.string(), transfer_code: z.string(), qr: z.string() }),
  permission: 'billing.manage',
  risk: 'money',
  agentGrantable: false,
  invalidates: ['billing'],
  db: 'platform',
});

export const billingCancelInvoice = defineAction({
  id: 'billing.cancel_invoice',
  module: 'billing',
  title: 'actions.billing.cancel_invoice.title',
  description: 'Cancel an unpaid platform invoice. Example: {"invoice_id":"bi_1"}',
  input: z.object({ invoice_id: z.string().min(1) }),
  output: z.object({ ok: z.boolean() }),
  permission: 'billing.manage',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['billing'],
  db: 'platform',
});

export const billingReportTransfer = defineAction({
  id: 'billing.report_transfer',
  module: 'billing',
  title: 'actions.billing.report_transfer.title',
  description: 'Mark "I have transferred" for a platform invoice; it moves to pending_review until the platform confirms. Example: {"invoice_id":"bi_1"}',
  input: z.object({ invoice_id: z.string().min(1) }),
  output: z.object({ invoice_id: z.string(), status: z.string() }),
  permission: 'billing.manage',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['billing'],
  db: 'platform',
});
