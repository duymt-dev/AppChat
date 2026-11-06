-- TIP-045b annex E: đối soát nền tảng ↔ tenant hằng giờ — phát hiện lệch (chỉ ghi nhận) + điểm dừng mỗi workspace.
CREATE TABLE "reconcile_finding" (
  "id" UUID NOT NULL,
  "workspace_id" UUID NOT NULL,
  "check" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "cutoff" TIMESTAMPTZ(6) NOT NULL,
  "severity" TEXT NOT NULL,
  "detail" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolved_at" TIMESTAMPTZ(6),
  CONSTRAINT "reconcile_finding_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "reconcile_finding_severity_check" CHECK ("severity" IN ('mismatch', 'pending'))
);
-- Khoá ổn định: chạy lại cùng mốc cắt không ghi trùng (ON CONFLICT DO NOTHING).
CREATE UNIQUE INDEX "reconcile_finding_workspace_id_check_reference_cutoff_key" ON "reconcile_finding" ("workspace_id", "check", "reference", "cutoff");
-- Trang quản trị: phát hiện còn mở, mới nhất trước (partial — đã xử lý thì rời index).
CREATE INDEX "reconcile_finding_open_idx" ON "reconcile_finding" ("created_at" DESC, "id" DESC) INCLUDE ("workspace_id", "check", "severity") WHERE "resolved_at" IS NULL;

CREATE TABLE "reconcile_checkpoint" (
  "workspace_id" UUID NOT NULL,
  "cutoff" TIMESTAMPTZ(6) NOT NULL,
  "checked_at" TIMESTAMPTZ(6) NOT NULL,
  "findings" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "reconcile_checkpoint_pkey" PRIMARY KEY ("workspace_id")
);

-- Đối soát trừ tiền AI: dòng `ai_step` của workspace trong cửa sổ trước mốc cắt — (workspace_id =, ref_type =) rồi (created_at, id) range /
-- thứ tự keyset; INCLUDE cột đọc → Index Only Scan. (Tổng delta cả ví dùng credit_ledger_ws_created_idx INCLUDE delta sẵn có.)
CREATE INDEX "credit_ledger_ws_ref_time_idx" ON "credit_ledger" ("workspace_id", "ref_type", "created_at", "id") INCLUDE ("ref_id", "delta");

