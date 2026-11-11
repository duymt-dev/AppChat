-- TIP-023f §1.3, §5.2: artifact đầu vào Trợ lý + phần nội dung private. Index theo standards/indexing: cột `=` trước, sắp/khoảng sau;
-- INCLUDE cột hẹp hay đọc; không INCLUDE văn bản rộng.
CREATE TYPE "assistant_input_phase" AS ENUM ('queued', 'preparing', 'ready', 'unsupported', 'failed', 'cancelled');

CREATE TABLE "assistant_input_artifact" (
    "id" UUID NOT NULL,
    "owner_user_id" UUID NOT NULL,
    "draft_nonce" UUID NOT NULL,
    "session_id" UUID,
    "file_id" UUID NOT NULL,
    "file_digest" TEXT NOT NULL,
    "parser_version" INTEGER NOT NULL,
    "phase" "assistant_input_phase" NOT NULL DEFAULT 'queued',
    "revision" INTEGER NOT NULL DEFAULT 1,
    "kind" TEXT,
    "name" TEXT NOT NULL,
    "size" BIGINT NOT NULL,
    "part_count" INTEGER NOT NULL DEFAULT 0,
    "char_count" INTEGER NOT NULL DEFAULT 0,
    "error_reason" TEXT,
    "lease_owner" TEXT,
    "lease_until" TIMESTAMPTZ(6),
    "fence" INTEGER NOT NULL DEFAULT 0,
    "bound_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6),
    CONSTRAINT "assistant_input_artifact_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "assistant_input_part" (
    "artifact_id" UUID NOT NULL,
    "id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "locator_kind" TEXT NOT NULL,
    "locator" JSONB NOT NULL,
    "text" TEXT,
    "image_file_id" UUID,
    CONSTRAINT "assistant_input_part_pkey" PRIMARY KEY ("artifact_id", "id")
);

ALTER TABLE "assistant_input_part" ADD CONSTRAINT "assistant_input_part_artifact_id_fkey" FOREIGN KEY ("artifact_id") REFERENCES "assistant_input_artifact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Prepare idempotent: một artifact / (chủ, bản nháp, digest, phiên bản parser) — chạy lại / song song trả cùng hàng.
CREATE UNIQUE INDEX "assistant_input_artifact_identity_key" ON "assistant_input_artifact" ("owner_user_id", "draft_nonce", "file_digest", "parser_version");
-- Danh sách tệp của bản nháp (chủ = , nháp = , sắp created_at, id).
CREATE INDEX "assistant_input_artifact_draft_idx" ON "assistant_input_artifact" ("owner_user_id", "draft_nonce", "created_at", "id") INCLUDE ("phase", "revision", "file_id");
-- Tệp đã buộc vào phiên (lịch sử / dựng lại ngữ cảnh).
CREATE INDEX "assistant_input_artifact_session_idx" ON "assistant_input_artifact" ("session_id", "created_at", "id") INCLUDE ("phase", "revision") WHERE "session_id" IS NOT NULL;
-- Quét việc chờ (§1.5): phase = queued/preparing, lease hết hạn trước.
CREATE INDEX "assistant_input_artifact_work_idx" ON "assistant_input_artifact" ("phase", "lease_until", "id") WHERE "phase" IN ('queued', 'preparing');
-- Dọn bản nháp bỏ dở chưa buộc phiên (24h).
CREATE INDEX "assistant_input_artifact_unbound_idx" ON "assistant_input_artifact" ("phase", "expires_at", "id") WHERE "session_id" IS NULL;
-- Đọc phần theo thứ tự (artifact = , sắp position).
CREATE UNIQUE INDEX "assistant_input_part_order_idx" ON "assistant_input_part" ("artifact_id", "position", "id") INCLUDE ("locator_kind");
