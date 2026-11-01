-- TIP-024: Builder › Phân luồng — từ khoá ưu tiên của agent (khung giờ dùng cột working_hours jsonb sẵn có).
ALTER TABLE "ai_agent" ADD COLUMN "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[];
