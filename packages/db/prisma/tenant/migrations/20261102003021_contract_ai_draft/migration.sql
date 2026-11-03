-- TIP-030b F2: AI soạn hợp đồng hai bước (spec 9–11). Chỉ thêm bảng / cột, không đổi dữ liệu cũ.

-- Đề xuất bất biến của `contract.prepare_draft`: nội dung + gợi ý + hash nguồn; `contract.draft_from_content` tiêu thụ đúng một lần.
CREATE TABLE "contract_draft_proposal" (
    "id" UUID NOT NULL,
    "request_actor" TEXT NOT NULL,
    "request_key" TEXT NOT NULL,
    "request_hash" TEXT NOT NULL,
    "contact_id" UUID NOT NULL,
    "quote_id" UUID,
    "kind" "contract_kind" NOT NULL,
    "content" JSONB NOT NULL,
    "suggestions" JSONB NOT NULL DEFAULT '[]',
    "sources" JSONB NOT NULL DEFAULT '{}',
    "content_hash" TEXT NOT NULL,
    "run_id" UUID,
    "model" TEXT,
    "prompt_version" INTEGER,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "consumed_contract_id" UUID,
    "consumed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "contract_draft_proposal_pkey" PRIMARY KEY ("id")
);
-- Gọi lại cùng khoá yêu cầu → cùng đề xuất (không gọi model lần hai).
CREATE UNIQUE INDEX "contract_draft_proposal_request_actor_request_key_key" ON "contract_draft_proposal" ("request_actor", "request_key");
-- Một đề xuất → tối đa một hợp đồng.
CREATE UNIQUE INDEX "contract_draft_proposal_consumed_contract_id_key" ON "contract_draft_proposal" ("consumed_contract_id");
-- Nội dung đề xuất bất biến: chỉ được ghi một lần cột tiêu thụ (NULL → giá trị).
CREATE FUNCTION "contract_draft_proposal_immutable"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."content" IS DISTINCT FROM OLD."content" OR NEW."suggestions" IS DISTINCT FROM OLD."suggestions" OR NEW."content_hash" IS DISTINCT FROM OLD."content_hash"
     OR NEW."sources" IS DISTINCT FROM OLD."sources" OR NEW."request_hash" IS DISTINCT FROM OLD."request_hash"
     OR (OLD."consumed_contract_id" IS NOT NULL AND NEW."consumed_contract_id" IS DISTINCT FROM OLD."consumed_contract_id") THEN
    RAISE EXCEPTION 'contract_draft_proposal is immutable' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "contract_draft_proposal_no_rewrite" BEFORE UPDATE ON "contract_draft_proposal"
  FOR EACH ROW EXECUTE FUNCTION "contract_draft_proposal_immutable"();

-- Hợp đồng do AI soạn: đề xuất gốc + khối gợi ý (pending / kept / discarded) — `contract.submit` chặn khi còn pending.
ALTER TABLE "contract"
  ADD COLUMN "draft_proposal_id" UUID,
  ADD COLUMN "ai_suggestions" JSONB NOT NULL DEFAULT '[]';
CREATE UNIQUE INDEX "contract_draft_proposal_id_key" ON "contract" ("draft_proposal_id");
