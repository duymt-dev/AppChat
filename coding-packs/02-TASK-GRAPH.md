# AppChat — Task Graph

> Vibecode Kit v5.0 — BƯỚC 5 (TASK GRAPH) · 2026-10-28
> **46 TIP + 9 TIP bổ sung (023b, 023c, 032b, 030b, 015b, 045b, 020b, 042b, 042c — DC-224…237)**, chia **9 wave** (ước lượng cũ ~656 giờ cần rà lại sau khi đủ TIP). Phạm vi = toàn bộ P0 + P1 (RRI D26). Thiết kế: `plans/BLUEPRINT.md` (đã duyệt 2026-10-28), quy tắc commerce: `plans/COMMERCE-DECISIONS.md`, chuẩn code: `standards/README.md`.
> Wave là thứ tự phụ thuộc, không phải tuần lịch. Trong một wave, các TIP không phụ thuộc nhau chạy song song được (mỗi TIP một nhánh / worktree riêng).

---

> **D38 (2026-10-28):** frontend được dựng trước theo prototype trong goal `coding-packs/goals/GOAL-FE-PROTOTYPE.md` (mock transport) — **xong F0–F7**; đợt ver2.1 (D45) làm xong **trước W1**. TIP 007 + 008 bị **huỷ** (goal FE thay thế hoàn toàn).
>
> **Cập nhật 2026-10-29 — áp cho mọi TIP backend:**
> 1. **Phần UI = nối API.** Cột "Name" có chữ "trang …" / "UI" nghĩa là: route đọc + handler action đúng contract FE, tách shape đọc thành zod `packages/shared/src/api/<domain>.ts`, contract test FE ↔ BE xanh, bật `httpTransport` cho module, chạy lại `pnpm e2e <module>` + `pnpm parity <id>`. Không dựng lại màn. Ngoại lệ còn UI thật: 017 (`apps/widget`), 040 (Quản trị nền tảng — FE chưa có).
> 2. **`packages/actions` đã có ~187 action** (FE dựng trước): TIP backend **cài handler**, không định nghĩa lại; đổi schema = escalation L2 (`standards/domain/gap-filling.md` §5).
> 3. **Mọi TIP backend đọc thêm** `standards/domain/*` (gap-filling, state-machine, concurrency, money-time-numbering, validation-defaults) và `standards/ops/observability-security.md` — không ghi lại ở từng dòng của bảng dưới.
> 4. **D42:** 9 list có số trang (`?page=&limit=` + `meta.total`) thuộc 015 (khách hàng), 027 (sản phẩm), 029 (báo giá), 030 (hợp đồng), 031 (đơn), 032 (đề nghị thanh toán), 034 (ticket), 036 (thành viên loyalty), 037 (marketing).
> 5. **Giờ ước tính** ở bảng dưới là con số gốc (trước khi có FE); Chủ thầu ước lại khi sinh TIP từng wave.

## Vertical-flow priority (2026-11-02)

Owner requests Zalo ? CRM ? Commerce ? Agents/Assistant integration first. See [vertical journey and acceptance boundaries](plans/VERTICAL-FLOW-PRIORITY.md). This prioritizes remaining planning; it does not remove other obligations or override dependencies/file-overlap constraints.

## DEPENDENCY GRAPH

```
W1  001 Scaffold ─▶ 002 DB nền tảng + tenant ─▶ 003 Action kernel + API core
                                                   │
        ┌──────────────────────────────────────────┼──────────────────────────────┐
W2      ▼                                          ▼                              ▼
     004 Identity & auth ─▶ 005 Authz ─▶ 006 Realtime + notify        ~~007~~ ~~008~~ (huỷ — goal FE, D38)
        │                    │   │                                        │
W3      ├─▶ 009 Billing core ─▶ 010 Billing payments ◀── 012 Integrations framework ◀─┤
        └──────────────▶ 011 Auth & onboarding UI ◀───────────────────────────────────┤
                             005,006,007 ─▶ 013 Settings shell + thành viên + vai trò ┘
                                                   │
W4                       013 ─▶ 014 Channels + Zalo cá nhân ─┬─▶ 016 Inbox backend ─┬─▶ 017 Web widget
                         005 ─▶ 015 CRM core ────────────────┘                      └─▶ 018 Email (P1)
                                                   │
W5   003,009 ─▶ 019 AI runtime ─┬─▶ 020 KB / RAG ──────────┐
                                ├─▶ 021 Agents backend ────┼─▶ 022 Agent trực kênh (016, 015)
                                │                          │
W6                              └─▶ 023 Trợ lý AI ─▶ 024 Agents UI + Duyệt + Nhật ký
                 016,022 ─▶ 025 Inbox UI     015 ─▶ 026 Khách hàng UI     027 Catalog     019 ─▶ 028 Mẫu chứng từ
                                                   │
W7   027,028,015,016 ─▶ 029 Báo giá ─┬─▶ 030 Hợp đồng + ký điện tử
                                     └─▶ 031 Đơn + kho + khung đồng bộ sàn (012) ─▶ 032 Đề nghị thanh toán + thu tiền (010)
                                                              032 ─▶ 033 Lịch hẹn
                                                   │
W8   034 Ticket/SLA · 035 Tác vụ tự chủ · 023b Trợ lý phủ đủ action · 023c Generative UI · 032b Commerce vá luật · 030b Hợp đồng từ file · 015b Trí nhớ khách · 036 Loyalty · 037 Marketing · 038 Tổng quan + insights
     039 Gói & ví UI · 040 Quản trị nền tảng · 041 Lưu trữ workspace · 042 Vai trò tuỳ biến + nhóm · 043 AI học từ hội thoại
                                                   │
W9   045b Bảo mật & vận hành trong app · 044 AI eval gate · 045 Hạ tầng production · 046 Release hardening (phụ thuộc tất cả)
```

**Chuỗi cứng (đường găng):** `001 → 002 → 003 → 004 → 005 → 015 → 016 → 022 → 025` và `003 → 019 → 021 → 023 → 024`. Commerce: `027 → 029 → 031 → 032 → 033`.

---

## TIP SUMMARY TABLE

