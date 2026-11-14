-- TIP-034c §2.5: một nguồn tăng version DUY NHẤT cho ticket — mọi UPDATE (người / hệ thống / SQL thô / hoàn tác / quét SLA) đặt
-- NEW.version = OLD.version + 1, bỏ qua giá trị người gọi gửi (ORM `increment: 1` không thành +2). Chèn mới giữ version 1; không đụng
-- created_at / updated_at (giờ do Clock của ứng dụng). Trigger cùng tên đã có (không phải bản này) → migration dừng thay vì chồng hai nguồn.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = '"ticket"'::regclass AND NOT tgisinternal AND tgname <> 'ticket_bump_version'
             AND pg_get_triggerdef(oid) ILIKE '%version%') THEN
    RAISE EXCEPTION 'ticket: đã có trigger khác ghi version — không cài thêm nguồn thứ hai';
  END IF;
END $$;

ALTER TABLE "ticket" ADD CONSTRAINT "ticket_version_positive" CHECK ("version" >= 1);

CREATE OR REPLACE FUNCTION ticket_bump_version() RETURNS trigger AS $$
BEGIN
  NEW.version := OLD.version + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ticket_bump_version
  BEFORE UPDATE ON "ticket"
  FOR EACH ROW EXECUTE FUNCTION ticket_bump_version();

-- TIP-034c §1.5–1.6 / §3.2: biên nhận từng bản ghi của 045b mở rộng (KHÔNG phải sổ hiệu ứng thứ hai): thế hệ (lượt hoàn tác = thế hệ
-- riêng của cùng thao tác cha), kết quả an toàn, version đã nhận / sau ghi, trường đã đổi + dấu vân tay sau ghi (chỉ mã, không nội dung
-- ticket), trạng thái hoàn tác. Thao tác cha = data_job (action_log_id); duy nhất (job, item, generation).
ALTER TABLE "data_job_item"
  ADD COLUMN "generation" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "outcome_code" TEXT,
  ADD COLUMN "changed" BOOLEAN,
  ADD COLUMN "admitted_version" INTEGER,
  ADD COLUMN "after_version" INTEGER,
  ADD COLUMN "receipt" JSONB,
  ADD COLUMN "undo_state" TEXT;
ALTER TABLE "data_job_item" ADD CONSTRAINT "data_job_item_undo_state_check" CHECK ("undo_state" IS NULL OR "undo_state" IN ('eligible', 'pending', 'undone', 'conflict', 'failed'));
CREATE UNIQUE INDEX "data_job_item_target_generation_key" ON "data_job_item" ("job_id", "target_id", "generation");
-- Kết quả / tra biên nhận theo thao tác (≤ 200 dòng): `=` job + trạng thái rồi id bản ghi, payload kết quả trong INCLUDE (Index Only Scan).
CREATE INDEX "data_job_item_result_idx" ON "data_job_item" ("job_id", "status", "target_id") INCLUDE ("outcome_code", "changed", "after_version", "undo_state");

-- Lượt hoàn tác = data_job riêng trỏ về thao tác đi (`parent_job_id`, duy nhất → hai yêu cầu hoàn tác hội tụ một lượt). `undo_seal` trên
-- thao tác đi = digest tập con "đã đổi thành công" đã niêm phong — sau đó không thử lại / nhận thêm bản ghi đi.
ALTER TABLE "data_job"
  ADD COLUMN "parent_job_id" UUID,
  ADD COLUMN "undo_seal" TEXT;
CREATE UNIQUE INDEX "data_job_parent_key" ON "data_job" ("parent_job_id") WHERE "parent_job_id" IS NOT NULL;
