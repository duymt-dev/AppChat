# AppChat — Project Context (Scan Report)

> Vibecode Kit v5.0 — BƯỚC 1 (SCAN)
> Coding workspace: `D:\CODING\AppChat_Ver2` (remote `github.com/duymt-dev/AppChat`)
> Scanned: 2026-10-27
> **RRI 2026-10-28:** sản phẩm thương mại hoàn chỉnh, mô hình OPC, lõi là Trợ lý AI làm Orchestrator + Copilot của nền tảng (điều phối agents, điều khiển mọi action trên UI); xem `01-REQUIREMENTS-MATRIX.md`.
> Scan type: **Greenfield từ bộ đặc tả** — chưa có source code; build mới hoàn toàn bằng **Next.js + NestJS**.
> Không liên quan / không tái sử dụng codebase V1 (`D:/CODING/appchat`) — quyết định của Chủ nhà 2026-10-27.

---

## 0. Định vị sản phẩm (tóm tắt)

**AppChat — Giải pháp One-Person Company (OPC)**: SaaS B2B đa tenant giúp *một người* vận hành toàn bộ doanh nghiệp dịch vụ bằng đội ngũ AI Agents — hợp nhất omnichannel inbox, CRM/CDP 360°, bán hàng (báo giá → hợp đồng → đơn → hoá đơn), CSKH (ticket/SLA), lịch hẹn, marketing broadcast, tổng đài/AI Voice, loyalty, workflow, báo cáo, ví credit. [SoT: AppChat-SolutionDesign-v1.1 §1-2; CHANGELOG 2026-08-26]

- Dùng chữ "giải pháp" thay cho "nền tảng"; không dùng "OPC" đứng một mình trong tiêu đề. [SoT: CHANGELOG 2026-08-26; Document-Index]
- **Khách mục tiêu:** doanh nghiệp dịch vụ có khách quay lại (Spa, Nha khoa, Phòng khám, Giáo dục, Gym, Ô tô, Du lịch, BĐS, Tài chính, F&B…).
- **Không** phục vụ mô hình sàn TMĐT.
- Taxonomy ngành 2 cấp (10 nhóm ngành) dùng cho onboarding, segment và template. [SoT: docs/06-prototype/jsx-reference/CLAUDE.md]
- AI là hạ tầng vận hành, không phải tính năng bổ trợ. Có human-in-the-loop ở các điểm quyết định. [SoT: SolutionDesign §2, §7]

---

## SCAN REPORT

### TECH_STACK

**Hiện trạng repo:** chỉ có tài liệu (`coding-packs/docs/` kỹ thuật, `specs/` phi kỹ thuật), chưa có `package.json`, chưa có app.

**Stack mục tiêu** (Chủ nhà chốt Next + Nest; các lớp khác lấy từ CTO Architecture v4.2 §09):

| Lớp | Lựa chọn | Nguồn / ghi chú |
|---|---|---|
| Frontend | **Next.js** (App Router) + React + TypeScript strict | Chủ nhà chốt. Spec gốc ghi "React 18 + Vite + TanStack Query" → **Next thay Vite**. Vẫn nên dùng TanStack Query cho data cache. |
| Backend | **NestJS** (TypeScript) | Chủ nhà chốt; khớp spec. Spec gợi ý viết Channel Gateway/Workers bằng Go → **cần chốt**: viết toàn bộ bằng Nest, hay giữ Go cho phần này. |
| Kiến trúc | Modular Monolith; tách sẵn 2 phần chịu tải là Channel Gateway và AI Inference Worker | [SoT: CTO v4.2 §01, §09] |
| DB | PostgreSQL 16 + RLS (`workspace_id`) + pgvector (HNSW) | [SoT: CTO v4.2 §07-09, §20] |
| Cache/Queue | Redis (cache, rate-limit, presence, BullMQ) | [SoT: CTO v4.2 §09] |
| Broker | Kafka/Redpanda | [SoT: CTO v4.2 §09] — **RRI D15:** dùng BullMQ + outbox, chưa dùng Kafka. |
| Realtime | WebSocket + SSE fallback | [SoT: CTO v4.2 §09] |
| Storage | S3-compatible (MinIO/AWS) | |
| Search | OpenSearch (full-text tiếng Việt) | |
| OLAP | ClickHouse + ETL từ broker (Reports) | Thuộc P2 |
| LLM | Claude Haiku/Sonnet/Opus, routing theo tác vụ/chi phí, streaming | OpenFang doc thêm LLM Router đa nhà cung cấp (Gemini/GPT/DeepSeek) |
| Infra | K8s + Helm + Terraform + GitHub Actions; OTel + Prometheus + Grafana + Loki | |
| Font/UI | Plus Jakarta Sans 300–800, JetBrains Mono cho số/mã; icon 24px stroke | [SoT: Design System; UIUX E1] |

### EXISTING_MODULES

Chưa có module code. Dưới đây là **các module nghiệp vụ theo spec**, xếp theo sidebar hiện hành [SoT: SolutionDesign §8.13; CHANGELOG 07-26]:

| # | Module (sidebar) | Bounded context backend (CTO v4.2 §10) | Tài liệu chi tiết |
|---|---|---|---|
| — | Auth & Onboarding (Zalo/Email OTP, social, khai báo DN bắt buộc, trial 15 ngày) | Identity & Workspace | Auth-Wireframe v2, CHANGELOG 08-29 |
| 1 | Tổng quan (Dashboard) | Reporting (read-only) | Dashboard-Spec, Dashboard-Wireframe |
| 2 | Trợ lý AI (Chat · Cowork, phiên, nhật ký, hoàn tác) | AI Agent + Command Orchestrator (Omi) | Assistant-Wireframe |
| 3 | Hộp thư omnichannel (3 cột + Hồ sơ 360°, hội thoại nhóm) | Channel Gateway + Conversation | Inbox-Wireframe |
| 4 | Khách hàng & CRM (flyout 7 trang: Khách hàng · Sản phẩm · Báo giá · Hợp đồng · Đơn · Hoá đơn · Loyalty) | Contact/CRM360 + Sales Docs + Loyalty | Customers-Wireframe |
| 5 | Hỗ trợ (Tickets) | Ticket/SLA | Tickets-Spec |
| 6 | Marketing (AI đề xuất chiến dịch, broadcast ZNS/Email/SMS, phê duyệt) | Marketing | Marketing-Spec |
| 7 | Lịch hẹn (9 trạng thái, chống trùng nhân sự/phòng/thiết bị) | Calendar/Booking | Appointments-Spec |
| 8 | Gọi điện (Call Center, IVR, AI Voice, webphone) | (Call Center — chưa có trong 13 service) | SRS §08 |
| 9 | AI Agents (45 mẫu, builder, RAG, ngưỡng tin cậy) | AI Agent & RAG | Agents-Workflow-Flow |
| 10 | Quy trình (Workflow builder, 70 mẫu, 9 loại node) | Workflow Engine | Agents-Workflow-Flow |
| 11 | Báo cáo (10 trang, 5 nhóm) — **đã gỡ khỏi sidebar 07-26** | Reporting/BI | SRS §14, CTO §10.13 |
| — | Cài đặt (40–54 trang; trong đó có SLA, KPI, phân ca, phòng ban, sơ đồ tổ chức, RBAC, kênh, tích hợp, Ví, Affiliate) | Identity + Billing + nhiều module | SLA-Spec, SolutionDesign §8.15 |
| — | Billing & Ví Credit (gói, nạp VietQR, chuyển khoản thủ công, hoá đơn) | Billing & Token Metering | CTO §10.12, SRS §21 |

