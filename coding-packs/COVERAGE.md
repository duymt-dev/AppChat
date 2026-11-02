# COVERAGE — sổ phủ nghĩa vụ (bản nháp 1, 2026-11-01)

> Thước đo hoàn thành của phần còn lại (DC-233): mỗi nghĩa vụ trong tài liệu một dòng — nguồn · TIP nhận · trạng thái · bằng chứng code. Dựng bằng 7 lượt rà đối chiếu code (không tin trạng thái DONE). **Bản nháp:** các lượt rà dừng sớm theo lệnh Chủ nhà (hết quota) — mục "Chưa rà hết" cuối mỗi phần liệt kê chỗ chưa đối chiếu sâu. Công cụ ở `tools/obligations/` (xem `README.md` ở đó): `actions.mjs`, `routes.mjs` sinh dữ liệu tự động; các phần rà ở `parts/part-*.md`; `merge.py` gộp thành file này — sửa phần rồi chạy lại, không sửa tay file này.

## Quy ước trạng thái

`ĐẠT` có code + test (bằng chứng file:dòng) · `MỘT PHẦN` có code nhưng thiếu ý · `GIẢ` chỉ chạy nhờ mock / regex / `message.info` do code · `CHỜ-TK` code xong, thiếu tài khoản provider thật (Q) · `CHƯA` chưa có code · `NGOÀI` loại khỏi phạm vi có mã quyết định · `QUY-TẮC` luật quy trình kiểm bằng lint / CI.

**Lỗ hổng** = dòng `CHƯA` / `GIẢ` / `MỘT PHẦN` mà cột TIP nhận là `—`. Goal viết TIP xong khi không còn lỗ hổng.

## Tổng

| Phần | ĐẠT | MỘT PHẦN | GIẢ | CHỜ-TK | CHƯA | NGOÀI | QUY-TẮC | Lỗ hổng |
|---|---|---|---|---|---|---|---|---|
| A. Yêu cầu REQ-A…E (01-REQUIREMENTS-MATRIX) | 115 | 23 | 8 | 12 | 23 | 2 | 0 | 16 |
| B. Yêu cầu REQ-F…N (01-REQUIREMENTS-MATRIX) | 73 | 16 | 12 | 1 | 48 | 10 | 5 | 10 |
| C. Quyết định D01–D59, DC-xxx + luật COMMERCE-DECISIONS | 103 | 33 | 3 | 5 | 48 | 11 | 21 | 20 |
| D. BLUEPRINT (§3 action / policy / quyền, §4 API, §5 AI, §6, §8–§11) | 88 | 206 | 5 | 4 | 82 | 1 | 0 | 14 |
| E. standards/* | 150 | 46 | 2 | 6 | 63 | 2 | 40 | 37 |
| F. Prototype in-scope — nút / màn FE giả hoặc thiếu | 0 | 1 | 79 | 0 | 8 | 5 | 0 | 39 |
| G. Mục "để sau / hoãn / chưa" trong reports/ + QUESTIONS / DEVIATIONS còn mở | 23 | 19 | 9 | 13 | 59 | 3 | 0 | 29 |
| **Tổng** | **552** | **344** | **118** | **41** | **331** | **34** | **66** | **165** |

## Lỗ hổng chưa có TIP nhận (165)

Danh sách để bước 2 (viết TIP) gán chủ. Chi tiết + bằng chứng ở dòng cùng ID trong phần tương ứng.

| ID | Trạng thái | Nghĩa vụ | Phần |
|---|---|---|---|
| REQ-A02d | MỘT PHẦN | Chọn lĩnh vực theo taxonomy ngành 2 cấp, 10 nhóm | A |
| REQ-A05f | CHƯA | Mời thành viên bằng SĐT | A |
| REQ-A07b | GIẢ | Trang Cài đặt Audit log / AI Audit log dữ liệu thật | A |
| REQ-B04a | CHƯA | Cảnh báo rủi ro khi kết nối Zalo | A |
| REQ-B05c | CHƯA | Tuỳ chỉnh logo widget | A |
| REQ-B06b | CHƯA | Gmail OAuth | A |
| REQ-B11d | MỘT PHẦN | Phân công & SLA theo tài khoản | A |
| REQ-C05d | GIẢ | Tự dịch tin gửi đi | A |
| REQ-C10a | MỘT PHẦN | Đóng · Tạm ẩn 1 giờ / 3 giờ / sáng mai / tuỳ chọn | A |
| REQ-D17c | CHƯA | delegate / Cowork: kb_scope ∩ quyền người ra lệnh | A |
| REQ-E03d | CHƯA | Đề xuất tái dùng luồng trước | A |
| REQ-E04b | MỘT PHẦN | Hiện kế hoạch + tiến độ; dừng / sửa kế hoạch | A |
| REQ-E09c | MỘT PHẦN | Hoàn tác trong hạn; đã gửi → ghi đính chính | A |
| REQ-E11b | MỘT PHẦN | Chọn agent + cấp độ AI | A |
| REQ-E12a | GIẢ | Đính kèm tệp / ảnh / email vào lệnh | A |
| REQ-E12b | GIẢ | Nhập lệnh bằng giọng nói | A |
| REQ-F01b-4 | CHƯA | Chuyển phụ trách kèm lịch hẹn (`move.appointments`) chuyển thật | B |
| REQ-F01b-6 | CHƯA | Người phụ trách vắng / ngoài ca → hội thoại về hàng chung hoặc agent | B |
| REQ-F05b | CHƯA | Ảnh sản phẩm | B |
| REQ-F07b-3 | CHƯA | Bên giữ tồn chuẩn chọn theo kết nối (`stock_master` appchat / external) | B |
| REQ-F08f | GIẢ | Adapter bank feed thật cho DN: SePay gắn vào registry tenant, Casso có adapter | B |
| REQ-G07e | CHƯA | Liệu trình hiển thị ở Hồ sơ 360° và agent đọc được | B |
| REQ-M03b | MỘT PHẦN | Connector phát hành chạy thật: SePay, Casso (đối soát), SMTP, storage | B |
| REQ-N03b | CHƯA | OpenAPI tự sinh (Blueprint `/v1/docs`) | B |
| REQ-N08b | CHƯA | Quyền bị lãng quên: ẩn danh hoá khách (`contact.forget`, quyền `privacy.erase`) | B |
| REQ-N10d | CHƯA | WCAG AA (tương phản, aria, bàn phím) có kiểm tự động | B |
| COM-4-4 | MỘT PHẦN | Thẻ "Tạo đơn cho buổi này?" hiện ở lịch hẹn, **Inbox và Trợ lý** | C |
| COM-4-7 | MỘT PHẦN | Cọc theo số tiền **hoặc %** | C |
| COM-4-8 | CHƯA | Gợi ý tự bật cọc (sản phẩm có `deposit`, đơn giá trị cao, khách từng no-show) | C |
| COM-4b-5 | MỘT PHẦN | Mỗi kết nối chọn bên giữ tồn chuẩn (`appchat` / `external`) | C |
| COM-5-13 | GIẢ | Đối soát tự động SePay / Casso của DN qua webhook `/hooks/tenant-payments/:provider/:feedId`, khớp `TT-` | C |
| COM-6-10 | MỘT PHẦN | Hồ sơ 360° có thẻ "Liệu trình"; agent đọc được để tư vấn | C |
| COM-8-7 | MỘT PHẦN | Kéo tay thắng; quy tắc tự động không ghi đè trong 24 giờ | C |
| COM-8b-4 | MỘT PHẦN | Chuyển phụ trách (crm.reassign) kèm hội thoại / BG / **lịch hẹn sắp tới**; timeline + thông báo **hai bên** | C |
| COM-8b-5 | MỘT PHẦN | Tin mới tự gán owner; owner ngoài ca / vắng → hàng chung hoặc agent | C |
| COM-10-4 | CHƯA | Hạ gói có hiệu lực từ kỳ sau | C |
| D28b | GIẢ | SePay / Casso của DN phát hành thật | C |
| D28c | MỘT PHẦN | Connector storage phát hành | C |
| D48 | MỘT PHẦN | Research / Web search khoá "Sắp có" | C |
| D52d | CHƯA | Lịch hẹn `expired` xác nhận lại nếu còn chỗ | C |
| DC-029 | CHƯA | Kênh thông báo `mobile` mới lưu tuỳ chọn, chưa gửi | C |
| DC-058 | GIẢ | Kết nối SePay của DN dùng adapter thật | C |
| DC-081 | CHƯA | Owner vắng / ngoài ca → hàng chung | C |
| DC-086 | CHƯA | Nhiều widget / workspace (P1) | C |
| DC-110 | CHƯA | Parser pptx / OCR ảnh cho RAG (P1) | C |
| DC-215 | CHƯA | Cấu hình danh mục ticket riêng | C |
| ACT-doc_template.create | MỘT PHẦN | `doc_template.create` (config) — handler qua ActionExecutor, undo 24h | D |
| ACT-ai.detect_intent | CHƯA | `ai.detect_intent` có trong registry + handler | D |
| ACT-ai.extract_info | CHƯA | `ai.extract_info` có trong registry + handler | D |
| ACT-ai.score_lead | CHƯA | `ai.score_lead` có trong registry + handler | D |
| ACT-ai.summarize | CHƯA | `ai.summarize` có trong registry + handler | D |
| ACT-contact.add_note | CHƯA | `contact.add_note` có trong registry + handler | D |
| ACT-contact.forget | CHƯA | `contact.forget` có trong registry + handler | D |
| ACT-integration.sync_now | CHƯA | `integration.sync_now` có trong registry + handler | D |
| ACT-integration.test | CHƯA | `integration.test` có trong registry + handler | D |
| BP-4.4-fe-nav | GIẢ | GET /nav/badges (FE shell) | D |
| BP-4.6-b | CHƯA | Server → client event `run.step`, `run.done`, `credits.changed`, `conversation.counts`, `ui.command` | D |
| BP-9-e | MỘT PHẦN | /healthz, /readyz | D |
| BP-9-f | CHƯA | Web ErrorBoundary theo route | D |
| BP-11-b | MỘT PHẦN | Log pino JSON có traceId, redact PII; traceId nginx → api → job | D |
| STD-ai-rag-8b | CHƯA | UI hiện nguồn trích dẫn ở nhật ký AI và bản nháp | E |
| STD-api-envelope-10b | CHƯA | OpenAPI sinh từ zod (Blueprint: `/v1/docs`) | E |
| STD-authz-rbac-D32b | MỘT PHẦN | Chuyển phụ trách chỉ `crm.reassign`; Agent / Trợ lý chỉ **đề xuất (approval)** | E |
| STD-channels-adapter-2 | MỘT PHẦN | UI và AI chỉ đọc ChannelManifest, không `switch(type)` rải rác | E |
| STD-code-testing-4b | MỘT PHẦN | Đồng hồ cố định qua `Clock`, không `Date.now()` trực tiếp | E |
| STD-database-indexing-8 | MỘT PHẦN | Không `SELECT *` trong list API | E |
| STD-database-indexing-9 | CHƯA | Không N+1; repo list có test đếm số query | E |
| STD-documents-templates-2b | MỘT PHẦN | Chứng từ ghi `template_id` + `template_version` đã dùng | E |
| STD-documents-templates-6b | CHƯA | Kết quả bảng kiểm hiện trong preview của action gửi / duyệt | E |
| STD-domain-concurrency-1a | MỘT PHẦN | Cột `version` + `if_version` → STALE_VERSION cho contact, product, quote, contract, order, invoice, appointment, ticket, campaign, ai_agent, doc_templ | E |
| STD-domain-concurrency-1b | CHƯA | FE gửi if_version; nhận 409 hiện "vừa được người khác cập nhật" + Tải lại | E |
| STD-domain-concurrency-7a | MỘT PHẦN | Bulk xử lý từng bản ghi, trả kết quả theo id `ok / error.code` | E |
| STD-domain-concurrency-T | MỘT PHẦN | Test song song: cùng if_version, cùng chuyển trạng thái, webhook lặp, trừ kho song song | E |
| STD-domain-customfields-4b | CHƯA | Thẻ Kanban hiện tối đa 2 trường tuỳ biến | E |
| STD-domain-money-1.4 | CHƯA | Chia đợt / cọc theo %: làm tròn xuống, đợt cuối nhận phần dư | E |
| STD-domain-money-1.7 | MỘT PHẦN | Hiển thị tiền chỉ `fmt.money`, nhập `MoneyInput` | E |
| STD-domain-money-2.2 | MỘT PHẦN | Đồng hồ chỉ qua `Clock`; cấm Date.now()/new Date() trong service/handler/job | E |
| STD-domain-money-2.5 | CHƯA | Mốc nhắc (T-2 báo giá, T-1/T+1/T+7 đề nghị, lịch hẹn 24h) gửi trong giờ làm việc, ngoài giờ dời | E |
| STD-domain-state-1 | MỘT PHẦN | Một bảng `defineFlow` mỗi domain cho mọi entity có status (15 entity) | E |
| STD-domain-state-4 | MỘT PHẦN | Chuyển bởi hệ thống đi qua action `source='system'`, đọc lại trong tx | E |
| STD-domain-validate-1 | CHƯA | Hàm chuẩn hoá `packages/shared/src/validate/` + mã PHONE/EMAIL/TAX_CODE/NATIONAL_ID/URL/AMOUNT/QTY/PERCENT/COLOR_INVALID, phone_norm E.164 | E |
| STD-domain-validate-3a | MỘT PHẦN | Xoá khách: mềm, chặn khi có đơn / HĐ chưa đóng hoặc công nợ → HAS_DEPENDENCIES | E |
| STD-events-outbox-4 | MỘT PHẦN | Consumer idempotent `(event_id, consumer)` kể cả crash/replay đồng thời | E |
| STD-events-outbox-5 | MỘT PHẦN | Consumer có thay đổi nghiệp vụ chạy qua Action `source='system'` | E |
| STD-events-outbox-6 | CHƯA | Thứ tự đảm bảo theo từng entity (group theo entity_id) | E |
| STD-i18n-4 | MỘT PHẦN | Định dạng qua `fmt.*`; cấm toLocaleString rải rác | E |
| STD-integrations-ports-1a | GIẢ | BankFeedProvider phát hành SePay (chính) + Casso cho tiền khách của DN | E |
| STD-integrations-ports-8b | CHƯA | Action `integration.sync_now` và `integration.test` | E |
| STD-ui-fe-6 | CHƯA | Form antd + `zodRule(schema)` từ packages/actions; tiền `MoneyInput`, SĐT `PhoneInput` | E |
| STD-ui-fe-9 | MỘT PHẦN | 5 trạng thái qua PageStates | E |
| STD-ui-fe-11 | MỘT PHẦN | Responsive: breakpoint từ `Grid.useBreakpoint()`, không media query tay | E |
| STD-ui-fe-13b | CHƯA | Drawer / modal nặng dùng `next/dynamic`; charts import theo màn | E |
| STD-ui-ip-3.2 | CHƯA | Validate bằng zodRule khi rời ô / bấm nút; lỗi theo `errors.<CODE>`; cuộn tới lỗi đầu | E |
| STD-ui-ip-3.4 | CHƯA | Đóng form đã sửa chưa lưu → hỏi xác nhận bỏ thay đổi | E |
| STD-ui-ip-5 | MỘT PHẦN | Mỗi màn + panel đủ 5 trạng thái; empty phân biệt chưa có / lọc rỗng; dữ liệu cực trị | E |
| STD-ui-ip-7.4 | MỘT PHẦN | Vùng chạm ≥44×44 ở <md; không tràn ngang390 | E |
| STD-ui-parity-9 | MỘT PHẦN | Mobile <md e2e390×844: không tràn ngang, chạm≥44×44, action chính chạy | E |
| PRO-orders-files | GIẢ | Tab Tệp đơn hàng: Mở / Tải tệp lên | F |
| PRO-invoices-files | GIẢ | Tab Tệp đề nghị thanh toán: Mở / Tải tệp lên | F |
| PRO-products-files | GIẢ | Tab Tệp sản phẩm: Mở tệp | F |
| PRO-quotes-rowai | GIẢ | Dòng báo giá: nút ⚡ "AI xử lý" giao việc thật | F |
| PRO-contracts-rowai | GIẢ | Dòng hợp đồng: nút ⚡ "AI xử lý" | F |
| PRO-orders-rowai | GIẢ | Dòng đơn: nút ⚡ "AI xử lý" | F |
| PRO-calendar-rowai | GIẢ | Dòng lịch hẹn: nút ✦ AI xử lý | F |
| PRO-tickets-rowpeek | GIẢ | Dòng ticket: ✦ gợi ý AI (mở tab AI / chạy gợi ý) | F |
| PRO-invoices-aiacts | GIẢ | Tab AI đề nghị thanh toán: nút hành động AI gợi ý chạy thật | F |
| PRO-products-aiacts | GIẢ | Chi tiết sản phẩm: "Gợi ý combo" / "Tạo chiến dịch" AI | F |
| PRO-quotes-bulkfwd | GIẢ | Thanh chọn nhiều báo giá: Chuyển tiếp / Gán phụ trách | F |
| PRO-contracts-bulkfwd | GIẢ | Thanh chọn nhiều hợp đồng: Chuyển tiếp / Gán phụ trách | F |
| PRO-orders-bulkfwd | GIẢ | Thanh chọn nhiều đơn: Chuyển tiếp / Gán phụ trách | F |
| PRO-products-richtext | GIẢ | Form sản phẩm: thanh định dạng mô tả (B / I / list…) | F |
| PRO-customers-dedupe | GIẢ | Modal gộp trùng: ô tìm trả "không khớp" theo dữ liệu thật | F |
| PRO-inbox-360deal | GIẢ | Hồ sơ 360°: "+ Thêm" cơ hội / deal | F |
| PRO-inbox-360tasknote | GIẢ | Hồ sơ 360°: "+ Thêm việc" / "+ Thêm ghi chú" | F |
| PRO-assistant-plusfile | GIẢ | Trợ lý: menu ＋ "Thêm tệp" đính kèm vào lệnh (E12) | F |
| PRO-assistant-plusscreenshot | GIẢ | Trợ lý: menu ＋ "Chụp ảnh màn hình" | F |
| PRO-assistant-mic | GIẢ | Trợ lý: nút giọng nói | F |
| PRO-assistant-quick | GIẢ | Trợ lý: nút ⚡ lệnh nhanh | F |
| PRO-assistant-sessions | CHƯA | Màn "Nội dung trò chuyện" (lịch sử phiên, lọc, Xem lại) | F |
| PRO-assistant-taskspark | GIẢ | Thẻ tác vụ Cowork: sparkline hiệu suất từ số liệu thật | F |
| PRO-shell-navbadges | GIẢ | Badge đếm trên rail (Hộp thư / Ticket / Lịch) đọc `GET /nav/badges` | F |
| PRO-settings-audit | GIẢ | Cài đặt › Audit log đọc `GET /settings/audit` | F |
| PRO-settings-aiaudit | GIẢ | Cài đặt › AI Audit log đọc `GET /settings/ai-audit` | F |
| PRO-settings-wsswitch | GIẢ | Tổng quan workspace: nút "Chuyển" sang workspace khác | F |
| PRO-settings-wsbuy | GIẢ | Tổng quan workspace: "Mua thêm workspace" | F |
| PRO-settings-logo | GIẢ | Tổng quan workspace: Đổi logo (tải PNG/SVG) | F |
| PRO-settings-membersfilter | GIẢ | Thành viên: Lọc theo vai trò / trạng thái | F |
| PRO-settings-membersexport | GIẢ | Thành viên: Xuất danh sách | F |
| PRO-settings-widgetacts | GIẢ | Widget web: thêm / sửa nút hành động | F |
| PRO-settings-docs | GIẢ | Cài đặt: chip "Tài liệu hướng dẫn" | F |
| PRO-settings-tagslearn | GIẢ | Thẻ & nhãn: "Tìm hiểu thêm" | F |
| PRO-settings-navcounts | GIẢ | Nav Cài đặt: số đếm Thành viên / Vai trò / Thẻ / Câu trả lời mẫu theo dữ liệu thật | F |
| PRO-settings-booking | CHƯA | Cấu hình nhân sự / giờ mở cửa lịch hẹn (staff.*, business_hours.update, /settings/booking) | F |
| PRO-settings-paymentaccount | CHƯA | Cài đặt tài khoản nhận tiền (`payment_account.update`, /settings/payments) | F |
| PRO-settings-security | CHƯA | Mục Cài đặt "Bảo mật" (2FA, chính sách mật khẩu, khoá sau N lần sai) | F |
| PRO-settings-emailmkt | CHƯA | Mục "Email Marketing" (Brevo onboard) | F |
| DEF-001-1 | CHƯA | Gỡ 99 vòng phụ thuộc `apps/web` (barrel features + mock transport), xoá dòng baseline khi nối http | G |
| DEF-002-2 | CHƯA | Cache registry workspace qua Redis / invalidate pub/sub khi nhiều tiến trình api | G |
| DEF-012-2 | CHƯA | Action `integration.sync_now` | G |
| DEF-012-3 | GIẢ | Adapter Casso thật (verifyWebhook / parseTransactions) | G |
| DEF-012-4 | MỘT PHẦN | Brevo / SMTP workspace gửi thư thật | G |
| DEF-013-1 | CHƯA | Chuyển phụ trách khách của thành viên bị gỡ | G |
| DEF-015-1 | MỘT PHẦN | Consumer `contact.owner_changed` chuyển lịch hẹn mở (move.appointments) | G |
| DEF-017-2 | CHƯA | Typing indicator / `agent.status` tới widget (Blueprint §4.6) | G |
| DEF-017-3 | MỘT PHẦN | `/settings/widget` liệt kê đủ agent thật | G |
| DEF-023-2 | CHƯA | Màn lịch sử phiên Trợ lý dùng `GET /assistant/sessions` | G |
| DEF-023-4 | CHƯA | `find_actions` tìm bằng embedding description (Blueprint §5.2, DC-129) | G |
| DEF-026-2 | CHƯA | Kanban khách > 50 thẻ / cột có "Xem thêm" | G |
| DEF-027-2 | CHƯA | Lỗi `permission denied for table outbox_event` lần provision đầu — tìm nguyên nhân | G |
| DEF-028-1 | MỘT PHẦN | Queue `doc-render` (ROLE=jobs) cho PDF chứng từ phát hành | G |
| DEF-030-3 | CHƯA | Bảng chỉ thêm khác (stock_movement, order_event, ticket_event…) chặn UPDATE / DELETE bằng trigger | G |
| DEF-031-4 | CHƯA | Đồng bộ generator fixture `gen-inbox.py` / `gen-assistant.py` với fixture đang commit | G |
| DEF-031-5 | CHƯA | `db:cleanup-test` tự nạp `.env` | G |
| DEF-032-3 | MỘT PHẦN | Form chứng từ FE dùng ngày thật (`todayIso`) thay ngày cứng parity | G |
| DEF-033-1 | CHƯA | Mục Cài đặt "Đặt lịch": nhân sự / ca / giờ mở cửa (UI) | G |
| DEF-034-1 | GIẢ | Xu hướng KPI ticket (`trend`) so kỳ trước | G |
| DEF-034-2 | CHƯA | Màn cấu hình danh mục ticket | G |
| DEF-035-1 | CHƯA | E2E mock `settings` "thêm email qua wizard 3 bước" đỏ sẵn | G |
| DEF-035-2 | CHƯA | Tập "armed" cho mọi job quét tenant (sla / booking / contracts / sales / payment / order-sync) | G |
| Q-010 | CHƯA | Sửa E2E mock chập chờn (`quotes.spec.ts:37`, `settings-ops.spec.ts:44`, `settings.spec.ts:124`) nhánh `fix/e2e-flaky` | G |
| Q-017 | MỘT PHẦN | `e2e-http.mjs` tự dọn workspace test sau lượt | G |
| Q-018 | CHƯA | Cửa sổ ~10 giây dùng lại refresh token vừa xoay (nhiều tab) + sửa generator lệch fixture | G |
| Q-021 | CHƯA | "Chuyển tiếp" hàng loạt khách = gửi danh sách cho thành viên | G |
| DV-001 | CHƯA | Duyệt baseline vòng `apps/web` hoặc gỡ vòng | G |
| DV-015 | MỘT PHẦN | Duyệt bảng booking mới + `/v1/calendar`; thiếu UI cấu hình nhân sự / giờ mở cửa | G |

## A. Yêu cầu REQ-A…E (01-REQUIREMENTS-MATRIX)

| ID | Nghĩa vụ | Nguồn | TIP nhận | Trạng thái | Bằng chứng |
|---|---|---|---|---|---|
| REQ-A01a | Đăng ký / đăng nhập bằng OTP email | 01-REQUIREMENTS-MATRIX.md:34 | 004, 011 | ĐẠT | packages/core/src/identity/services/otp.service.ts:43, auth.service.ts:47; test apps/api/test/integration/auth.test.ts (AC2, OTP login) |
| REQ-A01b | Email + mật khẩu, "Ghi nhớ 30 ngày" (không ghi nhớ 1 ngày) | 01-REQUIREMENTS-MATRIX.md:34 | 004, 011 | ĐẠT | packages/core/src/identity/services/sessions.service.ts:12; auth.service.ts:62; test auth.test.ts AC5/AC6 |
| REQ-A01c | Quên mật khẩu: link 15 phút, chống dò tài khoản | 01-REQUIREMENTS-MATRIX.md:34 | 004, 011 | ĐẠT | auth.service.ts:16,75; test auth.test.ts AC3 + "AC6 quên mật khẩu"; e2e http/auth-onboarding.spec.ts |
| REQ-A01d | Gửi OTP / link qua Brevo thật | 01-REQUIREMENTS-MATRIX.md:34 | 004 | CHỜ-TK | identity.module.ts:10 BrevoMailProvider; test packages/integrations/test/ports.test.ts — Q-004 |
| REQ-A02a | Popup khai báo bắt buộc, không đóng được trước khi khai báo | 01-REQUIREMENTS-MATRIX.md:35 | 011 | ĐẠT | apps/web/src/features/onboarding/components/OnboardingGate.tsx:32 (không nút đóng); test onboarding.test.ts AC2/AC3; e2e http/auth-onboarding.spec.ts |
| REQ-A02b | DN / Hộ KD: tra MST rồi tự điền | 01-REQUIREMENTS-MATRIX.md:35 | 004, 011 | ĐẠT | packages/integrations/src/connectors/vietqr/tax-lookup.ts:14; apps/api/src/http/identity/workspaces.controller.ts:51; test ports.test.ts, workspaces.test.ts AC11 |
| REQ-A02c | Cá nhân: nhập VNeID (12 số) + nhập tay | 01-REQUIREMENTS-MATRIX.md:35 | 004, 011 | ĐẠT | packages/actions/src/onboarding.ts:16,25; DeclareStepInfo.tsx:55; test workspaces.test.ts AC9 |
| REQ-A02d | Chọn lĩnh vực theo taxonomy ngành 2 cấp, 10 nhóm | 01-REQUIREMENTS-MATRIX.md:35 | — | MỘT PHẦN | Chỉ ô mô tả tự do (DeclareBusinessModal.tsx:32, onboarding.ts:23) theo prototype ver2.1; không taxonomy, không mã quyết định bỏ |
| REQ-A03a | Mỗi workspace một DB riêng, tạo tự động khi đăng ký | 01-REQUIREMENTS-MATRIX.md:36 | 002, 004 | ĐẠT | packages/db/src/provisioner.ts:35; test packages/db/test/integration/tenant-isolation.test.ts, workspaces.test.ts AC7 |
| REQ-A03b | Migration áp cho mọi DB tenant | 01-REQUIREMENTS-MATRIX.md:36 | 002 | ĐẠT | packages/db/src/tenant-migrate.ts:28; test tenant-migrate.test.ts |
| REQ-A03c | Test tự động chống rò dữ liệu giữa tenant | 01-REQUIREMENTS-MATRIX.md:36 | 002 | ĐẠT | test tenant-isolation.test.ts "(d) 2 workspace ghi song song" |
| REQ-A04 | User nhiều workspace, đổi workspace từ menu Hồ sơ | 01-REQUIREMENTS-MATRIX.md:37 | 004, 011 | ĐẠT | identity/actions/workspace-switch.handler.ts:12; apps/web/src/shared/shell/UserMenu.tsx:45; test workspaces.test.ts AC9 |
| REQ-A05a | Permission engine + 5 vai trò mặc định | 01-REQUIREMENTS-MATRIX.md:38 | 005 | ĐẠT | packages/core/src/authz/seed.ts:7; test authz.test.ts AC2/AC3, packages/shared/src/authz/roles.test.ts |
| REQ-A05b | Data scope Của tôi / Nhóm / Tất cả áp mọi list / get | 01-REQUIREMENTS-MATRIX.md:38 | 005 | ĐẠT | packages/core/src/authz/scope.ts:20; test authz.test.ts AC8, inbox.test.ts AC4 |
| REQ-A05c | AI chạy đúng quyền người ra lệnh | 01-REQUIREMENTS-MATRIX.md:38 | 021, 022, 023 | ĐẠT | packages/core/src/ai/assistant/delegate.ts:1-4; test assistant.test.ts "quyền: sales…", ai-tasks.test.ts "quyền" |
| REQ-A05d | Trang Vai trò & phân quyền chỉ đọc | 01-REQUIREMENTS-MATRIX.md:38 | 013 | ĐẠT | apps/web/src/features/settings/components/RolesSection.tsx:29; test settings.test.ts AC8, e2e roles.spec.ts |
| REQ-A05e | Mời thành viên bằng email | 01-REQUIREMENTS-MATRIX.md:38 | 013 | ĐẠT | identity/actions/member-invite.handler.ts:23; test settings.test.ts AC2, workspaces.test.ts AC10 |
| REQ-A05f | Mời thành viên bằng SĐT | 01-REQUIREMENTS-MATRIX.md:38 | — | CHƯA | packages/actions/src/settings.ts:39 input chỉ email; MemberModal.tsx:12 |
| REQ-A05g | Số user giới hạn theo gói | 01-REQUIREMENTS-MATRIX.md:38 | 009, 013 | ĐẠT | member-invite.handler.ts:31; test settings.test.ts "vượt hạn mức gói → 402" |
| REQ-A05b-1 | Vai trò tuỳ biến (nhân bản, sửa ma trận quyền) | 01-REQUIREMENTS-MATRIX.md:39 | 042 | CHƯA | role.create/update/delete không có trong registry |
| REQ-A05b-2 | Quản lý Nhóm (team) | 01-REQUIREMENTS-MATRIX.md:39 | 042 | CHƯA | Chỉ GET /teams; team.* không có trong registry |
| REQ-A05b-3 | Ẩn trường theo vai trò phía server | 01-REQUIREMENTS-MATRIX.md:39 | 045b | MỘT PHẦN | custom-fields/values.ts fieldsForRole chưa áp serializer;042c chỉ scope bản ghi.045b nhận custom/system fields + filter/AI/export, không coi FE ẩn là an toàn |
| REQ-A06a | Trial 15 ngày Cá nhân Pro + 10.000 credit | 01-REQUIREMENTS-MATRIX.md:40 | 009 | ĐẠT | packages/core/src/billing/services/subscriptions.service.ts:31; test billing.test.ts AC3 |
| REQ-A06b | Màn chào mừng 2 nút + badge "Còn X ngày" | 01-REQUIREMENTS-MATRIX.md:40 | 011 | ĐẠT | OnboardingGate.tsx:34; apps/web/src/shared/shell/RailFoot.tsx:22; test onboarding.test.ts AC4, e2e http/auth-onboarding.spec.ts |
| REQ-A06c | Hết hạn → gói Miễn phí, thông báo đóng được, dữ liệu giữ | 01-REQUIREMENTS-MATRIX.md:40 | 009, 011 | ĐẠT | subscriptions.service.ts:69-76; TrialExpired.tsx:21; test billing.test.ts AC7, onboarding.test.ts AC5 |
| REQ-A07a | Audit: mọi hành động người + AI ghi action_log | 01-REQUIREMENTS-MATRIX.md:41 | 003 | ĐẠT | packages/core/src/kernel/actions/executor.ts:150; test actions.test.ts "happy path … action_log" |
| REQ-A07b | Trang Cài đặt Audit log / AI Audit log dữ liệu thật | 01-REQUIREMENTS-MATRIX.md:41 | — | GIẢ | FE gọi /settings/audit, /settings/ai-audit (features/settings/api.ts:104,106) — routes.json missing, chỉ chạy mock |
| REQ-A07c | admin.* ghi platform_audit_log; sự kiện nhạy cảm cờ audit | 01-REQUIREMENTS-MATRIX.md:41 | 045b | CHƯA | Không chỗ ghi platform_audit_log |
| REQ-A09a | Tự lưu trữ gói Miễn phí sau 90 ngày, báo trước 14 ngày | 01-REQUIREMENTS-MATRIX.md:42 | 041 | CHƯA | Chỉ cột plan archiveInactiveDays (billing/seed.ts:24); không job |
| REQ-A09b | Lưu trữ = dump + drop; đăng nhập lại khôi phục < 2 phút | 01-REQUIREMENTS-MATRIX.md:42 | 041 | CHƯA | Không code dump / restore |
| REQ-A08 | Đăng nhập social | 01-REQUIREMENTS-MATRIX.md:43 | — | NGOÀI | P2 theo ma trận |
| REQ-B01a | Kiến trúc adapter kênh, chuẩn hoá schema chung | 01-REQUIREMENTS-MATRIX.md:48 | 014 | ĐẠT | packages/channels/src/types.ts, registry.ts; test packages/channels/test/registry.test.ts |
| REQ-B01b | Chống trùng UNIQUE(channel_account_id, external_msg_id) | 01-REQUIREMENTS-MATRIX.md:48 | 016 | ĐẠT | packages/db/prisma/tenant/inbox.prisma:173; inbox/services/pipeline.ts:60; test inbox.test.ts AC2 |
| REQ-B01c | Gửi qua outbox, retry back-off, dead-letter | 01-REQUIREMENTS-MATRIX.md:48 | 003, 014, 016 | ĐẠT | channels/services/send-queue.ts:34,46; kernel/outbox/relay.ts:46; test inbox.test.ts AC3, relay-sequence.test.ts |
| REQ-B02a | Zalo cá nhân kết nối QR | 01-REQUIREMENTS-MATRIX.md:49 | 014 | CHỜ-TK | channels/actions/channel-connect.handlers.ts:24; zalo-personal/zca-transport.ts:77; test channels.test.ts AC3 — Q-003 |
| REQ-B02b | Credential mã hoá, tự kết nối lại | 01-REQUIREMENTS-MATRIX.md:49 | 014 | CHỜ-TK | channels/jobs/sessions.ts; test channels.test.ts AC3/AC9 — Q-003 |
| REQ-B02c | Nhận / gửi 1-1 text, ảnh, file, sticker | 01-REQUIREMENTS-MATRIX.md:49 | 014, 016 | CHỜ-TK | zalo-personal/adapter.ts:101-114; test zalo-adapter.test.ts — Q-003 |
| REQ-B02d | Đồng bộ danh bạ Zalo | 01-REQUIREMENTS-MATRIX.md:49 | 014b | CHƯA | Không gọi danh sách bạn bè trong zca-transport.ts / adapter.ts Planned014b: provider lifecycle/commands/history/contacts/receipts and native/live acceptance; no runtime promotion. |
| REQ-B02e | Đồng bộ tin gần đây | 01-REQUIREMENTS-MATRIX.md:49 | 014 | CHỜ-TK | adapter.ts:95; channel-manage.handlers.ts:88; test channels.test.ts AC6 — Q-003 |
| REQ-B02f | Báo trạng thái kênh | 01-REQUIREMENTS-MATRIX.md:49 | 014 | ĐẠT | sessions.ts:149; test channels.test.ts AC9 |
| REQ-B03a | Nhận tin nhóm Zalo | 01-REQUIREMENTS-MATRIX.md:50 | 014, 016 | CHỜ-TK | test inbox.test.ts AC2 (nhóm → participant), zalo-adapter.test.ts — Q-003 |
| REQ-B03b | AI nhóm 3 chế độ đổi được | 01-REQUIREMENTS-MATRIX.md:50 | 025b | MỘT PHẦN | Backend đọc group_ai_policy (pipeline.ts:29; agent-reply.test.ts); FE đổi chỉ useState (GroupSections.tsx:37,109), không action ghi |
| REQ-B04a | Cảnh báo rủi ro khi kết nối Zalo | 01-REQUIREMENTS-MATRIX.md:51 | — | CHƯA | manifest.ts:11 riskNotice không được FE dùng, không có chuỗi i18n |
| REQ-B04b | Random delay + giới hạn / phút | 01-REQUIREMENTS-MATRIX.md:51 | 014 | CHỜ-TK | channels/jobs/send.processor.ts:42-59; test channels.test.ts AC8 — Q-003 |
| REQ-B04c | Quota tin / ngày | 01-REQUIREMENTS-MATRIX.md:51 | 037 | MỘT PHẦN | send.processor.ts:43 chỉ tin chủ động, không số mặc định (Q-013) |
| REQ-B04d | Tự ngắt khi bị chặn | 01-REQUIREMENTS-MATRIX.md:51 | 014 | CHỜ-TK | sessions.ts:149; test channels.test.ts AC8/AC9 — Q-003 |
| REQ-B05a | Widget JS nhúng, realtime | 01-REQUIREMENTS-MATRIX.md:52 | 017 | ĐẠT | apps/widget/src/main.ts:55; test webchat.test.ts, apps/widget/test/ui.test.ts, e2e http/webchat.spec.ts |
| REQ-B05b | Tuỳ chỉnh màu, lời chào | 01-REQUIREMENTS-MATRIX.md:52 | 017 | ĐẠT | packages/actions/src/settings-apps.ts:256-261; test webchat.test.ts AC2 |
| REQ-B05c | Tuỳ chỉnh logo widget | 01-REQUIREMENTS-MATRIX.md:52 | — | CHƯA | webchat.update_widget không có ô logo (settings-apps.ts:256-275) |
| REQ-B05d | Form thu lead (pre-chat) | 01-REQUIREMENTS-MATRIX.md:52 | 017 | ĐẠT | channels/webchat/widget.service.ts:48; test webchat.test.ts AC3+AC4 |
| REQ-B05e | Chọn AI Agent trực widget | 01-REQUIREMENTS-MATRIX.md:52 | 017, 022 | ĐẠT | settings-apps.ts:266; e2e http/agent-reply.spec.ts |
| REQ-B06a | Email IMAP + SMTP | 01-REQUIREMENTS-MATRIX.md:53 | 018 | ĐẠT | packages/channels/src/email/imap-transport.ts:122; test email.test.ts, email-adapter.test.ts, smtp.test.ts |
| REQ-B06b | Gmail OAuth | 01-REQUIREMENTS-MATRIX.md:53 | — | CHƯA | Không nhánh OAuth; Q-016 mở |
| REQ-B06c | Gom email theo thread | 01-REQUIREMENTS-MATRIX.md:53 | 018 | ĐẠT | channels/email/threads.ts:19; test email.test.ts AC3/AC4 |
| REQ-B07 | Trang Kênh kết nối: danh sách, sức khoẻ, kết nối lại, ngắt | 01-REQUIREMENTS-MATRIX.md:54 | 014 | ĐẠT | channel-manage.handlers.ts:142; test channels.test.ts AC5/AC9/AC10, e2e http/channels.spec.ts |
| REQ-B08 | Zalo OA / FB / IG / Telegram / WhatsApp / TikTok | 01-REQUIREMENTS-MATRIX.md:55 | — | NGOÀI | P2 theo ma trận, D04 |
| REQ-B09a | Một kênh nhiều tài khoản; sức khoẻ = tài khoản kém nhất | 01-REQUIREMENTS-MATRIX.md:56 | 014 | ĐẠT | channels/services/read.service.ts:50; test channels.test.ts AC5/AC10 |
| REQ-B09b | Bộ lọc tài khoản Hộp thư cùng dữ liệu | 01-REQUIREMENTS-MATRIX.md:56 | 016, 025 | ĐẠT | GET /inbox/accounts; test inbox-ui.test.ts "lọc tài khoản" |
| REQ-B10a | Kết nối 3 bước + cấu hình nhanh | 01-REQUIREMENTS-MATRIX.md:57 | 014, 018 | ĐẠT | features/settings/components/ConnectChannelModal.tsx; test email.test.ts AC2, e2e http/channels.spec.ts |
| REQ-B10b | OAuth / kênh ngoài manifest "Sắp có" | 01-REQUIREMENTS-MATRIX.md:57 | 014 | ĐẠT | packages/channels/src/coming-soon.ts; test channels.test.ts AC5 |
| REQ-B10c | Kết nối kênh qua Trợ lý (QR trong chat) | 02-TASK-GRAPH.md:82 | 023c | CHƯA | Không khối qr / channel.status |
| REQ-B11a | Drawer: kiểm tra, đồng bộ lại | 01-REQUIREMENTS-MATRIX.md:58 | 014 | ĐẠT | channel-manage.handlers.ts:88,111; test channels.test.ts AC6 |
| REQ-B11b | Hiệu suất 7 ngày | 01-REQUIREMENTS-MATRIX.md:58 | 014 | ĐẠT | read.service.ts:72; test channels.test.ts AC5 |
| REQ-B11c | Trả lời tự động: agent, chế độ, giờ, lời chào | 01-REQUIREMENTS-MATRIX.md:58 | 022b | MỘT PHẦN | agent / ai_mode / greeting dùng; hours chỉ chèn prompt (reply-context.ts:93), không chặn ngoài giờ Planned022b: explicit behavior, scoped action/receipt, UI/native/real-model acceptance; no runtime promotion. |
| REQ-B11d | Phân công & SLA theo tài khoản | 01-REQUIREMENTS-MATRIX.md:58 | — | MỘT PHẦN | assign_mode / sla_policy chỉ lưu (accounts.service.ts:18-19), không code đọc |
| REQ-B11e | Đồng bộ: tin nhắn, tự tạo liên hệ, lịch sử 0/7/30/90 | 01-REQUIREMENTS-MATRIX.md:58 | 014b | MỘT PHẦN | history_days chạy; sync_messages / sync_auto_create_contact không được pipeline.ts đọc Planned014b: provider lifecycle/commands/history/contacts/receipts and native/live acceptance; no runtime promotion. |
| REQ-B11f | Vùng nguy hiểm: tạm dừng / tiếp tục, kết nối lại, ngắt | 01-REQUIREMENTS-MATRIX.md:58 | 014 | ĐẠT | channel-manage.handlers.ts:50,68,142; test channels.test.ts AC6/AC9/AC10 |
| REQ-C01a | Inbox 3 cột chạy API thật | 01-REQUIREMENTS-MATRIX.md:63 | 016, 025 | ĐẠT | features/inbox/screens/InboxScreen.tsx; e2e http/inbox.spec.ts, http/inbox-live.spec.ts |
| REQ-C01b | Realtime WebSocket | 01-REQUIREMENTS-MATRIX.md:63 | 006, 025 | ĐẠT | test inbox.test.ts AC9, inbox-ui.test.ts "realtime", e2e http/inbox-live.spec.ts |
| REQ-C01c | Đo p95 < 1s | 01-REQUIREMENTS-MATRIX.md:63 | 046 | CHƯA | Chưa có phép đo |
| REQ-C02 | Chế độ AI off / copilot / auto + mặc định theo kênh | 01-REQUIREMENTS-MATRIX.md:64 | 016, 022 | ĐẠT | inbox/actions/conversation-state.handlers.ts:96; test agent-reply.test.ts "copilot" |
| REQ-C03 | Folder views (AI đang xử lý, Cần người, AI chờ duyệt…) | 01-REQUIREMENTS-MATRIX.md:65 | 016 | ĐẠT | inbox/repos/conversations.repo.ts:31-59; test inbox.test.ts AC7 |
| REQ-C04a | Gán cho người hoặc AI Agent | 01-REQUIREMENTS-MATRIX.md:66 | 016 | ĐẠT | conversation-assign.handlers.ts:23; test inbox.test.ts AC5 |
| REQ-C04b | Gắn thẻ dùng chung | 01-REQUIREMENTS-MATRIX.md:66 | 016 | ĐẠT | conversation-assign.handlers.ts:47,66; test inbox.test.ts AC5/AC8 |
| REQ-C04c | Ghi chú nội bộ @mention | 01-REQUIREMENTS-MATRIX.md:66 | 016, 025 | ĐẠT | message.handlers.ts:188; test inbox-ui.test.ts "note.add @nhắc" |
| REQ-C04d | Ghim, lưu trữ | 01-REQUIREMENTS-MATRIX.md:66 | 016 | ĐẠT | conversation-state.handlers.ts:58,68; test inbox.test.ts AC5 |
| REQ-C05a | Composer đính kèm file | 01-REQUIREMENTS-MATRIX.md:67 | 025 | ĐẠT | Composer.tsx:84; test inbox-ui.test.ts "Email: gửi ảnh" |
| REQ-C05b | Câu trả lời mẫu | 01-REQUIREMENTS-MATRIX.md:67 | 016, 025 | ĐẠT | ComposerPopovers.tsx:33-50; test inbox.test.ts AC8 |
| REQ-C05c | AI soạn / viết lại trong composer | 01-REQUIREMENTS-MATRIX.md:67 | 023c | GIẢ | InboxAiModal.tsx:13,58 chỉ mở Trợ lý đầy đủ |
| REQ-C05d | Tự dịch tin gửi đi | 01-REQUIREMENTS-MATRIX.md:67 | — | GIẢ | Popover xl chỉ bật cờ ui.autoXl (ComposerPopovers.tsx:96); submit không dịch |
| REQ-C05e | Nhãn ý định MUA / HỎI / KHIẾU NẠI / ĐẶT LỊCH | 01-REQUIREMENTS-MATRIX.md:67 | 022b | CHƯA | conversation.intent (inbox.prisma:125) không nơi ghi; intent agent (packages/ai/src/reply/output.ts:9) bị bỏ Planned022b: explicit behavior, scoped action/receipt, UI/native/real-model acceptance; no runtime promotion. |
| REQ-C06a | Tự gắn khách theo ID kênh / SĐT | 01-REQUIREMENTS-MATRIX.md:68 | 015, 016 | ĐẠT | crm/services/identity.service.ts:30-55; test inbox.test.ts AC2 |
| REQ-C06b | Chưa có thì tạo hồ sơ nháp | 01-REQUIREMENTS-MATRIX.md:68 | 015 | ĐẠT | identity.service.ts:40-47; test inbox.test.ts AC2 |
| REQ-C06c | Khớp không chắc → gợi ý gộp | 01-REQUIREMENTS-MATRIX.md:68 | 015, 026 | ĐẠT | crm/services/crm-read.service.ts:107; test crm-contacts.test.ts AC7 |
| REQ-C07 | "Chuyển thành" Đơn / Báo giá / Lịch hẹn / Ticket gắn hội thoại | 01-REQUIREMENTS-MATRIX.md:69 | 025b | MỘT PHẦN | Profile360Actions.tsx:52-55 mở form chỉ có contact_id; quote / order không nhận conversation_id; chỉ e2e mock inbox.spec.ts:69 |
| REQ-C08a | Thao tác hàng loạt hội thoại (backend) | 01-REQUIREMENTS-MATRIX.md:70 | 016 | ĐẠT | conversation-assign.handlers.ts:100; test inbox.test.ts AC5 |
| REQ-C08b | Multi-select hội thoại trên UI | 01-REQUIREMENTS-MATRIX.md:70 | 025b | CHƯA | FE không gọi conversation.bulk_update; Q-019 mở |
| REQ-C08c | Tìm không dấu | 01-REQUIREMENTS-MATRIX.md:70 | 016, 025 | ĐẠT | test inbox.test.ts AC7, e2e http/inbox-live.spec.ts:41 |
| REQ-C09a | Cảm xúc (bấm lại bỏ), chỉ hiện ở kênh hỗ trợ | 01-REQUIREMENTS-MATRIX.md:71 | 025b | MỘT PHẦN | Backend ĐẠT (message.handlers.ts:148; inbox.test.ts AC6); FE hiện mọi kênh (MessageMenu.tsx:76) |
| REQ-C09b | Trả lời trích · Sao chép · Chuyển tiếp · Ghim | 01-REQUIREMENTS-MATRIX.md:71 | 016, 025 | ĐẠT | MessageMenu.tsx:35-38; message.handlers.ts:76,161; test inbox.test.ts AC3/AC6 |
| REQ-C09c | Dịch tin | 01-REQUIREMENTS-MATRIX.md:71 | 025 | CHỜ-TK | ai/skills/translate.handler.ts:22; test inbox-ui.test.ts "ai.translate (model giả)" — Q-001 |
| REQ-C09d | Tạo ticket từ tin | 01-REQUIREMENTS-MATRIX.md:71 | 025, 034 | ĐẠT | MessageMenu.tsx:41-48; TicketsScreen.tsx:45; test support.test.ts (source_message_id) |
| REQ-C09e | Thu hồi / Xoá có xác nhận | 01-REQUIREMENTS-MATRIX.md:71 | 016 | ĐẠT | message.handlers.ts:100,115; test inbox.test.ts AC6 |
| REQ-C10a | Đóng · Tạm ẩn 1 giờ / 3 giờ / sáng mai / tuỳ chọn | 01-REQUIREMENTS-MATRIX.md:72 | — | MỘT PHẦN | ConvMenu.tsx:63 "sáng mai" = +16 giờ, "tuỳ chọn" = +24 giờ cố định |
| REQ-C10b | Phím tắt chèn câu trả lời mẫu | 01-REQUIREMENTS-MATRIX.md:72 | 025 | ĐẠT | ConvMenu.tsx:110-119; e2e inbox.spec.ts:23 |
| REQ-C10c | Phân công nhân viên + agent kèm tải | 01-REQUIREMENTS-MATRIX.md:72 | 025b | MỘT PHẦN | ConvMenu.tsx:121-140 không hiện tải |
| REQ-C10d | Vòng đời = contact.stage (D49) | 01-REQUIREMENTS-MATRIX.md:72 | 025 | ĐẠT | ConvMenu.tsx:16,143; test crm-contacts.test.ts |
| REQ-C10e | Gắn nhiều thẻ, tạo thẻ mới | 01-REQUIREMENTS-MATRIX.md:72 | 016, 025 | ĐẠT | ConvMenu.tsx:168; test inbox.test.ts AC5 |
| REQ-C10f | Lưu trữ · Ẩn trò chuyện · Xoá lịch sử | 01-REQUIREMENTS-MATRIX.md:72 | 016 | ĐẠT | conversation-state.handlers.ts:68,82,125; test inbox.test.ts AC5 |
| REQ-C10g | Tạo nhóm "Sắp có" | 01-REQUIREMENTS-MATRIX.md:72 | 025 | ĐẠT | ConvMenu.tsx:189 (D50) |
| REQ-C11a | Menu ＋: Thêm tệp · Chụp ảnh màn hình | 01-REQUIREMENTS-MATRIX.md:73 | 025b | GIẢ | "Chụp ảnh màn hình" chỉ đóng menu (AgentToolsMenu.tsx:32) |
| REQ-C11b | Quyền của agent chỉ xem, nhóm module + Kỹ năng AI, badge, link Builder | 01-REQUIREMENTS-MATRIX.md:73 | 021, 025 | ĐẠT | AgentToolsMenu.tsx:36-64; test agents.test.ts AC5 |
| REQ-C11c | Research / Web search "Sắp có" (D48) | 01-REQUIREMENTS-MATRIX.md:73 | 025 | ĐẠT | AgentToolsMenu.tsx:56-59 |
| REQ-C12 | Tìm trong hội thoại không dấu, N/M, lọc người gửi | 01-REQUIREMENTS-MATRIX.md:74 | 025b | MỘT PHẦN | Backend TIP016/025 có search (conversations.controller.ts:57; read.service.ts:119; inbox.test.ts AC7). Rà lại 2026-11-02: apps/web/src/features/inbox/components/ThreadSearchBar.tsx:37–40 chỉ cuộn DOM đã tải; :54–57 chỉ Escape/Enter, thiếu phím lên/xuống và tải tin cũ để định vị. Chưa có TIP bổ sung nhận phần thiếu; không dùng TIP đã DONE làm owner sửa lỗi. |
| REQ-C13 | Header + khung nhập ver2.1 | 01-REQUIREMENTS-MATRIX.md:75 | 025 | ĐẠT | ChatHeader.tsx:27; Composer.tsx:147; MessageBubble.tsx:139; e2e inbox.spec.ts |
| REQ-D01a | Agent runtime sau Agent Gateway | 01-REQUIREMENTS-MATRIX.md:80 | 019 | ĐẠT | packages/ai/src/gateway/engine.ts:35; test packages/ai/test/engine.test.ts |
| REQ-D01b | Ngữ cảnh → RAG → tools → trả lời, bất đồng bộ trong worker | 01-REQUIREMENTS-MATRIX.md:80 | 022 | ĐẠT | ai/reply/reply.service.ts; test agent-reply.test.ts "worker ROLE=ai" |
| REQ-D01c | Stream kết quả | 01-REQUIREMENTS-MATRIX.md:80 | 023c | MỘT PHẦN | JSON một lần (DV-006) |
| REQ-D02a | LLM Router đa provider + OpenAI-compatible | 01-REQUIREMENTS-MATRIX.md:81 | 019 | CHỜ-TK | packages/ai/src/router/providers.ts; test router.test.ts — Q-001 |
| REQ-D02b | Định tuyến theo tác vụ / mức, fallback | 01-REQUIREMENTS-MATRIX.md:81 | 019 | ĐẠT | packages/ai/src/router/router.ts:29; test router.test.ts "503 → provider kế" |
| REQ-D02c | Ẩn tên model | 01-REQUIREMENTS-MATRIX.md:81 | 019 | ĐẠT | test ai-runtime.test.ts AC5 |
| REQ-D03a | Tools agent ⊆ Action Registry, cấp theo agent | 01-REQUIREMENTS-MATRIX.md:82 | 021 | ĐẠT | ai/agents/agent-tools.ts:57; test agents.test.ts AC2 |
| REQ-D03b | Bộ tool mặc định Sales đủ (SP / giá / tồn, đơn, lịch, ticket, gửi file…) | 01-REQUIREMENTS-MATRIX.md:82 | 022b | MỘT PHẦN | templates.seed.ts:9 sales chỉ 4 tool Planned022b: explicit behavior, scoped action/receipt, UI/native/real-model acceptance; no runtime promotion. |
| REQ-D04a | Kho RAG thư mục, thẻ, tải PDF/DOCX/XLSX/CSV/TXT/MD | 01-REQUIREMENTS-MATRIX.md:83 | 020 | ĐẠT | ai/kb/parse.ts:18; kb.handlers.ts:33,160; test kb.test.ts AC4, e2e http/rag.spec.ts |
| REQ-D04a-2 | Nguồn URL, văn bản, danh mục sản phẩm | 01-REQUIREMENTS-MATRIX.md:83 | 020, 027 | ĐẠT | kb.handlers.ts:63-71; catalog/events/catalog-sync.ts; test kb.test.ts, catalog.test.ts:212 |
| REQ-D04c | Trạng thái index, số đoạn, index lại | 01-REQUIREMENTS-MATRIX.md:83 | 020 | ĐẠT | kb.handlers.ts:137; test kb.test.ts AC6 |
| REQ-D04d | public / internal | 01-REQUIREMENTS-MATRIX.md:83 | 020 | ĐẠT | kb-search.handler.ts:15; test kb.test.ts AC5 |
| REQ-D04e | Hybrid + không dấu + ngưỡng căn cứ + trích nguồn | 01-REQUIREMENTS-MATRIX.md:83 | 020 | CHỜ-TK | ai/kb/search.ts:77; test kb.test.ts AC5 (embed giả) — Q-002 |
| REQ-D04f | Giá / tồn / lịch không lấy từ RAG | 01-REQUIREMENTS-MATRIX.md:83 | 020, 027 | ĐẠT | test kb.test.ts "đoạn có giá không bao giờ ra" |
| REQ-D04b | AI học từ hội thoại, người duyệt | 01-REQUIREMENTS-MATRIX.md:84 | 043 | CHƯA | kb.suggestion.* không có |
| REQ-D05a | Tự làm khi tin cậy ≥ 70% | 01-REQUIREMENTS-MATRIX.md:85 | 022 | ĐẠT | packages/ai/src/reply/handoff.ts:26; test reply.test.ts, agent-reply.test.ts |
| REQ-D05b | Ép duyệt: giảm giá ngoài chính sách, hoàn tiền, báo giá > 20M, HĐ, gửi hàng loạt | 01-REQUIREMENTS-MATRIX.md:85 | 032b | MỘT PHẦN | policy.ts:13 send / money → approval; FORCE_APPROVAL (governance.ts:34) chỉ hiển thị |
| REQ-D06a | Handoff theo các lý do | 01-REQUIREMENTS-MATRIX.md:86 | 022 | ĐẠT | handoff.ts:26; test agent-reply.test.ts |
| REQ-D06b | Handoff kèm nháp + folder Cần người | 01-REQUIREMENTS-MATRIX.md:86 | 022 | ĐẠT | reply.service.ts:76; test agent-reply.test.ts "độ tin cậy thấp" |
| REQ-D06c | Handoff kèm tóm tắt | 01-REQUIREMENTS-MATRIX.md:86 | 022b | MỘT PHẦN | Chỉ lý do; tóm tắt chỉ khi agent tự gọi tool (reply.service.ts:107) Planned022b: explicit behavior, scoped action/receipt, UI/native/real-model acceptance; no runtime promotion. |
| REQ-D07a | Hàng chờ duyệt Duyệt / Sửa / Từ chối | 01-REQUIREMENTS-MATRIX.md:87 | 021, 024 | ĐẠT | approval.handlers.ts:74-92; test agents.test.ts AC4, e2e http/agents-ui.spec.ts:60 |
| REQ-D07b | Duyệt ở thông báo | 01-REQUIREMENTS-MATRIX.md:87 | 021 | ĐẠT | ai/events/agents.rules.ts:8; test agents.test.ts AC4 |
| REQ-D07c | Thẻ duyệt trong Inbox | 01-REQUIREMENTS-MATRIX.md:87 | 025b | CHƯA | Chỉ folder ai_pending_approval (FolderRail.tsx:108) |
| REQ-D07d | Thẻ duyệt ở Tổng quan | 01-REQUIREMENTS-MATRIX.md:87 | 038 | GIẢ | GET /dashboard missing ở API |
| REQ-D08a | Nhật ký run (prompt, nguồn, tools, token, credit) | 01-REQUIREMENTS-MATRIX.md:88 | 019 | ĐẠT | ai/runs/run.store.ts; test ai-runtime.test.ts AC4 |
| REQ-D08b | Hoàn tác nhóm cho phép | 01-REQUIREMENTS-MATRIX.md:88 | 003, 024 | ĐẠT | kernel/actions/undo.service.ts:19; test actions.test.ts AC7 |
| REQ-D09a | Builder đủ trường | 01-REQUIREMENTS-MATRIX.md:89 | 021, 024 | ĐẠT | ai/agents/agent.handlers.ts:30-130; test agents.test.ts, agents-ui.test.ts |
| REQ-D09a-2 | "Tối ưu prompt" bằng AI | 01-REQUIREMENTS-MATRIX.md:89 | 021 | CHỜ-TK | agent-llm.handlers.ts:99; test agents.test.ts AC3 — Q-001 |
| REQ-D09c | Nháp ↔ đang chạy, phiên bản, quay lại | 01-REQUIREMENTS-MATRIX.md:89 | 021 | ĐẠT | agent.handlers.ts:86,98; test agents.test.ts AC2 |
| REQ-D09d | Chat thử giả lập | 01-REQUIREMENTS-MATRIX.md:89 | 021 | ĐẠT | agent-llm.handlers.ts:38; test agents.test.ts AC3 |
| REQ-D09b-a | 3 cách tạo agent | 01-REQUIREMENTS-MATRIX.md:90 | 021, 024 | ĐẠT | agent.handlers.ts:41; agent-llm.handlers.ts:74; e2e http/agents-ui.spec.ts:15 |
| REQ-D09b-b | Tools ⊆ quyền ∩ agentGrantable; max_agents | 01-REQUIREMENTS-MATRIX.md:90 | 021 | ĐẠT | test agents.test.ts AC2/AC3 |
| REQ-D10a | Agent đọc 360° (mua, hẹn, ghi chú, hạng) | 01-REQUIREMENTS-MATRIX.md:91 | 015b | MỘT PHẦN | reply-context.ts:79-80 chỉ tên / nhóm / giai đoạn + memory |
| REQ-D10b | Agent ghi sự kiện về khách | 01-REQUIREMENTS-MATRIX.md:91 | 015b | CHƯA | Không chỗ ghi contact_memory |
| REQ-D11a | Lọc PII trước prompt | 01-REQUIREMENTS-MATRIX.md:92 | 022 | ĐẠT | packages/ai/src/reply/pii.ts:28; test reply.test.ts, agent-reply.test.ts "PII" |
| REQ-D11b | Guardrail + từ cấm | 01-REQUIREMENTS-MATRIX.md:92 | 021, 022 | ĐẠT | governance.ts:31; test agent-reply.test.ts "từ cấm" |
| REQ-D12 | Chủ động theo lịch, tôn trọng giới hạn Zalo | 01-REQUIREMENTS-MATRIX.md:93 | 035 | ĐẠT | ai/tasks/task-scheduler.ts, task-targets.ts; test ai-tasks.test.ts:199,257,312 |
| REQ-D13a | Chuyển hội thoại + hỏi ý agent khác | 01-REQUIREMENTS-MATRIX.md:94 | 022 | ĐẠT | ai/reply/reply-tools.ts:16; test agent-reply.test.ts "transfer", "consult" |
| REQ-D13b | Giới hạn bước, ngân sách, trace | 01-REQUIREMENTS-MATRIX.md:94 | 019, 022 | ĐẠT | reply-tools.ts:18; test agent-reply.test.ts "A → B → A" |
| REQ-D15 | 6 agent mẫu + mẫu ngành | 01-REQUIREMENTS-MATRIX.md:95 | 021, 024 | ĐẠT | ai/agents/templates.seed.ts:8-15; test agents-ui.test.ts "D15" |
| REQ-D14a | Số hội thoại, tỉ lệ tự xử lý | 01-REQUIREMENTS-MATRIX.md:96 | 021 | ĐẠT | ai/agents/agents.read.ts:22-45; test agents.test.ts AC5 |
| REQ-D14b | Tỉ lệ chốt, CSAT, credit, so với nhân sự | 01-REQUIREMENTS-MATRIX.md:96 | 038 | CHƯA | agents.read.ts:40 csat: 0 cứng |
| REQ-D16a | Tools nhóm module + Kỹ năng AI, n/tổng | 01-REQUIREMENTS-MATRIX.md:97 | 021 | ĐẠT | agent-tools.ts:35; test agents.test.ts AC5, apps/web/src/shared/ai/agent-tools.test.ts |
| REQ-D16b | Badge Cần kết nối / Sắp có | 01-REQUIREMENTS-MATRIX.md:97 | 021 | ĐẠT | agent-tools.ts:25-28; test agents.test.ts AC5 |
| REQ-D17a | kb_scope chọn trong Builder | 01-REQUIREMENTS-MATRIX.md:98 | 020, 021 | ĐẠT | agent.store.ts:98; KnowledgeSection.tsx:22-45; e2e agents.spec.ts:91 |
| REQ-D17b | Trả lời khách chỉ public trong kb_scope | 01-REQUIREMENTS-MATRIX.md:98 | 022 | ĐẠT | reply-context.ts:86; test agent-reply.test.ts |
| REQ-D17c | delegate / Cowork: kb_scope ∩ quyền người ra lệnh | 01-REQUIREMENTS-MATRIX.md:98 | — | CHƯA | kb.search bỏ qua kb_scope (kb-search.handler.ts:26); delegate / task không truyền phạm vi |
| REQ-D17d | Trợ lý: cả kho trong quyền đọc người hỏi | 01-REQUIREMENTS-MATRIX.md:98 | 020 | ĐẠT | kb-search.handler.ts:15; test kb.test.ts "Owner thấy internal, sales chỉ public" |
| REQ-E01 | Action Registry dùng chung, một đường thực thi | 01-REQUIREMENTS-MATRIX.md:103 | 003 | ĐẠT | packages/actions/src/define.ts:42; kernel/actions/executor.ts:73; test registry.test.ts, actions.test.ts, actions-unit.test.ts |
| REQ-E02 | Trợ lý làm mọi action với quyền người ra lệnh | 01-REQUIREMENTS-MATRIX.md:104 | 023b | MỘT PHẦN | ai/assistant/meta-tools.ts:86-96; test assistant.test.ts; thiếu action đọc search / get, khuôn lồng nhau |
| REQ-E03a | Đọc chạy ngay; ghi hiện thẻ Xác nhận / Huỷ | 01-REQUIREMENTS-MATRIX.md:105 | 023 | ĐẠT | ai/assistant/card.ts; test assistant.test.ts "ghi → thẻ confirm" |
| REQ-E03b | Thẻ có diff + nút Sửa | 01-REQUIREMENTS-MATRIX.md:105 | 023b | MỘT PHẦN | card.ts câu mặc định (DC-128); ChatThread.tsx không nút Sửa |
| REQ-E03c | Hàng loạt bắt buộc xác nhận số lượng | 01-REQUIREMENTS-MATRIX.md:105 | 003 | ĐẠT | policy.ts:24; test actions-unit.test.ts "bulk luôn preview" |
| REQ-E03d | Đề xuất tái dùng luồng trước | 01-REQUIREMENTS-MATRIX.md:105 | — | CHƯA | Không có code |
| REQ-E04a | Phân rã kế hoạch, giao agent, tổng hợp | 01-REQUIREMENTS-MATRIX.md:106 | 023 | ĐẠT | meta-tools.ts:124; delegate.ts; test assistant.test.ts "plan", "delegate" |
| REQ-E04b | Hiện kế hoạch + tiến độ; dừng / sửa kế hoạch | 01-REQUIREMENTS-MATRIX.md:106 | — | MỘT PHẦN | Dừng qua run.cancel; FE không render plan (features/assistant/types.ts:45); không sửa kế hoạch |
| REQ-E05a | Điều hướng, mở bản ghi, điền form, áp lọc qua command bus | 01-REQUIREMENTS-MATRIX.md:107 | 023 | ĐẠT | apps/web/src/shared/assistant/ui-command-bus.ts; features/*/ui-commands.ts; test ui-command-bus.test.ts, ui-commands.test.tsx |
| REQ-E05b | Làm nổi bật phần tử | 01-REQUIREMENTS-MATRIX.md:107 | 023c | CHƯA | Không handler highlight đăng ký |
| REQ-E05c | Thẻ deep-link tới kết quả | 01-REQUIREMENTS-MATRIX.md:107 | 023 | ĐẠT | card.ts; e2e http/assistant.spec.ts |
| REQ-E06a | Trợ lý theo module tự nạp ngữ cảnh | 01-REQUIREMENTS-MATRIX.md:108 | 023c | GIẢ | 7 drawer regex (QuoteAiDrawer.tsx:33-37…); chỉ gửi route (useAssistantChat.ts:57) |
| REQ-E06b | Gọi bằng Ctrl+K | 01-REQUIREMENTS-MATRIX.md:108 | 023 | ĐẠT | apps/web/src/shared/shell/AppShell.tsx:29; e2e shell.spec.ts:44 |
| REQ-E07 | Truy vấn / phân tích NL có nguồn | 01-REQUIREMENTS-MATRIX.md:109 | 038, 023c | CHƯA | meta-tools.ts:117 query_data NOT_IMPLEMENTED |
| REQ-E08 | Briefing đầu ngày | 01-REQUIREMENTS-MATRIX.md:110 | 035 | ĐẠT | ai/tasks/task-briefing.ts; test ai-tasks.test.ts:330 |
| REQ-E09a | Ghi mọi action Trợ lý / agent (ai, input, trước/sau) | 01-REQUIREMENTS-MATRIX.md:111 | 003, 024 | ĐẠT | packages/db/prisma/tenant/kernel.prisma:50-54; test assistant.test.ts, agents-ui.test.ts |
| REQ-E09b | Lọc theo loại | 01-REQUIREMENTS-MATRIX.md:111 | 024 | ĐẠT | ai/assistant/action-logs.read.ts:12; test agents-ui.test.ts |
| REQ-E09c | Hoàn tác trong hạn; đã gửi → ghi đính chính | 01-REQUIREMENTS-MATRIX.md:111 | — | MỘT PHẦN | Undo ĐẠT; không cơ chế đính chính |
| REQ-E10a | Danh sách phiên, tìm, mở lại | 01-REQUIREMENTS-MATRIX.md:112 | 023c | MỘT PHẦN | API /assistant/sessions có (assistant.controller.ts:70; assistant.test.ts); FE không gọi |
| REQ-E10b | Nhớ ngữ cảnh dài trong phiên | 01-REQUIREMENTS-MATRIX.md:112 | 023 | ĐẠT | ai/assistant/sessions.ts:10,63; test assistant.test.ts |
| REQ-E11a | Chat / Cowork | 01-REQUIREMENTS-MATRIX.md:113 | 023 | ĐẠT | meta-tools.ts:53; test assistant.test.ts "ghi ở Chat → FORBIDDEN" |
| REQ-E11b | Chọn agent + cấp độ AI | 01-REQUIREMENTS-MATRIX.md:113 | — | MỘT PHẦN | Mức AI ĐẠT; chọn agent chỉ lưu ui.agent (ComposerPopovers.tsx:92), sendTurn không gửi |
| REQ-E12a | Đính kèm tệp / ảnh / email vào lệnh | 01-REQUIREMENTS-MATRIX.md:114 | — | GIẢ | Mục file không upload; server chỉ nhận tên (assistant-prompt.ts:35) |
| REQ-E12b | Nhập lệnh bằng giọng nói | 01-REQUIREMENTS-MATRIX.md:114 | — | GIẢ | Nút mic không onClick (features/assistant/components/Composer.tsx:76) |
| REQ-E13a | Coworks ngay / lịch / sự kiện | 01-REQUIREMENTS-MATRIX.md:115 | 035 | ĐẠT | ai/tasks/task.handlers.ts:35,186; test ai-tasks.test.ts:143,199,228 |
| REQ-E13b | Giới hạn công cụ / dữ liệu / credit | 01-REQUIREMENTS-MATRIX.md:115 | 035 | ĐẠT | test ai-tasks.test.ts:246 |
| REQ-E13c | Hỏi trước khi xoá / gửi (bật tắt) | 01-REQUIREMENTS-MATRIX.md:115 | 035 | ĐẠT | policy.ts:14,21; test ai-tasks.test.ts:257,282 |
| REQ-E14a | Khung "Trợ lý AI đang điều phối" + Dừng / Duyệt & gửi | 01-REQUIREMENTS-MATRIX.md:116 | 023 | ĐẠT | RunsOrchestrationBar.tsx:35,108; test ai-runtime.test.ts AC5 |
| REQ-E14b | Tab Công cụ & Quyền chỉ hiển thị + link Builder | 01-REQUIREMENTS-MATRIX.md:116 | 035 | ĐẠT | TaskDrawer.tsx:132-144; test ai-tasks.test.ts:347 |
| REQ-E15 | Generative UI mức 2 | 01-REQUIREMENTS-MATRIX.md:117 | 023c | CHƯA | packages/shared/src/genui không tồn tại |

**Ghi chú / chưa rà hết:**

- Ghi chú:
- Mock / adapter giả do thiếu tài khoản → CHỜ-TK (Q-001 LLM, Q-002 embed, Q-003 Zalo, Q-004 Brevo); GIẢ chỉ khi code tự giả.
- REQ-A02d: prototype ver2.1 đổi sang mô tả tự do, chưa có mã quyết định bỏ taxonomy.
- REQ-A07b / REQ-D07d: FE gọi route không có ở API (routes.json missing).
- Dừng sớm theo lệnh điều phối (hết quota) — một số ô chưa kiểm sâu.
- CHƯA RÀ HẾT: REQ-D04 (nguồn Drive "Sắp có"), REQ-D09b (gợi ý tạo agent khi thiếu — D29), REQ-B11 (giờ trực / lời chào kiểm sâu), REQ-C12 (phím ↑↓)

## B. Yêu cầu REQ-F…N (01-REQUIREMENTS-MATRIX)

| ID | Nghĩa vụ | Nguồn | TIP nhận | Trạng thái | Bằng chứng |
|---|---|---|---|---|---|
| IO-CRM | Khách hàng/customfields: nhập và xuất XLSX/CSV, AI-first và thủ công | Chủ nhà yêu cầu nhập/xuất AI-first; DC244 | 038b | CHƯA | TIP038b ma trận/task2–4/AC01/04/05; mới là kế hoạch, chưa runtime/nghiệm thu model thật |
| IO-CATALOG | Sản phẩm/dịch vụ/biến thể: AI mapping, import032b và XLSX/CSV export | Chủ nhà yêu cầu nhập/xuất AI-first; DC244 | 038b | CHƯA | TIP038b ma trận/AC01/04/05; mới là kế hoạch, chưa runtime/nghiệm thu model thật |
| IO-QUOTE | Báo giá+items: nhập nháp, xuất bảng/filechứngtừ, cả AI và thủ công | Chủ nhà yêu cầu nhập/xuất AI-first; DC244 | 038b | CHƯA | TIP038b ma trận/AC02/04/05; mới là kế hoạch, chưa runtime/nghiệm thu model thật |
| IO-ORDER | Đơn+items: nhập nháp không trừ kho/ghi thu, xuất XLSX/CSV và chứng từ hỗ trợ | Chủ nhà yêu cầu nhập/xuất AI-first; DC244 | 038b | CHƯA | TIP038b ma trận/AC02/04/06; mới là kế hoạch, chưa runtime/nghiệm thu model thật |
| IO-CONTRACT | Hợp đồng metadata/PDF/DOCX nhập nháp, xuất bảng và file nguồn/đãký giữ nguyên | Chủ nhà yêu cầu nhập/xuất AI-first; DC244 | 038b | CHƯA | TIP038b ma trận/AC02/04/08; mới là kế hoạch, chưa runtime/nghiệm thu model thật |
| IO-INVOICE | Đề nghị thanh toán: nhập nháp theođơn/đợt, xuất bảng/PDF, không tựghi payment | Chủ nhà yêu cầu nhập/xuất AI-first; DC244 | 038b | CHƯA | TIP038b ma trận/AC02/04/06; mới là kế hoạch, chưa runtime/nghiệm thu model thật |
| IO-AI-FIRST | AI là luồng ưu tiên: hiểufile/yêucầu, mapping, sửa bằng hội thoại, live model thật | Chủ nhà yêu cầu nhập/xuất AI-first; DC244 | 038b | CHƯA | TIP038b task2–3/AC01–04/09–10; mới là kế hoạch, chưa runtime/nghiệm thu model thật |
| IO-MANUAL | Thủ công độc lập không LLM, dùng cùngvalidation/permission/backend vớiAI | Chủ nhà yêu cầu nhập/xuất AI-first; DC244 | 038b | CHƯA | TIP038b task4/AC05; mới là kế hoạch, chưa runtime/nghiệm thu model thật |
| IO-FILES | File tải thật, lỗi theo dòng, XLSX/CSVZIP/PDF/DOCX theo capability, authenticated download | Chủ nhà yêu cầu nhập/xuất AI-first; DC244 | 038b | CHƯA | TIP038b task3/5/AC03/08; mới là kế hoạch, chưa runtime/nghiệm thu model thật |
| IO-SAFETY | Không vượt quyền/fieldmask, không promptinjection/SQL, không importpaid/signed/ledger tùyý | Chủ nhà yêu cầu nhập/xuất AI-first; DC244 | 038b | CHƯA | TIP038b task1/2/5/AC06; mới là kế hoạch, chưa runtime/nghiệm thu model thật |
| IO-RETRY | Preview hash/version, confirm thật, retry/cancel/partial/reimport không duplicate | Chủ nhà yêu cầu nhập/xuất AI-first; DC244 | 038b | CHƯA | TIP038b task1/2/5/AC03/07; mới là kế hoạch, chưa runtime/nghiệm thu model thật |
| REQ-F01-a | Danh sách khách D42 (page+limit), lọc giai đoạn / thẻ / trường tuỳ biến, sắp xếp, tìm không dấu | 01-REQUIREMENTS-MATRIX.md:122 | 015, 026 | ĐẠT | packages/core/src/crm/repos/contacts.repo.ts:53 (f_unaccent LIKE); test apps/api/test/integration/crm-contacts.test.ts (AC8), crm-ui.test.ts (sort + EXPLAIN), apps/web/e2e/http/customers-ui.spec.ts |
| REQ-F01-b | Kanban khách theo giai đoạn (Lead mới → … → Đã mua, + Thất bại), kéo đổi giai đoạn | 01-REQUIREMENTS-MATRIX.md:122 | 015, 026 | ĐẠT | packages/core/src/crm/repos/contacts.repo.ts:83 boardIds; contact-write.handlers.ts:89 set_stage; test crm-ui.test.ts "kanban /contacts/board", apps/web/e2e/customers.spec.ts |
| REQ-F01-c | Cột "AI gợi ý" + nút "Giao AI" ở danh sách khách chạy thật (không phải toast) | 01-REQUIREMENTS-MATRIX.md:122 | 015b | GIẢ | apps/web/src/features/customers/screens/CustomersScreen.tsx:38 `aiDo = message.info`; packages/core/src/crm/services/contact-view.ts:89 ai luôn `kind:'wait'`; TIP-015b mục 5 |
| REQ-F01b-1 | 1 người phụ trách chính + đồng phụ trách / theo dõi; scope "Của tôi" gồm khách đồng phụ trách | 01-REQUIREMENTS-MATRIX.md:123 | 015, 026 | ĐẠT | packages/core/src/crm/actions/contact-owner.handlers.ts:20; test crm-contacts.test.ts AC3, apps/web/e2e/customers.spec.ts "D32: đồng phụ trách" |
| REQ-F01b-2 | Chống giành khách: trùng của người khác chỉ báo "Đã có người phụ trách" + "Xin chia sẻ" (duyệt / từ chối) | 01-REQUIREMENTS-MATRIX.md:123 | 015, 026 | ĐẠT | contact-owner.handlers.ts:125 request_access, :158 decide_access; test crm-contacts.test.ts AC2 + AC6, apps/web/e2e/customers.spec.ts "D32: tạo khách trùng" |
| REQ-F01b-3 | Chuyển phụ trách (Quản lý) kèm hội thoại / báo giá đang mở, ghi timeline | 01-REQUIREMENTS-MATRIX.md:123 | 015, 029 | ĐẠT | contact-owner.handlers.ts:81; packages/core/src/sales/jobs/sales.jobs.module.ts:30 quoteOwnerConsumer; test crm-contacts.test.ts AC5, inbox.test.ts AC10, quotes.test.ts "chuyển phụ trách khách kèm báo giá" |
| REQ-F01b-4 | Chuyển phụ trách kèm lịch hẹn (`move.appointments`) chuyển thật | 01-REQUIREMENTS-MATRIX.md:123 | — | CHƯA | contact-owner.handlers.ts:97 `appointments: 0` cứng; packages/core/src/booking không có consumer `contact.owner_changed` |
| REQ-F01b-5 | Tin mới tự gán cho người phụ trách của khách | 01-REQUIREMENTS-MATRIX.md:123 | 016 | ĐẠT | packages/core/src/inbox/services/pipeline.ts:108; test inbox.test.ts AC2 |
| REQ-F01b-6 | Người phụ trách vắng / ngoài ca → hội thoại về hàng chung hoặc agent | 01-REQUIREMENTS-MATRIX.md:123 | — | CHƯA | DECISIONS.md:90 DC-081 hoãn "chưa có dữ liệu ca"; pipeline.ts:108 không kiểm ca / vắng |
| REQ-F01b-7 | Doanh số ghi theo `owner_user_id` lúc tạo chứng từ | 01-REQUIREMENTS-MATRIX.md:123 | 029, 030, 031 | ĐẠT | packages/core/src/sales/quotes/services/quote-write.ts:106, contracts/services/contract-write.ts:37, order-create.handlers.ts:47; test quotes.test.ts "create: … phụ trách = người tạo", contracts.test.ts "create: … phụ trách = người tạo" |
| REQ-F01c | Chia lead tự động: thủ công / vòng tròn / theo kênh / theo tải | 01-REQUIREMENTS-MATRIX.md:124 | 042b | CHƯA | `assign_mode` chỉ lưu (accounts.service.ts:18); TIP042b AC1–8 đã viết, chưa code; opt-in/no-steal, không nhầm cấu hình với runtime |
| REQ-F02a | Hồ sơ 360°: thông tin, timeline đa kênh, ghi chú, trường tuỳ biến, bố cục theo vai trò | 01-REQUIREMENTS-MATRIX.md:125 | 015, 026 | ĐẠT | packages/core/src/crm/services/contact360.ts:14; timeline.service.ts; test crm-contacts.test.ts AC8, apps/web/e2e/http/customers.spec.ts |
| REQ-F02b | Hồ sơ 360°: tóm tắt AI thật | 01-REQUIREMENTS-MATRIX.md:125 | 015b | CHƯA | contact360.ts:43 chỉ đọc cột `aiSummary` (không ai ghi); ai.bars/signals/nba rỗng :59 |
| REQ-F02c | Hồ sơ 360°: đơn / báo giá / lịch hẹn / ticket / công nợ / thu gần nhất | 01-REQUIREMENTS-MATRIX.md:125 | 015b | CHƯA | contact360.ts:52–55 `kpis: []`, recent_order / recent_payment rỗng, `tasks: []`; apps/web/src/features/inbox/components/Blocks360.tsx:2 "khối module khác hiện chưa có dữ liệu" |
| REQ-F02d | Hồ sơ 360°: hạng loyalty + giá trị điểm đúng 1 điểm = 100đ | 01-REQUIREMENTS-MATRIX.md:125 | 036 | MỘT PHẦN | contact360.ts:40 `pointsBalance * 10n` (sai, COMMERCE §7 = 100đ); `points_balance` không được cộng ở completeOrder |
| REQ-F03a | Kiểm trùng (SĐT / email / MST / ID kênh) + gộp hồ sơ có preview + hoàn tác | 01-REQUIREMENTS-MATRIX.md:126 | 015, 026 | ĐẠT | packages/core/src/crm/services/duplicates.service.ts:23; contact-merge.handler.ts:40; identity.service.ts; test crm-contacts.test.ts AC7, crm-settings.test.ts AC10 |
| REQ-F03b | Nhập khách từ CSV / XLSX (ghép cột, preview, trùng) + xuất (CSV BOM — DC-063) theo bộ lọc | 01-REQUIREMENTS-MATRIX.md:126 | 015, 026 | ĐẠT | packages/core/src/crm/actions/contact-io.handlers.ts:20, :57; apps/api/src/http/crm/contacts.controller.ts:79 import-table; test crm-settings.test.ts AC11, crm-ui.test.ts "nhập" + "contact.export theo đủ bộ lọc" |
| REQ-F04 | Trường tuỳ biến cho 6 thực thể (khách, SP, báo giá, đơn, ticket, lịch hẹn), lưu `custom jsonb`, validate theo định nghĩa | 01-REQUIREMENTS-MATRIX.md:127 | 015, 026–034 | ĐẠT | packages/shared/src/custom-fields/values.ts:10; validateCustomValues ở quote-write.ts:114, order-write.ts:80, ticket-create.handler.ts:53, appointment-book.handlers.ts:97, catalog-write.ts:78; test crm-settings.test.ts AC9a, apps/web/e2e/custom-fields.spec.ts |
| REQ-F05a | Sản phẩm 6 loại, giá chưa VAT, giá vốn, ĐVT, thuế theo dòng, danh mục, biến thể, combo | 01-REQUIREMENTS-MATRIX.md:128 | 027 | ĐẠT | packages/db/prisma/tenant/catalog.prisma:5 (6 loại), :54–56; packages/core/src/catalog/actions/product.handlers.ts:24; test catalog.test.ts "tạo 6 loại", apps/web/e2e/http/products.spec.ts |
| REQ-F05b | Ảnh sản phẩm | 01-REQUIREMENTS-MATRIX.md:128 | — | CHƯA | catalog.prisma model Product không có cột ảnh; DECISIONS.md:168 DC-159 "Tệp theo sản phẩm (ảnh…) khi có yêu cầu" — không có mã loại khỏi phạm vi |
| REQ-F05c | Danh mục sửa / xoá, nhập sản phẩm, action `product_variant.*` riêng | 01-REQUIREMENTS-MATRIX.md:128 | 032b | CHƯA | registry chỉ có `category.create` (actions.json); TIP-032b mục 7 |
| REQ-F05d | Tồn kho trừ khi đơn xác nhận, hoàn khi huỷ, cho âm kèm cảnh báo | 01-REQUIREMENTS-MATRIX.md:128 | 027, 031 | ĐẠT | packages/core/src/sales/orders/services/order-write.ts:131, :142; order-flow.handlers.ts:63 `low_stock`; test orders.test.ts "confirm: trừ kho", "cancel: … hoàn kho", catalog.test.ts "stock.adjust: cho âm" |
| REQ-F05e | Agent dùng catalog làm nguồn tư vấn / báo giá (product.search / get, RAG mô tả không giá) | 01-REQUIREMENTS-MATRIX.md:128 | 027 | ĐẠT | packages/core/src/catalog/actions/read.handlers.ts:30; catalog/events/catalog-sync.ts; test catalog.test.ts "product.search …", "catalog-sync" |
| REQ-F06-a | Báo giá: CK dòng + CK tổng, thuế sau CK; hiệu lực 15 ngày từ lúc gửi; versioning n+1 | 01-REQUIREMENTS-MATRIX.md:129 | 029 | ĐẠT | packages/shared/src/commerce/quote-math.ts; quote-send.handlers.ts:36; quote-decide.handlers.ts:82; test quote-math.test.ts, quotes.test.ts "gửi qua Zalo … valid_until", "xin sửa → lần 2" |
| REQ-F06-b | Duyệt khi > 20 triệu hoặc giảm > 5% | 01-REQUIREMENTS-MATRIX.md:129 | 029 | ĐẠT | quote-math.ts:23–24, :63 approvalReasons; test quotes.test.ts "tổng > 20tr → gửi bị chặn QUOTE_NEEDS_APPROVAL" |
| REQ-F06-c | Ngưỡng duyệt cấu hình được theo workspace + trần CK agent từ AI Governance | 01-REQUIREMENTS-MATRIX.md:129 | 032b | CHƯA | quote-math.ts:23 hằng số; TIP-032b mục 1 |
| REQ-F06-d | Gửi PDF báo giá qua kênh (Zalo / email) + link xem công khai | 01-REQUIREMENTS-MATRIX.md:129 | 029 | ĐẠT | quote-send.handlers.ts:36; apps/api/src/http/sales/public-quotes.controller.ts; test quotes.test.ts "gửi qua Zalo", "gửi email", "link xem", apps/web/e2e/http/quotes.spec.ts |
| REQ-F06-e | Gửi báo giá qua webchat | 01-REQUIREMENTS-MATRIX.md:129 | 032b | CHƯA | enum `channel` của quote.send chỉ zalo_personal / email; TIP-032b mục 4 |
| REQ-F06-f | Khách phản hồi trong chat → AI tự cập nhật trạng thái báo giá (chốt / từ chối) | 01-REQUIREMENTS-MATRIX.md:129 | 022b | MỘT PHẦN | quote.mark_accepted / mark_rejected agentGrantable (packages/actions/src/quotes.ts:153,167) nhưng không có trong tool mặc định agent sales (packages/core/src/ai/agents/templates.seed.ts:9), không luật / test / ca eval nào Planned022b: explicit behavior, scoped action/receipt, UI/native/real-model acceptance; no runtime promotion. |
| REQ-F06-g | Báo giá chấp nhận → nút "→ Đơn hàng" / "→ Hợp đồng" | 01-REQUIREMENTS-MATRIX.md:129 | 029, 031 | ĐẠT | apps/web/src/features/orders/screens/OrdersScreen.tsx:34; order-create.handlers.ts:123; test orders.test.ts "báo giá chưa chốt 409; đã chốt → đơn" |
| REQ-F06-h | Một báo giá chỉ sinh tối đa một HĐ hoặc một đơn | 01-REQUIREMENTS-MATRIX.md:129 | 032b | CHƯA | mỗi phía chỉ chặn trùng loại mình; TIP-032b mục 2 |
| REQ-F06-i | "Xuất Excel" danh sách Báo giá chạy thật | 01-REQUIREMENTS-MATRIX.md:129 | 038 | GIẢ | apps/web/src/features/quotes/components/QuotesToolbar.tsx:82 `message.info(t('exporting'))`; Q-024 |
| REQ-F06b-1 | Mẫu chứng từ của DN: rich + tải DOCX, AI nhận diện biến, người xác nhận; 4 loại mẫu | 01-REQUIREMENTS-MATRIX.md:130 | 028 | ĐẠT | packages/core/src/documents/actions/doc-template.handlers.ts:26, :138; test documents.test.ts, apps/web/e2e/http/documents.spec.ts |
| REQ-F06b-2 | Bảng kiểm Điều 398 BLDS cho hợp đồng (cảnh báo, không chặn) | 01-REQUIREMENTS-MATRIX.md:130 | 028 | ĐẠT | packages/shared/src/documents/variables.ts:41; test variables.test.ts "bảng kiểm: hợp đồng theo Điều 398" |
| REQ-F06b-3 | AI soạn báo giá từ nội dung: giá từ catalog, dòng ngoài danh mục đánh dấu + buộc duyệt | 01-REQUIREMENTS-MATRIX.md:130 | 029 | ĐẠT | packages/core/src/sales/quotes/services/quote-draft.ts:17; quote-draft.handler.ts:21; test quotes.test.ts "AI soạn từ nội dung", sales-unit.test.ts |
| REQ-F06b-4 | AI soạn hợp đồng nháp từ nội dung (đoạn AI đề xuất tô nổi) | 01-REQUIREMENTS-MATRIX.md:130 | 030b | CHƯA | `contract.draft_from_content` không có trong registry (FORMAT.md danh sách thiếu); TIP-030b mục 5 |
| REQ-F07-a | Đơn: tạo trực tiếp / từ báo giá / từ lịch hẹn hoàn tất / từ hợp đồng đã ký | 01-REQUIREMENTS-MATRIX.md:131 | 031, 033 | ĐẠT | order-create.handlers.ts:101, :123, :166; order-from-appointment.handler.ts:18; test orders.test.ts, booking.test.ts "vòng đời ngoài gói … order.create_from_appointment" |
| REQ-F07-b | Hai trục trạng thái tiến độ + thanh toán (Chờ cọc chỉ đơn cần cọc) | 01-REQUIREMENTS-MATRIX.md:131 | 031 | ĐẠT | packages/shared/src/orders/order-state.ts; test order-state.test.ts, orders.test.ts "create: … cọc → Chờ cọc" |
| REQ-F07-c | Huỷ đơn đã thu → sinh yêu cầu hoàn tiền có duyệt | 01-REQUIREMENTS-MATRIX.md:131 | 031, 032 | ĐẠT | packages/core/src/sales/orders/actions/order-flow.handlers.ts:47 cancelOrder → refundCancelled; test orders.test.ts "cancel", payments.test.ts "huỷ đơn đã thu → yêu cầu hoàn toàn bộ" |
| REQ-F07-d | Vận chuyển nhập tay | 01-REQUIREMENTS-MATRIX.md:131 | 031 | ĐẠT | order-edit.handlers.ts:161 update_shipping; test orders.test.ts "vận chuyển + hoàn tác" |
| REQ-F07-e | "Xuất Excel" danh sách Đơn hàng chạy thật | 01-REQUIREMENTS-MATRIX.md:131 | 038 | GIẢ | apps/web/src/features/orders/components/OrdersToolbar.tsx:96 `message.info(t('exporting'))`; Q-024 |
| REQ-F07b-1 | Khung `OrderSyncProvider` + mock, ánh xạ trạng thái sàn về 2 trục, nhập một lần, khách theo buyer id | 01-REQUIREMENTS-MATRIX.md:132 | 031 | ĐẠT | packages/integrations/src/ports/order-sync.ts:43; packages/core/src/sales/orders/services/order-import.ts:93; test packages/integrations/test/order-sync.test.ts, orders.test.ts "sync_now", "webhook" |
| REQ-F07b-2 | Đơn sàn khoá dòng / giá, thanh toán qua sàn không sinh đề nghị, tích điểm mặc định tắt | 01-REQUIREMENTS-MATRIX.md:132 | 031, 032 | ĐẠT | order-flow.handlers.ts:27 earns(); invoice-write.handlers.ts:55; test orders.test.ts "đơn sàn: sửa dòng / cọc 409 … không tích điểm", payments.test.ts "đơn sàn … không tạo đề nghị" |
| REQ-F07b-3 | Bên giữ tồn chuẩn chọn theo kết nối (`stock_master` appchat / external) | 01-REQUIREMENTS-MATRIX.md:132 | — | CHƯA | chỉ có chú thích order-write.ts:4; manifest mock (packages/integrations/src/connectors/mock/order-sync.ts:16) không có trường stock_master; không đọc ở đâu |
| REQ-F07b-4 | Adapter thật Sapo / Shopee / TikTok Shop / Lazada / Haravan / KiotViet / WooCommerce | 01-REQUIREMENTS-MATRIX.md:132 | — | NGOÀI | Ma trận ghi "adapter thật: P2"; 02-TASK-GRAPH.md:181 "adapter thật P2 (ngoài 46 TIP)" |
| REQ-F08a | Đề nghị thanh toán cọc / đợt / toàn bộ, hạn 7 ngày, phiếu thu PDF, không thay hoá đơn GTGT | 01-REQUIREMENTS-MATRIX.md:133 | 032 | ĐẠT | packages/db/prisma/tenant/sales-payments.prisma:7–9; invoice-write.handlers.ts:44; apps/api/src/http/sales/invoices.controller.ts (receipts pdf); test payments.test.ts "create: TT-… hạn +7 ngày", "record_payment … phiếu thu PT-", documents.test.ts |
| REQ-F08b | Nhắc công nợ T-1 / T+1 / T+7 mỗi mốc một lần | 01-REQUIREMENTS-MATRIX.md:133 | 032 | ĐẠT | packages/core/src/sales/payments/services/payment-system.ts:41 remindDue; test payments.test.ts "quá hạn → overdue; nhắc T+1 một lần" |
| REQ-F08c | Xác nhận thu tay + hoàn tiền luôn qua duyệt | 01-REQUIREMENTS-MATRIX.md:133 | 032 | ĐẠT | invoice-pay.handlers.ts:26; refund.handlers.ts:29, :90; test payments.test.ts "record_payment", "yêu cầu theo liệu trình … chờ duyệt" |
| REQ-F08d | VietQR: ảnh QR thật trong PDF + `GET /invoices/:id/qr` + gửi ảnh QR riêng | 01-REQUIREMENTS-MATRIX.md:133 | 032b | MỘT PHẦN | packages/core/src/sales/payments/services/invoice-doc.ts:44 chỉ dòng chữ; route /invoices/:id/qr không có (routes.json); TIP-032b mục 3 |
| REQ-F08e | Đối soát tự động khi DN kết nối SePay / Casso (webhook, khớp mã, hàng "Cần đối soát") | 01-REQUIREMENTS-MATRIX.md:133 | 032 | ĐẠT | packages/core/src/sales/payments/services/bank-feed.ts:31 TenantBankHook; test payments.test.ts "webhook: chữ ký sai 401 … khớp mã", "resolve_bank_match" |
| REQ-F08f | Adapter bank feed thật cho DN: SePay gắn vào registry tenant, Casso có adapter | 01-REQUIREMENTS-MATRIX.md:133 | — | GIẢ | packages/integrations/src/registry.ts:16–17 sepay + casso đều `MockBankFeedProvider` dù `SepayBankFeed` đã có (connectors/sepay/adapter.ts:33, chỉ nền tảng dùng); casso chỉ manifest; 032 / 032b không nhận |
| REQ-F08g | Công nợ theo khách (tổng chưa thu / quá hạn) | 01-REQUIREMENTS-MATRIX.md:133 | 015b | CHƯA | contracts-read.service.ts:76 `debt: '0'`; contact360.ts:52 kpis rỗng; TIP-015b mục 4 |
| REQ-F08h | Hoá đơn điện tử GTGT | 01-REQUIREMENTS-MATRIX.md:133 | — | NGOÀI | Ma trận "hoá đơn điện tử P2"; REQ-M03b P2; D24 |
| REQ-G07a | Liệu trình sinh khi đơn có gói được xác nhận và thu đủ; trừ 1 buổi khi lịch hoàn tất; no-show không trừ (cấu hình) | 01-REQUIREMENTS-MATRIX.md:134 | 032, 033 | ĐẠT | packages/core/src/sales/payments/services/packages.ts:20; booking/actions/appointment-flow.handlers.ts:125 noShowDeducts; test booking.test.ts "liệu trình: … trừ 1 buổi", "không đến … không trừ buổi" |
| REQ-G07b | Liệu trình sinh khi đã cọc (nếu sản phẩm cho phép) | 01-REQUIREMENTS-MATRIX.md:134 | 032b | CHƯA | packages.ts:20 chỉ `payStatus === 'paid'`; TIP-032b mục 6 |
| REQ-G07c | Nhắc khi còn 1 buổi / còn 7 ngày hết hạn | 01-REQUIREMENTS-MATRIX.md:134 | 032b | CHƯA | payment-system.ts chỉ quét hết hạn; TIP-032b mục 6 |
| REQ-G07d | Hết hạn thì khoá, Owner gia hạn tay | 01-REQUIREMENTS-MATRIX.md:134 | 032 | ĐẠT | package.handlers.ts:45 package.extend; test payments.test.ts "liệu trình: gia hạn (gói hết hạn mở lại)" |
| REQ-G07e | Liệu trình hiển thị ở Hồ sơ 360° và agent đọc được | 01-REQUIREMENTS-MATRIX.md:134 | — | CHƯA | API `GET /contacts/:id/packages` có nhưng FE chỉ mock dùng (apps/web/src/shared/api/mock/domains/invoices-actions.ts:191), Blocks360 không có khối; không action đọc liệu trình (023b mục 6 không liệt kê) |
| REQ-F09a | Hợp đồng tạo trực tiếp hoặc từ báo giá đã chấp nhận; 3 loại Dịch vụ / Mua bán / Nguyên tắc | 01-REQUIREMENTS-MATRIX.md:135 | 030 | ĐẠT | packages/actions/src/contracts.ts:14; contract-write.handlers.ts:64, :83; test contracts.test.ts "create", "từ báo giá" |
| REQ-F09b | Nội dung hợp đồng từ mẫu theo loại hợp đồng | 01-REQUIREMENTS-MATRIX.md:135 | 030b | MỘT PHẦN | contracts/services/contract-doc.ts:45 lấy templateId hoặc mẫu mặc định chung, không theo `contract_kind`; TIP-030b mục 1 |
| REQ-F09c | Hợp đồng từ PDF / DOCX tải lên hoặc tệp khách gửi trong hội thoại | 01-REQUIREMENTS-MATRIX.md:135 | 030b | CHƯA | contract.create không nhận file; TIP-030b mục 2–3 |
| REQ-F09d | Owner duyệt + ký trước (OTP), rồi gửi khách ký điện tử: link + OTP + ký tay, lưu vết, trang chứng nhận, SHA-256 | 01-REQUIREMENTS-MATRIX.md:135 | 030 | ĐẠT | contract-approval.handlers.ts:99; contracts/services/public-sign.service.ts; contract-sign-pdf.ts; test contracts.test.ts "Duyệt & ký", "mở link → … SHA-256", contracts-unit.test.ts, apps/web/e2e/http/contracts.spec.ts |
| REQ-F09e | Đã ký thì khoá; thay đổi qua phụ lục | 01-REQUIREMENTS-MATRIX.md:135 | 030b | MỘT PHẦN | bảng contract_appendix có (contracts.prisma:98) nhưng không action `contract.create_appendix` (registry thiếu); FE tab Phụ lục / tải tệp là message.info (apps/web/src/features/contracts/components/DetailTabs.tsx:237); TIP-030b mục 4 |
| REQ-F09f | Sinh đơn từ hợp đồng; nhắc gia hạn T-30; tự hết hạn | 01-REQUIREMENTS-MATRIX.md:135 | 030, 031 | ĐẠT | order-create.handlers.ts:166; contract-system.ts; test orders.test.ts "hợp đồng … đã ký → nhiều đơn", contracts.test.ts "T-30 nhắc gia hạn một lần; qua ngày kết thúc → expired" |
| REQ-F09g | Ký số CA | 01-REQUIREMENTS-MATRIX.md:135 | — | NGOÀI | D25 (01-REQUIREMENTS-MATRIX.md:270) "ký số CA P2" |
| REQ-F09h | "Xuất Excel" danh sách Hợp đồng chạy thật | 01-REQUIREMENTS-MATRIX.md:135 | 038 | GIẢ | apps/web/src/features/contracts/components/ContractsToolbar.tsx:69 `message.info(t('exporting'))`; Q-024 |
| REQ-F10 | Giai đoạn khách tự theo chứng từ (gửi BG → Báo giá; HĐ → Hợp đồng; đơn hoàn tất → Đã mua; BG từ chối / hết hạn → Đang tư vấn), không hạ khách đã mua, kéo tay thắng | 01-REQUIREMENTS-MATRIX.md:136 | 029, 030, 031 | ĐẠT | packages/core/src/crm/services/stage-rules.ts:23 (MANUAL_HOLD 24h, không hạ won); gọi ở quote-send.handlers.ts:90, quote-decide.handlers.ts:26, contract-send.handlers.ts:76, order-flow.handlers.ts:43; test quotes.test.ts (:164, :227), contracts.test.ts (:205), orders.test.ts (:155) |
| REQ-F11 | Hồ sơ 360° — 6 nút mở form tại chỗ theo luật D46 (BG nháp → Cập nhật, đã gửi → phiên bản mới…), cùng kích thước | 01-REQUIREMENTS-MATRIX.md:137 | 015, 026 | ĐẠT | apps/web/src/features/inbox/components/Profile360Actions.tsx:39–47; test apps/web/e2e/inbox.spec.ts "6 nút mở form tại chỗ theo luật COMMERCE (REQ-F11)" |
| REQ-F12 | Bố cục Hồ sơ 360°: ⚙ Tuỳ chỉnh tab / khối (12 khối), ≥ 1 tab, mẫu gán 5 vai trò, 3 mẫu có sẵn | 01-REQUIREMENTS-MATRIX.md:138 | 015, 026 | ĐẠT | packages/core/src/crm/actions/profile-layout.handlers.ts:27–82; services/layouts.service.ts; test crm-settings.test.ts AC9b, apps/web/e2e/inbox.spec.ts "(REQ-F12)", e2e/http/customers-ui.spec.ts |
| REQ-G01 | Lịch ngày / tuần / tháng / danh sách; dịch vụ (thời lượng, giá, đệm); nhân sự; giờ mở cửa | 01-REQUIREMENTS-MATRIX.md:143 | 033 | ĐẠT | packages/core/src/booking/actions/booking-config.handlers.ts:50, :106; services/slots.ts; test booking.test.ts "dịch vụ + liệu trình … nhân sự + giờ mở cửa", apps/web/e2e/calendar.spec.ts "4 chế độ xem", e2e/http/calendar.spec.ts |
| REQ-G02 | Trạng thái lịch: Chờ xác nhận (giữ chỗ 2 giờ) → Xác nhận → Hoàn tất / Không đến (ân hạn 20′) / Dời / Huỷ (bắt buộc lý do) | 01-REQUIREMENTS-MATRIX.md:144 | 033 | ĐẠT | packages/shared/src/booking/appointment-state.ts:6, :24; appointment-flow.handlers.ts:115, :136; test appointment-state.test.ts, booking.test.ts "không đến chỉ sau ân hạn 20 phút", "hết giữ chỗ 2 giờ → expired" |
| REQ-G03a | Chống trùng lịch theo nhân sự (EXCLUDE ở DB) | 01-REQUIREMENTS-MATRIX.md:145 | 033 | ĐẠT | packages/db/prisma/tenant/migrations/20261101900000_033_booking/migration.sql:115; test booking.test.ts "ràng buộc DB: hai lịch chồng nhau … EXCLUDE" |
| REQ-G03b | Agent gợi ý slot trống gần nhất | 01-REQUIREMENTS-MATRIX.md:145 | 033 | ĐẠT | appointment-book.handlers.ts:43 find_slots (agentGrantable — packages/actions/src/booking.ts:29); test booking.test.ts "slot: giờ mở cửa ∩ ca riêng …" |
| REQ-G03c | Composer Hộp thư "Đặt lịch" lấy slot thật | 01-REQUIREMENTS-MATRIX.md:145 | 025b | GIẢ | apps/web/src/features/inbox/api.ts:99 gọi `/booking/slots` — routes.json `missing` (API chỉ có /calendar/slots); chỉ chạy với mock |
| REQ-G03d | Chống trùng theo phòng / thiết bị | 01-REQUIREMENTS-MATRIX.md:145 | — | NGOÀI | Ma trận ghi "theo phòng / thiết bị (P2)" |
| REQ-G04a | Nhắc hẹn trước 24 giờ và 2 giờ qua kênh khách đã dùng | 01-REQUIREMENTS-MATRIX.md:146 | 033 | ĐẠT | packages/core/src/booking/services/booking-system.ts:49 remindAppointments; test booking.test.ts "nhắc 24h rồi 2h qua Zalo, mỗi mốc một lần" |
| REQ-G04b | Khách trả lời "đổi" / "huỷ" → agent xử lý (dời / huỷ lịch) | 01-REQUIREMENTS-MATRIX.md:146 | 022b | MỘT PHẦN | appointment.reschedule/cancel agentGrantable (packages/actions/src/booking.ts:111,125), nhưng packages/core/src/ai/agents/templates.seed.ts:11 thiếu appointment.cancel trong booking defaults. Đây là thiếu code/config, không chỉ thiếu tài khoản. Cần TIP bổ sung, test quyền/tool defaults và ca model thật (Q-001); không tự mở rộng quyền agent đã cấu hình. Planned022b: explicit behavior, scoped action/receipt, UI/native/real-model acceptance; no runtime promotion. |
| REQ-G05 | Lịch hẹn bắt buộc gắn khách CRM (tạo khách theo SĐT nếu chưa có) | 01-REQUIREMENTS-MATRIX.md:147 | 033 | ĐẠT | appointment-book.handlers.ts:84; booking.prisma:77 contactId bắt buộc; test booking.test.ts "tạo: khách mới theo số điện thoại (CRM)" |
| REQ-G06 | Danh sách chờ, lịch lặp, dự báo no-show, đặt cọc lịch | 01-REQUIREMENTS-MATRIX.md:148 | — | NGOÀI | Ma trận Priority P2 |
| REQ-H01 | Ticket: Mở → Đang xử lý → Đang chờ (dừng SLA) → Đóng (lý do) → mở lại; ưu tiên; danh mục; người hoặc AI phụ trách | 01-REQUIREMENTS-MATRIX.md:153 | 034 | ĐẠT | packages/shared/src/support/ticket-state.ts; support/actions/ticket-flow.handlers.ts:45–116; test ticket-state.test.ts, support.test.ts "Đang chờ dừng TTR", "đóng …; mở lại", "giao người / agent" |
| REQ-H02a | Chống trùng ticket: cùng khách + danh mục trong 24 giờ → hỏi gộp | 01-REQUIREMENTS-MATRIX.md:154 | 034 | ĐẠT | packages/core/src/support/actions/ticket-create.handler.ts:62–68; test support.test.ts "chống trùng 24 giờ" |
| REQ-H02b | Agent tự tạo ticket khi phát hiện khiếu nại / sự cố | 01-REQUIREMENTS-MATRIX.md:154 | 022b | MỘT PHẦN | ticket.create có trong tool mặc định agent CSKH (templates.seed.ts:10) nhưng prompt agent chỉ handoff khi khiếu nại (packages/ai/src/prompts/index.ts:18, DC-123); không luật / test agent tạo ticket Planned022b: explicit behavior, scoped action/receipt, UI/native/real-model acceptance; no runtime promotion. |
| REQ-H03 | SLA mặc định không xoá (FRT ≤10′, TTR ≤4h giờ làm), đồng hồ 3 màu, leo thang nhắc Owner, chỉ áp việc mới | 01-REQUIREMENTS-MATRIX.md:155 | 034 | ĐẠT | packages/core/src/support/services/sla-clock.ts; support-system.ts:34–45; support/seeds.ts; test support.test.ts "tạo: … FRT 10′ / TTR 240′", "sla.update_default chỉ áp ticket mới", "quá hạn … leo thang", apps/web/e2e/settings-ops.spec.ts |
| REQ-H04a | Danh sách + Kanban 4 cột; KPI (mở / chờ / quá hạn / đóng); CSAT khi đóng | 01-REQUIREMENTS-MATRIX.md:156 | 034 | ĐẠT | packages/core/src/support/services/tickets-read.service.ts; support-system.ts:95 CSAT; test support.test.ts "/tickets D42 + … meta KPI", "đóng … CSAT", apps/web/e2e/tickets.spec.ts "kanban 4 cột", e2e/http/tickets.spec.ts |
| REQ-H04b | "Xuất Excel" danh sách Ticket chạy thật | 01-REQUIREMENTS-MATRIX.md:156 | 038 | GIẢ | apps/web/src/features/tickets/components/TicketsHeader.tsx:143 `message.info(t('exporting'))`; Q-024 |
| REQ-H05 | Nhiều chính sách SLA theo kênh / hạng; leo thang 4 cấp | 01-REQUIREMENTS-MATRIX.md:157 | — | NGOÀI | Ma trận Priority P3 |
| REQ-I01 | Phân khúc động từ CRM (thẻ / giai đoạn / hành vi / giá trị / lần mua cuối) | 01-REQUIREMENTS-MATRIX.md:162 | 037 | CHƯA | segment.preview handler null (actions.json); packages/core/src/marketing/marketing.module.ts stub; marketing.prisma stub |
| REQ-I02 | AI đề xuất chiến dịch 4 loại từ CDP, soạn nội dung có biến; luôn có "Tạo thủ công" | 01-REQUIREMENTS-MATRIX.md:163 | 037 | GIẢ | campaign.suggest / create handler null; FE `/campaign-suggestions`, `/campaigns*` chỉ mock (routes.json missing) |
| REQ-I03 | Gửi qua Zalo cá nhân (throttle, giới hạn ngày, delay ngẫu nhiên) + Email; loại người huỷ nhận / vừa nhận chiến dịch 48h | 01-REQUIREMENTS-MATRIX.md:164 | 037 | CHƯA | không có queue `campaign-send`; marketing.module.ts rỗng |
| REQ-I04 | Không chiến dịch nào tự gửi: Owner duyệt; đã duyệt chỉ tạm dừng / xoá; dự toán credit so với số dư | 01-REQUIREMENTS-MATRIX.md:165 | 037 | CHƯA | campaign.submit / approve / pause / delete handler null (actions.json) |
| REQ-I05 | Báo cáo chiến dịch gửi / nhận / phản hồi / chuyển đổi; phản hồi thành hội thoại Inbox | 01-REQUIREMENTS-MATRIX.md:166 | 037 | GIẢ | apps/web/src/features/marketing chỉ chạy mock (routes.json missing `/campaigns/:p`); CampaignDetail.tsx:103 xuất = message.info |
| REQ-I06 | A/B test, ZNS / SMS, Template Studio | 01-REQUIREMENTS-MATRIX.md:167 | — | NGOÀI | Ma trận Priority P2 |
| REQ-J01 | Hạng thành viên (0 / 5.000 / 15.000 / 40.000, cấu hình) + sổ cái điểm | 01-REQUIREMENTS-MATRIX.md:172 | 036 | CHƯA | packages/db/prisma/tenant/loyalty.prisma stub; loyalty.update_config handler null; FE `/loyalty/*` chỉ mock |
| REQ-J02 | Cộng điểm một lần khi `order.completed`: 10.000đ = 1 điểm trên net trước VAT × hệ số hạng; 1 điểm = 100đ | 01-REQUIREMENTS-MATRIX.md:173 | 036 | MỘT PHẦN | Tính đúng: packages/shared/src/orders/order-state.ts:63–66 pointsFor, order-flow.handlers.ts:37 lưu `pointsEarned` (test orders.test.ts "complete: điểm floor(net/10.000) × hạng Vàng 1,5"); thiếu: không ghi sổ điểm, không cộng `points_balance` |
| REQ-J03 | Điều chỉnh điểm tay (lý do, log, hoàn tác); đổi điểm ≤ 50% đơn; đảo điểm khi huỷ / hoàn; hạn 12 tháng; xét hạng quý | 01-REQUIREMENTS-MATRIX.md:174 | 036 | CHƯA | loyalty.adjust_points handler null; `payment.redeem_points` không có trong registry; không job hạn / xét hạng |
| REQ-J04 | Agent biết hạng + điểm khách để tư vấn ưu đãi; hiển thị ở Hồ sơ 360° | 01-REQUIREMENTS-MATRIX.md:175 | 036 | MỘT PHẦN | 360 hiện tier + points (contact360.ts:30,39) nhưng giá trị sai ×10; ngữ cảnh agent (packages/core/src/ai/reply/reply-context.ts:81–101) không có hạng / điểm; loyalty.get_member handler null |
| REQ-J05 | Rule builder KHI · NẾU · THÌ; cảnh báo rời bỏ | 01-REQUIREMENTS-MATRIX.md:176 | — | NGOÀI | Ma trận Priority P2 |
| REQ-K01a | Tổng quan "Việc cần tôi" (chờ duyệt, cần người, quá hạn), "AI đã làm gì hôm nay", Cần follow (≤5), số dư credit | 01-REQUIREMENTS-MATRIX.md:181 | 038 | GIẢ | `GET /dashboard` chỉ mock (routes.json missing, apps/web/src/features/dashboard/api.ts); packages/core/src/insights/insights.module.ts stub; follow_up.complete handler null |
| REQ-K01b | Checklist onboarding 5 bước lưu theo workspace | 01-REQUIREMENTS-MATRIX.md:181 | 011 | ĐẠT | packages/core/src/identity/actions/onboarding-toggle-step.handler.ts:12; test onboarding.test.ts AC7 |
| REQ-L01 | Credit: mỗi lần gọi LLM ghi token × đơn giá model → credit; ví theo workspace; lịch sử chi tiêu | 01-REQUIREMENTS-MATRIX.md:187 | 009, 019 | ĐẠT | packages/core/src/billing/services/credit-meter.ts; wallet.service.ts; `GET /billing/ledger`; test billing.test.ts AC4–AC5, ai-runtime.test.ts "AC4 2 bước LLM … trừ ví đúng đơn giá" |
| REQ-L02 | Bảng gói + hạn mức trong DB (seed theo prototype), chặn thêm kênh / agent / user khi vượt | 01-REQUIREMENTS-MATRIX.md:188 | 009 | ĐẠT | packages/core/src/billing/seed.ts; quota.service.ts; dùng ở channel-connect.handlers.ts:38, agent.handlers.ts:22, member-invite.handler.ts:31; test billing.test.ts AC2, AC8, settings.test.ts "vượt hạn mức gói … 402" |
| REQ-L03a | Hết credit → chặn AI (agent / Trợ lý), hội thoại `auto` chuyển về người có lý do; dữ liệu + hộp thư vẫn dùng | 01-REQUIREMENTS-MATRIX.md:189 | 009, 022 | ĐẠT | credit-meter.ts assertBalance; packages/core/src/ai/reply/reply.service.ts:144 handoff 'credit'; test ai-runtime.test.ts "AC4 ví 0 → CREDIT_EXHAUSTED trước khi gọi model", assistant.test.ts "hết credit"; (nhánh handoff credit của agent chưa có ca test riêng) |
| REQ-L03b | Cảnh báo 80%, popup nạp, nạp xong mở lại ngay (FE) | 01-REQUIREMENTS-MATRIX.md:189 | 039 | MỘT PHẦN | Backend: wallet.service.ts:196–200, billing.events.ts:31–39 (credits.low / exhausted / restored + ai_budget) — test billing.test.ts AC6; FE: không nơi nào bắt CREDIT_EXHAUSTED / credits.* để mở popup nạp (apps/web/src grep rỗng) |
| REQ-L04a | VietQR động theo mã đơn, hết hạn 15′; webhook đối soát idempotent; kích hoạt gói / cộng credit; chuyển khoản tay pending_review → admin xác nhận | 01-REQUIREMENTS-MATRIX.md:190 | 010 | ĐẠT | packages/core/src/billing/payments/bank-hook.service.ts, fulfil.ts:36, invoices.service.ts; test billing-payments.test.ts AC2–AC7, apps/web/e2e/http/billing.spec.ts |
| REQ-L04b | Webhook SePay thật cho thu phí nền tảng | 01-REQUIREMENTS-MATRIX.md:190 | 010 | CHỜ-TK | bank-hook.service.ts:24 dùng `SepayBankFeed` khi có env; test packages/integrations/test/sepay.test.ts; chưa có tài khoản SePay (Q-004) |
| REQ-L05a | Trang Gói & thanh toán: gói hiện tại, ngày hết hạn, credit còn, lịch sử hoá đơn | 01-REQUIREMENTS-MATRIX.md:191 | 009, 010, 039 | ĐẠT | apps/api/src/http/billing/billing.controller.ts (/billing/summary, /invoices); apps/web/src/features/settings/components/BillingSection.tsx:79; test billing.test.ts AC9, billing-payments.test.ts AC9, apps/web/e2e/settings-billing.spec.ts |
| REQ-L05b | Hoá đơn gói tải PDF | 01-REQUIREMENTS-MATRIX.md:191 | 039 | CHƯA | không route PDF billing invoice (routes.json); BillInvoiceTable.tsx không có tải PDF |
| REQ-L05c | Mua thêm kênh / user (addon) áp vào hạn mức | 01-REQUIREMENTS-MATRIX.md:191 | 039 | MỘT PHẦN | thu tiền addon được (invoices.service.ts:20) nhưng fulfil.ts:51 "addon … áp vào quota ở TIP-039" — chưa áp |
| REQ-L06 | Popup Nâng cấp: Cá nhân / Doanh nghiệp, 4 thẻ gói, bảng so sánh, mua bằng QR | 01-REQUIREMENTS-MATRIX.md:192 | 039 | ĐẠT | apps/web/src/features/settings/components/UpgradeModal.tsx:23 (GET /billing/plans thật), hooks/useBuy.ts:7 billing.create_invoice; test apps/web/e2e/settings-billing.spec.ts "Nâng cấp: … chọn gói → QR → kích hoạt", billing-payments.test.ts AC4 |
| REQ-L07a | Nhắc credit đã dùng 80% / 95% (không tự nạp) | 01-REQUIREMENTS-MATRIX.md:193 | 009 | ĐẠT | wallet.service.ts:196–200 warn80 / warn95; test billing.test.ts AC6, apps/web/e2e/settings-billing.spec.ts "Ví: … nhắc credit (không tự nạp)" |
| REQ-L07b | Credit gói không cộng dồn (reset mỗi kỳ), credit mua thêm không hết hạn | 01-REQUIREMENTS-MATRIX.md:193 | 009 | ĐẠT | wallet.service.ts:104 resetPlan (expire plan rồi grant), topup riêng; test billing.test.ts AC4 "trừ plan trước rồi topup", AC3 |
| REQ-L07c | Job cấp lại credit gói hằng tháng (`period:<ws>:<yyyy-mm>`) | 01-REQUIREMENTS-MATRIX.md:193 | 039 | CHƯA | chỉ trial / activate gọi resetPlan (subscriptions.service.ts:41,69,94); không job kỳ tháng |
| REQ-L07d | Hết hạn gói trả phí: popup gia hạn, dữ liệu giữ 30 ngày | 01-REQUIREMENTS-MATRIX.md:193 | 039 | CHƯA | subscriptions.service.ts chỉ expireTrials (:50); không quét hết hạn gói trả phí, không popup gia hạn |
| REQ-L07e | Nâng gói giữa kỳ tính chênh theo ngày | 01-REQUIREMENTS-MATRIX.md:193 | 039 | CHƯA | enum upgrade_proration có nhưngchưaluồngtạo; TIP039 task2/AC03 vàDC242 đãnêu rõupgrade, không dùng kếhoạch làmproof runtime |
| REQ-L08 | Trang quản trị nền tảng: tenant, gói, giá, đối soát chuyển khoản, đơn giá model | 01-REQUIREMENTS-MATRIX.md:194 | 040 | MỘT PHẦN | chỉ admin.invoice.confirm_transfer (packages/core/src/billing/actions/admin-confirm-transfer.handler.ts:15) + GET /admin/transfers (test billing-payments.test.ts AC6); không route nhóm (admin) ở apps/web/src/app; admin.plan / model_price / llm_provider / workspace.* thiếu |
| REQ-M01a | Settings shell: menu trái chia nhóm + tìm kiếm; trang Tổng quan, Thành viên, Kênh, Widget, Trường dữ liệu, Thẻ, Câu trả lời mẫu, AI Models, Governance, Ví / Gói, Hồ sơ | 01-REQUIREMENTS-MATRIX.md:199 | 013 + TIP domain | ĐẠT | apps/web/src/features/settings/registry.ts:28–74; SettingsShell.tsx:36; test settings.test.ts, ai-runtime.test.ts AC5, webchat.test.ts, crm-settings.test.ts, apps/web/e2e/http/settings.spec.ts, settings-data.spec.ts |
| REQ-M01b | Nhật ký AI (AI Audit log) + Nhật ký bảo mật đọc dữ liệu thật | 01-REQUIREMENTS-MATRIX.md:199 | 045b | GIẢ | apps/web/src/features/settings/api.ts:104,106 `/settings/audit`, `/settings/ai-audit` — routes.json missing (chỉ mock); không TIP nào nhận route đọc (045b mục 6 chỉ ghi audit) ; planning045b contracts annex now specifies task/AC, not runtime evidence |
| REQ-M01c | Tổng quan workspace: tải logo, vùng nguy hiểm (tạm khoá / xoá workspace) chạy thật | 01-REQUIREMENTS-MATRIX.md:199 | 041 | GIẢ | apps/web/src/features/settings/components/GeneralSection.tsx:128 logo = message.info, :149 vùng nguy hiểm = message.info "Đã gửi yêu cầu"; 041 (lưu trữ / xoá workspace) nhận phần nguy hiểm, logo không ai nhận |
| REQ-M02a | Giờ làm việc workspace + giờ trực AI của agent | 01-REQUIREMENTS-MATRIX.md:200 | 022b | MỘT PHẦN | Workspace human calendar exists, but agent.runtime.ts:43-53 custom always true and fixed office only; channel hours is prompt text. Previous DAT was too broad.022b owns typed schedule/migration/native boundaries. |
| REQ-M02b | Thông báo in-app + email theo tuỳ chọn, giờ không làm phiền | 01-REQUIREMENTS-MATRIX.md:200 | 006 | ĐẠT | packages/core/src/notify/services/notifier.ts, jobs/notify-mail.processor.ts; test notify.test.ts AC3, AC5, AC6, apps/web/e2e/settings-ops.spec.ts "Thông báo" |
| REQ-M03a | Trang Nền tảng kết nối: registry + port theo năng lực, thẻ "Sắp có" + "Đăng ký quan tâm", kết nối / ngắt, bí mật mã hoá | 01-REQUIREMENTS-MATRIX.md:201 | 012 | ĐẠT | packages/integrations/src/registry.ts, coming-soon.ts; packages/core/src/integrations/actions/*; test integrations.test.ts AC1–AC10, packages/integrations/test/registry.test.ts, apps/web/e2e/http/integrations.spec.ts |
| REQ-M03b | Connector phát hành chạy thật: SePay, Casso (đối soát), SMTP, storage | 01-REQUIREMENTS-MATRIX.md:201 | — | MỘT PHẦN | SMTP thật (packages/integrations/src/connectors/smtp/mail.ts, test smtp.test.ts); storage LocalStorage (DV-003); SePay / Casso của DN là mock (registry.ts:16–17 — xem REQ-F08f) |
| REQ-M03c | Adapter thật hoá đơn điện tử / ký số CA / kế toán / TMĐT / Google Sheets / webhook HMAC / API key | 01-REQUIREMENTS-MATRIX.md:202 | — | NGOÀI | REQ-M03b Priority P2 |
| REQ-M04 | Phòng ban, sơ đồ tổ chức, KPI, phân ca | 01-REQUIREMENTS-MATRIX.md:203 | — | NGOÀI | Ma trận Priority P3 |
| REQ-M05 | Cài đặt → Hồ sơ 360°: danh sách mẫu, gán vai trò, sửa / nhân bản / xoá, tạo mẫu, "Xem như vai trò" | 01-REQUIREMENTS-MATRIX.md:204 | 015, 026 | ĐẠT | apps/web/src/features/settings/components/Profile360Section.tsx:102; profile-layout.handlers.ts; test crm-settings.test.ts AC9b, apps/web/e2e/http/customers.spec.ts "→ bố cục Hồ sơ 360°" |
| REQ-N01a | Không Docker; monorepo pnpm Next.js + NestJS api / worker; PG16 + Redis native | 01-REQUIREMENTS-MATRIX.md:209 | 001 | QUY-TẮC | Không có Dockerfile trong repo (`find . -name 'Dockerfile*'` rỗng); apps/{api,worker,web}; kiểm `pnpm depcheck` + ci.yml |
| REQ-N01b | Chạy production bằng PM2 / systemd | 01-REQUIREMENTS-MATRIX.md:209 | 045 | CHƯA | thư mục `infra/` chưa tồn tại |
| REQ-N02a | 2 Prisma schema (platform + tenant) + migration runner cho mọi DB tenant | 01-REQUIREMENTS-MATRIX.md:210 | 002 | ĐẠT | packages/db/prisma/{platform,tenant}; tenant-migrate; test packages/db/test/integration/tenant-migrate.test.ts, tenant-isolation.test.ts |
| REQ-N02b | Partial / expression index / INCLUDE bằng SQL thô trong migration; query theo quy tắc index | 01-REQUIREMENTS-MATRIX.md:210 | mọi TIP | QUY-TẮC | migration *.sql viết tay (vd 20261101900000_033_booking/migration.sql); kiểm bằng ca EXPLAIN trong crm-contacts / catalog / quotes / orders / support / booking .test.ts |
| REQ-N02c | PgBouncer | 01-REQUIREMENTS-MATRIX.md:210 | 045 | CHƯA | chưa có `infra/` |
| REQ-N03a | REST `/v1`, cursor pagination, `Idempotency-Key`, lỗi chuẩn hoá envelope | 01-REQUIREMENTS-MATRIX.md:211 | 003 | ĐẠT | apps/api/src/http/kernel/actions.controller.ts:37; apps/api/src/http/inbox/conversations.controller.ts:38 cursor; test actions.test.ts AC1–AC5, notify.test.ts AC2 (cursor) |
| REQ-N03b | OpenAPI tự sinh (Blueprint `/v1/docs`) | 01-REQUIREMENTS-MATRIX.md:211 | — | CHƯA | không có openapi / swagger trong apps/api (chỉ `GET /v1/actions` trả input_schema — actions.controller.ts:41); không TIP nào nhận |
| REQ-N04 | Realtime Socket.IO, room theo workspace / hội thoại, presence + typing | 01-REQUIREMENTS-MATRIX.md:212 | 006 | ĐẠT | apps/api/src/http/notify/realtime/ws.gateway.ts:85, :93; test realtime.test.ts AC7–AC9 |
| REQ-N05 | BullMQ + outbox; domain events nội bộ; consumer idempotent | 01-REQUIREMENTS-MATRIX.md:213 | 003, 006 | ĐẠT | packages/core/src/kernel/outbox/outbox.ts; test relay-sequence.test.ts, notify.test.ts AC4 (event_consumption chạy một lần), actions.test.ts AC6 |
| REQ-N06a | JWT ngắn hạn + refresh xoay vòng | 01-REQUIREMENTS-MATRIX.md:214 | 004 | ĐẠT | packages/core/src/identity/services/access-tokens.ts:5 (15 phút); test auth.test.ts AC6 "refresh xoay vòng" |
| REQ-N06b | Mã hoá credential kênh / connector AES-256 | 01-REQUIREMENTS-MATRIX.md:214 | 002, 012 | ĐẠT | packages/core/src/kernel/crypto.ts:21 aes-256-gcm; test packages/core/test/crypto.test.ts, integrations.test.ts AC3 |
| REQ-N06c | Rate limit chung + CORS + SSRF + kiểm file tải lên (OWASP) | 01-REQUIREMENTS-MATRIX.md:214 | 045b | MỘT PHẦN | chỉ throttle OTP / auth (apps/api/src/http/identity/auth.controller.ts:55; test auth.test.ts AC4); phần còn lại TIP-045b mục 2–5 |
| REQ-N06d | TLS ở production | 01-REQUIREMENTS-MATRIX.md:214 | 045 | CHƯA | chưa có `infra/` (nginx) |
| REQ-N07 | Hiệu năng: tin p95 < 1s, API đọc p95 < 300ms, uptime 99.9% — đo + giám sát | 01-REQUIREMENTS-MATRIX.md:215 | 045b, 046 | CHƯA | chưa có `/metrics` (TIP-045b mục 1), chưa đo p95 (TIP-046) |
| REQ-N08a | Backup Postgres (PITR / dump hằng ngày), RPO ≤ 5′, RTO ≤ 1h, diễn tập restore | 01-REQUIREMENTS-MATRIX.md:216 | 045, 046 | CHƯA | chưa có `infra/` (pgBackRest) |
| REQ-N08b | Quyền bị lãng quên: ẩn danh hoá khách (`contact.forget`, quyền `privacy.erase`) | 01-REQUIREMENTS-MATRIX.md:216 | — | CHƯA | packages/shared/src/authz/permissions.ts:5 có privacy.erase nhưng chưa action; DC-235 giữ contact.forget cho ẩn danh, 015b dùng contact.memory_forget cho fact. Vẫn cần TIP privacy riêng, không được coi TIP-043 học KB đã nhận |
| REQ-N09a | Log JSON có `traceId` | 01-REQUIREMENTS-MATRIX.md:217 | 001 | ĐẠT | packages/core/src/kernel (pino + traceId); test packages/core/test/logger.test.ts, kernel.test.ts "acceptTraceId" |
| REQ-N09b | App metrics `/metrics` (API, queue, kênh, AI, credit) | 01-REQUIREMENTS-MATRIX.md:217 | 045b | CHƯA | không có prom-client / route /metrics; TIP-045b mục 1 |
| REQ-N09c | Prometheus + Alertmanager + Grafana + Loki + Alloy, exporters, dashboard + cảnh báo trong repo | 01-REQUIREMENTS-MATRIX.md:217 | 045 | CHƯA | chưa có `infra/` |
| REQ-N10a | i18n next-intl + ICU, phát hành vi + en, registry 11 ngôn ngữ | 01-REQUIREMENTS-MATRIX.md:218 | FE (D38) | ĐẠT | apps/web/messages/{vi,en}; packages/shared/src/i18n/locales.ts; test locales.test.ts, `pnpm i18n:check` (ci.yml:35) |
| REQ-N10b | Ant Design v6, một codebase desktop 1440 + mobile web responsive | 01-REQUIREMENTS-MATRIX.md:218 | FE (D38) | ĐẠT | apps/web/package.json antd 6.6.8; test apps/web/e2e/mobile-sweep.spec.ts, các ca "390: …" trong e2e/*.spec.ts |
| REQ-N10c | Đủ 5 trạng thái UI (loading / empty / error / ready / no-permission) | 01-REQUIREMENTS-MATRIX.md:218 | FE (D38) | QUY-TẮC | apps/web/src/shared/states/PageStates.tsx; standards/ui/interaction-patterns.md:51; kiểm qua e2e + parity |
| REQ-N10d | WCAG AA (tương phản, aria, bàn phím) có kiểm tự động | 01-REQUIREMENTS-MATRIX.md:218 | — | CHƯA | không có axe / jsx-a11y trong repo; TIP-046 không nêu WCAG |
| REQ-N11a | Unit + integration + e2e Playwright luồng chính + test cô lập tenant | 01-REQUIREMENTS-MATRIX.md:220 | mọi TIP | ĐẠT | apps/api/test/integration/*.test.ts; apps/web/e2e/*.spec.ts + e2e/http; packages/db/test/integration/tenant-isolation.test.ts "(d) 2 workspace ghi song song" |
| REQ-N11b | AI eval set Trợ lý (đúng action / tham số / quyền / mức xác nhận) + agent trực kênh, replay + live | 01-REQUIREMENTS-MATRIX.md:220 | 044, 023b | CHƯA | `packages/ai/eval` chưa tồn tại; chỉ unit find_actions (packages/core/test/assistant-unit.test.ts) |
| REQ-N12 | File BE ≤ 600, FE ≤ 400 dòng; test file riêng; commit kèm SHA | 01-REQUIREMENTS-MATRIX.md:221 | mọi TIP | QUY-TẮC | `pnpm lint:size` (tools/scripts/lint-size.mjs:18–19) chạy ở .github/workflows/ci.yml:36 |
| REQ-N13 | DoD Action-first: mọi tính năng đăng ký action (schema, quyền, rủi ro, hoàn tác) + có test gọi qua Trợ lý AI | 01-REQUIREMENTS-MATRIX.md:222 | 023b | MỘT PHẦN | Registry + boot check: packages/core/test/actions-unit.test.ts:75; test qua Trợ lý chỉ vài action (assistant.test.ts); 14 action chưa handler; test phủ mọi action = TIP-023b mục R1 |
| REQ-N14 | Parity UI < 5% mỗi màn / trạng thái chính ở 1440×900 | 01-REQUIREMENTS-MATRIX.md:219 | FE (D38), 046 | QUY-TẮC | tools/parity/parity.manifest.ts; `pnpm parity --all` ở .github/workflows/full.yml:121; parity.yml |
| REQ-N15 | Nút "Trợ lý AI" một kiểu toàn app (`AiButton` ở packages/ui), tooltip tên module | 01-REQUIREMENTS-MATRIX.md:223 | FE ver2.1 (D45) | ĐẠT | packages/ui/src/primitives/AiButton.tsx; dùng ở 12 màn (apps/web/src/features/*/…Screen / Header); test tools/parity/parity.manifest.ts:149 (`.aibtn` "Trợ lý AI"), apps/web/e2e/agents.spec.ts |

**Ghi chú / chưa rà hết:**

- Ghi chú:
- Đã đọc code thật; "DONE" trong report không được dùng làm bằng chứng. Bằng chứng E2E mock (apps/web/e2e/*.spec.ts không thuộc thư mục http/) chỉ chứng minh FE.
- REQ-F08f / REQ-M03b: adapter `SepayBankFeed` đã viết nhưng registry tenant vẫn gắn `MockBankFeedProvider` → GIẢ do code, không phải chỉ thiếu tài khoản.
- REQ-G03c, REQ-M01b: FE gọi route không có ở API (routes.json `missing`) — chỉ chạy được ở chế độ mock.
- Nút "AI đang làm" (message.info `aiDoing`) ở cột Báo giá / Đơn / HĐ / Ticket / Marketing / Lịch / Sản phẩm cũng giả; chỉ dòng "Giao AI" của Khách hàng (REQ-F01c) thuộc REQ trong phạm vi file này.
- Ẩn danh hoá (REQ-N08b) và OpenAPI (REQ-N03b) có trong Blueprint nhưng không TIP nào trong 02-TASK-GRAPH.md nhận.

## C. Quyết định D01–D59, DC-xxx + luật COMMERCE-DECISIONS

| ID | Nghĩa vụ | Nguồn | TIP nhận | Trạng thái | Bằng chứng |
|---|---|---|---|---|---|
| COM-2-1 | 6 loại sản phẩm: vật lý · dịch vụ · combo · liệu trình · số · cho thuê | plans/COMMERCE-DECISIONS.md:35 | 027 | ĐẠT | packages/shared/src/api/catalog.ts:5 PRODUCT_TYPES; packages/db/prisma/tenant/catalog.prisma:5 · test apps/api/test/integration/catalog.test.ts "tạo 6 loại" |
| COM-2-2 | Giá nhập chưa VAT; thuế 0/5/8/10% theo sản phẩm, tính theo từng dòng | plans/COMMERCE-DECISIONS.md:36 | 027 | ĐẠT | packages/actions/src/catalog.ts:17; packages/shared/src/commerce/quote-math.ts:35-60 · test quote-math.test.ts "thuế suất theo từng dòng" |
| COM-2-3 | Biến thể `product_variant` có SKU / giá / tồn riêng, action `product_variant.*` | plans/COMMERCE-DECISIONS.md:37 | 032b | MỘT PHẦN | Bảng có (catalog.prisma:88), biến thể đi trong `product.update`; registry thiếu `product_variant.{create,update,archive}`, `product.import`, `category.{update,delete}` |
| COM-2-4 | Bảng giá theo hạng / kênh; luồng thuê / trả | plans/COMMERCE-DECISIONS.md:38 | — | NGOÀI | P2 theo COMMERCE §2 |
| COM-2-5 | Đơn confirmed → `stock_movement(sale, -n)`; combo trừ theo thành phần | plans/COMMERCE-DECISIONS.md:40 | 031 | ĐẠT | packages/core/src/sales/orders/services/order-write.ts:131 · test orders.test.ts "confirm: trừ kho theo dòng (combo theo thành phần)" |
| COM-2-6 | Huỷ đơn → `kind=return`; chỉnh tay → `kind=adjust` kèm lý do | plans/COMMERCE-DECISIONS.md:41 | 027, 031 | ĐẠT | order-write.ts:144; catalog/actions/stock.handlers.ts:38 · test orders.test.ts "cancel … hoàn kho", catalog.test.ts "stock.adjust" |
| COM-2-7 | Cho tồn âm + cảnh báo khi tồn ≤ ngưỡng | plans/COMMERCE-DECISIONS.md:42 | 027 | ĐẠT | catalog.prisma:59 lowStockThreshold · test catalog.test.ts "stock.adjust: cho âm + cờ low_stock" |
| COM-2-8 | Agent tra tồn trước khi hứa giao; hết hàng báo khách + gợi ý thay thế | plans/COMMERCE-DECISIONS.md:42 | 044 | MỘT PHẦN | Chỉ luật prompt (packages/core/src/ai/agents/agent.runtime.ts:38) + action `stock.get` (catalog/actions/read.handlers.ts:68); không có ca eval / test hành vi agent; gợi ý thay thế chưa có |
| COM-2-9 | Vật tư tiêu hao, đơn mua hàng, nhà cung cấp | plans/COMMERCE-DECISIONS.md:43 | — | NGOÀI | P2 theo COMMERCE §2 |
| COM-3-1 | Máy trạng thái báo giá draft→(pending_approval→approved)→sent→viewed→accepted / revision_requested / rejected / expired | plans/COMMERCE-DECISIONS.md:49 | 029 | ĐẠT | packages/shared/src/sales/quote-state.ts · test quote-state.test.ts, quotes.test.ts |
| COM-3-2 | Ngưỡng duyệt tổng > 20.000.000đ **cấu hình được** | plans/COMMERCE-DECISIONS.md:58 | 032b | MỘT PHẦN | Hằng số packages/shared/src/commerce/quote-math.ts:23 `APPROVAL_TOTAL`; không có cài đặt workspace |
| COM-3-3 | Giảm giá vượt mức agent tự quyết (5%, AI Governance) → duyệt; Owner trên UI không bị giới hạn | plans/COMMERCE-DECISIONS.md:59 | 032b | MỘT PHẦN | `reasonsOf` (sales/quotes/services/quote-write.ts:98) không truyền `agentMaxPct`; `FORCE_APPROVAL` (ai/governance/governance.ts:34) không ai đọc; ngưỡng 5% áp cho mọi người kể cả Owner (quote-send.handlers.ts:52) |
| COM-3-4 | Báo giá agent tạo có hàng ngoài danh mục → bắt duyệt | plans/COMMERCE-DECISIONS.md:60 | 029 | ĐẠT | sales/quotes/actions/quote-write.handlers.ts:50 · test quotes.test.ts "AI soạn … off_catalog + buộc duyệt" |
| COM-3-5 | Chiết khấu theo dòng (% / tiền) và trên tổng; thuế tính sau chiết khấu theo thuế suất dòng | plans/COMMERCE-DECISIONS.md:62 | 029 | ĐẠT | quote-math.ts:35-60 · test quote-math.test.ts "thuế tính sau chiết khấu dòng + chiết khấu tổng" |
| COM-3-6 | Điểm loyalty không trừ trên báo giá | plans/COMMERCE-DECISIONS.md:64 | 029 | ĐẠT | sales-quotes.prisma không có cột điểm; quoteTotals không có điểm · test quote-math.test.ts |
| COM-3-7 | `valid_until = sent_at + 15 ngày`, sửa được trên từng báo giá | plans/COMMERCE-DECISIONS.md:65 | 029 | ĐẠT | quote-math.ts:26; quote-send.handlers.ts:59 (`q.validDays`) · test quotes.test.ts "valid_until = cuối ngày (gửi + 15)" |
| COM-3-8 | Job nhắc còn 2 ngày; quá hạn → `expired` | plans/COMMERCE-DECISIONS.md:65 | 029 | ĐẠT | sales/quotes/services/quote-system.ts:32,54 · test quotes.test.ts "nhắc T-2 một lần; quá hạn → expired" |
| COM-3-9 | Gửi báo giá PDF **hoặc ảnh** qua kênh hội thoại (mọi kênh, gồm webchat) | plans/COMMERCE-DECISIONS.md:67 | 032b | MỘT PHẦN | Gửi PDF Zalo / email (quote-send.handlers.ts:85); enum kênh chỉ `zalo_personal \| email` (packages/actions/src/quotes.ts:121); không gửi ảnh |
| COM-3-10 | Link xem báo giá ghi nhận `viewed` | plans/COMMERCE-DECISIONS.md:67 | 029 | ĐẠT | quote-system.ts:17 markViewed · test quotes.test.ts "link xem … viewed + event" |
| COM-3-11 | AI nhận ý định khách trong chat → `quote.mark_accepted / request_revision / mark_rejected`; tự làm khi tin cậy ≥ 70% | plans/COMMERCE-DECISIONS.md:68-70 | 044 | MỘT PHẦN | Action agentGrantable (actions/quotes.ts:139,153,167); ngưỡng tin cậy chung packages/ai/src/reply/handoff.ts:34 (mặc định 70, agent.store.ts:51); không có test agent gọi đúng action từ câu khách; `ai.detect_intent` không có trong registry |
| COM-3-12 | Báo giá accepted có 2 nút "→ Hợp đồng" / "→ Đơn hàng", agent gọi được; không tự sinh | plans/COMMERCE-DECISIONS.md:71-72 | 029, 030, 031 | ĐẠT | contracts/actions/contract-write.handlers.ts:83; sales/orders/actions/order-create.handlers.ts:123 · test contracts.test.ts "từ báo giá", orders.test.ts "báo giá chưa chốt 409; đã chốt → đơn" |
| COM-3-13 | Mỗi báo giá sinh tối đa một HĐ **hoặc** một đơn | plans/COMMERCE-DECISIONS.md:73 | 032b | MỘT PHẦN | Chỉ chặn trùng cùng loại (order-create.handlers.ts:135; contract-write.handlers.ts:94; contracts.prisma `quoteId @unique`) → một báo giá ra được cả HĐ lẫn đơn (Q-025) |
| COM-4-1 | Đơn hai trục: `status` new→processing→completed / cancelled | plans/COMMERCE-DECISIONS.md:81 | 031 | ĐẠT | packages/shared/src/orders/order-state.ts:6-31 · test order-state.test.ts |
| COM-4-2 | `pay_status` tổng hợp; "Chờ cọc" chỉ khi `deposit_required` | plans/COMMERCE-DECISIONS.md:82,91 | 031 | ĐẠT | order-state.ts:46-55 payStatusOf · test order-state.test.ts, orders.test.ts "cọc → Chờ cọc" |
| COM-4-3 | Đơn tạo từ báo giá, từ HĐ đã ký (nhiều đơn), từ lịch hẹn (gợi ý), trực tiếp | plans/COMMERCE-DECISIONS.md:84-87 | 031, 033 | ĐẠT | order-create.handlers.ts:101,123,166; order-from-appointment.handler.ts:18 · test orders.test.ts "đã ký → nhiều đơn", booking.test.ts "gợi ý đơn → order.create_from_appointment (một lần)" |
| COM-4-4 | Thẻ "Tạo đơn cho buổi này?" hiện ở lịch hẹn, **Inbox và Trợ lý** | plans/COMMERCE-DECISIONS.md:86 | — | MỘT PHẦN | Chỉ apps/web/src/features/calendar/components/AppointmentDrawer.tsx:43 (`suggest_order`); Inbox / Trợ lý không có (grep `suggest_order`) |
| COM-4-5 | Buổi trừ vào liệu trình thì không gợi ý tạo đơn | plans/COMMERCE-DECISIONS.md:86 | 033 | ĐẠT | order-from-appointment.handler.ts:35 · test booking.test.ts "liệu trình … trừ 1 buổi" |
| COM-4-6 | new → processing = xác nhận đơn: trừ kho + sinh `customer_package` nếu đủ điều kiện | plans/COMMERCE-DECISIONS.md:88 | 031, 032 | ĐẠT | sales/orders/actions/order-flow.handlers.ts:62; payments/services/packages.ts:19 (consumer order.confirmed) · test orders.test.ts confirm, payments.test.ts |
| COM-4-7 | Cọc theo số tiền **hoặc %** | plans/COMMERCE-DECISIONS.md:90 | — | MỘT PHẦN | Chỉ `deposit_amount` (packages/actions/src/orders.ts:24); không có cọc theo % |
| COM-4-8 | Gợi ý tự bật cọc (sản phẩm có `deposit`, đơn giá trị cao, khách từng no-show) | plans/COMMERCE-DECISIONS.md:90 | — | CHƯA | Không có code gợi ý (grep deposit trong orders FE / core) |
| COM-4-9 | Sửa đơn tự do ở new; processing chỉ khi chưa có khoản thu | plans/COMMERCE-DECISIONS.md:92 | 031 | ĐẠT | order-edit.handlers.ts:77 · test orders.test.ts "processing: sửa dòng khi chưa thu …; đã thu → 409" |
| COM-4-10 | Huỷ đơn: lý do bắt buộc, hoàn kho, đã thu → yêu cầu hoàn tiền Owner duyệt | plans/COMMERCE-DECISIONS.md:93-97 | 031, 032 | ĐẠT | order-flow.handlers.ts:47-59 · test orders.test.ts "cancel: lý do rỗng 422; hoàn kho; đã thu → chờ hoàn tiền", payments.test.ts |
| COM-4-11 | Huỷ đơn: đảo điểm đã cộng + trả lại điểm đã dùng | plans/COMMERCE-DECISIONS.md:96 | 036 | CHƯA | Không có sổ điểm (packages/core/src/loyalty/loyalty.module.ts stub) |
| COM-4-12 | Vận chuyển nhập tay (đơn vị, mã vận đơn, ngày giao) | plans/COMMERCE-DECISIONS.md:98 | 031 | ĐẠT | order-edit.handlers.ts:161 · test orders.test.ts "vận chuyển + hoàn tác"; tích hợp hãng: NGOÀI P2 |
| COM-4-13 | Chip lọc Tất cả · Đã TT · Đã cọc · Chờ cọc · Đã huỷ, mỗi chip đúng trục; 2 cột trạng thái | plans/COMMERCE-DECISIONS.md:99-101 | 031 | ĐẠT | order-state.ts:58-59; orders/repos/orders.repo.ts:31 · test orders.test.ts "D42 page + chip" |
| COM-4b-1 | `order.source` + `external_ref`; nhập một lần unique theo kết nối + mã ngoài | plans/COMMERCE-DECISIONS.md:105 | 031 | ĐẠT | sales-orders.prisma:97 @@unique; orders/services/order-import.ts · test orders.test.ts "sync_now … gọi lại idempotent" |
| COM-4b-2 | Adapter ánh xạ trạng thái sàn về 2 trục, giữ `platform_status` | plans/COMMERCE-DECISIONS.md:106 | 031 | ĐẠT | packages/integrations/src/ports/order-sync.ts mapStatus · test packages/integrations/test/order-sync.test.ts "mapStatus" |
| COM-4b-3 | Đơn sàn khoá dòng / giá / tổng; chỉ sửa phụ trách, ghi chú, thẻ | plans/COMMERCE-DECISIONS.md:107 | 031 | ĐẠT | order-import.ts:1-4 · test orders.test.ts "đơn sàn: sửa dòng / cọc 409 (locked_lines), ghi chú được" |
| COM-4b-4 | Đơn sàn đã thu ghi `customer_payment(marketplace)`, không sinh ĐNTT / VietQR; COD paid khi hoàn tất | plans/COMMERCE-DECISIONS.md:108 | 031, 032 | ĐẠT | order-import.ts:68-73 · test payments.test.ts "đơn sàn / đơn huỷ không tạo đề nghị", order-sync.test.ts "COD chỉ đã thu khi hoàn tất" |
| COM-4b-5 | Mỗi kết nối chọn bên giữ tồn chuẩn (`appchat` / `external`) | plans/COMMERCE-DECISIONS.md:109 | — | MỘT PHẦN | Đơn sàn vẫn ghi sổ kho (order-import.ts:53); không có cấu hình `stock_master` (chỉ comment order-write.ts:4); đẩy tồn lên sàn P2 |
| COM-4b-6 | Khớp khách sàn theo `contact_identity(marketplace, buyer_id)` | plans/COMMERCE-DECISIONS.md:110 | 031 | ĐẠT | order-import.ts:93 · test orders.test.ts "khách theo buyer" |
| COM-4b-7 | Đơn sàn mặc định không tích điểm, bật được trong cấu hình | plans/COMMERCE-DECISIONS.md:111 | 031 | ĐẠT | order-flow.handlers.ts:28-32 (`loyalty_enabled`) · test orders.test.ts "hoàn tất không tích điểm" (bật ở cấu hình loyalty: 036) |
| COM-4b-8 | Khung port + mock + thẻ "Sắp có" P0; adapter thật sàn / POS P2 | plans/COMMERCE-DECISIONS.md:112 | 031 | ĐẠT | packages/integrations/src/registry.ts:19; coming-soon.ts:8-9 · test order-sync.test.ts "registry"; adapter thật: NGOÀI P2 |
| COM-5-1 | Tên "Đề nghị thanh toán", mã `TT-000123` | plans/COMMERCE-DECISIONS.md:116 | 032 | ĐẠT | packages/shared/src/codes.ts:8 · test payments.test.ts "TT-001001" |
| COM-5-2 | PDF ĐNTT / phiếu thu ghi "không thay thế hoá đơn GTGT" (không xoá được) | plans/COMMERCE-DECISIONS.md:117,239 | 028, 032 | ĐẠT | sales/payments/services/invoice-doc.ts:1-3 (renderRich tự chèn) · test documents.test.ts "đề nghị thanh toán / phiếu thu có dòng không thay thế HĐ GTGT" |
| COM-5-3 | Hoá đơn điện tử thật qua `EInvoiceProvider` | plans/COMMERCE-DECISIONS.md:118 | — | NGOÀI | P2 (Q2); thẻ "Sắp có" packages/integrations/src/coming-soon.ts:14-17 |
| COM-5-4 | Trạng thái ĐNTT draft → sent → partial → paid; overdue; void | plans/COMMERCE-DECISIONS.md:119 | 032 | ĐẠT | packages/shared/src/sales/invoice-state.ts · test invoice-state.test.ts, payments.test.ts "quá hạn → overdue" |
| COM-5-5 | Một đơn nhiều ĐNTT (cọc, đợt, phần còn lại) | plans/COMMERCE-DECISIONS.md:120 | 032 | ĐẠT | invoice-write.handlers.ts:39 · test payments.test.ts "vượt còn phải thu 422" |
| COM-5-6 | Hạn thanh toán mặc định 7 ngày | plans/COMMERCE-DECISIONS.md:121 | 032 | ĐẠT | invoice-write.handlers.ts:61 INVOICE_DUE_DAYS · test payments.test.ts "hạn +7 ngày" |
| COM-5-7 | Nhắc khách qua kênh của họ ở T-1, T+1, T+7 | plans/COMMERCE-DECISIONS.md:121 | 032 | ĐẠT | payments/services/payment-system.ts:41 remindDue · test payments.test.ts "nhắc T+1 một lần" (T-1 / T+7 không có ca test riêng) |
| COM-5-8 | Khoản thu kind deposit / payment / refund (âm, luôn duyệt) | plans/COMMERCE-DECISIONS.md:123 | 032 | ĐẠT | migration 032 `payment_kind`; refund.handlers.ts:29,90 · test payments.test.ts "hoàn tiền (luôn duyệt)" |
| COM-5-9 | Phương thức QR · chuyển khoản · tiền mặt · thẻ | plans/COMMERCE-DECISIONS.md:124 | 032 | ĐẠT | packages/actions/src/invoices.ts:62 · test payments.test.ts record_payment |
| COM-5-10 | Mỗi khoản thu có phiếu thu PDF | plans/COMMERCE-DECISIONS.md:125 | 032 | ĐẠT | payment-write.ts:59 (PT-); invoices-read.service.ts:136 · test payments.test.ts "phiếu thu PT-" |
| COM-5-11 | Gửi phiếu thu / xác nhận đơn cho khách qua kênh (`receipt.send`, `order.send_confirmation`) | plans/COMMERCE-DECISIONS.md:125 | 032b | CHƯA | Chỉ tải PDF; action chưa có trong registry |
| COM-5-12 | Xác nhận tay `invoice.record_payment` | plans/COMMERCE-DECISIONS.md:127 | 032 | ĐẠT | invoice-pay.handlers.ts:26 · test payments.test.ts |
| COM-5-13 | Đối soát tự động SePay / Casso của DN qua webhook `/hooks/tenant-payments/:provider/:feedId`, khớp `TT-` | plans/COMMERCE-DECISIONS.md:128 | — | GIẢ | Luồng có (sales/payments/services/bank-feed.ts) nhưng registry gắn `MockBankFeedProvider` cho cả sepay + casso (packages/integrations/src/registry.ts:16-17); `SepayBankFeed` chỉ dùng cho nền tảng qua env; Casso không có adapter thật. Không TIP nào nhận (TIP-012:56 hẹn 010 / 032; 032 DONE vẫn mock) |
| COM-5-14 | Khớp không chắc (sai tiền, thiếu mã) → hàng "Cần đối soát" | plans/COMMERCE-DECISIONS.md:129 | 032 | ĐẠT | bank-feed.ts:1-4; invoice-pay.handlers.ts:55 · test payments.test.ts "lệch / thiếu mã → Cần đối soát", "resolve_bank_match" |
| COM-5-15 | Công nợ (phải thu, quá hạn) theo khách ở Hồ sơ 360° và danh sách ĐNTT | plans/COMMERCE-DECISIONS.md:130 | 015b | MỘT PHẦN | 360° `kpis: []` (packages/core/src/crm/services/contact360.ts:52); danh sách chỉ meta theo đề nghị (invoices-read.service.ts:111) |
| COM-5-16 | ĐNTT "kèm VietQR" — ảnh QR thật trong PDF + `GET /invoices/:id/qr` | plans/COMMERCE-DECISIONS.md:14 | 032b | MỘT PHẦN | Payload VietQR có (shared/commerce/vietqr.ts + vietqr.test.ts) nhưng PDF chỉ dòng chữ (invoice-doc.ts:108); route QR không có |
| COM-5-17 | Gửi ĐNTT / link ký / báo giá qua webchat | plans/COMMERCE-DECISIONS.md:121,211 | 032b | CHƯA | Enum `zalo_personal \| email`: packages/actions/src/invoices.ts:45, contracts.ts:144, quotes.ts:121 |
| COM-6-1 | Sản phẩm liệu trình có `sessions`, `valid_days`, dịch vụ áp dụng | plans/COMMERCE-DECISIONS.md:134 | 027, 033 | ĐẠT | catalog.prisma:61-62; dịch vụ = thành phần · test booking.test.ts "dịch vụ + liệu trình (thành phần là dịch vụ)" |
| COM-6-2 | Sinh `customer_package` khi đơn gói xác nhận và thu đủ | plans/COMMERCE-DECISIONS.md:135 | 032 | ĐẠT | payments/services/packages.ts:19 · test payments.test.ts, booking.test.ts "gói đã thu đủ" |
| COM-6-3 | Sinh gói khi mới cọc nếu sản phẩm cho phép | plans/COMMERCE-DECISIONS.md:135 | 032b | CHƯA | packages.ts:20 chỉ `payStatus === 'paid'`; không có cờ `grant_on_deposit` |
| COM-6-4 | Lịch hẹn gói `done` → used+1 + `package_usage`; hoàn tác trả buổi | plans/COMMERCE-DECISIONS.md:137-138 | 033 | ĐẠT | booking/actions/appointment-flow.handlers.ts:86 · test booking.test.ts "hoàn thành trừ 1 buổi (package_usage); hoàn tác trả buổi" |
| COM-6-5 | No-show mặc định không trừ buổi, bật được trong cấu hình | plans/COMMERCE-DECISIONS.md:139 | 033 | ĐẠT | appointment-flow.handlers.ts:125 (`noShowDeducts`) · test booking.test.ts "không đến … (không trừ buổi)" |
| COM-6-6 | Tạo lịch cho khách có gói phù hợp → tự chọn gói | plans/COMMERCE-DECISIONS.md:140 | 033 | ĐẠT | test booking.test.ts "tạo lịch tự gắn gói" |
| COM-6-7 | Nhắc gia hạn khi còn 1 buổi / còn 7 ngày | plans/COMMERCE-DECISIONS.md:141 | 032b | CHƯA | Không có job nhắc (packages.ts chỉ expireDuePackages) |
| COM-6-8 | Hết hạn → `expired`; Owner gia hạn `package.extend` có log | plans/COMMERCE-DECISIONS.md:142 | 032 | ĐẠT | packages.ts:50; package.handlers.ts:45 · test payments.test.ts "liệu trình: gia hạn" |
| COM-6-9 | Hoàn tiền gói theo tỉ lệ buổi còn lại, cần duyệt; không chuyển nhượng | plans/COMMERCE-DECISIONS.md:143 | 032 | ĐẠT | refunds.ts · test payments.test.ts "yêu cầu theo liệu trình (tỉ lệ buổi còn lại) → chờ duyệt" |
| COM-6-10 | Hồ sơ 360° có thẻ "Liệu trình"; agent đọc được để tư vấn | plans/COMMERCE-DECISIONS.md:144 | — | MỘT PHẦN | API `GET /contacts/:id/packages` có (apps/api/src/http/sales/invoices.controller.ts) nhưng FE features không gọi (chỉ mock test); không có action đọc liệu trình cho agent (023b R2 không liệt kê) |
| COM-7-1 | Cộng điểm một lần khi đơn `completed`: floor(net trước VAT / 10.000) × hệ số hạng | plans/COMMERCE-DECISIONS.md:148-149 | 036 | MỘT PHẦN | Tính + ghi trên đơn (order-flow.handlers.ts:22-44; order-state.ts:62-67 · test order-state.test.ts pointsFor, orders.test.ts complete); chưa cộng sổ điểm / `points_balance` (DC-186) |
| COM-7-2 | Hệ số hạng ×1 / ×1 / ×1,5 / ×2 cấu hình được | plans/COMMERCE-DECISIONS.md:150 | 036 | MỘT PHẦN | packages/shared/src/orders/order-state.ts:63-67 dùng hằng số, core/src/sales/orders/actions/order-flow.handlers.ts:37 không đọc config; loyalty.update_config chưa handler. TIP-036 TASK 2, AC2 nhận snapshot hệ số, không sửa earn cũ |
| COM-7-3 | Lịch hẹn hoàn tất không cộng điểm riêng | plans/COMMERCE-DECISIONS.md:151 | 033 | ĐẠT | appointment-flow.handlers.ts:86 không cộng điểm · test booking.test.ts |
| COM-7-4 | Đổi điểm: 1 điểm = 100đ, khoản thu kind `points`, ≤ 50% giá trị đơn | plans/COMMERCE-DECISIONS.md:152 | 036 | CHƯA | `payment.redeem_points` không có trong registry; 360° quy đổi ×10 (contact360.ts:40) |
| COM-7-5 | Đảo điểm khi huỷ đơn / hoàn tiền một phần theo tỉ lệ | plans/COMMERCE-DECISIONS.md:153-155 | 036 | CHƯA | Không có sổ điểm |
| COM-7-6 | Hạn điểm 12 tháng FIFO | plans/COMMERCE-DECISIONS.md:156 | 036 | CHƯA | loyalty module stub |
| COM-7-7 | Hạng theo điểm 12 tháng, xét lại mỗi quý, ngưỡng 0 / 5.000 / 15.000 / 40.000 | plans/COMMERCE-DECISIONS.md:157 | 036 | CHƯA | loyalty module stub; `/loyalty/*` FE gọi mà API không có (routes.json missing) |
| COM-7-8 | Voucher / mã giảm giá | plans/COMMERCE-DECISIONS.md:158 | — | NGOÀI | P2 |
| COM-8-1 | Khách mới từ kênh → Lead mới | plans/COMMERCE-DECISIONS.md:164 | 015, 016 | ĐẠT | test crm-contacts.test.ts "AC2 contact.create … lead", inbox.test.ts AC2 |
| COM-8-2 | `quote.sent` → Báo giá (nếu thấp hơn) | plans/COMMERCE-DECISIONS.md:165 | 029 | ĐẠT | quote-send.handlers.ts:90 · test quotes.test.ts "giai đoạn Báo giá" |
| COM-8-3 | HĐ gửi ký / đã ký → Hợp đồng (nếu thấp hơn) | plans/COMMERCE-DECISIONS.md:166,228 | 030 | ĐẠT | contracts/services/public-sign.service.ts:222 · test contracts.test.ts "link ký vào hội thoại, giai đoạn Hợp đồng" |
| COM-8-4 | BG từ chối / hết hạn, không còn BG mở → Đang tư vấn | plans/COMMERCE-DECISIONS.md:167 | 029 | ĐẠT | quote-system.ts:44 closeLost · test quotes.test.ts "từ chối → lùi giai đoạn về Đang tư vấn" |
| COM-8-5 | `order.completed` → Đã mua | plans/COMMERCE-DECISIONS.md:168 | 031 | ĐẠT | order-flow.handlers.ts:43 · test orders.test.ts "khách Đã mua" |
| COM-8-6 | Đã mua không bao giờ bị hạ | plans/COMMERCE-DECISIONS.md:170 | 015 | ĐẠT | crm/services/stage-rules.ts:25 · test orders.test.ts "hoàn tác giữ Đã mua" |
| COM-8-7 | Kéo tay thắng; quy tắc tự động không ghi đè trong 24 giờ | plans/COMMERCE-DECISIONS.md:171 | — | MỘT PHẦN | Code có (stage-rules.ts:26 MANUAL_HOLD_MS); không test nào kiểm `stage_set_manually_at` / cửa sổ 24h |
| COM-8-8 | Không có pipeline Deal riêng; giai đoạn trên Khách hàng | plans/COMMERCE-DECISIONS.md:172 | 015 | QUY-TẮC | Không có bảng deal; contact360.ts:43 `deal` rỗng |
| COM-8b-1 | Vai trò trên khách owner / collaborator / watcher | plans/COMMERCE-DECISIONS.md:176 | 015 | ĐẠT | crm/services/access.ts · test crm-contacts.test.ts AC3 |
| COM-8b-2 | Scope `own` gồm khách mình là collaborator **/ watcher**; báo giá, HĐ, đơn, lịch hẹn đi theo | plans/COMMERCE-DECISIONS.md:177 | 042c | MỘT PHẦN | quote/order/contract/invoice/booking helpers chỉ role collaborator; TIP042c AC2 mở đọc có kiểm permission, không mở ghi |
| COM-8b-2-write | Watcher chỉ đọc, không biến grant đọc thành ghi trong inbox/chứng từ | plans/COMMERCE-DECISIONS.md:176-177; rbac-permissions D32 | 042c | MỘT PHẦN | inbox/services/access.ts:62-67 writable chỉ gọi canSee (có watcher); lockOrder/Contract/Appointment gọi visible nên phải tách mode trước khi mở watcher. TIP042c AC3 |
| Q-029 | Chốt semantics team_id với owner nhiều nhóm và backfill không mở rộng quyền | QUESTIONS.md:Q-029; BLUEPRINT §2.2/§3.5 | 042c | CHƯA | Đã hỏi, chưa trả lời; không tự OR teamUserIds và team_id |
| COM-8b-3 | Chống giành khách + "Xin chia sẻ" (`contact.request_access`) | plans/COMMERCE-DECISIONS.md:178 | 015 | ĐẠT | crm/actions/contact-owner.handlers.ts:125 · test crm-contacts.test.ts AC2, AC6 |
| COM-8b-4 | Chuyển phụ trách (crm.reassign) kèm hội thoại / BG / **lịch hẹn sắp tới**; timeline + thông báo **hai bên** | plans/COMMERCE-DECISIONS.md:179 | — | MỘT PHẦN | Hội thoại + báo giá chuyển (contact-owner.handlers.ts:97; quote-system.ts:85 · test crm-contacts.test.ts AC5, quotes.test.ts); `move.appointments` không consumer nào xử lý (booking không nghe `contact.owner_changed`); thông báo chỉ người nhận (crm-notify.ts:12) |
| COM-8b-5 | Tin mới tự gán owner; owner ngoài ca / vắng → hàng chung hoặc agent | plans/COMMERCE-DECISIONS.md:180 | — | MỘT PHẦN | Tự gán có (inbox/services/pipeline.ts:108 · test inbox.test.ts AC2); ngoài ca / vắng chưa (DC-081) |
| COM-8b-6 | Chứng từ ghi `owner_user_id` tại thời điểm tạo cho doanh số | plans/COMMERCE-DECISIONS.md:181 | 029–031 | ĐẠT | contracts.prisma ownerUserId "không đổi theo khách" · test quotes.test.ts, orders.test.ts (phụ trách = người tạo) |
| COM-8b-7 | Chia lead tự động (thủ công / vòng tròn / kênh / tải) | plans/COMMERCE-DECISIONS.md:182 | 042b | CHƯA | TIP042b AC2–6, giữ chủ cũ/không đổi doanh số, CAS/idempotent; chưa code |
| Q-028 | Chốt biên quyền custom role/uỷ quyền và chuyển grant P0 sang P1 | QUESTIONS.md:Q-028; BLUEPRINT §3.5 | 042 | CHƯA | Đã hỏi, chưa trả lời; TIP042 chưa ready-to-build, không tự nới quyền riêng Owner |
| COM-9-1 | Máy trạng thái HĐ draft → pending_approval → pending_signature → signed / declined / expired / terminated | plans/COMMERCE-DECISIONS.md:191-195 | 030 | ĐẠT | packages/shared/src/contracts/contract-state.ts · test contract-state.test.ts, contracts.test.ts |
| COM-9-2 | Kanban / chip 4 cột; Chờ duyệt gộp Nháp; Từ chối / Chấm dứt chỉ ở "Tất cả" | plans/COMMERCE-DECISIONS.md:198 | 030 | ĐẠT | contract-state.ts:31-33 · test contracts.test.ts "D42 … chip trạng thái" |
| COM-9-3 | Agent / Trợ lý chỉ soạn nháp; gửi ký cần Owner | plans/COMMERCE-DECISIONS.md:202 | 030 | ĐẠT | packages/actions/src/contracts.ts:107-148 (`agentGrantable: false`, permission `contract.sign`) · test contracts.test.ts "sales không duyệt & ký được" |
| COM-9-4 | Loại HĐ Dịch vụ / Mua bán / Nguyên tắc; mã `HĐ-` tự sinh | plans/COMMERCE-DECISIONS.md:203-204 | 030 | ĐẠT | contracts.prisma ContractKind; codes.ts:6 · test contracts.test.ts "mã HĐ-1001" |
| COM-9-5 | Trường "file hợp đồng" tải lên | plans/COMMERCE-DECISIONS.md:204 | 030b | MỘT PHẦN | Chỉ `fileName` (contracts.prisma), nội dung ký render từ mẫu |
| COM-9-6 | (a) Nội dung sinh từ mẫu **theo loại** | plans/COMMERCE-DECISIONS.md:206 | 030b | MỘT PHẦN | contract-write.handlers.ts:32 lấy mẫu mặc định kind `contract`, không theo loại |
| COM-9-7 | (a2) Mẫu DOCX DN + AI soạn HĐ từ nội dung (`contract.draft_from_content`) | plans/COMMERCE-DECISIONS.md:207 | 030b | CHƯA | Action không có trong registry |
| COM-9-8 | (b) Tải lên PDF có sẵn (cả tệp khách gửi trong hội thoại) | plans/COMMERCE-DECISIONS.md:208 | 030b | CHƯA | Không có action / route |
| COM-9-9 | Owner "Duyệt & ký": OTP email + ký tay, chữ ký chèn PDF | plans/COMMERCE-DECISIONS.md:210 | 030 | ĐẠT | contract-approval.handlers.ts:99 · test contracts.test.ts "Duyệt & ký: … OTP đúng → chờ khách ký" |
| COM-9-10 | Gửi ký: link một lần, 7 ngày, gia hạn được, qua kênh hội thoại / email | plans/COMMERCE-DECISIONS.md:211 | 030 | ĐẠT | contract-send.handlers.ts:38,122 · test contracts.test.ts "link dùng một lần", "nhắc / gia hạn" (webchat: COM-5-17) |
| COM-9-11 | Trang ký công khai: xem PDF, tick đồng ý, OTP khách, ký tay | plans/COMMERCE-DECISIONS.md:212 | 030 | ĐẠT | contracts/services/public-sign.service.ts · test contracts.test.ts "mở link → opened … ký → signed" |
| COM-9-12 | Hoàn tất PDF: chữ ký khách + trang chứng nhận + SHA-256, khoá nội dung | plans/COMMERCE-DECISIONS.md:213-214 | 030 | ĐẠT | contract-sign-pdf.ts:34-66 · test contracts.test.ts "PDF cuối + SHA-256" |
| COM-9-13 | Gửi PDF đã ký cho cả 2 bên | plans/COMMERCE-DECISIONS.md:215 | 030 | ĐẠT | public-sign.service.ts:224-231 (khách qua hội thoại, DN thông báo + tải) · test contracts.test.ts |
| COM-9-14 | `contract_signature_event` append-only mọi bước | plans/COMMERCE-DECISIONS.md:216 | 030 | ĐẠT | migration 030 trigger L172-178 · test contracts.test.ts:115-116 |
| COM-9-15 | Khách "Từ chối ký" → declined, báo Owner | plans/COMMERCE-DECISIONS.md:217 | 030 | ĐẠT | test contracts.test.ts "khách từ chối → declined + thông báo" |
| COM-9-16 | Ký số CA qua `ESignProvider`; nhãn "Ký số" → "Ký điện tử" | plans/COMMERCE-DECISIONS.md:218 | — | NGOÀI | P2 (C1); nhãn đã đổi apps/web/messages/vi/contracts.json:108 |
| COM-9-17 | Sau ký khoá nội dung; thay đổi bằng phụ lục `contract_appendix` cùng luồng duyệt + ký | plans/COMMERCE-DECISIONS.md:220-221 | 030b | CHƯA | `contract.create_appendix` không có trong registry (Q-022) |
| COM-9-18 | HĐ đã ký "→ Đơn hàng", nhiều đơn | plans/COMMERCE-DECISIONS.md:222 | 031 | ĐẠT | order-create.handlers.ts:166 · test orders.test.ts "đã ký → nhiều đơn" |
| COM-9-19 | T-30 nhắc Owner (thông báo **+ Việc cần tôi**) + gợi ý agent chào gia hạn | plans/COMMERCE-DECISIONS.md:224 | 038 | MỘT PHẦN | Thông báo có (contract-system.ts:52 · test contracts.test.ts "T-30 nhắc gia hạn một lần"); Việc cần tôi = Dashboard 038; gợi ý agent: task-catalog không có trigger `contract.expiring` |
| COM-9-20 | Qua ngày kết thúc → expired; "Gia hạn" = HĐ mới `renewal_of_id` | plans/COMMERCE-DECISIONS.md:225-226 | 030 | ĐẠT | contract-system.ts:75; contract-write.handlers.ts:170 · test contracts.test.ts "qua ngày kết thúc → expired; renew tạo nháp mới" |
| COM-9-21 | Chấm dứt chỉ Owner, lý do bắt buộc, timeline | plans/COMMERCE-DECISIONS.md:227 | 030 | ĐẠT | contract-send.handlers.ts:154 (permission contract.sign, OWNER_ONLY) · test contracts.test.ts "terminate … lý do + timeline" |
| COM-9-22 | Hồ sơ 360° hiển thị HĐ, giá trị hiệu lực, ngày hết hạn gần nhất | plans/COMMERCE-DECISIONS.md:229 | 015b | CHƯA | contact360.ts không đọc hợp đồng |
| COM-12-1 | `doc_template(kind quote/contract/payment_request/receipt)`, nguồn rich / docx, có version, chứng từ ghi version | plans/COMMERCE-DECISIONS.md:234 | 028 | ĐẠT | documents/services/template-store.ts; sales-quotes.prisma:32 templateVersion · test documents.test.ts |
| COM-12-2 | AI soạn báo giá: khớp catalog, giá catalog, ngoài DM / giảm > 5% buộc duyệt; chỉ tạo nháp | plans/COMMERCE-DECISIONS.md:236,238 | 029 | ĐẠT | sales/quotes/services/quote-draft.ts; quote-draft.handler.ts:3 · test quotes.test.ts "AI soạn từ nội dung (model giả → bộ luật)" (model thật Q-001) |
| COM-12-3 | AI soạn HĐ: điền biến, điều khoản mẫu nguyên văn, đề xuất trong khối tô nổi Giữ / Bỏ | plans/COMMERCE-DECISIONS.md:237 | 030b | CHƯA | Không có action / code |
| COM-12-4 | Bảng kiểm cảnh báo: Điều 398 (HĐ); BG có bên bán + MST + hiệu lực + VAT | plans/COMMERCE-DECISIONS.md:239 | 028 | ĐẠT | packages/shared/src/documents/variables.ts:44 legalChecklist · test template-text.test.ts, documents.test.ts "bảng kiểm" |
| COM-10-1 | `billing_invoice` có thông tin xuất VAT (MST, tên, địa chỉ, email) | plans/COMMERCE-DECISIONS.md:244 | 010 | ĐẠT | billing/payments/invoices.service.ts:85 · test billing-payments.test.ts AC2 "vat_info"; xuất HĐĐT thật NGOÀI P2 |
| COM-10-2 | Credit gói không cộng dồn; credit mua thêm không hết hạn; trừ gói trước | plans/COMMERCE-DECISIONS.md:245 | 009 | ĐẠT | billing/services/wallet.service.ts:83-91 (resetPlan DC-034) · test billing.test.ts AC4 "trừ plan trước rồi topup" |
| COM-10-3 | Nâng gói giữa kỳ: tính chênh theo ngày còn lại + cộng ngay credit chênh | plans/COMMERCE-DECISIONS.md:246 | 039 | CHƯA | fulfil.ts:39 xử lý như mua mới; TIP039 task2/AC03 nhận upgrade giữenddate và chênhplancredit, Q031 chốt phần chi tiết, không tự đổi COMMERCE |
| COM-10-4 | Hạ gói có hiệu lực từ kỳ sau | plans/COMMERCE-DECISIONS.md:246 | — | CHƯA | Không có code (grep downgrade / scheduled) |
| COM-10-5 | Bỏ tự nạp; nhắc khi dùng 80% và 95% | plans/COMMERCE-DECISIONS.md:247 | 009 | ĐẠT | wallet.service.ts:198-200 · test billing.test.ts AC6 |
| COM-10-6 | Chỉ VietQR + chuyển khoản (VNPAY / MoMo / ZaloPay P2) | plans/COMMERCE-DECISIONS.md:248 | 010 | ĐẠT | test billing-payments.test.ts AC2 "QR VietQR (CRC đúng)" |
| COM-10-7 | Hết credit: chặn AI + popup nạp | plans/COMMERCE-DECISIONS.md:249 | 039 | MỘT PHẦN | Chặn có (`CREDIT_EXHAUSTED` wallet.service.ts:83 · test billing.test.ts AC4/AC5); popup nạp FE chưa thấy (chỉ chuỗi i18n errors.json) |
| COM-11 | Bảng mâu thuẫn đã giải quyết áp như luật §1–§10 | plans/COMMERCE-DECISIONS.md:253-266 | — | QUY-TẮC | Kiểm qua các dòng COM-2…COM-10 ở trên |
| D01 | Sản phẩm thương mại hoàn chỉnh, không MVP | 01-REQUIREMENTS-MATRIX.md:251 | — | QUY-TẮC | Phạm vi; kiểm bằng sổ COVERAGE |
| D02 | Mô hình OPC 1 chủ + đội AI | 01-REQUIREMENTS-MATRIX.md:252 | — | QUY-TẮC | Định hướng sản phẩm |
| D03 | Trợ lý = orchestrator điều phối agent + copilot điều khiển mọi action UI | 01-REQUIREMENTS-MATRIX.md:253 | 023b | MỘT PHẦN | meta-tools + delegate (packages/core/src/ai/assistant/meta-tools.ts, delegate.ts · test assistant.test.ts:221); phủ đủ action / preview: 023b, theo màn: 023c |
| D16 | Action-first: một Action Registry cho UI, Trợ lý, agent | 01-REQUIREMENTS-MATRIX.md:254 | 003 | QUY-TẮC | kernel/actions/executor.ts · test packages/actions/src/registry.test.ts; còn 17 lời gọi `transport.post/put/patch` trong apps/web/src/features chưa rà |
| D04 | Kênh Zalo cá nhân + Web widget + Email | 01-REQUIREMENTS-MATRIX.md:255 | 014, 017, 018 | CHỜ-TK | packages/channels/src/{zalo-personal,webchat,email} · test zalo-adapter.test.ts, webchat.test.ts, email.test.ts; Zalo thật Q-003 |
| D05 | Zalo cá nhân adapter cô lập, throttle chống khoá | 01-REQUIREMENTS-MATRIX.md:256 | 014 | CHỜ-TK | manifest.ts:22 jitter 2–6s; channels/jobs/send.processor.ts:43 · test channels.test.ts; Q-003 |
| D06 | Tự chủ theo spec, ép duyệt tiền / HĐ / gửi hàng loạt | 01-REQUIREMENTS-MATRIX.md:257 | 003, 021 | ĐẠT | kernel/actions/policy.ts:8-26 · test packages/core/test/actions-unit.test.ts "policy nguồn × rủi ro" (ngưỡng 20M/5% riêng cho agent: COM-3-3) |
| D07 | Không làm Call Center, Workflow engine | 01-REQUIREMENTS-MATRIX.md:258 | — | NGOÀI | D07 |
| D08a | Ticket / SLA | 01-REQUIREMENTS-MATRIX.md:259 | 034 | ĐẠT | packages/core/src/support · test support.test.ts |
| D08b | Marketing broadcast | 01-REQUIREMENTS-MATRIX.md:259 | 037 | CHƯA | packages/core/src/marketing chỉ module stub; `/campaigns*` FE gọi mà API không có (routes.json missing) |
| D08c | Loyalty | 01-REQUIREMENTS-MATRIX.md:259 | 036 | CHƯA | loyalty module stub; `/loyalty/*` thiếu API |
| D09 | Hết credit: chặn AI + popup nạp, cảnh báo 80%, dữ liệu vẫn dùng | 01-REQUIREMENTS-MATRIX.md:260 | 039 | MỘT PHẦN | Như COM-10-7 |
| D10 | Bảng giá gói lưu DB, cấu hình được, seed theo prototype | 01-REQUIREMENTS-MATRIX.md:261 | 040 | MỘT PHẦN | Seed có (billing/seed.ts · test billing.test.ts AC2); `admin.plan.upsert` chưa có |
| D11 | RBAC Owner + Member | 01-REQUIREMENTS-MATRIX.md:262 | — | NGOÀI | Thay bằng D27 |
| D12 | Không Docker | 01-REQUIREMENTS-MATRIX.md:263 | — | QUY-TẮC | Không có Dockerfile trong repo (find) |
| D13 | ORM Prisma (+ SQL thô cho index) | 01-REQUIREMENTS-MATRIX.md:264 | 002 | QUY-TẮC | packages/db/prisma/{platform,tenant} |
| D14 | LLM đa nhà cung cấp qua LLM Router | 01-REQUIREMENTS-MATRIX.md:265 | 019 | CHỜ-TK | packages/ai/package.json @ai-sdk/*; packages/ai/src/router · test router.test.ts; Q-001 |
| D15 | BullMQ + outbox; Postgres FTS unaccent + pg_trgm | 01-REQUIREMENTS-MATRIX.md:309 | 003 | ĐẠT | tenant/bootstrap.sql · test catalog.test.ts "EXPLAIN … product_name_trgm_idx", relay-sequence.test.ts |
| D17 | AI SDK v7 + lớp nối tự viết, không swarm | 01-REQUIREMENTS-MATRIX.md:266 | 019 | QUY-TẮC | packages/ai/package.json `ai` 7.0.152 |
| D18 | antd v6 + Ant Design X, token prototype, parity < 5% | 01-REQUIREMENTS-MATRIX.md:275 | — | QUY-TẮC | `pnpm lint:tokens`, `pnpm parity` |
| D19 | Bỏ module Báo cáo | 01-REQUIREMENTS-MATRIX.md:267 | — | NGOÀI | D19 |
| D20 | Production native VPS (systemd + PM2, nginx, Prom / Grafana / Loki, pgBackRest) | 01-REQUIREMENTS-MATRIX.md:268 | 045 | CHƯA | Thư mục `infra/` chưa tồn tại; Q-006 |
| D21 | Mỗi workspace một DB + DB nền tảng | 01-REQUIREMENTS-MATRIX.md:269 | 002 | ĐẠT | packages/db/src/provisioner.ts, tenant-resolver.ts · test packages/db/test/integration/tenant-isolation.test.ts |
| D22 | vi + en; registry 11 ngôn ngữ | 01-REQUIREMENTS-MATRIX.md:274 | 007 | ĐẠT | packages/shared/src/i18n/locales.ts:13-28 · test locales.test.ts |
| D23 | Tự lưu trữ workspace gói Miễn phí sau 90 ngày | 01-REQUIREMENTS-MATRIX.md:273 | 041 | CHƯA | Không có code archive workspace (`admin.workspace.archive` thiếu) |
| D24 | Commerce theo COMMERCE-DECISIONS | 01-REQUIREMENTS-MATRIX.md:272 | — | QUY-TẮC | Xem các dòng COM-* |
| D25 | Hợp đồng P0: tuỳ chọn sau BG, Owner duyệt + ký trước, khách ký OTP + tay; CA P2 | 01-REQUIREMENTS-MATRIX.md:270 | 030 | ĐẠT | Xem COM-9-*; test contracts.test.ts |
| D26 | Phạm vi đợt đầu toàn bộ P0 + P1 | 01-REQUIREMENTS-MATRIX.md:271 | — | QUY-TẮC | Phạm vi |
| D27a | Permission engine, 5 vai trò, scope Của tôi / Nhóm / Tất cả, AI theo quyền người ra lệnh | 01-REQUIREMENTS-MATRIX.md:276 | 005 | ĐẠT | packages/shared/src/authz/roles.ts:36 · test roles.test.ts, authz.test.ts, role-isolation.harness.ts |
| D27b | Vai trò tuỳ biến + Nhóm (P1) | 01-REQUIREMENTS-MATRIX.md:276 | 042 | CHƯA | `role.*`, `team.*` không có trong registry |
| D28a | Bật Cài đặt → Nền tảng kết nối P0, registry + "Sắp có" | 01-REQUIREMENTS-MATRIX.md:277 | 012 | ĐẠT | apps/api/src/http/integrations/integrations.controller.ts · test integrations.test.ts |
| D28b | SePay / Casso của DN phát hành thật | 01-REQUIREMENTS-MATRIX.md:277 | — | GIẢ | Như COM-5-13 (registry.ts:16-17 gắn adapter mock) |
| D28c | Connector storage phát hành | 01-REQUIREMENTS-MATRIX.md:277 | — | MỘT PHẦN | Chỉ `local` (kernel/files/storage.ts:1-2 "s3 để sau"); thẻ GCS "Sắp có" |
| D29a | RAG thư mục + thẻ, public / internal, hybrid + ngưỡng + trích nguồn; agent builder phiên bản | 01-REQUIREMENTS-MATRIX.md:278 | 020, 021 | ĐẠT | test kb.test.ts AC4/AC5, agents.test.ts |
| D29b | Học từ hội thoại có người duyệt (P1) | 01-REQUIREMENTS-MATRIX.md:278 | 043 | CHƯA | `kb.suggestion.*` không có |
| D30 | Mẫu rich / DOCX DN, AI nhận diện biến, PDF LibreOffice; AI soạn BG / HĐ | 01-REQUIREMENTS-MATRIX.md:279 | 028, 030b | MỘT PHẦN | DOCX + detect_fields + PDF (documents/services/docx.ts, soffice.ts · test documents.test.ts); AI soạn HĐ: COM-12-3 |
| D31 | Đơn sàn / POS khung + "Sắp có" | 01-REQUIREMENTS-MATRIX.md:280 | 031 | ĐẠT | Xem COM-4b-* |
| D32 | 1 chính + đồng phụ trách / theo dõi | 01-REQUIREMENTS-MATRIX.md:281 | 015 | MỘT PHẦN | Xem COM-8b-2, COM-8b-4 |
| D33 | Provider gốc + router OpenAI-compatible, `llm_provider` / `model_route` | 01-REQUIREMENTS-MATRIX.md:282 | 019 | CHỜ-TK | platform/ai-config.prisma:40,58 · test router.test.ts; Q-001 / Q-002 |
| D34 | Email hệ thống Brevo qua `MailProvider`, SMTP dự phòng | 01-REQUIREMENTS-MATRIX.md:283 | 004 | CHỜ-TK | integrations/src/connectors/brevo/mail.ts · test ports.test.ts, smtp.test.ts; Q-004 |
| D35a | Ngưỡng eval: an toàn 100%, chọn action ≥ 95%, rubric ≥ 90% | 01-REQUIREMENTS-MATRIX.md:284 | 044 | CHƯA | Chưa có harness eval |
| D35b | Uỷ quyền ký HĐ / duyệt hoàn tiền cho Quản lý mặc định tắt | 01-REQUIREMENTS-MATRIX.md:284 | 005 | ĐẠT | shared/src/authz/roles.ts:27-31; permissions.ts:46 · test roles.test.ts "manager lacks owner-only and delegated permissions" |
| D35c | Zalo cá nhân 200 tin chủ động / ngày / tài khoản, jitter 2–6s, chỉnh được kèm cảnh báo | 01-REQUIREMENTS-MATRIX.md:284 | 037 | MỘT PHẦN | manifest không perDayProactive; send.processor chốtcap khi open và đếm attempts. TIP037 AC5 nối default200/cap retry-safe/UI cảnh báo, không coi jitter là đủ |
| Q-030 | Dự toán/thu Credit marketing đúng chính sách đã chốt | QUESTIONS.md:Q-030; DECISIONS.md:DC246; REQ-I04 | 037 | CHƯA | Q030 đóng theo uỷ quyền: chỉ charge AI qua pricebook/CreditMeter hiện hữu, không tạo send tariff; TIP037 đã cập nhật. Chưa code/test estimate/ledger, không suy ra provider ngoài miễn phí. |
| DC-245 | Owner danger zone least privilege và lifecycle crash recovery | DECISIONS.md:DC245 | 041 | CHƯA | TIP041 đã có member capability/step-up/backup trước DROP, crash sau DROP không false active; review cục bộ khép ở planning, chưa runtime. |
| DC-246 | Không tạo Credit per-message khi chưa có tariff; tách dự toán AI và phí provider ngoài | DECISIONS.md:DC246 | 037 | CHƯA | TIP037 policy/AC nhận; chưa có marketing runtime chứng minh ledger/estimate. |
| D35d | Tra MST qua VietQR | 01-REQUIREMENTS-MATRIX.md:284 | 004 | ĐẠT | integrations/src/connectors/vietqr/tax-lookup.ts · test ports.test.ts VietQrTaxLookupProvider |
| D36 | Blueprint đã duyệt | 01-REQUIREMENTS-MATRIX.md:285 | — | QUY-TẮC | Quy trình |
| D37 | Không làm MCP ở bản phát hành | 01-REQUIREMENTS-MATRIX.md:286 | — | NGOÀI | D37 |
| D38 | FE theo prototype trước bằng mock transport | 01-REQUIREMENTS-MATRIX.md:287 | — | QUY-TẮC | Quy trình |
| D39 | Chỉ test phần bị ảnh hưởng | 01-REQUIREMENTS-MATRIX.md:288 | — | QUY-TẮC | `pnpm turbo run test --filter` |
| D40 | Git flow dev; CI ci / parity / e2e / full / backend-it | 01-REQUIREMENTS-MATRIX.md:289 | 046 | QUY-TẮC | .github/workflows có ci, e2e, full, parity; `backend-it.yml` chưa có (TIP-046) |
| D41 | Thang token đều | 01-REQUIREMENTS-MATRIX.md:290 | — | QUY-TẮC | `pnpm lint:tokens`; packages/ui/src/tokens.test.ts |
| D42 | Bảng danh sách cuộn trong khung, header dính, Pager số trang, API page + limit | 01-REQUIREMENTS-MATRIX.md:291 | 026–034 | ĐẠT | ListPager ở các screens · test orders/quotes/payments/contracts/catalog/support .test.ts "D42" (Loyalty / Marketing: D08b, D08c) |
| D43 | Prototype mới không ghi đè D42 | 01-REQUIREMENTS-MATRIX.md:292 | — | QUY-TẮC | Quy trình |
| D44 | Chuẩn hoá prototype về D41 | 01-REQUIREMENTS-MATRIX.md:293 | — | QUY-TẮC | tools/scripts/normalize-prototype.mjs |
| D45 | Phạm vi đợt ver2.1 | 01-REQUIREMENTS-MATRIX.md:294 | — | QUY-TẮC | Phạm vi |
| D46 | Hồ sơ 360°: nháp → Cập nhật, BG đã gửi → phiên bản mới, HĐ đã gửi → chi tiết | 01-REQUIREMENTS-MATRIX.md:295 | 025, 026 | ĐẠT | apps/web/src/features/inbox/components/Profile360Actions.tsx:2 · test apps/web/e2e/inbox.spec.ts:69 |
| D47 | Danh mục công cụ agent cũ | 01-REQUIREMENTS-MATRIX.md:296 | — | NGOÀI | Thay bằng D51 |
| D48 | Research / Web search khoá "Sắp có" | 01-REQUIREMENTS-MATRIX.md:297 | — | MỘT PHẦN | apps/web/src/features/inbox/components/AgentToolsMenu.tsx:58; không có test kiểm khoá |
| D49 | Submenu Vòng đời = `contact.set_stage` | 01-REQUIREMENTS-MATRIX.md:298 | 025 | ĐẠT | features/inbox/components/ConvMenu.tsx:26 · test apps/web/e2e/inbox.spec.ts "menu hội thoại" |
| D50a | Ẩn trò chuyện = `conversation.hidden_at`, có tin mới hiện lại | 01-REQUIREMENTS-MATRIX.md:299 | 016 | ĐẠT | inbox/actions/conversation-state.handlers.ts:88 · test inbox.test.ts:136 |
| D50b | Tạo nhóm Zalo (hết khoá sau TIP-014) | 01-REQUIREMENTS-MATRIX.md:299 | 023b | CHƯA | `conversation.create_group` chưa có |
| D51 | Quyền tool chỉ ở Builder, nhóm theo module; delegate = agent ∩ người ra lệnh | 01-REQUIREMENTS-MATRIX.md:300 | 021, 024 | ĐẠT | test apps/web/src/shared/ai/agent-tools.test.ts, assistant.test.ts:221 |
| D52a | Mã đơn `DH-000123`, ticket `TKT-` | 01-REQUIREMENTS-MATRIX.md:301 | 031, 034 | ĐẠT | packages/shared/src/codes.ts:7,11 · test flow.test.ts, orders.test.ts |
| D52b | Ticket đóng tự mở lại khi khách nhắn trong 7 ngày | 01-REQUIREMENTS-MATRIX.md:301 | 034 | ĐẠT | support/services/support-system.ts:99 · test support.test.ts:151 |
| D52c | `approval_request` hết hạn 72 giờ (cấu hình được) | 01-REQUIREMENTS-MATRIX.md:301 | 021 | ĐẠT | ai/approvals/approval.gateway.ts:48 · test agents.test.ts:248 |
| D52d | Lịch hẹn `expired` xác nhận lại nếu còn chỗ | 01-REQUIREMENTS-MATRIX.md:301 | — | CHƯA | APPOINTMENT_FLOW: `expired: {}` terminal (packages/shared/src/booking/appointment-state.ts:42-43) trái state-machine.md:79 |
| D52e | Huỷ chiến dịch ở mọi trạng thái chưa kết thúc | 01-REQUIREMENTS-MATRIX.md:301 | 037 | CHƯA | Marketing chưa làm |
| D52f | Chặn xoá agent đang phụ trách kênh / hội thoại mở | 01-REQUIREMENTS-MATRIX.md:301 | 021 | ĐẠT | test agents.test.ts:108 "xoá khi đang gán kênh → 409" |
| D52g | Báo giá `expired` gia hạn được về `sent` nếu chưa có version mới | 01-REQUIREMENTS-MATRIX.md:301 | 029 | ĐẠT | quote-send.handlers.ts:117-134 · test quotes.test.ts "gia hạn expired → sent" |
| D53 | Cột Cấu hình Builder căn giữa (`margin: 0 auto`) | 01-REQUIREMENTS-MATRIX.md:302 | 024 | ĐẠT | features/agents/styles/builder.styles.ts:129; tools/parity/parity.manifest.ts:87 builderLeft |
| D54 | Một kho RAG / workspace, `kb_scope` mỗi agent, public / internal | 01-REQUIREMENTS-MATRIX.md:303 | 020, 021 | ĐẠT | ai/kb/search.ts, agent.store.ts · test kb.test.ts "AC5 … Owner thấy internal, sales chỉ public" |
| D55 | Generative UI mức 2 (UiTree) cho 8 drawer + màn Trợ lý | 01-REQUIREMENTS-MATRIX.md:304 | 023c | CHƯA | Drawer theo màn còn giả (TIP-023c CONTEXT) |
| D56a | Trường tuỳ biến nhập / lưu / validate cho 6 thực thể | 01-REQUIREMENTS-MATRIX.md:305 | 015, 027–034 | ĐẠT | validateCustomValues ở crm/catalog/quotes/orders/booking/support handlers · test crm-settings.test.ts AC9a, custom-fields/values.test.ts |
| D56b | Sửa giá trị tuỳ biến lịch hẹn sau tạo (`appointment.update`) | 01-REQUIREMENTS-MATRIX.md:305 | 023b | CHƯA | `appointment.update` chưa có |
| D57 | Goal backend một mạch, ba sổ | 01-REQUIREMENTS-MATRIX.md:306 | — | QUY-TẮC | Quy trình |
| D58 | Phạm vi test TIP backend (đã thay) | 01-REQUIREMENTS-MATRIX.md:307 | — | NGOÀI | Thay bằng D59 |
| D59 | Ba cổng test TIP backend | 01-REQUIREMENTS-MATRIX.md:308 | — | QUY-TẮC | `pnpm lint typecheck test depcheck` |
| DC-029 | Kênh thông báo `mobile` mới lưu tuỳ chọn, chưa gửi | DECISIONS.md:38 | — | CHƯA | Không có web push / mobile; không TIP nhận |
| DC-030 | Job gửi email digest | DECISIONS.md:39 | 038 | CHƯA | TIP-038 |
| DC-056 | Addon người dùng / kênh đã trả cộng vào quota | DECISIONS.md:65 | 039 | CHƯA | Cần bảng `subscription_addon` |
| DC-058 | Kết nối SePay của DN dùng adapter thật | DECISIONS.md:67 | — | GIẢ | Như COM-5-13 |
| DC-081 | Owner vắng / ngoài ca → hàng chung | DECISIONS.md:90 | — | CHƯA | "làm cùng ca làm việc (chưa có dữ liệu ca)"; không TIP nhận |
| DC-083 | Thu hồi / thả cảm xúc phía Zalo thật | DECISIONS.md:92 | 014b | CHƯA | Q-014 mở; adapter chưa gọi Planned014b: provider lifecycle/commands/history/contacts/receipts and native/live acceptance; no runtime promotion. |
| DC-086 | Nhiều widget / workspace (P1) | DECISIONS.md:95 | — | CHƯA | Một widget mỗi workspace |
| DC-110 | Parser pptx / OCR ảnh cho RAG (P1) | DECISIONS.md:119 | — | CHƯA | Tệp lưu `learn=false` |
| DC-151 | Khối 360° của module khác hiện dữ liệu | DECISIONS.md:160 | 015b | MỘT PHẦN | contact360.ts:51-58 crm / ai rỗng |
| DC-154 | `category.update / delete` | DECISIONS.md:163 | 032b | CHƯA | Registry thiếu |
| DC-169 | Thêm kênh gửi chứng từ khi có adapter (webchat) | DECISIONS.md:178 | 032b | CHƯA | Như COM-5-17 |
| DC-186 | Sổ điểm tiêu thụ `order.completed` | DECISIONS.md:195 | 036 | CHƯA | loyalty stub |
| DC-199 | Liệu trình sinh khi cọc | DECISIONS.md:208 | 032b | CHƯA | Như COM-6-3 |
| DC-215 | Cấu hình danh mục ticket riêng | DECISIONS.md:224 | — | CHƯA | "để sau"; không TIP nhận |
| DC-226 | Bộ `pnpm ai:live` 30 câu | DECISIONS.md:235 | 023b | CHƯA | tools/ai-live chưa có |

**Ghi chú / chưa rà hết:**

- Ghi chú:
- Bằng chứng test lấy theo tên ca trong file test (đọc code + tên `it(...)`), không chạy lại test trong lượt rà này.
- Phát hiện mới ngoài danh sách đã biết: watcher không thấy chứng từ (COM-8b-2); chuyển phụ trách không chuyển lịch hẹn + chỉ báo người nhận (COM-8b-4); SePay / Casso của DN vẫn adapter mock, không TIP nhận (COM-5-13); lịch hẹn `expired` không xác nhận lại được (D52d); cap 200 tin/ngày Zalo không đặt (D35c); nâng / hạ gói giữa kỳ chưa có (COM-10-3/4); cọc theo % (COM-4-7).
- Ngưỡng 5% áp cả Owner (COM-3-3) — trái Q5, 032b nên sửa cùng.
- CHƯA RÀ HẾT: DC-xxx chỉ quét theo từ khoá (chưa đọc đủ 233 dòng); D16 (17 lời gọi transport.post/put/patch trong features chưa rà); D18 / D41 chưa chạy lint / parity; D29 / D51 / D54 chỉ đối chiếu tên test; COMMERCE §1 Q1–Q8 rà gián tiếp qua §2–§10; không chạy test nào.

## D. BLUEPRINT (§3 action / policy / quyền, §4 API, §5 AI, §6, §8–§11)

| ID | Nghĩa vụ | Nguồn | TIP nhận | Trạng thái | Bằng chứng |
|---|---|---|---|---|---|
| ACT-agent.draft_from_description | `agent.draft_from_description` (read) — handler qua ActionExecutor | plans/BLUEPRINT.md:778 | 021 | ĐẠT | packages/core/src/ai/agents/agent-llm.handlers.ts:74; test agents.test.ts |
| ACT-agent.create | `agent.create` (config) — handler qua ActionExecutor | plans/BLUEPRINT.md:779 | 023b | MỘT PHẦN | packages/core/src/ai/agents/agent.handlers.ts:30; test agents.test.ts, channels.test.ts; thiếu preview (DC-224) |
| ACT-agent.create_and_publish | `agent.create_and_publish` (config) — handler qua ActionExecutor | plans/BLUEPRINT.md:780 | 021 | ĐẠT | packages/core/src/ai/agents/agent.handlers.ts:41; test agent-reply.test.ts, agents-ui.test.ts |
| ACT-agent.update | `agent.update` (config) — handler qua ActionExecutor | plans/BLUEPRINT.md:781 | 023b | MỘT PHẦN | packages/core/src/ai/agents/agent.handlers.ts:65; test agents-ui.test.ts, agents.test.ts; thiếu preview (DC-224) |
| ACT-agent.publish | `agent.publish` (config) — handler qua ActionExecutor | plans/BLUEPRINT.md:783 | 023b | MỘT PHẦN | packages/core/src/ai/agents/agent.handlers.ts:86; test agents.test.ts; thiếu preview (DC-224) |
| ACT-agent.rollback | `agent.rollback` (config) — handler qua ActionExecutor | plans/BLUEPRINT.md:784 | 023b | MỘT PHẦN | packages/core/src/ai/agents/agent.handlers.ts:98; test agents.test.ts; thiếu preview (DC-224) |
| ACT-agent.pause | `agent.pause` (config) — handler qua ActionExecutor | plans/BLUEPRINT.md:785 | 023b | MỘT PHẦN | packages/core/src/ai/agents/agent.handlers.ts:113; test agents.test.ts, ai-tasks.test.ts; thiếu preview (DC-224) |
| ACT-agent.delete | `agent.delete` (delete) — handler qua ActionExecutor | plans/BLUEPRINT.md:786 | 023b | MỘT PHẦN | packages/core/src/ai/agents/agent.handlers.ts:130; test agents.test.ts; thiếu preview (DC-224) |
| ACT-agent.test | `agent.test` (read) — handler qua ActionExecutor | plans/BLUEPRINT.md:787 | 021 | ĐẠT | packages/core/src/ai/agents/agent-llm.handlers.ts:38; test agents.test.ts |
| ACT-agent.optimize_prompt | `agent.optimize_prompt` (read) — handler qua ActionExecutor | plans/BLUEPRINT.md:782 | 021 | ĐẠT | packages/core/src/ai/agents/agent-llm.handlers.ts:99; test agents.test.ts |
| ACT-run.cancel | `run.cancel` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:796 | 023b | MỘT PHẦN | packages/core/src/ai/runs/run-cancel.handler.ts:17; test ai-runtime.test.ts; thiếu preview (DC-224) |
| ACT-approval.approve | `approval.approve` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:795 | 023b | MỘT PHẦN | packages/core/src/ai/approvals/approval.handlers.ts:74; test agent-reply.test.ts, agents-ui.test.ts; thiếu preview (DC-224) |
| ACT-approval.reject | `approval.reject` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:795 | 023b | MỘT PHẦN | packages/core/src/ai/approvals/approval.handlers.ts:83; test agents-ui.test.ts, agents.test.ts; thiếu preview (DC-224) |
| ACT-approval.edit_and_approve | `approval.edit_and_approve` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:795 | 023b | MỘT PHẦN | packages/core/src/ai/approvals/approval.handlers.ts:92; test agents-ui.test.ts, agents-ui-unit.test.ts; thiếu preview (DC-224) |
| ACT-ai_task.create | `ai_task.create` (config) — handler qua ActionExecutor | plans/BLUEPRINT.md:798 | 023b | MỘT PHẦN | packages/core/src/ai/tasks/task.handlers.ts:35; test ai-tasks.test.ts; thiếu preview (DC-224) — code undo 24h, BP không |
| ACT-ai_task.update | `ai_task.update` (config) — handler qua ActionExecutor | plans/BLUEPRINT.md:798 | 023b | MỘT PHẦN | packages/core/src/ai/tasks/task.handlers.ts:106; test ai-tasks.test.ts; thiếu preview (DC-224) |
| ACT-ai_task.pause | `ai_task.pause` (config) — handler qua ActionExecutor | plans/BLUEPRINT.md:798 | 023b | MỘT PHẦN | packages/core/src/ai/tasks/task.handlers.ts:153; test ai-tasks.test.ts; thiếu preview (DC-224) |
| ACT-ai_task.delete | `ai_task.delete` (config) — handler qua ActionExecutor | plans/BLUEPRINT.md:798 | 023b | MỘT PHẦN | packages/core/src/ai/tasks/task.handlers.ts:171; test ai-tasks.test.ts; thiếu preview (DC-224) |
| ACT-ai_task.run_now | `ai_task.run_now` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:799 | 023b | MỘT PHẦN | packages/core/src/ai/tasks/task.handlers.ts:186; test ai-tasks.test.ts; thiếu preview (DC-224) |
| ACT-ai.translate | `ai.translate` (read) — handler qua ActionExecutor | plans/BLUEPRINT.md:627 | 022 | ĐẠT | packages/core/src/ai/skills/translate.handler.ts:22; test inbox-ui.test.ts |
| ACT-staff.create | `staff.create` (config) — handler qua ActionExecutor | plans/BLUEPRINT.md:733 | 023b | MỘT PHẦN | packages/core/src/booking/actions/booking-config.handlers.ts:50; test booking.test.ts; thiếu preview (DC-224) |
| ACT-staff.update | `staff.update` (config) — handler qua ActionExecutor | plans/BLUEPRINT.md:733 | 023b | MỘT PHẦN | packages/core/src/booking/actions/booking-config.handlers.ts:70; KHÔNG có test nào gọi action; thiếu preview — test thiếu: TIP nào nhận chưa rõ |
| ACT-staff.deactivate | `staff.deactivate` (config) — handler qua ActionExecutor | plans/BLUEPRINT.md:733 | 023b | MỘT PHẦN | packages/core/src/booking/actions/booking-config.handlers.ts:90; test booking.test.ts; thiếu preview (DC-224) |
| ACT-business_hours.update | `business_hours.update` (config) — handler qua ActionExecutor | plans/BLUEPRINT.md:734 | 023b | MỘT PHẦN | packages/core/src/booking/actions/booking-config.handlers.ts:106; test booking.test.ts; thiếu preview (DC-224) |
| ACT-order.create_from_appointment | `order.create_from_appointment` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:700 | 023b | MỘT PHẦN | packages/core/src/sales/orders/actions/order-from-appointment.handler.ts:18; test booking.test.ts; thiếu preview (DC-224) |
| ACT-appointment.find_slots | `appointment.find_slots` (read) — handler qua ActionExecutor | plans/BLUEPRINT.md:724 | 033 | ĐẠT | packages/core/src/booking/actions/appointment-book.handlers.ts:43; test agents.test.ts |
| ACT-appointment.list | `appointment.list` (read) — handler qua ActionExecutor | plans/BLUEPRINT.md:725 | 033 | ĐẠT | packages/core/src/booking/actions/appointment-book.handlers.ts:58; test task-catalog.test.ts |
| ACT-appointment.create | `appointment.create` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:726 | 023b | MỘT PHẦN | packages/core/src/booking/actions/appointment-book.handlers.ts:84; test booking.test.ts; thiếu preview (DC-224) |
| ACT-appointment.confirm | `appointment.confirm` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:727 | 023b | MỘT PHẦN | packages/core/src/booking/actions/appointment-flow.handlers.ts:52; test booking.test.ts, appointment-state.test.ts; thiếu preview (DC-224) |
| ACT-appointment.reschedule | `appointment.reschedule` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:728 | 023b | MỘT PHẦN | packages/core/src/booking/actions/appointment-book.handlers.ts:154; test booking.test.ts, appointment-state.test.ts; thiếu preview (DC-224) |
| ACT-appointment.cancel | `appointment.cancel` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:729 | 023b | MỘT PHẦN | packages/core/src/booking/actions/appointment-flow.handlers.ts:136; test booking.test.ts, appointment-state.test.ts; thiếu preview (DC-224) |
| ACT-appointment.check_in | `appointment.check_in` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:730 | 023b | MỘT PHẦN | packages/core/src/booking/actions/appointment-flow.handlers.ts:69; test booking.test.ts, appointment-state.test.ts; thiếu preview (DC-224) |
| ACT-appointment.complete | `appointment.complete` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:731 | 023b | MỘT PHẦN | packages/core/src/booking/actions/appointment-flow.handlers.ts:86; test booking.test.ts, appointment-state.test.ts; thiếu preview (DC-224) |
| ACT-appointment.mark_no_show | `appointment.mark_no_show` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:732 | 023b | MỘT PHẦN | packages/core/src/booking/actions/appointment-flow.handlers.ts:115; test booking.test.ts; thiếu preview (DC-224) |
| ACT-product.create | `product.create` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:659 | 023b | MỘT PHẦN | packages/core/src/catalog/actions/product.handlers.ts:24; test booking.test.ts, catalog.test.ts; thiếu preview (DC-224) |
| ACT-product.update | `product.update` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:660 | 023b | MỘT PHẦN | packages/core/src/catalog/actions/product.handlers.ts:77; test catalog.test.ts; thiếu preview (DC-224) |
| ACT-product.archive | `product.archive` (delete) — handler qua ActionExecutor | plans/BLUEPRINT.md:661 | 023b | MỘT PHẦN | packages/core/src/catalog/actions/product.handlers.ts:126; test catalog.test.ts; thiếu preview (DC-224) |
| ACT-category.create | `category.create` (config) — handler qua ActionExecutor | plans/BLUEPRINT.md:665 | 023b | MỘT PHẦN | packages/core/src/catalog/actions/stock.handlers.ts:15; KHÔNG có test nào gọi action; thiếu preview — test thiếu: TIP nào nhận chưa rõ |
| ACT-stock.adjust | `stock.adjust` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:653 | 023b | MỘT PHẦN | packages/core/src/catalog/actions/stock.handlers.ts:28; test catalog.test.ts; thiếu preview (DC-224) |
| ACT-product.search | `product.search` (read) — handler qua ActionExecutor | plans/BLUEPRINT.md:657 | 027 | ĐẠT | packages/core/src/catalog/actions/read.handlers.ts:30; test ai-tasks.test.ts, catalog.test.ts |
| ACT-product.get | `product.get` (read) — handler qua ActionExecutor | plans/BLUEPRINT.md:658 | 027 | ĐẠT | packages/core/src/catalog/actions/read.handlers.ts:42; test catalog.test.ts |
| ACT-stock.get | `stock.get` (read) — handler qua ActionExecutor | plans/BLUEPRINT.md:663 | 027 | ĐẠT | packages/core/src/catalog/actions/read.handlers.ts:68; test catalog.test.ts |
| ACT-contract.create | `contract.create` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:680 | 023b | MỘT PHẦN | packages/core/src/contracts/actions/contract-write.handlers.ts:64; test contracts.test.ts, orders.test.ts; thiếu preview (DC-224) |
| ACT-contract.create_from_quote | `contract.create_from_quote` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:681 | 023b | MỘT PHẦN | packages/core/src/contracts/actions/contract-write.handlers.ts:83; test contracts.test.ts; thiếu preview (DC-224) |
| ACT-contract.update | `contract.update` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:682 | 023b | MỘT PHẦN | packages/core/src/contracts/actions/contract-write.handlers.ts:115; test contracts.test.ts, contract-state.test.ts; thiếu preview (DC-224) |
| ACT-contract.submit | `contract.submit` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:683 | 023b | MỘT PHẦN | packages/core/src/contracts/actions/contract-approval.handlers.ts:25; test contracts.test.ts, contract-state.test.ts; thiếu preview (DC-224) |
| ACT-contract.approve_and_sign | `contract.approve_and_sign` (money) — handler qua ActionExecutor | plans/BLUEPRINT.md:684 | 030 | ĐẠT | packages/core/src/contracts/actions/contract-approval.handlers.ts:99; test contracts.test.ts, contract-state.test.ts |
| ACT-contract.request_changes | `contract.request_changes` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:685 | 023b | MỘT PHẦN | packages/core/src/contracts/actions/contract-approval.handlers.ts:64; test contracts.test.ts, contract-state.test.ts; thiếu preview (DC-224) |
| ACT-contract.reject_internal | `contract.reject_internal` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:685 | 023b | MỘT PHẦN | packages/core/src/contracts/actions/contract-approval.handlers.ts:77; test contract-state.test.ts; thiếu preview (DC-224) |
| ACT-contract.send_for_signature | `contract.send_for_signature` (send) — handler qua ActionExecutor | plans/BLUEPRINT.md:686 | 030 | ĐẠT | packages/core/src/contracts/actions/contract-send.handlers.ts:38; test contracts.test.ts, contract-state.test.ts |
| ACT-contract.remind_signer | `contract.remind_signer` (send) — handler qua ActionExecutor | plans/BLUEPRINT.md:687 | 023b | MỘT PHẦN | packages/core/src/contracts/actions/contract-send.handlers.ts:98; test contracts.test.ts, contract-state.test.ts; thiếu preview (DC-224) |
| ACT-contract.extend_sign_link | `contract.extend_sign_link` (send) — handler qua ActionExecutor | plans/BLUEPRINT.md:687 | 023b | MỘT PHẦN | packages/core/src/contracts/actions/contract-send.handlers.ts:122; test contracts.test.ts, contract-state.test.ts; thiếu preview (DC-224) |
| ACT-contract.terminate | `contract.terminate` (money) — handler qua ActionExecutor | plans/BLUEPRINT.md:688 | 023b | MỘT PHẦN | packages/core/src/contracts/actions/contract-send.handlers.ts:154; test contracts.test.ts, contract-state.test.ts; thiếu preview (DC-224) |
| ACT-contract.renew | `contract.renew` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:689 | 023b | MỘT PHẦN | packages/core/src/contracts/actions/contract-write.handlers.ts:170; test contracts.test.ts; thiếu preview (DC-224) |
| ACT-contract.delete | `contract.delete` (delete) — handler qua ActionExecutor | 02-TASK-GRAPH.md:168 | 023b | MỘT PHẦN | packages/core/src/contracts/actions/contract-write.handlers.ts:150; test contracts.test.ts, contract-state.test.ts; thiếu preview (DC-224) — không có trong Blueprint §3.4 (chưa bổ sung) |
| ACT-contact.search | `contact.search` (read) — handler qua ActionExecutor | plans/BLUEPRINT.md:633 | 015 | ĐẠT | packages/core/src/crm/actions/contact-search.handler.ts:12; test assistant.test.ts, ai-unit.test.ts |
| ACT-contact.create | `contact.create` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:635 | 023b | MỘT PHẦN | packages/core/src/crm/actions/contact-write.handlers.ts:32; test agent-reply.test.ts, agents-ui.test.ts; thiếu preview (DC-224) |
| ACT-contact.update | `contact.update` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:636 | 023b | MỘT PHẦN | packages/core/src/crm/actions/contact-write.handlers.ts:59; test ai-tasks.test.ts, assistant.test.ts; thiếu preview (DC-224) |
| ACT-contact.set_stage | `contact.set_stage` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:627 | 023b | MỘT PHẦN | packages/core/src/crm/actions/contact-write.handlers.ts:89; test crm-contacts.test.ts, crm-ui.test.ts; thiếu preview (DC-224) |
| ACT-contact.tag | `contact.tag` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:638 | 023b | MỘT PHẦN | packages/core/src/crm/actions/contact-write.handlers.ts:131; test crm-contacts.test.ts, crm-ui.test.ts; thiếu preview (DC-224) |
| ACT-contact.delete | `contact.delete` (delete) — handler qua ActionExecutor | plans/BLUEPRINT.md:647 | 023b | MỘT PHẦN | packages/core/src/crm/actions/contact-write.handlers.ts:154; test crm-contacts.test.ts, engine.test.ts; thiếu preview (DC-224) |
| ACT-contact.merge | `contact.merge` (write, bulk) — handler qua ActionExecutor | plans/BLUEPRINT.md:643 | 015 | ĐẠT | packages/core/src/crm/actions/contact-merge.handler.ts:40; test crm-contacts.test.ts |
| ACT-contact.add_collaborator | `contact.add_collaborator` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:644 | 023b | MỘT PHẦN | packages/core/src/crm/actions/contact-owner.handlers.ts:20; test crm-contacts.test.ts, inbox.test.ts; thiếu preview (DC-224) |
| ACT-contact.remove_collaborator | `contact.remove_collaborator` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:644 | 023b | MỘT PHẦN | packages/core/src/crm/actions/contact-owner.handlers.ts:56; test crm-contacts.test.ts; thiếu preview (DC-224) |
| ACT-contact.transfer_owner | `contact.transfer_owner` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:645 | 023b | MỘT PHẦN | packages/core/src/crm/actions/contact-owner.handlers.ts:81; test crm-contacts.test.ts, crm-ui.test.ts; thiếu preview (DC-224) |
| ACT-contact.request_access | `contact.request_access` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:646 | 023b | MỘT PHẦN | packages/core/src/crm/actions/contact-owner.handlers.ts:125; test crm-contacts.test.ts, crm-ui.test.ts; thiếu preview (DC-224) |
| ACT-contact.decide_access | `contact.decide_access` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:646 | 023b | MỘT PHẦN | packages/core/src/crm/actions/contact-owner.handlers.ts:158; test crm-contacts.test.ts, crm-ui.test.ts; thiếu preview (DC-224) |
| ACT-custom_field.define | `custom_field.define` (config) — handler qua ActionExecutor | plans/BLUEPRINT.md:651 | 023b | MỘT PHẦN | packages/core/src/crm/actions/custom-field.handlers.ts:14; test crm-settings.test.ts; thiếu preview (DC-224) |
| ACT-custom_field.update | `custom_field.update` (config) — handler qua ActionExecutor | plans/BLUEPRINT.md:651 | 023b | MỘT PHẦN | packages/core/src/crm/actions/custom-field.handlers.ts:27; test crm-settings.test.ts; thiếu preview (DC-224) |
| ACT-contact.send_email | `contact.send_email` (send) — handler qua ActionExecutor | plans/BLUEPRINT.md:640 | 023b | MỘT PHẦN | packages/core/src/inbox/actions/email-send.handlers.ts:23; test agent-reply.test.ts, agents.test.ts; thiếu preview (DC-224) — code agentGrantable ✓, BP không |
| ACT-custom_field.delete | `custom_field.delete` (delete) — handler qua ActionExecutor | plans/BLUEPRINT.md:651 | 023b | MỘT PHẦN | packages/core/src/crm/actions/custom-field.handlers.ts:67; test crm-settings.test.ts; thiếu preview (DC-224) — risk code=delete, BP=config |
| ACT-contact.import | `contact.import` (write, bulk) — handler qua ActionExecutor | plans/BLUEPRINT.md:648 | 015 | ĐẠT | packages/core/src/crm/actions/contact-io.handlers.ts:57; test crm-settings.test.ts |
| ACT-contact.export | `contact.export` (read) — handler qua ActionExecutor | plans/BLUEPRINT.md:649 | 015 | ĐẠT | packages/core/src/crm/actions/contact-io.handlers.ts:20; test crm-settings.test.ts, crm-ui.test.ts — BP 'luôn preview' — handler không preview |
| ACT-onboarding.toggle_step | `onboarding.toggle_step` (write) — handler qua ActionExecutor | 02-TASK-GRAPH.md:168 | 023b | MỘT PHẦN | packages/core/src/identity/actions/onboarding-toggle-step.handler.ts:12; test onboarding.test.ts; thiếu preview (DC-224) — không có trong Blueprint §3.4 (chưa bổ sung) |
| ACT-follow_up.complete | `follow_up.complete` (write) — handler qua ActionExecutor | 02-TASK-GRAPH.md:168 | 038 | CHƯA | packages/actions/src/dashboard.ts:21 chỉ ActionDef, handler null → 501 NOT_IMPLEMENTED (tip-owners.ts) — không có trong Blueprint §3.4 (chưa bổ sung) |
| ACT-doc_template.create | `doc_template.create` (config) — handler qua ActionExecutor, undo 24h | plans/BLUEPRINT.md:691 | — | MỘT PHẦN | TIP028 đã có create handler (packages/core/src/documents/actions/doc-template.handlers.ts:26) và documents.test.ts; packages/actions/src/documents.ts:11–33 không khai báo undo, create handler không có undo như update/delete (:99/:129). Thiếu contract undo 24h; cần TIP bổ sung nhận, không đánh ĐẠT theo CRUD đơn thuần. |
| ACT-doc_template.update | `doc_template.update` (config) — handler qua ActionExecutor | plans/BLUEPRINT.md:691 | 023b | MỘT PHẦN | packages/core/src/documents/actions/doc-template.handlers.ts:60; test documents.test.ts; thiếu preview (DC-224) |
| ACT-doc_template.delete | `doc_template.delete` (delete) — handler qua ActionExecutor | plans/BLUEPRINT.md:691 | 028 | ĐẠT | packages/core/src/documents/actions/doc-template.handlers.ts:113; test documents.test.ts — risk code=delete, BP=config |
| ACT-doc_template.detect_fields | `doc_template.detect_fields` (read) — handler qua ActionExecutor | plans/BLUEPRINT.md:692 | 028 | ĐẠT | packages/core/src/documents/actions/doc-template.handlers.ts:138; test documents.test.ts |
| ACT-notification.mark_read | `notification.mark_read` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:579 | 023b | MỘT PHẦN | packages/core/src/notify/actions/notification-mark-read.handler.ts:13; test actions.test.ts, workspaces.test.ts; thiếu preview (DC-224) |
| ACT-profile.update | `profile.update` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:576 | 023b | MỘT PHẦN | packages/core/src/identity/actions/profile-update.handler.ts:11; test workspaces.test.ts; thiếu preview (DC-224) |
| ACT-workspace.switch | `workspace.switch` (write) — handler qua ActionExecutor | 02-TASK-GRAPH.md:168 | 023b | MỘT PHẦN | packages/core/src/identity/actions/workspace-switch.handler.ts:12; test workspaces.test.ts, assistant-unit.test.ts; thiếu preview (DC-224) — không có trong Blueprint §3.4 (chưa bổ sung) |
| ACT-conversation.mark_read | `conversation.mark_read` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:611 | 023b | MỘT PHẦN | packages/core/src/inbox/actions/conversation-state.handlers.ts:26; test inbox-ui.test.ts, inbox.test.ts; thiếu preview (DC-224) |
| ACT-conversation.set_status | `conversation.set_status` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:608 | 023b | MỘT PHẦN | packages/core/src/inbox/actions/conversation-state.handlers.ts:41; test inbox.test.ts; thiếu preview (DC-224) |
| ACT-conversation.assign | `conversation.assign` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:604 | 023b | MỘT PHẦN | packages/core/src/inbox/actions/conversation-assign.handlers.ts:23; test inbox-ui.test.ts, inbox.test.ts; thiếu preview (DC-224) |
| ACT-conversation.tag | `conversation.tag` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:606 | 023b | MỘT PHẦN | packages/core/src/inbox/actions/conversation-assign.handlers.ts:47; test agent-reply.test.ts, inbox.test.ts; thiếu preview (DC-224) |
| ACT-conversation.pin | `conversation.pin` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:609 | 023b | MỘT PHẦN | packages/core/src/inbox/actions/conversation-state.handlers.ts:58; test inbox.test.ts; thiếu preview (DC-224) |
| ACT-conversation.archive | `conversation.archive` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:610 | 023b | MỘT PHẦN | packages/core/src/inbox/actions/conversation-state.handlers.ts:68; test inbox.test.ts; thiếu preview (DC-224) |
| ACT-conversation.set_ai_mode | `conversation.set_ai_mode` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:605 | 023b | MỘT PHẦN | packages/core/src/inbox/actions/conversation-state.handlers.ts:96; test inbox.test.ts; thiếu preview (DC-224) |
| ACT-conversation.handoff | `conversation.handoff` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:613 | 023b | MỘT PHẦN | packages/core/src/inbox/actions/conversation-state.handlers.ts:110; test agents.test.ts, inbox.test.ts; thiếu preview (DC-224) |
| ACT-conversation.clear_history | `conversation.clear_history` (delete) — handler qua ActionExecutor | plans/BLUEPRINT.md:622 | 023b | MỘT PHẦN | packages/core/src/inbox/actions/conversation-state.handlers.ts:125; test inbox.test.ts; thiếu preview (DC-224) — code có undo 24h, BP không |
| ACT-message.send | `message.send` (send) — handler qua ActionExecutor | plans/BLUEPRINT.md:614 | 023b | MỘT PHẦN | packages/core/src/inbox/actions/message.handlers.ts:41; test agent-reply.test.ts, ai-tasks.test.ts; thiếu preview (DC-224) |
| ACT-message.recall | `message.recall` (send) — handler qua ActionExecutor | plans/BLUEPRINT.md:615 | 023b | MỘT PHẦN | packages/core/src/inbox/actions/message.handlers.ts:100; test inbox.test.ts; thiếu preview (DC-224) |
| ACT-message.delete | `message.delete` (delete) — handler qua ActionExecutor | plans/BLUEPRINT.md:616 | 023b | MỘT PHẦN | packages/core/src/inbox/actions/message.handlers.ts:115; test inbox.test.ts; thiếu preview (DC-224) |
| ACT-message.react | `message.react` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:617 | 023b | MỘT PHẦN | packages/core/src/inbox/actions/message.handlers.ts:139; test inbox.test.ts; thiếu preview (DC-224) |
| ACT-message.pin | `message.pin` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:618 | 023b | MỘT PHẦN | packages/core/src/inbox/actions/message.handlers.ts:161; test inbox.test.ts; thiếu preview (DC-224) |
| ACT-message.forward | `message.forward` (send) — handler qua ActionExecutor | plans/BLUEPRINT.md:619 | 023b | MỘT PHẦN | packages/core/src/inbox/actions/message.handlers.ts:76; test inbox.test.ts; thiếu preview (DC-224) |
| ACT-conversation.set_tags | `conversation.set_tags` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:620 | 023b | MỘT PHẦN | packages/core/src/inbox/actions/conversation-assign.handlers.ts:66; test inbox.test.ts; thiếu preview (DC-224) |
| ACT-conversation.hide | `conversation.hide` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:621 | 023b | MỘT PHẦN | packages/core/src/inbox/actions/conversation-state.handlers.ts:82; test inbox.test.ts; thiếu preview (DC-224) |
| ACT-note.add | `note.add` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:623 | 023b | MỘT PHẦN | packages/core/src/inbox/actions/message.handlers.ts:174; test inbox-ui.test.ts, inbox.test.ts; thiếu preview (DC-224) |
| ACT-conversation.bulk_update | `conversation.bulk_update` (write, bulk) — handler qua ActionExecutor | plans/BLUEPRINT.md:612 | 016 | ĐẠT | packages/core/src/inbox/actions/conversation-assign.handlers.ts:100; test inbox.test.ts |
| ACT-invoice.create | `invoice.create` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:707 | 023b | MỘT PHẦN | packages/core/src/sales/payments/actions/invoice-write.handlers.ts:44; test booking.test.ts, payments.test.ts; thiếu preview (DC-224) |
| ACT-invoice.send_payment_qr | `invoice.send_payment_qr` (send) — handler qua ActionExecutor | plans/BLUEPRINT.md:708 | 032 | ĐẠT | packages/core/src/sales/payments/actions/invoice-write.handlers.ts:104; test payments.test.ts, agents-ui-unit.test.ts |
| ACT-invoice.record_payment | `invoice.record_payment` (money) — handler qua ActionExecutor | plans/BLUEPRINT.md:709 | 032 | ĐẠT | packages/core/src/sales/payments/actions/invoice-pay.handlers.ts:26; test booking.test.ts, payments.test.ts |
| ACT-invoice.resolve_bank_match | `invoice.resolve_bank_match` (money) — handler qua ActionExecutor | plans/BLUEPRINT.md:710 | 023b | MỘT PHẦN | packages/core/src/sales/payments/actions/invoice-pay.handlers.ts:55; test payments.test.ts; thiếu preview (DC-224) |
| ACT-invoice.void | `invoice.void` (money) — handler qua ActionExecutor | plans/BLUEPRINT.md:711 | 023b | MỘT PHẦN | packages/core/src/sales/payments/actions/invoice-write.handlers.ts:166; test payments.test.ts, invoice-state.test.ts; thiếu preview (DC-224) |
| ACT-loyalty.get_member | `loyalty.get_member` (read) — handler qua ActionExecutor | plans/BLUEPRINT.md:770 | 036 | CHƯA | packages/actions/src/loyalty.ts:9 chỉ ActionDef, handler null → 501 NOT_IMPLEMENTED (tip-owners.ts) |
| ACT-loyalty.adjust_points | `loyalty.adjust_points` (money) — handler qua ActionExecutor | plans/BLUEPRINT.md:772 | 036 | CHƯA | packages/actions/src/loyalty.ts:23 chỉ ActionDef, handler null → 501 NOT_IMPLEMENTED (tip-owners.ts) |
| ACT-loyalty.update_config | `loyalty.update_config` (config) — handler qua ActionExecutor | plans/BLUEPRINT.md:771 | 036 | CHƯA | packages/actions/src/loyalty.ts:43 chỉ ActionDef, handler null → 501 NOT_IMPLEMENTED (tip-owners.ts) |
| ACT-segment.preview | `segment.preview` (read) — handler qua ActionExecutor | plans/BLUEPRINT.md:755 | 037 | CHƯA | packages/actions/src/marketing.ts:23 chỉ ActionDef, handler null → 501 NOT_IMPLEMENTED (tip-owners.ts) — code agentGrantable ✓, BP không |
| ACT-campaign.suggest | `campaign.suggest` (read) — handler qua ActionExecutor | plans/BLUEPRINT.md:757 | 037 | CHƯA | packages/actions/src/marketing.ts:37 chỉ ActionDef, handler null → 501 NOT_IMPLEMENTED (tip-owners.ts) — code agentGrantable ✓, BP không |
| ACT-campaign.create | `campaign.create` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:758 | 037 | CHƯA | packages/actions/src/marketing.ts:51 chỉ ActionDef, handler null → 501 NOT_IMPLEMENTED (tip-owners.ts) |
| ACT-campaign.update | `campaign.update` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:759 | 037 | CHƯA | packages/actions/src/marketing.ts:78 chỉ ActionDef, handler null → 501 NOT_IMPLEMENTED (tip-owners.ts) |
| ACT-campaign.submit | `campaign.submit` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:760 | 037 | CHƯA | packages/actions/src/marketing.ts:96 chỉ ActionDef, handler null → 501 NOT_IMPLEMENTED (tip-owners.ts) |
| ACT-campaign.send_test | `campaign.send_test` (send) — handler qua ActionExecutor | plans/BLUEPRINT.md:761 | 037 | CHƯA | packages/actions/src/marketing.ts:110 chỉ ActionDef, handler null → 501 NOT_IMPLEMENTED (tip-owners.ts) |
| ACT-campaign.approve | `campaign.approve` (send, bulk) — handler qua ActionExecutor | plans/BLUEPRINT.md:751 | 037 | CHƯA | packages/actions/src/marketing.ts:123 chỉ ActionDef, handler null → 501 NOT_IMPLEMENTED (tip-owners.ts) |
| ACT-campaign.reject | `campaign.reject` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:763 | 037 | CHƯA | packages/actions/src/marketing.ts:137 chỉ ActionDef, handler null → 501 NOT_IMPLEMENTED (tip-owners.ts) |
| ACT-campaign.pause | `campaign.pause` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:764 | 037 | CHƯA | packages/actions/src/marketing.ts:150 chỉ ActionDef, handler null → 501 NOT_IMPLEMENTED (tip-owners.ts) |
| ACT-campaign.resume | `campaign.resume` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:765 | 037 | CHƯA | packages/actions/src/marketing.ts:163 chỉ ActionDef, handler null → 501 NOT_IMPLEMENTED (tip-owners.ts) |
| ACT-campaign.cancel | `campaign.cancel` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:766 | 037 | CHƯA | packages/actions/src/marketing.ts:176 chỉ ActionDef, handler null → 501 NOT_IMPLEMENTED (tip-owners.ts) |
| ACT-campaign.delete | `campaign.delete` (delete) — handler qua ActionExecutor | plans/BLUEPRINT.md:767 | 037 | CHƯA | packages/actions/src/marketing.ts:189 chỉ ActionDef, handler null → 501 NOT_IMPLEMENTED (tip-owners.ts) |
| ACT-business_profile.update | `business_profile.update` (config) — handler qua ActionExecutor | plans/BLUEPRINT.md:571 | 023b | MỘT PHẦN | packages/core/src/identity/actions/business-profile-update.handler.ts:14; test billing.test.ts, onboarding.test.ts; thiếu preview (DC-224) |
| ACT-order.create | `order.create` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:698 | 023b | MỘT PHẦN | packages/core/src/sales/orders/actions/order-create.handlers.ts:101; test ai-tasks.test.ts, booking.test.ts; thiếu preview (DC-224) |
| ACT-order.create_from_quote | `order.create_from_quote` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:699 | 023b | MỘT PHẦN | packages/core/src/sales/orders/actions/order-create.handlers.ts:123; test orders.test.ts; thiếu preview (DC-224) |
| ACT-order.create_from_contract | `order.create_from_contract` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:697 | 023b | MỘT PHẦN | packages/core/src/sales/orders/actions/order-create.handlers.ts:166; test orders.test.ts; thiếu preview (DC-224) |
| ACT-order.update | `order.update` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:701 | 023b | MỘT PHẦN | packages/core/src/sales/orders/actions/order-edit.handlers.ts:77; test orders.test.ts, order-state.test.ts; thiếu preview (DC-224) |
| ACT-order.set_deposit | `order.set_deposit` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:702 | 023b | MỘT PHẦN | packages/core/src/sales/orders/actions/order-edit.handlers.ts:137; test orders.test.ts, order-state.test.ts; thiếu preview (DC-224) |
| ACT-order.confirm | `order.confirm` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:703 | 023b | MỘT PHẦN | packages/core/src/sales/orders/actions/order-flow.handlers.ts:62; test booking.test.ts, orders.test.ts; thiếu preview (DC-224) |
| ACT-order.complete | `order.complete` (money) — handler qua ActionExecutor | plans/BLUEPRINT.md:704 | 031 | ĐẠT | packages/core/src/sales/orders/actions/order-flow.handlers.ts:92; test orders.test.ts, order-state.test.ts |
| ACT-order.cancel | `order.cancel` (money) — handler qua ActionExecutor | plans/BLUEPRINT.md:705 | 031 | ĐẠT | packages/core/src/sales/orders/actions/order-flow.handlers.ts:122; test orders.test.ts, payments.test.ts |
| ACT-order.update_shipping | `order.update_shipping` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:706 | 023b | MỘT PHẦN | packages/core/src/sales/orders/actions/order-edit.handlers.ts:161; test orders.test.ts, order-state.test.ts; thiếu preview (DC-224) |
| ACT-order.sync_now | `order.sync_now` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:696 | 023b | MỘT PHẦN | packages/core/src/sales/orders/actions/order-sync.handler.ts:13; test orders.test.ts; thiếu preview (DC-224) |
| ACT-payment.refund | `payment.refund` (money) — handler qua ActionExecutor | plans/BLUEPRINT.md:712 | 032 | ĐẠT | packages/core/src/sales/payments/actions/refund.handlers.ts:29; test payments.test.ts |
| ACT-payment.refund_approve | `payment.refund_approve` (money) — handler qua ActionExecutor | plans/BLUEPRINT.md:667 | 032 | ĐẠT | packages/core/src/sales/payments/actions/refund.handlers.ts:90; test authz.test.ts, payments.test.ts |
| ACT-payment.refund_reject | `payment.refund_reject` (write) — handler qua ActionExecutor | 02-TASK-GRAPH.md:168 | 023b | MỘT PHẦN | packages/core/src/sales/payments/actions/refund.handlers.ts:112; test payments.test.ts; thiếu preview (DC-224) — không có trong Blueprint §3.4 (chưa bổ sung) |
| ACT-package.extend | `package.extend` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:714 | 023b | MỘT PHẦN | packages/core/src/sales/payments/actions/package.handlers.ts:45; test payments.test.ts; thiếu preview (DC-224) |
| ACT-package.adjust_sessions | `package.adjust_sessions` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:715 | 023b | MỘT PHẦN | packages/core/src/sales/payments/actions/package.handlers.ts:75; test payments.test.ts; thiếu preview (DC-224) |
| ACT-payment_account.update | `payment_account.update` (config) — handler qua ActionExecutor | plans/BLUEPRINT.md:717 | 023b | MỘT PHẦN | packages/core/src/sales/payments/actions/finance-config.handlers.ts:26; test payments.test.ts; thiếu preview (DC-224) |
| ACT-bank_feed.connect | `bank_feed.connect` (config) — handler qua ActionExecutor | plans/BLUEPRINT.md:718 | 023b | MỘT PHẦN | packages/core/src/sales/payments/actions/finance-config.handlers.ts:40; test payments.test.ts; thiếu preview (DC-224) |
| ACT-bank_feed.disconnect | `bank_feed.disconnect` (config) — handler qua ActionExecutor | plans/BLUEPRINT.md:718 | 023b | MỘT PHẦN | packages/core/src/sales/payments/actions/finance-config.handlers.ts:65; test payments.test.ts; thiếu preview (DC-224) |
| ACT-admin.invoice.confirm_transfer | `admin.invoice.confirm_transfer` (money) — handler qua ActionExecutor | plans/BLUEPRINT.md:815 | 023b | MỘT PHẦN | packages/core/src/billing/actions/admin-confirm-transfer.handler.ts:15; test billing-payments.test.ts, assistant-unit.test.ts; thiếu preview (DC-224) |
| ACT-quote.create | `quote.create` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:671 | 023b | MỘT PHẦN | packages/core/src/sales/quotes/actions/quote-write.handlers.ts:63; test ai-tasks.test.ts, contracts.test.ts; thiếu preview (DC-224) |
| ACT-quote.update | `quote.update` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:672 | 023b | MỘT PHẦN | packages/core/src/sales/quotes/actions/quote-write.handlers.ts:85; test quotes.test.ts, quote-state.test.ts; thiếu preview (DC-224) |
| ACT-quote.delete | `quote.delete` (delete) — handler qua ActionExecutor | 02-TASK-GRAPH.md:168 | 029 | ĐẠT | packages/core/src/sales/quotes/actions/quote-write.handlers.ts:126; test quotes.test.ts, quote-state.test.ts — không có trong Blueprint §3.4 (chưa bổ sung) |
| ACT-quote.submit_for_approval | `quote.submit_for_approval` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:673 | 023b | MỘT PHẦN | packages/core/src/sales/quotes/actions/quote-approval.handlers.ts:19; test quotes.test.ts, quote-state.test.ts; thiếu preview (DC-224) |
| ACT-quote.approve | `quote.approve` (money) — handler qua ActionExecutor | plans/BLUEPRINT.md:674 | 023b | MỘT PHẦN | packages/core/src/sales/quotes/actions/quote-approval.handlers.ts:54; test agents.test.ts, quotes.test.ts; thiếu preview (DC-224) |
| ACT-quote.reject_internal | `quote.reject_internal` (money) — handler qua ActionExecutor | plans/BLUEPRINT.md:674 | 023b | MỘT PHẦN | packages/core/src/sales/quotes/actions/quote-approval.handlers.ts:67; test quote-state.test.ts; thiếu preview (DC-224) |
| ACT-quote.send | `quote.send` (send) — handler qua ActionExecutor | plans/BLUEPRINT.md:675 | 029 | ĐẠT | packages/core/src/sales/quotes/actions/quote-send.handlers.ts:36; test contracts.test.ts, quotes.test.ts |
| ACT-quote.request_revision | `quote.request_revision` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:676 | 023b | MỘT PHẦN | packages/core/src/sales/quotes/actions/quote-decide.handlers.ts:82; test quotes.test.ts, quote-state.test.ts; thiếu preview (DC-224) |
| ACT-quote.mark_accepted | `quote.mark_accepted` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:677 | 023b | MỘT PHẦN | packages/core/src/sales/quotes/actions/quote-decide.handlers.ts:42; test contracts.test.ts, quotes.test.ts; thiếu preview (DC-224) |
| ACT-quote.mark_rejected | `quote.mark_rejected` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:678 | 023b | MỘT PHẦN | packages/core/src/sales/quotes/actions/quote-decide.handlers.ts:61; test quotes.test.ts, quote-state.test.ts; thiếu preview (DC-224) |
| ACT-quote.extend_validity | `quote.extend_validity` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:679 | 023b | MỘT PHẦN | packages/core/src/sales/quotes/actions/quote-send.handlers.ts:108; test quotes.test.ts, quote-state.test.ts; thiếu preview (DC-224) |
| ACT-quote.comment | `quote.comment` (write) — handler qua ActionExecutor | 02-TASK-GRAPH.md:168 | 023b | MỘT PHẦN | packages/core/src/sales/quotes/actions/quote-write.handlers.ts:158; KHÔNG có test nào gọi action; thiếu preview — không có trong Blueprint §3.4 (chưa bổ sung); test thiếu: TIP nào nhận chưa rõ |
| ACT-quote.draft_from_content | `quote.draft_from_content` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:693 | 023b | MỘT PHẦN | packages/core/src/sales/quotes/actions/quote-draft.handler.ts:21; test quotes.test.ts; thiếu preview (DC-224) |
| ACT-ai_settings.update | `ai_settings.update` (config) — handler qua ActionExecutor | 02-TASK-GRAPH.md:168 | 023b | MỘT PHẦN | packages/core/src/ai/settings/ai-settings.handlers.ts:20; test ai-runtime.test.ts; thiếu preview (DC-224) — không có trong Blueprint §3.4 (chưa bổ sung) |
| ACT-kb.add_source | `kb.add_source` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:789 | 023b | MỘT PHẦN | packages/core/src/ai/kb/kb.handlers.ts:33; test agent-reply.test.ts, kb.test.ts; thiếu preview (DC-224) |
| ACT-kb.update_source | `kb.update_source` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:790 | 023b | MỘT PHẦN | packages/core/src/ai/kb/kb.handlers.ts:92; test kb.test.ts; thiếu preview (DC-224) |
| ACT-kb.search | `kb.search` (read) — handler qua ActionExecutor | plans/BLUEPRINT.md:788 | 020 | ĐẠT | packages/core/src/ai/kb/kb-search.handler.ts:21; test agent-reply.test.ts, agents.test.ts |
| ACT-kb.remove_source | `kb.remove_source` (delete) — handler qua ActionExecutor | plans/BLUEPRINT.md:791 | 023b | MỘT PHẦN | packages/core/src/ai/kb/kb.handlers.ts:117; test kb.test.ts; thiếu preview (DC-224) |
| ACT-kb.refresh_source | `kb.refresh_source` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:792 | 023b | MỘT PHẦN | packages/core/src/ai/kb/kb.handlers.ts:137; test kb.test.ts; thiếu preview (DC-224) |
| ACT-kb.folder.create | `kb.folder.create` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:793 | 023b | MỘT PHẦN | packages/core/src/ai/kb/kb.handlers.ts:160; test kb.test.ts; thiếu preview (DC-224) |
| ACT-governance.update | `governance.update` (config) — handler qua ActionExecutor | plans/BLUEPRINT.md:800 | 023b | MỘT PHẦN | packages/core/src/ai/governance/governance.ts:77; test agent-reply.test.ts, agents.test.ts; thiếu preview (DC-224) |
| ACT-billing.create_invoice | `billing.create_invoice` (money) — handler qua ActionExecutor | plans/BLUEPRINT.md:803 | 023b | MỘT PHẦN | packages/core/src/billing/actions/billing-create-invoice.handler.ts:14; test billing-payments.test.ts, assistant-unit.test.ts; thiếu preview (DC-224) |
| ACT-billing.cancel_invoice | `billing.cancel_invoice` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:804 | 023b | MỘT PHẦN | packages/core/src/billing/actions/billing-cancel-invoice.handler.ts:13; test billing-payments.test.ts; thiếu preview (DC-224) |
| ACT-billing.report_transfer | `billing.report_transfer` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:805 | 023b | MỘT PHẦN | packages/core/src/billing/actions/billing-report-transfer.handler.ts:15; test billing-payments.test.ts; thiếu preview (DC-224) |
| ACT-wallet.update_alerts | `wallet.update_alerts` (config) — handler qua ActionExecutor | 02-TASK-GRAPH.md:168 | 039 | CHƯA | packages/actions/src/settings-ai.ts:201 chỉ ActionDef, handler null → 501 NOT_IMPLEMENTED (tip-owners.ts) — không có trong Blueprint §3.4 (chưa bổ sung) |
| ACT-tag.create | `tag.create` (config) — handler qua ActionExecutor | plans/BLUEPRINT.md:620 | 016 | ĐẠT | packages/core/src/inbox/actions/settings.handlers.ts:39; test inbox.test.ts, actions-unit.test.ts |
| ACT-tag.update | `tag.update` (config) — handler qua ActionExecutor | plans/BLUEPRINT.md:625 | 023b | MỘT PHẦN | packages/core/src/inbox/actions/settings.handlers.ts:59; KHÔNG có test nào gọi action; thiếu preview — test thiếu: TIP nào nhận chưa rõ |
| ACT-tag.delete | `tag.delete` (delete) — handler qua ActionExecutor | plans/BLUEPRINT.md:625 | 023b | MỘT PHẦN | packages/core/src/inbox/actions/settings.handlers.ts:85; test inbox.test.ts, actions-unit.test.ts; thiếu preview (DC-224) — risk code=delete, BP=config |
| ACT-canned_reply.create | `canned_reply.create` (config) — handler qua ActionExecutor | plans/BLUEPRINT.md:624 | 023b | MỘT PHẦN | packages/core/src/inbox/actions/settings.handlers.ts:115; test inbox.test.ts; thiếu preview (DC-224) |
| ACT-canned_reply.update | `canned_reply.update` (config) — handler qua ActionExecutor | plans/BLUEPRINT.md:624 | 023b | MỘT PHẦN | packages/core/src/inbox/actions/settings.handlers.ts:129; KHÔNG có test nào gọi action; thiếu preview — test thiếu: TIP nào nhận chưa rõ |
| ACT-canned_reply.delete | `canned_reply.delete` (delete) — handler qua ActionExecutor | plans/BLUEPRINT.md:624 | 023b | MỘT PHẦN | packages/core/src/inbox/actions/settings.handlers.ts:143; KHÔNG có test nào gọi action; thiếu preview — risk code=delete, BP=config; test thiếu: TIP nào nhận chưa rõ |
| ACT-channel.zalo.start_login | `channel.zalo.start_login` (config) — handler qua ActionExecutor | plans/BLUEPRINT.md:587 | 023b | MỘT PHẦN | packages/core/src/channels/actions/channel-connect.handlers.ts:24; test agent-reply.test.ts, channels.test.ts; thiếu preview (DC-224) |
| ACT-channel.email.connect | `channel.email.connect` (config) — handler qua ActionExecutor | plans/BLUEPRINT.md:588 | 023b | MỘT PHẦN | packages/core/src/channels/email/email.handlers.ts:22; test email.test.ts, inbox-ui.test.ts; thiếu preview (DC-224) |
| ACT-channel.test | `channel.test` (read) — handler qua ActionExecutor | plans/BLUEPRINT.md:593 | 014 | ĐẠT | packages/core/src/channels/actions/channel-manage.handlers.ts:111; test channels.test.ts, email.test.ts |
| ACT-channel.update_settings | `channel.update_settings` (config) — handler qua ActionExecutor | plans/BLUEPRINT.md:589 | 023b | MỘT PHẦN | packages/core/src/channels/actions/channel-manage.handlers.ts:30; test agent-reply.test.ts, agents.test.ts; thiếu preview (DC-224) |
| ACT-channel.pause | `channel.pause` (config) — handler qua ActionExecutor | plans/BLUEPRINT.md:594 | 023b | MỘT PHẦN | packages/core/src/channels/actions/channel-manage.handlers.ts:50; test channels.test.ts, email.test.ts; thiếu preview (DC-224) |
| ACT-channel.resume | `channel.resume` (config) — handler qua ActionExecutor | plans/BLUEPRINT.md:594 | 023b | MỘT PHẦN | packages/core/src/channels/actions/channel-manage.handlers.ts:68; test channels.test.ts, email.test.ts; thiếu preview (DC-224) |
| ACT-channel.sync_history | `channel.sync_history` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:595 | 023b | MỘT PHẦN | packages/core/src/channels/actions/channel-manage.handlers.ts:88; test channels.test.ts; thiếu preview (DC-224) |
| ACT-channel.reconnect | `channel.reconnect` (config) — handler qua ActionExecutor | plans/BLUEPRINT.md:590 | 023b | MỘT PHẦN | packages/core/src/channels/actions/channel-connect.handlers.ts:56; test channels.test.ts; thiếu preview (DC-224) |
| ACT-channel.disconnect | `channel.disconnect` (delete) — handler qua ActionExecutor | plans/BLUEPRINT.md:591 | 023b | MỘT PHẦN | packages/core/src/channels/actions/channel-manage.handlers.ts:142; test channels.test.ts, email.test.ts; thiếu preview (DC-224) |
| ACT-webchat.update_widget | `webchat.update_widget` (config) — handler qua ActionExecutor | plans/BLUEPRINT.md:592 | 023b | MỘT PHẦN | packages/core/src/channels/webchat/webchat.handlers.ts:25; test agent-reply.test.ts, agents-ui.test.ts; thiếu preview (DC-224) |
| ACT-integration.connect | `integration.connect` (config) — handler qua ActionExecutor | plans/BLUEPRINT.md:584 | 023b | MỘT PHẦN | packages/core/src/integrations/actions/integration-connect.handler.ts:14; test integrations.test.ts, orders.test.ts; thiếu preview (DC-224) |
| ACT-integration.disconnect | `integration.disconnect` (delete) — handler qua ActionExecutor | plans/BLUEPRINT.md:584 | 023b | MỘT PHẦN | packages/core/src/integrations/actions/integration-disconnect.handler.ts:12; test integrations.test.ts; thiếu preview (DC-224) |
| ACT-integration.register_interest | `integration.register_interest` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:584 | 023b | MỘT PHẦN | packages/core/src/integrations/actions/integration-register-interest.handler.ts:13; test integrations.test.ts; thiếu preview (DC-224) |
| ACT-profile_layout.create | `profile_layout.create` (config) — handler qua ActionExecutor | plans/BLUEPRINT.md:578 | 023b | MỘT PHẦN | packages/core/src/crm/actions/profile-layout.handlers.ts:27; test crm-settings.test.ts; thiếu preview (DC-224) |
| ACT-profile_layout.update | `profile_layout.update` (config) — handler qua ActionExecutor | plans/BLUEPRINT.md:578 | 023b | MỘT PHẦN | packages/core/src/crm/actions/profile-layout.handlers.ts:42; test crm-settings.test.ts; thiếu preview (DC-224) |
| ACT-profile_layout.duplicate | `profile_layout.duplicate` (config) — handler qua ActionExecutor | plans/BLUEPRINT.md:578 | 023b | MỘT PHẦN | packages/core/src/crm/actions/profile-layout.handlers.ts:53; test crm-settings.test.ts; thiếu preview (DC-224) |
| ACT-profile_layout.delete | `profile_layout.delete` (delete) — handler qua ActionExecutor | plans/BLUEPRINT.md:578 | 023b | MỘT PHẦN | packages/core/src/crm/actions/profile-layout.handlers.ts:69; test crm-settings.test.ts; thiếu preview (DC-224) |
| ACT-profile_layout.assign_role | `profile_layout.assign_role` (config) — handler qua ActionExecutor | plans/BLUEPRINT.md:578 | 023b | MỘT PHẦN | packages/core/src/crm/actions/profile-layout.handlers.ts:82; test crm-settings.test.ts; thiếu preview (DC-224) |
| ACT-workspace.update | `workspace.update` (config) — handler qua ActionExecutor | plans/BLUEPRINT.md:570 | 023b | MỘT PHẦN | packages/core/src/identity/actions/workspace-update.handler.ts:15; test settings.test.ts; thiếu preview (DC-224) |
| ACT-member.invite | `member.invite` (send) — handler qua ActionExecutor | plans/BLUEPRINT.md:572 | 023b | MỘT PHẦN | packages/core/src/identity/actions/member-invite.handler.ts:16; test assistant.test.ts, settings.test.ts; thiếu preview (DC-224) |
| ACT-invite.revoke | `invite.revoke` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:575 | 023b | MỘT PHẦN | packages/core/src/identity/actions/invite-revoke.handler.ts:13; test settings.test.ts; thiếu preview (DC-224) |
| ACT-member.set_role | `member.set_role` (config) — handler qua ActionExecutor | plans/BLUEPRINT.md:574 | 023b | MỘT PHẦN | packages/core/src/identity/actions/member-set-role.handler.ts:19; test settings.test.ts; thiếu preview (DC-224) |
| ACT-member.remove | `member.remove` (delete) — handler qua ActionExecutor | plans/BLUEPRINT.md:573 | 023b | MỘT PHẦN | packages/core/src/identity/actions/member-remove.handler.ts:13; test settings.test.ts; thiếu preview (DC-224) |
| ACT-working_hours.update | `working_hours.update` (config) — handler qua ActionExecutor | plans/BLUEPRINT.md:577 | 023b | MỘT PHẦN | packages/core/src/identity/actions/working-hours-update.handler.ts:13; test settings.test.ts; thiếu preview (DC-224) |
| ACT-sla.update_default | `sla.update_default` (config) — handler qua ActionExecutor | plans/BLUEPRINT.md:749 | 023b | MỘT PHẦN | packages/core/src/support/actions/sla-config.handlers.ts:14; test support.test.ts; thiếu preview (DC-224) |
| ACT-notification.update_prefs | `notification.update_prefs` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:580 | 023b | MỘT PHẦN | packages/core/src/notify/actions/notification-update-prefs.handler.ts:12; test notify.test.ts; thiếu preview (DC-224) |
| ACT-ticket.search | `ticket.search` (read) — handler qua ActionExecutor | plans/BLUEPRINT.md:740 | 034 | ĐẠT | packages/core/src/support/actions/sla-config.handlers.ts:64; test assistant-unit.test.ts |
| ACT-ticket.create | `ticket.create` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:741 | 023b | MỘT PHẦN | packages/core/src/support/actions/ticket-create.handler.ts:39; test agents-ui.test.ts, agents.test.ts; thiếu preview (DC-224) |
| ACT-ticket.update | `ticket.update` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:742 | 023b | MỘT PHẦN | packages/core/src/support/actions/ticket-edit.handlers.ts:99; KHÔNG có test nào gọi action; thiếu preview — test thiếu: TIP nào nhận chưa rõ |
| ACT-ticket.assign | `ticket.assign` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:743 | 023b | MỘT PHẦN | packages/core/src/support/actions/ticket-edit.handlers.ts:41; test support.test.ts; thiếu preview (DC-224) |
| ACT-ticket.set_status | `ticket.set_status` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:744 | 023b | MỘT PHẦN | packages/core/src/support/actions/ticket-flow.handlers.ts:45; test support.test.ts; thiếu preview (DC-224) |
| ACT-ticket.comment | `ticket.comment` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:745 | 023b | MỘT PHẦN | packages/core/src/support/actions/ticket-edit.handlers.ts:136; test support.test.ts; thiếu preview (DC-224) |
| ACT-ticket.close | `ticket.close` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:746 | 023b | MỘT PHẦN | packages/core/src/support/actions/ticket-flow.handlers.ts:69; test support.test.ts, ticket-state.test.ts; thiếu preview (DC-224) |
| ACT-ticket.reopen | `ticket.reopen` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:747 | 023b | MỘT PHẦN | packages/core/src/support/actions/ticket-flow.handlers.ts:116; test support.test.ts, ticket-state.test.ts; thiếu preview (DC-224) |
| ACT-ticket.bulk_update | `ticket.bulk_update` (write) — handler qua ActionExecutor | plans/BLUEPRINT.md:748 | 023b | MỘT PHẦN | packages/core/src/support/actions/ticket-edit.handlers.ts:64; test support.test.ts; thiếu preview (DC-224) — BP bulk, ActionDef thiếu bulk:true → không preview số bản ghi |
| ACT-admin.agent_template.upsert | `admin.agent_template.upsert` có trong registry + handler | plans/BLUEPRINT.md:818 | 040 | CHƯA | Không có trong packages/actions (actions.json) |
| ACT-admin.llm_provider.disable | `admin.llm_provider.disable` có trong registry + handler | plans/BLUEPRINT.md:814 | 040 | CHƯA | Không có trong packages/actions (actions.json) |
| ACT-admin.llm_provider.probe | `admin.llm_provider.probe` có trong registry + handler | plans/BLUEPRINT.md:814 | 040 | CHƯA | Không có trong packages/actions (actions.json) |
| ACT-admin.llm_provider.upsert | `admin.llm_provider.upsert` có trong registry + handler | plans/BLUEPRINT.md:814 | 040 | CHƯA | Không có trong packages/actions (actions.json) |
| ACT-admin.model_price.upsert | `admin.model_price.upsert` có trong registry + handler | plans/BLUEPRINT.md:812 | 040 | CHƯA | Không có trong packages/actions (actions.json) |
| ACT-admin.model_route.upsert | `admin.model_route.upsert` có trong registry + handler | plans/BLUEPRINT.md:813 | 040 | CHƯA | Không có trong packages/actions (actions.json) |
| ACT-admin.plan.upsert | `admin.plan.upsert` có trong registry + handler | plans/BLUEPRINT.md:811 | 040 | CHƯA | Không có trong packages/actions (actions.json) |
| ACT-admin.workspace.archive | `admin.workspace.archive` có trong registry + handler | plans/BLUEPRINT.md:817 | 041 | CHƯA | Không có trong packages/actions (actions.json) |
| ACT-admin.workspace.restore | `admin.workspace.restore` có trong registry + handler | plans/BLUEPRINT.md:817 | 041 | CHƯA | Không có trong packages/actions (actions.json) |
| ACT-admin.workspace.resume | `admin.workspace.resume` có trong registry + handler | plans/BLUEPRINT.md:816 | 040 | CHƯA | Không có trong packages/actions (actions.json) |
| ACT-admin.workspace.suspend | `admin.workspace.suspend` có trong registry + handler | plans/BLUEPRINT.md:816 | 040 | CHƯA | Không có trong packages/actions (actions.json) |
| ACT-ai.detect_intent | `ai.detect_intent` có trong registry + handler | plans/BLUEPRINT.md:797 | — | CHƯA | Không có trong packages/actions (actions.json) |
| ACT-ai.extract_info | `ai.extract_info` có trong registry + handler | plans/BLUEPRINT.md:797 | — | CHƯA | Không có trong packages/actions (actions.json) |
| ACT-ai.score_lead | `ai.score_lead` có trong registry + handler | plans/BLUEPRINT.md:797 | — | CHƯA | Không có trong packages/actions (actions.json) |
| ACT-ai.summarize | `ai.summarize` có trong registry + handler | plans/BLUEPRINT.md:797 | — | CHƯA | Không có trong packages/actions (actions.json); 015b chỉ có contact.summarize (khác id) |
| ACT-category.delete | `category.delete` có trong registry + handler | plans/BLUEPRINT.md:665 | 032b | CHƯA | Không có trong packages/actions (actions.json) |
| ACT-category.update | `category.update` có trong registry + handler | plans/BLUEPRINT.md:665 | 032b | CHƯA | Không có trong packages/actions (actions.json) |
| ACT-contact.add_note | `contact.add_note` có trong registry + handler | plans/BLUEPRINT.md:639 | — | CHƯA | Không có trong packages/actions (actions.json); ghi chú chỉ qua contact.create(note) — contact-write.handlers.ts:44 |
| ACT-contact.bulk_update | `contact.bulk_update` có trong registry + handler | plans/BLUEPRINT.md:642 | 045b | CHƯA | Không có trong packages/actions (actions.json); FE BulkTransferModal gọi transfer_owner từng khách; 045b chỉ nói job cho *.bulk_update ; planning045b contracts annex now specifies task/AC, not runtime evidence |
| ACT-contact.forget | `contact.forget` có trong registry + handler | plans/BLUEPRINT.md:650 | — | CHƯA | Không có trong packages/actions; BP = privacy.erase ẩn danh hoá. DC-235 đã sửa tên xoá fact dự kiến ở 015b thành contact.memory_forget; nghĩa vụ privacy vẫn chưa có TIP, không thuộc học KB của 043 |
| ACT-contact.remember | `contact.remember` có trong registry + handler | plans/BLUEPRINT.md:641 | 015b | CHƯA | Không có trong packages/actions (actions.json) |
| ACT-contract.create_appendix | `contract.create_appendix` có trong registry + handler | plans/BLUEPRINT.md:690 | 030b | CHƯA | Không có trong packages/actions (actions.json); DV-010 |
| ACT-contract.draft_from_content | `contract.draft_from_content` có trong registry + handler | plans/BLUEPRINT.md:694 | 030b | CHƯA | Không có trong packages/actions (actions.json); DV-010 |
| ACT-conversation.get | `conversation.get` có trong registry + handler | plans/BLUEPRINT.md:603 | 023b | CHƯA | Không có trong packages/actions (actions.json) |
| ACT-conversation.search | `conversation.search` có trong registry + handler | plans/BLUEPRINT.md:602 | 023b | CHƯA | Không có trong packages/actions (actions.json) |
| ACT-conversation.unhide | `conversation.unhide` có trong registry + handler | plans/BLUEPRINT.md:621 | 025b | MỘT PHẦN | Không có trong packages/actions (actions.json); hành vi có qua conversation.hide{hidden:false} (inbox.ts:229) nhưng không có DV ghi lệch id |
| ACT-conversation.untag | `conversation.untag` có trong registry + handler | plans/BLUEPRINT.md:607 | 025b | MỘT PHẦN | Không có trong packages/actions (actions.json); gỡ thẻ có qua conversation.set_tags (inbox.ts:215), không có id riêng / DV |
| ACT-insight.query | `insight.query` có trong registry + handler | plans/BLUEPRINT.md:808 | 038 | CHƯA | Không có trong packages/actions (actions.json) |
| ACT-integration.sync_now | `integration.sync_now` có trong registry + handler | plans/BLUEPRINT.md:584 | — | CHƯA | Không có trong packages/actions (actions.json); TIP-012:57 ghi 'ngoài TIP' |
| ACT-integration.test | `integration.test` có trong registry + handler | plans/BLUEPRINT.md:584 | — | CHƯA | Không có trong packages/actions (actions.json); TIP-012:57 ghi 'ngoài TIP'; 023c nói 'probe connector' nhưng không định nghĩa action |
| ACT-kb.folder.delete | `kb.folder.delete` có trong registry + handler | plans/BLUEPRINT.md:793 | 020b | CHƯA | Không có trong packages/actions (actions.json) |
| ACT-kb.folder.update | `kb.folder.update` có trong registry + handler | plans/BLUEPRINT.md:793 | 020b | CHƯA | Không có trong packages/actions (actions.json) |
| ACT-kb.suggestion.approve | `kb.suggestion.approve` có trong registry + handler | plans/BLUEPRINT.md:794 | 043 | CHƯA | Không có trong packages/actions (actions.json) |
| ACT-kb.suggestion.reject | `kb.suggestion.reject` có trong registry + handler | plans/BLUEPRINT.md:794 | 043 | CHƯA | Không có trong packages/actions (actions.json) |
| ACT-message.unpin | `message.unpin` có trong registry + handler | plans/BLUEPRINT.md:618 | 025b | MỘT PHẦN | Không có trong packages/actions (actions.json); có qua message.pin{pinned:false} (inbox.ts:189), không DV |
| ACT-message.unreact | `message.unreact` có trong registry + handler | plans/BLUEPRINT.md:617 | 025b | MỘT PHẦN | Không có trong packages/actions (actions.json); message.react gửi lại cùng emoji = gỡ (inbox.ts:176; inbox.test.ts:261), không DV |
| ACT-order.import_external | `order.import_external` có trong registry + handler | plans/BLUEPRINT.md:695 | 031 | MỘT PHẦN | Không có trong packages/actions (actions.json); DV-011: không là action, OrderSyncService trong job (sales/jobs/order-sync.jobs.ts) — test order-sync.test.ts, orders.test.ts |
| ACT-payment.redeem_points | `payment.redeem_points` có trong registry + handler | plans/BLUEPRINT.md:713 | 036 | CHƯA | Không có trong packages/actions (actions.json) |
| ACT-product.import | `product.import` có trong registry + handler | plans/BLUEPRINT.md:664 | 032b | CHƯA | Không có trong packages/actions (actions.json) |
| ACT-product_variant.archive | `product_variant.archive` có trong registry + handler | plans/BLUEPRINT.md:662 | 032b | CHƯA | Không có trong packages/actions (actions.json) |
| ACT-product_variant.create | `product_variant.create` có trong registry + handler | plans/BLUEPRINT.md:662 | 032b | CHƯA | Không có trong packages/actions (actions.json) |
| ACT-product_variant.update | `product_variant.update` có trong registry + handler | plans/BLUEPRINT.md:662 | 032b | CHƯA | Không có trong packages/actions (actions.json) |
| ACT-role.create | `role.create` có trong registry + handler | plans/BLUEPRINT.md:581 | 042 | CHƯA | Không có trong packages/actions (actions.json) |
| ACT-role.delete | `role.delete` có trong registry + handler | plans/BLUEPRINT.md:581 | 042 | CHƯA | Không có trong packages/actions (actions.json) |
| ACT-role.update | `role.update` có trong registry + handler | plans/BLUEPRINT.md:581 | 042 | CHƯA | Không có trong packages/actions (actions.json) |
| ACT-segment.create | `segment.create` có trong registry + handler | plans/BLUEPRINT.md:756 | 037 | CHƯA | Không có trong packages/actions (actions.json) |
| ACT-segment.delete | `segment.delete` có trong registry + handler | plans/BLUEPRINT.md:756 | 037 | CHƯA | Không có trong packages/actions (actions.json) |
| ACT-segment.update | `segment.update` có trong registry + handler | plans/BLUEPRINT.md:756 | 037 | CHƯA | Không có trong packages/actions (actions.json) |
| ACT-team.create | `team.create` có trong registry + handler | plans/BLUEPRINT.md:582 | 042 | CHƯA | Không có trong packages/actions (actions.json) |
| ACT-team.set_members | `team.set_members` có trong registry + handler | plans/BLUEPRINT.md:582 | 042 | CHƯA | Không có trong packages/actions (actions.json) |
| ACT-team.update | `team.update` có trong registry + handler | plans/BLUEPRINT.md:582 | 042 | CHƯA | Không có trong packages/actions (actions.json) |
| ACT-contact.get_360 | `contact.get_360` có trong registry + handler | plans/BLUEPRINT.md:? | 023b | CHƯA | Không có trong packages/actions (actions.json); 023b làm `contact.get` (360 rút gọn); đọc 360 hiện chỉ qua GET /contacts/:id |
| ACT-workspace.transfer_ownership | `workspace.transfer_ownership` có trong registry + handler | plans/BLUEPRINT.md:583 | 045b | CHƯA | Không có trong packages/actions (actions.json) |
| BP-3.2-a | Executor đúng thứ tự registry → zod → permission → policy → idempotency → transaction (handler + action_log + outbox) | plans/BLUEPRINT.md:525 | 003 | ĐẠT | packages/core/src/kernel/actions/executor.ts:73-179; test actions.test.ts (AC1–AC8), actions-unit.test.ts |
| BP-3.2-b | confirm_token Redis 10 phút gắn hash input, dùng một lần | plans/BLUEPRINT.md:530 | 003 | ĐẠT | packages/core/src/kernel/actions/confirm-token.ts:6; test actions-unit.test.ts ("đúng input → dùng được một lần"), actions.test.ts AC4 |
| BP-3.2-c | Boot fail nếu action thiếu handler (chưa cài → NOT_IMPLEMENTED kèm TIP chủ) | plans/BLUEPRINT.md:522 | 003 | ĐẠT | packages/core/src/kernel/actions/handler-registry.ts:1-26, tip-owners.ts; test actions-unit.test.ts ("mọi action có TIP chủ", "boot fail") |
| BP-3.2-d | Action `db:'platform'` chạy transaction DB nền tảng, action_log vẫn ở DB tenant | plans/BLUEPRINT.md:531 | 003 | ĐẠT | executor.ts:131-138; test settings.test.ts, billing-payments.test.ts |
| BP-3.2-e | admin.* ghi `platform_audit_log` | plans/BLUEPRINT.md:531 | 045b | CHƯA | không có chỗ ghi platform_audit_log (TIP-045b CONTEXT xác nhận) |
| BP-3.3-a | Bảng policy nguồn × risk (ui/assistant/agent/task) | plans/BLUEPRINT.md:541 | 003 | ĐẠT | packages/core/src/kernel/actions/policy.ts:8-15; test actions-unit.test.ts:31 |
| BP-3.3-b | bulk=true luôn preview kèm số bản ghi kể cả ui | plans/BLUEPRINT.md:548 | 003 | MỘT PHẦN | policy.ts:24 có; nhưng ticket.bulk_update thiếu `bulk:true` trong ActionDef (packages/actions/src/support.ts:177) → không preview |
| BP-3.3-c | Agent write: chạy nếu được cấp VÀ confidence ≥ ngưỡng, không thì approval | plans/BLUEPRINT.md:545 | 022 | MỘT PHẦN | policy.ts:14 agent.write='run' không xét confidence; confidence chỉ dùng quyết handoff trả lời (reply.service.ts:173) — không DC ghi lệch |
| BP-3.3-d | Agent send: chỉ hội thoại đang phục vụ, gửi khác → approval | plans/BLUEPRINT.md:545 | 022 | ĐẠT | policy.ts:19, executor.ts:89-91 (servedConversationId); test actions-unit.test.ts:42, agent-reply.test.ts |
| BP-3.3-e | Task: send approval nếu ask_before_send; delete luôn approval; config cấm; write trong data_scope | plans/BLUEPRINT.md:546 | 035 | ĐẠT | policy.ts:15,21; task.runner.ts:38,128 narrowScope; test actions-unit.test.ts:50, ai-tasks.test.ts |
| BP-3.3b-a | Quyền agent = tool_ids, chỉ sửa ở Builder (agent.update) | plans/BLUEPRINT.md:552 | 021 | ĐẠT | packages/core/src/ai/agents/agent-authz.ts:9-15, agent.store.ts:70; test agents.test.ts |
| BP-3.3b-b | delegate / Cowork: quyền = tool_ids ∩ permission + scope người ra lệnh, kiểm mỗi lần gọi tool | plans/BLUEPRINT.md:554 | 022/035 | ĐẠT | agent-authz.ts:16-19; agent.runtime.ts:85 (ctx dựng mỗi bước); task.runner.ts:46; test ai-tasks.test.ts:297 ("người tạo mất quyền"), assistant.test.ts |
| BP-3.3b-c | Tool ngoài giao không vào run; gọi vẫn bị → FORBIDDEN, run tiếp tục | plans/BLUEPRINT.md:556 | 022 | ĐẠT | agent-tools.ts:57 runToolIds; test agent-reply.test.ts:277 |
| BP-3.3b-d | action_log.on_behalf_of_user_id = người ra lệnh, actor_type=agent | plans/BLUEPRINT.md:557 | 022 | ĐẠT | agent.runtime.ts:76-78, executor.ts:156-158; test agents.test.ts, assistant.test.ts |
| BP-3.3b-e | delegate lồng nhau: run con kế thừa giao run cha, độ sâu ≤ 2 | plans/BLUEPRINT.md:558 | 023 | MỘT PHẦN | delegate.ts:41 DEPTH_LIMIT có; delegate.ts:62 truyền commander=t.authz của người dùng, không ∩ quyền agent cha; test assistant.test.ts |
| BP-3.3b-f | kb.search trong run giao: kb_scope agent ∩ quyền đọc người ra lệnh; agent trực kênh chỉ public | plans/BLUEPRINT.md:559 | 020/022 | MỘT PHẦN | kb-search.handler.ts:15-17 visibility đúng; kb_scope của agent KHÔNG áp khi gọi kb.search qua tool (chỉ áp ở reply-context.ts:86); test kb.test.ts, agent-reply.test.ts |
| BP-3.3b-g | requiresConnector: chưa kết nối → badge, không vào run; chưa manifest → Sắp có | plans/BLUEPRINT.md:560 | 021 | ĐẠT | agent-tools.ts:25-29,59; test agents.test.ts (GET /agents/:id/tools) |
| BP-3.3b-h | Governance ép approval: báo giá > 20M, giảm ngoài chính sách, hoàn tiền, gửi hàng loạt, hợp đồng | plans/BLUEPRINT.md:562 | 032b | MỘT PHẦN | FORCE_APPROVAL ở governance.ts:34 không ai đọc; ngưỡng cứng quote-math.ts:23; hoàn tiền luôn duyệt qua refund_approve (DV-013) |
| BP-3.3b-i | Từ cấm: chặn nội dung, đặt handoff | plans/BLUEPRINT.md:563 | 022 | ĐẠT | packages/ai/src/reply/handoff.ts:30; reply-context.ts:115; test reply.test.ts:62 |
| BP-3.5-a | Danh mục permission đủ theo bảng §3.5 | plans/BLUEPRINT.md:826 | 005 | ĐẠT | packages/shared/src/authz/permissions.ts:2-21; test roles.test.ts, authz.test.ts |
| BP-3.5-b | 5 vai trò hệ thống (owner/manager/sales/cs/accountant) + data scope mặc định | plans/BLUEPRINT.md:867 | 005 | ĐẠT | packages/shared/src/authz/roles.ts:36-68; test roles.test.ts, authz.test.ts |
| BP-3.5-c | CSKH crm: đọc all, SỬA chỉ own + chỉ thông tin liên hệ | plans/BLUEPRINT.md:831 | 015 | MỘT PHẦN | roles.ts:57 scope crm='all' + crm.edit → access.ts:38 cho sửa mọi khách mọi trường; không kiểm own/contact-only |
| BP-3.5-d | Quản lý "uỷ quyền" contract.sign / payment.refund_approve qua membership.delegations | plans/BLUEPRINT.md:875 | 005, 042 | MỘT PHẦN | authz-resolver.ts:103 có đọc; apps/api/test/integration/authz.test.ts:116 chỉ update DB trực tiếp rồi GET, không chứng minh luồng Owner grant/revoke; 042 AC8, gate Q-028 |
| BP-3.5-e | own = phụ trách / được gán + khách mình là collaborator / watcher (D32) | plans/BLUEPRINT.md:874 | 015, 042c | MỘT PHẦN | CRM có grants nhưng order/quote/contract/invoice/booking helpers chỉ collaborator; không suy test crm-contacts sang cả tài liệu. TIP042c AC2/3 |
| BP-3.5-f | catalog.cost_view ẩn giá vốn | plans/BLUEPRINT.md:836 | 027 | ĐẠT | catalog/services/product-view.ts:49; test catalog.test.ts |
| BP-4.1-a | Envelope `{data}` / lỗi `{error:{code,message,fields}}` + bảng mã HTTP | plans/BLUEPRINT.md:882 | 003 | ĐẠT | apps/api/src/http/kernel/error.filter.ts; bootstrap.ts:18; test actions.test.ts |
| BP-4.1-b | Header Bearer JWT + X-Workspace-Id, sai → 401/403 trước khi mở DB tenant | plans/BLUEPRINT.md:885 | 004 | ĐẠT | apps/api/src/http/kernel/request-actor.ts:45; test actions.test.ts AC11 |
| BP-4.1-c | Cursor base64(sortKey,id), limit ≤100 mặc định 30 cho mọi list | plans/BLUEPRINT.md:887 | 003 | MỘT PHẦN | chỉ billing-read.service.ts:22 có cursor base64url; nhiều list trả `next_cursor:null` (action-logs.read.ts:135) |
| BP-4.1-d | 9 list có số trang `?page=&limit=` + meta.total (D42) | plans/BLUEPRINT.md:888 | 015/027/029–034, 036, 037 | MỘT PHẦN | 7/9 có (contacts, products, quotes, orders, invoices, contracts, tickets — test catalog.test.ts:81…); loyalty members (036), campaigns (037) CHƯA |
| BP-4.1-e | Idempotency-Key bắt buộc với send/money/*.create | plans/BLUEPRINT.md:905 | 003 | ĐẠT | policy.ts:29 requiresIdempotencyKey; executor.ts:109; test actions-unit.test.ts:58, actions.test.ts AC5 |
| BP-4.2-a | Auth OTP request/verify, password login/set/reset, refresh xoay family, logout, rate 5/15m/email | plans/BLUEPRINT.md:910 | 004 | ĐẠT | apps/api/src/http/identity/auth.controller.ts; sessions.service.ts:1; otp.service.ts:19; test auth.test.ts |
| BP-4.2-b | GET /me, POST /workspaces, GET /business-lookup/tax/:code | plans/BLUEPRINT.md:917 | 004 | ĐẠT | identity/workspaces.controller.ts; test workspaces.test.ts, authz.test.ts |
| BP-4.2-c | GET /session, POST /session/ack, GET /workspace/provisioning, GET /auth/brand | plans/BLUEPRINT.md:920 | 011 | ĐẠT | identity/session.controller.ts; test onboarding.test.ts |
| BP-4.3-a | GET /v1/actions lọc quyền + input_schema · POST /v1/actions/:id (200 / 202 preview / 202 approval) | plans/BLUEPRINT.md:929 | 003 | ĐẠT | apps/api/src/http/kernel/actions.controller.ts:41-60; test actions.test.ts |
| BP-4.3-b | POST /action-logs/:id/undo (UNDO_EXPIRED / UNDO_NOT_SUPPORTED) | plans/BLUEPRINT.md:936 | 003 | ĐẠT | kernel/actions/undo.service.ts:26-28; test actions.test.ts AC7 |
| BP-4.3-c | GET /action-logs?actor_type=&action_id=&module=&from=&to=&cursor= | plans/BLUEPRINT.md:937 | 024 | MỘT PHẦN | ai/assistant.controller.ts:81 chỉ kind/status/day/q (shape FE), next_cursor luôn null; test actions.test.ts |
| BP-4.3-d | Action ghi có handler đều có preview (thẻ "đổi gì") | plans/BLUEPRINT.md:5.2 | 023b | MỘT PHẦN | 17/175 handler ghi có preview (actions.json); còn lại thẻ tối thiểu DC-128 (executor.ts:102) |
| BP-4.4-inbox | /conversations (+counts, :id, messages, messages/search, agent-tools), /canned-replies, /tags | plans/BLUEPRINT.md:959 | 016/025 | ĐẠT | apps/api/src/http/inbox/conversations.controller.ts, inbox-meta.controller.ts; test inbox.test.ts, inbox-ui.test.ts |
| BP-4.4-crm | /contacts (+:id 360 + layout, timeline, duplicates, collaborators), /contact-access-requests | plans/BLUEPRINT.md:960 | 015/026 | ĐẠT | crm/contacts.controller.ts; test crm-contacts.test.ts, crm-ui.test.ts |
| BP-4.4-crm-b | GET /custom-fields?entity= · /profile-layouts · /profile-layouts/:id?as_role= | plans/BLUEPRINT.md:980 | 015 | MỘT PHẦN | thay bằng /settings/fields, /settings/profile-layouts (crm-settings.controller.ts:16,24); không có /:id?as_role=; không DV ghi |
| BP-4.4-catalog | /products, /products/:id, /categories | plans/BLUEPRINT.md:961 | 027 | ĐẠT | catalog/products.controller.ts; test catalog.test.ts |
| BP-4.4-contracts | /contracts (+:id, pdf), /doc-templates, public sign (get/otp/sign/decline) | plans/BLUEPRINT.md:962 | 028/030 | ĐẠT | contracts/contracts.controller.ts, public-sign.controller.ts; test contracts.test.ts, documents.test.ts (DV-009) |
| BP-4.4-sales | /quotes (+:id, pdf), /orders (+:id), /invoices (+:id) | plans/BLUEPRINT.md:963 | 029/031/032 | ĐẠT | sales/{quotes,orders,invoices}.controller.ts; test quotes.test.ts, orders.test.ts, payments.test.ts |
| BP-4.4-sales-qr | GET /invoices/:id/qr (ảnh VietQR) | plans/BLUEPRINT.md:963 | 032b | CHƯA | routes.json không có |
| BP-4.4-booking | /appointments, /appointments/:id, /staff, /booking/slots | plans/BLUEPRINT.md:964 | 033 | MỘT PHẦN | DV-015: thay bằng /calendar*; FE Inbox vẫn gọi /booking/slots (apps/web/src/features/inbox/api.ts:99) → chỉ mock trả lời |
| BP-4.4-support | /tickets, /tickets/:id, /tickets/counts, /sla-policies | plans/BLUEPRINT.md:965 | 034 | ĐẠT | support/tickets.controller.ts (DV-016: counts/sla-policies → /tickets/meta, /settings/sla); test support.test.ts |
| BP-4.4-marketing | /segments, POST /segments/preview, /campaigns(+:id, meta), /campaign-suggestions | plans/BLUEPRINT.md:966 | 037 | GIẢ | không route API (http/marketing trống); FE marketing/api.ts chỉ chạy mock |
| BP-4.4-loyalty | /loyalty/config, /loyalty/members(+:id ledger), overview, lookup | plans/BLUEPRINT.md:967 | 036 | GIẢ | không route API; FE loyalty/api.ts chỉ chạy mock |
| BP-4.4-ai | /agents (+:id, versions, tools), /agent-templates, /approvals, /governance, /runs?root_run_id=&status=, /ai-tasks | plans/BLUEPRINT.md:968 | 021/023/035 | ĐẠT | http/ai/{agents,ai,tasks}.controller.ts; test agents.test.ts, ai-runtime.test.ts, ai-tasks.test.ts |
| BP-4.4-ai-b | GET /agents/:id/stats | plans/BLUEPRINT.md:968 | 038 | CHƯA | routes.json không có |
| BP-4.4-ai-c | GET /runs/:id (+steps) | plans/BLUEPRINT.md:968 | 019b | CHƯA | không route, không TIP nhắc |
| BP-4.4-ai-d | GET /kb/folders · /kb/sources | plans/BLUEPRINT.md:968 | 020 | MỘT PHẦN | TIP-020:15 hứa nhưng không có route; chỉ /settings/kb (ai.controller.ts:48) |
| BP-4.4-ai-e | GET /kb/suggestions (P1) | plans/BLUEPRINT.md:968 | 043 | CHƯA | không route |
| BP-4.4-assistant | /assistant/sessions?q= · /assistant/sessions/:id/messages | plans/BLUEPRINT.md:969 | 023 | ĐẠT | http/ai/assistant.controller.ts:70-75; test assistant.test.ts |
| BP-4.4-channels | /channels (theo type + accounts[]), /channels/:id, /channels/:id/stats, /webchat/widget | plans/BLUEPRINT.md:970 | 014/017 | ĐẠT | dưới /settings/channels*, /settings/widget (channels.controller.ts:10; DC-070); test channels.test.ts, webchat.test.ts — lệch đường không có DV |
| BP-4.4-billing | /billing/summary, plans, ledger, invoices(+:id) | plans/BLUEPRINT.md:971 | 009/010 | ĐẠT | billing/billing.controller.ts; test billing.test.ts, billing-payments.test.ts |
| BP-4.4-dashboard | GET /dashboard · /insights/:metric | plans/BLUEPRINT.md:972 | 038 | GIẢ | không route (http/insights stub); FE dashboard/api.ts chỉ mock |
| BP-4.4-authz | /me/authz, /roles, /permissions, /teams | plans/BLUEPRINT.md:973 | 005 | ĐẠT | authz/authz.controller.ts; test authz.test.ts |
| BP-4.4-integrations | /integrations/connectors · /integrations/connections/:id · /…/logs | plans/BLUEPRINT.md:974 | 012 | MỘT PHẦN | chỉ /settings/integrations (integrations.controller.ts:18); connection detail + logs không có |
| BP-4.4-misc | POST /files, GET /files/:id, /notifications, /settings/:section | plans/BLUEPRINT.md:975 | 006/013/020 | ĐẠT | files.controller.ts; notify.controller.ts; identity/settings.controller.ts; test kb.test.ts, notify.test.ts, settings.test.ts |
| BP-4.4-admin | /admin/workspaces, /admin/plans, /admin/model-prices, /admin/transfers | plans/BLUEPRINT.md:976 | 040 | MỘT PHẦN | chỉ /admin/transfers (admin-transfers.controller.ts); test billing-payments.test.ts |
| BP-4.4-fe-nav | GET /nav/badges (FE shell) | apps/web/src/shared/shell/useShellData.ts:34 | — | GIẢ | không route API, không TIP nào nhận |
| BP-4.4-fe-audit | GET /settings/audit · /settings/ai-audit (FE Cài đặt) | apps/web/src/features/settings/api.ts:104 | 045b | GIẢ | không route API; 045b chỉ ghi audit, không có màn đọc ; planning045b contracts annex now specifies task/AC, not runtime evidence |
| BP-4.5-a | POST /assistant/messages SSE (session/delta/plan/step/confirm/ui_command/result/error/done) | plans/BLUEPRINT.md:987 | 023c | MỘT PHẦN | assistant.controller.ts:40 trả JSON một lần (DV-006); SSE ở 023c bước 6a; test assistant.test.ts |
| BP-4.5-b | POST /assistant/confirm | plans/BLUEPRINT.md:998 | 023 | ĐẠT | assistant.controller.ts:57; test assistant.test.ts |
| BP-4.5-c | POST /runs/:id/cancel | plans/BLUEPRINT.md:999 | 019 | MỘT PHẦN | không route; chỉ action run.cancel (run-cancel.handler.ts:17); test ai-runtime.test.ts |
| BP-4.6-a | /ws: JWT + workspace, room ws/user/conv, conv.join/leave/typing, Redis adapter | plans/BLUEPRINT.md:1005 | 006 | ĐẠT | apps/api/src/http/notify/realtime/ws.gateway.ts:65-121; test realtime.test.ts |
| BP-4.6-b | Server → client event `run.step`, `run.done`, `credits.changed`, `conversation.counts`, `ui.command` | plans/BLUEPRINT.md:1008 | — | CHƯA | grep không thấy phát các event này; khung điều phối poll GET /runs |
| BP-4.6-c | /widget: public_key + visitor_token, visitor.hello, message.send, server message.new / typing / agent.status | plans/BLUEPRINT.md:1010 | 017 | MỘT PHẦN | widget.gateway.ts:70-78, publisher.ts:18 chỉ message.new; typing / agent.status không phát; test webchat.test.ts |
| BP-4.7-a | POST /hooks/payments/:provider (gói AppChat) | plans/BLUEPRINT.md:1017 | 010 | CHỜ-TK | billing/payments-hook.controller.ts; test billing-payments.test.ts (mock HMAC) — Q-004 SePay thật |
| BP-4.7-b | POST /hooks/integrations/:connector/:connectionId | plans/BLUEPRINT.md:1018 | 012 | ĐẠT | integrations/hooks.controller.ts; test integrations.test.ts, orders.test.ts |
| BP-4.7-c | POST /hooks/tenant-payments/:provider/:feedId | plans/BLUEPRINT.md:1019 | 032 | CHỜ-TK | sales/tenant-payments-hook.controller.ts; test payments.test.ts — Q-004 |
| BP-5.1-a | AiSdkEngine (streamText) chạy tool qua ToolSpec → ActionExecutor | plans/BLUEPRINT.md:1052 | 019 | ĐẠT | packages/ai/src/gateway/engine.ts:5; agent.runtime.ts:73; test engine.test.ts |
| BP-5.1-b | Dừng run khi needs_* → lưu state jsonb, chạy tiếp bằng job ai-resume, idempotent | plans/BLUEPRINT.md:1054 | 021 | ĐẠT | engine.ts:94-95; core/ai/approvals/resume.ts:85-120, resume.queue.ts:22; test agents.test.ts, agent-reply.test.ts |
| BP-5.1-c | Approval quá 72h → expired, run handoff, BÁO OWNER | plans/BLUEPRINT.md:1061 | 019b | MỘT PHẦN | approval.gateway.ts:48 + resume.ts:96-102 có expire + handoff; không thông báo Owner (agents.rules.ts chỉ WS) |
| BP-5.1-d | Loop guard 3 lần · maxSteps 8/16 · budget | plans/BLUEPRINT.md:1062 | 019b | MỘT PHẦN | engine.ts:10,50-51,89; runs/runner.ts:12; test engine.test.ts Re-audit2026-11-02: engine can execute tools after usage exceeds budget; runner treats max_steps/loop_guard/budget as completed.019b durable gate/stop reason tests pending. |
| BP-5.1-e | transfer_to_agent ≤ 3/lượt, A→B→A → người · consult chỉ read · độ sâu ≤ 2 | plans/BLUEPRINT.md:1067 | 019b | MỘT PHẦN | reply.service.ts:153; reply-tools.ts:91-100; test agent-reply.test.ts Re-audit2026-11-02: finishResumedTurn resets transfer ancestry; consult40 budget separate.019b owns persisted lineage and root budget, not proved by current single-turn tests. |
| BP-5.1-f | Ngân sách credit chung cả cây run | plans/BLUEPRINT.md:1072 | 019b | MỘT PHẦN | delegate.ts:46 có; consult dùng CONSULT_BUDGET riêng (reply-tools.ts:110) không trừ gốc |
| BP-5.1-g | Mọi bước phát `run.step` qua WS | plans/BLUEPRINT.md:1073 | 019b | CHƯA | xem BP-4.6-b |
| BP-5.1-h | CreditMeter trừ credit mỗi bước, idempotent (ws,'ai_step',run:step), CREDIT_EXHAUSTED | plans/BLUEPRINT.md:1080 | 019b | MỘT PHẦN | packages/core/src/billing/services/credit-meter.ts; test ai-runtime.test.ts, billing.test.ts, engine.test.ts:77 Re-audit2026-11-02: wallet duplicate is safe but tenant counters/repriced receipt are not crash-atomic.019b receives stable usage settlement/recovery; existing paid ledger never rewritten. |
| BP-5.1-i | LLM Router: model_route theo tier, fallback 5xx/429/timeout, cache llm_provider 60s, capabilities | plans/BLUEPRINT.md:1081 | 019 | CHỜ-TK | packages/ai/src/router/router.ts:29-58; provider.store.ts:11; test router.test.ts — Q-001 |
| BP-5.1-j | ai_run_step.meta.provider_cost | plans/BLUEPRINT.md:1086 | 019b | CHƯA | grep không thấy provider_cost |
| BP-5.2-a | Meta-tools find_actions / call_action / ui / plan / update_step / delegate; Chat chỉ đọc | plans/BLUEPRINT.md:1098 | 023 | ĐẠT | core/ai/assistant/meta-tools.ts:24,53,120; test assistant-unit.test.ts, assistant.test.ts |
| BP-5.2-b | find_actions index embedding | plans/BLUEPRINT.md:1098 | 023 | MỘT PHẦN | catalog.ts:2 tìm không dấu theo từ khoá (DC-129) |
| BP-5.2-c | query_data = insight.query | plans/BLUEPRINT.md:1102 | 038 | CHƯA | meta-tools.ts:117 trả NOT_IMPLEMENTED |
| BP-5.2-d | render(UiTree) — Generative UI | plans/BLUEPRINT.md:1103 | 023c | CHƯA | packages/shared/src/genui không tồn tại |
| BP-5.2-e | Đọc bản ghi bằng action search/get + mã → id | plans/BLUEPRINT.md:1108 | 023b | MỘT PHẦN | code-refs.ts 8 thực thể; chỉ contact/product/ticket.search, appointment.list có |
| BP-5.3-a | Debounce 3s, job id agent-reply:{conv} | plans/BLUEPRINT.md:1114 | 022 | ĐẠT | core/ai/reply/reply.queue.ts:8,27; test agent-reply.test.ts |
| BP-5.3-b | Ngữ cảnh: 20 tin, khách rút gọn, contact_memory, top-6 kb public trong kb_scope, giờ mở cửa | plans/BLUEPRINT.md:1115 | 022 | MỘT PHẦN | reply-context.ts:13,81,86,93 có; contact_memory không ai ghi (015b) |
| BP-5.3-c | Output cấu trúc + luật handoff (confidence, đòi người, lặp 3, tiêu cực, từ cấm) | plans/BLUEPRINT.md:1117 | 022 | ĐẠT | packages/ai/src/reply/{output,handoff}.ts; test reply.test.ts, agent-reply.test.ts |
| BP-5.3-d | Copilot chỉ gợi ý | plans/BLUEPRINT.md:1119 | 022 | ĐẠT | reply.service.ts:178 (DC-125); test agent-reply.test.ts |
| BP-5.3-e | Lọc PII trước LLM, khôi phục khi gửi | plans/BLUEPRINT.md:1120 | 022 | ĐẠT | packages/ai/src/reply/pii.ts; test reply.test.ts |
| BP-5.3b-a | Tạo agent qua Trợ lý: draft_from_description → create_and_publish preview | plans/BLUEPRINT.md:1125 | 021 | ĐẠT | agent-llm.handlers.ts:74, agent.handlers.ts:41-54; test agents.test.ts |
| BP-5.3b-b | Rào chắn: tool ⊆ quyền ∩ grantable, money/delete vào approval_rules, plan.max_agents | plans/BLUEPRINT.md:1127 | 021 | ĐẠT | agent.store.ts:70-75; agent.handlers.ts:22; test agents.test.ts |
| BP-5.3b-c | Preview cảnh báo khi gắn kênh đang có agent khác | plans/BLUEPRINT.md:1130 | 022b | CHƯA | agent.handlers.ts:54 preview không có warnings Planned022b: explicit behavior, scoped action/receipt, UI/native/real-model acceptance; no runtime promotion. |
| BP-5.3b-d | agent.test dry-run | plans/BLUEPRINT.md:1135 | 021 | ĐẠT | agent.runtime.ts:96-104; test agents.test.ts |
| BP-5.4-a | ai_task cron/event + 5 mẫu (follow-up, báo giá treo, nhắc hẹn, sau mua, briefing) | plans/BLUEPRINT.md:1137 | 035 | ĐẠT | packages/shared/src/ai-tasks/task-catalog.ts:73; task-targets.ts:42-65; test ai-tasks.test.ts |
| BP-5.4-b | Zalo: delay 2–6s, cap 200 tin chủ động/ngày cấu hình được | plans/BLUEPRINT.md:1147 | 014 | MỘT PHẦN | manifest.ts:22 jitter có; perDayProactive không đặt → cap mặc định không có (send.processor.ts:43) |
| BP-6-a | Lease Redis lease:channel:{id} TTL 30s heartbeat 10s | plans/BLUEPRINT.md:1165 | 014 | ĐẠT | core/channels/jobs/lease.ts:6-7; test channels.test.ts |
| BP-6-b | Zalo: QR login, credentials mã hoá, chia đoạn ≤ 2000, tự pause sau 3 lỗi/10 phút | plans/BLUEPRINT.md:1168 | 014 | CHỜ-TK | zalo-personal/render.ts:46; send.processor.ts:12-13; crypto.ts:21; test zalo-adapter.test.ts, channels.test.ts — Q-003 |
| BP-6-c | Webchat widget ≤ 40KB gz, prechat, allowed_domains | plans/BLUEPRINT.md:1173 | 017 | ĐẠT | apps/widget/dist/widget.js (16.9KB gz), visitor.service.ts:11; test webchat.test.ts, apps/widget/test |
| BP-6-d | Email IMAP poll 60s + SMTP, gom thread Message-ID/In-Reply-To | plans/BLUEPRINT.md:1174 | 018 | ĐẠT | packages/channels/src/email/{adapter,normalize}.ts; test email-adapter.test.ts, email.test.ts |
| BP-6-e | Inbound pipeline ON CONFLICT dedupe → resolve contact → outbox message.received | plans/BLUEPRINT.md:1175 | 016 | ĐẠT | core/inbox/services/pipeline.ts:2,60,122; test inbox.test.ts |
| BP-8-a | VietQR tự sinh payload + render ảnh `qrcode` | plans/BLUEPRINT.md:1321 | 032b | MỘT PHẦN | payload packages/shared/src/commerce/vietqr.ts; ảnh QR không có (qrcode chưa cài) |
| BP-8-b | Brevo MailProvider + webhook bounce/complaint | plans/BLUEPRINT.md:1319 | 004 | MỘT PHẦN | integrations/connectors/brevo (CHỜ-TK Q-004); webhook bounce không có |
| BP-8-c | Storage `s3` qua env | plans/BLUEPRINT.md:1324 | 045b | CHƯA | chỉ LocalStorage (DV-003) |
| BP-8-d | PDF rich bằng @react-pdf/renderer | plans/BLUEPRINT.md:1325 | 028 | NGOÀI | DV-007: dùng LibreOffice cho cả rich |
| BP-8-e | Ports EInvoice/ESign/AccountingSync/SheetSync/Sms/Storage | plans/BLUEPRINT.md:1322 | 012 | MỘT PHẦN | ports/ chỉ bank-feed, mail, order-sync, tax-lookup; còn lại "Sắp có" |
| BP-8-f | Auth: access token trong memory, 401 → refresh một lần | plans/BLUEPRINT.md:1331 | 011 | ĐẠT | apps/web/src/shared/api/http-transport.ts:2,40; e2e http auth-onboarding.spec.ts |
| BP-9-a | argon2id, JWT HS256 xoay khoá, refresh cookie SameSite=Lax | plans/BLUEPRINT.md:1348 | 004 | ĐẠT | identity/services/secrets.ts:1, access-tokens.ts:29; http-util.ts:21; test identity-unit.test.ts, auth.test.ts |
| BP-9-b | helmet | plans/BLUEPRINT.md:1348 | 045b | CHƯA | không có helmet / security header; 045b chỉ nói CORS ; planning045b contracts annex now specifies task/AC, not runtime evidence |
| BP-9-c | Rate limit chung actions | plans/BLUEPRINT.md:1348 | 045b | MỘT PHẦN | kernel/rate-limit.ts chỉ dùng cho auth / ký / widget |
| BP-9-d | Outbox retry 2^n tối đa 8 rồi dead-letter | plans/BLUEPRINT.md:1344 | 003 | ĐẠT | kernel/outbox/relay.ts:8,46-52; test relay-sequence.test.ts |
| BP-9-e | /healthz, /readyz | plans/BLUEPRINT.md:1351 | — | MỘT PHẦN | chỉ GET /v1/health (health.controller.ts:9, test health.test.ts); readyz không có, TIP-002 hứa /health/ready chưa làm |
| BP-9-f | Web ErrorBoundary theo route | plans/BLUEPRINT.md:1345 | — | CHƯA | không file error.tsx / ErrorBoundary trong apps/web/src |
| BP-9-g | Metrics prom-client | plans/BLUEPRINT.md:1351 | 045b | CHƯA | prom-client chưa cài |
| BP-11-a | infra/ (provision, nginx, systemd, PG, prometheus, loki, grafana) + deploy releases/<sha> + rollback | plans/BLUEPRINT.md:1406 | 045 | CHƯA | thư mục infra/ không tồn tại — Q-006 |
| BP-11-b | Log pino JSON có traceId, redact PII; traceId nginx → api → job | plans/BLUEPRINT.md:1458 | — | MỘT PHẦN | TIP001 có kernel/logger/logger.ts:23–24 redaction/context, middleware/trace.middleware.ts:8, outbox.ts:28 và logger.test.ts. Rà 2026-11-02: infra/ chưa tồn tại; chưa chứng minh nginx → api → job xuyên tiến trình. Cần TIP045 cụ thể cho proxy/log pipeline và test propagation; không coi unit logger là bằng chứng toàn tuyến. |
| BP-11-c | Worker SIGTERM: ngừng nhận job, nhả lease Zalo | plans/BLUEPRINT.md:1434 | 014b | MỘT PHẦN | apps/worker/src/main.ts:12 enableShutdownHooks; sessions.ts:100 release; không test tắt có kiểm Planned014b: provider lifecycle/commands/history/contacts/receipts and native/live acceptance; no runtime promotion. |
| BP-11-d | 4 role PG tách biệt, app qua PgBouncer | plans/BLUEPRINT.md:1488 | 002/045 | MỘT PHẦN | packages/db/src/setup.ts, env.ts có role; PgBouncer thuộc infra (045) |
| CH-PROVIDER-RECEIPTS | Provider delivery/read receipts are evidence-based, monotonic and account/part scoped | plans/BLUEPRINT.md section6; vertical-flow planning audit2026-11-02 | 014b | MỘT PHẦN | zca-transport.ts:37-46 only message/old_messages/closed listeners; outbound.ts:112-115 marks sent from send ACK. Installed SDK has delivered/seen events; no current receipt ingestion.014b specifies part mapping, late/dedup events and group recipient evidence. |
| AI-CHANNEL-ATTACHMENT-CONTEXT | Agent distinguishes present attachment from actually readable content and never fabricates extraction | standards/ai/agent-gateway sections7-9; vertical-flow audit2026-11-02 | 022b | MỘT PHẦN | reply-context.ts:46-59 selects body/kind but no attachment metadata, renders [kind].022b typed unreadable metadata and safe handoff; no unapproved OCR/multimodal. |
| INBOX-BULK-RESULTS | Inbox bulk independent per-record outcomes, durable retry and version-aware undo | standards/domain/concurrency section7; Q019 | 025b | MỘT PHẦN | conversation-assign.handlers.ts:107-150 bulk runs one transaction and returns updated count; one denied row aborts batch.025b receives Inbox portion; ticket bulk in STD-domain-concurrency-7a still needs independent owner. |
| INBOX-FILTER-COUNTS | Current-scope filtered Inbox counters and safe realtime invalidation | plans/BLUEPRINT.md section4.6; vertical-flow audit2026-11-02 | 025b | MỘT PHẦN | conversations.controller.ts:41 counts has no filter; inbox/api.ts:69 static counts key; meta.service.ts:25 count across visible filtering not applied.042c supplies scope foundation,025b filter/count projection and invalidation-only signal; no workspace aggregate broadcast. |
| AI-ROOT-UTILITY-USAGE | All model utilities/query embeddings in an AI turn share trusted root usage and attempt receipts | standards/ai/agent-gateway sections1/5/6; vertical audit2026-11-02 | 019b | MỘT PHẦN | agent-llm.handlers.ts:58/84/109, translate.handler.ts:44, doc-template.handlers.ts:155, quote-draft.handler.ts:35 omit parentRunId; kb/search.ts:87 discards query embedding tokens.019b plans explicit lineage/metered wrapper; no runtime evidence yet. |
| AI-RUN-EVENTS | Committed current-scope run.step/run.done with reconnect, truthful statuses and actual detail | plans/BLUEPRINT.md section4.6; bounded child of BP-4.6-b | 019b | CHƯA | runner optional onEvent not wired; shared/events lacks run events; runs.service.ts:21 collapses terminals.019b owns these two events only, remaining broad parent not claimed complete. |

**Ghi chú / chưa rà hết:**

- Ghi chú:
- ACT: handler/preview từ actions.json; test = grep id trong apps/api/test, packages/*/test (không tính test mock web). Hàng MỘT PHẦN có 'thiếu preview' là nợ preview của 023b (DC-224).
- Lệch ActionDef ↔ Blueprint (risk / agent / undo) ghi trong cột Bằng chứng; không có DV / DC nào ghi các lệch đó.
- CHƯA RÀ HẾT: §3.4 cột Undo/permission từng action chưa đối chiếu đủ (chỉ so risk/agent/undo/bulk bằng script); §4.6 chưa đọc payload của từng event; §9 NFR web (LCP, bundle, virtual list, a11y, 5 trạng thái UI, i18n) và API p95 chưa rà; §10 rủi ro K1–K12 chưa có dòng riêng; §11.4 dashboards/alerts và §11.5 bảo mật VPS chỉ gộp vào BP-11-a (infra chưa có); §8 tra MST, Excel, parse RAG (readability) chưa có dòng.

## E. standards/*

| ID | Nghĩa vụ | Nguồn | TIP nhận | Trạng thái | Bằng chứng |
|---|---|---|---|---|---|
| STD-actions-registry-1 | Mọi ghi nghiệp vụ là `defineAction` + `@ActionHandler` chạy qua một `ActionExecutor`; không route PUT/PATCH/DELETE nghiệp vụ | standards/actions/action-registry.md:7 | 003 | ĐẠT | packages/core/src/kernel/actions/executor.ts:72; grep `@Put/@Patch/@Delete` apps/api/src = 0; test apps/api/test/integration/actions.test.ts |
| STD-actions-registry-2 | ID `<domain>.<verb>`, không trùng; boot fail khi action thiếu handler / handler lạ / trùng | standards/actions/action-registry.md:9 | 003 | ĐẠT | packages/core/src/kernel/actions/handler-registry.ts:27; test packages/actions/src/registry.test.ts:5, packages/core/test/actions-unit.test.ts:75,86 |
| STD-actions-registry-3 | Action khai đủ input/output zod, permission, risk, agentGrantable, invalidates; `skill` / `requiresConnector` (D51) | standards/actions/action-registry.md:12 | 003, 021 | ĐẠT | packages/actions/src/define.ts; packages/core/src/ai/agents/agent-tools.ts:25; test registry.test.ts:11, agents.test.ts |
| STD-actions-registry-4 | `description` cho LLM có ví dụ input; `title` là i18n key | standards/actions/action-registry.md:15 | 023b | MỘT PHẦN | registry.test.ts:11 chỉ kiểm độ dài; ~173/207 mô tả có "Example"; 023b task 1 sinh ví dụ tối thiểu |
| STD-actions-registry-5 | Thứ tự Executor cố định: registry → zod → permission → policy → idempotency → tx(handler+action_log+outbox) | standards/actions/action-registry.md:16 | 003 | ĐẠT | executor.ts:73-176; test actions.test.ts, actions-unit.test.ts |
| STD-actions-registry-6 | Read action cho mọi GET Trợ lý cần, cùng service với route GET | standards/actions/action-registry.md:24 | 023b, 038 | CHƯA | actions.json: 18 read / 207; 023b task 6 (~20 search/get), `insight.query` → 038 |
| STD-actions-registry-7a | Action risk send/money/delete/config hoặc bulk có `preview()` trả diff, số bản ghi, cảnh báo | standards/actions/action-registry.md:25 | 023b | MỘT PHẦN | actions.json: 14/90 action cần preview có preview; executor.ts:101 fallback thẻ tối thiểu (DC-128); 023b task 3+7 + test phủ |
| STD-actions-registry-7b | `confirm_token` gắn hash input, sống 10 phút, dùng một lần | standards/actions/action-registry.md:27 | 003 | ĐẠT | packages/core/src/kernel/actions/confirm-token.ts:6,42; test actions-unit.test.ts:130 |
| STD-actions-registry-8 | Undo: `undo.windowSec` + `handler.undo()`; quá hạn 409 | standards/actions/action-registry.md:28 | 003 | ĐẠT | packages/core/src/kernel/actions/undo.service.ts:19; test actions.test.ts:126 |
| STD-actions-registry-9 | `uiTarget` trả UiCommand deep-link kết quả | standards/actions/action-registry.md:31 | 003 | ĐẠT | executor.ts:146 dùng `def.uiTarget`; 21 action khai ("khi áp dụng"); test assistant.test.ts (ui_target) |
| STD-actions-registry-10 | `invalidates` khai query key; FE refetch theo đó | standards/actions/action-registry.md:32 | 003 | ĐẠT | apps/web/src/shared/actions/useAction.ts:41; registry.test.ts:15 |
| STD-actions-registry-10b | Quyền hiệu lực agent-làm-thay = agent ∩ người ra lệnh, kiểm mỗi lần gọi tool | standards/actions/action-registry.md:33 | 021, 022 | ĐẠT | packages/core/src/ai/agents/agent-authz.ts:3, agent-tools.ts:54; test agents.test.ts, ai-tasks.test.ts |
| STD-actions-registry-11a | Governance cứng: báo giá > 20M luôn duyệt | standards/actions/action-registry.md:35 | 029, 032b | ĐẠT | packages/shared/src/commerce/quote-math.ts:23,63; test quote-math.test.ts:37, quotes.test.ts (032b: cấu hình được) |
| STD-actions-registry-11b | Governance cứng: agent giảm giá > 5% luôn duyệt | standards/actions/action-registry.md:36 | 032b | MỘT PHẦN | FORCE_APPROVAL governance.ts:34 không ai đọc; quote-write không nhận trần agent — 032b task 1 |
| STD-actions-registry-11c | Governance cứng: hoàn tiền luôn duyệt | standards/actions/action-registry.md:37 | 032 | ĐẠT | packages/core/src/sales/payments/services/refunds.ts:1 (pending → payment.refund_approve); approval-permission.ts:9; test payments.test.ts |
| STD-actions-registry-11d | Governance cứng: gửi hàng loạt (chiến dịch) luôn duyệt | standards/actions/action-registry.md:38 | 037 | CHƯA | campaign.* chưa có handler (actions.json); policy.ts:24 bulk→preview |
| STD-actions-registry-11e | Governance cứng: gửi hợp đồng luôn qua duyệt + Owner ký trước | standards/actions/action-registry.md:39 | 030 | ĐẠT | packages/core/src/contracts/actions/contract-approval.handlers.ts:99; test contracts.test.ts |
| STD-actions-registry-12 | Mỗi action có file test riêng `*.action.test.ts`: happy, 403, SCOPE_FORBIDDEN, policy từng nguồn, idempotency, undo, INVALID_TRANSITION/STALE | standards/actions/action-registry.md:40 | 023b | MỘT PHẦN | Không có file `*.action.test.ts` nào; ca nằm rải trong apps/api/test/integration/<domain>.test.ts, không đủ ma trận cho từng action (023b chỉ test phủ handler/preview/tra cứu); planning update: TIP023b SPECIFICATIONS A/B, exact manifest and targeted per-action/custom-schema/useAction-approval tests now own the gap. Runtime not verified. |
| STD-actions-registry-13 | Action FE dựng sẵn là contract; BE cài đúng schema, đổi = L2 | standards/actions/action-registry.md:48 | mọi TIP | QUY-TẮC | `pnpm --filter @appchat/contract test` + apps/api/test/integration/contract.test.ts (harness mock vs HTTP) |
| STD-ai-gateway-0 | Mọi lời gọi model dùng AI SDK (generate/stream/tool/embed/rerank) | standards/ai/agent-gateway.md:7 | 019 | ĐẠT | packages/ai/src/gateway/engine.ts; test packages/ai/test/engine.test.ts |
| STD-ai-gateway-1 | Cấm import `ai` / `@ai-sdk/*` ngoài packages/ai | standards/ai/agent-gateway.md:9 | mọi TIP | QUY-TẮC | `pnpm lint` — no-restricted-imports trong packages/core/eslint.config.mjs:11, apps/api, apps/worker, packages/channels |
| STD-ai-gateway-2 | Tool = action qua ActionExecutor; mọi tool một kiểu `ToolSpec` có `origin` | standards/ai/agent-gateway.md:11 | 019 | ĐẠT | packages/ai/src/gateway/types.ts:20; test engine.test.ts:49,99 |
| STD-ai-gateway-3 | Trợ lý theo quyền user; agent theo tool_ids ∩ agentGrantable; `find_actions` lọc theo quyền | standards/ai/agent-gateway.md:16 | 021, 023 | ĐẠT | packages/core/src/ai/assistant/catalog.ts:18,78; test assistant-unit.test.ts, agents.test.ts |
| STD-ai-gateway-4 | Run dừng ghi `ai_run.state` + approval trong 1 tx; chạy tiếp bằng job `ai-resume` idempotent | standards/ai/agent-gateway.md:20 | 019, 021 | ĐẠT | packages/core/src/ai/runs/runner.ts:3; approvals/resume.queue.ts:22; test ai-runtime.test.ts, agents.test.ts |
| STD-ai-gateway-5 | Rào chắn: maxSteps 8/16, ngân sách credit cả cây, loop 3 lần, độ sâu ≤ 2, ≤ 3 transfer | standards/ai/agent-gateway.md:23 | 019b | MỘT PHẦN | MaxSteps/loop/depth có ở runner/engine/delegate và tests019/022/023; reply/reply-tools.ts:19,110 consult dùng budget40 riêng, runs/runner.ts:100 dùng budget của run hiện tại. Chưa chứng minh shared root budget atomic cho cả cây; cần supplemental AI runtime, không lấy engine single-run test làm bằng chứng tree budget. |
| STD-ai-gateway-6 | Mỗi bước LLM: kiểm balance > 0 rồi `CreditMeter.charge` idempotent trước khi ghi `ai_run_step.credits` | standards/ai/agent-gateway.md:28 | 019b | MỘT PHẦN | runs/runner.ts:110-113; billing/services/credit-meter.ts:57; test ai-runtime.test.ts Re-audit2026-11-02: wallet idempotency does not make runner tenant step+counter atomic; credit-meter recalculates price on duplicate.019b receives receipt/recovery tests; not runtime PASS. |
| STD-ai-gateway-7 | Output agent trực kênh có cấu trúc zod; handoff khi confidence thấp/khiếu nại/lặp/từ cấm | standards/ai/agent-gateway.md:29 | 022 | ĐẠT | packages/ai/src/reply/output.ts:1, handoff.ts:5; test packages/ai/test/reply.test.ts |
| STD-ai-gateway-8 | Prompt trong kho `packages/ai/prompts/<name>.<locale>.md` có version | standards/ai/agent-gateway.md:31 | 022, 023 | ĐẠT | packages/ai/src/prompts/assistant.vi.md:1, prompts/index.ts:1 (DV-005); test reply.test.ts |
| STD-ai-gateway-9 | Che CCCD / số thẻ / STK trước khi gửi LLM, khôi phục khi gửi ra | standards/ai/agent-gateway.md:32 | 022 | ĐẠT | packages/ai/src/reply/pii.ts:1; test reply.test.ts |
| STD-ai-gateway-10 | Trợ lý theo user.locale; agent theo ai_agent.language (auto = contact.locale) | standards/ai/agent-gateway.md:33 | 022, 023 | ĐẠT | packages/core/src/ai/reply/reply-context.ts:92; test agent-reply.test.ts |
| STD-ai-gateway-10b | Agent chạy bản đã xuất bản; chat thử bản nháp + dryRun; Trợ lý tạo agent qua `agent.create_and_publish` có preview | standards/ai/agent-gateway.md:34 | 021, 024 | ĐẠT | reply-context.ts:37; agents/agent.runtime.ts:96; actions.json agent.create_and_publish preview=true; test agents.test.ts |
| STD-ai-gateway-11a | Mỗi bước ghi `ai_run_step` + phát `run.step` qua WS để Owner xem trực tiếp | standards/ai/agent-gateway.md:35 | 019b | MỘT PHẦN | Bước ghi DB (run.store.ts); `onEvent` runner.ts:47 không nối WS, events.ts không có `run.step` (TIP-023 hoãn); 023c chỉ làm SSE trợ lý, không WS cho run agent / Cowork |
| STD-ai-gateway-11b | Metric latency / token / lỗi theo provider + model | standards/ai/agent-gateway.md:35 | 045b | CHƯA | Không có prom-client; 045b task 1 (`llm_tokens_total`, `llm_errors_total`) |
| STD-ai-gateway-11c | `run.cancel` huỷ cả cây run | standards/ai/agent-gateway.md:35 | 019 | ĐẠT | packages/core/src/ai/runs/run-cancel.handler.ts:1, cancel.listener.ts; test ai-runtime.test.ts:120 |
| STD-ai-gateway-12a | Provider trong `llm_provider` (key mã hoá), gốc hoặc openai_compatible; route theo capabilities | standards/ai/agent-gateway.md:37 | 019 | CHỜ-TK | packages/ai/src/router/router.ts:1; test router.test.ts:21,59 — Q-001 (9router chưa cấp) |
| STD-ai-gateway-12b | Chỉ provider `active` **và đã probe OK** mới được route | standards/ai/agent-gateway.md:38 | 040 | MỘT PHẦN | core/src/ai/router/provider.store.ts:38 chỉ lọc `status: active`; không kiểm `last_probe_at`; `admin.llm_provider.probe` chưa có (TIP-040) |
| STD-ai-gateway-12c | Fallback 5xx / 429 / timeout theo `model_route.priority`; không hard-code tên model | standards/ai/agent-gateway.md:39 | 019 | ĐẠT | router.ts:54-58; grep tên model trong src = 0; test router.test.ts:32 |
| STD-ai-eval-1 | Bộ ca `packages/ai/eval/cases/<suite>/*.yaml` đủ 10 suite (assistant-actions/ui, genui, agent-create, rag, doc-draft, agent-reply/handoff/governance, delegate-consult) | standards/ai/eval.md:7 | 044 | CHƯA | packages/ai/eval không tồn tại |
| STD-ai-eval-2 | Mỗi ca có id, seed, actor, input, expect, locale | standards/ai/eval.md:18 | 044 | CHƯA | Chưa có ca |
| STD-ai-eval-3 | Replay mọi PR (ghi âm theo hash prompt) + Live khi `AI_EVAL_LIVE=1` | standards/ai/eval.md:19 | 044 | CHƯA | Không có harness; CI không có bước eval |
| STD-ai-eval-4 | Ngưỡng live: an toàn 100%, chọn action ≥ 95% (2/3), rubric ≥ 90% LLM-judge | standards/ai/eval.md:22 | 044 | CHƯA | Chưa có; Q-023 cho bộ `pnpm ai:live` (023b) |
| STD-ai-eval-5 | Mỗi lỗi AI trên prod sinh ít nhất một ca eval trước khi sửa | standards/ai/eval.md:26 | mọi TIP | QUY-TẮC | Quy trình; chưa có lệnh kiểm (phụ thuộc 044) |
| STD-ai-eval-6 | Báo cáo `reports/ai-eval-<date>.md` (điểm suite, diff, model, version prompt, token) | standards/ai/eval.md:27 | 044 | CHƯA | Không có reports/ai-eval-* |
| STD-ai-eval-7 | Seed eval dùng fixture riêng `fixtures/ai-eval` | standards/ai/eval.md:28 | 044, 023b | CHƯA | fixtures/ai-eval không tồn tại (023b task 4 tạo live-seed) |
| STD-ai-genui-1 | LLM trả JSON `UiTree` zod (`packages/shared/src/genui/schema.ts`), sai → thử lại 1 lần → khối lỗi | standards/ai/generative-ui.md:7 | 023c | CHƯA | packages/shared/src/genui không tồn tại |
| STD-ai-genui-2 | Danh mục khối đóng (layout, display, action, `qr`), tone ngữ nghĩa map token | standards/ai/generative-ui.md:10 | 023c | CHƯA | Chưa có renderer apps/web/src/shared/genui |
| STD-ai-genui-3 | Số liệu stat/table/chart chỉ là `$ref` tới bước run; renderer format bằng fmt | standards/ai/generative-ui.md:16 | 023c | CHƯA | Chưa có |
| STD-ai-genui-4 | Nút chỉ `ui` (UiCommand) hoặc `action` qua Executor; ẩn nút không quyền | standards/ai/generative-ui.md:19 | 023c | CHƯA | Chưa có |
| STD-ai-genui-5 | Form gắn action_id, ô sinh từ schema action, ô `secret` không bao giờ tới LLM / log | standards/ai/generative-ui.md:22 | 023c | CHƯA | Chưa có; executor redactDeep chỉ theo REDACT_KEYS (executor.ts:52) |
| STD-ai-genui-6 | Chữ LLM theo user.locale; nhãn hệ thống qua i18n; không render markdown/HTML tuỳ ý | standards/ai/generative-ui.md:27 | 023c | CHƯA | Chưa có |
| STD-ai-genui-8 | Giới hạn cây: sâu ≤ 4, ≤ 30 khối, table ≤ 6×20, chart ≤ 24, nút "Xem đầy đủ"; mobile không tràn | standards/ai/generative-ui.md:29 | 023c | CHƯA | Chưa có `limits.ts` |
| STD-ai-genui-9 | Chế độ compact (drawer) / full (modal 960 + màn Trợ lý); ưu tiên filter+highlight bảng màn | standards/ai/generative-ui.md:30 | 023c | CHƯA | Chưa có GenUiModal |
| STD-ai-genui-10 | "Phân tích nhanh" của drawer là danh sách cố định theo màn | standards/ai/generative-ui.md:36 | 023c | GIẢ | 7 drawer Trợ lý theo màn trả câu soạn sẵn theo regex (TIP-023c CONTEXT); 023c task 7 |
| STD-ai-genui-11 | Cây lưu `assistant_message.content.parts[] {type:'ui'}`, phát lại không gọi LLM; stream render dần | standards/ai/generative-ui.md:37 | 023c | CHƯA | DV-006 (JSON một lần); 023c task 2, 6a |
| STD-ai-genui-12 | Test: unit schema/renderer/tone/quyền/form; fixture ≥ 3 cây mỗi drawer (`genui[]`); e2e | standards/ai/generative-ui.md:38 | 023c | CHƯA | Chưa có |
| STD-ai-genui-12e | Eval `genui`: schema hợp lệ ≥ 95%, an toàn 100% (ref, xác nhận, tiêm lệnh) | standards/ai/generative-ui.md:42 | 044 | CHƯA | Chưa có suite |
| STD-ai-rag-1 | Một kho / workspace theo thư mục + thẻ; origin upload/url/text/catalog/conversation/drive(Sắp có) | standards/ai/rag.md:7 | 020 | ĐẠT | packages/core/src/ai/kb/kb.handlers.ts; kb.read.ts:25; test apps/api/test/integration/kb.test.ts:128 |
| STD-ai-rag-2 | Agent nhận tri thức theo `kb_scope {folder_ids, tags}`; Trợ lý tìm cả kho theo quyền | standards/ai/rag.md:9 | 020, 021 | ĐẠT | packages/core/src/ai/kb/search.ts:57; test kb.test.ts:150 |
| STD-ai-rag-3a | `visibility` public/internal; agent trực kênh chỉ public; delegate = scope ∩ quyền người ra lệnh | standards/ai/rag.md:13 | 020, 022 | ĐẠT | kb/kb-search.handler.ts:15; test kb.test.ts:150,160 |
| STD-ai-rag-3b | Mặc định visibility của thư mục kế thừa xuống tài liệu | standards/ai/rag.md:17 | 020b | MỘT PHẦN | `kb_folder.visibility` có cột (ai-kb.prisma:37) nhưng `kb.add_source` dùng `input.visibility` mặc định 'public' (settings-ai.ts:43, kb.handlers.ts:78), không đọc thư mục |
| STD-ai-rag-4 | Giá / tồn / KM / lịch / công nợ chỉ qua read action; đoạn có giá `volatile` không vào prompt | standards/ai/rag.md:18 | 020, 027 | ĐẠT | packages/ai/src/kb/chunker.ts:76; catalog/events/catalog-sync.ts:1; test kb.test.ts:95,150, catalog.test.ts:212 |
| STD-ai-rag-5 | Nạp: parse → cắt đoạn theo cấu trúc 400–800 token chồng 10–15% → embedMany; idempotent sha256; sản phẩm đổi → nạp lại | standards/ai/rag.md:20 | 020, 027 | ĐẠT | chunker.ts:25-26; kb.handlers.ts:53; catalog-sync.ts:76; test kb.test.ts:95,113, catalog.test.ts:212 |
| STD-ai-rag-6a | Hybrid: top-20 vector (HNSW + iterative_scan) + top-20 từ khoá → RRF k=60 → top-6 | standards/ai/rag.md:25 | 020 | ĐẠT | packages/ai/src/kb/rrf.ts:2; core/src/ai/kb/search.ts:90; test kb.test.ts:141 |
| STD-ai-rag-6b | Có `model_route` purpose=rerank thì rerank | standards/ai/rag.md:27 | 046 | CHƯA | Chỉ có kiểu `ModelPurpose 'rerank'` (gateway/types.ts:25), không gọi rerank |
| STD-ai-rag-7 | Ngưỡng `min_score` theo workspace: không căn cứ thì không bịa | standards/ai/rag.md:29 | 020, 022 | ĐẠT | kb/search.ts:73-79; test kb.test.ts:141 |
| STD-ai-rag-8a | Câu trả lời dựa RAG ghi `citations[{source_id, chunk_id}]` | standards/ai/rag.md:30 | 020 | ĐẠT | kb/search.ts:37; kb-search.handler.ts:27 (output lưu ai_run_step); test kb.test.ts:141 |
| STD-ai-rag-8b | UI hiện nguồn trích dẫn ở nhật ký AI và bản nháp | standards/ai/rag.md:32 | — | CHƯA | grep `citations` trong apps/web/src = 0 |
| STD-ai-rag-9 | Học từ hội thoại: `kb_suggestion` chờ duyệt `kb.manage`, che PII | standards/ai/rag.md:33 | 043 | CHƯA | Không có bảng/handler kb_suggestion |
| STD-ai-rag-10a | Embedding 1536 chiều, provider theo `model_route` purpose=embed; truy vấn chỉ so cùng `embed_model` | standards/ai/rag.md:37 | 020 | CHỜ-TK | migration 020_ai_kb:57 vector(1536); search.ts:94; Q-002 |
| STD-ai-rag-10b | Đổi model embed → job re-embed toàn kho | standards/ai/rag.md:38 | 046 | CHƯA | Chỉ comment search.ts:84 |
| STD-ai-rag-11 | Index HNSW, GIN trgm, kb_chunk(source_id), kb_source(folder_id,status) partial | standards/ai/rag.md:39 | 020 | ĐẠT | migration 20261031600000_020_ai_kb:96; test kb.test.ts:75 (EXPLAIN) |
| STD-api-envelope-1 | Thành công `{ data, meta? }`, không trả mảng trần | standards/api/response-envelope.md:7 | 003 | ĐẠT | packages/shared/src/api/envelope.ts; test contract.test.ts |
| STD-api-envelope-2a | List cursor `{data, next_cursor}`, cursor base64url, limit ≤ 100 | standards/api/response-envelope.md:8 | 003 | ĐẠT | inbox/repos/conversations.repo.ts:78; crm-read.service.ts:22 (MAX_LIMIT 100); test inbox.test.ts |
| STD-api-envelope-2b | 9 bảng có số trang (D42): `?page=&limit=` → `meta {total,page,limit}`, offset + deferred join | standards/api/response-envelope.md:11 | 036, 037 | MỘT PHẦN | crm-read.service.ts:67 + 6 *-read.service; test crm-ui.test.ts:71 chỉ chứng minh các domain đã nối. Loyalty HTTP module stub, marketing chưa có; TIP-036 TASK 1/4 và AC7 nhận phần loyalty, 037 nhận phần marketing |
| STD-api-envelope-3 | Lỗi `{error:{code,message,fields}}`, code trong `packages/shared/src/errors.ts`, fields là mã | standards/api/response-envelope.md:12 | 003 | ĐẠT | apps/api/src/http/kernel/error.filter.ts:26; packages/shared/src/errors.ts |
| STD-api-envelope-4 | Service ném AppError; filter toàn cục; cấm `res.status().json()` | standards/api/response-envelope.md:16 | 003 | ĐẠT | error.filter.ts:25; grep `res.status(` = 0 |
| STD-api-envelope-5 | Mã HTTP chuẩn (422/401/403/404/409/402/429+Retry-After/503/500) | standards/api/response-envelope.md:17 | 003 | ĐẠT | error.filter.ts:9,35; test auth.test.ts:86 |
| STD-api-envelope-7 | `Idempotency-Key` bắt buộc với send/money/create; replay trả kết quả cũ | standards/api/response-envelope.md:22 | 003 | ĐẠT | executor.ts:108-118; test actions-unit.test.ts:58, actions.test.ts |
| STD-api-envelope-8 | Thiếu / sai X-Workspace-Id → 403 trước khi mở DB tenant | standards/api/response-envelope.md:23 | 004 | ĐẠT | apps/api/src/http/kernel/request-actor.ts:1; test actions.test.ts:52 |
| STD-api-envelope-9 | Tiền string VND, thời gian ISO có offset, id uuid, snake_case | standards/api/response-envelope.md:24 | mọi TIP | QUY-TẮC | Zod shape packages/shared/src/api/*.ts; `pnpm --filter @appchat/contract test` |
| STD-api-envelope-10a | Contract zod ở packages/actions + packages/shared/src/api/<domain>.ts, FE dùng chung | standards/api/response-envelope.md:29 | 003+ | ĐẠT | packages/shared/src/api/ (21 domain); tools/contract/src/check.ts; test contract.test.ts |
| STD-api-envelope-10b | OpenAPI sinh từ zod (Blueprint: `/v1/docs`) | standards/api/response-envelope.md:29 | — | CHƯA | grep `openapi` trong packages/apps = 0; không TIP nào nhận |
| STD-api-envelope-11 | Mã nghiệp vụ dùng chung INVALID_TRANSITION / STALE_VERSION / HAS_DEPENDENCIES / SLOT_TAKEN / DUPLICATE | standards/api/response-envelope.md:31 | 003 | ĐẠT | packages/shared/src/errors.ts:26; envelope.ts:23 |
| STD-authz-rbac-1 | Code chỉ kiểm permission, không kiểm tên vai trò | standards/authz/rbac-permissions.md:8 | mọi TIP | ĐẠT | grep `role === 'owner'` trong core/api = 0 (members.service.ts:25 chỉ sắp xếp hiển thị); packages/shared/src/authz |
| STD-authz-rbac-2 | Executor kiểm `ActionDef.permission` trước handler; UI dùng cùng `can()` | standards/authz/rbac-permissions.md:11 | 005 | ĐẠT | executor.ts:83; apps/web/src/shared/authz; test authz.test.ts |
| STD-authz-rbac-3 | Danh mục permission ở `packages/shared/src/authz/permissions.ts` | standards/authz/rbac-permissions.md:12 | 005 | ĐẠT | packages/shared/src/authz/permissions.ts |
| STD-authz-rbac-4 | Vai trò = permissions + data_scope ở DB tenant; 5 vai trò hệ thống seed, không sửa/xoá | standards/authz/rbac-permissions.md:15 | 005 | ĐẠT | packages/shared/src/authz/roles.ts; test roles.test.ts, authz.test.ts |
| STD-authz-rbac-5a | `scopeFilter(ctx, module)` own/team/all áp mọi list/get; own gồm collaborator/watcher (D32) | standards/authz/rbac-permissions.md:19 | 005, 015, 042c | MỘT PHẦN | order-access.ts:36-45/contract-access.ts:36-45 detail owner==me trước gate none trong khi list FALSE; watcher bị loại khỏi sales/booking. Test CRM không chứng minh mọi domain;042c AC1–4 |
| STD-authz-rbac-5b | Scope `team` theo `team_id` (bảng team/team_member có, UI Nhóm P1) | standards/authz/rbac-permissions.md:21 | 042c | MỘT PHẦN | scope.ts:26 lọc theo teamUserIds; thiếu team_id5 bảng; TIP042c đã viết, gateQ-029 chưa trả lời |
| STD-authz-rbac-6 | AI chạy đúng quyền người ra lệnh / agent tool_ids / task = creator ∩ scope | standards/authz/rbac-permissions.md:24 | 021–023, 035 | ĐẠT | agent-authz.ts:3; ai/tasks/task.store.ts; test ai-tasks.test.ts |
| STD-authz-rbac-7a | Mỗi workspace đúng một Owner luôn có mọi permission | standards/authz/rbac-permissions.md:28 | 005 | ĐẠT | scope.ts:21 (`isOwner`); DC-025 |
| STD-authz-rbac-7b | `workspace.transfer_ownership` (config, OTP) | standards/authz/rbac-permissions.md:28 | 045b | CHƯA | Không có trong packages/actions; 045b task 7 |
| STD-authz-rbac-8 | Field-level: serializer lọc trường theo `visible_roles` phía server | standards/authz/rbac-permissions.md:30 | 045b | CHƯA | `fieldsForRole` chỉ ở shared/custom-fields/values.ts:43 (FE); 045b task 8 |
| STD-authz-rbac-9 | Kiểm 2 lớp (guard + repo scope); test role-isolation kèm tenant-isolation | standards/authz/rbac-permissions.md:31 | 005 | ĐẠT | apps/api/test/integration/role-isolation.harness.ts:1; authz.test.ts |
| STD-authz-rbac-D32a | Chống giành khách: trùng khách có owner → CONTACT_OWNED 409 + "Xin chia sẻ" | standards/authz/rbac-permissions.md:41 | 015 | ĐẠT | crm/services/contacts.service.ts:69; contact-owner.handlers.ts:125; test crm-contacts.test.ts |
| STD-authz-rbac-D32b | Chuyển phụ trách chỉ `crm.reassign`; Agent / Trợ lý chỉ **đề xuất (approval)** | standards/authz/rbac-permissions.md:42 | — | MỘT PHẦN | `contact.transfer_owner` permission crm.reassign nhưng risk `write` + agentGrantable (packages/actions/src/crm.ts:172-186) → policy.ts:13 nguồn agent chạy thẳng, assistant chỉ preview; không ép approval |
| STD-authz-rbac-D32c | `contact_collaborator(user_id, contact_id)` index cho scope own | standards/authz/rbac-permissions.md:44 | 015 | ĐẠT | migration 20261031000000_015_crm:226 |
| STD-authz-rbac-plan | Giới hạn user theo `plan.max_users` | standards/authz/rbac-permissions.md:65 | 009 | ĐẠT | billing/services/quota.service.ts:23; test billing.test.ts |
| STD-channels-adapter-1 | Mọi kênh qua ChannelAdapter; core không import SDK kênh (zca-js, imapflow) | standards/channels/omnichannel-adapter.md:8 | mọi TIP | QUY-TẮC | `pnpm depcheck` (.dependency-cruiser.cjs `no-non-package-json`; SDK chỉ ở packages/channels/package.json:18-21) |
| STD-channels-adapter-2 | UI và AI chỉ đọc ChannelManifest, không `switch(type)` rải rác | standards/channels/omnichannel-adapter.md:9 | — | MỘT PHẦN | Cần rà từng UI/AI consumer manifest để chứng minh toàn nghĩa vụ. Bằng chứng cũ poller.ts:105 là worker core, không phải UI/AI nên đã bỏ như một kết luận vi phạm dòng này; chưa nâng ĐẠT khi thiếu audit đúng phạm vi. |
| STD-channels-adapter-3 | `channel_account.type` là text theo registry, không enum Postgres | standards/channels/omnichannel-adapter.md:10 | 014 | ĐẠT | packages/db/prisma/tenant/channels.prisma:21; test packages/channels/test/registry.test.ts |
| STD-channels-adapter-4 | Inbound → NormalizedInbound; outbound nhận OutboundMessage; adapter tự render | standards/channels/omnichannel-adapter.md:13 | 014 | ĐẠT | packages/channels/src/types.ts:42,56; test zalo-render.test.ts, zalo-adapter.test.ts |
| STD-channels-adapter-5 | UNIQUE(channel_account_id, external_msg_id) chống trùng | standards/channels/omnichannel-adapter.md:14 | 016 | ĐẠT | packages/db/prisma/tenant/inbox.prisma:173; test inbox.test.ts |
| STD-channels-adapter-6 | Gửi qua outbox + rate limiter theo manifest, ghi đè bằng settings | standards/channels/omnichannel-adapter.md:15 | 014 | ĐẠT | core/src/channels/jobs/send.processor.ts:41; services/accounts.service.ts:23; test channels.test.ts |
| STD-channels-adapter-7 | `connect.kind` qr/oauth/credentials/webhook/embed + `connect.fields` dựng form | standards/channels/omnichannel-adapter.md:17 | 014 | ĐẠT | packages/channels/src/types.ts:17 |
| STD-channels-adapter-8a | Session dài dùng lease `lease:channel:{id}` | standards/channels/omnichannel-adapter.md:18 | 014 | ĐẠT | core/src/channels/jobs/lease.ts:1, services/control.ts:14; test channels.test.ts |
| STD-channels-adapter-8b | Kênh webhook dùng route `/hooks/channels/:type/:accountKey` + `tenant_channel_route` | standards/channels/omnichannel-adapter.md:18 | — | NGOÀI | 3 kênh phát hành không dùng webhook; kênh webhook (OA, Meta) = REQ-B08 P2 |
| STD-channels-adapter-9a | `probe()` → connected/degraded/error/expired ghi `channel_account.status` | standards/channels/omnichannel-adapter.md:19 | 014 | ĐẠT | packages/channels/src/types.ts:6; zalo-personal/adapter.ts:70; test zalo-adapter.test.ts |
| STD-channels-adapter-9b | Metric `channel_account_status{type}` | standards/channels/omnichannel-adapter.md:19 | 045b | CHƯA | Không có; 045b task 1 |
| STD-channels-adapter-10 | Credential AES-256-GCM, không log, không trả API | standards/channels/omnichannel-adapter.md:20 | 014, 018 | ĐẠT | email/email.handlers.ts:58; test channels.test.ts:125, email.test.ts:90 |
| STD-channels-adapter-C5 | Contract test dùng chung `channels/contract.test.ts` (normalize, dedupe, send, probe, rate limit) | standards/channels/omnichannel-adapter.md:62 | 045b | CHƯA | packages/channels/test chỉ có test riêng từng adapter; 045b task 12 |
| STD-code-filesize-1 | Trần dòng BE 600 / FE 400; page.tsx ≤ 120; *Screen ≤ 250; allowlist rỗng | standards/code/file-size-module-layout.md:5 | mọi TIP | QUY-TẮC | `pnpm lint:size` (tools/scripts/lint-size.mjs) — chạy 2026-11-01: 1619 file, không vượt; CI ci.yml:36 |
| STD-code-filesize-3 | Một domain một thư mục `packages/core/src/<domain>/` | standards/code/file-size-module-layout.md:13 | 001 | ĐẠT | packages/core/src/index.ts:59 DOMAINS; test packages/core/test/modules.test.ts:12 |
| STD-code-filesize-5 | File ≥ 500 (BE) / ≥ 350 (FE) tách trước rồi mới thêm | standards/code/file-size-module-layout.md:15 | mọi TIP | QUY-TẮC | `pnpm lint:size` (chỉ chặn trần cứng; ngưỡng tách là review) |
| STD-code-filesize-6 | Import một chiều + không vòng (dependency-cruiser) | standards/code/file-size-module-layout.md:16 | mọi TIP | QUY-TẮC | `pnpm depcheck` (.dependency-cruiser.cjs:10-36); web `no-circular-web` warn + baseline (DV-001) |
| STD-code-filesize-7 | Stub backend sẵn cho mọi domain (module, prisma, registry) | standards/code/file-size-module-layout.md:17 | 001 | ĐẠT | packages/db/prisma/{platform,tenant}/*.prisma; test modules.test.ts, packages/db/test/prisma-stubs.test.ts |
| STD-code-testing-1 | Test ở file riêng (`*.test.ts`, `apps/web/e2e/*.spec.ts`, tools/parity) | standards/code/testing.md:5 | mọi TIP | QUY-TẮC | Quy ước; `pnpm test` (turbo) — không có lint chặn test inline |
| STD-code-testing-2 | Integration chạy Postgres + Redis thật, DB tenant mỗi suite, không mock DB | standards/code/testing.md:11 | 002+ | ĐẠT | apps/api/test/integration/setup.ts; packages/db/test/integration/tenant-isolation.test.ts |
| STD-code-testing-2c | Contract test: adapter kênh, connector, registry action, API đọc FE↔BE | standards/code/testing.md:12 | 003, 012 | MỘT PHẦN | registry.test.ts, integrations/test/registry.test.ts, contract.test.ts có; contract chung kênh → 045b |
| STD-code-testing-3 | Test bắt buộc theo loại thay đổi (role-/tenant-isolation, e2e http, state/concurrency) | standards/code/testing.md:16 | mọi TIP | QUY-TẮC | `pnpm turbo run test --filter=...[origin/dev]` + `pnpm e2e:http` (tools/scripts/e2e-http.mjs) |
| STD-code-testing-4a | Factory dữ liệu test ở `packages/db/test/factories` | standards/code/testing.md:25 | 045b | CHƯA | Thư mục không tồn tại; 045b task 12 |
| STD-code-testing-4b | Đồng hồ cố định qua `Clock`, không `Date.now()` trực tiếp | standards/code/testing.md:25 | — | MỘT PHẦN | FixedClock có; channels/jobs/send.processor.ts:50,103 và sessions.ts:81–123 còn đồng hồ thực. Bỏ kết luận WalletService vi phạm production: billing.module.ts:48 đã inject () => c.now(); constructor fallback không đủ chứng minh bypass. Cần audit callsites còn lại và lint/test, không giữ số13 chưa phân loại. |
| STD-code-testing-4bc | Phạm vi test theo phần bị ảnh hưởng (D39) + 3 cổng TIP backend (D59) | standards/code/testing.md:26 | mọi TIP | QUY-TẮC | `pnpm turbo run test lint typecheck --filter=...[origin/main]`, `pnpm depcheck`, `pnpm parity <id>`, `pnpm e2e <module>` |
| STD-code-testing-5 | Báo kết quả trung thực, commit SHA, git status sạch trước DONE | standards/code/testing.md:34 | mọi TIP | QUY-TẮC | Quy trình (Completion Report); `git status --short` |
| STD-database-indexing-1 | Composite index cột `=` trước, range/sort sau; tenant không có workspace_id đầu index | standards/database/indexing.md:7 | mọi TIP | ĐẠT | migration 015_crm:264, 016 conversation_assignee_..._idx:157; EXPLAIN trong kb.test.ts:75, orders.test.ts |
| STD-database-indexing-2 | Covering `INCLUDE` cho cột chỉ SELECT | standards/database/indexing.md:10 | mọi TIP | ĐẠT | migration 034_support:92 `ticket_status_due_idx INCLUDE` |
| STD-database-indexing-3 | Deferred join cho list có LIMIT trên bảng rộng | standards/database/indexing.md:11 | mọi TIP | ĐẠT | crm/repos/contacts.repo.ts, orders.repo.ts, invoices.repo.ts, contracts.repo.ts, products.repo.ts (12 file) |
| STD-database-indexing-4 | Cursor `(sort_col, id)`, index kết thúc bằng id | standards/database/indexing.md:21 | mọi TIP | ĐẠT | conversations.repo.ts:78-99; quote_live_owner_idx (…created_at DESC, id DESC) |
| STD-database-indexing-5 | Partial index cho deleted_at / outbox pending / unread | standards/database/indexing.md:22 | mọi TIP | ĐẠT | migration 029_quotes:109, 030_contracts:153, kernel partial (tenant/kernel.prisma:4) |
| STD-database-indexing-6 | Expression index đúng biểu thức (lower, phone_norm, f_unaccent trgm) | standards/database/indexing.md:23 | mọi TIP | ĐẠT | 16 file core dùng `f_unaccent`; test tenant-isolation.test.ts:44, kb.test.ts:75 |
| STD-database-indexing-7 | List scope `own` có index bắt đầu owner/assignee | standards/database/indexing.md:27 | mọi TIP | ĐẠT | contact_owner_recent_idx, quote/contract/order_live_owner_idx, invoice_owner_idx, appointment_owner_start_idx, ticket_assignee_idx |
| STD-database-indexing-8 | Không `SELECT *` trong list API | standards/database/indexing.md:28 | — | MỘT PHẦN | crm/services/contact-view.ts:26 tuân thủ; packages/core/src/ai/tasks/tasks.read.ts:137 `SELECT r.*` trong list lượt chạy tác vụ |
| STD-database-indexing-9 | Không N+1; repo list có test đếm số query | standards/database/indexing.md:29 | — | CHƯA | Không có test đếm query nào (grep `$on('query'`/query count = 0) |
| STD-database-indexing-10 | Vector hnsw trên kb_chunk.embedding, lọc trước cosine sau | standards/database/indexing.md:30 | 020 | ĐẠT | migration 020_ai_kb; search.ts:90 |
| STD-database-indexing-R | TIP có list ghi index + EXPLAIN vào Completion Report | standards/database/indexing.md:3 | mọi TIP | QUY-TẮC | Quy trình; 25/35 report trong coding-packs/reports có EXPLAIN |
| STD-database-tenantdb-1 | Hai DB, hai Prisma client (platform / tenant) | standards/database/tenant-db.md:7 | 002 | ĐẠT | packages/db/prisma.{platform,tenant}.config.ts; test packages/db/test/resolver.test.ts |
| STD-database-tenantdb-2 | Bảng tenant không workspace_id, không RLS | standards/database/tenant-db.md:11 | 002 | ĐẠT | packages/db/prisma/tenant/kernel.prisma:4 |
| STD-database-tenantdb-4 | Chỉ lấy DB tenant qua `TenantDbResolver.get(ctx)`; cấm `new PrismaClient` tay | standards/database/tenant-db.md:13 | mọi TIP | ĐẠT | grep `new PrismaClient` ngoài packages/db/src = 0; test resolver.test.ts |
| STD-database-tenantdb-5a | Thao tác 2 DB: nền tảng trước, khoá idempotent | standards/database/tenant-db.md:16 | 003, 009, 045b | MỘT PHẦN | executor.ts:133-137 nested tenant transaction kết thúc trước platform commit; log/outbox/idempotency ghi ở transaction tenant sau:139-170. Chưa có bằng chứng fault/retry toàn bộ cross-DB handler; 045b phải kiểm/correct trước042, không suy từ comment là atomic |
| STD-database-tenantdb-5b | Job đối soát nền tảng ↔ tenant hằng giờ | standards/database/tenant-db.md:18 | 045b | CHƯA | grep reconcile job = 0; 045b task 9 |
| STD-database-tenantdb-6 | Migration `<ts>_<tip>_<desc>`, expand-compatible, deploy platform → template → tenant-migrate | standards/database/tenant-db.md:19 | 002 | ĐẠT | packages/db/prisma/tenant/migrations/20261031000000_015_crm; db/src/platform-recorder.ts:12; test tenant-migrate.test.ts |
| STD-database-tenantdb-8 | Cột chuẩn id uuid(v7), timestamptz, bigint VND, text cho loại mở rộng | standards/database/tenant-db.md:24 | mọi TIP | ĐẠT | kernel/ids.ts; prisma tenant/*.prisma |
| STD-database-tenantdb-9 | Bảng có chủ sở hữu có owner_user_id/assignee + `team_id` nullable | standards/database/tenant-db.md:28 | 042c | MỘT PHẦN | team_id chỉ crm/support/inbox; TIP042c AC5 thêm5 bảng còn thiếu + propagation/backfill gateQ-029; chưa code |
| STD-database-tenantdb-10 | Role Postgres app / provisioner / migrator tách quyền | standards/database/tenant-db.md:30 | 002 | ĐẠT | packages/db/src/env.ts:7-13; test tenant-isolation.test.ts:52,117 |
| STD-database-tenantdb-T | Test: X-Workspace-Id ngoài membership 403; resolver từ chối thiếu ctx; 2 workspace song song cô lập | standards/database/tenant-db.md:34 | 002, 004 | ĐẠT | tenant-isolation.test.ts:85,94; actions.test.ts:52 |
| STD-documents-templates-1 | Số liệu chỉ từ bản ghi; mẫu chỉ chứa biến; bảng hàng từ `{{#items}}` | standards/documents/templates.md:7 | 028 | ĐẠT | packages/shared/src/documents/render.ts; test variables.test.ts, documents.test.ts |
| STD-documents-templates-2a | Bảng `doc_template` kind quote/contract/payment_request/receipt, nguồn rich + docx (LibreOffice) | standards/documents/templates.md:10 | 028 | ĐẠT | prisma tenant/documents.prisma:14-31; core/src/documents/services/soffice.ts:12 (DV-007: rich cũng qua LibreOffice, render trong API) |
| STD-documents-templates-2b | Chứng từ ghi `template_id` + `template_version` đã dùng | standards/documents/templates.md:13 | — | MỘT PHẦN | Có ở sales-quotes.prisma:32, contracts.prisma:46; thiếu ở invoice / receipt (sales-payments.prisma) |
| STD-documents-templates-3 | Registry biến chuẩn có i18n; biến lạ báo lỗi khi lưu | standards/documents/templates.md:14 | 028 | ĐẠT | packages/shared/src/documents/variables.ts:1; test variables.test.ts, documents.test.ts |
| STD-documents-templates-4 | AI nhận diện biến DOCX (generateObject), người xác nhận trước khi lưu | standards/documents/templates.md:24 | 028 | CHỜ-TK | doc-template.handlers.ts:138; test documents.test.ts (model giả) — Q-001 |
| STD-documents-templates-5a | `quote.draft_from_content`: giá từ catalog, dòng ngoài danh mục `off_catalog` buộc duyệt | standards/documents/templates.md:28 | 029 | CHỜ-TK | sales/quotes/actions/quote-draft.handler.ts:21; test quotes.test.ts (model giả) — Q-001 |
| STD-documents-templates-5b | `contract.draft_from_content`: giữ nguyên văn điều khoản, khối `ai_suggested` Giữ/Bỏ | standards/documents/templates.md:32 | 030b | CHƯA | grep `ai_suggested` = 0; DV-010, Q-022 |
| STD-documents-templates-6a | Bảng kiểm Điều 398 / báo giá / dòng "không thay thế hoá đơn GTGT" (tự chèn, không xoá) | standards/documents/templates.md:36 | 028 | ĐẠT | shared/src/documents/render.ts:41; template-store.ts:27; test template-text.test.ts:28 |
| STD-documents-templates-6b | Kết quả bảng kiểm hiện trong preview của action gửi / duyệt | standards/documents/templates.md:40 | — | CHƯA | `legalChecklist` chỉ gọi ở doc-template handlers/template-store; quote.send / contract.submit preview không có (023b task 7 không nêu bảng kiểm) |
| STD-documents-templates-7a | Báo giá sent / HĐ từ pending_signature: PDF đóng băng `file_id` + `sha256` | standards/documents/templates.md:42 | 029, 030 | ĐẠT | quote-send.handlers.ts:86; services/quote-doc.ts:65; contracts.prisma:62-66; test quotes.test.ts, contracts.test.ts |
| STD-documents-templates-7b | HĐ đã ký chỉ đổi bằng phụ lục | standards/documents/templates.md:43 | 030b | CHƯA | `contract.create_appendix` chưa có (DV-010) |
| STD-documents-templates-8a | DOCX ≤ 10MB, từ chối macro / .docm, không chạy field code | standards/documents/templates.md:45 | 028 | ĐẠT | core/src/documents/services/docx.ts:11-24; test documents.test.ts |
| STD-documents-templates-8b | LibreOffice chạy user riêng, không mạng, thư mục tạm mỗi job | standards/documents/templates.md:46 | 045 | MỘT PHẦN | soffice.ts:2 thư mục hồ sơ riêng + timeout; user riêng / chặn mạng là việc systemd (TIP-045, Q-006) |
| STD-documents-templates-9 | Eval suite `doc-draft` | standards/documents/templates.md:47 | 044 | CHƯA | Chưa có |
| STD-domain-concurrency-1a | Cột `version` + `if_version` → STALE_VERSION cho contact, product, quote, contract, order, invoice, appointment, ticket, campaign, ai_agent, doc_template, profile_layout | standards/domain/concurrency.md:8 | — | MỘT PHẦN | if_version chỉ ở product (product.handlers.ts:86) + doc_template (doc-template.handlers.ts:69); không có cột version ở crm/contracts/sales-orders (contact, contract, order, profile_layout); ticket/appointment/invoice có cột nhưng không nhận if_version; campaign → 037 |
| STD-domain-concurrency-1b | FE gửi if_version; nhận 409 hiện "vừa được người khác cập nhật" + Tải lại | standards/domain/concurrency.md:9 | — | CHƯA | grep STALE_VERSION trong apps/web/src chỉ ở mock; không có xử lý UI / chuỗi errors.STALE_VERSION |
| STD-domain-concurrency-2 | Chuyển trạng thái compare-and-set, 0 dòng → INVALID_TRANSITION | standards/domain/concurrency.md:11 | 003+ | ĐẠT | sales/quotes/services/quote-system.ts:42 `updateMany where status`; test quotes.test.ts, orders.test.ts |
| STD-domain-concurrency-3 | Tiền/kho/credit/buổi: FOR UPDATE, sổ cái chỉ thêm, unique chống trừ đôi (điểm tách dòng riêng) | standards/domain/concurrency.md:12 | 009, 027, 032, 033 | ĐẠT | Bằng chứng hiện có: migration027:104 stock_movement unique,032:159,205; catalog.test.ts:142, billing.test.ts:98. Không dùng dòng này khẳng định loyalty đã triển khai. |
| STD-domain-concurrency-3-loyalty | Điểm loyalty: transaction/khoá/sổ append-only/unique chống cộng-trừ đôi | standards/domain/concurrency.md:12 | 036 | CHƯA | TIP036 có kế hoạch ledger/FIFO/idempotency; code chưa có. Tách khỏi dòng tiền/kho cũ để không che phần thiếu bằng trạng thái ĐẠT. |
| STD-domain-concurrency-4 | Idempotency theo nguồn: Idempotency-Key / (provider, external_id) / (event_id, consumer) | standards/domain/concurrency.md:16 | 003, 010, 012 | ĐẠT | executor.ts:108; kernel/events/dispatcher.ts:36; sales-orders.prisma:97; test integrations.test.ts:152 |
| STD-domain-concurrency-5a | Người gửi khi ai_mode=auto → chuyển copilot cùng tx; run kiểm ai_mode trước khi gửi | standards/domain/concurrency.md:21 | 045b | CHƯA | Không có trong inbox message handlers; 045b task 10 |
| STD-domain-concurrency-5b | Một hội thoại chỉ một run agent `running` (khoá Redis `conv:{id}:run`) | standards/domain/concurrency.md:22 | 045b | MỘT PHẦN | Chỉ dedupe debounce BullMQ (ai/reply/reply.queue.ts:27) + aiState (reply.service.ts:212); worker concurrency 8 (agent-reply.processor.ts:31), không khoá; 045b task 10 không nêu ; planning045b contracts annex now specifies task/AC, not runtime evidence |
| STD-domain-concurrency-6 | Đua người – job hết hạn: CAS thắng; job đọc lại trong tx | standards/domain/concurrency.md:23 | 029 | ĐẠT | quote-system.ts:36-43; test quotes.test.ts |
| STD-domain-concurrency-7a | Bulk xử lý từng bản ghi, trả kết quả theo id `ok / error.code` | standards/domain/concurrency.md:24 | — | MỘT PHẦN | conversation.bulk_update / ticket.bulk_update output `{ updated: number }` (actions/src/inbox.ts:272, support.ts:187) |
| STD-domain-concurrency-7b | Lô > 50 bản ghi chạy job, trả 202 + job id | standards/domain/concurrency.md:24 | 045b | CHƯA | executor.ts:18 chỉ 202 preview/approval; 045b task 11 |
| STD-domain-concurrency-8 | Lịch hẹn chống trùng bằng EXCLUDE USING gist → SLOT_TAKEN | standards/domain/concurrency.md:25 | 033 | ĐẠT | migration 20261101900000_033_booking; test booking.test.ts |
| STD-domain-concurrency-9 | Realtime chỉ invalidate / patch cache | standards/domain/concurrency.md:26 | 006 | ĐẠT | apps/web/src/shared/realtime |
| STD-domain-concurrency-T | Test song song: cùng if_version, cùng chuyển trạng thái, webhook lặp, trừ kho song song | standards/domain/concurrency.md:30 | — | MỘT PHẦN | Có: catalog.test.ts:142 (kho), billing.test.ts:98, relay-sequence.test.ts:84, webhook trùng integrations.test.ts:152; thiếu ca song song if_version / chuyển trạng thái |
| STD-domain-customfields-1 | Định nghĩa một nơi `custom_field_def`; key `cf_<n>` tự sinh; sys không đổi kiểu / xoá | standards/domain/custom-fields.md:7 | 015 | ĐẠT | crm/services/fields.service.ts:90; DC-061; test crm-settings.test.ts (key theo nhãn — keyFromLabel, không phải `cf_<n>`) |
| STD-domain-customfields-2a | Cột `custom jsonb` + GIN jsonb_path_ops cho 6 thực thể | standards/domain/custom-fields.md:10 | 015, 027, 029, 031, 033, 034 | ĐẠT | migrations 015:269, 027:120, 029:109, 031:129, 033:131, 034:103 |
| STD-domain-customfields-2b | Xoá trường: giữ giá trị 30 ngày (undo) rồi job dọn | standards/domain/custom-fields.md:12 | 045b | CHƯA | crm/actions/custom-field.handlers.ts:67 không có job dọn; 045b task 12 |
| STD-domain-customfields-3a | create/update 6 thực thể nhận `custom`, validate bằng `validateCustomValues` → 422 `custom.cf_x` | standards/domain/custom-fields.md:13 | 015+ | ĐẠT | 7 file core gọi validateCustomValues; test shared/src/custom-fields/values.test.ts |
| STD-domain-customfields-3b | Sửa giá trị trường của lịch hẹn sau tạo (`appointment.update`) | standards/domain/custom-fields.md:13 | 023b | CHƯA | Không có `appointment.update`; 023b task 8 (ticket.update đã có) |
| STD-domain-customfields-4a | Hiện theo visible_in: form / list / filter (`cf.<key>`, lọc trước phân trang) / detail | standards/domain/custom-fields.md:17 | 026 | ĐẠT | apps/web/src/shared/custom-fields/*; apps/api/src/http/crm/contacts.controller.ts:30 (+5 controller); test apps/web/e2e/custom-fields.spec.ts |
| STD-domain-customfields-4b | Thẻ Kanban hiện tối đa 2 trường tuỳ biến | standards/domain/custom-fields.md:23 | — | CHƯA | features/customers/components/KanbanCard.tsx không đọc custom |
| STD-domain-customfields-4c | Xuất Excel thêm cột trường tuỳ biến | standards/domain/custom-fields.md:23 | 038 | CHƯA | "Xuất Excel" Báo giá / Đơn / HĐ / Ticket → 038 (Q-024) |
| STD-domain-customfields-6 | `find_actions` trả input schema kèm định nghĩa trường `ai = true` của workspace | standards/domain/custom-fields.md:26 | 023b | CHƯA | grep custom trong core/src/ai/assistant/catalog.ts, meta-tools.ts = 0; 023b / 023c không nêu; planning update: TIP023b SPECIFICATIONS A/B, exact manifest and targeted per-action/custom-schema/useAction-approval tests now own the gap. Runtime not verified. |
| STD-domain-customfields-7 | Unit validate customValues + e2e tạo trường → cột/form/lọc/chi tiết | standards/domain/custom-fields.md:27 | 015, 026 | ĐẠT | values.test.ts:51; apps/web/e2e/custom-fields.spec.ts |
| STD-domain-gapfill-1 | Thang tra cứu + được tự quyết / phải hỏi (L2) | standards/domain/gap-filling.md:6 | mọi TIP | QUY-TẮC | Quy trình; sổ QUESTIONS.md / DECISIONS.md / DEVIATIONS.md |
| STD-domain-gapfill-3 | Không nút chết: không toast giả, không TODO trong handler | standards/domain/gap-filling.md:33 | mọi TIP | QUY-TẮC | grep `TODO` packages/core/src = 0; review (còn drawer AI giả → 023c, Xuất Excel giả → 038) |
| STD-domain-gapfill-4 | Luật nghiệp vụ là hàm thuần trong packages/shared, mock FE + BE gọi chung | standards/domain/gap-filling.md:37 | mọi TIP | QUY-TẮC | `pnpm --filter @appchat/shared test` (quote-math, vietqr, slots, flows…) |
| STD-domain-gapfill-5 | Shape đọc ở shared/api zod; harness contract mock vs HTTP; bật http khi xanh | standards/domain/gap-filling.md:47 | mọi TIP | ĐẠT | apps/api/test/integration/contract.test.ts:1; tools/contract/src/check.ts |
| STD-domain-gapfill-6 | Completion Report có mục "Giả định đã chọn" | standards/domain/gap-filling.md:53 | mọi TIP | QUY-TẮC | Quy trình (coding-packs/reports) |
| STD-domain-money-1.1 | Tiền số nguyên VND: DB bigint, JSON string, không float / toFixed | standards/domain/money-time-numbering.md:7 | mọi TIP | ĐẠT | prisma tenant bigint; shared/src/api zod money string |
| STD-domain-money-1.2 | Làm tròn half-up theo thứ tự `quoteTotals()`; mọi chỗ tính tiền chứng từ gọi chung | standards/domain/money-time-numbering.md:8 | 029, 031, 032 | ĐẠT | packages/shared/src/commerce/quote-math.ts; 10 file core dùng; test quote-math.test.ts |
| STD-domain-money-1.3 | qty numeric(12,3); thuế suất 0/5/8/10/null | standards/domain/money-time-numbering.md:15 | 029, 031 | ĐẠT | sales-quotes.prisma:81, sales-orders.prisma:108 |
| STD-domain-money-1.4 | Chia đợt / cọc theo %: làm tròn xuống, đợt cuối nhận phần dư | standards/domain/money-time-numbering.md:16 | — | CHƯA | Không có hàm chia đợt theo % (invoice.create nhận `amount` tay — actions/src/invoices.ts:24) |
| STD-domain-money-1.5 | Điểm floor; đổi điểm ≤ 50% đơn, bội 100đ | standards/domain/money-time-numbering.md:17 | 036 | CHƯA | `payment.redeem_points` chưa có |
| STD-domain-money-1.6 | Hoàn tiền một phần / theo buổi làm tròn xuống | standards/domain/money-time-numbering.md:18 | 032 | ĐẠT | shared/src/sales/invoice-state.ts:88 (chia bigint); test invoice-state.test.ts:52 |
| STD-domain-money-1.7 | Hiển thị tiền chỉ `fmt.money`, nhập `MoneyInput` | standards/domain/money-time-numbering.md:19 | — | MỘT PHẦN | fmt.money dùng rộng; không có `MoneyInput` (apps/web/src/shared/forms chỉ SignaturePad.tsx) |
| STD-domain-money-2.1 | Lưu UTC; ngày nghiệp vụ theo timezone workspace | standards/domain/money-time-numbering.md:23 | mọi TIP | ĐẠT | shared/src/time/wall-clock.ts, deadline.ts; test deadline.test.ts, wall-clock.test.ts |
| STD-domain-money-2.2 | Đồng hồ chỉ qua `Clock`; cấm Date.now()/new Date() trong service/handler/job | standards/domain/money-time-numbering.md:24 | — | MỘT PHẦN | Xem callsites đã xác minh ở STD-code-testing-4b; bỏ số13 và WalletService chưa chứng minh. Cần audit/lint business-time khác thời gian đo performance, không sửa máy móc mọi new Date dùng parse timestamp. |
| STD-domain-money-2.3 | Hạn theo ngày = 23:59:59.999 ngày (mốc+N) theo tz | standards/domain/money-time-numbering.md:25 | 029, 032 | ĐẠT | shared/src/time/deadline.ts; test deadline.test.ts |
| STD-domain-money-2.5 | Mốc nhắc (T-2 báo giá, T-1/T+1/T+7 đề nghị, lịch hẹn 24h) gửi trong giờ làm việc, ngoài giờ dời | standards/domain/money-time-numbering.md:27 | — | CHƯA | sales/payments/services/payment-system.ts:41 `remindDue` + quote remindExpiring không xét business_hours; job chạy `every` cố định (sales.jobs.module.ts:90) |
| STD-domain-money-2.7 | Giờ làm việc từ settings; SLA + mốc nhắc dùng chung `businessTime` | standards/domain/money-time-numbering.md:29 | 034 | MỘT PHẦN | addBusinessMinutes chỉ dùng ở support/services/sla-clock.ts; test business-time.test.ts |
| STD-domain-money-3.1 | Mã sinh trong tx bằng `sequence_counter` UPDATE…RETURNING, rollback không nhảy số | standards/domain/money-time-numbering.md:35 | 003 | ĐẠT | packages/core/src/kernel/sequence.ts:5; test relay-sequence.test.ts:84 |
| STD-domain-money-3.2 | `formatCode(kind,n)` đúng bảng KH/SP/BG/HĐ/DH/TT/PT/LH/TKT/CD; bắt đầu 1000 | standards/domain/money-time-numbering.md:36 | 003 | ĐẠT | packages/shared/src/codes.ts:2-26; test shared/src/state/flow.test.ts |
| STD-domain-state-1 | Một bảng `defineFlow` mỗi domain cho mọi entity có status (15 entity) | standards/domain/state-machine.md:8 | — | MỘT PHẦN | Có 6 flow (quote, order, contract, invoice, appointment, ticket); thiếu customer_payment, customer_package, conversation, channel_account, ai_agent, kb_source, approval_request (kiểm inline: approval.handlers.ts:46, agent.handlers.ts:120); campaign → 037 |
| STD-domain-state-2 | Handler `assertTransition` + CAS; sai → INVALID_TRANSITION 409 | standards/domain/state-machine.md:9 | 029–034 | ĐẠT | 13 file core dùng assertTransition; test quotes/orders/contracts/payments/booking/support.test.ts |
| STD-domain-state-3 | FE dùng cùng bảng để vô hiệu nút + tooltip; mock gọi assertTransition | standards/domain/state-machine.md:10 | 029–034 | ĐẠT | features/quotes/components/QuoteDrawer.tsx, OrderDrawer.tsx, ContractDrawer.tsx; mock contracts-actions.ts |
| STD-domain-state-4 | Chuyển bởi hệ thống đi qua action `source='system'`, đọc lại trong tx | standards/domain/state-machine.md:11 | — | MỘT PHẦN | Đọc lại có (quote-system.ts:37); nhưng job ghi thẳng `tx.quote.updateMany` + outbox, không qua ActionExecutor (không action_log) — quote expire, invoice overdue, package expire |
| STD-domain-state-5 | Trạng thái suy ra (pay_status, invoice partial/paid/overdue) tính lại cùng tx | standards/domain/state-machine.md:12 | 031, 032 | ĐẠT | invoiceStatusOf (DC-193); test invoice-state.test.ts, payments.test.ts |
| STD-domain-state-7 | Chuyển có nghĩa phát event `<entity>.<past>` + timeline_event | standards/domain/state-machine.md:14 | 029–034 | ĐẠT | crm/services/timeline.service.ts:7; quote-system.ts:45; test quotes.test.ts |
| STD-domain-state-T | `state.test.ts` mọi cặp (trạng thái × action) | standards/domain/state-machine.md:30 | 029–034 | ĐẠT | shared/src/{sales,orders,contracts,booking,support}/*-state.test.ts (6 flow) |
| STD-domain-validate-1 | Hàm chuẩn hoá `packages/shared/src/validate/` + mã PHONE/EMAIL/TAX_CODE/NATIONAL_ID/URL/AMOUNT/QTY/PERCENT/COLOR_INVALID, phone_norm E.164 | standards/domain/validation-defaults.md:7 | — | CHƯA | Thư mục validate không tồn tại; grep các mã = 0 trong shared/actions/core; normalizePhone (shared/src/crm/phone.ts:5) lưu dạng `0…` không phải E.164; MST regex chỉ ở onboarding.ts:15 |
| STD-domain-validate-1b | Trùng nghiệp vụ → fields DUPLICATE; khách có owner khác → CONTACT_OWNED | standards/domain/validation-defaults.md:25 | 015 | ĐẠT | contacts.service.ts:60-69; test crm-contacts.test.ts |
| STD-domain-validate-2 | Mặc định khi tạo do server đặt (owner = người ra lệnh, stage lead, valid_days 15…) | standards/domain/validation-defaults.md:29 | 015, 029, 031–034 | ĐẠT | DC-066; test quotes.test.ts, payments.test.ts:105 (hạn +7 ngày) |
| STD-domain-validate-3a | Xoá khách: mềm, chặn khi có đơn / HĐ chưa đóng hoặc công nợ → HAS_DEPENDENCIES | standards/domain/validation-defaults.md:43 | — | MỘT PHẦN | crm/actions/contact-write.handlers.ts:154 xoá mềm + undo, không kiểm phụ thuộc (grep HAS_DEPENDENCIES crm = 0) |
| STD-domain-validate-3b | Mọi xoá risk delete có preview số bản ghi ảnh hưởng | standards/domain/validation-defaults.md:56 | 023b | MỘT PHẦN | actions.json: 2/17 action delete có preview |
| STD-domain-validate-3c | Chứng từ lưu snapshot khách / sản phẩm lúc gửi / xác nhận | standards/domain/validation-defaults.md:57 | 029, 031 | ĐẠT | PDF đóng băng (quote-doc.ts:65); dòng quote_item/order_item lưu tên/giá |
| STD-domain-validate-4a | Tìm `q` không dấu (f_unaccent); lọc lạ bỏ qua; page vượt → trang cuối | standards/domain/validation-defaults.md:61 | mọi TIP | ĐẠT | test crm-ui.test.ts:73,77 |
| STD-domain-validate-4b | Xuất theo bộ lọc + scope; > 5.000 dòng chạy job + link qua thông báo | standards/domain/validation-defaults.md:64 | 045b | CHƯA | contacts.repo.ts:67 `LIMIT 5000` cắt cứng; 045b task 11 |
| STD-events-outbox-1 | Event chỉ qua outbox trong cùng tx + SADD outbox:dirty; cấm queue.add/emit từ handler | standards/events/outbox.md:5 | 003 | ĐẠT | kernel/outbox/outbox.ts:1,6; executor.ts:162-164; test actions.test.ts |
| STD-events-outbox-2 | Relay drain dirty → BullMQ `events`; sweep 10 phút; retry 2^n tối đa 8 → failed | standards/events/outbox.md:9 | 003 | ĐẠT | outbox/relay.ts:2,8; outbox.jobs.module.ts:53; test relay-sequence.test.ts |
| STD-events-outbox-3 | Tên `<entity>.<past_tense>` + zod payload trong shared/events.ts (ws, id, occurred_at) | standards/events/outbox.md:13 | mọi TIP | ĐẠT | packages/shared/src/events.ts:1-7 |
| STD-events-outbox-4 | Consumer idempotent `(event_id, consumer)` kể cả crash/replay đồng thời | standards/events/outbox.md:15 | — | MỘT PHẦN | kernel/events/dispatcher.ts:26 đọc receipt nhưng :35 handle rồi :36 ghi receipt riêng; crash giữa hai bước hoặc hai dispatch đồng thời vẫn gọi effect lại. Chưa chứng minh mọi consumer tự idempotent; không coi unique receipt là exactly-once. Cần TIP bổ sung kernel/consumer audit + fault tests. |
| STD-events-outbox-5 | Consumer có thay đổi nghiệp vụ chạy qua Action `source='system'` | standards/events/outbox.md:17 | — | MỘT PHẦN | Consumer sales/billing/catalog (payment.jobs.ts:44, sales.jobs.module.ts:33) ghi thẳng tx, không qua executor (chỉ 3 file core có `source: 'system'`) |
| STD-events-outbox-6 | Thứ tự đảm bảo theo từng entity (group theo entity_id) | standards/events/outbox.md:18 | — | CHƯA | events.runner.ts:37 concurrency 8, jobId = event id, không group theo entity |
| STD-events-outbox-7 | `outbox_message` tách riêng, trạng thái pending/sending/sent/failed/dead | standards/events/outbox.md:19 | 014, 016 | ĐẠT | prisma tenant/inbox.prisma:94-98,243 |
| STD-events-outbox-8 | Realtime WS là consumer; map room ws/user/conv; lọc quyền trước emit | standards/events/outbox.md:20 | 006 | ĐẠT | notify/realtime/envelope.ts:12, filter.ts, conv-guard.ts:1; test realtime.test.ts:67,109 |
| STD-events-outbox-9 | Event mới: khai schema + bảng Blueprint + test "action X phát event Y" | standards/events/outbox.md:21 | mọi TIP | QUY-TẮC | 13 file integration test kiểm outbox_event |
| STD-i18n-1 | Không chuỗi hiển thị cứng trong JSX; lint i18next mức error | standards/i18n/i18n.md:7 | mọi TIP | QUY-TẮC | `pnpm lint` — apps/web/eslint.config.mjs `i18next/no-literal-string` 2 |
| STD-i18n-2 | Key theo module `messages/<locale>/<module>.json`; en đủ key trước merge | standards/i18n/i18n.md:10 | mọi TIP | QUY-TẮC | `pnpm i18n:check` — chạy 2026-11-01: vi/en 4719 key 100%; CI ci.yml:35 |
| STD-i18n-3 | Không nối chuỗi; ICU plural | standards/i18n/i18n.md:11 | mọi TIP | QUY-TẮC | Review (không có lint riêng) |
| STD-i18n-4 | Định dạng qua `fmt.*`; cấm toLocaleString rải rác | standards/i18n/i18n.md:12 | — | MỘT PHẦN | Vi phạm: features/settings/components/ChannelsSection.tsx:50, ManageChannelDrawer.tsx:130,169,191, WidgetSection.tsx:134, features/assistant/components/TaskDrawer.tsx:161 (loyalty / marketing → 036, 037); không lint |
| STD-i18n-5 | Lỗi server trả code; client dịch `errors.<CODE>` | standards/i18n/i18n.md:13 | mọi TIP | ĐẠT | apps/web/messages/vi/errors.json; useAction.ts |
| STD-i18n-7 | Locale: user → workspace → Accept-Language → vi; không vào URL; antd/dayjs đồng bộ | standards/i18n/i18n.md:15 | 006 | ĐẠT | packages/shared/src/i18n/locales.ts:39; apps/web/src/i18n/request.ts:1; test locales.test.ts:10 |
| STD-i18n-8 | Email / PDF / thông báo render theo locale người nhận | standards/i18n/i18n.md:18 | 006, 028 | ĐẠT | packages/shared/src/i18n/server/{vi,en}; core/src/notify/mail.ts; test notify.test.ts |
| STD-i18n-9 | Prompt theo locale `*.vi.md` / `*.en.md` | standards/i18n/i18n.md:19 | 022, 023 | ĐẠT | packages/ai/src/prompts/{assistant,agent-reply}.{vi,en}.md |
| STD-i18n-10 | Bật ngôn ngữ mới khi phủ ≥ 98%; menu chỉ hiện enabled | standards/i18n/i18n.md:21 | — | QUY-TẮC | `pnpm i18n:check` báo độ phủ ngôn ngữ chưa bật |
| STD-integrations-ports-1a | BankFeedProvider phát hành SePay (chính) + Casso cho tiền khách của DN | standards/integrations/provider-ports.md:12 | — | GIẢ | packages/integrations/src/registry.ts:16-17 gắn `MockBankFeedProvider` cho cả sepay + casso; bank-feed.ts:38 (tenant) dùng adapter registry → Mock; `SepayBankFeed` (connectors/sepay/adapter.ts:33) chỉ dùng cho thu phí nền tảng (billing/payments/bank-hook.service.ts:24); Casso không có adapter thật |
| STD-integrations-ports-1b | TaxLookup VietQR, Mail Brevo / SMTP, Storage local, LLM qua AI SDK | standards/integrations/provider-ports.md:15 | 004, 006, 019, 020 | CHỜ-TK | connectors/vietqr/tax-lookup.ts, brevo/mail.ts, smtp/mail.ts; kernel/files/storage.ts (DV-003); test smtp.test.ts, ports.test.ts — Q-004 / Q-001 |
| STD-integrations-ports-1c | Port EInvoice / ESign CA / AccountingSync / CommerceSync / SheetSync / Sms | standards/integrations/provider-ports.md:13 | — | NGOÀI | REQ-M03b P2 (adapter thật); thẻ "Sắp có" coming-soon.ts:14 |
| STD-integrations-ports-2 | Mỗi adapter có ConnectorManifest; trang Nền tảng kết nối đọc manifest, "Sắp có" + Đăng ký quan tâm | standards/integrations/provider-ports.md:25 | 012 | ĐẠT | integrations/src/registry.ts:1; coming-soon.ts; test packages/integrations/test/registry.test.ts, integrations.test.ts:113 |
| STD-integrations-ports-3 | `integration_connection` mỗi workspace, secret AES-GCM không trả API; webhook tra route nền tảng | standards/integrations/provider-ports.md:26 | 012 | ĐẠT | prisma tenant/integrations.prisma:31; connections.service.ts:72; test integrations.test.ts:92-115 |
| STD-integrations-ports-4 | Core gọi `IntegrationResolver.get(ws, port)`; chưa kết nối → null / mock | standards/integrations/provider-ports.md:30 | 012 | ĐẠT | core/src/integrations/services/resolver.ts:13 |
| STD-integrations-ports-5 | Gọi ra ngoài qua queue `integrations` (retry, idempotency, dead-letter) + `integration_call_log` không secret | standards/integrations/provider-ports.md:31 | 012 | ĐẠT | integrations/jobs/integration-call.processor.ts:14; test integrations.test.ts:213 |
| STD-integrations-ports-6 | Webhook `/hooks/integrations/:connector/:connectionId`, kiểm chữ ký trong adapter, idempotent, 200 nhanh | standards/integrations/provider-ports.md:32 | 012 | ĐẠT | apps/api/src/http/integrations/hooks.controller.ts:11; webhook.service.ts:41; test integrations.test.ts:152 |
| STD-integrations-ports-7 | Mapping ở `integration_mapping`, không thêm cột `<vendor>_id` | standards/integrations/provider-ports.md:37 | 012 | ĐẠT | prisma tenant/integrations.prisma:52 |
| STD-integrations-ports-8a | Kết nối / ngắt là action quyền `integrations.manage` | standards/integrations/provider-ports.md:39 | 012 | ĐẠT | actions/src/settings-apps.ts:287,300; test integrations.test.ts:88 |
| STD-integrations-ports-8b | Action `integration.sync_now` và `integration.test` | standards/integrations/provider-ports.md:39 | — | CHƯA | Không có trong registry (TIP-012:57 "ngoài TIP"); 023c chỉ "Kiểm tra kết nối" kênh / probe, không sync_now |
| STD-integrations-ports-9 | Adapter hỗ trợ sandbox/live; test contract bằng mock + fixture; live chỉ khi `INTEG_LIVE_<KEY>=1` | standards/integrations/provider-ports.md:42 | 012 | CHỜ-TK | integrations/src/types.ts:42,51; test sepay.test.ts (fixture); chưa có ca live — Q-004 |
| STD-integrations-ports-D31 | OrderSync: pull/webhook → ExternalOrder, idempotent (connection_id, external_id), mapStatus | standards/integrations/provider-ports.md:46 | 031 | ĐẠT | sales-orders.prisma:97; core/src/sales/jobs/order-sync.jobs.ts:31; test packages/integrations/test/order-sync.test.ts, orders.test.ts (DV-011: không action `order.import_external`) |
| STD-ops-obs-1.1 | Logger pino JSON; cấm console.log backend | standards/ops/observability-security.md:7 | mọi TIP | QUY-TẮC | `pnpm lint` — `no-console: 2` packages/core, ai, channels, db, apps/api, apps/worker eslint.config.mjs |
| STD-ops-obs-1.2 | Mỗi dòng log có level, time, msg, traceId, ws, userId, source, job | standards/ops/observability-security.md:8 | 001 | ĐẠT | kernel/logger/logger.ts:23; test packages/core/test/logger.test.ts:48,56 |
| STD-ops-obs-1.3a | traceId nhận X-Request-Id / sinh uuidv7, trả header; vào action_log, outbox | standards/ops/observability-security.md:9 | 001, 003 | ĐẠT | apps/api/src/middleware/trace.middleware.ts:8-11; executor.ts:120,160; outbox.ts:28 |
| STD-ops-obs-1.3b | traceId truyền vào job BullMQ (`data.trace_id`), `ai_run`, worker → kênh (truy xuyên HTTP → worker) | standards/ops/observability-security.md:9 | 045b | MỘT PHẦN | relay publish có traceId (relay.ts:41) nhưng worker không `RequestContext.run` với nó (chỉ trace.middleware.ts:11); ai_run không có cột trace_id (ai-runs.prisma); send/reply/integration queue không mang trace_id; 045b không nêu ; planning045b contracts annex now specifies task/AC, not runtime evidence |
| STD-ops-obs-1.4 | Redact PII / bí mật theo `shared/src/log/redact.ts` | standards/ops/observability-security.md:10 | 001 | ĐẠT | packages/shared/src/log/redact.ts; executor.ts:52; test logger.test.ts:31,41, actions-unit.test.ts:147 |
| STD-ops-obs-1.5 | Mức log error/warn/info/debug đúng nghĩa; debug tắt prod | standards/ops/observability-security.md:11 | mọi TIP | QUY-TẮC | env LOG_LEVEL (kernel/env.ts:6); review |
| STD-ops-obs-1.6 | `/metrics` nội bộ: http, action, job, queue_depth, outbox_lag, llm_tokens, channel_send | standards/ops/observability-security.md:12 | 045b | CHƯA | Không có prom-client; 045b task 1 |
| STD-ops-obs-2.1 | Bí mật từ env; không commit .env; thiếu biến → không khởi động (zod) | standards/ops/observability-security.md:16 | 001 | ĐẠT | kernel/env.ts:4; git ls-files chỉ `.env.example`; test kernel.test.ts:74 |
| STD-ops-obs-2.2 | AES-256-GCM `APP_ENC_KEY` + key_version, một chỗ encrypt/decrypt | standards/ops/observability-security.md:17 | 012 | ĐẠT | packages/core/src/kernel/crypto.ts:1-20; test packages/core/test/crypto.test.ts |
| STD-ops-obs-2.3 | API không trả bí mật đã lưu | standards/ops/observability-security.md:18 | 012, 014 | ĐẠT | test integrations.test.ts:115, channels.test.ts:125 |
| STD-ops-obs-2.4 | Mật khẩu argon2id; OTP / token chỉ lưu sha256, so constant-time | standards/ops/observability-security.md:19 | 004 | ĐẠT | identity/services/secrets.ts:1; auth.service.ts:80; test auth.test.ts:113 |
| STD-ops-obs-3.1 | Upload: allowlist mime + magic bytes khi confirm, giới hạn theo loại, tên chuẩn hoá | standards/ops/observability-security.md:23 | 045b | MỘT PHẦN | files.controller.ts:32 chỉ giới hạn 25MB, tin mimetype client (DV-003 multipart); 045b task 3 |
| STD-ops-obs-3.2 | Rate limit chung: đọc 600, action 120, auth 5/phút/email + 20/giờ/IP, công khai 30/IP | standards/ops/observability-security.md:24 | 045b | MỘT PHẦN | kernel/rate-limit.ts chỉ dùng OTP / widget / ký; test auth.test.ts:86; 045b task 4 |
| STD-ops-obs-3.3 | Webhook kiểm chữ ký trước; sai 401 không lộ lý do | standards/ops/observability-security.md:25 | 010, 012, 032 | ĐẠT | sales/payments/services/bank-feed.ts:45; test integrations.test.ts:162 |
| STD-ops-obs-3.4 | Sanitize HTML người dùng / AI (mẫu, ghi chú rich, chiến dịch) trước lưu + render | standards/ops/observability-security.md:26 | 028, 037 | MỘT PHẦN | shared/src/documents/render.ts:63 (mẫu); nội dung chiến dịch → 037 |
| STD-ops-obs-3.5 | `safeFetch` chặn IP nội bộ / metadata, timeout 10s, ≤ 10MB | standards/ops/observability-security.md:27 | 045b | CHƯA | grep safeFetch = 0; 045b task 2 |
| STD-ops-obs-3.6a | CORS chỉ origin app + widget | standards/ops/observability-security.md:28 | 045b | CHƯA | grep enableCors trong apps/api = 0; 045b task 5 |
| STD-ops-obs-3.6b | Cookie refresh HttpOnly; Secure; SameSite=Lax | standards/ops/observability-security.md:28 | 004 | ĐẠT | apps/api/src/http/identity/http-util.ts:19-21; test auth.test.ts |
| STD-ops-obs-4a | Mọi action ghi action_log (actor, source, input che PII, trace_id) | standards/ops/observability-security.md:32 | 003 | ĐẠT | executor.ts:148-162; test actions.test.ts:117 |
| STD-ops-obs-4b | Action nền tảng / `admin.*` ghi `platform_audit_log`; sự kiện nhạy cảm audit + báo Owner | standards/ops/observability-security.md:32 | 045b | CHƯA | Bảng có (platform/ops.prisma:44) nhưng grep `platformAuditLog.` = 0; 045b task 6 |
| STD-ops-obs-5 | Test: log không SĐT/email/token; secret không ở GET; OTP lần 6 → 429; upload đổi đuôi bị từ chối | standards/ops/observability-security.md:37 | 001, 004, 045b | MỘT PHẦN | logger.test.ts, integrations.test.ts:115, auth.test.ts:86 có; upload mime → 045b AC1 |
| STD-ui-fe-1 | `app/` chỉ routing; page ≤ 120 dòng | standards/ui/frontend-structure.md:37 | mọi TIP | QUY-TẮC | `pnpm lint:size` (page.tsx ≤ 120) |
| STD-ui-fe-2 | Màn = orchestrator ≤ 250; mỗi drawer / modal một file trong components/ | standards/ui/frontend-structure.md:38 | mọi TIP | QUY-TẮC | `pnpm lint:size` (*Screen.tsx ≤ 250) |
| STD-ui-fe-3 | Import một chiều app → features → shared; không import features/b/components; không core/db | standards/ui/frontend-structure.md:40 | mọi TIP | QUY-TẮC | `pnpm lint` — eslint-plugin-boundaries + no-restricted-imports (apps/web/eslint.config.mjs); `pnpm depcheck` web-no-backend |
| STD-ui-fe-4 | Đọc TanStack Query, ghi chỉ `useAction`; cấm fetch/axios POST trong component | standards/ui/frontend-structure.md:44 | mọi TIP | QUY-TẮC | `pnpm lint` (cấm axios); grep `method: 'POST'` trong features = 0; apps/web/src/shared/actions/useAction.ts:1 |
| STD-ui-fe-5 | Không state server song song; Zustand chỉ UI state | standards/ui/frontend-structure.md:48 | mọi TIP | QUY-TẮC | Review |
| STD-ui-fe-6 | Form antd + `zodRule(schema)` từ packages/actions; tiền `MoneyInput`, SĐT `PhoneInput` | standards/ui/frontend-structure.md:49 | — | CHƯA | apps/web/src/shared/forms chỉ có SignaturePad.tsx; grep zodRule / MoneyInput / PhoneInput = 0 |
| STD-ui-fe-7 | Phân quyền UI bằng useCan / `<Can>`; scope từ useScope | standards/ui/frontend-structure.md:50 | mọi TIP | ĐẠT | apps/web/src/shared/authz; e2e apps/web/e2e/roles.spec.ts |
| STD-ui-fe-8 | Module khai `ui-commands.ts` (prefill / open / filter / highlight) | standards/ui/frontend-structure.md:53 | mọi TIP | ĐẠT | 14/17 features có ui-commands.ts (thiếu auth / dashboard / onboarding — không có form tạo nghiệp vụ); test shared/assistant/ui-command-bus.test.ts, agents/ui-commands.test.tsx |
| STD-ui-fe-9 | 5 trạng thái qua PageStates | standards/ui/frontend-structure.md:54 | — | MỘT PHẦN | PageStates.tsx:17–21 chỉ sinh empty khi có predicate, không tự sinh no-permission; QuotesScreen.tsx:87 và ProductsScreen.tsx:98 gọi stateOf(list) không predicate. Dùng component ở42 file không chứng minh đủ trạng thái; cần UI supplemental và matrix tests. |
| STD-ui-fe-10 | Chỉ token theme; cấm hard-code màu / px, CSS rời | standards/ui/frontend-structure.md:55 | mọi TIP | QUY-TẮC | `pnpm lint:tokens` (tools/scripts/lint-tokens.mjs) — chạy 2026-11-01: 630 file đúng thang |
| STD-ui-fe-11 | Responsive: breakpoint từ `Grid.useBreakpoint()`, không media query tay | standards/ui/frontend-structure.md:59 | — | MỘT PHẦN | Dùng helper token `responsive.md` (shell.styles.ts:16); còn 7 `@media` tay: features/agents/styles/agents.styles.ts:157, dashboard/components/AgentsSection.tsx:30,33, inbox (3); useBreakpoint = 0 |
| STD-ui-fe-13a | 9 bảng chính DataTable + Pager (D42); danh sách khác cursor infinite | standards/ui/frontend-structure.md:66 | mọi TIP | ĐẠT | e2e apps/web/e2e/list-scroll.spec.ts |
| STD-ui-fe-13b | Drawer / modal nặng dùng `next/dynamic`; charts import theo màn | standards/ui/frontend-structure.md:67 | — | CHƯA | grep `next/dynamic` / `lazy(` trong apps/web/src = 0 |
| STD-ui-fe-15 | Test: vitest + Testing Library cho logic, Playwright desktop + 390, parity | standards/ui/frontend-structure.md:73 | mọi TIP | QUY-TẮC | `pnpm --filter @appchat/web test`, `pnpm e2e <module>`, `pnpm parity <id>` |
| STD-ui-ip-1.5 | Thiếu quyền → ẩn; sai trạng thái → vô hiệu + tooltip từ bảng chuyển trạng thái | standards/ui/interaction-patterns.md:16 | mọi TIP | ĐẠT | QuoteDrawer.tsx / OrderDrawer.tsx / ContractDrawer.tsx dùng flow; e2e roles.spec.ts |
| STD-ui-ip-1.6 | "Sắp có": khoá + nhãn, không toast giả | standards/ui/interaction-patterns.md:17 | mọi TIP | MỘT PHẦN | Thẻ connector / kênh đúng; drawer AI theo màn còn giả (→ 023c), Xuất Excel giả (→ 038) |
| STD-ui-ip-3.2 | Validate bằng zodRule khi rời ô / bấm nút; lỗi theo `errors.<CODE>`; cuộn tới lỗi đầu | standards/ui/interaction-patterns.md:35 | — | CHƯA | Không có zodRule (xem STD-ui-fe-6) |
| STD-ui-ip-3.4 | Đóng form đã sửa chưa lưu → hỏi xác nhận bỏ thay đổi | standards/ui/interaction-patterns.md:37 | — | CHƯA | grep isDirty / discard / "Bỏ thay đổi" trong form + messages = 0 |
| STD-ui-ip-4.1 | Ghi qua useAction: toast + Hoàn tác khi có undo; lỗi theo error.code | standards/ui/interaction-patterns.md:43 | 003 | ĐẠT | useAction.ts:41-52 |
| STD-ui-ip-4.2 | Risk send/money/delete/config/bulk → ConfirmActionHost preview; không window.confirm | standards/ui/interaction-patterns.md:44 | 003 | ĐẠT | useAction.ts:34; shared/actions/ConfirmActionHost.tsx |
| STD-ui-ip-4.3 | `approval_required` → toast "Đã gửi duyệt", không báo thành công | standards/ui/interaction-patterns.md:45 | 023b | CHƯA | useAction.ts:39 `if (res.status !== 200) return null` — 202 approval_required im lặng; grep approval_required trong apps/web/src = 0; planning update: TIP023b SPECIFICATIONS A/B, exact manifest and targeted per-action/custom-schema/useAction-approval tests now own the gap. Runtime not verified. |
| STD-ui-ip-5 | Mỗi màn + panel đủ 5 trạng thái; empty phân biệt chưa có / lọc rỗng; dữ liệu cực trị | standards/ui/interaction-patterns.md:51 | — | MỘT PHẦN | Có PageStates nhưng apps/web/e2e/mobile-sweep.spec.ts chỉ kiểm routes/overflow/target size; chưa chứng minh mọi màn/panel có loading/empty/error/retry/permission và dữ liệu cực trị. Cần TIP UI implementation + matrix tests riêng, không dùng sweep layout thay bằng chứng trạng thái. |
| STD-ui-ip-7.4 | Vùng chạm ≥44×44 ở <md; không tràn ngang390 | standards/ui/interaction-patterns.md:69 | — | MỘT PHẦN | mobile-sweep.spec.ts kiểm overflow và height nút/tab đang thấy; không đo width hay mọi target. Phần overflow có test, touch-target toàn bộ cần UI audit/test bổ sung. |
| STD-ui-ip-use | Prototype sai → PD-xxx trích IP-x.y; không vẽ → "Giả định đã chọn" | standards/ui/interaction-patterns.md:80 | mọi TIP | QUY-TẮC | `pnpm lint:masks` kiểm PD trong sổ docs/06-prototype/DEVIATIONS.md |
| STD-ui-parity-2 | Đo Playwright 1440×900, dpr 1, pixelmatch threshold 0.1, maxDiffPixelRatio 0.05, tắt animation | standards/ui/prototype-parity.md:8 | goal FE | ĐẠT | tools/parity/src/capture.ts:57,109; compare.ts:38; parity.manifest.ts:36 |
| STD-ui-parity-3 | Manifest màn đo (id, route, protoState, states, mask, exceptions) | standards/ui/prototype-parity.md:12 | goal FE | ĐẠT | tools/parity/parity.manifest.ts |
| STD-ui-parity-5 | Giá trị snap về thang token D41 | standards/ui/prototype-parity.md:18 | mọi TIP | QUY-TẮC | `pnpm lint:tokens` |
| STD-ui-parity-6b | Mọi mask có căn cứ mã; PD mức 3 đề xuất không mask | standards/ui/prototype-parity.md:55 | mọi TIP | QUY-TẮC | `pnpm lint:masks` — chạy 2026-11-01: 42 mask, 7 PD đều có căn cứ; CI ci.yml:37 |
| STD-ui-parity-6c | Tổng diện tích mask một ID > 15% → đề nghị sửa prototype | standards/ui/prototype-parity.md:57 | — | QUY-TẮC | lint-masks.mjs không đo diện tích — kiểm tay |
| STD-ui-parity-9 | Mobile <md e2e390×844: không tràn ngang, chạm≥44×44, action chính chạy | standards/ui/prototype-parity.md:62 | — | MỘT PHẦN | playwright.config.ts:17 có viewport; mobile-sweep chỉ overflow/height, không đủ chứng minh width hoặc action chính từng màn. Giữ bằng chứng hẹp, cần matrix domain E2E và touch audit. |
| STD-ui-parity-10 | Đang làm `pnpm parity <id>`; sửa lớp dùng chung `pnpm parity --done`; CI trước main | standards/ui/prototype-parity.md:66 | mọi TIP | QUY-TẮC | `pnpm parity <id>` / `--done` / `--changed` (tools/parity/src/cli.ts:1); parity.yml, full.yml:42 |
| STD-workflow-git-1 | Nhánh việc từ origin/dev, PR chỉ vào dev, không push dev/main, không tự merge | standards/workflow/git-flow-ci.md:15 | mọi TIP | QUY-TẮC | Quy trình (D40); branch protection do Chủ nhà bật |
| STD-workflow-git-2 | Commit `<type>(<scope>): …` + attribution; không commit secret / build / parity out | standards/workflow/git-flow-ci.md:24 | mọi TIP | QUY-TẮC | Không có commitlint — review |
| STD-workflow-git-3 | PR theo mẫu thân; PR xanh CI | standards/workflow/git-flow-ci.md:31 | mọi TIP | QUY-TẮC | `gh pr create --base dev` |
| STD-workflow-git-4a | `ci.yml` affected lint/typecheck/test + i18n:check + lint:size (+ lint:masks, depcheck) | standards/workflow/git-flow-ci.md:65 | 001 | ĐẠT | .github/workflows/ci.yml:34-38 |
| STD-workflow-git-4b | `parity.yml`, `e2e.yml` (`--changed`), `full.yml` (lint · typecheck · test · parity --all · e2e · build) | standards/workflow/git-flow-ci.md:66 | goal FE, 001 | ĐẠT | .github/workflows/parity.yml:40, e2e.yml:33, full.yml:31-43 |
| STD-workflow-git-4c | `backend-it.yml`: Postgres 16 + pgvector + Redis, integration + tenant/role isolation | standards/workflow/git-flow-ci.md:69 | 046 | CHƯA | File không tồn tại (Q-008) |
| STD-workflow-git-4d | Smoke bản build (api + worker khởi động, /v1/health) | standards/workflow/git-flow-ci.md:68 | 046 | CHƯA | Không có script `smoke:build` trong package.json (Q-009) |
| STD-workflow-git-4e | CI: ubuntu-24.04, Node 24, cache pnpm/.turbo, concurrency cancel-in-progress, font từ repo | standards/workflow/git-flow-ci.md:72 | 001 | ĐẠT | ci.yml:10-29 |
| STD-workflow-git-5 | Xong đơn vị việc: test → commit → report SHA → rebase → PR; không merge / không PR main | standards/workflow/git-flow-ci.md:84 | mọi TIP | QUY-TẮC | Quy trình |

**Ghi chú / chưa rà hết:**

- Ghi chú:
- README.md (file thứ 28) chỉ là mục lục, không có nghĩa vụ riêng — không sinh dòng.
- Orphan của lần rà 2026-11-01 đã xác nhận có chủ: 045b (metrics, safeFetch, magic bytes, rate limit chung, CORS, platform_audit_log, transfer_ownership, lọc trường server, đối soát, ai_mode→copilot, export>5000/bulk>50, dọn custom field 30 ngày, contract test kênh, factories); 046 (rerank, re-embed, backend-it.yml, smoke:build); 044 (eval, gồm genui); 023c (genui); 023b (preview mọi action ghi, test phủ action).
- Phát hiện mới đáng chú ý nhất: bank feed SePay / Casso **của DN** chạy bằng `MockBankFeedProvider` gắn cứng trong registry (không phải thiếu tài khoản), và `contact.transfer_owner` cho agent chạy thẳng không qua duyệt (trái D32).
- Đã chạy lint:size / lint:masks / lint:tokens / i18n:check ngày 2026-11-01: đều xanh.
- CHƯA RÀ HẾT (mở lại sau review độc lập2026-11-02): interaction-patterns §2/3.3/3.6/4.4–5/5 realtime/6/7.1–3,5 chưa tách đủ nghĩa vụ; outbox consumer idempotency và UI five-state còn overclaim đã hạ trạng thái. Đọc đủ28 file không đồng nghĩa mọi nghĩa vụ đã có atomic row/code/test; cần khép findings trước bỏ ghi chú này.

## F. Prototype in-scope — nút / màn FE giả hoặc thiếu

| ID | Nghĩa vụ | Nguồn | TIP nhận | Trạng thái | Bằng chứng |
|---|---|---|---|---|---|
| PRO-customers-aidrawer | Drawer "Trợ lý AI · Khách hàng": ô hỏi gửi lượt Trợ lý thật kèm ngữ cảnh (không câu ack soạn sẵn) | docs/06-prototype/AppChat.dc.html:3309 | 023c | GIẢ | apps/web/src/features/customers/components/CrmAiDrawer.tsx:46 `t('ack',{text})`; lệnh nhanh :40 đọc `/crm/ai` runs cố định |
| PRO-quotes-aidrawer | Drawer "Trợ lý AI · Báo giá" trả lời thật theo bản ghi đang mở | docs/06-prototype/AppChat.dc.html:5329 | 023c | GIẢ | apps/web/src/features/quotes/components/QuoteAiDrawer.tsx:33-37 regex `/giá&#124;combo&#124;…/` → `ackPrice/ackFollow/ack` |
| PRO-contracts-aidrawer | Drawer "Trợ lý AI · Hợp đồng" trả lời thật | docs/06-prototype/AppChat.dc.html:5716 | 023c | GIẢ | apps/web/src/features/contracts/components/ContractAiDrawer.tsx:32 regex `/hạn&#124;renew/` → `ackRenew/ack` |
| PRO-orders-aidrawer | Drawer "Trợ lý AI · Đơn hàng" trả lời thật | docs/06-prototype/AppChat.dc.html:5862 | 023c | GIẢ | apps/web/src/features/orders/components/OrderAiDrawer.tsx:29-33 regex → `ackPay/ackCancel/ack` |
| PRO-calendar-aidrawer | Drawer "Trợ lý AI · Lịch hẹn" trả lời thật | docs/06-prototype/AppChat.dc.html:4246 | 023c | GIẢ | apps/web/src/features/calendar/components/CalendarAiDrawer.tsx:37 `setResult(t('ack'))`; :32 `picked` chỉ đổi bộ lọc |
| PRO-tickets-aidrawer | Drawer "Trợ lý AI · Hỗ trợ" trả lời thật | docs/06-prototype/AppChat.dc.html:5212 | 023c | GIẢ | apps/web/src/features/tickets/components/TicketsAiDrawer.tsx:37 `setResult(t('ack'))` |
| PRO-marketing-aidrawer | Drawer "Trợ lý AI · Marketing" trả lời thật | docs/06-prototype/AppChat.dc.html:3769 | 023c | GIẢ | apps/web/src/features/marketing/components/MarketingAiDrawer.tsx:31 `setAck(t('ack'))` (comment L2 "Mock: không gọi LLM") |
| PRO-inbox-aimodal | Hộp lệnh Trợ lý trong Hộp thư (lệnh nhanh /summary /draft /translate /intent + ô hỏi) chạy tại chỗ kèm hội thoại | docs/06-prototype/AppChat.dc.html:1510 | 023c | GIẢ | apps/web/src/features/inbox/components/InboxAiModal.tsx:59 mọi lệnh → `openFull()` (chỉ mở dock); :72 ô hỏi bỏ nội dung `q` |
| PRO-quotes-export | "Xuất Excel" danh sách báo giá đang lọc | docs/06-prototype/AppChat.dc.html:5351 | 038 | GIẢ | apps/web/src/features/quotes/components/QuotesToolbar.tsx:82 `message.info(t('exporting'))` (Q-024) |
| PRO-orders-export | "Xuất Excel" danh sách đơn | docs/06-prototype/AppChat.dc.html:5873 | 038 | GIẢ | apps/web/src/features/orders/components/OrdersToolbar.tsx:96 `message.info` |
| PRO-contracts-export | "Xuất Excel" danh sách hợp đồng | docs/06-prototype/AppChat.dc.html:5727 | 038 | GIẢ | apps/web/src/features/contracts/components/ContractsToolbar.tsx:69 `message.info` |
| PRO-tickets-export | "Xuất" danh sách ticket | docs/06-prototype/AppChat.dc.html:5241 | 038 | GIẢ | apps/web/src/features/tickets/components/TicketsHeader.tsx:143 `message.info` |
| PRO-dashboard-read | Màn Tổng quan đọc `GET /dashboard` từ API thật | docs/06-prototype/AppChat.dc.html:1369 | 038 | GIẢ | apps/web/src/features/dashboard/api.ts:9; routes.json `missing` GET /dashboard |
| PRO-dashboard-followup | Nút ✓ follow-up (Tổng quan) → `follow_up.complete` có handler | docs/06-prototype/AppChat.dc.html:1369 | 038 | GIẢ | apps/web/src/features/dashboard/components/UpdatesWidget.tsx:27,104; actions.json handler null |
| PRO-calendar-followup | Nút hoàn tất follow-up ở danh sách Lịch → `follow_up.complete` | docs/06-prototype/AppChat.dc.html:4293 | 038 | GIẢ | apps/web/src/features/calendar/components/ListView.tsx:89; handler null |
| PRO-loyalty-read | Màn Khách thân thiết đọc /loyalty/members, /members/:id, /config, /overview, /lookup | docs/06-prototype/AppChat.dc.html:4778 | 036 | GIẢ | apps/web/src/features/loyalty/api.ts:10-23; 5 route trong routes.json `missing` |
| PRO-loyalty-adjust | Điều chỉnh điểm → `loyalty.adjust_points` có handler | docs/06-prototype/AppChat.dc.html:4778 | 036 | GIẢ | apps/web/src/features/loyalty/hooks/useAdjust.ts:23; handler null |
| PRO-loyalty-config | Cấu hình hạng & điểm → `loyalty.update_config` | docs/06-prototype/AppChat.dc.html:4778 | 036 | GIẢ | apps/web/src/features/loyalty/components/ConfigModal.tsx:30; handler null |
| PRO-loyalty-memberacts | Thẻ "AI hành động" trong chi tiết thành viên giao việc thật cho agent | docs/06-prototype/AppChat.dc.html:5065 | 036 | GIẢ | apps/web/src/features/loyalty/components/MemberTabs.tsx:157 `message.success(actDone)`; danh sách từ i18n `t.raw('act')` :140 |
| PRO-loyalty-files | Tab Tệp thành viên: mở / tải tệp lên thật | docs/06-prototype/AppChat.dc.html:5081 | 036 | GIẢ | apps/web/src/features/loyalty/components/MemberTabs.tsx:186 `message.info(n)`, :191 `message.success('uploaded')` |
| PRO-loyalty-churn | Thẻ "Khách sắp rời bỏ": Xuất, AI chăm sóc tất cả, Giao AI từng khách | docs/06-prototype/AppChat.dc.html:4816 | — | NGOÀI | REQ-J05 P2 (cảnh báo rời bỏ); hiện là toast giả: ChurnCard.tsx:32,35,87 |
| PRO-loyalty-rules-soon | Quy tắc thưởng ngoài luật "Sắp có" | docs/06-prototype/AppChat.dc.html:4472 | — | NGOÀI | COMMERCE §7 Q1 chỉ 2 luật chạy; RulesCard.tsx:79 |
| PRO-marketing-read | Marketing đọc /campaigns, /campaigns/:id, /campaigns/meta, /campaign-suggestions | docs/06-prototype/AppChat.dc.html:3760 | 037 | GIẢ | apps/web/src/features/marketing/api.ts:10-23; 4 route `missing` |
| PRO-marketing-actions | Wizard + vòng đời chiến dịch: campaign.create/submit/approve/reject/pause/resume/cancel/delete/send_test có handler | docs/06-prototype/AppChat.dc.html:3760 | 037 | GIẢ | hooks/useWizard.ts:35-36, columns.tsx:111-117, CampaignDetail.tsx:27-30; 9 action handler null |
| PRO-marketing-analyze | Modal "AI phân tích dữ liệu khách" chạy phân tích thật (không chờ 1s giả) + 3 nút phụ | docs/06-prototype/AppChat.dc.html:3767 | 037 | GIẢ | apps/web/src/features/marketing/components/AnalyzeModal.tsx:157 `setTimeout` giả "đang phân tích"; :138 SIDE_ACTIONS `message.info` |
| PRO-marketing-wizupload | Wizard: nhập liên hệ từ file Excel | docs/06-prototype/AppChat.dc.html:4074 | 037 | GIẢ | apps/web/src/features/marketing/components/WizardSteps.tsx:100 `message.success('uploadDone')` (số 1.248 cứng trong i18n) |
| PRO-marketing-wiztone | Wizard: AI soạn nội dung theo giọng / "AI giúp viết" | docs/06-prototype/AppChat.dc.html:4121 | 037 | GIẢ | WizardSteps.tsx:196-197 chèn `t.raw('toneText.*')`; :242 `aiHelpText` cứng |
| PRO-marketing-detailexport | Chi tiết chiến dịch: Xuất danh sách người nhận | docs/06-prototype/AppChat.dc.html:4173 | 037 | GIẢ | apps/web/src/features/marketing/components/CampaignDetail.tsx:103 `message.info` |
| PRO-marketing-resend | Chi tiết chiến dịch: Gửi lại cho khách chưa đọc | docs/06-prototype/AppChat.dc.html:4174 | 037 | GIẢ | CampaignDetail.tsx:108 `message.success('resendDone')` |
| PRO-marketing-rowai | Dòng chiến dịch: nút ⚡ AI xử lý + ✦ gợi ý | docs/06-prototype/AppChat.dc.html:3863 | 037 | GIẢ | apps/web/src/features/marketing/columns.tsx:87,98 `message.info` |
| PRO-marketing-recipacts | Bảng người nhận: nút xem / thêm (⋯) | docs/06-prototype/AppChat.dc.html:3869 | 037 | GIẢ | apps/web/src/features/marketing/components/DetailTabs.tsx:126,129 `<button>` không onClick |
| PRO-contracts-upload | Tab Tệp hợp đồng: Tải tệp lên | docs/06-prototype/AppChat.dc.html:5695 | 030b | GIẢ | apps/web/src/features/contracts/components/DetailTabs.tsx:237 `message.info('uploading')` |
| PRO-contracts-openfile | Tab Tệp hợp đồng: Mở tệp (tải file thật qua /files/:id/raw) | docs/06-prototype/AppChat.dc.html:5692 | 030b | GIẢ | DetailTabs.tsx:231 `message.info('opening')` |
| PRO-orders-files | Tab Tệp đơn hàng: Mở / Tải tệp lên | docs/06-prototype/AppChat.dc.html:5839 | — | GIẢ | apps/web/src/features/orders/components/DetailTabs.tsx:219,225 `message.info`; order-insights.ts:75 files luôn rỗng |
| PRO-invoices-files | Tab Tệp đề nghị thanh toán: Mở / Tải tệp lên | docs/06-prototype/AppChat.dc.html:5692 | — | GIẢ | apps/web/src/features/invoices/components/DetailTabs.tsx:206,212 `message.info` |
| PRO-products-files | Tab Tệp sản phẩm: Mở tệp | docs/06-prototype/AppChat.dc.html:6080 | — | GIẢ | apps/web/src/features/products/components/DetailTabs.tsx:207 `message.info(n)`; catalog-read.service.ts:109 files [] |
| PRO-quotes-rowai | Dòng báo giá: nút ⚡ "AI xử lý" giao việc thật | docs/06-prototype/AppChat.dc.html:5371 | — | GIẢ | apps/web/src/features/quotes/columns.tsx:57 `message.info(aiDoing)` |
| PRO-contracts-rowai | Dòng hợp đồng: nút ⚡ "AI xử lý" | docs/06-prototype/AppChat.dc.html:5753 | — | GIẢ | apps/web/src/features/contracts/columns.tsx:72 `message.info` |
| PRO-orders-rowai | Dòng đơn: nút ⚡ "AI xử lý" | docs/06-prototype/AppChat.dc.html:5896 | — | GIẢ | apps/web/src/features/orders/columns.tsx:88 `message.info` |
| PRO-calendar-rowai | Dòng lịch hẹn: nút ✦ AI xử lý | docs/06-prototype/AppChat.dc.html:4304 | — | GIẢ | apps/web/src/features/calendar/components/ListView.tsx:29 `message.info` |
| PRO-tickets-rowpeek | Dòng ticket: ✦ gợi ý AI (mở tab AI / chạy gợi ý) | docs/06-prototype/AppChat.dc.html:5255 | — | GIẢ | apps/web/src/features/tickets/columns.tsx:67 `message.info(aiPeekMsg)` |
| PRO-customers-rowai | Dòng khách: nút ⚡ "Giao AI" | docs/06-prototype/AppChat.dc.html:2886 | 015b | GIẢ | apps/web/src/features/customers/screens/CustomersScreen.tsx:38 `aiDo = message.info` |
| PRO-invoices-aiacts | Tab AI đề nghị thanh toán: nút hành động AI gợi ý chạy thật | docs/06-prototype/AppChat.dc.html:5646 | — | GIẢ | apps/web/src/features/invoices/components/DetailTabs.tsx:169 `message.info(aiDoing)` |
| PRO-products-aiacts | Chi tiết sản phẩm: "Gợi ý combo" / "Tạo chiến dịch" AI | docs/06-prototype/AppChat.dc.html:6111 | — | GIẢ | apps/web/src/features/products/components/DetailTabs.tsx:177,181 `message.info(aiDoing)` |
| PRO-quotes-bulkfwd | Thanh chọn nhiều báo giá: Chuyển tiếp / Gán phụ trách | docs/06-prototype/AppChat.dc.html:5364 | — | GIẢ | apps/web/src/features/quotes/components/QuotesToolbar.tsx:133,141 `message.info`; không có action gán phụ trách báo giá |
| PRO-contracts-bulkfwd | Thanh chọn nhiều hợp đồng: Chuyển tiếp / Gán phụ trách | docs/06-prototype/AppChat.dc.html:5734 | — | GIẢ | ContractsToolbar.tsx:120,128 `message.info` |
| PRO-orders-bulkfwd | Thanh chọn nhiều đơn: Chuyển tiếp / Gán phụ trách | docs/06-prototype/AppChat.dc.html:5880 | — | GIẢ | OrdersToolbar.tsx:161,169 `message.info` |
| PRO-products-richtext | Form sản phẩm: thanh định dạng mô tả (B / I / list…) | docs/06-prototype/AppChat.dc.html:4069 | — | GIẢ | apps/web/src/features/products/components/ProductFormModal.tsx:244 `<button>` không onClick |
| PRO-customers-dedupe | Modal gộp trùng: ô tìm trả "không khớp" theo dữ liệu thật | docs/06-prototype/AppChat.dc.html:2604 | — | GIẢ | apps/web/src/features/customers/components/DedupeModal.tsx:16 `NO_MATCH=/(0&#124;999&#124;test&#124;xxx&#124;9999)/` quyết định kết quả |
| PRO-inbox-groupcreate | Menu ⋯ hội thoại: Tạo nhóm Zalo (D50 hết khoá vì TIP-014 xong) | docs/06-prototype/AppChat.dc.html:11853 | 023b | CHƯA | apps/web/src/features/inbox/components/ConvMenu.tsx:54 `() => undefined` + nhãn comingSoon :189; chưa có `conversation.create_group` |
| PRO-inbox-groupacts | Thông tin nhóm Zalo: Tắt thông báo / Ghim / Thêm thành viên / Quản lý nhóm | docs/06-prototype/AppChat.dc.html:10102 | 025b | GIẢ | apps/web/src/features/inbox/components/GroupInfoPanel.tsx:54 `<button>` không onClick |
| PRO-inbox-grouplink | Thông tin nhóm: Link tham gia (sao chép) | docs/06-prototype/AppChat.dc.html:2279 | 025b | GIẢ | GroupInfoPanel.tsx:85 không onClick |
| PRO-inbox-groupboard | Nhóm: Bảng tin (tin ghim, ghi chú) + "Xem tất cả" ảnh / tệp | docs/06-prototype/AppChat.dc.html:2284 | 025b | GIẢ | apps/web/src/features/inbox/components/GroupSections.tsx:45,52,70,88 không onClick |
| PRO-inbox-grouppolicy | Nhóm: chính sách AI trả lời (@nhắc / tự động / tắt) lưu thật | docs/06-prototype/AppChat.dc.html:2106 | 025b | GIẢ | GroupSections.tsx:37,109 chỉ `useState`, không action |
| PRO-inbox-360edit | Hồ sơ 360° trong Hộp thư: "Sửa" liên hệ | docs/06-prototype/AppChat.dc.html:2386 | 025b | GIẢ | apps/web/src/features/inbox/components/Overview360.tsx:75 không onClick |
| PRO-inbox-360deal | Hồ sơ 360°: "+ Thêm" cơ hội / deal | docs/06-prototype/AppChat.dc.html:2402 | — | GIẢ | Overview360.tsx:121 không onClick |
| PRO-inbox-360csv | Hồ sơ 360°: "Xuất CSV" lịch sử / timeline | docs/06-prototype/AppChat.dc.html:2413 | 025b | GIẢ | Overview360.tsx:148, Tabs360.tsx:139 không onClick |
| PRO-inbox-360tasknote | Hồ sơ 360°: "+ Thêm việc" / "+ Thêm ghi chú" | docs/06-prototype/AppChat.dc.html:2429 | — | GIẢ | apps/web/src/features/inbox/components/ExtraCards.tsx:18,35 không onClick; `contact.add_note` chưa có trong registry |
| PRO-inbox-schedslots | Composer "Đặt lịch": slot gợi ý từ API | docs/06-prototype/AppChat.dc.html:2169 | 025b | GIẢ | apps/web/src/features/inbox/api.ts:99 `GET /booking/slots` (routes.json `missing`; API có `/calendar/slots`) |
| PRO-inbox-autoxl | Composer "Dịch": bật tự động dịch + chọn ngôn ngữ có tác dụng | docs/06-prototype/AppChat.dc.html:2213 | 025b | GIẢ | apps/web/src/features/inbox/components/ComposerPopovers.tsx:97,106 chỉ đổi state `autoXl`/`lang`, không ai đọc |
| PRO-inbox-screenshot | Menu ＋ khung nhập: Chụp ảnh màn hình | docs/06-prototype/AppChat.dc.html:2231 | 025b | GIẢ | apps/web/src/features/inbox/components/AgentToolsMenu.tsx:32 `onClick={onClose}` |
| PRO-assistant-plusfile | Trợ lý: menu ＋ "Thêm tệp" đính kèm vào lệnh (E12) | docs/06-prototype/AppChat.dc.html:10199 | — | GIẢ | apps/web/src/features/assistant/components/ComposerPopovers.tsx:38-42 `pick('file')` chỉ đóng menu |
| PRO-assistant-plusscreenshot | Trợ lý: menu ＋ "Chụp ảnh màn hình" | docs/06-prototype/AppChat.dc.html:10200 | — | GIẢ | ComposerPopovers.tsx:15,38-42 không làm gì |
| PRO-assistant-research | Trợ lý: menu ＋ Nghiên cứu / Tìm kiếm | docs/06-prototype/AppChat.dc.html:10208 | — | NGOÀI | D48 (P2 cùng MCP) — nhưng hiện không có nhãn "Sắp có", bấm không phản hồi (ComposerPopovers.tsx:18-19) |
| PRO-assistant-mic | Trợ lý: nút giọng nói | docs/06-prototype/AppChat.dc.html:1504 | — | GIẢ | apps/web/src/features/assistant/components/Composer.tsx:76 không onClick |
| PRO-assistant-quick | Trợ lý: nút ⚡ lệnh nhanh | docs/06-prototype/AppChat.dc.html:1496 | — | GIẢ | Composer.tsx:50 không onClick |
| PRO-assistant-sessions | Màn "Nội dung trò chuyện" (lịch sử phiên, lọc, Xem lại) | docs/06-prototype/AppChat.dc.html:1729 | — | CHƯA | API có GET /assistant/sessions (DC-131) nhưng FE không có màn / route (`app/(app)/assistant/*` chỉ actions, approvals, cowork) |
| PRO-assistant-taskspark | Thẻ tác vụ Cowork: sparkline hiệu suất từ số liệu thật | docs/06-prototype/AppChat.dc.html:1361 | — | GIẢ | apps/web/src/features/assistant/components/TaskCard.tsx:8 `SPARK=[42,55,48,68,60,80,72]` cứng |
| PRO-shell-navbadges | Badge đếm trên rail (Hộp thư / Ticket / Lịch) đọc `GET /nav/badges` | docs/06-prototype/AppChat.dc.html:1089 | — | GIẢ | apps/web/src/shared/shell/useShellData.ts:34; routes.json `missing` |
| PRO-settings-audit | Cài đặt › Audit log đọc `GET /settings/audit` | docs/06-prototype/AppChat.dc.html:7410 | — | GIẢ | apps/web/src/features/settings/api.ts:104; routes.json `missing` |
| PRO-settings-aiaudit | Cài đặt › AI Audit log đọc `GET /settings/ai-audit` | docs/06-prototype/AppChat.dc.html:7035 | — | GIẢ | settings/api.ts:106; routes.json `missing` |
| PRO-settings-walletalerts | Ví: cảnh báo credit 80/95% lưu `wallet.update_alerts` | docs/06-prototype/AppChat.dc.html:6463 | 039 | GIẢ | apps/web/src/features/settings/components/WalletSection.tsx:30; handler null |
| PRO-settings-upgradecontact | Popup Nâng cấp / Ví: "Liên hệ" gói Doanh nghiệp gửi yêu cầu thật | docs/06-prototype/AppChat.dc.html:985 | 039 | GIẢ | UpgradeModal.tsx:55, WalletShop.tsx:39 `message.info('contacted')` |
| PRO-settings-wsswitch | Tổng quan workspace: nút "Chuyển" sang workspace khác | docs/06-prototype/AppChat.dc.html:6192 | — | GIẢ | apps/web/src/features/settings/components/GeneralSection.tsx:112 `message.success('switched')` dù `workspace.switch` có handler (UserMenu.tsx:45) |
| PRO-settings-wsbuy | Tổng quan workspace: "Mua thêm workspace" | docs/06-prototype/AppChat.dc.html:6192 | — | GIẢ | GeneralSection.tsx:91 `message.info('buySoon')` |
| PRO-settings-logo | Tổng quan workspace: Đổi logo (tải PNG/SVG) | docs/06-prototype/AppChat.dc.html:6204 | — | GIẢ | GeneralSection.tsx:128 `message.info('logoSoon')` |
| PRO-settings-dangerzone | Vùng nguy hiểm: Đóng băng / Xuất dữ liệu / Xoá workspace | docs/06-prototype/AppChat.dc.html:6220 | 041 | GIẢ | GeneralSection.tsx:149 `message.info('dz.requested')`; chưa có action |
| PRO-settings-membersfilter | Thành viên: Lọc theo vai trò / trạng thái | docs/06-prototype/AppChat.dc.html:6231 | — | GIẢ | MembersSection.tsx:124 `message.info('filterSoon')` |
| PRO-settings-membersexport | Thành viên: Xuất danh sách | docs/06-prototype/AppChat.dc.html:6232 | — | GIẢ | MembersSection.tsx:128 `message.success('exported')` không tải file |
| PRO-settings-widgetacts | Widget web: thêm / sửa nút hành động | docs/06-prototype/AppChat.dc.html:7585 | — | GIẢ | WidgetSection.tsx:72,91 `message.info('addActionSoon')` |
| PRO-settings-slanew | SLA: tạo chính sách mới theo kênh / hạng | docs/06-prototype/AppChat.dc.html:7394 | — | NGOÀI | REQ-H05 P3; SlaSection.tsx:41 nút disabled + tooltip |
| PRO-settings-docs | Cài đặt: chip "Tài liệu hướng dẫn" | docs/06-prototype/AppChat.dc.html:6128 | — | GIẢ | SettingsShell.tsx:40 `message.info('docsSoon')` |
| PRO-settings-ragdownload | Dữ liệu RAG: nút tải tệp nguồn | docs/06-prototype/AppChat.dc.html:6973 | 020b | GIẢ | RagSection.tsx:67 không onClick |
| PRO-settings-tagslearn | Thẻ & nhãn: "Tìm hiểu thêm" | docs/06-prototype/AppChat.dc.html:6420 | — | GIẢ | TagsSection.tsx:83 không onClick |
| PRO-settings-navcounts | Nav Cài đặt: số đếm Thành viên / Vai trò / Thẻ / Câu trả lời mẫu theo dữ liệu thật | docs/06-prototype/AppChat.dc.html:10301 | — | GIẢ | apps/web/src/features/settings/registry.ts:32,33,45,46 `n:'12'/'5'/'24'/'48'` cứng |
| PRO-settings-booking | Cấu hình nhân sự / giờ mở cửa lịch hẹn (staff.*, business_hours.update, /settings/booking) | plans/BLUEPRINT.md:1269 | — | CHƯA | Action + API có (DV-015) nhưng không FE nào gọi `staff.create`/`business_hours.update`; prototype không vẽ |
| PRO-settings-paymentaccount | Cài đặt tài khoản nhận tiền (`payment_account.update`, /settings/payments) | plans/BLUEPRINT.md:1269 | — | CHƯA | Action + API có (DV-014); không FE nào gọi `payment_account.update` |
| PRO-settings-security | Mục Cài đặt "Bảo mật" (2FA, chính sách mật khẩu, khoá sau N lần sai) | docs/06-prototype/AppChat.dc.html:6465 | — | CHƯA | Không có trong registry.ts; không nằm trong danh sách ẩn prototype-parity §6 (chỉ ẩn SSO/Compliance) |
| PRO-settings-tokenusage | Mục "Lịch sử chi tiêu Credit" theo module | docs/06-prototype/AppChat.dc.html:6144 | 039 | MỘT PHẦN | Có tab Lịch sử ví (WalletLedger.tsx:1) nhưng không lọc theo module như prototype |
| PRO-settings-routing | Mục "Routing & assignment" (chia lead tự động) | docs/06-prototype/AppChat.dc.html:7338 | 042b | CHƯA | REQ-F01c P1; không có FE; TIP042b AC7, giữ skill/shift/workflow ngoài scope |
| PRO-settings-teams | Nhóm P1 (không phải cây Phòng ban P3 của prototype) | docs/06-prototype/AppChat.dc.html:6709; D27b | 042 | CHƯA | prototype-parity §6 chỉ loại Phòng ban; Nhóm P1 chưa có UI/action. TIP042 AC5/7; không dùng ngoại lệ Phòng ban để đánh NGOÀI cả Nhóm |
| PRO-settings-automation | Mục "Cấu hình workflow" | docs/06-prototype/AppChat.dc.html:6486 | — | NGOÀI | D07 (Workflow engine) |
| PRO-settings-emailmkt | Mục "Email Marketing" (Brevo onboard) | docs/06-prototype/AppChat.dc.html:7033 | — | CHƯA | Không có mục trong registry.ts; Brevo chỉ ở Nền tảng kết nối; không có quyết định ẩn |

**Ghi chú / chưa rà hết:**

- Ghi chú:
- Trạng thái "GIẢ" cho route `missing` / handler null: FE chạy được chỉ ở chế độ mock (`NEXT_PUBLIC_API_MODE=mock`).
- Màn có module FE đầy đủ cho mọi màn in-scope trong CLAUDE.md §6; màn ẩn (workflow, callcenter, reports) không có FE — đúng D07/D19.
- CHƯA RÀ HẾT: agents (Builder/TestPanel/VersionsDrawer chi tiết), calendar (AppointmentDrawer/FormModal), tickets (TicketDrawer/DetailTabs), quotes/orders/invoices form modal, settings channels (ManageChannelDrawer, ConnectChannelModal), DocTemplates, Profile360, Rag upload, shell (NotificationsPopover/UserMenu/MobileTabBar), dashboard widgets ngoài UpdatesWidget, kiểm `.raw()` i18n làm dữ liệu ở các màn còn lại.

## G. Mục "để sau / hoãn / chưa" trong reports/ + QUESTIONS / DEVIATIONS còn mở

| ID | Nghĩa vụ | Nguồn | TIP nhận | Trạng thái | Bằng chứng |
|---|---|---|---|---|---|
| Q-027 | Chốt ca biên tiền/điểm: đảo điểm đã dùng, trả lô đã hết hạn, completed chưa đủ tiền | QUESTIONS.md:35 | 036 | CHƯA | TIP-036 gate trước thi công, AC2–AC5; đang hỏi Chủ nhà. Code order-flow.handlers.ts:22-37 tính theo net đơn, chưa chứng minh phù hợp mọi ca thực thu |
| DEF-001-1 | Gỡ 99 vòng phụ thuộc `apps/web` (barrel features + mock transport), xoá dòng baseline khi nối http | reports/TIP-001-completion.md:51 | — | CHƯA | `.dependency-cruiser-known-violations.json` vẫn 99 mục (đếm 2026-11-01) — không giảm sau 25 TIP nối http |
| DEF-001-2 | Standard omnichannel-adapter ghi `capabilities.reactions` + `group: 'commerce'` cho khớp code | reports/TIP-001-completion.md:65 | 014b | CHƯA | standards/channels/omnichannel-adapter.md:30 vẫn `'chat'\ Planned014b: provider lifecycle/commands/history/contacts/receipts and native/live acceptance; no runtime promotion. |'social'\|'email'\|'sms'\|'web'`; code packages/channels/src/types.ts:15 đã có `commerce` (việc tài liệu) |
| DEF-002-1 | CI GitHub chạy integration test với Postgres + Redis (Q-008) | reports/TIP-002-completion.md:38 | 046 | CHƯA | .github/workflows/{ci,e2e,full,parity}.yml không có service postgres; TG row 046 "CI backend-it.yml" |
| DEF-002-2 | Cache registry workspace qua Redis / invalidate pub/sub khi nhiều tiến trình api | reports/TIP-002-completion.md:51; TIP-003:49 | — | CHƯA | packages/db/src/tenant-resolver.ts:81 TTL 60s trong process, `invalidate` (L62) chỉ xoá cache cục bộ |
| DEF-003-1 | Provisioner có `pg_signal_backend` khi xoá workspace ở production | reports/TIP-003-completion.md:36 | 041 | MỘT PHẦN | packages/db/src/setup.ts:57 cấp ở db:setup (dev); luồng xoá workspace prod chưa có (TIP-041), infra/ chưa có |
| DEF-004-1 | Bước smoke bản build (`pnpm smoke:build`) trong cổng chốt TIP (Q-009) | reports/TIP-004-completion.md:48 | 046 | CHƯA | package.json không có script `smoke:build`; TG row 046 ghi Q-009 |
| DEF-004-2 | FE quên mật khẩu gọi đúng `/auth/password/reset-request` của backend | reports/TIP-004-completion.md:49 | 011 | ĐẠT | apps/api/src/http/identity/auth.controller.ts:85; apps/web/src/features/auth/api.ts:47; test apps/web/e2e/http/auth-onboarding.spec.ts:45 |
| DEF-005-1 | `scopeFilter` nhận `contactIds` collaborator / watcher (TIP-015) | reports/TIP-005-completion.md:44 | 015 | ĐẠT | packages/core/src/authz/scope.ts:2,12; test apps/api/test/integration/crm-contacts.test.ts |
| DEF-006-1 | Job gửi email tóm tắt `digest` daily / weekly (DC-030 hẹn TIP-038) | reports/TIP-006-completion.md:43 | 038 | CHƯA | TIP-038 task5/AC09 nhận scheduler, prefs/DND/current authz, delivery ledger và mailport; mới là kế hoạch, chưa có runtime digest |
| DEF-006-2 | Gửi thông báo kênh `mobile` (web push / app) | reports/TIP-006-completion.md:42 | — | NGOÀI | DC-029: chỉ lưu tuỳ chọn, TIP push = P2 |
| DEF-006-3 | Guard hội thoại + luật realtime `member.role_changed` / `member.removed` + client socket FE | reports/TIP-006-completion.md:51-53 | 013/016/025 | ĐẠT | packages/core/src/inbox/inbox.module.ts:55; notify/events/kernel.rules.ts:17; apps/web/src/shared/realtime/socket.ts; test realtime.test.ts, e2e/http/inbox-live.spec.ts |
| DEF-009-1 | `channels.used` của billing summary đếm `channel_account` thật | reports/TIP-009-completion.md:32 | 039 | GIẢ | billing-read.service.ts:73 vẫn used0; TIP039 task4/AC07 nhận count theo quota rule, chưa code |
| DEF-009-2 | `PRICE_BOOK` đọc bảng `model_price` | reports/TIP-009-completion.md:45 | 019 | ĐẠT | billing/billing.module.ts:64 `DbPriceBook`; test apps/api/test/integration/ai-runtime.test.ts |
| DEF-009-3 | `QuotaService.assert` trước khi thêm thành viên / kênh / agent | reports/TIP-009-completion.md:46 | 013/014/021 | ĐẠT | identity/actions/member-invite.handler.ts:31; channels/actions/channel-connect.handlers.ts:38; ai/agents/agent.handlers.ts:22; test settings.test.ts:116 |
| DEF-009-4 | Consumer `credits.exhausted` chuyển mọi hội thoại `auto` về người | reports/TIP-009-completion.md:47 | 039 | MỘT PHẦN | reply.service.ts:144 chỉ handoff lượt đang chạy; TIP039 task3/AC05 nhận consumer, recheck balance và delayed-event sau topup, chưa code |
| DEF-010-1 | Job cấp lại credit hằng tháng `period:<ws>:<yyyy-mm>` / gia hạn kỳ | reports/TIP-009-completion.md:44; TIP-010 | 039 | CHƯA | Chỉ có comment billing/services/wallet.service.ts:105; TG row 039 ghi rõ job này |
| DEF-010-2 | Hạn mức addon (user / kênh mua thêm) trong `QuotaService` + nâng gói giữa kỳ tính chênh | reports/TIP-010-completion.md:44 | 039 | CHƯA | TIP039 task2/AC03–04 nhận entitlements/backfill cảpaidaddon đãfulfilled; DC242/Q031 đãduyệt, Q032 chỉroundingCredit; chưa code |
| DEF-010-5 | Replay fulfil cùng invoice không dời kỳ subscription hoặc reset trạng thái mới | billing/services/subscriptions.service.ts:91–105; payments/fulfil.ts:39 | 039 | MỘT PHẦN | activate upsert currentPeriodStart/end trước resetPlan duplicatecheck; ledger idempotent không chứng minh entitlement idempotent. TIP039 task2/AC02 fault/replay, chưa chạy testcase |
| Q-031 | Kỳ Credit/upgrade chênh Credit/thời hạn addon theo quyếtđịnh Chủ nhà | QUESTIONS.md Q031; DC242 | 039 | CHƯA | Đãduyệt: thángngàyđăngký, upgradeprorate tiền/Credit, addonđồnghạn/prorate. TIP039 task1–2/AC01/03/04 cófixture; CHƯA là runtimechưacode, không còn câu hỏi mở |
| Q-032 | Quy tắc làm tròn Credit lẻ sau prorate | QUESTIONS.md Q032; independent review038/039 | 039 | CHƯA | DC243 half-up đã được Chủ nhà duyệt; literal fixture10.000×10/31→3.226, runtime chưa code |
| DEF-010-3 | Màn admin đối soát giao dịch nền tảng không khớp (`matched_invoice_id` null) | reports/TIP-010-completion.md:45 | 040 | MỘT PHẦN | Chỉ có apps/api/src/http/billing/admin-transfers.controller.ts:17 (pending_review); không có danh sách giao dịch lệch |
| DEF-010-4 | SePay nền tảng nhận webhook thật (AC3 với giao dịch thật) | reports/TIP-010-completion.md:32,46 | — | CHỜ-TK | Q-004; packages/integrations/src/connectors/sepay/adapter.ts + test sepay.test.ts |
| DEF-012-1 | Action `integration.test` (kiểm tra kết nối connector) | reports/TIP-012-completion.md:37 | 023c | CHƯA | Không có trong registry (51 action thiếu); TIP-023c mục 10 "Kiểm tra kết nối (probe connector)" |
| DEF-012-2 | Action `integration.sync_now` | reports/TIP-012-completion.md:37 | — | CHƯA | Không có trong packages/actions; không TIP chờ nào ghi |
| DEF-012-3 | Adapter Casso thật (verifyWebhook / parseTransactions) | reports/TIP-012-completion.md:43 | — | GIẢ | packages/integrations/src/registry.ts:17 gắn `MockBankFeedProvider` cho casso; connectors/casso/ chỉ có manifest.ts — không phải thiếu tài khoản mà thiếu code |
| DEF-012-4 | Brevo / SMTP workspace gửi thư thật | reports/TIP-012-completion.md:43 | — | MỘT PHẦN | packages/integrations/src/registry.ts:13-14 chỉ manifest; core/src/integrations/services/resolver.ts:25 trả adapter null. BrevoMailProvider chỉ được tạo bằng env nền tảng ở identity.module.ts:54, không chứng minh connector workspace. Unit ports.test.ts / smtp.test.ts xanh, chưa có kiểm chứng gửi bằng secret riêng từng workspace |
| DEF-013-1 | Chuyển phụ trách khách của thành viên bị gỡ | reports/TIP-013-completion.md:42 | — | CHƯA | identity/actions/member-remove.handler.ts:2 chỉ đặt `removed`; không consumer `member.removed` ở crm |
| DEF-013-2 | Seed `sla_policy` + đồng hồ SLA theo giờ làm việc workspace | reports/TIP-013-completion.md:41 | 034 | ĐẠT | support/services/sla-clock.ts; test support.test.ts:53 |
| DEF-014-1 | Zalo cá nhân thật: QR, listener, gửi ảnh / file / sticker, đồng bộ lịch sử | reports/TIP-014-completion.md:49 | 014b | CHỜ-TK | packages/channels/src/zalo-personal/zca-transport.ts:30-128 có SDK thật; core/src/channels/channels.module.ts:59 chọn bằng env. zalo-adapter.test.ts dùng fake, không chứng minh live. HANDOFF-NEXT §3 nói demo đã đăng nhập nhưng chưa có bằng chứng đủ ca Q-003; không kết luận tài khoản hiện còn thiếu Planned014b: provider lifecycle/commands/history/contacts/receipts and native/live acceptance; no runtime promotion. |
| DEF-014-2 | Cap tin chủ động / ngày Zalo cá nhân (Q-013) | reports/TIP-014-completion.md:55 | 037 | MỘT PHẦN | channels/jobs/send.processor.ts:43 áp `daily_cap`; packages/channels/src/zalo-personal/manifest.ts:22 không có `perDayProactive` mặc định |
| DEF-015-1 | Consumer `contact.owner_changed` chuyển lịch hẹn mở (move.appointments) | reports/TIP-015-completion.md:53 | — | MỘT PHẦN | Báo giá ĐẠT (quotes.test.ts:309); crm/actions/contact-owner.handlers.ts:98 `appointments: 0`, booking không có consumer |
| DEF-015-2 | KPI 360° (công nợ, HĐ hiệu lực, đơn / thu gần nhất) + LTV | reports/TIP-015-completion.md:53 | 015b | CHƯA | crm/services/contact360.ts:52-55 `kpis: []`, `recent_order` / `recent_payment` rỗng |
| DEF-015-3 | Cột "AI gợi ý" + `/crm/ai` có dữ liệu thật | reports/TIP-015-completion.md:54 | 015b | GIẢ | apps/api/src/http/crm/contacts.controller.ts:133 trả `{ runs: {}, peek: [] }` cứng |
| DEF-015-4 | `contact.remember` + tóm tắt 360° bằng AI | reports/TIP-015-completion.md:54 | 015b | CHƯA | Không có action `contact.remember` trong packages/actions |
| DEF-016-1 | Tin vào / gửi thật qua Hộp thư với Zalo cá nhân | reports/TIP-016-completion.md:49 | 014b | CHỜ-TK | Q-003 Planned014b: provider lifecycle/commands/history/contacts/receipts and native/live acceptance; no runtime promotion. |
| DEF-017-1 | Nginx `widget.<domain>` phục vụ widget.js + proxy socket `/widget` | reports/TIP-017-completion.md:49 | 045 | CHƯA | Thư mục infra/ chưa tồn tại |
| DEF-017-2 | Typing indicator / `agent.status` tới widget (Blueprint §4.6) | reports/TIP-017-completion.md:50 | — | CHƯA | apps/api/src/http/notify/realtime/ws.gateway.ts:93 chỉ typing nhân viên `/ws`; không phát `agent.status` |
| DEF-017-3 | `/settings/widget` liệt kê đủ agent thật | reports/TIP-017-completion.md:48 | — | MỘT PHẦN | packages/core/src/channels/webchat/widget.service.ts:103-105 đọc aiAgent active hoặc selected nhưng take:50, không phân trang; mock/widget-shape.test.ts chỉ kiểm mock, webchat.test.ts không assert danh sách agent. Cần test DB agent active/selected/deleted, tenant isolation và >50 agent hoặc chứng minh quota chặn trường hợp này |
| DEF-018-1 | IMAP / SMTP thật (Gmail mật khẩu ứng dụng, Zoho…) | reports/TIP-018-completion.md:39 | — | CHỜ-TK | packages/channels/src/email/imap-transport.ts:90-161 có verify/fetch/send thật; core/src/channels/channels.module.ts:60 chọn transport thật. email-adapter.test.ts dùng fake, chưa nghiệm thu mailbox thật; Q-004 không thay bằng chứng IMAP |
| DEF-018-2 | Worker `ROLE=channels` mở ra cổng 993 / 465 / 587 ở VPS | reports/TIP-018-completion.md:42 | 045 | CHƯA | infra/ chưa có |
| DEF-019-1 | Nghiệm thu LLM thật qua 9router (engine, agent, Trợ lý, dịch, soạn chứng từ) | reports/TIP-019:40; 021:38; 022:35; 024:31; 025:30; 028:27; 029:28; 035:30 | 044 | CHỜ-TK | Q-001 (gộp các TIP AI); report 023 bổ sung 2026-11-01 đã chạy thử 9router thật, ra 023b/023c |
| DEF-019-2 | Ghi `llm_provider` / `model_route` / `model_price` + `ProviderStore.invalidate()` | reports/TIP-019-completion.md:45 | 040 | CHƯA | admin.llm_provider.* / model_route / model_price thiếu trong registry |
| DEF-020-1 | Embedding thật + chỉnh `min_score` bằng eval rag | reports/TIP-020-completion.md:37 | 044 | CHỜ-TK | Q-001 / Q-002 |
| DEF-020-2 | Tải URL ngoài thật (fetch trang) qua `safeFetch` chống SSRF | reports/TIP-020-completion.md:37 | 045b | CHƯA | TIP-045b mục 2 (`ai/kb/ingest.ts:46`) |
| DEF-021-1 | Worker `ROLE=ai` nạp handler mọi domain agent gọi được (sales, booking, support, contracts, catalog) cho `ai-resume` | reports/TIP-021-completion.md:33 | 019b | MỘT PHẦN | ai/jobs/ai.jobs.module.ts:117 chỉ import Billing/Authz/Channels/Crm/Inbox → action duyệt của domain khác rơi `NotImplementedHandler` (kernel/actions/handler-registry.ts:41) ở worker |
| DEF-021-2 | CRUD `agent_template` nền tảng | reports/TIP-021-completion.md:44 | 040 | CHƯA | admin.agent_template.upsert thiếu trong registry |
| DEF-022-1 | Ghi `contact_memory` tự động từ lượt agent | reports/TIP-022-completion.md:40 | 015b | CHƯA | Chỉ đọc (ai/reply/reply-context.ts:81); không có `contactMemory.create` |
| DEF-022-2 | Eval suite `agent-reply` | reports/TIP-022-completion.md:41 | 044 | CHƯA | Không có harness eval; TG row 044 |
| DEF-022-3 | CSAT theo agent trên thẻ agent | reports/TIP-022-completion.md:39 | 038 | GIẢ | ai/agents/agents.read.ts:40 `csat: 0` cứng |
| DEF-022-4 | `ai_escalate` (khiếu nại) → tự mở ticket | reports/TIP-022-completion.md:39 | 022b | CHƯA | Không consumer `ai.handoff` ở support (chỉ thông báo — ai/events/reply.rules.ts:7) Planned022b: explicit behavior, scoped action/receipt, UI/native/real-model acceptance; no runtime promotion. |
| DEF-023-1 | `preview` cụ thể cho mọi handler ghi (thay thẻ mặc định DC-128) | reports/TIP-023-completion.md:43 | 023b | MỘT PHẦN | Chỉ 14 file handler có `preview(` trong packages/core/src |
| DEF-023-2 | Màn lịch sử phiên Trợ lý dùng `GET /assistant/sessions` | reports/TIP-023-completion.md:41 | — | CHƯA | apps/web/src/features/assistant không gọi `/assistant/sessions` |
| DEF-023-3 | `query_data` thật qua `insight.query` | reports/TIP-023-completion.md:42 | 038 | CHƯA | ai/assistant/meta-tools.ts:7 NOT_IMPLEMENTED; `insight.query` không có trong registry |
| DEF-023-4 | `find_actions` tìm bằng embedding description (Blueprint §5.2, DC-129) | reports/TIP-023-completion.md:37 | — | CHƯA | DC-129 bản từ khoá; TIP-023b không ghi embedding |
| DEF-023-5 | 7 drawer "Trợ lý AI · [module]" + hộp lệnh Hộp thư gọi Trợ lý thật (REQ-E06) | reports/TIP-023-completion.md:46 | 023c | GIẢ | Report bổ sung 2026-11-01; `packages/shared/src/genui` chưa tồn tại |
| DEF-023-6 | Action đọc `search` / `get` từng bản ghi + khuôn input lồng nhau + `pnpm ai:live` | reports/TIP-023-completion.md:46 | 023b | CHƯA | tools/ai-live/ không tồn tại; không script `ai:live` |
| DEF-024-1 | Lịch hoạt động tuỳ chỉnh agent theo ngày / ca (`custom`) | reports/TIP-024-completion.md:35 | 022b | GIẢ | ai/agents/agent.runtime.ts:50 chỉ xét `office`; `custom` = luôn trực Planned022b: explicit behavior, scoped action/receipt, UI/native/real-model acceptance; no runtime promotion. |
| DEF-024-2 | `GET /agents/:id/stats` hiệu suất agent | reports/TIP-024-completion.md:36 | 038 | CHƯA | Không có route trong apps/api/src/http/ai; TG row 038 ghi rõ |
| DEF-024-3 | Định tuyến nhiều agent theo từ khoá ưu tiên | reports/TIP-024-completion.md:34 | 022b | MỘT PHẦN | Từ khoá chỉ chèn prompt (ai/agents/agent.runtime.ts:35), không chọn agent theo từ khoá Planned022b: explicit behavior, scoped action/receipt, UI/native/real-model acceptance; no runtime promotion. |
| DEF-025-1 | "Chuyển thành" Báo giá / Đơn / Lịch hẹn / Ticket từ Hộp thư | reports/TIP-025-completion.md:35 | 025b | MỘT PHẦN | apps/web/src/features/inbox/components/Profile360Actions.tsx:42-58 mở form và prefill contact_id; apps/web/e2e/inbox.spec.ts:74-101 chỉ kiểm mở form ở mock. e2e/http/inbox.spec.ts chỉ gửi/tag/archive, chưa chứng minh tạo từ Hộp thư rồi đọc lại HTTP đúng contact/scope |
| DEF-025-2 | Popover "Đặt lịch hẹn" ở ô soạn lấy khung giờ thật | reports/TIP-025-completion.md (khảo sát) | 025b | GIẢ | apps/web/src/features/inbox/api.ts:98-99 gọi `GET /booking/slots` — API không có (routes.json missing), API thật là `/calendar/slots`; chỉ chạy ở mock |
| DEF-025-3 | Nginx chuyển `/socket.io` (Upgrade) sang API | reports/TIP-025-completion.md:33 | 045 | CHƯA | infra/ chưa có |
| DEF-026-1 | Khối 360° báo giá / đơn / lịch hẹn / ticket / SLA / CSAT có dữ liệu | reports/TIP-026-completion.md:31 | 015b | CHƯA | apps/web/src/features/inbox/components/Blocks360.tsx:2-3 "chưa có dữ liệu". TIP015b đã bổ sung customer-links/KPI/SLA/CSAT, shared DTO và Blocks360 trong manifest sau review2026-11-02; chỉ kế hoạch, chưa code/nghiệm thu. |
| DEF-026-2 | Kanban khách > 50 thẻ / cột có "Xem thêm" | reports/TIP-026-completion.md:32 | — | CHƯA | Không có load-more ở features/customers |
| DEF-027-1 | Chặn sửa / xoá tay nguồn RAG `origin=catalog` | reports/TIP-027-completion.md:32 | 020b | CHƯA | ai/kb/kb.handlers.ts không kiểm `origin` catalog |
| DEF-027-2 | Lỗi `permission denied for table outbox_event` lần provision đầu — tìm nguyên nhân | reports/TIP-027-completion.md:26 | — | CHƯA | packages/db/src/provisioner.ts:38-46 cấp quyền sau clone, setup.ts:100-108 đặt default privilege; không đủ chứng minh DB cũ đúng grant. Report nói lỗi ở workspace dev cũ, không phải workspace test. Chưa tái hiện; cần regression clone/migrate bằng tenant_app, không chữa bằng superuser |
| DEF-028-1 | Queue `doc-render` (ROLE=jobs) cho PDF chứng từ phát hành | reports/TIP-028-completion.md:30 | — | MỘT PHẦN | PDF đóng băng render trong `prepare` của API (DV-008/009); không có queue `doc-render` (documents/jobs/documents.jobs.module.ts:2 chỉ comment) |
| DEF-028-2 | systemd LibreOffice (user riêng, không mạng) + `SOFFICE_PATH` + bộ font | reports/TIP-028-completion.md:31 | 045 | CHƯA | infra/ chưa có; TG 045 ghi "LibreOffice + font" |
| DEF-029-1 | Gửi báo giá / HĐ / đề nghị / nhắc hẹn / CSAT qua Zalo / Email thật | reports/TIP-029:28; 030:29; 032:28; 033:29; 034:29; 035:30 | — | CHỜ-TK | Q-003 / Q-004 (adapter giả) |
| DEF-030-1 | Phụ lục hợp đồng `contract.create_appendix` | reports/TIP-030-completion.md:3,33 | 030b | CHƯA | Bảng packages/db/prisma/tenant/contracts.prisma:83 có; action không có trong registry |
| DEF-030-2 | AI soạn nháp hợp đồng `contract.draft_from_content` | reports/TIP-030-completion.md:3 | 030b | CHƯA | Không có trong packages/actions |
| DEF-030-3 | Bảng chỉ thêm khác (stock_movement, order_event, ticket_event…) chặn UPDATE / DELETE bằng trigger | reports/TIP-030-completion.md:25 | — | CHƯA | Chỉ migration 20261101600000_030_contracts có trigger |
| DEF-031-1 | Adapter sàn thật (Shopee / TikTok Shop / Sapo…) | reports/TIP-031-completion.md:3 | — | NGOÀI | REQ-F07b adapter P2 |
| DEF-031-2 | `order.cancelled` (`refund_requested`) sinh yêu cầu hoàn tiền | reports/TIP-031-completion.md:27 | 032 | ĐẠT | sales/payments/services/refunds.ts:3; test payments.test.ts:268-270 |
| DEF-031-3 | `order.completed` ghi sổ điểm + đảo khi hoàn tác | reports/TIP-031-completion.md:33 | 036 | CHƯA | packages/core/src/loyalty/loyalty.module.ts:5 stub; sales/orders/actions/order-flow.handlers.ts:106-118 undo chỉ xoá pointsEarned/tổng chi, không phát reversal loyalty. TIP-036 TASK 2/AC4 nhận undo rồi complete lại, retry và out-of-order |
| DEF-031-4 | Đồng bộ generator fixture `gen-inbox.py` / `gen-assistant.py` với fixture đang commit | reports/TIP-031-completion.md:26; TIP-024:27 | — | CHƯA | tools/scripts/fixtures/gen-assistant.py:137 vẫn `conversation.close` |
| DEF-031-5 | `db:cleanup-test` tự nạp `.env` | reports/TIP-031-completion.md:25 | — | CHƯA | packages/db/package.json:17 `tsx scripts/cleanup-test-workspaces.ts` không `--env-file` |
| DEF-032-1 | Khoản thu `points` + `payment.redeem_points` | reports/TIP-032-completion.md:32 | 036 | CHƯA | `payment.redeem_points` thiếu trong registry; TG row 036 |
| DEF-032-2 | Trừ buổi liệu trình khi lịch hẹn hoàn tất (`package_usage`) | reports/TIP-032-completion.md:31 | 033 | ĐẠT | booking/services/appointment-write.ts:66-76; test booking.test.ts:4 |
| DEF-032-3 | Form chứng từ FE dùng ngày thật (`todayIso`) thay ngày cứng parity | reports/TIP-032-completion.md:25 | — | MỘT PHẦN | apps/web/src/shared/time/today.ts:7-11 lấy local date khi http; OrderFormModal.tsx:37, ContractFormModal.tsx:48, InvoiceFormModal.tsx:33, PaymentModals.tsx:19 tính TODAY ở module scope nên tab mở qua nửa đêm vẫn dùng ngày cũ. Chưa có test clock qua ngày / mock giữ 2026-06-24 |
| DEF-033-1 | Mục Cài đặt "Đặt lịch": nhân sự / ca / giờ mở cửa (UI) | reports/TIP-033-completion.md:25 | — | CHƯA | Chỉ action + API; FE chỉ có mock domains/calendar-actions.ts (DV-015) |
| DEF-034-1 | Xu hướng KPI ticket (`trend`) so kỳ trước | reports/TIP-034-completion.md:25 | — | GIẢ | support/services/tickets-read.service.ts:185 trả chuỗi rỗng |
| DEF-034-2 | Màn cấu hình danh mục ticket | reports/TIP-034-completion.md:26 | — | CHƯA | Danh mục là text tự do (packages/actions/src/support.ts:49) |
| DEF-034-3 | Parity `tickets:detail` 4,91% sát ngưỡng — rà lại drawer | reports/TIP-034-completion.md:27 | 046 | MỘT PHẦN | Chưa rà; TG 046 "chạy parity mọi màn" |
| DEF-034-4 | Nhiều chính sách SLA + leo thang 4 cấp | reports/TIP-034-completion.md:3 | — | NGOÀI | P3 theo report |
| DEF-035-1 | E2E mock `settings` "thêm email qua wizard 3 bước" đỏ sẵn | reports/TIP-035-completion.md:25 | — | CHƯA | Chưa sửa (gần Q-010) |
| DEF-035-2 | Tập "armed" cho mọi job quét tenant (sla / booking / contracts / sales / payment / order-sync) | reports/TIP-035-completion.md:27,34 | — | CHƯA | support/jobs/support.jobs.module.ts:31, booking/jobs/booking.jobs.module.ts:35, contracts/jobs/contracts.jobs.module.ts:21, sales/jobs/{sales.jobs.module.ts:42, payment.jobs.ts:26, order-sync.jobs.ts:14} quét mọi workspace active |
| Q-001 | Nạp 9router (base URL, key, model) qua env / `admin.llm_provider.upsert`, chạy nghiệm thu AI thật | QUESTIONS.md:9 | 044 | CHỜ-TK | Q-001 mở |
| Q-002 | Route `purpose=embed` sang model 1536 chiều (9router hoặc OpenAI) | QUESTIONS.md:10 | 046 | CHỜ-TK | Q-002 mở; TG 046 "re-embed khi đổi model" |
| Q-003 | Spike `zca-js` với tài khoản Zalo phụ | QUESTIONS.md:11 | — | CHỜ-TK | Q-003 mở |
| Q-004 | SePay + Brevo (domain SPF / DKIM / DMARC) thật | QUESTIONS.md:12 | — | CHỜ-TK | Q-004 mở |
| Q-006 | VPS + domain để deploy / nghiệm thu 045, 046 | QUESTIONS.md:14 | 045 | CHỜ-TK | Q-006 mở |
| Q-008 | Job CI `integration` (service postgres:16 + pgvector + Redis) | QUESTIONS.md:16 | 046 | CHƯA | Workflows không có postgres; TG 046 |
| Q-009 | Script `pnpm smoke:build` + thêm vào bảng cổng D59 | QUESTIONS.md:17 | 046 | CHƯA | Không có script; TG 046 |
| Q-010 | Sửa E2E mock chập chờn (`quotes.spec.ts:37`, `settings-ops.spec.ts:44`, `settings.spec.ts:124`) nhánh `fix/e2e-flaky` | QUESTIONS.md:18 | — | CHƯA | Không có commit fix flaky trong git log |
| Q-011 | Trial cho mời thành viên? (mặc định giữ luật gói) | QUESTIONS.md:19 | 013 | ĐẠT | Mặc định = hành vi hiện tại: 402 PLAN_LIMIT_REACHED — test settings.test.ts:116; đổi chỉ khi Chủ nhà quyết |
| Q-013 | Cap 100 tin chủ động / tài khoản Zalo / ngày, Owner chỉnh ở drawer kênh | QUESTIONS.md:21 | 037 | MỘT PHẦN | send.processor.ts:43 có cơ chế; manifest Zalo chưa đặt số; drawer chưa có ô |
| Q-014 | `ChannelAdapter.recall?` / `react?` thực hiện thu hồi / cảm xúc phía Zalo | QUESTIONS.md:22 | 014b | CHƯA | packages/channels/src/types.ts:22 chỉ cờ `reactions`, không có hàm recall / react Planned014b: provider lifecycle/commands/history/contacts/receipts and native/live acceptance; no runtime promotion. |
| Q-015 | Nhiều widget / workspace (`widget_id`) | QUESTIONS.md:23 | 017 | ĐẠT | Mặc định một widget (DC-086) = code hiện tại; mở rộng là P1 nếu Chủ nhà duyệt — test webchat.test.ts |
| Q-016 | Gmail / Outlook OAuth (XOAUTH2) cho kênh email | QUESTIONS.md:24 | — | CHỜ-TK | Cần app OAuth của Chủ nhà; REQ-B06 P1 |
| Q-017 | `e2e-http.mjs` tự dọn workspace test sau lượt | QUESTIONS.md:25 | — | MỘT PHẦN | `db:cleanup-test` có (packages/db/package.json:17); tools/scripts/e2e-http.mjs không gọi dọn |
| Q-018 | Cửa sổ ~10 giây dùng lại refresh token vừa xoay (nhiều tab) + sửa generator lệch fixture | QUESTIONS.md:26 | — | CHƯA | identity/services/sessions.service.ts:45-49 thu hồi cả family ngay |
| Q-019 | Chọn nhiều hội thoại + thanh thao tác hàng loạt ở Hộp thư (REQ-C08) | QUESTIONS.md:27 | 025b | CHƯA | Backend `conversation.bulk_update` có; features/inbox không có UI bulk |
| Q-020 | Ngoại lệ D28 / mask cho parity `inbox:connect-channel` (6,20%) + soi `inbox:default` | QUESTIONS.md:28 | 046 | MỘT PHẦN | tools/parity/parity.manifest.ts:348-357 chưa có mask lưới kênh |
| Q-021 | "Chuyển tiếp" hàng loạt khách = gửi danh sách cho thành viên | QUESTIONS.md:29 | — | CHƯA | Nút đang ẩn; chờ Chủ nhà xác nhận |
| Q-023 | Ngưỡng `pnpm ai:live` ≥ 27/30 | QUESTIONS.md:31 | 023b | CHƯA | tools/ai-live/ chưa có |
| Q-024 | "Xuất Excel" Báo giá / Đơn / HĐ / Ticket bằng exceljs theo bộ lọc | QUESTIONS.md:32 | 038 | GIẢ | message.info: features/quotes/components/QuotesToolbar.tsx:82, orders/OrdersToolbar.tsx:96, contracts/ContractsToolbar.tsx:69, tickets/TicketsHeader.tsx:143 |
| Q-025 | Chặn chéo: báo giá đã sinh đơn không sinh HĐ và ngược lại | QUESTIONS.md:33 | 032b | CHƯA | TIP-032b mục 2 |
| DV-001 | Duyệt baseline vòng `apps/web` hoặc gỡ vòng | DEVIATIONS.md:18 | — | CHƯA | Baseline vẫn 99 (xem DEF-001-1) |
| DV-002 | Duyệt `platform/notify.prisma` + `event_consumption` + thư viện socket.io / nodemailer | DEVIATIONS.md:19 | 006 | ĐẠT | packages/db/prisma/platform/notify.prisma:7; tenant/kernel.prisma:137; test notify.test.ts |
| DV-003 | Duyệt Storage / `POST /v1/files` ở kernel (s3 sau) | DEVIATIONS.md:20 | 020 | ĐẠT | apps/api/src/http/files/files.controller.ts:32; test documents.test.ts, inbox-ui.test.ts |
| DV-004 | Duyệt `prepare` ngoài transaction + `/agents/meta` + `/settings/governance` | DEVIATIONS.md:21 | 021 | ĐẠT | kernel/actions/handler.ts:35; test agents.test.ts |
| DV-005 | Duyệt prompt `.md` + bản TS; job agent-reply đẩy thẳng từ channel-inbound | DEVIATIONS.md:22 | 022 | ĐẠT | packages/ai/src/prompts/*.md + index.ts; test packages/ai/test/reply.test.ts:71 |
| DV-006 | SSE cho `POST /assistant/messages` + `transport.stream` FE | DEVIATIONS.md:23 | 023c | CHƯA | Không có `text/event-stream` trong apps/api; TIP-023c mục 6a |
| DV-007 | Duyệt LibreOffice cho mẫu rich + docxtemplater / pizzip + preview trong API | DEVIATIONS.md:24 | 028 | ĐẠT | documents/services/doc-renderer.ts:40; test documents.test.ts (queue doc-render xem DEF-028-1) |
| DV-008 | Duyệt `/quotes/meta`, link công khai, queue `sales-scheduler` | DEVIATIONS.md:25 | 029 | ĐẠT | apps/api/src/http/sales/public-quotes.controller.ts:1; test quotes.test.ts |
| DV-009 | Duyệt `pdf-lib` + endpoint ký / OTP + `contracts-scheduler` | DEVIATIONS.md:26 | 030 | ĐẠT | contracts/services/contract-sign-pdf.ts:3; test contracts.test.ts |
| DV-010 | Làm phụ lục + AI soạn nháp HĐ | DEVIATIONS.md:27 | 030b | CHƯA | Xem DEF-030-1/2 |
| DV-011 | Duyệt cột đơn mới + `order_event`; `order.import_external` không là action | DEVIATIONS.md:28 | 031 | ĐẠT | packages/db/prisma/tenant/sales-orders.prisma:124; test orders.test.ts |
| DV-012 | Duyệt `ConnectorManifest.hidden` + `mock_marketplace` | DEVIATIONS.md:29 | 031 | ĐẠT | packages/integrations/src/connectors/mock/order-sync.ts:19, define.ts:10; test packages/integrations/test/order-sync.test.ts |
| DV-013 | Duyệt `bank_tx` / `payment_account` / `package_usage` + `payment.refund_approve` / `refund_reject` | DEVIATIONS.md:30 | 032 | ĐẠT | packages/actions/src/payments.ts:33; test payments.test.ts:268 |
| DV-014 | Duyệt `/invoices/meta`, PDF phiếu thu, `/settings/payments`, phương thức `points` / `marketplace` | DEVIATIONS.md:31 | 032 | ĐẠT | apps/api/src/http/sales/invoices.controller.ts:39; test payments.test.ts |
| DV-015 | Duyệt bảng booking mới + `/v1/calendar`; thiếu UI cấu hình nhân sự / giờ mở cửa | DEVIATIONS.md:32 | — | MỘT PHẦN | Backend ĐẠT (booking.prisma:39,53; calendar.controller.ts:34; booking.test.ts); UI chưa (DEF-033-1) |
| DV-016 | Duyệt `ticket_event` + cột ticket + `/tickets/meta` | DEVIATIONS.md:33 | 034 | ĐẠT | packages/db/prisma/tenant/support.prisma:110; tickets.controller.ts:32; test support.test.ts |
| DV-017 | Duyệt cột `ai_task` mới + `ai_task.delete` / `run_now` + notify | DEVIATIONS.md:34 | 035 | ĐẠT | packages/actions/src/ai.ts:306; test ai-tasks.test.ts |

**Ghi chú / chưa rà hết:**

- Ghi chú:
- Đã đọc hết phần ISSUES / SUGGESTIONS / STATUS của 33 report (001–035) và mọi dòng mở của QUESTIONS (Q-001…Q-025) + DEVIATIONS (DV-001…DV-017). Bỏ qua: Q-005/007/022 (đã trả lời / đã xử lý), Q-012 (tạm theo đề xuất, crm_owner đã có — shared/notify/catalog.ts:22), gợi ý tuỳ chọn ("nếu cần": presence, topic loyalty.* cho ai_task, phạm vi tri thức riêng tác vụ).
- CHỜ-TK của LLM thật / Zalo / Email nhiều TIP gộp vào DEF-019-1 và DEF-029-1 (gộp cùng loại, cùng Q).
- Phát hiện đáng chú ý: Casso chỉ có adapter mock (DEF-012-3, không phải thiếu TK); worker ROLE=ai thiếu module sales/booking/support/contracts cho ai-resume (DEF-021-1); popover Đặt lịch ở Hộp thư gọi route không tồn tại (DEF-025-2); `channels.used` billing cứng 0 (DEF-009-1).
- Rà tiếp 2026-11-02: đã đọc code/test DEF-017-3, DEF-025-1, DEF-032-3 và adapter Brevo/IMAP/Zalo; hạ các khẳng định ĐẠT thiếu chứng cứ, tách connector workspace khỏi email nền tảng. Unit integrations 22/22, channels 27/27; không phải nghiệm thu provider thật.
- Đã đối chiếu DEF-023-4 với Blueprint:1098 + DC-129 (embedding/cache vẫn là nợ); DEF-028-1 với Blueprint:124,1327 + documents.jobs.module.ts:5 (queue chưa có; DV-007 không xoá nghĩa vụ).
- CHƯA RÀ HẾT: DEF-027-2 / DEF-035-1 chưa tái hiện runtime; còn phải gán TIP chờ và rà độc lập toàn phần. Chi tiết lượt này: coding-packs/reports/coverage-deferred-audit-2026-11-02.md.
