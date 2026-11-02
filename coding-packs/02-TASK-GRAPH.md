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
| 023b | Trợ lý toàn năng: khuôn input lồng nhau cho model, ẩn action chưa có handler, mã → id cả agent, ~20 action đọc `search` / `get`, preview "đổi gì" cho mọi action ghi, test bắt buộc phủ action, bộ câu thử 9router thật (`pnpm ai:live`) | 023, 022 | P0 | 16 | W8 (trước 036) | D03, E02, E04, E05, E09, E10 | ai/agent-gateway, actions/action-registry |
| 023c | Generative UI (D55): `UiTree` + `render` + renderer compact / full, khối `qr`, ô `secret`; 7 drawer Trợ lý theo màn + hộp lệnh Hộp thư nối thật kèm ngữ cảnh (E06); kết nối kênh / connector qua Trợ lý | 023b, 014, 016, 012 | P0 | 24 | W8 (trước 036) | E06, E07, E10, B10, H03 | ai/generative-ui, ui/prototype-parity |
| 032b | Commerce vá luật đã chốt: ngưỡng duyệt cấu hình được + trần agent, báo giá → một HĐ hoặc một đơn, VietQR ảnh thật + `GET /invoices/:id/qr`, gửi chứng từ qua webchat, `order.send_confirmation` / `receipt.send`, liệu trình khi cọc + nhắc, catalog (danh mục / import / biến thể) | 027, 029, 030, 031, 032, 021 | P0 | 12 | W8 (trước 036) | F03–F08, M01 | domain/state-machine, documents/templates |
| 030b | Hợp đồng từ file: chọn mẫu theo loại, tải PDF / DOCX có sẵn, tạo từ tệp khách gửi trong hội thoại, phụ lục, AI soạn nháp (đóng Q-022) | 028, 030, 025 | P0 | 12 | W8 (trước 036) | F09, M01, M02 | documents/templates |
| 015b | [Trí nhớ khách +360 thật](tips/TIP-015b-contact-memory.md): contact.remember/memory_forget, scoped summary, KPI/debt/LTV/links, CRM AI endpoint và Giao AI;73path | 015/022/029–035; sau023b/023c/030b/032b do giao file, trước036/020b/043/045b; không chờ036/038/044 | P0 | XL | W8 | D10a/b,F01-c,F02b/c,F08g,DEF0152/3/4,DEF0221/0261,COM5-15/9-22 | ai/agent-gateway, authz/rbac-permissions, database/indexing |
| 045b | Bảo mật & vận hành trong app: `/metrics` prom-client, `safeFetch` SSRF, kiểm file tải lên, rate limit chung, CORS, audit, `workspace.transfer_ownership`, lọc trường theo vai trò phía server, đối soát nền tảng ↔ tenant, AI nhường người, export / bulk lớn chạy job | 003, 005, 006, 009, 014, 016, 020, 022 | P0 | 20 | W9 (trước 045, 046) | N06, N07, N08, A05, F01 | ops/observability-security, authz/rbac-permissions |
| 024 | Agents UI + hàng chờ duyệt + nhật ký hành động: AgentsPage, TemplateGallery, AgentBuilder, tạo bằng Trợ lý, lịch sử phiên bản, TestChat; assistant/approvals, assistant/actions | 021, 023 | P0 | 16 | W6 | D07, D08, D09, D09b, D15, E09 | ui/prototype-parity, ui/frontend-structure |
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
| 044 | AI eval gate: harness replay + live, đủ các suite (`assistant-*`, `agent-*`, `rag`, `doc-draft`, `delegate-consult`, `genui`; gộp bộ `pnpm ai:live`), báo cáo, CI | 022, 023, 024, 028, 020 | P0 | 16 | W9 | N11 | ai/eval |
| 045 | Hạ tầng production: `infra/` (provision, nginx, systemd + PM2, PgBouncer, pgBackRest, LibreOffice + font), Prometheus / Alertmanager / Grafana / Loki / Alloy, dashboard + alert, deploy `releases/<sha>` | 001 | P0 | 20 | W9 | N01, N06, N08, N09 | Blueprint §11 |
| 046 | Release hardening: đo p95, rà bảo mật, chạy parity mọi màn, e2e mobile, độ phủ `en`, diễn tập backup / restore; CI `backend-it.yml` (Postgres + Redis service) + e2e http (Q-008), `pnpm smoke:build` (Q-009); rerank + job re-embed khi đổi model embed (rag §6, §10) | tất cả | P0 | 16 | W9 | N06, N07, N14 | tất cả |

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
| `tenant/kernel.prisma` | 002 | `action_log`, `outbox_event`, `idempotency_key`, `file`, `sequence_counter`, `notification`; + `event_consumption` (TIP-006 — DC-027) |
| `tenant/authz.prisma` | 005 | `role`, `team`, `team_member` |
| `tenant/integrations.prisma` | 012 | `integration_connection`, `integration_mapping`, `integration_call_log`, `integration_event` |
| `tenant/channels.prisma` · `tenant/channels-webchat.prisma` · `tenant/channels-email.prisma` | 014 · 017 · 018 | `channel_account`, … · `webchat_widget` · `email_thread` |
| `tenant/crm.prisma` | 015 | `contact`, `contact_identity`, `contact_collaborator`, `contact_access_request`, `tag`, `contact_tag`, `contact_memory`, `timeline_event`, `contact_note`, `custom_field_def`, `profile_layout`, `profile_layout_role` |
| `tenant/inbox.prisma` | 016 | `conversation`, `message`, `message_reaction`, `conversation_participant`, `conversation_tag`, `canned_reply`, `outbox_message` |
| `tenant/ai-runs.prisma` · `ai-kb.prisma` · `ai-agents.prisma` · `ai-assistant.prisma` · `ai-tasks.prisma` | 019 · 020 · 021 · 023 · 035 | Blueprint §2.2 ai-* |
| `core/src/kernel/files/**` + `apps/api/src/http/files/**` (Storage, `POST /v1/files`) | 020 (DV-003) | port `Storage` (local), `FilesService` — TIP sau dùng lại, không sửa |
| `tenant/catalog.prisma` | 027 | `product_category`, `product`, `product_variant`, `product_component`, `stock_movement` |
| `tenant/documents.prisma` | 028 | `doc_template` |
| `tenant/sales-quotes.prisma` | 029 | `quote`, `quote_item` |
| `tenant/contracts.prisma` | 030 | `contract`, `contract_appendix`, `contract_signer`, `contract_signature_event` |
| `tenant/sales-orders.prisma` | 031 | `order`, `order_item` |
| `tenant/sales-payments.prisma` | 032 | `invoice`, `customer_payment`, `customer_package`, `package_usage`, `tenant_bank_feed`, `payment_account` |
| `tenant/booking.prisma` | 033 | `staff`, `business_hours`, `appointment`, … |
| `tenant/support.prisma` · `loyalty.prisma` · `marketing.prisma` | 034 · 036 · 037 | Blueprint §2.2 |

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
| Đăng ký app đối tác Shopee / TikTok Shop / Lazada | adapter thật P2 (ngoài 46 TIP) | Khung + `mock` trong 031 |

---

## MÔI TRƯỜNG DEV (đã có trên máy, không Docker)

- Node 24 · pnpm 11 · PostgreSQL 16 native (service `postgresql-x64-16`) + **pgvector 0.8.1** (build MSVC, 2026-10-28) · Memurai 8 (Redis-compatible, service) · LibreOffice 26.8 (`C:\Program Files\LibreOffice\program\soffice.exe`) · Git.
- Chưa có: key LLM, tài khoản Zalo phụ, SePay, Brevo (xem bảng trên).

---

## TEAM ALLOCATION

- Mô hình OPC: **Chủ nhà** duyệt / quyết; **Chủ thầu** (Claude, phiên thiết kế) viết TIP theo wave, nhận Completion Report, verify; **Thợ** (Claude Code, mỗi TIP một phiên / nhánh) thi công.
- Mỗi TIP chờ có file riêng `tips/TIP-XXX-<slug>.md`, viết trước theo **DC-233 (thay D57)**; bắt buộc rà CONTEXT với code trước thi công. Tiến độ: `goals/GOAL-BACKEND.md`. File manifest chia sẻ phải serialize (DC-234), không suy ra song song chỉ từ wave.
