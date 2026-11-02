### COMPLETION REPORT — TIP-026

**STATUS:** DONE
**COMMIT:** `5d3bdf7` (code) + commit report / tiến độ trên nhánh `tip/026-customers` (xếp chồng trên `tip/025-inbox`)

**KHẢO SÁT ĐẦU TIP:** mọi GET / action màn Khách hàng gọi đã có ở backend (TIP-015), schema khớp. Khoảng trống: nút Nhập không làm gì; lọc Tags chỉ có "Tất cả" (`tag_defs` không có id); Sắp xếp / Tuỳ chỉnh cột / Chuyển tiếp / Gán phụ trách là nút chết; kanban vẽ trang 20 dòng của bảng, đếm cột không theo lọc, khách "Thất bại" biến mất; drawer 360° không áp `profile_layout`; form sửa đổi phụ trách → 403, chức danh trống lưu thành "—"; form tạo bỏ địa chỉ / ngày sinh / giới tính; xuất CSV chỉ theo 4 bộ lọc; thông báo chuyển phụ trách / xin chia sẻ chưa có (Q-012).

**FILES CHANGED:**
- Created: migration tenant `20261101200000_026_contact_sorts` (3 index partial); core `kernel/files/table.ts` (đọc CSV / XLSX dùng chung), `crm/services/crm-notify.ts`; FE `features/customers/{import-map.ts, import-map.test.ts, components/{ImportModal, BulkTransferModal, SortMenu}.tsx, styles/{import,sort}.styles.ts}`, `features/inbox/{hooks/useProfileTabs.ts, components/{Blocks360.tsx, tab-label.ts}}`; test `api/test/integration/crm-ui.test.ts` (9), `web/e2e/http/customers-ui.spec.ts` (1).
- Modified: `packages/shared` (`api/crm.ts` — `tag_defs.id`, `CONTACT_SORTS`, `contactsBoardSchema`, `importTableSchema`; `crm/labels.ts`; `notify/catalog.ts` + i18n server — `crm_owner`, `crm_access`; `events.ts` — `approval.decided` có `edited`); `packages/actions/src/crm.ts` (create / update: `address`, `birthday`, `gender`; import: `address`; export: đủ bộ lọc + `sort`); core `crm/{repos/contacts.repo, services/{crm-read.service, contacts.service}, actions/{contact-io, contact-owner, contact-write}.handlers}`, `ai/kb/parse.ts` (dùng `kernel/files/table`), `notify/mail.ts` (biến thể tiêu đề), `kernel/index.ts`; API `crm/contacts.controller.ts` (`sort`, `/contacts/board`, `/contacts/import-table`); `packages/ui` `KanbanBoard` (`total` tuỳ chọn); FE `features/customers/**`, `features/inbox/{components/{Panel360, Profile360Content}, inbox-store, types, index}`, 5 form chứng từ (bộ lọc khách đủ trường), mock `domains/customers.ts` + `crm-shape.test.ts`, `e2e/customers.spec.ts`, `messages/{vi,en}/{customers,inbox,settings}.json`; test `agents-ui.test.ts` (+event `edited`); `coding-packs/{DECISIONS, QUESTIONS}.md`, `docs/06-prototype/DEVIATIONS.md`, `goals/GOAL-BACKEND.md`.

