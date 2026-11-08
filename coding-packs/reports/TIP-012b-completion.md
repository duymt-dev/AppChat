### COMPLETION REPORT — TIP-012b (Connector runtime và bank feed thật)

**STATUS:** DONE — 5 / 5 pha (DC-381 … DC-386). AC 10/10 phía code; ô provider thật SePay / Casso **chưa nghiệm thu với provider thật** (Q-004 — COVERAGE CHỜ-TK).

**COMMIT:** nhánh `tip/012b-bank-connectors` xếp chồng trên `tip/019b-runtime-integrity-p4` (#119). SHA ở bảng tiến độ `goals/GOAL-RELEASE.md`.

**MIGRATION:** P1 không có; P2 **tenant** `20261108010000_bank_connector_runtime`; P3 **tenant** `20261108020000_integration_runtime` → sau merge `db:migrate-tenants` + build lại api / worker.

---

## Pha 1 — adapter thật SePay / Casso, chuẩn hoá chặt, chọn chế độ không lùi về mock (§1.1–1.2, §2.2–2.3 — AC1, AC2, AC10)

**Spike hợp đồng provider (Rà trước khi làm bước 2)** — nguồn chính thức, không suy đoán:
- SePay: developer.sepay.vn → Tích hợp webhook (payload, phản hồi `{"success": true}` trong 30 giây, chống lặp theo `id`) + Xác thực (API Key `Authorization: Apikey`; HMAC-SHA256 `X-SePay-Signature: sha256=<hex>` trên `{X-SePay-Timestamp}.{raw body}`, lệch > 300 giây từ chối; OAuth2 Bearer — chưa hỗ trợ).
- Casso: developer.casso.vn → Webhook V2 (`X-Casso-Signature: t=<ms>,v1=<hex>`, body `{error, data}`, phản hồi 200 trong 5 giây, gửi lại tới 17 lần / 24 giờ) + repo chính thức `CassoHQ/casso-webhook-v2-verify-signature@b6a21f5`: HMAC-SHA512 trên `t + "." + JSON(body sắp key A→Z đệ quy)`. Mẫu `python.py` tái lập đúng chữ ký; mẫu `javascript.js` không tái lập được với khoá mẫu (ghi `known_gaps` trong fixture).
- Kết quả: `packages/integrations/test/fixtures/{sepay,casso}/contracts.json` (version 1, nguồn, xác thực, định danh, tiền / chiều / múi giờ, ca hợp lệ + ma trận sai). Không có sandbox / tài khoản thật (Q-004) → `evidence: provider_documentation`, **chưa nghiệm thu với provider thật**.

**FILES CHANGED** (manifest `tips/manifests/TIP-012b-files.md`; lệch ghi ở DV-056)
- integrations: `bank-validation.ts` (tiền nguyên an toàn / chuỗi chữ số ≤ bigint, không cắt; chiều tường minh; tài khoản bắt buộc giữ số 0 đầu + chữ; giờ VN ngày có thật; id 1–200), `provider-errors.ts` (`ProviderError` mã ổn định, không thông điệp provider), `connectors/sepay/{adapter,normalize}.ts` (API Key + HMAC, so sánh hằng thời gian, có header chữ ký thì không hạ cấp về Apikey), `connectors/casso/{adapter,normalize}.ts` (Webhook V2; id 0 = sự kiện thử; amount âm = out), manifest SePay (`api_key` | `hmac_secret` + `account_number`, `validate`), manifest Casso (`webhook_secret` + `account_number` bắt buộc, `api_key` gọi ra tuỳ chọn — tách khỏi khoá webhook), `types.ts` (`adapters: { live, sandbox }`, `validate`), `define.ts` (`adapterFor` / `resolveMode`, adapter chế độ ngoài manifest → lỗi lúc define), `registry.ts`, `index.ts`, `connectors/mock/bank-feed.ts`.
- core: `integrations/services/adapter-selection.ts` (mới — `pickMode` / `adapterOf` / `sandboxAllowed`: sandbox cấm khi `NODE_ENV=production`), `connections.service.ts` (chế độ tường minh / giữ chế độ đã lưu, adapter theo chế độ, `validate` manifest), `resolver.ts`, `webhook.service.ts`, `integration-call.processor.ts`, `integration-test.handler.ts`, `integration-connect.handler.ts`, `integrations.module.ts`, `public.ts`; `sales/payments/services/bank-feed.ts` (adapter theo chế độ của kết nối feed; chuẩn hoá cả request trước mọi ghi → 400; trần 1000 giao dịch; feed không tài khoản / giao dịch khác hoặc thiếu tài khoản → không khớp); `billing/payments/bank-hook.service.ts` (payload SePay sai → 400 — parser dùng chung).
- actions: `integration.connect` / `bank_feed.connect` / `integration.test` thêm `mode?: 'live' | 'sandbox'`.
- web: ô bí mật mới (`hmac_secret`, `webhook_secret`) + i18n vi / en; mock `integration.connect` / `integration.test` theo trường tuỳ chọn như server.
- test mới: integrations `sepay-contract` (5), `casso-contract` (7), `bank-normalization` (8), `bank-live-selection` (5); api `bank-connectors.test.ts` (7).

**Giả định đã chọn (gap-filling)**
- Casso không công bố ngưỡng lệch giờ → không chặn theo `t` (Casso gửi lại tới 24 giờ); chống lặp bằng `data.id` (unique ở core).
- Casso không nói máy chủ ký JSON dạng giữ nguyên hay thoát ký tự (hai mã mẫu khác nhau) → chấp nhận cả hai; cả hai đều cần đúng khoá bí mật.
- Kết nối đã lưu `live` nhưng dùng khoá giả lập (dữ liệu dev cũ): sau P1 webhook giả lập → 401 (đúng §1.1 — không lùi về mock), không xoá lịch sử; người dùng kết nối lại với khoá thật hoặc chọn `sandbox` ở dev.
- Chế độ sai (ngoài enum) → 422 như mọi lỗi input zod.

**CỔNG TEST (P1)**
- `db:test-reset` → integration api 11 file hồi quy (`integrations`, `payments`, `billing-payments`, `orders`, `contract`, 6 ma trận action) 93/93 + `bank-connectors` 7/7.
- `pnpm turbo run lint typecheck test --filter="...[origin/dev]"`: 39/39 task pass (integrations 46, core 710). `pnpm depcheck` pass. `i18n-check` 100%, `lint:size`, `lint:tokens`, `lint:masks` pass.
- E2E mock `settings.spec.ts` + `invoices.spec.ts`: 20 pass (20 skip theo thiết bị). E2E http `integrations.spec.ts` đã sửa theo trường Casso mới — chạy ở CI.
- Parity: `settings:integrations` 0,07%, `settings:integrations-connect` 2,07% (mask thêm vùng trường thứ hai — prototype chỉ vẽ một trường).
- Nhà cung cấp thật: **chưa nghiệm thu với provider thật** (Q-004) — chữ ký dựng theo hợp đồng tài liệu.

**ĐỐI CHIẾU STANDARDS (P1)**

| Standard | Kết quả |
|---|---|
| `integrations/provider-ports.md` §1, §6, §9 | port `bank_feed` không đổi; xác thực trong adapter trên byte gốc trước parse; mock chỉ là chế độ sandbox ẩn, live không bao giờ dùng mock |
| `domain/money-time-numbering.md` | tiền chuỗi nguyên VND, không cắt / ép; giờ VN không múi giờ → UTC tường minh, không dùng giờ máy chủ |
| `domain/validation-defaults.md` | payload sai → lỗi theo trường (`payload: <trường>`), từ chối cả request, không ghi phần nào |
| `ops/observability-security.md` | so sánh chữ ký hằng thời gian; `ProviderError` không mang thông điệp / giá trị provider; bí mật chỉ trong `secret_enc` |
| `actions/action-registry.md` | `mode` thêm vào input action hiện có, không action mới ở P1; executor che bí mật theo manifest (`hmac_secret`, `webhook_secret`) |
| `ui/prototype-parity.md` §6b | trường thứ hai mức 2 (prototype không vẽ) — mask có căn cứ; i18n vi + en |
| `code/file-size-module-layout.md` | file mới ≤ 80 dòng; test riêng |

---

## Pha 2 — ingress bền: biên nhận chuẩn tắc → ACK → khớp ở worker (§2.4–2.5, §3.1–3.4 — AC3, AC5, AC6)

**FILES CHANGED** (manifest; lệch ở DV-057)
- db: `prisma/tenant/bank-ingress.prisma` (`bank_receipt`), quan hệ ở `sales-payments.prisma`, migration **tenant** `20261108010000_bank_connector_runtime`.
- actions: `bank-ingress.ts` (`bank_feed.ingest` — system-only, finance.manage, risk money, agentGrantable false) + i18n tiêu đề vi / en.
- core `sales/payments/bank/`: `receipt.ts` (biên nhận idempotent theo (provider, tài khoản, mã giao dịch) + outbox cùng transaction), `reconcile.ts` (luật khớp / ghi nhận hiện có tách khỏi hook — không đổi COMMERCE §5), `bank-event.consumer.ts` (consumer `sales.bank-ingest`); `actions/bank-ingest.handler.ts` (claim FOR UPDATE, kiểm lại feed hiện tại, processed cùng transaction); `services/bank-feed.ts` (hook chỉ xác thực → chuẩn hoá → biên nhận → ACK); `sales.jobs.module.ts` (đăng ký consumer ở ROLE=jobs), `sales.module.ts`, `public.ts`; `ai/assistant/catalog.ts` (SYSTEM_ONLY).
- test mới: api `bank-ingress.test.ts` (7), `actions/bank_feed.ingest.action.test.ts` (3), helper `helpers/bank-ingress.ts`; worker `bank-ingress-recovery.test.ts` (1 — ROLE=jobs thật, khởi động lại + phát lại).

**Giả định đã chọn (gap-filling)**
- Phản hồi webhook đổi từ `{ received, matched }` sang `{ accepted, duplicate, ignored }` — khớp không còn đồng bộ nên "matched" lúc ACK là sai sự thật (§2.4 "return accepted/duplicate counts, not pretend matched").
- `bank_tx` cũ không có biên nhận (không backfill): định danh chuẩn tắc chỉ áp từ giao dịch mới; giao dịch cũ vẫn chống trùng theo (feed, mã) như trước.
- Feed đổi / ngắt giữa ACK và xử lý → biên nhận `ignored` (`feed_inactive`), không ghi nhận tiền; không tự chuyển sang feed mới (đổi provider / tài khoản cần xác nhận — §3.2, P3).

**CỔNG TEST (P2)**
- `db:test-reset` (template +1) → api `bank-ingress` 7/7, `bank-connectors` 7/7, `payments` hồi quy, `bank_feed.ingest` ma trận 3/3; hồi quy `integrations`, `billing-payments`, `orders`, `contract`, `platform-reconcile`, 3 ma trận bank / đối soát: pass. `assistant-vertical` › mục lục ma trận: còn 11 action thiếu file của TIP 027 / 032 / 041 / 038b — đỏ sẵn (Q-056), `bank_feed.ingest` đã có file.
- worker `bank-ingress-recovery` 1/1 (build worker trước).
- `pnpm turbo run lint typecheck test --filter="...[origin/dev]"` 39/39; depcheck pass; lint:size, i18n 100%.
- `db:migrate-tenants` local: 15 DB, 0 lỗi.
- Không đổi UI ở P2 (E2E / parity không ảnh hưởng — không spec nào gọi hook tenant).

**ĐỐI CHIẾU STANDARDS (P2)**

| Standard | Kết quả |
|---|---|
| `events/outbox.md` | biên nhận + outbox cùng transaction; payload chỉ `receipt_id`; consumer idempotent theo `event_consumption` + trạng thái biên nhận |
| `actions/action-registry.md` | ghi tiền chỉ qua `bank_feed.ingest` trong ActionExecutor (action_log); system-only, ẩn khỏi Trợ lý / agent |
| `domain/concurrency.md` | claim FOR UPDATE + trạng thái `accepted` → hai worker cùng biên nhận: một `matched`, một `duplicate` (test) |
| `database/tenant-db.md` · `indexing.md` | không `workspace_id`; CHECK / FK viết tay; unique chuẩn tắc cột `=`; partial index hàng chờ INCLUDE feed; index lịch sử theo tài khoản INCLUDE trạng thái |
| `ops/observability-security.md` | outbox không mang số tiền / nội dung / tài khoản; lỗi provider không vào phản hồi |
| COMMERCE §5 | luật khớp TT… / đúng số còn phải thu / Cần đối soát giữ nguyên (tách hàm, không đổi) |

## Pha 3 — runtime kết nối: thăm dò / kéo có biên nhận bền, đọc chi tiết + nhật ký, drawer (§1.3–1.4, §4.1–4.5, §5.1–5.3 — AC6, AC7, AC8)

**FILES CHANGED** (manifest; lệch ở DV-058)
- integrations: `provider-http.ts` (hợp đồng HTTP tiêm + ánh xạ lỗi), `ports/bank-feed.ts` (`probe?` / `pull?` + con trỏ / trang), `connectors/casso/client.ts` (userInfo + transactions có giới hạn), `connectors/sepay/client.ts` (bank-accounts bằng `api_token`; không kéo), adapter Casso / SePay / mock, manifest SePay (`api_token` tuỳ chọn), `provider-errors.ts` (`retryAfterS`); fixture `contracts.json` thêm mục `read` (v1); test `bank-read-contract.test.ts`.
- db: `integrations.prisma` (enum queued / unknown / cancelled; kết nối `credential_rev`, `last_probe_*`, `probed_rev`, `last_event_at`; biên nhận lệnh `config_rev`, `generation`, `lease_until`, `next_attempt_at`, `safety`, `outcome`, `requested_by`, `finished_at`), `bank-ingress.prisma` (`bank_pull_state`), migration **tenant** `20261108020000_integration_runtime`.
- actions: `integration-runtime.ts` (`integration.sync_now`, `integration.get`, `integration.list_calls`) + i18n.
- core `integrations/`: `operations/{call-receipt,call-runner,probe,bank-pull,provider-http}.ts`, `jobs/bank-sync.scheduler.ts` + `integrations.jobs.module.ts` (queue `integration-ops` + quét 60 giây), `services/{connection-detail,connection-health}.ts`, `actions/integration-sync.handler.ts`, `events/integration.rules.ts` (WS); `connections.service.ts` (`rotated`: tăng phiên bản khoá, huỷ lệnh chờ, bỏ con trỏ), connect handler + `bank_feed.connect` / `.disconnect` (biên nhận thăm dò, rào), webhook (`last_event_at`); `sales/payments/bank/receipt.ts` (`acceptReceiptsIn`, `stagePulledReceipts`), `sales.jobs.module.ts` (đăng ký op `bank.pull`).
- api: `connection-detail.controller.ts` (GET /v1/integrations/*).
- shared: `api/integration-runtime.ts` (DTO).
- web: `IntegrationDetailDrawer` / `IntegrationHealth` / `IntegrationCallLog`, `useIntegrationDetail`, `integration-api.ts`, `integration-types.ts`, styles, `IntegrationsSection` (thẻ đã kết nối → drawer), store `integDetail`, mock `integration-runtime.ts`, realtime `integration.*`, i18n `settings.integrations.detail.*`.
- test mới: api `integration-detail.test.ts` (7), ma trận `integration.{sync_now,get,list_calls}` (10); core `integration-runtime.test.ts` (6); web `IntegrationDetailDrawer.test.tsx` (3); E2E `integration-runtime.spec.ts` (mock) + `http/integration-runtime.spec.ts`; parity `manifests/integration-runtime.ts` (rỗng — PD-025).

**Giả định đã chọn (gap-filling)**
- SePay KHÔNG kéo: `GET /v2/transactions` trả `id` UUID, webhook gửi `id` số — không có bằng chứng cùng định danh → kéo sẽ nhận đôi (Q-057, tạm theo đề xuất). SePay giữ webhook + thăm dò đọc bằng API Token mới (`api_token`, tách khoá Apikey webhook — §1.2 "không suy quyền đọc từ khoá webhook").
- Casso kéo được: `id` bản ghi API = `data.id` webhook V2 (tài liệu Casso dùng API để rà giao dịch webhook bỏ sót) → cùng khoá chuẩn tắc.
- Bật kéo tự động = opt-in bằng lần "Đồng bộ ngay" đầu tiên (tạo `bank_pull_state`, mốc = lúc đó; không kéo lùi lịch sử trước ngày mốc). Đổi khoá / ngắt → bỏ con trỏ, mốc mới.
- Thăm dò bền chạy ở worker SAU commit kết nối (biên nhận `connection.probe` ghi trong transaction) — kết nối không đợi mạng; sức khoẻ hiện "Đang kiểm tra" tới khi xong.
- Chưa làm ở P3 (sang P4 / ghi rõ): `bank_feed.connect` theo `connection_id` có sẵn; hook generic `/hooks/integrations` hội tụ ingress tài chính; thăm dò nháp qua vault Redis 10 giây (§4.1 A — `integration.test` giữ cách 023c); op mutation (012c).

**CỔNG TEST (P3)**
- `db:test-reset` (template +1) → api: `integration-detail` 7/7, ma trận `integration.sync_now|get|list_calls` 10/10; hồi quy `bank-connectors`, `bank-ingress`, `billing-payments`, `integrations`, `payments`, ma trận `integration.connect|disconnect|test`, `bank_feed.ingest|connect|disconnect` — 12 file 74/74.
- worker `bank-ingress-recovery` 1/1 (sau build api + worker); `pnpm check:bundle` api 34 / worker 30 gói khai đủ.
- integrations 10 file 55/55 (gồm `bank-read-contract`); core `integration-runtime` + `genui-secret-fields` + `integration-form-probe` 17/17; actions 12/12; web `IntegrationDetailDrawer` 3/3.
- E2E mock `integration-runtime` + `settings` (desktop + mobile-390): 15 passed, 13 skipped (luồng desktop trên mobile), 0 đỏ. E2E http (`pnpm e2e:http integrations integration-runtime`, API 4327 / web 3428): 2 passed (kể cả `integrations.spec.ts` đổi theo drawer).
- `pnpm turbo run lint typecheck test --filter="...[origin/dev]"`: 38/39 lần đầu — `core#test` `assistant-coverage` đòi preview cho `integration.sync_now` + đường tra `connection_id` → thêm `previews/integration-sync.handler.preview.ts` + alias `connection_id → integration` (integration.get); chạy lại core 715/715, lint + typecheck xanh. `pnpm depcheck` pass. `assistant-vertical` › mục lục ma trận đỏ sẵn (11 action TIP khác — Q-056), không có action của 012b.
- Parity: `settings:integrations` 0,07%, `settings:integrations-connect` 2,07% (≤ 4,2%). Drawer mới không có trong prototype — PD-025.
- `EXPLAIN` 10.000 dòng (`.data/gate/012b-p3-explain.txt`): log trang đầu / trang cursor = Index Only Scan `integration_call_log_conn_time_idx` (3 buffer) + join PK 21 dòng, 0,12 ms; hàng chờ = Index Only Scan partial `integration_call_log_pending_idx`.
- `db:migrate-tenants` local 15 DB, 0 lỗi. i18n 100%, lint:tokens, lint:size (ngoài thư mục build tạm) sạch.
- **Chưa nghiệm thu với provider thật** (Q-004): client Casso / SePay theo tài liệu chính thức, test qua transport giả; không gọi API thật.

**ĐỐI CHIẾU STANDARDS (P3)**

| Standard | Kết quả |
|---|---|
| `integrations/provider-ports.md` | adapter giữ URL cố định, nhận HTTP tiêm; core không import SDK; call log không secret / payload; lỗi mã ổn định |
| `ops/observability-security.md` | safeFetch (DNS / ghim IP, không redirect, 10 giây, 1 MiB) + danh sách host; lỗi / log / WS / API không mang khoá, URL, thân provider, số tiền (test canary `ck_api_SECRET`, `450000`, `html`) |
| `domain/concurrency.md` | claim CAS theo `generation` + lease; rào `credential_rev` khi chạy và khi ghi con trỏ; trùng lượt kéo gộp; trang + biên nhận cùng transaction |
| `actions/action-registry.md` · `api/response-envelope.md` | sync_now qua ActionExecutor (idempotency, preview cho Trợ lý — write); get / list_calls cùng reader HTTP; `{ data, next_cursor }`; 404 chung, 409 STALE_VERSION, 503 khi không có queue |
| `authz/rbac-permissions.md` | integrations.manage + membership hiện tại cho HTTP / action / WS; agentGrantable false; tài khoản feed che ••1234 (không mở quyền finance) |
| `database/tenant-db.md` · `indexing.md` | không `workspace_id`; log (connection_id, created_at DESC, id DESC) INCLUDE (status, op, latency_ms) + deferred join; partial hàng chờ; `bank_pull_state_due_idx`; CHECK kích thước con trỏ ≤ 2 KB |
| `events/outbox.md` | `integration.error` qua outbox, payload mã lỗi đã làm sạch; WS chỉ tín hiệu làm mới |
| `ui/*` · `i18n` | `EntityDrawer` primitive + token; vi / en 100%; mobile 390 không tràn; PD-025 ghi lệch prototype |
| COMMERCE §5 | kéo hội tụ cùng biên nhận chuẩn tắc + `bank_feed.ingest` → luật khớp / ghi nhận không đổi (test kéo + webhook cùng giao dịch → một khoản thu) |

## Pha 4 — sự kiện → tác vụ AI bền + ai:live bank-vertical (§3.5 — AC9; DC-385)

**FILES CHANGED** (manifest; lệch ở DV-059)
- db: `prisma/tenant/ai-task-events.prisma` (`AiTaskEventReceipt` + enum kết cục), migration **tenant** `20261108030000_ai_task_event_receipts` (FK ai_task, CHECK queued ⇔ run_id, unique (task_id, source_event_id), partial `ai_task_event_receipt_undispatched_idx` INCLUDE (task_id, run_id), `ai_task_event_active_idx` (event_type, id) partial); `test/prisma-stubs.test.ts`.
- core `ai/tasks/`: `event-dispatch.ts` mới (`dispatchTaskEvent` cursor + mốc occurred_at, `claimOne` khoá FOR UPDATE → biên nhận + run cùng transaction, `redispatchPending`, `LIVE_RUN`); `task-scheduler.ts` (consumer gọi dispatch bền; busy theo mọi trạng thái sống), `task.queue.ts` (job {topic, source_event_id}), `task.runner.ts` (đọc payload từ outbox, huỷ khi tác vụ / sự kiện không còn hợp lệ), `task.jobs.ts` (quét khôi phục trong sweep 60 giây); `insights/services/renewal-suggestions.ts` (`eventRecordVisible` kiểm `invoice_id`); `ai/public.ts`.
- test mới: worker `ai-task-event-recovery.test.ts` (5), core `ai-task-event-dispatch.test.ts` (2); `apps/api/test/integration/ai-tasks.test.ts` sửa theo job mới.
- ai-eval: `fixtures/ai-eval/bank-vertical/cases.json` (8 ca).

**Giả định đã chọn (gap-filling)**
- Tác vụ có lượt ở BẤT KỲ trạng thái sống nào (kể cả chờ duyệt / chờ con / chờ thao tác / chờ hạn mức) → sự kiện mới `skipped_busy` (không xếp hàng lượt thứ hai — đúng "at most one enabled task run").
- Mốc snapshot = `occurred_at` trong payload sự kiện (không có thì lúc xử lý): tác vụ tạo sau sự kiện không nhận sự kiện cũ phát lại.
- Chia thêm P5 cho §4.1 A / §5.2 / hook generic (DC-385 (6)) — giữ PR P4 nhỏ.

**CỔNG TEST (P4)**
- `db:test-reset` (template +1); worker `ai-task-event-recovery` **5/5** (Postgres 16 thật: hai worker đua + phát lại → 1 run / 1 biên nhận; busy → skipped_busy; tạm dừng → không nhận; tác vụ tạo sau sự kiện không nhận; mất job sau commit → quét đẩy lại đúng run_id, lần hai 0, run đã huỷ chỉ đánh dấu; đề nghị thanh toán người tạo không đọc được → false).
- api `ai-tasks` 13/13 (EXPLAIN tác vụ theo sự kiện = Index Only Scan `ai_task_event_active_idx`); core `ai-task-event-dispatch` 2/2; typecheck + lint core sạch.
- **ai:live** (`node tools/scripts/ai-live-stack.mjs -- --cases fixtures/ai-eval/bank-vertical/cases.json`, stack riêng 4617 / Redis DB 14, 9router `ag/gemini-3-flash` thật): lượt 1 **6/8**, an toàn 0 — `bv-sync-now` (seed chưa có kết nối Casso → đồng bộ không thể; model mở form kết nối — đúng hành vi, câu ca sửa nhận đường đọc / form), `bv-invoice-lookup` (model tra khách rồi `invoice.search` không gắn contact_id). Lượt 3 sau chỉnh câu ca: **7/8, an toàn 0 → ĐẠT** (an toàn 8/8, hành vi ≥ 7/8). Ca trượt còn lại `bv-invoice-lookup` — model lọc theo `q` thay vì `contact_id` (vẫn trả đúng đề nghị của khách, chỉ không qua khoá mong đợi). `reports/ai-live-bank-vertical-2026-11-07.md`.
- Provider thật SePay / Casso: **chưa nghiệm thu với provider thật** (Q-004).
- `db:migrate-tenants` local 15 DB, 0 lỗi.

## Pha 5 — hội tụ hook generic, gắn feed vào kết nối đã lưu, thăm dò nháp ngân hàng thật (§2.4 mục 4, §4.1 A, §5.2 — AC3, AC5, AC7; DC-386)

**FILES CHANGED** (lệch ở DV-060)
- core: `integrations/services/bank-ingress-sink.ts` (mới — sink đăng ký), `webhook.service.ts` (kết nối bank_feed có feed bật → sink), `services/form-schema.ts` (`probe` dùng `BankFeedProvider.probe` qua `providerHttp`), `actions/integration-test.handler.ts` (tách ô nháp cho adapter có `probe`), `public.ts`; `sales/payments/services/bank-feed.ts` (`ingestVerified` dùng chung hai hook + `genericBankSink`), `sales/payments/actions/bank-feed-bind.ts` (mới — nhánh connection_id), `finance-config.handlers.ts` + preview, `sales.module.ts` (đăng ký sink).
- actions: `payments.ts` — `bank_feed.connect` thêm `connection_id` + `if_version` (refine loại trừ `fields`).
- web: `IntegrationDetailDrawer` (nút "Bật đối soát tiền"), `useIntegrationDetail` (`bindFeed`), mock `integration-runtime.ts` (bank_binding theo feed giả), i18n `settings.integrations.detail.bind` (vi + en).
- test mới: api `bank-convergence.test.ts` (4); core `integration-runtime.test.ts` +1 (thăm dò nháp Casso qua cầu HTTP); web `IntegrationDetailDrawer.test.tsx` +1.

**Giả định đã chọn (gap-filling)**
- Hook generic chỉ vào ingress khi kết nối có feed tài chính ĐANG BẬT cùng provider (finance.manage đã gắn) — integrations.manage một mình không bật khớp tiền (§2.4 mục 4, AC5).
- Gắn feed vào kết nối đã lưu không xoay khoá (không tăng credential_rev) — không có khoá mới; vẫn rào credential_rev giữa pha nền tảng và pha tenant.
- Thăm dò nháp: dùng `prepare` ngoài transaction của 023c thay vì vault + worker riêng (DC-386 (3), DV-060 (3)).

**CỔNG TEST (P5 + chốt TIP)**
- api `bank-convergence` **4/4** (không feed → sự kiện thô; connection_id: 422 khi kèm fields, 404 provider lệch / lạ, 409 if_version cũ, đúng → feed + route, credential_rev giữ, không lộ khoá; một giao dịch qua hook generic + tenant-payments → một biên nhận, một khoản thu; feed ngắt → quay về thô).
- Hồi quy api (10 file **80/80**): bank-connectors, bank-ingress, integrations, payments, billing-payments, integration-detail, orders, ma trận bank_feed.connect / disconnect, integration.sync_now; + integration.test, genui-secrets, genui, integrations (22/22 + 11/11). worker `ai-task-event-recovery` 5/5, `bank-ingress-recovery` (P2/P3).
- core integration-runtime 6/6, integration-form-probe + genui-secret-fields + cross-db-handlers + assistant-coverage 30/30; web IntegrationDetailDrawer 4/4 + invoices-shape.
- `pnpm turbo run lint typecheck test --filter="...[origin/dev]"` **39/39**; depcheck 0 lỗi; `pnpm check:bundle` api 34 / worker 30 đủ; i18n 100%.
- E2E mock `integration-runtime` + `settings` + `invoices` (desktop + mobile-390): **23 passed**, 21 skipped (luồng desktop trên mobile), 0 đỏ. E2E http `integrations` + `integration-runtime`: **2 passed**.
- Parity `settings:integrations` 0,07%, `settings:integrations-connect` 2,07% (≤ 4,2%).
- ai:live bank-vertical 7/8, an toàn 0 (P4). Provider thật SePay / Casso: **chưa nghiệm thu với provider thật** (Q-004); SePay kéo chờ Q-057.

## Đối chiếu standards

| Standard | Tuân thủ (file / test) | Lệch |
|---|---|---|
| `integrations/provider-ports.md` | adapter theo port + manifest; chữ ký trên byte gốc trong adapter; gọi ra ngoài chỉ qua `ProviderHttp` (safeFetch, host cố định, không redirect, 10 giây, 1 MiB); biên nhận lệnh `integration_call_log` không secret; route webhook nền tảng 404 chung | SePay không kéo (Q-057) |
| `actions/action-registry.md` | `integration.sync_now` / `get` / `list_calls`, `bank_feed.connect` (connection_id) qua ActionExecutor, preview cho lệnh ghi, `agentGrantable: false` cho config / tiền, `bank_feed.ingest` system-only | — |
| `events/outbox.md` | biên nhận ngân hàng + outbox cùng transaction rồi mới ACK; `ai_task_event_receipt` cùng transaction với run; job chỉ mang id | — |
| `database/tenant-db.md` · `indexing.md` | bảng tenant không workspace_id; log `(connection_id, created_at DESC, id DESC) INCLUDE`, partial hàng chờ, `ai_task_event_active_idx`, `ai_task_event_receipt_undispatched_idx`; deferred join log; EXPLAIN Index Only Scan | migration tách theo pha (DV-058 / 059) |
| `domain/concurrency.md` · `state-machine.md` | CAS generation + lease, rào credential_rev, khoá FOR UPDATE tác vụ, unique biên nhận; trạng thái call queued → running → succeeded / failed / unknown / cancelled | — |
| `api/response-envelope.md` | `{ data }` / `{ data, next_cursor }` / lỗi mã ổn định; ACK hook `{ data: { ok, accepted, duplicate, ignored } }` | — |
| `authz/rbac-permissions.md` | integrations.manage cho chi tiết / log / sync; finance.manage cho feed; payment.confirmed kiểm quyền đề nghị hiện tại | — |
| `ui/prototype-parity.md` · `i18n/i18n.md` | parity ≤ 4,2%; drawer mới PD-025; mọi chuỗi vi + en | PD-025 |
| `ai/eval.md` | ai:live bank-vertical 8 ca, 7/8, an toàn 0 | — |
| `ops/observability-security.md` | lỗi provider làm sạch (không URL / body); khoá không vào log / queue / preview / model | — |

