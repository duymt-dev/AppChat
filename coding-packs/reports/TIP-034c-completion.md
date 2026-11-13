### COMPLETION REPORT — TIP-034c

**STATUS:** DONE (ai:live chưa nghiệm thu — Postgres dùng chung cạn slot, Q-066)

Ba pha, PR xếp chồng:

| Pha | PR | Nhánh | Xếp chồng trên |
|---|---|---|---|
| 1 — backend: thao tác cha bền + con riêng từng ticket + hoàn tác có canh gác + cầu nối 409 | #213 | `tip/034c-ticket-bulk` | #212 (001b) |
| 2 — web: kết quả từng id, theo dõi việc nền, hoàn tác qua action chuẩn (toast + Nhật ký) | #214 | `tip/034c-p2-bulk-web` | #213 |
| 3 — tệp kết quả 038b, GenUI `$ref`, EXPLAIN, ai:live, E2E http, sổ | — | `tip/034c-p3-bulk-evidence` | #214 |

SHA ở `goals/GOAL-RELEASE.md` dòng 52.

**TÓM TẮT:** Sửa ticket hàng loạt không còn "được cả hoặc hỏng cả". Mỗi ticket được chọn có kết quả riêng (mã an toàn), lưu bền trong biên nhận. Giao người và đổi ưu tiên đi cùng một lần ghi cho từng ticket. Tập lớn chạy nền, không bao giờ báo "đã xong" khi mới được nhận. Hoàn tác chỉ trả lại những trường đã đổi, trên ticket chưa ai sửa sau đó, và báo đúng số xung đột. Toast, Nhật ký hành động, Trợ lý và API đều đi qua cùng action hoàn tác chuẩn. Có tệp kết quả CSV / XLSX thật. Giao cho AI Agent chỉ là phân công, không chạy model.

**Pha 1 — §1 hợp đồng + thao tác cha bền, §2 một transaction mỗi ticket, §3 hoàn tác một phần (AC1–AC6)**

- `ticket.bulk_update` (định nghĩa chuyển sang `packages/actions/src/support-bulk.ts`):
  - Đặc tính: `bulk: true` nên luôn xem trước, cả từ ui; Idempotency-Key bắt buộc.
  - Giới hạn: ≤ 200 id thô. Khử trùng một lần, giữ thứ tự nhập.
  - Patch: người phụ trách HOẶC agent, kèm ưu tiên; `if_versions?`. Patch rỗng / hai người phụ trách → 422 trước khi có hiệu ứng.
  - Output thêm `changed_count`, `outcomes[{id, ok, changed?, error:{code}}]`, tham chiếu thao tác; vẫn giữ `updated`.
- Thao tác cha:
  - Là `data_job` kind `ticket.bulk_update`, `action_log_id` = log của yêu cầu. Executor đưa id qua `ExecuteMeta`; index duy nhất theo action_log.
  - Item `data_job_item` pending được ghi trong transaction cha. Cha không ghi ticket nào và không gọi Executor lồng.
  - ≤ 50 id: chạy bằng chính runner 045b trong `afterCommit`. Phản hồi đọc lại từ biên nhận (`HandlerOutcome.settled`).
  - 51–200 id: 202 `job_accepted`. Sập giữa chừng thì quét data-jobs chạy tiếp từ biên nhận.
- Con riêng `ticket.bulk_item` / `ticket.bulk_item_undo` (003c internal, chạy qua `runSystemAction`):
  - Chạy thay mặt người tạo với quyền HIỆN TẠI, đọc lại ở mỗi con; mất quyền thì dừng cả việc.
  - Thứ tự khoá: fence họ / nguồn → ticket. Kiểm phạm vi ghi 042c, chặn 015c, trạng thái đóng, người nhận hiện hợp lệ, version đã nhận.
  - Kiểm CẢ patch trước khi ghi. Một UPDATE cho hai trường, lịch sử + outbox + biên nhận cùng transaction.
- Biên nhận có kiểu (mở rộng `data_job_item`, không phải sổ thứ hai): generation, outcome_code, changed, admitted_version, after_version, receipt (trường đã đổi + trước / sau + dấu vân tay), undo_state.
- Trigger `ticket_bump_version` (BEFORE UPDATE) là nguồn version duy nhất. Đã bỏ `version: { increment }` ở mọi writer.
- Mã kết quả an toàn:
  - `NOT_FOUND`: thiếu / ẩn / không phải uuid / khách đang bị quên.
  - `INVALID_TRANSITION`: ticket đã đóng.
  - `STALE_VERSION`, `VALIDATION_FAILED`, `NOT_APPLIED`.
