// 7 lý do điều chỉnh điểm thủ công (Blueprint §3.4 loyalty.adjust_points) — dùng chung web / core.
export const ADJUST_REASONS = [
  'missing_earn',
  'order_error',
  'compensation',
  'promotion',
  'refund_reverse',
  'fraud',
  'other',
] as const;
export type AdjustReason = (typeof ADJUST_REASONS)[number];
