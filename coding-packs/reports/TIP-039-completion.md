### COMPLETION REPORT — TIP-039 (pha 1 / 3)

> TIP XL, chia ba pha (DC-367), mỗi pha một PR:
> - **pha 1** (file này): vòng đời gói backend — kỳ Credit, ghi nhận hoá đơn theo ảnh chụp, nâng / hạ gói, addon, hết hạn, backfill;
> - **pha 2**: `wallet.update_alerts`, consumer hết Credit bền, `BillingNoticeHost`;
> - **pha 3**: đọc / UI — ledger cursor, `channels.used` từ tenant, PlanChangeModal, popup hết hạn, `billing.contact_sales`, PDF hoá đơn, parity, E2E.

**STATUS:** MỘT PHẦN — xong **pha 1**.
- Đạt: AC01, AC02, AC04 (phần backend).
- Đạt phần backend: AC03 (preview server + ghi nhận; FE ở pha 3), AC09 (trạng thái hết hạn + giữ 30 ngày; popup ở pha 3), AC10 (khôi phục sau lỗi + EXPLAIN; E2E mobile ở pha 3).
- AC05–AC08 thuộc pha 2–3.

**COMMIT:** `081f6bac` (code + test) · `99a97695` (sổ / report); SHA cuối nhánh ở bảng tiến độ `goals/GOAL-RELEASE.md` (dòng 18).

**MIGRATION:** platform `20261102003900_billing_lifecycle`.
- Subscription thêm:
  - neo kỳ `anchor_day` / `anchor_hm` / `anchor_tz`;
  - `next_grant_at`;
  - `pending_plan_id` / `pending_effective_at` / `pending_months` / `pending_price`;
  - `expired_at`, `retain_until`;
  - `term_months`, `term_price`;
  - `version`.
- CHECK constraints: neo đủ-hoặc-không, pending đủ-hoặc-không, kỳ hợp lệ.
- Invoice thêm `snapshot` jsonb và `hold_reason`.
- Bảng mới:
  - `subscription_addon` (unique `invoice_id`);
  - `billing_period_grant` (unique `workspace_id, period_key`);
  - `sales_inquiry` (dùng ở pha 3).
- Index:
  - `subscription_grant_due_idx`, `subscription_anchor_missing_idx`, `subscription_period_end_idx` (partial, INCLUDE `workspace_id`);
  - `billing_invoice_paid_unfulfilled_idx` (partial, `hold_reason IS NULL`);
  - `billing_invoice_paid_addon_idx`;
  - `subscription_addon_active_idx` (INCLUDE `quantity`).

Đây là DB nền tảng, không có migration tenant. Sau merge, `pnpm --filter @appchat/db db:migrate-tenants` (áp cả migration platform còn thiếu) rồi build lại api + worker.

Queue lịch billing đổi tên: `scheduler` → `billing-scheduler`. Lịch cũ trên Redis (`billing.trial-expiry`, `billing.invoice-sweep`, `billing.reconcile` ở queue `scheduler`) không còn worker nào nhận. Nên xoá bằng `removeJobScheduler` khi triển khai; nếu không xoá cũng vô hại vì không ai tiêu thụ.

**FILES CHANGED** (manifest pha 1; ngoài manifest ghi ở DV-034)
- shared:
  - `billing/periods.ts` (+ test): `anchorOf`, `addMonthsAnchored`, `monthAt`, `periodKey`, `mulDivHalfUp`, `prorate`;
  - i18n server `billing` (sổ `plan_upgrade`).
- db: `billing-lifecycle.prisma`, `billing.prisma`, `billing-payments.prisma`, migration trên.
- actions: `billing-lifecycle.ts` gồm `billing.lifecycle_step` và `billing.apply_invoice` — system-only, `permission 'self'`, `agentGrantable false`, `db 'platform'`.
- core `billing/`:
  - `lifecycle/{types,apply-invoice}.ts`;
  - `services/{periods,plan-changes,addons}.service.ts`;
  - `services/{wallet,quota,subscriptions}.service.ts`;
  - `payments/{fulfil,invoices.service}.ts`;
  - `actions/lifecycle.handlers.ts`;
  - `jobs/{lifecycle.runner,addon-backfill,billing.jobs.module}.ts`;
  - `billing.module.ts`, `public.ts`, preview `billing.create_invoice`.
  - Người gọi `QuotaService` được thêm clock.
- web: `actions.json` vi / en (2 action hệ thống).

**TEST RESULTS** (pha 1)

