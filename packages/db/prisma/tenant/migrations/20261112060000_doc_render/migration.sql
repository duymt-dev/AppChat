-- TIP-028b §1 (Blueprint §2.4 queue `doc-render`, DEF-028-1): PDF chứng từ phát hành render ở worker ROLE=jobs. Action ghi dòng
-- `pending_render` + outbox `document.render_requested` trong transaction; job render → lưu tệp (id tất định — chạy lại không thêm tệp)
-- → `rendered`; hết 3 lần thử → `render_failed` (nút Thử lại tăng `generation`). Index partial cho vòng quét khôi phục việc kẹt (mất job
-- Redis): chỉ dòng đang chờ, theo thời điểm cập nhật.
CREATE TYPE "doc_render_status" AS ENUM ('pending_render', 'rendered', 'render_failed');

CREATE TABLE "document_render" (
  "id" uuid PRIMARY KEY,
  "kind" text NOT NULL,
  "document_id" uuid NOT NULL,
  "generation" integer NOT NULL DEFAULT 1,
  "status" "doc_render_status" NOT NULL DEFAULT 'pending_render',
  "attempts" integer NOT NULL DEFAULT 0,
  "error" text,
  "file_id" uuid,
  "request" jsonb NOT NULL DEFAULT '{}',
  "created_at" timestamptz(6) NOT NULL DEFAULT now(),
  "updated_at" timestamptz(6) NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX "document_render_kind_document_id_key" ON "document_render" ("kind", "document_id");
CREATE INDEX "document_render_pending_idx" ON "document_render" ("updated_at") INCLUDE ("kind", "document_id", "generation") WHERE "status" = 'pending_render';
