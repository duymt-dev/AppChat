-- TIP-036 — Khách thân thiết (COMMERCE §7, Blueprint §2.2 loyalty). Luật đã chốt cố định trong config (không sửa qua action): 10.000đ = 1 điểm,
-- 1 điểm = 100đ, đổi tối đa 50% đơn, hạn 12 tháng (FIFO), hạng xét theo điểm tích 12 tháng mỗi quý; action chỉ đổi bật / tắt, hệ số hạng,
-- đơn sàn có tích điểm.
-- Sổ điểm chỉ thêm (loyalty_ledger): mỗi bút toán có delta + số dư sau; lô cộng (delta > 0) giữ `remaining` + `expires_at`, phân bổ trừ FIFO ở
-- loyalty_alloc (lô ← bút toán trừ) để đảo / hoàn tác trả đúng lô (giữ hạn gốc — DC-297 b). Khoá chống lặp: `dedupe_key` duy nhất (earn theo
-- đơn + lượt hoàn tất, đảo theo đơn + lượt, hết hạn theo lô, …) — event chạy lại / đến không thứ tự không ghi hai lần.

CREATE TABLE "loyalty_config" (
    "id" SMALLINT NOT NULL DEFAULT 1,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "earn_vnd_per_point" INTEGER NOT NULL DEFAULT 10000,
    "redeem_vnd_per_point" INTEGER NOT NULL DEFAULT 100,
    "tiers" JSONB NOT NULL DEFAULT '[{"key":"member","min":0,"mult":1},{"key":"silver","min":5000,"mult":1},{"key":"gold","min":15000,"mult":1.5},{"key":"diamond","min":40000,"mult":2}]',
    "expiry_months" SMALLINT NOT NULL DEFAULT 12,
    "max_redeem_pct" SMALLINT NOT NULL DEFAULT 50,
    "tier_window_months" SMALLINT NOT NULL DEFAULT 12,
    "tier_review" TEXT NOT NULL DEFAULT 'quarterly',
    "marketplace_earn" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "loyalty_config_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "loyalty_config_singleton_chk" CHECK ("id" = 1)
);
-- Workspace đã có (tạo trước TIP này) — seed provision cũng upsert cùng dòng (idempotent).
INSERT INTO "loyalty_config" ("id") VALUES (1) ON CONFLICT ("id") DO NOTHING;

CREATE TABLE "loyalty_ledger" (
    "id" UUID NOT NULL,
    "contact_id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "delta" BIGINT NOT NULL,
    "balance_after" BIGINT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "ref_type" TEXT,
    "ref_id" UUID,
    "dedupe_key" TEXT,
    -- Lô cộng (delta > 0): hạn + số còn dùng được; bút toán trừ: null.
    "expires_at" TIMESTAMPTZ(6),
    "remaining" BIGINT,
    -- Căn cứ khi tích (earn): { net_before_vat, base, tier, mult, rate } — đổi cấu hình sau không sửa lịch sử.
    "basis" JSONB,
    "reversed_by_id" UUID,
    "actor_type" TEXT NOT NULL DEFAULT 'system',
    "actor_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "loyalty_ledger_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "loyalty_ledger_kind_chk" CHECK ("kind" IN ('earn', 'redeem', 'adjust', 'expire', 'reverse', 'restore')),
    CONSTRAINT "loyalty_ledger_delta_chk" CHECK ("delta" <> 0),
    CONSTRAINT "loyalty_ledger_lot_chk" CHECK (("delta" > 0) = ("remaining" IS NOT NULL) AND ("remaining" IS NULL OR ("remaining" >= 0 AND "remaining" <= "delta"))),
    CONSTRAINT "loyalty_ledger_note_chk" CHECK (char_length("note") <= 500)
);
ALTER TABLE "loyalty_ledger" ADD CONSTRAINT "loyalty_ledger_contact_fk" FOREIGN KEY ("contact_id") REFERENCES "contact"("id") ON DELETE RESTRICT;
CREATE UNIQUE INDEX "loyalty_ledger_dedupe_key" ON "loyalty_ledger" ("dedupe_key") WHERE "dedupe_key" IS NOT NULL;
-- Lịch sử thành viên: = contact_id rồi sort (created_at, id) — cursor; INCLUDE cột hiển thị cho bước chọn id.
CREATE INDEX "loyalty_ledger_contact_recent_idx" ON "loyalty_ledger" ("contact_id", "created_at" DESC, "id" DESC) INCLUDE ("kind", "delta", "balance_after");
-- Lô FIFO còn số dư của một khách: = contact_id, sort (expires_at, id).
CREATE INDEX "loyalty_ledger_lots_idx" ON "loyalty_ledger" ("contact_id", "expires_at", "id") INCLUDE ("remaining") WHERE "remaining" > 0;
-- Quét hết hạn toàn workspace: range expires_at, id.
CREATE INDEX "loyalty_ledger_expiry_idx" ON "loyalty_ledger" ("expires_at", "id") INCLUDE ("contact_id") WHERE "remaining" > 0;
-- Đảo / hoàn tiền tìm bút toán theo chứng từ.
CREATE INDEX "loyalty_ledger_ref_idx" ON "loyalty_ledger" ("ref_type", "ref_id", "kind") WHERE "ref_id" IS NOT NULL;
-- Điểm tích 12 tháng (xét hạng): = contact_id + kind earn, range created_at.
CREATE INDEX "loyalty_ledger_earned_idx" ON "loyalty_ledger" ("contact_id", "created_at") INCLUDE ("delta") WHERE "kind" IN ('earn', 'adjust') AND "delta" > 0;

