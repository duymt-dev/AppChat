# AppChat — Technical Blueprint (khế ước kiến trúc)

> Vibecode Kit v5.0 — BƯỚC 4 (BLUEPRINT) · 2026-10-28 · **ĐÃ DUYỆT — Chủ nhà duyệt 2026-10-28** (D36)
> **Cập nhật 2026-10-29:** prototype ver2.1 + D42–D51 (bảng có số trang, quyền agent một nơi, một kênh nhiều tài khoản, menu tin nhắn / hội thoại, bố cục Hồ sơ 360°). Không đổi kiến trúc; chỉ bổ sung entity, action, endpoint, primitive.
> Upstream: `00-PROJECT-CONTEXT.md` (Scan + Vision V1–V18 + Scan delta ver2.1), `01-REQUIREMENTS-MATRIX.md` (RRI D01–D51, REQ A–N), `plans/COMMERCE-DECISIONS.md`, `product/*`, **`standards/*` (bắt buộc — xem `standards/README.md`)**
> Đã duyệt thì **không đổi kiến trúc**. Thay đổi lớn phải quay lại Vision.

---

## 1. MODULE ARCHITECTURE

### 1.1 Monorepo (pnpm workspaces, không dùng Docker)

```
AppChat_Ver2/
├── package.json · pnpm-workspace.yaml · tsconfig.base.json · eslint.config.mjs · .prettierrc
├── ecosystem.config.cjs          # PM2: web, api, worker-channels, worker-ai
├── .env.example                  # schema env (validate bằng zod khi boot)
├── apps/
│   ├── web/                      # Next.js (App Router) — UI + Trợ lý dock
│   ├── api/                      # NestJS HTTP (/v1) + Socket.IO (/ws, /widget) + webhooks
│   ├── worker/                   # NestJS standalone; ROLE=channels | ai | jobs (gộp được khi dev)
│   └── widget/                   # Web chat widget (TS → 1 file JS nhúng, build bằng tsup/esbuild)
├── packages/
│   ├── core/                     # ★ Domain: NestJS modules (service + repo + action handlers), dùng chung api & worker
│   ├── actions/                  # ★ Action Registry: định nghĩa (id, zod schema, metadata) — dùng chung web/core/ai
│   ├── db/                       # 2 Prisma schema (platform + tenant), migrations, PlatformDb, TenantDbResolver (LRU), provisioner, tenant-migrate runner, seed
│   ├── ai/                       # Agent Gateway interface, AiSdkEngine, LLM Router, prompts, meta-tools
│   ├── channels/                 # ChannelAdapter + ChannelManifest + channelRegistry; adapters (zalo-personal, webchat, email) — standards/channels
│   ├── integrations/             # Port theo năng lực + ConnectorManifest + connectorRegistry; adapters (sepay, casso, smtp, s3, mock; coming_soon: misa, matbao, vnpt, viettel…) — standards/integrations
│   ├── shared/                   # types, enums, error codes, money/phone/date utils, i18n keys
│   └── ui/                       # antd theme (token prototype → ConfigProvider), antd-style tokens, wrapper component, icons (lucide-react)
├── infra/                        # hạ tầng native VPS: scripts provision/deploy, nginx, systemd, postgres, prometheus, loki, alloy, grafana (§11)
├── coding-packs/                 # Vibecode artifacts (không phải code)
└── specs/                        # tài liệu phi kỹ thuật
```

**Ranh giới phụ thuộc** (lint bằng `eslint-plugin-boundaries` hoặc dependency-cruiser):
- `shared` → không phụ thuộc package nào.
- `actions` → chỉ `shared` (+ zod).
- `db` → `shared`.
- `ai`, `channels`, `integrations` → `shared`, `actions` (**không** import `core` — nhận dependency qua interface).
- `core` → `db`, `actions`, `shared`, `ai`, `channels`, `integrations`.
- `api`, `worker` → `core` (+ `ai`, `channels`, `integrations`).
- `web` → `actions`, `shared`, `ui` (**không bao giờ** import `core`/`db`).

### 1.2 `packages/core` — mỗi bounded context một thư mục

```
packages/core/src/
├── kernel/            # TenantContext, ActionExecutor, ActionLog, UndoService, ConfirmTokenService,
│                      # EventBus (outbox), Idempotency, Policy (risk), Errors, Pagination, Clock
├── identity/          # user, workspace, membership, invite, auth (OTP, password, tokens), business-profile
├── authz/             # role, team, permission catalog, AuthzContext resolver (cache Redis), scopeFilter (D27, D32)
├── billing/           # plan, subscription, wallet, credit-ledger, quota, platform invoice, payment matching
├── channels/          # channel_account, credentials vault, account lease, health
├── inbox/             # conversation, message, tag, canned-reply, inbound pipeline, outbound service
├── crm/               # contact, identity resolution, dedupe/merge, timeline, custom fields, import/export
├── catalog/           # product, category
├── sales/             # quote, order (+ nhập đơn sàn / POS — D31), invoice (đề nghị thanh toán), customer payment, customer_package, bank feed
├── contracts/         # contract, appendix, signer, signature event, trang ký công khai, renewal (D25)
├── documents/         # doc_template (rich / DOCX), biến chuẩn, render PDF (react-pdf / LibreOffice), AI soạn chứng từ, bảng kiểm (D30)
├── integrations/      # integration_connection, mapping, call log, resolver theo port, webhook router, interest (D28) — adapter ở packages/integrations
├── booking/           # staff, business hours, appointment, slot finder
├── support/           # ticket, sla policy, sla clock, escalation
├── marketing/         # segment, campaign, recipient, suggestion
├── loyalty/           # config, ledger, tier
├── ai/                # ai_agent (+ version), kb (folder / source / chunk / suggestion, hybrid search), ai_run/step, approval, assistant session, tasks, governance
├── insights/          # query số liệu chỉ đọc dùng chung: dashboard, thống kê agent/chiến dịch/ticket, metric cho Trợ lý (không có module Báo cáo — D19)
├── notify/            # notification, mailer
├── platform/          # quản trị nền tảng (tenant, gói, giá model, đối soát)
└── index.ts           # export Nest modules (đăng ký sẵn ở TIP-001 → các TIP sau KHÔNG sửa)
```

Mỗi domain đi theo layout cố định, mỗi file ≤ 600 dòng:

```
<domain>/
├── <domain>.module.ts
├── services/        # logic nghiệp vụ (1 file/aggregate)
├── repos/           # truy cập DB qua TenantDb
├── actions/         # 1 file/nhóm action: handler implements ActionHandler
├── events/          # publish/consume domain events
├── jobs/            # BullMQ processors của domain (chạy trong worker)
├── dto/             # read DTO (response)
└── *.test.ts        # trong tests/ của domain, KHÔNG viết inline
```

### 1.3 Entry points

**Quy tắc đăng ký (để chạy TIP song song):**
- TIP-001 tạo sẵn **stub** cho mọi domain:
  - `packages/core/src/<domain>/<domain>.module.ts`
  - `apps/api/src/http/<domain>/<domain>.http.module.ts` (controllers của domain nằm trong thư mục này)
  - `apps/worker/src/roles/{channels,ai,jobs}.module.ts` (import sẵn `<Domain>JobsModule` rỗng từ core)
  - `packages/actions/src/<domain>.ts` (mảng rỗng)
  - `packages/db/prisma/{platform,tenant}/<file>.prisma` (rỗng; đúng cấu trúc §2.1)
  - `packages/channels/src/registry.ts` và `packages/integrations/src/registry.ts` (danh sách rỗng + manifest `coming_soon`)
  - `apps/web/src/features/<module>/index.ts` (theo `standards/ui/frontend-structure.md`)
  - `apps/web/messages/{vi,en}/<module>.json`
- Mọi file tổng hợp (`app.module.ts`, `core/index.ts`, `actions/index.ts`, `nav-config.ts`) đã import đủ từ đầu. **TIP sau chỉ điền vào stub của domain mình**, không sửa file tổng hợp.


| Process | Entry | Vai trò |
|---|---|---|
| `apps/api` | `src/main.ts` | HTTP `/v1/*`, `/hooks/*`, Socket.IO namespace `/ws` (app) và `/widget` (khách web), OpenAPI tại `/v1/docs` |
| `apps/worker` ROLE=channels | `src/main.ts` | Giữ phiên Zalo (lease theo account), IMAP poll, outbound sender, inbound pipeline |
| `apps/worker` ROLE=ai | `src/main.ts` | Chạy AI run (agent reply, assistant, delegate, tasks), embedding, RAG ingest |
| `apps/worker` ROLE=jobs | `src/main.ts` | Outbox relay, scheduler (SLA, giữ chỗ lịch hẹn, nhắc hẹn, no-show, campaign, hết hạn trial/QR), tenant provision / migrate / archive / restore, integrations, đồng bộ đơn, render chứng từ |
| `apps/web` | `src/app/*` | Next.js; trong dev proxy `/api/*` → api; trong prod đặt sau nginx cùng domain |

**Hàng đợi BullMQ** (Redis; mọi job mang `workspaceId`, idempotent; retry back-off rồi dead-letter):

| Queue | Worker ROLE | Job |
|---|---|---|
| `events` | jobs | outbox relay → consumer theo event (§2.3) |
| `send:<channel_account_id>` | channels | gửi tin theo `outbox_message`, rate limiter của kênh |
| `campaign-send` | channels | gửi chiến dịch theo lô (cap / ngày, jitter) |
| `agent-reply` | ai | trả lời của agent trực kênh (job id `agent-reply:{conversationId}`, debounce 3s) |
| `assistant-run` · `ai-resume` · `ai-task` | ai | lượt Trợ lý, chạy tiếp run sau duyệt (`ai-resume:{runId}`), tác vụ tự chủ |
| `kb-ingest` | ai | parse → cắt đoạn → embed → ghi `kb_chunk`; re-ingest sản phẩm; đề xuất hỏi–đáp (P1) |
| `integrations` | jobs | gọi ra ngoài qua port (retry, idempotency `(connection_id, op, ref_id)`, call log) |
| `order-sync` | jobs | poll đơn sàn / POS theo kết nối (repeatable 5 phút) + xử lý webhook đã nhận (D31) |
| `doc-render` | jobs | render PDF chứng từ (react-pdf / LibreOffice headless, 2 tiến trình, timeout 60s) (D30) |
| `tenant` | jobs | `tenant.provision` / `tenant-migrate` / `tenant.archive` / `tenant.restore` |
| `scheduler` (repeatable) | jobs | SLA tick, giữ chỗ / nhắc hẹn, no-show, hết hạn báo giá, hợp đồng T-30 / hết hạn, công nợ T+1 / T+7, trial, `tenant.archive-scan`, đối soát credit hằng giờ, sweep outbox 10 phút |

### 1.4 Frontend (`apps/web/src`)

```
app/
├── (auth)/login · register · verify-otp · forgot-password · reset-password
├── (onboarding)/declare · welcome
├── (app)/layout.tsx                 # AppShell + AssistantDock + realtime provider
│   ├── dashboard/ · assistant/[[...sessionId]]/ · inbox/[[...conversationId]]/
│   ├── customers/ · customers/[id]/ · products/ · quotes/ · contracts/ · orders/ · invoices/ · loyalty/
│   ├── calendar/ · tickets/ · marketing/ · marketing/campaigns/[id]/
│   ├── agents/ · agents/[id]/ · assistant/approvals/ · assistant/actions/
│   ├── settings/[section]/
├── (public)/sign/[token]/            # trang ký hợp đồng cho khách (không đăng nhập)
├── (admin)/admin/[section]/          # Quản trị nền tảng
features/<module>/                     # screens/ · components/ · hooks/ · api.ts · columns.tsx · types.ts · ui-commands.ts · index.ts — chuẩn `standards/ui/frontend-structure.md`
shared/
├── api/        # fetch client (auth refresh, X-Workspace-Id, error envelope), query keys
├── actions/    # useAction(), ConfirmActionDialog, action result toasts
├── realtime/   # socket client, event → query invalidation
├── assistant/  # AssistantDock, UI Command Bus (đăng ký handler theo route), context provider
├── shell/      # NavRail (search · thông báo · Nâng cấp · trial badge · avatar menu ở đáy rail, theo prototype), Flyout, MobileTabBar, nav-config.ts (đủ mọi route ngay từ TIP nền tảng UI)
└── states/     # EmptyState, Skeletons, ErrorState, PageStates (5 trạng thái)
messages/<locale>/<module>.json       # next-intl + ICU; vi (nguồn) + en khi phát hành; thêm ngôn ngữ = thêm thư mục (§7.4)
```

---

## 2. DATA MODEL (PostgreSQL 16)

### 2.0 Mô hình tenant: **mỗi workspace một PostgreSQL database riêng** (chốt 2026-10-28 — Vision V14, RRI D21)

```
PostgreSQL 16 cluster (native)  ── PgBouncer (transaction mode, :6432) ── app
├── appchat_platform          DB nền tảng (control plane), duy nhất
├── appchat_tenant_template   DB mẫu đã migrate + extensions; KHÔNG app nào kết nối (để CREATE DATABASE … TEMPLATE chạy được)
├── ws_<workspace_short_id>   DB riêng của từng workspace (data plane)
└── …
```

- **DB nền tảng** (`appchat_platform`) chứa:
  - **Identity:** `user`, `otp_code`, `refresh_token`, `workspace` (registry), `membership`, `invite`, `business_profile`.
  - **Billing:** `plan`, `subscription`, `credit_wallet`, `credit_ledger`, `billing_invoice`, `bank_transaction`.
  - **Cấu hình:** `model_price`, `model_route`, `agent_template`.
  - **Định tuyến:** `tenant_channel_route`, `tenant_widget_route`.
  - **Vận hành:** `tenant_migration`, `workspace_stats`, `platform_audit_log`.
- **DB tenant** (`ws_*`) chứa toàn bộ dữ liệu nghiệp vụ còn lại: kênh, hội thoại, CRM, bán hàng, lịch, ticket, marketing, loyalty, AI, action log, outbox, file.
- **Bảng trong DB tenant không có cột `workspace_id` và không dùng RLS.** Cô lập ở mức database. Index không cần `workspace_id` ở đầu.
- Không có FK giữa hai DB. Bảng tenant tham chiếu user bằng cột scalar `user_id` (không FK). Kiểm tồn tại ở tầng service qua `membership`.

**Truy cập (`packages/db`):**
- Hai Prisma schema và hai client:
  - `prisma/platform/*.prisma` → `@appchat/db/platform`
  - `prisma/tenant/*.prisma` → `@appchat/db/tenant`
  - Multi-file; mỗi file thuộc đúng một TIP.
- `PlatformDb`: một client dùng chung.
- `TenantDbResolver.get(workspaceId)`:
  - Đọc `workspace.db_name/db_host/db_status` (cache Redis 60s), rồi trả về `TenantDb` (Prisma Client + driver adapter `@prisma/adapter-pg`, pool nhỏ `max=3` qua PgBouncer).
  - Client được cache LRU trong mỗi process (mặc định 100 DB, đóng client idle > 10 phút).
  - **Chỉ được gọi với `TenantContext` đã xác thực:** middleware kiểm `membership` (hoặc route registry cho kênh/widget/webhook) rồi mới tạo context. Không có API nào nhận tên DB từ client.
  - `db_status ≠ active` thì trả `WORKSPACE_UNAVAILABLE` (503 khi provisioning, 423 khi suspended/archived).
- Thao tác chạm cả hai DB (ví dụ trừ credit + ghi `ai_run_step`) **không có transaction chung**:
  - Làm phía nền tảng trước, có khoá idempotent (`credit_ledger` unique `(workspace_id, ref_type, ref_id)`), rồi mới ghi phía tenant.
  - Job đối soát hằng giờ sửa chênh lệch.

**Vòng đời DB tenant:**
1. **Tạo workspace:**
   - Ghi `workspace(db_status=provisioning)`.
   - Job `tenant.provision` (worker-jobs, role `appchat_provisioner` có `CREATEDB`) chạy `CREATE DATABASE ws_x TEMPLATE appchat_tenant_template OWNER appchat_tenant_owner`, rồi seed mặc định: SLA policy mặc định, `loyalty_config`, `ai_governance`, thẻ mẫu, câu trả lời mẫu, agent mẫu theo ngành đã khai báo.
   - Đặt `db_status=active`. Mục tiêu < 10 giây; UI onboarding hiện "Đang khởi tạo workspace…" và lắng nghe event `workspace.ready` qua WS.
2. **Migration:**
   - Deploy theo thứ tự: `migrate platform` → `migrate template` → `tenant-migrate` (runner duyệt mọi DB `active|suspended`, song song 4, ghi `tenant_migration(workspace_id, version, status, error, finished_at)`; DB lỗi thì đánh dấu, retry, không chặn DB khác, có cảnh báo).
   - Migration phải expand-compatible: code mới chạy được với schema cũ một version trong lúc runner chưa chạy xong.
   - App đọc `schema_version` của DB tenant; thấp hơn mức tối thiểu thì trả 503 cho workspace đó cho tới khi migrate xong.
3. **Xoá workspace:** `db_status=deleting` → `pg_dump` lưu archive (giữ 30 ngày) → `DROP DATABASE` → xoá registry.
4. **Chuyển máy chủ:** `db_host` cho phép đặt workspace ở cluster khác. Chuyển bằng `pg_dump | pg_restore` khi `db_status=suspended`; không phải sửa code.

5. **Tự lưu trữ workspace không hoạt động** (chốt 2026-10-28 — RRI D23):
   - **Áp dụng:** chỉ gói có `plan.archive_inactive_days` khác null. Seed: gói **Miễn phí = 90 ngày**; trial và mọi gói trả phí = null (không bao giờ tự lưu trữ). Đổi được trong trang quản trị gói.
   - **"Hoạt động"** = `workspace_stats.last_active_at`, lấy max của các mốc: thành viên đăng nhập, tin nhắn vào/ra, action bất kỳ.
   - **Job đêm `tenant.archive-scan`:**
     - Còn 14 ngày tới ngưỡng thì gửi email + thông báo cho Owner: "Workspace sẽ được lưu trữ vào ngày …, đăng nhập để giữ hoạt động".
     - Tới ngưỡng thì chạy `tenant.archive`.
   - **`tenant.archive`** (`appchat_provisioner`):
     1. `db_status=archiving`.
     2. Ngắt kênh: worker nhả lease Zalo, ngừng IMAP, widget hiển thị "tạm ngoại tuyến".
     3. `pg_dump -Fc` → kho lưu trữ (`Storage` archive bucket, mã hoá) → kiểm checksum và restore thử danh mục (`pg_restore -l`).
     4. `DROP DATABASE`.
     5. `db_status=archived`, `archived_at`, `archive_key`.
     - Bước nào lỗi thì giữ nguyên DB, đặt `db_status=active` và cảnh báo.
   - **Khôi phục khi đăng nhập:** member mở workspace `archived`.
     - UI hiện "Đang khôi phục workspace…" và nghe event `workspace.ready`.
     - Job `tenant.restore`: `CREATE DATABASE` rỗng → `pg_restore` → chạy `tenant-migrate` lên version hiện tại → `db_status=active`.
     - Kênh cần kết nối lại: Zalo phải quét QR lại nếu phiên đã hết hạn.
     - Mục tiêu < 2 phút với workspace gói Miễn phí.
   - **Bản lưu trữ:** giữ cho tới khi Owner yêu cầu xoá (action `workspace.delete`) hoặc quản trị nền tảng xoá. Không tự xoá vĩnh viễn.
   - **Action:** `admin.workspace.archive` / `admin.workspace.restore` (platform_admin, risk config, luôn preview). Owner không tự lưu trữ; Owner chỉ có `workspace.delete`.

**Định tuyến không qua `X-Workspace-Id`:**
- Tin Zalo / IMAP: `worker-channels` đọc `tenant_channel_route(channel_account_id, workspace_id, type, status)` từ DB nền tảng để biết account nào cần giữ phiên và thuộc DB nào.
- Widget: `tenant_widget_route(public_key → workspace_id)`.
- Webhook ngân hàng: chỉ chạm DB nền tảng (`billing_invoice`).
- Job BullMQ luôn mang `workspaceId` trong payload; processor resolve DB từ đó.

**Outbox khi có nhiều DB:**
- Ghi `outbox_event` trong DB tenant cùng transaction nghiệp vụ, sau commit thì `SADD outbox:dirty <workspaceId>` (Redis).
- Relay drain các workspace trong set đó.
- Sweep toàn bộ DB mỗi 10 phút làm lưới an toàn.

**Roles Postgres:**

| Role | Dùng cho |
|---|---|
| `appchat_platform_app` | app đọc/ghi DB nền tảng |
| `appchat_tenant_app` | app đọc/ghi các DB `ws_*` (`CONNECT` + DML); không `CREATEDB` |
| `appchat_provisioner` | chỉ job tạo/xoá DB (`CREATEDB`) |
| `appchat_migrator` | owner schema, chạy migration |

### 2.1 Quy tắc chung (bắt buộc)

- **Prisma multi-file schema:** `packages/db/prisma/{platform,tenant}/<file>.prisma`. Mỗi file thuộc đúng **một TIP** (bản đồ sở hữu ở `02-TASK-GRAPH.md`). Domain lớn tách nhiều file: `billing.prisma` + `billing-payments.prisma`, `channels.prisma` + `channels-webchat.prisma`, `ai-runs.prisma` + `ai-kb.prisma` + `ai-agents.prisma` + `ai-assistant.prisma` + `ai-tasks.prisma`. Tương tự `packages/actions/src/<file>.ts`.
- **Migration:** mỗi TIP tạo thư mục migration riêng `<timestamp>_<tip>_<mô tả>` trong `platform/` hoặc `tenant/`. Không sửa migration đã merge. Sau khi merge vào `main` phải chạy `prisma migrate diff` cho cả hai schema để kiểm drift.
- **Không dùng Prisma relation xuyên domain.** Tham chiếu sang domain khác chỉ là cột scalar (`contactId String @db.Uuid`); foreign key (trong cùng DB) được thêm bằng SQL trong migration. Prisma relation chỉ được dùng trong cùng một file domain. Nhờ vậy các TIP chạy song song không phải sửa chung file.
- **Cột chuẩn:**
  - Bảng tenant: `id uuid pk` (bảng hot dùng uuidv7 sinh từ app) · `created_at timestamptz default now()` · `updated_at timestamptz` · `deleted_at` nếu xoá mềm.
  - Bảng nền tảng gắn với workspace có thêm `workspace_id uuid not null`.
