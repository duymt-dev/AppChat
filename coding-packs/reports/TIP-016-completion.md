### COMPLETION REPORT — TIP-016

**STATUS:** DONE (chưa nghiệm thu với Zalo thật — Q-003)
**COMMIT:** `52018c2` (code) + `caf265e` (sửa job đăng nhập QR của workspace đã xoá) trên nhánh `tip/016-inbox-backend` (xếp chồng trên `tip/014-channels-zalo`) — SHA cuối ở bảng tiến độ `goals/GOAL-BACKEND.md`

**FILES CHANGED:**
- Created:
  - Schema: migration `tenant/migrations/20261031200000_016_inbox` (7 bảng + index viết tay + 8 FK nội DB).
  - Shared: `src/api/inbox.ts` (schema đọc Hộp thư + Cài đặt thẻ / câu trả lời mẫu, `TAG_PALETTE`, `CONV_TAG_TONE_OF`), `i18n/server/{vi,en}/inbox.ts`.
  - Core: `inbox/public.ts`, `repos/conversations.repo.ts` (keyset + thư mục + đếm), `services/{access.ts (scope inbox), view.ts, pipeline.ts, outbound.ts, read.service.ts, meta.service.ts, owner-move.ts}`, `actions/{kit.ts, conversation-state.handlers.ts, conversation-assign.handlers.ts, message.handlers.ts, settings.handlers.ts}`, `events/inbox.rules.ts`, `jobs/inbound.processor.ts`, `notify/events/domain.rules.ts`.
  - API: `apps/api/src/http/inbox/{conversations.controller.ts, inbox-meta.controller.ts}`.
  - Test: `apps/api/test/integration/inbox.test.ts` (14), `apps/web/src/shared/api/mock/inbox-shape.test.ts` (2), `apps/web/e2e/http/inbox.spec.ts`.
  - TIP: `coding-packs/tips/TIP-016-inbox-backend.md`.
- Modified: `packages/db/prisma/tenant/inbox.prisma`; `packages/shared/src/{events.ts (message.received / sent / failed / updated, conversation.assigned / updated), api/index.ts, i18n/server/index.ts}`; `packages/actions/src/inbox.ts` (+ `conversation.bulk_update` — Blueprint §3.4); `packages/core/src/{index.ts, inbox/inbox.module.ts, inbox/jobs/inbox.jobs.module.ts, crm/actions/contact-owner.handlers.ts (chuyển kèm hội thoại — DC-082), notify/jobs/notify.jobs.module.ts (DC-084), channels/channels.env.ts + channel registry (ZALO_FAKE_GREETING), channels/jobs/login.processor.ts}`; `packages/channels/src/zalo-personal/fake-transport.ts` (tin chào giả); `apps/api/src/{app.module.ts, http/inbox/inbox.http.module.ts}`; `apps/api/test/integration/{setup.ts, actions.test.ts, authz.test.ts, realtime.test.ts}` (DC-085); `apps/web/src/shared/api/mock/domains/inbox.ts` (+ `/messages/search`, `/tags`); `apps/web/messages/{vi,en}/actions.json` (bulk_update); `tools/contract/src/cases.ts` (+ `tag.create`, `canned_reply.create`); `tools/scripts/e2e-http.mjs` (tin chào giả); `coding-packs/{DECISIONS.md, QUESTIONS.md}`.

