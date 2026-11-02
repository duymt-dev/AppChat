# TIP-040 — Quản trị nền tảng: quyền, cấu hình, đối soát và UI

## HEADER
- **Parallel-safe with TIP-015b:** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate TIP-015b before TIP-040. Recompute after incomplete manifests expand.
- **Parallel-safe with TIP-041:** sequential, shares `apps/api/src/http/kernel/actions.controller.ts`, `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `apps/web/src/features/platform-admin/screens/AdminScreen.tsx`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/core/src/index.ts`, `packages/core/src/kernel/actions/action-context.ts`, `packages/core/src/kernel/actions/authorizer.ts`, `packages/core/src/kernel/actions/executor.ts`, `packages/core/src/platform/platform.module.ts`, `packages/db/prisma/platform/identity.prisma`, `packages/db/src/tenant-resolver.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate this TIP before 041. Recheck incomplete manifests.
- **Parallel-safe with TIP-038b:** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/core/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/parity/parity.manifest.ts`; integrate this TIP before 038b. Recheck incomplete manifests.
- TIP-ID: TIP-040; Project: AppChat V2; Module: platform; Priority: P1; Estimated: XL (platform context → config/finance → workspaces/UI).
- Depends on:009/010/019/021; bắt buộc045b platform audit/idempotency/secretredaction/safeFetch,039 entitlement/replay; tích hợp sau038/042c/043 và cácpending sharedTIP, trước041/044/046.
- **Dòng COVERAGE nhận:** REQ-L08; ACT-admin.plan.upsert/model_price.upsert/model_route.upsert/llm_provider.upsert/probe/disable/workspace.suspend/resume/agent_template.upsert; BP-4.4-admin; DEF-010-3/019-2/021-2; ACT-admin.invoice.confirm_transfer phầnplatform context/reconciliation (preview023b), BP-3.2-e integration (045b owns audit kernel).
- **Parallel-safe with:** sequential, shares `packages/actions/src/index.ts` với015b/020b/023b/023c/030b/032b/036/037/038/039/042/042b/043/045b; `coding-packs/plans/BLUEPRINT.md` với042c; kernel/locales/shared API/parity làserial.15pendingTIP đãghi hai chiều trước tạo, tínhlại khi6manifestcũ hoànthiện. Không đồngnghĩa sốTIP làthứtự.
- **Files touched:** M/C dưới đây. Chỉtài liệu ởcâuA. Những pathkernel đã045b tách phải reconcile manifest trướcbuild, không tạo executor thứhai bypass.
 
