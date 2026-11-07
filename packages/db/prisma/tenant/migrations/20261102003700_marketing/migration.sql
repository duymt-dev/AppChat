-- TIP-037: Marketing — phân khúc (AST đóng), chiến dịch + snapshot người nhận đã duyệt, khoá 48 giờ giữa mọi chiến dịch theo khách,
-- lịch sử append-only, gợi ý AI, lô nhập danh sách. Index theo indexing.md: bằng trước, khoảng / sắp xếp sau; partial deleted_at; INCLUDE
-- cho list (deferred join). Bảng mới — không đổi bảng sẵn có.

CREATE TABLE "segment" (
  "id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "filter" JSONB NOT NULL,
  "is_dynamic" BOOLEAN NOT NULL DEFAULT true,
  "last_count" INTEGER NOT NULL DEFAULT 0,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_by_user_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "deleted_at" TIMESTAMPTZ(6),
  CONSTRAINT "segment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "segment_live_idx" ON "segment" ("updated_at" DESC, "id" DESC) INCLUDE ("name", "last_count") WHERE "deleted_at" IS NULL;

CREATE TABLE "campaign" (
  "id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'manual',
  "channel" TEXT NOT NULL,
  "account_id" UUID,
  "segment_ids" UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  "content" JSONB NOT NULL,
  "ab" JSONB,
  "send_mode" TEXT NOT NULL DEFAULT 'now',
  "status" TEXT NOT NULL DEFAULT 'draft',
  "scheduled_at" TIMESTAMPTZ(6),
  "submitted_at" TIMESTAMPTZ(6),
  "submitted_by_user_id" UUID,
  "approved_by_user_id" UUID,
  "approved_at" TIMESTAMPTZ(6),
  "approved_version" INTEGER,
  "content_hash" TEXT,
  "recipient_snapshot_hash" TEXT,
  "started_at" TIMESTAMPTZ(6),
  "completed_at" TIMESTAMPTZ(6),
  "reject_reason" TEXT,
  "est_recipients" INTEGER NOT NULL DEFAULT 0,
  "est_credits" INTEGER NOT NULL DEFAULT 0,
  "stats" JSONB NOT NULL DEFAULT '{}',
  "suggestion_id" UUID,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_by_user_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "deleted_at" TIMESTAMPTZ(6),
  CONSTRAINT "campaign_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "campaign_channel_chk" CHECK ("channel" IN ('zalo', 'email')),
  CONSTRAINT "campaign_kind_chk" CHECK ("kind" IN ('reactivation', 'upsell', 'conversion', 'aftercare', 'manual')),
  CONSTRAINT "campaign_send_mode_chk" CHECK ("send_mode" IN ('now', 'schedule', 'ai_time')),
  CONSTRAINT "campaign_status_chk" CHECK ("status" IN ('draft', 'pending_approval', 'approved', 'scheduled', 'running', 'paused', 'completed', 'rejected', 'cancelled'))
);
CREATE UNIQUE INDEX "campaign_code_key" ON "campaign" ("code");
-- Danh sách: lọc trạng thái / kênh bằng, sắp xếp created_at DESC, id; INCLUDE cột thẻ list để bước id-first chỉ đọc index.
CREATE INDEX "campaign_list_idx" ON "campaign" ("created_at" DESC, "id" DESC) INCLUDE ("code", "name", "status", "channel", "est_recipients") WHERE "deleted_at" IS NULL;
CREATE INDEX "campaign_status_list_idx" ON "campaign" ("status", "created_at" DESC, "id" DESC) INCLUDE ("code", "name", "channel", "est_recipients") WHERE "deleted_at" IS NULL;
CREATE INDEX "campaign_channel_list_idx" ON "campaign" ("channel", "created_at" DESC, "id" DESC) INCLUDE ("code", "name", "status", "est_recipients") WHERE "deleted_at" IS NULL;
-- Scheduler: chiến dịch đã duyệt / hẹn giờ tới hạn + đang chạy.
CREATE INDEX "campaign_due_idx" ON "campaign" ("status", "scheduled_at") WHERE "deleted_at" IS NULL AND "status" IN ('approved', 'scheduled', 'running');

CREATE TABLE "campaign_audience" (
  "campaign_id" UUID NOT NULL,
  "contact_id" UUID NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'manual',
  "batch_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "campaign_audience_pkey" PRIMARY KEY ("campaign_id", "contact_id"),
  CONSTRAINT "campaign_audience_campaign_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaign" ("id") ON DELETE CASCADE,
  CONSTRAINT "campaign_audience_source_chk" CHECK ("source" IN ('manual', 'import'))
);

CREATE TABLE "campaign_recipient" (
  "id" UUID NOT NULL,
  "campaign_id" UUID NOT NULL,
  "contact_id" UUID NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "skip_reason" TEXT,
  "outcome" TEXT,
  "variant" TEXT NOT NULL DEFAULT 'a',
  "identity_id" UUID,
  "conversation_id" UUID,
  "endpoint" TEXT NOT NULL DEFAULT '',
  "delivery_ref" TEXT NOT NULL,
  "external_msg_id" TEXT,
  "claim_fence" INTEGER NOT NULL DEFAULT 0,
  "claimed_at" TIMESTAMPTZ(6),
  "send_state" TEXT NOT NULL DEFAULT 'none',
  "attempted_at" TIMESTAMPTZ(6),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "error" TEXT,
  "sent_at" TIMESTAMPTZ(6),
  "read_at" TIMESTAMPTZ(6),
  "replied_at" TIMESTAMPTZ(6),
  "converted_at" TIMESTAMPTZ(6),
  "order_id" UUID,
  "revenue" BIGINT NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "campaign_recipient_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "campaign_recipient_campaign_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaign" ("id") ON DELETE CASCADE,
  CONSTRAINT "campaign_recipient_status_chk" CHECK ("status" IN ('pending', 'skipped', 'sent', 'failed', 'replied', 'converted')),
  CONSTRAINT "campaign_recipient_outcome_chk" CHECK ("outcome" IS NULL OR "outcome" IN ('accepted', 'unknown', 'failed')),
  CONSTRAINT "campaign_recipient_variant_chk" CHECK ("variant" IN ('a', 'b')),
  CONSTRAINT "campaign_recipient_send_state_chk" CHECK ("send_state" IN ('none', 'reserved', 'confirmed', 'unknown', 'failed'))
);
CREATE UNIQUE INDEX "campaign_recipient_campaign_id_contact_id_key" ON "campaign_recipient" ("campaign_id", "contact_id");
CREATE UNIQUE INDEX "campaign_recipient_delivery_ref_key" ON "campaign_recipient" ("delivery_ref");
-- Trang người nhận / lô gửi kế tiếp: (campaign, status) bằng → id.
CREATE INDEX "campaign_recipient_status_idx" ON "campaign_recipient" ("campaign_id", "status", "id") INCLUDE ("contact_id", "sent_at");
-- Gán phản hồi / chuyển đổi: tin khách mới → người nhận đã gửi gần nhất của khách.
-- Quét lại việc gửi bị mất (Redis mất / worker sập): đã nhận lô, chưa có kết quả.
CREATE INDEX "campaign_recipient_claimed_idx" ON "campaign_recipient" ("campaign_id", "claimed_at") WHERE "status" = 'pending' AND "outcome" IS NULL AND "claimed_at" IS NOT NULL;
CREATE INDEX "campaign_recipient_contact_sent_idx" ON "campaign_recipient" ("contact_id", "sent_at" DESC) INCLUDE ("campaign_id", "status") WHERE "sent_at" IS NOT NULL;

CREATE TABLE "campaign_contact_touch" (
  "contact_id" UUID NOT NULL,
  "campaign_id" UUID NOT NULL,
  "recipient_id" UUID NOT NULL,
  "state" TEXT NOT NULL DEFAULT 'reserved',
  "touched_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "campaign_contact_touch_pkey" PRIMARY KEY ("contact_id"),
  CONSTRAINT "campaign_contact_touch_state_chk" CHECK ("state" IN ('reserved', 'sent'))
);

CREATE TABLE "campaign_event" (
  "id" UUID NOT NULL,
  "campaign_id" UUID NOT NULL,
  "kind" TEXT NOT NULL,
  "actor_user_id" UUID,
  "actor_name" TEXT NOT NULL DEFAULT '',
  "detail" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "campaign_event_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "campaign_event_campaign_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaign" ("id") ON DELETE CASCADE
);
CREATE INDEX "campaign_event_campaign_idx" ON "campaign_event" ("campaign_id", "created_at");

CREATE TABLE "campaign_suggestion" (
  "id" UUID NOT NULL,
  "kind" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "segment_filter" JSONB NOT NULL,
  "est_count" INTEGER NOT NULL DEFAULT 0,
  "best_time" TEXT,
  "channel" TEXT NOT NULL DEFAULT 'zalo',
  "subject" TEXT NOT NULL DEFAULT '',
  "body" TEXT NOT NULL DEFAULT '',
  "cta" TEXT NOT NULL DEFAULT '',
  "status" TEXT NOT NULL DEFAULT 'new',
  "run_id" UUID,
  "generated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "campaign_suggestion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "campaign_suggestion_kind_chk" CHECK ("kind" IN ('reactivation', 'upsell', 'conversion', 'aftercare')),
  CONSTRAINT "campaign_suggestion_status_chk" CHECK ("status" IN ('new', 'used', 'dismissed'))
);
CREATE INDEX "campaign_suggestion_live_idx" ON "campaign_suggestion" ("generated_at" DESC, "id") WHERE "status" <> 'dismissed';

CREATE TABLE "campaign_audience_batch" (
  "id" UUID NOT NULL,
  "campaign_id" UUID,
  "file_id" UUID NOT NULL,
  "rows" INTEGER NOT NULL DEFAULT 0,
  "valid" INTEGER NOT NULL DEFAULT 0,
  "invalid" INTEGER NOT NULL DEFAULT 0,
  "duplicate" INTEGER NOT NULL DEFAULT 0,
  "opted_out" INTEGER NOT NULL DEFAULT 0,
  "created" INTEGER NOT NULL DEFAULT 0,
  "errors" JSONB NOT NULL DEFAULT '[]',
  "contact_ids" UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  "created_by_user_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "campaign_audience_batch_pkey" PRIMARY KEY ("id")
);