**Cây component App Shell** [SoT: UIUX E2 / tổng quan.pdf]:
```
App
├─ AuthGate (Login · OTP · Workspace picker)
└─ AppShell
   ├─ NavRail (Logo · Nav items · Flyout CRM/Báo cáo/Cài đặt · UserMenu)
   ├─ TopBar (Search · Notif · Help · WorkspaceSwitch)
   ├─ ModuleRouter
   │  ├─ DashboardView (KPIGrid · AgentPanel · StaffTable)
   │  ├─ AssistantView (ChatCommand · Sessions · ActionLog)
   │  ├─ InboxView (ConvList · ChatWindow · CustomerPanel · AI AssistPanel)
   │  ├─ CustomersView (Table · CustomField · DetailPanel)
   │  ├─ MarketingView (CampaignList · BroadcastWizard · Email/Zalo/SMS)
   │  ├─ SalesViews (Quotes · Orders · Contracts · Products)
   │  ├─ TicketsView · CalendarView · CallCenterView · LoyaltyView · ReportsView
   │  └─ SettingsView (Config · Wallet · Affiliate · Channels · RBAC)
   └─ GlobalOverlays (ConnectChannelModal · WalletModal · Toasts)
```

### PATTERNS_DETECTED (từ spec — sẽ thành chuẩn code)

- **Multi-tenant:**
  - Shared DB + `workspace_id` trên mọi bảng + PostgreSQL RLS (`current_setting('app.tenant')`).
  - Mọi request mang `X-Workspace-Id`; middleware kiểm membership rồi mới set tenant.
  - Membership N–N: một user thuộc nhiều workspace. [SoT: CTO §07-08, §10.1]
- **API:**
  - REST `/v1`, contract-first (OpenAPI 3.1), phân trang cursor `{data, next_cursor}`.
  - Lỗi trả `{error:{code,message,fields}}`.
  - Header `Idempotency-Key` cho mọi POST ghi; `X-RateLimit-*`. [SoT: CTO §19.5]
- **Event-driven:**
  - Domain events: `message.received`, `quote.won`, `order.completed`, `ticket.sla_breach_risk`, `campaign.approved`, `ai.token_used`, `contact.merged`, `workflow.triggered`.
  - Outbox pattern; consumer idempotent theo event id. [SoT: CTO §04; SRS §25]
- **Messaging:**
  - Webhook → chuẩn hoá → lưu → đẩy WS.
  - Chống trùng bằng `UNIQUE(channel_account_id, channel_msg_id)`.
  - Bảng `message` partition theo tháng.
  - Outbound qua outbox, retry back-off 2^n, dead-letter. [SoT: CTO §05, §14.3, §15.2]
- **AI:**
  - Model routing; RAG (pgvector HNSW + re-rank + trích nguồn).
  - Ngưỡng tin cậy **≥70%** thì tự xử; dưới ngưỡng thì handoff kèm tóm tắt.
  - Lọc PII trước khi đưa vào prompt; mọi hành động AI ghi log và **hoàn tác được**.
  - Ép duyệt người với việc chạm tiền, gửi hàng loạt, sửa hợp đồng.
  - Trợ lý (Omi) không thực thi khi chưa có xác nhận rõ ràng (BR-05). [SoT: CTO §06, §10.9; Agents-Workflow-Flow; Assistant-Wireframe]
- **State machines** có bảng chuyển trạng thái chặt cho: Conversation, Ticket, Order, Campaign, Appointment (9 trạng thái), Quote (version n+1 khi bị từ chối). [SoT: CTO §13; Appointments-Spec; Tickets-Spec]
- **SLA engine dùng chung:**
  - Chính sách có 4 ngưỡng (FRT/TTR × AI/người). Chính sách cụ thể nhất thắng; luôn có chính sách mặc định không xoá được.
  - Chỉ áp cho việc mới. Đồng hồ tạm dừng ở trạng thái "Đang chờ" và ngoài giờ (chỉ với người).
  - Leo thang 4 cấp. [SoT: SLA-Spec]
- **Khoá mềm** "đang có người xem / quy trình đang chạy", tự gỡ sau 15 phút. [SoT: Dashboard/Tickets/Appointments Spec]
- **UI patterns:**
  - App-shell; master-detail; list ⇄ kanban; wizard/stepper; filter bar; Panel 360°; drawer.
  - 5 trạng thái bắt buộc: Empty / Loading-skeleton / Loaded / Error-retry / Confirm.
  - Cột "AI gợi ý" kèm nút "Giao AI" trên từng dòng; bulk actions có hoàn tác theo lô. [SoT: UIUX E1; Design System]
- **Custom fields động theo tenant/ngành:**
  - Kiểu dữ liệu: Text, Number, Currency, Date, Email, Phone, Picklist, Lookup, Subform, File, Textarea.
  - Tự áp vào list, kanban, form, filter, detail, import/export. [SoT: Customers-Wireframe; SolutionDesign §6.2]

### REUSABLE_COMPONENTS

Chưa có component code. Các khối dựng một lần rồi dùng chung toàn app [SoT: UIUX E1]:
- **Điều hướng:** NavRail (230↔80px, bản spec 54px), Flyout, TopBar, Tab.
- **Dữ liệu:** KPI card, Table (cột tuỳ biến, AI gợi ý, bulk), Kanban (kéo-thả), Timeline, Chart.
- **Nhập liệu:** Text/Select, Search (không dấu), Toggle, Checkbox, Custom-field renderer, Lookup.
- **Phản hồi:** Modal, Toast, Badge, **SLA countdown** (3 màu).
- **Overlay:** Popover, Drawer, **Panel 360°**.
- **Builder:** Workflow canvas (node-based), Rule builder KHI·NẾU·THÌ (Loyalty), Campaign wizard.
- **Prototype tham chiếu UI:** `docs/06-prototype/jsx-reference/components/*.jsx` (~43k LoC) và `AppChat Ultimate.html`. Chỉ dùng để tham chiếu giao diện, không port nguyên code. Chi tiết ở mục *Prototype* bên dưới.

### GAPS_DETECTED

| # | Gap | Ảnh hưởng |
|---|---|---|
| G1 | Chưa có OpenAPI 3.1 đầy đủ; chỉ có 5 endpoint mẫu (CTO §19) | Cần thiết kế API per-module ở Blueprint |
| G2 | DDL chỉ có mẫu `workspace`, `contact`, `message` (CTO §20); ERD ở mức trường chính | Cần ERD và migration đầy đủ |
| G3 | `AppChat-Trial-Spec.dc.html` rỗng (206 byte); trial chỉ có trong CHANGELOG 08-29 | Lấy CHANGELOG làm nguồn |
| G4 | Call Center không có bounded context trong 13 service; cần nhà cung cấp SIP (tham chiếu StringeeX) | ✅ RRI D07: chưa làm |
| G5 | Danh mục đổi thưởng Loyalty đã bị xoá, nên không còn chỗ cấu hình việc *dùng* điểm | Lỗ hổng nghiệp vụ |
| G6 | Chưa có đặc tả Báo cáo chi tiết (10 trang); menu đã gỡ khỏi sidebar | Báo cáo đọc từ Postgres (RRI D08) |
| G7 | Tích hợp kênh thật (Zalo OA/ZNS, Meta, TikTok…) cần app, đăng ký và duyệt template | Phụ thuộc bên ngoài, cần sandbox |
| G8 | Chưa có test plan chi tiết. Chỉ có chiến lược (CTO §26) và AC mẫu Given/When/Then (SRS §22) | Viết khi làm TIP |

