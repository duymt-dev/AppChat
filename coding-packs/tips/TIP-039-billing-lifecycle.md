# TIP-039 — Billing lifecycle, ví và gói chạy thật

## HEADER
- TIP-ID: TIP-039; Project: AppChat V2; Module: billing; Priority: P0; Estimated: XL.
- Depends on:009/010/011/013/014/021; tích hợp sau038/042c/043/045b và các pending TIP dùng shared indexes/locales, trước040/041/044/046.
- **Gate Q-031:** chưa chốt calendar/30-day credit period, phần credit upgrade prorate hay đủ chênh, thời hạn addon. Không tự quyết giá/quyền; khóa riêng các nhánh tiền này, không chặn viết pack khác.
- **Dòng COVERAGE nhận:** REQ-L03b/L05a/L05b/L05c/L06/L07c/L07d/L07e; COM-10-3/10-7; D09; DC056; DEF0091/0094/0101/0102/0105; ACT-wallet.update_alerts; PRO-settings-walletalerts/upgradecontact/tokenusage; Q031. L05a/L06 regression, không viết lại phần đã chạy.
- **Parallel-safe with:** sequential, shares `packages/actions/src/index.ts` với015b/020b/023b/023c/030b/032b/036/037/038/042/042b/043/045b; `coding-packs/plans/BLUEPRINT.md` với042c; settings locales/shared API/parity giao nhiều TIP trên. Đã tính giao và ghi hai chiều14 pendingTIP trước tạo. Chưa bảo đảm manifest6 TIP cũ đầy đủ: tính lại trước build.
- **Files touched:** bảng M=modify/C=create; chỉ làm sau câu A hoàn tất.