1. **AC01 kỳ** — **pass**. `billing-lifecycle.test.ts` AC01 (2 test) + `shared/billing/periods.test.ts` (7 test).
   - Gói tháng mua 31/01: kỳ 31/01 → 28/02 → 31/03 (ngày ngắn rồi trở về 31).
   - Gia hạn trước hạn nối tiếp kỳ sau.
   - Hai lượt `runLifecycle` song song cộng thêm một replay: đúng 1 biên nhận mỗi kỳ.
   - Credit gói cũ hết hạn, không cộng dồn; topup 500 giữ nguyên.
   - Hết kỳ không gia hạn → `expired`, plan 0, topup giữ, `retain_until` = +30 ngày, có event `subscription.changed`.
   - Gói năm cấp từng tháng (không cấp trước 12 tháng). Downtime 15/01 → 20/05: chỉ cấp kỳ 15/05; 02–04 ghi `skipped`.
   - Fixture DC-243: 10.000 × 10/31 → 3.226 (half-up một lần).
2. **AC02 ghi nhận lại** — **pass**.
   - `fulfil` lại hôm sau → false; `fulfilPending` → 0.
   - Gọi executor `billing.apply_invoice` → `replayed`.
   - Kỳ / gói / `version` / số dư nguyên; một dòng sổ `plan_grant` và một event `billing.invoice_paid`.
   - HTTP Owner gọi 2 action hệ thống → 403.
3. **AC03 nâng / hạ** — **pass (backend)**.
   - Nâng team → business ngày 16/04 trong kỳ 01/04 → 01/05:
     - hoá đơn `upgrade_proration` = (giá đích − giá đã trả) / 2;
     - Credit (đích − nguồn) / 2 cộng vào plan; topup nguyên; giữ ngày hết hạn 01/05.
   - Hoá đơn nâng tạo trước, trả sau khi đã hạ gói (version đổi):
     - `hold_reason = stale_version` + 1 `reconcile_finding`;
     - số dư không đổi.
   - Hạ gói → pending tới 01/05, áp một lần: gói team, kỳ 01/05 → 01/06, Credit team.
4. **AC04 addon** — **pass**.
   - Addon kênh mua 16/04 → 100.000đ (200.000 × 15/30), hết 01/05 cùng gói.
   - Hạn mức kênh = gói + 1; qua 01/05 → về gói.
   - Ghi nhận lại không cấp đôi (unique `invoice_id`).
   - Addon cũ không ảnh chụp → `legacy_addon`, không cấp.
   - Backfill addon trả trước 039 (kể cả đã `fulfilled_at`):
     - dry-run chỉ đếm;
     - chạy thật hai lần → giữ đối soát một lần, một finding;
     - addon có ảnh chụp mới không bị đụng.
5. **AC09 hết hạn** — **pass (backend)**: như AC01. Popup gia hạn FE ở pha 3.
6. **AC10 lỗi / hiệu năng** — **pass (backend)**.
   - Lỗi `before_tenant` sau commit nền tảng: `fulfilled_at` đã ghi, outbox chưa có.
   - `recoverOperations` làm nốt: 1 event `billing.invoice_paid`, 1 dòng sổ (không cấp đôi).
   - EXPLAIN (`ANALYZE` trước, `enable_seqscan` / `enable_bitmapscan` off): lịch cấp kỳ → `subscription_grant_due_idx`; neo thiếu → `subscription_anchor_missing_idx`; hoá đơn chờ → `billing_invoice_paid_unfulfilled_idx`; backfill → `billing_invoice_paid_addon_idx`; hạn mức addon → `subscription_addon_active_idx`; biên nhận kỳ → `billing_period_grant_workspace_id_period_key_key`.
7. **AC05–AC08** — **chưa làm (pha 2–3, DC-367)**.

**Cổng D59 (phạm vi TIP):**
- Đầu cổng: `pnpm --filter @appchat/db db:test-reset` (áp migration 039).
- Unit:
  - shared 26 file / 142;
  - actions 3 / 12;
  - core 101 / 646.
- Integration:
  - `billing-lifecycle.test.ts` 10 / 10;
  - ma trận `billing.lifecycle_step` + `billing.apply_invoice` 6 / 6;
  - hồi quy sau `db:test-reset`: billing / billing-payments / hardening cross-db + reconcile / webchat / agent-channel-config / onboarding / custom-roles + ma trận billing / admin.invoice / member.invite / channel / agent.create / email — **36 file / 164 test xanh**.
- Lint + typecheck (core, actions, shared, db, api, worker) xanh.
- `pnpm depcheck` 0 lỗi (baseline).
- `lint:size` không file nào vượt trần (lớn nhất `apply-invoice.ts` 235 dòng).
- `lint:tokens` xanh; i18n vi / en 5724 key, 100%.
- Build api + worker xanh; `pnpm check:bundle` (api 34 / worker 30 gói khai đủ).
- Không đổi UI ở pha 1, nên không chạy parity / E2E (pha 3 chạy).

