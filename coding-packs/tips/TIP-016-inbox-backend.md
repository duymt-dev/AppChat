# TIP-016: Inbox backend — hội thoại, tin nhắn, inbound pipeline, gửi qua outbox, thư mục / đếm, thẻ + câu trả lời mẫu

## HEADER
- TIP-ID: TIP-016
- Project: AppChat V2
- Module: `packages/db/prisma/tenant/inbox.prisma` · `packages/core/src/inbox/**` · `apps/api/src/http/inbox` · `packages/shared/src/api/inbox.ts`
- Depends on: TIP-014 (channel_account, `channel-inbound`, `ChannelSendQueue` + `registerSendResultSink`), TIP-015 (contact, tag, `ContactIdentityService`, collaborator) — nhánh xếp chồng từ `tip/014-channels-zalo`
- Priority: P0 · REQ: C01–C04, C06, C08, C09, C10, C12, C13
- Estimated effort: 18 giờ
- **Files touched:**
  - Schema: `tenant/inbox.prisma` (7 bảng) + migration tenant `<ts>_016_inbox` (partial / covering / trigram index viết tay, FK nội DB).
  - Shared: `src/api/inbox.ts` (schema đọc), `src/events.ts` (`message.received|sent|failed`, `conversation.assigned`), `i18n/server/{vi,en}/inbox.ts`.
  - Actions: `packages/actions/src/inbox.ts` (+ `conversation.bulk_update` theo Blueprint §3.4).
  - Core: `inbox/{inbox.module.ts, public.ts}`, `inbox/repos/*`, `inbox/services/*` (scope, view, read, send, pipeline, tags, replies), `inbox/actions/*.handlers.ts`, `inbox/events/inbox.rules.ts`, `inbox/jobs/{inbox.jobs.module.ts, inbound.processor.ts, send-results.ts, outbox-sweep.ts}`.
  - Channels: `FakeZaloTransport` thêm tin chào giả (`ZALO_FAKE_GREETING`, chỉ fake) cho E2E http.
  - API: `apps/api/src/http/inbox/{conversations.controller.ts, inbox-meta.controller.ts, inbox-settings.controller.ts}`, `inbox.http.module.ts`.
  - Web: FE chỉ chỉnh shape cho khớp (không đổi giao diện); mock thêm route `/conversations/:id/messages/search`, `/tags`.
  - Test: `apps/api/test/integration/inbox*.test.ts`, `apps/web/src/shared/api/mock/inbox-shape.test.ts`, contract cases, `apps/web/e2e/http/inbox.spec.ts`; test executor (TIP-003) đổi handler giả sang action chưa cài (`doc_template.*`, TIP-028).

## CONTEXT
- Blueprint §2.2 inbox (L316–326), §2.3 event `message.*` / `conversation.handoff`, §3.4 inbox + settings (tag, canned_reply), §4.4 đọc inbox (L959, L979), §4.6 WS (`message.new`, `message.updated`, `conversation.updated`, `conv.join`), §6 Inbound pipeline (L1176).
- COMMERCE §8 (L180): khách có người phụ trách → hội thoại tự gán cho người đó; vắng / ngoài ca → hàng chung hoặc agent theo cấu hình kênh.
- rbac-permissions §5: scope `inbox` own = được gán cho mình + khách mình phụ trách + khách mình là collaborator / watcher.
- omnichannel-adapter §6 + events/outbox §7: gửi luôn qua `outbox_message` → hàng đợi gửi của tài khoản, không gửi đồng bộ.
- FE (đọc): `/conversations?channel=`, `/conversations/counts`, `/conversations/:id`, `/conversations/:id/messages`, `/inbox/accounts`, `/inbox/channels`, `/inbox/connect-channels`, `/groups/:id`, `/canned-replies`, `/settings/tags`, `/settings/replies`.

## TASK
1. **Schema** `inbox.prisma` theo Blueprint + cột phục vụ action đã có: `conversation.cleared_at` (xoá lịch sử chỉ trong AppChat), `frt_pending_since` (FRT), `message.recalled_at`. `tag` dùng chung bảng `tag` của crm (nguồn thẻ dùng chung — Blueprint L336).
2. **Index** (indexing §1–7): unique `(channel_account_id, external_thread_id)`; `(status, last_message_at DESC) INCLUDE (contact_id, unread_count, ai_mode)`; `(assignee_user_id, status, last_message_at DESC)`; partial `ai_state IN (waiting_approval, handoff)`; partial danh sách đang hiện `(last_message_at DESC, id DESC) WHERE archived_at IS NULL AND hidden_at IS NULL`; `(contact_id)`; message unique `(channel_account_id, external_msg_id)`, `(conversation_id, created_at DESC, id DESC)`, GIN `f_unaccent(lower(body)) gin_trgm_ops`; `outbox_message(status, next_attempt_at)`; `conversation_tag(tag_id)`; unique `canned_reply.shortcut`.
3. **Inbound pipeline** (processor queue `channel-inbound`, ROLE=channels): một transaction tenant — insert `message` `ON CONFLICT DO NOTHING` (trùng → dừng) → resolve khách (1-1: `ContactIdentityService`; nhóm: participant) → upsert hội thoại (mới: tự gán người phụ trách khách, chế độ AI + agent theo cấu hình tài khoản; đang đóng / tạm ẩn / ẩn → mở lại) → đếm chưa đọc, preview, thống kê ngày → outbox `message.received` (+ `conversation.assigned`, `contact.created`).
4. **Gửi** (`message.send` / `forward`): ghi `message` (queued) + `outbox_message` (pending) cùng transaction → sau commit đẩy `ChannelSendQueue` (ref = outbox id); sink kết quả (ROLE=channels) ghi `sent` + `external_msg_id` / `failed`, outbox `message.sent|failed`; quét lại outbox pending bị sót mỗi 30 giây.
5. **Ghi (handler)** mọi action `conversation.*`, `message.*`, `note.add`, `tag.*`, `canned_reply.*`, `conversation.bulk_update`; scope inbox; undo theo khai báo.
6. **Đọc** đúng shape FE + `GET /conversations?folder=&channel=&channel_account_id=&tag_id=&q=&cursor=` (keyset), `/conversations/:id/messages?cursor=` (mới → cũ theo trang), `/conversations/:id/messages/search?q=&sender=` (không dấu), `/tags`.
7. **Realtime + thông báo:** `message.new` / `message.updated` / `conversation.updated` theo scope; thông báo `msg_assigned`, `msg_vip`; `registerConversationGuard` (phòng `conv:{id}`).
8. **Chuyển phụ trách khách** (`contact.owner_changed` có `move.conversations`) → gán lại hội thoại đang mở.

