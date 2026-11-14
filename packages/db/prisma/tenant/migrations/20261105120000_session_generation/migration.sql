-- TIP-014b C: thế hệ phiên tài khoản kênh — fence chủ phiên cũ (mất lease / tạm dừng / ngắt) khỏi đặt chỗ gửi / thao tác.
ALTER TABLE "channel_account" ADD COLUMN "session_generation" INTEGER NOT NULL DEFAULT 0;