### CODE_HEALTH

Chưa có code. Chuẩn kỹ thuật đã định sẵn [SoT: CTO §18 + CLAUDE.md global]:
- TypeScript strict, ESLint + Prettier, Conventional Commits, trunk-based, PR có review + CI xanh.
- **Test:**
  - Unit (domain, ≥80% lõi).
  - Integration (Testcontainers).
  - Contract (Pact/Dredd).
  - E2E (Playwright).
  - Tenant-isolation (0 rò rỉ).
  - Load (k6, p95 < 1s).
  - AI eval.
- **Definition of Done:** có test + OpenAPI cập nhật + RLS test + OTel metric/log/trace + idempotency cho thao tác gửi/tạo.
- **Giới hạn kích thước file (CLAUDE.md global):**
  - Backend: tối ưu 200–400 dòng, **trần 600** (chạm 500 thì tách submodule).
  - Frontend: tối ưu 150–250 dòng, **trần 400**. Screen chỉ làm orchestrator; tách `components/`, `hooks/`, `types.ts`.
  - Test để ở file riêng.

### ESTIMATED_SIZE

| Hạng mục | Ước lượng |
|---|---|
| Module nghiệp vụ | 12–17 (tuỳ cách đếm) + Auth + Billing + Settings (40–54 trang) |
| Bảng DB | ~60–80 (13 bounded context; đã liệt kê ~35 bảng trong CTO §15) |
| API endpoints | ~200+ |
| Màn hình / route FE | ~90–110 (sidebar + 7 trang CRM + 40–54 trang Cài đặt + builder) |
| FR trong SRS | 170+ (MUST/SHOULD/COULD) |
| Prototype tham chiếu | 45 file JSX, ~43k LoC |
| WBS thiết kế UI/UX (đã làm) | 119 man-day [SoT: index.md] |

---

## Prototype (UI reference)

- **Vị trí:** prototype mới nhất là `docs/06-prototype/AppChat.dc.html`. Source JSX đọc được ở `docs/06-prototype/jsx-reference/` gồm `AppChat Ultimate.html`, `components/*.jsx` (45 file, ~43k LoC), `styles.css`.
- **Bản offline:** `AppChat (standalone).html`, `AppChat.dc.html`.
- **Quy ước của prototype:** sửa trong `components/*.jsx`, bump `?v=`, build standalone. Toàn bộ UI mặc định tiếng Việt.
- **Dùng làm gì:** nguồn chân lý về **bố cục, nhãn tiếng Việt, luồng UI và mock data shape**.
- **Không dùng làm gì:** không tái sử dụng code (React-in-browser, state dồn vào localStorage `ac_*`).
- *(Chi tiết file → module, mock data và design token được bổ sung bên dưới sau khi quét xong.)*

**Cách prototype chạy:**
- React 18.3.1 UMD và Babel standalone biên dịch JSX ngay trong trình duyệt.
- Mỗi file là một IIFE, export ra `window`; các file load sau ghi đè file trước.
- Không có router: `App.active` tra trong mảng `MODULES`, `SafeMod` render `window[mod]`.
- Dữ liệu dùng chung qua `window.AppTags`, `window.AppFlow`, `window.AppLoyalty` và bus `CustomEvent`.
- localStorage đóng vai DB (`ac_authed`, `ac_module`, `ac_settings`, `ac_tags_v2`, `ac_workflows_v1`, `ac_org_v2`, `ac_onboarding_v1`, `ac_translate`).

**⚠️ Nguồn chân lý trong prototype:**
- `components/_bundle.jsx` (18.454 dòng) là bản ghép 23 module và là **bản mới nhất**. Các file lẻ cùng tên (`contacts.jsx`, `settings.jsx`, …) là **bản cũ**, không được port từ chúng.
- Code thực sự chạy: `tag-store.jsx` + `_bundle.jsx` + 19 file overlay (ghi đè) ≈ 26,5k dòng.
- `reports-module.jsx` không được load, nhưng có bộ chart SVG tốt nhất.

**File → module (live):**

| Module | Nguồn live |
|---|---|
| Auth (Login / Register 5 bước / Forgot + OTP) | bundle: auth |
| Tổng quan | `dashboard-v2.jsx` (ghi đè), gồm `onboarding.jsx` và `followup-module.jsx` |
| Trợ lý AI (Omi, 5 chế độ, action log) | `omi-assistant.jsx` |
| Hộp thư 3 cột | bundle: messages (2.095 dòng: FolderRail, ConversationList, ChatThread, MsgBubble, AISuggestionCard, Composer, ContextPanel) |
| Khách hàng (Zoho-style; stage tabs Lead mới → … → Đã mua) | bundle: contacts (1.627) |
| Hồ sơ 360° | `customer-360-panel.jsx` (panel live); `customer-360.jsx` (11 tab, tham chiếu aggregate Customer) |
| Báo giá / Hợp đồng | `crm-docs.jsx` |
| Sản phẩm / Đơn | `sales-module.jsx` |
| Loyalty | `loyalty-module.jsx` |
| Hỗ trợ (Tickets, kanban, SLA, AI auto) | `tickets-module.jsx` |
| Marketing (campaigns, approvals, wizard 4 bước, Template Studio) | bundle: activities-broadcast, campaign-wizard, deals-templates |
| Lịch hẹn (tuần/ngày/list, link đặt lịch) | bundle: booking |
| Gọi điện + cấu hình tổng đài (7 mục) + WebPhone nổi | `call-center.jsx`, `webphone.jsx` |
| AI Agents (list + builder 2 panel: cấu hình / chat test) | bundle: rest (`AutomationModule`), `ai-agent-builder.jsx` |
| Quy trình (editor dạng list bước + trình duyệt mẫu) | `workflow.jsx`; canvas tự do ở bundle: journey-builder |
| Báo cáo 10 trang / 5 nhóm | `reports-v2.jsx` |
| Cài đặt | bundle: settings (2.127) + `org-settings.jsx` (Sơ đồ tổ chức / SLA / KPI / Phân ca) + `billing-page.jsx` + `widget-growth.jsx` + `channel-connect-modal.jsx` |
| Có UI nhưng không có đường vào (tham khảo cho backlog) | Deals pipeline + Forecast, Help Center, Membership, Reviews, Phòng & tài nguyên, Phân ca/Payroll, Kho, Dashboard Builder, Training Studio (persona / golden set / eval / canary) |

**Sidebar thực tế của prototype:**

| # | Mục | Ghi chú |
|---|---|---|
| 1 | Tổng quan | |
| 2 | Trợ lý AI | flyout: Phiên, Nhật ký |
| 3 | Hộp thư | |
| 4 | Khách hàng | flyout: Khách hàng · Báo giá · Hợp đồng · Đơn · Sản phẩm · Loyalty · Call Center · Marketing |
| 5 | Hỗ trợ | |
| 6 | Lịch hẹn | |
| 7 | AI Agents | |
| 8 | Quy trình | |
| 9 | Báo cáo | flyout 5 nhóm, 10 trang |

Footer: avatar (đổi workspace) · Cài đặt · Thông báo · Trợ giúp.

