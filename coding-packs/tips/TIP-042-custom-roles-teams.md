# TIP-042 — Vai trò tuỳ biến, Nhóm và vòng đời cấp/thu hồi quyền

## HEADER
- **Additional overlap with TIP-037 caps UI:** sequential, shares `apps/web/messages/vi/settings.json`, `apps/web/messages/en/settings.json`; integrate this TIP before 037.
- **Parallel-safe with TIP-037:** sequential, shares `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `apps/web/messages/vi/actions.json`, `apps/web/messages/en/actions.json`, `tools/parity/parity.manifest.ts`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `coding-packs/plans/BLUEPRINT.md`; integrate this TIP before 037. Recheck when incomplete manifests expand.
- **Additional overlap with TIP-042c:** sequential, shares `packages/core/src/authz/services/authz-resolver.ts`; integrate042 before042c and retest role lifecycle/cache with effective writeScope metadata.
- **Parallel-safe with TIP-042c:** sequential, shares `apps/api/test/integration/authz.test.ts`, `coding-packs/plans/BLUEPRINT.md`, `packages/core/src/authz/public.ts`; integrate this TIP before 042c. Recheck after incomplete manifests expand.
- **Parallel-safe with TIP-042b:** sequential, shares `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `apps/web/src/features/settings/registry.ts`, `apps/web/src/features/settings/screens/SettingsScreen.tsx`, `apps/web/messages/vi/settings.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/en/actions.json`, `tools/parity/parity.manifest.ts`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `coding-packs/plans/BLUEPRINT.md`; integrate this TIP before 042b; recheck after incomplete manifests are expanded.
- TIP-ID: TIP-042; Project: AppChat V2; Module: authz / identity / settings; Priority: P1; Estimated: XL.
- Depends on: 005, 006, 013, 015; tích hợp sau 023b/023c/030b/032b/015b/036/020b/043/045b vì file chung. Phần sửa consistency hai DB của 045b phải có trước nghiệm thu lifecycle ở đây.
- **Trạng thái thiết kế:** bản đầy đủ cấu trúc, chưa ready-to-build: Q-028 cần chốt biên quyền tuỳ biến/uỷ quyền; không tự mở rộng quyền. Câu A phải hoàn tất trước code.
- **Dòng COVERAGE nhận:** REQ-A05b-1, REQ-A05b-2, D27b, ACT-role.create, ACT-role.update, ACT-role.delete, ACT-team.create, ACT-team.update, ACT-team.set_members, PRO-settings-teams; bổ sung kiểm BP-3.5-d, Q-028.
- **Ranh giới:** chia lead chuyển042b; scope bản ghi theo team_id/read-write chuyển042c; field-level serializer vẫn045b. Hai file042b/042c đã có, chưa coi là implementation hoàn tất hoặc independent review pass.
- **Parallel-safe with:** sequential, shares `packages/actions/src/index.ts` with 015b/020b/023b/023c/030b/032b/036/043/045b; 042 integrates after those TIPs. Also shares `packages/shared/src/api/index.ts`, settings/action locales, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `coding-packs/plans/BLUEPRINT.md` with 020b/043; `packages/shared/src/index.ts` and action locales/Blueprint with 036/043; `tools/parity/parity.manifest.ts` with 043. Bilateral declarations inserted in all nine existing pending TIPs before writing 042. No parallel claim for future or incomplete manifests.
- **Files touched:** C=create, M=modify, không wildcard. Report/COVERAGE cập nhật theo quy trình chốt TIP; không sửa TIP DONE.

