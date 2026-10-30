-- DropIndex
DROP INDEX "notification_user_id_created_at_idx";

-- CreateTable
CREATE TABLE "event_consumption" (
    "event_id" UUID NOT NULL,
    "consumer" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_consumption_pkey" PRIMARY KEY ("event_id","consumer")
);

-- CreateIndex
CREATE INDEX "event_consumption_created_at_idx" ON "event_consumption"("created_at");

-- CreateIndex
CREATE INDEX "notification_user_id_created_at_id_idx" ON "notification"("user_id", "created_at" DESC, "id" DESC);

-- Viết tay (indexing §4 partial): danh sách chưa đọc của một người — `WHERE user_id = $1 AND read_at IS NULL ORDER BY created_at DESC, id DESC`.
CREATE INDEX "notification_user_unread_idx" ON "notification"("user_id", "created_at" DESC, "id" DESC) WHERE "read_at" IS NULL;