- **Test cô lập tenant (bắt buộc, thay cho RLS test):**
  - (a) Request với `X-Workspace-Id` không thuộc membership → 403, không mở kết nối DB tenant.
  - (b) `TenantDbResolver` không tạo được client khi thiếu context đã xác thực.
  - (c) Job/route kênh resolve đúng DB theo registry.
  - (d) Hai workspace chạy song song không thấy dữ liệu của nhau, kiểm trên DB thật.
- **Tiền:** `bigint`, đơn vị VND (không dùng float). **Credit:** `bigint`.
- **Thời gian:** `timestamptz`; hiển thị theo timezone của workspace (mặc định `Asia/Ho_Chi_Minh`).
- **Enum:** dùng Postgres enum qua Prisma, giá trị tiếng Anh snake_case. Nhãn hiển thị nằm trong i18n.
- **Mã nghiệp vụ:** cột `code` dạng `KH-000123`, `BG-…`, `DH-…`, `TT-…` (đề nghị thanh toán), `LH-…`, `TKT-…` (D52). Sinh bằng bảng `sequence_counter(kind, value)` trong DB tenant và lệnh `UPDATE … RETURNING`. Hoá đơn gói AppChat dùng sequence riêng ở DB nền tảng.
- **Extensions** (cài sẵn trong DB template): `pgcrypto`, `vector` (pgvector), `pg_trgm`, `unaccent`, `btree_gist`, `citext`.
- **Hàm bất biến:** `f_unaccent(text) IMMUTABLE`, dùng cho expression index tìm kiếm tiếng Việt không dấu.
- **Index:**
  - Thứ tự cột: so sánh `=` trước, cột range/sort sau. Thêm `INCLUDE` khi cần covering index.
  - Dùng partial index (`WHERE deleted_at IS NULL`) và expression index (`lower(email)`, `f_unaccent(lower(name)) gin_trgm_ops`).
  - Danh sách lớn phân trang theo cursor, kết hợp deferred join (subquery chỉ lấy `id`).

### 2.2 Entities theo domain

Ghi chú: **[P]** = DB nền tảng, **[T]** = DB tenant. `ws` = `workspace_id` (chỉ có ở bảng [P]). Bảng [T] không có cột workspace. Dấu → là tham chiếu.

**[P] platform/identity.prisma** (TIP-004) — `user`, `refresh_token`, `otp_code` không gắn workspace. Chỉ truy cập qua service.

| Bảng | Trường chính | Ràng buộc / index |
|---|---|---|
| `user` | id, email citext, password_hash?, name, phone?, avatar_url?, locale, is_platform_admin bool, email_verified_at, last_login_at | unique(email) |
| `otp_code` | id, email, purpose(register\|login\|reset), code_hash, attempts, expires_at, consumed_at | idx(email, purpose, created_at desc) |
| `refresh_token` | id, user_id→user, token_hash, family_id, expires_at, revoked_at, user_agent, ip | unique(token_hash); idx(user_id) |
| `workspace` | id, name, slug, owner_user_id→user, timezone, locale, status(active\|suspended), settings jsonb (giờ mở cửa, giờ trực AI, ngưỡng mặc định) | **registry tenant**: thêm `db_name`, `db_host`, `db_status(provisioning\|active\|suspended\|archiving\|archived\|restoring\|deleting)`, `archived_at?`, `archive_key?`, `schema_version`, `provisioned_at` |
| `membership` | ws, user_id, role_key text (khoá vai trò trong DB tenant: owner\|manager\|sales\|cs\|accountant\|custom:*), status(active\|invited\|removed), joined_at | unique(ws, user_id); idx(user_id) INCLUDE(ws, role_key). Quyền chi tiết resolve ở bảng `role` [T] (D27) |
| `invite` | ws, email, role_key, token_hash, expires_at, accepted_at | unique(token_hash) |
| `business_profile` | ws (pk), kind(enterprise\|household\|individual), tax_code?, national_id?, legal_name, address, representative, phone, founded_on?, legal_status?, industry_group, industry, business_description, declared_at | 1-1 workspace |
| `tenant_channel_route` | channel_account_id (pk), ws, type, external_id, status | worker-channels đọc để biết account cần giữ phiên + DB đích; đồng bộ khi kênh đổi trạng thái |
| `tenant_widget_route` | public_key (pk), ws, allowed_domains text[] | widget kết nối → DB đích |
| `tenant_bank_feed_route` | feed_id (pk), ws, provider | webhook SePay / Casso của DN → DB đích |
| `tenant_integration_route` | connection_id (pk), ws, connector_key, status | webhook `/hooks/integrations/:connector/:connectionId` → DB đích (D28) |
| `integration_interest` | ws, connector_key, user_id, note?, created_at | unique(ws, connector_key); thẻ "Sắp có" → "Đăng ký quan tâm" |
| `tenant_sign_route` | token_hash (pk), ws, expires_at | trang ký công khai `/sign/[token]` → DB đích |
| `tenant_migration` | ws, version, status(pending\|running\|done\|failed), error?, started_at, finished_at | idx(status, version) |
| `workspace_stats` | ws (pk), contacts, conversations_30d, messages_30d, db_size_bytes, last_active_at, refreshed_at | job đêm gom từ từng DB, phục vụ trang quản trị |
| `platform_audit_log` | actor_user_id, action_id, ws?, input jsonb, result jsonb, created_at | audit cho action `admin.*` và action chạm DB nền tảng |

**[P] platform/billing.prisma** (TIP-009) + **platform/billing-payments.prisma** (`billing_invoice`, `bank_transaction` — TIP-010)

| Bảng | Trường | Ghi chú |
|---|---|---|
| `plan` | id, key, segment(personal\|business), name, price_month, price_year, credits_month, max_channels, max_agents, max_users, features jsonb, is_trial_plan, archive_inactive_days? (Miễn phí = 90, còn lại null), active, sort | seed theo prototype; sửa được trong trang admin |
| `subscription` | ws (unique), plan_id, status(trialing\|active\|expired\|cancelled), trial_started_at, trial_ends_at, current_period_start, current_period_end | |
| `credit_wallet` | ws (pk), plan_balance bigint (reset mỗi kỳ, không cộng dồn), topup_balance bigint (không hết hạn), low_threshold, low_alert, warn_80_sent_at, warn_95_sent_at, exhausted_at | CHECK cả hai ≥ 0; trừ plan_balance trước (TIP-009: DC-034) |
| `credit_ledger` | ws, delta, balance_after, kind(grant\|topup\|usage\|refund\|adjust\|expire), ref_type, ref_id, note? (khoá chữ i18n/server), meta jsonb?, source?, provider?, model?, tokens_in?, tokens_out?, run_id? | idx(ws, created_at desc) INCLUDE(delta, kind); unique(ws, ref_type, ref_id) — idempotent khi trừ credit từ DB tenant |
| `model_price` | provider_key, model, tier(standard\|advanced\|max), credits_per_1k_in, credits_per_1k_out, active | unique(provider, model) |
| `llm_provider` | key (unique), kind(anthropic\|openai\|google\|deepseek\|openai_compatible), name, base_url?, api_key_enc bytea, headers jsonb?, capabilities jsonb `{tools, json_schema, streaming, embeddings, vision, reasoning}`, status(active\|disabled), last_probe_at?, last_error? | D33. Router OpenRouter / 9router / LiteLLM… = `openai_compatible`; chỉ Quản trị nền tảng sửa |
| `model_route` | tier, priority, provider_key → `llm_provider.key`, model, purpose(chat\|embed\|rerank), params jsonb? | fallback theo priority; một tier có thể trộn provider gốc và router |
| `billing_invoice` | ws, code, kind(plan\|credits\|addon\|upgrade_proration), plan_id?, credits?, amount, vat_info jsonb (MST, tên đơn vị, địa chỉ, email nhận), status(pending\|pending_review\|paid\|expired\|cancelled), method(qr\|bank_transfer), transfer_code unique, qr_payload, expires_at, paid_at, bank_tx_id? | partial idx(status) WHERE status in (pending, pending_review) |
| `bank_transaction` | provider, provider_tx_id unique, amount, content, account_no, occurred_at, matched_invoice_id?, raw jsonb | idempotent theo `provider_tx_id` |

**[T] tenant/channels.prisma** (TIP-014) + **tenant/channels-webchat.prisma** (`webchat_widget` — TIP-017)

| Bảng | Trường | Ghi chú |
|---|---|---|
| `channel_account` | type(zalo_personal\|webchat\|email), name, external_id, status(pending\|connecting\|connected\|error\|disconnected\|expired), credentials_enc bytea (AES-256-GCM), settings jsonb (rate limit, cap/ngày, agent mặc định, ai_mode mặc định; ver2.1 REQ-B11: giờ + lời chào trả lời tự động, cách chia + SLA, đồng bộ `{auto_create_contact, history_days: 0\|7\|30\|90}`), paused_at?, health jsonb, last_event_at | unique(type, external_id) |
| _ghi chú_ | **Một kênh nhiều tài khoản (REQ-B09):** mỗi `type` có nhiều `channel_account`. Trạng thái kênh tính ở service: sức khoẻ = tài khoản kém nhất, số hội thoại cộng dồn; hết tài khoản `connected` → kênh "Chưa kết nối". | |
| `webchat_widget` | channel_account_id, public_key unique, theme jsonb, greeting, prechat_form jsonb, agent_id?, allowed_domains text[] | |

**[T] tenant/inbox.prisma**

| Bảng | Trường | Index |
|---|---|---|
| `conversation` | channel_account_id, contact_id→crm, kind(direct\|group), external_thread_id, title?, status(open\|pending\|snoozed\|closed), assignee_user_id?, assignee_agent_id?, team_id?, ai_mode(off\|copilot\|auto), ai_state(idle\|running\|waiting_approval\|handoff), handoff_reason?, intent?, last_message_at, last_message_preview, unread_count, pinned, archived_at?, snoozed_until?, **hidden_at?** (D50 — ẩn khỏi danh sách, tin vào mới thì xoá), **pinned_message_id?** (REQ-C09), group_ai_policy(mention\|auto\|off)? | unique(channel_account_id, external_thread_id); idx(status, last_message_at desc) INCLUDE(contact_id, unread_count, ai_mode); idx(assignee_user_id, last_message_at desc); partial idx(ai_state) WHERE ai_state in (waiting_approval, handoff) |
| `message` | conversation_id, direction(in\|out), sender_type(contact\|user\|agent\|system), sender_id?, kind(text\|image\|file\|sticker\|audio\|note\|system\|card), body, attachments jsonb, external_msg_id?, channel_account_id, status(queued\|sent\|delivered\|read\|failed), error?, run_id?, **reply_to_id?**, **forwarded_from_id?**, deleted_at?, created_at | unique(channel_account_id, external_msg_id); idx(conversation_id, created_at desc). Partition theo tháng làm sau khi scale. Tìm trong hội thoại (REQ-C12): expression index `gin (f_unaccent(lower(body)) gin_trgm_ops)` + lọc `conversation_id` |
| `message_reaction` | message_id, actor_type(user\|contact), actor_id, emoji(👍\|❤️\|😂\|😮\|😢\|🙏), created_at | pk(message_id, actor_type, actor_id, emoji) — bấm lại = xoá; chỉ kênh có `capabilities.reactions` (OQ-12) |
| `conversation_participant` | conversation_id, external_id, display_name, contact_id? | dùng cho hội thoại nhóm |
| `conversation_tag` | conversation_id, tag_id | pk(conversation_id, tag_id) |
| `canned_reply` | shortcut, title, body, attachments jsonb | unique(shortcut) |
| `outbox_message` | message_id, channel_account_id, payload jsonb, status(pending\|sending\|sent\|failed\|dead), attempts, next_attempt_at, last_error | idx(status, next_attempt_at) |

**[T] tenant/crm.prisma**

| Bảng | Trường | Index |
|---|---|---|
| `contact` | code, name, kind(person\|business\|household), phone?, phone_norm?, email?, tax_code?, avatar_url?, gender?, birthday?, address?, city?, source?, locale?, group(vip\|loyal\|new\|potential)?, stage(lead\|potential\|consulting\|quote\|contract\|won\|lost), owner_user_id?, team_id?, tier_key?, points_balance bigint, total_spent bigint, last_interaction_at, last_order_at, marketing_opt_out bool, ai_summary?, ai_summary_at?, custom jsonb, deleted_at? | partial unique(phone_norm) WHERE deleted_at IS NULL AND phone_norm IS NOT NULL; idx(stage, last_interaction_at desc); gin(f_unaccent(lower(name)) gin_trgm_ops); idx(lower(email)) WHERE email IS NOT NULL |
| `contact_identity` | contact_id, channel_type, channel_account_id, external_id, display_name | unique(channel_account_id, external_id) — `channel_type = marketplace` cho buyer id của sàn (D31) |
| `contact_collaborator` | contact_id, user_id, role(collaborator\|watcher), added_by, created_at | pk(contact_id, user_id); idx(user_id, contact_id) — scope `own` (D32) |
| `lead_routing_rule` | channel_account_id? (null = mặc định), enabled (mặc định false), enabled_at?, mode(manual\|round_robin\|least_busy\|by_channel), user_ids uuid[] (≤ 100) XOR team_id?, fixed_user_id? (by_channel), version int (CAS), configured_by_user_id? | partial unique((true)) WHERE channel_account_id IS NULL; partial unique(channel_account_id) WHERE NOT NULL. Chỉ chia lead TẠO SAU enabled_at (TIP-042b, DC-238); `assign_mode` của tài khoản kênh chỉ là bản chiếu cũ |
| `lead_routing_cursor` | rule_id pk (FK cascade), last_user_id? | khoá FOR UPDATE tuần tự hoá lựa chọn (TIP-042b) |
| `lead_routing_decision` | contact_id, originating_event_id, rule_id?, rule_version?, selected_user_id?, conversation_id?, reason | unique(contact_id); unique(originating_event_id) — một quyết định chủ đầu tiên mỗi khách / event, không lưu tin / SĐT (TIP-042b) |
| `contact_access_request` | contact_id, requester_user_id, status(pending\|approved\|rejected), decided_by?, decided_at?, note? | idx(contact_id, status); partial unique(contact_id, requester_user_id) WHERE status='pending' |
| `tag` | name, color, scope(all\|contact\|conversation) | unique(lower(name)) — nguồn thẻ dùng chung cho khách và hội thoại |
| `contact_tag` | contact_id, tag_id | pk |
| `contact_memory` | contact_id, fact, source_run_id?, confidence | AI ghi nhớ sự kiện về khách |
| `timeline_event` | contact_id, type(message\|quote\|order\|invoice\|payment\|appointment\|ticket\|note\|ai_action\|loyalty\|campaign\|stage), ref_type, ref_id, actor_type, actor_id, summary, payload jsonb, occurred_at | idx(contact_id, occurred_at desc) |
| `contact_note` | contact_id, body, author_user_id | |
| `profile_layout` | name, is_system bool (Mặc định · CSKH · Kinh doanh), tabs jsonb `[{key, label, enabled, sort, builtin, blocks: block_key[]}]` (≥ 1 tab; khối lấy từ thư viện 12 khối), created_by | REQ-F12, M05 |
| `profile_layout_role` | role_key (pk, 5 vai trò D27), layout_id | mỗi vai trò đúng một mẫu; xoá mẫu đang gán → về Mặc định |
| `custom_field_def` | entity(contact\|product\|quote\|order\|ticket\|appointment), key, label, type(text\|textarea\|number\|currency\|date\|email\|phone\|picklist\|multi\|tier\|tags\|lookup\|file), options jsonb, required, ai, sys, roles text[], condition?, sort, visible_in jsonb `{list, kanban, form, filter, detail, export}` | unique(entity, key). Giá trị: cột `custom jsonb NOT NULL DEFAULT '{}'` trên `contact`, `product`, `quote`, `order`, `ticket`, `appointment` + GIN `(custom jsonb_path_ops)` (D56, `standards/domain/custom-fields.md`) |

**[T] tenant/catalog.prisma** — `product_category(name, parent_id?)`; `product(code, name, type(physical|service|combo|package|digital|rental), category_id?, price, cost?, unit, tax_rate(0|5|8|10), stock?, duration_min?, buffer_min?, sessions?, valid_days?, deposit?, package_service_ids uuid[]?, allow_use_on_deposit bool, low_stock_threshold?, images jsonb, description, status(active|draft|archived), custom jsonb, deleted_at?)` — giá **chưa VAT**; `product_variant(product_id, sku, name, attrs jsonb, price?, stock, status)` (P1); `product_component(product_id, child_id, qty)` cho combo; `stock_movement(product_id, variant_id?, kind(sale|return|adjust|import), qty, ref_type, ref_id, reason?, actor_id, created_at)` với idx(product_id, created_at desc). Index: gin trigram trên tên; idx(status, type). Quy tắc kho: COMMERCE-DECISIONS §2.

**[T] tenant/sales-*.prisma** — tách theo TIP: `sales-quotes.prisma` (quote, quote_item — TIP-029) · `sales-orders.prisma` (order, order_item — TIP-031) · `sales-payments.prisma` (invoice, customer_payment, customer_package, package_usage, tenant_bank_feed, payment_account — TIP-032)

| Bảng | Trường |
|---|---|
| `quote` | code, version int, root_quote_id?, contact_id, owner_user_id (phụ trách lúc tạo — doanh số), team_id?, template_id?, template_version?, conversation_id?, status(draft\|pending_approval\|approved\|sent\|viewed\|accepted\|revision_requested\|rejected\|expired\|superseded), subtotal, line_discount_total, header_discount (pct\|amount), discount_total, tax_total, total, valid_days (15), valid_until (= sent_at + valid_days), viewed_at?, order_id?, note, created_by_type(user\|agent\|assistant), created_by_id, approved_by?, sent_at?, decided_at?, file_id? |
| `quote_item` | quote_id, product_id?, variant_id?, name, qty numeric(12,2), unit_price (chưa VAT), discount (pct\|amount), tax_rate, line_total, sort — thuế tính sau chiết khấu |
| `order` | code, source(manual\|quote\|contract\|appointment\|marketplace\|pos), external_connection_id?, external_id?, platform_status?, synced_at?, locked_lines bool, owner_user_id, team_id?, contact_id, quote_id? (unique), contract_id?, appointment_id?, conversation_id?, **status(new\|processing\|completed\|cancelled)**, **pay_status(unpaid\|awaiting_deposit\|deposited\|partial\|paid\|partially_refunded\|refunded)**, deposit_required bool, deposit_amount?, subtotal, discount_total, tax_total, total, paid_total, refunded_total, points_used, shipping jsonb? (đơn vị, mã vận đơn, ngày giao dự kiến), confirmed_at?, completed_at?, cancelled_at?, cancel_reason? |
| `order_item` | order_id, product_id?, variant_id?, name, qty, unit_price, discount, tax_rate, line_total |
| `invoice` | **Đề nghị thanh toán** (mã `TT-…`): code, order_id, contact_id, owner_user_id (theo đơn), team_id?, kind(deposit\|installment\|full), status(draft\|sent\|partial\|paid\|overdue\|void), amount, paid_amount, due_date (mặc định +7 ngày), reminders_sent jsonb, sent_at?, file_id?, einvoice_ref? (P2). Index: idx(contact_id, status) INCLUDE(amount, paid_amount, due_date); partial idx(due_date) WHERE status in (sent, partial) |
| `customer_payment` | invoice_id, order_id, contact_id, kind(deposit\|payment\|points\|refund), amount (refund < 0), method(qr\|bank_transfer\|cash\|card\|points), reference?, bank_tx_ref?, status(pending\|confirmed\|failed\|needs_review), confirmed_by?, approval_id? (refund), receipt_file_id? |
| `customer_package` | contact_id, product_id, order_id, total_sessions, used_sessions, expires_at, status(active\|exhausted\|expired\|refunded), extended_by?, note. Index: idx(contact_id, status) |
| `package_usage` | package_id, appointment_id (unique), used_at, reverted_at? |
| `tenant_bank_feed` | provider(sepay\|casso), account_no, secret_enc bytea, status, last_tx_at — DN tự kết nối để đối soát tự động (Q3) |
| `payment_account` | bank_bin, account_no, account_name — tài khoản nhận tiền của DN, dùng sinh VietQR cho khách |

**[T] tenant/contracts.prisma** (D25 — quy tắc ở COMMERCE-DECISIONS §9)

| Bảng | Trường |
|---|---|
| `contract` | code (`HĐ-…`), number?, kind(service\|sale\|framework), contact_id, quote_id? (unique), renewal_of_id?, title, value, start_date?, end_date?, owner_user_id, team_id?, status(draft\|pending_approval\|pending_signature\|signed\|declined\|expired\|terminated), source(template\|upload), template_id?, body_html?, file_id? (PDF hiện hành), signed_file_id?, signed_sha256?, approved_by?, signed_by_business_at?, signed_by_customer_at?, sign_link_expires_at?, terminated_reason?, note, custom jsonb. Index: idx(status, end_date) INCLUDE(contact_id, value); idx(contact_id, created_at desc) |
| `doc_template` | kind(quote\|contract\|payment_request\|receipt), contract_kind?, name, source(rich\|docx), body_html?, docx_file_id?, field_map jsonb (vị trí → biến, đã người xác nhận), checklist_result jsonb, is_default, version, updated_by | idx(kind, is_default); thay `contract_template` (D30 — `standards/documents/templates.md`) |
| `contract_appendix` | contract_id, code, body_html?, file_id?, status (cùng luồng duyệt/ký), signed_file_id?, signed_sha256? |
| `contract_signer` | contract_id \| appendix_id, party(business\|customer), name, email?, phone?, otp_channel(email\|zalo\|sms_none), signature_image_file_id?, signed_at?, ip?, user_agent? |
| `contract_signature_event` | contract_id, appendix_id?, signer_id?, type(sent\|opened\|otp_sent\|otp_ok\|otp_fail\|signed\|declined\|link_extended), doc_sha256, ip, user_agent, created_at — **append-only** (REVOKE UPDATE/DELETE với `appchat_tenant_app`) |
| `contract_sign_token` | token_hash (unique), contract_id, appendix_id?, signer_id, expires_at, used_at? |

