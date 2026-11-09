# TIP-015d — Completion Report

**STATUS:** **TIP DONE** sau pha 4 (P1 DC-391, P2 DC-392, P3 DC-393, P4 DC-394). P1 lõi server · P2 UI + đọc trạng thái · P3 thông báo hai bên + bulk + duyệt theo domain · P4 khoá gốc writer khác + ai:live + cổng chốt D59.

**MIGRATION:** tenant `20261108070000_contact_transfer` → sau merge chạy `pnpm --filter @appchat/db db:migrate-tenants` + build lại api / worker.

---

## Pha 1 — chuyển phụ trách một transaction + duyệt bắt buộc theo nguồn (§1–§4.1; AC1, AC3, AC4, AC6, AC7)

**Rà trước khi làm (code thật)**
- `contact-owner.handlers.ts` cũ đổi khách + hội thoại ngay, trả `quotes: 0, appointments: 0`; báo giá đổi sau commit qua consumer `sales.quote-owner` (đổi cả `owner_user_id` — người tạo tính doanh số); lịch hẹn không ai chuyển. Đúng như TIP mô tả.
- `owner-move.ts` gán người nhưng không bỏ agent, không tăng epoch; hoàn tác so giá trị (ABA lọt).
- `policy.ts`: agent / task write = `run`, Trợ lý = `preview` → thẻ xác nhận chạy được chuyển phụ trách (không phải duyệt D32).
- `quote.update` ghi đè `owner_user_id`; bản sửa (`request_revision`) chép owner. Vòng module Sales / Booking → Crm có thật → port phải đi qua registry kernel.

**FILES CHANGED**
- db: migration trên; `contact-transfer.prisma` (mới); `crm.prisma` (`transferGeneration`), `inbox.prisma` (`assignmentRevision`), `sales-quotes.prisma` (`assignedUserId`, `assignmentRevision`).
- actions: `define.ts` (`requiredApprovalSources`), `crm.ts` (`contact.transfer_owner`: `if_version`, output phân biệt, invalidates quotes / calendar).
- core kernel: `actions/required-approval.ts` (mới), `actions/executor.ts` (gộp luật + `noUndo`), `actions/handler.ts` (`noUndo`), `ownership/ports.ts` + `ownership/registry.ts` (mới), `index.ts` (export port).
- core crm: `ownership/{transfer.handler,transfer.service,transfer-undo,contact-lock,receipts.repo}.ts` (mới); `actions/contact-owner.handlers.ts` (facade 1 dòng, bỏ handler cũ); preview chuyển phụ trách (đếm 3 domain theo quyền module); `activities/opportunities.handlers.ts` (guard theo assigned).
- core domain: `inbox/services/ownership-port.ts`, `sales/quotes/services/ownership-port.ts`, `booking/services/ownership-port.ts` (mới) + đăng ký ở `inbox.module.ts` / `sales.module.ts` / `booking.module.ts`; `inbox/services/owner-move.ts` xoá.
- core sales: `quote-write.handlers.ts` (tạo gán `assigned`, update owner khác → 422), `quote-decide.handlers.ts` (bản sửa chép assigned), `quote-access.ts` (scope own theo assigned), `quote-system.ts` (nhắc T-2 theo assigned, bỏ `moveOpenQuotes`), `jobs/sales.jobs.module.ts` (consumer không ghi), `public.ts`.
- shared: `events.ts` (`transfer_id`, `undo` tuỳ chọn ở `contact.owner_changed`).
- web: mock `customers.ts` (kết quả phân biệt).
- test mới: `packages/actions/test/contact-transfer-policy.test.ts` (3), `packages/core/test/contact-transfer-policy.test.ts` (5), `apps/api/test/integration/contact-transfer.test.ts` (6). Sửa theo hợp đồng mới: ma trận `contact.transfer_owner`, `crm-contacts`, `quotes` (consumer cũ không ghi), fixture `record-scope` / `list-exports` / `quote.export` (thêm `assignedUserId`).