**TEST RESULTS:**
- Acceptance criteria: 12/12 pass
  1. Migration 016: 7 bảng, index viết tay (`conversation_status_recent_idx` INCLUDE, `conversation_live_recent_idx` partial, `conversation_ai_attention_idx` partial, trigram hội thoại + tin, `outbox_message_pending_idx`), 8 FK nội DB; EXPLAIN danh sách / "của tôi" / tin dùng Index Scan, không Seq Scan — **pass**
  2. Tin vào → khách nháp (nguồn kênh) + identity + hội thoại + tin; trùng msgId không thêm; khách có người phụ trách → gán người đó + thông báo `msg_assigned`; nhóm → participant, không tạo khách; đóng + ẩn → tin mới mở lại; outbox `message.received`; thống kê `convs` ngày — **pass**
  3. `message.send` → queued + outbox → worker giả gửi → `sent` + `external_msg_id`, outbox `sent`, event `message.sent`; Idempotency-Key lặp → một tin; trích tin có `reply_to`; FRT vào thống kê; tài khoản tạm dừng → 409 `INVALID_STATE { channel: paused }` — **pass**
  4. Sales B không thấy hội thoại của A (list / 404 / action 403 `SCOPE_FORBIDDEN`); đồng phụ trách khách → thấy; kế toán 403 — **pass**
  5. mark_read · set_status (snoozed cần `snooze_hours`, undo) · assign (thành viên lạ 422, undo) · set_tags / tag (thẻ mới theo tên, thư mục `vip`) · pin · set_ai_mode · handoff (gán mình) · archive (thư mục `archived`, undo) · clear_history (undo) · bulk_update (preview đếm → chạy → undo) — **pass**
  6. recall (tin khách 403, tin mình 200) · delete (+ undo) · react (bấm lại bỏ) · pin tin · forward · note.add (không vào outbox gửi) — **pass**
  7. `/conversations` (thư mục / kênh / `q` không dấu theo tên khách / cursor / folder sai 400), `/counts`, `/:id`, `/messages`, `/messages/search` (không dấu, `ranges`, lọc người gửi) khớp schema — **pass**
  8. `tag.*` (trùng không dấu 409, xoá + undo trả cả liên kết) · `canned_reply.*` (trùng phím tắt 409) · `/settings/tags` (đếm), `/settings/replies`, `/canned-replies`, `/tags`, `/inbox/accounts`, `/inbox/connect-channels`, `/groups/:id` — **pass**
  9. Realtime: `message.received` → `message.new` phòng `conv:{id}` + `conversation.updated` phòng workspace kèm scope; guard `conv.join` thật — **pass**
  10. `contact.transfer_owner` chuyển kèm hội thoại (`moved.conversations = 1`), undo trả người cũ; quét outbox: pending bị sót → đẩy lại → sent — **pass**
  11. Mock FE parse cùng schema (2 ca); contract mock + HTTP xanh; E2E http Hộp thư (kết nối Zalo giả → tin chào vào → mở → trả lời, tải lại vẫn còn → gắn thẻ mới → lưu trữ) — **pass**; E2E mock `inbox` / `settings` xanh trong full hồi quy — **pass**
  12. Cổng D59 — **pass** (dưới)
- **Cổng "trước commit":** `pnpm turbo run lint typecheck test` (package đổi) 27/27 task; `pnpm depcheck` xanh; `lint:size` 1199 file; `i18n:check` 100% (4483 key).
- **Cổng "chốt TIP":** `pnpm lint` / `typecheck` / `test` 13/13 task · `pnpm build` 3/3 · `api test:integration` **150 passed** (17 file) · `db test:integration` 7 passed · core unit 77 passed · smoke bản build: `/v1/health` 200, route Hộp thư không token 401, 0 log error; worker `ROLE=channels` (fake) + `ROLE=jobs` 0 log error (lần đầu 1 lỗi: job đăng nhập QR của workspace test đã xoá → sửa `caf265e`) · **E2E http 12 passed · 6 skipped** · full E2E hồi quy mock → **222 passed · 0 failed · 196 skipped** (3.6m). Parity: N/A — bố cục không đổi.

**INDEX / EXPLAIN:**
- Danh sách `all`: `conversation_live_recent_idx (last_message_at DESC, id DESC) WHERE archived_at IS NULL AND hidden_at IS NULL` — Index Scan, keyset (không OFFSET); bước 2 nạp theo PK (deferred join).
- "Của tôi": `conversation (assignee_user_id, status, last_message_at DESC)` / `conversation_status_recent_idx (status, last_message_at DESC) INCLUDE (contact_id, unread_count, ai_mode)` — Index Scan (bảng nhỏ planner chọn một trong hai).
- Tin: `message (conversation_id, created_at DESC, id DESC)` — Index Scan; tìm trong hội thoại `gin (f_unaccent(lower(body)) gin_trgm_ops)` + lọc `conversation_id`.
- Outbox gửi: partial `(next_attempt_at) WHERE status IN ('pending','sending')`.