| Op | File |
|---|---|
| M | `packages/db/prisma/platform/billing.prisma` |
| M | `packages/db/prisma/platform/billing-payments.prisma` |
| M | `packages/actions/src/settings-ai.ts` |
| M | `packages/actions/src/index.ts` |
| M | `packages/shared/src/api/billing.ts` |
| M | `packages/shared/src/api/index.ts` |
| M | `packages/shared/src/index.ts` |
| M | `packages/shared/src/i18n/server/vi/billing.ts` |
| M | `packages/shared/src/i18n/server/en/billing.ts` |
| M | `packages/core/src/billing/billing.module.ts` |
| M | `packages/core/src/billing/public.ts` |
| M | `packages/core/src/billing/services/wallet.service.ts` |
| M | `packages/core/src/billing/services/subscriptions.service.ts` |
| M | `packages/core/src/billing/services/quota.service.ts` |
| M | `packages/core/src/billing/services/billing-read.service.ts` |
| M | `packages/core/src/billing/payments/fulfil.ts` |
| M | `packages/core/src/billing/payments/invoices.service.ts` |
| M | `packages/core/src/billing/jobs/billing.jobs.module.ts` |
| M | `packages/core/src/billing/events/billing.events.ts` |
| M | `apps/api/src/http/billing/billing.controller.ts` |
| M | `apps/api/src/http/billing/billing.http.module.ts` |
| M | `apps/web/src/features/settings/api.ts` |
| M | `apps/web/src/features/settings/types.ts` |
| M | `apps/web/src/features/settings/components/WalletSection.tsx` |
| M | `apps/web/src/features/settings/components/WalletLedger.tsx` |
| M | `apps/web/src/features/settings/components/WalletShop.tsx` |
| M | `apps/web/src/features/settings/components/UpgradeModal.tsx` |
| M | `apps/web/src/features/settings/components/BillInvoiceTable.tsx` |
| M | `apps/web/src/features/settings/components/BillingSection.tsx` |
| M | `apps/web/src/features/settings/components/BillingModals.tsx` |
| M | `apps/web/src/features/settings/hooks/useBuy.ts` |
| M | `apps/web/src/shared/actions/useAction.ts` |
| M | `apps/web/src/shared/shell/AppShell.tsx` |
| M | `apps/web/src/shared/api/mock/domains/settings-billing.ts` |
| M | `apps/web/messages/vi/settings.json` |
| M | `apps/web/messages/en/settings.json` |
| M | `apps/web/messages/vi/actions.json` |
| M | `apps/web/messages/en/actions.json` |
| M | `tools/parity/parity.manifest.ts` |
| M | `coding-packs/plans/BLUEPRINT.md` |
| M | `coding-packs/docs/06-prototype/DEVIATIONS.md` |
| C | `packages/db/prisma/platform/billing-lifecycle.prisma` |
| C | `packages/db/prisma/platform/migrations/20261102003900_billing_lifecycle/migration.sql` |
| C | `packages/actions/src/billing-lifecycle.ts` |
| C | `packages/core/src/billing/actions/wallet-alerts.handler.ts` |
| C | `packages/core/src/billing/actions/lifecycle.handlers.ts` |
| C | `packages/core/src/billing/actions/contact-sales.handler.ts` |
| C | `packages/core/src/billing/services/periods.service.ts` |
| C | `packages/core/src/billing/services/addons.service.ts` |
| C | `packages/core/src/billing/services/plan-changes.service.ts` |
| C | `packages/core/src/billing/services/ledger-reader.ts` |
| C | `packages/core/src/billing/services/invoice-pdf.tsx` |
| C | `packages/core/src/billing/events/credit-handoff.consumer.ts` |
| C | `packages/core/src/billing/jobs/lifecycle.runner.ts` |
| C | `packages/core/src/billing/jobs/billing-jobs.providers.ts` |
| C | `packages/core/src/billing/lifecycle/types.ts` |
| C | `packages/core/src/billing/lifecycle/providers.ts` |
| C | `apps/web/src/features/settings/components/PlanChangeModal.tsx` |
| C | `apps/web/src/features/settings/components/ContactSalesModal.tsx` |
| C | `apps/web/src/features/settings/hooks/useWalletLedger.ts` |
| C | `apps/web/src/shared/billing/BillingNoticeHost.tsx` |
| C | `apps/web/src/shared/billing/billing-notices.ts` |
| C | `packages/core/test/billing-lifecycle.test.ts` |
| C | `packages/core/test/billing-entitlements.test.ts` |
| C | `apps/api/test/integration/billing-lifecycle.test.ts` |
| C | `apps/api/test/integration/billing-contract.test.ts` |
| C | `apps/web/e2e/http/billing-lifecycle.spec.ts` |
| C | `coding-packs/reports/TIP-039-completion.md` |

## CONTEXT
- Workspace D:/CODING/AppChat_Ver2; stack CLAUDE/BUILDER-HANDOFF: NestJS/Prisma PostgreSQL native platform+tenant, BullMQ, React/AntD, React-PDF đã trong stack.
- `billing/services/wallet.service.ts:104–124` resetPlan expire plan rồi grant, topup giữ; chỉ trial/activate gọi, chưa recurring. `subscriptions.service.ts:91–105` activate upsert subscription trước kiểm duplicate ledger; replay cùng invoice có thể dời kỳ dù không cộng credit lại.
- `billing/payments/fulfil.ts:39–51` upgrade_proration đi chung activate mua mới; addon không cộng quota nhưng vẫn đánh fulfilledAt. Backfill không thể chỉ lấy paid+unfulfilled.
- `billing/services/billing-read.service.ts:73` channels.used=0; ledger chỉ50 dòng embedded và FE WalletLedger lọc local in/out; thiếu module/source filter trên toàn lịch sử.
- `settings-ai.ts:201` wallet.update_alerts đã ActionDef, chưa handler. WalletSection:30 đã gọi. UpgradeModal:55/WalletShop:39 Liên hệ chỉ toast.
- `billing/jobs/billing.jobs.module.ts:16–58` queue scheduler, chỉ trial/invoice; comment bỏ job lạ không bảo đảm xử lý đúng nếu nhiều worker khác chungqueue. Sales/booking hiện đã queue riêng, không khẳng định bug đang xảy ra nhưng phải kiểm routing.
- `billing/events/billing.events.ts` phát credits.exhausted/restored; không consumer chuyển toàn bộ auto conversations về human. reply.service chỉ xử lý lượt đang chạy.
- `wallet.service.ts:190+` claim flag sau commit rồi listener tới tenant outbox: crash tại giữa có thể mất notify.045b chịu bridge crossDB;039 phải fault-test usecase billing, không tuyên bố atomic bằng comment.
- SoT COMMERCE §10: không cộng dồn plan, topup không hết hạn, nâng giữa kỳ tiền theo ngày+credit chênh, hạ kỳ sau, QR/chuyển khoản duy nhất, không autopay. DC034 30ngày là đề xuất cũ, key period yyyy-mm chưa đủ nếu2 kỳ30ngày rơi cùng tháng; Q031 phải giải trước cấp tiền.