**TEST RESULTS:**
- Acceptance criteria: 4/4 pass
  1. Integration `crm-ui.test.ts` (9): `tag_defs.id` + lọc `tag_id` (id lạ → rỗng); `sort` recent / name / created / value đúng thứ tự, lạ → 400; EXPLAIN dùng `contact_live_name_idx` / `contact_live_created_idx` / `contact_live_spent_idx`; `/contacts/board` 7 cột khi có khách Thất bại, đếm theo bộ lọc (bỏ `stage`), thẻ theo sắp xếp, sales chỉ thấy khách của mình + không có cột Thất bại; create / update `address` / `birthday` / `gender`, rỗng = xoá, hoàn tác khôi phục, ngày sai 422; `contact.export` theo status / tag / sort; `/contacts/import-table` CSV (chấm phẩy, BOM, ngoặc kép) + XLSX (ngày → YYYY-MM-DD), tệp người khác / id lạ 404, định dạng lạ 422, thiếu `crm.import` 403; thông báo `crm_owner` → người nhận, `crm_access` → người phụ trách, duyệt → người xin (tiêu đề "đã đồng ý…"), link `/customers?c=` — **pass**
  2. FE unit / mock shape: ghép cột vi / en + cắt độ dài + chia lô 500 (3); mock `tag_id` / `sort` / `/contacts/board` / `/contacts/import-table` khớp schema dùng chung — **pass**
  3. E2E http `customers-ui.spec.ts`: tạo thẻ ở Cài đặt → nhập CSV 3 dòng (ghép cột tự động, 2 tạo · 1 trùng) → sắp xếp tên → kanban gắn thẻ + lọc thẻ, không có cột Thất bại khi không có khách, kéo sang Đang tư vấn (tải lại giữ) → Owner gán mẫu "Kinh doanh" → 360° có tab "Giao dịch" (khối báo giá), không có "Tệp" → sửa: chức danh trống không thành "—", lưu khu vực → xuất CSV theo thẻ chỉ có khách gắn thẻ — **pass**. Đồng phụ trách / chuyển / xin chia sẻ 2 người dùng + thông báo kiểm ở integration (workspace E2E chỉ có Owner).
  4. E2E mock `customers` **8 passed** (thêm ca TIP-026: sắp xếp, lọc thẻ, nhập, đổi Phụ trách → Chuyển phụ trách, Sales thấy tab Giao dịch) · `custom-fields` + `inbox` xanh · parity `customers:table` 0.99% · `kanban` 3.59% · `360` 3.35% · `edit` 1.30% · `filter` 0.86% · `fields` 0.67% · `dedupe` 0.85% · `ai` 1.74% · `inbox:default` 4.63% · `inbox:ai-panel` 3.76% — **pass**.
- **Cổng "khi làm":** integration crm-ui 9/9 + ảnh hưởng (crm-contacts, crm-settings, notify, kb) 28/28; agents-ui 10/10 (sau sửa event `edited`).
- **Cổng "trước commit":** lint / typecheck / test package đổi xanh; `pnpm depcheck` xanh (gỡ vòng `customers → custom-values → handlers`); `i18n:check` 100% (4554 key); `lint:size` / `lint:tokens` xanh.
- **Cổng "chốt TIP":** `pnpm turbo run build lint typecheck test` **46/46** · `api test:integration` **267 passed** (27 file) · **E2E http 24 passed · 18 skipped · 0 failed** (toàn bộ, gồm `customers-ui.spec.ts` mới) · full E2E hồi quy mock **223 passed · 0 failed · 197 skipped** · `pnpm parity --done` (sửa primitive `KanbanBoard`) **108 PASS**, chỉ `inbox:connect-channel` 6.20% đỏ không đổi (đỏ từ P0 ver2.1 — Q-020).

**INDEX / EXPLAIN:** sắp xếp `name` / `created` / `value` → index partial `WHERE deleted_at IS NULL` `(name, id)`, `(created_at DESC, id DESC)`, `(total_spent DESC, id DESC)` (Index Scan, EXPLAIN trong test); `recent` giữ `contact_live_recent_idx`. Kanban: một truy vấn `row_number() OVER (PARTITION BY stage ORDER BY …)` lấy ≤ 50 id / cột + một `GROUP BY stage` đếm, rồi deferred join theo PK cho đúng các id đó.

**ISSUES DISCOVERED:**
- Lỗi của TIP-024: event `approval.decided` khi "Duyệt kèm sửa" có `status: edited` ngoài schema → consumer realtime bỏ event (Chờ duyệt không tự làm mới). Sửa schema + test (DC-153).
- Chạy E2E mock và E2E http song song làm hỏng thư mục `test-results` dùng chung — chạy lần lượt.

**GIẢ ĐỊNH ĐÃ CHỌN:** DC-147 … DC-153. **Lệch prototype:** PD-005 (menu sắp xếp, modal Nhập, 2 dòng thông báo, cột Thất bại). **Lệch spec:** không có DV mới. **Câu hỏi:** Q-021 mới (Chuyển tiếp hàng loạt); Q-012 → tạm theo đề xuất (DC-150).

**SUGGESTIONS FOR CHỦ THẦU:**
- Khối 360° của báo giá / đơn / lịch hẹn / ticket hiện "Chưa có dữ liệu" — TIP-029 … 034 trả dữ liệu vào `/contacts/:id` để khối có nội dung.
- Kanban > 50 thẻ / cột: thêm "Xem thêm" khi có workspace thật đủ lớn.

## Bổ sung — yêu cầu nhập/xuất AI-first

[TIP038b](../tips/TIP-038b-ai-first-data-transfer.md) nhận IO-CRM và luồng model thật file→mapping→preview→commit/exportfile; kết quả manual hiện hữu không chứng minh AI-first đã đạt. Không thay đổi trạng thái test cũ.
