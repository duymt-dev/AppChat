# TIP-048g — exact file manifest

M = sửa, C = tạo mới. M path tương lai do TIP trước tạo, cần đã tích hợp:
- TIP-048f tạo `packages/db/prisma/tenant/social.prisma`, `packages/core/src/inbox/comments/comment-reply.ts`.
- TIP-048e tạo `packages/channels/src/facebook/manifest.ts`, `packages/channels/src/instagram/manifest.ts`, `packages/channels/src/meta/webhook.ts`.

Không dùng wildcard thư mục; test liệt kê từng file.

| Mode | Exact file | Responsibility |
|---|---|---|
| M | `packages/db/prisma/tenant/social.prisma` | `live_session` + `live_comment_flag` |
| C | `packages/db/prisma/tenant/migrations/20261115130000_live_sessions/migration.sql` | Bảng live + enum + index + FK nội DB |
| C | `packages/channels/src/facebook/live.ts` | Webhook `live_videos`; SSE `live_comments` đọc bằng `fetch` stream; poll `no_filter` đối soát |
| C | `packages/channels/src/instagram/live.ts` | Webhook IG `live_comments` → bình luận live |
| M | `packages/channels/src/meta/webhook.ts` | Phân loại field `live_videos` / IG `live_comments` → `HookItem.kind = 'live'` |
| M | `packages/channels/src/facebook/manifest.ts` | `capabilities.live = true` |
| M | `packages/channels/src/instagram/manifest.ts` | `capabilities.live = true` |
| C | `packages/channels/test/meta-live.test.ts` | Parse SSE, poll bù không trùng, webhook mở / đóng phiên (transport `fake`) |
| C | `packages/channels/test/fixtures/meta/live_videos_live.json` | Webhook FB `live_videos` `status = live` |
| C | `packages/channels/test/fixtures/meta/live_videos_ended.json` | Webhook FB `live_videos` `status = live_stopped` |
| C | `packages/channels/test/fixtures/meta/live_comments_sse.txt` | Luồng SSE mẫu (có đoạn rớt giữa chừng) |
| C | `packages/channels/test/fixtures/meta/live_comments_poll.json` | Trang `GET /{live_video_id}/comments?live_filter=no_filter` |
| C | `packages/channels/test/fixtures/meta/ig_live_comments.json` | Webhook IG `live_comments` |
| C | `packages/core/src/inbox/live/live-session.service.ts` | Mở / đóng phiên, nhận bình luận live vào hội thoại `comment`, đếm |
| C | `packages/core/src/inbox/live/intent-detect.ts` | Hàm thuần: SĐT VN → E.164, từ khoá chốt đơn, "+1", mã SP, câu hỏi |
| C | `packages/core/src/inbox/live/live-flags.ts` | Ghi cờ, bỏ trùng theo khách / phiên, AI phân loại theo lô (tuỳ chọn), `liveContext()` cờ của khách cho lượt agent |
| M | `packages/core/src/inbox/comments/comment-reply.ts` | Gọi `liveContext()` cho lượt agent trên bình luận live (1–2 dòng, file của 048f) |
| C | `packages/core/src/inbox/live/live-actions.handlers.ts` | Handler `live.list` / `live.get` / `live.flag_update` / `live.update_settings` |
| C | `packages/core/src/inbox/live/live-read.ts` | Danh sách phiên, luồng bình luận, bảng cờ (keyset) |
| C | `packages/core/src/channels/jobs/live-stream.processor.ts` | Queue `live-comments`, lease `lease:live:<sessionId>`, SSE + poll, ghi bình luận |
| M | `packages/core/src/channels/jobs/channels.jobs.module.ts` | Mở worker `live-comments` + nhịp quét phiên `live` |
| M | `packages/core/src/inbox/inbox.module.ts` | Đăng ký handler live |
| M | `packages/core/test/assistant-coverage.test.ts` | Action `live.*` có preview, ô `message_id` có đường tra, không action bulk |
| C | `packages/core/test/live-intent.test.ts` | Bảng ca SĐT / từ khoá / "+1" / mã SP / câu hỏi |
| C | `packages/actions/src/live.ts` | 4 action `live.*` (`live.flag_update` `agentGrantable: true` — DC-921) |
| M | `packages/actions/src/index.ts` | Export `live` |
| C | `packages/shared/src/api/live.ts` | DTO phiên, bình luận live, cờ, cài đặt |
| C | `apps/api/src/http/inbox/live.controller.ts` | `GET /v1/inbox/live-sessions`, `GET /v1/inbox/live-sessions/:id`, `GET /v1/inbox/live-sessions/:id/comments` |
| M | `apps/api/src/http/inbox/inbox.http.module.ts` | Đăng ký `live.controller` |
| C | `apps/api/test/integration/live-sessions.test.ts` | AC1–AC9 (webhook / SSE / poll giả + DB thật + EXPLAIN) |
| M | `packages/shared/src/i18n/server/vi/inbox.ts` | Lỗi `live_session_ended`, nhãn cờ |
| M | `packages/shared/src/i18n/server/en/inbox.ts` | Như trên (en) |
| C | `apps/web/src/app/(app)/inbox/live/[id]/page.tsx` | Route phiên live (≤ 120 dòng, chỉ routing) |
| C | `apps/web/src/features/inbox/screens/LiveSessionScreen.tsx` | Orchestrator: luồng bình luận + bảng cờ + form điền sẵn |
| C | `apps/web/src/features/inbox/components/live/LiveSessionList.tsx` | Danh sách phiên (đang phát / đã kết thúc) |
| C | `apps/web/src/features/inbox/components/live/LiveCommentFeed.tsx` | Luồng bình luận realtime, lọc chỉ cờ, ảo hoá |
| C | `apps/web/src/features/inbox/components/live/LiveFlagPanel.tsx` | Bảng cờ: Tạo khách, Tạo đơn, Đã xử lý, Bỏ qua |
| C | `apps/web/src/features/inbox/components/live/LiveFlagPanel.test.tsx` | Nút theo quyền, form điền sẵn, cờ đã xử lý bởi agent hiện người xử lý |
| C | `apps/web/src/features/inbox/components/live/LiveSettingsModal.tsx` | Từ khoá chốt đơn, bật AI phân loại |
| C | `apps/web/src/features/inbox/hooks/useLiveSession.ts` | Đọc phiên / bình luận / cờ, realtime, `useAction('live.*')` |
| C | `apps/web/src/shared/api/mock/domains/live.ts` | Mock phiên, bình luận, cờ, action |
| M | `apps/web/src/shared/api/mock/handlers.ts` | Đăng ký `liveHandlers` |
| M | `apps/web/src/features/inbox/components/FolderRail.tsx` | Mục "Livestream" + số phiên đang phát; mở `LiveSessionList` dưới mục |
| M | `apps/web/src/features/orders/components/OrderFormModal.tsx` | Nhận `prefill` khách + dòng sản phẩm + ghi chú nguồn live |
| M | `apps/web/src/features/orders/hooks/useOrderForm.ts` | `initialOrderDraft` nhận dòng điền sẵn |
| M | `apps/web/messages/vi/inbox.json` | `live.*` |
| M | `apps/web/messages/en/inbox.json` | Như trên (en) |
| M | `apps/web/messages/vi/actions.json` | `actions.live__*.title` |
| M | `apps/web/messages/en/actions.json` | Như trên (en) |
| M | `tools/parity/parity.manifest.ts` | Mask mục "Livestream" ở rail Hộp thư — PD-905 |
| C | `apps/web/e2e/inbox-live.spec.ts` | E2E mock: phiên, cờ, tạo khách / đơn điền sẵn, mobile 390 |
| C | `apps/web/e2e/http/inbox-livestream.spec.ts` | E2E http (transport `fake`); tên khác `e2e/http/inbox-live.spec.ts` có sẵn (realtime Hộp thư — TIP-025) |
