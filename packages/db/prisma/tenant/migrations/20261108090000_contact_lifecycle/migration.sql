-- TIP-015f: vòng đời khách (xoá mềm có kiểm phụ thuộc + khôi phục 30 ngày). Tên theo thứ tự thời gian thật của chuỗi migration (manifest
-- ghi `20261102001560_…` lúc lập TIP — đã có migration mới hơn; DV-071).
--   contact.lifecycle_revision: CHỈ tăng khi xoá / khôi phục (khác `version` tăng mọi UPDATE). Trigger giữ giá trị không bị đặt lùi / tự chọn:
--   chỉ chấp nhận OLD hoặc OLD + 1, và +1 bắt buộc đi kèm đổi trạng thái deleted_at (xoá ↔ khôi phục).
--   contact_lifecycle_receipt: biên nhận mỗi lần xoá (không PII) — hạn khôi phục = deleted_at + 30 × 24h; state deleted | restored |
--   expired | erased (erased dành cho 015c — đóng cửa khôi phục).
ALTER TABLE "contact" ADD COLUMN "lifecycle_revision" INTEGER NOT NULL DEFAULT 1;

CREATE OR REPLACE FUNCTION contact_lifecycle_guard() RETURNS trigger AS $$
BEGIN
  IF NEW.lifecycle_revision = OLD.lifecycle_revision THEN
    RETURN NEW;
  END IF;
  IF NEW.lifecycle_revision <> OLD.lifecycle_revision + 1
     OR ((NEW.deleted_at IS NULL) = (OLD.deleted_at IS NULL)) THEN
    RAISE EXCEPTION 'contact.lifecycle_revision chỉ tăng 1 cùng lúc xoá / khôi phục' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contact_lifecycle_guard
  BEFORE UPDATE OF "lifecycle_revision", "deleted_at" ON "contact"
  FOR EACH ROW EXECUTE FUNCTION contact_lifecycle_guard();

CREATE TYPE "contact_lifecycle_state" AS ENUM ('deleted', 'restored', 'expired', 'erased');

CREATE TABLE "contact_lifecycle_receipt" (
    "id" UUID NOT NULL,
    "contact_id" UUID NOT NULL,
    "operation_id" TEXT NOT NULL,
    "lifecycle_revision" INTEGER NOT NULL,
    "deleted_at" TIMESTAMPTZ(6) NOT NULL,
    "restore_until" TIMESTAMPTZ(6) NOT NULL,
    "action_id" TEXT NOT NULL,
    "state" "contact_lifecycle_state" NOT NULL DEFAULT 'deleted',
    "deleted_by_user_id" UUID,
    "restored_at" TIMESTAMPTZ(6),
    "restored_by_user_id" UUID,
    "legacy" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "contact_lifecycle_receipt_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "contact_lifecycle_receipt_window_chk" CHECK ("restore_until" > "deleted_at")
);
ALTER TABLE "contact_lifecycle_receipt" ADD CONSTRAINT "contact_lifecycle_receipt_contact_fkey" FOREIGN KEY ("contact_id") REFERENCES "contact"("id") ON DELETE RESTRICT;
CREATE UNIQUE INDEX "contact_lifecycle_receipt_generation_key" ON "contact_lifecycle_receipt" ("contact_id", "lifecycle_revision") INCLUDE ("deleted_at", "restore_until", "state");
CREATE UNIQUE INDEX "contact_lifecycle_receipt_operation_key" ON "contact_lifecycle_receipt" ("operation_id");

-- Thùng rác theo scope: deleted_at DESC, id DESC (phân trang ổn định) — chỉ khách đã xoá, chưa gộp; bản có chủ sở hữu trước cho scope own.
CREATE INDEX "contact_deleted_recent_idx" ON "contact" ("deleted_at" DESC, "id" DESC) INCLUDE ("owner_user_id", "lifecycle_revision", "version")
  WHERE "deleted_at" IS NOT NULL AND "merged_into_id" IS NULL;
CREATE INDEX "contact_deleted_owner_idx" ON "contact" ("owner_user_id", "deleted_at" DESC, "id" DESC) INCLUDE ("lifecycle_revision", "version")
  WHERE "deleted_at" IS NOT NULL AND "merged_into_id" IS NULL;
-- Duyệt họ gộp (merged_into → nguồn) không quét toàn bảng.
CREATE INDEX "contact_merged_into_idx" ON "contact" ("merged_into_id", "id") WHERE "merged_into_id" IS NOT NULL;
-- Port phụ thuộc: tồn tại khoản thu / hoàn đang chờ theo khách (bằng → trạng thái → loại).
CREATE INDEX "customer_payment_contact_pending_idx" ON "customer_payment" ("contact_id", "status", "kind") WHERE "status" IN ('pending', 'needs_review');
-- Hợp đồng theo khách + trạng thái chặn xoá.
CREATE INDEX "contract_contact_status_idx" ON "contract" ("contact_id", "status") WHERE "deleted_at" IS NULL;

-- Khách đã xoá từ trước (không có biên nhận): biên nhận legacy có giới hạn — hạn = deleted_at + 30 ngày, không bịa người xoá / quyền
-- hoàn tác. Quá hạn → state expired (không tự xoá cứng — 015c lo lưu giữ).
INSERT INTO "contact_lifecycle_receipt" ("id", "contact_id", "operation_id", "lifecycle_revision", "deleted_at", "restore_until", "action_id", "state", "legacy")
SELECT gen_random_uuid(), c.id, 'legacy:' || c.id::text, c.lifecycle_revision, c.deleted_at, c.deleted_at + interval '30 days', 'contact.delete',
       CASE WHEN c.deleted_at + interval '30 days' > CURRENT_TIMESTAMP THEN 'deleted'::"contact_lifecycle_state" ELSE 'expired'::"contact_lifecycle_state" END, true
FROM "contact" c
WHERE c.deleted_at IS NOT NULL AND c.merged_into_id IS NULL AND c.deleted_at <= CURRENT_TIMESTAMP;

-- Port phụ thuộc (đếm theo khách, bằng trước): người nhận chiến dịch + thành viên nhóm hội thoại gắn khách.
CREATE INDEX "campaign_recipient_contact_idx" ON "campaign_recipient" ("contact_id", "campaign_id");
CREATE INDEX "conversation_participant_contact_idx" ON "conversation_participant" ("contact_id") WHERE "contact_id" IS NOT NULL;
