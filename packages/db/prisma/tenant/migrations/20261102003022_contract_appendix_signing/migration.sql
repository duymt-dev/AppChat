-- TIP-030b F3: phụ lục hợp đồng có vòng đời + ký riêng (spec 12–17). Chỉ thêm cột / bảng; chữ ký hợp đồng cha (contract_signer /
-- contract_sign_token / contract_signature_event) giữ nguyên, không di chuyển dữ liệu. Phụ lục cũ (nếu có) giữ trạng thái, version 1.

ALTER TABLE "contract_appendix"
  ADD COLUMN "seq" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "value_delta" BIGINT,
  ADD COLUMN "source" "contract_source" NOT NULL DEFAULT 'template',
  ADD COLUMN "source_file_id" UUID,
  ADD COLUMN "source_hash" TEXT,
  ADD COLUMN "source_mime" TEXT,
  ADD COLUMN "request_key" TEXT,
  ADD COLUMN "created_by_id" TEXT,
  ADD COLUMN "approved_by" UUID,
  ADD COLUMN "signed_by_business_at" TIMESTAMPTZ(6),
  ADD COLUMN "signed_by_customer_at" TIMESTAMPTZ(6),
  ADD COLUMN "sent_at" TIMESTAMPTZ(6),
  ADD COLUMN "sent_channel" TEXT,
  ADD COLUMN "conversation_id" UUID,
  ADD COLUMN "sign_link_expires_at" TIMESTAMPTZ(6),
  ADD COLUMN "declined_reason" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "note" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "decided_at" TIMESTAMPTZ(6);
-- Phụ lục cũ: số thứ tự theo thời điểm tạo trong từng hợp đồng (trước khi đặt unique).
UPDATE "contract_appendix" a SET "seq" = r.n
  FROM (SELECT "id", row_number() OVER (PARTITION BY "contract_id" ORDER BY "created_at", "id") AS n FROM "contract_appendix") r
  WHERE r."id" = a."id";
ALTER TABLE "contract_appendix"
  ADD CONSTRAINT "contract_appendix_signed_chk" CHECK ("status" NOT IN ('signed') OR ("signed_file_id" IS NOT NULL AND "signed_sha256" IS NOT NULL)),
  ADD CONSTRAINT "contract_appendix_source_chk" CHECK ("source" = 'template' OR ("source_file_id" IS NOT NULL AND "source_hash" IS NOT NULL));
CREATE UNIQUE INDEX "contract_appendix_contract_id_seq_key" ON "contract_appendix" ("contract_id", "seq");
CREATE UNIQUE INDEX "contract_appendix_contract_id_request_key_key" ON "contract_appendix" ("contract_id", "request_key");
-- Tab Phụ lục (indexing.md: "=" trước, sắp xếp sau; INCLUDE cột hiển thị ngắn — trang id rồi join thân rộng).
DROP INDEX IF EXISTS "contract_appendix_contract_id_idx";
CREATE INDEX "contract_appendix_contract_id_idx" ON "contract_appendix" ("contract_id", "created_at" DESC, "id" DESC) INCLUDE ("status", "code", "version");

CREATE TABLE "appendix_signer" (
    "id" UUID NOT NULL,
    "appendix_id" UUID NOT NULL,
    "party" TEXT NOT NULL,
    "appendix_version" INTEGER NOT NULL,
    "document_hash" TEXT,
    "user_id" UUID,
    "name" TEXT NOT NULL DEFAULT '',
    "email" TEXT,
    "phone" TEXT,
    "otp_channel" TEXT,
    "otp_hash" TEXT,
    "otp_expires_at" TIMESTAMPTZ(6),
    "otp_fails" INTEGER NOT NULL DEFAULT 0,
    "signature_image_file_id" UUID,
    "signed_at" TIMESTAMPTZ(6),
    "ip" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "appendix_signer_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "appendix_signer_party_chk" CHECK ("party" IN ('business', 'customer')),
    CONSTRAINT "appendix_signer_appendix_fkey" FOREIGN KEY ("appendix_id") REFERENCES "contract_appendix"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "appendix_signer_appendix_id_party_key" ON "appendix_signer" ("appendix_id", "party");

CREATE TABLE "appendix_sign_token" (
    "id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "appendix_id" UUID NOT NULL,
    "appendix_version" INTEGER NOT NULL,
    "document_hash" TEXT NOT NULL,
    "signer_id" UUID NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "appendix_sign_token_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "appendix_sign_token_appendix_fkey" FOREIGN KEY ("appendix_id") REFERENCES "contract_appendix"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "appendix_sign_token_signer_fkey" FOREIGN KEY ("signer_id") REFERENCES "appendix_signer"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "appendix_sign_token_token_hash_key" ON "appendix_sign_token" ("token_hash");
CREATE INDEX "appendix_sign_token_appendix_id_idx" ON "appendix_sign_token" ("appendix_id");

CREATE TABLE "appendix_signature_event" (
    "id" UUID NOT NULL,
    "appendix_id" UUID NOT NULL,
    "appendix_version" INTEGER NOT NULL,
    "signer_id" UUID,
    "type" TEXT NOT NULL,
    "party" TEXT,
    "actor_name" TEXT NOT NULL DEFAULT '',
    "doc_sha256" TEXT,
    "ip" TEXT,
    "user_agent" TEXT,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "appendix_signature_event_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "appendix_signature_event_appendix_fkey" FOREIGN KEY ("appendix_id") REFERENCES "contract_appendix"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "appendix_signature_event_appendix_id_created_at_id_idx" ON "appendix_signature_event" ("appendix_id", "created_at", "id") INCLUDE ("type", "party");

-- Nhật ký ký phụ lục chỉ thêm (như contract_signature_event — trigger, không dựa REVOKE).
CREATE FUNCTION "appendix_signature_event_append_only"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'appendix_signature_event is append-only' USING ERRCODE = 'insufficient_privilege';
END $$;
CREATE TRIGGER "appendix_signature_event_no_update" BEFORE UPDATE OR DELETE ON "appendix_signature_event"
  FOR EACH ROW EXECUTE FUNCTION "appendix_signature_event_append_only"();
CREATE TRIGGER "appendix_signature_event_no_truncate" BEFORE TRUNCATE ON "appendix_signature_event"
  FOR EACH STATEMENT EXECUTE FUNCTION "appendix_signature_event_append_only"();
