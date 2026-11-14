### COMPLETION REPORT — TIP-014b

**STATUS:** PARTIAL — chỉ vì tài nguyên ngoài. Toàn bộ chạy với Zalo giả (`ZALO_TRANSPORT=fake`); **chưa nghiệm thu với provider thật** (AC8 — Q-003, `zalo-live.test.ts` CHỜ-TK). Một PR #87 (`tip/014b-zalo-lifecycle`), xếp chồng trên #86 (TIP-003d) — thứ tự merge #84 → #85 → #86 → #87.

AC đạt 9/10 (AC8 CHỜ-TK). COVERAGE: 10 dòng 014b — BP-11-c, CH-PROVIDER-RECEIPTS, DEF-001-2, Q-014, REQ-B02d, REQ-B11e → ĐẠT; DC-083, DEF-014-1, DEF-016-1 → CHỜ-TK (Zalo thật, Q-003); BP-10-K2 → MỘT PHẦN (cảnh báo rủi ro khi kết nối thuộc 014c). `merge.py` 0 lỗ hổng.

**COMMIT:** ghi ở bảng tiến độ `goals/GOAL-RELEASE.md`. 14 commit từ `6490f622` (pha A) tới commit chốt.

**PHA:**
- **A** (`6490f622`): thu hồi / cảm xúc Zalo là lệnh bền `provider_operation` → hàng đợi tài khoản `chop-<acc>` → nhà cung cấp ACK → tin đổi. Tham chiếu `msgId` + `cliMsgId` kiểm đủ trước khi gọi (`provider-refs.ts`); thiếu / số không an toàn → không gọi kênh. Revision cũ không đè ý định mới; sự kiện từ kênh tới trước ACK thì hội tụ.
- **B** (`d8e8be9c`, `8d81efeb`): gửi bền theo từng phần (`message_part`: đặt chỗ → gọi → xác nhận), phần đã xác nhận không gửi lại; lỗi sau khi gọi → `unknown` (không gửi lại). Biên nhận đã nhận / đã xem đơn điệu theo tài khoản + phần; nhóm chỉ đếm theo bằng chứng. `channel_operation.cancel` huỷ lệnh chưa gọi kênh.
- **B3** (`908cef4f`): tin chứng từ (báo giá / đề nghị / xác nhận đơn / biên nhận / phụ lục / hợp đồng) mang `{fileId, sha256}` trong outbox; `FileFetcher(url, bind)` kiểm byte tải về khớp hash → `attachment_binding_mismatch`. Link Storage hết hạn không làm mất ràng buộc tệp bất biến.
- **C1** (`20dd62e3`): thế hệ phiên (fence) — tạm dừng / ngắt / kết nối lại / tắt worker tăng thế hệ; thế hệ cũ không đặt chỗ / xếp hàng mới; một chủ phiên. Quét route theo trang (platform `20261105120000_channel_route_scan`), `Clock` để test thời gian.
- **C2** (`112f689d`): lịch sử 7 / 30 / 90 ngày bền (`channel_history_run`), có trần trang, không hiệu ứng luồng trực tiếp (chưa đọc / phiếu / AI / preview). Nhà cung cấp hết dữ liệu trước mốc → `provider_limit`. 0 ngày → không lấy.
- **D1** (`e14feefe`): chính sách đồng bộ (`sync_messages`, `sync_auto_create_contact`) áp trước khi ghi, chung cho tin trực tiếp và lịch sử; khớp định danh chỉ-đọc (identity → SĐT duy nhất → ambiguous / none).
- **D2** (`a2eae4cf`): ảnh đại diện khách 1-1 + thành viên nhóm, tải về Storage (link ký, không URL CDN), hàng đợi bền có trần, 7 ngày mới kiểm lại.
- **D3** (`5ea07745`): `channel.sync_contacts` → ảnh chụp danh bạ riêng 24 giờ, đọc theo trang cursor; nhập khách chỉ khi chọn tay qua `contact.import`.
- **E** (`cb429f33`, `7013de0b`, `1199cd6f`) — phạm vi Chủ nhà duyệt 2026-11-05, DC-362: bạn bè Zalo nhận / từ chối (`inbox.reply`), gửi / thu hồi (`inbox.manage`, chỉ định danh đã biết, trần 20 / ngày / tài khoản qua sổ chỉ-thêm `channel_friend_send_log` + advisory lock), tra một SĐT (trần 30 / ngày, kết quả tạm 24 giờ chỉ người tra thấy, có audit). Mọi action `agentGrantable: false` + `humanOnly` (Trợ lý gọi → 403 `human_only`). Khối "Bạn bè Zalo" trong drawer Quản lý kênh (PD-017).
- **Chốt** (`558dbad6` + commit chốt): `conversation.get` trả `status` của tin (unknown / partial) để Trợ lý đọc đúng trạng thái giao; ai:live channel-vertical; E2E; EXPLAIN.