**Giả định đã chọn (gap-filling)**
- Hội thoại "ẩn" (`hidden_at`) không chuyển theo — coi như không hoạt động như lưu trữ.
- Chuyển hội thoại cho người: `auto → copilot` (như người tiếp quản 045b) — agent không còn trả lời tự động hội thoại người đã nhận; hoàn tác trả agent cũ nhưng giữ chế độ hiện tại (không bật lại auto ngầm).
- Hoàn tác về "chưa có người phụ trách" không phát `contact.owner_changed` (lược đồ cần `to`); làm mới qua event hội thoại + invalidates.
- Log `contact.transfer_owner` trước TIP (không biên nhận) → hoàn tác 409 `UNDO_NOT_SUPPORTED` (`transfer: legacy`) thay vì khôi phục theo luật cũ.

**TEST (P1)**
- `db:test-reset` → integration 14 file **120/120**: contact-transfer (6 — đếm 3 domain + biên nhận, quote owner bất biến (trigger + 422), skip / STALE_VERSION, ABA → undo 409 không khôi phục phần nào, chuyển mới hơn → undo cũ 409, port lỗi giữa chừng → rollback cả khách + hội thoại, hai lần chuyển đồng thời → 1 biên nhận), ma trận transfer_owner (Trợ lý → approval_required, UI chạy, skip không undo_until), crm-contacts, quotes, booking, crm-ui, hardening-audit, inbox, record-scope, watcher-write-denial, list-exports, insights, contact-insights, inbox-approval-cards, contact-activities, quote.export.
- core unit 734/734; actions 3/3 mới; web mock 211/211; typecheck core / actions / web; lint core sạch.
- Chưa chạy ở P1 (để cổng chốt P4): EXPLAIN 10k, E2E, parity, ai:live.

**ĐỐI CHIẾU STANDARDS (P1)**

| Standard | Kết quả |
|---|---|
| `actions/action-registry.md` | ActionDef mở rộng bằng metadata khai báo (`requiredApprovalSources`); quyền crm.reassign / agentGrantable / undo 24h giữ nguyên; output zod phân biệt |
| `authz/rbac-permissions.md` | không quyền / vai trò mới; nguồn AI luôn duyệt; scope ghi khách kiểm SAU khoá; người nhận không được thêm quan hệ; báo giá scope own theo người phụ trách vận hành |
| `domain/concurrency.md` | khoá gốc khách trước, con theo id tăng dần; if_version; revision do trigger (chống ABA); hoàn tác tất cả hoặc 409; đồng thời kiểm native |
| `domain/state-machine.md` | không đổi trạng thái báo giá / lịch hẹn / hội thoại; chỉ đổi người được gán |
| `events/outbox.md` | event ghi cùng transaction; `contact.owner_changed` chỉ là tín hiệu; consumer cũ không ghi, event cũ bỏ qua có log |
| `database/tenant-db.md` / `indexing.md` | không workspace_id; index `=` trước, range / sort sau (`quote(assigned_user_id, status, updated_at, id)`, `quote(contact_id, status, id) INCLUDE`, `appointment(contact_id, status, start_at, id)`, `conversation(contact_id, status, id)` partial); EXPLAIN 10k ở P4 |
| `api/response-envelope.md` | 409 STALE_VERSION / CONFLICT, 422 immutable, 503 port thiếu |
| `code/file-size-module-layout.md` | file mới ≤ 110 dòng; handler cũ thành facade 2 dòng; test riêng |
| COMMERCE §8b | doanh số theo người tạo — `owner_user_id` bất biến; lịch hẹn sắp tới tuỳ chọn; không đổi luật tiền |

---

## Pha 2 — đọc trạng thái + UI kết quả thật + báo giá hai người (§2.8, §3.2, §3.4, §4.4–4.5; DC-392)

**MIGRATION:** không.

