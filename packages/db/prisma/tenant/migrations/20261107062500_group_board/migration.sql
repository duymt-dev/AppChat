-- TIP-025b §A.7 / §H: bảng tin nhóm theo loại — WHERE conversation_id = $1 AND kind = $2 AND deleted_at IS NULL AND recalled_at IS NULL
-- ORDER BY created_at DESC, id DESC LIMIT n (keyset). Cột "=" trước, sort sau; partial chỉ tin còn hiện.
CREATE INDEX "message_conversation_kind_idx" ON "message" ("conversation_id", "kind", "created_at" DESC, "id" DESC) WHERE "deleted_at" IS NULL AND "recalled_at" IS NULL;