**MIGRATION** (tenant — workspace cũ / demo cần `pnpm --filter @appchat/db db:migrate-tenants`):
`20261102001420_provider_operations` · `20261105110000_send_parts` · `20261105120000_session_generation` · `20261105130000_history_runs` · `20261105140000_channel_avatars` · `20261105150000_contact_sync` · `20261105160000_channel_friends` · `20261105170000_channel_friend_send_log`. Platform: `20261105120000_channel_route_scan`. Build lại api + worker (ROLE=channels chạy `chop-*`, lịch sử, ảnh, danh bạ).

**FILES CHANGED:** theo manifest `tips/manifests/TIP-014b-files.md` (134 path). Lệch:
- **Không tạo, chức năng nằm ở file khác** (tránh module rỗng / trùng):
  - `zalo-personal/provider-receipts.ts` → biên nhận map trong `adapter.ts` + `provider-refs.ts`.
  - `operations/receipt-recovery.ts` → `operations/delivery-receipts.ts` + `jobs/send.processor.ts` (phần treo → unknown).
  - `operations/control-commands.ts` → `operations/session-generation.ts` + `jobs/sessions.ts`.
  - Platform migration `20261102001420_channel_route_scan` → tạo với timestamp thật `20261105120000_channel_route_scan`.
  - `tools/parity/manifests/channel-operations.ts` → không có màn mới; trạng thái nằm trong `inbox:*` / `settings:channels` (PD-015/016/017).
- **Test đặt ở chỗ khác** (cần DB / Redis / worker thật nên nằm trong integration api — harness `startApi` + `ChannelsModule` trong cùng tiến trình):
  - core `channel-session-fence.test.ts` + worker `channel-shutdown.test.ts` → `apps/api/test/integration/channel-session-fence.test.ts`.
  - core `channel-history-policy.test.ts` + worker `channel-history-side-effects.test.ts` → `apps/api/test/integration/channel-history.test.ts` + `channel-sync-policy.test.ts`.
  - core `actions/channel-operation-cancel.matrix.test.ts` / `channel-sync-contacts.matrix.test.ts` → `apps/api/test/integration/actions/channel_operation.cancel.action.test.ts` / `channel.sync_contacts.action.test.ts` (đúng chỗ ma trận §12 hiện hành).
  - api `channel-operations.test.ts` + worker `channel-delivery.test.ts` → `apps/api/test/integration/channel-delivery.test.ts` + `actions/message.react.action.test.ts`.
- **Chưa viết:** `packages/channels/test/zalo-live.test.ts` — CHỜ-TK (Q-003, cần Chủ nhà quét QR tài khoản test).
- **M không cần sửa:** `registry.ts`, `services/control.ts`, `read.service.ts`, `core/index.ts`, `shared/api/channels.ts`, `shared/index.ts`, `worker/roles/channels.module.ts`, `features/{inbox,settings}/api.ts`, `mock/domains/settings.ts`, `http-transport.ts`, `parity.manifest.ts`, i18n server `channels.ts` / `inbox.ts`, `contract.test.ts`, `routing.prisma`, manifest webchat / email, `contract-send.handlers.ts`, `document-link.ts`, `appendix/send.handlers.ts` (ràng buộc tệp đi qua `quote-send.ts` `bindFiles` + `public.handlers.ts` / `public-sign.service.ts`).
- **Thêm ngoài manifest:** `provider-friends.ts`, `operations/{friend-store,avatar-store,avatar-read}.ts`, `actions/friend.handlers.ts`, `packages/actions/src/channel-friends.ts`, FE `FriendsPanel` + `useChannelFriends` + mock `channel-friends.ts` (pha E — DC-362); `fixtures/ai-eval/channel-seed.mjs`, `tools/ai-live/src/channel-judge.ts` (AC9).

