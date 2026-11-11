-- TIP-030c: biên nhận ký hợp đồng cha + ý định gửi OTP Owner + thế hệ OTP người ký.
ALTER TABLE "contract_signer" ADD COLUMN "otp_generation" INTEGER NOT NULL DEFAULT 0;

CREATE TYPE "signing_attempt_phase" AS ENUM ('rejected', 'verified', 'rendering', 'staged', 'finalized', 'stale', 'expired');
CREATE TYPE "signing_delivery_phase" AS ENUM ('pending', 'dispatching', 'accepted', 'unknown', 'suppressed', 'failed');

CREATE TABLE "contract_signing_attempt" (
  "id" UUID NOT NULL,
  "request_key_hash" TEXT NOT NULL,
  "input_digest" TEXT NOT NULL,
  "contract_id" UUID NOT NULL,
  "signer_id" UUID NOT NULL,
  "party" TEXT NOT NULL,
  "actor_user_id" UUID,
  "token_id" UUID,
  "contract_version" INTEGER NOT NULL,
  "source_version" INTEGER NOT NULL,
  "source_sha256" TEXT,
  "template_id" UUID,
  "template_version" INTEGER,
  "signature_digest" TEXT NOT NULL,
  "otp_generation" INTEGER NOT NULL,
  "verification_digest" TEXT,
  "phase" "signing_attempt_phase" NOT NULL,
  "rejection_code" TEXT,
  "remaining_attempts" INTEGER,
  "render_token" TEXT,
  "render_generation" INTEGER NOT NULL DEFAULT 0,
  "lease_until" TIMESTAMPTZ(6),
  "candidate_file_id" UUID,
  "signature_file_id" UUID,
  "candidate_sha256" TEXT,
  "template_frozen" JSONB,
  "final_action_log_id" UUID,
  "effect_ref" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "contract_signing_attempt_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "contract_signing_attempt_request_key_hash_key" ON "contract_signing_attempt" ("request_key_hash");
-- Một hiệu ứng chốt cho mỗi người ký + thế hệ OTP (hai tab cùng mã → một bên thắng).
CREATE UNIQUE INDEX "contract_signing_attempt_final_key" ON "contract_signing_attempt" ("signer_id", "otp_generation") WHERE "phase" = 'finalized';
-- Lịch sử theo hợp đồng / bên (bằng trước, sắp xếp sau) — INCLUDE cột hẹp.
CREATE INDEX "contract_signing_attempt_history_idx" ON "contract_signing_attempt" ("contract_id", "party", "created_at" DESC, "id" DESC) INCLUDE ("phase", "final_action_log_id");
-- Quét khôi phục lần thử chưa kết thúc.
CREATE INDEX "contract_signing_attempt_recovery_idx" ON "contract_signing_attempt" ("phase", "expires_at", "id") INCLUDE ("render_generation", "candidate_file_id") WHERE "phase" IN ('verified', 'rendering', 'staged');

CREATE TABLE "contract_signing_delivery" (
  "id" UUID NOT NULL,
  "request_ref" TEXT NOT NULL,
  "signer_id" UUID NOT NULL,
  "otp_generation" INTEGER NOT NULL,
  "purpose" TEXT NOT NULL,
  "recipient_user_id" UUID NOT NULL,
  "phase" "signing_delivery_phase" NOT NULL DEFAULT 'pending',
  "claim_token" TEXT,
  "claim_generation" INTEGER NOT NULL DEFAULT 0,
  "claim_until" TIMESTAMPTZ(6),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "next_due" TIMESTAMPTZ(6) NOT NULL,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "encrypted_secret" BYTEA,
  "safe_code" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "contract_signing_delivery_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "contract_signing_delivery_signer_id_otp_generation_purpose_key" ON "contract_signing_delivery" ("signer_id", "otp_generation", "purpose");
CREATE INDEX "contract_signing_delivery_due_idx" ON "contract_signing_delivery" ("phase", "next_due", "id") INCLUDE ("signer_id", "otp_generation") WHERE "phase" IN ('pending', 'dispatching');
