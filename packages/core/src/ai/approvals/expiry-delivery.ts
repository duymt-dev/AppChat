// Biên nhận thông báo hết hạn duyệt (TIP-019b §4.5) — bảng `ai_expiry_delivery`, một dòng / yêu cầu duyệt. `sent` đọc trước khi gửi;
// `mark` ghi người nhận được chọn lúc gửi (Owner hiện tại) + id thông báo. Đăng ký vào notifier theo tiền tố `approval_expiry`.
import type { TenantDb } from '@appchat/db';
import { registerDeliveryReceipt, type DeliveryReceipt } from '../../notify/delivery-receipts';

export const EXPIRY_ONCE = 'approval_expiry';

type Db = Pick<TenantDb, 'aiExpiryDelivery'>;

export const expiryDelivery: DeliveryReceipt = {
  async sent(db, id) {
    const r = await (db as unknown as Db).aiExpiryDelivery.findUnique({ where: { approvalId: id }, select: { phase: true } });
    return r?.phase === 'sent';
  },
  async mark(db, id, r, now) {
    const data = { eventId: r.eventId, recipientUserId: r.recipientUserId, notificationId: r.notificationId, phase: 'sent', sentAt: now };
    // Chỉ đổi dòng chưa gửi — dòng đã gửi giữ người nhận / thông báo đầu tiên.
    await (db as unknown as Db).aiExpiryDelivery.upsert({ where: { approvalId: id }, create: { approvalId: id, ...data, createdAt: now }, update: {} });
    await (db as unknown as Db).aiExpiryDelivery.updateMany({ where: { approvalId: id, phase: { not: 'sent' } }, data });
  },
};

registerDeliveryReceipt(EXPIRY_ONCE, expiryDelivery);