**FILES CHANGED** (lệch ghi ở DV-066)
- actions: `contact-transfer.ts` (mới — `contact.transfer_status`), `index.ts`.
- shared: `api/contact-transfer.ts` (mới — DTO trạng thái), `api/index.ts`, `api/quotes.ts` (`assigned_user_id`, `assigned_name`).
- core: `crm/ownership/read.ts` + `status.handler.ts` (mới), `crm/crm.module.ts`, `crm/services/crm-read.service.ts` (`transfer()`), `kernel/actions/tip-owners.ts`; báo giá: `quote-view.ts`, `quotes-read.service.ts` (tên người phụ trách), `repos/quotes.repo.ts` (lọc `assignedId`).
- api: `http/crm/contact-activities.controller.ts` (GET transfers), `http/sales/quotes.controller.ts` (`assigned_user_id`).
- web: `customers/hooks/useContactTransfer.ts` + `components/TransferResult.tsx` + `styles/transfer-result.styles.ts` (mới); `TransferOwnerModal.tsx`, `BulkTransferModal.tsx` (kết quả thật, Dừng); `_crm-forms/ContactFormHost.tsx` (version); báo giá: `types.ts`, `api.ts`, `QuotesToolbar.tsx` (lọc Phụ trách hiện tại), `QuoteFormModal.tsx` (Người báo giá khoá khi sửa), `OverviewTab.tsx` (Phụ trách hiện tại); mock `quotes.ts` / `quotes-actions.ts` (assigned, owner bất biến); i18n vi + en (`customers`, `quotes`, `actions`).
- test mới: `useContactTransfer.test.tsx` (3), `e2e/contact-transfer.spec.ts` (2), ma trận `contact.transfer_status` (3), `contact-transfer.test.ts` +1 (trạng thái HTTP / action, phân trang, 403 / 404 / 400, DTO + bộ lọc báo giá).

**Giả định đã chọn (gap-filling)**
- Danh sách báo giá giữ cột "Người BG" = người tạo (prototype); người phụ trách hiện tại chỉ hiện ở Tổng quan khi khác người tạo + bộ lọc riêng — không thêm cột mới vào bảng prototype.
- Hộp chuyển một khách: chuyển thật / bỏ qua → đóng (toast + Hoàn tác như cũ); chờ duyệt / lỗi → giữ hộp với kết quả (người dùng tự đóng).

**TEST (P2)**
- Integration: contact-transfer 7/7, ma trận transfer_status 3/3, quotes + list-exports + quote.export + quote.update 33/33.
- turbo lint / typecheck / test `...[origin/dev]` 36/36; web unit hook 3/3; i18n 100% (6552); lint:size, lint:tokens pass; depcheck không lỗi mới.
- E2E mock: contact-transfer 2/2; customers + quotes 15/15 (+15 skip bản thiết bị khác).

---

## Pha 3 — duyệt theo domain + thông báo hai bên + chuyển hàng loạt (§1.3, §2.6, §5; AC7, AC9; DC-393)

**MIGRATION:** không (bảng `contact_transfer_notice` đã có từ P1).

**Rà trước khi làm (code thật)**
- `/approvals` + thẻ duyệt Hộp thư lọc theo `approvals.decide` + permission action gốc — người có quyền duyệt thấy mọi yêu cầu chuyển phụ trách, kể cả khách ngoài scope (lộ tên / ghi chú trong input).
- `ownerChangedNotify` chỉ báo người nhận, bỏ qua khi người làm = người nhận, ghi tên khách vào tiêu đề + link bền trong `notification` → người mất scope vẫn đọc được tên khách trong lịch sử / email.
- Chưa có action chuyển hàng loạt phía server (UI P2 gọi từng khách).

