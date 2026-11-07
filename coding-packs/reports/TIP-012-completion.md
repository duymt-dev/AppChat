### COMPLETION REPORT — TIP-012

**STATUS:** DONE
**COMMIT:** `819d2a4` (code) trên nhánh `tip/012-integrations` (xếp chồng trên `tip/011-auth-onboarding-api`) — SHA cuối ở bảng tiến độ `goals/GOAL-BACKEND.md`

**FILES CHANGED:**
- Created:
  - Migration `packages/db/prisma/{tenant,platform}/migrations/20261030150000_012_integrations` (+ viết tay: unique partial `integration_connection_active_key … WHERE status <> 'disconnected'`, partial `integration_event_pending_idx … WHERE processed_at IS NULL`).
  - Integrations: `src/ports/bank-feed.ts` (`BankFeedProvider`, `BankTransaction`), `src/connectors/mock/bank-feed.ts` (`MockBankFeedProvider`: `test()`, `verifyWebhook` HMAC-SHA256, `parseTransactions`).
  - Kernel: `packages/core/src/kernel/crypto.ts` (AES-256-GCM, `ENC_KEY`, `parseEncKey`, `sealSecrets` / `openSecrets`).
  - Core: `packages/core/src/integrations/{public.ts, services/{connections.service,resolver,read.service,webhook.service}.ts, actions/integration-{connect,disconnect,register-interest}.handler.ts, jobs/integration-call.processor.ts}`.
  - API: `apps/api/src/http/integrations/{integrations.controller.ts, hooks.controller.ts}`, `apps/api/src/http/kernel/prefix.ts`.
  - Shared: `packages/shared/src/api/integrations.ts` (`connectorSchema`, `connectorListSchema`).
  - Test: `apps/api/test/integration/integrations.test.ts` (10), `packages/core/test/crypto.test.ts` (3), `apps/web/src/shared/api/mock/integrations-shape.test.ts` (1), `apps/web/e2e/http/{integrations.spec.ts, support.ts}`.
- Modified: `packages/integrations/src/{types.ts (color, auth.fields, ConnectionCtx, WebhookRequest / Event, adapter test / verifyWebhook), define.ts, registry.ts, coming-soon.ts, index.ts, connectors/{sepay,casso,brevo,smtp}/manifest.ts}`, `packages/integrations/test/{registry,ports}.test.ts`, `packages/db/prisma/{tenant,platform}/integrations.prisma` (điền), `packages/shared/src/{events.ts (integration.*), api/index.ts}`, `packages/actions/src/settings-apps.ts` (`register_interest` + `db: 'platform'`), `packages/core/src/{index.ts (1 dòng facade), kernel/{index.ts, kernel.module.ts (ENC_KEY)}, integrations/{integrations.module.ts, jobs/integrations.jobs.module.ts}}`, `apps/api/src/{app.module.ts (IntegrationsHttpModule.register()), bootstrap.ts (rawBody, prefix), http/integrations/integrations.http.module.ts}`, `apps/api/test/integration/setup.ts` (rawBody, prefix, dọn interest / route), `apps/web/e2e/http/auth-onboarding.spec.ts` (dùng support), `tools/contract/src/cases.ts`, `coding-packs/{DECISIONS.md, plans/BLUEPRINT.md §2.2 / §2.3}`.

**TEST RESULTS:**
- Acceptance criteria: 12/12 pass
  1. Migration 012: bảng tenant + unique / partial index (`integration_connection_active_key`, `integration_event_pending_idx`, idempotency call log, unique mapping / event); `integration_interest` ở DB nền tảng — **pass**
  2. Crypto: khứ hồi, IV khác mỗi lần, không chứa bản rõ; sửa 1 byte / sai khoá / sai version → lỗi; khoá base64 / hex 32 byte — **pass**
  3. `integration.connect` sepay: `config.account_number`, `secret_enc` giải ra `{ api_key }`; blob + action_log (input / before / after / result) không chứa bản rõ; `tenant_integration_route` `connected`; outbox `integration.connected` — **pass**
  4. Thiếu trường → 422 `{ account_number: 'required' }`; "Sắp có" / không có → `coming_soon`; adapter test lỗi → `test_failed`; sales → 403 (action + GET) — **pass**
  5. Kết nối lại → cùng `connection_id`, bí mật mới; `disconnect` → `disconnected`, `secret_enc` null, route `disconnected`; ngắt lần 2 → 404; kết nối lại sau khi ngắt → dòng mới — **pass**
  6. `register_interest` kiotviet ×2 → 1 dòng; connector `ga` → 422 `available`; thẻ `interest:true` — **pass**
  7. `GET /v1/settings/integrations` khớp `connectorListSchema`: 18 thẻ (web_widget đầu), sepay `connected` + trường / màu, SMTP "Google Workspace"; không lộ bí mật; mock FE parse cùng schema — **pass**
  8. Resolver `bank_feed` → `MockBankFeedProvider` + bí mật đã giải; `einvoice` chưa kết nối → null — **pass**
  9. Queue (worker thật): enqueue trùng → chạy 1 lần, call log `succeeded` không chứa payload / bí mật; lỗi tạm ×2 → `succeeded` attempts 3; lỗi mãi → `failed` attempts 5, connection `error`, outbox `integration.error` — **pass**
  10. Webhook: chữ ký đúng → 200 + `integration_event` + outbox `integration.event_received`; gửi lại → `duplicate:true`, không thêm dòng; chữ ký sai / thiếu → 401; connection lạ / connector lệch / không phải uuid / đã ngắt → 404; `/v1/hooks/...` → 404 (ngoài tiền tố) — **pass**
  11. Contract `integration.connect` / `register_interest` / `disconnect` xanh ở mock (7 ca file) + HTTP (6 ca); E2E http Nền tảng kết nối (lọc nhóm, Casso thiếu trường bị chặn → kết nối, Đăng ký quan tâm, tải lại vẫn đúng, ngắt) + auth / onboarding → **7 passed · 1 skipped** (luồng integrations chỉ desktop; mobile 390 nằm ở spec mock `settings`); E2E mock `settings` xanh trong full hồi quy — **pass**
  12. Cổng D59 — **pass** (dưới)
