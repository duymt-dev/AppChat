### COMPLETION REPORT — TIP-009

**STATUS:** DONE
**COMMIT:** `658d8ab` (code) trên nhánh `tip/009-billing-core` (xếp chồng trên `tip/006-realtime-notify`) — SHA cuối ở bảng tiến độ `goals/GOAL-BACKEND.md`

**FILES CHANGED:**
- Created:
  - `packages/db/prisma/platform/migrations/20261030130000_009_billing` (sinh bằng `prisma migrate diff` + viết tay: `credit_wallet_balance_chk`, `credit_ledger_ws_created_idx (workspace_id, created_at DESC, id DESC) INCLUDE (delta, kind)`, partial `subscription_trial_ends_idx WHERE status = 'trialing'`).
  - Shared: `packages/shared/src/billing/{catalog.ts (PLAN_SEEDS 8 gói, CREDIT_PACKS, ADDONS, PLAN_COMPARE — sinh từ fixture prototype), rules.ts (trial, creditsFor, warnLevel), index.ts, plans.test.ts}`, `api/billing.ts` (shape đọc), `i18n/server/{vi,en}/billing.ts` (chữ lịch sử ví).
  - Core: `packages/core/src/billing/{seed.ts, public.ts, services/{wallet.service,credit-meter,quota.service,subscriptions.service,billing-read.service}.ts, events/billing.events.ts}`.
  - API: `apps/api/src/http/billing/billing.controller.ts`.
  - Test: `apps/api/test/integration/billing.test.ts` (9), `apps/web/src/shared/api/mock/billing-shape.test.ts` (3), `packages/shared/src/billing/plans.test.ts` (4).
- Modified: `packages/db/prisma/platform/billing.prisma` (điền), `packages/shared/src/{index.ts, events.ts (workspace.declared, credits.*, subscription.changed, trial.expired), api/index.ts, i18n/server/index.ts}`, `packages/core/src/{index.ts (1 dòng facade), billing/{billing.module.ts, jobs/billing.jobs.module.ts}}`, `apps/api/src/{app.module.ts (BillingHttpModule.register()), http/billing/billing.http.module.ts, http/identity/{workspaces.controller.ts (/me ghép billing), identity.http.module.ts}}`, `apps/api/test/integration/{setup.ts (dọn billing), worker.harness.ts (+BillingJobsModule)}`, `coding-packs/{DECISIONS.md, plans/BLUEPRINT.md §2.2}`.

**TEST RESULTS:**
- Acceptance criteria: 10/10 pass (Postgres 16 native + Memurai thật)
  1. CHECK ví từ chối số âm (`credit_wallet_balance_chk`); unique ledger `(workspace, ref_type, ref_id)` chặn ghi trùng; index ledger có `INCLUDE (delta, kind)` — **pass**
  2. Seed 8 gói đúng thứ tự / giá / hạn mức prototype (Cá nhân Pro trial 10.000 credit · 8 kênh · 5 agent; Miễn phí 500 credit · lưu trữ 90 ngày; Ultimate kênh / agent không giới hạn; Enterprise Liên hệ); chạy lại không thêm — **pass**
  3. `business_profile.update` lần đầu → `workspace.declared` → outbox → relay → queue `events` → consumer `billing.trial` → subscription `trialing` tới 2026-11-14 + 10.000 credit; `startTrial` lần 2 → bỏ qua, một dòng `grant` — **pass**
  4. Trừ plan trước rồi topup; thiếu → `CREDIT_EXHAUSTED` 402, số dư không đổi; cùng ref → `applied:false`; 20 charge song song 5 credit trên ví 80 → đúng 16 thành công, 4 `CREDIT_EXHAUSTED`, ví về 0 — **pass**
  5. `CreditMeter`: 1.000 in × 2 + 333 out × 6 / 1k = 3,998 → 4 credit (làm tròn lên), ref `ai_step:run1:0` (gọi lại không trừ), model chưa có giá → 400; ví 0 → `assertBalance` `CREDIT_EXHAUSTED` — **pass**
  6. Ngưỡng: `credits.exhausted` rồi `credits.restored` theo thứ tự; kỳ mới dùng 80% → `credits.low` 80, 96% → `credits.low` 95 (mỗi mức một lần); Owner nhận thông báo `ai_budget` (qua notify TIP-006) — **pass**
  7. Scheduler hết trial (đồng hồ +16 ngày): → gói Miễn phí `active`, plan_balance 500; quét lại không hạ lần 2; `trial.expired` + `subscription.changed` ở outbox; Owner nhận thông báo; dữ liệu tenant giữ nguyên — **pass**
  8. Hạn mức gói Miễn phí: kênh thứ 2 → `PLAN_LIMIT_REACHED` 402 `{ resource: 'channels', limit: '1' }`; `activate('ultimate')` → kênh không giới hạn, user 16 → lỗi `limit 15`; `activate` cùng hoá đơn lần 2 không cấp lại — **pass**
  9. `GET /v1/billing/summary|plans|wallet|ledger` qua schema dùng chung (mock FE cũng parse cùng schema — 3 ca); lịch sử ví theo locale người xem ("Cấp credit gói Ultimate", "AI · 1333 token", nguồn "Trợ lý AI"); cursor ledger không trùng; `/v1/me` có `plan: 'Ultimate'`, `billing.paid_plan: 'ultimate'`; không token → 401 — **pass**
  10. Cổng D59 — **pass** (dưới)
