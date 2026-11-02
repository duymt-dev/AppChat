# TIP-041 — Archive, restore và xoá workspace an toàn

## HEADER
- TIP-ID: TIP-041; Project: AppChat V2; Module: workspace-lifecycle; Priority: P1; Estimated: XL.
- Depends on:002/004/006/009/011/014;045b platform context/outbox/security;040 admin suspend;039 billing;038b owner logical export. Integrate sau040/038b vàpendingTIP chungfile, trước045 deployment gate/046.
- **Dòng COVERAGE nhận:** REQ-A09a/A09b; D23; ACT-admin.workspace.archive/restore; DEF-003-1; PRO-settings-dangerzone; REQ-M01c chỉphần nguyhiểm (logo tách owner riêng, khôngclaim cảdòng).
- **Parallel-safe with:** sequential, shares actions/coreindexes, identity/platformmodule/resolver/settingslocales/Blueprint với cácpendingTIP; metadata hai chiều tính trước tạo. Platform receipt/executor reuse040/045b, không thêm đườngghi.
- **Files touched:** M/C dưới; chỉdocs câuA, không chạy dump/drop trên demo.

| Op | File |
|---|---|
| M | `packages/core/src/identity/identity.module.ts` |
| M | `packages/core/src/kernel/actions/executor.ts` |
| M | `apps/api/src/http/identity/identity.http.module.ts` |
| M | `packages/shared/src/index.ts` |
| M | `packages/shared/src/api/index.ts` |
| M | `apps/web/messages/vi/actions.json` |
| M | `apps/web/messages/en/actions.json` |
| C | `packages/core/src/identity/lifecycle/activity-consumer.ts` |
| C | `packages/core/src/kernel/actions/activity-event.ts` |
| C | `packages/shared/src/events/workspace-activity.ts` |
| M | `packages/db/src/index.ts` |
| M | `packages/db/src/provisioner.ts` |
| M | `packages/db/src/tenant-resolver.ts` |
| M | `packages/db/prisma/platform/identity.prisma` |
| M | `packages/actions/src/index.ts` |
| M | `packages/core/src/index.ts` |
| M | `packages/core/src/identity/services/workspaces.service.ts` |
| M | `packages/core/src/identity/jobs/identity.jobs.module.ts` |
| M | `packages/core/src/identity/jobs/tenant-provision.processor.ts` |
| M | `packages/core/src/platform/platform.module.ts` |
| M | `packages/core/src/channels/jobs/sessions.ts` |
| M | `apps/api/src/http/identity/session.controller.ts` |
| M | `apps/web/src/features/onboarding/components/OnboardingGate.tsx` |
| M | `apps/web/src/features/settings/components/GeneralSection.tsx` |
| M | `apps/web/messages/vi/settings.json` |
| M | `apps/web/messages/en/settings.json` |
| M | `apps/web/messages/vi/onboarding.json` |
| M | `apps/web/messages/en/onboarding.json` |
| M | `coding-packs/plans/BLUEPRINT.md` |
| M | `coding-packs/docs/06-prototype/DEVIATIONS.md` |
| C | `packages/actions/src/workspace-lifecycle.ts` |
| C | `packages/shared/src/api/workspace-lifecycle.ts` |
| C | `packages/db/prisma/platform/workspace-lifecycle.prisma` |
| C | `packages/db/prisma/platform/migrations/20261102004100_workspace_lifecycle/migration.sql` |
| C | `packages/db/src/lifecycle/pg-process.ts` |
| C | `packages/db/src/lifecycle/archive-storage.ts` |
| C | `packages/db/src/lifecycle/archive.ts` |
| C | `packages/db/src/lifecycle/restore.ts` |
| C | `packages/core/src/identity/lifecycle/lifecycle.module.ts` |
| C | `packages/core/src/identity/lifecycle/lifecycle.providers.ts` |
| C | `packages/core/src/identity/lifecycle/types.ts` |
| C | `packages/core/src/identity/lifecycle/actions.ts` |
| C | `packages/core/src/identity/lifecycle/activity.ts` |
| C | `packages/core/src/identity/lifecycle/stats.ts` |
| C | `packages/core/src/identity/lifecycle/archive-scan.ts` |
| C | `packages/core/src/identity/lifecycle/jobs.ts` |
| C | `packages/core/src/identity/lifecycle/restore-request.ts` |
| C | `packages/core/src/identity/lifecycle/delete.ts` |
| C | `packages/core/src/identity/lifecycle/owner-export.ts` |
| C | `packages/core/src/identity/lifecycle/recovery.ts` |
| C | `apps/api/src/http/identity/lifecycle.controller.ts` |
| C | `apps/web/src/features/onboarding/components/RestoringCard.tsx` |
| C | `apps/web/src/features/settings/components/WorkspaceDangerModal.tsx` |
| C | `apps/web/src/features/settings/hooks/useWorkspaceLifecycle.ts` |
| C | `packages/db/test/lifecycle.test.ts` |
| C | `packages/core/test/workspace-lifecycle.test.ts` |
| C | `apps/api/test/integration/workspace-lifecycle.test.ts` |
| C | `apps/web/e2e/http/workspace-lifecycle.spec.ts` |
| C | `coding-packs/reports/TIP-041-completion.md` |