**FILES CHANGED** (lệch ghi ở DV-067)
- actions: `contact-transfer.ts` (`contact.transfer_owner_bulk`).
- core ai: `approvals/domain-authorization.ts` (mới), `approvals.read.ts` (id chọn bằng SQL có vị từ trước LIMIT), `approval.handlers.ts` + preview (404 / 403 theo domain, checkInput khi sửa), `resume.ts` (người duyệt còn quyết được); inbox `approvals/conversation-approvals.ts`.
- core crm: `ownership/approval-projection.ts`, `ownership/bulk-transfer.handler.ts`, `events/ownership.rules.ts` (mới); `crm.module.ts` (hook + handler), `jobs/crm.jobs.module.ts` (kind), `ownership/transfer.handler.ts` (bỏ thông báo cũ), `services/crm-notify.ts`.
- core notify: `services/ownership-notice.ts` (mới), `services/notifier.ts`, `services/notifications.service.ts`, `jobs/notify-mail.processor.ts`, `jobs/notify.jobs.module.ts`, `rules.ts`, `events/domain.rules.ts`; `kernel/actions/tip-owners.ts`.
- api: `http/notify/notify.controller.ts` (chiếu theo quyền người gọi).
- shared: `i18n/server/{vi,en}/notify.ts` (biến thể `crm_owner` to / from / generic). web: `messages/{vi,en}/actions.json`.
- test mới: core `ownership-notice.test.ts` (7), `contact-transfer-approval-read.test.ts` (5); api `contact-transfer-approval-read.test.ts` (3), ma trận `contact.transfer_owner_bulk` (5). Sửa: core `inbox-approval-cards.test.ts`, api `crm-ui.test.ts`.

**Giả định đã chọn (gap-filling)**
- Yêu cầu duyệt hàng loạt chỉ hiện khi người xem thấy MỌI khách trong yêu cầu (một khách ngoài scope → ẩn cả yêu cầu) — không chiếu từng phần để khỏi lộ số lượng / tên khách khác.
- Input duyệt hỏng (dữ liệu cũ / sửa tay) ẩn với cả Owner — đóng khi lỗi.
- Hoàn tác chuyển phụ trách không phát thông báo hai bên (đã có toast + timeline cho người làm); phân bổ tự động (lead routing, không biên nhận) giữ không thông báo như trước.
- Xem trước bulk không kiểm người nhận; kiểm ở bước chạy (422 `to_user_id: not_member`).

**TEST (P3)**
- `db:test-reset` → integration 14 file: contact-transfer-approval-read 3/3, contact-transfer, crm-ui, notify, digest, inbox-approval-cards, ai-runtime-lineage, agents-ui, ma trận approval.approve / edit_and_approve / reject / contact.transfer_owner / transfer_status / conversation.approvals — **63 pass, 6 skip**; ma trận `contact.transfer_owner_bulk` 5/5.
- core unit: ownership-notice 7/7, contact-transfer-approval-read 5/5, inbox-approval-cards 3/3; turbo lint / typecheck / test `...[origin/dev]` **36/36**.
- i18n 100% (6554); lint:size pass; depcheck không lỗi mới. E2E mock contact-transfer + customers 10/10 (+10 skip bản thiết bị khác).
- `assistant-vertical` (mục lục ma trận): đỏ sẵn trên `origin/dev` với action của TIP chưa làm (product.export 027, invoice.export 032, workspace.* 013, transfer.* 038b) — không do P3; action mới của P3 có file ma trận.

**ĐỐI CHIẾU STANDARDS (P3)**

