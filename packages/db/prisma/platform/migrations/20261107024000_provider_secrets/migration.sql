-- TIP-040 pha 2b (DC-371): giá trị header provider LLM mã hoá như api_key. Dòng cũ có `headers` thô được boot (cần APP_ENC_KEY —
-- không làm được trong SQL) mã hoá sang `headers_enc` và thay `headers` bằng mảng tên.
ALTER TABLE "llm_provider" ADD COLUMN "headers_enc" BYTEA;