## SPECIFICATIONS
- Thư mục (`folder`): `all` (không lưu trữ / ẩn / đóng / đang tạm ẩn) · `mine` (gán cho tôi) · `unread` · `ai_running` · `ai_pending_approval` · `needs_human` (`ai_state = handoff`) · `archived` · `closed`. `/counts` theo shape FE (`tabs`, `mailbox`, `ai`, `channels`, `saved`, `synced`).
- Cảm xúc / thu hồi ghi trong AppChat; gọi API kênh tương ứng là việc sau (Q mới) — cảm xúc chỉ cho kênh có `capabilities.reactions`.
- `suggestion` của thread = `null` tới TIP-022; `ai_state` chỉ do AI (TIP-022) đổi, trừ `handoff` (người tiếp nhận).

## ACCEPTANCE CRITERIA
1. Migration 016: 7 bảng, index viết tay, FK nội DB (message → conversation cascade, reaction / tag → message / conversation); `EXPLAIN` danh sách `all` + `mine` dùng index (không Seq Scan khi đủ dữ liệu).
2. Inbound: tin mới → khách nháp + identity + hội thoại + tin; cùng `msgId` lần 2 → không thêm gì; khách có người phụ trách → hội thoại gán người đó + thông báo `msg_assigned`; hội thoại đang `closed` / ẩn / tạm ẩn → mở lại; tin nhóm → hội thoại `group` + participant, không tạo khách; outbox `message.received`; thống kê `convs` ngày tăng.
3. `message.send` → tin `queued` + `outbox_message` → worker giả gửi (rich text) → `sent` + `external_msg_id`; `Idempotency-Key` lặp → một tin; tài khoản tạm dừng / ngắt → 409; gửi lỗi cuối → `failed`; trả lời trích tin (`reply_to_id`) mang `reply_to`; FRT ghi vào thống kê ngày.
4. Role-isolation: sales A không thấy / thao tác hội thoại gán cho B (list không có, `/conversations/:id` 404, action → 403 `SCOPE_FORBIDDEN`); khách A phụ trách / đồng phụ trách → A thấy; kế toán → 403.
5. `conversation.mark_read|set_status (snoozed bắt buộc snooze_hours)|assign (user xor agent)|tag|set_tags|pin|archive|hide|set_ai_mode|handoff|clear_history` + undo theo khai báo; `bulk_update` (≤ 100, thẻ / gán / trạng thái / lưu trữ) + undo.
6. `message.recall` (chỉ tin của mình) · `delete` (+ undo) · `react` (bấm lại bỏ; kênh không hỗ trợ → 409) · `pin` · `forward` (sang hội thoại trong scope, `forwarded`) · `note.add` (không gửi kênh).
7. `/conversations` khớp `conversationsPageSchema` (lọc folder / kênh / tài khoản / thẻ / `q` không dấu, cursor); `/counts`, `/conversations/:id`, `/messages` (cursor, tin đã xoá / thu hồi đánh dấu, `reaction` của tôi), `/messages/search` (không dấu + lọc người gửi), `/inbox/accounts|channels|connect-channels`, `/groups/:id`, `/canned-replies`, `/tags` khớp schema.
8. `tag.create|update|delete` (trùng tên không dấu → 409, xoá + undo) → `/settings/tags` (đếm khách + hội thoại); `canned_reply.*` (trùng phím tắt → 409) → `/settings/replies` + `/canned-replies` (nhóm theo danh mục).
9. Realtime: `message.received` → WS `message.new` tới phòng hội thoại + người trong scope; guard `conv.join` từ chối người ngoài scope.
10. `contact.transfer_owner` có chuyển hội thoại → hội thoại đang mở của khách gán sang người mới.
11. Mock FE parse cùng schema; contract inbox xanh mock + HTTP; E2E http Hộp thư (kết nối Zalo giả → tin chào vào → mở hội thoại → gửi trả lời → tin hiện, thẻ, lưu trữ) xanh; E2E mock `inbox` / `settings` xanh.
12. Cổng D59 xanh (+ smoke bản build).

## CONSTRAINTS
- Không đổi input / output action đã có; chỉ thêm `conversation.bulk_update` (Blueprint §3.4).
- Không rẽ nhánh theo loại kênh trong core (omnichannel-adapter §6) — gửi qua `OutboundMessage`, render ở adapter.
- AI trả lời / copilot / handoff tự động (TIP-022), Inbox UI realtime (TIP-025), webchat / email adapter (TIP-017 / 018) ngoài phạm vi.

## ⚠️ BUILDER-CHECKLIST
- [ ] Đúng `Files touched` · 12 AC có test thật · file ≤ 400 dòng (backend ≤ 600) · test file riêng
- [ ] Cổng D59 (khi làm · trước commit · chốt TIP) có output · EXPLAIN list trong Completion Report
