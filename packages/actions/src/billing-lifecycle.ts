// Vòng đời gói trả phí (TIP-039, DC-242 / DC-243): action system-only của billing — chỉ lịch ROLE=jobs `billing.lifecycle` / ghi nhận hoá đơn
// đã trả gọi qua ActionExecutor nguồn system (actor `system:billing`); người / Trợ lý / agent / API không gọi được. `db: 'platform'` → đi
// qua sổ thao tác xuyên DB (045b): nền tảng commit (biên nhận kỳ / ghi nhận hoá đơn + sổ ví) rồi event sang outbox tenant có biên nhận —
// tiến trình chết giữa hai pha thì khôi phục ROLE=jobs làm nốt (không mất thông báo, không cấp đôi).
import { z } from 'zod';
import { defineAction } from './define';

export const billingLifecycleStep = defineAction({
  id: 'billing.lifecycle_step',
  module: 'billing',
  title: 'actions.billing.lifecycle_step.title',
  description:
    "System-only: one due step of a workspace plan lifecycle — apply a scheduled downgrade at period end, expire an unpaid plan (data kept 30 days), or grant this month's plan credits once (missed months skipped, no backlog). Not callable by users, assistant or agents. Example: {}",
  input: z.object({}).strict(),
  output: z.object({
    granted: z.number().int(),
    skipped: z.number().int(),
    expired: z.boolean(),
    switched: z.boolean(),
  }),
  permission: 'self',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['billing'],
  db: 'platform',
});

export const billingApplyInvoice = defineAction({
  id: 'billing.apply_invoice',
  module: 'billing',
  title: 'actions.billing.apply_invoice.title',
  description:
    'System-only: apply a PAID platform invoice exactly once from its priced snapshot (new term / renewal / upgrade credits / add-on quota / credit top-up). A mismatch with the current subscription is held for reconciliation, never guessed. Example: {"invoice_id":"0190a000-0000-7000-8000-000000000001"}',
  input: z.object({ invoice_id: z.string().uuid() }),
  output: z.object({
    invoice_id: z.string(),
    status: z.enum(['applied', 'replayed', 'held']),
    reason: z.string().optional(),
  }),
  permission: 'self',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['billing'],
  db: 'platform',
});

// TIP-039 pha 3 (AC08): Liên hệ gói Doanh nghiệp — yêu cầu bền ở DB nền tảng (`sales_inquiry`) cho đội bán hàng AppChat. Thành công =
// yêu cầu đã nhận (không phải đã ký hợp đồng). Kiểm chặt + đồng ý liên hệ; giới hạn tần suất theo workspace; Idempotency-Key bắt buộc.
export const billingContactSales = defineAction({
  id: 'billing.contact_sales',
  module: 'billing',
  title: 'actions.billing.contact_sales.title',
  description:
    'Send an Enterprise plan enquiry to the AppChat sales team (stored, the team contacts you; not a signed contract). Requires consent. Example: {"name":"Lan Nguyen","email":"lan@spa.vn","phone":"0901234567","message":"20 users, 5 branches","consent":true}',
  input: z.object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(254),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9 .-]{8,20}$/),
    message: z.string().trim().min(5).max(2000),
    consent: z.literal(true),
  }),
  output: z.object({ inquiry_id: z.string(), status: z.literal('received') }),
  permission: 'billing.manage',
  risk: 'write',
  agentGrantable: false,
  invalidates: [],
  db: 'platform',
});