**[T] tenant/booking.prisma**

| Bảng | Trường / ràng buộc |
|---|---|
| `staff` | name, user_id?, color, skills (product ids), active |
| `staff_schedule` | staff_id, weekday, start_time, end_time (mặc định lấy theo giờ mở cửa) |
| `appointment` | code, contact_id, owner_user_id? (phụ trách khách lúc đặt), team_id?, service_id (product type=service), staff_id?, start_at, end_at, status(pending\|confirmed\|in_progress\|done\|no_show\|rescheduled\|cancelled\|expired), hold_expires_at?, reschedule_of_id?, reschedule_count, cancel_reason?, source(user\|agent\|assistant\|widget), conversation_id?, note, reminders_sent jsonb. **Ràng buộc:** `EXCLUDE USING gist (staff_id WITH =, tstzrange(start_at, end_at + buffer) WITH &&) WHERE (status IN ('pending','confirmed','in_progress'))`; idx(start_at) INCLUDE(staff_id, status) |

**[T] tenant/support.prisma**

| Bảng | Trường |
|---|---|
| `sla_policy` | name, is_default (không xoá được), frt_human_min (10), ttr_human_min (240), business_hours_only, escalation jsonb, active |
| `ticket` | code, contact_id, conversation_id?, title, description, category, priority(high\|medium\|low), status(open\|in_progress\|waiting\|closed), assignee_user_id?, assignee_agent_id?, team_id?, sla_policy_id, sla_policy_name, frt_due_at, ttr_due_at, first_response_at?, paused_since?, paused_total_sec, sla_result(met\|breached)?, close_reason(resolved\|duplicate\|withdrawn\|out_of_scope)?, csat?, closed_at?, reopened_count. Index: idx(status, ttr_due_at) INCLUDE(priority, assignee_user_id) |
| `ticket_comment` | ticket_id, author_type, author_id, body, internal bool |

**[T] tenant/marketing.prisma** — `segment(name, filter jsonb /* AST điều kiện */, is_dynamic, last_count)`; `campaign(code, name, kind(reactivation|upsell|conversion|aftercare|manual), channel(zalo|email), segment_id, content jsonb {text, variables, cta, attachments}, ab jsonb?, status(draft|pending_approval|approved|scheduled|running|paused|completed|rejected|cancelled), scheduled_at?, approved_by?, approved_at?, est_recipients, est_credits, stats jsonb, suggestion_id?)`; `campaign_recipient(campaign_id, contact_id, status(pending|skipped|sent|failed|replied|converted), skip_reason?, message_id?, sent_at?)` với unique(campaign_id, contact_id); `campaign_suggestion(kind, title, reason, segment_filter, est_count, best_time, channel, status(new|used|dismissed), generated_at)`.

**[T] tenant/loyalty.prisma** — `loyalty_config(id smallint pk = 1, enabled, earn_vnd_per_point (10000), redeem_vnd_per_point (100), tiers jsonb [{key:'member',min:0,mult:1},{key:'silver',min:5000,mult:1},{key:'gold',min:15000,mult:1.5},{key:'diamond',min:40000,mult:2}], expiry_months (12), max_redeem_pct (50), tier_window_months (12), tier_review (quarterly))`; `loyalty_ledger(contact_id, delta, balance_after, kind(earn|redeem|adjust|expire|reverse), reason, ref_type, ref_id, expires_at?, remaining?, actor_type, actor_id, reversed_by_id?)` với idx(contact_id, created_at desc); unique(kind, ref_type, ref_id) WHERE kind='earn' — chống cộng điểm hai lần. Quy tắc: COMMERCE-DECISIONS §7.

**[T] tenant/ai-*.prisma** (riêng `agent_template` ở [P] platform/templates.prisma) — `ai_run`, `ai_run_step` → ai-runs (TIP-019) · `kb_*` → ai-kb (TIP-020) · `ai_agent`, `agent_template`, `approval_request`, `ai_governance` → ai-agents (TIP-021) · `assistant_*` → ai-assistant (TIP-023) · `ai_task` → ai-tasks (TIP-035)

| Bảng | Trường |
|---|---|
| `ai_agent` | name, emoji?, avatar_file_id?, role(sales\|cs\|booking\|marketing\|accounting\|ops\|custom), language(vi\|en\|bilingual\|auto), persona, tone, system_prompt, intents text[], model_tier(standard\|advanced\|max), tool_ids text[] (action ids), kb_scope jsonb `{folder_ids[], tags[]}`, channel_account_ids uuid[], confidence_threshold (0.7), approval_rules jsonb, working_hours jsonb, status(draft\|active\|paused), template_key?, created_via(manual\|template\|assistant), created_by, **published_version_id?**, draft_dirty bool. Các cột cấu hình là **bản nháp**; agent chạy theo `published_version_id` (D29) |
| `ai_agent_version` | agent_id, version int, config jsonb (snapshot đủ cấu hình), published_by, published_at, note? | unique(agent_id, version); idx(agent_id, version desc) |
| `agent_template` **[P]** | key, role, industry_group?, industry?, name, description, defaults jsonb |
| `kb_folder` | name, parent_id?, visibility(public\|internal), sort, version (TIP-020b — CAS) | idx(parent_id); unique f_unaccent(lower(btrim(name))) (TIP-020b) |
| `kb_source` | folder_id?, origin(upload\|url\|text\|catalog\|conversation\|drive), kind(pdf\|docx\|xlsx\|csv\|txt\|md\|url\|text\|product), name, tags text[], visibility(public\|internal), file_id?, url?, product_id?, sha256?, status(pending\|processing\|ready\|failed), error?, chunk_count, size_bytes, created_by, refreshed_at, deleted_at? | idx(folder_id, status) WHERE deleted_at IS NULL; gin(tags); unique(sha256) WHERE deleted_at IS NULL |
| `kb_chunk` | source_id, ord, content, content_norm (= f_unaccent(lower(content))), embedding vector(1536), embed_model, token_count, meta jsonb `{path[], page?, row?, volatile?}` | `hnsw (embedding vector_cosine_ops)`; `gin (content_norm gin_trgm_ops)`; idx(source_id, ord) |
| `kb_suggestion` (P1) | conversation_id, question, answer, source_message_ids uuid[], status(pending\|approved\|rejected), edited bool, fingerprint, cutoff_message_id, run_id?, reviewed_by?, reviewed_at?, reject_reason?, kb_source_id?, version | *TIP-043:* covering idx(status, created_at desc, id desc) INCLUDE (conversation_id, version, kb_source_id) + deferred join; unique(fingerprint); unique(kb_source_id); idx(conversation_id). Câu hỏi / đáp án lưu **đã che PII**; không có nguồn / đoạn KB tới khi duyệt |
| `ai_run` | kind(agent_reply\|assistant\|delegate\|consult\|task\|suggestion), parent_run_id?, root_run_id?, depth, state jsonb? (messages + pending tool call khi chờ duyệt), agent_id?, agent_version int?, dry_run bool, conversation_id?, assistant_session_id?, task_id?, initiated_by_user_id?, status(queued\|running\|waiting_approval\|completed\|failed\|cancelled\|handoff), plan jsonb?, input jsonb, output jsonb?, error?, confidence?, credits_used, started_at, finished_at. Index: idx(status, started_at desc) |
| `ai_run_step` | run_id, idx, type(llm\|tool\|delegate\|consult\|handoff\|ui_command), agent_id?, action_id?, input jsonb, output jsonb, status, provider?, model?, tokens_in, tokens_out, credits, latency_ms |
| `approval_request` | run_id, step_id, action_id, input jsonb, preview jsonb, risk, reason, status(pending\|approved\|rejected\|edited\|expired), requested_at, decided_by?, decided_at?, decision_note?. partial idx(requested_at desc) WHERE status='pending' |
| `assistant_session` | user_id, title, mode(chat\|cowork), last_message_at, archived_at? |
| `assistant_message` | session_id, role(user\|assistant\|tool), content jsonb (parts: text, card, ui_command, attachment), run_id? |
| `ai_task` | name, goal, department, agent_id, trigger(manual\|schedule\|event), cron?, event_type?, data_scope jsonb, tool_ids text[], credit_limit_per_run, ask_before_send bool, model_tier, status(active\|paused), last_run_at, next_run_at |
| `ai_governance` | id smallint pk = 1, banned_words text[], force_approval jsonb (quote_total_over 20000000, discount_over_pct 5, refund always, bulk_send, contract), pii_filter bool, default_threshold |

**[T] tenant/authz.prisma** (D27 — chuẩn `standards/authz/rbac-permissions.md`)

| Bảng | Trường | Ràng buộc / index |
|---|---|---|
| `role` | key text, name, is_system bool, permissions text[], data_scope jsonb `{inbox:'own', crm:'own', sales:'own', …}`, version int (CAS), deleted_at? (xoá mềm vai trò tuỳ biến — TIP-042), created_at | unique(key). Seed 5 vai trò hệ thống khi provision; tuỳ biến `custom:<uuid>` do server sinh. idx `(is_system DESC, created_at, id) INCLUDE(name, version) WHERE deleted_at IS NULL` |
| `team` | name, lead_user_id? (phải là thành viên), version int (CAS), created_at | idx `(created_at, id) INCLUDE(name, version, lead_user_id)` (TIP-042) |
| `team_member` | team_id, user_id | pk(team_id, user_id); idx(user_id) |
| `authz_revision` | id smallint = 1 (singleton), revision bigint, updated_at | pk(id) CHECK id = 1. Mọi role.\* / team.\* tăng trong cùng giao dịch tenant; AuthzResolver đọc mỗi lần và đưa vào khoá cache — sửa / thu hồi quyền có hiệu lực ở request kế tiếp, không chờ TTL / event (TIP-042) |

- Bảng nghiệp vụ có chủ sở hữu (`contact`, `conversation`, `quote`, `contract`, `order`, `invoice`, `appointment`, `ticket`) có `owner_user_id` và/hoặc `assignee_user_id` + `team_id?`, cùng index theo `standards/database/indexing.md` §7:
  - `contact(owner_user_id, last_interaction_at DESC) WHERE deleted_at IS NULL` · `contact_collaborator(user_id, contact_id)`
  - `conversation(assignee_user_id, status, last_message_at DESC)` · `ticket(assignee_user_id, status, created_at DESC)`
  - `quote(owner_user_id, status, created_at DESC)` · `order(owner_user_id, status, created_at DESC)` · `invoice(owner_user_id, status, due_date)` · `contract(owner_user_id, status, end_date)` · `appointment(owner_user_id, start_at)`
  - Bản `team`: `(team_id, …)` cùng thứ tự, partial `WHERE team_id IS NOT NULL`.

**[T] tenant/integrations.prisma** (D28 — chuẩn `standards/integrations/provider-ports.md`)

| Bảng | Trường | Ràng buộc / index |
|---|---|---|
| `integration_connection` | connector_key text, port text, name, mode(sandbox\|live), status(connected\|error\|disconnected), config jsonb, secret_enc bytea, last_sync_at?, last_error?, created_by | idx(port, status); unique partial (connector_key) WHERE status <> 'disconnected' (DC-044) |
| `integration_mapping` | connection_id, entity, local_id, external_id, synced_at | unique(connection_id, entity, local_id); unique(connection_id, entity, external_id) |
| `integration_call_log` | connection_id, op, ref_type, ref_id, idempotency_key, status, latency_ms, error?, created_at | unique(idempotency_key); idx(connection_id, created_at desc) |
| `integration_event` | connection_id, external_event_id, kind, payload jsonb, processed_at? | unique(connection_id, external_event_id); partial (connection_id, created_at) WHERE processed_at IS NULL |

- `tenant_bank_feed` (sales) là một `integration_connection` port `bank_feed`; giữ bảng feed riêng cho khớp mã `TT-xxxxxx`, tham chiếu `connection_id`.

**[T] tenant/kernel.prisma** (hạ tầng chung — TIP-002)

| Bảng | Trường |
|---|---|
| `action_log` | action_id, risk, source(ui\|assistant\|agent\|task\|system\|api), actor_type(user\|agent\|assistant\|system), actor_id, on_behalf_of_user_id?, run_id?, input jsonb, before jsonb?, after jsonb?, result jsonb?, status(succeeded\|failed\|undone), error?, undo_until?, undone_by?, undone_at?, created_at. Index: idx(created_at desc) INCLUDE(action_id, actor_type, status); idx(run_id). **Đây cũng là audit log.** |
| `outbox_event` | id, topic, payload jsonb, status(pending\|published\|failed), attempts, available_at, created_at. idx(status, available_at) |
| `idempotency_key` | key, route, request_hash, response jsonb, status_code, created_at. pk(key); TTL 24h (job dọn) |
| `file` | storage_key, name, mime, size, sha256, uploaded_by, purpose |
| `sequence_counter` | kind, value | pk(kind) |
| `notification` | user_id, type (loại `NOTIFY_KINDS`), title (render theo locale người nhận), body, link, read_at?. idx(user_id, created_at desc, id desc) + partial `WHERE read_at IS NULL` (TIP-006) |
| `event_consumption` | event_id, consumer, created_at. pk(event_id, consumer) — khoá idempotent consumer `events` (outbox §4, TIP-006 DC-027) |

### 2.3 Domain events (outbox → BullMQ queue `events`)

| Event | Payload | Consumer |
|---|---|---|
| `message.received` | ws, conversation_id, message_id, contact_id | ai (agent reply nếu auto), support (FRT), crm (last_interaction), notify |
| `message.sent` | … | support (first_response), marketing (stats) |
| `conversation.handoff` | reason, summary | notify Owner/assignee |
| `contact.created` / `contact.merged` / `contact.stage_changed` | | timeline, marketing segments, ai tasks |
| `lead.routing_requested` | contact_id, conversation_id, channel_account_id, message_id | consumer `crm.lead-routing` (ROLE=jobs) → `lead_routing.apply` nguồn system — chỉ khi tin 1-1 live vừa tạo khách (không nhóm / khớp khách cũ / lịch sử) (TIP-042b) |
| `quote.sent` / `quote.viewed` / `quote.accepted` / `quote.rejected` / `quote.expired` | | crm stage (COMMERCE-DECISIONS §8); timeline; nhắc hết hạn |
| `contract.approved` / `contract.sent_for_signature` / `contract.signed` / `contract.declined` / `contract.expiring` (T-30) / `contract.expired` / `contract.terminated` | contract_id, contact_id | crm stage → Hợp đồng; timeline; thông báo Owner; gửi PDF đã ký 2 bên; nhắc gia hạn; gợi ý agent |
| `order.confirmed` | order_id | trừ kho (`stock_movement`), sinh `customer_package` nếu đủ điều kiện |
| `order.completed` / `order.cancelled` | total, net_before_vat, contact_id | loyalty earn (một lần) / reverse; crm stage → Đã mua; total_spent; hoàn kho + yêu cầu hoàn tiền khi huỷ |
| `payment.confirmed` / `payment.refunded` | invoice_id, order_id, amount | tính lại `invoice.status` + `order.pay_status`; phiếu thu; sinh gói khi đã đủ tiền |
| `invoice.overdue` | | nhắc khách T+1 / T+7; công nợ |
| `appointment.created` / `confirmed` / `completed` / `no_show` / `cancelled` | | reminders, timeline, ai tasks; `completed` → trừ buổi `customer_package` hoặc **gợi ý** tạo đơn (8b) |
| `ticket.sla_warning` / `ticket.sla_breached` / `ticket.closed` | | notify, escalation, csat |
| `campaign.approved` / `campaign.completed` | | sender job, campaign stats |
| `ai.run.completed` / `approval.requested` / `approval.decided` | | WS push, notify, resume run |
| `credits.low` / `credits.exhausted` / `credits.restored` | | notify; inbox chuyển hội thoại auto về người / mở lại |
| `subscription.changed` / `trial.expired` | | quota, notify |
| `notify.requested` | kind, to { user_ids?, permission? }, params, link?, exclude_user_id? | notify: ghi `notification` theo locale người nhận → WS `notification.new` → email theo tuỳ chọn (TIP-006) |
| `member.role_changed` / `member.removed` | user_id | xoá cache AuthzContext; WS `authz.changed` → FE tải lại `me/authz`; gỡ gán hội thoại khi bị xoá |
| `contact.owner_changed` / `contact.collaborator_changed` | contact_id, from, to, moved: {conversations, quotes, appointments} | timeline; thông báo hai bên; gán lại hội thoại đang mở (D32) |
| `contact.access_requested` / `contact.access_decided` | request_id | thông báo owner của khách / Quản lý (Việc cần tôi); thông báo người xin |
| `agent.published` / `agent.paused` / `agent.deleted` | agent_id, version | làm mới routing agent theo kênh; WS; thông báo |
| `kb.source_ready` / `kb.source_failed` | source_id, chunk_count / error | WS cập nhật trang Dữ liệu RAG; thông báo khi lỗi |
| `kb.suggestion_created` (P1) | suggestion_ids (1–5), conversation_id — *TIP-043:* chỉ id | thông báo `ai_review` (biến thể kb, link `/settings/rag_data?nav=review`) cho người có `kb.manage`; WS `kb.suggestion` |
| `kb.suggestion_approved` / `kb.suggestion_rejected` (TIP-043) | suggestion_id (+ source_id, ingest_seq khi duyệt) | consumer `kb-suggest` đẩy lại `kb-ingest` cho nguồn mới; WS |
| `conversation.updated` → `kb-suggest` (TIP-043) | change `status` / `bulk` + hội thoại `closed` | job đề xuất theo mốc tin cuối (ROLE=ai, AiRunner run kind `suggestion`, trần 20 credit, prompt `kb-suggestion` v2) |
| `order.imported` / `order.external_updated` | order_id, connection_id | như `order.confirmed` / `completed` / `cancelled` theo trạng thái ánh xạ (kho; loyalty **chỉ khi** bật cho kết nối); timeline (D31) |
| `integration.connected` / `integration.error` / `integration.disconnected` | connection_id, connector_key | thông báo; metric `integration_connection_status`; trang Nền tảng kết nối |
| `integration.event_received` | connection_id, connector_key, port, event_id, kind | consumer domain theo port xử lý `integration_event` (TIP-010 / 031 / 032) — TIP-012 |
| `document.rendered` / `document.render_failed` | ref_type, ref_id, file_id | gắn `file_id` vào chứng từ; WS; lỗi thì thông báo người tạo (D30) |

---

## 3. ACTION REGISTRY (lõi "Action-first")

### 3.1 Định nghĩa (`packages/actions`)

```ts
// packages/actions/src/define.ts
export type Risk = 'read' | 'write' | 'send' | 'money' | 'delete' | 'config';
export type Permission = PermissionKey | 'platform_admin';   // PermissionKey = `<module>.<verb>` — standards/authz/rbac-permissions.md (D27)
export interface ActionDef<I extends z.ZodTypeAny, O extends z.ZodTypeAny> {
  id: string;                 // 'quote.send' — <domain>.<verb>
  module: ModuleKey;          // dùng cho nav, quyền, nhóm hiển thị
  title: string;              // i18n key 'actions.quote.send.title'
  description: string;        // mô tả tiếng Anh cho LLM (ngắn, rõ, có ví dụ)
  input: I; output: O;        // zod; sinh JSON Schema cho tool-use + OpenAPI
  permission: Permission;
  risk: Risk;
  bulk?: boolean;             // thao tác nhiều bản ghi → luôn preview số lượng
  agentGrantable: boolean;    // có được cấp cho AI Agent trực kênh không
  skill?: boolean;            // nhóm "Kỹ năng AI" trong Builder (chỉ risk 'read') — D51
  requiresConnector?: string; // key connector / channel type; chưa kết nối thì tool không vào run — D51
  undo?: { windowSec: number };   // có hoàn tác + thời hạn
  invalidates: string[];      // query keys FE cần refetch
  uiTarget?: (o: z.infer<O>) => UiCommand;   // deep-link kết quả
}
export const defineAction = <I, O>(d: ActionDef<I, O>) => d;
// packages/actions/src/<domain>.ts — mỗi file một TIP (stub rỗng tạo sẵn ở TIP-001)
// packages/actions/src/index.ts — export registry = [...identity, ...inbox, ...] (TIP-001 tạo sẵn đủ import)
```

### 3.2 Thực thi (`packages/core/kernel`)

```ts
interface ActionContext {
  workspaceId: string; source: 'ui'|'assistant'|'agent'|'task'|'system'|'api';   // 'mcp' dành sẵn cho P2 (D37)
  actor: { type: 'user'|'agent'|'assistant'|'system'; id: string };
  onBehalfOfUserId?: string;   // assistant / task luôn mang user gốc → quyền = quyền user đó
  runId?: string; stepId?: string; idempotencyKey?: string; confirmToken?: string;
}
interface ActionHandler<I, O> {
  execute(ctx: ActionContext, input: I, tx: DbTx): Promise<O>;
  preview?(ctx: ActionContext, input: I, tx: DbTx): Promise<ActionPreview>; // diff before/after, count
  undo?(ctx: ActionContext, log: ActionLogRow, tx: DbTx): Promise<void>;
}
// @ActionHandler('quote.send') — đăng ký qua decorator; boot fail nếu registry có id thiếu handler
```