| Op | File |
|---|---|
| M | `packages/actions/src/platform-admin.ts` |
| M | `packages/actions/src/index.ts` |
| M | `packages/shared/src/api/index.ts` |
| M | `packages/shared/src/index.ts` |
| M | `packages/db/prisma/platform/ai-config.prisma` |
| M | `packages/db/prisma/platform/templates.prisma` |
| M | `packages/db/prisma/platform/billing.prisma` |
| M | `packages/db/prisma/platform/identity.prisma` |
| M | `packages/core/src/platform/platform.module.ts` |
| M | `packages/core/src/platform/jobs/platform.jobs.module.ts` |
| M | `packages/core/src/index.ts` |
| M | `packages/core/src/kernel/actions/action-context.ts` |
| M | `packages/core/src/kernel/actions/executor.ts` |
| M | `packages/core/src/kernel/actions/authorizer.ts` |
| M | `packages/core/src/ai/router/provider.store.ts` |
| M | `packages/core/src/billing/actions/admin-confirm-transfer.handler.ts` |
| M | `apps/api/src/http/kernel/actions.controller.ts` |
| M | `apps/api/src/http/platform/platform.http.module.ts` |
| M | `apps/api/src/http/billing/admin-transfers.controller.ts` |
| M | `apps/web/src/shared/actions/useAction.ts` |
| M | `apps/web/messages/vi/actions.json` |
| M | `apps/web/messages/en/actions.json` |
| M | `tools/parity/parity.manifest.ts` |
| M | `coding-packs/plans/BLUEPRINT.md` |
| M | `coding-packs/docs/06-prototype/DEVIATIONS.md` |
| M | `packages/db/src/tenant-resolver.ts` |
| M | `packages/core/src/channels/jobs/send.processor.ts` |
| M | `packages/core/src/ai/runs/runner.ts` |
| C | `packages/actions/src/admin-config.ts` |
| C | `packages/actions/src/admin-workspaces.ts` |
| C | `packages/shared/src/api/platform-admin.ts` |
| C | `packages/db/prisma/platform/migrations/20261102004000_admin_versions/migration.sql` |
| C | `packages/core/src/platform/platform.providers.ts` |
| C | `packages/core/src/platform/public.ts` |
| C | `packages/core/src/platform/actions/plan.handler.ts` |
| C | `packages/core/src/platform/actions/provider.handlers.ts` |
| C | `packages/core/src/platform/actions/model.handlers.ts` |
| C | `packages/core/src/platform/actions/template.handler.ts` |
| C | `packages/core/src/platform/actions/workspace.handlers.ts` |
| C | `packages/core/src/platform/actions/reconcile-transfer.handler.ts` |
| C | `packages/core/src/platform/services/workspaces-read.ts` |
| C | `packages/core/src/platform/services/config-read.ts` |
| C | `packages/core/src/platform/services/transfers-read.ts` |
| C | `packages/core/src/platform/services/provider-probe.ts` |
| C | `packages/core/src/platform/services/config-validation.ts` |
| C | `packages/core/src/platform/services/config-revision.ts` |
| C | `packages/core/src/platform/services/workspace-status.ts` |
| C | `packages/core/src/platform/types.ts` |
| C | `packages/core/src/kernel/actions/platform-execution.ts` |
| C | `packages/core/src/kernel/actions/platform-context.ts` |
| C | `apps/api/src/http/platform/admin-actor.ts` |
| C | `apps/api/src/http/platform/workspaces.controller.ts` |
| C | `apps/api/src/http/platform/config.controller.ts` |
| C | `apps/web/src/app/(admin)/admin/layout.tsx` |
| C | `apps/web/src/app/(admin)/admin/page.tsx` |
| C | `apps/web/src/features/platform-admin/api.ts` |
| C | `apps/web/src/features/platform-admin/types.ts` |
| C | `apps/web/src/features/platform-admin/screens/AdminScreen.tsx` |
| C | `apps/web/src/features/platform-admin/components/AdminGuard.tsx` |
| C | `apps/web/src/features/platform-admin/components/WorkspaceTable.tsx` |
| C | `apps/web/src/features/platform-admin/components/PlansPanel.tsx` |
| C | `apps/web/src/features/platform-admin/components/ProviderPanel.tsx` |
| C | `apps/web/src/features/platform-admin/components/ModelRoutesPanel.tsx` |
| C | `apps/web/src/features/platform-admin/components/ModelPricesPanel.tsx` |
| C | `apps/web/src/features/platform-admin/components/TransfersPanel.tsx` |
| C | `apps/web/src/features/platform-admin/components/TemplatesPanel.tsx` |
| C | `apps/web/src/features/platform-admin/components/ProviderForm.tsx` |
| C | `apps/web/src/features/platform-admin/components/PlanForm.tsx` |
| C | `apps/web/src/features/platform-admin/components/TemplateForm.tsx` |
| C | `apps/web/src/features/platform-admin/hooks/useAdminQueries.ts` |
| C | `apps/web/src/shared/actions/platform-action-context.ts` |
| C | `apps/web/messages/vi/platform-admin.json` |
| C | `apps/web/messages/en/platform-admin.json` |
| C | `packages/core/test/platform-admin.test.ts` |
| C | `packages/core/test/platform-config.test.ts` |
| C | `apps/api/test/integration/platform-admin.test.ts` |
| C | `apps/api/test/integration/platform-config.test.ts` |
| C | `apps/web/e2e/http/platform-admin.spec.ts` |
| C | `coding-packs/reports/TIP-040-completion.md` |
| C | `packages/core/src/platform/services/workspace-access.ts` |
| C | `tools/parity/modules/platform-admin.ts` |