**Cài đặt trong code:**
- **32 trang / 9 nhóm** trong nav, cộng 3 trang ẩn (`branding`, `hours`, `usage`).
- Con số "54 trang" (CHANGELOG) và "40 trang" (SolutionDesign) **không khớp code**. Có thể đã tính cả các mục con, ví dụ Widget 8 pane, Call Center 7 mục, Billing.

**Mock data:** `data.jsx` cùng seed của từng module đã cho đủ shape cho Conversation (`aiMode` manual|copilot|auto), Message, Contact, Customer360, Ticket, Deal, Quote, Contract, Product, Order, Appointment, Follow-up, Campaign, Template (`{{var}}` blocks), Workflow (11 loại node), Journey, AI Agent, File (RAG), Tag, Loyalty member, Org node, Billing plan. Khi chuyển sang data model thật cần sửa:
- Ngày và tiền đang là string.
- Tham chiếu đang theo tên thay vì ID.
- Enum lẫn Việt/Anh.

**Design token** (`styles.css`):

| Nhóm | Giá trị |
|---|---|
| Primary ramp | `#0F5D30 → #157A40 → #1F9C4F → #2DC56A → #58D28A → #8AE0AC → #BCEDCC`; soft `#E8F8EE` |
| Label | `#231F20 / #6B7280 / #9CA3AF / #D1D5DB` |
| Fill | `#FFF / #F9FAFB / #F3F4F6 / #E5E7EB` |
| System | success `#2DC56A`, process `#4B6CFF`, warning `#FFB547`, error `#FF5A3C`, premium `#6E48E6`, info `#2B9EF3` |
| Gradient | signature `45deg #2DC56A→#2B9EF3` (accent AI) |
| Radius | 6 / 10 / 14 / 20 |
| Kích thước | rail 80px, topbar 58px, button 36px (sm 30px), chip 22px |
| Icon | 101 SVG, Lucide-style, 24px, stroke 1.6 |

⚠️ Hai bộ token đang lệch nhau:
- **Design System** dùng warn `#F5A830`, danger `#E33F3F`, AI `#8B5CF6`, ink `#0E1B13`.
- **Prototype CSS** dùng các giá trị ở bảng trên; ngoài ra có 10 biến CSS dùng mà không định nghĩa, và 296 mã hex rời.

→ Cần chốt một bộ token duy nhất.

**Không tái sử dụng được:**
- window globals, Babel trong trình duyệt, localStorage làm DB, cờ `ac_authed` làm auth.
- Không có URL routing hay deep-link.
- Khoảng 11,7k style inline; không a11y; viewport cố định 1440px.
- Không có lớp i18n: chuỗi tiếng Việt hard-code. Settings → Ngôn ngữ chỉ là dropdown giả với VI/EN/中文.
- Còn khoảng 62 tham chiếu Shopee/Lazada/TikTok Shop/Sourcing, trái với quyết định "không phục vụ TMĐT".

**Nên port thành component typed** (lấy làm UX spec, viết lại code):
- AppShell: NavRail + Flyout theo route config.
- Inbox 3 pane.
- Customer360Panel.
- Bộ `DataTable` + `FilterBar` + `KpiStrip` dùng chung.
- `KanbanBoard` dùng chung.
- `Drawer` primitive.
- Workflow editor và Journey canvas (React Flow).
- AI Agent Builder.
- Campaign Wizard và Template Studio.
- Calendar time-grid theo lane nhân sự.
- Org tree.
- Settings shell (nav nhóm, có tìm kiếm).
- WebPhone nổi.
- ChannelConnectModal.
- Billing: ma trận gói và QR modal.

---

## Nguồn tài liệu & thứ tự ưu tiên (Source of Truth)

Khi tài liệu mâu thuẫn, áp **thứ tự ưu tiên** sau (mới và cụ thể thắng cũ và tổng quát):

1. **`docs/CHANGELOG.md`** (07/2026 → 27/10/2026): quyết định nghiệp vụ mới nhất.
2. **Spec module chi tiết (08/2026):**
   - Tickets-Spec, SLA-Spec, Appointments-Spec, Dashboard-Spec, Marketing-Spec, Agents-Workflow-Flow.
   - 5 Wireframe: Auth, Dashboard, Assistant, Inbox, Customers.
3. **`docs/01-requirements/SRS-v4.0.html`**: FR/NFR/BR, RBAC 7 vai trò.
4. **`docs/02-architecture/CTO-Architecture-v4.2.html`**: kiến trúc, ERD, events, API, DDL, NFR/SLO, RBAC 4 vai trò.
5. **`UIUX-Architecture.dc.html` = `tổng quan.pdf`**: sơ đồ A1–G2, sitemap 17 module, cây component, ER.
6. **`AppChat-SolutionDesign-v1.1.dc.html` (v2.7)**: menu, 40 trang Cài đặt, mô tả module.
7. **`AppChat-SDD.dc.html` (v1.0)**: bản gốc, đã bị thay thế bởi các tài liệu trên.
8. **`AppChat-OpenFang-Architecture` (23/10/2026)**: đề xuất nhúng runtime đa tác nhân OpenFang sau một Agent Gateway. **Chưa chốt áp dụng.**
9. **Chỉ tham khảo lịch sử:** Feature Audit (05/2026, có Sourcing/Deals/Journey đã loại bỏ); các bản v1–v3 cũ trong `uploads/`.
10. **Ngoài phạm vi code:** Brand / Marketing / Deck / Portfolio / PPTX / DOCX (tài liệu thương hiệu và bán hàng).

---

## Auto-Answered Requirements (bỏ qua ở RRI)

| Câu hỏi RRI | Đã trả lời bởi spec |
|---|---|
| Đối tượng người dùng? | Chủ DN dịch vụ, nhân sự Sales/CSKH/MKT/Quản lý, AI Agent [SRS §03; SolutionDesign §4.1] |
| Multi-tenant? | Có: shared DB + RLS; user ↔ nhiều workspace; billing tách theo workspace [CTO §08; BR-08] |
| Ngôn ngữ UI? | Mặc định Tiếng Việt; có selector đa ngôn ngữ (10–11) [CHANGELOG 07-26] |
| Platform? | Desktop web trước (1440px). Native mobile/PWA là out-of-scope [SRS §01] |
| Đăng nhập? | Zalo OTP chính + Email/mật khẩu + social (Google/FB/LinkedIn/ChatGPT/Gemini/DeepSeek). **Không SMS OTP** [Auth-Wireframe v2; SRS §01] |
| Khai báo bắt buộc? | Popup không đóng được: tra MST (DN/Hộ KD) hoặc VNeID (Cá nhân), rồi chọn lĩnh vực [Auth-Wireframe] |
| Trial? | Cá nhân Pro 15 ngày, 10.000 credit; hết hạn hạ về Miễn phí, dữ liệu giữ nguyên, thông báo đóng được [CHANGELOG 08-29] |
| Đơn vị tính phí AI? | **Credit** (1 credit = 10 token cũ); ẩn tên model với khách [CHANGELOG 07-28] |
| Thanh toán? | VietQR/Napas 247 (IPN tự đối soát, QR hết hạn 15 phút) + chuyển khoản thủ công (pending_review → đối soát); idempotent theo invoice_id [CTO §10.12, §14.4] |
| Luồng bán hàng? | Báo giá → (Win) → Hợp đồng → Đơn → Hoá đơn → cộng điểm Loyalty; pipeline tự cập nhật [BR-09; CTO §14.2] |
| AI tự xử khi nào? | Tin cậy ≥70% và trong phạm vi RAG; ép duyệt người với việc chạm tiền / gửi hàng loạt / hợp đồng [Agents-Workflow-Flow] |
| Audit? | Mọi hành động người và AI; lưu 1 năm WORM [CTO §12, §21] |
| NFR? | Tin nhắn hiển thị p95 <1s (CTO) / <3s (SRS); API đọc p95 <300ms; 99.9%; RPO ≤5', RTO ≤1h [CTO §12; SRS §19] |
| Tuân thủ? | NĐ13 / GDPR / PDPA, ISO 42001, right-to-be-forgotten (ẩn danh hoá) [SRS NFR-05; CTO §21] |
| Design tokens? | Primary #2DC56A; Info #2B9EF3; Warn #F5A830; Danger #E33F3F; AI #8B5CF6; Plus Jakarta Sans; grid 4px [Design System] |