| Op | File |
|---|---|
| M | `packages/db/prisma/tenant/authz.prisma` |
| M | `packages/actions/src/index.ts` |
| M | `packages/actions/src/settings.ts` |
| M | `packages/shared/src/api/settings.ts` |
| M | `packages/shared/src/api/index.ts` |
| M | `packages/shared/src/index.ts` |
| M | `packages/core/src/authz/authz.module.ts` |
| M | `packages/core/src/authz/public.ts` |
| M | `packages/core/src/authz/services/authz-resolver.ts` |
| M | `packages/core/src/authz/services/roles.service.ts` |
| M | `packages/core/src/identity/actions/member-invite.handler.ts` |
| M | `packages/core/src/identity/actions/member-set-role.handler.ts` |
| M | `packages/core/src/identity/services/invites.service.ts` |
| M | `packages/core/src/identity/identity.module.ts` |
| M | `packages/core/src/identity/settings/settings-read.service.ts` |
| M | `packages/core/src/notify/events/kernel.rules.ts` |
| M | `apps/api/src/http/authz/authz.controller.ts` |
| M | `apps/api/src/http/identity/settings.controller.ts` |
| M | `apps/api/test/integration/authz.test.ts` |
| M | `apps/web/src/features/settings/api.ts` |
| M | `apps/web/src/features/settings/types.ts` |
| M | `apps/web/src/features/settings/settings-store.ts` |
| M | `apps/web/src/features/settings/registry.ts` |
| M | `apps/web/src/features/settings/screens/SettingsScreen.tsx` |
| M | `apps/web/src/features/settings/components/RolesSection.tsx` |
| M | `apps/web/src/features/settings/components/MemberModal.tsx` |
| M | `apps/web/src/features/settings/components/MembersSection.tsx` |
| M | `apps/web/src/shared/api/mock/domains/settings.ts` |
| M | `apps/web/messages/vi/settings.json` |
| M | `apps/web/messages/en/settings.json` |
| M | `apps/web/messages/vi/actions.json` |
| M | `apps/web/messages/en/actions.json` |
| M | `tools/parity/parity.manifest.ts` |
| M | `coding-packs/docs/06-prototype/DEVIATIONS.md` |
| M | `coding-packs/plans/BLUEPRINT.md` |
| C | `packages/db/prisma/tenant/migrations/20261102004200_custom_roles_teams/migration.sql` |
| C | `packages/actions/src/authz.ts` |
| C | `packages/shared/src/authz/custom-role-policy.ts` |
| C | `packages/shared/src/api/teams.ts` |
| C | `packages/core/src/authz/actions/role.handlers.ts` |
| C | `packages/core/src/authz/actions/team.handlers.ts` |
| C | `packages/core/src/authz/services/role-lifecycle.ts` |
| C | `packages/core/src/authz/services/role-assignment.ts` |
| C | `packages/core/src/authz/services/team-members.ts` |
| C | `packages/core/src/authz/services/authz-revision.ts` |
| C | `packages/core/src/authz/authz-management.providers.ts` |
| C | `apps/web/src/features/settings/api/teams.ts` |
| C | `apps/web/src/features/settings/roles.types.ts` |
| C | `apps/web/src/features/settings/components/RoleEditor.tsx` |
| C | `apps/web/src/features/settings/components/RolePermissionMatrix.tsx` |
| C | `apps/web/src/features/settings/components/TeamsSection.tsx` |
| C | `apps/web/src/features/settings/components/TeamEditor.tsx` |
| C | `apps/web/src/features/settings/hooks/useRoleEditor.ts` |
| C | `packages/actions/test/authz.test.ts` |
| C | `packages/core/test/custom-roles.test.ts` |
| C | `packages/core/test/teams.test.ts` |
| C | `apps/api/test/integration/custom-roles.test.ts` |
| C | `apps/api/test/integration/teams.test.ts` |
| C | `apps/api/test/integration/authz-management.contract.test.ts` |
| C | `apps/web/e2e/settings-roles.spec.ts` |
| C | `apps/web/e2e/http/settings-roles.spec.ts` |
| C | `coding-packs/reports/TIP-042-completion.md` |