**ISSUES DISCOVERED:**
- `seedPlans` (core/billing/seed.ts) không đặt `price_year`, vì PLAN_SEEDS chỉ có giá tháng. Giá năm do Quản trị nền tảng nhập (TIP-040). Test gói năm tạo gói thử riêng. Mua gói năm sẽ trả 422 tới khi có giá năm; không tự đặt giá.
- Queue `scheduler` dùng chung trước 039: worker billing nhận job lạ rồi báo thành công. Đã tách queue riêng và job lạ → lỗi.
- Hai scheduler 038 (`follow-up` / `digest`) đọc sai đường kết quả executor — đã sửa ở 038 pha 4.

**GIẢ ĐỊNH ĐÃ CHỌN** (DC-367):
- Nâng / hạ so giá kỳ đích với giá kỳ ĐÃ TRẢ cùng độ dài kỳ. Bằng giá → đổi từ kỳ sau.
- Hoá đơn không khớp → giữ đối soát, không đoán.
- Subscription cũ được khởi tạo neo một lần, không cấp hồi tố.
- Addon không có gói trả phí → một tháng, giá đủ.
- Backfill addon cũ chạy lúc boot ROLE=jobs (idempotent, chỉ cờ + finding).

**Lệch spec / prototype:**
- DV-034: file ngoài manifest và file manifest dời sang pha 2–3.
- Không thêm thư viện; không đổi giá / quyền / luật commerce.

**ĐỐI CHIẾU STANDARDS:**

| Standard | Tuân thủ (file:dòng / test) | Lệch |
|---|---|---|
| `actions/action-registry.md` | 2 action trong `packages/actions/src/billing-lifecycle.ts` (zod in / out, risk write, `db 'platform'`, Example hợp lệ); handler `@ActionHandler` qua ActionExecutor; preview 403; `SYSTEM_ONLY` + tip-owners; ma trận 6 test | — |
| `events/outbox.md` · sổ thao tác 045b | Event trả ở `events` của pha nền tảng → pha tenant ghi outbox cùng biên nhận; test AC10 khôi phục sau lỗi `before_tenant` | — |
| `domain/concurrency.md` | Khoá workspace → subscription → wallet (`lockSub`); biên nhận unique; giành `fulfilled_at` cùng tx; song song 2 lượt → 1 grant | — |
| `domain/money-time-numbering.md` | Tiền bigint VND; prorate `mulDivHalfUp` half-up một lần (DC-243); kỳ theo múi workspace (`wallToUtc`), ngày 31 → cuối tháng ngắn | — |
| `domain/state-machine.md` | `active → expired` khi hết kỳ; pending áp một lần; `held` có lý do; không xoá dữ liệu (retain 30 ngày) | — |
| `database/indexing.md` | `=` trước, khoảng / sort sau; partial + INCLUDE; keyset theo id; EXPLAIN 6 truy vấn trong test | — |
| `authz/rbac-permissions.md` | Action hệ thống chỉ actor `system:billing`; HTTP Owner → 403; ẩn khỏi Trợ lý / agent | — |
| `ops/observability-security.md` | Log chỉ id / số đếm (`billing.lifecycle`, backfill); không payload ngân hàng / email | — |
| `code/file-size-module-layout.md` · `code/testing.md` | Mọi file dưới trần; test ở file riêng (unit shared, integration, ma trận) | — |
| `workflow/git-flow-ci.md` | Nhánh `tip/039-billing-lifecycle` từ `origin/dev` `dda1e705`, PR vào `dev` | — |
| `plans/COMMERCE-DECISIONS.md` §10 | Nâng giữa kỳ tính chênh + cộng Credit chênh; hạ gói từ kỳ sau; Credit gói không cộng dồn, topup không hết hạn; không đổi giá | — |

---

## PHA 2 — Cảnh báo ví, hết Credit bền, popup toàn app (AC05–AC06)

**STATUS:** MỘT PHẦN — xong **pha 2**. AC05, AC06 đạt. Pha 3 còn: đọc / UI, ledger cursor, `channels.used`, PlanChangeModal, popup hết hạn, `billing.contact_sales`, PDF, parity, E2E.

**COMMIT:** `53423a0a` (code + test) · `f95182e4` (sửa emitter realtime); SHA cuối nhánh ở bảng tiến độ (dòng 18). Nhánh `tip/039-billing-alerts` xếp chồng #98.

**MIGRATION:** không có.

