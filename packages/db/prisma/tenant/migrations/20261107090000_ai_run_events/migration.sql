-- TIP-019b P3 (DC-379, DC-380): trạng thái chờ thật + lineage bền + sự kiện run đã commit.
-- Trạng thái chờ tách bạch: chờ run con / chờ thao tác nền tảng / chờ đối soát usage (không gộp vào waiting_approval hay failed).
ALTER TYPE "ai_run_status" ADD VALUE IF NOT EXISTS 'waiting_child';
ALTER TYPE "ai_run_status" ADD VALUE IF NOT EXISTS 'waiting_operation';
ALTER TYPE "ai_run_status" ADD VALUE IF NOT EXISTS 'waiting_usage';

-- Lineage bền (§4.1): số lần chuyển agent + agent đã ghé trong lượt khách — chạy lại / khởi động lại không đặt về 0.
-- `event_seq` chỉ dùng ở dòng run gốc: số thứ tự sự kiện tăng đơn điệu theo cây.
ALTER TABLE "ai_run" ADD COLUMN "transfer_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ai_run" ADD COLUMN "visited_agents" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "ai_run" ADD COLUMN "event_seq" INTEGER NOT NULL DEFAULT 0;

-- Sự kiện run (§5.3): mỗi bước / chuyển trạng thái đã commit một dòng, (gốc, seq) duy nhất — chỉ tham chiếu an toàn, không output.
CREATE TABLE "ai_run_event" (
    "root_run_id" UUID NOT NULL,
    "seq" INTEGER NOT NULL,
    "run_id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "step_idx" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_run_event_pkey" PRIMARY KEY ("root_run_id", "seq"),
    CONSTRAINT "ai_run_event_root_fk" FOREIGN KEY ("root_run_id") REFERENCES "ai_run"("id") ON DELETE CASCADE,
    CONSTRAINT "ai_run_event_kind_check" CHECK ("kind" IN ('step', 'status'))
);
-- Đọc lại theo gốc từ một seq (kết nối lại): (root_run_id, seq) INCLUDE (run_id, kind).
CREATE INDEX "ai_run_event_root_seq_cover" ON "ai_run_event" ("root_run_id", "seq") INCLUDE ("run_id", "kind");
