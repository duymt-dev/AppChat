-- TIP-041 (DC-245, DC-375): vòng đời DB tenant — lệnh archive / restore / delete bền ở DB nền tảng + manifest bản lưu trữ mã hoá.
-- Expand-only: cột mới có mặc định, bảng mới; code cũ không đọc.

-- Thế hệ thao tác vòng đời của workspace: mỗi lệnh archive / restore / delete nhận số kế tiếp (CAS) — worker cũ không ghi đè lệnh mới.
ALTER TABLE "workspace" ADD COLUMN "lifecycle_generation" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "workspace_lifecycle_job" (
  "id" UUID NOT NULL,
  "workspace_id" UUID NOT NULL,
  "operation" TEXT NOT NULL,
  "generation" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "step" TEXT NOT NULL DEFAULT 'queued',
  "expected_version" INTEGER NOT NULL,
  "source" TEXT NOT NULL,
  "requested_by" UUID,
  "lease_owner" TEXT,
  "lease_expires_at" TIMESTAMPTZ(6),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "next_attempt_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "error" TEXT,
  "manifest_id" UUID,
  "metrics" JSONB NOT NULL DEFAULT '{}',
  "started_at" TIMESTAMPTZ(6),
  "finished_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "workspace_lifecycle_job_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "workspace_lifecycle_job_operation_check" CHECK ("operation" IN ('archive', 'restore', 'delete')),
  CONSTRAINT "workspace_lifecycle_job_status_check" CHECK ("status" IN ('pending', 'running', 'succeeded', 'failed', 'recovery_needed', 'cancelled')),
  CONSTRAINT "workspace_lifecycle_job_source_check" CHECK ("source" IN ('admin', 'scan', 'member', 'owner', 'recovery'))
);
-- Một thế hệ một lệnh (`=` cả hai cột).
CREATE UNIQUE INDEX "workspace_lifecycle_job_workspace_id_generation_key" ON "workspace_lifecycle_job" ("workspace_id", "generation");
-- Tối đa MỘT lệnh đang chờ / chạy mỗi workspace — archive / restore / delete đồng thời chỉ một bên thắng.
CREATE UNIQUE INDEX "workspace_lifecycle_job_active_key" ON "workspace_lifecycle_job" ("workspace_id") WHERE "status" IN ('pending', 'running');
-- Hàng chờ của dispatcher: `=` status trước, khoảng next_attempt_at sau, id ổn định; INCLUDE → Index Only Scan danh sách ứng viên.
CREATE INDEX "workspace_lifecycle_job_due_idx" ON "workspace_lifecycle_job" ("status", "next_attempt_at", "id") INCLUDE ("workspace_id", "operation", "generation") WHERE "status" IN ('pending', 'running');
-- Trạng thái lệnh mới nhất của workspace (API trạng thái / màn khôi phục).
CREATE INDEX "workspace_lifecycle_job_ws_created_idx" ON "workspace_lifecycle_job" ("workspace_id", "created_at" DESC, "id" DESC);

CREATE TABLE "archive_manifest" (
  "id" UUID NOT NULL,
  "workspace_id" UUID NOT NULL,
  "job_id" UUID NOT NULL,
  "generation" INTEGER NOT NULL,
  "storage_key" TEXT NOT NULL,
  "db_name" TEXT NOT NULL,
  "db_host" TEXT,
  "schema_version" TEXT,
  "format" TEXT NOT NULL DEFAULT 'pg_custom',
  "envelope_version" INTEGER NOT NULL,
  "encryption_key_id" TEXT NOT NULL,
  "checksum" TEXT NOT NULL,
  "size_bytes" BIGINT NOT NULL,
  "cipher_checksum" TEXT NOT NULL,
  "cipher_bytes" BIGINT NOT NULL,
  "toc_entries" INTEGER NOT NULL,
  "table_count" INTEGER NOT NULL,
  "retention_kind" TEXT NOT NULL DEFAULT 'indefinite',
  "expires_at" TIMESTAMPTZ(6),
  "hold_reason" TEXT,
  "purged_at" TIMESTAMPTZ(6),
  "verified_at" TIMESTAMPTZ(6) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "archive_manifest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "archive_manifest_retention_check" CHECK ("retention_kind" IN ('indefinite', 'deletion')),
  -- Bản giữ vô hạn không có hạn; bản xoá phải có hạn (purge chỉ chạm bản có hạn đã qua).
  CONSTRAINT "archive_manifest_expiry_check" CHECK (("retention_kind" = 'indefinite') = ("expires_at" IS NULL)),
  CONSTRAINT "archive_manifest_sizes_check" CHECK ("size_bytes" > 0 AND "cipher_bytes" > 0 AND "toc_entries" > 0)
);
CREATE UNIQUE INDEX "archive_manifest_storage_key_key" ON "archive_manifest" ("storage_key");
-- Bản lưu trữ mới nhất của workspace (khôi phục / xoá liệt kê mọi thế hệ): `=` workspace, sort created_at; INCLUDE cột quyết định.
CREATE INDEX "archive_manifest_ws_created_idx" ON "archive_manifest" ("workspace_id", "created_at" DESC, "id" DESC) INCLUDE ("checksum", "retention_kind", "expires_at");
-- Purge: chỉ bản xoá còn hạn chờ (chưa purge, không hold) — khoảng expires_at.
CREATE INDEX "archive_manifest_purge_idx" ON "archive_manifest" ("expires_at", "id") WHERE "retention_kind" = 'deletion' AND "purged_at" IS NULL AND "hold_reason" IS NULL;
