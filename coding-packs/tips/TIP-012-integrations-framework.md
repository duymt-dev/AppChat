# TIP-012: Integrations framework + nối trang Nền tảng kết nối

## HEADER
- TIP-ID: TIP-012
- Project: AppChat V2
- Module: `packages/integrations` · `packages/db/prisma/{tenant,platform}/integrations.prisma` · `packages/core/src/integrations` · `apps/api/src/http/integrations` · `packages/shared/src/api/integrations.ts`
- Depends on: TIP-003 (action kernel, outbox), TIP-005 (quyền `integrations.manage`) — nhánh xếp chồng từ `tip/011-auth-onboarding-api` (e2e:http)
- Priority: P0 · REQ: M03 (Nền tảng kết nối: thẻ theo nhóm, kết nối bằng trường của manifest, "Sắp có" + Đăng ký quan tâm)
- Estimated effort: 14 giờ
- **Files touched:**
  - Integrations: `src/types.ts` (+ `color`, `auth.fields` thành danh sách trường có `secret`), `src/connectors/*/manifest.ts`, `src/coming-soon.ts`, `src/ports/{bank-feed,connection}.ts` (port `BankFeedProvider` + `ConnectionTester` + `WebhookVerifier`), `src/connectors/mock/bank-feed.ts` (adapter `mock` cho sandbox / test — TIP-010 / 032 dùng), `src/registry.ts`.
  - Schema: `tenant/integrations.prisma` (`integration_connection`, `integration_mapping`, `integration_call_log`, `integration_event`), `platform/integrations.prisma` (`integration_interest`) + migration tenant / platform `<ts>_012_integrations`.
  - Kernel: `packages/core/src/kernel/crypto.ts` (AES-256-GCM `encryptSecret` / `decryptSecret`, `key_version` — ops §2.2).
  - Core: `integrations/{integrations.module.ts, public.ts, services/{connections.service,resolver,interest.service,read.service,webhook.service}.ts, actions/{integration-connect,integration-disconnect,integration-register-interest}.handler.ts, jobs/{integration-call.processor.ts, integrations.jobs.module.ts}}`; `shared/events.ts` (+ `integration.connected|disconnected|error`).
  - API: `apps/api/src/http/integrations/{integrations.controller.ts (GET /v1/settings/integrations), hooks.controller.ts (POST /hooks/integrations/:connector/:connectionId), integrations.http.module.ts}`.
  - Shared: `packages/shared/src/api/integrations.ts` (`connectorSchema`).
  - Test: `packages/integrations/test/*`, `packages/core/test/crypto.test.ts`, `apps/api/test/integration/integrations.test.ts`, `apps/web/src/shared/api/mock/integrations-shape.test.ts`, contract cases, `apps/web/e2e/http/integrations.spec.ts`.
- **Parallel-safe with:** 013

## CONTEXT
- `standards/integrations/provider-ports.md` (toàn bộ), Blueprint §2.2 `[T] integrations.prisma`, `[P] integration_interest`, `tenant_integration_route` (TIP-002), §2.3 `integration.*`, §1.3 queue `integrations`, ops §2.2 (AES-256-GCM, `key_version`).
- FE mock `GET /settings/integrations` → `Connector[]` `{ key, name, group, color, status, connected, opens, fields, interest }`; `web_widget` là lối tắt kênh webchat (DC-006) — API ghép thẻ này đầu danh sách.
- Mock handler `integration.connect`: không `ga` → 422 `{ provider: 'coming_soon' }`; thiếu trường → 422 `{ [field]: 'required' }`.

