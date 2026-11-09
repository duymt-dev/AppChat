-- TIP-015c pha 4 §1.3.2: GET /v1/privacy/operations?cursor&limit — keyset (created_at DESC, id DESC) INCLUDE phase/canonical_contact_id
-- (covering, tránh quay lại heap mỗi trang).
CREATE INDEX "privacy_operation_list_idx" ON "privacy_operation" ("created_at" DESC, "id" DESC) INCLUDE ("phase", "canonical_contact_id");