## CONTEXT
- Working dir: AppChat_Ver2. Stack: `product/tech-stack.md` + BUILDER-HANDOFF (NestJS, Prisma multi-file, Postgres native/Redis, Next + Ant Design, zod). Product doc còn câu Owner+Member và Testcontainers cũ: D27/Blueprint §3.5 và luật native/no-Docker mới hơn thắng, không đưa hai câu cũ vào code.
- Khảo sát HEAD 749d3dc, không phải bằng chứng đã implement:
  - `packages/db/prisma/tenant/authz.prisma:8-39`: Role có key/permissions/dataScope; Team chưa lead_user_id/version; TeamMember PK(teamId,userId).
  - `packages/core/src/authz/services/authz-resolver.ts:69-103`: cache Redis 60s, version chỉ ở Redis; custom role đọc DB; delegations được cộng vào quyền. Không có luồng quản lý grant/revoke.
  - `packages/core/src/authz/services/roles.service.ts:11-31` đọc custom roles thật, nhưng `identity/settings/settings-read.service.ts:157-172` chỉ map SYSTEM_ROLES. FE gọi /settings/roles, không phải /roles.
  - `packages/shared/src/api/settings.ts:62-77` key enum SYSTEM_ROLES; `packages/actions/src/settings.ts:6,46,77` member.invite/set_role chỉ nhận bốn system roles.
  - `identity/actions/member-set-role.handler.ts:27-35` ghi roleKey trực tiếp; undo CAS role hiện tại nhưng không kiểm vai trò đích còn hợp lệ.
  - `identity/services/invites.service.ts:72-90` accept nhận roleKey trong invite, không kiểm role còn sống. Đây là điểm cần kiểm lại khi custom role bị xoá.
  - `apps/api/src/http/kernel/request-actor.ts:53-59` đọc membership hiện tại mỗi request rồi resolve. `notify/events/notify.consumers.ts:23-26` chỉ invalidate khi event realtime đã được xử lý; không bảo đảm thu hồi ngay nếu worker dừng.
  - `apps/web/src/features/settings/components/RolesSection.tsx:32-36` khoá tạo vai trò; MemberModal chỉ có bốn role; registry chưa Nhóm. Phòng ban P3 không được dùng làm lý do loại Nhóm P1.
- Nguồn nghiệp vụ: D27/D32/D35, REQ-A05b, Blueprint §2.2 authz, §3.4 role/team, §3.5; prototype vùng Vai trò / Thành viên / Phòng ban chỉ tham chiếu phần flat team hợp lệ.

## APPLICABLE STANDARDS
- authz/rbac-permissions.md: Owner duy nhất, permission-based, hệ thống bất biến, team, AI giao quyền.
- actions/action-registry.md; api/response-envelope.md; events/outbox.md: Executor, preview/idempotency, envelope và commit/outbox.
- database/tenant-db.md; database/indexing.md: hai DB không atomic, resolver, scalar user IDs, index/deferred join.
- domain/concurrency.md; domain/validation-defaults.md; domain/gap-filling.md; ops/observability-security.md.
- ui/frontend-structure.md; ui/interaction-patterns.md; ui/prototype-parity.md; i18n/i18n.md.
- code/file-size-module-layout.md; code/testing.md; workflow/git-flow-ci.md; D59 GOAL-BACKEND.
- Khi nghiệm thu quyền AI: ai/agent-gateway.md, ai/eval.md; dùng harness 023b, không thêm đường ghi từ LLM.

