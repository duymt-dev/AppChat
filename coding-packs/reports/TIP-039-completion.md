### COMPLETION REPORT — TIP-039 (đủ 3 pha — DONE)

> TIP XL, chia ba pha (DC-367), mỗi pha một PR:
> - **pha 1** (file này): vòng đời gói backend — kỳ Credit, ghi nhận hoá đơn theo ảnh chụp, nâng / hạ gói, addon, hết hạn, backfill;
> - **pha 2**: `wallet.update_alerts`, consumer hết Credit bền, `BillingNoticeHost`;
> - **pha 3**: đọc / UI — ledger cursor, `channels.used` từ tenant, PlanChangeModal, popup hết hạn, `billing.contact_sales`, PDF hoá đơn, parity, E2E.

**STATUS (pha 1):** xong **pha 1**. Trạng thái cả TIP: **DONE** — xem PHA 3 cuối file.
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

## PHA 3 — Đọc / UI, liên hệ, PDF, đổi gói, hết hạn (AC03 FE, AC07–AC10)

**STATUS:** **DONE** — đủ AC01–AC10. Nhánh `tip/039-billing-ui` xếp chồng trên #99.

**COMMIT:**
- `873f1ee1` (3a): channels.used, hạn mức addon, ledger lọc server-side.
- `5465d60e` (3b): `billing.contact_sales` + ContactSalesModal.
- `00776b5b` (3c): PDF, `/billing/quote` + PlanChangeModal, popup hết hạn.
- `5afba3f8`: E2E http.
- SHA cuối nhánh ở bảng tiến độ (dòng 18).

**MIGRATION:** platform `20261106103900_billing_ledger_filters`:
- `credit_ledger_ws_source_created_idx` (partial `source IS NOT NULL`);
- `credit_ledger_ws_kind_created_idx`.

Không có migration tenant. Sau merge chạy `pnpm --filter @appchat/db db:migrate-tenants` (áp cả migration platform còn thiếu).

**FILES CHANGED** (ngoài manifest ghi ở DV-036)
- shared:
  - `api/billing.ts`: `tenantUsage.available`, `retain_until`, `billQuoteSchema`;
  - `events.ts`: `sales.inquiry_created`;
  - i18n server `billing.pdf`.
- actions: `billing-lifecycle.ts` thêm `billing.contact_sales` (billing.manage, risk write, `db 'platform'`, không agentGrantable).
- core `billing/`:
  - `services/billing-read.service.ts`: `channels.used` từ tenant + chỗ giữ, max gồm addon, `retain_until`;
  - `services/ledger-reader.ts`: lọc kind / dir / source / from-to theo múi workspace, cursor keyset, deferred join;
  - `actions/contact-sales.handler.ts`: khoá dòng workspace, 3 / 24 giờ, event chỉ id;
  - `services/invoice-pdf.ts` (HTML → PDF qua DocRenderer), `services/quote-view.ts`;
  - `billing.module.ts`, `public.ts`, `kernel/actions/tip-owners.ts`.
- api:
  - `http/billing/billing.controller.ts`: `/ledger` lọc, `/quote`, `/invoices/:id/pdf`;
  - `billing.http.module.ts`: provider PDF + DocumentsModule.
- web:
  - `features/settings/components/{ContactSalesModal,PlanChangeModal,WalletLedger,BillingSection,BillInvoiceTable,BillingModals,PlanCards,UpgradeModal,WalletShop}.tsx`;
  - `hooks/{useWalletLedger,useInvoicePdf}.ts`, `billing-store.ts`, `api.ts`, `types.ts`, `styles/contact-sales.styles.ts`;
  - `shared/billing/PlanExpiredNotice.tsx` (gắn AppShell);
  - mock `settings-billing.ts`: `/billing/ledger` lọc, `/billing/quote`, `billing.contact_sales`, blob PDF;
  - i18n vi + en: `settings.billing.{contact,change,hero.*,inv.pdf*}`, `settings.wallet.ledger.*`, `shell.planExpired`, `actions.billing.contact_sales`.

