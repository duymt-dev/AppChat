### COMPLETION REPORT — TIP-025b (pha 1–4 — hàng loạt Hộp thư + alias "bỏ" + đếm theo bộ lọc; tìm có trang + cửa sổ quanh tin; quản lý nhóm Zalo; ngữ cảnh CRM + xuất lịch sử)

**STATUS:** pha 1, 2 DONE (TIP chưa DONE). Chia 6 pha theo DC-377, mỗi pha một PR xếp chồng: **P1** §C + §B.4 (PR này) → P2 §B.1–3 tìm / cửa sổ quanh tin → P3 §A nhóm → P4 §D ngữ cảnh CRM / commerce + xuất timeline → P5 §E slot + §F dịch / chụp màn hình → P6 §G thẻ duyệt + AC10 ai:live.

**COMMIT:** nhánh `tip/025b-inbox-vertical`, xếp chồng trên `tip/041-workspace-lifecycle-p3` (#108). SHA ở bảng tiến độ `goals/GOAL-RELEASE.md`.

**MIGRATION:** không có. Sau merge: build lại api + worker (ROLE=jobs nạp `InboxUiJobsModule`, kind `conversation.bulk_update`).

---

## Pha 1 — thay đổi

**FILES CHANGED** (lệch manifest ghi ở DV-045)
- actions:
  - `inbox-aliases.ts`: `conversation.unhide`, `conversation.untag`, `message.unpin`, `message.unreact`;
  - `inbox.ts`: output `conversation.bulk_update` thêm `failed` + `items`, vẫn giữ `updated`;
  - `index.ts`.
- core `inbox/`:
  - `services/conversation-mutations.ts`: helper miền dùng chung (`setHidden`, `removeTag`, `unpinMessage`, `applyBulkChange`);
  - `actions/alias.handlers.ts`;
  - `actions/bulk-update.handler.ts`: tách khỏi `conversation-assign.handlers.ts`;
  - `bulk/bulk-undo.ts`;
  - `jobs/inbox-bulk.processor.ts`, `jobs/inbox-ui.jobs.module.ts`;
  - `repos/conversations.repo.ts`: `filterParts`; `folderCounts` nhận bộ lọc;
  - `services/read.service.ts`, `inbox.module.ts`, `index.ts`.
- api: `http/inbox/conversations.controller.ts` — `counts` nhận `channel`, `channel_account_id`, `tag_id`, `q`.
- worker: `roles/jobs.module.ts`.
- web `features/inbox/`:
  - `bulk-types.ts`;
  - `hooks/useInboxSelection.ts`, `hooks/useInboxBulk.ts`;
  - `components/ConversationBulkBar.tsx`, `components/BulkResultPanel.tsx`, `styles/bulk.styles.ts`;
  - `ConvRow.tsx`: ô chọn trên avatar;
  - `ConversationList.tsx`, `screens/InboxScreen.tsx`;
  - `api.ts`: `countsQuery(params)`, `tagsQuery`.
- mock:
  - `domains/inbox-bulk.ts`;
  - `domains/inbox.ts`: đếm theo bộ lọc;
  - `handlers.ts`.
- i18n:
  - `inbox.bulk.*` và `inbox.list.select` (vi / en);
  - `actions.conversation.{unhide,untag}`, `actions.message.{unpin,unreact}` (vi / en).
- test:
  - mới `apps/api/test/integration/inbox-bulk-results.test.ts`;
  - mới `apps/web/src/features/inbox/components/ConversationBulkBar.test.tsx`;
  - mới `apps/web/src/shared/api/mock/domains/inbox-bulk.test.ts`;
  - mới `apps/web/e2e/inbox-bulk.spec.ts`;
  - sửa `actions/conversation.bulk_update.action.test.ts` và `inbox.test.ts` theo output mới (thêm `failed` / `items`). Một id không thấy giờ trả 404 thay vì 403.

**HÀNH VI**
- `conversation.bulk_update`:
  - id trùng bị bỏ, tối đa 100;
  - ≤ 50 hội thoại chạy trong transaction executor, mỗi hội thoại một SAVEPOINT. Kết quả trả từng id `done` / `skipped` / `failed`, kèm mã an toàn;
  - 51–100 hội thoại trả 202 `job_accepted`. Runner 045b kiểm lại quyền hiện tại của người tạo; mỗi hội thoại một transaction cùng biên nhận.
- Gán người phụ trách cần thêm quyền `inbox.assign`.
- Xem trước báo `denied:N` và `mode:job`.
- Undo so giá trị sau khi ghi, từng trường. Lô chạy nền không có undo: trả 409.
- Các alias đặt trạng thái mong muốn, không bật lại cái đã tắt.
- Đếm thư mục áp đúng bộ lọc của danh sách. Đếm theo kênh bỏ riêng điều kiện kênh.

## Đối chiếu standards

| Standard | Kết quả |
|---|---|
| `actions/action-registry.md` | Mỗi alias là một action riêng, có mô tả và i18n. Quyền, risk, agentGrantable và undo giống action gốc. bulk luôn xem trước kèm số. |
| `domain/concurrency.md` §7 | Mỗi bản ghi độc lập, lỗi một bản ghi không lùi các bản ghi khác. Việc nền có biên nhận nên chạy lại không ghi lần hai. Undo so sau ghi. |
| `authz/rbac-permissions.md` | Mỗi hội thoại đi qua `writableConversation` (scope hiện tại). Id ngoài scope và id không có trả cùng một mã. `inbox.assign` khi gán. |
| `api/response-envelope.md` | `{ data }`; 202 `job_accepted` / `preview_required` dùng envelope có sẵn. |
| `events/outbox.md` | Event `conversation.updated` ghi cùng transaction. Việc nền ghi outbox trong transaction của từng hội thoại. |
| `database/indexing.md` | Đếm dùng cùng điều kiện và index với danh sách, không thêm bảng hay index. |
| `ui/frontend-structure.md` | Màn chỉ điều phối. Hook, component và styles tách riêng; mọi file ≤ 400 dòng (lint-size OK). |
| `ui/prototype-parity.md` | Thanh hàng loạt là phần mới loại M (D21), dựng bằng token. Parity inbox không đổi (bảng dưới). |
| `i18n/i18n.md` | vi + en 100% (6209 key). |

## Cổng test (D59, phạm vi TIP)

| Cổng | Kết quả |
|---|---|
| `pnpm turbo run lint typecheck test --filter="...[origin/dev]"` | 32/33 ở lượt đầu; `@appchat/web#test` đỏ do thiếu `actions.conversation.untag.desc`. Đã sửa, chạy lại web unit: 115 file / 373 test xanh. |
| depcheck · lint-size · lint-tokens · i18n-check | 0 lỗi · không file vượt trần · đúng thang D41 · 100% |
| build api + worker + `pnpm check:bundle` | OK |
| integration `inbox-bulk-results` + `conversation.bulk_update.action` + `inbox` | 24/24 |
| core unit `assistant-coverage` + `bulk-jobs` | 17/17 |
| E2E mock `inbox-bulk` + `inbox` (desktop + 390) | 14 passed, 10 skip (luồng chỉ desktop / chỉ mobile) |
| parity | inbox:default 4,70% (sổ nợ) · empty 2,30% · folder-rail 4,57% · conv-menu 3,99% · chat-menu 4,36% · ai-panel 3,76% · connect-channel 6,20% ≤ trần 6,5% (DC-360) · account-switch 1,05% · zalo-group-info 4,51% · handoff 0,64% |

Chưa nghiệm thu với provider thật: unreact Zalo thật vì không có tài khoản thử. Luồng lệnh đã kiểm bằng manifest giả trong integration.

---

## Pha 2 — tìm trong hội thoại có trang + cửa sổ quanh tin (§B.1–3)

**COMMIT:** nhánh `tip/025b-inbox-vertical-p2` (xếp chồng #109). Không migration — build lại api.

**FILES CHANGED** (DV-046)
- shared: `api/inbox-thread.ts` — `foldWithMap` / `foldRanges` (khớp không dấu, vị trí UTF-16 gốc), schema `threadSearchPageSchema` / `threadAroundSchema`; test `test/inbox-thread-fold.test.ts`.
- core: `inbox/services/thread-window.ts` — `threadPage` (before / after), `threadAround` (≤ 51, 404 không lộ), `threadSearchPage` (ảnh chụp trong cursor mờ gắn câu + người gửi, `total` đếm đúng); `read.service.ts` uỷ quyền; trích dẫn trả lời tin trước mốc xoá lịch sử / hội thoại khác → rỗng; endpoint mảng cũ tô theo chuỗi gốc; `access.ts` export `Conv`.
- api: `conversations.controller.ts` — `GET :id/messages/search-page` (q 1–100, limit ≤ 50), `GET :id/messages/around/:messageId`, `messages?after=`.
- web: `thread-api.ts`, `hooks/useThreadSearch.ts`, `hooks/useThreadWindow.ts`, `components/ThreadViewport.tsx`, `components/HitSnippet.tsx`, `styles/thread.styles.ts`, viết lại `ThreadSearchBar.tsx`, `ChatPanel.tsx` dùng viewport; i18n `inbox.chat.window.*` + `search2.loading/error`.
- mock: `domains/inbox-thread.ts` (+ `mock-transport.ts`).
- test: `apps/api/test/integration/inbox-thread-window.test.ts`, `apps/web/src/shared/api/mock/domains/inbox-thread.test.ts`, `apps/web/src/features/inbox/components/HitSnippet.test.tsx`, `apps/web/e2e/inbox-thread.spec.ts`.

**ĐỐI CHIẾU STANDARDS (P2)**

| Standard | Kết quả |
|---|---|
| `api/response-envelope.md` | trang tìm `{ data, next_cursor, total, snapshot_at }`; cửa sổ `{ data, anchor_id, before_cursor, after_cursor }`; lỗi 400 / 404 envelope chuẩn |
| `database/indexing.md` | EXPLAIN (`.data/gate/025b-p2-explain.txt`): cửa sổ + tìm dùng `message_conversation_id_created_at_id_idx`; keyset `(created_at, id)`, không OFFSET |
| `authz/rbac-permissions.md` | `visibleConversation` mọi route; tin xoá / thu hồi / trước mốc / hội thoại khác / ngoài scope → 404 cùng mã |
| `ui/frontend-structure.md` | hook / viewport / snippet tách riêng; ChatPanel chỉ điều phối |
| `i18n/i18n.md` | 6216 key 100% |

**CỔNG TEST (P2)**

| Cổng | Kết quả |
|---|---|
| turbo affected lint / typecheck / test (vs origin/dev) | 33/33 |
| depcheck · lint-size · lint-tokens · i18n | 0 · OK · OK · 100% |
| build api + worker + check:bundle | OK |
| integration `inbox-thread-window` (5.000 tin, 300 khớp, 6 trang, ảnh chụp, around, 404, xoá lịch sử, EXPLAIN) + `inbox` | 7/7 + 13/13 |
| shared unit `inbox-thread-fold` · web `HitSnippet` + mock `inbox-thread` | 4/4 · 2/2 + 2/2 |
| E2E mock `inbox-thread` + `inbox` | 13 passed, 9 skip |
| parity inbox (10 màn) | không đổi so với P1 (default 4,70% · connect-channel 6,20% ≤ trần) |

## Pha 3 — quản lý nhóm Zalo (§A.2–5)

**COMMIT:** nhánh `tip/025b-inbox-vertical-p3` (xếp chồng #110) — `81f0aca9` (nền: bảng + adapter), `aaf00909` (chính sách + lệnh + route), `8cf8f401` (web). **Migration tenant** `20261102002520_inbox_vertical` → sau merge: `pnpm --filter @appchat/db db:migrate-tenants` + build api / worker.

**FILES CHANGED** (DV-047)
- db: `prisma/tenant/inbox-ui.prisma` (`ConversationGroupState`, `GroupCommand`), migration + CHECK + `group_command_conversation_idx` + unique một phần `group_command_open_refresh_key` (một lệnh làm mới đang mở / nhóm).
- channels: OperationKind `group_settings` / `group_mute`; `GroupInfo.accountRole / version`; `updateGroupSettings` (đổi tên ≤ 100, bật / tắt link), `setGroupMute`; zca `changeGroupName` / `enableGroupLink` / `disableGroupLink` / `setMute`; vai trò từ `creatorId` / `adminIds`; fake transport tương ứng.
- shared / actions: `api/inbox-groups.ts`; `group.set_ai_policy` (CAS `if_version`), `group.add_members` (≤ 50, chỉ hội thoại 1-1 cùng tài khoản), `group.update` (`expected_version`), `group.set_mute`, `group.refresh`; event `channel.group_command_requested`. Không cấp cho agent.
- core: `inbox/groups/*` (xếp lệnh + outbox, chính sách khoá hội thoại + tăng `ai_epoch` + huỷ tin agent chưa gửi, đọc trạng thái / lệnh / ứng viên); `channels/jobs/group-command.processor.ts` (giành lệnh có fence thế hệ phiên; đã đặt chỗ rồi chạy lại → unknown, không gọi Zalo lần hai; lỗi rõ → failed; mạng / hết giờ → unknown; thêm thành viên một phần → partial).
- api: `GET /v1/conversations/:id/group`, `/group/candidates` (inbox.manage), `GET /v1/inbox/group-commands/:id`; openapi.
- web: Thông tin nhóm — Tắt / Bật thông báo (`group.set_mute`), Ghim (`conversation.pin`), Thêm / Quản lý chỉ khi có quyền + kênh hỗ trợ; chính sách AI đọc / ghi theo phiên bản; link chỉ “đang bật / tắt / chưa rõ”; Ẩn = `conversation.hide`. Hộp Quản lý nhóm: ảnh chụp Zalo (tổng / AppChat thấy / vai trò / chưa đủ), làm mới, đổi tên + link khi có phiên bản, thêm thành viên ≤ 50, trạng thái lệnh thật + từng người.
- test: `packages/channels/test/zalo-group-settings.test.ts`, `apps/api/test/integration/inbox-group-controls.test.ts`, web `GroupInfoPanel.test.tsx`, mock `inbox-groups.test.ts`, `e2e/inbox-group.spec.ts`.

**ĐỐI CHIẾU STANDARDS (P3)**

| Standard | Kết quả |
|---|---|
| `actions/action-registry.md` | 5 action zod + quyền + risk (send cho lệnh kênh, write cho chính sách / làm mới); handler có `preview()` từng lớp; không undo lệnh kênh (thao tác ngược = lệnh mới) |
| `events/outbox.md` | lệnh ghi `group_command` + outbox cùng transaction executor; kết quả ghi cùng transaction với `conversation.updated` |
| `channels/omnichannel-adapter.md` | năng lực theo manifest (`group_settings`, `group_mute`); kênh không hỗ trợ → `supports.* = false`, nút ẩn |
| `domain/concurrency.md` | CAS `policy_version`; `expected_version` nhóm kiểm ở handler + kiểm lại trên worker (`stale_snapshot`); fence thế hệ phiên khi giành lệnh |
| `authz/rbac-permissions.md` | ngoài scope → 404; thêm thành viên / ứng viên cần inbox.manage; ứng viên chỉ hội thoại 1-1 cùng tài khoản (DC-247) |
| `database/indexing.md` | `group_command (conversation_id, created_at DESC)`; unique một phần cho lệnh làm mới đang mở |
| `ui/frontend-structure.md` · `i18n/i18n.md` | hook / modal / api tách riêng, panel ≤ 400 dòng; 6254 key 100% |

**CỔNG TEST (P3)**

| Cổng | Kết quả |
|---|---|
| `db:test-reset` (migration mới) | OK |
| turbo affected lint / typecheck / test (vs origin/dev) | 33/33 (sửa: 4 handler lệnh khai `preview()` từng lớp cho quét phủ Trợ lý) |
| depcheck · lint-size · lint-tokens · i18n | 0 · OK · OK · 100% |
| build api + worker + check:bundle | OK |
| channels unit (gồm `zalo-group-settings`) | 84/84 |
| integration `inbox-group-controls` + `conversation-groups` | 7/7 + 6/6 |
| web inbox + mock unit | 60 file / 232 test |
| E2E mock `inbox-group` + `inbox` + `inbox-bulk` + `inbox-thread` | 18 passed, 10 skip (desktop + mobile 390) |
| parity inbox (10 màn) | zalo-group-info 4,53% · default 4,70% · folder-rail 4,57% · connect-channel 6,20% ≤ trần 6,5% · còn lại PASS |

Chưa nghiệm thu với Zalo thật (fake transport). Chưa làm: bảng tin / ghi chú / thư viện media có trang (§A.6–7) — DV-047.

## Pha 4 — ngữ cảnh CRM / commerce từ Hộp thư + xuất lịch sử (§D)

**COMMIT:** nhánh `tip/025b-inbox-vertical-p4` (xếp chồng #111) — `0ba9f883` (§D.1 liên kết hội thoại), `e9b59c97` + `699bb896` (§D.4 phiên bản khách + ma trận 9 action P1/P3), `e1267d33` (§D.3 edit-context), `20be2a25` (§D.6 xuất lịch sử), `6f9d362f` (web), e2e. **Migration tenant** `20261102002521_contact_version` → sau merge: `pnpm --filter @appchat/db db:migrate-tenants` + build api / worker.

**FILES CHANGED** (DV-048)
- actions: `sourceLink` (`sales-schemas.ts`) trên quote / order / contract.create (chỉ lệnh tạo, không trong `patch`); ticket / appointment.create thêm `conversation_id` / `source_message_id`; `contact.update` `if_version` + trả `version`; `crm-forms.ts` — `contact.get_edit_context` (crm.view, read), `contact.history_export` (crm.export, read). Không cấp cho agent.
- core: `inbox/services/conversation-link.ts` (`linkConversation`: thấy được, tin nguồn đúng hội thoại + còn hiện, 1-1 khớp khách / chưa liên kết → 422, nhóm cần thành viên đã liên kết, hội thoại agent phục vụ tin theo server); 5 writer nối helper (lịch hẹn hết âm thầm bỏ liên kết; ticket giữ ràng buộc 022b); `crm/services/contact-version.ts` + `contact.update` (khoá + CAS, chỉ ghi trường đổi, undo chỉ khi đúng version sau-ghi); `crm/services/contact-edit.ts` + handler + `GET /v1/contacts/:id/edit-context`; `crm/services/contact-timeline-export.ts` + handler + kind `contact.history_export` (dấu quyền = scope crm + còn thấy khách); `kernel/jobs/bulk-status.ts` dấu xuất nhận `job.input`; `CrmMembers.place`.
- db: `crm.prisma` `Contact.version`; migration cột + CHECK + trigger `contact_bump_version`.
- web: Profile360Actions / Panel360 / InboxScreen mang `conversation_id`; 4 form tạo gửi nguồn (`shared/crm-forms/source-link.ts`; sửa không gửi); form lịch hẹn nhận `contact_id`; `ContactFormHost` + `FormCommandHost` (6 lệnh `prefill:*.form` một lần, gỡ khỏi màn); `ContactFormModal` (edit-context, chỉ trường đổi + if_version, trường ẩn không hiện / không gửi, 409 giữ nội dung) + `TransferOwnerModal` nhận ngữ cảnh tối thiểu; nút "Sửa" + `HistoryCsvButton` ở 360; `shared/actions/download.ts`; mock `domains/contact-edit.ts`.
- test: core `inbox-vertical-context.test.ts`; api `inbox-vertical-context`, `contact-edit-version`, `contact-timeline-export` (+ EXPLAIN), ma trận `contact.get_edit_context` / `contact.history_export` + 9 action P1 / P3 (`conversation.unhide|untag`, `message.unpin|unreact`, `group.*`); web `FormCommandHost.test.tsx`, `ContactFormContext.test.tsx`, 6 `ui-commands.test.tsx` cập nhật; `e2e/inbox-context.spec.ts`.

**ĐỐI CHIẾU STANDARDS (P4)**

| Standard | Kết quả |
|---|---|
| `actions/action-registry.md` | lệnh tạo nhận nguồn qua schema chung; 2 action đọc mới có handler + preview + ma trận; một đường ghi (form sửa = `contact.update`, đổi chủ = `contact.transfer_owner`) |
| `domain/concurrency.md` | version do trigger (mọi writer cũ cũng tăng); `if_version` lệch → 409 STALE_VERSION; undo kiểm version sau-ghi; hai lệnh song song cùng version → một thắng |
| `authz/rbac-permissions.md` | liên kết hội thoại không cấp quyền chứng từ; ngoài scope → 404; watcher editable false; trường ẩn bỏ hẳn; tải xuất 410 khi mất quyền thấy khách |
| `database/indexing.md` | chốt id lịch sử = Index Only Scan `timeline_event_contact_id_occurred_at_id_idx` (`.data/gate/025b-p4-explain.txt`); dòng theo lô (deferred join PK), mã chứng từ một truy vấn / loại |
| `ui/frontend-structure.md` | form toàn cục ở `app/`, feature chỉ export qua barrel, không import chéo component; file ≤ 400 dòng |
| `i18n/i18n.md` | 6260 key 100%; nhãn cột / loại sự kiện tệp xuất theo ngôn ngữ người xuất (server i18n) |

**CỔNG TEST (P4)**

| Cổng | Kết quả |
|---|---|
| `db:test-reset` | OK |
| turbo affected lint / typecheck / test (vs origin/dev) | 33/33 |
| depcheck · lint-size · lint-tokens · i18n | 0 · OK · OK · 100% |
| build api + worker + check:bundle | OK |
| core unit | 109 file / 691 |
| integration phạm vi P4 + hồi quy CRM / commerce / nhóm | 24 file / 189 test |
| web unit | 121 file / 384 |
| E2E mock `inbox-context` + `inbox` + `customers` + `quotes` + `calendar` + `tickets` | 42 passed, 40 skip (desktop + mobile 390) |
| parity | inbox không đổi (default 4,70% · connect-channel 6,20% ≤ trần) · customers:360 3,35% · customers:edit 1,30% · customers:table 0,99% · quotes:editor 1,80% |

Đỏ sẵn ngoài phạm vi TIP: `assistant-vertical.test.ts` › mục lục ma trận — 11 action từ TIP-038b / 041 (`transfer.*`, `workspace.open|delete*|freeze_request`, `product.export`, `invoice.export`) chưa có file ma trận trên `origin/dev` (action của 025b đã có đủ).
