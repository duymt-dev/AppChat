-- TIP-034d: fence "Quên khách" tra theo khách (chụp / đọc / chiếu lại tồn ticket — mỗi ticket một EXISTS theo contact_id). PK hiện có
-- (operation_id, contact_id) bắt đầu bằng operation_id nên không phục vụ được; index theo contact_id → Index Only Scan.
CREATE INDEX "privacy_family_member_contact_idx" ON "privacy_family_member" ("contact_id");
