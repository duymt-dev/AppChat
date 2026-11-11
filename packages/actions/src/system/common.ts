// Hợp đồng chung của họ action chuyển trạng thái hệ thống (TIP-003c §2): riêng tư, không agent, không undo; input chỉ là tham chiếu
// trigger + mục tiêu + discriminant đóng — hạn, số tiền, người nhận, trạng thái, nội dung đều do server tự nạp. Output: kết cục có kiểu.
import { z } from 'zod';

export const systemInput = <E extends readonly [string, ...string[]]>(ops: E) =>
  z.object({ trigger_id: z.string().uuid(), entity_id: z.string().uuid(), operation: z.enum(ops) }).strict();

export const systemOutput = z.object({
  disposition: z.enum(['applied', 'no_effect', 'handed_off']),
  operation_id: z.string(),
  effect_ref: z.string().optional(),
  reason_code: z.string().max(64).optional(),
});

export type SystemOutput = z.infer<typeof systemOutput>;