| Standard | Kết quả |
|---|---|
| `authz/rbac-permissions.md` | không quyền / vai trò mới; hàng duyệt + thông báo theo scope HIỆN TẠI (đọc để thấy, ghi để quyết); 404 không lộ tồn tại, 403 khi thấy mà không được quyết |
| `actions/action-registry.md` | action bulk zod in / out, crm.reassign, bulk preview kèm số bản ghi, agentGrantable false, requiredApprovalSources; công thức con dùng chung service với action đơn |
| `events/outbox.md` | event chỉ mang id lần chuyển; dòng thông báo + binding cùng transaction; id tất định chống phát lại; mail job chỉ mang id thông báo |
| `ops/observability-security.md` | không PII trong outbox / mail job / tiêu đề gốc; chiếu lại trước khi gửi email |
| `domain/concurrency.md` | bulk: mỗi khách khoá gốc riêng, SAVEPOINT ≤ 50, data_job biên nhận + transaction mỗi khách > 50 |
| `database/indexing.md` | vị từ duyệt dùng PK contact + `contact_collaborator (user_id, contact_id) INCLUDE (role)`; binding tra theo PK notification_id; EXPLAIN 10k ở P4 |
| `i18n/i18n.md` | biến thể trong `crm_owner` (vi + en), không namespace mới; nhãn action vi + en |
| `code/file-size-module-layout.md` | file mới ≤ 110 dòng; test riêng |

---

## Pha 4 — khoá gốc writer khác + benchmark / EXPLAIN + ai:live + chốt TIP (§2.3, §2.5; AC3, AC5, AC10; DC-394)

**MIGRATION:** không (P1 `20261108070000_contact_transfer` là migration duy nhất của TIP).

**Rà trước khi làm (code thật)**
- Writer khác (gán hội thoại đơn / hàng loạt / hoàn tác, tạo báo giá, đặt lịch, gửi email, gửi chứng từ mở chuỗi email, pipeline tin vào) khoá dòng con hoặc không khoá → xen được giữa lúc chuyển phụ trách đọc ứng viên và ghi, đọc người phụ trách cũ trước khoá.
- Biên nhận 10k dòng qua `createMany` 3,5 s → một lần chuyển khách lớn vượt trần transaction 5 s → 500, rollback (bắt được nhờ benchmark).

**FILES CHANGED** (lệch ghi ở DV-068)
- core: `kernel/ownership/root-lock.ts` (mới); `sales/quotes/quote-access.ts`, `booking/booking-access.ts`, `booking/actions/{appointment-book,appointment-flow}.handlers.ts`, `booking/actions/appointment-update.handler.ts`, `inbox/actions/{conversation-assign,bulk-update,email-send}.handlers.ts` (bulk-update.handler), `inbox/bulk/bulk-undo.ts`, `inbox/jobs/inbox-bulk.processor.ts`, `inbox/services/pipeline.ts`, `sales/quotes/actions/quote-write.handlers.ts`, `sales/quotes/services/quote-send.ts`; `crm/ownership/receipts.repo.ts` (INSERT unnest), `crm/ownership/read.ts` (lần mới nhất); `ai/assistant/catalog.ts`.
- actions: `contact-transfer.ts` (`transfer_id` tuỳ chọn), `crm.ts` (mô tả `contact.update` / `transfer_owner`).
- ai-live: `ctransfer-judge.ts` (mới), `cases.ts`, `cli.ts`, `runner.ts`; `fixtures/ai-eval/contact-transfer/{cases.json,seed.mjs}`.
- test mới: core `contact-root-lock.test.ts` (4); api `contact-transfer-concurrency.test.ts` (4 — barrier writer khác, đua gán / chuyển, EXPLAIN + benchmark); e2e http `contact-transfer.spec.ts`; ma trận `contact.transfer_status` +1 (lần mới nhất).

**Giả định đã chọn (gap-filling)**
- Writer con đổi khách trong lúc chờ khoá → 409 CONFLICT (người gọi thử lại), không tự khoá khách thứ hai.
- `conversation.bulk_update` chỉ khoá gốc khi lô đổi người được gán (đổi trạng thái / thẻ không đụng người phụ trách).
- Ngân sách một lần chuyển 4,5 s (dưới trần 5 s của transaction tương tác) — đo 2,2 s cho 10k bản ghi trên máy dev.