---

## Constraints

1. **Stack:** Next.js + NestJS + TypeScript strict + PostgreSQL 16 (RLS, pgvector) + Redis. Không dùng lại code V1.
2. **Tenant isolation không thương lượng:** mọi bảng nghiệp vụ có `workspace_id` cộng RLS; có test tự động chống rò rỉ.
3. **Truy vấn Postgres** theo CLAUDE.md global:
   - Composite index theo thứ tự "bằng trước, khoảng/sort sau".
   - Dùng `INCLUDE` để có covering index.
   - Deferred join khi phân trang bảng lớn.
   - Partial index và expression index (ví dụ `LOWER(email)`, tìm kiếm không dấu).
4. **API-first:** OpenAPI là nguồn chân lý. Idempotency-Key cho POST ghi. Side-effect đi qua domain event, không gọi DB chéo module.
5. **Anti-monolith:** BE ≤600 dòng/file, FE ≤400 dòng/file; test để file riêng.
6. **Git:** commit ngay khi xong và test pass; báo DONE phải kèm Git SHA; không để code uncommitted.
7. **UI:** tiếng Việt mặc định; bám prototype và Design System; đủ 5 trạng thái UI; WCAG AA.
8. **AI governance:** log và hoàn tác mọi hành động AI; HITL; lọc PII; không gọi LLM đồng bộ trong request UI (stream qua WS).

---

## Risks / Tech Debt (mâu thuẫn trong spec — CẦN CHỐT ở RRI)

| # | Mâu thuẫn | Các phương án trong spec | Đề xuất mặc định |
|---|---|---|---|
| R1 | **Phạm vi quá lớn** (17 module, 170+ FR, 19 kênh) | CTO roadmap P0→P3 | Theo CTO: P0 = Identity/RLS + Gateway (Zalo/FB/Web) + Inbox realtime; P1 = CRM, Sales, Ticket/SLA, Calendar, AI+RAG, Billing |
| R2 | Đơn vị tính phí | Token (SRS/CTO) / **Credit** (CHANGELOG 07-28) | Credit (mới hơn) |
| R3 | Hết credit / vượt ngưỡng | chuyển model rẻ (CHANGELOG) / chặn và gợi ý nạp (Assistant UC-18) / khoá AI ở 5tr₫ (BR-06) | Cần chốt |
| R4 | Giá gói Team/Business/Ultimate | 5,9/12,9/24,9tr / 2,9/6,9/14,9tr / 2,4/6tr (CTO §28) | Cần chốt (để cấu hình được) |
| R5 | Công thức Loyalty | sàn(tiền/1.000), 10đ = 1.000₫ (SRS) / 10.000₫ = 1đ, 100đ = 10.000₫, nhân theo hạng (CHANGELOG) | Rule builder cấu hình được (CHANGELOG) |
| R6 | RBAC | 4 vai trò (CTO) / 5 (Design System) / 7 (SRS) | Vai trò tuỳ biến + seed mặc định |
| R7 | Số kênh | 12 / 15 / 17 / 18 / 19 | ✅ RRI D04: Zalo cá nhân + Web + Email |
| R8 | Sidebar / số module | 11 / 12 / 13 / 17; Báo cáo bị gỡ; Loyalty nằm ở 2 chỗ | Theo CHANGELOG 07-26 |
| R9 | Dashboard KPI | 4 bộ KPI; 08-01 gỡ khối số liệu, thay bằng sơ đồ kiến trúc | Theo Dashboard-Spec + CHANGELOG |
| R10 | Mobile-first hay Desktop-first | SDD/Spec module ghi mobile-first / SRS + Design System ghi desktop-first 1440 | Desktop-first, responsive |
| R11 | Hồ sơ 360°: 4 hay 5 tab, ở module nào | | 5 tab; chỉ ở Khách hàng, Báo giá, Inbox |
| R12 | **OpenFang** (runtime đa tác nhân bên ngoài, v0.1.0) | Có / không nhúng | Thiết kế **Agent Gateway** làm interface; **chưa chốt — OQ-01** |
| R13 | Go cho Channel Gateway/Worker | Spec ghi Go / Chủ nhà chọn Nest | Toàn bộ NestJS (monorepo, worker riêng) |
| R14 | Kafka hay BullMQ | | BullMQ + outbox; Kafka khi scale |
| R15 | Call Center (SIP/StringeeX), OpenSearch, ClickHouse | Nhiều hạ tầng nặng | ✅ RRI D07/D15: chưa làm Call Center; dùng Postgres FTS (unaccent + pg_trgm) trước |
| R17 | Design token: Design System và `styles.css` của prototype lệch nhau | warn/danger/AI/ink khác giá trị | Chốt một bộ token trước khi dựng UI kit |
| R18 | Số trang Cài đặt: 54 (CHANGELOG), 40 (SolutionDesign), 32 nav + 3 ẩn (code) | | Lấy code prototype làm danh mục gốc |
| R19 | i18n: spec ghi 10–11 ngôn ngữ, nhưng prototype không có lớp i18n | | Dựng next-intl từ đầu; giai đoạn đầu vi + en |
| R16 | Phụ thuộc bên ngoài | Zalo OA/ZNS (duyệt template), Meta App Review, tra cứu MST, VietQR/bank IPN | Thiết kế adapter + mock/sandbox; rủi ro tiến độ |

---

## Quality Gate: Self-Review

- **Completeness (13 mục; 12 đạt, 1 một phần):**
  - ✅ Tech stack, có phiên bản ở mức đã biết.
  - ✅ Routes/pages: module, sidebar và 32 trang Cài đặt lấy từ prototype.
  - ✅ DB schema ở mức ERD (CTO §15, UIUX G1).
  - ✅ Patterns.
  - ✅ Code health (chuẩn định sẵn).
  - ✅ Resolved decisions (CHANGELOG).
  - ✅ Architecture.
  - ✅ Data flow (G2, CTO §05).
  - ✅ Integrations.
  - ✅ Security / RBAC.
  - ✅ NFR.
  - ✅ Auto-answered list, constraints, risks.
  - ⚠️ Phase 1 acceptance: chỉ có AC mẫu.
- **Cross-reference:** khớp với spec gốc. Đã liệt kê 19 mâu thuẫn ở bảng Risks (R1–R19).
- **Gaps:** G1–G8 ở trên.
- **Action needed:** chốt R1–R4, R12–R15 và R17 ở `/vibecode:rri`.

---

## VISION