## TASK
1. **Manifest:** `color`, `auth.fields: { key, secret }[]` (thứ tự = form FE), giữ zod `schema` để kiểm. SePay `api_key*`, `account_number`; Casso `api_key*`; Brevo `api_key*`; SMTP ("Google Workspace") `host`, `username`, `password*`.
2. **Schema [T] + [P]** theo Blueprint §2.2 + `integration_interest`; index: `integration_connection (connector_key) WHERE status <> 'disconnected'` unique (một kết nối đang dùng / connector / workspace), `(port, status)`; `integration_call_log (connection_id, created_at DESC)`; unique idempotency.
3. **Crypto:** `encryptSecret(plain, key)` → bytea `[v1][iv 12][tag 16][ciphertext]`, khoá từ `APP_ENC_KEY` (base64 / hex 32 byte); sai khoá / sửa byte → lỗi.
4. **`integration.connect`** (`integrations.manage`, config): connector không có / `coming_soon` → 422 `{ provider: 'coming_soon' }`; thiếu trường bắt buộc → 422 `{ field: 'required' }`; trường bí mật → `secret_enc` (không lưu config, không trả về, action_log che); còn lại → `config`; adapter có `test()` → gọi trước khi lưu (lỗi → 422 `{ provider: 'test_failed' }`); upsert theo connector (kết nối lại ghi đè); `tenant_integration_route` ở DB nền tảng (`connected`); event `integration.connected`. Trả `{ connection_id, status: 'connected' }`.
5. **`integration.disconnect`** (delete): đặt `disconnected`, xoá `secret_enc`, route `disconnected`; event `integration.disconnected`; chưa kết nối → 404.
6. **`integration.register_interest`** (write, `db: 'platform'`): chỉ connector `coming_soon` (còn lại 422); upsert `integration_interest (ws, connector_key)` — gọi lại không lỗi.
7. **`IntegrationResolver.get(ws, port)`** → `{ connection, adapter, secrets }` của kết nối `connected` theo port hoặc `null`.
8. **Đọc `GET /v1/settings/integrations`** (`integrations.manage`): thẻ `web_widget` + mọi manifest; `connected` / `interest` theo workspace; `fields` = key trường.
9. **Queue `integrations`:** `IntegrationCalls.enqueue({ connection_id, op, ref_type, ref_id, payload })` jobId = idempotency `(connection_id:op:ref_id)`; processor gọi handler đăng ký theo `op`, retry back-off 5 lần, ghi `integration_call_log` (không payload / secret); hết lượt → `failed` + `integration.error`.
10. **Webhook** `POST /v1/hooks/integrations/:connector/:connectionId` (public): tra route (không có / connector lệch / không `connected` → 404); adapter `verify(headers, rawBody, secrets)` sai → 401; insert `integration_event` idempotent theo id provider (`(connection_id, external_event_id)`) → 200 `{ ok, duplicate }` nhanh; event outbox `integration.event_received` cho consumer domain (TIP-010 / 031 / 032).

## SPECIFICATIONS
- Bí mật không bao giờ ra API / log / action_log; chỉ `decryptSecret` trong resolver / processor / webhook.
- Kết nối nền tảng (SePay thu phí AppChat) không đi qua bảng tenant — TIP-010.

## ACCEPTANCE CRITERIA
1. Migration 012 (tenant + platform): bảng, unique, index đúng; DB tenant mới (template) có bảng.
2. Crypto: mã hoá / giải mã khứ hồi; IV khác nhau mỗi lần; sửa 1 byte / sai khoá → lỗi.
3. `integration.connect` sepay: lưu `config.account_number`, `secret_enc` giải ra `api_key`; DB không có chuỗi `api_key` rõ; action_log input che `api_key`; route nền tảng `connected`; outbox `integration.connected`.
4. Thiếu trường → 422 `{ account_number: 'required' }`; `coming_soon` / không có → 422 `{ provider: 'coming_soon' }`; adapter test lỗi → 422 `test_failed`; sales (không quyền) → 403.
5. Kết nối lại cùng connector → cùng `connection_id`, bí mật mới; `disconnect` → `disconnected`, `secret_enc` null, route `disconnected`, chưa kết nối → 404.
6. `register_interest` kiotviet → dòng `integration_interest`; gọi lại không lỗi; connector `ga` → 422.
7. `GET /v1/settings/integrations` khớp `connectorSchema` (18 thẻ, web_widget đầu); `connected` / `interest` theo thao tác; mock FE parse cùng schema; workspace khác không thấy kết nối.
8. Resolver: `get(ws, 'bank_feed')` → adapter mock + bí mật đã giải; chưa kết nối / đã ngắt → null.
9. Queue: cùng `(connection, op, ref)` enqueue 2 lần → chạy 1 lần, call log `succeeded` (không payload); lỗi tạm 2 lần rồi thành công → 1 dòng `succeeded` sau retry; lỗi mãi → `failed` + outbox `integration.error`.
10. Webhook: chữ ký đúng → 200 + `integration_event`; gửi lại cùng id → 200 `duplicate:true`, không thêm dòng; chữ ký sai → 401; connection lạ / đã ngắt → 404.
11. Contract cases (connect / register_interest / disconnect) xanh ở mock + HTTP; E2E http trang Nền tảng kết nối (kết nối Casso, thiếu trường bị chặn, Đăng ký quan tâm, ngắt) xanh; E2E mock `settings` xanh.
12. Cổng D59 xanh (+ smoke bản build).

## CONSTRAINTS
- Không đổi schema input / output action. Không gắn adapter thật SePay / Casso (TIP-010 / 032); Brevo / SMTP của workspace chưa dùng cho gửi (email kênh là TIP-018).
- `integration.test` / `integration.sync_now` (Blueprint §3.4) chưa có trong `packages/actions` — ngoài TIP.

## ⚠️ BUILDER-CHECKLIST
- [ ] Đúng `Files touched` · 12 AC có test thật
- [ ] Cổng D59 trước commit + chốt TIP
- [ ] Commit + SHA + report + ba sổ + tiến độ