## Rà trước khi làm
1. Chốt Q-028 rồi ghi policy được duyệt vào custom-role-policy; không lấy đề xuất dưới đây làm phê duyệt. Kiểm role-name literals chỉ dùng phân loại template/identity, không thay can(permission).
2. Rà 045b: thao tác platform trước + durable reconciliation có thực sự chạy? Không tuyên bố nested transaction platform/tenant là atomic. Nếu chưa có thì dừng AC lifecycle lỗi hai DB, không viết bypass kernel.
3. Đối chiếu route /roles và /settings/roles, serializer, mock, MemberDraft và UI badge. Đo dòng file; nếu chạm monolith thì facade 1–2 dòng, module mới chứa logic. Điều chỉnh manifest trước sửa ngoài phạm vi.
4. Rà authz tại API, socket, AI tool và resume approval sau dependency023b; mọi lần gọi phải resolve quyền hiện tại. Không sửa run để tin snapshot role cũ.
5. Tính lại giao file toàn batch khi 042b/042c và sáu TIP cũ đủ manifest. Không coi thứ tự ID là thứ tự tích hợp: 043/045b trước042 trong đợt này.

## TASK
Mở quản trị vai trò và nhóm P1 trên engine hiện có, nối cả đường đọc Cài đặt và gán vai trò thành viên. Khép vòng đời tạo/nhân bản, cập nhật, xoá, mời/gán/nhận lời mời/undo và thu hồi quyền; không mở rộng phạm vi chia lead hay serializer nghiệp vụ trong TIP này.

### 1. Vai trò và hợp đồng action
1. `role.create`: input name (trim 1–120), clone_from_key?; hoặc permissions + data_scope đủ sáu module, không nhận key/is_system từ client. Server sinh `custom:<uuid>`, UUIDv7; output key/version. Clone và tạo trắng dùng cùng action, không cần action clone riêng.
2. `role.update`: role_key + if_version + name?/permissions?/data_scope?; `role.delete`: role_key + if_version. permission roles.manage; risk config/config/delete; agentGrantable false; invalidates roles/members/me. Chạy Executor, audit before/after, preview đúng policy; không REST write.
3. Năm role hệ thống giữ ROLE_DEFS nguồn thật DC-024; cấm update/delete và cấm ghi đè key bằng tên Owner. Custom key immutable. Chưa grant quyền thì tập rỗng; không fallback manager khi DB thiếu.
4. Validate permission theo danh mục đóng; không lặng lọc key sai. Scope chỉ own/team/all/none cho SCOPE_MODULES; không nhận module lạ hoặc thiếu module rồi nới thành all. Data scope team vận hành đầy đủ sau042c.
5. **Gate Q-028:** đề xuất giữ sáu quyền riêng Owner không grant cho custom role, clone Owner bỏ các quyền này có thông báo; contract.sign/payment.refund_approve chỉ bật rõ theo D35. Bản thực thi phải dùng quyết định được duyệt, không silently clone toàn PERMISSIONS rồi tạo Owner thứ hai. Phần UI uỷ quyền phải chỉ đúng đối tượng/quyền D35, không generic membership.delegations editor.
6. Mở rộng role string schema của member.invite/set_role tương thích bốn giá trị cũ và custom:*; kiểm role tồn tại trong đúng tenant ở handler, accept invite và undo. Non-Owner có members.manage không được dùng một custom role đặc quyền để tự nâng quyền hoặc cấp quá quyền được phép gán. Không tin permission/key client gửi.
7. Xoá mềm role (deletedAt) sau kiểm không có membership active và lời mời chưa hết hạn đang tham chiếu; conflict trả số lượng, không âm thầm đổi tất cả thành sales. Tombstone không được resolve, gán, mời, nhận lời mời hay undo phục hồi ngầm. Việc role bị xoá đua với assignment phải fail-closed và reconcile; không có FK giả xuyên hai DB.
8. Grant/revoke D35 P1 lưu bằng role tuỳ biến theo Blueprint, không chỉnh ROLE_DEFS manager. Migration/đọc phải xử lý membership.delegations cũ rõ ràng: không mất grant hợp lệ, không để grant cũ sống lại sau revoke/đổi role. Chốt cách chuyển cùng Q-028; không thêm action ghi delegations thô.
9. Role/team handlers có preview diff quyền/scope/membership, không preview rỗng. Update/set_members hoàn tác 24h bằng CAS version và kiểm lại quyền hiện tại + active members; undo cũng tăng revision/phát outbox. Create chỉ undo khi chưa được tham chiếu; role.delete không tự khôi phục quyền bằng undo (muốn cấp lại cần thao tác rõ ràng đã kiểm policy). Ghi khả năng undo từng action trong registry/contract test, không hứa undo toàn bộ.

