# TIP-015f — Completion Report

**STATUS:** ĐANG LÀM — 5 / 6 pha. P1 DC-397 (xoá mềm / khôi phục / thùng rác, 7 port, PR #137); P2 DC-398 (danh tính khách đã xoá, tin vào, hàng rào AI, PR #138); P3 DC-399 (biên nhận đơn sàn bị chặn, payload runtime, PR #139); P4 DC-400 (khoá khách gốc ở writer tạo mới, hoàn tác tạo / nhập = xoá mềm, PR #140); P5 DC-401 (UI thùng rác + panel khách đã xoá + mock). Còn: P6 làm mới realtime theo event vòng đời + E2E http + xác minh native + ai:live 8 ca.

**MIGRATION:** tenant `20261108090000_contact_lifecycle` (P1) + `20261108100000_blocked_external_order` (P3) → sau merge chạy `pnpm --filter @appchat/db db:migrate-tenants` + build lại api / worker. (Manifest ghi `20261102001560_…` — đổi tên theo thứ tự chuỗi migration, DV-071.)

---

## Pha 1 — xoá mềm có biên nhận thế hệ, phụ thuộc qua 7 port, khôi phục 30 ngày, thùng rác theo scope (§1–§2, §5.3; AC1 lõi, AC6) — DC-397, DV-071

**Rà trước khi làm (code thật)**
- `ContactDeleteHandler` cũ (trong `contact-write.handlers.ts`, file quá trần) chỉ đặt `deleted_at`, không kiểm phụ thuộc, không biên nhận / hạn; undo đặt lại `deleted_at = null` không kiểm quyền hiện tại / trùng SĐT.
- Không có thế hệ vòng đời: xoá → khôi phục → xoá lại thì undo log đầu khôi phục nhầm lần xoá sau.
- Không có thùng rác / action khôi phục; hội thoại của khách đã xoá vẫn để lượt AI chạy tiếp.
- Khách gộp (`merged_into_id`) là họ khách — xoá gốc phải khoá cả nguồn.

**FILES CHANGED** (lệch manifest ghi ở DV-071)
- db: migration trên (`lifecycle_revision` + trigger `contact_lifecycle_guard`, enum `contact_lifecycle_state`, bảng `contact_lifecycle_receipt`, index một phần thùng rác + index phụ thuộc, backfill legacy); `crm.prisma`, `contact-lifecycle.prisma` (mới).
- core kernel / composition: `kernel/contact-lifecycle/{ports,registry,sql}.ts`, `composition/contact-lifecycle.module.ts` (mới); 7 port domain (sales, contracts, inbox, booking, support, loyalty, marketing).
- core CRM: `crm/lifecycle/*` (10 file mới); `contact-write.handlers.ts` → facade; preview cũ gỡ; `crm.module.ts`, `crm/public.ts`, `index.ts`.
- actions: `contact-lifecycle.ts` (mới — `contact.restore`, `contact.deleted_list`); `crm.ts` (`contact.delete` nhận `if_version`, output biên nhận); `index.ts`.
- shared: `api/contact-lifecycle.ts` (mới), `api/index.ts`, `events.ts` (`contact.deleted`, `contact.restored`).
- api: `contacts.controller.ts` (`GET /contacts/deleted` trước `contacts/:id`), `app.module.ts`; worker: `worker.module.ts`.
- web: i18n `actions.json` vi / en (tiêu đề 2 action); mock `contact.delete` cùng hình kết quả.
- test mới / sửa: api ma trận `contact.delete` (4, viết lại), `contact.restore` (5), `contact.deleted_list` (6, gồm EXPLAIN); core `contact-lifecycle.test.ts` (6).

**Giả định đã chọn (gap-filling)**
- Mức chặn: đơn mở, công nợ còn lại (sent / partial / overdue và còn phải thu), hoá đơn nháp, đề nghị thanh toán / hoàn tiền đang chờ, hợp đồng chưa đóng → `block`; còn lại (đơn đã đóng, báo giá, liệu trình, hội thoại, lịch hẹn, ticket, điểm, người nhận chiến dịch) → `warn`.
- 409 HAS_DEPENDENCIES chỉ trả số đếm theo loại (không id / tiền / tên) — không phụ thuộc người xem thấy được gì.
- Undo log `contact.delete` = khôi phục với quyền HIỆN TẠI (crm.delete + scope ghi), không hồi sinh quyền đã mất; log trước 015f → 409.
- Khôi phục bị chặn khi có khách sống trùng `phone_norm` — trả `phone: taken`, không lộ khách kia.
- Mã thao tác biên nhận = `contact.delete:<Idempotency-Key>` (gọi lặp cùng khoá → cùng biên nhận).

**TEST (cổng khi làm — D59)**
- `db:test-reset` → integration native: `contact.delete` 4/4, `contact.restore` 5/5, `contact.deleted_list` 6/6 (EXPLAIN `contact_deleted_recent_idx` / `contact_deleted_owner_idx`, không Seq Scan); hồi quy `crm-contacts`, `watcher-write-denial`, `genui` 21/21.
- `assistant-vertical` mục lục ma trận: đỏ có sẵn — 11 action của TIP 027 / 032 / 013 / 038b chưa có file ma trận (không có action nào của 015f; 3 action 015f đều có file).
- core unit 126 file 767/767 (gồm `contact-lifecycle.test.ts` 6/6); actions 18/18; shared 146/146; api 11/11; worker 7/7; ai 70/70; web 442/442.
- turbo lint / typecheck core / api / worker / actions / shared / db 12/12; build api + worker, `pnpm check:bundle` OK; `pnpm depcheck` 0 lỗi mới.
- E2E mock customers 8/8. i18n 100% (6575).

**ĐỐI CHIẾU STANDARDS (P1)**

| Standard | Kết quả |
|---|---|
| `domain/concurrency.md` | khoá họ khách id tăng dần FOR UPDATE, đọc lại sau khoá, thử lại có giới hạn → 409; `if_version` sau khoá |
| `domain/state-machine.md` | sống ↔ đã xoá chỉ qua dịch vụ vòng đời; thế hệ +1 mỗi lần lật (trigger chặn nhảy / lùi); biên nhận deleted → restored / expired |
| `authz/rbac-permissions.md` | crm.delete + scope GHI qua người phụ trách / nhóm; collaborator / watcher không đủ; không thấy → 404, thấy mà không đủ → 403; action không cấp agent |
| `database/indexing.md` | index một phần `(deleted_at DESC, id DESC) INCLUDE …` và `(owner_user_id, deleted_at DESC, id DESC)`; seek cursor; deferred join; EXPLAIN native |
| `database/tenant-db.md` | DB tenant qua resolver; không `workspace_id`; scope áp trước phân trang |
| `actions/action-registry.md` | action mới có zod input / output, quyền, risk, invalidates; ma trận một file mỗi action |
| `api/response-envelope.md` | `{ data, next_cursor }`; 409 HAS_DEPENDENCIES / STALE_VERSION / INVALID_STATE / CONFLICT; 503 thiếu port; 400 cursor hỏng |
| `events/outbox.md` | `contact.deleted` / `contact.restored` cùng transaction (undo ghi outbox trong tx) |
| `i18n/i18n.md` | vi + en, không tuần tự lại JSON |
| `code/file-size-module-layout.md` | file mới ≤ 120 dòng; file quá trần chỉ còn facade; test file riêng |

---

## Pha 2 — danh tính khách đã xoá, tin vào giữ nhưng không làm giàu CRM, hàng rào AI, dấu Hộp thư (§3.1–§3.3, §4.1–§4.3; AC3, AC5 lõi) — DC-398, DV-072

**Rà trước khi làm (code thật)**
- `matchIdentity` coi khách gốc đã xoá như không có identity → rơi sang SĐT → `resolve` TẠO khách mới và `upsert` gắn lại identity sang khách mới (mất liên kết cũ, khách đã xoá "tái sinh").
- Pipeline đọc khách không xét `deleted_at`: hội thoại mới gán người phụ trách / nhóm / agent mặc định theo hồ sơ CRM; VIP + tiêu đề lấy tên CRM; `agentReply` vẫn bật.
- `buildReplyContext` nạp hồ sơ + ghi nhớ không xét xoá; `finishResumedTurn` lấy epoch mới (không so epoch lượt gốc).
- `importExternal` dùng cùng `resolve` → đơn sàn của người mua đã xoá tạo khách + đơn mới.
- DTO hội thoại không có dấu vòng đời khách.

**FILES CHANGED** (lệch manifest ở DV-072)
- core: `crm/lifecycle/identity-state.ts` (mới); `crm/services/identity-match.ts`, `identity.service.ts`; `inbox/services/pipeline.ts`, `read.service.ts`, `view.ts`; `ai/reply/reply-context.ts`, `reply.service.ts`; `sales/orders/services/order-import.ts`.
- shared: `api/inbox.ts` (`contact_deleted`), `events.ts` (`message.received.contact_deleted`).
- test mới: core `contact-lifecycle-identity.test.ts` (3); api `contact-lifecycle-inbound.test.ts` (5).

**Giả định đã chọn (gap-filling)**
- Hội thoại MỚI của khách đã xoá vẫn gắn id khách cũ (giữ liên kết lịch sử) nhưng vào hàng chung: không người phụ trách / nhóm / agent.
- Tiêu đề hội thoại của khách đã xoá = tên người gửi theo kênh / "Khách" (tên người gửi trong tin là lịch sử tin, không phải hồ sơ CRM).
- Đơn sàn mới của người mua đã xoá: chưa có bảng biên nhận chặn → fail closed 409 cho lô (nguồn giữ để thử lại, không mất đơn) — biên nhận bền làm ở P3.

**TEST (cổng khi làm — D59)**
- Integration native: `contact-lifecycle-inbound` 5/5; ma trận `contact.delete` / `contact.restore` 9/9; hồi quy channel-sync-policy, hardening-takeover, inbox-ui, lead-routing (+ contract), inbox, inbox-vertical-context, inbox-assignees, orders, webchat — xanh; `agent-reply` 13/14 — ca A→B→A đỏ có sẵn (đã kiểm khi gỡ thay đổi `ai/reply` vẫn đỏ) → Q-059.
- core unit `contact-lifecycle-identity` 3/3 + `channel-sync-identity` 2/2; turbo lint / typecheck / test core / shared / api / worker / web xanh; build api + worker, `check:bundle` OK; depcheck 0 lỗi.
- E2E mock inbox 11/11.

**ĐỐI CHIẾU STANDARDS (P2)**

| Standard | Kết quả |
|---|---|
| `channels/omnichannel-adapter.md` | tin vào luôn lưu đúng một lần (chống trùng sẵn có); không tạo khách / gắn lại identity cho khách đã xoá |
| `domain/concurrency.md` | đọc trạng thái khách SAU `lockContactRow` (xoá / khôi phục tuần tự với tin vào) |
| `ai/agent-gateway.md` | không kích agent / không nạp ngữ cảnh CRM của khách đã xoá; chạy tiếp sau duyệt bỏ qua; rào epoch giữ nguyên ở ghi tin + đặt chỗ gửi |
| `authz/rbac-permissions.md` | không đổi quyền; Hộp thư giữ lịch sử theo quyền Hộp thư |
| `api/response-envelope.md` | DTO thêm trường tuỳ chọn; đơn sàn 409 CONFLICT `contact: deleted / unavailable` |
| `events/outbox.md` | `message.received` thêm cờ tuỳ chọn, không đổi topic |
| `code/file-size-module-layout.md` | file mới 35 dòng; pipeline 230, reply.service 325 dòng |

---

## Pha 3 — biên nhận đơn sàn bị chặn, hợp đồng payload runtime, sync_now báo riêng (§3.4–§3.7; AC4) — DC-399, DV-073

**Rà trước khi làm (code thật)**
- `ExternalOrder` chỉ là interface; adapter mock `JSON.parse` thẳng — payload không được kiểm (số thực / chuỗi tuỳ ý vào thẳng `BigInt`, `Number`).
- `importBatch` không bắt lỗi từng đơn: một đơn hỏng làm hỏng cả kết nối, `failed` đếm theo KẾT NỐI; `order.sync_now` bỏ `failed`.
- Sau P2, đơn của người mua đã xoá → 409 cho cả lô (an toàn nhưng không có biên nhận / không thử lại).

**FILES CHANGED** (lệch manifest ở DV-073)
- db: migration `20261108100000_blocked_external_order`; `sales-orders.prisma` (enum `BlockedOrderState` / `BlockedOrderReason`, model `BlockedExternalOrder`).
- core: `sales/orders/services/{external-order-payload,blocked-imports}.ts` (mới); `order-import.ts` (biên nhận khi chặn, `settleBlocked` khi tạo đơn); `order-sync.ts` (kiểm từng đơn, đếm, cursor / processedAt không tiến qua lỗi, thử lại pending); `order-sync.handler.ts`.
- actions: `orders.ts` (`order.sync_now` output imported / blocked / failed).
- web: `OrdersToolbar.tsx` (thông báo đếm riêng), mock `orders-actions.ts`, i18n `orders.json` vi / en (`syncedCounts`).
- test mới: core `contact-lifecycle-payload.test.ts` (3); api `contact-lifecycle-blocked-import.test.ts` (4).

**Giả định đã chọn (gap-filling)**
- qty tối đa 1.000.000 / dòng (spec chỉ ghi "trong biên action đơn" — action đơn không có trần; chọn trần rộng để không chặn đơn thật).
- Thử lại biên nhận chạy cuối mỗi lần kéo thành công của kết nối (poll / sync_now), lô 100; không thử lại trong transaction khôi phục.
- Đơn bị chặn KHÔNG giữ cursor (đã có biên nhận bền); chỉ đơn hỏng / lỗi ghi giữ cursor.

**TEST (cổng khi làm — D59)**
- `db:test-reset` → integration native: `contact-lifecycle-blocked-import` 4/4 (một biên nhận khi giao lại; mới hơn thay / cũ hơn bỏ qua / cùng mốc khác hash → conflict; đơn hỏng → failed + sự kiện chưa xử lý; khôi phục → đúng một đơn từ payload mới nhất); hồi quy orders, commerce-attribution, contact-lifecycle-inbound — 30/30.
- core unit `contact-lifecycle-payload` 3/3; `turbo lint typecheck test --filter="...[origin/dev]"` 36/36; build api + worker, `check:bundle` OK; depcheck 0 lỗi; lint:size OK; i18n 100% (6576).
- E2E mock orders 7/7.

**ĐỐI CHIẾU STANDARDS (P3)**

| Standard | Kết quả |
|---|---|
| `integrations/provider-ports.md` | payload sàn kiểm runtime trước mọi ghi; không đổi port / adapter; không bịa event id cho poll |
| `domain/money-time-numbering.md` | tiền chuỗi số nguyên VND, không qua số thực; thời điểm ISO có múi giờ, so theo UTC |
| `domain/validation-defaults.md` | biên kích thước / độ dài / số dòng; trường lạ từ chối; lỗi che giá trị |
| `database/indexing.md` | unique (kết nối, mã ngoài); index thử lại (kết nối, trạng thái, received_at, id), lấy id trước rồi payload |
| `ops/observability-security.md` | payload không vào log / action log / lỗi / last_error (chỉ mã lý do) |
| `actions/action-registry.md` | output `order.sync_now` thêm trường có mặc định, không đổi quyền |
| `i18n/i18n.md` | vi + en, không tuần tự lại JSON |
| `code/file-size-module-layout.md` | file mới ≤ 75 dòng; order-sync 140, order-import 175 dòng |

---

## Pha 4 — khoá khách gốc ở writer tạo nghiệp vụ mới, hoàn tác tạo / nhập không xoá cứng (§2.5, §2.8, §5.1–§5.2; AC2 lõi, AC7) — DC-400, DV-074

**Rà trước khi làm (code thật)**
- `checkParties` / `checkContractParties` / `writableParent` / ghi nhớ / đề nghị thanh toán: chỉ `editableContact` (đọc không khoá) → xoá khách và tạo chứng từ chạy song song có thể lọt (đọc "còn sống" trước khi xoá commit).
- Báo giá → đơn / hợp đồng, đơn từ hợp đồng / lịch hẹn, gia hạn: khoá chứng từ con trước, không khoá khách.
- `contact.create` / `contact.import` undo = `tx.contact.deleteMany` (xoá cứng, mất biên nhận / dữ liệu; không kiểm quan hệ sau đó).

**FILES CHANGED** (lệch manifest ở DV-074)
- core: `crm/lifecycle/create-undo.ts` (mới); `crm/actions/contact-write.handlers.ts`, `contact-io.handlers.ts` (biên nhận tạo + undo xoá mềm); `kernel/ownership/root-lock.ts`; `sales/quotes/services/{quote-write,conversion-lock}.ts`; `sales/orders/actions/{order-create.handlers,order-from-appointment.handler}.ts`; `contracts/services/contract-write.ts`; `contracts/actions/contract-write.handlers.ts`; `sales/payments/actions/invoice-write.handlers.ts`; `crm/activities/authority.ts`; `crm/memory/handlers.ts`.
- test: api `contact-lifecycle.test.ts` (mới, 3); ma trận `contact.create` (+ ca có quan hệ / bị sửa → 409), `contact.import` (xoá mềm).

**Giả định đã chọn (gap-filling)**
- "Nguyên trạng" = đúng `version` lúc tạo (mọi sửa sau đó làm hoàn tác 409) + không quan hệ nào qua 7 port + ghi chú CRM khớp đúng tập lúc tạo.
- Đề nghị thanh toán đi theo đơn vẫn yêu cầu khách sống (tạo đề nghị mới là nghiệp vụ mới — §2.7); thu / hoàn tiền chứng từ có sẵn không đổi ở pha này.

**TEST (cổng khi làm — D59)**
- Integration native: `contact-lifecycle` 3/3 (8 writer → 404 sau xoá; khôi phục → tạo lại được; xoá ↔ tạo đơn 4 vòng không có đơn mở trên khách đã xoá); ma trận `contact.create` / `contact.import` xanh; hồi quy booking, commerce-*, contact-memory, contract-files, contracts, orders, payments, quotes, record-scope, watcher-write-denial, crm-contacts, crm-settings, contact-activities, contact-activity-transfer, contact-edit-version, ai-tasks, data-transfer (+ assistant) — xanh (crm-contacts AC2 / crm-settings AC11 sửa kỳ vọng xoá cứng → xoá mềm). E2E mock customers 8/8; build api + worker, `check:bundle` OK; `turbo lint typecheck test --filter="...[origin/dev]"` 36/36.
- core unit 773/773; api unit 11/11; lint / typecheck core + api xanh.

**ĐỐI CHIẾU STANDARDS (P4)**

| Standard | Kết quả |
|---|---|
| `domain/concurrency.md` | khách → báo giá / hợp đồng / lịch hẹn → đơn → đề nghị; đọc lại sau khoá; tranh chấp xoá ↔ tạo đơn kiểm thật |
| `domain/state-machine.md` | hoàn tác tạo đi qua dịch vụ vòng đời (deleted, biên nhận), không xoá dòng |
| `authz/rbac-permissions.md` | hoàn tác tạo cần crm.delete + quyền xoá hiện tại (không chỉ quyền action gốc) |
| `events/outbox.md` | hoàn tác ghi `contact.deleted` cùng transaction |
| `actions/action-registry.md` | không đổi khai báo action; `after` mang biên nhận tạo |
| `code/file-size-module-layout.md` | file mới 70 dòng; file sửa ≤ 224 dòng |

---

## Pha 5 — UI thùng rác khách, panel khách đã xoá ở Hộp thư, mock kịch bản (§4.4, §5.3–§5.4; AC8 mock) — DC-401, DV-075

**Rà trước khi làm (code thật)**
- Màn Khách hàng không có lối xem / khôi phục khách đã xoá; xoá chỉ có hoàn tác trong cửa sổ toast.
- Hộp thư mở Hồ sơ 360° theo `contact_id` bất kể khách đã xoá (nút báo giá / lịch hẹn / chia sẻ từ hồ sơ cũ).
- Mock `contact.delete` chỉ bật cờ `deleted`, không mốc / hạn.

**FILES CHANGED** (lệch manifest ở DV-075)
- web customers: `components/DeletedContactsDrawer.tsx`, `hooks/useDeletedContacts.ts` (+ `.test.tsx`), `styles/trash.styles.ts` (mới); `CrmHeaderActions.tsx` (nút "Đã xoá"), `CrmOverlays.tsx`, `crm-store.ts` (`modal = 'trash'`).
- web inbox: `components/DeletedContactPanel.tsx` (mới); `screens/InboxScreen.tsx`, `types.ts` (`contact_deleted`).
- mock: `domains/contact-lifecycle.ts` (mới), `domains/customers.ts` (mốc xoá / hạn), `domains/inbox.ts` (`?inbox=deleted_contact`), `routes.ts`, `handlers.ts`.
- i18n: `customers.json` (`trash.*`), `inbox.json` (`deletedContact.*`) vi + en.
- e2e: `e2e/contact-lifecycle.spec.ts` (4 ca desktop).
- prototype DEVIATIONS: mục TIP-015f (mở rộng chức năng).

**Giả định đã chọn (gap-filling)**
- Nút "Đã xoá" là nút chỉ-icon ẩn < md như các nút phụ khác (mobile vào qua Trợ lý / màn rộng).
- Panel khách đã xoá thay toàn bộ khối 360° (không giữ tab nào của hồ sơ cũ) — đơn giản và chắc chắn không lộ dữ liệu CRM cũ.

**TEST (cổng khi làm — D59)**
- web unit 445/445 (gồm `useDeletedContacts` 3/3); lint / typecheck web xanh; lint:size / lint:tokens OK; i18n 100%.
- E2E mock `contact-lifecycle` 4/4 (xoá → thùng rác → khôi phục; quá hạn không nút; Sales không thấy nút; khung 390 không tràn; Hộp thư panel khách đã xoá); `customers` + `inbox` 19/19.
- Parity (mock 1440×900, bản build mới): customers:table 1,44% · customers:kanban 4,04% · inbox:default 4,70% (≤ trần sổ 5,6%). Nút "Đã xoá" là nút chỉ-icon để thanh đầu màn giữ một dòng (bản chip có chữ đẩy thanh xuống 2 dòng → kanban 10%).

**ĐỐI CHIẾU STANDARDS (P5)**

| Standard | Kết quả |
|---|---|
| `ui/frontend-structure.md` | component / hook / style riêng; màn chỉ thêm 1–2 dòng; store giữ trạng thái mở |
| `ui/prototype-parity.md` | mở rộng chức năng ghi `docs/06-prototype/DEVIATIONS.md`; màn mặc định không đổi bố cục |
| `ui/interaction-patterns.md` | khôi phục có xác nhận; lỗi 409 giải thích tại dòng, giữ drawer mở; "Xem thêm" theo cursor |
| `authz/rbac-permissions.md` | nút chỉ khi crm.delete; dòng không đủ quyền → `blocked` (server quyết) |
| `i18n/i18n.md` | vi + en, không tuần tự lại JSON |
| `code/file-size-module-layout.md` | file mới ≤ 100 dòng; mock thùng rác tách khỏi customers.ts |