- **Cổng "trước commit":** `pnpm turbo run lint typecheck test` (9 package đổi) 27/27 task; `pnpm depcheck` xanh (1050 module, 99 known); `lint:size` 1076 file.
- **Cổng "chốt TIP":** `pnpm lint` 13/13 · `pnpm typecheck` 13/13 · `pnpm test` 13/13 task, 0 failed · `db test:integration` 7 passed · `api test:integration` **90 passed** (integrations 10 · onboarding 8 · billing 9 · notify 6 · realtime 5 · authz 9 · auth 11 · workspaces 10 · actions 13 · relay-sequence 3 · contract 6) · `pnpm depcheck` xanh · `pnpm i18n:check` 100% (4471 key) · `pnpm build` 3/3 · smoke bản build: api health 200, `/v1/settings/integrations` không token 401, `/hooks/integrations/sepay/<uuid lạ>` 404; worker `ROLE=jobs` khởi động sạch (IntegrationsJobsModule) · E2E http 7 passed · 1 skipped · full E2E hồi quy mock 418 ca → **222 passed · 0 failed · 196 skipped** (2.8m). Parity: N/A — không đổi giao diện (trang Nền tảng kết nối giữ nguyên, chỉ đổi nguồn dữ liệu).

**ISSUES DISCOVERED:**
- Webhook cần đường `/hooks/*` ngoài `/v1` (Blueprint §1.3) và body gốc để kiểm chữ ký → `applyPrefix` (exclude) + `rawBody: true` ở bootstrap và harness test.
- Luật "kết nối được ⇔ có adapter" (TIP-001) mâu thuẫn FE (thẻ `ga` kết nối được) → DC-042; SePay / Casso gắn adapter `mock` (sandbox).
- `integration.test` / `integration.sync_now` (Blueprint §3.4) chưa có trong `packages/actions` — không thêm (TIP không đổi schema action).

**GIẢ ĐỊNH ĐÃ CHỌN:** DC-042 (kết nối được + trường form manifest), DC-043 (bí mật một blob AES-256-GCM, `kernel/crypto`), DC-044 (một kết nối đang dùng / connector), DC-045 (`/hooks` + rawBody + mã lỗi), DC-046 (`register_interest` `db: 'platform'`), DC-047 (queue `integrations` + `registerIntegrationOp`).

**DEVIATIONS FROM SPEC:** không có (`register_interest` thêm `db: 'platform'` — metadata thực thi, schema input / output giữ nguyên; ghi DC-046).

**Chưa nghiệm thu với provider thật:** SePay / Casso (adapter thật + webhook thật — TIP-010 / 032, Q-004); Brevo / SMTP của workspace chỉ lưu kết nối, chưa gửi (TIP-018).

**SUGGESTIONS FOR CHỦ THẦU:**
- TIP-010: adapter SePay thật (`verifyWebhook` theo header SePay, `parseTransactions`), consumer `integration.event_received` port `bank_feed`; SePay nền tảng (thu phí AppChat) cấu hình env, không qua bảng tenant.
- TIP-031 / 032: `registerIntegrationOp('order.pull' …)`, `IntegrationResolver.get(ws, 'order_sync' | 'bank_feed')`; mapping qua `integration_mapping`.
- TIP-014: dùng `sealSecrets` / `openSecrets` cho `channel_account.credentials_enc`.

## Bổ sung2026-11-02 — tenant bank/runtime integration

TIP-012b-bank-connectors.md nhận adapter tenant thật, strict money/account normalization, canonical durable hook/pull/reconnect receipts và payment-event→AI task dispatch dedupe. Existing tests/DONE do not establish these missing/crash seams. Tenant Brevo/SMTP separate012c; no runtime/provider acceptance claimed. See bank-connectors-planning-audit-2026-11-02.md.

## Bổ sung012c — chưa triển khai

[TIP-012c](../tips/TIP-012c-tenant-mail.md) nhận tenantBrevo/SMTP adapters, sender/receipt/callback safety và EmailMarketing onboarding. Platform MailProvider test không chứng minh tenant connector đã chạy thật.

## Bổ sung — TIP-012d (2026-11-02)

Nghĩa vụ chưa đạt của TIP này chuyển sang [TIP-012d](../tips/TIP-012d-storage-connector.md): D28c, REQ-M03b. File TIP gốc không sửa (DC-233).