**ISSUES DISCOVERED:**
- Luật thông báo / realtime của domain chỉ đăng ký khi tiến trình nạp module domain → ROLE=jobs thiếu luật `channel_down` (TIP-014) và luật Hộp thư → nạp tường minh trong NotifyJobsModule (DC-084).
- Test executor TIP-003 dùng handler giả `tag.*` → trùng handler thật → đổi sang `doc_template.*` (DC-085).
- Giờ tin vào là giờ phía kênh (có thể lệch đồng hồ máy chủ) → mốc "xoá lịch sử" lấy max(giờ máy chủ, tin mới nhất).
- Job đăng nhập QR còn trong hàng đợi của workspace đã xoá làm worker log lỗi → bỏ qua.

**GIẢ ĐỊNH ĐÃ CHỌN:** DC-077 … DC-085. **Câu hỏi mới:** Q-014 (thu hồi / cảm xúc phía Zalo).

**DEVIATIONS FROM SPEC:** không có (`conversation.bulk_update` có trong Blueprint §3.4, chưa khai ở `packages/actions` — thêm theo spec).

**Chưa nghiệm thu với provider thật:** Zalo cá nhân (tin vào / gửi thật qua Hộp thư) — chờ tài khoản phụ (Q-003).

**SUGGESTIONS FOR CHỦ THẦU:**
- TIP-017 / 018: adapter webchat / email chỉ cần đẩy `NormalizedInbound` vào `channel-inbound` (pipeline dùng chung) + gửi theo `OutboundMessage`.
- TIP-022: `message.received` (payload có `is_group`, `mentions_me`, `vip`) là đầu vào agent; `ai_state` / `handoff_reason` do AI đổi; `suggestion` của thread trả từ run copilot.
- TIP-025: FE chuyển sang `httpTransport` cho Hộp thư — gửi `folder` thay lọc tab ở client, đọc `/messages/search` thay lọc ở client.

## Supplemental routing plan (2026-11-02)

[ TIP-042b ](../tips/TIP-042b-lead-routing.md) owns the missing first-owner lead-routing runtime and UI, with opt-in migration, no-steal/CAS and durable event-to-ActionExecutor processing. Assignment settings stored today are not proof of runtime allocation. See [routing audit](routing-planning-audit-2026-11-02.md). SLA selection is not closed by this supplemental TIP.

## Supplemental record-scope audit (2026-11-02)

See [TIP-042c](../tips/TIP-042c-record-scope.md) and [scope audit](scope-planning-audit-2026-11-02.md): read/write separation for watcher grants, list/detail parity for scope none, and team_id propagation need verification/correction. Q-029 gates multi-team semantics. Existing CRM tests do not prove all business-document paths; no implementation completion is implied by this plan.

## Supplemental Zalo lifecycle plan (2026-11-02)

[TIP014b](../tips/TIP-014b-zalo-lifecycle.md) owns missing provider operation/receipt/history/contact-sync contracts and real lifecycle evidence, plus standard/type reconciliation. Existing completion status is not live-provider proof. No source or native data/service changes in this planning phase.


## Supplemental planning2026-11-02 ? TIP025b (not runtime DONE)

See ../tips/TIP-025b-inbox-vertical.md for group/search/bulk/source-context/global contact edit/timeline CSV/scheduling/translation/capture/approval integration and exact manifests. Original completion status does not prove these missing controls.025b preserves existing domain permissions/commerce;026b still must own CRM deal/task/contact-note domain gaps. Independent review/validation tracked in inbox-vertical-planning-audit-2026-11-02.md.

## Bổ sung015f planning — 2026-11-02

[TIP015f](../tips/TIP-015f-contact-lifecycle.md) owns contact delete/restore dependencies, retained identity after inbound, current deleted projection/AI fence, safe create/import inverse and blocked new externalorders. Historical settlement remains separate from newbusiness; no code/provider/runtime completion implied. Merge015e andprivacy015c still missing.
