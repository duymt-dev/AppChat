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