### 2. Nhóm
- `team.create` {name, lead_user_id?}; `team.update` {team_id,if_version,name?,lead_user_id?}; `team.set_members` {team_id,if_version,user_ids}. Output team_id/version. permission `members.manage` (quản lý thành viên, không permission mới); risk config, agentGrantable false, invalidates teams/members/me. Đây là flat team, không cây phòng ban.
- Name trim 1–120; UUID/user IDs hợp lệ; danh sách không trùng, có giới hạn được schema mô tả; mọi user active thuộc workspace. Lead phải nằm trong thành viên; set_members loại lead phải yêu cầu đổi/clear lead trước, không giữ lead mồ côi.
- CAS version tăng cùng transaction thay tập thành viên; không partial success. Nhiều team/user được phép theo schema hiện tại. Không team.delete trong Blueprint nên không thêm UI nút xoá giả.
- Thành viên bị remove không còn tính teamUserIds dù row tenant chưa cleanup; resolve giao membership active trước khi tính nhóm. Không cấp quyền thêm chỉ vì là team lead.
- 042 không backfill owner/team của chứng từ; 042c làm việc này, giữ D32 snapshot doanh số.

### 3. Version, thu hồi và consistency
- Expand migration thêm Role.version/deletedAt, Team.version/leadUserId; thêm singleton AuthzRevision [T] lưu revision. Khai báo Blueprint §2.2, không workspace_id tenant.
- Role/team mutation tăng revision trong cùng tenant transaction. Resolver kiểm revision bền vững trước khi dùng cache, key gồm revision + membership hiện tại; revision thiếu trên schema cũ thì đọc uncached, không suy luận revision0 cho cache cũ. Redis lỗi dùng DB, không dùng stale grant.
- Snapshot cũ có thể tồn tại trong request đang chạy; lần tool/request kế tiếp sau commit phải thấy quyền mới. Event chỉ tăng tốc refresh UI/socket, không là rào bảo mật duy nhất. Reuse member.role_changed/refresh_authz cho các user bị tác động (team đổi bao gồm cả thành viên cũ lẫn mới); tránh broadcast dữ liệu cá nhân cả workspace.
- Thiết kế 045b xử lý platform membership/invite + tenant audit/outbox/idempotency; fault injection tại từng commit. Retry cùng key không cấp lại/đổi lại role sau revoke. Delete/assign/accept/undo đồng thời không được nâng quyền qua tombstone hoặc trả grant từ cache cũ.
- Không sửa ActionExecutor monolith trong042. Nếu phát hiện nền tảng consistency vẫn sai, bổ sung045b trước thi công thay vì để debt không có TIP.
- Index `role(key)` đã unique, không duplicate; danh sách active `(is_system DESC,created_at,id) WHERE deleted_at IS NULL` INCLUDE(name,version); team `(created_at,id)` INCLUDE(name,version,lead_user_id); giữ team_member(user_id) INCLUDE(team_id). Dùng ID-page/deferred join khi list role/team phân trang, không INCLUDE JSON permissions dài.
- Hai endpoint roles giữ envelope tương thích: /roles và /settings/roles lấy cùng domain service, settings adapter thêm color/count, không tự map SYSTEM_ROLES riêng. RolesData mở key:string + name/is_system/version, giữ fields cũ. Teams DTO zod, /teams giữ data array; nếu thêm cursor thì additive next_cursor và consumer đọc hết page cho selector, không mất team sau trang1.