**`ActionExecutor.execute(ctx, id, input)`**, các bước theo đúng thứ tự:

1. Tra registry. Không có action → `ACTION_NOT_FOUND`.
2. Zod parse input, lỗi → `422`.
3. Kiểm `can(authz, def.permission)` theo vai trò của `onBehalfOfUserId ?? actor`, rồi kiểm **data scope** của bản ghi đích (`own|team|all`); ngoài scope → `SCOPE_FORBIDDEN` (D27).
4. Áp **policy** (§3.3). Kết quả là chạy ngay, hoặc trả `PREVIEW_REQUIRED` (kèm preview + `confirm_token` lưu Redis 10 phút, gắn với hash của input), hoặc tạo `APPROVAL_REQUIRED` (insert `approval_request`).
5. Kiểm `Idempotency-Key`.
6. Mở transaction trên DB tenant của workspace (qua `TenantDbResolver`), gọi `handler.execute`, ghi `action_log` (before/after), ghi `outbox_event`. Action có `db: 'platform'` (billing, member, workspace, admin) chạy transaction trên DB nền tảng; action_log vẫn ghi vào DB tenant (admin.* ghi `platform_audit_log`).
7. Trả `{ result, actionLogId, undoUntil?, uiTarget? }`.

### 3.3 Policy theo nguồn × rủi ro

| Nguồn \ Risk | read | write | send | money | delete | config |
|---|---|---|---|---|---|---|
| `ui` (người bấm) | chạy | chạy | chạy | chạy | chạy (UI tự hiện dialog xác nhận) | chạy (theo permission của action, §3.5) |
| `assistant` | chạy | **preview → xác nhận** | preview → xác nhận | preview → xác nhận | preview → xác nhận | preview → xác nhận |
| `agent` (trực kênh) | chạy | chạy nếu được cấp và confidence ≥ ngưỡng, không thì approval | chỉ trả lời trong hội thoại đang phục vụ; gửi khác → approval | **approval** | **cấm** | **cấm** |
| `task` (Cowork) | chạy | chạy trong `data_scope` | approval nếu `ask_before_send` | approval | luôn approval | cấm |

- `bulk=true` luôn yêu cầu preview kèm số bản ghi, kể cả khi nguồn là `ui`.

### 3.3b Quyền hiệu lực khi agent làm thay người (D51)

- **Một nơi cấp quyền:** quyền của agent = `ai_agent.tool_ids`, chỉ sửa ở Builder AI Agents (`agent.update`). Menu ＋ Hộp thư và drawer Cowork chỉ đọc.
- **Agent trực kênh** (`source=agent`, không có người ra lệnh): quyền hiệu lực = `tool_ids` của agent, áp policy §3.3.
- **`delegate` từ Trợ lý AI** và **tác vụ Cowork** (`source=assistant` / `task`): quyền hiệu lực = **`tool_ids` của agent ∩ permission của người ra lệnh** (`initiated_by_user_id`), và **data scope theo người ra lệnh** (`ai_task.data_scope` không được rộng hơn scope của người tạo).
  - Kiểm ở `ActionExecutor` cho **mỗi** lần gọi tool, không chỉ lúc tạo task. Người ra lệnh mất quyền sau đó thì lần gọi kế tiếp bị chặn.
  - Tool ngoài giao → không đưa vào danh sách tool của run. Nếu vẫn bị gọi → `FORBIDDEN`, ghi `ai_run_step` lỗi, run tiếp tục với các tool còn lại.
  - `action_log.on_behalf_of_user_id` = người ra lệnh; `actor_type=agent`, `actor_id` = agent.
  - `delegate` lồng nhau: run con kế thừa giao của run cha (giao càng sâu càng hẹp).
  - **Kiến thức (D54):** `kb.search` trong run giao dùng `kb_scope` của agent ∩ quyền đọc của người ra lệnh, được trả `internal` người đó được xem. Agent trực kênh trả lời khách chỉ nhận `public` trong `kb_scope`; Trợ lý (không có `kb_scope`) tìm cả kho trong quyền của người hỏi.
- **Connector không phải quyền của agent:** action cần connector khai báo `requiresConnector` trong `ActionDef` (§3.1). Connector chưa kết nối thì tool vẫn hiện trong Builder (badge *Cần kết nối X*), nhưng không đưa vào run; chưa có manifest thì hiện *Sắp có*.
- **Builder hiển thị Tools** theo `ActionDef.module` (Hộp thư, Khách hàng, Bán hàng, Lịch hẹn, Hỗ trợ, Marketing, Loyalty…) + nhóm **Kỹ năng AI** (`skill: true`), mỗi nhóm n/tổng. Nguồn: `GET /v1/agents/:id/tools` (§4.4).
- Luật **governance** luôn ép approval, không phụ thuộc bảng trên: báo giá > 20.000.000₫, giảm giá ngoài chính sách, hoàn tiền, gửi hàng loạt, hợp đồng.
- Từ cấm: chặn nội dung, đặt `handoff`.

### 3.4 Danh mục action (đầy đủ cho phát hành)

Cột "Agent" = `agentGrantable`. Cột "Undo" = có hoàn tác (thời hạn). **Permission** của từng action theo §3.5 (tên nhóm ghi cạnh tiêu đề module; chỗ ghi permission riêng thì theo chỗ đó).

**identity / settings** (risk config; permission ghi theo `<module>.<verb>`, ví dụ `members.manage`, `settings.manage` — xem `standards/authz/rbac-permissions.md`)
- `workspace.update`
- `business_profile.update`
- `member.invite` (send)
- `member.remove` (delete)
- `member.set_role`
- `invite.revoke`
- `profile.update` (mọi thành viên, write)
- `working_hours.update`
- `profile_layout.create` / `profile_layout.update` / `profile_layout.duplicate` / `profile_layout.delete` / `profile_layout.assign_role` (config, `settings.manage`; mẫu hệ thống không xoá được — REQ-F12, M05)
- `notification.mark_read` (mọi thành viên, write)
- `notification.update_prefs` (self, write, `db: 'platform'` — tuỳ chọn thông báo của tôi, bảng nền tảng `notification_pref`; TIP-006)
- `role.create` / `role.update` / `role.delete` (P1, permission `roles.manage`; vai trò hệ thống không sửa được)
- `team.create` / `team.update` / `team.set_members` (P1)
- `workspace.transfer_ownership` (owner, OTP)
- `integration.connect` / `integration.disconnect` / `integration.test` / `integration.sync_now` / `integration.register_interest` (permission `integrations.manage`; `register_interest` = write)

**channels** (`channels.manage`)
- `channel.zalo.start_login`: trả QR qua WS.
- `channel.email.connect`
- `channel.update_settings`
- `channel.reconnect`
- `channel.disconnect` (`channels.manage`)
- `webchat.update_widget`
- `channel.test` (read — kiểm tra kết nối; form Email IMAP / SMTP gọi trước khi lưu, REQ-B10)
- `channel.pause` / `channel.resume` (config)
- `channel.sync_history` (write; `history_days` 0 / 7 / 30 / 90 — REQ-B11)
- Mọi action kênh nhận `channel_account_id` (một kênh nhiều tài khoản — REQ-B09); `channel.disconnect` tài khoản cuối → kênh thành Chưa kết nối.

**inbox** (`inbox.view` đọc · `inbox.reply` gửi / ghi chú · `inbox.assign` gán · `inbox.manage` thẻ, câu trả lời mẫu)

| Action | Risk | Agent | Undo |
|---|---|---|---|
| `conversation.search` | read | ✓ | |
| `conversation.get` | read | ✓ | |
| `conversation.assign` | write | ✓ | 24h |
| `conversation.set_ai_mode` | write | | 24h |
| `conversation.tag` | write | ✓ | 24h |
| `conversation.untag` | write | | 24h |
| `conversation.set_status` | write | ✓ | 24h |
| `conversation.pin` | write | | |
| `conversation.archive` | write | | 7d |
| `conversation.mark_read` | write | | |
| `conversation.bulk_update` | write, bulk | | 24h |
| `conversation.handoff` | write | ✓ | |
| `message.send` | send | ✓ chỉ hội thoại hiện tại | |
| `message.recall` | send (chỉ tin của mình) | | |
| `message.delete` | delete (xác nhận) | | 24h |
| `message.react` / `message.unreact` | write (kênh có `capabilities.reactions`) | | |
| `message.pin` / `message.unpin` | write → `conversation.pinned_message_id` | | |
| `message.forward` | send (sang hội thoại khác) | | |
| `conversation.set_tags` | write (gắn nhiều thẻ một lần; thẻ mới qua `tag.create`) | ✓ | 24h |
| `conversation.hide` / `conversation.unhide` | write → `hidden_at` (D50) | | 24h |
| `conversation.clear_history` | delete (xác nhận) | | |
| `note.add` | write | | 24h |
| `canned_reply.create` / `canned_reply.update` / `canned_reply.delete` | config | | |
| `tag.create` / `tag.update` / `tag.delete` | config | | |

Ghi chú ver2.1 (REQ-C09, C10, C13): `message.send` nhận `reply_to_id?` (trích tin); `conversation.set_status` với `snoozed` bắt buộc `snoozed_until` (1 giờ / 3 giờ / sáng mai / tuỳ chọn); `conversation.assign` nhận `user_id` **hoặc** `agent_id`; Vòng đời trong menu ⋯ gọi `contact.set_stage` (D49); Dịch tin dùng `ai.translate` (Kỹ năng AI); Tạo nhóm Zalo "Sắp có" (D50). Không có action gọi video / gọi điện (D07).

**crm** (`crm.view` · `crm.edit` · `crm.delete` · `crm.import` · `crm.export` · `crm.reassign` · `crm.fields_manage`)

| Action | Risk | Agent | Undo |
|---|---|---|---|
| `contact.search` | read | ✓ | |
| `contact.get_360` | read | ✓ | |
| `contact.create` | write | ✓ | 24h |
| `contact.update` | write | ✓ | 24h |
| `contact.set_stage` | write | ✓ | 24h |
| `contact.tag` | write | ✓ | 24h |
| `contact.add_note` | write | ✓ | 24h |
| `contact.send_email` | send, `requiresConnector: 'email'` (modal soạn: từ tài khoản email, đến, 3 mẫu — REQ-F11) | | |
| `contact.remember` | write | ✓ | |
| `contact.bulk_update` | write, bulk | | 24h |
| `contact.merge` | write | | 7d |
| `contact.add_collaborator` / `contact.remove_collaborator` | write (owner của khách hoặc `crm.reassign`) | | 24h |
| `contact.transfer_owner` | write (`crm.reassign`; tuỳ chọn chuyển hội thoại / báo giá / lịch hẹn) | ✓ (đề xuất → approval) | 24h |
| `contact.request_access` / `contact.decide_access` | write | | |
| `contact.delete` | delete | | 30d, xoá mềm |
| `contact.import` | write, bulk | | 24h, theo lô |
| `contact.export` | read | | luôn preview |
| `contact.forget` | delete, `privacy.erase` (chỉ Chủ sở hữu) | | không hoàn tác: ẩn danh hoá |
| `custom_field.define` / `custom_field.update` / `custom_field.delete` | config | | |

**catalog** (`catalog.view` · `catalog.manage` · `stock.adjust`)

| Action | Risk | Agent | Undo |
|---|---|---|---|
| `product.search` | read | ✓ | |
| `product.get` | read | ✓ | |
| `product.create` | write | | 24h |
| `product.update` | write | | 24h |
| `product.archive` | delete | | 30d |
| `product_variant.create` / `product_variant.update` / `product_variant.archive` | write | | 24h |
| `stock.get` | read | ✓ | |
| `product.import` | write, bulk | | |
| `category.create` / `category.update` / `category.delete` | config | | |

**sales** (quy tắc: `plans/COMMERCE-DECISIONS.md`; `quote.*` · `contract.*` · `order.*` · `invoice.manage` · `payment.record` · `payment.refund_request` · `payment.refund_approve` · `finance.manage` · `documents.manage`)

| Action | Risk | Agent | Undo |
|---|---|---|---|
| `quote.create` | write | ✓ | 24h, khi chưa gửi |
| `quote.update` | write, chỉ ở draft | ✓ | |
| `quote.submit_for_approval` | write (tự động khi vượt ngưỡng) | ✓ | |
| `quote.approve` / `quote.reject_internal` | money, `quote.approve` | | |
| `quote.send` | send | ✓ khi đúng policy | |
| `quote.request_revision` | write, tạo version n+1 | ✓ | |
| `quote.mark_accepted` | write | ✓ (≥ 70% tin cậy) | 24h |
| `quote.mark_rejected` | write | ✓ | 24h |
| `quote.extend_validity` | write | | 24h |
| `contract.create` | write (nháp, từ mẫu hoặc upload) | ✓ chỉ nháp | 24h |
| `contract.create_from_quote` | write ("→ Hợp đồng") | ✓ chỉ nháp | 24h |
| `contract.update` | write, chỉ draft | ✓ | 24h |
| `contract.submit` | write (→ Chờ duyệt) | ✓ | |
| `contract.approve_and_sign` | money, **`contract.sign`** (mặc định chỉ Chủ sở hữu; cấp được cho Quản lý được uỷ quyền) (OTP + chữ ký) | | |
| `contract.request_changes` / `contract.reject_internal` | write, `contract.review` | | |
| `contract.send_for_signature` | send, `contract.sign` | | |
| `contract.remind_signer` / `contract.extend_sign_link` | send | ✓ | |
| `contract.terminate` | money, `contract.sign`, lý do bắt buộc | | |
| `contract.renew` | write (tạo bản mới) | ✓ chỉ nháp | 24h |
| `contract.create_appendix` | write (cùng luồng duyệt/ký) | ✓ chỉ nháp | 24h |
| `doc_template.create` / `doc_template.update` / `doc_template.delete` | config (`documents.manage`) | | 24h |
| `doc_template.detect_fields` | read (AI nhận diện biến DOCX) | | |
| `quote.draft_from_content` | write (AI soạn nháp từ nội dung — D30) | ✓ chỉ nháp | 24h |
| `contract.draft_from_content` | write (AI soạn nháp, khối `ai_suggested`) | ✓ chỉ nháp | 24h |
| `order.import_external` | write (system, từ OrderSyncProvider — D31) | | |
| `order.sync_now` | write (`integrations.manage`) | | |
| `order.create_from_contract` | write ("→ Đơn hàng" từ HĐ đã ký) | ✓ | 24h |
| `order.create` | write | ✓ | 24h, khi ở new |
| `order.create_from_quote` | write ("→ Đơn hàng") | ✓ khi khách chốt | 24h |
| `order.create_from_appointment` | write (gợi ý 8b, người/agent xác nhận) | ✓ | 24h |
| `order.update` | write (new; processing khi chưa thu) | ✓ | 24h |
| `order.set_deposit` | write | ✓ | 24h |
| `order.confirm` | write (new → processing, trừ kho) | ✓ | 24h |
| `order.complete` | money (cộng điểm) | | 24h, đảo điểm |
| `order.cancel` | money (lý do bắt buộc; đã thu → sinh hoàn tiền) | | |
| `order.update_shipping` | write | ✓ | 24h |
| `invoice.create` | write (đề nghị thanh toán: cọc / đợt / toàn bộ) | ✓ | 24h |
| `invoice.send_payment_qr` | send | ✓ | |
| `invoice.record_payment` | money (xác nhận tay) | | 24h |
| `invoice.resolve_bank_match` | money (hàng "Cần đối soát") | | 24h |
| `invoice.void` | money | | |
| `payment.refund` | money, `payment.refund_request`; **luôn duyệt** bởi `payment.refund_approve` | | |
| `payment.redeem_points` | money (≤ 50% giá trị đơn) | | 24h |
| `package.extend` | write | | 24h |
| `package.adjust_sessions` | write, lý do bắt buộc | | 24h |
| `stock.adjust` | write, lý do bắt buộc | | 24h |
| `payment_account.update` | config, `finance.manage` | | |
| `bank_feed.connect` / `bank_feed.disconnect` | config, `finance.manage` | | |

**booking** (`booking.view` · `booking.manage` · `booking.config`)

| Action | Risk | Agent | Undo |
|---|---|---|---|
| `appointment.find_slots` | read | ✓ | |
| `appointment.list` | read | ✓ | |
| `appointment.create` | write | ✓ | 24h |
| `appointment.confirm` | write | ✓ | 24h |
| `appointment.reschedule` | write | ✓ | 24h |
| `appointment.cancel` | write, lý do bắt buộc | ✓ | 24h |
| `appointment.check_in` | write | | 24h |
| `appointment.complete` | write | | 24h |
| `appointment.mark_no_show` | write | | 24h |
| `staff.create` / `staff.update` / `staff.deactivate` | config | | |
| `business_hours.update` | config | | |

**support** (`ticket.view` · `ticket.manage` · `sla.manage`)

| Action | Risk | Agent | Undo |
|---|---|---|---|
| `ticket.search` | read | ✓ | |
| `ticket.create` | write (`source_message_id?` — tạo từ tin nhắn, điền sẵn; REQ-C09) | ✓ | 24h |
| `ticket.update` | write | | 24h |
| `ticket.assign` | write | ✓ | 24h |
| `ticket.set_status` | write | ✓ | 24h |
| `ticket.comment` | write | ✓ | 24h |
| `ticket.close` | write, lý do bắt buộc | ✓ | 24h |
| `ticket.reopen` | write | | |
| `ticket.bulk_update` | write, bulk | | 24h |
| `sla.update_default` | config | | |

**marketing** (`campaign.view` · `campaign.manage` · `campaign.approve`)

| Action | Risk | Agent | Undo |
|---|---|---|---|
| `segment.preview` | read | | |
| `segment.create` / `segment.update` / `segment.delete` | write | | |
| `campaign.suggest` | read, AI | | |
| `campaign.create` | write | | 24h |
| `campaign.update` | write, chỉ draft | | |
| `campaign.submit` | write | | 24h |
| `campaign.send_test` | send | | |
| `campaign.approve` | send, bulk, `campaign.approve`, **luôn xác nhận** | | |
| `campaign.reject` | write | | |
| `campaign.pause` | write | | |
| `campaign.resume` | write | | |
| `campaign.cancel` | write | | |
| `campaign.delete` | delete | | |

**loyalty** (`loyalty.view` · `loyalty.adjust` · `loyalty.config`)
- `loyalty.get_member`: read, agent ✓.
- `loyalty.update_config`: config.
- `loyalty.adjust_points`: money; bắt buộc 1 trong 7 lý do; undo 24h.
- *Bổ sung hợp đồng TIP-036 (không đổi luật COMMERCE §7):* `loyalty.get_member` trả thêm `value` (điểm × 100đ, string VND) + `vnd_per_point`; `loyalty.attach_file` (crm.edit, write, undo 24h — gắn tệp tự tải lên vào thành viên); `payment.redeem_points` (payment.record, money, undo 24h, module sales — khoá đề nghị → đơn → khách → lô, trần 50% đơn, DC-350); action hệ thống `loyalty.earn` / `reverse` / `expire` / `review_tier` chỉ consumer `order.completed` · `order.cancelled` · `payment.refunded` + job `loyalty.sweep` gọi (actor `system:loyalty`, không qua HTTP / Trợ lý — DC-348/349). `contact.get` / `get_360` trả thêm `tier`.

**ai** (`assistant.use` · `agents.manage` · `kb.manage` · `approvals.decide` · `ai.governance` · `ai_task.manage`)

| Action | Risk | Agent | Undo |
|---|---|---|---|
| `agent.draft_from_description` | read | | |
| `agent.create` | config | | |
| `agent.create_and_publish` | config | | 24h (= pause + xoá) |
| `agent.update` | config | | 24h |
| `agent.optimize_prompt` | read | | |
| `agent.publish` | config | | |
| `agent.rollback` | config | | |
| `agent.pause` | config | | |
| `agent.delete` | delete | | 30d |
| `agent.test` | read (giả lập: action chỉ preview) | | |
| `kb.search` | read | ✓ | |
| `kb.add_source` | write | | |
| `kb.update_source` (thư mục, thẻ, visibility) | write | | 24h |
| `kb.remove_source` | delete | | 30d |
| `kb.refresh_source` | write | | |
| `kb.folder.create` / `kb.folder.update` / `kb.folder.delete` | write / write / delete | | *Bổ sung TIP-020b (không đổi quyền):* update / delete nhận `if_version` (STALE_VERSION), undo 24h; delete chỉ thư mục rỗng (HAS_DEPENDENCIES); visibility thư mục = mặc định cho nguồn MỚI. `kb.add_source.visibility` bỏ trống = kế thừa thư mục (server resolve); nguồn `origin=catalog` không sửa / xoá trực tiếp (CONFLICT `catalog_managed`). |
| `kb.suggestion.approve` / `kb.suggestion.reject` (P1) | write | | *TIP-043:* quyền `kb.manage`, không agentGrantable, `if_version` bắt buộc (STALE_VERSION / CONFLICT khi đã xử lý); approve che PII lần nữa — còn dấu vết → 422 `fields.<ô>=sensitive_data:<loại>`; tạo `kb_source` origin `conversation`, visibility kế thừa thư mục. `kb.suggestion.propose` chỉ nguồn system (actor `system:kb-suggest`, nằm trong SYSTEM_ONLY — HTTP / Trợ lý 403). |
| `approval.approve` / `approval.reject` / `approval.edit_and_approve` | write, `approvals.decide` **và** permission duyệt của action gốc (`quote.approve`, `contract.sign`, `payment.refund_approve`, `campaign.approve`…) | | |
| `run.cancel` | write (nút Dừng ở khung "Trợ lý AI đang điều phối" — REQ-E14) | | |
| `ai.summarize` · `ai.translate` · `ai.detect_intent` · `ai.score_lead` · `ai.extract_info` | read, `skill: true` — nhóm **Kỹ năng AI** (D51); lệnh `/…` trong khung nhập | ✓ | |
| `ai_task.create` / `ai_task.update` / `ai_task.pause` / `ai_task.delete` | config | | |
| `ai_task.run_now` | write | | |
| `governance.update` | config, `ai.governance` | | |

