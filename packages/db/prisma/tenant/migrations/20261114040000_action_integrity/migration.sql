-- TIP-003e (concurrency §1, DC-292, DC-454): khoá lạc quan cho ai_agent, đính chính hành động đã gửi, sổ sự kiện chỉ thêm.

-- 1. ai_agent: `row_version` riêng (cột `published_version` là số phiên bản cấu hình — không lẫn). Trigger là nguồn tăng duy nhất.
ALTER TABLE "ai_agent" ADD COLUMN "row_version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "ai_agent" ADD CONSTRAINT "ai_agent_row_version_positive" CHECK ("row_version" >= 1);

CREATE FUNCTION "ai_agent_bump_row_version"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.row_version := OLD.row_version + 1;
  RETURN NEW;
END $$;
CREATE TRIGGER "ai_agent_bump_row_version" BEFORE UPDATE ON "ai_agent"
  FOR EACH ROW EXECUTE FUNCTION "ai_agent_bump_row_version"();

-- 2. invoice: `version` đã có (handler tăng tay) — từ nay trigger là nguồn duy nhất, giá trị người gọi gửi bị bỏ qua.
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_version_positive" CHECK ("version" >= 1);
CREATE FUNCTION "invoice_bump_version"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.version := OLD.version + 1;
  RETURN NEW;
END $$;
CREATE TRIGGER "invoice_bump_version" BEFORE UPDATE ON "invoice"
  FOR EACH ROW EXECUTE FUNCTION "invoice_bump_version"();

-- 3. action_log: đính chính cho hành động đã gửi ra ngoài (REQ-E09c) — mảng chỉ thêm `[{ note, by, at, draft_message_id? }]`.
ALTER TABLE "action_log" ADD COLUMN "correction" JSONB;

-- 4. Sổ sự kiện chỉ thêm (mẫu migration 030). UPDATE / TRUNCATE luôn bị chặn. DELETE chỉ được khi transaction đặt
--    `SET LOCAL app.undo_allow = 'on'` — duy nhất ở `withUndoAllowance` (kernel/actions/undo-allowance.ts) mà UndoService gọi ở nhánh
--    hoàn tác (cùng transaction, tự hết khi commit / rollback). Cascade từ xoá order / ticket / product khi hoàn tác đi qua cùng cờ.
CREATE FUNCTION "append_only_no_change"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME USING ERRCODE = 'insufficient_privilege';
END $$;
CREATE FUNCTION "append_only_delete_guard"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF coalesce(current_setting('app.undo_allow', true), '') = 'on' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION '% is append-only (delete only inside undo)', TG_TABLE_NAME USING ERRCODE = 'insufficient_privilege';
END $$;

CREATE TRIGGER "stock_movement_no_update" BEFORE UPDATE ON "stock_movement" FOR EACH ROW EXECUTE FUNCTION "append_only_no_change"();
CREATE TRIGGER "stock_movement_no_truncate" BEFORE TRUNCATE ON "stock_movement" FOR EACH STATEMENT EXECUTE FUNCTION "append_only_no_change"();
CREATE TRIGGER "stock_movement_delete_guard" BEFORE DELETE ON "stock_movement" FOR EACH ROW EXECUTE FUNCTION "append_only_delete_guard"();

CREATE TRIGGER "order_event_no_update" BEFORE UPDATE ON "order_event" FOR EACH ROW EXECUTE FUNCTION "append_only_no_change"();
CREATE TRIGGER "order_event_no_truncate" BEFORE TRUNCATE ON "order_event" FOR EACH STATEMENT EXECUTE FUNCTION "append_only_no_change"();
CREATE TRIGGER "order_event_delete_guard" BEFORE DELETE ON "order_event" FOR EACH ROW EXECUTE FUNCTION "append_only_delete_guard"();

CREATE TRIGGER "ticket_event_no_update" BEFORE UPDATE ON "ticket_event" FOR EACH ROW EXECUTE FUNCTION "append_only_no_change"();
CREATE TRIGGER "ticket_event_no_truncate" BEFORE TRUNCATE ON "ticket_event" FOR EACH STATEMENT EXECUTE FUNCTION "append_only_no_change"();
CREATE TRIGGER "ticket_event_delete_guard" BEFORE DELETE ON "ticket_event" FOR EACH ROW EXECUTE FUNCTION "append_only_delete_guard"();