## CONTEXT
- Workspace D:/CODING/AppChat_Ver2; nativePostgres16, pg_dump/pg_restore binaries, NestJS/BullMQ, Storage port. KhôngDocker.
- Blueprint §2.0: free archiveInactiveDays90, cảnhbáo14ngày; activity=max login/inbound/outbound/action; archive giữvôhạn tới delete, deletionbackup30ngày; restore<2phút free; adminarchive/restore luônpreview.
- `db/src/provisioner.ts:27–65` chỉprovision/drop, khôngdump/checksum/restore. `identity/jobs/tenant-provision.processor.ts:37–55` nonactive cóthểprovision+setactive; phải chặn archived/restoring/deleting, không vô tình tạoDBrỗng thayarchive.
- `db/src/tenant-resolver.ts:47–50` cached dbStatus;040 xử lý suspendaccess. `identity/services/workspaces.service.ts:136–143` coi nonprovisioningnotready làfailed; chưaUIrestoring.
- platformidentity đã archivedAt/archiveKey; workspaceStats cóschema ởops nhưng khôngprooftạischeduler. GeneralSection:149 nguyhiểm chỉtoast.
- Storagehiện put/get buffers, không streamingarchive; không đọc cảDBdumpvàoRAM. Archive là backupkỹthuật cósecret, khôngđược đưa choOwner nhưlogicalexport.
- Thuậtngữ freeze/suspend ≠ archive/drop; phảigiữ phânbiệt. Không điều chỉnh quyềnOwner thànhplatformadmin.

## APPLICABLE STANDARDS
Đọc standards/database/tenant-db,indexing; actions/action-registry; events/outbox; ops/observability-security; authz/rbac-permissions; api/response-envelope; domain/state-machine,concurrency,validation-defaults,gap-filling; integrations/provider-ports; ui/interaction-patterns,frontend-structure,prototype-parity; i18n/i18n; code/testing,file-size-module-layout; workflow/git-flow-ci.

## Rà trước khi làm
1. Rà clusterregistry/dbhost/dbname vàpermissionsprovisioner/migrator; khôngđược dùngsuperuser chung hoặcDROP name từuserinput.041 không thaypgsetup production;045 provisioning grants cótestintegration.
2. Xácđịnhplatformreceipt/lock/actioncontext đã045b/040 tíchhợp. Các thao tác restore/ownerdelete phải chạy khi tenantkhôngmởđược; platformaudit làauthority.
3. Đối chiếu wiring activity đã chốt ở Task 1 với hook sau045b: `executor.ts` → `activity-event.ts` → outbox → `activity-consumer.ts`; `identity.module.ts` nạp lifecycle module ở API/jobs. Không thay activity bằng timestamp lúc consumer retry; không quét mọi DB không giới hạn.
4. Khônglogicalexport raw pg_dump: reuse038b data/artifacts, loại credentials/password/auditsecret. Noautoarchive paid/trial vì thấpcredit.
5. Readlimits/backupencryption/keyrotation/retention từ045; restoredrill dùngfixtures riêng, pathprocessargs khônginpassword.

