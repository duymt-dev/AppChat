# TIP-009: Billing core — gói, subscription, trial, ví credit, CreditMeter, hạn mức

## HEADER
- TIP-ID: TIP-009
- Project: AppChat V2
- Module: `packages/db/prisma/platform/billing.prisma` · `packages/core/src/billing` · `apps/api/src/http/billing` · `packages/shared/src/{billing,api/billing.ts}`
- Depends on: TIP-004 (workspace, membership), TIP-006 (consumer `events`, `notify.requested`) — nhánh xếp chồng từ `tip/006-realtime-notify`
- Priority: P0 · REQ: A06 (trial 15 ngày Cá nhân Pro + 10.000 credit), L01 (một đơn vị credit, ví theo workspace, lịch sử), L02 (bảng gói + hạn mức trong DB, áp hạn mức), L03 (hết credit chặn AI, cảnh báo 80%, nạp xong mở lại)
- Estimated effort: 10 giờ
- **Files touched:**
  - Schema: `packages/db/prisma/platform/billing.prisma` (điền: `plan`, `subscription`, `credit_wallet`, `credit_ledger`) + migration `platform/migrations/<ts>_009_billing` (CHECK ví ≥ 0, unique `(workspace_id, ref_type, ref_id)`, index ledger `(workspace_id, created_at DESC, id DESC) INCLUDE (delta, kind)`, partial index subscription trial đang chạy).
  - Shared: `packages/shared/src/billing/plans.ts` (seed 8 gói theo prototype: giá, credit / tháng, số user / kênh / agent; `null` = không giới hạn; `TRIAL_PLAN_KEY='personal_pro'`, `TRIAL_DAYS=15`, `TRIAL_CREDITS=10000`, `FREE_PLAN_KEY='free'`), `packages/shared/src/api/billing.ts` (shape đọc), `events.ts` (+ `credits.low` / `credits.exhausted` / `credits.restored`, `subscription.changed`, `trial.expired`).
  - Core: `packages/core/src/billing/{billing.module.ts, public.ts, seed.ts (plan seed ở DB nền tảng — idempotent), services/{subscriptions.service,wallet.service,credit-meter,quota.service,billing-read.service}.ts, events/billing.consumers.ts (workspace.declared → bắt đầu trial), jobs/{trial-expiry.processor.ts, billing.jobs.module.ts}}`.
  - Identity (facade): `WorkspacesService.me` điền `plan`, `trial_ends_at` + `billing { trial_days_left, paid_plan, wallet_balance }` qua port `BillingSummaryPort` (không import ngược billing → identity).
  - API: `apps/api/src/http/billing/{billing.controller.ts, billing.http.module.ts}` — `GET /v1/billing/summary`, `/v1/billing/plans`, `/v1/billing/wallet`, `/v1/billing/ledger?cursor=`.
  - Test: `packages/shared/src/billing/plans.test.ts`, `packages/core/test/billing-unit.test.ts`, `apps/api/test/integration/billing.test.ts`, `apps/web/src/shared/api/mock/billing-shape.test.ts`.
- **Parallel-safe with:** 010 (hoá đơn gói dùng `WalletService.topup` / `SubscriptionsService.activate`), 019 (CreditMeter), 014 / 021 (quota kênh / agent)

## CONTEXT
- Blueprint §2.2 `[P] platform/billing.prisma` (plan, subscription, credit_wallet, credit_ledger), §2.0 "Thao tác chạm cả hai DB" (nền tảng trước, khoá idempotent `credit_ledger (ws, ref_type, ref_id)`), §5.1 Usage (`CreditMeter.charge(ws, provider, model, in, out, runId, stepIdx)`, idempotent `(ws, 'ai_step', runId:stepIdx)`, trước mỗi bước kiểm `balance > 0`, hết → `CREDIT_EXHAUSTED`), §2.3 (`credits.low|exhausted|restored`, `subscription.changed`, `trial.expired`), §4.4 billing (`GET /v1/billing/summary|plans|ledger`), §1.3 queue `scheduler` (trial), Auth flow (khai báo → trial + 10.000 credit).
- `model_price` thuộc TIP-019 (`platform/ai-config.prisma`) → CreditMeter nhận đơn giá qua port `PriceBook`; TIP-009 cài `StaticPriceBook` cho test, TIP-019 cài bản đọc bảng.
- FE mock: `/billing/summary` `{ plan_key, plan_name, status, activated_at, expires_at, days_left, period_pct, users{used,max}, channels{used,max}, credits_month, balance, plan_balance, topup_balance }`; `/billing/plans` `{ plans{personal,business}, compare, credit_packs, addons }`; `/billing/wallet` `{ plan_balance, topup_balance, days_estimate, low_alert, ledger[] }`; `/me.billing { trial_days_left, paid_plan, wallet_balance }`.