**billing** (`billing.manage` — chỉ Chủ sở hữu)
- `billing.create_invoice`: money; mua gói hoặc credit, sinh QR.
- `billing.cancel_invoice`
- `billing.report_transfer`: write; "Tôi đã chuyển khoản" → `pending_review`.

**insights** (`insights.view`; số liệu lọc theo data scope của người hỏi)
- `insight.query`: read, agent ✓. Chỉ chạy metric đã định nghĩa sẵn trong `insights/metrics/*` (doanh số theo kỳ, khách sắp rời, hiệu suất agent…), không chạy SQL tự do. Dùng cho Tổng quan và cho Trợ lý AI trả lời số liệu (REQ-E07).

**platform** (platform_admin)
- `admin.plan.upsert`
- `admin.model_price.upsert`
- `admin.model_route.upsert`
- `admin.llm_provider.upsert` / `admin.llm_provider.probe` / `admin.llm_provider.disable`: config (D33)
- `admin.invoice.confirm_transfer`: money.
- `admin.workspace.suspend` / `admin.workspace.resume`
- `admin.workspace.archive` / `admin.workspace.restore`: config, luôn preview (§2.0 bước 5)
- `admin.agent_template.upsert`

> Thêm tính năng sau này = thêm action vào danh mục này (REQ-N13). Không có thao tác ghi nào nằm ngoài Registry.

### 3.5 Danh mục permission & 5 vai trò mặc định (D27, D32)

Nguồn sự thật: `packages/shared/src/authz/permissions.ts` (seed vai trò hệ thống khi `tenant.provision`). Chuẩn: `standards/authz/rbac-permissions.md`. ✓ = có; **S** = có nhưng giới hạn theo data scope của vai trò; — = không.

| Nhóm | Permission | Chủ sở hữu | Quản lý | Sales | CSKH | Kế toán |
|---|---|---|---|---|---|---|
| Hộp thư | `inbox.view` · `inbox.reply` | ✓ | ✓ | S | S | — |
| | `inbox.assign` · `inbox.manage` · `inbox.export` | ✓ | ✓ | — | — | — |
| Khách hàng | `crm.view` | ✓ | ✓ | S | ✓ (đọc) | ✓ (đọc) |
| | `crm.edit` | ✓ | ✓ | S | S (thông tin liên hệ) | — |
| | `crm.delete` · `crm.import` · `crm.export` · `crm.reassign` · `crm.fields_manage` | ✓ | ✓ | — | — | — |
| | `privacy.erase` | ✓ | — | — | — | — |
| Sản phẩm | `catalog.view` | ✓ | ✓ | ✓ | ✓ (không giá vốn) | ✓ |
| | `catalog.manage` | ✓ | ✓ | — | — | — |
| | `catalog.cost_view` · `stock.adjust` | ✓ | ✓ | — | — | ✓ |
| Báo giá | `quote.view` · `quote.create` · `quote.send` | ✓ | ✓ | S | — | ✓ (chỉ xem) |
| | `quote.approve` | ✓ | ✓ | — | — | — |
| Hợp đồng | `contract.view` · `contract.draft` | ✓ | ✓ | S | — | ✓ (chỉ xem) |
| | `contract.review` | ✓ | ✓ | — | — | — |
| | `contract.sign` (duyệt + ký, gửi ký, chấm dứt) | ✓ | uỷ quyền | — | — | — |
| Mẫu chứng từ | `documents.manage` | ✓ | ✓ | — | — | — |
| Đơn hàng | `order.view` · `order.manage` · `order.cancel` | ✓ | ✓ | S | — | ✓ |
| Thu tiền | `invoice.manage` (tạo / gửi đề nghị thanh toán) | ✓ | ✓ | S | — | ✓ |
| | `payment.record` (xác nhận tay, đối soát, huỷ đề nghị) | ✓ | ✓ | — | — | ✓ |
| | `payment.refund_request` | ✓ | ✓ | S | — | ✓ |
| | `payment.refund_approve` | ✓ | uỷ quyền | — | — | — |
| | `finance.manage` (tài khoản nhận tiền, bank feed) | ✓ | — | — | — | — |
| | `package.manage` (liệu trình) | ✓ | ✓ | S | S | — |
| Lịch hẹn | `booking.view` · `booking.manage` | ✓ | ✓ | S | S | — |
| | `booking.config` (nhân sự, giờ mở cửa) | ✓ | ✓ | — | — | — |
| Hỗ trợ | `ticket.view` · `ticket.manage` | ✓ | ✓ | S | S | — |
| | `sla.manage` | ✓ | ✓ | — | — | — |
| Marketing | `campaign.view` · `campaign.manage` · `campaign.approve` | ✓ | ✓ | — | — | — |
| Loyalty | `loyalty.view` | ✓ | ✓ | ✓ | ✓ | ✓ |
| | `loyalty.adjust` | ✓ | ✓ | — | — | ✓ |
| | `loyalty.config` | ✓ | ✓ | — | — | — |
| AI | `assistant.use` · `ai_task.manage` | ✓ | ✓ | S | S | S |
| | `agents.manage` · `kb.manage` · `approvals.decide` | ✓ | ✓ | — | — | — |
| | `ai.governance` | ✓ | — | — | — | — |
| Số liệu | `insights.view` | ✓ | ✓ | S | S | S |
| Cài đặt | `settings.manage` · `members.manage` · `channels.manage` · `integrations.manage` · `audit.view` | ✓ | ✓ | — | — | — |
| | `roles.manage` (P1) · `billing.manage` · `workspace.transfer_ownership` | ✓ | — | — | — | — |

**Data scope mặc định** (`role.data_scope`):

| Vai trò | inbox | crm | sales (báo giá, hợp đồng, đơn, thu tiền) | booking | support | insights |
|---|---|---|---|---|---|---|
| Chủ sở hữu, Quản lý | all | all | all | all | all | all |
| Sales | own | own | own | own | own | own |
| CSKH | own | all (đọc) / own (sửa) | — | own | own | own |
| Kế toán | — | all (đọc) | all | — | — | all (module sales) |

- `own` gồm bản ghi mình phụ trách / được gán **và** mọi bản ghi của khách mình là collaborator / watcher (D32).
- **Bảng chân trị một nơi (TIP-042c, `packages/core/src/authz/data-access`)** — list / count / detail / action đọc / realtime dùng cùng predicate: Owner workspace → all; `none` chặn trước mọi nhánh (kể cả bản ghi của chính mình); `own` → owner / assignee (+ người tạo ticket, phụ trách khách của hội thoại) + quan hệ khách; `team` → thêm `team_id` của **bản ghi** ∈ nhóm người xem (DC-299 — không suy từ owner ∈ thành viên nhóm; `team_id` null = mơ hồ, chỉ nhánh own). Quan hệ khách không áp ticket.
- **Đọc ≠ ghi:** watcher chỉ ĐỌC (không bao giờ là bằng chứng ghi); collaborator đọc + ghi trong phạm vi (không chuyển phụ trách / xoá khách). Scope GHI theo vai trò (`AuthzContext.writeScope`, preset `ROLE_DEFS.*.writeScope`; vai trò tuỳ biến = scope đọc) không rộng hơn scope đọc — CSKH crm đọc `all` / ghi `own`. Không đọc được → 404; đọc được mà không ghi được → 403 `SCOPE_FORBIDDEN`.
- **`team_id` (DC-299):** chụp lúc tạo — nguồn (HĐ ← báo giá / HĐ gia hạn, đơn ← báo giá → HĐ → lịch hẹn, đề nghị ← đơn, bản sửa báo giá ← bản trước, hội thoại ← khách) → nhóm DUY NHẤT của người phụ trách (0 / nhiều nhóm → null); chia lead theo nhóm của rule. Chuyển phụ trách khách đổi nhóm khách + hội thoại chuyển kèm; chứng từ cũ giữ owner + nhóm (doanh số).
- "uỷ quyền" = Chủ sở hữu bật riêng cho từng Quản lý (lưu trong `role` tuỳ biến P1; P0 bật bằng cờ `membership.delegations text[]`).
- Viewer (prototype) = vai trò tuỳ biến P1.

---

## 4. API CONTRACTS

### 4.1 Quy ước

- Base: `/v1`.
- Header bắt buộc: `Authorization: Bearer <access JWT 15m>` và `X-Workspace-Id: <uuid>` (trừ `/v1/auth/*`, `/v1/me`, `/hooks/*`).
- Thành công: `200 { data, meta? }`.
- List: `{ data: T[], next_cursor: string | null }`. Cursor là base64 của `(sortKey, id)`; tham số `?limit=` (≤ 100, mặc định 30) và `?cursor=`.
- **Bảng có số trang (D42, D43):** 9 list chính (khách hàng, sản phẩm, báo giá, đơn, đề nghị thanh toán, hợp đồng, ticket, marketing, thành viên loyalty) nhận `?page=&limit=` (20 / 50 / 100) và trả `{ data, next_cursor, meta: { total, page, limit } }`; backend offset + deferred join + đếm tổng. Không có `page` → cursor như trên. Chi tiết: `standards/api/response-envelope.md` §2.
- Lỗi: `{ error: { code: string, message: string, fields?: Record<string,string> } }`.

| Mã code | HTTP |
|---|---|
| `VALIDATION_FAILED` | 422 |
| `UNAUTHENTICATED` | 401 |
| `FORBIDDEN` | 403 |
| `NOT_FOUND` | 404 |
| `CONFLICT` | 409 |
| `IDEMPOTENCY_REPLAY` | 200, trả kết quả cũ |
| `RATE_LIMITED` | 429 |
| `PLAN_LIMIT_REACHED` | 402 |
| `CREDIT_EXHAUSTED` | 402 |
| `ACTION_NOT_FOUND` | 404 |
| `INTERNAL` | 500 |

- `Idempotency-Key` bắt buộc với `POST /v1/actions/*` có risk `send`/`money` và với các lệnh tạo.

### 4.2 Auth & phiên

```
POST /v1/auth/otp/request        { email, purpose: 'register'|'login'|'reset' }          → 204   (public, rate-limit 5/15m/email, luôn 204 kể cả email không tồn tại)
POST /v1/auth/otp/verify         { email, code, purpose }                                 → { access_token, user, needs_password?: bool }  + Set-Cookie refresh (httpOnly, Secure, SameSite=Lax, path=/api/v1/auth)
POST /v1/auth/password/login     { email, password, remember?: bool }                     → { access_token, user }
POST /v1/auth/password/set       { password }                     (auth)                  → 204
POST /v1/auth/password/reset     { token, password }              (public, link 15 phút) → 204
POST /v1/auth/refresh            (cookie)                                                  → { access_token }   (xoay vòng; tái dùng token cũ → thu hồi cả family)
POST /v1/auth/logout             (cookie)                                                  → 204
GET  /v1/me                                                                                → { user, workspaces: [{ id, name, role, plan, trial_ends_at }] }
POST /v1/workspaces              { name }                                                  → { workspace }       (tạo workspace mới; người tạo là owner)
GET  /v1/business-lookup/tax/:taxCode                                                      → { legal_name, address, representative, phone, founded_on, legal_status } | 404
GET  /v1/session                 (public)                                                 → { authed, declared, provisioned, trialDaysLeft, trialEndsAt, trialSeen, expiredSeen, workspace_id }   (TIP-011, DC-037)
POST /v1/session/ack             { notice: 'trial_welcome'|'trial_expired' }  (auth)      → 204
GET  /v1/workspace/provisioning  (auth, workspace đang dùng)                              → { status: 'running'|'ready'|'failed' }
GET  /v1/auth/brand?locale=      (public)                                                 → { card, stats }
```

### 4.3 Actions (cổng ghi thống nhất)

```
GET  /v1/actions                                     → { data: [{ id, module, title, risk, permission, input_schema(JSON Schema), agentGrantable }] }   (lọc theo quyền user)
POST /v1/actions/:actionId
  Headers: Idempotency-Key? · X-Action-Source: ui (mặc định)
  Body:    { input: <theo schema>, confirm_token?: string }
  200 → { data: { result, action_log_id, undo_until?: ISO, ui_target?: UiCommand } }
  202 → { data: { status: 'preview_required', preview: ActionPreview, confirm_token, expires_at } }
  202 → { data: { status: 'approval_required', approval_id } }       (chỉ agent/task)
POST /v1/action-logs/:id/undo                         → { data: { undone: true } } | 409 UNDO_EXPIRED | 409 UNDO_NOT_SUPPORTED
GET  /v1/action-logs?actor_type=&action_id=&module=&from=&to=&cursor=      → list ActionLogRow
```

```ts
type ActionPreview = {
  summary: string;              // "Gửi báo giá BG-000102 (12.500.000₫) cho Chị Lan qua Zalo"
  risk: Risk; count?: number;   // số bản ghi bị ảnh hưởng (bulk)
  changes?: { entity: string; id?: string; before?: Record<string, unknown>; after?: Record<string, unknown> }[];
  warnings?: string[];          // "Vượt hạn mức 20 triệu — cần Owner duyệt"
};
type UiCommand =
  | { type: 'navigate'; route: string }
  | { type: 'open'; entity: EntityKind; id: string; view?: 'drawer'|'page' }
  | { type: 'prefill'; form: FormKey; values: Record<string, unknown> }
  | { type: 'filter'; table: TableKey; filter: Record<string, unknown> }
  | { type: 'highlight'; target: string };
```

### 4.4 Đọc theo resource (GET; mỗi endpoint gọi chung service với read action)

| Module | Endpoints |
|---|---|
| inbox | `GET /v1/conversations?folder=all\|mine\|ai_running\|needs_human\|ai_pending_approval\|unread\|archived&channel_account_id=&tag_id=&q=` · `GET /v1/conversations/:id` · `GET /v1/conversations/:id/messages?cursor=` (mới → cũ) · `GET /v1/conversations/counts` · `GET /v1/canned-replies` · `GET /v1/tags` |
| crm | `GET /v1/contacts?stage=&group=&tag_id=&owner_id=&q=&sort=` · `GET /v1/contacts/:id` (360) · `GET /v1/contacts/:id/timeline?cursor=` · `GET /v1/contacts/duplicates` · `GET /v1/contacts/:id/collaborators` · `GET /v1/contact-access-requests?status=` · `GET /v1/custom-fields?entity=` |
| catalog | `GET /v1/products?type=&category_id=&status=&q=` · `GET /v1/products/:id` · `GET /v1/categories` |
| contracts | `GET /v1/contracts?status=&kind=&contact_id=&expiring_within=` · `GET /v1/contracts/:id` (+ phụ lục, người ký, sự kiện ký) · `GET /v1/contracts/:id/pdf` · `GET /v1/doc-templates?kind=` · **public:** `GET /v1/public/sign/:token` (PDF + thông tin hiển thị) · `POST /v1/public/sign/:token/otp` · `POST /v1/public/sign/:token/sign` { otp, signature_png, consent: true } · `POST /v1/public/sign/:token/decline` { reason? } — rate-limit theo token + IP, OTP 6 số, sai 5 lần thì khoá link |
| sales | `GET /v1/quotes?status=&contact_id=` · `GET /v1/quotes/:id` (gồm các version) · `GET /v1/quotes/:id/pdf` · `GET /v1/orders?…` · `GET /v1/orders/:id` · `GET /v1/invoices?…` · `GET /v1/invoices/:id` · `GET /v1/invoices/:id/qr` |
| booking | `GET /v1/appointments?from=&to=&staff_id=&status=` · `GET /v1/appointments/:id` · `GET /v1/staff` · `GET /v1/booking/slots?service_id=&date=&staff_id=` |
| support | `GET /v1/tickets?status=&priority=&assignee=&sla=` · `GET /v1/tickets/:id` · `GET /v1/tickets/counts` · `GET /v1/sla-policies` |
| marketing | `GET /v1/segments` · `POST /v1/segments/preview` (đọc) · `GET /v1/campaigns?status=` · `GET /v1/campaigns/:id` (+stats) · `GET /v1/campaign-suggestions` |
| loyalty | `GET /v1/loyalty/config` · `GET /v1/loyalty/members?tier=&q=&page=&limit=` · `GET /v1/loyalty/members/:contactId` · `GET /v1/loyalty/members/:contactId/ledger` · `GET /v1/loyalty/lookup?phone=` · `GET /v1/loyalty/overview` · `GET /v1/loyalty/members/:contactId/files` (+ `/:fileId` bytes) — bổ sung TIP-036, schema chung `packages/shared/src/api/loyalty.ts` |
| ai | `GET /v1/agents` · `GET /v1/agents/:id` · `GET /v1/agents/:id/stats?from=&to=` · `GET /v1/agent-templates?role=&industry=` · `GET /v1/kb/folders` · `GET /v1/kb/sources?folder_id=&tag=&origin=&status=` · `GET /v1/kb/sources/:id/download` (TIP-020b — byte / văn bản, URL / catalog trả JSON mô tả; không tải lại website) · `GET /v1/kb/suggestions?status=&cursor=&limit=` (P1; TIP-043 — `{data, next_cursor, meta:{pending}}`) · `GET /v1/kb/suggestions/:id` · `GET /v1/agents/:id/versions` · `GET /v1/runs?status=&agent_id=&conversation_id=` · `GET /v1/runs/:id` (+steps) · `GET /v1/approvals?status=pending` · `GET /v1/ai-tasks` · `GET /v1/governance` |
| assistant | `GET /v1/assistant/sessions?q=` · `GET /v1/assistant/sessions/:id/messages` |
| channels | `GET /v1/channels` · `GET /v1/channels/:id` (health) · `GET /v1/webchat/widget` |
| billing | `GET /v1/billing/summary` (gói, hạn, credit, giới hạn) · `GET /v1/billing/plans` · `GET /v1/billing/ledger?cursor=` · `GET /v1/billing/invoices` · `GET /v1/billing/invoices/:id` (QR, trạng thái) |
| dashboard / insights | `GET /v1/dashboard` (việc cần tôi, AI hôm nay, follow-up, onboarding, credit) · `GET /v1/insights/:metric?from=&to=` (metric đọc sẵn) |
| authz | `GET /v1/me/authz` (permissions + scope của user trong workspace hiện tại — FE dùng cho `can()`) · `GET /v1/roles` · `GET /v1/permissions` (danh mục, nhóm theo module) · `GET /v1/teams` |
| integrations | `GET /v1/integrations/connectors` (registry: manifest + trạng thái kết nối của workspace) · `GET /v1/integrations/connections/:id` (không trả secret) · `GET /v1/integrations/connections/:id/logs?cursor=` |
| misc | `POST /v1/files` (multipart, trả `file_id`, giới hạn 25MB) · `GET /v1/files/:id` (signed URL) · `GET /v1/notifications?unread=` · `GET /v1/settings/:section` — đã nối (TIP-013, shape `packages/shared/src/api/settings.ts`): `workspace` (mọi thành viên), `members?q=` (`members.manage`; `{ data, total, seat_limit, next_cursor: null }`), `roles` (mọi thành viên), `sla` (`sla.manage`; giờ làm việc thật, chính sách mặc định tới TIP-034), `notifications` (TIP-006), `integrations` (TIP-012) |
| admin | `GET /v1/admin/workspaces` · `GET /v1/admin/plans` · `GET /v1/admin/model-prices` · `GET /v1/admin/transfers?status=pending_review` (đã nối — TIP-010, platform admin, không cần X-Workspace-Id) |

Bổ sung ver2.1:
- inbox: `GET /v1/conversations/:id/messages/search?q=&sender=all|contact|user|agent` (không dấu, trả vị trí để tô — REQ-C12); list hội thoại bỏ `hidden_at` khác null (D50); `GET /v1/conversations/:id/agent-tools` (quyền hiệu lực của agent phụ trách, chỉ đọc — REQ-C11).
- crm: `GET /v1/contacts/:id` (360) trả thêm `layout` theo vai trò người xem và dữ liệu các khối được bật · `GET /v1/profile-layouts` · `GET /v1/profile-layouts/:id?as_role=` (REQ-F12, M05).
- ai: `GET /v1/agents/:id/tools` (nhóm theo module + Kỹ năng AI, `granted`, badge `needs_connector` / `coming_soon` — D51) · `GET /v1/runs?root_run_id=&status=running|waiting_approval` (khung điều phối Cowork — REQ-E14).
- channels: `GET /v1/channels` trả theo `type` kèm `accounts[]` và trạng thái gộp · `GET /v1/channels/:accountId/stats?days=7` (REQ-B09, B11).

### 4.5 Trợ lý AI & runs

```
POST /v1/assistant/messages        { session_id?, mode: 'chat'|'cowork', text, attachments?: file_id[], context?: { route, entity?, id?, selection?: string[] } }
  → text/event-stream:
     event: session      data: { session_id }
     event: delta        data: { text }
     event: plan         data: { steps: [{ id, title, agent_id?, status }] }
     event: step         data: { step_id, status, summary }
     event: confirm      data: { action_id, preview: ActionPreview, confirm_token }     // thẻ xác nhận
     event: ui_command   data: UiCommand
     event: result       data: { action_log_id, summary, ui_target? }
     event: error        data: { code, message }
     event: done         data: { run_id, credits_used }
POST /v1/assistant/confirm         { run_id, confirm_token, decision: 'confirm'|'cancel', edited_input? }   → SSE tiếp tục như trên
POST /v1/runs/:id/cancel           → 204
POST /v1/actions/approval.approve  { input: { approval_id, edited_input? } }   (qua Registry như mọi action)
```

### 4.6 Realtime (Socket.IO)

