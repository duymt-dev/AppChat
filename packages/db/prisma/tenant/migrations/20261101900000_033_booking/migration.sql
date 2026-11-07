-- TIP-033: Lịch hẹn (Blueprint §2.2 booking, REQ-G01–G05, COMMERCE §6 / 8b, state-machine).
-- staff + staff_schedule (ca riêng) · business_hours (7 dòng) · booking_setting (một dòng) · appointment (mã `LH-{n}`, chống trùng
-- theo nhân sự bằng EXCLUDE btree_gist trên [start_at, block_end_at) khi còn giữ chỗ — pending / confirmed / in_progress).

-- CreateEnum
CREATE TYPE "appointment_status" AS ENUM ('pending', 'confirmed', 'in_progress', 'done', 'no_show', 'cancelled', 'expired');

-- CreateTable
CREATE TABLE "staff" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "user_id" UUID,
    "role" TEXT NOT NULL DEFAULT '',
    "color" TEXT NOT NULL DEFAULT '',
    "team" TEXT NOT NULL DEFAULT '',
    "room" TEXT NOT NULL DEFAULT '',
    "skills" UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "staff_name_chk" CHECK (length(btrim("name")) > 0)
);
CREATE INDEX "staff_active_idx" ON "staff" ("sort", "name") WHERE "active";

-- CreateTable
CREATE TABLE "staff_schedule" (
    "id" UUID NOT NULL,
    "staff_id" UUID NOT NULL,
    "weekday" INTEGER NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,

    CONSTRAINT "staff_schedule_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "staff_schedule_staff_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "staff_schedule_day_chk" CHECK ("weekday" BETWEEN 0 AND 6),
    CONSTRAINT "staff_schedule_time_chk" CHECK ("start_time" ~ '^[0-2][0-9]:[0-5][0-9]$' AND "end_time" ~ '^[0-2][0-9]:[0-5][0-9]$' AND "start_time" < "end_time")
);
CREATE UNIQUE INDEX "staff_schedule_staff_id_weekday_key" ON "staff_schedule" ("staff_id", "weekday");

-- CreateTable
CREATE TABLE "business_hours" (
    "weekday" INTEGER NOT NULL,
    "open" BOOLEAN NOT NULL DEFAULT true,
    "start_time" TEXT NOT NULL DEFAULT '08:00',
    "end_time" TEXT NOT NULL DEFAULT '19:00',

    CONSTRAINT "business_hours_pkey" PRIMARY KEY ("weekday"),
    CONSTRAINT "business_hours_day_chk" CHECK ("weekday" BETWEEN 0 AND 6),
    CONSTRAINT "business_hours_time_chk" CHECK ("start_time" ~ '^[0-2][0-9]:[0-5][0-9]$' AND "end_time" ~ '^[0-2][0-9]:[0-5][0-9]$' AND "start_time" < "end_time")
);
INSERT INTO "business_hours" ("weekday", "open", "start_time", "end_time")
SELECT d, true, '08:00', '19:00' FROM generate_series(0, 6) AS d ON CONFLICT DO NOTHING;

-- CreateTable
CREATE TABLE "booking_setting" (
    "id" SMALLINT NOT NULL DEFAULT 1,
    "default_buffer_min" INTEGER NOT NULL DEFAULT 10,
    "slot_step_min" INTEGER NOT NULL DEFAULT 30,
    "no_show_deducts" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_setting_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "booking_setting_one_chk" CHECK ("id" = 1),
    CONSTRAINT "booking_setting_num_chk" CHECK ("default_buffer_min" BETWEEN 0 AND 240 AND "slot_step_min" IN (5, 10, 15, 20, 30, 60))
);
INSERT INTO "booking_setting" ("id") VALUES (1) ON CONFLICT DO NOTHING;