## TASK
1. **Schema [P]** theo Blueprint §2.2; tiền / credit `bigint`; `credit_wallet` CHECK `plan_balance >= 0 AND topup_balance >= 0`.
2. **Seed gói** ở DB nền tảng (job / `db:setup`), idempotent theo `key`, 8 gói prototype; `free.archive_inactive_days = 90`.
3. **Trial:** consumer `billing.trial` nghe `workspace.declared` → subscription `trialing` gói `personal_pro`, `trial_ends_at = +15 ngày`, ví cấp 10.000 credit (`grant`, ref `trial:<ws>`) — chạy lại không cấp lần hai. Scheduler `billing.trial-expiry` (repeatable 10 phút): quá hạn → hạ về `free` (`active`), ví `plan_balance` = credit gói Miễn phí (`expire` + `grant`), phát `trial.expired` + `subscription.changed` + `notify.requested` cho Owner (dữ liệu giữ nguyên).
4. **WalletService / CreditMeter:**
   - `charge({ ws, refType, refId, credits, meta })` trong một transaction nền tảng: khoá dòng ví (`FOR UPDATE`), trừ `plan_balance` trước rồi `topup_balance`; thiếu → `CREDIT_EXHAUSTED` 402 (không trừ một phần); ghi ledger `usage` (unique ref → lần 2 trả kết quả cũ, không trừ lại).
   - `CreditMeter.charge(ws, provider, model, in, out, runId, stepIdx)` = `PriceBook` (credit / 1k token in + out, làm tròn lên) → `charge` với ref `ai_step:runId:stepIdx`; `assertBalance(ws)` trước mỗi bước.
   - `grant` / `topup` / `adjust` (ledger idempotent theo ref) cho TIP-010 / 040.
   - Ngưỡng: số dư ≤ 20% hạn mức tháng → `credits.low` một lần mỗi kỳ (`warn_80_sent_at`); ≤ 5% → `warn_95_sent_at`; về 0 → `credits.exhausted`; từ 0 lên > 0 → `credits.restored` (kèm `notify.requested` `ai_budget` cho Owner).
5. **Quota:** `QuotaService.assert(ws, 'users' | 'channels' | 'agents', current)` → `PLAN_LIMIT_REACHED` 402 `fields { resource, limit }`; `null` = không giới hạn. TIP-013 / 014 / 021 gọi khi tạo.
6. **Đọc:** `GET /v1/billing/summary` (gói, trạng thái, ngày còn lại, % kỳ, hạn mức + đã dùng (user từ membership; kênh = 0 tới TIP-014), credit), `/v1/billing/plans` (từ bảng `plan` + bảng so sánh / gói credit / addon từ cấu hình shared), `/v1/billing/wallet` (số dư + 50 dòng ledger gần nhất), `/v1/billing/ledger?cursor=`; `/v1/me` điền plan / trial.

## SPECIFICATIONS
### Business Rules
- Trừ `plan_balance` trước, `topup_balance` sau; `plan_balance` reset mỗi kỳ (không cộng dồn), `topup_balance` không hết hạn.
- Hết credit chỉ chặn AI (`CREDIT_EXHAUSTED`); dữ liệu, hộp thư dùng bình thường. Chuyển hội thoại `auto` về người là consumer `credits.exhausted` của TIP-016 / 022.
- Trial chỉ một lần mỗi workspace; hết trial → Miễn phí, không xoá dữ liệu.
- Người xem `billing/*`: thành viên workspace (summary / plans / wallet); permission `billing.manage` chỉ cần cho ghi (TIP-010 / 039).

### Validation & Error Handling
- `CREDIT_EXHAUSTED` 402, `PLAN_LIMIT_REACHED` 402 (Blueprint §4.1).

## ACCEPTANCE CRITERIA
1. Migration 009 áp lên DB nền tảng; CHECK ví từ chối số âm; unique ledger `(workspace_id, ref_type, ref_id)`.
2. Seed 8 gói khớp prototype (giá, credit / tháng, user / kênh / agent; free 90 ngày lưu trữ); chạy lại không nhân đôi.
3. Khai báo DN (`business_profile.update` lần đầu → `workspace.declared`) → trial Cá nhân Pro 15 ngày + 10.000 credit; event chạy lại không cấp thêm.
4. `charge`: trừ plan trước rồi topup; thiếu → `CREDIT_EXHAUSTED`, số dư không đổi; cùng ref hai lần → trừ một lần; 20 lần charge song song không âm, tổng đúng.
5. `CreditMeter.charge` theo đơn giá (làm tròn lên) + ref `ai_step`; `assertBalance` ví 0 → `CREDIT_EXHAUSTED`.
6. Ngưỡng: xuống ≤ 20% → `credits.low` (một lần), về 0 → `credits.exhausted`, nạp lại → `credits.restored`; Owner nhận thông báo `ai_budget`.
7. Hết trial (scheduler, đồng hồ test) → gói `free`, `trial.expired` + `subscription.changed`, thông báo Owner; dữ liệu tenant giữ nguyên.
8. Quota: thêm vượt hạn mức → `PLAN_LIMIT_REACHED` 402 `fields { resource, limit }`; gói không giới hạn → luôn qua.
9. `GET /v1/billing/summary|plans|wallet|ledger` đúng shape `packages/shared/src/api/billing.ts` (mock FE parse cùng schema); `/v1/me` có `plan`, `trial_ends_at`, `billing.trial_days_left`.
10. Cổng D59 xanh (+ smoke bản build).

## CONSTRAINTS
- Không đổi schema action. Không ghi credit từ DB tenant (luôn nền tảng trước — Blueprint §2.0).
- `model_price` / router LLM là TIP-019; hoá đơn gói / QR / đối soát là TIP-010; UI Gói & ví là TIP-039.

## ⚠️ BUILDER-CHECKLIST
- [ ] Đúng `Files touched` · 10 AC có test thật (Postgres + Memurai)
- [ ] Cổng D59 trước commit + chốt TIP
- [ ] Commit + SHA + report + ba sổ + tiến độ