- **Namespace `/ws`:**
  - Auth bằng access JWT + workspace. Tự join room `ws:{id}` và `user:{id}`. Join `conv:{id}` khi mở hội thoại.
  - Server → client: `message.new`, `message.updated`, `conversation.updated`, `conversation.counts`, `typing`, `run.step`, `run.done`, `approval.requested`, `approval.decided`, `ui.command` (chỉ gửi user ra lệnh), `channel.status`, `channel.zalo.qr` ({ account_id, qr_png_base64, expires_at }), `notification.new`, `credits.changed`.
  - Client → server: `conv.join`, `conv.leave`, `typing`.
- **Namespace `/widget`:**
  - Auth bằng `public_key` + `visitor_token` (JWT riêng, 30 ngày).
  - Client → server: `visitor.hello` ({ name?, phone?, email?, page_url }), `message.send` ({ text, attachments? }).
  - Server → client: `message.new`, `typing`, `agent.status`.
- **Fan-out:** Redis adapter; worker phát qua `@socket.io/redis-emitter`.

### 4.7 Webhooks

- `POST /hooks/payments/:provider`: tiền **gói AppChat**. Kiểm chữ ký / API key của provider, insert `bank_transaction` idempotent, khớp `transfer_code` thì `billing_invoice.paid`. Luôn trả 200 nhanh; phần khớp chạy bất đồng bộ. — đã nối (TIP-010): provider = `PLATFORM_BANK_FEED` (`mock` HMAC dev / `sepay` header `Authorization: Apikey`), khớp mã `APPCHAT INV…` + số tiền ≥ hoá đơn, ghi nhận ngay trong request (idempotent) + scheduler `billing.invoice-sweep` quét lại (DC-055, DC-057, DC-058).
- `POST /hooks/integrations/:connector/:connectionId`: webhook connector của DN (D28). Tra `tenant_integration_route` → DB tenant; adapter tự kiểm chữ ký; insert `integration_event` idempotent theo id của provider; trả 200 rồi xử lý trong queue `integrations`.
- `POST /hooks/tenant-payments/:provider/:feedId`: tiền **khách của DN** (Q3). `feedId` tra `tenant_bank_feed_route` (DB nền tảng) rồi vào DB tenant; kiểm chữ ký bằng secret của feed; khớp mã `TT-xxxxxx` + số tiền thì `customer_payment(confirmed)`; lệch thì `needs_review`. Idempotent theo mã giao dịch của provider.
- `POST /hooks/channels/:provider`: dành cho kênh dùng webhook về sau (Zalo OA, Meta). Hiện chưa dùng.

---

## 5. AI ARCHITECTURE

> **Chốt 2026-10-28 (Vision V3–V4, RRI D17):** Vercel AI SDK v7 + Agent Gateway tự viết. Không dùng Mastra, không dùng WorkflowAgent / Postgres World, không làm swarm.

### 5.1 Agent Gateway (`packages/ai`)

```ts
export interface AgentEngine {
  run(req: RunRequest, signal: AbortSignal): AsyncIterable<RunEvent>;
}
export interface RunRequest {
  runId: string; workspaceId: string;
  system: string;                       // prompt đã lắp (persona + policy + ngữ cảnh)
  messages: ModelMessage[];
  tools: ToolSpec[];                    // sinh từ ActionDef (JSON Schema) + meta-tools
  tier: 'standard'|'advanced'|'max';
  maxSteps: number;                     // mặc định 8 (agent), 16 (assistant)
  budget: { maxCredits: number };
}
export interface ToolSpec { name: string; description: string; inputSchema: JSONSchema; origin: 'action' | 'meta' | 'external';   // 'external' = tool MCP (P2, D37)
  execute(input: unknown, meta: { stepId: string }): Promise<ToolOutcome>; }
export type ToolOutcome =
  | { kind: 'ok'; output: unknown }
  | { kind: 'needs_confirmation'; preview: ActionPreview; confirmToken: string }   // dừng run, chờ người
  | { kind: 'needs_approval'; approvalId: string }                                 // dừng run, chờ Owner
  | { kind: 'error'; code: string; message: string };
export type RunEvent = { type: 'delta'|'tool_call'|'tool_result'|'paused'|'usage'|'finish'|'error'; … };
```

- **Engine mặc định:** `AiSdkEngine` (Vercel AI SDK v7, `ToolLoopAgent`/`streamText`). Tool `execute` gọi `ActionExecutor`.
- **Mọi lời gọi model đều qua AI SDK:** agent loop, Trợ lý, structured output (`generateObject`: soạn cấu hình agent, tối ưu prompt, đề xuất hỏi–đáp, phân loại ý định), `embed` / `embedMany` (RAG), `rerank` (nếu bật). **Phần tự viết:** lưu và chạy tiếp run, phối hợp agent, policy / credit, RAG (parse, cắt đoạn, lưu pgvector, hybrid search) — AI SDK không cung cấp các phần này.
- **Lưu và chạy tiếp run (tự viết, không phụ thuộc framework):**
  - Khi tool trả về `needs_*`, engine dừng loop và ghi trong một transaction: `ai_run.status = waiting_approval`, `ai_run.state = { messages: ModelMessage[], pendingToolCall: { toolCallId, actionId, input }, stepIdx }` (cột jsonb), cùng một dòng `approval_request`.
  - Khi có quyết định (`approval.decided`), job `ai-resume:{runId}` trên BullMQ chạy:
    1. Đọc `state`.
    2. Nếu duyệt: chạy action qua `ActionExecutor` với `source = agent` và `approvalId` hợp lệ. Nếu từ chối: tạo kết quả tool `{ rejected: true, note }`.
    3. Nối `tool-result` vào messages, rồi gọi lại `AiSdkEngine.run()` từ `stepIdx`.
  - Không giữ gì trong RAM, nên restart worker hay chạy ở process khác đều tiếp tục được.
  - Idempotent: approval đã xử lý thì job thoát ngay.
  - Approval quá 72 giờ không ai quyết thì `expired`; run chuyển `handoff` và báo Owner.
- **Loop guard:** dừng nếu gọi lặp cùng tool + cùng input 3 lần, vượt `maxSteps`, hoặc vượt `budget`.
- **Phối hợp agent** (tool nội bộ, **không** phải action trong Registry, chỉ engine cấp cho agent):

| Tool | Ai dùng | Hành vi |
|---|---|---|
| `delegate(agent_id\|role, task, context)` | Trợ lý AI | Tạo `ai_run` con (`kind=delegate`, `parent_run_id`), chạy agent đích với bộ tool = **tool của agent ∩ quyền người ra lệnh** (§3.3b), trả tóm tắt kết quả. Run con cần duyệt thì cả run cha chờ theo |
| `transfer_to_agent(role, reason, summary)` | Agent trực kênh | Đổi `conversation.assignee_agent_id`, ghi `ai_run_step(type=handoff)`, agent mới nhận summary và tiếp tục ngay trong lượt đó. Có thể trả lại agent cũ |
| `consult(role, question)` | Agent trực kênh, agent con | Chạy agent đích ở chế độ **chỉ đọc** (chỉ được dùng action có risk `read`), trả lời ngắn, không gửi gì cho khách |

- **Rào chắn phối hợp:**
  - Độ sâu `delegate`/`consult` tối đa 2 cấp.
  - Tối đa 3 lần `transfer_to_agent` mỗi lượt khách; A → B → A trong cùng một lượt thì handoff sang người.
  - Ngân sách credit chung cho cả cây run (run con trừ vào budget của run gốc).
  - Mọi bước đều ghi vào `ai_run_step` và phát `run.step` qua WS để Owner xem trực tiếp và bấm dừng (`run.cancel` huỷ cả cây).
- **Đường mở rộng MCP (P2 — D37, chưa làm):**
  - *MCP server:* `apps/api` thêm route `/mcp` (Streamable HTTP, `@modelcontextprotocol/sdk`); `tools/list` = action lọc theo quyền (như `find_actions`), `tools/call` = `ActionExecutor` với `source='mcp'` (policy như `assistant`: ghi → preview / approval). OAuth 2.1 chọn workspace + nhóm quyền. Không cần đổi Registry vì action đã có JSON Schema + mô tả cho LLM.
  - *MCP client:* connector `mcp_custom` trong `packages/integrations` (chỉ HTTPS, không stdio); `createMCPClient` của `@ai-sdk/mcp` → `ToolSpec(origin='external')`; Owner đánh dấu tool chỉ đọc, còn lại coi là ghi → approval; kết quả là dữ liệu không tin cậy; trừ credit + log như tool nội bộ.
  - Ràng buộc cho bản phát hành để giữ đường: không logic nghiệp vụ trong tool; mọi tool đi qua một `ToolSpec`; policy tra theo `source` (không hard-code danh sách nguồn ở nơi khác).
- **Không làm swarm:** không có kênh để agent tự nhắn agent khác ngoài 3 tool trên; mỗi lần phối hợp đều có một run cha làm đầu mối.
- **Usage:** mỗi bước LLM phát event `usage` → `CreditMeter.charge(ws, provider, model, in, out, runId, stepIdx)`. Hàm này ghi `credit_ledger` và trừ `credit_wallet` trong một transaction ở **DB nền tảng** (idempotent theo `(ws, 'ai_step', runId:stepIdx)`), sau đó mới ghi `ai_run_step.credits` ở DB tenant. Trước mỗi bước kiểm `balance > 0`; ví hết thì phát `CREDIT_EXHAUSTED`.
- **LLM Router:**
  - Đọc `model_route` theo tier/purpose. Lỗi 5xx, 429 hoặc timeout 30s thì chuyển sang provider kế tiếp.
  - **Provider (D33):** đọc bảng `llm_provider` (cache 60s). `kind` gốc dùng `@ai-sdk/anthropic|openai|google|deepseek`; `openai_compatible` dùng `createOpenAICompatible({ baseURL, apiKey, headers })` cho OpenRouter, 9router, LiteLLM, vLLM…
  - Key mã hoá AES-256-GCM trong DB nền tảng; env chỉ giữ khoá mã hoá và (tuỳ chọn) key khởi tạo cho seed. Chỉ provider `active` + có key mới được route.
  - `capabilities` quyết định model nào được dùng cho agent có tool / structured output. Router không hỗ trợ tool calling thì không xếp vào tier của agent. `probe` khi lưu: gọi thử chat + tool call + (nếu `embeddings`) embed.
  - Usage: lấy token từ AI SDK; router trả thêm chi phí thì ghi vào `ai_run_step.meta.provider_cost` để đối chiếu, credit vẫn tính theo `model_price`.
  - Embedding dùng 1536 chiều, provider cấu hình trong `model_route` purpose=embed.

### 5.2 Trợ lý AI (Orchestrator + Copilot)

Danh mục action quá lớn để nhồi hết vào prompt, nên Trợ lý chỉ nhận **meta-tools**:

| Meta-tool | Việc |
|---|---|
| `find_actions(query, module?)` | Tìm action phù hợp (lọc theo quyền user) → trả id + mô tả + input schema rút gọn. Index tìm bằng embedding của description, có cache |
| `call_action(action_id, input)` | Gọi `ActionExecutor` với `source='assistant'`, `onBehalfOfUserId=user` → read chạy ngay; còn lại trả `needs_confirmation` |
| `delegate(agent_id \| role, task, context)` | Tạo `ai_run` con (kind=delegate) chạy agent chuyên trách với tool set = tool của agent ∩ quyền người ra lệnh (§3.3b); trả tóm tắt kết quả; hiển thị trong plan |
| `ui(command: UiCommand)` | Phát `ui.command` tới user (điều hướng, mở drawer, điền form, lọc, highlight) |
| `query_data(metric, params)` | = `insight.query` (metric định nghĩa sẵn, chỉ đọc); trả bảng/biểu đồ nhỏ ngay trong thẻ trả lời |
| `render(tree: UiTree)` | (D55) Trả cây giao diện mức 2 cho câu trả lời: khối dựng sẵn, số liệu qua `$ref` tới bước `query_data` / action đọc, nút = `UiCommand` hoặc action, form gắn action. Schema + quy tắc: `standards/ai/generative-ui.md`. Lưu vào `assistant_message.content.parts[]` (`type: ui`) |
| `plan(steps[])` / `update_step(id, status)` | Cập nhật thẻ kế hoạch |

- **System prompt** gồm: vai trò, quyền của user, màn hiện tại và bản ghi đang xem (từ `context`), danh sách agent đang có, quy tắc xác nhận và hoàn tác. Viết bằng tiếng Việt, trả lời tiếng Việt.
- **Chế độ Chat:** chỉ cho dùng `find_actions` với read và `query_data`. **Chế độ Cowork:** mở toàn bộ meta-tools.
- **Đọc bản ghi (DC-224):** Trợ lý / agent đọc từng bản ghi bằng action `<thực thể>.search` / `get` (risk `read`, cùng truy vấn + `scopeFilter` của màn) qua `call_action`; `query_data` chỉ cho metric tổng hợp. Mã hiển thị (KH-, BG-, DH-…) ở ô `*_id` được đổi sang id trước khi chạy. Mọi action ghi có `preview` (diff / số bản ghi / tiền / người nhận) để thẻ xác nhận nói rõ đổi gì (TIP-023b).

### 5.3 Agent trực kênh

Khi có `message.received` mà `ai_mode=auto` và có `assignee_agent_id` (hoặc agent mặc định của kênh), chạy pipeline sau:

1. **Debounce 3 giây** (gom tin liên tiếp). Job id = `agent-reply:{conversationId}`, nên không chạy song song trên cùng một hội thoại.
2. **Lắp ngữ cảnh:** cấu hình theo `published_version_id`, 20 tin gần nhất, `contact.get_360` rút gọn, `contact_memory`, top-6 đoạn từ `kb.search` (hybrid, trong `kb_scope`, chỉ `public` — `standards/ai/rag.md`), giờ mở cửa, chính sách của agent. Dưới ngưỡng căn cứ → không bịa (hỏi lại / handoff).
3. **Tools** = `tool_ids` của agent, cộng thêm `reply(text, attachments?)` (chính là `message.send` vào hội thoại hiện tại), `handoff(reason, summary)` (chuyển sang người), `transfer_to_agent(role, reason, summary)` và `consult(role, question)` (xem §5.1).
4. **Output bắt buộc có cấu trúc** `{ reply?, confidence 0–1, intent, sentiment, needs_human?: reason }`.
   - Nếu `confidence < threshold`, hoặc khách đòi gặp người, hoặc cùng câu hỏi lặp 3 lần, hoặc sentiment tiêu cực / khiếu nại, hoặc chạm từ cấm → **handoff**: không gửi reply, lưu bản nháp, đặt `ai_state=handoff`, thông báo.
5. **Copilot mode:** cùng pipeline nhưng chỉ sinh gợi ý (không gửi), đẩy về UI.
6. **Lọc PII trước khi gửi LLM:** regex CCCD/CMND, số thẻ, số tài khoản → thay bằng token. Khi gửi ra ngoài thì khôi phục lại.

### 5.3b Tạo agent (D29)

- **3 cách vào** (prototype trang AI Agents): Tạo thủ công → `AgentBuilder` · Từ mẫu (`agent_template`) → builder điền sẵn · **Trợ lý AI** → modal / dock Trợ lý.
- **Luồng Trợ lý:** người dùng mô tả → `agent.draft_from_description` (AI SDK `generateObject`, schema = cấu hình agent; chọn tools bằng `find_actions` lọc theo quyền người ra lệnh) → Trợ lý gọi `agent.create_and_publish` → policy `assistant × config` trả **preview** đủ cấu hình (prompt, kênh, tools + risk, tri thức, ngưỡng, quy tắc duyệt) với 2 nút **"Tạo & xuất bản"** / **"Mở trong builder"** → xác nhận thì agent chạy ngay (`ai_agent_version` v1, `created_via=assistant`).
- **Rào chắn:**
  - `tool_ids` ⊆ quyền người ra lệnh ∩ `agentGrantable`.
  - Tool risk `money` / `delete` mặc định bật trong `approval_rules`.
  - Gắn kênh đang có agent khác thì preview cảnh báo thay thế.
  - Vượt `plan.max_agents` → `PLAN_LIMIT_REACHED`.
- **Không tạo agent tạm:** `delegate` chỉ nhắm agent đã xuất bản. Không có agent phù hợp thì Trợ lý gợi ý "Tạo agent …" (một `UiCommand` / đề xuất), không tự tạo.
- **Xuất bản / phiên bản:** builder sửa bản nháp (`draft_dirty`); `agent.publish` snapshot vào `ai_agent_version`; `ai_run.agent_version` ghi phiên bản đã chạy; `agent.rollback(version)` publish lại snapshot cũ.
- **Chat thử:** `agent.test` chạy agent bằng bản nháp với `ActionContext.dryRun=true` → mọi action không phải `read` trả preview, không ghi DB, không gửi ra ngoài; vẫn trừ credit.

### 5.4 Tác vụ tự chủ & chủ động

- Lưu trong `ai_task` và chạy bằng BullMQ repeatable (cron) hoặc consumer theo event.
- **Mẫu dựng sẵn:**
  - Follow-up khách im lặng N ngày.
  - Hỏi lại báo giá treo quá 3 ngày.
  - Nhắc hẹn (24h / 2h).
  - Chăm sóc sau mua (D+3).
  - Briefing sáng 08:00 cho Owner (gửi vào Trợ lý và thông báo).
- **Khung "Trợ lý AI đang điều phối" (Cowork, REQ-E14):** một hàng thu gọn "N việc · x đang chạy · y cần bạn duyệt" → modal danh sách run con (agent, công cụ, tiến độ, trạng thái) với Dừng (`run.cancel`) · Duyệt & gửi (`approval.approve`) · Xem kết quả. Tab Công cụ & Quyền của drawer Cowork **chỉ hiển thị** quyền hiệu lực (§3.3b) + link sang Builder.
- **Ràng buộc khi gửi ra ngoài:** mọi tác vụ gửi đều đi qua outbox và rate limiter của kênh. Đặc biệt Zalo cá nhân: delay ngẫu nhiên 2–6 giây, cap mặc định 200 tin chủ động/ngày/tài khoản, cấu hình được.

---

## 6. CHANNELS (`packages/channels` + worker ROLE=channels)

```ts
export interface ChannelAdapter {
  type: 'zalo_personal' | 'webchat' | 'email';
  start(account: ChannelAccountRuntime, sink: InboundSink): Promise<void>;   // giữ phiên / listener
  stop(accountId: string): Promise<void>;
  send(accountId: string, msg: OutboundMessage): Promise<{ externalMsgId: string }>;
  probe(accountId: string): Promise<HealthStatus>;
}
export interface NormalizedInbound {
  channelAccountId: string; externalThreadId: string; externalMsgId: string; isGroup: boolean;
  sender: { externalId: string; name?: string; avatarUrl?: string; phone?: string; email?: string };
  kind: 'text'|'image'|'file'|'sticker'|'audio'; text?: string;
  attachments?: { url: string; mime: string; name?: string; size?: number }[];
  mentionsMe?: boolean; sentAt: string; raw: unknown;
}
```

- **Account lease:** danh sách account cần giữ phiên đọc từ `tenant_channel_route` (DB nền tảng); credential đọc từ DB tenant tương ứng. Mỗi `channel_account` chỉ do **một** worker giữ phiên. Dùng Redis lock `lease:channel:{id}`, TTL 30 giây, heartbeat 10 giây. Worker khởi động sẽ nhận các account `connected` chưa có lease.
- **Một kênh nhiều tài khoản + kết nối 3 bước (REQ-B09, B10):** chọn kênh → xác thực (QR Zalo cá nhân · form Email IMAP / SMTP + `channel.test` · Webchat) → cấu hình nhanh (tên, AI Agent, chế độ AI trả lời ngay / gợi ý / tắt, cách chia). Nhánh OAuth và kênh ngoài manifest hiện "Sắp có". Manifest khai báo `capabilities.reactions` (OQ-12).
- **Zalo cá nhân** (zca-js — Chủ nhà đã thử 2026-10-29, chưa thấy vấn đề; thiết kế theo OpenClaw `zalouser`, MIT):
  - **Đăng nhập:** QR login phát ảnh qua WS. Khi thành công, lưu `{cookie, imei, userAgent}` đã mã hoá vào `credentials_enc`. Khởi động lại thì login bằng credential đã lưu; lỗi thì chuyển `expired` và thông báo quét lại.
  - **Listener:** tin 1-1 và tin nhóm. Nhóm chỉ kích hoạt AI theo `group_ai_policy`.
  - **Gửi:** text (markdown → rich text), ảnh, file, sticker. Chia đoạn ≤ 2000 ký tự.
  - **Chống khoá:** limiter theo account (1 tin / 2–6 giây), cap/ngày, không gửi chủ động cho người lạ chưa từng nhắn. Nếu lỗi bất thường liên tiếp (≥ 3 lần trong 10 phút) thì tự `pause` kênh và báo Owner. Lúc kết nối hiện cảnh báo rủi ro, Owner phải tick xác nhận đã đọc.
- **Webchat:** widget JS (≤ 40KB gz) kết nối namespace `/widget`. Có prechat form tuỳ chọn để thu tên/SĐT, tạo contact hoặc lead. Chỉ chạy trên domain thuộc `allowed_domains`.
- **Email:** kết nối IMAP (imapflow, poll 60 giây, IDLE nếu được) và SMTP (nodemailer). Gom thread theo `Message-ID`/`In-Reply-To`/`References`. Kiểm tra credential bằng cách login thật trước khi lưu.
- **Inbound pipeline** (core/inbox, gọi từ worker): insert `message` với `ON CONFLICT (channel_account_id, external_msg_id) DO NOTHING` (chống trùng) → resolve contact (`contact_identity`, hoặc khớp `phone_norm`/email, hoặc tạo contact `lead`) → upsert conversation → cập nhật counters → outbox `message.received` → emit WS.

---

## 7. FRONTEND — COMPONENT TREE

### 7.0 UI kit & quy tắc hiển thị (chốt V11 / D18)