**TEST RESULTS** (pha 3)

1. **AC03 FE** — **pass**.
   - `billing-quote.test.ts` (3), theo thứ tự:
     - quote mua mới → báo hoá đơn chờ sẽ được dùng lại;
     - gia hạn nối tiếp ngày hết hạn;
     - nâng giữa kỳ: chênh × 15/30, Credit chênh, giữ ngày hết hạn — số tiền khớp đúng hoá đơn tạo sau đó;
     - đổi xuống áp từ kỳ sau.
   - Tham số lạ → 400; gói Miễn phí → 422; Sales → 403.
   - `PlanChangeModal.test.tsx` (3).
2. **AC07 đọc / ledger** — **pass**. `billing-read.test.ts` (6):
   - `channels.used` đếm kênh chưa ngắt, tách theo workspace; max cộng addon;
   - DB tenant lỗi → `available: false`;
   - 130 dòng, cursor đi hết không trùng;
   - lọc vào-ra / nguồn / loại / ngày trước LIMIT; lọc ngày theo múi workspace ra đúng 24 dòng;
   - tham số lạ → 400 có ô lỗi;
   - EXPLAIN dùng 2 index mới.
3. **AC08 PDF / liên hệ** — **pass**.
   - `billing-invoice-pdf.test.ts` (3, LibreOffice thật):
     - header: application/pdf, attachment theo mã, `private, no-store`, nosniff;
     - chữ trong PDF có mã, nội dung chuyển khoản, số tiền, thông tin xuất hoá đơn đúng ảnh chụp (đổi hồ sơ sau đó không đổi PDF) và dòng "không thay thế hoá đơn GTGT";
     - tiếng Anh theo locale người xem;
     - workspace khác / id lạ / id sai dạng → 404; Sales → 403.
   - `actions/billing.contact_sales.action.test.ts` (7):
     - một dòng mỗi Idempotency-Key;
     - email / SĐT bị che trong action_log; outbox chỉ có id;
     - consent false / SĐT sai → 422;
     - Sales / CSKH → 403;
     - quá 3 / 24 giờ → 429; qua 24 giờ gửi lại được;
     - hai request song song khi còn 1 chỗ → chỉ một thành công;
     - preview Trợ lý.
   - Web: `ContactSalesModal.test.tsx` (5), mock `billing-shape.test.ts` (+2).
4. **AC09 hết hạn** — **pass**.
   - `billing-quote.test.ts`: hết kỳ không gia hạn → summary `expired` + `retain_until` +30 ngày; gia hạn sau đó tính là mua mới.
   - `PlanExpiredNotice.test.tsx` (3): nút Gia hạn chỉ cho billing.manage, người khác thấy nhắc Chủ sở hữu, đóng rồi không bật lại cùng kỳ.
   - Không hồi quy trial 009 / QR 010 / pending_review: `billing.test.ts`, `billing-payments.test.ts`, E2E http `billing.spec.ts`.
5. **AC10 resilience / perf** — **pass**. Pha 1: fault + recover. Pha 3: EXPLAIN ledger, schema hợp đồng HTTP, E2E.

**Cổng chốt TIP** (D59, phạm vi TIP):
- `pnpm --filter @appchat/db db:test-reset` đầu cổng — xanh.
- Lint + typecheck core / shared / actions / web / api — xanh.
- Unit: shared 142 · core 648 · actions 12 · web (settings + shared/billing + mock) 206.
- `depcheck` 0 lỗi; `lint:size`, `lint:tokens` xanh; i18n vi / en 5793 key, 100%.
- Build api + worker + `pnpm check:bundle` — xanh (api 34, worker 30 gói khai đủ).
- Integration billing + ma trận billing / wallet + `actions.test.ts` — **15 file / 82 test** xanh.
- E2E mock (`settings-billing`, `invoices`) — 13 passed; 13 skipped là dự án mobile của luồng desktop.
- E2E http (`billing-lifecycle`, `billing`) trên API 4327 / web 3428 — 3 passed; 3 skipped (mobile).
- Parity (local, web mock 3462), đều ≤ 4,2%:
  - settings:billing 3,34%;
  - settings:wallet 3,88%;
  - modal:upgrade 4,14%;
  - modal:buy-credit 3,68%.
