-- TIP-026c (D60, DC-901): Cơ hội / Sales Pipeline — nâng cấp tại chỗ `contact_opportunity` của TIP-026b (giữ id / version / lịch sử /
-- ref timeline), xác suất cố định theo giai đoạn (bảng hằng @appchat/shared — bỏ cột), sản phẩm + lịch sử bảng con, chứng từ trỏ TỚI cơ hội.
-- Chạy được trên DB có dữ liệu 026b: open → lead, qualified → qualified, proposal → quote, won / lost giữ; quote_id chép sang quote.opportunity_id.

-- 1. Enum giai đoạn mới (đổi kiểu cột có ánh xạ; index cũ phủ cột stage bỏ trước — index mới ở mục 5).
DROP INDEX IF EXISTS "contact_opportunity_live_idx";
CREATE TYPE "contact_opportunity_stage_v2" AS ENUM ('lead', 'qualified', 'demo', 'quote', 'negotiation', 'won', 'lost');
ALTER TABLE "contact_opportunity" ALTER COLUMN "stage" DROP DEFAULT;
ALTER TABLE "contact_opportunity" ALTER COLUMN "stage" TYPE "contact_opportunity_stage_v2"
    USING (CASE "stage"::text WHEN 'open' THEN 'lead' WHEN 'proposal' THEN 'quote' ELSE "stage"::text END)::"contact_opportunity_stage_v2";
DROP TYPE "contact_opportunity_stage";
ALTER TYPE "contact_opportunity_stage_v2" RENAME TO "contact_opportunity_stage";
ALTER TABLE "contact_opportunity" ALTER COLUMN "stage" SET DEFAULT 'lead';

-- 2. Cột mới. `source_kind` là loại mở rộng được (text, kiểm ở code — tenant-db §8); lý do Thua là tập đóng (COMMERCE §8).
ALTER TABLE "contact_opportunity"
    ADD COLUMN "owner_user_id" UUID,
    ADD COLUMN "team_id" UUID,
    ADD COLUMN "source_kind" TEXT NOT NULL DEFAULT 'manual',
    ADD COLUMN "campaign_id" UUID,
    ADD COLUMN "lost_reason" TEXT,
    ADD COLUMN "closed_at" TIMESTAMPTZ(6),
    ADD COLUMN "stage_changed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    ADD CONSTRAINT "contact_opportunity_lost_reason_chk" CHECK ("lost_reason" IS NULL OR ("stage" = 'lost' AND "lost_reason" IN ('price', 'competitor', 'no_need', 'unreachable')));

-- Dữ liệu 026b: phụ trách = người tạo (agent tạo → phụ trách khách), nhóm = nhóm duy nhất của người đó (DC-299), nguồn theo hội thoại,
-- mốc đóng / đổi giai đoạn = lần cập nhật cuối. Cơ hội Thua cũ không có lý do (026b không thu) — giữ trống, không bịa lý do.
UPDATE "contact_opportunity" o SET
    "owner_user_id" = COALESCE(o."created_by", (SELECT c."owner_user_id" FROM "contact" c WHERE c."id" = o."contact_id")),
    "source_kind" = CASE WHEN o."source_conversation_id" IS NOT NULL THEN 'conversation' ELSE 'manual' END,
    "closed_at" = CASE WHEN o."stage" IN ('won', 'lost') THEN o."updated_at" END,
    "stage_changed_at" = o."updated_at";
UPDATE "contact_opportunity" o SET "team_id" = t."team_id"
  FROM (SELECT "user_id", min("team_id"::text)::uuid AS "team_id" FROM "team_member" GROUP BY "user_id" HAVING count(*) = 1) t
 WHERE t."user_id" = o."owner_user_id";

-- 3. Liên kết trỏ tới cơ hội (không FK xuyên domain — handler kiểm cùng họ khách / chưa Thua / người gọi thấy).
ALTER TABLE "quote"
    ADD COLUMN "opportunity_id" UUID,
    ADD COLUMN "opportunity_sync_value" BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN "opportunity_follow_up" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "order" ADD COLUMN "opportunity_id" UUID;
ALTER TABLE "appointment" ADD COLUMN "opportunity_id" UUID;

-- Chép liên kết 026b: một báo giá nhiều cơ hội → cơ hội còn sống, cập nhật mới nhất thắng; rồi lan cho cả chuỗi phiên bản chưa gắn.
UPDATE "quote" q SET "opportunity_id" = s."id"
  FROM (SELECT DISTINCT ON ("quote_id") "quote_id", "id" FROM "contact_opportunity" WHERE "quote_id" IS NOT NULL
         ORDER BY "quote_id", ("archived_at" IS NULL) DESC, "updated_at" DESC, "id" DESC) s
 WHERE q."id" = s."quote_id";
