# TIP-042b — Chia lead mới và cấu hình routing theo tài khoản kênh

## HEADER
- **Parallel-safe with TIP-038b:** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate this TIP before 038b. Recheck incomplete manifests.
- **Parallel-safe with TIP-040:** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate this TIP before 040. Recheck incomplete manifests.
- **Parallel-safe with TIP-039:** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate this TIP before 039. Recheck incomplete manifests.
- **Parallel-safe with TIP-038 (expanded manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `tools/parity/parity.manifest.ts`; integrate this TIP before 038; recheck after remaining manifests expand.
- **Parallel-safe with TIP-038:** sequential, shares `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `apps/web/messages/vi/actions.json`, `apps/web/messages/en/actions.json`, `tools/parity/parity.manifest.ts`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `coding-packs/plans/BLUEPRINT.md`; integrate this TIP before 038. Recheck after incomplete manifests expand.
- **Additional overlap with TIP-037 caps UI:** sequential, shares `packages/actions/src/settings-apps.ts`, `packages/core/src/channels/services/accounts.service.ts`, `packages/shared/src/api/channels.ts`, `apps/web/src/features/settings/channel-types.ts`, `apps/web/src/features/settings/components/ManageChannelDrawer.tsx`, `apps/web/messages/vi/settings.json`, `apps/web/messages/en/settings.json`; integrate this TIP before 037.
- **Parallel-safe with TIP-037:** sequential, shares `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `apps/web/messages/vi/actions.json`, `apps/web/messages/en/actions.json`, `tools/parity/parity.manifest.ts`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `coding-packs/plans/BLUEPRINT.md`; integrate this TIP before 037. Recheck when incomplete manifests expand.
- **Parallel-safe with TIP-042c:** sequential, shares `coding-packs/plans/BLUEPRINT.md`, `packages/core/src/inbox/services/pipeline.ts`, `packages/db/prisma/tenant/crm.prisma`, `packages/core/src/crm/routing/routing.handlers.ts`; integrate this TIP before 042c. Recheck after incomplete manifests expand.
- TIP-ID: TIP-042b; Project: AppChat V2; Module: CRM lead routing + settings; Priority: P1; Estimated: L.
- Depends on: 014/015/016/017/018, 042 (team + active membership), 045b (trusted system-action boundary); sau các TIP chung file bên dưới, trước044/046.
- **Dòng COVERAGE nhận:** REQ-F01c, COM-8b-7, PRO-settings-routing; REQ-B11d chỉ phần assignment (SLA vẫn còn thiếu, không được đánh ĐẠT cả dòng).
- **Parallel-safe with:** sequential, shares `packages/actions/src/index.ts` with015b/020b/023b/023c/030b/032b/036/042/043/045b; integrate all before042b. Also shares `packages/db/prisma/tenant/crm.prisma` with015b; `packages/core/src/crm/crm.module.ts` with036; shared API index/settings/action locales/Blueprint/deviations/parity manifest with020b/036/042/043 where listed; registry/screen with042. Bilateral exact-path declarations in each existing pending TIP; no parallel promise with incomplete/future manifests.
- **Files touched:** C=create, M=modify; chỉ kế hoạch, không code trước câu A hoàn tất.

| Op | File |
|---|---|
| M | `packages/actions/src/index.ts` |
| M | `packages/actions/src/settings-apps.ts` |
| M | `packages/shared/src/api/channels.ts` |
| M | `packages/shared/src/api/index.ts` |
| M | `packages/db/prisma/tenant/crm.prisma` |
| M | `packages/core/src/crm/crm.module.ts` |
| M | `packages/core/src/crm/jobs/crm.jobs.module.ts` |
| M | `packages/core/src/inbox/services/pipeline.ts` |
| M | `packages/core/src/channels/services/accounts.service.ts` |
| M | `packages/core/src/channels/actions/channel-manage.handlers.ts` |
| M | `apps/api/src/http/channels/channels.http.module.ts` |
| M | `apps/web/src/features/settings/channel-types.ts` |
| M | `apps/web/src/features/settings/components/ConnectChannelModal.tsx` |
| M | `apps/web/src/features/settings/components/ManageChannelDrawer.tsx` |
| M | `apps/web/src/features/settings/registry.ts` |
| M | `apps/web/src/features/settings/screens/SettingsScreen.tsx` |
| M | `apps/web/src/shared/api/mock/domains/settings-apps.ts` |
| M | `apps/web/messages/vi/settings.json` |
| M | `apps/web/messages/en/settings.json` |
| M | `apps/web/messages/vi/actions.json` |
| M | `apps/web/messages/en/actions.json` |
| M | `tools/parity/parity.manifest.ts` |
| M | `coding-packs/docs/06-prototype/DEVIATIONS.md` |
| M | `coding-packs/plans/BLUEPRINT.md` |
| C | `packages/db/prisma/tenant/migrations/20261102004210_lead_routing/migration.sql` |
| C | `packages/actions/src/lead-routing.ts` |
| C | `packages/shared/src/api/lead-routing.ts` |
| C | `packages/core/src/crm/routing/routing.providers.ts` |
| C | `packages/core/src/crm/routing/routing.repo.ts` |
| C | `packages/core/src/crm/routing/routing.handlers.ts` |
| C | `packages/core/src/crm/routing/routing-selector.ts` |
| C | `packages/core/src/crm/routing/routing-consumer.ts` |
| C | `packages/core/src/crm/routing/routing-read.service.ts` |
| C | `apps/api/src/http/channels/lead-routing.controller.ts` |
| C | `apps/web/src/features/settings/api/lead-routing.ts` |
| C | `apps/web/src/features/settings/components/LeadRoutingSection.tsx` |
| C | `apps/web/src/features/settings/components/LeadRoutingEditor.tsx` |
| C | `apps/web/src/features/settings/components/ChannelRoutingFields.tsx` |
| C | `packages/core/test/lead-routing.test.ts` |
| C | `apps/api/test/integration/lead-routing.test.ts` |
| C | `apps/api/test/integration/lead-routing.contract.test.ts` |
| C | `apps/web/e2e/settings-routing.spec.ts` |
| C | `apps/web/e2e/http/settings-routing.spec.ts` |
| C | `coding-packs/reports/TIP-042b-completion.md` |

## CONTEXT
- Working dir: AppChat_Ver2; stack `product/tech-stack.md` + Blueprint/BUILDER-HANDOFF (native Postgres, Prisma, Nest/BullMQ, Next/AntD, zod). D27 thay Owner+Member cũ; no-Docker thay Testcontainers cũ.
- Code khảo sát983346e:
  - `channels/services/accounts.service.ts:18,41`: assign_mode round_robin/least_busy/shift, default round_robin; chỉ lưu, không chọn người.
  - `actions/src/settings-apps.ts:171`, `shared/src/api/channels.ts:8`, FE channel-types/ConnectChannelModal/ManageChannelDrawer lặp enum này; không có manual/by_channel. Không được chỉ đổi một lớp.
  - `crm/services/identity.service.ts:25-57`: resolve identity/phone rồi tạo contact chưa owner, event contact.created không chứa channel_account_id; email/name không tự khớp.
  - `inbox/services/pipeline.ts:81-126`: resolve contact rồi hội thoại mới lấy owner của khách; chưa có owner thì hàng chung. Nhóm không tự tạo contact. Inbound trùng rollback qua DuplicateInbound.
  - `inbox/jobs/inbound.processor.ts:40-61`: worker gọi pipeline rồi enqueue AI; routing phải độc lập với AI reply, không trì hoãn nhận tin vì config thiếu.
  - `crm/actions/contact-owner.handlers.ts:95-133`: transfer_owner là thay chủ có nghiệp vụ chuyển hội thoại, không dùng làm đường tự động ghi đè owner đang có.
  - `support/actions/ticket-create.handler.ts:78` luôn defaultPolicy; channel.sla_policy là nhãn lưu, không chứng minh SLA theo kênh đã chạy.
- Đọc COMMERCE §8b, D32, REQ-F01c/B11, Blueprint inbound, standard authz. Prototype routing L7338–7370 còn skill/shift/workflow ngoài phạm vi; chỉ lấy bố cục, không bật tính năng P3.

## APPLICABLE STANDARDS
- actions/action-registry.md, events/outbox.md, api/response-envelope.md: mọi ghi qua Executor, trusted event consumer, retry/idempotency.
- authz/rbac-permissions.md, database/tenant-db.md, database/indexing.md: D32, DB riêng, quyền hiện tại, query/index.
- channels/omnichannel-adapter.md: adapter không biết CRM/routing; normalized inbound là nguồn.
- domain/concurrency.md, domain/validation-defaults.md, domain/gap-filling.md: CAS, khoá, lựa chọn kỹ thuật có ghi quyết định.
- ui/frontend-structure.md, ui/interaction-patterns.md, ui/prototype-parity.md, i18n/i18n.md; code/file-size-module-layout.md, code/testing.md; ops/observability-security.md; D59.

## Rà trước khi làm
1. Rà dependency042/045b và test trusted source của Executor: HTTP không tự gửi source=system để chạy routing. Nếu chưa có, khép045b trước, không tạo bypass.
2. Kiểm config assignment cũ và migration: trước đây default round_robin chưa chạy; không bật tự động cho toàn workspace cũ chỉ vì string có sẵn.
3. Kiểm inbound của cả Zalo/webchat/email, trường event thực và job ROLE=jobs nạp CrmJobsModule. Không đặt routing chỉ trong API hoặc chỉ worker ai.
4. Rà version contact/conversation sau032b/045b, consumer retries và 042c team_id; không tạo dependency ngược042→042b. 042c tích hợp sau042b nếu đụng schema/scope.
5. Đọc prototype và sổ parity: routing đang bị ẩn ở SETTINGS_OUT; mở đúng P1, không vô tình hiện skill routing/phân ca/workflow. Đo file dòng, nhất là ManageChannelDrawer; trích ChannelRoutingFields thay vì thêm logic vào file lớn.

## TASK
Cấp chủ phụ trách đầu tiên cho lead mới theo rule cấu hình đã được người có quyền bật, đồng thời gán hội thoại mới còn trống. Giữ chủ cũ và mọi gán tay; retry/multi-worker không chia hai lần, và mọi quyết định có audit/reason để truy được.

### 1. Dữ liệu/rule và hợp đồng
- Bảng tenant `LeadRoutingRule` trong crm.prisma: id, channel_account_id nullable, enabled default false, enabled_at?, mode manual/round_robin/by_channel/least_busy, user_ids hoặc team_id (chọn một pool), fixed_user_id? cho by_channel, version, configured_by_user_id, created_at/updated_at. Một default rule (partial unique channel_account_id IS NULL), một override mỗi account (unique non-null). enabled_at chốt bằng Clock lúc bật, event cũ trước mốc này không được chia hồi tố.
- `LeadRoutingCursor` theo rule_id để serial hoá chọn người; `LeadRoutingDecision` có contact_id unique, originating_event_id unique, rule_id/version, selected_user_id?, conversation_id?, reason, created_at. Không lưu raw message/phone. Chỉ một quyết định first-owner cuối cùng/contact; retry cùng event trả lại.
- `lead_routing.update` input rule_id?/channel_account_id?, if_version?, enabled, mode, pool (user_ids hoặc team_id), fixed_user_id?; permission crm.reassign, risk config, agentGrantable false. Tạo rule lần đầu cần Idempotency-Key; update CAS. Output rule_id/version. Preview người được nhận lead, ảnh hưởng chỉ lead mới; undo24h CAS config, không đảo owner lead đã cấp.
- GET `/v1/settings/lead-routing`: crm.reassign, DTO zod rules + candidate options, không credentials. GET cùng service cho config read nếu bổ sung catalog023b; không raw Prisma.
- `channel.update_settings` giữ tương thích các field khác; patch assignment phải thêm kiểm crm.reassign ngoài channels.manage. Adapter gọi cùng routing domain service trong transaction của action, không lồng hai Executor transaction.
- Canonical rule là nguồn runtime duy nhất; account.settings.assign_mode chỉ projection tương thích. Không hai nơi chỉnh rồi ghi đè lẫn nhau. Return/read có routing enabled/version; change config bằng rule action hoặc channel action đều CAS cùng record.
- Đề xuất kỹ thuật DC-238: cài mới default manual/disabled; workspace cũ có round_robin/least_busy chưa chạy thì giữ string nhưng disabled cho tới khi người dùng lưu/bật rule. Giá trị legacy shift giữ đọc được + banner unsupported, không tự ánh xạ sang least_busy; UI không cho chọn shift mới. Đổi contract additive/expand-compatible, không xoá enum legacy ngay.
- Pool rỗng khi bật auto →422; ID user/team/account phải thuộc tenant/workspace, user active; fixed_user phải thuộc pool. Không cho danh sách trùng hoặc mode-field không tương thích; cap100 user IDs (pool lớn hơn dùng team). Rule by_channel yêu cầu account override + fixed_user_id, không random.

### 2. Thuật toán và ownership
1. Thứ tự: khách đã có owner → giữ; hội thoại đã gán tay → giữ; account override enabled → dùng; nếu override tồn tại nhưng disabled/manual → hàng chung (không lùi default); không override → default rule; không rule → manual. Không đổi owner cũ dù owner rời workspace: trả reason owner_inactive để quản lý xử lý, không tự giành khách.
2. Eligible candidates = pool ∩ active membership ∩ quyền crm.view/crm.edit và inbox.view/inbox.reply hiện tại. Không dùng tên role hoặc online badge làm quyền. Team lead không tự thêm ưu tiên. Permission bị revoke trước chọn thì loại.
3. round_robin: danh sách user_id sort ổn định, cursor last_user_id; lấy người eligible kế tiếp, wrap; chỉ tiến cursor trong transaction quyết định thành công. Người bị remove/reorder không làm kẹt vòng.
4. least_busy: đếm hội thoại human-assigned trạng thái open/pending/snoozed, không archived/hidden/closed; chọn số thấp nhất, hoà dùng round_robin. Dùng actual conversation counts (không số ticket, credit hay session online). Khoá routing cursor và cập nhật owner/conversation cùng transaction để hai worker không cùng nhìn load cũ. Đây là định nghĩa kỹ thuật đề xuất trong DC-238, không thay luật doanh số.
5. by_channel: fixed user của account override; user không eligible → giữ hàng chung + reason no_eligible, không fall back người ngẫu nhiên.
6. manual hoặc hết eligible → giữ null, decision reason manual/no_eligible; không vòng retry nóng. Rule bật sau không tự chia lại backlog; người quản lý dùng action assign/transfer_owner có sẵn cho khách đó.
7. Gán owner chỉ CAS `owner_user_id IS NULL AND deleted_at IS NULL AND stage='lead'`; không phân phối khách đã chuyển potential/won... Gán conversation chỉ khi direct, gắn đúng contact, assignee_user_id IS NULL; không sửa assignee_agent_id/ai_mode. Nếu khách đã có gán tay hội thoại trước worker thì không chọn người khác làm owner.
8. Chỉ first assignment; không sửa historical quote/order/invoice owner, không cấp collaborator tự động, không thay COMMERCE/D32. Người/agent muốn chuyển owner cũ phải dùng contact.transfer_owner và approval theo D32, không gọi routing.

### 3. Event → ActionExecutor, retry và khoá
- Pipeline phát `lead.routing_requested` trong cùng outbox transaction của inbound direct khi vừa tạo contact lead chưa owner; payload contact_id, conversation_id, channel_account_id, message_id. Không phát cho group hoặc khách khớp phone/identity cũ. “Lead mới” là contact mới được tạo sau enabled_at, không phải timestamp tin nhắn; lịch sử nhập sau khi bật có thể tạo lead mới và phải hiện rõ điều này trong preview/UI. Không tự phát minh cờ realtime/history vì NormalizedInbound hiện không có. Khách tạo tay/import hiện có owner người tạo (`contacts.service.ts:96-106`, `contact-io.handlers.ts:115`), giữ nguyên, không giành khách để round-robin.
- Consumer ROLE=jobs nhận event, gọi `lead_routing.apply` {event_id}; risk write, permission crm.reassign, agentGrantable false. Worker dựng trusted system actor bằng cơ chế045b; handler kiểm persisted event đúng topic/workspace, không nhận user_id tuỳ ý, không mở action cho UI/assistant/task. Dedupe event_consumption chỉ là vòng ngoài, decision unique mới chống duplicate commit.
- Handler nạp lại rule/membership/contact/conversation, khoá cursor rồi contact rồi conversation theo thứ tự cố định. Không gọi nested Executor từ pipeline/transaction; inbound commit trước, routing eventual. Kết quả audit gồm rule/version/reason/from null/to; events contact.owner_changed + conversation.assigned auto=true đúng shape notify hiện hành.
- Concurrent manual assignment/transfer thắng thì worker no-op có reason changed; không rollback tin nhắn đã nhận. Lỗi DB transient retry có backoff; lỗi input/event invalid permanent không spin. Commit routing + decision + audit/outbox cùng tenant transaction; unique race replay trả kết quả cũ, không cursor advance lần hai.
- Không mở rộng system authority: apply chỉ được gán owner đầu tiên từ rule bật bởi crm.reassign, không tạo user, không thay permission. Revalidate membership ngay trước ghi; race member removed sau snapshot phải bị read-scope/active-membership chặn và báo reconciliation, không reassign tùy tiện.
- Index decision(contact_id)/event_id unique; rule(account_id) equality; load query `(assignee_user_id,status) INCLUDE(id)` partial unarchived/unhidden; cursor PK rule_id. Nếu thêm list decision để UI diagnostics: index `(created_at DESC,id DESC)` INCLUDE(rule_id,reason), ID page/deferred join trước payload. Không thêm endpoint list không cần thiết.
- EXPLAIN candidates/load/query rule trong report; scope tenant qua resolver, không N+1 từng user resolve nếu có thể batch. Không sửa global scopeFilter ở đây.

### 4. UI và thông báo trạng thái
- Settings routing section (crm.reassign), default rule + account overrides, pool/team selector, strategy và enabled. Form hiển thị ý nghĩa “chỉ lead mới”; preview, CAS reload giữ draft, empty/error/forbidden. Không toast thành công trước server commit.
- ChannelRoutingFields dùng chung ConnectChannelModal/ManageChannelDrawer; hiển thị read-only nếu channels.manage mà thiếu crm.reassign. Connect mặc định không auto, cấu hình xong qua action; bỏ input giả shift khỏi lựa chọn mới.
- GET/read và mock cùng schema; vi/en; keyboard/focus/mobile390. Chỉ mở các phần routing P1 của prototype, ghi deviation vì phần workflow/skill/shift không làm.
- Không UI sửa SLA giả trong TIP này; REQ-B11d-SLA vẫn phải được TIP support/channel khác nhận. Không nâng cả REQ-B11d thành ĐẠT.

## ACCEPTANCE CRITERIA
1. **Config:** Given Owner/manager có quyền và sales không có, hai workspace; When tạo/update rule hoặc channel patch; Then chỉ người đủ quyền ghi, CAS stale409, foreign ID422/404, unknown mode422, valid config round-trip DTO; preview/undo/idempotency hoạt động.
2. **Modes:** Given3 eligible users +9 lead mới; When sequential round_robin; Then mỗi người3, cursor bền qua restart. least_busy với counts3/1/2 chọn user có1, tie vòng tròn. by_channel chọn đúng fixed user; manual/no_eligible giữ null có reason.
3. **No steal:** Given contact đã owner, khách phone match, hội thoại gán tay, group, deleted contact, stage khác lead; When nhận tin/worker chạy; Then không ghi đè owner/assignee, không sửa snapshot doanh số/agent assignment. Contact cũ owner inactive không tự đổi.
4. **Races:** Given hai worker, duplicate event, manual assign/transfer đồng thời; When apply/retry/fail trước-sau commit; Then một first-owner cuối cùng, một decision, cursor chỉ tiến một lần, audit/event không nhân đôi. Inbound message/unread không mất vì routing lỗi.
5. **Security:** Given user forge source=system/event_id/cross-tenant ID, agent có tool_id, config author bị revoke; When gọi apply/config; Then không vượt trusted entry/permissions; apply không lấy user_id từ caller; permission revocation và membership inactive loại khỏi candidate.
6. **Channels:** Given Zalo/email/widget fixtures và history-sync; When inbound direct tạo lead mới sau enabled_at; Then durable event đi ROLE=jobs/Executor, mất Redis lúc enqueue vẫn relay phục hồi, group/khách khớp cũ không chia lead; event trước enabled_at không bị xử lý hồi tố. Khách mới từ history sau opt-in tuân cùng policy đã hiển thị, timestamp tin không quyết định eligibility. SLA độc lập không bị đổi theo mode.
7. **Migration/UI:** Given config legacy round_robin/least_busy/shift; When upgrade/reload; Then không auto-enable, shift hiện legacy unsupported, opt-in rule mới vận hành đúng, mock/HTTP same DTO, desktop/mobile/focus/CAS states pass.
8. **Query/architecture:** Given pool100 và tenant khác; When chọn theo tải; Then query có index/EXPLAIN, không full wide-row scan/N+1 per candidate, không DB name từ client, không raw write ở controller/AI, file caps pass.

### Test commands — builder chạy thật
- `pnpm --filter @appchat/core exec vitest run test/lead-routing.test.ts`.
- `pnpm --filter @appchat/api exec vitest run --config vitest.integration.config.ts test/integration/lead-routing.test.ts test/integration/lead-routing.contract.test.ts`; Postgres/Redis riêng, thực sự2 worker và fault injection.
- `pnpm --filter @appchat/web exec playwright test e2e/settings-routing.spec.ts`; HTTP dùng `--config playwright.http.config.ts settings-routing.spec.ts` sau harness e2e:http.
- `pnpm parity settings:channels` + routing/editor IDs khai mới trong parity.manifest; `pnpm parity --done`, `pnpm i18n:check`; D59 đầy đủ các package ảnh hưởng.
- Routing là thuật toán xác định, không gọi LLM nên không đặt ngưỡng model giả cho selector. Ca live023b kiểm Trợ lý không gọi internal apply, chuyển chủ cũ vẫn yêu cầu duyệt; ghi thiếu provider thật nếu không chạy được. Bổ sung case harness phải cập nhật manifest hai bên trước sửa.
- Test mock adapters không thay nghiệm thu tin provider thật; không đụng session demo đang hoạt động.

## CONSTRAINTS
- DO NOT: bật auto do legacy default; đổi chủ cũ; sửa doanh số; nhét rule vào channel adapter; dùng tên role; skill/shift/workflow ngoài phạm vi; cho HTTP tự giả system; raw SQL không scope; job ghi trực tiếp ngoài Executor.
- REUSE: ContactIdentityService, pipeline outbox, CrmMembers/AuthzResolver, existing notify events, ActionExecutor, useAction, settings shell/tokens; file backend600/frontend400, logic tách modules, tests riêng.
- SKIP: SLA policy selection, phân ca, lịch/greeting kênh, scope team_id042c, privileged role policy042. Bổ sung015/016/014 qua report, không sửa TIP DONE.

## Quality Gate: Self-Review
- Có manifest44 file,8 AC và code evidence; bilateral overlap của TIP hiện có đã ghi.
- DC-238 là lựa chọn kỹ thuật phải rà lại theo gap-filling trước build; full batch overlap/independent review còn chờ. Không gọi TIP implementation DONE.

## ⚠️ BUILDER-CHECKLIST
- [ ] Rà dependency, source trusted, migration opt-in và manifest/file overlap.
- [ ] AC1–8 có output thật; Postgres concurrency/retry/tenant isolation, no-steal, opt-in/history semantics và group exclusion pass.
- [ ] Mọi ghi qua Executor; apply internal-only; action preview/undo/CAS/audit đúng.
- [ ] Không đổi D32/commerce, active permission chặn quyền cũ; EXPLAIN và file caps đúng.
- [ ] Mock/HTTP/parity/mobile/i18n/D59 pass; thiếu provider ghi rõ.
- [ ] Commit nhánh tip/042b-* → PR dev, status sạch, Git SHA thật; cập nhật parts rồi merge COVERAGE.