- `ticket.bulk_undo`:
  - Quyền: chỉ người tạo + ticket.manage hiện tại. Hạn = undo_until của log đi. Đang chạy → 409 `OPERATION_BUSY`.
  - Xem trước ràng digest tập đã đổi. Khi xác nhận: niêm phong dưới khoá dòng data_job; hai yêu cầu hội tụ về một lượt.
  - Con hoàn tác so đúng after_version + dấu vân tay (ABA → `CONFLICT`). Log đi chỉ thành `undone` khi mọi con đã hoàn tác.
- `kernel/actions/undo-action-registry.ts`: `/action-logs/:id/undo` của log cha → 409 `UNDO_REQUIRES_ACTION {undo_action, parent_action_log_id}`, không ghi. Hoàn tác đơn lẻ assign / update có canh gác (log cũ không có bằng chứng → 409).
- Migration tenant: `20261113020000_ticket_bulk` + `20261113030000_ticket_bulk_log_key`.

**Pha 2 — §3.4–3.5 cầu nối web, §4.1–4.2 UI, §4.6 DTO version (AC6, AC8)**

- Hoàn tác (`apps/web/src/shared/actions/`):
  - `run-action-request.ts`: một vòng gửi / xem trước / xác nhận dùng chung.
  - `undo-action.ts`: CHỈ bắt 409 `UNDO_REQUIRES_ACTION` có action trong danh sách cho phép + log khớp, rồi chạy action hoàn tác chuẩn.
  - `useUndoAction`: dùng cho toast của `useAction` và Nhật ký hành động. Hoàn tác một phần báo số xung đột, 202 báo đang chạy; không giả "đã hoàn tác".
- Tickets:
  - `useTicketBulk`: chốt tập id lúc gửi, `if_versions` của dòng đang hiện; theo dõi `/data-jobs/:id/result` qua điều hướng / tải lại theo workspace; giữ chọn ticket chưa áp dụng; có dừng / thử lại / hoàn tác.
  - `TicketBulkResults`: mã an toàn từng id, ghi rõ giao agent "chưa chạy".
  - `BulkBar` thành orchestrator.
- API `GET /v1/data-jobs/:id/result`: kết quả theo loại việc, chỉ người tạo.
- `version` thêm vào ticket DTO (shared / core / mock).
- Mock `tickets-bulk.ts` + `data-jobs.ts`: hành vi như server.

**Pha 3 — §4.3 Trợ lý, §4.4 tệp kết quả, §4.7 EXPLAIN (AC4, AC7, AC8)**

- **Tệp kết quả 038b `ticket_bulk_results`** (`packages/shared/src/data-transfer/{registry,activity-fields}.ts`):
  - Chỉ xuất (`direction:'export'`): planner nhập → 422 `export_only`, nên không có đường nhập CSV thành sửa ticket.
  - Cột: `ticket_id`, `outcome` (ok · failed · pending), `error_code`, `changed`, `undo_state`. Không tiêu đề, không nội dung, không bản chụp trước.
- **Action `ticket.bulk_export`** (`support-bulk.ts`; ticket.manage, write, agentGrantable=false, input `parent_action_log_id` + `format` xlsx|csv). Handler ở `packages/core/src/data-transfer/adapters/ticket-bulk-results.ts`:
  - Quyền: chỉ người tạo thao tác + quyền hiện tại. Người khác / log lạ → 404 như nhau.
  - Chiếu theo quyền hiện hành (`visibleTicketIds`): ticket nay ngoài phạm vi chỉ còn id + `NOT_FOUND`.
  - Định dạng: CSV qua `csvFile` (chống công thức, BOM), XLSX qua `workbook` (ô chuỗi).
  - Dấu xuất = sha256 các dòng (`registerExportStamp`). Hoàn tác / mất phạm vi sau khi xuất thì tải tệp cũ → 410, phải xuất lại.
  - Nút "Tải kết quả (Excel)" ở khung kết quả và lệnh "xuất kết quả" của Trợ lý dùng chung action / host tải.
- **GenUI `$ref`:**
  - Thêm `registerRefSource(action, src)` (`genui/refs.ts`). `ticket.bulk_update` / `bulk_undo` đăng ký `bulkRefSource` (`support/bulk/results.ts`).
  - Thẻ tham chiếu kết quả đọc lại từ data_job theo người xem hiện tại: chỉ người tạo + `allowedAction`, đếm lại tổng, ẩn ticket ngoài phạm vi. Không trả output cũ của bước. `refSteps` không đổi.
