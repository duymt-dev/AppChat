// Đổi Chủ sở hữu (TIP-045b annex A3) — hợp đồng FE ↔ BE của `workspace.request_transfer_otp` / `workspace.transfer_ownership`.
// Mock transport (apps/web) và handler thật dùng cùng shape + cùng lý do lỗi mã (`fields.otp`).
import { z } from 'zod';

/** Kết quả xin mã: địa chỉ email Owner đã che + hạn mã (10 phút). */
export const transferOtpSentSchema = z.object({ sent_to: z.string(), expires_at: z.string() });
export type TransferOtpSent = z.infer<typeof transferOtpSentSchema>;

/** Kết quả đổi chủ: Owner mới; Owner cũ luôn về manager (Admin của prototype — DC248). */
export const ownershipTransferredSchema = z.object({ owner_user_id: z.string(), previous_owner_role: z.literal('manager') });
export type OwnershipTransferred = z.infer<typeof ownershipTransferredSchema>;

/** `OTP_INVALID.fields.otp`: sai mã · hết hạn / quá 5 lần sai / đã dùng · người nhận hoặc quyền đã đổi sau khi xin mã. */
export const TRANSFER_OTP_REASONS = ['invalid', 'expired', 'stale'] as const;
export type TransferOtpReason = (typeof TRANSFER_OTP_REASONS)[number];
