# TIP-048f — exact file manifest

M = sửa, C = tạo mới. M path tương lai do TIP trước tạo, cần đã tích hợp:
- TIP-048e tạo `packages/channels/src/meta/webhook.ts`, `packages/channels/src/facebook/manifest.ts` / `adapter.ts` / `normalize.ts`, `packages/channels/src/instagram/manifest.ts` / `adapter.ts` / `normalize.ts`.
- TIP-048b mở rộng `packages/channels/src/types.ts` (`thread`, `mode`, `targetExternalId`, `capabilities.comments`, `sync`) và thêm lỗi `comment_unsupported` / `private_reply_used` / `private_reply_expired`.

Không dùng wildcard thư mục; test liệt kê từng file.

| Mode | Exact file | Responsibility |
|---|---|---|
| C | `packages/db/prisma/tenant/social.prisma` | `social_post` + `social_comment` (thích, nhắn riêng một lần, `private_reply_eligible`); dòng đầu sở hữu TIP-048f |
| C | `packages/db/prisma/tenant/migrations/20261115120000_social_comments/migration.sql` | Bảng social, enum `comment`, cột conversation / message, index partial, CHECK `channel_operation_kind_check` thêm 4 loại |
| M | `packages/db/prisma/tenant/inbox.prisma` | `ConversationKind.comment`; `conversation.post_id`; `message.hidden_at`, `message.external_parent_id`; index comment / post |
| M | `packages/db/test/prisma-stubs.test.ts` | OWNERS `social: '048f'`; tổng file + 1 |
| C | `packages/core/src/inbox/comments/comment-inbound.ts` | Nhận bình luận: khoá thread, upsert bài, khách, tin, sửa / xoá / ẩn, tin của chính Page |
| C | `packages/core/src/inbox/comments/comment-actions.handlers.ts` | Handler `comment.reply` / `comment.private_reply` / `comment.hide` / `comment.unhide` / `comment.delete` / `comment.like` + preview |
| C | `packages/core/src/inbox/comments/private-reply.ts` | Một lần / bình luận, hạn 7 ngày, hội thoại direct, đổi khoá thread theo `recipient_id` khi ACK |
| C | `packages/core/src/inbox/comments/comment-ops.ts` | Tạo lệnh bền `comment_*`, áp kết quả ACK (`hidden_at`, `deleted_at`, thích) |
| C | `packages/core/src/inbox/comments/post-read.ts` | Nạp thẻ bài theo lô cho list / chi tiết hội thoại |
| C | `packages/core/src/inbox/comments/comment-ai-policy.ts` | Hàm thuần: trần `ai_mode` = copilot, chặn agent / nguồn không phải người, năng lực theo kênh ∩ cài đặt tài khoản |
| C | `packages/core/test/comment-policy.test.ts` | Unit khoá thread, hạn 7 ngày, trần AI, năng lực |
| M | `packages/core/src/inbox/services/pipeline.ts` | Rẽ `thread.kind = 'comment'` sang `comment-inbound.ts` (facade 1–2 dòng) |
| M | `packages/core/src/inbox/services/agent-turn.ts` | `rejectAgentOnComment` — agent / task / system gửi ra trên hội thoại bình luận → 403 |
| M | `packages/core/src/inbox/services/outbound.ts` | `OutgoingInput.comment` (`mode`, `targetExternalId`); `message.send` vào hội thoại `comment` → 409 |
| M | `packages/core/src/inbox/services/view.ts` | DTO hội thoại có `post`; DTO tin có `comment` (ẩn, cha, nhắn riêng, thích) |
| M | `packages/core/src/inbox/services/read.service.ts` | Tab `comments` + đếm |
| M | `packages/core/src/inbox/repos/conversations.repo.ts` | Thư mục `comments`, lọc `post_id`, đếm tab |
| M | `packages/core/src/inbox/actions/conversation-state.handlers.ts` | `conversation.set_ai_mode` `auto` trên hội thoại bình luận → 409 (1–2 dòng gọi policy) |
| M | `packages/core/src/inbox/inbox.module.ts` | Đăng ký handler bình luận |
| M | `packages/core/src/channels/operations/types.ts` | `OperationKind` thêm `comment_hide`, `comment_unhide`, `comment_delete`, `comment_like` |
| M | `packages/core/src/channels/operations/provider-event.ts` | Áp ACK lệnh bình luận + sự kiện bình luận đổi phía kênh (facade sang `comment-ops.ts`) |
| M | `packages/core/src/channels/jobs/provider-operations.processor.ts` | Gọi `ops.moderateComment` cho 4 loại lệnh mới |
| M | `packages/core/src/channels/jobs/channels.jobs.module.ts` | Mở worker thao tác cho kênh webhook (không lease) cùng worker gửi |
| M | `packages/channels/src/operations.ts` | `OperationKind` + `ChannelOperations.moderateComment` + `ProviderEvent` `comment_changed` |
| M | `packages/channels/src/meta/webhook.ts` | Phân loại field `feed` (`item = comment`) / IG `comments` → `HookItem.kind = 'comment'` |
| M | `packages/channels/src/facebook/manifest.ts` | `capabilities.comments`, `operations` comment_*, `sync` có `comments` |
| M | `packages/channels/src/facebook/adapter.ts` | `handleWebhook` kind `comment`; `send` theo `mode`; `moderateComment` |
| M | `packages/channels/src/facebook/normalize.ts` | Gọi `facebook/comments.ts` cho `feed` |
| C | `packages/channels/src/facebook/comments.ts` | `feed` → `NormalizedInbound` / `ProviderEvent`; trả lời, nhắn riêng, ẩn, xoá, thích (Graph) |
| M | `packages/channels/src/instagram/manifest.ts` | `capabilities.comments` (không thích), `sync` có `comments` |
| M | `packages/channels/src/instagram/adapter.ts` | `handleWebhook` kind `comment`; `send` theo `mode`; `moderateComment` |
| M | `packages/channels/src/instagram/normalize.ts` | Gọi `instagram/comments.ts` cho `comments` |
| C | `packages/channels/src/instagram/comments.ts` | `comments` → `NormalizedInbound`; `/replies`, nhắn riêng, ẩn, xoá |
| C | `packages/channels/test/meta-comments.test.ts` | Normalize, khoá thread, echo Page, gửi theo `mode`, lệnh ẩn / xoá / thích (transport `fake`) |
| C | `packages/channels/test/fixtures/meta/feed_comment_add.json` | Webhook `feed` `verb add` (gồm trả lời lồng) |
| C | `packages/channels/test/fixtures/meta/feed_comment_edited.json` | Webhook `feed` `verb edited` |
| C | `packages/channels/test/fixtures/meta/feed_comment_remove.json` | Webhook `feed` `verb remove` |
| C | `packages/channels/test/fixtures/meta/feed_comment_page_reply.json` | Bình luận do chính Page viết (echo) |
| C | `packages/channels/test/fixtures/meta/ig_comments.json` | Webhook IG `comments` (bài + reel) |
| C | `packages/actions/src/inbox-comments.ts` | 6 action `comment.*` (module inbox, `agentGrantable: false`) |
| M | `packages/actions/src/index.ts` | Export `inbox-comments` |
| M | `packages/shared/src/api/inbox.ts` | `INBOX_FOLDERS` thêm `comments`; kind `comment`; `post`; khối `comment` của tin |
| M | `packages/shared/src/i18n/server/vi/inbox.ts` | Lỗi `comment_ai_suggest_only`, nhãn xem trước |
| M | `packages/shared/src/i18n/server/en/inbox.ts` | Như trên (en) |
| M | `apps/api/src/http/inbox/conversations.controller.ts` | Tham số `post_id` |
| C | `apps/api/test/integration/inbox-comments.test.ts` | AC1–AC10 (webhook giả + DB thật + EXPLAIN) |
| M | `packages/core/test/assistant-coverage.test.ts` | Action `comment.*` có preview, ô `message_id` có đường tra |
| M | `apps/web/src/features/inbox/types.ts` | Kiểu `post`, `comment`, tab `comments` |
| M | `apps/web/src/features/inbox/components/TopTabs.tsx` | Tab "Bình luận" |
| M | `apps/web/src/features/inbox/components/ChatPanel.tsx` | Gắn `PostCard` đầu luồng (1–2 dòng) |
| M | `apps/web/src/features/inbox/components/Composer.tsx` | Gắn `CommentModeToggle` + `useCommentActions` (facade 1–2 dòng) |
| M | `apps/web/src/features/inbox/components/MessageMenu.tsx` | Rẽ menu bình luận sang `CommentMenu`; bỏ `zalo_personal` cứng ~L62 (đọc capability) |
| M | `apps/web/src/features/inbox/components/MessageBubble.tsx` | Trạng thái ẩn / xoá, chip "Nhắn riêng", dấu thích |
| M | `apps/web/src/features/inbox/components/ConvRow.tsx` | Icon bình luận + dòng tiêu đề bài |
| C | `apps/web/src/features/inbox/components/comments/PostCard.tsx` | Thẻ bài đăng (ảnh, trích nội dung, link, số bình luận) |
| C | `apps/web/src/features/inbox/components/comments/CommentModeToggle.tsx` | Công khai / Nhắn riêng + lý do khoá |
| C | `apps/web/src/features/inbox/components/comments/CommentMenu.tsx` | Trả lời, Nhắn riêng, Thích, Ẩn / Hiện, Xoá (cuối, danger) |
| C | `apps/web/src/features/inbox/components/comments/PostCard.test.tsx` | Thẻ bài + nút theo năng lực / quyền |
| C | `apps/web/src/features/inbox/hooks/useCommentActions.ts` | `useAction('comment.*')`, trạng thái lệnh bền |
| C | `apps/web/src/shared/api/mock/domains/inbox-comments.ts` | Mock action + dữ liệu bình luận (tắt khi `PARITY_FIXTURE`) |
| M | `apps/web/src/shared/api/mock/handlers.ts` | Đăng ký `inboxCommentHandlers` |
| M | `apps/web/src/shared/api/mock/domains/inbox.ts` | Tab `comments` (1–2 dòng gọi `inbox-comments.ts`; file gần trần) |
| M | `apps/web/messages/vi/inbox.json` | `comments.*`, `tabs.comments` |
| M | `apps/web/messages/en/inbox.json` | Như trên (en) |
| M | `apps/web/messages/vi/actions.json` | `actions.comment__*.title` |
| M | `apps/web/messages/en/actions.json` | Như trên (en) |
| M | `tools/parity/parity.manifest.ts` | Mask tab "Bình luận" — PD-904 |
| C | `apps/web/e2e/inbox-comments.spec.ts` | E2E mock: trả lời công khai, nhắn riêng, ẩn, xoá, mobile 390 |
| C | `apps/web/e2e/http/inbox-comments.spec.ts` | E2E http (transport `fake`) |