- **EXPLAIN** (`ticket-bulk-explain.test.ts`): 500 việc × 200 biên nhận. Thấy `data_job_item_result_idx`, `data_job_action_log_key`, `data_job_actor_status_page_idx` và `ticket_pkey` (với `enable_seqscan=off`).
- **ai:live** suite `ticket-bulk`: 6 ca, mỗi ca một loại.
  - Các ca: patch kết hợp, lỗi lẫn, > 50 việc nền, hoàn tác một phần, agent chỉ đọc, xuất kết quả.
  - Seed theo khoá lượt; workspace fixture riêng `ticket-bulk@ai-live.appchat.test`.
  - Bộ chấm đọc lại ticket qua API + vết run. Ghi không thẻ = vi phạm; ghi qua agent chỉ đọc = forbidden_success.
- **E2E http** `e2e/http/ticket-bulk.spec.ts` (backend thật):
  - Ca 1: 3 ticket (1 đóng) → kết quả từng id → tải XLSX thật → hoàn tác qua `ticket.bulk_undo` → ưu tiên về như cũ → Nhật ký log cha "Đã hoàn tác".
  - Ca 2: 51 ticket (100 / trang) → "Đang chạy nền" → hoàn tất 51 đã đổi từ biên nhận.

**FILES** (toàn bộ ba pha; chi tiết file ngoài manifest ở DV-119)

- **Pha 1:**
  - Actions / shared: `packages/actions/src/{support-bulk,support,define,index}.ts`, `packages/shared/src/{support/bulk.ts,api/ticket-bulk.ts,api/index.ts,index.ts,errors.ts,api/envelope.ts}`.
  - Core support: `packages/core/src/support/bulk/{parent,item,mutations,undo,results,providers,register}.ts`, `support/actions/{ticket-edit.handlers,ticket-flow.handlers,ticket-create.handler,previews/ticket-edit.handlers.preview}.ts`, `support/system/effects.ts`, `support/{support.module,jobs/support.jobs.module}.ts`.
  - Core kernel: `packages/core/src/kernel/actions/{undo-action-registry,undo.service,executor,handler,tip-owners}.ts`, `kernel/jobs/{bulk-dispatch,data-jobs/store,data-jobs/handlers}.ts`, `kernel/index.ts`.
  - DB: `packages/db/prisma/tenant/{data-jobs,support}.prisma` + 2 migration.
  - Web (P1 giữ hành vi cũ chạy được): `apps/web/src/shared/api/mock/domains/tickets-actions.ts`, `messages/{vi,en}/{actions,errors}.json`, `e2e/tickets.spec.ts` (bước xác nhận).
  - Test: `packages/core/test/{ticket-bulk,assistant-coverage}.test.ts`, `packages/actions/{test/support-bulk.test.ts,src/examples.test.ts}`, `packages/shared/src/support/bulk.test.ts`, `apps/api/test/integration/{ticket-bulk,support}.test.ts`, ma trận `ticket.{bulk_update,bulk_undo,bulk_item,bulk_item_undo}`, `apps/worker/test/integration/ticket-bulk-composition.test.ts`.
- **Pha 2:**
  - Shared web: `apps/web/src/shared/actions/{run-action-request,undo-action,useUndoAction,useAction}.ts` (+ `undo-action.test.ts`).
  - Tickets: `features/tickets/{bulk-types.ts,hooks/useTicketBulk.ts,components/{TicketBulkResults,BulkBar}.tsx,styles/bulk-results.styles.ts,tickets-store.ts,types.ts}`, `features/assistant/screens/ActionLogScreen.tsx`.
  - Mock: `shared/api/mock/{mock-transport,handlers}.ts` + `domains/{tickets-bulk,data-jobs,tickets,tickets-actions}.ts`.
  - API / core: `apps/api/src/http/kernel/data-jobs.controller.ts`, `packages/core/src/kernel/{index.ts,jobs/bulk-status.ts}`, `support/bulk/register.ts`, `support/services/tickets-read.service.ts` + `packages/shared/src/api/tickets.ts` (DTO `version`).
  - i18n: `messages/{vi,en}/{tickets,actions,assistant}.json`.
  - E2E: `e2e/ticket-bulk.mock.spec.ts`; integration `ticket-bulk.test.ts` (ca `/data-jobs/:id/result`).
