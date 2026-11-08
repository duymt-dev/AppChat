-- TIP-032c (COMMERCE §4b, §8b; DC-255): hợp đồng / đơn tách người tạo (doanh số) khỏi người phụ trách vận hành + khoá dòng lạc quan.
--   · assigned_user_id: người phụ trách VẬN HÀNH (scope own, bộ lọc "Phụ trách", sửa được qua contract.update / order.update). Backfill
--     một lần = owner_user_id; sau đó null = chưa giao (không fallback COALESCE về người tạo).
--   · owner_user_id: người tạo tính doanh số — trigger chặn mọi đổi giá trị (kể cả về null). Không sửa lịch sử, không tính lại KPI.
--   · version: mọi UPDATE thành công của dòng cha tăng OLD.version + 1 (trigger — bỏ qua giá trị người gọi gửi, kể cả lùi số). Áp cho
--     handler, việc nền, đồng bộ sàn, sổ thu. Tách khỏi quote.version (phiên bản thương mại) và contract.source_version (nguồn ký 030b).
ALTER TABLE "contract" ADD COLUMN "assigned_user_id" UUID;
ALTER TABLE "contract" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "contract" ADD CONSTRAINT "contract_version_positive" CHECK ("version" >= 1);
UPDATE "contract" SET "assigned_user_id" = "owner_user_id";

ALTER TABLE "order" ADD COLUMN "assigned_user_id" UUID;
ALTER TABLE "order" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "order" ADD CONSTRAINT "order_version_positive" CHECK ("version" >= 1);
UPDATE "order" SET "assigned_user_id" = "owner_user_id";

CREATE OR REPLACE FUNCTION commerce_row_guard() RETURNS trigger AS $$
BEGIN
  IF NEW.owner_user_id IS DISTINCT FROM OLD.owner_user_id THEN
    RAISE EXCEPTION '%.owner_user_id is immutable', TG_TABLE_NAME USING ERRCODE = 'check_violation';
  END IF;
  NEW.version := OLD.version + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "contract_row_guard" BEFORE UPDATE ON "contract"
  FOR EACH ROW EXECUTE FUNCTION commerce_row_guard();
CREATE TRIGGER "order_row_guard" BEFORE UPDATE ON "order"
  FOR EACH ROW EXECUTE FUNCTION commerce_row_guard();

-- Scope own / bộ lọc người phụ trách: `assigned =` (+ `status =`) trước, thứ tự danh sách created_at DESC, id DESC sau (không đổi thứ tự
-- bảng khi đổi người phụ trách). Index owner cũ giữ cho KPI / bộ lọc người tạo.
CREATE INDEX "contract_live_assigned_idx" ON "contract" ("assigned_user_id", "status", "created_at" DESC, "id" DESC) WHERE "deleted_at" IS NULL;
CREATE INDEX "contract_live_assigned_recent_idx" ON "contract" ("assigned_user_id", "created_at" DESC, "id" DESC) WHERE "deleted_at" IS NULL;
CREATE INDEX "order_live_assigned_idx" ON "order" ("assigned_user_id", "status", "created_at" DESC, "id" DESC) WHERE "deleted_at" IS NULL;
CREATE INDEX "order_live_assigned_recent_idx" ON "order" ("assigned_user_id", "created_at" DESC, "id" DESC) WHERE "deleted_at" IS NULL;

-- Mọi đường tạo (tay, chuyển đổi, lịch hẹn, tệp AI, nhập sàn, nhập 038b) khởi tạo người phụ trách = người tạo đã xác định khi không truyền.
CREATE OR REPLACE FUNCTION commerce_assigned_default() RETURNS trigger AS $$
BEGIN
  IF NEW.assigned_user_id IS NULL THEN
    NEW.assigned_user_id := NEW.owner_user_id;
  END IF;
  NEW.version := 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "contract_assigned_default" BEFORE INSERT ON "contract"
  FOR EACH ROW EXECUTE FUNCTION commerce_assigned_default();
CREATE TRIGGER "order_assigned_default" BEFORE INSERT ON "order"
  FOR EACH ROW EXECUTE FUNCTION commerce_assigned_default();