**TEST RESULTS** (đầu cổng chốt đã chạy `db:test-reset`):
- Acceptance criteria: 9/10 (AC8 CHỜ-TK)
  1. **AC1** — năng lực + map SDK; không hỗ trợ / không quyền → trả trước khi đổi dữ liệu; core không import SDK. `packages/channels/test/zalo-operations.test.ts`, `zalo-profiles.test.ts`, `zalo-friends.test.ts`, `zalo-adapter.test.ts`. **pass**
  2. **AC2** — thu hồi ACK một lần, hết giờ → unknown + nội dung giữ; thiếu cliMsgId không gọi; self-event trước / sau ACK ghép đúng phần; revision cũ không đè; scope / tài khoản khác bị chặn. `packages/core/test/channel-operations.test.ts` (10), `actions/message.react.action.test.ts`, `channel_operation.cancel.action.test.ts`. **pass**
  3. **AC3** — chia phần + tệp; sập sau ACK phần 1 → chạy lại không gửi phần đã xác nhận; ràng buộc tệp bất biến. `packages/core/test/channel-delivery-recovery.test.ts` (9), `packages/channels/test/zalo-receipts.test.ts` (6), `apps/api/test/integration/channel-delivery.test.ts` (8), `commerce-delivery.test.ts` (7, outbox mang `fileId` + `sha256`), `packages/core/test/channel-file-fetch.test.ts`. **pass**
  4. **AC4** — hai worker / lease / tạm dừng / tắt: thế hệ cũ không đặt chỗ mới; một chủ. `apps/api/test/integration/channel-session-fence.test.ts` (5). Người-trước-đặt-chỗ chặn AI gửi giữ nguyên 045b (`send-fence`). **pass**
  5. **AC5** — lịch sử 7 / 30 / 90 có giới hạn, không trùng / chưa đọc / AI / preview; hết dữ liệu → `provider_limit`; lưu lỗi ném ra; 0 không lấy. `packages/channels/test/zalo-history.test.ts` (5), `apps/api/test/integration/channel-history.test.ts`, `actions/channel.sync_history.action.test.ts`. **pass**
  6. **AC6** — 4 tổ hợp cờ đồng bộ × định danh đã biết / lạ / ambiguous / nhóm; lịch sử cùng chính sách; danh bạ theo trang + resume, thiếu SĐT không tạo khách, nhập tay qua CRM; biên nhận lặp / lệch thứ tự / ref lạ không hạ trạng thái. `channel-sync-policy.test.ts` (5), `channel-contact-sync.test.ts` (6), `packages/core/test/channel-contacts-sync.test.ts`, `channel-sync-identity.test.ts`. Fixture danh bạ: 450 người / trang 200 = 3 trang nhà cung cấp, trần trang → partial (cùng cơ chế với 2.500 / 13 trang). **pass**
  7. **AC7** — UI mock + http: đang gửi / unknown / partial / đã thu hồi / cảm xúc; không thành công trước ACK. `apps/web/src/features/inbox/components/MessageProviderStatus.test.tsx`, `mock/channel-operations-shape.test.ts`, E2E `e2e/channel-operations.spec.ts` (mock) + `e2e/http/channel-operations.spec.ts` (http, worker channels thật + Zalo giả), `e2e/settings-channel-friends.spec.ts`. **pass**
  8. **AC8** — Zalo thật opt-in: **CHỜ-TK** — chưa nghiệm thu với provider thật (Q-003).
  9. **AC9** — 5 ca model thật (9router `claude-haiku-4-5`): `fixtures/ai-eval/channel-vertical.json` — **5/5, 0 vi phạm an toàn** (`reports/ai-live-channel-vertical-2026-11-05.md`). Cổng chấm an toàn (không khẳng định đã tới khi unknown, không gửi lại không qua thẻ, không lộ tổng báo giá ngoài scope, không bịa đã gửi qua kênh hết phiên); 3 ca có ghi chú chất lượng `quality:` (model hỏi lại thay vì đọc) — ngưỡng đầy đủ ở 044. **pass**
  10. **AC10** — EXPLAIN index bằng-trước-mốc-sau: `tenant_channel_route_scan_idx`, `channel_friend_incoming_idx`, `channel_friend_send_log_account_idx`, `channel_user_lookup_account_idx` (`channel-session-fence.test.ts`, `channel-friends.test.ts`); unique phần tin; trần lô hàng đợi / trang khẳng định trong test. Không chạy fixture 100k (dùng `SET LOCAL enable_seqscan = off` để kiểm planner chọn index). **pass**
- Lệnh đã chạy (cổng chốt, sau `db:test-reset`):
  - `turbo lint typecheck test` 7 package — 21/21 task: unit core 504 · web 299 · channels 79 · ai-live 59 · api 11 · worker 7 · actions 6.
  - Integration 20 file api TIP đụng tới (channels / inbox / commerce-delivery / ma trận action) — **113 passed**.
  - E2E mock `inbox` + `channel-operations` + `settings-channel-friends` — 13 passed (11 skip mobile theo spec); E2E http `channel-operations` — passed (worker channels thật + Zalo giả).
  - Parity: `inbox:default` 4,70% (PAID, sổ nợ), `settings:channels` 4,19%; `parity --done` 102 PASS, `inbox:connect-channel` 6,20% ≤ trần 6,5% (DC-360).
  - Build api + worker xanh; `depcheck` 0 lỗi mới; lint:size / lint:tokens / i18n:check (5.394 key, 100%) sạch. Không đổi package.json → không cần `check:bundle`.

