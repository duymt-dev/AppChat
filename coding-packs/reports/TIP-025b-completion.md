### COMPLETION REPORT — TIP-025b (pha 1 — hàng loạt Hộp thư + alias "bỏ" + đếm theo bộ lọc)

**STATUS:** pha 1 DONE (TIP chưa DONE). Chia 6 pha theo DC-377, mỗi pha một PR xếp chồng: **P1** §C + §B.4 (PR này) → P2 §B.1–3 tìm / cửa sổ quanh tin → P3 §A nhóm → P4 §D ngữ cảnh CRM / commerce + xuất timeline → P5 §E slot + §F dịch / chụp màn hình → P6 §G thẻ duyệt + AC10 ai:live.

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
