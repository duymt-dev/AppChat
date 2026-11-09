-- TIP-026b P4 (§5): tập dữ liệu bất biến của kế hoạch nhập 038b. Khách hàng có thêm 3 tập hoạt động CRM (contact_notes / contact_tasks /
-- contact_opportunities); mọi thực thể khác chỉ có `base`. Kế hoạch cũ (038b) là bản ghi chính của thực thể → `base`, lược đồ phiên bản 1
-- (không đoán thành tập hoạt động). `dataset` + `dataset_schema_version` cố định từ lúc tạo: trigger chặn mọi UPDATE đổi hai cột này (đổi
-- tập = kế hoạch mới) — runner / xác nhận / biên nhận dòng phân phối theo giá trị đã lưu, không theo lựa chọn UI sau cùng.
ALTER TABLE "transfer_plan" ADD COLUMN "dataset" TEXT NOT NULL DEFAULT 'base';
ALTER TABLE "transfer_plan" ADD COLUMN "dataset_schema_version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "transfer_plan" ADD CONSTRAINT "transfer_plan_dataset_chk" CHECK (
  "dataset" = 'base' OR ("entity" = 'contact' AND "dataset" IN ('contact_notes', 'contact_tasks', 'contact_opportunities'))
);
ALTER TABLE "transfer_plan" ADD CONSTRAINT "transfer_plan_dataset_version_chk" CHECK ("dataset_schema_version" >= 1);

CREATE OR REPLACE FUNCTION transfer_plan_dataset_immutable() RETURNS trigger AS $$
BEGIN
  IF NEW.entity IS DISTINCT FROM OLD.entity OR NEW.dataset IS DISTINCT FROM OLD.dataset
     OR NEW.dataset_schema_version IS DISTINCT FROM OLD.dataset_schema_version THEN
    RAISE EXCEPTION 'transfer_plan dataset is immutable' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "transfer_plan_dataset_immutable" BEFORE UPDATE ON "transfer_plan"
  FOR EACH ROW EXECUTE FUNCTION transfer_plan_dataset_immutable();