- **Cổng "trước commit":** `pnpm turbo run lint typecheck test` (shared · core · db · api · worker · web) 18/18 task; `pnpm depcheck` xanh; `lint:size` 1043 file.
- **Cổng "chốt TIP":** `pnpm lint` 13/13 · `pnpm typecheck` 13/13 · `pnpm test` 13/13 task, 0 failed (shared 57 · core 74 · web 78 · db 17 · integrations 13 · …) · `db test:integration` 7 passed · `api test:integration` **68 passed** (billing 9 · notify 6 · realtime 5 · authz 9 · auth 11 · workspaces 10 · actions 13 · relay-sequence 3 · contract 2) · `pnpm depcheck` xanh (99 known) · `pnpm build` 3/3 · smoke bản build: api health 200, `/v1/billing/summary|plans`, `/v1/me` không token 401; worker `ROLE=jobs` khởi động sạch (BillingJobsModule + scheduler) · full E2E hồi quy mock 418 ca → **222 passed · 0 failed · 196 skipped** (2.7m, lượt 1). E2E http + parity: N/A — TIP không có màn UI (trang Gói & ví nối API ở TIP-039).

**ISSUES DISCOVERED:**
- Cờ ngưỡng ví ban đầu đọc rồi ghi (race khi nhiều charge song song phát trùng `credits.low`) → đổi sang update có điều kiện từng mốc (`updateMany … WHERE warn_80_sent_at IS NULL`).
- `channels.used` của summary = 0 tới TIP-014 (bảng `channel_account` ở DB tenant).

**GIẢ ĐỊNH ĐÃ CHỌN:**
- DC-032 — gói ở bảng `plan` (seed chỉ tạo gói thiếu); bảng so sánh / gói credit / addon là cấu hình shared.
- DC-033 — `/me.billing.wallet_balance` = topup × 1.000đ; ghép billing vào `/me` ở tầng app.
- DC-034 — chu kỳ credit (expire + grant idempotent), cảnh báo theo % hạn mức tháng, event ví qua outbox tenant sau commit nền tảng, kỳ 30 ngày.
- Trial bắt đầu khi khai báo DN (Auth flow Blueprint: khai báo → trial + 10.000 credit), không phải lúc tạo workspace.
- Workspace chưa có subscription → hạn mức gói Miễn phí.

**DEVIATIONS FROM SPEC:** không có.

**SUGGESTIONS FOR CHỦ THẦU:**
- TIP-010: khi hoá đơn `paid` gọi `SubscriptionsService.activate(ws, planKey, months, invoiceId)` / `WalletService.topup(ws, credits, { refType: 'invoice', refId })`; thêm job gia hạn kỳ (`resetPlan` ref `period:<ws>:<yyyy-mm>`).
- TIP-019: ghi đè provider `PRICE_BOOK` bằng bản đọc `model_price`.
- TIP-013 / 014 / 021: gọi `QuotaService.assert` trước khi thêm thành viên / kênh / agent.
- TIP-016 / 022: consumer `credits.exhausted` chuyển hội thoại `auto` về người.
