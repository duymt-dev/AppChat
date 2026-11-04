-- TIP-032b P2: link công khai xem / tải chứng từ (platform). Khoá = sha256(token) — token thô không lưu.
CREATE TABLE "commerce_link" (
  "token_hash"    TEXT        NOT NULL PRIMARY KEY,
  "workspace_id"  UUID        NOT NULL,
  "document_kind" TEXT        NOT NULL CHECK ("document_kind" IN ('quote', 'payment_request', 'contract', 'order_confirmation', 'receipt')),
  "document_id"   UUID        NOT NULL,
  "version"       INTEGER     NOT NULL CHECK ("version" >= 1),
  "file_id"       UUID        NOT NULL,
  "purpose"       TEXT        NOT NULL CHECK ("purpose" IN ('view')),
  "expires_at"    TIMESTAMPTZ(6) NOT NULL,
  "revoked_at"    TIMESTAMPTZ(6),
  "created_at"    TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);
-- Thu hồi link cũ của cùng chứng từ khi gửi lại: `=` workspace / kind / document trước, mới nhất trước (indexing.md).
CREATE INDEX "commerce_link_document_idx" ON "commerce_link" ("workspace_id", "document_kind", "document_id", "created_at" DESC);
-- Dọn link hết hạn.
CREATE INDEX "commerce_link_expires_idx" ON "commerce_link" ("expires_at");