## TASK
### 1. Durable lifecycle state machine và activity
- Platform WorkspaceLifecycleJob (id,workspace_id,operation,generation,status,step,expectedversion,leaseexpires,attempts,error,started/finished); ArchiveManifest(key,workspace_id,db_name/schema_version,checksum,size,encryption_key_id,created_at,retention_kind,expires_at); unique activeoperation/workspace, idempotencyreceipt. Không chỉRedisjobretention.
- currentstate CAS: active→archiving→archived; archived→restoring→active; active/archived/suspended→deleting→tombstone. Restore/archive/delete đồngthời mộtwinner, stalejob khôngđègenerationmới.
- **Nguồn activity và wiring cụ thể:** `SessionsService.start` chỉ có lastLoginAt của user, không được áp timestamp đó cho mọi workspace của họ. Khi OnboardingGate mở workspace đã xác thực, gọi action platform `workspace.open` qua useAction/Executor; server kiểm membership hiện tại, ghi mốc mở workspace và yêu cầu restore nếu cần trong cùng platform transaction. GET session/provisioning chỉ đọc. Refresh token, polling và healthcheck không tính là mở workspace; một idempotency key cho mỗi lần mở, không tạo vòng lặp render → action.
- `kernel/actions/activity-event.ts` tạo sự kiện activity tối thiểu (workspace, action_log_id, occurred_at, actor/source; không input/result/PII), được executor ghi cùng transaction thành công. Loại trừ chính activity/maintenance/stats/archive jobs để không tự giữ workspace sống; action nghiệp vụ của user hoặc agent vẫn tính. Platform actions dùng bridge045b, không giả transaction hai DB. Replay idempotency không sinh activity mới.
- `activity-consumer.ts` đăng ký các topic `message.received`, `message.sent`, action activity; đọc timestamp gốc từ message/outbox bằng primary key khi payload hiện tại thiếu timestamp, không dùng thời điểm delivery. Cập nhật platform bằng GREATEST và receipt unique event_id/consumer trong cùng transaction; event cũ/retry không kéo dài tuổi workspace. Nếu bridge lag hoặc timestamp không xác định, scan bỏ qua workspace và cảnh báo, không suy ra inactive rồi DROP.
- Trước quiesce, khoá eligibility generation và đọc lại activity/plan; sau drain phải kiểm lần cuối các action/message đã commit và outbox chưa phản ánh ở platform. Có activity mới hoặc pending unknown → huỷ archive an toàn. Test race hành động xảy ra giữa scan và quiesce; không chỉ test đơn luồng.
- Nightstats bounded platformworkspaces active, tenant counts read-only, last_active=max đúng3nguồn, khôngresetactivity vìstatsjob/healthcheck tựchạy. Đăngnhập mộtmember đượcgắnworkspacethựcđãmở, khôngmọiworkspace màusercó.
- archive eligibility dựa currentplan archiveInactiveDays, trial/paidnull loại, grace/lastActive timestamp; unknownactivity khôngcoi epoch→drop. Cảnhbáo Owner14ngày email+notify idempotentwindow, activity/planchange cancelwarningeligibility.
- Internal scheduler/actions trusted source, audit+outbox; khôngGET mutate trực tiếp. Mởworkspacearchived tạo restore-request action serverauthenticatedmembership, coalesce multipleusers, status polling + workspace.ready.

### 2. Archive protocol: backup phải tốt trước DROP
- Freeze/quiesce tenant: blocknewactions/AI/send040, draininflight bounded, disconnectchannel leases/IMAP, widgetoffline. Heartbeat/lease handoff race phảitest. Chưaquiesce được → khôngdump/drop.
- Spawn pg_dump -Fc bằng execFile/argv, dbname từvalidatedregistry, hostallowlist, secrets env/PGPASSFILE permissionrestricted; khôngshellconcat. Stream output tới encryptedarchive storage path, checksumsstream; ghi manifestd durable vàreadbackchecksum.
- pg_restore -l kiểmcatalog theoBlueprint; thêm isolatedrestore-smoke trênfixture test gate, khôngclaim -l đủprovesrestoredata. Chỉdrop sauupload/readback/hash/catalogverify+manifestcommit, registryrecord vẫnđủrecover.
- Drop xácminh targetdb_name==tenantDbName(workspaceid), khôngplatform/template/postgres; privilege scoped provisionerpg_signal_backend đủchoownconnections, khôngbroadkillcluster. Retryafterdrop khôngprovisionempty vàmarkactive.
- Failure **trước DROP** giữDB, rollbackstatusactive nếuDBverifiedintact, cảnhbáo vàreconnect khiappropriate. Failure **sau DROP** khôngthểlàmtheo“đặtactive” literal: giữarchived/recoveryneeded dựamanifest, restorejobrecovery; khôngdốiDBcòn. Ghi deviationtechnical giải quyếtcrashwindow khôngđổibusinesspolicy.
- Archivedbackup indefinite; normalfilestorage liênquan phải giữ/reference-manifest, khônggarbagecollect vìtenantDBdropped. Encryptatrest vàkeyretention đủrestore, khônglogsecrets.

