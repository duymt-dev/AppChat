# TIP-025: Inbox — nối API + realtime cho màn đã có (3 cột, thư mục, chat, khung nhập, chế độ AI, handoff, gợi ý copilot, 360°, menu ⋯ ver2.1)

## HEADER
- TIP-ID: TIP-025
- Project: AppChat V2
- Module: FE `apps/web/src/{features/inbox/**, shared/realtime/**, shared/api/http-transport.ts}` · `apps/web/next.config.*` · BE `packages/core/src/{inbox/**, ai/skills/**, ai/reply/**}` · `apps/api/src/http/{inbox,notify/realtime}/**` · `packages/actions/src/{inbox,ai}.ts`
- Depends on: TIP-016 (Inbox backend), TIP-022 (agent trực kênh), TIP-024 — nhánh xếp chồng từ `tip/024-agents-ui`
- Priority: P0 · REQ: C01–C05, C07, C08 · Decision: D42 (danh sách), D46, D51, DC-078
- Estimated effort: 20 giờ

## CONTEXT
Khảo sát đầu TIP (đối chiếu FE ↔ backend http): danh sách / luồng tin / đếm / gửi / ghi chú / thẻ / lưu trữ / banner handoff chạy được, nhưng:
- **Không có realtime ở http** — FE không có socket client (`event-invalidation` chỉ chạy mock), tin mới chỉ thấy khi tải lại (REQ-C01 p95 < 1s).
- **Thư mục / tab / tài khoản / tìm kiếm không gửi lên API** — chỉ gửi `channel`; khoá thư mục FE (`mention`, `starred`, `team`, `spam`, `ch_*`) không có ở backend (400).
- **Ảnh / tệp không hiện** — FE `Message` không có `attachments`; khung nhập không gửi tệp.
- **Menu gọi action / endpoint chưa có:** `ai.translate` (501), `/booking/slots`, `/quotes?contact_id=`, `/contracts?contact_id=` (404 — TIP-029/030/033).
- Thiếu: @nhắc trong ghi chú (thư mục "Nhắc đến tôi" luôn 0 — DC-078), deep link `/inbox?c=` từ thông báo, phân trang (50 hội thoại / 50 tin), tìm trong hội thoại không dùng `/messages/search`, chế độ AI không có "Tắt" / không hiện chế độ hiện tại, `ai_state='running'` không ai ghi.
- "Chuyển thành" (C07): action tạo báo giá / đơn / lịch hẹn / ticket chưa có handler (TIP-029/031/033/034) — TIP này chỉ đảm bảo FE không vỡ.

## TASK
1. **Realtime http:** FE socket client (`socket.io-client` — cùng phiên bản đã có trong repo) nối namespace `/ws` của API (token + workspace từ `http-transport`, kết nối lại khi làm mới token), map sự kiện → làm mới query: `message.new` / `message.updated` → luồng tin + danh sách + đếm; `conversation.updated` → danh sách + đếm + luồng; `approval.changed` → `approvals` + `action-logs`; `agent.changed` → `agents`; `notification.new` / `authz.changed` như mock. Vào / rời phòng hội thoại khi đổi hội thoại đang mở. Next rewrite `/socket.io` (hoặc kết nối thẳng API — chọn theo cấu hình dev / prod, ghi DC).
2. **Thư mục + bộ lọc:** `conversationsQuery({ folder, channel, channel_account_id, q })` + phân trang `next_cursor` (cuộn cuối danh sách tải thêm); map khoá FE → backend: `ch_<type>` → `channel`; `mention` → thư mục mới `mention` (hội thoại có ghi chú nhắc tới mình chưa đọc); `starred` / `spam` → ẩn khỏi rail (chưa có dữ liệu — DC); `team` → thư mục backend `team`. Tài khoản lọc theo `channel_account_id`. Tìm kiếm gửi `q` (không dấu ở backend). Sắp xếp: `recent` (mặc định) / `unread` (backend `sort`).
3. **Tệp đính kèm:** FE `Message.attachments[]` → bong bóng ảnh (thumbnail) / tệp (tên + dung lượng, mở link); khung nhập "Thêm tệp" tải qua `POST /files` → `message.send { attachments: file_id[] }` (backend: input + gửi qua adapter kênh có hỗ trợ — email; Zalo / webchat theo manifest).
4. **@nhắc trong ghi chú:** `note.add { text, mentions: user_id[] }` (FE gợi ý thành viên khi gõ `@`); backend lưu `message.mentions`, thông báo `mention` cho người được nhắc, thư mục `mention` + đếm.
5. **Dịch tin (`ai.translate`):** handler skill (risk read, credit như mọi run) dịch một tin sang ngôn ngữ người dùng (hoặc `to`) bằng model; model giả trả câu có tiền tố ngôn ngữ.
6. **Chế độ AI:** popover có đủ `auto` / `copilot` / `off` + đánh dấu chế độ hiện tại; agent trực kênh ghi `ai_state='running'` khi bắt đầu lượt, về `idle` khi gửi xong (thư mục "AI đang xử lý").
7. **Deep link + 360°:** `/inbox?c=<id>` chọn hội thoại (thông báo dẫn tới); 360° / Đặt lịch: endpoint chưa có (TIP-029/030/033) → FE hiện trạng thái rỗng thay vì lỗi (không gọi khi chưa có module — `features` flag theo `GET /me` modules? → đơn giản: bắt 404 → rỗng).
8. **Tìm trong hội thoại** dùng `GET /conversations/:id/messages/search?q=` (không dấu, nhảy tới tin).
9. **Sửa nhỏ:** `contact.set_stage` khi hội thoại không có khách → ẩn mục; `FolderRail` không vỡ khi thiếu meta kênh; `selectedId` mặc định = hội thoại đầu (bỏ id fixture).

## ACCEPTANCE CRITERIA
1. Unit / integration backend: thư mục `mention` + `team` + sort; `note.add` có `mentions` → thông báo + đếm; `message.send` có tệp (email gửi kèm tệp; kênh không hỗ trợ → 422 rõ ràng); `ai.translate` (model giả) trả bản dịch, trừ credit; agent ghi `ai_state` running → idle; socket: tin mới phát `message.new` tới phòng hội thoại + `conversation.updated` tới workspace.
2. FE unit / mock shape: map khoá thư mục → tham số API; mock hỗ trợ cùng tham số.
3. E2E http: hai trình duyệt (người A mở Hộp thư, khách nhắn từ widget) → tin mới hiện **không tải lại** < 5 giây; thư mục "Chưa đọc" / tìm kiếm không dấu / lọc kênh trả đúng; gửi ảnh qua Email giả → bong bóng ảnh; ghi chú @nhắc thành viên → thành viên thấy thư mục "Nhắc đến tôi" = 1; Dịch tin; đổi chế độ AI → Tắt; deep link `/inbox?c=`.
4. E2E mock `inbox` xanh; parity `inbox:*` không hồi quy.

## CONSTRAINTS
- "Chuyển thành" Báo giá / Đơn / Lịch hẹn: handler thuộc TIP-029/031/033 — giữ menu, action trả 501 hiện câu "Tính năng này chưa sẵn sàng" (đã có i18n `NOT_IMPLEMENTED`, TIP-024). Ticket = TIP-034.
- Chọn nhiều + thao tác hàng loạt (C08): prototype không có giao diện chọn nhiều → backend `conversation.bulk_update` đã có; UI chọn nhiều để sau khi có thiết kế (ghi Q).
- AI soạn / viết lại (C05 phần AI): Trợ lý thu nhỏ đã làm đường này (TIP-023); action skill riêng = TIP-044 (eval).
