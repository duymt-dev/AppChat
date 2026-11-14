# TIP-006d — Thông báo đẩy web (Web Push + PWA) cho kênh `mobile`

## HEADER
- **Parallel-safe with TIP-051 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 006d before051.
- **Parallel-safe with TIP-051b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 006d before051b.
- **Parallel-safe with TIP-049 (coverage-closure manifest):** sequential, shares `.env.example`; integrate 006d before049.
- **Parallel-safe with TIP-049b (coverage-closure manifest):** sequential, shares `.env.example`; integrate 006d before049b.
- **Parallel-safe with TIP-049c (coverage-closure manifest):** sequential, shares `.env.example`; integrate 006d before049c.
- **Parallel-safe with TIP-049d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 006d before049d.
- **Parallel-safe with TIP-035d (coverage-closure manifest):** sequential, shares `.env.example`; integrate 035d before006d.
- **Parallel-safe with TIP-048 (coverage-closure manifest):** sequential, shares `.env.example`; integrate 006d before048.
- **Parallel-safe with TIP-048b (coverage-closure manifest):** sequential, shares `.env.example`; integrate 006d before048b.
- **Parallel-safe with TIP-048c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 006d before048c.
- **Parallel-safe with TIP-048d (coverage-closure manifest):** sequential, shares `.env.example`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 006d before048d.
- **Parallel-safe with TIP-048e (coverage-closure manifest):** sequential, shares `.env.example`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 006d before048e.
- **Parallel-safe with TIP-048h (coverage-closure manifest):** sequential, shares `.env.example`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 006d before048h.
- **Parallel-safe with TIP-047 (coverage-closure manifest):** sequential, shares `.env.example`; integrate 006d before047.
- **Parallel-safe with TIP-047b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 006d before047b.
- **Parallel-safe with TIP-047d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 006d before047d.
- TIP-ID: TIP-006d; Project: AppChat V2; Module: notify + web shell (PWA); Priority: P1; Estimated: M. TIP bổ sung cho TIP-006 (đã DONE, không sửa file gốc — DC-233).
- Depends on: 006b (event delivery), 006c (realtime events) đã tích hợp; trước 044/045/046.
- **Files touched:** [exact M/C manifest](manifests/TIP-006d-files.md) — 23 paths (12 C). M path tương lai phải do TIP tạo trước tích hợp xong.
- **Parallel-safe with:** tuần tự với mọi TIP chung file (dòng khai hai phía bên dưới, máy kiểm `python -X utf8 tools/obligations/manifests.py --order`).
- **Parallel-safe with TIP-004b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `packages/actions/src/settings.ts`; integrate 004b before006d.
- **Parallel-safe with TIP-004c (coverage-closure manifest):** sequential, shares `packages/db/prisma/platform/notify.prisma`; integrate 004c before006d.
- **Parallel-safe with TIP-012b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 012b before006d.
- **Parallel-safe with TIP-012c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 012c before006d.
- **Parallel-safe with TIP-013b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `packages/actions/src/settings.ts`; integrate 013b before006d.
- **Parallel-safe with TIP-013c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `packages/actions/src/settings.ts`; integrate 013c before006d.
- **Parallel-safe with TIP-014b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 014b before006d.
- **Parallel-safe with TIP-014c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 014c before006d.
- **Parallel-safe with TIP-015c (coverage-closure manifest):** sequential, shares `packages/core/src/notify/services/notifier.ts`; integrate 015c before006d.
- **Parallel-safe with TIP-015d (coverage-closure manifest):** sequential, shares `apps/api/src/http/notify/notify.controller.ts`, `packages/core/src/notify/jobs/notify.jobs.module.ts`, `packages/core/src/notify/notify.module.ts`, `packages/core/src/notify/services/notifier.ts`; integrate 015d before006d.
- **Parallel-safe with TIP-015f (coverage-closure manifest):** sequential, shares `packages/core/src/notify/services/notifier.ts`; integrate 015f before006d.
- **Parallel-safe with TIP-017b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 017b before006d.
- **Parallel-safe with TIP-018b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 018b before006d.
- **Parallel-safe with TIP-019b (coverage-closure manifest):** sequential, shares `packages/core/src/notify/services/notifier.ts`; integrate 019b before006d.
- **Parallel-safe with TIP-020b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 020b before006d.
- **Parallel-safe with TIP-020d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 020d before006d.
- **Parallel-safe with TIP-020e (coverage-closure manifest):** sequential, shares `.env.example`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 020e before006d.
- **Parallel-safe with TIP-022b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 022b before006d.
- **Parallel-safe with TIP-026b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 026b before006d.
- **Parallel-safe with TIP-030b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 030b before006d.
- **Parallel-safe with TIP-031c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 031c before006d.
- **Parallel-safe with TIP-032b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 032b before006d.
- **Parallel-safe with TIP-033b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 033b before006d.
- **Parallel-safe with TIP-034b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 034b before006d.
- **Parallel-safe with TIP-037 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 037 before006d.
- **Parallel-safe with TIP-039 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 039 before006d.
- **Parallel-safe with TIP-041 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 041 before006d.
- **Parallel-safe with TIP-042 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `packages/actions/src/settings.ts`; integrate 042 before006d.
- **Parallel-safe with TIP-042b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 042b before006d.
- **Parallel-safe with TIP-043 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 043 before006d.
- **Parallel-safe with TIP-045b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `packages/core/src/notify/jobs/notify.jobs.module.ts`, `packages/core/src/notify/notify.module.ts`; integrate 045b before006d.
- **Dòng COVERAGE nhận:** DEF-006-2; DC-029.