## APPLICABLE STANDARDS
Đọc `coding-packs/standards/`: actions/action-registry; events/outbox; api/response-envelope; database/tenant-db,indexing; authz/rbac-permissions; domain/money-time-numbering,concurrency,state-machine,validation-defaults,gap-filling; documents/templates; integrations/provider-ports; ops/observability-security; ui/frontend-structure,prototype-parity,interaction-patterns; i18n/i18n; code/file-size-module-layout,testing; workflow/git-flow-ci. Mọi tên trên là file .md.

## Rà trước khi làm
1. Chốt Q031 và bổ sung ví dụ số tiền/credit/period mong đợi vào task/AC trước coding phần đó. Không lấy im lặng làm phê duyệt.
2. Đối chiếu policy expiration30ngày ở REQ-L07d với041 free90dayarchive; không drop tenant từ billing job.
3. Kiểm045b platform action bridge/invalidation/authz snapshots; reuse transactional wallet APIs, không nested tx deadlock hoặc postcommit event không durable.
4. Đọc quota callers invite/connect/agent và counting convention; channels summary dùng đúng tập quota, không chỉ connected nếu pending đã chiếmslot.
5. Đo file caps. settings types/api và useAction nếu quá trần chỉ facade1–2 dòng sang module mới; thiếu manifest phải sửa trước code.
6. Read controller/DTO/mock mới nhất: giữ QR, VAT snapshot, pending_review, provider trust; không làm mock “paid” thành bằng chứng tiền thật.
7. Chỉ dùng isolated native test DB+Redis; không dừng service/demo, không in key/STK thật trong báo cáo.

## TASK

### 1. Platform entitlement schema và monthly jobs
- Schema platform billing-lifecycle: SubscriptionAddon (id,workspace_id,invoice_id unique,resource,quantity,starts_at,ends_at,status); billing period grant receipt (workspace,period identity unique,period_start/end,plan_snapshot,credits,ledger_ref,status); sales inquiry (id,workspace,requester,contact consent/details,status,created_at). Subscription thêm next_grant_at, pending_plan_id/effective_at, expiry/grace timestamps và version. Invoice lưu immutable pricing/entitlement snapshot cần cho upgrade/addon. Tenant không thêm workspace_id.
- Phân biệt paid subscription entitlement_end với credit allocation boundary; gói năm không cấp12tháng ngay. Grant expire plan remainder rồi cấp đúng một monthlyquota, không động topup. Due scheduler stable pagination/CAS, ledger+periodreceipt+advance mốc trong cùng platformtx; outbox bridge045b durable sau commit.
- Q031 quyết calendar hay30days: key legacy period:<ws>:<yyyy-mm> chỉ dùng nếu một allocation/mộtmonth; nếu30day phải identity anchored period_start/version, mappingmigration tránh duplicate. Không regrant cả kỳ đã mua ban đầu qua invoice.
- Catchup downtime tính kỳ hiện tại, không tích luỹ nhiều tháng plan credit; ledger ghi expire/grant rõ và receipts cho skipped periods, không giả usage. Race charge/renewal/upgrade dùng lock order workspace→subscription→wallet; transaction retry bounded.
- Internal lifecycle actions qua Executor/internal trusted context, không public/agentGrantable; schema/version/audit/outbox; queue dedicated billing-scheduler hoặc dispatcher chuẩn045b, không worker nhậnjob lạ rồi return thành công.

