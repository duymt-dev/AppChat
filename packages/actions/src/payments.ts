// Khoản thu ngoài ghi nhận tay (Blueprint §3.4 sales; COMMERCE §5 / §6): hoàn tiền LUÔN qua duyệt — yêu cầu (`payment.refund`, quyền
// `payment.refund_request`) tạo khoản hoàn `pending`, người có `payment.refund_approve` (Owner / Quản lý được uỷ quyền) duyệt hoặc từ
// chối (DV-013: tách duyệt / từ chối thành action riêng như báo giá). Liệu trình: gia hạn / chỉnh buổi có ghi log. Tài khoản nhận tiền
// (VietQR) + bank feed SePay / Casso của DN: `finance.manage`. Đổi điểm (`payment.redeem_points`) thuộc TIP-036 (sổ điểm).
import { z } from 'zod';
import { defineAction } from './define';
import { money } from './sales-schemas';

const id = z.string().min(1);

export const paymentRefund = defineAction({
  id: 'payment.refund',
  module: 'sales',
  title: 'actions.payment.refund.title',
  description:
    'Request a refund (always needs approval by someone with payment.refund_approve). Target a payment request (invoice_id) or a customer package (package_id — amount defaults to the unused sessions share). Amount ≤ money collected and not yet refunded; reason required.',
  input: z
    .object({
      invoice_id: id.optional(),
      package_id: id.optional(),
      amount: money.refine((v) => Number(v) > 0).optional(),
      reason: z.string().trim().min(1).max(500),
    })
    .refine((v) => !!v.invoice_id !== !!v.package_id, { message: 'invoice_id xor package_id', path: ['invoice_id'] }),
  output: z.object({ payment_id: z.string(), status: z.string(), amount: z.string() }),
  permission: 'payment.refund_request',
  risk: 'money',
  agentGrantable: false,
  invalidates: ['invoices', 'orders'],
});

export const paymentRefundApprove = defineAction({
  id: 'payment.refund_approve',
  module: 'sales',
  title: 'actions.payment.refund_approve.title',
  description: 'Approve a pending refund: the refund is confirmed, the order refunded total and pay status update, a refunded package is closed.',
  input: z.object({ payment_id: id, note: z.string().max(500).optional() }),
  output: z.object({ payment_id: z.string(), status: z.string() }),
  permission: 'payment.refund_approve',
  risk: 'money',
  agentGrantable: false,
  invalidates: ['invoices', 'orders'],
});

export const paymentRefundReject = defineAction({
  id: 'payment.refund_reject',
  module: 'sales',
  title: 'actions.payment.refund_reject.title',
  description: 'Reject a pending refund request with a note (the requester is notified).',
  input: z.object({ payment_id: id, note: z.string().trim().min(1).max(500) }),
  output: z.object({ payment_id: z.string(), status: z.string() }),
  permission: 'payment.refund_approve',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['invoices', 'orders'],
});

export const packageExtend = defineAction({
  id: 'package.extend',
  module: 'sales',
  title: 'actions.package.extend.title',
  description: 'Extend a customer package (liệu trình) by N days from its current expiry (or from today if already expired); an expired package becomes active again.',
  input: z.object({ package_id: id, days: z.number().int().min(1).max(3650), note: z.string().max(500).optional() }),
  output: z.object({ package_id: z.string(), expires_at: z.string(), status: z.string() }),
  permission: 'package.manage',
  risk: 'write',
  agentGrantable: false,
  undo: { windowSec: 86_400 },
  invalidates: ['invoices', 'crm'],
});

export const packageAdjustSessions = defineAction({
  id: 'package.adjust_sessions',
  module: 'sales',
  title: 'actions.package.adjust_sessions.title',
  description: 'Set the total number of sessions of a customer package (≥ sessions already used); reason required. Exhausted packages with sessions left become active again.',
  input: z.object({ package_id: id, total_sessions: z.number().int().min(1).max(1000), reason: z.string().trim().min(1).max(500) }),
  output: z.object({ package_id: z.string(), total_sessions: z.number(), status: z.string() }),
  permission: 'package.manage',
  risk: 'write',
  agentGrantable: false,
  undo: { windowSec: 86_400 },
  invalidates: ['invoices', 'crm'],
});

export const paymentAccountUpdate = defineAction({
  id: 'payment_account.update',
  module: 'sales',
  title: 'actions.payment_account.update.title',
  description: 'Set the business bank account that receives customer payments (source of the VietQR on payment requests). Example: {"bank":"Vietcombank","bank_bin":"970436","account_no":"0071000123456","account_name":"CONG TY TNHH AN NHIEN"}',
  input: z.object({
    bank: z.string().trim().min(1).max(100),
    bank_bin: z.string().regex(/^\d{6}$/),
    account_no: z.string().regex(/^[0-9A-Za-z]{4,25}$/),
    account_name: z.string().trim().min(1).max(100),
  }),
  output: z.object({ ok: z.boolean() }),
  permission: 'finance.manage',
  risk: 'config',
  agentGrantable: false,
  invalidates: ['invoices', 'settings'],
});

export const bankFeedConnect = defineAction({
  id: 'bank_feed.connect',
  module: 'sales',
  title: 'actions.bank_feed.connect.title',
  description:
    'Connect the business SePay / Casso account so incoming transfers whose content has a TT… code are confirmed automatically. Fields as the connector asks (SePay: api_key or hmac_secret + account_number; Casso: webhook_secret + account_number). mode: live (real provider, default) or sandbox (test only).',
  input: z.object({ provider: z.enum(['sepay', 'casso']), fields: z.record(z.string(), z.string()), mode: z.enum(['live', 'sandbox']).optional() }),
  output: z.object({ feed_id: z.string(), webhook_path: z.string() }),
  permission: 'finance.manage',
  risk: 'config',
  agentGrantable: false,
  invalidates: ['invoices', 'integrations'],
  secret: { connector: { provider: 'provider', fields: 'fields' } },
  db: 'platform',
});

export const bankFeedDisconnect = defineAction({
  id: 'bank_feed.disconnect',
  module: 'sales',
  title: 'actions.bank_feed.disconnect.title',
  description: 'Disconnect the business bank feed (automatic matching stops; manual recording still works).',
  input: z.object({ provider: z.enum(['sepay', 'casso']) }),
  output: z.object({ ok: z.boolean() }),
  permission: 'finance.manage',
  risk: 'config',
  agentGrantable: false,
  invalidates: ['invoices', 'integrations'],
  db: 'platform',
});