-- CreateTable
CREATE TABLE "appointment" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "contact_id" UUID NOT NULL,
    "owner_user_id" UUID,
    "service_id" UUID NOT NULL,
    "staff_id" UUID NOT NULL,
    "start_at" TIMESTAMPTZ(6) NOT NULL,
    "end_at" TIMESTAMPTZ(6) NOT NULL,
    "block_end_at" TIMESTAMPTZ(6) NOT NULL,
    "status" "appointment_status" NOT NULL DEFAULT 'pending',
    "hold_expires_at" TIMESTAMPTZ(6),
    "reschedule_count" INTEGER NOT NULL DEFAULT 0,
    "cancel_reason" TEXT,
    "source" TEXT NOT NULL DEFAULT 'staff',
    "conversation_id" UUID,
    "package_id" UUID,
    "order_id" UUID,
    "note" TEXT NOT NULL DEFAULT '',
    "reminder_min" INTEGER,
    "reminders_sent" JSONB NOT NULL DEFAULT '[]',
    "confirmed_at" TIMESTAMPTZ(6),
    "checked_in_at" TIMESTAMPTZ(6),
    "done_at" TIMESTAMPTZ(6),
    "custom" JSONB NOT NULL DEFAULT '{}',
    "created_by_type" TEXT NOT NULL DEFAULT 'user',
    "created_by_id" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "appointment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "appointment_contact_fkey" FOREIGN KEY ("contact_id") REFERENCES "contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "appointment_service_fkey" FOREIGN KEY ("service_id") REFERENCES "product"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "appointment_staff_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "appointment_conversation_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "appointment_package_fkey" FOREIGN KEY ("package_id") REFERENCES "customer_package"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "appointment_order_fkey" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "appointment_time_chk" CHECK ("start_at" < "end_at" AND "end_at" <= "block_end_at"),
    CONSTRAINT "appointment_cancel_chk" CHECK ("status" <> 'cancelled' OR length(btrim(coalesce("cancel_reason", ''))) > 0),
    CONSTRAINT "appointment_resched_chk" CHECK ("reschedule_count" >= 0),
    -- REQ-G03: một nhân sự không có hai lịch còn giữ chỗ chồng nhau (kể cả thời gian đệm).
    CONSTRAINT "appointment_no_overlap" EXCLUDE USING gist ("staff_id" WITH =, tstzrange("start_at", "block_end_at", '[)') WITH &&)
      WHERE ("status" IN ('pending', 'confirmed', 'in_progress') AND "deleted_at" IS NULL)
);
CREATE UNIQUE INDEX "appointment_code_key" ON "appointment" ("code");
-- Lịch theo khoảng ngày (ngày / tuần / tháng / danh sách) + KPI hôm nay.
CREATE INDEX "appointment_start_idx" ON "appointment" ("start_at") INCLUDE ("staff_id", "status") WHERE "deleted_at" IS NULL;
-- Lọc theo nhân sự (làn KTV, slot).
CREATE INDEX "appointment_staff_start_idx" ON "appointment" ("staff_id", "start_at") WHERE "deleted_at" IS NULL;
-- Scope booking own (indexing §7).
CREATE INDEX "appointment_owner_start_idx" ON "appointment" ("owner_user_id", "start_at") WHERE "deleted_at" IS NULL;
-- Lịch của khách (hồ sơ 360°, gắn liệu trình).
CREATE INDEX "appointment_contact_idx" ON "appointment" ("contact_id", "start_at" DESC) INCLUDE ("status", "service_id") WHERE "deleted_at" IS NULL;
-- Job: giữ chỗ hết hạn + nhắc hẹn (chỉ lịch còn mở).
CREATE INDEX "appointment_hold_idx" ON "appointment" ("hold_expires_at") WHERE "status" = 'pending' AND "deleted_at" IS NULL;
CREATE INDEX "appointment_open_start_idx" ON "appointment" ("start_at") WHERE "status" IN ('pending', 'confirmed') AND "deleted_at" IS NULL;
CREATE INDEX "appointment_code_prefix_idx" ON "appointment" ("code" text_pattern_ops);
CREATE INDEX "appointment_custom_gin_idx" ON "appointment" USING gin ("custom" jsonb_path_ops) WHERE "deleted_at" IS NULL;

-- package_usage.appointment_id (032) → FK tới lịch hẹn.
ALTER TABLE "package_usage" ADD CONSTRAINT "package_usage_appointment_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Lịch sử thao tác theo lịch hẹn (drawer).
CREATE INDEX "action_log_appointment_idx" ON "action_log" ((coalesce("result" ->> 'appointment_id', "input" ->> 'appointment_id')), "created_at" DESC)
  WHERE "action_id" LIKE 'appointment.%';