-- Phân bổ trừ FIFO: bút toán trừ (redeem / expire / reverse / adjust âm) lấy bao nhiêu từ lô nào. Trả lại (hoàn tác / huỷ đơn) cộng lại đúng lô.
CREATE TABLE "loyalty_alloc" (
    "debit_id" UUID NOT NULL,
    "lot_id" UUID NOT NULL,
    "points" BIGINT NOT NULL,
    "restored" BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT "loyalty_alloc_pkey" PRIMARY KEY ("debit_id", "lot_id"),
    CONSTRAINT "loyalty_alloc_points_chk" CHECK ("points" > 0 AND "restored" >= 0 AND "restored" <= "points")
);
ALTER TABLE "loyalty_alloc" ADD CONSTRAINT "loyalty_alloc_debit_fk" FOREIGN KEY ("debit_id") REFERENCES "loyalty_ledger"("id") ON DELETE RESTRICT;
ALTER TABLE "loyalty_alloc" ADD CONSTRAINT "loyalty_alloc_lot_fk" FOREIGN KEY ("lot_id") REFERENCES "loyalty_ledger"("id") ON DELETE RESTRICT;
CREATE INDEX "loyalty_alloc_lot_idx" ON "loyalty_alloc" ("lot_id");

-- Tệp đính kèm của thành viên (tab Tệp) — file ở bảng `file` của tenant, bảo vệ theo scope khách.
CREATE TABLE "loyalty_member_file" (
    "contact_id" UUID NOT NULL,
    "file_id" UUID NOT NULL,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "loyalty_member_file_pkey" PRIMARY KEY ("contact_id", "file_id")
);
ALTER TABLE "loyalty_member_file" ADD CONSTRAINT "loyalty_member_file_contact_fk" FOREIGN KEY ("contact_id") REFERENCES "contact"("id") ON DELETE CASCADE;
ALTER TABLE "loyalty_member_file" ADD CONSTRAINT "loyalty_member_file_file_fk" FOREIGN KEY ("file_id") REFERENCES "file"("id") ON DELETE CASCADE;
CREATE INDEX "loyalty_member_file_recent_idx" ON "loyalty_member_file" ("contact_id", "created_at" DESC);

-- Danh sách thành viên: hạng rồi sort (created_at, id) trên khách còn hiệu lực.
CREATE INDEX "contact_tier_recent_idx" ON "contact" ("tier_key", "created_at" DESC, "id" DESC) WHERE "deleted_at" IS NULL;
CREATE INDEX "contact_owner_tier_idx" ON "contact" ("owner_user_id", "tier_key", "created_at" DESC, "id" DESC) WHERE "deleted_at" IS NULL;