## CONTEXT
- Hiện trạng đối chiếu mã 2026-11-08 (file:dòng, không tin trạng thái DONE):
  - `packages/core/src/notify/services/notifier.ts:48` `deliverIntent` gửi WS `notification.new` + email (`channelsFor` → `ch.desktop` / `ch.email`); `ch.mobile` tính nhưng **không gửi gì** (DC-029).
  - `packages/db/prisma/platform/notify.prisma:7` chỉ có `notification_pref` (events {desktop,email,mobile}, dnd, sound, digest) — **chưa có bảng subscription thiết bị**.
  - `apps/web/src/features/settings/components/NotifSection.tsx:14` cột Mobile đã có (prototype L6200–6216), bật/tắt chỉ lưu tuỳ chọn.
  - `apps/web/public/` không có `manifest.webmanifest` / service worker; `apps/web/src/app/layout.tsx` chưa khai manifest / icon PWA.
  - Không có thư viện push trong repo; `.env.example` chưa có khoá VAPID.

## APPLICABLE STANDARDS
- events/outbox.md; ops/observability-security.md; ui/prototype-parity.md; i18n/i18n.md; integrations/provider-ports.md.
- Không đổi luật COMMERCE, 5 vai trò, quyền đã chốt, đơn giá Credit. Quyết định mới → DECISIONS (DC), câu hỏi → QUESTIONS.

## Rà trước khi làm
1. Đọc lại mọi file trong manifest sau khi TIP phụ thuộc đã tích hợp; lệch CONTEXT → sửa TIP/manifest trước khi code.
2. `python -X utf8 tools/obligations/manifests.py 006d` tính lại giao file; thêm path thì cập nhật manifest + header hai phía.
3. Xác nhận 006b/006c đã tích hợp và đường giao thông báo (consumer `notify` → `deliverIntent`) chưa đổi chữ ký; lệch → sửa manifest trước.
4. Kiểm `web-push` còn bảo trì, bản ổn định mới nhất; ghi phiên bản vào DV-055.

## TASK
Gửi thông báo đẩy Web Push (VAPID, miễn phí, không cần tài khoản provider) cho kênh `mobile` của tuỳ chọn thông báo, kể cả khi đã đóng tab; biến web thành PWA để iPhone (iOS 16.4+) nhận được sau khi "Thêm vào Màn hình chính".