- **Pha 3:**
  - Shared / actions: `packages/shared/src/data-transfer/{registry,activity-fields}.ts`, `packages/shared/src/i18n/server/{vi,en}/support.ts`, `packages/actions/src/support-bulk.ts`.
  - Core: `packages/core/src/data-transfer/{adapters/ticket-bulk-results.ts,data-transfer.module.ts}`, `packages/core/src/ai/assistant/genui/refs.ts`, `packages/core/src/support/bulk/{results,register}.ts`.
  - Web: `features/tickets/{hooks/useTicketBulk.ts,components/{TicketBulkResults,BulkBar,TicketBulkResults.test}.tsx}`, mock `domains/tickets-bulk.ts` + `{tickets-bulk-shape,data-transfer-shape}.test.ts`, `messages/{vi,en}/{tickets,actions,data-transfer}.json`.
  - Test backend: `packages/core/test/ticket-bulk.test.ts` (GenUI `$ref`), `apps/api/test/integration/{ticket-bulk-explain.test.ts,actions/ticket.bulk_export.action.test.ts}`.
  - E2E: `apps/web/e2e/http/ticket-bulk.spec.ts`.
  - ai:live: `fixtures/ai-eval/{ticket-bulk.json,ticket-bulk-seed.mjs}`, `tools/ai-live/src/{ticket-bulk-judge,cases,runner,cli}.ts` + `test/cases-cli.test.ts`, report `reports/ai-live-ticket-bulk-2026-11-13.{md,json}`.

**TEST** (pha 3 — cổng chốt trong phạm vi TIP, D59; full integration / full E2E để TIP-046)

| Cổng | Kết quả |
|---|---|
| Integration TIP (Postgres 16 + Memurai thật) | 30/30 trên 7 file:<br>• `ticket-bulk` 12<br>• `ticket-bulk-explain` 1<br>• ma trận `ticket.bulk_export` 5 — CSV thật dòng đúng, 422 export_only, 403 kế toán / 404 sales / log lạ, nguồn assistant, hoàn tác → tệp cũ 410<br>• ma trận `bulk_update` / `bulk_undo` / `bulk_item` / `bulk_item_undo` mỗi file 3<br>Hồi quy support: `support` + `support-categories` + `support-categories-transfer` + `package-export` 32/32 |
| Worker | `ticket-bulk-composition` 2/2 (integration); `ai-role-handlers` 1/1 |
| Unit | shared 210 · actions 49 · core 192 file / 1224 (có `ticket-bulk` 8, `genui-refs`) · web 167 file / 568 · ai-live 13 file / 90 |
| E2E mock (`E2E_PORT=3537`) | `ticket-bulk.mock` + `tickets` 10 passed (10 bỏ qua theo dự án desktop / 390) |
| E2E http (`E2E_HTTP_PORT=3538`, `TENANT_CLIENT_CACHE=10`, workers=1) | `ticket-bulk` 2/2 desktop: ca 3 ticket → tải XLSX → hoàn tác → Nhật ký; ca 51 ticket việc nền. Mobile bỏ qua theo spec |
| ai:live `ticket-bulk` (6 ca × 3) | **Chưa nghiệm thu.** Bốn lần dựng stack (cache tenant 3 / 3 / 3 / 1) đều hỏng hạ tầng:<br>• lượt 1: 18/18 lỗi seed — 53300 ×157, workspace fixture kẹt provisioning<br>• lượt 2–4: 53300 ngay ở đăng nhập → "không thấy OTP"<br>Lúc kiểm, Postgres còn 45–47 / 100 kết nối giữ bởi DB khác. Report ghi rõ ở `reports/ai-live-ticket-bulk-2026-11-13.md` |
| Parity | `tickets:list` 4,21% · `tickets:kanban` 3,53% · `tickets:detail` 4,91% (≤ trần nợ có sẵn; khung kết quả chỉ hiện sau thao tác) |
| Typecheck / lint / depcheck | tsc shared / actions / core / api / web / ai-live 0 lỗi; eslint shared / actions / core / api 0, web 0 lỗi (24 cảnh báo có sẵn ở file ngoài TIP); depcruise 0 vi phạm |
| lint:size / lint:tokens / i18n:check | sạch / sạch / vi + en 100% (7336 key) |

**ISSUES DISCOVERED**