| TIP | Name | Depends On | Priority | Est. Hours | Wave | REQ | Standards chính |
|-----|------|-----------|----------|-----------|------|-----|-----------------|
| 001 | **Scaffold backend** trên monorepo đã có: `apps/{api,worker}`, `packages/{core,db,ai,channels,integrations}`, stub backend mọi domain (module, prisma, đăng ký `app.module.ts`, registry kênh / connector), logger pino + `traceId`, `Clock`, nối turbo / lint (size, boundaries, no-console) / CI hiện có. Không tạo lại `apps/web`, `packages/{actions,shared,ui}` | — | P0 | 10 | W1 | N01, N12 | code/file-size-module-layout, code/testing, ops/observability-security |
| 002 | DB nền tảng + tenant: 2 Prisma client, `TenantDbResolver`, template DB, provisioner, `tenant-migrate`, kernel.prisma, routing.prisma, test cô lập tenant | 001 | P0 | 14 | W1 | A03, N02 | database/tenant-db, database/indexing |
| 003 | Action kernel + API core: Nest bootstrap, envelope / `AppError`, `ActionExecutor` (registry, zod, policy, confirm token, idempotency, undo, action_log), outbox relay, BullMQ; `defineFlow` / `assertTransition`, `formatCode` + `sequence_counter`, `if_version`; **harness contract test FE ↔ BE** (mock transport vs HTTP); boot kiểm mọi action trong `packages/actions` có handler (chưa tới TIP → handler `NOT_IMPLEMENTED`, danh sách theo TIP) | 002 | P0 | 16 | W1 | E01, E03, E09, N03, N05, N13, A07 | actions/action-registry, api/response-envelope, events/outbox, domain/state-machine, domain/concurrency, domain/money-time-numbering |
| 004 | Identity & auth: OTP email (`MailProvider` Brevo + console dev), JWT / refresh, tạo workspace → `tenant.provision`, membership, invite, business profile + `TaxLookupProvider` VietQR | 003 | P0 | 14 | W2 | A01, A02, A04 | api/response-envelope, integrations/provider-ports |
| 005 | Authz engine: authz.prisma, `permissions.ts`, seed 5 vai trò, `AuthzContext` (cache), `scopeFilter`, kiểm quyền trong Executor, `GET /me/authz`, harness test role-isolation | 004 | P0 | 10 | W2 | A05 | authz/rbac-permissions |
| 006 | Realtime + thông báo: Socket.IO `/ws` + rooms, event → WS lọc quyền, `notification`, email thông báo theo locale | 003, 005 | P0 | 8 | W2 | N04, M02 | events/outbox, i18n/i18n |
| ~~007~~ | **Huỷ (D38)** — Web foundation: Next + antd theme token, AppShell / NavRail / MobileTabBar, `shared/*` (api client, `useAction`, `ConfirmActionHost`, `useCan`, UiCommandBus, PageStates), primitive `packages/ui`, next-intl vi + en | 003, 005 | P0 | 18 | W2 | N10, E06 | ui/frontend-structure, ui/prototype-parity, i18n/i18n |
| ~~008~~ | **Huỷ (D38)** — Parity tooling: `tools/parity`, `parity.manifest.ts`, baseline prototype, `fixtures/prototype-parity`, đồng hồ cố định; e2e mobile 390 harness | 007 | P0 | 8 | W2 | N14 | ui/prototype-parity, code/testing |
| 009 | Billing core: plan (seed), subscription, trial 15 ngày + 10.000 credit, credit wallet / ledger, `CreditMeter`, quota / `PLAN_LIMIT_REACHED` | 004 | P0 | 10 | W3 | A06, L01, L02, L03 | database/tenant-db |
| 010 | Billing payments: `billing_invoice`, sinh VietQR, webhook SePay nền tảng, `bank_transaction`, khớp mã, xác nhận tay (admin) | 009, 012 | P0 | 10 | W3 | L04 | integrations/provider-ports |
| 011 | Auth & onboarding — **nối API** cho màn đã có: đăng nhập / đăng ký / OTP / quên mật khẩu, popup khai báo DN, màn chào mừng, chờ khởi tạo workspace, đổi workspace | 004 | P0 | 12 | W3 | A01, A02, A04, A06 | ui/frontend-structure, ui/prototype-parity |
| 012 | Integrations framework + nối trang Nền tảng kết nối: `packages/integrations` registry, integrations.prisma, route, queue `integrations`, webhook router, manifest "Sắp có", đăng ký quan tâm | 003, 005 | P0 | 14 | W3 | M03 | integrations/provider-ports, ui/prototype-parity |
| 013 | Settings — nối API: Tổng quan workspace, giờ làm việc, Ngôn ngữ, Thành viên (mời, đổi vai trò), Vai trò & phân quyền (chỉ đọc), Thông báo | 005, 006 | P0 | 12 | W3 | M01, M02, A05 | ui/frontend-structure, authz/rbac-permissions |
| 014 | Channels core + Zalo cá nhân (**spike zca-js đầu TIP**): channels.prisma, adapter / manifest / registry, worker-channels lease, outbox gửi + rate limit; **một loại kênh nhiều tài khoản**, kết nối 3 bước + `channel.test`, drawer Quản lý kênh (kiểm tra / đồng bộ lại, hiệu suất 7 ngày, trả lời tự động); nối trang Kênh kết nối | 003, 006, 013 | P0 | 22 | W4 | B01, B02, B03, B04, B07, B09, B10, B11 | channels/omnichannel-adapter |
| 015 | CRM core: crm.prisma (contact, identity, collaborator, access request, timeline, note, tag, custom field, **`profile_layout` + `profile_layout_role`**), chống giành khách, chuyển phụ trách, gộp / import / export; action `profile_layout.*` + Cài đặt → Hồ sơ 360°; `contact.send_email` (`requiresConnector: 'email'`) | 005 | P0 | 18 | W4 | F01, F01b, F02, F03, F04, C06, F11, F12, M05 | authz/rbac-permissions, database/indexing |
| 016 | Inbox backend: inbox.prisma, inbound pipeline (dedupe, resolve contact), gửi qua outbox, action hội thoại, folders / counts, tự gán theo người phụ trách; **ver2.1:** `message_reaction`, trả lời trích tin / chuyển tiếp / ghim tin, ẩn hội thoại (`hidden_at`), tạm ẩn có `snoozed_until`, tìm trong hội thoại (`GET …/messages/search`, không dấu — expression index trên `message.body`) | 014, 015 | P0 | 18 | W4 | C01–C04, C06, C08, C09, C10, C12, C13 | channels/omnichannel-adapter, events/outbox |
| 017 | Web widget: channels-webchat.prisma, `apps/widget`, socket `/widget`, cài đặt widget | 014, 016 | P0 | 12 | W4 | B05 | channels/omnichannel-adapter |
| 018 | Kênh Email: IMAP (imapflow) + SMTP, gom thread | 014, 016 | P1 | 10 | W4 | B06 | channels/omnichannel-adapter |
| 019 | AI runtime: ai-runs.prisma, platform/ai-config.prisma (`llm_provider`, `model_route`, `model_price`), Agent Gateway + `AiSdkEngine`, router (provider gốc + OpenAI-compatible), lưu / chạy tiếp run, rào chắn, trừ credit; **spike K4 đầu TIP** | 003, 009 | P0 | 18 | W5 | D01, D02, L01 | ai/agent-gateway |
| 020 | Kho tri thức (RAG): ai-kb.prisma, queue `kb-ingest`, parse / cắt đoạn / embed, hybrid search + ngưỡng căn cứ, action `kb.*`, nối trang Dữ liệu RAG | 019 | P0 | 16 | W5 | D04 | ai/rag |
| 021 | Agents backend: ai-agents.prisma (agent + version, approval, governance), templates.prisma, action `agent.*` (tạo / xuất bản / quay lại / thử giả lập / tạo từ mô tả), `approval.*`; **quyền agent D51:** cờ `skill` / `requiresConnector`, `GET /agents/:id/tools` (nhóm theo module + Kỹ năng AI, badge Cần kết nối / Sắp có), `GET /conversations/:id/agent-tools` | 019, 005 | P0 | 16 | W5 | D03, D05, D07, D09, D09b, D15, D16, C11 | ai/agent-gateway, actions/action-registry |
| 022 | Agent trực kênh: queue `agent-reply`, lắp ngữ cảnh, output có cấu trúc, handoff, copilot, lọc PII, `transfer_to_agent` / `consult`; quyền hiệu lực = agent ∩ người ra lệnh, kiểm **mỗi lần gọi tool** (Blueprint §3.3b) | 016, 020, 021, 015 | P0 | 16 | W5 | D05, D06, D10, D11, D13, C02 | ai/agent-gateway, ai/rag |
| 023 | Trợ lý AI: ai-assistant.prisma, meta-tools (`find_actions`, `call_action`, `ui`, `plan`, `query_data`, `delegate`), stream SSE, nối AssistantPage + AssistantDock + ConfirmCard (FE đã có), Chat / Cowork, khung "Trợ lý AI đang điều phối" (`GET /v1/runs?root_run_id=&status=`) | 021, 019 | P0 | 20 | W6 | E02, E04, E05, E06, E07, E10, E11, E12, E14 | ai/agent-gateway, ui/frontend-structure |
| 023b | [Assistant vertical action coverage](tips/TIP-023b-assistant-coverage.md): exact578-path manifest; canonical confirm/edit, per-call authority, API/ROLE=ai parity, scoped reads, all-handler previews and per-action matrix, appointment.update, Zalo create-group capability, live runner | 013-035 implemented domain foundation; before023c/030b/032b/015b and all declared shared-file successors | P0 | XL/domain batches | W8 priority vertical flow | D03/D51, DC224-226/DC247; COVERAGE manifest | actions/authz/ai/channel/database/UI/testing |
| 023c | [GenUI + vertical assistant surfaces](tips/TIP-023c-generative-ui.md):272-path manifest,33 obligations; secure intent/QR/forms, durable stream/approval recovery,8 drawers+Inbox+Dock, connector probe and compose/rewrite | 023b,014,016,012; before030b/032b/015b and declared shared-file successors | P0 | XL/staged | W8 priority vertical flow | D55/DC227-228, coverage annex | ai/generative-ui, actions/authz, database, UI/testing |
| 032b | [Commerce vá luật](tips/TIP-032b-commerce-gaps.md): governance/conversion, QR/ảnh/webchat/public artifact, package snapshots/reminders, catalog archive/import;202 job foundation;141path | 027/029/030/031/032/021; sau023b/023c/030b, trước015b/036/045b;037 nhận bulk và038b nhận AI transfer sau | P0 | XL | W8 | F05c,F06-c/e/h,F08d,G07b/c,COM2–6;D05b matrix chưa khép bulk037 | domain/state-machine, documents/templates, actions/action-registry |
| 030b | [Contract files and appendix signing](tips/TIP-030b-contract-files.md):155-path exact manifest,20 owned obligations; Zalo attachment to immutable PDF/DOCX, type templates, AI draft suggestions, separate appendix evidence | 028/030/025 and023b/023c; before032b/015b/036 and declared shared-file successors; no045b reverse dependency | P0 | XL/3 stages | W8 vertical flow | F09/M01/M02,COM9/12,D30; coverage annex | documents/templates, actions/authz, AI/database/security/UI |
| 015b | [Trí nhớ khách +360 thật](tips/TIP-015b-contact-memory.md): contact.remember/memory_forget, scoped summary, KPI/debt/LTV/links, CRM AI endpoint và Giao AI;73path | 015/022/029–035; sau023b/023c/030b/032b do giao file, trước036/020b/043/045b; không chờ036/038/044 | P0 | XL | W8 | D10a/b,F01-c,F02b/c,F08g,DEF0152/3/4,DEF0221/0261,COM5-15/9-22 | ai/agent-gateway, authz/rbac-permissions, database/indexing |
| 022b | [Agent channel behavior](tips/TIP-022b-agent-channel-behavior.md):115 paths; structured schedules, keyword routing, intent/handoff summary, complaint ticket, template defaults and attachment honesty | after014b/045b/042c and earlier shared predecessors; before037/038/038b/039/040/041/044/046; runtime019b final integration later | P0 | XL | Vertical integration | 13 owned IDs in TIP header; M02a corrected to partial | AI/actions/authz/concurrency/events/UI/database |
| 022c | [Sales Agent stock/quote intent](tips/TIP-022c-sales-behavior.md):83 paths, pre-effect70% source-bound decisions, actual stock/alternatives and guarded customer response | 022b,023b,019b,045b,015c/e/f/g,032b/c,020c/d; ordered shared-file predecessors; before044 release | P0 | L | Vertical integration | COM-2-8,COM-3-11;10 AC | AI/actions/authz/Commerce/concurrency/privacy |
| 014b | [Zalo lifecycle/delivery](tips/TIP-014b-zalo-lifecycle.md):134-path manifest; provider operations/refs/receipts, session fencing, history/sync flags/address book | after023b/023c/030b/032b/015b/036/020b/043/045b; before042/042b/042c/037 and declared successors,025b consumes ports | P0 | XL | Vertical integration | Q014/DC083/DEF0012/0141/0161/B02d/B11e/BP11c/CH-PROVIDER-RECEIPTS | channels/actions/outbox/authz/database/security |
| 045b | [Vertical-flow hardening](tips/TIP-045b-app-hardening.md):349-path manifest/36 obligations; platform-first receipts, field authority/history, human send fence, files/network, metrics/audit, bulk/export | after023b/023c/030b/032b/015b/036/020b/043; before042/042b/042c/037/038/038b/039/040/041/044/045/046 | P0 | XL/domain batches | W8 foundation/W9 gate | N06/N07/N08/A05/F01/M01 and coverage annex | security/authz/consistency/concurrency/indexing/actions |
| 024 | Agents UI + hàng chờ duyệt + nhật ký hành động: AgentsPage, TemplateGallery, AgentBuilder, tạo bằng Trợ lý, lịch sử phiên bản, TestChat; assistant/approvals, assistant/actions | 021, 023 | P0 | 16 | W6 | D07, D08, D09, D09b, D15, E09 | ui/prototype-parity, ui/frontend-structure |
| 025b | [Inbox vertical integration](tips/TIP-025b-inbox-vertical.md):237 exact paths; group commands, paged search/context, bulk outcomes, CRM/commerce source linkage, actual timeline CSV, booking/translation/capture/approval UI | after041 and earlier shared predecessors including014b/022b/038b/045b; before019b final runtime integration/044/045/046 | P0 | XL/5 slices | Vertical integration | 27 owned IDs in header; DC250 closes Q019 design only | actions/authz/channels/database/AI/UI/exports |
| 019b | [AI runtime integrity](tips/TIP-019b-runtime-integrity.md): shared root admission, durable usage/price receipts, utility+RAG lineage, resume/stop states, scoped detail and committed WS | after025b and declared earlier shared predecessors; before044/045/046; earlier022b interface does not require runtime implementation first | P0 | XL/4 slices | Vertical integration | 14 IDs in header, DC251;4 overclaims downgraded | AI/actions/authz/database/outbox/billing/UI |
| 012b | [Bank connector runtime](tips/TIP-012b-bank-connectors.md): real tenant SePay/Casso, strict normalization, canonical durable ingress, reconnect identity, probe/sync/detail and payment→AI event receipts | after019b and declared earlier shared predecessors; before012c/026b/044/045/046 | P0 | XL/4 slices | Vertical integration |15 owned IDs plus023c probe owner clarified; DC252 | provider-ports/actions/authz/database/outbox/AI/UI |
| 026b | [CRM360 activities](tips/TIP-026b-crm-activities.md): notes/comments/manual tasks/opportunities, scoped AI/manual CSV/XLSX, paged Kanban and stage/layout CAS | after012b and declared earlier shared predecessors; before015c/015d/044/045/046 | P0 | XL/4 slices | Vertical CRM |11 owned IDs; DC253; lifecycle/privacy not claimed | actions/authz/database/AI/UI/custom-fields |
| 015d | [CRM ownership transfer](tips/TIP-015d-contact-transfer.md): source-mandatoryapproval, atomiccontact+relateddomainports, quoteassignedvsattribution, guardedundo/bulk/notice | after026b and declared earlier shared predecessors; before015c/015e/032c/044/045/046 | P0 | XL/4 slices | Vertical ownership |9 IDs inheader;DC254; fullorder/contractattribution stillunowned | actions/authz/database/outbox/AI/UI |
| 032c | [Commerce edit integrity](tips/TIP-032c-commerce-edit-integrity.md): immutable attribution/separate assigned, contract/order CAS and guarded field-specific undo | after015d and declared shared predecessors; before015c/015e/044/045/046 | P0 | XL/4 slices | Vertical commerce |6 owned IDs; DC255; other-domain CAS not claimed | actions/authz/database/concurrency/AI/UI |
| 015f | [CRM soft-delete/restore](tips/TIP-015f-contact-lifecycle.md): dependency barriers, retainedidentity,30dayrestore, AI fences andblocked externalorders | after032c and declared predecessors; before015e/015c/044/045/046 | P0 | XL/4 slices | Vertical lifecycle |7 owned IDs; DC256; merge/privacy separate | actions/authz/concurrency/ingress/AI/UI |
| 015c | [Quên khách / privacy](tips/TIP-015c-contact-privacy.md): irreversible family fences, approved private-content erasure, shared quarantine, retained issued evidence, one-way identity guard and journal-safe restore | after019c and all declared shared predecessors; before023d/023e/044/045/046 | P0 | XL/5 slices | Vertical privacy | 8 owned IDs; DC259/260/262/264/265/266;297 exact paths | privacy/actions/authz/concurrency/files/AI/restore/UI |
| 025 | Inbox — nối API + realtime cho màn đã có (3 cột, folders, chat, composer, chế độ AI, handoff banner, gợi ý copilot, panel 360°, "Chuyển thành", menu ⋯ tin nhắn / hội thoại ver2.1) | 016, 022 | P0 | 20 | W6 | C01–C05, C07, C08 | ui/prototype-parity, ui/frontend-structure |
| 026 | Khách hàng — nối API cho màn đã có (bảng có số trang D42 / kanban, Hồ sơ 360° theo `profile_layout`, 6 nút mở form tại chỗ D46, người phụ trách + đồng phụ trách, chuyển phụ trách, xin chia sẻ, trường dữ liệu, thẻ, import / export) | 015 | P0 | 16 | W6 | F01, F01b, F02, F03, F04 | ui/prototype-parity, authz/rbac-permissions |
| 027 | Catalog: catalog.prisma (6 loại, biến thể P1, combo, `stock_movement`), action `product.*`, nối trang Sản phẩm, đồng bộ mô tả sang RAG | 005 | P0 | 14 | W6 | F05 | database/indexing, ui/prototype-parity |
| 028 | Mẫu chứng từ: documents.prisma (`doc_template`), registry biến, render react-pdf, **spike K8 LibreOffice đầu TIP**, render DOCX, wizard DOCX + AI nhận diện biến, bảng kiểm, queue `doc-render`, nối trang Mẫu chứng từ | 003, 019 | P0 | 18 | W6 | F06b | documents/templates |
| 029 | Báo giá: sales-quotes.prisma, version n+1 (`quote.request_revision` — D46), ngưỡng duyệt, gửi qua hội thoại, link xem, hết hạn 15 ngày, AI soạn từ nội dung, nối QuoteEditor + trang Báo giá | 027, 028, 015, 016 | P0 | 18 | W7 | F06, F06b, F10 | documents/templates, actions/action-registry |
| 030 | Hợp đồng + ký điện tử: contracts.prisma, duyệt + ký (OTP + chữ ký), trang ký công khai, trang chứng nhận + SHA-256, phụ lục, gia hạn T-30, AI soạn nháp, trang Hợp đồng | 028, 029, 006 | P0 | 20 | W7 | F09, F10 | documents/templates, authz/rbac-permissions |
| 031 | Đơn hàng + kho + khung đồng bộ sàn: sales-orders.prisma, 2 trục trạng thái, tạo từ báo giá / hợp đồng, xác nhận → trừ kho, huỷ, `OrderSyncProvider` + `mock` + queue `order-sync`, nối trang Đơn hàng; mã đơn `DH-` (D52 — đổi fixture + mock FE từ `SP290411`, mask cột mã khi đo parity) | 027, 029, 012 | P0 | 18 | W7 | F07, F07b, F10 | integrations/provider-ports |
| 032 | Đề nghị thanh toán + thu tiền: sales-payments.prisma, cọc / đợt / toàn bộ, VietQR của DN, bank feed SePay của DN, xác nhận tay, hoàn tiền có duyệt, phiếu thu, nhắc công nợ, liệu trình, trang Đề nghị thanh toán | 031, 028, 010, 012 | P0 | 16 | W7 | F08, G07 | documents/templates, integrations/provider-ports |
| 033 | Lịch hẹn: booking.prisma, nhân sự, giờ mở cửa, tìm slot + chống trùng (btree_gist), trạng thái, giữ chỗ, nhắc hẹn, trừ buổi liệu trình, gợi ý tạo đơn, trang Lịch | 015, 027, 032 | P0 | 18 | W7 | G01–G05 | database/indexing, ui/prototype-parity |
| 034 | Ticket & SLA: support.prisma, SLA mặc định, đồng hồ SLA, leo thang, agent tạo ticket, trang Ticket | 015, 016 | P1 | 14 | W8 | H01–H04 | ui/prototype-parity |
| 035 | Tác vụ tự chủ & chủ động: ai-tasks.prisma, Coworks (ngay / lịch / sự kiện), mẫu follow-up / báo giá treo / nhắc hẹn / sau mua / briefing sáng | 022, 023 | P1 | 12 | W8 | D12, E08, E13 | ai/agent-gateway |
| 036 | [Loyalty — TIP có file](tips/TIP-036-loyalty.md): sổ/FIFO/hạng, redeem ≤50%, undo/refund/idempotency, API thật và AI/tệp thành viên, CRM ×100; gate tiền Q-027 | 031, 032, 023b, 023c, 015b, 032b; tích hợp sau 030b | P1 | XL (4 bước) | W8 | J01–J04, F02d | actions/action-registry, database/indexing, domain/concurrency, domain/money-time-numbering |
| 037 | [Marketing broadcast](tips/TIP-037-marketing.md): segments/AI, snapshot duyệt, dispatch/cap/cooldown/unsubscribe, import/export/resend/reporting; Q030 đóng theoDC246, chỉ AI Credit | 014–022,026,023b/023c; tích hợp sau036/042c/043/045b và các TIP chungfile, trước038/044/046 | P1 | XL | W8 | I01–I05, B04c, D35c, DC246 | channels/omnichannel-adapter, actions/action-registry, ai/agent-gateway |
| 038 | [Tổng quan + insights](tips/TIP-038-insights-dashboard.md): metric/query_data, scoped Dashboard/follow-up/T-30, agent stats,4 list Excel exports, daily/weekly digest (DC030/DEF0061) | 006/009/011/021–024/029–035; tích hợp sau037/042c/043/045b và TIP chungfile, trước044/046 | P0/P1 | XL | W8 | K01, E07, D14, COM9-19, DC030 | actions/action-registry, authz/rbac-permissions, database/indexing, ui/prototype-parity |
| 038b | [Nhập/xuất AI-first CRM+commerce](tips/TIP-038b-ai-first-data-transfer.md):6domain, AI/manual, mapping/preview/retry, XLSX/CSV/PDF/DOCX theo capability, file thật | 023b/023c/030b/032b/038/042c/045b; tích hợp sau040 vìsharedfiles, trước044/046 | P0 | XL | W8 | IO-CRM/CATALOG/QUOTE/ORDER/CONTRACT/INVOICE, IO-AI-FIRST/MANUAL/FILES/SAFETY/RETRY; DC244 | ai/agent-gateway, actions/action-registry, database/indexing |
| 039 | [Billing lifecycle](tips/TIP-039-billing-lifecycle.md): ví/alerts, kỳCredit, upgrade/downgrade/addons, expiry, PDFinvoice, Liên hệ thật, ledgerfilter; DC242/DC243 đã duyệt (Q031/Q032 đóng) | 009/010/011/013/014/021; tích hợp sau038/042c/043/045b và sharedTIP, trước040/041/044/046 | P0 | XL | W8 | L03/L05/L06/L07, COM10-3, DEF0091/0094/0102 | actions/action-registry, database/indexing, ui/prototype-parity |
| 040 | [Quản trị nền tảng](tips/TIP-040-platform-admin.md): platform-only Executorcontext, workspaces/suspend, plans/provider/probe/modelconfig/templates, đốisoát vàadminUI | 009/010/019/021; tíchhợp sau039/045b/042c/043 vàsharedTIP, trước041/044/046 | P1 | XL | W8 | L08, DEF0103/0192/0212 | authz/rbac-permissions, actions/action-registry, ops/observability-security |
| 041 | [Lifecycle workspace](tips/TIP-041-workspace-lifecycle.md): activity/90 ngày/14 ngày cảnh báo, encrypted dump trước DROP, restore, Owner danger zone, deletion backup 30 ngày; DC245 | 002/004/006/009/011/014; sau045b/039/040/038b và các TIP chung file, trước045/046 | P1 | XL | W8 | A09a/A09b, D23, admin.workspace.archive/restore, DEF0031, PRO-settings-dangerzone | database/tenant-db, actions/action-registry, ops/observability-security |
| 042 | [Vai trò tuỳ biến + Nhóm + lifecycle quyền](tips/TIP-042-custom-roles-teams.md); gate Q-028, chưa ready-to-build | 005, 006, 013, 015; tích hợp sau 043/045b và các TIP chung registry | P1 | XL | W8 | A05b (roles/teams), D27, D35 | authz/rbac-permissions, database/tenant-db |
| 042b | [Chia lead mới + routing UI](tips/TIP-042b-lead-routing.md): opt-in, round-robin/tải/kênh/manual, no-steal, durable event → Executor, concurrency | 014–018, 042, 045b; sau các TIP chung file, trước044/046 | P1 | L | W8 | F01c, B11d (assignment), COM-8b-7 | authz/rbac-permissions, channels/omnichannel-adapter |
| 042c | [Scope bản ghi + watcher chỉ đọc](tips/TIP-042c-record-scope.md): team_id8 bảng, SQL/detail/write/realtime nhất quán; gateQ-029. Field serializer ở045b, không coi042c khép field-level | 042, 042b, 045b và domain dependencies; trước044/046 | P0/P1 | XL | W8 | D32, STD-authz-rbac-5a/5b, STD-database-tenantdb-9 | authz/rbac-permissions, database/indexing |
| 043 | [Học từ hội thoại có người duyệt](tips/TIP-043-kb-conversation-learning.md): pending không vào RAG, PII, CAS/retry/credit, API + review UI | 020, 020b, 016, 022, 023b; tích hợp sau 036 | P1 | L | W8 | D04b | ai/rag, ai/agent-gateway, events/outbox |
| 020b | [Quản lý nguồn RAG](tips/TIP-020b-kb-source-management.md): folder update/delete, kế thừa visibility phía server, catalog guard, tải nguồn thật | 020, 027, 023b; tích hợp sau 036, trước 043 | P0 | M | W8 | D04a, D04d | ai/rag, database/indexing, actions/action-registry |
| 001b | [Web: gỡ vòng phụ thuộc, error boundary, lazy drawer, breakpoint, fmt](tips/TIP-001b-web-architecture.md): bổ sung TIP-001 | Mọi TIP FE chung file đã tích hợp; trước 001c/044/045/046. | P0 | L | W8 bổ sung | DEF-001-1, DV-001, BP-9-f, STD-ui-fe-11, STD-ui-fe-13b, STD-i18n-4 | ui/frontend-structure.md §4–§13 |
| 001c | [Web: đủ 5 trạng thái, vùng chạm ≥ 44, ma trận mobile 390 và sửa lỗi WCAG AA](tips/TIP-001c-ui-states-mobile.md): bổ sung TIP-001 | 001b; mọi TIP FE chung file; trước 044/045/046 (046 đo, 001c sửa). | P0 | L | W8 bổ sung | STD-ui-fe-9, STD-ui-ip-5, STD-ui-ip-7.4, STD-ui-parity-9, REQ-N10d | ui/interaction-patterns.md §5, §7.4 |
| 003d | [OpenAPI tự sinh tại /v1/docs](tips/TIP-003d-openapi.md): bổ sung TIP-003 | 003 kernel; 045b actions controller; trước 044/045/046. | P0 | M | W8 bổ sung | REQ-N03b, STD-api-envelope-10b | api/response-envelope.md §10 |
| 003e | [if_version cho mọi entity còn thiếu, bảng chỉ thêm, đính chính hành động đã gửi](tips/TIP-003e-action-integrity.md): bổ sung TIP-003 | 032c (quote/contract/order CAS), 015d/015f/025b/026b (contact), 027b (product), 034c (ticket bulk) đã tích hợp; trước 044/045/046. | P0 | L | W8 bổ sung | STD-domain-concurrency-1a, STD-domain-concurrency-1b, STD-domain-concurrency-T, DEF-030-3, REQ-E09c | domain/concurrency.md §1, §7, test |
| 003f | [Chuẩn hoá validate dùng chung, zodRule, MoneyInput/PhoneInput, hỏi khi bỏ form đang sửa](tips/TIP-003f-validation-forms.md): bổ sung TIP-003 | 003e (useAction); TIP FE chung form modal; trước 044/045/046. | P0 | L | W8 bổ sung | STD-domain-validate-1, STD-ui-fe-6, STD-ui-ip-3.2, STD-ui-ip-3.4, STD-domain-money-1.7 | domain/validation-defaults.md |
| 003g | [Đồng hồ qua Clock, nhắc trong giờ làm việc, ngày hôm nay ở FE, không SELECT *, test đếm query](tips/TIP-003g-time-query-hygiene.md): bổ sung TIP-003 | 019b, 012c, 014b (channels jobs chung file) đã tích hợp; trước 044/045/046. | P0 | M | W8 bổ sung | STD-code-testing-4b, STD-domain-money-2.2, STD-domain-money-2.5, DEF-032-3, STD-database-indexing-8, STD-database-indexing-9 | code/testing.md §4b |
| 003h | [Bảng defineFlow cho mọi entity có trạng thái còn thiếu](tips/TIP-003h-state-flows.md): bổ sung TIP-003 | 012b, 014b, 020b, 021b, 032b, 045b (chung handler) đã tích hợp; trước 044/045/046. | P1 | M | W8 bổ sung | STD-domain-state-1 | domain/state-machine.md §1–4. |
| 004b | [Bảo mật tài khoản: 2FA TOTP, chính sách mật khẩu, khoá sau N lần sai, làm mới phiên nhiều tab](tips/TIP-004b-auth-security.md): bổ sung TIP-004 | 045b (platform audit), 041/042 chung identity; trước 044/045/046. | P0 | L | W8 bổ sung | PRO-settings-security, Q-018 | ops/observability-security.md (audit đăng nhập/đổi mật khẩu, không log secret) |
| 006c | [Sự kiện realtime còn thiếu (credits.changed, ui.command) và vô hiệu cache registry nhiều tiến trình](tips/TIP-006c-realtime-events.md): bổ sung TIP-006 | 019b (run.step/run.done), 025b (conversation.counts), 023c (ui), 039 (wallet) đã tích hợp; trước 044/045/046. | P1 | M | W8 bổ sung | BP-4.6-b, DEF-002-2 | events/outbox.md |
| 011b | [Chọn lĩnh vực theo taxonomy ngành 2 cấp (10 nhóm) khi khai báo doanh nghiệp](tips/TIP-011b-industry-taxonomy.md): bổ sung TIP-011 | 041 (workspace settings) đã tích hợp; trước 044/045/046. | P1 | S | W8 bổ sung | REQ-A02d | i18n/i18n.md |
| 012d | [Connector storage phát hành (S3-compatible) cho tệp workspace](tips/TIP-012d-storage-connector.md): bổ sung TIP-012 | 045 (backup tệp), 045b (file security) đã tích hợp; trước 044/045/046. | P1 | M | W8 bổ sung | D28c, REQ-M03b | integrations/provider-ports.md |
| 013b | [Cài đặt thật: chuyển / mua workspace, logo, lọc + xuất thành viên, mời bằng SĐT, số đếm nav, tài khoản nhận tiền, liên kết hướng dẫn](tips/TIP-013b-settings-workspace.md): bổ sung TIP-013 | 039 (addon/workspace mua thêm), 041 (workspace lifecycle), 042 (roles), 038b (xuất file), 045b (file security) đã tích hợp; trước 044/045/046. | P0 | L | W8 bổ sung | PRO-settings-wsswitch, PRO-settings-wsbuy, PRO-settings-logo, PRO-settings-membersfilter, PRO-settings-membersexport, PRO-settings-navcounts, PRO-settings-paymentaccount, PRO-settings-docs, PRO-settings-tagslearn, REQ-A05f | ui/prototype-parity.md |
| 013c | [Người phụ trách vắng / ngoài ca → hàng chung hoặc agent](tips/TIP-013c-owner-availability.md): bổ sung TIP-013 | 042b (chia lead mới), 022b (agent theo kênh), 045b (send fence), 025b (inbox) đã tích hợp; trước 044/045/046. | P0 | L | W8 bổ sung | REQ-F01b-6, COM-8b-5, DC-081, DEF-013-1 | COMMERCE §8b L180 |
| 014c | [Kênh: cảnh báo rủi ro Zalo, SLA theo tài khoản, UI chỉ đọc manifest, tạm ẩn hội thoại đúng mốc](tips/TIP-014c-channel-consistency.md): bổ sung TIP-014 | 014b, 022b, 025b, 034b, 042b đã tích hợp; trước 044/045/046. | P0 | M | W8 bổ sung | REQ-B04a, REQ-B11d, STD-channels-adapter-2, REQ-C10a, D48 | channels/omnichannel-adapter.md §2 |
| 017b | [Widget web: logo, nút hành động, nhiều widget, agent.status/typing, đủ danh sách agent](tips/TIP-017b-web-widget.md): bổ sung TIP-017 | 022b, 045b (file security), 014b đã tích hợp; trước 044/045/046. | P1 | L | W8 bổ sung | REQ-B05c, PRO-settings-widgetacts, DC-086, DEF-017-2, DEF-017-3 | channels/omnichannel-adapter.md |
| 018b | [Email: kết nối Gmail / Outlook bằng OAuth (XOAUTH2)](tips/TIP-018b-email-oauth.md): bổ sung TIP-018 | 012c (tenant mail), 014b đã tích hợp; trước 044/045/046. | P1 | M | W8 bổ sung | REQ-B06b | channels/omnichannel-adapter.md |
| 028b | [Chứng từ: queue doc-render, template_version ở đề nghị thanh toán/phiếu thu, bảng kiểm trong preview gửi/duyệt, undo tạo mẫu](tips/TIP-028b-document-integrity.md): bổ sung TIP-028 | 030b, 032b, 032d, 015c (doc lineage) đã tích hợp; trước 044/045/046. | P0 | M | W8 bổ sung | DEF-028-1, STD-documents-templates-2b, STD-documents-templates-6b, ACT-doc_template.create | documents/templates.md §2, §6 |
| 031b | [Thanh chọn nhiều Báo giá / Hợp đồng / Đơn: Gán phụ trách hàng loạt (Chuyển tiếp chờ Q-021)](tips/TIP-031b-commerce-bulk.md): bổ sung TIP-031 | 032c (assigned_user_id CAS), 015d, 045b (per-item receipts), 006b đã tích hợp; trước 044/045/046. | P1 | M | W8 bổ sung | PRO-quotes-bulkfwd, PRO-contracts-bulkfwd, PRO-orders-bulkfwd, Q-021 | actions/action-registry.md (bulk ≤ 50, per-item outcome) |
| 031c | [Bên giữ tồn chuẩn theo kết nối bán hàng (stock_master appchat / external)](tips/TIP-031c-stock-master.md): bổ sung TIP-031 | 027b, 012 order-sync port đã tích hợp; trước 044/045/046. | P1 | M | W8 bổ sung | COM-4b-5, REQ-F07b-3 | COMMERCE §4b L109 |
| 033d | [Cọc đơn theo % và gợi ý bật cọc](tips/TIP-033d-order-deposit.md): bổ sung TIP-033 | 032c, 027b, 033b đã tích hợp; Q-038/Q-039 (chưa duyệt); trước 044/045/046. | P0 | M | W8 bổ sung | COM-4-7, COM-4-8, STD-domain-money-1.4 | COMMERCE §4 L90 |
| 035b | [Thẻ tác vụ Cowork: sparkline hiệu suất từ số liệu thật](tips/TIP-035b-task-sparkline.md): bổ sung TIP-035 | 038 (agent statistics), 019b đã tích hợp; trước 044/045/046. | P2 | S | W8 bổ sung | PRO-assistant-taskspark | ui/prototype-parity.md |
| 016b | [Badge đếm trên rail đọc GET /nav/badges thật](tips/TIP-016b-nav-badges.md): bổ sung TIP-016 | 025b (conversation.counts), 034b, 033b đã tích hợp; trước 044/045/046. | P0 | S | W8 bổ sung | BP-4.4-fe-nav, PRO-shell-navbadges | database/indexing.md |
| 020f | [Kho tri thức: đọc pptx và ảnh (OCR qua model vision) để AI học](tips/TIP-020f-kb-parsers.md): bổ sung TIP-020 | 020b, 020c, 019b (metering), 023f (input ảnh) đã tích hợp; trước 044/045/046. | P1 | M | W8 bổ sung | DC-110 | ai/rag.md §5 (parse/chunk), §10 |
| 035c | [Vệ sinh kiểm thử & job quét: generator fixture, db:cleanup-test, E2E chập chờn, tập workspace "armed"](tips/TIP-035c-test-ops-hygiene.md): bổ sung TIP-035 | 003c, 006b, 041 (lifecycle), 045b đã tích hợp; trước 044/045/046. | P1 | M | W8 bổ sung | DEF-031-4, DEF-031-5, DEF-035-1, DEF-035-2, Q-010 | code/testing.md |
| 020e | [RAG rerank + tái tạo chỉ mục](tips/TIP-020e-rag-model-lifecycle.md): space embedding ghim, hai khe vector, kb.reindex có preview/xác nhận, cursor/lease/catch-up/publish CAS, chunk id giữ; rerank chỉ khi có reranking model + giá duyệt (Q-041) | 019b, 020b/c/d, 023e, 040, 015c, 045b và predecessor chung file; trước 044/045/046 | P1 | L | W8 | STD-ai-rag-6b/10b, Q-002 (cơ chế) | ai/rag, ai/agent-gateway |
| 003i | [Khớp API với Blueprint §4: cursor chuẩn, /action-logs đủ lọc, /kb/*, /runs/:id/cancel, /profile-layouts?as_role](tips/TIP-003i-api-contract-gaps.md): bổ sung TIP-003 | 003d (OpenAPI), 019b (runs), 020b (kb), 023b, 045b (audit projection) đã tích hợp; trước 044/045/046. | P1 | M | W8 bổ sung | BP-4.1-c, BP-4.3-c, BP-4.4-ai-d, BP-4.5-c, BP-4.4-crm-b, BP-3.3-b | api/response-envelope.md |
| 004c | [Brevo: webhook bounce / complaint cho email nền tảng](tips/TIP-004c-mail-provider-webhooks.md): bổ sung TIP-004 | 012c (sự kiện delivery tenant mail), 045b (webhook verify) đã tích hợp; trước 044/045/046. | P1 | S | W8 bổ sung | BP-8-b | integrations/provider-ports.md |
| 019d | [Quyền agent: write theo ngưỡng confidence, delegate lồng = giao quyền agent cha, kb_scope khi kb.search qua tool](tips/TIP-019d-agent-authority.md): bổ sung TIP-019 | 023b (current-authority resolver), 020c (effective KB scope), 019b, 022b đã tích hợp; trước 044/045/046. | P0 | M | W8 bổ sung | BP-3.3-c, BP-3.3b-e, BP-3.3b-f | Blueprint §3.3, §3.3b |
| 022d | [Zalo cá nhân: cap 200 tin chủ động / ngày cấu hình được](tips/TIP-022d-zalo-proactive-cap.md): bổ sung TIP-022 | 014b, 037 (dùng cap cho chiến dịch) đã tích hợp; trước 044/045/046. | P0 | S | W8 bổ sung | BP-5.4-b | channels/omnichannel-adapter.md |
| 006d | [Thông báo đẩy web (Web Push + PWA) cho kênh `mobile`](tips/TIP-006d-web-push.md): bổ sung TIP-006 | 006b (event delivery), 006c (realtime events) đã tích hợp; trước 044/045/046. | P1 | M | W8 bổ sung | DEF-006-2, DC-029 | events/outbox.md |
| 026c | [Cơ hội / Sales Pipeline](tips/TIP-026c-sales-pipeline.md): thay `contact_opportunity` 026b bằng 7 giai đoạn xác suất cố định, chuỗi chứng từ thật, chuyển tự động theo báo giá / hợp đồng / đơn, giai đoạn khách suy từ cơ hội, thẻ 360° / drawer / chip / cột / "Thuộc cơ hội" | 026b, 015e/f/g, 032c và predecessor chung file; trước 032e/044/045/046 | P0 | XL/4 pha | W8 | REQ-F10, REQ-F13, D60, COM-8, DC-901 | COMMERCE §8, actions, authz, database, concurrency, ui |
| 032e | [Tài chính](tips/TIP-032e-finance.md): dòng = đơn + đề nghị lẻ, Đã thu đủ / Quá hạn / Đã cọc / Còn nợ, Bán mới / Gia hạn / Marketing, lọc Nhóm + kỳ, 4 KPI, badge rail, drawer 360° · Tài chính, nhắc thanh toán hàng loạt (`invoice.bulk_remind`), thẻ / chip công nợ | 026c, 015b, 016b, 032b/c, 037, 045b và predecessor chung file; trước 044/045/046 | P0 | L/3 pha | W8 | REQ-F14, D60, COM-5, DC-902 | COMMERCE §5, actions, authz, database, ui |
| 047 | [Hạ tầng thoại + packages/voice](tips/TIP-047-voice-infra.md): `packages/voice` (LiveKit phòng / SIP / webhook, ZCC client, ghi track, `VoiceAiEnginePort` realtime | pipeline, mock), `infra/livekit` (systemd livekit-server / livekit-sip / Kamailio / rtpengine, plan / apply), depcheck — không đụng DB / action / UI | 032e và predecessor chung file; trước 047b/047c/047d/044/045/046 | P0 | L/2 pha | W8 | REQ-O01, REQ-O08 (port), D61 #1/#12, DC-906, DV-901 | infra, depcheck, integrations/provider-ports, ai/agent-gateway |
| 047b | [Dữ liệu tổng đài](tips/TIP-047b-callcenter-schema.md): `tenant/callcenter.prisma` (số / trunk, máy nhánh, nhóm, IVR, cuộc gọi, chuyển máy, ghi âm, transcript, tóm tắt, ZCC consent, biên nhận webhook) + `contact_task` callback + `model_price` voice + hạn mức máy theo gói / addon, OWNERS prisma-stubs, permission + role seed | 047, 026c và predecessor chung file; trước 047c/047d/044/045/046 | P0 | M | W8 | REQ-O02, REQ-O07, REQ-O11, REQ-O12 (gói), D61 #3/#5, DC-903 | database, authz, money-time-numbering |
| 047c | [Backend Gọi điện](tips/TIP-047c-callcenter-backend.md): action `call.*` / cấu hình, webhook LiveKit / ZCC → biên nhận → system adapter, vòng đời CAS, outbox v2 chỉ id, realtime, định tuyến IVR / nhóm / ngoài giờ, gọi nhỡ → việc gọi lại, Hẹn gọi lại, ghi âm FilesService, transcript / tóm tắt, Voice AI + credit `voice_turn`, ZCC consent, privacy 015c, gắn cơ hội 026c, assistant-coverage | 047b, 026c, 015c, 019b, 023b và predecessor chung file; trước 047d/044/045/046 | P0 | XL/4 pha | W8 | REQ-O03…O09, O11, D61, DC-904 | actions, events/outbox, concurrency, state-machine, authz, ai, ops |
| 047d | [Giao diện Gọi điện + WebPhone](tips/TIP-047d-callcenter-ui.md): màn Gọi điện (6 KPI, biểu đồ, bảng máy nhánh, nhật ký 6 tab, chi tiết, Trợ lý AI), WebPhone toàn cục (dialer / cuộc gọi đến / đang gọi / chuyển máy / thu nhỏ / giám sát), CallbackModal dùng chung, Cài đặt → Tổng đài 4 tab, nút gọi 360° / Khách hàng / Tài chính, widget nút gọi, rail + gỡ `OUT_LABELS`, parity --done | 047c, 032e, 026c và predecessor chung file; trước 044/045/046 | P0 | XL/4 pha | W8 | REQ-O04…O07, O09, O10, O12, D61, DC-905, PD-902 | ui, i18n, parity, interaction-patterns |
| 035d | [Cô lập worktree](tips/TIP-035d-worktree-isolation.md): env sinh theo bảng k = 1..3 (DB nền tảng / template / test / base riêng, cổng web / API / E2E / AI live, thư mục `.data`), Memurai riêng mỗi worktree, khoá slot Postgres `pg-slot`, `PLATFORM_POOL_MAX`, `TENANT_BASE_DB`, web theo `WEB_PORT`, health `instance` | TIP chờ cuối đang có PR (034d — #224 lúc viết); trước mọi TIP chờ chung file | P1 | M | W8 | D62 #7, DC-908, Q-913 | testing, workflow |
| 048 | [OAuth + kho token dùng chung](tips/TIP-048-oauth-token-vault.md): `oauth_grant` + `TokenVault` (làm mới có khoá — refresh Zalo / Shopee dùng một lần), state ký + pending, callback `/hooks/oauth/:provider/callback`, `oauth.*`, `useOAuthConnect`; một App Zalo cho kênh OA + ZCC | 047b, 015c; trước 047c / 047d / 048b → 048h / 049 | P0 | M | W8 | D62 #2, DC-909 | actions, database, ops security |
| 048b | [Nền kênh webhook](tips/TIP-048b-channel-webhooks.md): `/hooks/channels/:type` mức App, `tenant_channel_webhook_route`, `channel_webhook_event`, `channel.oauth_select`, cửa sổ gửi theo manifest + `last_inbound_at`, danh sách kênh cứng → registry | 048, 014b, 022c, 022d, 003g, 026c | P0 | XL/2 pha | W8 | REQ-B12, REQ-B16, DC-910 | channels, events, database |
| 048c | [Giao diện kết nối kênh](tips/TIP-048c-channel-connect-ui.md): modal theo `connect_kind`, OAuth 3 bước + chọn tài khoản, Sắp có theo registry, khối Đồng bộ theo năng lực, hạn uỷ quyền, một nguồn danh sách kênh | 048b, 014c, 042b | P0 | L | W8 | REQ-B15, REQ-B17, PD-903, PD-906, DC-911 | ui, i18n |
| 048d | [Zalo OA](tips/TIP-048d-zalo-oa.md): adapter webhook + OpenAPI tin tư vấn ≤ 7 ngày, `X-ZEvent-Signature`, limiter App / OA, upload, `user_submit_info` | 048b, 048c | P0 | L | W8 | REQ-B08, DC-912, Q-909 | channels |
| 048e | [Facebook Page / Messenger + Instagram](tips/TIP-048e-meta-messaging.md): Graph + Login for Business, webhook `X-Hub-Signature-256`, 24 giờ + HUMAN_AGENT người gửi, echo, data deletion | 048b, 048c, 048d | P0 | XL/2 pha | W8 | REQ-B08, DC-913, Q-908 | channels, privacy |
| 048f | [Bình luận bài đăng](tips/TIP-048f-social-comments.md): hội thoại `comment`, `social_post`, trả lời công khai / nhắn riêng / ẩn / xoá / thích, agent trả lời như nhân viên, tab Bình luận | 048b, 048c, 048e | P0 | XL/3 pha | W8 | REQ-B13, PD-904, DC-914, DC-921 | channels, actions, ui |
| 048g | [Livestream FB / IG](tips/TIP-048g-livestream.md): `live_session` + cờ ý mua / SĐT, SSE + poll đối soát, người / agent tạo khách / đơn | 048f | P1 | L | W8 | REQ-B14, PD-905, DC-915, DC-921 | channels, ui |
| 048h | [TikTok Business Messaging](tips/TIP-048h-tiktok-messaging.md): 48 giờ / 10 + 3 tin, `TikTok-Signature`, bình luận video organic, comment-to-message | 048b, 048c, 048f | P1 | L | W8 | REQ-B08, DC-916, Q-910 | channels |
| 049 | [Nền đồng bộ sàn](tips/TIP-049-marketplace-foundation.md): OAuth connector + chọn shop, nhiều shop / sàn, `tenant_shop_route`, `/hooks/marketplace/:connector`, pull theo cursor qua hàng đợi, ProviderHttp POST, sửa 5 lỗi đồng bộ (vận đơn rỗng, khách / đơn trùng khi nối lại, ánh xạ SKU, tồn biến thể, một kết nối / connector) | 048, 048h, 031c, 027b, 032b, 032c | P0 | XL/2 pha | W8 | REQ-F07c, DC-917, Q-916 | integrations, database, concurrency |
| 049b | [Shopee](tips/TIP-049b-shopee.md): ký HMAC, token 4 giờ / refresh dùng một lần, đơn + vận đơn + sản phẩm, push body rỗng | 049 | P0 | L | W8 | REQ-F07c, DC-918, Q-914 | integrations |
| 049c | [TikTok Shop](tips/TIP-049c-tiktok-shop.md): ký + `shop_cipher`, token 7 ngày, đơn + package + sản phẩm, webhook deauth | 049, 049b | P0 | L | W8 | REQ-F07c, DC-919, Q-915 | integrations |
| 049d | [Giao diện sàn](tips/TIP-049d-marketplace-ui.md): thẻ sàn + chọn shop, Ghép SKU, đơn sàn (badge / mã ngoài / trạng thái / vận đơn chỉ đọc), Kênh bán theo ánh xạ | 049, 049b, 049c, 048c | P0 | L | W8 | REQ-F07c, PD-907, PD-908, DC-920 | ui, i18n |
| 050 | [Rà quyền agent](tips/TIP-050-agent-grantable-review.md): agent là nhân viên — bật `agentGrantable` cho 64 action nghiệp vụ một bản ghi, giữ 87 có lý do, test khoá luật | 049d | P1 | M | W8 | DC-923, Q-919 | actions |
| 051 | [Phòng ban + Sơ đồ tổ chức](tips/TIP-051-org-units.md): cây đơn vị (chi nhánh · phòng ban · nhóm) trên bảng `team`, AI agent là thành viên (`team_agent`), scope `dept`, `org_unit.*`, màn Sơ đồ tổ chức + Phòng ban theo prototype | 050 | P0 | L | W8 | D64, DC-924, PD-909 | authz, settings |
| 051b | [Kênh theo phòng ban + vai trò mẫu](tips/TIP-051b-unit-channels-roles.md): `settings.unit_id` tài khoản kênh, hội thoại / khách mới mang đơn vị, chia lead trong phòng, agent vào phòng, vai trò mẫu Nhân sự / Marketing / Vận hành / Chỉ xem | 051 | P0 | M | W8 | D64, DC-925 | channels, crm, settings |
| 051c | [Loại liên hệ](tips/TIP-051c-contact-relation.md): Khách hàng / Ứng viên / Đối tác / Nhà cung cấp; phễu, giai đoạn, chia lead, insight, segment, chứng từ chỉ cho Khách hàng; cột + lọc "Loại" | 051b, 026c, 032e | P0 | M | W8 | D64, DC-926, PD-910 | crm, sales, insights |
| 051d | [AI agent là thành viên](tips/TIP-051d-agent-members.md): dòng AI Agent ở Cài đặt › Thành viên (tính vào số thành viên, ghế người dùng / AI Agent tách như gói), ô Phòng ban ở form thành viên (`member.set_units`, lời mời kèm đơn vị), bản ghi agent tạo mang phòng ban của agent, lọc Phòng ban thật ở Lịch hẹn | 051, 051c | P0 | M | W8 | DC-927, PD-911 | settings, authz, booking |
| 044 | [AI release eval gate](tips/TIP-044-ai-eval-gate.md): ten fixed suites, actual native/UI replay+live, protected file/receipt evidence, human review and CI | 023b,019b/c,020b/c/d,021b,022b/c,023c/d/e/f/g,015c/e/f/g,025b,030b/c,032b/c/d,033b/c,036–043,045b; exact manifest predecessors | P0 | XL | W9 | N11 + named eval obligations | ai/eval; native isolation |
| 045 | [Native infrastructure](tips/TIP-045-native-infrastructure.md):186 paths; SHA deployment/readiness/drain, native monitoring, consistent offsite checkpoint and privacy-safe restore | 002,003b/c,006b,014b,019b,015c,040,041,044,045b and exact shared-file predecessors; before046 | P0 | XL | W9 | N01/N02/N06/N08/N09 + BP9e/BP11/D20/DEF0272;12 AC | Blueprint§11,ops/database/workflow |
| 046 | [Release gate](tips/TIP-046-release-hardening.md): backend-it.yml (PG16+pgvector+Redis native runner), `pnpm smoke:build`, runner http release an toàn, parity receipt, đo p95/LCP/1M/200 tenant, axe + i18n, gate bằng chứng theo SHA; tiêu thụ 044/045 | tất cả TIP chờ (tích hợp cuối) | P0 | XL | W9 | REQ-C01c/N07/N08a/N10d/N14, D40, DEF-002-1/004-1/034-3, Q-008/009/017/020, STD-workflow-git-4c/4d | workflow/git-flow-ci, code/testing, ui/prototype-parity |

**Tổng:** 44 TIP còn hiệu lực (007, 008 huỷ) · ~630 giờ theo ước tính gốc (giảm khi ước lại phần "nối API") · P0: 35 TIP · P1: 9 TIP.

**REQ chỉ có frontend** (đã / đang làm ở goal FE, không cần TIP backend): N10, N14, N15 (`AiButton`). Mọi REQ P0 + P1 còn lại có ít nhất một TIP ở bảng trên.

---

## PARALLELIZATION OPPORTUNITIES

| Wave | Chạy song song | Ghi chú |
|------|----------------|---------|
| W1 | — | Tuần tự: khung, DB, kernel là nền của mọi thứ |
| W2 | 004 → 005 → 006 | 007, 008 huỷ (D38) |
| W3 | 009 ∥ 011 ∥ 012 ∥ 013 ; rồi 010 | 010 cần port `BankFeedProvider` của 012 |
| W4 | 014 ∥ 015 ; rồi 016 ; rồi 017 ∥ 018 | 014 kẹt nếu chưa có tài khoản Zalo phụ → làm 015 trước |
| W5 | 019 ; rồi 020 ∥ 021 ; rồi 022 | 019 kẹt nếu chưa có key LLM (dùng mock model cho unit, nhưng nghiệm thu cần provider thật) |
| W6 | 023 ∥ 025 ∥ 026 ∥ 027 ∥ 028 ; rồi 024 | 6 nhánh độc lập về file |
| W7 | 029 ; rồi 030 ∥ 031 ; rồi 032 ; rồi 033 | Commerce đi theo chuỗi vì cùng luồng tiền |
| W8 | 034 ∥ 035 ; rồi 023b ; rồi 023c / 032b / 030b / 015b ; rồi 036 ; sau đó 037–043 theo manifest | Không khẳng định toàn bộ độc lập về file: 036 chia sẻ registry/CRM/payments/worker với TIP trước. Chỉ mở song song sau kiểm file-intersection hai phía; xem HEADER từng TIP |
| W9 | 045b ; rồi 044 ∥ 045 ; rồi 046 | 045 làm sớm được bất cứ lúc nào khi có VPS (Chủ nhà đang hoãn) |

**Tránh đụng file khi chạy song song:** TIP-001 tạo sẵn mọi file tổng hợp **phía backend** (`app.module.ts`, `core/index.ts`, registry kênh / connector, stub prisma). `actions/index.ts`, `nav-config.ts`, `messages/*/<module>.json` đã có từ goal FE. TIP sau **chỉ điền stub của domain mình**; file ngoài domain được phép sửa duy nhất là `packages/shared/src/api/<domain>.ts` + import tương ứng ở `features/<module>` (tách shape đọc — `standards/domain/gap-filling.md` §5). Muốn sửa file của TIP khác → dừng, báo Chủ thầu (escalation L2).

---

## BẢN ĐỒ SỞ HỮU FILE SCHEMA & ACTION

Mỗi file Prisma / action thuộc **đúng một TIP** (Blueprint §2.1). `tenant/sales.prisma` cũ tách thành 3 file theo TIP.

| File | TIP | Bảng / nội dung |
|------|-----|-----------------|
| `platform/ops.prisma` · `platform/routing.prisma` | 002 | `tenant_migration`, `workspace_stats`, `platform_audit_log` · mọi bảng `tenant_*_route` |
| `platform/identity.prisma` | 004 | `user`, `otp_code`, `refresh_token`, `workspace`, `membership` (+ `delegations`), `invite`, `business_profile` |
| `platform/billing.prisma` | 009 | `plan`, `subscription`, `credit_wallet`, `credit_ledger` |
| `platform/billing-payments.prisma` | 010 | `billing_invoice`, `bank_transaction` |
| `platform/integrations.prisma` | 012 | `integration_interest` |
| `platform/ai-config.prisma` | 019 | `llm_provider`, `model_route`, `model_price` |
| `platform/templates.prisma` | 021 | `agent_template` |
| `platform/notify.prisma` | 006 | `notification_pref` (thêm khi làm TIP-006 — DV-002) |
| `platform/commerce-links.prisma` | 032b | `commerce_link` (link công khai xem / tải chứng từ đã gửi — chỉ băm token + định tuyến) |
| `tenant/kernel.prisma` | 002 | `action_log`, `outbox_event`, `idempotency_key`, `file`, `sequence_counter`, `notification`; + `event_consumption` (TIP-006 — DC-027) |
| `tenant/authz.prisma` | 005 | `role`, `team`, `team_member`; D64: cột cây `team` + `team_agent` (TIP-051) |
| `tenant/integrations.prisma` | 012 | `integration_connection`, `integration_mapping`, `integration_call_log`, `integration_event` |
| `tenant/channels.prisma` · `tenant/channels-webchat.prisma` · `tenant/channels-email.prisma` | 014 · 017 · 018 | `channel_account`, … · `webchat_widget` · `email_thread` |
| `tenant/crm.prisma` | 015 · 015b | `contact`, `contact_identity`, `contact_collaborator`, `contact_access_request`, `tag`, `contact_tag`, `contact_memory`, `timeline_event`, `contact_note`, `custom_field_def`, `profile_layout`, `profile_layout_role`; 015b: `contact_revision`, `contact_memory_merge`, `contact_summary_cache` (+ cột nguồn / `fact_norm` / `updated_at` của `contact_memory`) |
| `tenant/inbox.prisma` | 016 | `conversation`, `message`, `message_reaction`, `conversation_participant`, `conversation_tag`, `canned_reply`, `outbox_message` |
| `tenant/ai-runs.prisma` · `ai-kb.prisma` · `ai-agents.prisma` · `ai-assistant.prisma` · `ai-tasks.prisma` | 019 · 020 · 021 · 023 · 035 | Blueprint §2.2 ai-* |
| `core/src/kernel/files/**` + `apps/api/src/http/files/**` (Storage, `POST /v1/files`) | 020 (DV-003) | port `Storage` (local), `FilesService` — TIP sau dùng lại, không sửa |
| `tenant/catalog.prisma` | 027 | `product_category`, `product`, `product_variant`, `product_component`, `stock_movement` |
| `tenant/documents.prisma` | 028 | `doc_template` |
| `tenant/sales-quotes.prisma` | 029 | `quote`, `quote_item` |
| `tenant/contracts.prisma` | 030 | `contract`, `contract_appendix`, `contract_signer`, `contract_signature_event` |
| `tenant/contract-appendix-signing.prisma` | 030b | `appendix_signer`, `appendix_sign_token`, `appendix_signature_event` |
| `tenant/commerce-settings.prisma` | 032b | `commerce_settings` (singleton id=1, ngưỡng duyệt báo giá cấu hình được) |
| `tenant/catalog-import.prisma` | 032b | `product_import`, `product_import_row` (nhập sản phẩm CSV / XLSX, biên nhận từng dòng) |
| `tenant/sales-orders.prisma` | 031 | `order`, `order_item` — 032e (D60, DC-902) thêm `order.activity` + `campaign_id`, migration `20261112110000_finance_rows` |
| `tenant/ai-task-events.prisma` | 012b | `ai_task_event_receipt` — biên nhận phát sự kiện → tác vụ AI unique (task_id, source_event_id), migration `20261108030000_ai_task_event_receipts` (DC-385) |
| `tenant/crm-activities.prisma` | 026b | `contact_task`, `contact_opportunity` + enum kind ghi chú — hoạt động CRM thủ công, migration `20261108040000_crm_activities` (DC-387). **026c (D60, DC-901)** nâng cấp tại chỗ `contact_opportunity` (7 giai đoạn) + thêm `contact_opportunity_item`, `contact_opportunity_event`, migration `20261112100000_opportunity_pipeline`; cột `opportunity_id` trên `quote` / `order` / `appointment` cùng migration |
| `tenant/bank-ingress.prisma` | 012b | `bank_receipt` — biên nhận ngân hàng chuẩn tắc (provider, tài khoản, mã giao dịch), migration `20261108010000_bank_connector_runtime` (DC-383) |
| `tenant/sales-payments.prisma` | 032 | `invoice`, `customer_payment`, `customer_package`, `package_usage`, `tenant_bank_feed`, `payment_account`; `package_reminder` + cột nguồn / bản hạn của gói do 032b thêm (migration `20261102003230_commerce_packages`) |
| `tenant/booking.prisma` | 033 | `staff`, `business_hours`, `appointment`, … |
| `tenant/support.prisma` · `loyalty.prisma` · `marketing.prisma` | 034 · 036 · 037 | Blueprint §2.2 |
| `tenant/callcenter.prisma` | 047b | `call_line`, `call_extension`, `call_queue`, `call_queue_member`, `call_ivr`, `call_ivr_key`, `call`, `call_leg`, `call_recording`, `call_transcript`, `call_summary`, `zcc_consent`, `call_webhook_receipt` (D61, DC-903), migration `20261114100000_callcenter`; 047b cũng sửa `contact_task` (crm-activities, chủ 026b — kind `callback`) và `platform/ai-config.prisma` / `platform/billing.prisma` (giá voice, hạn mức máy, addon) bằng migration platform `20261114100100_voice_pricing` |
| `packages/actions/src/callcenter.ts` · `packages/voice/**` · `infra/livekit/**` | 047c · 047 · 047 | action `call.*` / cấu hình · LiveKit / SIP / ZCC / Voice AI port · systemd + config thoại |
| `tenant/oauth-grants.prisma` | 048 | `oauth_grant` — kho token OAuth dùng chung kênh / ZCC / sàn (D62, DC-909), migration `20261115100000_oauth_grants` |
| `tenant/social.prisma` | 048f (048g thêm bảng) | `social_post` · `social_comment` (048f) · `live_session` · `live_comment_flag` (048g) — D62, DC-914 / DC-915 |
| `platform/routing.prisma` (thêm) · `tenant/channels.prisma` · `tenant/inbox.prisma` (thêm) | 048b | `tenant_channel_webhook_route` · `channel_webhook_event` + `channel_account.oauth_grant_id` · `conversation.last_inbound_at` (048f thêm `kind = comment`, `post_id`, `message.hidden_at` / `external_parent_id`) |
| `packages/actions/src/{oauth,channel-oauth,inbox-comments,live}.ts` · `packages/channels/src/{zalo-oa,meta,facebook,instagram,tiktok}/**` | 048 · 048b · 048f · 048g · 048d / 048e / 048h | action OAuth / chọn tài khoản / bình luận / live · adapter kênh D62 |

`packages/actions/src/<domain>.ts` **đã có** (goal FE) và đi theo cùng bảng trên để xác định TIP nào cài handler (ví dụ `quotes.ts` → 029, `orders.ts` → 031). `packages/shared/src/<domain>/state.ts` (bảng trạng thái) và `packages/shared/src/api/<domain>.ts` (shape đọc) thuộc cùng TIP với domain. Không suy ra “không bảng mới” từ số TIP038–043: manifest mới là chuẩn ownership. TIP038 nhận `tenant/insights.prisma` (follow-up/export snapshot/digest delivery);042/042c/043 có migration/ledger theo manifest riêng. Các TIP còn chưa viết phải rà lại trước thi công.

**Action có trong code nhưng chưa có trong Blueprint §3.4** (FE thêm khi dựng màn) — TIP cài handler: `workspace.switch` → 004 · `notification.update_prefs` → 006 · `onboarding.toggle_step` → 011 · `ai_settings.update` → 019 · `quote.comment`, `quote.delete` → 029 · `contract.delete` → 030 · `wallet.update_alerts` → 039 · `follow_up.complete` → 038. Chủ thầu bổ sung vào Blueprint §3.4 khi sinh TIP tương ứng.

---

## CỔNG TÀI NGUYÊN (Chủ nhà cấp trước TIP)

| Tài nguyên | Chặn TIP | Khi chưa có |
|------------|----------|-------------|
| Key LLM (tối thiểu 1 router OpenAI-compatible như OpenRouter / 9router, hoặc Anthropic + OpenAI cho embedding) | 019 (nghiệm thu), 020, 022, 023, 044 live | Unit test bằng mock model của AI SDK; **không** báo DONE cho các ô cần provider thật |
| 1–2 tài khoản Zalo cá nhân phụ | 014 (spike + nghiệm thu) | Làm 015 trước; 014 chỉ dựng khung adapter |
| Tài khoản SePay + tài khoản nhận tiền AppChat | 010, 032 (chạy thật) | Adapter `mock`; nghiệm thu bằng webhook giả lập |
| Tài khoản Brevo + domain gửi (SPF / DKIM / DMARC) | 004, 006 (gửi thật) | Adapter `console` in OTP ra log ở dev |
| VPS + domain (Chủ nhà đang hoãn) | 045, 046 | Làm sau cùng |
| App Zalo (AppID) có quyền gọi thoại + OA Doanh nghiệp đã xác thực (Q-902) | 047c / 047d (ZCC thật) | `ZccClient` mock + SIP giả lập |
| Máy Linux IP tĩnh cho SIP edge + livekit-sip (Q-903) · số SIP / hotline thử (Q-904) | 047, 047c (gọi thật) | `livekit-server --dev` trên máy dev; SIPp giả lập trunk |
| Voice AI tự dựng: PhoWhisper (STT) + VieNeu-TTS (TTS) local — DC-907 (Q-905 chốt); Realtime OpenAI / Gemini tuỳ chọn khi có key | 047, 047c, 044 (voice live) | Bộ cài `mock` kịch bản cố định; model tải bằng `voice-models.sh` |
| Đăng ký app đối tác Shopee (Q-914) / TikTok Shop (Q-915) — D63; Lazada vẫn P2 | 049b, 049c (nghiệm thu thật) | Server giả + fixtures; khung + `mock` trong 031 |
| Meta Business Verification + App Review + domain HTTPS (Q-908) | 048e, 048f, 048g (nghiệm thu thật) | Transport `fake` + fixtures webhook |
| App Zalo quyền OA API + OA thử mua gói Tăng trưởng (Q-909) | 048, 048d | Transport `fake`; ZCC dùng chung App (DC-909) |
| TikTok Business Messaging API + Accounts API form (Q-910) | 048h | Transport `fake` |

---

## MÔI TRƯỜNG DEV (đã có trên máy, không Docker)

- Node 24 · pnpm 11 · PostgreSQL 16 native (service `postgresql-x64-16`) + **pgvector 0.8.1** (build MSVC, 2026-10-28) · Memurai 8 (Redis-compatible, service) · LibreOffice 26.8 (`C:\Program Files\LibreOffice\program\soffice.exe`) · Git.
- Chưa có: key LLM, tài khoản Zalo phụ, SePay, Brevo (xem bảng trên).

---

## TEAM ALLOCATION

- Mô hình OPC: **Chủ nhà** duyệt / quyết; **Chủ thầu** (Claude, phiên thiết kế) viết TIP theo wave, nhận Completion Report, verify; **Thợ** (Claude Code, mỗi TIP một phiên / nhánh) thi công.
- Mỗi TIP chờ có file riêng `tips/TIP-XXX-<slug>.md`, viết trước theo **DC-233 (thay D57)**; bắt buộc rà CONTEXT với code trước thi công. Tiến độ: `goals/GOAL-BACKEND.md`. File manifest chia sẻ phải serialize (DC-234), không suy ra song song chỉ từ wave.

### Supplemental015e — merge/dedupe and retained contact lineage (DC257)

| TIP | Scope | Dependency/order | Evidence gate |
|---|---|---|---|
|015e [contact-merge-integrity](tips/TIP-015e-contact-merge-integrity.md)|Scoped real candidates, selected versioned plans, no ACL union, family-aware historical commerce/package/Inbox, conditional7day inverse and AI-first realfiles|After015f and all exact bilateral predecessors; before015c/044–046|8 AC/native race/authority/10kEXPLAIN/actualCSV-XLSX/live8 cases; local planning review/recheck closed, runtime pending|

Exact M/C ownership: tips/manifests/TIP-015e-files.md. Retained financial source refs do not imply permission bypass. No historical DONE TIP edited; independent whole-graph review still required.

### Supplemental012c — tenant mail delivery and Email Marketing (DC258)

| TIP | Scope | Dependency/order | Evidence gate |
|---|---|---|---|
|012c [tenant-mail](tips/TIP-012c-tenant-mail.md)|TenantBrevo/SMTP port, safe transport, approvedsender, durable accepted/unknown, authenticatedcallbacks, Settings/AI/files|After015e/012b/037/023c/045b and bilateral predecessors; before015c/044–046|8 AC, native/security/callback/composition, actualfiles/live8, providercontractspike mandatory; localplanning review/recheck closed, runtime pending|

Exactownership tips/manifests/TIP-012c-files.md; no platformOTP/Inbox replacement. Missingprovidercontract gates affectedlivecapability, not wholeongoal progress.

### Supplemental033b — booking operations and package360 (DC261)

| TIP | Scope | Integration | Acceptance |
|---|---|---|---|
|033b [booking-operations](tips/TIP-033b-booking-operations.md)|Expiredreconfirm/reservation/undo, settingsstaff/hours closed-versus-inherit/CAS, scopedpackage360/tool/export-onlyrealfiles|After015e/015f/012c and exactbilateralpredecessors; before015c/044–046|8AC/nativeEXCLUDE/races/scope/configmigration/10kEXPLAIN, mock+http/mobile/parity andlive8; localplanningreview/recheck closed, runtimepending|

Exactownership tips/manifests/TIP-033b-files.md;025b retainsInboxpopover/route,032b packagegrant/reminderpolicy. Currentreadguard crm.view plusexistingrecordscope, no newpermission. No runtimepromotion.

### Supplemental019c — read-only AI utility skills (DC263)

| TIP | Scope | Integration | Acceptance |
|---|---|---|---|
|019c [ai-utilities](tips/TIP-019c-ai-utilities.md)|Fourtypedskills, scoped evidence, protectedgeneration/publication, persistentUI andtruthful038bfileboundary|After019b/033b andexactbilateralpredecessors; before015c/023d/023e/044–046|8AC, nativeauthority/publicationbarriers/replay/budget, mock+http/mobile/parity andlive8; localplanningreviewclosed, runtimepending|

Exactownership tips/manifests/TIP-019c-files.md. Notreplacementof015b memory/022b routing, semanticdiscovery023e oreditplans023d; no automaticgrants/businesswrites.

### Supplemental023d — editable plans and selected agents (DC267)

| TIP | Scope | Order | Evidence gate |
|---|---|---|---|
|023d [assistant-plans](tips/TIP-023d-assistant-plans.md)|Receipt progress, edit checkpoint/drain/resume, privacy-safe fresh reuse, stable selected agent/child authority|After015c and all exact bilateral predecessors; before023e/044/045/046|119 exact paths,18 futureM,31 bilateral pairs,7 ownedIDs,10AC; two local reviews closed, runtime pending|

Exact manifest tips/manifests/TIP-023d-files.md. One primary-effect claim independent of model call ID; no budget reset or terminal resurrection. AI-first/manual real files reuse038b, not a second parser.

### Supplemental023e — semantic action discovery (DC268)

| TIP | Scope | Order | Evidence gate |
|---|---|---|---|
|023e [action-discovery](tips/TIP-023e-action-discovery.md)|Versioned metadata corpus, explicit metered preparation, current-authority semantic ranking/cache and private query projection|After023d and all exact bilateral predecessors; before044/045/046|69 exact paths/14futureM/32bilateral pairs/5ownedIDs/8AC, local review; runtime pending|

Agent-draft use of discovery is an additional unresolved Blueprint5.3b obligation, not implicitly closed by the finder implementation. Exactmanifest tips/manifests/TIP-023e-files.md; no new default model or tariff.

### Supplemental023f — actual Assistant content input (DC269)

|TIP|Scope|Order|Evidence gate|
|---|---|---|---|
|023f [assistant-input](tips/TIP-023f-assistant-input.md)|Bounded file/image/email artifacts, guarded model hydration, screenshot and browser dictation|After023e/025b and every exact bilateral predecessor; before044/045/046|130exactpaths,8ownedIDs,10AC,33bilateralpairs; native isolation/profile/browser/provider gates still unverified|

Not a replacement for038b business file transfer or025b Inbox capture. Exact manifest tips/manifests/TIP-023f-files.md. Native sandbox profiles are implementation prerequisites, not a statement that Node heap limits isolate untrusted parsing.

### Supplemental003b — durable event protocol (DC270)

|TIP|Scope|Order|Evidence gate|
|---|---|---|---|
|003b [event-protocol](tips/TIP-003b-event-protocol.md)|Transaction-final collector, typed aggregate sequence, relay claims, ordered dispatch/receipt ports/readiness/cutover|After023f and exact bilateral predecessors; foundation before003c/006b adapters, then combined activation before044–046|94exactpaths/11futureM/33bilateralpairs/6ownedIDs/10AC; local review corrections rechecked, runtime unverified|

Foundation build has no backward dependency on adapters; v2 activation is separately blocked until actual003c/006b and future consumer capabilities are proven. STD-events-outbox4/5 and STD-domain-state4 are not claimed by foundation. All current25direct-writer files plus undo require transaction collector enrollment. No crossentity ordering or external exactly-once promise.

### Supplemental003c — private system adapters (DC271)

| TIP | Scope | Integration | Evidence |
|---|---|---|---|
|003c [system-actions](tips/TIP-003c-system-actions.md)|Canonical private transitions, early admission gate, durable source receipts, current domain predicates and narrow sender capabilities|After003b and exact bilateral predecessors; before006b/030c integration and combined v2 activation|138exactpaths/36bilateralpairs/4ownedIDs/8AC; local review corrected, runtime unverified|

No dependency back-edge from003b foundation to003c implementation; activation is a separate gate.006b owns projection/delivery/task fanout,030c parent signing. Existing action IDs/policies remain authoritative; no internal tool grant through AI discovery.

### Supplemental006b — event delivery/fanout (DC272)

| TIP | Scope | Integration | Evidence |
|---|---|---|---|
|006b [event-delivery](tips/TIP-006b-event-delivery.md)|Durable notification/mail/WS/catalog handoffs, stable fanout, atomic task occurrences and current authority|After003b/003c and exact bilateral predecessors; combined activation before044–046|73exactpaths/32bilateralpairs/4ownedIDs/8AC; bounded independent review corrected/rechecked|

No new manual/schedule policy: manual busy409 preserved; ownerOnly retarget follows019b rather than broadcast cohort. Whole STD-events-outbox4 runtime proof requires foundation and all real consumer adapters, not only planning ownership.

### Supplemental030c — parent signing integrity (DC273)

| TIP | Scope | Integration | Evidence |
|---|---|---|---|
|030c [parent-signing](tips/TIP-030c-parent-signing.md)|Private parent signing/Owner OTP, exact generation and source receipts, isolated candidate render/finalize, read-only GET and truthful delivery|After030b/032c/003b/c/006b and exact bilateral predecessors; before final vertical acceptance|71exactpaths/38bilateralpairs/3ownedIDs/8AC; local independent findings rechecked|

Original030 DONE stays unchanged;030b appendix model is not reused for parent signer. No Commerce/permission change; approved retained-document and contact-family lock policy apply.

### Supplemental021b — Agent Builder discovery (DC274)

| TIP | Scope | Integration | Evidence |
|---|---|---|---|
|021b [agent-drafting](tips/TIP-021b-agent-drafting.md)|Discovery-before-generation, structured current-authorized proposal, protected publication, truthful fallback and explicit human publish|After023e/019b/c/003c/022b and exact bilateral predecessors; no numeric order assumption|54exactpaths/23bilateralpairs/3ownedIDs/8AC; local independent findings corrected/rechecked|

REQ-D17c runtime KB-scope intersection remains separate/unowned; do not claim this drafting plan closes delegated knowledge access. New binding stores validation only, not competing metering.

### Supplemental023g — record-scoped AI entry points (DC275)

| TIP | Scope | Integration | Evidence |
|---|---|---|---|
|023g [record-ai-entrypoints](tips/TIP-023g-record-ai-entrypoints.md)|Seven real row/tab AI entry groups, typed record contexts, protected product proposals and canonical receipt-driven work|After023c/d/e,019b/c,015c,037/038 and exact bilateral predecessors; no numeric order assumption|95 exact paths,39 bilateral pairs,7 owned IDs,8 AC; local review corrected/rechecked|

Inspect opens without model/charges; task confirmation and existing selected-agent authority remain. Bulk forwarding, attachment tabs, deposit and shift policy remain separate gaps. Runtime proof is still required.

### Supplemental020c — effective knowledge scope (DC276)

| TIP | Scope | Integration | Evidence |
|---|---|---|---|
|020c [kb-effective-scope](tips/TIP-020c-kb-effective-scope.md)|Trusted source scope through agent/Assistant/task/Builder/consult/resume; current retrieval and dependent output authority|After019b/020b/022b/023d/015c/045b and exact bilateral predecessors|Exact manifest,3 owned IDs,8 AC; local review recorded in planning report|

STD-ai-rag-2/3a downgraded from broad ĐẠT to MỘT PHẦN: existing direct search tests do not prove delegated scope. Citation UI STD-ai-rag-8b remains unowned; no runtime acceptance.

### Supplemental020d — RAG answer citations (DC277)

| TIP | Scope | Integration | Evidence |
|---|---|---|---|
|020d [rag-citations](tips/TIP-020d-rag-citations.md)|Validated answer-generation citations, protected publication, actual draft/audit/run detail UI and edited-source/customer-send boundary|After020c/019b/021b/022b/023c/045b and exact bilateral predecessors|Exact manifest,2 owned IDs,8 AC; review in planning report|

STD-ai-rag-8a downgraded: retrieved references are not evidence of answer-step citations. Whole graph semantics and runtime acceptance remain open.

### Supplemental033c — appointment order suggestion (DC278)

| TIP | Scope | Integration | Evidence |
|---|---|---|---|
|033c [appointment-order-suggestions](tips/TIP-033c-appointment-order-suggestions.md)|Current Calendar/Inbox/Assistant card, closed GenUI schema, price-bound canonical confirmation and duplicate/undo integrity|After033b/032c/023c/045b and exact bilateral predecessors|64 exact paths/41 pairs/1 owned ID/8 AC; local review report|

COM-4-7/8 deposit semantics remain separate under Q038/039;033c does not change them. No runtime proof from planning ownership.

### Supplemental032d — order/invoice attachments (DC279)

| TIP | Scope | Integration | Evidence |
|---|---|---|---|
|032d [commerce-record-files](tips/TIP-032d-commerce-record-files.md)|Real Files tabs, typed private association/claim, current download, immutable generated evidence and AI-artifact consented copy|After023c/f/030b/032c/015c/045b and exact bilateral predecessors|Exact manifest,2 owned prototype IDs,8 AC; native structural validation gate explicit|

Product media/formatting and CSV dataset transfer remain separate. No model on ordinary upload/open, no public URL or malware-scan claim from structural parsing.

### Supplemental027b — product media/description (DC280)

| TIP | Scope | Integration order | Gates |
|---|---|---|---|
|027b [product-media-description](tips/TIP-027b-product-media-description.md)|Private product images/files and safe structured description; actual editor, legacy plain/RAG projection, AI-first/manual data-transfer compatibility|After032d/023f/g/038b/015c/045b and all exact bilateral predecessors|79-path manifest,3 owned IDs,8 AC; pending-intent/create-undo races and packaged image validator proof|

### Supplemental034b — ticket category suggestions (DC281)

| TIP | Scope | Integration order | Gates |
|---|---|---|---|
|034b [support-categories](tips/TIP-034b-support-categories.md)|Separate category settings, scoped used labels, free-text/history compatibility, AI/manual atomic dictionary CSV/XLSX transfer|After038b/023b/c/e/015c/042c/045b and exact bilateral predecessors|68 paths,2 owned IDs,8 AC; singleton CAS/undo, current scope and config confirmation; no stock trend/bulk acceptance|

### Supplemental034c — ticket bulk outcomes/undo (DC282)

| TIP | Scope | Integration order | Gates |
|---|---|---|---|
|034c [ticket-bulk](tips/TIP-034c-ticket-bulk.md)|Per-ticket combined atomic patches, typed receipts/progress, native version guard, sealed partial undo and actual result files|After003c/045b/025b/042c/015c/023c/g/038b and exact bilateral predecessors|79 paths,1 remaining standard owner,8 AC; running/cancelled-inflight/retry versus undo-seal native barriers|

### Supplemental034d — actual observed ticket stock trends (DC283)

| TIP | Scope | Integration order | Gates |
|---|---|---|---|
|034d [ticket-stock-trends](tips/TIP-034d-ticket-stock-trends.md)|Five current-cohort observed deltas, atomic daily projection/privacy cleanup and same canonical Assistant/UI facts|After034b/c/042c/015c/045b/023b/c/g and exact bilateral predecessors|57 paths,1 deferred owner,8 AC; fresh-statement capture/forget and protected-publication native barriers; no fictional history|

### Supplemental015g — atomic manual-stage24h hold (DC284)

| TIP | Scope | Integration order | Gates |
|---|---|---|---|
|015g [crm-stage-hold](tips/TIP-015g-crm-stage-hold.md)|Canonical family/version/24h atomic stage guard, no-op compatibility and conditional manual undo across real Commerce triggers|After025b/015c/e/f/032c/003c/030c and exact bilateral predecessors|26 paths,1 owned Commerce invariant,8 AC; native ABA/exact cutoff/undo/source transaction matrix|

### Supplemental026c — Cơ hội / Sales Pipeline (DC901, D60)

| TIP | Scope | Integration order | Gates |
|---|---|---|---|
|026c [sales-pipeline](tips/TIP-026c-sales-pipeline.md)|`contact_opportunity` nâng cấp tại chỗ (7 giai đoạn, xác suất hằng, sản phẩm, lịch sử), liên kết `quote/order/appointment.opportunity_id`, chuyển tự động trong transaction producer, `recomputeContactStage` qua `applyStageRule`, UI 360° / drawer / chip / cột / form|After026b/015e/f/g/032c and exact bilateral predecessors; before032e/044/045/046|Exact manifest,10 AC; migration trên dữ liệu 026b, EXPLAIN100k, ai:live 6 ca|

Kanban Pipeline và Hẹn gọi lại làm sau (D60 #8–9). Cơ hội tái mua tự tạo cần Quy trình (D19). Gắn cuộc gọi để TIP Call Center (`source_kind 'call'`).

### Supplemental032e — Tài chính (DC902, D60)

| TIP | Scope | Integration order | Gates |
|---|---|---|---|
|032e [finance](tips/TIP-032e-finance.md)|Service đọc dòng đơn + đề nghị lẻ (id-first + join), trạng thái / kỳ / hoạt động, drawer khách, badge `/nav/badges`, `invoice.bulk_remind` dùng chung `remindOne` với `send_payment_qr`, rail + lối vào|After026c/015b/016b/032b/c/037/045b and exact bilateral predecessors; before044/045/046|Exact manifest,10 AC; EXPLAIN100k, outbox một lần, parity --done|

Không ghi thu, không cộng điểm vào đã thu, không gửi hàng loạt qua Zalo cá nhân. ZBS "Sắp có". Không đụng credit / billing nền tảng.

### Supplemental047 — Gọi điện / Call Center + LiveKit + Zalo Cloud Connect (D61, DC903–DC906)

| TIP | Scope | Integration order | Gates |
|---|---|---|---|
|047 [voice-infra](tips/TIP-047-voice-infra.md)|`packages/voice` + `infra/livekit` + depcheck, không DB / action / UI|After032e; before047b|unit voice (mock LiveKit / ZCC / VoiceAi), depcheck, infra plan|
|047b [callcenter-schema](tips/TIP-047b-callcenter-schema.md)|`tenant/callcenter.prisma` + callback task + giá voice / hạn mức / addon + permission seed|After047/026c; before047c|db:generate → migrate-tenants → setup, prisma-stubs, EXPLAIN|
|047c [callcenter-backend](tips/TIP-047c-callcenter-backend.md)|action + webhook + outbox + realtime + routing + ghi âm + Voice AI + credit + privacy + cơ hội|After047b/015c/019b/023b/026c; before047d|integration (webhook trùng / sai thứ tự, CAS, credit idempotent, forget), ai:live voice (mock / thật)|
|047d [callcenter-ui](tips/TIP-047d-callcenter-ui.md)|màn + WebPhone + CallbackModal + Cài đặt + nút gọi + widget + rail / OUT_LABELS|After047c/032e; before044/045/046|parity callcenter:* + --done, e2e mock + http, i18n, mobile|

Bốn lớp dựng song song trên worktree riêng (cổng E2E riêng, `--workers=1`, `TENANT_CLIENT_CACHE` thấp — Postgres dùng chung 100 slot); ghép tuần tự từng PR sau khi chuỗi PR hiện tại đã merge, đổi mốc migration theo dev lúc ghép. Không tự gọi hàng loạt / tự động quay số, không Softphone / IP Phone / Mobile app, không ZNS / chat OA (D61).

### Supplemental048 — Kênh webhook + bình luận + livestream + cô lập worktree (D62, DC-908 → DC-916)

| TIP | Scope | Integration order | Gates |
|---|---|---|---|
|035d [worktree-isolation](tips/TIP-035d-worktree-isolation.md)|env worktree, Memurai riêng, slot Postgres, cổng theo env — không code nghiệp vụ|Right after the last pending TIP with an open PR (034d at writing); before every pending TIP sharing files|node test scripts, 2 worktree chạy e2e:http song song, db:test-reset không chạm worktree khác|
|048 [oauth-token-vault](tips/TIP-048-oauth-token-vault.md)|`oauth_grant` + `TokenVault` + `oauth.*` + callback + `useOAuthConnect`|After047b/015c; before047c/047d/048b|db 3 lệnh, refresh đồng thời một lần, state một lần|
|048b [channel-webhooks](tips/TIP-048b-channel-webhooks.md)|route + biên nhận + chọn tài khoản + cửa sổ gửi + registry|After048/014b/022c/022d/003g/026c; before048c|integration hooks / oauth-select / send-window, contract test|
|048c [channel-connect-ui](tips/TIP-048c-channel-connect-ui.md)|modal / drawer / Hộp thư / Agents theo registry|After048b/014c/042b; before048d|parity settings / inbox / agents + --done, e2e mock + http|
|048d [zalo-oa](tips/TIP-048d-zalo-oa.md)|adapter Zalo OA|After048c; before048e|fixtures + integration, chưa nghiệm thu thật (Q-909)|
|048e [meta-messaging](tips/TIP-048e-meta-messaging.md)|Facebook Page + Instagram + data deletion|After048d; before048f|fixtures + integration, chưa nghiệm thu thật (Q-908)|
|048f [social-comments](tips/TIP-048f-social-comments.md)|hội thoại bình luận + action + UI|After048e; before048g/048h|EXPLAIN tab Bình luận, parity PD-904, e2e|
|048g [livestream](tips/TIP-048g-livestream.md)|phiên live + cờ + màn live|After048f|SSE + poll đối soát, lease phiên|
|048h [tiktok-messaging](tips/TIP-048h-tiktok-messaging.md)|TikTok BM + bình luận video|After048f; before044/045/046|fixtures + integration, chưa nghiệm thu thật (Q-910)|

Luồng song song (D62 #7, sau khi chuỗi PR hiện tại merge): A = TIP cũ theo `order.py` · B = Gọi điện 047 → 047d · C = Kênh 048 → 048h. 035d làm đầu tiên (ngay sau TIP chờ đang có PR — 034d lúc viết; chủ thầu đặt dòng khai hai phía để 035d ghép trước mọi TIP chờ còn lại có chung file). 048 nằm giữa 047b và 047c (một token OA cho ZCC + kênh OA — DC-909): luồng C bắt đầu 048 sau khi 047b ghép, hoặc luồng B làm luôn 048. Mỗi luồng một dải số sổ (B: 8xx, C: 7xx, docs: 9xx). Agent là nhân viên: trả lời bình luận, nhắn riêng, tạo khách / đơn từ live như người (Q-911 chốt, DC-921).

### Supplemental049 — Đồng bộ sàn Shopee + TikTok Shop (D63, DC-917 → DC-920)

| TIP | Scope | Integration order | Gates |
|---|---|---|---|
|049 [marketplace-foundation](tips/TIP-049-marketplace-foundation.md)|OAuth connector + shop route + webhook mức App + pull cursor + 5 lỗi đồng bộ|After048/048h/031c/027b/032b/032c; before049b|db 3 lệnh, nối lại không trùng, hai shop / sàn, tồn biến thể, EXPLAIN|
|049b [shopee](tips/TIP-049b-shopee.md)|connector Shopee|After049; before049c|fake-server + fixtures, ký / push body rỗng, refresh một lần (Q-914)|
|049c [tiktok-shop](tips/TIP-049c-tiktok-shop.md)|connector TikTok Shop|After049b; before049d|fake-server + fixtures, deauth (Q-915)|
|049d [marketplace-ui](tips/TIP-049d-marketplace-ui.md)|Nền tảng kết nối + Ghép SKU + đơn / sản phẩm sàn|After049c/048c; before044/045/046|parity settings / orders / products + --done, e2e mock + http|
|050 [agent-grantable-review](tips/TIP-050-agent-grantable-review.md)|Bật agentGrantable action một bản ghi (DC-921 / 922 / 923)|After049d; before044/045/046|registry test khoá luật, eval 3 ca|
|051 [org-units](tips/TIP-051-org-units.md)|Cây đơn vị + scope `dept` + agent thành viên + Sơ đồ tổ chức / Phòng ban (D64)|After050; before051b/051c/044/045/046|EXPLAIN scope dept, parity settings:org_dept / teams|
|051b [unit-channels-roles](tips/TIP-051b-unit-channels-roles.md)|Kênh theo phòng ban nhận, chia trong phòng, vai trò mẫu (D64)|After051; before051c/044|parity settings:channels / roles|
|051c [contact-relation](tips/TIP-051c-contact-relation.md)|Loại liên hệ, chỉ Khách hàng vào phễu / chứng từ (D64)|After051b, 026c, 032e; before044/045/046|EXPLAIN danh sách mặc định, parity customers|
|051d [agent-members](tips/TIP-051d-agent-members.md)|Agent là thành viên + phòng ban ở form thành viên + đơn vị bản ghi agent tạo (DC-927)|After051c; before044/045/046|parity settings:members, e2e settings / calendar|

Không đăng sản phẩm, không đẩy tồn / trạng thái lên sàn (P2), không chat người mua, không livestream sàn. Luật COMMERCE §4b giữ nguyên.