## SPECIFICATIONS
### 1. Lưu đăng ký thiết bị (DB nền tảng)
1. Bảng `push_subscription(id uuid PK, user_id, endpoint TEXT UNIQUE, p256dh, auth, user_agent, created_at, last_ok_at, failed_count)` trong `platform/notify.prisma`; index `(user_id)` INCLUDE (endpoint) cho tra theo người nhận.
2. Action `notification.push_subscribe` / `notification.push_unsubscribe` (permission `self`, `db: platform`, idempotent theo endpoint); `notification.push_test` gửi một thông báo thử cho thiết bị của chính mình.
3. GET danh sách thiết bị của tôi (tên trình duyệt / hệ điều hành rút từ user_agent, lần gửi thành công cuối) — chỉ trả của người gọi.
### 2. Gửi đẩy
1. Trong `deliverIntent`: khi `ch.mobile` bật và **ngoài giờ không làm phiền** → enqueue job `notify-push` (jobId = id thông báo + subscription → chạy lại không gửi trùng). Thông báo in-app vẫn luôn ghi.
2. Processor `notify-push` (worker ROLE=jobs) gửi qua `web-push` với VAPID (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`); TTL 24h; 404 / 410 → xoá subscription; lỗi khác → tăng `failed_count`, ≥ 5 lần liên tiếp → xoá; thành công → `last_ok_at`.
3. Thiếu khoá VAPID → bỏ qua kênh push (log cảnh báo một lần khi khởi động), không làm hỏng in-app / email.
4. Payload tối thiểu: tiêu đề theo `notificationTitle` (locale người nhận), không nội dung tin nhắn / số tiền / dữ liệu khách; `link` mở đúng màn; `tag` = loại thông báo để gộp.
### 3. PWA + service worker (apps/web)
1. `public/manifest.webmanifest` (tên, icon 192/512 + maskable, `display: standalone`, `start_url`, màu nền từ token theme) và khai trong `app/layout.tsx`.
2. `public/sw.js`: sự kiện `push` → `showNotification`; `notificationclick` → focus tab đang mở hoặc mở `link`; không cache trang (không offline ở TIP này).
3. Hook `usePushSubscription` (shared/notify): kiểm hỗ trợ, xin quyền **chỉ khi người dùng bật** (không hỏi lúc vào app), đăng ký với VAPID public key lấy từ API, gọi action subscribe/unsubscribe.
### 4. Cài đặt › Thông báo
1. Khối "Thông báo đẩy trên thiết bị này": trạng thái (chưa bật / đã bật / trình duyệt chặn / không hỗ trợ), nút Bật / Tắt, nút Gửi thử, danh sách thiết bị đã bật + gỡ.
2. Safari iPhone chưa ở chế độ PWA (`display-mode: standalone` = false) → hướng dẫn tại chỗ "Chia sẻ → Thêm vào Màn hình chính", không hiện nút Bật.
3. Trình duyệt đã chặn → hướng dẫn mở lại quyền trong cài đặt trình duyệt. Mọi chuỗi qua i18n vi + en; lệch prototype ghi `docs/06-prototype/DEVIATIONS.md` (mức thêm khối nhỏ trong mục có sẵn).

## ACCEPTANCE CRITERIA
|AC|Given / When|Then — bằng chứng|
|---|---|---|
|1|Bật thông báo đẩy ở Cài đặt (Chrome desktop) rồi đóng tab; khách nhắn vào hội thoại được giao|nhận thông báo hệ điều hành, bấm mở đúng hội thoại — E2E http (Playwright, quyền notifications + push giả lập) + test processor|
|2|Cột Mobile của loại thông báo tắt, hoặc đang trong giờ không làm phiền|không enqueue `notify-push`; in-app vẫn ghi — unit `notifier` + integration|
|3|Dịch vụ push trả 410 cho một endpoint|subscription bị xoá, lần sau không gửi; endpoint khác của cùng user vẫn nhận — integration với server push giả|
|4|Job `notify-push` chạy lại (worker chết giữa chừng)|không gửi trùng (jobId tất định) — integration|
|5|Không cấu hình VAPID|API / worker khởi động bình thường, push bỏ qua, in-app + email không đổi — integration|
|6|Mở Cài đặt › Thông báo trên Safari iPhone (giả lập UA, không standalone)|hiện hướng dẫn Thêm vào Màn hình chính, không hiện nút Bật — e2e mobile 390×844|
|7|Bấm Gửi thử|chỉ thiết bị của người bấm nhận; user khác không thấy subscription của nhau — integration quyền `self`|
|8|Payload push|không chứa nội dung tin nhắn / số tiền / SĐT / email khách — unit payload builder|

### Commands / evidence gate
- `pnpm --filter @appchat/core test -- test/notify-push.test.ts`
- `pnpm --filter @appchat/api test:integration -- test/integration/web-push.test.ts`
- `pnpm e2e settings`
- `pnpm parity settings-notif`
- `pnpm depcheck`
- Ba cổng D59 (khi làm · trước commit · chốt TIP); parity màn liên quan; E2E mock + http của luồng TIP. Lệnh là cổng tương lai, chưa chạy khi viết TIP.

## CONSTRAINTS
- Chỉ Web Push chuẩn (VAPID) — không FCM SDK / OneSignal / app native (P2, DC-381). Push cho khách qua web widget: ngoài phạm vi.
- Không xin quyền thông báo ngoài thao tác bật của người dùng; không thêm bước onboarding.
- Khoá VAPID là secret: chỉ ở env, không log, không trả private key qua API; `infra/` thêm biến (045 nhận phần triển khai).
- Thư viện `web-push` là ngoại lệ tech stack có DV-055; không thêm thư viện khác.
- Backend 200–400 dòng/file (trần 600), FE trần 400, màn chỉ orchestrator; test file riêng; ghi chỉ qua ActionExecutor; Postgres index `=` trước range/sort, EXPLAIN cho list mới.

## Quality Gate
- Manifest 23 path, header khai hai phía, 8 AC đo được. Viết 2026-11-08 theo DC-381 (Chủ nhà chốt đưa web push vào phát hành). Chưa code / chưa runtime.

## ⚠️ BUILDER-CHECKLIST
- [ ] Rà trước khi làm xong; manifest khớp.
- [ ] Mọi AC có test chạy thật, dán output.
- [ ] Cập nhật COVERAGE (parts + merge.py) với bằng chứng file:dòng + test.
- [ ] Commit, `git status --short` sạch, báo Git SHA; PR vào dev.
