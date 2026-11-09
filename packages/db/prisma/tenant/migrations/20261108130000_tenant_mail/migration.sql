-- TIP-012c §2–§3: chiến dịch email gửi qua kết nối mail của DN (Brevo / SMTP) — người gửi chọn TƯỜNG MINH và chốt cùng bản duyệt
-- (không chọn "kết nối mới nhất" lúc gửi). Biên nhận giao thư riêng tư mỗi lượt gửi (dispatch_ref) + sự kiện giao thư chỉ thêm. Không lưu
-- địa chỉ người nhận / nội dung (chỉ digest); không workspace_id (DB tenant).

-- Người gửi của chiến dịch: channel_account (kênh — như cũ, account_id) HOẶC tenant_mail (kết nối + định danh người gửi + phiên bản).
ALTER TABLE "campaign" ADD COLUMN "sender_kind" TEXT NOT NULL DEFAULT 'channel_account';
ALTER TABLE "campaign" ADD COLUMN "mail_connection_id" UUID;
ALTER TABLE "campaign" ADD COLUMN "mail_sender_id" TEXT;
ALTER TABLE "campaign" ADD COLUMN "mail_sender_rev" INTEGER;
ALTER TABLE "campaign" ADD CONSTRAINT "campaign_sender_kind_check" CHECK ("sender_kind" IN ('channel_account', 'tenant_mail'));
ALTER TABLE "campaign" ADD CONSTRAINT "campaign_tenant_mail_ref_check" CHECK ("sender_kind" <> 'tenant_mail' OR ("channel" = 'email' AND "mail_connection_id" IS NOT NULL AND "mail_sender_id" IS NOT NULL AND "mail_sender_rev" IS NOT NULL));

CREATE TYPE "tenant_mail_state" AS ENUM ('queued', 'reserved', 'accepted', 'failed_before_accept', 'unknown');

-- Biên nhận giao thư: một dòng mỗi lượt gửi (dispatch_ref = `cr_<recipient>` hoặc `ct_<test>`). subject_kind tách gửi thật / gửi thử.
CREATE TABLE "tenant_mail_delivery" (
    "id" UUID NOT NULL,
    "dispatch_ref" TEXT NOT NULL,
    "connection_id" UUID NOT NULL,
    "subject_kind" TEXT NOT NULL,
    "campaign_id" UUID NOT NULL,
    "recipient_id" UUID,
    "test_invocation_id" UUID,
    "sender_id" TEXT NOT NULL,
    "sender_rev" INTEGER NOT NULL,
    "config_rev" INTEGER NOT NULL,
    "recipient_digest" TEXT NOT NULL,
    "provider_account_ref" TEXT NOT NULL DEFAULT '',
    "provider_message_ref" TEXT,
    "state" "tenant_mail_state" NOT NULL DEFAULT 'queued',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "reason" TEXT,
    "next_attempt_at" TIMESTAMPTZ(6),
    "accepted_at" TIMESTAMPTZ(6),
    "last_event_at" TIMESTAMPTZ(6),
    "facts" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tenant_mail_delivery_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "tenant_mail_delivery_subject_check" CHECK (("subject_kind" = 'campaign_recipient' AND "recipient_id" IS NOT NULL) OR ("subject_kind" = 'test_send' AND "test_invocation_id" IS NOT NULL))
);
CREATE UNIQUE INDEX "tenant_mail_delivery_dispatch_key" ON "tenant_mail_delivery" ("dispatch_ref");
-- Ghép callback: kết nối + tài khoản provider + mã thư (chỉ dòng đã có mã).
CREATE INDEX "tenant_mail_delivery_message_idx" ON "tenant_mail_delivery" ("connection_id", "provider_account_ref", "provider_message_ref") INCLUDE ("campaign_id", "state", "recipient_digest") WHERE "provider_message_ref" IS NOT NULL;
-- Danh sách theo chiến dịch (lọc trạng thái, mới trước) — ID trước rồi mới lấy cột rộng.
CREATE INDEX "tenant_mail_delivery_campaign_idx" ON "tenant_mail_delivery" ("campaign_id", "state", "created_at" DESC, "id" DESC) INCLUDE ("recipient_id", "accepted_at");
-- Khôi phục / thử lại theo lịch.
CREATE INDEX "tenant_mail_delivery_recovery_idx" ON "tenant_mail_delivery" ("state", "next_attempt_at", "id") WHERE "state" IN ('queued', 'reserved');

-- Sự kiện giao thư đã xác thực (chỉ thêm, chống lặp theo khoá provider). `delivery_id` null = chưa ghép được (chờ đối soát, có giới hạn).
CREATE TABLE "tenant_mail_event" (
    "id" UUID NOT NULL,
    "connection_id" UUID NOT NULL,
    "external_event_key" TEXT NOT NULL,
    "delivery_id" UUID,
    "type" TEXT NOT NULL,
    "provider_message_ref" TEXT NOT NULL,
    "recipient_digest" TEXT NOT NULL,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'unresolved',
    "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tenant_mail_event_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "tenant_mail_event_state_check" CHECK ("state" IN ('unresolved', 'applied', 'ignored'))
);
CREATE UNIQUE INDEX "tenant_mail_event_key" ON "tenant_mail_event" ("connection_id", "external_event_key");
CREATE INDEX "tenant_mail_event_unresolved_idx" ON "tenant_mail_event" ("connection_id", "state", "received_at", "id") WHERE "state" = 'unresolved';
CREATE INDEX "tenant_mail_event_delivery_idx" ON "tenant_mail_event" ("delivery_id", "occurred_at") WHERE "delivery_id" IS NOT NULL;

-- Vật liệu xác thực callback giữ riêng sau ngắt kết nối (≤ 30 ngày sau lần nhận cuối) — chỉ token webhook đã mã hoá, KHÔNG khoá gửi.
CREATE TABLE "tenant_mail_callback_binding" (
    "connection_id" UUID NOT NULL,
    "account_ref" TEXT NOT NULL DEFAULT '',
    "verification_rev" INTEGER NOT NULL,
    "verifier_enc" BYTEA,
    "operation_id" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tenant_mail_callback_binding_pkey" PRIMARY KEY ("connection_id", "verification_rev")
);
CREATE UNIQUE INDEX "tenant_mail_callback_binding_op_key" ON "tenant_mail_callback_binding" ("operation_id");
CREATE INDEX "tenant_mail_callback_binding_expiry_idx" ON "tenant_mail_callback_binding" ("connection_id", "expires_at") INCLUDE ("account_ref", "verification_rev");
CREATE INDEX "tenant_mail_callback_binding_purge_idx" ON "tenant_mail_callback_binding" ("expires_at", "connection_id") WHERE "verifier_enc" IS NOT NULL;