**ISSUES DISCOVERED:**
- Trần gửi lời mời đếm theo dòng `channel_friend` bị thu hồi xoá mất → đổi sang sổ chỉ-thêm `channel_friend_send_log` (migration riêng, không sửa migration đã áp).
- Tài khoản đã ngắt bị ẩn khỏi Trợ lý → ca "mất kết nối" của AC9 dùng tài khoản hết phiên (Zalo giả đá phiên qua `ZALO_FAKE_KICK_TEXT`).
- `member.invite` gói trial 402 → seed ai-live mua gói team qua webhook ngân hàng giả.
- E2E http bắt 2 lỗi thật: (1) tin chào của Zalo giả thiếu `cliMsgId` + id không phải số → cảm xúc dừng `pending_ref` (đúng hành vi an toàn, sai fixture) — tin chào nay mang id số ổn định + `cliMsgId` như tin vào thật; (2) **tin gửi đi không có nút menu** (`MessageMenu` chỉ gắn ở bong bóng tin vào) → không thu hồi được tin của mình từ UI — gắn menu cho bong bóng tin ra (prototype "Thu hồi · Chỉ tin của bạn").

**ĐỐI CHIẾU STANDARDS** (mục APPLICABLE STANDARDS của TIP):

| Standard | Tuân thủ (file / test) | Lệch |
|---|---|---|
| `channels/omnichannel-adapter.md` | `operations` / `friends` / ràng buộc tệp ghi vào standard; core không import SDK; năng lực theo `provider-capabilities.md`, không bật vì SDK có hàm (`zalo-operations.test.ts`) | — |
| `integrations/provider-ports.md` | Zalo giả / thật qua `ZALO_TRANSPORT`; lỗi nhà cung cấp phân loại chắc chắn / chưa rõ (`ChannelOperationError`, `PartialSendError`) | — |
| `events/outbox.md` | Gửi qua outbox `dispatch_reserved` → `unknown` / `dead`, không quét lại tin unknown; ràng buộc tệp trong payload (`channel-delivery-recovery.test.ts`) | — |
| `actions/action-registry.md` | `channel.friend.*`, `channel.lookup_user`, `channel.sync_contacts`, `channel_operation.cancel` — zod, risk, preview, `agentGrantable:false`; ma trận §12 mỗi action | — |
| `authz/rbac-permissions.md` | `inbox.reply` / `inbox.manage` / `channels.manage` theo DC-362; scope hội thoại kiểm ở mọi lệnh; `humanOnly` | — |
| `database/tenant-db.md` + `indexing.md` | Bảng tenant không `workspace_id`; index `=` trước mốc sau + EXPLAIN; trang danh bạ đọc keyset `(sync_id, seq)` cột hẹp (không cần deferred join — không OFFSET, không cột rộng) | — |
| `domain/concurrency` / `money-time-numbering` | Advisory lock trần ngày; CAS revision; fence thế hệ; `Clock` tiêm cho thời gian | — |
| `ops/observability-security.md` | Không log SĐT (`REDACT_KEYS` có `phone`), không dump QR / cookie; mỗi lần tra SĐT lưu `channel_user_lookup` (người tra, tài khoản, hạn 24 giờ) + outbox `channel.lookup_requested` | — |
| `api/response-envelope.md` | 202 `job_accepted` cho lệnh bền; 429 / 409 / 422 / 403 envelope chuẩn | — |
| `ui/interaction-patterns` / `frontend-structure` / `prototype-parity` | Trạng thái dưới bong bóng (PD-015), avatar (PD-016), khối Bạn bè (PD-017); file FE ≤ 400 dòng; token | PD-015/016/017 |
| `i18n/i18n.md` | `inbox.*` / `settings.channels.drawer.friends.*` vi + en; i18n:check 100% | — |
| `code/testing.md` + file-size | Test ở file riêng; backend ≤ 600 dòng | Manifest test chuyển chỗ (mục FILES CHANGED) |
| `workflow/git-flow-ci.md` | Nhánh `tip/014b-zalo-lifecycle`, PR #87 vào `dev`, xếp chồng #86 | — |

**GIẢ ĐỊNH ĐÃ CHỌN:** Q-049 (Trợ lý đọc lời mời kết bạn) — đề xuất chưa mở, làm theo đề xuất. Phạm vi bạn bè / tra SĐT theo DC-362 (Chủ nhà duyệt).

**Lệch spec:** không thêm thư viện; không nâng `zca-js` (giữ 2.2.0).
