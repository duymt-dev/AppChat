### COMPLETION REPORT — TIP-003e

**STATUS:** DONE — nhánh `tip/003e-action-integrity` (từ `origin/dev` `4d55d8b8`, rebase lên `f9ac7646` sau #230), luồng A, checkout chính. Commit code + sổ `b9f4856d`; commit tiến độ kế tiếp. AC1–8 đều có test chạy thật. Không cần provider ngoài (không LLM / kênh / ngân hàng thật). Webhook ngân hàng ở E2E http là `mock` có ký HMAC.

**TÓM TẮT:**

- **Rà trước khi làm** (đọc code thật sau khi các TIP phụ thuộc đã tích hợp):
  1. Manifest đối chiếu code:
     - `executor.ts` không có nhánh undo. Undo chạy ở `kernel/actions/undo.service.ts` (`withEventTransaction` → `handler.undo`), nên cờ hoàn tác đặt ở đó (DV-126 (2)).
     - Migration `20261102006100` nằm trước các migration đã áp, nên đổi tên `20261114040000` (DC-454 (1)).
     - `errors.json` đã có `STALE_VERSION`, không sửa.
  2. Đã chạy `manifests.py 003e`. File chung với 001c / 003f / 012d / 013c / 031b / 050 / 051*: các TIP đó đều làm sau 003e, đúng thứ tự header.
  3. CAS đã có ở contact (015d / 025b), quote / contract / order (032c), product (027b), appointment (033b), ticket bulk + version DTO (034c), campaign (037), doc_template, profile_layout (026b). Phạm vi còn lại:
     - ticket sửa đơn lẻ: `ticket.update` / `assign` / `set_status` / `close` / `reopen`;
     - đề nghị thanh toán: `invoice.send_payment_qr` / `invoice.void` (cột `version` có sẵn, chưa ai so);
     - `ai_agent`: chưa có cột khoá dòng.
  4. Đường xoá chạm bảng sự kiện:
     - `order_event`: undo `order.confirm` / `order.update` (order-flow / order-edit), undo thu tiền (`payment-write.ts` revert).
     - Cascade: undo `order.create` → order_event; `ticket.create` → ticket_event; `product.create` → stock_movement.
     - Tất cả đều đi qua `UndoService`. Không job hay handler thường nào xoá ba bảng này. Grep `deleteMany` / `DELETE FROM` sạch.
  5. Không gắn trigger cho các bảng có UPDATE / DELETE hợp lệ:
     - `action_log`: undo ghi `undone_at`, đính chính ghi `correction`.
     - `timeline_event`: undo xoá theo `action_log_id`.
     - `integration_event`: cập nhật trạng thái xử lý.
- **Version (§1):**
  - Helper `kernel/actions/cas.ts` `assertIfVersion(current, ifVersion)`: lệch thì trả 409 `STALE_VERSION`, `fields.version` = số hiện tại.
  - Kiểm sau khi khoá dòng `FOR UPDATE`: ticket (`lockTicket`), đề nghị (`lockInvoice`), agent (`SELECT … FOR UPDATE` mới).
  - Version tăng bằng trigger, là nguồn duy nhất: `ticket_bump_version` (034c), `invoice_bump_version`, `ai_agent_bump_row_version` (mới).
  - `ai_agent.row_version` tách khỏi `version` (số bản xuất bản). DTO trả `row_version`; DTO đề nghị trả `version`.
  - `if_version` là tuỳ chọn. Không gửi thì ghi bản mới nhất như cũ (Trợ lý / agent).
- **FE (§2):**
  - `useAction` nhận 409 `STALE_VERSION` mà màn không tự xử lý → `StaleVersionModal` (gắn ở `AppShell`):
    - "Tải lại" làm mới truy vấn theo `invalidates` của action, rồi `onStaleReload`.
    - "Giữ bản của tôi" chỉ đóng hộp, không toast.
  - `usePinnedVersion` chốt version lúc mở form. Refetch nền không đổi số này. Tải lại xong mới lấy số mới, nội dung đang nhập giữ nguyên.
  - Form gửi `if_version`:
    - ticket: giao / mở lại (TicketDrawer), đổi trạng thái (DetailTabs), đóng (CloseTicketModal);
    - đề nghị: gửi QR (DetailTabs), huỷ (PaymentModals);
    - agent: builder lưu (`useAgentBuilder`).
  - Đơn / hợp đồng giữ xung đột riêng (`useEditVersion`).
- **Bảng chỉ thêm (§3, DC-292):**
  - Migration `20261114040000_action_integrity` dùng hai hàm `append_only_no_change` (UPDATE / TRUNCATE luôn chặn) và `append_only_delete_guard` (DELETE chỉ khi `current_setting('app.undo_allow', true) = 'on'`).
  - Mỗi bảng `stock_movement` / `order_event` / `ticket_event` có 3 trigger.
  - Cờ chỉ đặt bằng `SET LOCAL` trong `withUndoAllowance(tx)`. `UndoService` gọi helper này ngay trước `handler.undo`, cùng transaction. Cascade đi qua cùng cờ.
  - Test grep: chuỗi `app.undo_allow` chỉ có ở helper + migration.
- **Đính chính (§4):**
  - Cột `action_log.correction jsonb` là mảng chỉ thêm `{note, by, at}`.
  - Action `action_log.add_correction`:
    - `permission: 'self'`, không tạo quyền mới; risk write; không agentGrantable; không undo.
    - Handler khoá log, chỉ nhận log `risk = send` + `succeeded`.
    - Kiểm permission của action gốc trong registry, rồi scope bản ghi gốc qua `registerCorrectionScope` do domain đăng ký (quote · order · invoice · payment · contract · appendix · conversation · campaign).
    - Log không có bản ghi gốc: chỉ người làm / người được làm thay / Owner.
  - Hiển thị:
    - Nhật ký Trợ lý: nút "Ghi đính chính" khi `correctable`, không có nút Hoàn tác; dòng đính chính trong title.
    - Cài đặt › Audit log: nhãn "Đã đính chính (n)".
  - Không tạo bản nháp tin đính chính. Đây là phần tuỳ chọn trong TIP, ghi ở DC-454 (7).
- **Contract đọc (§5):** `read-shape-contract.test.ts` chạy trên HTTP thật.
  - Mỗi route GET trong `tools/obligations/routes.json`: có schema zod chung (LIST / QUERY / DETAIL, response parse như `httpTransport.get`) hoặc có lý do (UNTYPED / UNTYPED_PARAM).
  - Route mới thiếu cả hai, hoặc đổi field DTO mà không đổi shared → đỏ.
- **Sửa lộ ra khi chạy cổng:**
  1. `TicketDrawer` xoá ô soạn sau khi gửi. Câu thứ hai gõ trong lúc chờ làm mới truy vấn bị xoá mất (E2E http tickets đỏ). Giờ chỉ xoá khi ô vẫn là câu vừa gửi.
  2. `editableFields` (form Sửa & duyệt) hiện thêm ô `if_version` tuỳ chọn, như `campaign.delete`. Đã cập nhật kỳ vọng unit.
  3. `action_log_id` vào EXEMPT của test phủ Trợ lý, kèm lý do.
  4. Test grep cờ hoàn tác bỏ qua `test/` / `e2e/` và tăng timeout: chạy song song cả bộ core thì vượt 5 giây.

**Giả định đã chọn:** DC-454.
1. Tên migration.
2. Version đề nghị tăng bằng trigger.
3. Cờ hoàn tác đặt ở `UndoService`.
4. Ba bảng không gắn trigger.
5. `row_version` agent tách khỏi `version`.
6. `permission: 'self'` + handler kiểm quyền gốc + registry scope; log không có bản ghi gốc chỉ người làm / Owner; `action_log_id` không ép uuid ở zod.
7. Đính chính hiện ở Nhật ký Trợ lý + Audit log, không bản nháp tin.
8. "Giữ bản của tôi" chỉ đóng hộp.
9. Route GET không schema chung phải có lý do.

**FILES CHANGED** (lệch manifest ở DV-126):
- **Mới:**
  - `packages/core/src/kernel/actions/{cas, undo-allowance, correction.handler}.ts`
  - `packages/core/src/sales/correction-scopes.ts`
  - `packages/actions/src/action-log.ts`
  - `packages/db/prisma/tenant/migrations/20261114040000_action_integrity/migration.sql`
  - `apps/web/src/shared/actions/StaleVersionModal.tsx`
  - `apps/web/src/features/assistant/components/CorrectionModal.tsx`
  - Test: `packages/core/test/concurrency-unit.test.ts`, `apps/api/test/integration/{concurrency, read-shape-contract}.test.ts`, `apps/api/test/integration/actions/action_log.add_correction.action.test.ts`, `apps/web/e2e/{concurrency, http/concurrency}.spec.ts`, `apps/web/src/features/settings/components/audit/AuditTable.test.tsx`
- **Sửa:**
  - Schema: `ai-agents.prisma`, `kernel.prisma`.
  - Actions: `packages/actions/src/{support, invoices, ai, index}.ts`.
  - Shared: `packages/shared/src/api/{invoices, ai, assistant, audit}.ts`.
  - Handler: `ticket-edit` / `ticket-flow` / `invoice-write` / `agent` handlers.
  - Read: `invoice-view.ts`, `agents.read.ts`, `action-logs.read.ts`, `audit-read.service.ts`.
  - Kernel: `undo.service.ts`, `actions.module.ts`, `tip-owners.ts`.
  - Module: `sales` / `contracts` / `inbox` / `marketing`.
  - Web: `useAction.ts`, `AppShell.tsx`, form ticket / đề nghị / agent, `LogColumns.tsx`, `ActionLogScreen.tsx`, `AuditTable.tsx`, type, mock (tickets-actions, commerce-edit, invoices, agents, assistant).
  - i18n: `messages/{vi,en}/{actions, assistant, settings}.json`.
  - Kỳ vọng test: `packages/core/test/{agents-ui-unit, assistant-coverage}.test.ts`.

**MIGRATION:** tenant `20261114040000_action_integrity`. Đã áp: `db:generate` → `db:migrate-tenants` (+ `-- --test`) → `db:setup` (template). Sau merge, máy khác chạy lại `db:migrate-tenants` + `db:setup`.

**TEST / NGHIỆM THU** (output thật, 2026-11-14 → 15):

| AC | Bằng chứng | Kết quả |
|---|---|---|
| 1 | `concurrency.test.ts:31,44,53,62`: ticket.update / invoice.void / agent.update song song cùng version | `[200, STALE_VERSION]`; version / row_version tăng đúng 1; `fields.version` = số mới; agent `version` xuất bản không đổi |
| 2 | `e2e/concurrency.spec.ts:12` (mock), `e2e/http/concurrency.spec.ts:34` (http) | Hộp xung đột, "Giữ bản" giữ lý do đang nhập, "Tải lại" rồi lưu thành công — mock 2/2, http 2/2 |
| 3 | `concurrency.test.ts:88` (role migrator) | UPDATE stock_movement / DELETE order_event / TRUNCATE ticket_event → lỗi trigger; `SET LOCAL` rồi ROLLBACK vẫn chặn |
| 4 | `concurrency.test.ts:111,121,136,147` | Undo xác nhận đơn, thu tiền, tạo ticket, tạo sản phẩm đều 200; sự kiện con xoá (cascade) |
| 5 | `concurrency.test.ts:160` + `action_log.add_correction.action.test.ts` (4) + unit `concurrency-unit.test.ts:110` | `audit.view` → 403; sales ngoài scope → 404; thêm 2 mục không ghi đè; log không phải send → 409; Audit log trả `corrections` (chỉ note / at) |
| 6 | `e2e/concurrency.spec.ts:42` (mock), `e2e/http/concurrency.spec.ts:62` (http, `member.invite` sau khi mua gói Team qua webhook mock) | Không có nút Hoàn tác, có "Ghi đính chính"; ghi xong dòng đính chính hiện trong nhật ký |
| 7 | `concurrency.test.ts:74,80` | ticket.close × 2 → `[200, INVALID_TRANSITION]`; order.confirm × 2 → `[200, 409]` |
| 8 | `read-shape-contract.test.ts` (92 test) + ca cơ chế `:205` | Mọi GET có schema / lý do; đổi tên `code` → issue `code: Invalid input: expected string, received undefined` |

**Cổng D59:**
- **Trước commit:**
  - typecheck shared / actions / core / db / api / web sạch.
  - lint 6 package: 0 lỗi; web có 24 cảnh báo cũ, không ở file TIP sửa.
  - Unit:
    - `@appchat/actions` 53/53, `@appchat/shared` 218/218, `@appchat/web` 590/590 (171 file) + `AuditTable.test` 1/1.
    - `@appchat/core` 1339 pass / 1 skip. Hai test có sẵn không liên quan TIP (`assistant-input-parsing` XLSX, `render-isolation` launcher) quá 5 giây khi CPU 100% (máy chạy cùng 9router, Next của dự án khác, vitest của 2 worktree). Chạy lại riêng với `--testTimeout=60000`: 17/17.
  - `pnpm depcheck`: "no dependency violations found".
  - `lint:size`: "không file nào vượt trần".
  - `lint:tokens`: "đúng thang D41".
  - `lint:masks`: "56 mask, 44 PD trong sổ, đều có căn cứ".
  - `i18n:check`: vi / en 7404 key, 100%.
- **Chốt TIP:**
  - Build `turbo build` web / api / worker: 3/3.
  - Integration theo domain TIP (16 file): concurrency, read-shape-contract, add_correction, agent.update, invoice.send_payment_qr, invoice.void, ticket.{assign, close, reopen, set_status, update}, agents, agents-ui, commerce-edit-undo, inbox-approval-cards, ticket-bulk.
    - Lần đầu 180/181: agents-ui đỏ vì kỳ vọng `if_version` trong form duyệt. Sửa kỳ vọng rồi chạy lại agents-ui 10/10.
    - Sau thay đổi Audit log: concurrency + hardening-audit 18/18, concurrency + read-shape-contract 104/104.
  - E2E mock:
    - Module TIP (concurrency, tickets, invoices, agents, assistant, action-log): 23/23.
    - Lớp dùng chung (useAction / AppShell / commerce-edit mock), các module dùng nó (quotes, orders, contracts, commerce-edit-integrity, commerce-gaps, dashboard, settings): 51/51.
    - Sau sửa: tickets + concurrency 9/9, settings + concurrency 14/14.
    - Mobile 390 skip theo cấu hình spec.
  - E2E http (`TENANT_CLIENT_CACHE=10`, desktop):
    - concurrency 2/2 (AC2 + AC6), invoices, agents 6/8 lượt đầu.
    - agents-ui: lượt đầu đỏ ở onboarding chung (`trial-welcome`, workspace provisioning chậm do cạn slot Postgres dùng chung), lượt 2 xanh.
    - tickets: đỏ thật ở "Trả lời khách", sửa `TicketDrawer`, sau đó 1/1.
  - Parity (server mock tự dựng :3417, đã tắt):

    | Màn | Diff |
    |---|---|
    | actions:log | 1,85% |
    | agents:list | 0,65% |
    | agents:builder | 1,16% |
    | invoices:list | 2,03% |
    | invoices:detail-qr | 3,22% |
    | tickets:kanban | 3,95% |
    | tickets:list | 4,58% (PAID) |
    | tickets:detail | 4,91% (PAID) |
    | settings:audit | 1,80% |
    | settings:ai-audit | 2,24% |

    - `parity --done`: 98 PASS. 6 màn FAIL đều nằm trong danh sách đỏ sẵn của dev, run 43591756291, và đều thấp hơn mức của run đó:

      | Màn | Lần này | Run 43591756291 |
      |---|---|---|
      | inbox:default | 8,14% | 9,27% |
      | inbox:folder-rail | 6,47% | 7,78% |
      | inbox:conv-menu | 6,69% | 7,52% |
      | inbox:chat-menu | 7,39% | 7,69% |
      | customers:360 | 12,87% | 14,28% |
      | calendar:create | size mismatch | size mismatch |

      Không màn nào trong số đó do TIP này sửa.
    - tickets:list (dev 5,60% → 4,58%) và tickets:detail giờ ≤ 5%.

**ĐỐI CHIẾU STANDARDS:**

| Standard | Tuân thủ (file:dòng / test) | Lệch |
|---|---|---|
| `domain/concurrency.md` §1 (version + if_version → STALE_VERSION; FE Tải lại) | `kernel/actions/cas.ts`; `ticket-edit.handlers.ts:53,82`; `ticket-flow.handlers.ts:62,92,143`; `invoice-write.handlers.ts:144,188`; `agent.handlers.ts:104`; FE `useAction.ts:114` → `StaleVersionModal.tsx:46`, `usePinnedVersion` `:34`; test `concurrency.test.ts:31–70`, E2E AC2 | — |
| `domain/concurrency.md` §7 (bảng chỉ thêm) | migration `20261114040000_action_integrity` (trigger 3 bảng × 3); `undo-allowance.ts`; `undo.service.ts:60`; test `concurrency.test.ts:88,111–156`, `concurrency-unit.test.ts:50,67,76` | Cờ ở UndoService thay executor (DV-126 (2)) |
| `domain/concurrency.md` test (song song) | `concurrency.test.ts:31,53,62,74,80` | — |
| `domain/state-machine.md` (chuyển trạng thái dưới khoá, 409 khi sai) | close / confirm song song → INVALID_TRANSITION / 409 (`:74,80`); kiểm `if_version` sau khoá dòng, trước kiểm chuyển trạng thái | — |
| `actions/action-registry.md` (defineAction, permission, risk, undo, invalidates) | `packages/actions/src/action-log.ts` (permission self, risk write, agentGrantable false, invalidates `action-logs`, không undo); handler `@ActionHandler` + `preview()`; `tip-owners.ts` `action_log: '003e'`; test `concurrency-unit.test.ts:104`, `assistant-coverage.test.ts` | — |
| `api/response-envelope.md` | 409 `{ error: { code: 'STALE_VERSION', fields: { version } } }`; đọc `{ data }` / `{ data, next_cursor }`; contract `read-shape-contract.test.ts` | — |
| `events/outbox.md` | Không thêm sự kiện mới; undo / correction chạy trong `withEventTransaction` / executor như cũ (event của action gốc không đổi) | — |
| `authz/rbac-permissions.md` | Không permission mới; add_correction kiểm quyền action gốc (`correction.handler.ts` `assertCorrectable`) + scope bản ghi qua domain (`sales/correction-scopes.ts`, `contracts.module.ts`, `inbox.module.ts`, `marketing.module.ts`); test 403 / 404 `concurrency.test.ts:167,169` | — |
| `database/tenant-db.md` | Migration tenant không `workspace_id`; `db:generate` → `migrate-tenants` (+ test) → `db:setup`; DB qua `TenantDbResolver` | Tên migration (DC-454 (1)) |
| `database/indexing.md` | Không list mới; đọc audit / action-logs giữ deferred join sẵn có (`audit-read.service.ts:59–63`) và chỉ thêm cột `correction` vào phần JOIN | — |
| `domain/validation-defaults.md` | `note` trim 1–1000; `if_version` int > 0 tuỳ chọn (`concurrency-unit.test.ts:31`) | — |
| `ui/frontend-structure.md` | Hộp xung đột ở `shared/actions`; `CorrectionModal` ở `features/assistant/components`; màn chỉ orchestrator (`ActionLogScreen.tsx` 95 dòng, `LogColumns.tsx` 132, `TicketDrawer.tsx` 208) | — |
| `ui/prototype-parity.md` / `interaction-patterns.md` | Modal antd + token; parity màn sửa < 5% (bảng trên); hộp xác nhận xung đột không tự ghi | — |
| `i18n/i18n.md` | `actions.stale.*`, `action_log.add_correction.title`, `assistant.log.correct*`, `settings.audit.corrected` vi + en; `i18n:check` 100% | — |
| `ops/observability-security.md` | Đính chính trả ra chỉ `note` + `at` (không `by` / input) — `concurrency.test.ts:184`; trigger chặn cả role migrator | — |
| `code/testing.md` §2, §4b, 2c | Test file riêng; contract đọc FE ↔ BE (`read-shape-contract.test.ts`); chỉ test phần ảnh hưởng | — |
| `workflow/git-flow-ci.md` | Nhánh `tip/003e-action-integrity`, PR `--base dev` | — |
| `domain/gap-filling.md` | DC-454 (Giả định đã chọn) | — |
| COMMERCE / 5 vai trò | Không đổi luật / quyền | — |

**SỔ:**
- DC-454, DV-126.
- COVERAGE: STD-domain-concurrency-1a / 1b / T, STD-code-testing-2c, DEF-030-3, REQ-E09c → ĐẠT. `merge.py` 1806 dòng, 0 lỗ hổng.
- GOAL-RELEASE dòng 59 → DONE.

**VIỆC CÒN LẠI:**
1. Bản nháp tin đính chính (tuỳ chọn trong §4, không tự gửi), nếu Chủ nhà muốn. DC-454 (7).
2. Sau merge, mỗi máy chạy `db:migrate-tenants` + `db:setup`.
