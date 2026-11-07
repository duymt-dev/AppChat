-- TIP-025b §D.4: phiên bản lạc quan của khách. Mọi UPDATE (kể cả writer cũ: chuyển phụ trách, gộp, nhập, tin vào, hệ thống) tăng
-- version qua trigger — không tin giá trị version người gọi gửi (nhỏ hơn / khôi phục bản cũ). Chỉ thêm cột mặc định, không đổi dữ liệu.
ALTER TABLE "contact" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "contact" ADD CONSTRAINT "contact_version_positive" CHECK ("version" >= 1);

CREATE OR REPLACE FUNCTION contact_bump_version() RETURNS trigger AS $$
BEGIN
  NEW.version := OLD.version + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contact_bump_version
  BEFORE UPDATE ON "contact"
  FOR EACH ROW EXECUTE FUNCTION contact_bump_version();
