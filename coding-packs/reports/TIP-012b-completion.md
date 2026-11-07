### COMPLETION REPORT — TIP-012b (Connector runtime và bank feed thật)

**STATUS:** pha 2 / 4 DONE (DC-382, DC-383). TIP chưa DONE: P3 (probe / sync / call receipt + route / UI), P4 (AI event-dispatch + ai:live bank-vertical) còn lại.

**COMMIT:** nhánh `tip/012b-bank-connectors` xếp chồng trên `tip/019b-runtime-integrity-p4` (#119). SHA ở bảng tiến độ `goals/GOAL-RELEASE.md`.

**MIGRATION:** P1 không có; P2 **tenant** `20261108010000_bank_connector_runtime` → sau merge `db:migrate-tenants` + build lại api / worker.

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