> Cấu trúc code `apps/web` (routing / features / shared, useAction, useCan, ui-commands, 5 trạng thái): **`standards/ui/frontend-structure.md`** (bắt buộc).

- **Ant Design v6** (`antd`), `@ant-design/nextjs-registry`, `antd-style`, **Ant Design X 2.x** (Trợ lý), `@ant-design/charts`, `lucide-react`. Không dùng Tailwind / shadcn / antd-mobile.
- `packages/ui/theme.ts` map token prototype vào `ConfigProvider` (xem Vision V11). **Không hard-code màu hoặc kích thước trong component**; chỉ dùng token.
- **Responsive:**
  - `≥ lg`: giống prototype.
  - `md`: rail thu gọn, 360° thành Drawer.
  - `< md`: `MobileTabBar` (5 tab), Inbox 3 màn nối tiếp, Drawer `placement="bottom"`, bảng thành danh sách thẻ (`ResponsiveTable` tự đổi theo `Grid.useBreakpoint()`).
- **Parity < 5%** với `AppChat.dc.html` ở 1440×900 (REQ-N14):
  - `tools/parity` (Playwright `toHaveScreenshot`, `maxDiffPixelRatio: 0.05`) + `parity.manifest.ts` + seed `fixtures/prototype-parity`.
  - Mỗi TIP UI phải dán kết quả vào Completion Report.
- **Mobile:** e2e Playwright ở 390×844 (không tràn ngang, action chạy được, vùng chạm ≥ 44px).

### 7.1 Shell & dùng chung (`shared/`, `packages/ui`)

```
(app)/layout
└── AppShell
    ├── NavRail { items: NavItem[]; collapsed: boolean }          # 80px (≥ md); flyout Khách hàng & CRM
    ├── MobileTabBar { items: NavItem[] }                          # < md: Tổng quan · Hộp thư · Trợ lý · Khách hàng · Thêm
    │   └── NavFlyout { group: NavGroup }
    │   (không có TopBar — theo prototype: tìm kiếm ⌘/, thông báo, Nâng cấp, trial badge, avatar menu + WorkspaceSwitcher nằm ở đáy NavRail)
    ├── <main>{children}</main>
    ├── AssistantDock { context: AssistantContext }                 # Ctrl+K; panel phải 420px (< md: toàn màn); dùng chung AssistantThread
    ├── ConfirmActionHost                                           # nhận preview từ useAction / assistant
    └── Toaster · RealtimeProvider · UiCommandHost
```

Primitive dùng chung (`packages/ui` + `shared`), kèm props chính:

```ts
DataTable<T>   { rows: T[]; columns: TableColumnsType<T>; rowKey(row: T): string; selection?: { keys; onChange }; footer?: ReactNode;   // D42: cao hết phần còn lại, chỉ thân bảng cuộn, header dính
                 onRowClick?(row: T): void; bulkActions?: BulkAction[]; aiColumn?: (row: T) => AiSuggestion | null;
                 mobileCard?: (row: T) => ReactNode /* < md: render danh sách thẻ */ }
KanbanBoard<T> { columns: { key: string; label: string; color: string }[]; items: T[]; groupBy(item: T): string;
                 onMove(item: T, to: string): void /* gọi action */; renderCard(item: T): ReactNode }
FilterBar      { fields: FilterField[]; value: FilterState; onChange(v: FilterState): void; savedViews?: SavedView[] }
EntityDrawer   { entity: EntityKind; id: string; tabs: DrawerTab[]; onClose(): void }   // antd Drawer; < md: placement="bottom", full height
PageHeader     { title: string; actions?: ReactNode; kpis?: KpiItem[] }
PageStates     { state: 'empty'|'loading'|'error'|'ready'; empty?: EmptySpec; onRetry?(): void; children }
Pager          { page; size; total; onPage(p): void; onSize?(n): void; label; prev; next }   // D42: số trang + 20/50/100; < md chỉ Trước · trang · Sau
AiButton       { module: string; onClick(): void }   // REQ-N15: một kiểu nút "Trợ lý AI" toàn app (nền mực, ✦ brand, tooltip tên module)
ActionMenu     { items: (MenuItem | { label; submenu: MenuItem[] })[] }   // REQ-C10: submenu thay nội dung + nút ‹
ConfirmActionDialog { preview: ActionPreview; onConfirm(): void; onCancel(): void; editable?: boolean }
useAction<Id extends ActionId>(id) → { run(input, opts?): Promise<ActionResult>; isPending; }   // tự xử lý 202 preview, invalidates, toast + nút "Hoàn tác"
```

### 7.2 Màn chính

```
assistant/[[...sessionId]]
└── AssistantPage
    ├── SessionSidebar { sessions; onNew; onSearch }
    ├── ModeTabs { mode: 'chat'|'cowork' }                     + AgentPicker + TierPicker
    ├── AssistantThread { sessionId }                          # @ant-design/x Bubble.List (stream)
    │   ├── MessageBubble · PlanCard { steps } (x ThoughtChain) · ConfirmCard { preview; confirmToken }
    │   ├── ResultCard { summary; uiTarget } · DelegationCard { runId; agent }
    │   └── WelcomeCarousel (Chat: 5 card tư duy · Cowork: 6 card agent) + Suggestions
    └── AssistantComposer { onSend; attachments; voice? }      # @ant-design/x Sender

inbox/[[...conversationId]]
└── InboxPage
    ├── FolderRail { counts }        # Tất cả · Của tôi · AI đang xử lý · Cần người · AI chờ duyệt · Chưa đọc · theo kênh · thẻ
    ├── ConversationList { folder; filters }         (virtual)
    ├── ChatPanel { conversationId }
    │   ├── ChatHeader (assign, tag, AiModeToggle, status, "Chuyển thành ▾", ⋯ ConversationMenu có submenu — REQ-C10; không video / gọi điện)
    │   ├── ThreadSearchBar (REQ-C12) · PinnedMessageBar · MessageMenu ⋯ (cảm xúc, trả lời, chuyển tiếp, ghim, dịch, tạo ticket, thu hồi / xoá — REQ-C09)
    │   ├── MessageThread (virtual, load-more) · AiSuggestionBar (copilot) · HandoffBanner
    │   └── Composer (text, emoji, attach, canned "/", note mode, AI rewrite/translate; menu ＋: tệp · chụp màn hình · AgentToolsPanel chỉ đọc + link Builder — REQ-C11, D51; "Người gửi: <tên> (bạn)")
    └── ContextPanel → Customer360Panel { contactId; layout }   # tab / khối theo profile_layout của vai trò (⚙ Tuỳ chỉnh — REQ-F12); 6 nút mở form tại chỗ theo luật COMMERCE (D46, REQ-F11)
                                                         # tóm tắt AI, info, đơn/báo giá/lịch/ticket, ghi chú, hạng

customers/                CustomersPage → PageHeader + StageTabs + FilterBar + (DataTable | KanbanBoard) → Customer360Drawer
customers/[id]            Customer360Page tabs: Tổng quan · CRM · AI · Tệp · Lịch sử
contracts/                ContractsPage → KpiStrip(4) · FilterChips(Nháp/Chờ ký/Đã ký/Hết hạn) · (DataTable | Kanban 4 cột) · ContractDrawer (thông tin · nội dung/PDF · ký điện tử · phụ lục · timeline ký · AI gợi ý) · ContractEditor (mẫu theo loại + biến | upload PDF)
(public)/sign/[token]      SignPage → PdfViewer · ConsentCheckbox · OtpStep · SignaturePad · Done (tải PDF đã ký)
products/ quotes/ orders/ invoices/   cùng mẫu ListPage + EntityDrawer; QuoteEditor { quoteId? } (line items, chiết khấu dòng + tổng, thuế sau CK, preview PDF); OrderDetail (2 trục trạng thái, thanh toán, gói buổi, kho); "Hoá đơn" hiển thị là "Đề nghị thanh toán"
calendar/                 CalendarPage → ViewSwitch(day|week|month|list) · StaffLanes · AppointmentBlock · AppointmentDrawer · SlotPicker
tickets/                  TicketsPage → KpiStrip(5) · FilterBar · (DataTable | Kanban 4 cột) · TicketDrawer (timeline, comment, SLA clock)
marketing/                MarketingPage → SuggestionTable(7 cột) · CampaignList · CampaignWizard(steps: đối tượng → nội dung → kênh & lịch → duyệt) · CampaignDetail(stats)
loyalty/                  LoyaltyPage → Overview · MemberTable · AdjustPointsDialog(3 bước) · ConfigDialog
agents/                   AgentsPage (list + stats) · TemplateGallery(lọc Nhóm ngành → Ngành) · AgentBuilder{ agentId } (trái: cấu hình/prompt/tools/tri thức/kênh/ngưỡng · phải: TestChat). Tab Tools = **nơi duy nhất cấp quyền agent**: ToolGroup theo module + Kỹ năng AI, n/tổng, badge Cần kết nối X / Sắp có (D51, REQ-D16)
assistant/approvals       ApprovalsQueue (màn mới, không đo parity) · assistant/actions → ActionLog + hoàn tác (prototype L1464)
dashboard/                DashboardPage → GreetingBar(hỏi Trợ lý) · NeedsMe · AiTodayFeed · FollowUpWidget · OnboardingChecklist · CreditCard
settings/[section]        SettingsShell (nav nhóm, ô tìm kiếm — theo prototype L9810) → SettingsSection registry: general (+ giờ làm việc) · locale · members · channels · web_widget · contacts_fields · tags · replies · doc_templates (Mẫu chứng từ — báo giá / hợp đồng / đề nghị thanh toán / phiếu thu; rich + DOCX; D30) · ai_models · rag_data · ai_gov · ai_audit / audit · org_sla (chỉ chính sách mặc định) · notifications · wallet (gói, ví, hoá đơn gói). · **roles** (Vai trò & phân quyền — P0 chỉ đọc ma trận, P1 sửa/tạo; D27) · **integrations** (Nền tảng kết nối — registry + thẻ "Sắp có"; D28) · **profile_360** (Hồ sơ 360° — nhóm Ứng dụng: mẫu, gán vai trò, Xem như vai trò; REQ-M05) · **channels** theo ver2.1: danh sách kênh → tài khoản → ChannelDrawer (tổng quan, hiệu suất 7 ngày, trả lời tự động, phân công & SLA, đồng bộ, vùng nguy hiểm) + ConnectChannelWizard 3 bước (REQ-B09–B11). Các mục OUT bị ẩn (Sơ đồ tổ chức, Phòng ban, KPI, Phân ca, API/Playground/Developer, SMS, ZBS, Tổng đài, Cloud, Branding, Affiliate, SSO/Compliance)
customers/ (D32)          ContactOwnerCell + CollaboratorsPopover · TransferOwnerModal (chọn chuyển kèm hội thoại / báo giá / lịch) · AccessRequestDialog ("Đã có người phụ trách: …" + Xin chia sẻ) · AccessRequestsList (trong NeedsMe)
quotes/ contracts/ (D30)  DraftFromContentModal (dán nội dung / đính kèm → chọn mẫu → AI soạn nháp) · AiSuggestedClauseBlock (Giữ / Bỏ) · LegalChecklistPanel
orders/ (D31)             OrderSourceBadge (sàn / POS) · ExternalLockBanner (khoá dòng hàng / giá) · PlatformStatusTag
agents/ (D29)             AgentCreateMenu (Mở Workflow — ẩn · Tạo thủ công · Trợ lý AI; theo prototype) · AgentAiCreateModal (mô tả → AgentDraftPreview → "Tạo & xuất bản" | "Mở trong builder") · AgentVersionHistory (xuất bản / quay lại) · TestChat (dryRun)
settings/roles (D27)      RolesMatrix (P0 chỉ đọc: nhóm quyền × 5 vai trò, theo prototype L6011) · P1: RoleEditor (nhân bản, sửa) · TeamsManager · DelegationToggles (uỷ quyền ký / hoàn tiền cho Quản lý)
settings/integrations     IntegrationsPage (theo prototype L6218) → CategoryTabs · StatsStrip · ConnectorGrid → ConnectorCard { manifest, status } (badge "Sắp có" + InterestButton) · ConnectModal (form sinh từ `manifest.auth.fields`) · ConnectionDrawer (trạng thái, nhật ký gọi, đồng bộ ngay, chọn bên giữ tồn, bật tích điểm đơn sàn, ngắt) (D28, D31)
settings/doc_templates    TemplateList (tab theo loại) · RichTemplateEditor · DocxUploadWizard (tải lên → AI nhận diện → FieldMapper đánh dấu / sửa biến → LegalChecklistPanel → lưu) · TemplatePreview (PDF) (D30)
settings/rag_data (D29)   KnowledgePage (theo prototype) → FolderTree · NavTabs (Tất cả / AI đã học / Từ hội thoại / Do bạn upload) · FileTable (trạng thái index, số đoạn, index lại) · UploadModal (thư mục, thẻ, visibility) · SuggestionQueue (P1)
(admin)/admin/[section]   workspaces · plans · model-prices · transfers · templates
(onboarding)/declare      DeclareBusinessModal (không đóng được; 2 bước) · welcome → TrialWelcome (2 nút)
```

### 7.3 Client state

- **Server state:** TanStack Query. Key theo dạng `[module, entity, params]`. Realtime event chỉ invalidate hoặc patch cache, không lưu state song song.
- **UI state:** Zustand, chỉ gồm `assistantDock` (mở/đóng, context), `inboxUi` (folder, mật độ hiển thị) và `shell` (thu gọn).
- **Form:** antd `Form` + rule sinh từ zod schema của `packages/actions` (helper `zodRule(schema)`), để cùng validate với server.
- **UI Command Bus:** mỗi page đăng ký handler bằng `useUiCommand('prefill', 'quote.form', handler)`. Lệnh không có handler thì chuyển thành `navigate` tới route mặc định của entity.

---

### 7.4 i18n (chốt 2026-10-28 — Vision V15, RRI D22: phát hành `vi` + `en`, nền sẵn để thêm ngôn ngữ)

- **Registry ngôn ngữ** `packages/shared/src/i18n/locales.ts`: mỗi ngôn ngữ có mã BCP-47, tên bản địa, cờ (ảnh 20×14, không dùng emoji), locale của antd, locale của dayjs, định dạng số/tiền/ngày, `dir`, `enabled`.
  - Khai báo sẵn đủ 11 ngôn ngữ của prototype (`vi`, `en`, `zh-CN`, `zh-HK`, `zh-TW`, `ja`, `ko`, `th`, `ms`, `id`, `fil`); chỉ `vi` và `en` có `enabled: true`.
  - Menu ngôn ngữ (Profile, footer đăng nhập) chỉ hiện ngôn ngữ đã bật. Đây là ngoại lệ parity có chủ đích.
  - **Thêm ngôn ngữ = thêm thư mục bản dịch + bật `enabled`.** Không sửa code.
- **Bản dịch:** `apps/web/messages/<locale>/<module>.json` (next-intl), chuẩn ICU MessageFormat (số nhiều, biến, chọn). Không nối chuỗi trong code.
  - `vi` là ngôn ngữ nguồn.
  - Fallback: `zh-HK → zh-TW → en → vi`, và `* → en → vi`. Không bao giờ hiện key thô.
- **Đồng bộ khi đổi ngôn ngữ:** next-intl, `ConfigProvider locale` của antd và Ant Design X, dayjs, `Intl.NumberFormat`/`DateTimeFormat` (qua helper `fmt.money/date/number` trong `packages/shared`).
- **Chọn locale:** `user.locale` → `workspace.locale` → `Accept-Language` → `vi`. Trước khi đăng nhập dùng cookie `NEXT_LOCALE`. Không đưa locale vào URL (app nằm sau đăng nhập).
- **Server:**
  - API trả `error.code` (+ `fields` là code); client tự dịch.
  - Email (OTP, mời, thông báo), PDF báo giá/hoá đơn và thông báo in-app render theo locale người nhận, template ở `packages/shared/i18n/server/<locale>/`.
  - Nhãn action (`actions.<id>.title`) lấy từ messages.
- **AI:**
  - Trợ lý trả lời bằng ngôn ngữ của người dùng (`user.locale`, hoặc ngôn ngữ họ đang gõ).
  - Agent trực kênh trả lời bằng **ngôn ngữ khách đang nhắn**: phát hiện và lưu `contact.locale` (thêm cột này vào `contact`).
  - System prompt nằm trong kho prompt (`packages/ai/prompts/`), tách khỏi messages UI.
  - Dữ liệu do doanh nghiệp nhập (sản phẩm, KB, nội dung chiến dịch) không tự dịch.
- **CI:**
  - `i18n:check` fail khi `vi` hoặc `en` thiếu key, hoặc còn chuỗi hard-code (`eslint-plugin-i18next` cho JSX/TSX).
  - Ngôn ngữ chưa bật thì chỉ báo độ phủ; chỉ được bật khi độ phủ ≥ 98% và đã kiểm UI (độ dài chữ th/zh/ja).

## 8. INTEGRATION POINTS

| Tích hợp | Cách làm | Trạng thái |
|---|---|---|
| LLM: Anthropic, OpenAI, Google, DeepSeek + router OpenAI-compatible (OpenRouter, 9router…) | AI SDK providers + `@ai-sdk/openai-compatible`; provider / key trong bảng `llm_provider`, route trong `model_route` (D33) | Cần key (OQ-06) |
| Zalo cá nhân | zca-js (pin version), adapter riêng | Spike trong TIP-014 |
| Email gửi hệ thống (OTP, thông báo) | **Brevo** transactional API qua `MailProvider` (D34); webhook Brevo (bounce / complaint) → đánh dấu email lỗi; SMTP (nodemailer) là adapter dự phòng | Cần tài khoản Brevo + domain gửi (SPF / DKIM / DMARC) |
| Tra cứu MST | `TaxLookupProvider`: **VietQR** + `mock`; lỗi thì nhập tay (D35) | |
| VietQR (AppChat thu tiền và DN thu tiền khách) | Tự sinh payload EMVCo/NAPAS (BIN + STK + số tiền + nội dung), render QR bằng `qrcode` | Tự làm |
| Webhook ngân hàng | port `BankFeedProvider`; **SePay chính**, Casso dự phòng; bản `mock` cho dev (D35) | OQ-04 |
| **Connector registry (D28)** | `packages/integrations`: port theo năng lực (`EInvoiceProvider`, `ESignProvider`, `AccountingSyncProvider`, `CommerceSyncProvider`, `SheetSyncProvider`, `SmsProvider`, `MailProvider`, `StorageProvider`, `TaxLookupProvider`) + `ConnectorManifest`; gọi ra ngoài qua queue `integrations` (retry, idempotent, call log); webhook chung `/hooks/integrations/:connector/:connectionId` | Chuẩn `standards/integrations/provider-ports.md`; MISA / Mắt Bão / VNPT / Viettel… = "Sắp có" |
| Object storage | interface `Storage`: `local` (dev `./.data/files`; prod `/srv/appchat/files` trên VPS + backup restic) và `s3` (S3-compatible, bật bằng env khi cần) | |
| PDF chứng từ | Mẫu `rich`: `@react-pdf/renderer` trong worker (font Plus Jakarta Sans nhúng). Mẫu `docx`: `docxtemplater` + **LibreOffice headless native** (`soffice --convert-to pdf`, queue `doc-render`, user riêng, không mạng) — D30 | Cài LibreOffice trên VPS-APP (infra) |
| Excel import/export | `exceljs` | |
| Parse tài liệu RAG | `pdf-parse`, `mammoth` (docx), `exceljs`/csv, fetch URL + readability | |

**Auth flow:** đăng ký bằng email OTP → đặt mật khẩu (tuỳ chọn) → tạo workspace → khai báo bắt buộc → tạo subscription trial + cấp 10.000 credit → màn chào mừng → `/dashboard`.
- Access token chỉ giữ trong memory của web. Refresh token để trong cookie httpOnly.
- Nhận 401 thì gọi refresh một lần rồi thử lại request.

---

## 9. NON-FUNCTIONAL REQUIREMENTS

| Hạng mục | Ngân sách / chuẩn |
|---|---|
| Web | LCP < 2.5s (desktop, 4G nhanh; mobile 4G < 3s); JS ban đầu mỗi route ≤ 300KB gz (antd tree-shake theo component); danh sách > 100 dòng phải virtual; ảnh dùng `next/image` |
| UI parity | Desktop 1440×900: sai khác pixel < 5% so với prototype mỗi màn/trạng thái chính (REQ-N14); mobile 390×844: không tràn ngang, vùng chạm ≥ 44px |
| API | đọc p95 < 300ms; ghi p95 < 500ms; tin nhắn vào → hiện trên UI p95 < 1s; AI trả lời kênh p50 < 8s (không tính debounce) |
| DB | không truy vấn nào > 100ms ở 1 triệu bản ghi/tenant với các list chính (kiểm bằng `EXPLAIN ANALYZE` trong TIP) |
| Khả dụng | 99.9%; mọi job idempotent; outbox retry back-off `2^n` (tối đa 8 lần) rồi dead-letter |
| Lỗi | API luôn trả envelope; web có ErrorBoundary theo route, toast cho lỗi action, nút "Thử lại"; worker log có cấu trúc kèm `runId`/`ws`/`traceId` |
| 5 trạng thái UI | Empty / Skeleton / Loaded (fade 150ms) / Error-retry / Confirm — bắt buộc ở mọi màn có dữ liệu |
| Bảo mật | argon2id; JWT HS256 (secret ≥ 32 byte, xoay được); CSRF: refresh cookie SameSite=Lax + chỉ chấp nhận POST; helmet; rate-limit (auth, actions, widget); mã hoá credential kênh AES-256-GCM (`CHANNEL_ENC_KEY`); upload kiểm MIME + giới hạn kích thước |
| A11y | WCAG AA (tương phản, focus ring 3px, điều hướng bàn phím trong dock/dialog/table) |
| i18n | §7.4: phát hành `vi` + `en`; registry 11 ngôn ngữ (chỉ bật vi/en); ICU, fallback, antd/dayjs đồng bộ; lint chặn chuỗi hard-code; tiền `1.250.000₫`, ngày `dd/MM/yyyy` theo locale |
| Test | unit (core services + policy), integration (Postgres thật: `appchat_platform_test` + DB tenant tạo từ template mỗi suite, Redis thật), tenant isolation (§2.1), e2e Playwright, AI eval (fixture replay + live gated `AI_EVAL_LIVE=1`) |
| Vận hành | Native VPS (systemd + PM2), không Docker (§11); log JSON (pino) → Alloy → Loki; metrics `prom-client` + exporters → Prometheus; Grafana dashboards + Alertmanager (email/Telegram); `/healthz`, `/readyz`; pgBackRest (full tuần, diff ngày, WAL liên tục → RPO ≤ 5 phút, RTO ≤ 1 giờ), restore thử hằng tuần |

