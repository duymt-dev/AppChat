// Đổi điểm khi thanh toán (TIP-036, COMMERCE §7, Blueprint §3.4 payments): một khoản thu kind / method `points` cho đề nghị thanh toán của
// đơn — 1 điểm = 100đ, tổng điểm dùng trên đơn ≤ 50% giá trị đơn, không vượt còn phải thu; trừ FIFO. Khách / đơn suy ra từ đề nghị (không
// nhận contact_id từ client). Không agentGrantable (bảng Blueprint); hoàn tác 24h = trả lại đúng lô.
import { z } from 'zod';
import { defineAction } from './define';

export const paymentRedeemPoints = defineAction({
  id: 'payment.redeem_points',
  module: 'sales',
  title: 'actions.payment.redeem_points.title',
  description:
    'Pay part of a payment request with the customer loyalty points (1 point = 100đ; total points used on the order ≤ 50% of the order value; ≤ amount left). Example: {"invoice_id":"0190f000-0000-7000-8000-000000000001","points":500}',
  input: z.object({ invoice_id: z.string().uuid(), points: z.number().int().positive().max(1_000_000_000) }),
  output: z.object({ payment_id: z.string(), invoice_id: z.string(), order_id: z.string(), points: z.number(), amount: z.string(), balance_after: z.number() }),
  permission: 'payment.record',
  risk: 'money',
  agentGrantable: false,
  undo: { windowSec: 86_400 },
  invalidates: ['loyalty', 'invoices', 'orders', 'crm'],
});