### 2. Fulfil, upgrade/downgrade và addons
- Sửa activate idempotency: receipt unique invoice_id kiểm dưới cùnglock trước sửa subscription; replay không dời ngày, không đổi plan, không reset credit. Fulfil invoice paid bằng snapshot đã xác nhận, không đọc giá gói mới để ghi lại lịch sử.
- Upgrade không gọi activate mua mới: server preview tiền chênh theo ngày còn lại, rounding theo standard, source/targetprice/period snapshot, quote expiry và version; confirm qua billing.create_invoice hoặc dedicated action có preview. Client không gửi giá authoritative. Khi tiền về sau period/plan change phải vào reconciliation có lý do, không âm thầm cấp sai gói hoặc mất tiền.
- COMMERCE giữ end-date hiện hành khi nâng giữa kỳ, cộng ngay credit chênh vào **plan bucket**, không reset phần đã dùng/không topup vĩnh viễn. Sốcredit chênh và pricing annual fraction cần Q031; không suy diễn từ giá tháng nếu năm có giảm. Hạ gói ghi pending_plan kỳ sau, cancellation pending qua action; không xoá resource vượt quota lúc hạ.
- Addon paid cấp entitlement idempotent invoice_id, quota(base + active addons), null base vẫn unlimited; expiry theo Q031. Backfill **tất cả paid addon kể cả fulfilledAt đã có**, bounded dryrun/review, xác nhận item/sốlượng/thời hạn từ snapshot/catalog historical, ambiguous invoices đưa reconciliation không tự đoán.
- Đúng hạn kỳ pending downgrade được áp một lần. Expired paid subscription chuyển state expired, chặn tăng entitlement/AI theo policy đã chốt, cho Owner gia hạn và giữ dữ liệu30ngày; không tự xoá sau30ngày ở039.041 nhận retention/archive/delete. Không “tự gia hạn bằng tiền” khi chỉ tạo invoice; QR phải paidverified mới active.
- Scope admin confirmation ở040;039 chỉ reuse010, không cho Owner tự đánh invoice paid.

### 3. Wallet alerts và hết Credit
- wallet.update_alerts giữ config/billing.manage/platformtx, persist low_alert bool, no auto-topup; audit/invalidation. Mốc80/95 theo plan consumption đã có, tắt nhắc không tắt chặn AI hoặc thay giá.
- Durable exhausted consumer lấy tenant từ event workspace, recheck current wallet balance và generation để delayed exhausted sau topup không handoff sai. Bounded batches chuyển chỉ ai_mode auto thuộc active conversations, dùng domain transition/internal Executor/outbox; không xoá history/agent config, không chiếm conversation human đang xử lý.
- restored chỉ bỏ chặn AI khi balance thật>0, không tự giành conversation đãhandoff; UI “có thể dùng AI lại” khác tự gửi/replay tin cũ. Mọi gateway/approval-resume vẫn assertBalance trước step; gửi human không bị khoá vì creditAI.
- BillingNoticeHost nhận structured CREDIT_EXHAUSTED và realtime threshold events; dedupe theo workspace/event/generation, không popup liên tục. billing.manage có CTA topup, người khác nhắc liên hệ Owner không mở action mua trái quyền. Fresh query currentworkspace trước popup, clear state khi đổi/logout.
- Không bắt mọi lỗi402 thành credit: PLAN_LIMIT_REACHED có thông điệp/hành động quota riêng. Không ăn mất lỗi/202 approvals của useAction045b.

