// Biên nhận gửi một lần (TIP-019b §4.5): ý định có `onceKey` = `<loại>:<id>` → một thông báo duy nhất cho khoá đó (id tất định theo khoá,
// không theo người nhận). Domain đăng ký bộ ghi biên nhận theo tiền tố khoá (vd. `approval_expiry` → `ai_expiry_delivery`): đọc trước khi
// gửi (đã gửi → bỏ, kể cả khi Owner đã đổi), ghi người nhận + id thông báo sau khi ghi thông báo. Chưa gửi → lần sau chọn lại người nhận.
import type { TenantDb } from '@appchat/db';

export interface DeliveryReceipt {
  /** Đã gửi cho khoá này chưa (true → không gửi lại). */
  sent(db: TenantDb, id: string): Promise<boolean>;
  /** Ghi đã gửi (người nhận được chọn lúc gửi + id thông báo). */
  mark(db: TenantDb, id: string, r: { eventId: string; recipientUserId: string; notificationId: string }, now: Date): Promise<void>;
}

const receipts = new Map<string, DeliveryReceipt>();

export function registerDeliveryReceipt(prefix: string, r: DeliveryReceipt): void {
  receipts.set(prefix, r);
}

/** Bộ ghi + id nghiệp vụ của khoá `<tiền tố>:<id>`; tiền tố chưa đăng ký → chỉ dùng id tất định theo khoá. */
export function receiptFor(onceKey: string): { receipt: DeliveryReceipt | null; id: string } {
  const i = onceKey.indexOf(':');
  return { receipt: receipts.get(onceKey.slice(0, i)) ?? null, id: onceKey.slice(i + 1) };
}
