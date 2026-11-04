-- TIP-045b annex A1: sổ thao tác xuyên DB (nền tảng trước, tenant sau, khôi phục theo pha) + đặt chỗ hạn mức + hiệu ứng ngoài bền;
-- workspace.authz_epoch tăng cùng transaction khi quyền đổi (cache Redis chỉ là tăng tốc, không phải ranh giới bảo mật).
CREATE TYPE "operation_phase" AS ENUM ('prepared', 'platform_applied', 'tenant_applied', 'complete', 'failed', 'compensation_required');

ALTER TABLE "workspace" ADD COLUMN "authz_epoch" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "action_operation" (
  "id"              UUID              NOT NULL PRIMARY KEY,
  "workspace_id"    UUID              NOT NULL,
  "actor_key"       TEXT              NOT NULL,
  "idempotency_key" TEXT              NOT NULL,
  "action_id"       TEXT              NOT NULL,
  "input_hash"      TEXT              NOT NULL,
  "phase"           "operation_phase" NOT NULL DEFAULT 'prepared',
  "context"         JSONB             NOT NULL,
  "log_input"       JSONB,
  "plan"            JSONB,
  "result"          JSONB,
  "error"           JSONB,
  "action_log_id"   UUID              NOT NULL,
  "approval_id"     UUID,
  "run_id"          UUID,
  "attempts"        INTEGER           NOT NULL DEFAULT 0,
  "fence"           INTEGER           NOT NULL DEFAULT 0,
  "lease_until"     TIMESTAMPTZ(6),
  "next_attempt_at" TIMESTAMPTZ(6),
  "trace_id"        TEXT,
  "created_at"      TIMESTAMPTZ(6)    NOT NULL DEFAULT now(),
  "updated_at"      TIMESTAMPTZ(6)    NOT NULL DEFAULT now()
);
-- Khoá idempotency theo workspace + actor (= trước).
CREATE UNIQUE INDEX "action_operation_workspace_id_actor_key_idempotency_key_key" ON "action_operation" ("workspace_id", "actor_key", "idempotency_key");
-- Hàng khôi phục: chỉ thao tác chưa xong, theo pha (=) rồi mốc thử lại (range); INCLUDE cột đọc ngay khi quét (annex E).
CREATE INDEX "action_operation_recovery_idx" ON "action_operation" ("phase", "next_attempt_at", "id") INCLUDE ("workspace_id", "action_id")
  WHERE "phase" IN ('prepared', 'platform_applied', 'tenant_applied');
-- Duyệt AI → thao tác (tiếp tục run sau khi tenant áp xong).
CREATE INDEX "action_operation_approval_idx" ON "action_operation" ("approval_id") WHERE "approval_id" IS NOT NULL;

CREATE TABLE "quota_reservation" (
  "operation_id" UUID           NOT NULL PRIMARY KEY,
  "workspace_id" UUID           NOT NULL,
  "resource"     TEXT           NOT NULL CHECK ("resource" IN ('users', 'channels', 'agents')),
  "status"       TEXT           NOT NULL DEFAULT 'reserved' CHECK ("status" IN ('reserved', 'consumed', 'released')),
  "created_at"   TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "settled_at"   TIMESTAMPTZ(6)
);
-- Đếm chỗ đang giữ khi kiểm hạn mức: = workspace + resource, chỉ dòng reserved.
CREATE INDEX "quota_reservation_open_idx" ON "quota_reservation" ("workspace_id", "resource") WHERE "status" = 'reserved';

CREATE TABLE "platform_effect" (
  "id"              UUID           NOT NULL PRIMARY KEY,
  "operation_id"    UUID           NOT NULL,
  "workspace_id"    UUID           NOT NULL,
  "kind"            TEXT           NOT NULL,
  "payload_enc"     BYTEA,
  "status"          TEXT           NOT NULL DEFAULT 'pending' CHECK ("status" IN ('pending', 'sent', 'dead')),
  "attempts"        INTEGER        NOT NULL DEFAULT 0,
  "next_attempt_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "expires_at"      TIMESTAMPTZ(6) NOT NULL,
  "last_error"      TEXT,
  "created_at"      TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "sent_at"         TIMESTAMPTZ(6)
);
CREATE UNIQUE INDEX "platform_effect_operation_id_kind_key" ON "platform_effect" ("operation_id", "kind");
-- Hàng gửi: chỉ pending, theo mốc thử lại.
CREATE INDEX "platform_effect_pending_idx" ON "platform_effect" ("next_attempt_at", "id") WHERE "status" = 'pending';

-- Audit nền tảng theo workspace có thứ tự ổn định (annex E): created_at DESC, id DESC.
CREATE INDEX "platform_audit_log_ws_page_idx" ON "platform_audit_log" ("workspace_id", "created_at" DESC, "id" DESC);

-- Annex A3: OTP đổi Chủ sở hữu — băm, hạn 10 phút, sai 5 lần khoá; ràng buộc workspace / Owner / người nhận / authz_epoch.
CREATE TABLE "owner_transfer_otp" (
  "id"                    UUID           NOT NULL PRIMARY KEY,
  "workspace_id"          UUID           NOT NULL,
  "owner_user_id"         UUID           NOT NULL,
  "target_user_id"        UUID           NOT NULL,
  "authz_epoch"           INTEGER        NOT NULL,
  "code_hash"             TEXT           NOT NULL,
  "attempts"              INTEGER        NOT NULL DEFAULT 0,
  "expires_at"            TIMESTAMPTZ(6) NOT NULL,
  "consumed_at"           TIMESTAMPTZ(6),
  "consumed_operation_id" UUID,
  "created_at"            TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);
-- Mã còn sống của workspace (xin mã mới huỷ mã cũ): = workspace, chỉ dòng chưa tiêu.
CREATE INDEX "owner_transfer_otp_open_idx" ON "owner_transfer_otp" ("workspace_id", "created_at" DESC) WHERE "consumed_at" IS NULL;