### 4. Read/UI, liên hệ và invoice PDF
- summary.channels.used từ tenant channel_accounts theo quota rule thực; quota max gồmaddons. Contract tests2workspaces, failedtenant read trả unavailable/error không used0 giả.
- Ledger GET cursor filter kind/in-out/source(module)/from/to server-side, sort created_at desc,id desc. Window filter trướcLIMIT, index equality workspace/source/kind rồi time/id; chọnID bounded rồi hydrate note/meta. Cursors validation type/UUID/date, không query bằngSQL user. WalletLedger loadmore đủ lịch sử, empty/denied/error/loading; old embeddedfirstpage có thể giữ compatibility.
- Gói/quota/cảnh báo/trial badges/upgrade popup/BillingSection dùng live refetch/invalidation saupaid; fake pending_review không paid; trường hợp renew, expired, limited, unknown provider có CTA thật. Không thay prototype bằng màn mới; modals/hooks extracted, vi/en, keyboard/mobile.
- Liên hệ Doanh nghiệp → ContactSalesModal, validated name/email/phone/message+consent; action billing.contact_sales permission billing.manage, risk write, rate-limit/idempotency; platform salesInquiry persistent và operator notification qua outbox. Success nghĩa request đã nhận, không giả “đã ký hợp đồng”. Không gửi secret/PII vào logs hoặcLLM.
- GET /billing/invoices/:id/pdf authenticated billing.manage + workspace equality, dùng immutable snapshot invoice/VAT/status/amount paidAt; ReactPDF template song ngữ, download proper headers/privatecache. Đây là chứng từ nền tảng, **không hoá đơn điện tử VAT**, thể hiện disclaimer và đội vận hành xuất VAT thủ công; no publiclink. Read render không cần write action nếu khôngpersist artifact.
- BillInvoiceTable thêm download; QR/status flow010 regression. Mọi ghiFE useAction, mock cùng outputshape, không toast thay chức năng. Muaaddon chưa đủ policy Q031 phải gate rõ, không lén charge xong không entitlement.

### 5. Failure, SQL, observability
- Unique(invoice_id), unique(workspace_id,period_key), (workspace_id,resource,status,ends_at) INCLUDE(quantity), (status,next_grant_at,id) INCLUDE(workspace_id) partial active; invoices paid unfulfilled partialindex; ledger indexes theo filtered query. EXPLAIN BUFFERS với fixtures đủ lớn, không INCLUDE rộngJSONB, deferredjoin cho paged invoice/ledger.
- Money integer VND strings; Credit safeinteger boundary hoặc serializeddecimal contract, không bigint→Number silently vượt safeinteger. Validate quantity/delta nonnegative và range ở every public/internal API.
- Errors existing VALIDATION_FAILED/NOT_FOUND/FORBIDDEN/CONFLICT/STALE_VERSION/CREDIT_EXHAUSTED/PLAN_LIMIT_REACHED; ambiguouspayment reconciliation có stablecode/UI, không trả successentitled. Rollback fail trướccommit không changedbalance; failaftercommit retriablebridge không duplicategrant.
- Migrationbackfill có dryrun counters, không tự lịchgrant cho archived/deleted workspaces; healthmetrics due/lag/failedreconciliation, logs chỉ IDs/correlation và amount theo policy, không bankpayload/customerVAT/email.