## CONTEXT
- D:/CODING/AppChat_Ver2; CLAUDE/BUILDER-HANDOFF stack NestJS, Next.js/AntD, PostgreSQL platform+tenant, BullMQ. AdminFE chưa cóprototype/màn, không giả parity với settings.
- `platform/platform.module.ts`, `http/platform/platform.http.module.ts` stub. `actions/platform-admin.ts` chỉ admin.invoice.confirm_transfer (platform_admin,money,agentGrantablefalse).
- `http/billing/admin-transfers.controller.ts:17–31` GET dùng actors.user, isPlatformAdmin vàkhôngworkspaceheader; chỉ invoices statuspending_review tốiđa200, chưa banktransactionsunmatched.
- `http/kernel/actions.controller.ts:25–40` mọiwrite actors.resolve đòimembership/XWorkspace; executor.ts:110–170 cầntenant choidempotency/log dùdbplatform. Adminkhông cómembership không dùngđược; DC054 workaround workspacecủaadmin khôngđủ khiworkspace suspended/archived.
- `ai/router/provider.store.ts:1–6,29–66` cache60s/localinvalidate, keysdecrypt; headersJson hiệnplaintext. Configchange ởAPI không tự invalidates workers; pendingload cóthể publishstalesnapshot sauinvalidate.
- `platform/ai-config.prisma` provider/route/price cótable, chưaversion. `templates.prisma` agenttemplate cóactive/defaults, seed021 chỉcreate missing. D51: template khôngđược tựgrantadmin/action vượt quyềncreator.
- `platform/ops.prisma` PlatformAuditLog đãschema,045b nhậnwriter. WorkspaceStats schema đãcó, chưađươngnhiên cójobrefresh.
- `db/src/tenant-resolver.ts:47–50,80–88` chỉcheckdbStatus cached60s, invalidate local. Suspend chỉđổi workspace.status sẽkhôngđủ; existing client/queuedjob còn chạy nếu không enforcementboundary.
- SoT Blueprint §3.2/3.4 platform/4.4/5.1; D29 modelname khônghiệnuser, D33 providerrouter; REQ-L08.041 owns archive/restore/drop,040 khôngdropdatabase.

## APPLICABLE STANDARDS
Đọc dưới coding-packs/standards: actions/action-registry; api/response-envelope; authz/rbac-permissions; database/tenant-db,indexing; events/outbox; ai/agent-gateway,eval; integrations/provider-ports; ops/observability-security; domain/concurrency,money-time-numbering,validation-defaults,gap-filling; ui/frontend-structure,interaction-patterns,prototype-parity; i18n/i18n; code/file-size-module-layout,testing; workflow/git-flow-ci. Tấtcả đuôi.md.

## Rà trước khi làm
1. Đọc045b execution/audit/redaction/platformreceipt design đãhoànthiện. BP3.2e writer thuộc045b,040 thêm platform-only context cùngActionExecutor, khôngcó rawPOST thứhai.
2. Kiểm nhánh code hiệnhữu đãtách executor/useAction/parity chưa; filevượtcap chỉfacade1–2dòng, bổsung modulepathmanifest trướccode. tools/parity/parity.manifest.ts đangmonolith: chỉre-export modules/platform-admin.ts.
3. KiểmDTOadmin, bankmatching010/039, noauth header impersonation; thiếtlập fixture user.isPlatformAdmin trongtest, khôngaction/UI tựcấp platformadmin.
4. Rà providercredentials/headers, securitysafeFetch045b hỗtrợ private endpoint allowlist cho9router local nhưthếnào. Khôngmở localhost/cloudmetadata mặcđịnh vì làadmin.
5. Xácđịnh adminUI tiêu chuẩn primitives ởBlueprint, ghiPD cóphânloạitrước dựng; khôngtựclaim prototypepixelpass khi khôngbaseline.
6. NativeisolatedDB/Redis, khôngdừngdịchvụ, khôngprobe provider thật tốnphí nếu chưađược resource/testcho phép.

## TASK

### 1. Một đường ActionExecutor cho platform-admin
- Platformcontext códiscriminant trusted server-only, actor=user verified + live isPlatformAdmin, không phụthuộc membership/tenantDB. HTTP /v1/actions/:id nhận adminpermission branch từregistry sauauthenticate, khôngtin x-action-source/admin/workspace do clienttựgửi.
- Giữ registry/schema/authorizer/policy/preview/idempotency/ratelimit/audit nhưnormalExecutor; platformtransaction chứamutation+platformreceipt+platformaudit+outbox theo045b. Audit targetworkspace lấy từ entity/input validated, khôngcurrentworkspace UI. No sentinel “admin workspace”, khôngmởtenant đểlog action ởworkspace khác.
- Tenantcontext khôngđược nullcast giảđểreusehandler. Tách typedplatform handleradapter/context trongmodulemới; facadeexecutor tốiđa1–2dòng nếumonolith. Return sameActionResult(action_log_id làplatformauditid), no undo nếuactionkhôngkhai; khôngnhầm platformauditid với tenantundo route.
- useAction vẫnđườngghiUIduynhất; transport bỏworkspace dependency choadminAction xácđịnh bằngregistry, không clientflag đểbypassauthorization. Confirmtoken gắn actor/action/input/version+TTL, preview→confirm recheckliveadmin.
- KhôngOwner/Manager/customrole/assistant/agent/Cowork đượcadmin dù cóadmin.* trongprompt. RevokeisPlatformAdmin giữaGET/preview/confirm phải403. Adminkhôngmembership/suspendedtarget vẫn quảntrịđược đúngaction nhưng khôngmặcđịnh đọcchatPII.