### 3. Restore an toàn
- Currentmembership hoặcplatformadmin mớirequest; untrustedpublicvisitor khôngtriggerrestore. Singlejob/generation. CreateemptyverifiedtargetDB, pg_restore roles/ownership policy, grant apppermissions, tenant-migrate currentversion, seedidempotentmissing, integritychecks.
- KhôngdùngTenantProvisioner.provision(template) rồiđèrestore, khôngrestore vàoDBactivecódata. Partialrestore giữrestoring/failedretrycontrolled, dọnchỉDBtạmđúngjobgeneration; khôngdeleteoriginalarchive.
- Đặtactive sauallchecks+migrations, publishworkspace.ready platformbridge vàinvalidateallprocesses; frontend“Đangkhôiphục”, progressstep/retry/error, khôngonboardingdeclareremindtrial hoặcresetwallet.
- Channel expiredsession yêu cầuQR, khôngassumeautologin. Archiveđãrestore giữ theoapprovedretention, khôngpurgeđểtiếtkiệm tùyý.
- Benchmark <120s freefixture kíchthướcghi rõ, timeoutkhôngfalseactive. Táchthời gianqueue/dumpdownload/restore/migration; largerworkspace SLAreported khôngclaim tấtcả<2phút bằngemptyDB.

### 4. Owner danger zone và delete
- Áp đềxuấttối thiểuquyền: Owner freeze = gửi yêu cầuplatformadmin, khôngtựarchive/suspend; admin xửlý040. Ownerexport = logicalscopedbusinessdata+allowedfiles038b, khôngrawDBbackup. Ownerdelete explicitworkspaceidentity+freshreauth/OTP+preview consequences, servercheckexactowner; khôngdùngsettings.manage thayOwner.
- Workspace.delete platformoperation đủauthorizer hiện hữu, không cầntenantlog. Khônggrantagent/assistant quyềndelete; assistantchỉhướngdẫn humanconfirmation. Revokeuser/ownershipbetweenpreviewconfirm fail.
- Deletionbackup30ngày encrypted, tách archivedbackupindefinite. Workspaceactive dumpverified nhưarchive, archived reuseverifiedmanifest chuyểnretentiontombstone. DROP idempotent rồi revoke routing/memberships/sessions/access; giữminimalplatformtombstone/backupmanifest/job đểrecovery/purge, không orphanarchive vìxoáregistry trướcmanifest.
- Billingpaidexpired giữ30daydata theo039 khôngđồngnghĩa auto-deletetenant: chỉexplicitdelete ởđây; freeinactivearchive90 khácpolicy. Khôngxoábillingfinancialaudit/logs theoownerdelete nếuretentionbắtbuộc, UI nêu rõretaineddata.
- Purge chỉbackupdeletion khi now>=expires_at, nohold/reference, securepathallowlist; jobreplay khôngpurgeactivearchive. Khôngcommandbatchcomputedpathra ngoàiarchive root.
- Logo trongREQM01c khôngthuộclifecycle, gánsupplementalsettings đểkhôngẩnloophole.

### 5. Wiring, query/index/UI
- Tenantqueue dispatcher duy nhất xửlýprovision/archive/restore/delete theojobname; khôngđặtworkerschỉreturn jobkhác nhưdone. Provisionguard active/provisioning only, archived/deletingreject.
- StateAPI platform-only trảjobsteps/errorredacted, khôngdump paths/credentials. RESTread/no mutation, actionrequestsameExecutor. Adminbuttons040 gọi041 khihandlerready.
- Owner DangerModal vàRestoringCard táchfile, i18nvi/en, UI khôngtoast“đãgửi” khichưa durablepersist. Authzguard serverclient, mobile/keyboard/retryfocus.
- Index jobs(workspace_id,generation)unique, jobs(status,next_attempt_at,id)partialpending; manifest(workspace_id,created_at desc,id) INCLUDE(checksum,retention_kind,expires_at), stats(last_active_at,workspace_id), eligibleplans equalityfirst. IDs-firstscan/deferredjoin choarchivecandidates, EXPLAIN boundedbatch, khônglistalltenantconnections.
- Wiring: `identity.module.ts` import lifecycle module; `identity.jobs.module.ts` đăng ký dispatcher/scheduler; `identity.http.module.ts` đăng ký LifecycleController và service export qua core index. Shared DTO/event export từ shared index/api index; action title/error vi/en trong actions.json. Module lifecycle chỉ phụ thuộc kernel/platform services, không import ngược IdentityModule gây vòng DI. Executor chỉ gọi helper activity độc lập, không import identity domain. Nếu045b đã tách executor, cập nhật exact manifest theo file thực trước code, không tạo đường thực thi thứ hai.