**FILES CHANGED** (ngoài manifest ghi ở DV-035)
- core:
  - `billing/actions/wallet-alerts.handler.ts` (`wallet.update_alerts` — PlatformTx, khoá dòng ví, ví tạo lười, before / after, preview);
  - `ai/reply/credit-handoff.consumer.ts` (consumer `ai.credit-handoff`);
  - `billing/events/billing.rules.ts` (realtime `billing.notice` / `billing.changed`);
  - `billing/billing.module.ts`, `billing/jobs/billing.jobs.module.ts` (đăng ký), `ai/public.ts`.
- web:
  - `shared/billing/{billing-notices.ts, BillingNoticeHost.tsx, credit-error.ts}` (+ test);
  - `shared/shell/AppShell.tsx` (gắn host);
  - `shared/actions/useAction.ts` (402 CREDIT_EXHAUSTED → popup ví; PLAN_LIMIT_REACHED giữ toast riêng);
  - i18n `shell.billingNotice` vi + en.

**TEST RESULTS** (pha 2)
1. **AC05 hết Credit** — **pass**. `billing-alerts.test.ts` AC05 (3 test).
   - Chỉ hội thoại `auto` đang rảnh / chạy sang người (lý do credit, outbox `ai.handoff`).
   - Copilot / AI tắt / đã có người / chờ duyệt / đóng không bị đụng.
   - Chạy lại → 0, không thêm `ai.handoff`.
   - Event đến trễ sau khi đã nạp (ví > 0) → không chuyển. `credits.restored` không giành lại hội thoại đã chuyển.
   - Charge hết qua đường thật → event `credits.exhausted` ghi outbox tenant (consumer bền ở ROLE=jobs).
2. **AC06 cảnh báo / popup** — **pass**.
   - `wallet.update_alerts`: Owner tắt / bật → persist, action_log before / after, đọc lại `/billing/wallet` đúng; tắt nhắc vẫn chặn AI (CREDIT_EXHAUSTED).
   - Ma trận 3: preview Trợ lý → xác nhận; Sales / CSKH 403; không agentGrantable.
   - Web `billing-notices.test.ts` (5) + `BillingNoticeHost.test.tsx` (3):
     - chống trùng theo `event_id`;
     - hết Credit không bị nhắc 80 / 95 đè;
     - `restored` chỉ thay thông báo hết; khác workspace không mang sang;
     - 402 CREDIT_EXHAUSTED → popup, PLAN_LIMIT_REACHED → không;
     - người có `billing.manage` thấy Nạp Credit, người khác chỉ nhắc liên hệ Chủ sở hữu;
     - event hết đến trễ khi ví > 0 → không hiện.
3. **AC8 cũ** (`actions.test.ts`): không còn action NOT_IMPLEMENTED (`pendingByTip()` rỗng).

**Cổng D59 (phạm vi TIP):**
- Lint + typecheck (core, web, api, worker) xanh — web 13 cảnh báo baseline, không ở file sửa.
- Unit: core 102 / 648 (+ `realtime-emitter.test.ts` 2) · web 102 / 322.
- Integration: `billing-alerts` 7 + ma trận `wallet.update_alerts` 3 + hồi quy (billing ×3, actions, notify, realtime, record-scope-realtime, agent-reply, takeover, inbox-ui, cross-db) — **13 file / 102 test, 0 unhandled error**.
- `lint:size`, `lint:tokens` xanh; i18n vi / en 5733 key, 100%; depcheck 0 lỗi.
- Popup chỉ render khi có thông báo, nên DOM các màn không đổi → không chạy parity. E2E popup qua realtime cần stack http + ví cạn — gộp vào E2E `billing-lifecycle.spec.ts` ở pha 3.

**ISSUES DISCOVERED:**
- Chạy chung bộ hồi quy, `record-scope-realtime` có 4 unhandled rejection "Connection is closed". Chạy riêng thì sạch; khi chưa có test mới của pha 2 cũng sạch.
  - Nguyên nhân: `@socket.io/redis-emitter` gọi `client.publish()` rồi bỏ promise. Redis rớt hoặc đang `quit` → unhandled rejection; trên production có thể làm sập worker.
  - Đã sửa (`f95182e4`): `RedisRealtimeEmitter` bọc `publish`, lỗi ghi cảnh báo qua logger. Thêm test `realtime-emitter.test.ts`.

**GIẢ ĐỊNH ĐÃ CHỌN** (DC-367):
- Popup cho mọi thành viên đang mở app.
- Nút nạp chỉ hiện với `billing.manage`.
- Đọc lại số dư trước khi hiện "hết" / "đã có lại".
- Chuông thông báo vẫn chỉ gửi Owner, như cũ.
- Hội thoại đã chuyển sang người không tự quay về AI.
