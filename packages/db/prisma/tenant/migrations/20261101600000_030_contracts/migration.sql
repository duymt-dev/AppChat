-- TIP-030: Hợp đồng + ký điện tử (Blueprint §2.2 contract / contract_appendix / contract_signer / contract_signature_event /
-- contract_sign_token, COMMERCE §9, state-machine §4). Nhật ký ký chỉ thêm (thu hồi UPDATE / DELETE khỏi vai trò ứng dụng).

-- CreateEnum
CREATE TYPE "contract_status" AS ENUM ('draft', 'pending_approval', 'pending_signature', 'signed', 'declined', 'expired', 'terminated');
CREATE TYPE "contract_kind" AS ENUM ('service', 'sale', 'framework');
-- Dòng thời gian khách có mục hợp đồng (gửi ký / ký / từ chối / chấm dứt / hết hạn).
ALTER TYPE "timeline_type" ADD VALUE IF NOT EXISTS 'contract' AFTER 'quote';

-- CreateTable
CREATE TABLE "contract" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "number" TEXT NOT NULL DEFAULT '',
    "kind" "contract_kind" NOT NULL DEFAULT 'service',
    "contact_id" UUID NOT NULL,
    "quote_id" UUID,
    "renewal_of_id" UUID,
    "title" TEXT NOT NULL DEFAULT '',
    "value" BIGINT NOT NULL DEFAULT 0,
    "signed_date" DATE,
    "start_date" DATE,
    "end_date" DATE,
    "owner_user_id" UUID,
    "status" "contract_status" NOT NULL DEFAULT 'draft',
    "template_id" UUID,
    "template_version" INTEGER,
    "file_name" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "created_by_type" TEXT NOT NULL DEFAULT 'user',
    "created_by_id" TEXT,
    "approved_by" UUID,
    "signed_by_business_at" TIMESTAMPTZ(6),
    "signed_by_customer_at" TIMESTAMPTZ(6),
    "sent_at" TIMESTAMPTZ(6),
    "sent_channel" TEXT,
    "conversation_id" UUID,
    "sign_link_expires_at" TIMESTAMPTZ(6),
    "renew_notice_at" TIMESTAMPTZ(6),
    "file_id" UUID,
    "file_sha256" TEXT,
    "signed_file_id" UUID,
    "signed_sha256" TEXT,
    "declined_reason" TEXT NOT NULL DEFAULT '',
    "terminated_reason" TEXT NOT NULL DEFAULT '',
    "decided_at" TIMESTAMPTZ(6),
    "custom" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "contract_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "contract_value_chk" CHECK ("value" >= 0),
    CONSTRAINT "contract_dates_chk" CHECK ("start_date" IS NULL OR "end_date" IS NULL OR "end_date" > "start_date"),
    -- Đã ký thì phải có bản cuối + mã băm (COMMERCE §9 C1).
    CONSTRAINT "contract_signed_chk" CHECK ("status" NOT IN ('signed', 'expired', 'terminated') OR ("signed_file_id" IS NOT NULL AND "signed_sha256" IS NOT NULL)),
    CONSTRAINT "contract_terminated_chk" CHECK ("status" <> 'terminated' OR "terminated_reason" <> ''),
    CONSTRAINT "contract_contact_fkey" FOREIGN KEY ("contact_id") REFERENCES "contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "contract_quote_fkey" FOREIGN KEY ("quote_id") REFERENCES "quote"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "contract_renewal_fkey" FOREIGN KEY ("renewal_of_id") REFERENCES "contract"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "contract_file_fkey" FOREIGN KEY ("file_id") REFERENCES "file"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "contract_signed_file_fkey" FOREIGN KEY ("signed_file_id") REFERENCES "file"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "contract_appendix" (
    "id" UUID NOT NULL,
    "contract_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "body_html" TEXT,
    "status" "contract_status" NOT NULL DEFAULT 'draft',
    "file_id" UUID,
    "file_sha256" TEXT,
    "signed_file_id" UUID,
    "signed_sha256" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_appendix_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "contract_appendix_contract_fkey" FOREIGN KEY ("contract_id") REFERENCES "contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "contract_signer" (
    "id" UUID NOT NULL,
    "contract_id" UUID NOT NULL,
    "appendix_id" UUID,
    "party" TEXT NOT NULL,
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

    CONSTRAINT "contract_signer_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "contract_signer_party_chk" CHECK ("party" IN ('business', 'customer')),
    CONSTRAINT "contract_signer_otp_channel_chk" CHECK ("otp_channel" IS NULL OR "otp_channel" IN ('email', 'zalo_personal')),
    CONSTRAINT "contract_signer_contract_fkey" FOREIGN KEY ("contract_id") REFERENCES "contract"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "contract_signer_signature_fkey" FOREIGN KEY ("signature_image_file_id") REFERENCES "file"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "contract_signature_event" (
    "id" UUID NOT NULL,
    "contract_id" UUID NOT NULL,
    "appendix_id" UUID,
    "signer_id" UUID,
    "type" TEXT NOT NULL,
    "actor_name" TEXT NOT NULL DEFAULT '',
    "doc_sha256" TEXT,
    "ip" TEXT,
    "user_agent" TEXT,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_signature_event_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "contract_signature_event_contract_fkey" FOREIGN KEY ("contract_id") REFERENCES "contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "contract_sign_token" (
    "id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "contract_id" UUID NOT NULL,
    "signer_id" UUID NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_sign_token_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "contract_sign_token_contract_fkey" FOREIGN KEY ("contract_id") REFERENCES "contract"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "contract_code_key" ON "contract" ("code");
-- Mỗi báo giá một hợp đồng (Blueprint §2.2 quote_id unique).
CREATE UNIQUE INDEX "contract_quote_id_key" ON "contract" ("quote_id");
CREATE UNIQUE INDEX "contract_appendix_code_key" ON "contract_appendix" ("code");
CREATE INDEX "contract_appendix_contract_id_idx" ON "contract_appendix" ("contract_id");
CREATE UNIQUE INDEX "contract_signer_contract_id_party_key" ON "contract_signer" ("contract_id", "party");
CREATE INDEX "contract_signature_event_contract_id_created_at_idx" ON "contract_signature_event" ("contract_id", "created_at");
CREATE UNIQUE INDEX "contract_sign_token_token_hash_key" ON "contract_sign_token" ("token_hash");
CREATE INDEX "contract_sign_token_contract_id_idx" ON "contract_sign_token" ("contract_id");

-- Danh sách D42 (chưa xoá): mặc định mới nhất → (created_at DESC, id DESC); lọc chip → (status, created_at DESC, id DESC);
-- phụ trách (scope own + lọc người) → (owner_user_id, status, created_at DESC) theo Blueprint L423.
CREATE INDEX "contract_live_recent_idx" ON "contract" ("created_at" DESC, "id" DESC) WHERE "deleted_at" IS NULL;
CREATE INDEX "contract_live_status_idx" ON "contract" ("status", "created_at" DESC, "id" DESC) WHERE "deleted_at" IS NULL;
CREATE INDEX "contract_live_owner_idx" ON "contract" ("owner_user_id", "status", "created_at" DESC, "id" DESC) WHERE "deleted_at" IS NULL;
-- Hợp đồng của khách (Hồ sơ 360°, ?contact_id=).
CREATE INDEX "contract_contact_idx" ON "contract" ("contact_id", "created_at" DESC) WHERE "deleted_at" IS NULL;
-- Job T-30 / hết hạn + KPI giá trị hiệu lực: hợp đồng đã ký theo ngày kết thúc, covering (contact_id, value) — Blueprint §2.2.
CREATE INDEX "contract_signed_end_idx" ON "contract" ("end_date") INCLUDE ("contact_id", "value") WHERE "status" = 'signed' AND "deleted_at" IS NULL;
-- Job link ký hết hạn: chờ ký theo hạn link.
CREATE INDEX "contract_sign_due_idx" ON "contract" ("sign_link_expires_at") WHERE "status" = 'pending_signature' AND "deleted_at" IS NULL;
-- Tìm theo mã (prefix) + tên dịch vụ không dấu (tên khách tìm qua contact — trigram ở 015).
CREATE INDEX "contract_code_idx" ON "contract" ("code" text_pattern_ops) WHERE "deleted_at" IS NULL;
CREATE INDEX "contract_title_trgm_idx" ON "contract" USING gin (f_unaccent(lower("title")) gin_trgm_ops) WHERE "deleted_at" IS NULL;
-- Lọc trường tuỳ biến `cf.*` (D56).
CREATE INDEX "contract_custom_gin_idx" ON "contract" USING gin ("custom" jsonb_path_ops) WHERE "deleted_at" IS NULL;

-- Lịch sử hợp đồng (action_log contract.* theo contract_id).
CREATE INDEX "action_log_contract_idx" ON "action_log" ((coalesce("result" ->> 'contract_id', "input" ->> 'contract_id')), "created_at" DESC)
  WHERE "action_id" LIKE 'contract.%';

-- Nhật ký ký chỉ thêm (COMMERCE §9 "append-only"): trigger chặn sửa / xoá / truncate — không dựa vào REVOKE vì provisioner cấp lại
-- SELECT / INSERT / UPDATE / DELETE trên mọi bảng cho vai trò ứng dụng sau khi chạy migration.
CREATE FUNCTION "contract_signature_event_append_only"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'contract_signature_event is append-only' USING ERRCODE = 'insufficient_privilege';
END $$;
CREATE TRIGGER "contract_signature_event_no_update" BEFORE UPDATE OR DELETE ON "contract_signature_event"
  FOR EACH ROW EXECUTE FUNCTION "contract_signature_event_append_only"();
CREATE TRIGGER "contract_signature_event_no_truncate" BEFORE TRUNCATE ON "contract_signature_event"
  FOR EACH STATEMENT EXECUTE FUNCTION "contract_signature_event_append_only"();
