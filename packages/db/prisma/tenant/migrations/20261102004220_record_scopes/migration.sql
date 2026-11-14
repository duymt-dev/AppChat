-- TIP-042c: scope `team` theo `team_id` của bản ghi (DC-299, Q-029) + watcher chỉ đọc (D32). Expand-only (cột nullable + index + backfill).
-- Backfill CHỈ từ lineage rõ, mơ hồ để null:
--   gốc (khách, báo giá, lịch hẹn)  ← nhóm DUY NHẤT của người phụ trách (0 hoặc ≥ 2 nhóm → null, không chọn "nhóm đầu tiên")
--   hợp đồng ← báo giá nguồn · đơn ← báo giá nguồn → hợp đồng nguồn · đề nghị thanh toán ← đơn · hội thoại ← khách → nhóm duy nhất người được gán
--   bản sửa báo giá ← bản gốc (root_quote_id) nếu chính nó chưa có nhóm.
-- Không đổi owner_user_id (doanh số); ticket giữ team_id do người dùng chọn (TIP-034).

ALTER TABLE "quote" ADD COLUMN "team_id" UUID;
ALTER TABLE "contract" ADD COLUMN "team_id" UUID;
ALTER TABLE "order" ADD COLUMN "team_id" UUID;
ALTER TABLE "invoice" ADD COLUMN "team_id" UUID;
ALTER TABLE "appointment" ADD COLUMN "team_id" UUID;

-- Nhóm duy nhất của từng người (bảng tạm của phiên migrate).
CREATE TEMP TABLE "_sole_team" ON COMMIT DROP AS
  SELECT "user_id", min("team_id"::text)::uuid AS "team_id" FROM "team_member" GROUP BY "user_id" HAVING count(*) = 1;

UPDATE "contact" c SET "team_id" = s."team_id" FROM "_sole_team" s WHERE c."team_id" IS NULL AND s."user_id" = c."owner_user_id";
UPDATE "quote" q SET "team_id" = s."team_id" FROM "_sole_team" s WHERE q."team_id" IS NULL AND s."user_id" = q."owner_user_id";
UPDATE "quote" q SET "team_id" = r."team_id" FROM "quote" r
  WHERE q."team_id" IS NULL AND r."id" = q."root_quote_id" AND r."id" <> q."id" AND r."team_id" IS NOT NULL;
UPDATE "appointment" a SET "team_id" = s."team_id" FROM "_sole_team" s WHERE a."team_id" IS NULL AND s."user_id" = a."owner_user_id";
UPDATE "contract" c SET "team_id" = q."team_id" FROM "quote" q WHERE c."team_id" IS NULL AND q."id" = c."quote_id" AND q."team_id" IS NOT NULL;
UPDATE "order" o SET "team_id" = q."team_id" FROM "quote" q WHERE o."team_id" IS NULL AND q."id" = o."quote_id" AND q."team_id" IS NOT NULL;
UPDATE "order" o SET "team_id" = c."team_id" FROM "contract" c WHERE o."team_id" IS NULL AND c."id" = o."contract_id" AND c."team_id" IS NOT NULL;
UPDATE "invoice" i SET "team_id" = o."team_id" FROM "order" o WHERE i."team_id" IS NULL AND o."id" = i."order_id" AND o."team_id" IS NOT NULL;
UPDATE "conversation" v SET "team_id" = k."team_id" FROM "contact" k WHERE v."team_id" IS NULL AND k."id" = v."contact_id" AND k."team_id" IS NOT NULL;
UPDATE "conversation" v SET "team_id" = s."team_id" FROM "_sole_team" s WHERE v."team_id" IS NULL AND v."contact_id" IS NULL AND s."user_id" = v."assignee_user_id";

-- Không FK tới `team` (như contact / conversation / ticket.team_id sẵn có): nhóm không bao giờ xoá cứng (không có team.delete), và
-- tenant-migrate phải chạy được trên DB tenant cũ dựng lại bảng authz.

-- Index theo list thật (indexing §1, §4): bằng (team_id) trước, sắp xếp + id sau; partial chỉ dòng có nhóm, còn sống.
CREATE INDEX "quote_team_recent_idx" ON "quote" ("team_id", "created_at" DESC, "id" DESC) WHERE "deleted_at" IS NULL AND "team_id" IS NOT NULL;
CREATE INDEX "contract_team_recent_idx" ON "contract" ("team_id", "created_at" DESC, "id" DESC) WHERE "deleted_at" IS NULL AND "team_id" IS NOT NULL;
CREATE INDEX "order_team_recent_idx" ON "order" ("team_id", "created_at" DESC, "id" DESC) WHERE "deleted_at" IS NULL AND "team_id" IS NOT NULL;
CREATE INDEX "invoice_team_recent_idx" ON "invoice" ("team_id", "created_at" DESC, "id" DESC) WHERE "team_id" IS NOT NULL;
CREATE INDEX "appointment_team_start_idx" ON "appointment" ("team_id", "start_at") WHERE "deleted_at" IS NULL AND "team_id" IS NOT NULL;
CREATE INDEX "conversation_team_recent_idx" ON "conversation" ("team_id", "last_message_at" DESC, "id" DESC)
  WHERE "archived_at" IS NULL AND "hidden_at" IS NULL AND "team_id" IS NOT NULL;
CREATE INDEX "ticket_team_recent_idx" ON "ticket" ("team_id", "created_at" DESC, "id" DESC) WHERE "team_id" IS NOT NULL;

-- Quan hệ khách (EXISTS theo user + khách, phân biệt collaborator / watcher) → Index Only Scan: thay index cũ bằng bản có INCLUDE (role).
CREATE INDEX "contact_collaborator_user_contact_role_idx" ON "contact_collaborator" ("user_id", "contact_id") INCLUDE ("role");
DROP INDEX IF EXISTS "contact_collaborator_user_id_contact_id_idx";
ALTER INDEX "contact_collaborator_user_contact_role_idx" RENAME TO "contact_collaborator_user_id_contact_id_idx";