### 2. Action registry và concurrent configuration
- Thêmadmin.plan.upsert,model_price.upsert,model_route.upsert,llm_provider.upsert/probe/disable,agent_template.upsert,workspace.suspend/resume. Tấtcả platform_admin,dbplatform,agentGrantablefalse,riskconfig trừconfirmtransfermoney; mutations preview rõ before/after khôngsecret. Runtimeprobe làconfig vì ghihealth và gọiexternal, cóconfirmation/ratelimit.
- Version CAS trên mutableconfig, if_version khiupdate; create stablekey, duplicate409; no lastwritewins. Input allowlist/strict schema, decimalcredits nonnegative bounded, model/tier/purpose/priority valid, quotas positive/null, moneyintegerstring, no rawJSON freeform choheaders/params/defaults.
- Plans: persist giá/credits/limits/features/active, khôngđổi invoicepaid snapshot hoặc reset ví ngầm; disableplan chặnmuamới, khôngđổi subscriptionđangactive. Giảmquota khôngxoáresource. Catalog giá thay đổi phảipreview tácđộng; seedboot khôngghiđè cấu hìnhadmin.
- Modelroute validate providerexistsactive+capabilitypurpose, unique tier/purpose/priority; reorder nguyênnhóm transaction (khôngprioritycollision). Khôngchỉnhmodelname ởtenantUI D29. Prices precision12,4, routekhôngprice phảiblockpublish hoặc unavailable rõ, không0creditfallback.
- Agenttemplate validate toolIds registry agentGrantable, defaults tier/intents/threshold/promptbounds; activefalse làẩnkhỏicatalog, khôngdelete agentsđãclone. Update khôngsửa agentsđangchạy hoặc tựgranttools ngoàiintersectionD51.

### 3. Provider secrets, probe và invalidation
- api_key writeonly: omitted=giữnguyên, explicitclear cópreview vàdisableprovider dependent, không trảencryptedbytes/rawkey trongread/audit/preview/trace. Headers secrets mãhoá giốngkey, migration plaintextheaders cần redaction+encrypt, không stringify vào logs. PublicGET chỉ maskedpresence vànonsensitiveconfig.
- Validateurl scheme/host/port/redirect/DNS với safeFetch045b; TLS/SSRFblocked ranges, credentialkhông đi qua arbitraryredirect. Local9router chỉ explicit deploymentallowlist, khônguserinputflag. Headerallowlist, khôngHost/Cookie/forwarded arbitrary; authheaders trongencryptedsecretstore.
- Probe kiểmexactcapabilities chattools/json/stream/embed theooperation bounded timeout/tokens/size và abort. Output success/percapability/latency/sanitizederror, khôngresponsebody/rawprovidererror. Khôngđánh embeddingsupported chỉvì chat thànhcông. Probe readsecret server, khôngecho tới browser.
- Durable configrevision+event saucommit, processAPI/ROLEai/channels reloadinvalidation; monotonicgeneration chốnginflightload resurrectstale cache. Healthy configchange hiệu lực≤60s theoProviderStorecontract, disabledprovider kiểmcurrentstatus trướcnewrequest; noTTL-onlydisablesecurity.
- Existinginflightproviderrequest khônghứa huỷexternal đãgửi; abortbest-effort, audit outcomeunknown nếu cần. Newsteps dùngrevisioncurrent, pricesnapshot perrunstep khôngrepriceusagehistorical; allfallbackfailed lỗi thật khôngsilentmock.