> Vibecode Kit v5.0 — BƯỚC 3 (VISION) · 2026-10-28 · **Chờ Chủ nhà duyệt**
> Upstream: Scan Report (trên) + `01-REQUIREMENTS-MATRIX.md` (RRI, D01–D16)

### PROJECT TYPE: Pattern B — SaaS Application (đa tenant, AI-native)

AppChat là SaaS đa tenant theo mô hình OPC: một chủ doanh nghiệp vận hành cả công ty cùng đội AI Agents.
- **Trung tâm** là **Trợ lý AI**: vừa là orchestrator điều phối các agent chuyên trách, vừa là copilot làm được mọi thao tác có trên UI.
- **Các module nghiệp vụ** (Hộp thư, CRM, Lịch hẹn, Ticket, Marketing, Loyalty, Báo cáo) là nơi hiển thị và quản lý những gì AI đã làm.

### ARCHITECTURE VISION

```
 Khách cuối: Zalo cá nhân · Web widget · Email          Chủ DN / Member (trình duyệt)
        │                                                        │
        ▼                                                        ▼
┌────────────────────────┐                   ┌──────────────────────────────────────────┐
│ WORKER: Channel Gateway │                   │ apps/web — Next.js (App Router)           │
│  zalo-personal (zca-js, │                   │  App shell · module · Settings            │
│   session theo tenant)  │                   │  Trợ lý AI dock (Ctrl+K) · UI Command Bus │
│  · webchat · email      │                   │  (điều hướng, mở drawer, điền form, lọc)  │
│  inbound → normalize →  │                   └───────────────┬──────────────────────────┘
│  dedupe → outbox send   │                                   │ REST /v1 + Socket.IO
└─────────┬──────────────┘                                   ▼
          │ events (BullMQ)          ┌──────────────────────────────────────────────────┐
          └─────────────────────────▶│ apps/api — NestJS (modular monolith)              │
                                     │  Auth/Workspace · Inbox · CRM · Sales · Booking   │
                                     │  Ticket/SLA · Marketing · Loyalty · Billing ·     │
                                     │  Reports · Settings                               │
                                     │ ┌──────────────────────────────────────────────┐ │
                                     │ │ ★ ACTION REGISTRY (packages/actions)          │ │
                                     │ │  mỗi action: zod schema · quyền · rủi ro ·    │ │
                                     │ │  cần xác nhận? · handler · undo · audit       │ │
                                     │ │  ← UI gọi qua REST  ← AI gọi qua tool-use     │ │
                                     │ │  ← runtime ngoài gọi qua MCP server           │ │
                                     │ └──────────────────────────────────────────────┘ │
                                     └──────────────┬───────────────────────────────────┘
                                                    │ jobs / events
                                     ┌──────────────▼───────────────────────────────────┐
                                     │ WORKER: AI Runtime (NestJS standalone)            │
                                     │  Trợ lý AI = Orchestrator + Copilot               │
                                     │   plan → giao agent → theo dõi → tổng hợp         │
                                     │  AI Agents: Sales · CSKH · Booking · Marketing ·  │
                                     │   Kế toán · Vận hành (tools = tập con Registry)   │
                                     │  ┌── AGENT GATEWAY (interface của AppChat) ────┐ │
                                     │  │ run · resume(approval) · handoff · cancel    │ │
                                     │  │ engine: Vercel AI SDK v7 (ToolLoopAgent)     │ │
                                     │  │ Policy Guard · Credit Meter · Audit          │ │
                                     │  └──────────────────────────────────────────────┘ │
                                     │  LLM Router: Claude · GPT · Gemini · DeepSeek     │
                                     │  RAG (pgvector) · Memory theo tenant/khách        │
                                     │  Scheduler (BullMQ repeatable): follow-up, nhắc,  │
                                     │   briefing, tác vụ tự chủ                         │
                                     └──────────────┬───────────────────────────────────┘
                                                    ▼
      PostgreSQL 16 (RLS workspace_id · pgvector · unaccent/pg_trgm · materialized view báo cáo)
      Redis (BullMQ · cache · presence · rate-limit) · Object storage (S3-compatible)
      — chạy native, không Docker; tiến trình quản lý bằng PM2/systemd —
```

**Monorepo (pnpm workspaces):**

| Thư mục | Vai trò |
|---|---|
| `apps/web` | Next.js |
| `apps/api` | NestJS HTTP + Socket.IO |
| `apps/worker` | NestJS standalone, chạy hai role: `channels` và `ai` |
| `packages/actions` | Action Registry: schema và metadata dùng chung FE/BE/AI |
| `packages/db` | Prisma schema, migration, SQL RLS |
| `packages/ui` | design system |
| `packages/shared` | types, enums, i18n keys |

**Luồng chính:**

1. **Tin đến**
   - Adapter nhận tin, chuẩn hoá, dedupe, lưu, đẩy qua WS.
   - Nếu hội thoại đang ở `ai_mode=auto` → giao cho agent trực kênh.
   - Agent chạy qua Agent Gateway và gọi action.
   - Action có rủi ro cao → tạo bản ghi chờ duyệt. Ngược lại → trả lời qua outbox.
2. **Lệnh Trợ lý**
   - Phân loại ý định, rồi lập kế hoạch.
   - Thao tác đọc thì chạy ngay. Thao tác ghi, gửi, xoá, chạm tiền thì hiện thẻ xem trước (diff), người dùng xác nhận mới chạy.
   - Đẩy lệnh điều khiển UI qua Command Bus (ví dụ mở bản ghi, điền form).
   - Ghi nhật ký kèm thông tin hoàn tác.
3. **Mọi lần gọi LLM**
   - Ghi `usage` vào ledger, quy ra credit, trừ ví.
   - Ví hết → chặn AI và chuyển hội thoại về người.

### AGENT RUNTIME — so sánh và đề xuất (OQ-01)

Dữ liệu tra cứu ngày 2026-10-28 qua GitHub/npm và tài liệu chính thức. Các mục ⚠ là thông tin chưa kiểm chứng trong code.

