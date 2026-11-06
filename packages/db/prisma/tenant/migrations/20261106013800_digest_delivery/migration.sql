-- TIP-038 pha 4: sổ email tóm tắt hằng ngày / hằng tuần (DC-241 / DC-366). Expand-only.
CREATE TYPE "digest_cadence" AS ENUM ('daily', 'weekly');
CREATE TYPE "digest_state" AS ENUM ('queued', 'sending', 'sent', 'failed', 'unknown', 'skipped');

CREATE TABLE "digest_delivery" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "cadence" "digest_cadence" NOT NULL,
  "period_start" TIMESTAMPTZ(6) NOT NULL,
  "period_end" TIMESTAMPTZ(6) NOT NULL,
  "state" "digest_state" NOT NULL DEFAULT 'queued',
  "next_attempt_at" TIMESTAMPTZ(6) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "attempted_at" TIMESTAMPTZ(6),
  "sent_at" TIMESTAMPTZ(6),
  "provider_id" TEXT,
  "reason" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "digest_delivery_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "digest_delivery_period_chk" CHECK ("period_end" > "period_start"),
  -- Đã gửi thì có mốc gửi; chưa gửi thì không.
  CONSTRAINT "digest_delivery_sent_chk" CHECK (("state" = 'sent') = ("sent_at" IS NOT NULL))
);

-- Một email mỗi (người nhận, nhịp, kỳ) — scheduler chạy lại / hai worker không tạo trùng (DB là nguồn sự thật, không dựa jobId Redis).
CREATE UNIQUE INDEX "digest_delivery_period_key" ON "digest_delivery" ("user_id", "cadence", "period_start");
-- Hàng gửi: dòng còn phải xử lý theo mốc được phép gửi (bằng trước: state; khoảng: next_attempt_at; khoá ổn định id).
CREATE INDEX "digest_delivery_actionable_idx" ON "digest_delivery" ("state", "next_attempt_at", "id") WHERE "state" IN ('queued', 'sending');