### 4. UI
- RolesSection orchestrator; editor + ma trận tách file, system readonly, clone có nhãn rõ quyền bị bỏ; custom name hiển thị text DB không gọi tr(custom:key). Chỉnh quyền/scope, báo CAS conflict để reload, không ghi đè âm thầm.
- `settings/types.ts` đang384 dòng: tách role/team DTO sang roles.types.ts, file cũ chỉ re-export, không đẩy vượt400. Regression `authz.test.ts` phải phân biệt kiểm revision nhẹ với full load roles/teams; bỏ kỳ vọng “không đọc DB” nếu không còn đúng.
- TeamsSection + TeamEditor trong settings registry/screen, chỉ hiện với members.manage; màn loading/empty/error/forbidden, lead picker và membership picker; không mở tổ chức/phòng ban P3. Ghi deviation đúng cấp cho UI P1 prototype chưa vẽ đủ.
- MemberModal lấy role choices từ API đã kiểm assignability; server kiểm lại; badge thành viên và số lượng role không hard-code5. Nút chỉ đóng khi action thành công, preview/approval không bị coi là success.
- Tất cả ghi useAction, không store-only; mock và HTTP cùng zod; vi/en + aria labels/focus/keyboard, mobile390; không đổi token/geometry màn không liên quan.

## ACCEPTANCE CRITERIA
1. **Role lifecycle:** Given Owner + manager + hai tenant; When tạo trắng/clone/update/delete qua Executor; Then đúng key/version/permission/scope và audit, system edit/delete422, manager403, tenant khác404/403, key lạ422. Clone policy đúng quyết định Q-028.
2. **No escalation:** Given manager có members.manage nhưng không sign/refund; When tự gán hoặc mời custom role đặc quyền, giả is_system/permissions/key Owner; Then từ chối, không thay membership. Owner duy nhất vẫn từ workspace.ownerUserId.
3. **Assignments:** Given custom role hợp lệ; When invite → accept → set_role → undo và reload settings; Then role thật xuất hiện cùng quyền đúng, quota/expiry/token semantics không đổi. Given role tombstone/invite hết hạn/member removed; Then reject, không fallback role mạnh hơn.
4. **CAS/concurrency:** Given hai update cùng if_version, hoặc delete đua assign/accept/undo; When chạy đồng thời trên DB thật; Then một CAS thắng, stale409, không quyền bị hồi sinh, reconciliation không tự cấp quyền trái ý mới nhất. Inject fail platform/tenant/outbox commit và retry cùng key, ghi rõ trạng thái từng DB.
5. **Team:** Given ba thành viên hai team; When set_members/lead rồi đổi membership; Then tập thay atomic, lead invariant, foreign/inactive member422, version conflict409, removed user không còn mở rộng scope. Không tạo quyền chỉ vì lead.
6. **Revocation:** Given cache nóng trên hai API process và AI worker, event worker bị trì hoãn; When role quyền hoặc team bị thu hồi và commit; Then request/tool kế tiếp đọc revision mới, không chờ TTL60s/event; Redis unavailable vẫn fail-closed hoặc đọc DB. Socket nhận refresh khi event tiếp tục; không thêm quyền do duplicate event.
7. **API/FE:** Given custom roles + teams; When mở hai endpoint roles rồi CRUD bằng mock và HTTP; Then zod contract xanh, cùng dữ liệu hiệu lực, số lượng đúng, system/custom labels đúng, modal CAS/retry/error hoạt động, desktop/mobile/keyboard pass.
8. **Delegation + AI:** Given quyết định Q-028 đã chốt, manager trước/sau grant/revoke D35; When HTTP và Trợ lý gọi action ký/hoàn sau preview/approval; Then allow/deny đúng user hiện tại, revoke không bị membership.delegations cũ ghi đè. Agent chỉ có tool_ids không được gọi role/team action agentGrantable=false.
9. **Migration/performance:** Given schema trước/sau migration và hai workspace; When deploy/migrate/read/rollback app một version; Then role hệ thống không đổi, custom thiếu role fail-closed, no cross-tenant, EXPLAIN list/revision/membership có index phù hợp, không N+1.