| | OpenFang | OpenClaw | Hermes Agent | **Vercel AI SDK v7** | Mastra |
|---|---|---|---|---|---|
| Repo | RightNow-AI/openfang | openclaw/openclaw | NousResearch/hermes-agent | vercel/ai | mastra-ai/mastra |
| Ngôn ngữ | Rust | TypeScript | Python | TypeScript | TypeScript |
| License | MIT/Apache-2.0 | MIT | MIT | Apache-2.0 | Apache-2.0 (trừ thư mục `ee/`) |
| Phiên bản | v0.6.9 (05/2026), pre-1.0, ít release từ tháng 5 | v2026.10.x, release liên tục | v0.22.5 (10/2026) | 7.0.154 (10/2026) | 1.79 (10/2026) |
| Mô hình | daemon cho 1 operator | gateway cho 1 trust boundary, tự ghi "không phải ranh giới multi-tenant" | 1 profile/process mỗi user | thư viện, nhúng vào worker | thư viện, nhúng vào worker |
| Đa tenant | ✗ | ✗ | ✗ | tự làm (RLS của ta) | tự làm (`resourceId`) |
| HITL | approval gate | exec approval | approval endpoint | `toolApproval` | `requireApproval`, suspend/resume bền qua restart |
| Bảo mật | đã vá auth bypass (#1034) | nhiều CVE RCE năm 2026 | nhiều CVE năm 2026 | lib, không có bề mặt server | lib |
| Zalo | README nhận có, **không tìm thấy code** ⚠ | **có sẵn chính chủ**: `zalouser` (zca-js) + `zalo` Bot API | plugin cộng đồng | — | — |

**Đề xuất: không fork runtime nào. Tự xây Agent Gateway trong NestJS, engine là Vercel AI SDK v7. Mastra để dành.**
- **Vì sao không fork:** cả ba runtime đều thiết kế cho một người vận hành, có state store riêng (SQLite) và tool trên máy chủ. Muốn đa tenant (RLS), tính credit theo tenant, lưu duyệt trong DB và dùng Action Registry của ta thì phải mổ lõi của chúng. Thêm vào đó, hai trong ba runtime khác ngôn ngữ (Rust/Python).
- **Vì sao chọn AI SDK v7:** cùng ngôn ngữ TS; có sẵn tool loop, đa provider (Claude/GPT/Gemini/DeepSeek), streaming và tool approval. Nó chỉ là thư viện nên không mở thêm bề mặt tấn công.
- **Mastra:** chỉ thêm vào nếu spike cho thấy suspend/resume bền, cron và memory của nó tiết kiệm công đáng kể so với tự làm bằng BullMQ + Postgres.
- **Mượn thiết kế từng nơi:**
  - **OpenClaw `zalouser`** (MIT): cách quản lý credential, vòng đời listener, dedupe message id, group policy, chuyển markdown sang rich text Zalo, health probe. Có thể vendor rồi viết lại để session lưu theo tenant trong DB của ta.
  - **OpenFang:** manifest "Hands" (playbook + tools + guardrails theo lịch) làm mẫu cho tác vụ tự chủ; loop guard; audit log dạng hash-chain.
  - **Hermes / OpenAI Agents JS:** shape API `runs` + approval; handoff và `RunState` serialize được.
- **Lối thoát:** Action Registry cũng mở ra dưới dạng **MCP server**. Sau này muốn cắm runtime ngoài (OpenFang, Hermes…) làm engine phụ thì nó vẫn gọi thao tác qua đúng quyền và audit của AppChat.
- **Việc cần làm ở Blueprint (spike 1–2 ngày):**
  - Kiểm tra tên trường `usage` của AI SDK v7 khi stream nhiều bước.
  - Kiểm tra tool approval kết hợp lưu trạng thái chờ duyệt trong Postgres.
  - Nối zca-js thử với một tài khoản.

### UI VISION

- **Pattern:** app shell gồm rail trái 80px với flyout (Khách hàng & CRM, Báo cáo) và topbar 58px chứa tìm kiếm, thông báo, trợ giúp, đổi workspace.
  - Nội dung theo kiểu master-detail; list ⇄ kanban; drawer; Panel 360°.
  - Chuẩn nhãn tiếng Việt và bố cục là prototype (`_bundle.jsx` + overlay).
- **Trợ lý AI có ở mọi nơi:**
  - Màn Trợ lý đầy đủ, có hai chế độ Chat và Cowork.
  - Dock thu nhỏ ở mọi module, mở bằng Ctrl+K, tự nạp ngữ cảnh.
  - Thẻ xem trước và xác nhận (diff, số bản ghi bị ảnh hưởng).
  - Thẻ kế hoạch nhiều bước (agent nào đang làm bước nào).
  - Thẻ deep-link tới kết quả.
  - Cột "AI gợi ý / Giao AI" trên các bảng.
- **Theme:** sáng, nền trung tính, primary làm điểm nhấn theo quy tắc 60/30/10. Gradient signature dùng riêng cho các yếu tố AI.

**Design token — chốt theo `styles.css` của prototype** (giải R17 / OQ-08; Design System tham khảo):

| Nhóm | Giá trị |
|---|---|
| Primary | `#2DC56A`; dải `#0F5D30 #157A40 #1F9C4F · #58D28A #8AE0AC #BCEDCC`; soft `#E8F8EE` |
| Text | `#231F20 / #6B7280 / #9CA3AF / #D1D5DB` |
| Surface | `#FFFFFF / #F9FAFB / #F3F4F6 / #E5E7EB` |
| Semantic | success `#2DC56A` · info `#2B9EF3` · process `#4B6CFF` · warning `#FFB547` · error `#FF5A3C` · AI/premium `#6E48E6` |
| Soft background | green `#EDFAF3` · blue `#EEF3FB` · yellow `#FFF4E4` · red `#FEECE9` · violet `#EFEAFA` |
| AI gradient | `linear-gradient(45deg, #2DC56A, #2B9EF3)` |
| Font | **Plus Jakarta Sans** 300–800 (UI); **JetBrains Mono** (số, mã); body 14/1.5; scale 11 · 12 · 13 · 14 · 16 · 20 · 28 |
| Spacing | grid 4px: 4 · 8 · 12 · 16 · 24 · 32 · 48 |
| Radius | 6 · 10 · 14 · 20 |
| Shadow | 3 cấp (sm / md / lg) theo prototype |
| Kích thước | button 36px (sm 30px); chip 22px |
| Icon | Lucide 24px, stroke 1.6 |

**Lý do chọn:** xanh lá là màu Brand Book 2026, gợi tăng trưởng và tin cậy, hợp với khách SMB dịch vụ. Plus Jakarta Sans hiển thị tiếng Việt có dấu tốt và mang cảm giác hiện đại.

**UI kit:** Tailwind CSS v4 với token ở trên, kèm primitive Radix/shadcn đã được theme lại. Bảng dùng TanStack Table + Virtual; builder dùng React Flow; biểu đồ dùng Recharts. Mọi màn có đủ 5 trạng thái: Empty / Skeleton / Loaded / Error-retry / Confirm. Mục tiêu WCAG AA; desktop-first, responsive đến 1024px.

### API DESIGN

- **REST:** prefix `/v1`. Contract-first: OpenAPI sinh từ Nest + zod (`nestjs-zod`).
- **Auth:**
  - `Authorization: Bearer <JWT 15 phút>` + refresh token (httpOnly cookie, xoay vòng).
  - Header `X-Workspace-Id`; middleware kiểm membership rồi `SET LOCAL app.tenant` trong transaction để RLS áp dụng.
- **Envelope:**
  - Thành công: `{ data, meta? }`; danh sách: `{ data: [], next_cursor }` (cursor pagination).
  - Lỗi: `{ error: { code, message, fields? } }`, dùng mã 400/401/403/404/409/422/429/500.
- **Ghi dữ liệu:** `Idempotency-Key` bắt buộc với POST tạo/gửi. Rate-limit qua header `X-RateLimit-*`.
- **Actions** — một cổng thống nhất cho UI và AI:
  - `POST /v1/actions/{actionId}` với body `{ input, confirm_token? }`. Rủi ro cao mà chưa có `confirm_token` → trả `202 { preview, confirm_token }`.
  - `GET /v1/actions` liệt kê action người dùng được phép gọi (Trợ lý dùng để chọn tool).
  - `POST /v1/actions/runs/{id}/undo` để hoàn tác.
  - Các route REST theo resource (`/v1/contacts` …) vẫn có cho thao tác đọc và list; mọi thao tác ghi đi qua handler của Registry.
- **AI:**
  - `POST /v1/assistant/messages` (stream SSE).
  - `POST /v1/runs/{id}/approve|reject`.
  - `GET /v1/runs?status=pending_approval`.
- **Realtime:** Socket.IO namespace `/ws`, room `ws:{workspace}`, `conv:{id}`, `user:{id}`. Event: `message.new`, `conversation.updated`, `run.step`, `approval.requested`, `ui.command`.
- **Webhooks vào:** `/hooks/channels/{provider}` và `/hooks/payments/{provider}`, có kiểm chữ ký, idempotent.

### PHẠM VI PHÁT HÀNH (theo RRI — sản phẩm thương mại hoàn chỉnh)

#### IN

| Domain | Màn hình chính | Ưu tiên |
|---|---|---|
| Auth · Workspace · Trial | Đăng ký/đăng nhập (Email OTP + mật khẩu), khai báo DN bắt buộc, màn chào trial, đổi workspace | P0 |
| **Trợ lý AI (lõi)** | Màn Trợ lý (Chat/Cowork), dock Ctrl+K ở mọi module, thẻ xác nhận/kế hoạch, Nhật ký hành động + hoàn tác, phiên trò chuyện | P0 |
| AI Agents | Danh sách agent, builder (cấu hình + chat thử), thư viện mẫu, tri thức RAG, hàng chờ duyệt, hiệu suất agent | P0 |
| Kênh | Kết nối Zalo cá nhân (QR), Web widget studio, Email; trang Kênh kết nối | P0 (Email P1) |
| Hộp thư | 3 cột, chế độ AI theo từng hội thoại, folder views của AI, Panel 360°, chuyển thành đơn/lịch/ticket | P0 |
| Tổng quan | Việc cần tôi, AI đã làm gì, cần follow, onboarding, credit | P0 |
| Khách hàng & CRM | Khách hàng (bảng/kanban), Hồ sơ 360°, Sản phẩm, Báo giá, Đơn | P0 |
| Khách hàng & CRM | Hoá đơn + QR thu tiền, custom fields, import/export, gộp trùng | P1 |
| Lịch hẹn | Lịch ngày/tuần/tháng/danh sách, dịch vụ, chống trùng, nhắc hẹn | P0–P1 |
| Hỗ trợ | Ticket (list/kanban), SLA mặc định, CSAT | P1 |
| Marketing | Phân khúc, AI đề xuất chiến dịch, wizard, duyệt, gửi Zalo/Email, báo cáo chiến dịch | P1 |
| Loyalty | Hạng, sổ điểm, tích tự động, đổi điểm, điều chỉnh tay | P1 |
| Báo cáo | AI Agents · Hội thoại · Doanh số · Khách hàng · Marketing · Ticket | P1 |
| Gói & Credit | Popup nâng cấp, trang Gói & thanh toán, ví credit, VietQR + chuyển khoản | P0 |
| Cài đặt | Settings shell + khoảng 12 trang lõi (thành viên, kênh, widget, trường, thẻ, mẫu trả lời, AI models, AI governance, nhật ký AI, gói/ví, hồ sơ) | P0–P1 |
| Quản trị nền tảng | Tenant, gói/giá, đối soát chuyển khoản, đơn giá model | P1 |

#### OUT (hoãn)

| Domain | Giai đoạn |
|---|---|
| Call Center / AI Voice / WebPhone | Sau |
| Workflow engine + builder | Sau |
| Zalo OA / ZNS, Facebook, Instagram, WhatsApp, Telegram, TikTok | P2 |
| Hợp đồng + ký số | P2 |
| Phòng ban, sơ đồ tổ chức, KPI, phân ca, vai trò tuỳ biến, SLA nhiều chính sách | P3 |
| Help Center, Training Studio/canary, Dashboard builder, Template Studio | P3 |
| Kafka, ClickHouse, OpenSearch, Docker/K8s, mobile native | Khi cần scale |

### KEY DECISIONS

| # | Decision | Rationale |
|---|---|---|
| V1 | Pattern B: SaaS đa tenant, mô hình OPC | RRI D01–D02 |
| V2 | **Action-first:** Action Registry là nguồn duy nhất cho UI, Trợ lý, agents và MCP | Copilot phải làm được mọi thao tác UI (D03, D16); một chỗ validate, phân quyền, audit, undo |
| V3 | **Agent runtime: tự xây Agent Gateway + Vercel AI SDK v7; không fork** OpenFang/OpenClaw/Hermes | Cả ba đều single-operator, phải mổ lõi mới đa tenant được, hai trong ba khác ngôn ngữ, nhiều CVE; AI SDK nhúng được, đa provider, có tool approval |
| V4 | Mastra là tuỳ chọn, quyết sau spike | Chỉ dùng nếu suspend/resume và memory tiết kiệm công rõ rệt |
| V5 | Zalo cá nhân dùng **zca-js**, thiết kế adapter theo OpenClaw `zalouser` | Plugin tham chiếu tốt nhất hiện có (MIT); session lưu theo tenant trong DB của ta |
| V6 | Monorepo pnpm: `web` (Next) · `api` (Nest) · `worker` (Nest, role channels/ai) · `packages/*` | Chia sẻ schema action và types FE/BE; worker tách để giữ phiên Zalo và chạy LLM dài |
| V7 | Postgres 16 RLS + pgvector + FTS tiếng Việt; Redis/BullMQ; native, không Docker; PM2/systemd | RRI D12–D15 |
| V8 | Prisma cho CRUD; SQL thô trong migration cho RLS, partial/expression/covering index; deferred join khi phân trang lớn | RRI D13 + quy tắc Postgres trong CLAUDE.md |
| V9 | Xác nhận theo mức rủi ro: đọc → chạy ngay; ghi/gửi/xoá/tiền → preview + `confirm_token`; agent trực kênh ≥70% tin cậy, các việc chạm tiền luôn chờ duyệt | BR-05, REQ-D05, E03 |
| V10 | Credit ledger trên mọi lần gọi LLM; hết credit → chặn AI, chuyển hội thoại về người | RRI D09 |
| V11 | Token UI theo `styles.css` của prototype; Plus Jakarta Sans; Tailwind v4 + shadcn theme lại | Giải R17; khớp prototype mà Chủ nhà đã duyệt |
| V12 | OTP đăng nhập qua Email (Zalo OTP chờ có OA) | OQ-02; Zalo cá nhân không gửi OTP chính thống được |

---

## Quality Gate: Self-Review (VISION)

- **Completeness:** 6/6
  - ✅ Project type: Pattern B.
  - ✅ Tech stack kèm lý do.
  - ✅ Sơ đồ kiến trúc ASCII.
  - ✅ Bảng phạm vi IN/OUT (đổi tên thành "Phạm vi phát hành" theo yêu cầu không dùng khái niệm MVP).
  - ✅ Bảng key decisions.
  - ✅ Đã append vào `00-PROJECT-CONTEXT.md`.
- **Cross-reference:** khớp RRI D01–D16 và REQ Domain A–N. Đã giải OQ-01 (đề xuất V3, chờ duyệt), OQ-02 (V12), OQ-08 (V11).
- **Gaps:**
  - OQ-03 / V5: chưa chạy thử zca-js.
  - Chưa kiểm field `usage` của AI SDK v7 (spike ở Blueprint).
  - OQ-04 – OQ-07 (cổng webhook ngân hàng, API tra MST, khoá LLM, hạ tầng production) cần Chủ nhà cung cấp; không chặn Blueprint.
- **Action needed:** Chủ nhà duyệt V3 (không fork, AI SDK v7) và V11 (token UI) trước khi sang `/vibecode:blueprint`.
