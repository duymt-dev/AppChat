-- TIP-038 pha 2: việc follow khách bền (follow_up.complete + dashboard / lịch / bản tin) — DC-241. Expand-only.
CREATE TYPE "follow_up_status" AS ENUM ('pending', 'done', 'superseded');

CREATE TABLE "follow_up" (
  "id" UUID NOT NULL,
  "contact_id" UUID NOT NULL,
  "source_key" TEXT NOT NULL,
  "source_at" TIMESTAMPTZ(6) NOT NULL,
  "due_at" TIMESTAMPTZ(6) NOT NULL,
  "status" "follow_up_status" NOT NULL DEFAULT 'pending',
  "version" INTEGER NOT NULL DEFAULT 1,
  "completed_by_user_id" UUID,
  "completed_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "follow_up_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "follow_up_contact_fkey" FOREIGN KEY ("contact_id") REFERENCES "contact" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  -- Đã xong thì có người / mốc hoàn tất; chưa xong thì không.
  CONSTRAINT "follow_up_done_chk" CHECK (("status" = 'done') = ("completed_at" IS NOT NULL))
);

-- Một việc mỗi (khách + mốc tương tác) — sweep chạy lại / hai worker không sinh trùng.
CREATE UNIQUE INDEX "follow_up_source_key_key" ON "follow_up" ("source_key");
-- Danh sách việc còn mở theo hạn (dashboard tối đa 5, lịch hôm nay): partial pending, khoá sắp xếp (due_at, id), payload nhỏ INCLUDE.
CREATE INDEX "follow_up_pending_due_idx" ON "follow_up" ("due_at", "id") INCLUDE ("contact_id", "version") WHERE "status" = 'pending';
-- Tương tác mới → thay việc cũ còn mở của khách (bằng trước).
CREATE INDEX "follow_up_contact_pending_idx" ON "follow_up" ("contact_id") WHERE "status" = 'pending';
-- Sweep tìm khách im lặng ≥ 7 ngày còn sống, chưa won / lost: theo mốc tương tác (đã có contact_live_recent_idx — last_interaction_at DESC, id
-- DESC, partial deleted_at IS NULL) — không thêm index contact.