### 4. Đối soát giao dịch nền tảng
- GET /admin/transfers giữ compatibility invoiceswaiting; thêm paginated unmatchedbanktransactions view, serverfilter workspace/status/provider/date/search; no200rowtruncateall. Deferredjoins IDs trướcwidevat/raw; mặcđịnh khôngtrả rawbankpayload.
- Existing admin.invoice.confirm_transfer reuse010/039, previewamount/target/status/note, idempotencyfinancialreceipt. Thêm admin.bank_transaction.match actionmoney: transactionlocks bankrow+invoice, validate đúngbankaccount/direction/currency/amount/transferstatus, mộtbanktxn khôngcredit2invoice; already matchedconflict, over/underpayment khôngtựsum/split/refund.
- Humanconfirm khi chưa cóbanktxn cầnrequiredreason vàexplicitmanualevidence, vẫn audit; khônggiả bankTxId. Khoảnlệch chưa có rule xửlý thì giữunmatched+reason, không tựchế policytiền. Fulfilaftercommit retry039 khôngdờikỳ hoặcdoublecredit.
- TenantbillingOwner khôngthấy alltransfers, targetworkspace lookupreadadminminimal; VATPII khônglog. Cácsalesinquiry039 hiện operatorqueue nếu provider khôngnotification, khôngtoastfake (read inquiry reuseplatformcatalog ifneeded phảiaddmanifest beforecode).

### 5. Workspaces suspend/resume và đọc số liệu
- GET /admin/workspaces IDs-first pagination/status/plan/search, minimal ownercontact/quota/subscription/dbStatus/stats refreshed_at; khôngmởmọitenantDB đồngthời khilist. Workspacestats chưarefresh trả unavailable+asof, khôngfixture0.
- Suspend require reason+if_version, chuyển operationalstatus+suspensionflag atomic; dbStatus suspended chỉ từactive, khôngghiđè archiving/restoring/deleting. Resume chỉsuspended vàunderlyingDBverifiedready, khôngunarchive bằngresume. Archive/restorebuttons khôngcófakehandler;041 sẽnối sau.
- Enforce currentstatus ởtenantentry/action/AInewstep/sendboundary; distributed invalidation+version, khôngchỉlocalcache60s. Existingresolverclient khônglàauthorization token vĩnhviễn. Messagequeued khi suspend khônggửi; loggedreason/retryhold, resume khôngreplay mọioutbound đãtimeoutunknown.
- Bảo toàn dữliệu, khôngdrop/khôngkillPostgres toàncluster; khônghứa rollbackmessagesđãexternalaccept. Test concurrentstatuschange+workerstart+cachedclient, warmcacheAPI/ai/channels đều bịchặnnewwork.
- Adminresume platform-only vẫnchạy lúc tenantunavailable; không tựcấp membership/adminimpersonation vàoworkspace.

### 6. AdminUI, modular wiring, indexes
- Route /admin riêng trong(admin), authenticatedAdminGuard bằngGET /admin/session(capability), servercheck mỗiendpoint. Layout khôngphụthuộcworkspacepicker. Tabs Workspaces/Plans/Providers/Routes/Prices/Transfers/Templates; deep links/filter/page state, no exposedAPIkeys.
- NewScreens chỉorchestrator, panels/forms riêng. Save/disable/suspend/resume/match/probe đều useAction; confirmation shows clear reason/impact. Loading/empty/denied/error/success, staleversionrefetch, vi/enkeyboard/mobile390.
- Khôngnavadmin cho workspaceowner chỉvìroleowner; kiểmURLtrựctiếp403. Adminauthsession trusted, no selfgrantfrontend. Prototypekhôngcómàn: primitive/token-based, PD ghi đúngmức, e2escreenshots/baselineapproved khôngtuyênbốdiff<5% với baselinekhôngcó.
- PlatformModuleproviders+APIcontrollers đăngkýmộtlần; avoidcyclebilling↔platform↔AI, dependencyports. Newplatformjobs chỉinvalidation/reconciliation cầnthiết, khôngsweepstatsgiả.
- Index adminworkspaces(status,created_at,id) INCLUDE nhỏplanref; invoices(status,created_at,id) INCLUDE(workspace_id,amount) partialpending; unmatchedbank(provider,occurred_at,id) WHERE matched_invoice_id IS NULL INCLUDE(amount); auditactor/time equalityfirst. Casefoldsearch expressionindex nếu lower/email/name; noJSONBwideINCLUDE. Queryplans đoEXPLAIN vớifixtures, paginationstableids.