---

## 10. RỦI RO KỸ THUẬT CẦN XỬ LÝ SỚM

| # | Rủi ro | Xử lý |
|---|---|---|
| K1 | ~~pgvector trên Windows~~ **Đã xử lý 2026-10-28:** build pgvector 0.8.1 bằng MSVC và cài vào PG16 trên máy dev. Ghi lệnh cài vào `infra/dev/README.md` | TIP-002 kiểm `CREATE EXTENSION vector`. Nếu không cài được: dev tạm dùng `kb_chunk.embedding` kiểu `real[]` + tìm tuyến tính (chỉ cho dev). Prod chạy Linux có pgvector. Escalate nếu cả hai đều không được |
| K2 | zca-js không chính thức, có thể bị Zalo đổi giao thức hoặc khoá tài khoản | Adapter cô lập; pin version; health probe; cảnh báo Owner; thiết kế sẵn chỗ cho Zalo OA (P2) |
| K3 | DB-per-tenant: số kết nối, RAM của Prisma Client mỗi DB, autovacuum trên nhiều DB | PgBouncer transaction mode bắt buộc; driver adapter `@prisma/adapter-pg` pool nhỏ; LRU client; đo RAM/latency với 200 DB giả lập. Đo p95 ở TIP-002 |
| K4 | Tên trường `usage` của AI SDK v7 khi stream nhiều bước chưa kiểm | Spike nửa ngày ở đầu TIP AI: kiểm `usage` + chạy tiếp sau restart worker; viết test hợp đồng cho `CreditMeter` |
| K7 | Nhiều DB trên một cluster (mỗi DB rỗng ~8 MB, catalog + autovacuum tăng theo số DB) | Theo dõi số DB và tổng kích thước; khi > ~500 DB hoặc đĩa > 70% thì thêm cluster mới và đặt workspace mới lên đó qua `db_host`. Workspace gói Miễn phí không hoạt động 90 ngày được tự lưu trữ (dump + drop, khôi phục khi đăng nhập — §2.0 bước 5, D23) |
| K6 | Single VPS là điểm lỗi duy nhất | Backup offsite + restore thử hằng tuần; runbook dựng lại VPS < 1 giờ bằng `infra/scripts`; khi doanh thu cho phép thì thêm replica PG ở VPS thứ 2 |
| K8 | **LibreOffice DOCX → PDF** lệch bố cục / font so với Word; tốn CPU | Spike đầu TIP chứng từ với 5 mẫu DOCX thật (bảng, header/footer, font tiếng Việt); cài font (Plus Jakarta Sans, Times New Roman, Arial, DejaVu) trên VPS; giới hạn 2 tiến trình + timeout 60s; lệch thì trả thêm DOCX đã điền và khuyến nghị mẫu rich |
| K9 | API sàn TMĐT (Shopee Open Platform, TikTok Shop Partner, Lazada Open Platform) cần **đăng ký app đối tác / duyệt**, webhook cần domain HTTPS | Adapter thật để P2 nên không chặn phát hành; Chủ nhà nộp đăng ký sớm; khung + `mock` có từ P0 |
| K10 | AI nhận diện biến DOCX sai, AI soạn sai số liệu | Bắt buộc người xác nhận field map; số liệu luôn từ bản ghi; eval `doc-draft` |
| K11 | Scope `own` + join `contact_collaborator` làm chậm list lớn | Index §2.2 authz; `EXPLAIN` trong TIP; p95 > 300ms thì denormalize `contact.visible_user_ids uuid[]` + GIN |
| K12 | pgvector HNSW kèm filter (`kb_scope`, visibility) giảm recall | Dùng `hnsw.iterative_scan` (pgvector ≥ 0.8); kho nhỏ thì quét chính xác; eval `rag` |
| K5 | Prisma multi-file schema và tên cờ preview đổi theo phiên bản | TIP-001 chốt phiên bản Prisma/Next/Nest ổn định mới nhất, ghi lại vào `product/tech-stack.md` |

---

## 11. HẠ TẦNG PRODUCTION & OBSERVABILITY (chốt 2026-10-28 — Vision V13, RRI D20)

**Nguyên tắc:** mọi thứ chạy **native trên VPS Linux** (Ubuntu Server 24.04 LTS), quản lý bằng **systemd** (hạ tầng) và **PM2** (app Node). **Không Docker, không K8s.** Cấu hình hạ tầng nằm trong repo (`infra/`), dựng lại được từ đầu bằng script idempotent.

### 11.1 Topology

```
                Internet ──443──▶ ┌──────────────────────────── VPS-APP (≥ 8 vCPU / 16 GB / NVMe) ───────────────────────────┐
                                  │ nginx (TLS certbot, HTTP/2, WS upgrade, rate-limit, gzip/brotli)                         │
                                  │   app.<domain>     → web  :3000  (Next.js, PM2 cluster ×2)                               │
                                  │   app.<domain>/api → api  :4000  (NestJS, PM2 cluster ×N, sticky cho Socket.IO)          │
                                  │   widget.<domain>  → widget.js tĩnh + /widget socket                                    │
                                  │ worker-channels ×1 · worker-ai ×N · worker-jobs ×1   (PM2 fork)                          │
                                  │ PostgreSQL 16 + pgvector (PGDG apt) — 1 DB nền tảng + 1 DB/workspace · PgBouncer :6432 │
                                  │ Redis 7 (apt, AOF everysec)                                                              │
                                  │ node_exporter · postgres_exporter · redis_exporter · nginx exporter · Grafana Alloy      │
                                  │ /metrics của api/worker chỉ nghe 127.0.0.1 / mạng riêng                                  │
                                  └───────────────┬───────────────────────────────────────────────────────────────────────────┘
                                                  │ mạng riêng / WireGuard (scrape metrics, push log)
                                  ┌───────────────▼────────────── VPS-MON (2 vCPU / 4 GB / 100 GB) ──────────────────────────┐
                                  │ Prometheus (retention 15 ngày) · Alertmanager · Loki (retention 30 ngày, filesystem)     │
                                  │ Grafana (sau nginx + TLS, chỉ Owner/đội vận hành) · Blackbox exporter (uptime HTTPS)      │
                                  └──────────────────────────────────────────────────────────────────────────────────────────┘
          Backup offsite: pgBackRest → S3-compatible hoặc VPS thứ 3 (full tuần, diff ngày, WAL liên tục) · file upload rsync/restic
```

- Monitoring tách VPS riêng để **app sập vẫn còn cảnh báo**. Giai đoạn đầu có thể gộp chung một VPS; khi đó Blackbox exporter phải đặt ở nơi khác (hoặc dùng uptime check ngoài).
- Khi tải tăng: tách PostgreSQL sang VPS-DB riêng (streaming replica cho đọc), rồi tách `worker-ai`. Kiến trúc không đổi, chỉ đổi biến môi trường.
- File upload: `Storage` interface — mặc định `local` trên đĩa VPS (`/srv/appchat/files`) + backup restic; đổi sang `s3` (S3-compatible bên ngoài) chỉ bằng env.
- **LibreOffice headless** + bộ font (apt) trên VPS-APP cho queue `doc-render` (D30); chạy dưới user `appchat-render`, không mạng, thư mục tạm riêng mỗi job.

### 11.2 Thư mục `infra/` trong repo

```
infra/
├── README.md                  # runbook: dựng VPS mới, deploy, rollback, restore backup, xoay secret
├── scripts/
│   ├── provision-app.sh       # idempotent: user, ufw, fail2ban, node 22 LTS, pnpm, pm2, nginx, certbot, PG16+pgvector, pgbouncer, redis, exporters, alloy; tạo 4 role + DB nền tảng + DB template
│   ├── provision-mon.sh       # prometheus, alertmanager, loki, grafana, blackbox (binary chính thức / apt repo Grafana)
│   ├── deploy.sh              # build → migrate → pm2 reload (gọi từ GitHub Actions qua SSH)
│   ├── rollback.sh            # quay về release trước (thư mục releases/<sha>, symlink current)
│   └── backup-verify.sh       # restore thử bản backup mới nhất vào DB tạm mỗi tuần
├── nginx/                     # site configs (app, api, widget, grafana), snippets TLS/headers/rate-limit
├── systemd/                   # unit cho exporter, alloy, prometheus, loki, alertmanager, grafana (khi cài từ binary)
├── postgres/                  # postgresql.conf tuning (autovacuum cho nhiều DB), pg_hba.conf, pgbackrest.conf, pgbouncer.ini
├── redis/redis.conf
├── prometheus/                # prometheus.yml, rules/*.yml (recording + alert)
├── alertmanager/alertmanager.yml   # kênh nhận: email + Telegram
├── loki/loki.yml · alloy/config.alloy
└── grafana/
    ├── provisioning/          # datasources (Prometheus, Loki), dashboards provider
    └── dashboards/*.json      # dashboard as code
```

### 11.3 Deploy (zero-downtime)

1. GitHub Actions: lint → typecheck → unit/integration → build (`pnpm turbo build`) → đóng gói artifact.
2. SSH vào VPS-APP: giải nén vào `/srv/appchat/releases/<git-sha>`, `pnpm install --frozen-lockfile --prod`.
3. Migration (role `appchat_migrator`): `migrate platform` → `migrate template` → `tenant-migrate` (duyệt mọi DB `ws_*`, song song 4, ghi `tenant_migration`). Migration phải tương thích ngược một phiên bản (expand → migrate → contract) để reload không lỗi khi runner chưa xong.
4. Đổi symlink `current` → `pm2 reload ecosystem.config.cjs --update-env` (cluster reload từng instance). Worker nhận SIGTERM thì ngừng nhận job mới, chờ job đang chạy (tối đa 60 giây). `worker-channels` nhả lease Zalo trước khi tắt.
5. Smoke test `/readyz` + Blackbox; lỗi thì `rollback.sh` tự động.
- Secrets: file `/etc/appchat/env` (chmod 600, chỉ user `appchat` đọc), không commit. Mẫu ở `.env.example`.

### 11.4 Observability

**Metrics (Prometheus):**

| Nguồn | Exporter | Chỉ số chính |
|---|---|---|
| Máy chủ | node_exporter | CPU, RAM, disk, I/O, network |
| PostgreSQL | postgres_exporter (+ `pg_stat_statements`) | kết nối, TPS, slow query, cache hit, bloat, tuổi backup/WAL; số DB tenant, kích thước top-20 DB (không auto-discover toàn bộ DB để tránh cardinality) |
| PgBouncer | pgbouncer_exporter | pool đang dùng / chờ, client chờ |
| Redis | redis_exporter | bộ nhớ, evictions, kết nối |
| nginx | nginx-prometheus-exporter (stub_status) | request, kết nối |
| api / worker | `prom-client` tại `/metrics` (127.0.0.1) | HTTP RED theo route (`http_request_duration_seconds`), action theo `action_id` + kết quả, WS kết nối, BullMQ (`queue_waiting/active/failed` theo queue), outbox lag, tin nhắn vào/ra theo kênh, **trạng thái tài khoản kênh** (connected/error/expired), LLM latency/token/lỗi theo provider + model, credit trừ, approval đang chờ |
| Uptime | blackbox_exporter | HTTPS app/api/widget, hạn TLS |

- **Không** dùng `workspace_id` làm label metric (cardinality cao). Theo dõi theo tenant thì dùng log hoặc query DB.

**Logs (Loki):**
- App log JSON bằng **pino**, mỗi dòng có `level`, `msg`, `traceId`, `ws`, `runId?`, `actionId?`, `conversationId?`. Redact token, mật khẩu, credential kênh, số điện thoại / email (che một phần).
- PM2 ghi file `/var/log/appchat/*.log` (logrotate). **Grafana Alloy** đọc file và journald rồi đẩy lên Loki.
- Label Loki giữ ít: `app`, `env`, `level`, `host`. Các trường còn lại lọc bằng `| json`.
- Truy vết: `traceId` sinh ở nginx (`$request_id`) → api → job BullMQ → worker, nên một yêu cầu của khách lọc được trọn luồng trong Loki. OpenTelemetry trace (Grafana Tempo) để ngỏ, thêm sau khi cần.

**Dashboards (Grafana, provision từ repo):**
1. Tổng quan hệ thống (VPS, PG, Redis, nginx).
2. API & Realtime (RED theo route, WS, lỗi theo mã).
3. Queues & Outbox (backlog, retry, dead-letter).
4. Kênh (Zalo theo tài khoản: trạng thái, gửi/nhận, lỗi, cap/ngày; Email IMAP; widget).
5. AI (run theo loại, step, latency, token, credit, lỗi theo provider, tỉ lệ handoff, approval chờ).
6. Billing (QR tạo/đã trả, webhook ngân hàng, đối soát lỗi).

**Cảnh báo (Alertmanager → email + Telegram):**

| Cảnh báo | Điều kiện |
|---|---|
| API lỗi | tỉ lệ 5xx > 2% trong 5 phút |
| API chậm | p95 > 1s trong 10 phút |
| Queue nghẽn | `queue_waiting` > 500 hoặc job tuổi > 5 phút; có job vào dead-letter |
| Kênh Zalo | tài khoản chuyển `error`/`expired`, hoặc lỗi gửi > 10% trong 15 phút |
| LLM | lỗi provider > 20% trong 5 phút (router đã fallback nhưng cần biết) |
| Thanh toán | webhook ngân hàng lỗi chữ ký / không khớp hoá đơn |
| Hạ tầng | disk > 80%, RAM > 90%, PG kết nối > 80% max, Redis evictions > 0 |
| Backup | bản full/diff mới nhất > 26 giờ, WAL archive lỗi, `backup-verify` thất bại |
| Tenant DB | `tenant.provision` lỗi / > 60 giây; `tenant.archive` / `tenant.restore` lỗi hoặc restore > 5 phút; `tenant-migrate` có DB `failed`; PgBouncer client chờ > 0 trong 2 phút |
| Uptime / TLS | HTTPS down > 2 phút; chứng chỉ còn < 14 ngày |

### 11.5 Bảo mật VPS

- `ufw`: chỉ mở 22 (khoá mật khẩu, chỉ SSH key), 80, 443. Postgres / Redis / exporters / Prometheus / Loki chỉ nghe `127.0.0.1` hoặc giao diện WireGuard.
- fail2ban, `unattended-upgrades` (bản vá bảo mật), user `appchat` không có sudo chạy app.
- Grafana sau nginx + TLS, tắt đăng ký, bật 2FA cho admin.
- PostgreSQL: `scram-sha-256`; 4 role tách biệt (`appchat_platform_app`, `appchat_tenant_app`, `appchat_provisioner`, `appchat_migrator` — §2.0); app chỉ kết nối qua PgBouncer; DB template không cho app kết nối; TLS nếu tách sang VPS-DB.

---

## 12. PHỤ LỤC — TRUY VẾT REQ → BLUEPRINT

Mọi REQ P0 / P1 của `01-REQUIREMENTS-MATRIX.md` có chỗ thiết kế dưới đây. Task Graph gán TIP theo bảng này.

| REQ | Thiết kế ở |
|---|---|
| A01 | §4.2 · §2.2 identity (`otp_code`, `refresh_token`) |
| A02 | §2.2 `business_profile` · §8 `TaxLookupProvider` · §7.2 onboarding |
| A03 | §2.0 · §2.1 · `standards/database/tenant-db.md` |
| A04 | §2.2 `membership` · §4.2 |
| A05, A05b | §2.2 authz.prisma · §3.2 bước 3 · §3.5 · §7.2 settings/roles · `standards/authz/rbac-permissions.md` |
| A06 | §2.2 billing (`plan`, `subscription`) · §7.2 onboarding |
| A07 | §2.2 kernel `action_log`, `platform_audit_log` |
| A09 | §2.0 bước 5 · queue `tenant` |
| B01 | §6 · `standards/channels/omnichannel-adapter.md` |
| B02, B03, B04 | §6 Zalo cá nhân · §10 K2 |
| B05 | §6 webchat · §2.2 channels-webchat |
| B06 | §6 email |
| B07 | §4.4 channels · §7.2 settings/channels |
| B09, B10, B11 | §2.2 `channel_account` · §3.4 channels · §4.4 channels · §6 · §7.2 settings/channels |
| C01–C04, C08 | §2.2 inbox · §3.4 inbox · §7.2 inbox |
| C05 | §7.2 Composer · §5.3 copilot |
| C06 | §6 inbound pipeline |
| C09, C10, C12, C13 | §2.2 `message_reaction`, `conversation.hidden_at` / `pinned_message_id`, `message.reply_to_id` · §3.4 inbox · §4.4 inbox · §7.1 ActionMenu · §7.2 inbox |
| C11, D16 | §3.1 `skill` / `requiresConnector` · §3.3b · §3.4 ai (Kỹ năng AI) · §4.4 `agents/:id/tools` · §7.2 agents, Composer |
| C07 | §3.4 `quote.create` / `order.create` / `appointment.create` / `ticket.create` · §7.2 ChatHeader "Chuyển thành" |
| D01, D02, D03 | §5.1 · `standards/ai/agent-gateway.md` |
| D04, D04b | §2.2 ai-kb · §5.3 · §7.2 settings/rag_data · `standards/ai/rag.md` |
| D05, D06 | §3.3 · §5.3 |
| D07 | §2.2 `approval_request` · §7.2 assistant/approvals |
| D08 | §2.2 `ai_run`, `ai_run_step`, `action_log` |
| D09, D09b, D15 | §2.2 `ai_agent`, `ai_agent_version`, `agent_template` · §5.3b · §7.2 agents |
| D10 | §2.2 `contact_memory` · §5.3 |
| D11 | §5.3 bước 6 |
| D12, E08, E13 | §5.4 · queue `ai-task` |
| D13 | §5.1 phối hợp agent |
| D14 | §4.4 `agents/:id/stats` · insights |
| E01, E03, E09, N13 | §3 · `standards/actions/action-registry.md` |
| E02, E04, E05, E06, E11 | §5.2 · §7.1 AssistantDock · §7.3 UI Command Bus · `standards/ui/frontend-structure.md` §2.8 |
| E07 | §3.4 `insight.query` |
| E10 | §4.4 assistant sessions |
| E12 | §4.4 files · §5.2 |
| E14 | §3.3b · §4.4 runs · §5.4 khung điều phối |
| F01, F02, F04 | §2.2 crm · §7.2 customers |
| F01b, F01c | §2.2 `contact_collaborator`, `contact_access_request` · §3.4 crm · §3.5 · COMMERCE §8b |
| F03 | §3.4 `contact.merge` / `contact.import` / `contact.export` |
| F05, G07 | §2.2 catalog · `customer_package` · COMMERCE §2, §6 |
| F06, F06b | §2.2 sales `quote`, `doc_template` · COMMERCE §3, §12 · `standards/documents/templates.md` |
| F07, F07b | §2.2 `order` · COMMERCE §4, §4b · queue `order-sync` · `standards/integrations/provider-ports.md` |
| F08 | §2.2 `invoice`, `customer_payment` · §4.7 · COMMERCE §5 |
| F09 | §2.2 contracts · §4.4 public sign · §7.2 contracts, (public)/sign · COMMERCE §9 |
| F10 | §2.3 · COMMERCE §8 |
| F11 | §3.4 `contact.send_email`, `quote.request_revision` · §7.2 Customer360Panel · D46 |
| F12, M05 | §2.2 `profile_layout`, `profile_layout_role` · §3.4 settings · §4.4 crm · §7.2 settings/profile_360 |
| G01–G05 | §2.2 booking · §3.4 booking · §7.2 calendar |
| H01–H04 | §2.2 support · §3.4 support · §7.2 tickets |
| I01–I05 | §2.2 marketing · §3.4 marketing · queue `campaign-send` · §7.2 marketing |
| J01–J04 | §2.2 loyalty · COMMERCE §7 · §7.2 loyalty |
| K01 | §4.4 dashboard · §7.2 dashboard |
| L01, L02, L03 | §5.1 usage / `CreditMeter` · §2.2 billing |
| L04 | §4.7 · §8 VietQR / `BankFeedProvider` |
| L05, L06, L07 | §7.2 settings/wallet · COMMERCE §10 |
| L08 | §7.2 (admin) · §3.4 platform |
| M01 | §7.2 settings registry |
| M02 | `workspace.settings` · notify |
| M03 | §2.2 integrations.prisma · §8 · §7.2 settings/integrations |
| N01 | §1 · §11 |
| N02 | §2.0 · §2.1 |
| N03 | §4.1 · `standards/api/response-envelope.md` |
| N04 | §4.6 |
| N05 | §2.3 · §1.3 hàng đợi · `standards/events/outbox.md` |
| N06 | §9 · §11.5 |
| N07 | §9 |
| N08 | §11 backup |
| N09 | §11.4 |
| N10 | §7.4 · `standards/i18n/i18n.md` |
| N11 | §9 · `standards/code/testing.md` · `standards/ai/eval.md` |
| N12 | `standards/code/file-size-module-layout.md` |
| N14 | §7.0 · `standards/ui/prototype-parity.md` (ngoại lệ D42 / D43 / D44 / D46 / D51) |
| N15 | §7.1 `AiButton` |
