-- TIP-006b §1.2: tham chiếu chính sách người nhận của ý định giao (permission key / 'owner' / 'list') — kiểm lại quyền HIỆN TẠI ngay trước
-- khi gửi. Chỉ EXPAND. Quét khôi phục mail kẹt `dispatching` (tiến trình chết giữa gọi provider) theo hạn claim — partial nhỏ.
ALTER TABLE "notification_delivery" ADD COLUMN "policy_reference" TEXT;
CREATE INDEX "notification_delivery_inflight_idx" ON "notification_delivery" ("claim_until", "id") WHERE "phase" = 'dispatching';
