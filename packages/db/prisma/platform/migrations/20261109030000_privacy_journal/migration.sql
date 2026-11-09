-- TIP-015c §2.5: nhật ký nền tảng cho "Quên khách" — mirror 045b annex A1 (sổ thao tác xuyên DB): reserve Ý ĐỊNH ở đây TRƯỚC khi
-- commit fence/disposition ở tenant. Nhiều revision bất biến mỗi operation; capsule mã hoá, không PII.

CREATE TABLE "privacy_journal_entry" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "sequence" BIGINT NOT NULL,
    "operation_id" UUID NOT NULL,
    "revision" INTEGER NOT NULL,
    "phase" TEXT NOT NULL,
    "capsule_cipher" TEXT NOT NULL,
    "capsule_iv" TEXT NOT NULL,
    "key_version" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "prior_checksum" TEXT,
    "acknowledged_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "privacy_journal_entry_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "privacy_journal_workspace_seq_key" ON "privacy_journal_entry" ("workspace_id", "sequence");
CREATE UNIQUE INDEX "privacy_journal_operation_revision_key" ON "privacy_journal_entry" ("operation_id", "revision");
-- Khôi phục: capsule chưa xác nhận, theo workspace + thứ tự.
CREATE INDEX "privacy_journal_pending_idx" ON "privacy_journal_entry" ("workspace_id", "sequence") WHERE "acknowledged_at" IS NULL;
