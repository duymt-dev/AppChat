-- TIP-017: widget chat website (Blueprint §2.2 channels-webchat).
-- CreateTable
CREATE TABLE "webchat_widget" (
    "id" UUID NOT NULL,
    "channel_account_id" UUID NOT NULL,
    "public_key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "greeting" TEXT NOT NULL DEFAULT '',
    "theme" JSONB NOT NULL DEFAULT '{}',
    "prechat_form" JSONB NOT NULL DEFAULT '{}',
    "agent_id" TEXT,
    "allowed_domains" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "settings" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webchat_widget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webchat_visitor" (
    "id" UUID NOT NULL,
    "channel_account_id" UUID NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "page_url" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webchat_visitor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "webchat_widget_channel_account_id_key" ON "webchat_widget"("channel_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "webchat_widget_public_key_key" ON "webchat_widget"("public_key");

-- CreateIndex
CREATE INDEX "webchat_visitor_channel_account_id_created_at_idx" ON "webchat_visitor"("channel_account_id", "created_at");


-- FK nội DB tenant (Blueprint §2.1). Widget / khách web theo tài khoản kênh: tài khoản chỉ bị đánh dấu `disconnected` (không xoá),
-- bật lại widget dùng lại đúng tài khoản → giữ lịch sử khách web.
ALTER TABLE "webchat_widget" ADD CONSTRAINT "webchat_widget_channel_account_fk"
  FOREIGN KEY ("channel_account_id") REFERENCES "channel_account"("id") ON DELETE CASCADE;
ALTER TABLE "webchat_visitor" ADD CONSTRAINT "webchat_visitor_channel_account_fk"
  FOREIGN KEY ("channel_account_id") REFERENCES "channel_account"("id") ON DELETE CASCADE;