## ACCEPTANCE CRITERIA
1. **AC01 platformcontext** — Given platformadminkhôngworkspace vàtarget suspended; When read+write/previewconfirm; Then action quaExecutor chạyplatformtx/audit khôngtenant. Owner/customrole/forgedheader/AI bị403, revokebetweencalls403.
2. **AC02 atomicity** — Given replaykey/faultaftercommit/beforebridge; When retry; Then1logicalmutation+auditreceipt, noforeigntenantlog, outboxrecover, differinginputsamekey409.
3. **AC03 config** — Given2admins cùngversion/routepriorities; When save/reorder/disable; Then mộtupdatewin, stale409, invalidtier/price/tools denied; seedrestart khôngđèconfig.
4. **AC04 secret/probe** — Given canarykey/header; When upsert/read/preview/audit/failureprobe; Then khôngcanary plaintext ngoàiencryptedstore, SSRF/redirectblocked, chatpass khôngembedpass, timeoutbounded; local9router chỉallowlist.
5. **AC05 distributedconfig** — Given2processcache+inflightload; When changeprice/disableprovider; Then≤60s normalrefresh, no newcalldisabled, staleinflight khôngresurrect; historiccreditprice giữsnapshot.
6. **AC06 transfers** — Given unmatched/underoverpayment/paidinvoice và2admins; When match/manualconfirm/retry; Then onebank→oneinvoice, noautofinancialguess,039fulfilonce, actor/reason/target auditđúng.
7. **AC07 workspace** — Given cachedactiveclients/queuedAI/send; When suspend/resume; Then no newtenantwork saustateenforcement, preserveDB/history, alreadyacceptedexternal khôngclaimedrollback; archivingresumeinvalid.
8. **AC08 template/plans** — Given publishedagents/paidinvoices; When adminedit/disableplan/template; Then futurecatalog cậpnhật, existingagents/paidamount khôngđổi, khônggrantforbiddentool.
9. **AC09 UI/perf** — Given HTTP thật,admin/nonadmin,>200rows; When tabs/filter/pagination/forms/mobile; Then allstates/i18n/access đúng, no truncation, privatevalueshidden, EXPLAIN/paginationbounded vàthinfiles.
10. **AC10 live/provider** — Given authorized9router sandboxcredentials; When probechat/embed kháccapability+configupdate; Then actualrequest/usage ghi nhận sanitized, unsupportedembedtruthful, nofallbackmock. Thiếutàinguyên ghiCHỜ-TK khôngPASS.

### Lệnh builder (chưa chạy trong pha docs)
```powershell
pnpm --filter @appchat/core exec vitest run test/platform-admin.test.ts test/platform-config.test.ts
pnpm --filter @appchat/api exec vitest run test/integration/platform-admin.test.ts test/integration/platform-config.test.ts test/integration/billing-payments.test.ts
pnpm --filter @appchat/web exec playwright test e2e/http/platform-admin.spec.ts
pnpm i18n:check
pnpm ai:live
pnpm parity --done
```
Ràscript/config trướcchạy, D59 package lint/typecheck/unit/depcheck trướccommit, fullchốtTIP. Adminkhôngmockfixture cũ: HTTP+contracttests làproof; baselineadmin chỉsauPDapproved. No providerpurchase/probeproduction withoutapprovedresource.

## CONSTRAINTS
- Admin ≠ Owner; không exposekey/impersonate/SQLconsole, noagentadmin.
- No rawwritecontrollers, nosecondexecutor, reuse045baudit+redaction+safeFetch và039fulfil.
- Khôngarchive/dropdatabase trong040;041owns. KhôngeditCOMMERCE/catalogpricing từfixtures.
- Backend200–400/tách500/trần600; FE150–250/trần400; monolith chỉfacade, test riêng.
- Chỉ docs câuA; no demoDB/services/secretschanges.

## BUILDER-CHECKLIST
- [ ] 045b platform-only context/receipt/bridge boundary reconciled, manifest exact.
- [ ] AC01–10 actualproof, tenantlessadmin/revoke/secretcanary/fault tests.
- [ ] D59/UIstates/mobile/i18n/securitySQLplans, providerlimits trungthực.
- [ ] No sourcechange ngoài scope, Completionreport+COVERAGE runtimeevidence.
- [ ] Gitclean SHA/PRdev, khôngreportDONE chỉdựavàodraft.

