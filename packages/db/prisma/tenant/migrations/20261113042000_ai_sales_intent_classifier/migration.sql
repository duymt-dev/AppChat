-- TIP-022c §1.6: run phân loại ý định (con dưới gốc lượt, chữ phân loại + đoạn trích nằm ở bước run được bảo vệ) — biên nhận chỉ trỏ tới.
ALTER TABLE "ai_sales_intent" ADD COLUMN "classifier_run_id" UUID;