## ACCEPTANCE CRITERIA
1. **AC01 periods** — Given gói năm/trial/free,2workers và downtime; When due/resetreplay; Then mỗi approvedperiod đúng1grant, expireplan không rollover, topup nguyên, không doublegrant activation. Q031 phải có literal expected dates/credits trước accept.
2. **AC02 invoice replay** — Given paid invoice đã activate; When fulfil lại ngàyhôm sau/crash giữaactivate và fulfilledAt; Then periodStart/end/plan/balance nguyên và1receipt, notificationbridge recover.
3. **AC03 plan changes** — Given active tháng/năm còn ngày và usage; When preview/paidupgrade/downgrade; Then tiền/credit theo ví dụQ031 được duyệt, giữenddate, khôngresetused; downgrade kỳsau, changedversion/latepayment không silently wronggrant.
4. **AC04 addons** — Given paidaddon cũ fulfilledAt và mới, duplicatebankevents; When backfill/fulfil/quotaassert; Then một entitlement/invoice, base+activeaddons đúng, expiry/renewal đúngQ031; ambiguous không đoán và không cấp vượtquota.
5. **AC05 exhaustion** — Given auto+humanconversations, exhaustedevent delayed sau topup; When consumerreplay; Then currentzero mới handoffauto, human unaffected, staleeventkhông handoff, restored không giành human; stepAI blocked đúng nhưng UI/data/humanchat vẫn dùng.
6. **AC06 alerts/UI** — Given Owner và Sales,2workspaces; When threshold/error402/restore; Then dedupepopup đúngworkspace, Owner mua được/Sales không, alertpref persist qua reload; PLAN_LIMIT không bị gắn nhãn exhausted.
7. **AC07 read/ledger** — Given >100ledger entries/module/date,channels pending/disconnected vàaddon; When summary/filter/loadmore; Then totals đúng countingrule, không filter chỉ50dòng hoặc bỏ bản ghi, no crossworkspace.
8. **AC08 PDF/contact** — Given valid/foreigninvoice và duplicatecontactrequest; When download/submit; Then PDF amount/VATsnapshot đúng, disclaimerkhôngVAT, foreign404; inquiry durable1lần, invalidinput/rate-limit không fake success.
9. **AC09 expiry/regression** — Given paidexpired + data/history/topup; When sweep/UI/renewal; Then expirationstate/popup thật, khôngxoá dữliệu30day, renewal được verifiedpaid mới chạy; trial009/QR010/pendingreview/onboarding011 không regress.
10. **AC10 resilience/perf** — Given forcedfault sau platformcommit/trướctenantoutbox/flagclaim và2workers; When restart; Then bridge recover, no lostgrant/notify hoặc duplicatefinancialeffect; migration/indexEXPLAIN/HTTPcontract/E2Emobile đều có evidence.

### Lệnh builder, chưa chạy trong pha docs
```powershell
pnpm --filter @appchat/core exec vitest run test/billing-lifecycle.test.ts test/billing-entitlements.test.ts
pnpm --filter @appchat/api exec vitest run test/integration/billing-lifecycle.test.ts test/integration/billing-contract.test.ts test/integration/billing.test.ts test/integration/billing-payments.test.ts
pnpm --filter @appchat/web exec playwright test e2e/http/billing-lifecycle.spec.ts e2e/settings-billing.spec.ts
pnpm i18n:check
pnpm parity --done
```
Rà scripts/paritysettingsID/config môi trường hiện tại trước chạy. Mock vàHTTP, 1440×900/390×844; D59 lint/typecheck/unit/depcheck trướccommit và fullgate chốtTIP. Providerbank thiếukey ghi chưanghiệmthu thật, mockkhông thay SePay. Không featureLLM mới, nhưng gateway credit live9router exhaustion→topup→newrun phải smoke thật nếu sửa gate; không tự tiêu tiền/account ngoài cho test.

## CONSTRAINTS
- Không đổi COMMERCE/permissions/pricing khiQ031 chưa trả lời; khôngAutoPay/modelcheap/debtcredit. Không ghi dữliệu/source trong câuA.
- Billing nền tảng khác invoicekhách/sales; không ghép hai sổ hoặc đổiquyền finance. Owner không platformadmin.
- REUSE wallet locks/ledger,045b bridge/202,010 providerpayments,042c scope,011 trial;041 mới destructive lifecycle,040 adminUI.
- Backend200–400/tách500/trần600; frontend150–250/trần400; test riêng; UIhosts không nhồi AppShell/useAction.
- Không source secrets/logsensitive, không giữuncommittedcode khi báoDONE.

## BUILDER-CHECKLIST
- [ ] Q031 được chốt và numericAC bổ sung, exactmanifest/overlap cập nhật.
- [ ] AC01–10 proof thật, moneyfault/replay/tenantroles/SQLplans.
- [ ] UI khôngtoastgiả; mock/http/mobile/parity/i18n regression.
- [ ] Provider/liveAI evidence trung thực; D59 trướccommit/chốtTIP.
- [ ] Completion report/COVERAGE runtime đúng, gitSHA sạch, PRdev.
