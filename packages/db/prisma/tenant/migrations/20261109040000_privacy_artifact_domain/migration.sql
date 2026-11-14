-- TIP-015c pha 2 §2.2: ghi domain + ownership tại lúc materialize artifact — cleanup_step tra lại đúng adapter cần gọi `erase()`,
-- không suy luận ngược từ `kind` (một domain có nhiều kind; kind không tự nói thuộc adapter nào).
ALTER TABLE "privacy_artifact" ADD COLUMN "domain" TEXT NOT NULL DEFAULT 'crm';
ALTER TABLE "privacy_artifact" ADD COLUMN "ownership" TEXT NOT NULL DEFAULT 'exclusive';
ALTER TABLE "privacy_artifact" ALTER COLUMN "domain" DROP DEFAULT;
ALTER TABLE "privacy_artifact" ALTER COLUMN "ownership" DROP DEFAULT;