- SePay / Brevo thật: **chưa nghiệm thu với provider thật** (Q-004). Webhook ngân hàng dùng feed mock có HMAC.

**ISSUES DISCOVERED:** không có lỗi mới ngoài phạm vi.

**GIẢ ĐỊNH ĐÃ CHỌN** (DC-367):
- PDF là "Đề nghị thanh toán" (COMMERCE Q2), không phải hoá đơn GTGT; render qua LibreOffice như các chứng từ khác (DV-036).
- Giới hạn liên hệ: 3 yêu cầu / 24 giờ mỗi workspace. Đội vận hành đọc chi tiết ở Quản trị nền tảng (TIP-040).
- Popup hết hạn nhớ theo phiên trình duyệt (gói + ngày hết hạn). Xoá / lưu trữ sau 30 ngày thuộc TIP-041.

### Đối chiếu standards

| Standard | Áp dụng ở TIP-039 | Bằng chứng |
|---|---|---|
| actions/action-registry | `billing.lifecycle_step` / `apply_invoice` (system-only), `wallet.update_alerts`, `billing.contact_sales` qua ActionExecutor; FE ghi chỉ bằng `useAction` | ma trận `actions/billing.*.action.test.ts`, `wallet.update_alerts.action.test.ts` |
| api/response-envelope | `{ data }` / `{ data, next_cursor }` / lỗi `{ error: { code, fields } }`; tiền string VND; Idempotency-Key cho money / create | `billing-read.test.ts` (schema), `billing-quote.test.ts` |
| events/outbox | `credits.*`, `subscription.changed`, `sales.inquiry_created` (chỉ id) qua outbox tenant; consumer `ai.credit-handoff` bền | `billing-alerts.test.ts`, `billing.contact_sales.action.test.ts` |
| database/indexing | composite `=` trước, sort sau; partial (`source IS NOT NULL`, paid unfulfilled); INCLUDE; deferred join ledger; EXPLAIN | `billing-lifecycle.test.ts` EXPLAIN 6 index, `billing-read.test.ts` EXPLAIN 2 index |
| database/tenant-db | `channels.used` đọc qua `TenantDbResolver` + `TenantContexts.system`; không `workspace_id` ở bảng tenant | `billing-read.test.ts` (hai workspace) |
| authz/rbac-permissions | hoá đơn / quote / PDF / liên hệ cần `billing.manage`; khác workspace 404; người khác chỉ thấy nhắc Chủ sở hữu | test 403 / 404 ở các file trên, `PlanExpiredNotice.test.tsx` |
| domain/money-time-numbering | prorate bigint half-up; kỳ neo ngày theo múi workspace; lọc ngày ledger theo múi workspace | `shared/billing/periods.test.ts`, `billing-read.test.ts` |
| domain/concurrency | khoá workspace → subscription → wallet; liên hệ khoá dòng workspace trước khi đếm | test song song AC01, contact_sales song song |
| ops/observability-security | email / SĐT che trong action_log (REDACT_KEYS); PDF `private, no-store`, nosniff; không link công khai | `billing.contact_sales.action.test.ts`, `billing-invoice-pdf.test.ts` |
| documents/templates | chứng từ nền tảng có dòng "không thay thế hoá đơn GTGT"; LibreOffice không tải mạng | `billing-invoice-pdf.test.ts` |
| ui/prototype-parity + interaction-patterns | 4 màn billing ≤ 4,2%; hộp xác nhận / popup dùng FormModal / Modal sẵn có; chỉ token, không hard-code | `.data/gate/039-parity.log`, `lint:tokens` |
| i18n | mọi chuỗi vi + en (web + server) | i18n-check 100% |
| code/testing (D59) | test ở file riêng; cổng chốt theo phạm vi TIP | mục cổng ở trên |
