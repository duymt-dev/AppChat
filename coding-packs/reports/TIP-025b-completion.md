### COMPLETION REPORT — TIP-025b (pha 1–7 — hàng loạt Hộp thư + alias "bỏ" + đếm theo bộ lọc; tìm có trang + cửa sổ quanh tin; quản lý nhóm Zalo; ngữ cảnh CRM + xuất lịch sử; khung giờ / dịch / chụp màn hình; thẻ duyệt + ai:live; bảng tin nhóm + link + chọn phụ trách)

**STATUS:** **TIP DONE** sau pha 7 (DC-378). Chia 6 pha theo DC-377 + pha 7 (DC-378), mỗi pha một PR xếp chồng: **P1** §C + §B.4 (PR này) → P2 §B.1–3 tìm / cửa sổ quanh tin → P3 §A nhóm → P4 §D ngữ cảnh CRM / commerce + xuất timeline → P5 §E slot + §F dịch / chụp màn hình → P6 §G thẻ duyệt + AC10 ai:live.

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

## Pha 5 — khung giờ thật + dịch hai chiều + chụp màn hình (§E, §F)

**COMMIT:** nhánh `tip/025b-inbox-vertical-p5` (xếp chồng #112) — `ce1580b8` (§E), `fc4291e9` (§F nền), `f946b4f8` (§F web), `22e0bef6` (e2e). **Migration tenant** `20261107025250_translation_cache` → sau merge: `pnpm --filter @appchat/db db:migrate-tenants` + build api / worker.

**FILES CHANGED** (DV-049)
- shared: `api/inbox-translation.ts` (đích vi/en/zh/ko/ja, ≤ 4.000 ký tự, 10 tin tự dịch đầu, phiên bản prompt, TTL 24h, schema kết quả).
- actions: `ai.translate` mở đích zh/ko/ja (hợp đồng / quyền / grantable giữ nguyên); `inbox-translation.ts` — `ai.translate_draft` (inbox.reply, read, `agentGrantable:false`).
- core: `ai/skills/translation-cache.ts` (giữ chỗ INSERT … ON CONFLICT DO NOTHING; lượt trùng chờ cùng lượt; giữ chỗ quá hạn nhận lại có điều kiện; lỗi / hết credit xoá chỗ giữ; chỉ lưu băm), `translation-service.ts` (run consult KHÔNG tool qua AiRunner + CreditMeter; nội dung ở lượt user), `draft-translate.handler.ts` (kiểm inbox.reply + scope hội thoại hiện hành trước model; trả `draft_revision`), `translate.handler.ts` dùng chung dịch vụ + cache; `ai/jobs/translation-cache.cleanup.ts` (mỗi giờ, theo workspace, ROLE=jobs qua `InboxUiJobsModule`).
- db: `inbox-ui.prisma` `TranslationCache`; migration bảng + unique khoá (actor, hội thoại, băm, đích, prompt, epoch quyền) + index `expires_at`.
- ai: model giả nhận đích zh/ko/ja.
- web: `SchedulingPopover.tsx` + `useInboxSlots.ts` (dịch vụ / ngày giờ workspace / nhân viên → `/calendar/slots`, thứ tự server; chọn giờ mở form lịch hẹn chuẩn điền sẵn khách + hội thoại; "Chèn đề xuất giờ" chỉ chèn câu hỏi; nút chỉ hiện với booking.view); bỏ `/booking/slots`; `TranslationPopover` / `TranslationPreview` / `AutoTranslated` / `CapturePreview`; hooks `useInboxTranslation` (tuỳ chọn theo người + workspace + hội thoại, mặc định tắt), `useIncomingTranslations`, `useDraftTranslation`, `useInboxCapture`; `shared/media/screen-capture.ts`; mock `domains/inbox-translation.ts`; i18n vi/en.
- test: core `inbox-translation.test.ts` (5); api `inbox-translation.test.ts` (3), ma trận `ai.translate_draft` (3); web `SchedulingPopover.test.tsx` (3), `TranslationPreview.test.tsx` (4), `CapturePreview.test.tsx` (4), `useIncomingTranslations.test.tsx` (3); `e2e/inbox-assist.spec.ts`.

**Giả định đã chọn (gap-filling)**
- Tuỳ chọn tự dịch lưu ở trình duyệt (tiện ích hiển thị theo người + workspace + hội thoại, mất thì về tắt) — không có dữ liệu nghiệp vụ nào phụ thuộc.
- Tự dịch tin vào luôn sang tiếng Việt (đặc tả §F.2); đích tin soạn chọn trong 4 ngôn ngữ của prototype.
- Chọn giờ ở popover = đề xuất: mở form lịch hẹn (form kiểm lại slot + EXCLUDE ở server khi tạo), không đặt chỗ ngầm.

**ĐỐI CHIẾU STANDARDS (P5)**

| Standard | Kết quả |
|---|---|
| `ai/agent-gateway.md` | dịch = run consult không tool qua AiRunner / CreditMeter; hết credit 402, không bịa bản dịch; cache theo người + epoch quyền, không trừ credit hai lần cho lượt trùng |
| `actions/action-registry.md` | `ai.translate_draft` có handler + preview + ma trận; không cấp agent; gửi vẫn chỉ qua `message.send` |
| `authz/rbac-permissions.md` | kiểm inbox.reply + scope hội thoại trước model (ngoài scope 404, kế toán 403); nút đặt lịch theo booking.view |
| `database/indexing.md` | tra cache = unique (actor, hội thoại, băm, đích, prompt, epoch) — một lần seek; dọn theo index `expires_at` lô id |
| `ops/observability-security.md` | không lưu / log nguyên văn tin (chỉ băm sha256); log job chỉ id workspace + số dòng |
| `ui/frontend-structure.md` | hook / component tách riêng, Composer 177 dòng, style mới `assist.styles.ts` dùng token; e2e desktop + mobile 390 |
| `i18n/i18n.md` | 6287 key 100% |

**CỔNG TEST (P5)**

| Cổng | Kết quả |
|---|---|
| `db:test-reset` | OK |
| depcheck · lint-size · lint-tokens · i18n | 0 lỗi · OK · OK · 100% |
| build api + worker + check:bundle | OK |
| core unit | 110 file / 696 |
| integration phạm vi P5 (`inbox-translation`, ma trận `ai.translate_draft` / `ai.translate`, `assistant-vertical`) | 4 file / 14 test; mục lục ma trận chỉ còn 11 action đỏ sẵn của 038b / 041 |
| web unit | 125 file / 398 |
| E2E mock `inbox-assist` + `inbox-group` + `inbox-context` | 13 passed, 4 skip (desktop + mobile 390) |
| parity | inbox không đổi (default 4,70% · folder-rail 4,57% · chat-menu 4,36% · zalo-group-info 4,53% · connect-channel 6,20% ≤ trần 6,5%) |

Chưa nghiệm thu với provider thật: dịch qua 9router (kiểm ở P6 ai:live, AC10). Chụp màn hình trên trình duyệt thật cần người chọn tab — e2e kiểm nhánh không hỗ trợ + unit kiểm dừng track.

## Pha 6 — thẻ duyệt trong Hộp thư + AC10 ai:live (§G)

**COMMIT:** nhánh `tip/025b-inbox-vertical-p6` (xếp chồng #113) — `ba441394` (§G nền), `c4ead89e` (§G web), `543ec8d3` (ai:live), `183a900c` (cảm xúc theo kênh). **Không migration** (dùng index sẵn `ai_run_conversation_idx` + `approval_request_run_idx`) → sau merge chỉ build lại api / worker.

**FILES CHANGED** (DV-050)
- shared: `approvalRowSchema.executed` (đã duyệt — thao tác gốc đã chạy chưa).
- actions: `reads/inbox.ts` — `conversation.approvals` (inbox.view, read, không cấp agent).
- core: `inbox/approvals/conversation-approvals.ts` (hội thoại thấy được → run của hội thoại → yêu cầu duyệt theo run, ≤ 50; không approvals.decide → rỗng, không đọc hàng duyệt); `ai/approvals/approvals.read.ts` tách `approvalRows`; `inbox/actions/conversation-approvals.handler.ts`; `inbox/services/meta.service.ts` trả `reactions`; `ai/assistant/catalog.ts` từ khoá dịch / duyệt / hàng loạt / hội thoại.
- api: `http/inbox/inbox-approvals.controller.ts` (`GET /v1/conversations/:id/approvals`) + OpenAPI.
- web: `approval-api.ts`, `InboxApprovals.tsx` (dùng lại ApprovalCard, mặc định chỉ chờ duyệt, Xem tất cả, "đã duyệt — đang chờ chạy"), `ChatPanel` gắn thẻ, `MessageMenu` ẩn cảm xúc ở kênh không hỗ trợ; mock `domains/inbox-approvals.ts`.
- ai:live: `fixtures/ai-eval/inbox-vertical/cases.json` (10 ca), cổng 9/10 trong `tools/ai-live/src/cli.ts`.
- test: core `inbox-approval-cards.test.ts` (3); api `inbox-approval-cards.test.ts` (4, gồm EXPLAIN), ma trận `conversation.approvals` (3); web `InboxApprovals.test.tsx` (3), `MessageMenu.test.tsx` (2); e2e `inbox-assist.spec.ts` (thẻ duyệt desktop + mobile).

**AI LIVE (AC10)** — `reports/ai-live-inbox-vertical-2026-11-07.md`: model thật 9router `ag/gemini-3-flash`, stack riêng cổng 4617, Redis DB 14, DB test; 10 ca × 3 lượt → **9/10 ca ĐẠT (≥ 2/3 lượt), 0 vi phạm an toàn** (không ghi nào chạy khi chưa xác nhận, không gọi ngoài quyền, không lộ bí mật). Ca trượt: `iv-translate-en` (2/3 lượt model tự dịch từ `conversation.get` thay vì gọi `ai.translate` — bản dịch vẫn đúng, chỉ không qua skill có cache). Vòng chạy đầu 3/10 bắt lỗi thật: `find_actions` không có từ khoá "dịch" / "duyệt" / "hội thoại" → đã thêm vào chỉ mục. Ca nhóm Zalo: tài khoản Zalo thật chưa có → model hỏi lại / không ghi (CHỜ-TK theo 044).

**Giả định đã chọn (gap-filling)**
- Không có approvals.decide nhưng thấy hội thoại → danh sách rỗng (không lộ có / không có yêu cầu), giống route hàng chờ duyệt cần approvals.decide.
- Thẻ đã xử lý giữ trong danh sách (ẩn sau "Xem tất cả") để người xem biết kết quả; chỉ thẻ chờ duyệt hiện mặc định.
- Phần còn lại ngoài sáu pha DC-377 (§A.6–7 bảng tin / link, §B.6 chọn phụ trách kèm tải) → **pha 7** (DC-378).

**ĐỐI CHIẾU STANDARDS (P6)**

| Standard | Kết quả |
|---|---|
| `actions/action-registry.md` | `conversation.approvals` có handler + preview + ma trận; quyết định duyệt vẫn chỉ qua `approval.*` |
| `authz/rbac-permissions.md` | ngoài scope 404 trước mọi đọc duyệt; can_decide = approvals.decide ∩ quyền duyệt action gốc; không approvals.decide → rỗng |
| `database/indexing.md` | `ai_run_conversation_idx` + `approval_request_run_idx` (EXPLAIN trong test); số truy vấn cố định 3 (không theo dòng) |
| `ai/eval.md` | suite có phiên bản, 3 lượt, chấm theo vết run + an toàn tuyệt đối; báo cáo + JSON trong `reports/` |
| `ui/frontend-structure.md` | dùng lại ApprovalCard qua barrel, không import `features/assistant/components/*`; file ≤ 400 dòng |
| `i18n/i18n.md` | vi + en 100% |


## Pha 7 — bảng tin nhóm + sao chép link + chọn phụ trách kèm tải (§A.6–7, §B.6)

**COMMIT:** nhánh `tip/025b-inbox-vertical-p7` (xếp chồng #114) — `d1c654dd` (nền), `f61d28ce` (web). **MIGRATION tenant:** `20261107062500_group_board`, `20261107062501_group_link_command`, `20261107062502_agent_load` → sau merge `db:migrate-tenants` + build lại api / worker (worker ROLE=channels chạy lệnh `link`).

**FILES CHANGED** (DV-051)
- shared: `api/inbox-board.ts` (GROUP_BOARD_KINDS, trang 24), `api/inbox-assignees.ts` (trang 30), `api/inbox-groups.ts` kind `link` + `link?: {enabled, url}`.
- actions: `inbox-groups.ts` — `group.copy_link` (inbox.manage, read, không cấp agent, cần connector Zalo cá nhân).
- core: `inbox/groups/group-board.ts` (keyset, mốc xoá lịch sử, bỏ xoá / thu hồi, link chỉ http(s) ≤ 3 / tin, ghi chú = tin `note`), `group-commands.ts` / `group-read.ts` (link: chỉ người yêu cầu, 10 phút, giải mã khi đọc), `group.handlers.ts` (`GroupCopyLinkHandler`, chỉ nguồn UI), `channels/jobs/group-command.processor.ts` (đọc link + `encryptSecret`), `inbox/services/assignee-candidates.ts`, `crm/public.ts` (`assigneeLoadOf`).
- api: `inbox-groups.controller.ts` (`GET …/group/board`), `inbox-assignees.controller.ts` (`GET …/assignees`), OpenAPI.
- web: `GroupBoard.tsx`, `GroupFold.tsx`, `GroupLinkRow.tsx`, `AssignPicker.tsx`, `assign-api.ts`, `group-api.ts` (`groupBoardQuery`); `GroupSections` / `GroupInfoPanel` / `ConvMenu` gọn lại; mock `domains/inbox-board.ts` + `group.copy_link`.
- test: api `inbox-group-board.test.ts` (5 — link tắt / bật / chỉ người yêu cầu / hết hạn 10 phút / DB chỉ bản mã hoá, Trợ lý + sales bị từ chối, bảng tin trang / mốc / xoá / link / ghi chú, 404, EXPLAIN), ma trận `group.copy_link` (3), `inbox-assignees.test.ts` (4 — agent đúng kênh / nháp / xoá, tải mở, current, tìm, 403 / 404, EXPLAIN); web `GroupBoard` (1), `GroupLinkRow` (3), `AssignPicker` (3), `GroupInfoPanel` cập nhật; e2e `inbox-group.spec.ts` +2 (desktop + mobile 390).

**Giả định đã chọn (gap-filling)**
- Sao chép link luôn đọc mới qua worker (không giữ URL ở server quá 10 phút, không đưa URL vào trạng thái nhóm) — đổi một lượt chờ lấy việc không lộ link.
- Thiếu inbox.assign → 403 trước khi xét scope (giống conversation.assign); không thấy hội thoại → 404.
- Agent ứng viên = đang chạy (active, đã xuất bản, chưa xoá) và nhận loại kênh của hội thoại (`channels` rỗng = mọi kênh như Builder).
- Tổng ảnh / tệp chưa biết → hiện "N+ mục" khi còn trang, không bịa tổng.

**CỔNG TEST (P7)**
- `db:test-reset` (template +1) → integration `inbox-group-board` + `inbox-assignees` + ma trận `group.copy_link`: 12/12 pass.
- `pnpm turbo run lint typecheck test` core / shared / actions / api: 12/12 task pass. Web: typecheck, eslint (0 lỗi), vitest `features/inbox` + `shared/api/mock` 258/258.
- E2E mock `inbox-group.spec.ts` + `inbox.spec.ts`: 16 pass / 10 bỏ qua (luồng desktop trên mobile).
- Parity `inbox:zalo-group-info` 4,74% (≤ trần sổ nợ 5,7%) · `inbox:default` 4,70%.
- lint-size, lint-tokens, i18n-check (vi / en 100%).
- Zalo thật: **chưa nghiệm thu với provider thật** (fake transport).

**ĐỐI CHIẾU STANDARDS (P7)**

| Standard | Kết quả |
|---|---|
| `actions/action-registry.md` | `group.copy_link` có handler + preview + ma trận; ghi phụ trách vẫn chỉ `conversation.assign` |
| `authz/rbac-permissions.md` | copy_link inbox.manage + chỉ nguồn UI; assignees inbox.assign; ngoài scope 404; URL chỉ người yêu cầu |
| `database/indexing.md` | 2 index partial mới (kind + tải agent) + dùng lại `conversation_routing_load_idx`; EXPLAIN trong test; keyset (created_at,id) |
| `ops/observability-security.md` | URL mã hoá ở DB, không vào log / sự kiện / DOM khi chưa sao chép |
| `ui/frontend-structure.md` | tách component ≤ 400 dòng, query ở `*-api.ts`, mock cùng hợp đồng |
| `ui/prototype-parity.md` | ≤ trần sổ nợ; ô ảnh thật thay ô màu giả (TIP §A.7) |
| `i18n/i18n.md` | vi + en 100% |

## Cập nhật 2026-11-09 — đảo ngược Q-019 / DC-250 (DC-422)

Chủ nhà phản hồi trực tiếp sau khi dùng thử: UI chọn nhiều hội thoại + thanh thao tác hàng loạt (phần P1 ở trên) bị gỡ hoàn toàn — nghiệp vụ thực tế gán theo cả tài khoản kênh (Zalo…), không có nhu cầu chọn lẻ nhiều hội thoại rồi gán hàng loạt; tính năng tạo đường thao tác trùng với menu ⋯ (đặc biệt "Gán"). Đã gỡ (nhánh `fix/025b-remove-inbox-multiselect`):
- Xoá: `ConversationBulkBar.tsx`(+test), `BulkResultPanel.tsx`, `useInboxSelection.ts`, `useInboxBulk.ts`, `bulk-types.ts`, `bulk.styles.ts`, `e2e/inbox-bulk.spec.ts`.
- Sửa: `ConvRow.tsx` bỏ ô chọn trên avatar; `ConversationList.tsx` bỏ thanh bulk + `filterKey`; `InboxScreen.tsx` bỏ truyền `filterKey`; i18n xoá `inbox.bulk.*` + `inbox.list.select` (vi + en).
- Giữ nguyên: action backend `conversation.bulk_update` + handler + mock domain `inbox-bulk.ts` (không gọi từ UI Hộp thư nữa, nhưng còn test tích hợp backend tham chiếu — ngoài phạm vi gỡ lần này). Menu ⋯ từng hội thoại (`ConvMenu.tsx`) không đổi — vẫn đủ Gán / Giai đoạn / Gắn thẻ / Đóng / Lưu trữ.
- Sổ sách: DC-422 (đảo DC-250), Q-019 cập nhật trạng thái KHÔNG LÀM, COVERAGE REQ-C08b → KHÔNG LÀM.