### Lệnh nghiệm thu (builder chạy thật, lượt lập TIP này chưa chạy)
- `pnpm --filter @appchat/actions exec vitest run test/authz.test.ts`
- `pnpm --filter @appchat/core exec vitest run test/custom-roles.test.ts test/teams.test.ts`
- `pnpm --filter @appchat/api exec vitest run --config vitest.integration.config.ts test/integration/custom-roles.test.ts test/integration/teams.test.ts test/integration/authz-management.contract.test.ts` — xác minh tên config/script của repo trước chạy, không dùng unit exclude integration.
- `pnpm --filter @appchat/web exec playwright test e2e/settings-roles.spec.ts`; HTTP: `pnpm --filter @appchat/web exec playwright test --config playwright.http.config.ts settings-roles.spec.ts` sau dựng API/worker cô lập bằng harness `pnpm e2e:http`. Hai process/cache và fault injection không thay bằng mock.
- `pnpm parity settings:roles`, `pnpm parity settings:members`, các ID team/editor bổ sung trong manifest, `pnpm parity --done` (shared schema), `pnpm i18n:check`; D59 lint/typecheck/unit/integration/depcheck/build + full E2E khi chốt.
- `pnpm ai:live` harness023b với ca grant/revoke D35 và từ chối role/team mutation bằng agent; tận dụng case/catalog động đã có, không giả output model. Nếu harness chưa có ca thì cập nhật manifest hai bên trước bổ sung fixture. Không in key/token; thiếu provider ghi chưa nghiệm thu thật.
- Dán lệnh/output thực và EXPLAIN vào report; không chạy integration trên demo đang dùng chung Redis, dùng tài nguyên cô lập.

## CONSTRAINTS
- DO NOT: sửa ROLE_DEFS, chuyển Owner, cho custom role tự cấp Owner-only khi Q-028 chưa chốt; role-name authorization; thêm team.manage; department hierarchy; SQL bypass resolver; cache grants stale; source/client tự nhận system.
- REUSE: ActionExecutor, can, AuthzResolver, ROLE_DEFS, TenantDbResolver, outbox/realtime rules, FormModal/PageStates/useAction, D59.
- SKIP: lead routing042b, team_id nghiệp vụ + field serializers042c, privacy.erase riêng, hạ tầng045, broad hardening045b. Không vì có Nhóm mà đánh ĐẠT toàn scope.
- File trần backend600 (tách ở500), frontend400, route120; test riêng, facade cho legacy monolith; không thêm thư viện.
- Không sửa luật commerce/quyền đã duyệt hoặc TIP001–035.

## Quality Gate: Self-Review
- Có header, manifest, context code, standards, task/validation/errors,9 AC, checklist và ranh giới tuần tự.
- Chưa đạt ready-to-build: Q-028; full batch overlap còn chờ manifest các TIP; independent review chưa chạy. Không đánh DONE hoặc ĐẠT vì tài liệu này tồn tại.

## ⚠️ BUILDER-CHECKLIST
- [ ] Q-028 được trả lời, policy/AC cập nhật; prerequisites và manifest đã rà, không file ngoài scope.
- [ ] AC1–9 có kết quả từng ca; lệnh/test output thật, model thật riêng; thiếu tài nguyên ghi rõ.
- [ ] Role/team mutations chỉ qua Executor; system roles bất biến; Owner duy nhất; API/worker không tin cache cũ.
- [ ] Tenant isolation, không FK xuyên DB; lỗi commit/retry/reconcile không nâng quyền; EXPLAIN/index đủ.
- [ ] Mock + HTTP + parity + mobile/i18n + D59 pass; không đổi session/dịch vụ demo.
- [ ] Commit code trên tip/042-* → PR dev; git status sạch, Git SHA thật trong report; cập nhật COVERAGE bằng parts/merge.