- **DV-119:** tên migration khác manifest. File ngoài manifest ba pha: P3 thêm action `ticket.bulk_export`, `registerRefSource` ở `genui/refs.ts`, `activity-fields.ts`, i18n server, khung ai:live, EXPLAIN tách file. 4 file 038b của manifest không cần sửa.
- **DC-447:** (a)–(k) pha 1–2; (l) pha 3 — tệp kết quả chỉ xuất qua action riêng, chỉ người tạo, dấu theo quyền hiện hành, nguồn `$ref` cho action ghi có biên nhận.
- **E2E http:** tiêu đề log ở chế độ http là chữ đã dịch ("Cập nhật ticket"), nên spec định vị dòng log cha theo id lấy từ `/action-logs`. Bảng ticket không có ô chọn tất cả: ca 51 ticket đổi 100 / trang rồi chọn từng dòng.
- **Ma trận `ticket.bulk_export`:** lần chạy đầu có một ca 500 ở xuất XLSX nguồn assistant; tái hiện riêng và chạy lại ba lần đều 5/5 — chưa rõ gốc (nghi chập chờn khi Postgres dùng chung đầy).
- **ai:live:** chưa nghiệm thu với stack thật — chờ Q-066 (nâng `max_connections` hoặc chạy khi dự án dùng chung rảnh).

**ĐỐI CHIẾU STANDARDS** (APPLICABLE STANDARDS của TIP):

| Standard | Tuân thủ (file / test) | Lệch |
|---|---|---|
| `domain/concurrency.md` §1 / §4 / §7 | Kết quả từng id `ok / error.code`; ≤ 50 ngay, > 50 → 202; version từ trigger + `if_versions` / version chụp lúc xem trước; hoàn tác so after_version + dấu vân tay; niêm phong dưới khoá dòng; Idempotency-Key bắt buộc | — |
| `actions/action-registry.md` | `ticket.bulk_update` / `bulk_undo` / `bulk_export` công khai, `bulk_item` / `bulk_item_undo` internal 003c; zod, quyền, risk, agentGrantable=false, invalidates; FE ghi chỉ qua `useAction` / `runActionRequest`; ma trận đủ 5 action | Định nghĩa tách sang `support-bulk.ts` (DV-119) |
| `authz/rbac-permissions.md` | ticket.manage + phạm vi ghi 042c đọc lại mỗi con / mỗi lần đọc kết quả / xuất; chỉ người tạo đọc kết quả / hoàn tác / xuất; không thêm quyền, không bypass Owner | — |
| `database/tenant-db.md` | Bảng tenant không `workspace_id`; DB qua TenantDbResolver; đủ 4 bước migration (generate / migrate-tenants dev + test / setup) | Tên migration (DV-119) |
| `database/indexing.md` | `data_job_item` unique (job, item, generation) + lookup INCLUDE(outcome_code, after_version); `data_job_action_log_key`; `data_job_actor_status_page_idx`; EXPLAIN 500 × 200 | — |
| `events/outbox.md` | `ticket.assigned` / `ticket.updated` cùng transaction với hiệu ứng từng con (cả hoàn tác); realtime chỉ invalidate, không mang bảng kết quả | — |
| `api/response-envelope.md` | `{ data }`; 202 `job_accepted`; 409 `UNDO_REQUIRES_ACTION` / `OPERATION_BUSY` / `STALE_VERSION`; 410 tệp hết hiệu lực; 422 `export_only` | — |
| `domain/state-machine.md` | Ticket đóng → `INVALID_TRANSITION` từng id, không đổi trạng thái / SLA | — |
| `domain/gap-filling.md` | DC-447, DV-119 ghi đủ | — |
| `ai/agent-gateway.md` · `ai/eval.md` | Bulk / undo / export không cấp agent; agent chỉ đọc được chọn → không ghi; `$ref` đọc lại theo quyền hiện hành; bộ ai:live 6 ca × 3 | ai:live chưa nghiệm thu (Q-066) |
| `ops/observability-security.md` | Mã kết quả an toàn (ẩn = thiếu); tệp không tiêu đề / nội dung, chống công thức CSV; không log bí mật | — |
| `ui/frontend-structure.md` | BulkBar orchestrator; hook / component / style / types tách file; FE ≤ 400 dòng | — |
| `ui/interaction-patterns.md` | Xem trước + xác nhận; 202 không báo xong; giữ chọn ticket chưa áp dụng; giao agent ghi rõ chưa chạy; không toast thành công khi chỉ được nhận | — |
| `ui/prototype-parity.md` | tickets list / kanban / detail < 5% | — |
| `i18n/i18n.md` | `tickets.bulk.*`, `actions.ticket.bulk_*`, `data-transfer.entity/field`, server `support.bulkResults.*` — vi + en 100% | — |
| `code/file-size-module-layout.md` | BE ≤ 600, FE ≤ 400 (lint:size sạch); test file riêng | — |
| `code/testing.md` / D59 | Chỉ test phạm vi TIP; 3 cổng mỗi pha; commit + PR mỗi pha | — |
| `workflow/git-flow-ci.md` | Nhánh `tip/034c-*`, PR vào `dev` xếp chồng | — |