## ACCEPTANCE CRITERIA
1. **AC01 eligibility:** Given free89/90ngày,paid/trial,unknownactivity,warning14ngày; When scan/replay/planchange; Then chỉeligiblearchive, mộtwarning/window, newactivitycancel, paidkhôngarchive.
2. **AC02 archiveproof:** Given fixtureDB+attachments; When archive; Then quiesced, encryptedstream/checksum/-l/manifest trướcDROP, archivedaccessiblemetadata khôngrawdownload.
3. **AC03 crashmatrix:** Given failuresbeforedump/upload/checksum/drop/registrycommit; When retry; Then trướcDROP DBnguyên+activeverified, sauDROP khôngfalseactive, exactgenerationrecover, khôngdropplatform/template.
4. **AC04 restore:** Given archived schemaold+manymembersopen; When request; Then1job, actualdata/filesrestore+migrate/currentroles, readyonlyafterchecks, wallet/trialkhôngreset.
5. **AC05 performance:** Given declaredfreefixture; When measuredrestore; Then<120s hoặc báoFAIL/PARTIAL cómeasure, khôngclaimSLA từDBrỗng.
6. **AC06 delete:** Given Owner/nonOwner/revokedOwner/archivedworkspace; When preview/OTP/confirm; Then rolecheckfresh, onlyOwner/adminallowed, encryptedbackup30ngày,tombstonedaccess, noagentdelete.
7. **AC07 purge/export:** Given indefinitearchive vsdeletedexpiry, foreignpath/tenantfile; When purge/export; Then khôngpurgeindefinite/live, onlyexpiredcorrectkey, logicalexportkhôngsecrets, deniedrequestkhôngartifact.
8. **AC08 jobs/UI:** Given concurrentprovision/restore/archive, unavailableDB,channelsqueued; When dispatch/UI; Then khôngemptyreprovision/joblost/queuedoutboundsend, state/progress/retry thật vi/en/mobile, realQRreconnect nếuexpired.

### Lệnh builder (chưa chạy ởpha docs)
```powershell
pnpm --filter @appchat/db exec vitest run test/lifecycle.test.ts
pnpm --filter @appchat/core exec vitest run test/workspace-lifecycle.test.ts
pnpm --filter @appchat/api exec vitest run test/integration/workspace-lifecycle.test.ts
pnpm --filter @appchat/web exec playwright test e2e/http/workspace-lifecycle.spec.ts
pnpm i18n:check
pnpm parity --done
```
Test harness native thực pg_dump/restore/drop chỉephemeraltenant allowlist, environmentexplicitopt-in vànegativeplatformnameguards. Khôngchạy destructivecommands trênworkspace thật. D59 trướccommit+chốtTIP; providerchanneltestthiếuaccount ghiCHỜ-TK.

## CONSTRAINTS
- Khôngdrop trướcverifiedarchive, khôngrawbackupchouser, khôngautoarchivepaid hoặcautodelete90days.
- Reuse040 quiesce/access,045b platformbridge/secrets,038b logicalexport; noOwneradminprivilege.
- Sourcefiles backend<600/tách500, FE<400, testsriêng; chỉdocs ởcâuA.
- No destructivetest/demo/serviceschanges; reportSHA vàevidence trungthực.

## BUILDER-CHECKLIST
- [ ] Exactmanifest/hooks/dispatcher/retention vàleastprivilege reviewed.
- [ ] AC01–08 nativeproof vàfaultmatrix, negativeDROPguard, SQLplans.
- [ ] UIrestore/error/Ownercontrols/parity/mobile, signedoffPD nếuneeded.
- [ ] Completionreport/COVERAGE runtimeactual; D59, cleanSHA/PRdev.