**TEST (cổng chốt D59)**
- `db:test-reset` → integration 29 file **173/173**: contact-transfer, contact-transfer-concurrency, contact-transfer-approval-read, crm-ui, crm-contacts, quotes, booking, appointment-update, email, inbox, inbox-bulk-results, inbox-approval-cards, notify, digest, record-scope, list-exports + ma trận contact.transfer_owner / transfer_status / transfer_owner_bulk / approval.* / conversation.assign / bulk_update / quote.create / send / update / appointment.create / contact.send_email.
- EXPLAIN (30k dòng rải 1.000 khách): ứng viên hội thoại `conversation_contact_id_idx`, báo giá `quote_contact_idx`, lịch hẹn `appointment_open_start_idx` — không Seq Scan (`.data/gate/015d-p4-explain.txt`). Benchmark một khách 10k bản ghi: **2.189 ms**.
- turbo lint / typecheck / test `...[origin/dev]` **36/36**; core unit root-lock 4/4; build api + worker, `pnpm check:bundle` OK.
- E2E mock contact-transfer + customers + quotes + inbox + calendar **35/35** (+33 skip bản thiết bị khác); E2E http contact-transfer **1/1** (backend thật: mời Sales, chuyển qua UI, DB + báo giá + thông báo).
- Parity (mock, 1440×900): customers:table 0,99% · customers:edit 1,30% · customers:360 3,39% · quotes:list 2,38% · quotes:editor 1,80% · quotes:detail 4,00% — đều ≤ 4,2%.
- i18n 100% (6554); lint:size / lint:tokens pass.
- **AI LIVE (AC10)** — `reports/ai-live-contact-transfer-2026-11-08.md`: model thật 9router, stack riêng cổng 4617, Redis DB 14, DB test; 8 ca × 3 lượt → **8/8 ca ĐẠT (22/24 lượt), 0 vi phạm an toàn**. Vòng đầu 3/8 (model dùng `contact.update` đổi người phụ trách — server chặn 403, đọc trạng thái bằng xuất lịch sử) → từ khoá `find_actions` + mô tả action + `transfer_status` không cần id → 8/8. Hai lượt trượt trong vòng chính thức: hỏi doanh số không nêu "người tạo" (1/3), model gửi hai lần yêu cầu duyệt rồi người chấm đọc trước khi hàng duyệt cập nhật (1/3) — không phải vi phạm an toàn.
- Zalo / SePay / Brevo: không cần cho TIP này. **Chưa nghiệm thu với provider thật:** không — LLM 9router thật đã chạy.
- `assistant-vertical` (mục lục ma trận) đỏ sẵn trên `origin/dev` với action của TIP chưa làm (027 / 032 / 013 / 038b) — ngoài phạm vi.

**ĐỐI CHIẾU STANDARDS (P4 + chốt TIP)**

| Standard | Kết quả |
|---|---|
| `domain/concurrency.md` | khoá gốc khách trước con ở mọi writer liên quan; bulk khoá mọi gốc một câu id tăng dần; đọc lại sau khoá; con đổi khách → 409; barrier + đua kiểm native |
| `database/indexing.md` | ứng viên 3 domain đi index `contact_id` (EXPLAIN 30k); biên nhận ghi set-based (unnest); không N+1 |
| `actions/action-registry.md` | `transfer_status` input mở rộng tương thích; mô tả action hướng model đúng action (không lách duyệt) |
| `ai/eval.md` / `ai/agent-gateway.md` | ai:live 8 ca 3 lượt, ca đạt ≥ 2/3, an toàn 8/8; chấm theo DB, không theo câu trả lời |
| `authz/rbac-permissions.md` | không đổi quyền; Trợ lý luôn qua duyệt (ai:live ct-no-bypass, ct-assistant-approval) |
| `ui/prototype-parity.md` | 6 màn liên quan ≤ 4,0% |
| `code/file-size-module-layout.md` | file mới ≤ 220 dòng; test riêng |
| `workflow/git-flow-ci.md` | nhánh `tip/015d-contact-transfer-p4` xếp chồng #133; PR vào dev |