UPDATE "quote" q SET "opportunity_id" = r."opportunity_id"
  FROM (SELECT DISTINCT ON ("root_quote_id") "root_quote_id", "opportunity_id" FROM "quote" WHERE "opportunity_id" IS NOT NULL
         ORDER BY "root_quote_id", "version" DESC) r
 WHERE q."root_quote_id" = r."root_quote_id" AND q."opportunity_id" IS NULL;
-- Đơn kế thừa từ báo giá nguồn / báo giá của hợp đồng nguồn.
UPDATE "order" o SET "opportunity_id" = q."opportunity_id" FROM "quote" q WHERE q."id" = o."quote_id" AND q."opportunity_id" IS NOT NULL;
UPDATE "order" o SET "opportunity_id" = q."opportunity_id" FROM "contract" k JOIN "quote" q ON q."id" = k."quote_id"
 WHERE k."id" = o."contract_id" AND o."opportunity_id" IS NULL AND q."opportunity_id" IS NOT NULL;

ALTER TABLE "contact_opportunity" DROP CONSTRAINT IF EXISTS "contact_opportunity_prob_chk";
ALTER TABLE "contact_opportunity" DROP COLUMN "quote_id", DROP COLUMN "probability";

-- 4. Bảng con.
CREATE TABLE "contact_opportunity_item" (
    "id" UUID NOT NULL,
    "opportunity_id" UUID NOT NULL,
    "product_id" UUID,
    "name" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    CONSTRAINT "contact_opportunity_item_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "contact_opportunity_item_opp_fk" FOREIGN KEY ("opportunity_id") REFERENCES "contact_opportunity"("id") ON DELETE CASCADE,
    CONSTRAINT "contact_opportunity_item_name_chk" CHECK (char_length("name") BETWEEN 1 AND 200),
    CONSTRAINT "contact_opportunity_item_qty_chk" CHECK ("qty" BETWEEN 1 AND 1000000),
    CONSTRAINT "contact_opportunity_item_pos_chk" CHECK ("position" BETWEEN 0 AND 19)
);
CREATE UNIQUE INDEX "contact_opportunity_item_opportunity_id_position_key" ON "contact_opportunity_item" ("opportunity_id", "position");

-- Lịch sử chỉ thêm. `contact_id` = khách lúc ghi (như timeline — không dời khi gộp, đọc theo họ).
CREATE TABLE "contact_opportunity_event" (
    "id" UUID NOT NULL,
    "opportunity_id" UUID NOT NULL,
    "contact_id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "from_stage" TEXT,
    "to_stage" TEXT,
    "ref_type" TEXT,
    "ref_id" UUID,
    "params" JSONB NOT NULL DEFAULT '{}',
    "actor_type" TEXT NOT NULL DEFAULT 'user',
    "actor_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    CONSTRAINT "contact_opportunity_event_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "contact_opportunity_event_opp_fk" FOREIGN KEY ("opportunity_id") REFERENCES "contact_opportunity"("id") ON DELETE CASCADE,
    CONSTRAINT "contact_opportunity_event_kind_chk" CHECK ("kind" IN ('created', 'stage', 'value', 'owner', 'lost', 'reopened', 'linked', 'unlinked', 'ai_suggested', 'ai_applied'))
);

-- 5. Index (indexing.md: `=` trước, sắp xếp / range sau; INCLUDE cho Index Only Scan; partial cho tập hay đọc).
-- Danh sách cơ hội của khách (keyset updated_at DESC, id DESC) — thay contact_opportunity_live_idx.
CREATE INDEX "contact_opportunity_contact_idx" ON "contact_opportunity" ("contact_id", "updated_at" DESC, "id" DESC)
    INCLUDE ("stage", "amount_vnd", "owner_user_id", "version") WHERE "archived_at" IS NULL;
-- openSummary (cột Khách hàng / chip Hộp thư): một truy vấn cho cả trang, chỉ cơ hội mở.
CREATE INDEX "contact_opportunity_open_idx" ON "contact_opportunity" ("contact_id") INCLUDE ("stage", "amount_vnd")
    WHERE "archived_at" IS NULL AND "stage" NOT IN ('won', 'lost');
-- Kanban sau này / nhắc chốt theo người phụ trách.
CREATE INDEX "contact_opportunity_owner_close_idx" ON "contact_opportunity" ("owner_user_id", "stage", "expected_close_date")
    WHERE "archived_at" IS NULL AND "stage" NOT IN ('won', 'lost');
CREATE INDEX "contact_opportunity_event_opp_idx" ON "contact_opportunity_event" ("opportunity_id", "created_at" DESC, "id" DESC);
CREATE INDEX "quote_opportunity_idx" ON "quote" ("opportunity_id") INCLUDE ("status") WHERE "opportunity_id" IS NOT NULL AND "deleted_at" IS NULL;
CREATE INDEX "order_opportunity_idx" ON "order" ("opportunity_id") INCLUDE ("status") WHERE "opportunity_id" IS NOT NULL AND "deleted_at" IS NULL;
CREATE INDEX "appointment_opportunity_idx" ON "appointment" ("opportunity_id") WHERE "opportunity_id" IS NOT NULL;
