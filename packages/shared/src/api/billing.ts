// Shape đọc domain billing (FE ↔ BE — gap-filling §5): `GET /v1/billing/summary|plans|wallet|ledger`. Mock transport
// (apps/web) và API thật parse cùng các schema này. Credit là số nguyên (bigint ở DB, < 2^53 khi trả về).
import { z } from 'zod';

const status = z.enum(['trialing', 'active', 'expired', 'cancelled']);
const usage = z.object({ used: z.number().int(), max: z.number().int().nullable() });
/** Kênh đếm ở DB tenant (TIP-039): đọc lỗi → `available: false` + used 0 (FE hiện "—", không hiện 0 như số thật). */
const tenantUsage = usage.extend({ available: z.boolean().optional() });

export const billingSummarySchema = z.object({
  plan_key: z.string(),
  plan_name: z.string(),
  status,
  activated_at: z.string(),
  expires_at: z.string().nullable(),
  days_left: z.number().int(),
  period_pct: z.number().int().min(0).max(100),
  users: usage,
  channels: tenantUsage,
  credits_month: z.number().int().nullable(),
  balance: z.number().int(),
  plan_balance: z.number().int(),
  topup_balance: z.number().int(),
});
export type BillingSummaryDto = z.infer<typeof billingSummarySchema>;

const plan = z.object({
  key: z.string(),
  name: z.string(),
  price: z.string().nullable(),
  period: z.enum(['month', 'year', '']),
  desc: z.string(),
  popular: z.boolean(),
  features: z.array(z.string()),
});

export const billingCatalogSchema = z.object({
  plans: z.object({ personal: z.array(plan), business: z.array(plan) }),
  compare: z.array(z.object({ group: z.string(), rows: z.array(z.object({ feature: z.string(), personal: z.array(z.string()), business: z.array(z.string()) })) })),
  credit_packs: z.array(z.object({ key: z.string(), credits: z.number().int(), price: z.string(), bonus: z.number(), popular: z.boolean() })),
  addons: z.array(z.object({ key: z.string(), kind: z.enum(['user', 'channel']), price: z.string(), period: z.literal('month') })),
});

export const LEDGER_KINDS = ['grant', 'topup', 'usage', 'refund', 'adjust', 'expire'] as const;

export const ledgerEntrySchema = z.object({
  id: z.string(),
  at: z.string(),
  desc: z.string(),
  kind: z.enum(LEDGER_KINDS),
  source: z.string(),
  delta: z.number().int(),
});
export type LedgerEntryDto = z.infer<typeof ledgerEntrySchema>;

export const walletSchema = z.object({
  plan_balance: z.number().int(),
  topup_balance: z.number().int(),
  days_estimate: z.number().int(),
  low_alert: z.boolean(),
  ledger: z.array(ledgerEntrySchema),
});

export const ledgerPageSchema = z.object({ data: z.array(ledgerEntrySchema), next_cursor: z.string().nullable() });

/** `GET /v1/billing/invoices?status=&q=` (TIP-010) — hoá đơn gói AppChat; `qr` chỉ có khi còn chờ thanh toán. */
export const BILL_INVOICE_STATUSES = ['pending', 'pending_review', 'paid', 'expired', 'cancelled'] as const;
export const billInvoiceSchema = z.object({
  id: z.string(),
  code: z.string(),
  desc: z.string(),
  date: z.string(),
  amount: z.string(),
  method: z.enum(['qr', 'bank_transfer']),
  status: z.enum(BILL_INVOICE_STATUSES),
  kind: z.enum(['plan', 'credit', 'addon']),
  item: z.string(),
  qr: z
    .object({ payload: z.string(), amount: z.string(), content: z.string(), expires_at: z.string(), bank: z.string(), account_no: z.string(), account_name: z.string() })
    .optional(),
});
export type BillInvoiceDto = z.infer<typeof billInvoiceSchema>;
export const billInvoicesPageSchema = z.object({ data: z.array(billInvoiceSchema), next_cursor: z.string().nullable() });
