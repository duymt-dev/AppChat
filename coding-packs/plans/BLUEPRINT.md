# AppChat — Technical Blueprint (khế ước kiến trúc)

> Vibecode Kit v5.0 — BƯỚC 4 (BLUEPRINT) · 2026-10-28 · **BẢN NHÁP — chờ Chủ nhà duyệt**
> Upstream: `00-PROJECT-CONTEXT.md` (Scan + Vision V1–V12), `01-REQUIREMENTS-MATRIX.md` (RRI D01–D16, REQ A–N), `product/*`
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
│   ├── db/                       # Prisma multi-file schema, migrations (SQL RLS/index), tenant client, seed
│   ├── ai/                       # Agent Gateway interface, AiSdkEngine, LLM Router, prompts, meta-tools
│   ├── channels/                 # Channel adapter interface + adapters (zalo-personal, webchat, email)
│   ├── shared/                   # types, enums, error codes, money/phone/date utils, i18n keys
│   └── ui/                       # antd theme (token prototype → ConfigProvider), antd-style tokens, wrapper component, icons (lucide-react)
├── coding-packs/                 # Vibecode artifacts (không phải code)
└── specs/                        # tài liệu phi kỹ thuật
```

**Ranh giới phụ thuộc** (lint bằng `eslint-plugin-boundaries` hoặc dependency-cruiser):
- `shared` → không phụ thuộc package nào.
- `actions` → chỉ `shared` (+ zod).
- `db` → `shared`.
- `ai`, `channels` → `shared`, `actions` (**không** import `core` — nhận dependency qua interface).
- `core` → `db`, `actions`, `shared`, `ai`, `channels`.
- `api`, `worker` → `core` (+ `ai`, `channels`).
- `web` → `actions`, `shared`, `ui` (**không bao giờ** import `core`/`db`).

### 1.2 `packages/core` — mỗi bounded context một thư mục

```
packages/core/src/
├── kernel/            # TenantContext, ActionExecutor, ActionLog, UndoService, ConfirmTokenService,
│                      # EventBus (outbox), Idempotency, Policy (risk), Errors, Pagination, Clock
├── identity/          # user, workspace, membership, invite, auth (OTP, password, tokens), business-profile
├── billing/           # plan, subscription, wallet, credit-ledger, quota, platform invoice, payment matching
├── channels/          # channel_account, credentials vault, account lease, health
├── inbox/             # conversation, message, tag, canned-reply, inbound pipeline, outbound service
├── crm/               # contact, identity resolution, dedupe/merge, timeline, custom fields, import/export
├── catalog/           # product, category
├── sales/             # quote, order, invoice, customer payment (VietQR của workspace)
├── booking/           # staff, business hours, appointment, slot finder
├── support/           # ticket, sla policy, sla clock, escalation
├── marketing/         # segment, campaign, recipient, suggestion
├── loyalty/           # config, ledger, tier
├── ai/                # ai_agent, kb (source/chunk), ai_run/step, approval, assistant session, tasks, governance
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
  - `packages/db/prisma/schema/<domain>.prisma` (rỗng)
  - `apps/web/messages/{vi,en}/<module>.json`
- Mọi file tổng hợp (`app.module.ts`, `core/index.ts`, `actions/index.ts`, `nav-config.ts`) đã import đủ từ đầu. **TIP sau chỉ điền vào stub của domain mình**, không sửa file tổng hợp.


| Process | Entry | Vai trò |
|---|---|---|
| `apps/api` | `src/main.ts` | HTTP `/v1/*`, `/hooks/*`, Socket.IO namespace `/ws` (app) và `/widget` (khách web), OpenAPI tại `/v1/docs` |
| `apps/worker` ROLE=channels | `src/main.ts` | Giữ phiên Zalo (lease theo account), IMAP poll, outbound sender, inbound pipeline |
| `apps/worker` ROLE=ai | `src/main.ts` | Chạy AI run (agent reply, assistant, delegate, tasks), embedding, RAG ingest |
| `apps/worker` ROLE=jobs | `src/main.ts` | Outbox relay, scheduler (SLA, giữ chỗ lịch hẹn, nhắc hẹn, no-show, campaign, hết hạn trial/QR) |
| `apps/web` | `src/app/*` | Next.js; trong dev proxy `/api/*` → api; trong prod đặt sau nginx cùng domain |

### 1.4 Frontend (`apps/web/src`)

```
app/
├── (auth)/login · register · verify-otp · forgot-password · reset-password
├── (onboarding)/declare · welcome
├── (app)/layout.tsx                 # AppShell + AssistantDock + realtime provider
│   ├── dashboard/ · assistant/[[...sessionId]]/ · inbox/[[...conversationId]]/
│   ├── customers/ · customers/[id]/ · products/ · quotes/ · orders/ · invoices/ · loyalty/
│   ├── appointments/ · tickets/ · marketing/ · marketing/campaigns/[id]/
│   ├── agents/ · agents/[id]/ · agents/approvals/ · agents/activity/
│   ├── settings/[section]/
├── (admin)/admin/[section]/          # Quản trị nền tảng
features/<module>/                     # components/ · hooks/ · api.ts · types.ts (mỗi module một thư mục)
shared/
├── api/        # fetch client (auth refresh, X-Workspace-Id, error envelope), query keys
├── actions/    # useAction(), ConfirmActionDialog, action result toasts
├── realtime/   # socket client, event → query invalidation
├── assistant/  # AssistantDock, UI Command Bus (đăng ký handler theo route), context provider
├── shell/      # NavRail, Flyout, TopBar, MobileTabBar, nav-config.ts (đủ mọi route ngay từ TIP nền tảng UI)
└── states/     # EmptyState, Skeletons, ErrorState, PageStates (5 trạng thái)
messages/vi.json · messages/en.json   # next-intl; key theo module (mỗi module 1 file con)
```

---

## 2. DATA MODEL (PostgreSQL 16)

### 2.1 Quy tắc chung (bắt buộc)

- **Prisma multi-file schema:** `packages/db/prisma/schema/<file>.prisma`. Mỗi file thuộc đúng **một TIP** (bản đồ sở hữu ở `02-TASK-GRAPH.md`). Domain lớn được tách nhiều file: `billing.prisma` + `billing-payments.prisma`, `channels.prisma` + `channels-webchat.prisma`, `ai-runs.prisma` + `ai-kb.prisma` + `ai-agents.prisma` + `ai-assistant.prisma` + `ai-tasks.prisma`. Tương tự `packages/actions/src/<file>.ts`.
- **Migration:** mỗi TIP tạo thư mục migration riêng `<timestamp>_<tip>_<mô tả>`. Không sửa migration đã merge. Sau khi merge vào `main` phải chạy `prisma migrate diff` để kiểm drift; có drift thì tạo migration sửa.
- **Không dùng Prisma relation xuyên domain.** Tham chiếu sang domain khác chỉ là cột scalar (`contactId String @db.Uuid`); foreign key được thêm bằng SQL trong migration. Prisma relation chỉ được dùng trong cùng một file domain. Nhờ vậy các TIP chạy song song không phải sửa chung file.
- **Cột chuẩn của mọi bảng tenant:** `id uuid pk default gen_random_uuid()` (bảng hot dùng uuidv7 sinh từ app) · `workspace_id uuid not null` · `created_at timestamptz default now()` · `updated_at timestamptz`. Bản ghi xoá mềm có thêm `deleted_at`.
- **RLS:**
  - Mọi bảng tenant: `ENABLE ROW LEVEL SECURITY` + `FORCE` + policy `USING (workspace_id = current_setting('app.workspace_id', true)::uuid)` (kể cả `WITH CHECK`).
  - App kết nối bằng role `appchat_app`, không có `BYPASSRLS`.
  - Migration và quản trị nền tảng dùng role `appchat_owner`.
- **Tenant client:**
  - `db.tenant(ctx).run(async tx => …)` mở một transaction, chạy `SELECT set_config('app.workspace_id', $1, true)`, rồi mới chạy query.
  - Repo vẫn truyền `workspaceId` vào `where` (defense in depth).
- **Tiền:** `bigint`, đơn vị VND (không dùng float). **Credit:** `bigint`.
- **Thời gian:** `timestamptz`; hiển thị theo `Asia/Ho_Chi_Minh` (cấu hình theo workspace).
- **Enum:** dùng Postgres enum qua Prisma, giá trị tiếng Anh snake_case. Nhãn tiếng Việt nằm trong i18n.
- **Mã nghiệp vụ:** cột `code` dạng `KH-000123`, `BG-…`, `DH-…`, `HD-…`, `LH-…`, `TK-…`. Sinh bằng bảng `sequence_counter(workspace_id, kind, value)` và lệnh `UPDATE … RETURNING`.
- **Extensions:** `pgcrypto`, `vector` (pgvector), `pg_trgm`, `unaccent`, `btree_gist`.
- **Hàm bất biến:** `f_unaccent(text) IMMUTABLE`, dùng cho expression index tìm kiếm tiếng Việt không dấu.
- **Index:**
  - Thứ tự cột: so sánh `=` trước, cột range/sort sau. Thêm `INCLUDE` khi cần covering index.
  - Dùng partial index (`WHERE deleted_at IS NULL`) và expression index (`lower(email)`, `f_unaccent(lower(name)) gin_trgm_ops`).
  - Danh sách lớn phân trang theo cursor, kết hợp deferred join (subquery chỉ lấy `id`).

### 2.2 Entities theo domain

Ghi chú: `ws` = `workspace_id`. Dấu → là tham chiếu (FK).

**identity.prisma** (TIP-004) — các bảng `user`, `refresh_token`, `otp_code` không có `workspace_id` và không áp RLS. Chỉ truy cập qua service.

| Bảng | Trường chính | Ràng buộc / index |
|---|---|---|
| `user` | id, email citext, password_hash?, name, phone?, avatar_url?, locale, is_platform_admin bool, email_verified_at, last_login_at | unique(email) |
| `otp_code` | id, email, purpose(register\|login\|reset), code_hash, attempts, expires_at, consumed_at | idx(email, purpose, created_at desc) |
| `refresh_token` | id, user_id→user, token_hash, family_id, expires_at, revoked_at, user_agent, ip | unique(token_hash); idx(user_id) |
| `workspace` | id, name, slug, owner_user_id→user, timezone, locale, status(active\|suspended), settings jsonb (giờ mở cửa, giờ trực AI, ngưỡng mặc định) | **gốc tenant**: RLS dùng id |
| `membership` | ws, user_id, role(owner\|member), status(active\|invited\|removed), joined_at | unique(ws, user_id); idx(user_id) INCLUDE(ws, role) |
| `invite` | ws, email, role, token_hash, expires_at, accepted_at | unique(token_hash) |
| `business_profile` | ws (pk), kind(enterprise\|household\|individual), tax_code?, national_id?, legal_name, address, representative, phone, founded_on?, legal_status?, industry_group, industry, business_description, declared_at | 1-1 workspace |

**billing.prisma** (TIP-009) + **billing-payments.prisma** (`billing_invoice`, `bank_transaction` — TIP-010)

| Bảng | Trường | Ghi chú |
|---|---|---|
| `plan` (platform, không RLS) | id, key, segment(personal\|business), name, price_month, price_year, credits_month, max_channels, max_agents, max_users, features jsonb, is_trial_plan, active, sort | seed theo prototype; sửa được trong trang admin |
| `subscription` | ws (unique), plan_id, status(trialing\|active\|expired\|cancelled), trial_started_at, trial_ends_at, current_period_start, current_period_end | |
| `credit_wallet` | ws (pk), balance bigint, low_threshold, warn_80_sent_at, auto_topup jsonb | `balance >= 0` CHECK |
| `credit_ledger` | ws, delta, balance_after, kind(grant\|topup\|usage\|refund\|adjust\|expire), ref_type, ref_id, provider?, model?, tokens_in?, tokens_out?, run_id? | idx(ws, created_at desc) INCLUDE(delta, kind) |
| `model_price` (platform) | provider, model, tier(standard\|advanced\|max), credits_per_1k_in, credits_per_1k_out, active | unique(provider, model) |
| `model_route` (platform) | tier, priority, provider, model, purpose(chat\|embed) | fallback theo priority |
| `billing_invoice` | ws, code, kind(plan\|credits\|addon), plan_id?, credits?, amount, status(pending\|pending_review\|paid\|expired\|cancelled), method(qr\|bank_transfer), transfer_code unique, qr_payload, expires_at, paid_at, bank_tx_id? | partial idx(status) WHERE status in (pending, pending_review) |
| `bank_transaction` (platform) | provider, provider_tx_id unique, amount, content, account_no, occurred_at, matched_invoice_id?, raw jsonb | idempotent theo `provider_tx_id` |

**channels.prisma** (TIP-014) + **channels-webchat.prisma** (`webchat_widget` — TIP-017)

| Bảng | Trường | Ghi chú |
|---|---|---|
| `channel_account` | ws, type(zalo_personal\|webchat\|email), name, external_id, status(pending\|connecting\|connected\|error\|disconnected\|expired), credentials_enc bytea (AES-256-GCM), settings jsonb (rate limit, cap/ngày, agent mặc định, ai_mode mặc định), health jsonb, last_event_at | unique(ws, type, external_id) |
| `webchat_widget` | ws, channel_account_id, public_key unique, theme jsonb, greeting, prechat_form jsonb, agent_id?, allowed_domains text[] | |

**inbox.prisma**

| Bảng | Trường | Index |
|---|---|---|
| `conversation` | ws, channel_account_id, contact_id→crm, kind(direct\|group), external_thread_id, title?, status(open\|pending\|snoozed\|closed), assignee_user_id?, assignee_agent_id?, ai_mode(off\|copilot\|auto), ai_state(idle\|running\|waiting_approval\|handoff), handoff_reason?, intent?, last_message_at, last_message_preview, unread_count, pinned, archived_at?, snoozed_until?, group_ai_policy(mention\|auto\|off)? | unique(channel_account_id, external_thread_id); idx(ws, status, last_message_at desc) INCLUDE(contact_id, unread_count, ai_mode); idx(ws, assignee_user_id, last_message_at desc); partial idx(ws, ai_state) WHERE ai_state in (waiting_approval, handoff) |
| `message` | ws, conversation_id, direction(in\|out), sender_type(contact\|user\|agent\|system), sender_id?, kind(text\|image\|file\|sticker\|audio\|note\|system\|card), body, attachments jsonb, external_msg_id?, channel_account_id, status(queued\|sent\|delivered\|read\|failed), error?, run_id?, created_at | unique(channel_account_id, external_msg_id); idx(ws, conversation_id, created_at desc). Partition theo tháng làm sau khi scale |
| `conversation_participant` | ws, conversation_id, external_id, display_name, contact_id? | dùng cho hội thoại nhóm |
| `conversation_tag` | ws, conversation_id, tag_id | pk(conversation_id, tag_id) |
| `canned_reply` | ws, shortcut, title, body, attachments jsonb | unique(ws, shortcut) |
| `outbox_message` | ws, message_id, channel_account_id, payload jsonb, status(pending\|sending\|sent\|failed\|dead), attempts, next_attempt_at, last_error | idx(status, next_attempt_at) |

**crm.prisma**

| Bảng | Trường | Index |
|---|---|---|
| `contact` | ws, code, name, kind(person\|business\|household), phone?, phone_norm?, email?, tax_code?, avatar_url?, gender?, birthday?, address?, city?, source?, group(vip\|loyal\|new\|potential)?, stage(lead\|potential\|consulting\|quote\|won\|lost), owner_user_id?, tier_key?, points_balance bigint, total_spent bigint, last_interaction_at, last_order_at, marketing_opt_out bool, ai_summary?, ai_summary_at?, custom jsonb, deleted_at? | partial unique(ws, phone_norm) WHERE deleted_at IS NULL AND phone_norm IS NOT NULL; idx(ws, stage, last_interaction_at desc); gin(f_unaccent(lower(name)) gin_trgm_ops); idx(ws, lower(email)) WHERE email IS NOT NULL |
| `contact_identity` | ws, contact_id, channel_type, channel_account_id, external_id, display_name | unique(channel_account_id, external_id) |
| `tag` | ws, name, color, scope(all\|contact\|conversation) | unique(ws, lower(name)) — nguồn thẻ dùng chung cho khách và hội thoại |
| `contact_tag` | ws, contact_id, tag_id | pk |
| `contact_memory` | ws, contact_id, fact, source_run_id?, confidence | AI ghi nhớ sự kiện về khách |
| `timeline_event` | ws, contact_id, type(message\|quote\|order\|invoice\|payment\|appointment\|ticket\|note\|ai_action\|loyalty\|campaign\|stage), ref_type, ref_id, actor_type, actor_id, summary, payload jsonb, occurred_at | idx(ws, contact_id, occurred_at desc) |
| `contact_note` | ws, contact_id, body, author_user_id | |
| `custom_field_def` | ws, entity(contact\|product\|quote\|order\|ticket\|appointment), key, label, type(text\|number\|currency\|date\|email\|phone\|picklist\|lookup\|file\|textarea), options jsonb, required, sort, visible_in jsonb | unique(ws, entity, key) |

**catalog.prisma** — `product_category(ws, name, parent_id?)`; `product(ws, code, name, type(physical|service|combo|package|digital|rental), category_id?, price, cost?, unit, tax_rate(0|5|8|10), stock?, duration_min?, buffer_min?, sessions?, valid_days?, deposit?, images jsonb, description, status(active|draft|archived), custom jsonb, deleted_at?)`; `product_component(product_id, child_id, qty)` cho combo. Index: gin trigram trên tên; idx(ws, status, type).

**sales.prisma**

| Bảng | Trường |
|---|---|
| `quote` | ws, code, version int, root_quote_id?, contact_id, conversation_id?, status(draft\|pending_approval\|sent\|accepted\|revision_requested\|rejected\|expired\|superseded), subtotal, discount_total, tax_total, total, valid_until (mặc định +15 ngày), note, created_by_type(user\|agent\|assistant), created_by_id, approved_by?, sent_at?, decided_at?, file_id? |
| `quote_item` | ws, quote_id, product_id?, name, qty numeric(12,2), unit_price, discount, tax_rate, line_total, sort |
| `order` | ws, code, contact_id, quote_id?, conversation_id?, status(new\|confirmed\|shipping\|done\|cancelled), pay_status(unpaid\|partial\|paid\|refunded), subtotal, discount_total, points_redeemed, points_value, tax_total, total, shipping jsonb?, completed_at?, cancelled_reason? |
| `order_item` | ws, order_id, product_id?, name, qty, unit_price, discount, tax_rate, line_total |
| `invoice` | ws, code, order_id, contact_id, status(draft\|sent\|paid\|overdue\|void), total, paid_amount, due_date, sent_at?, file_id? |
| `customer_payment` | ws, invoice_id, amount, method(qr\|bank_transfer\|cash\|card), reference?, status(pending\|confirmed\|failed), confirmed_by? |
| `payment_account` | ws, bank_bin, account_no, account_name — tài khoản nhận tiền của DN, dùng sinh VietQR cho khách |

**booking.prisma**

| Bảng | Trường / ràng buộc |
|---|---|
| `staff` | ws, name, user_id?, color, skills (product ids), active |
| `staff_schedule` | ws, staff_id, weekday, start_time, end_time (mặc định lấy theo giờ mở cửa) |
| `appointment` | ws, code, contact_id, service_id (product type=service), staff_id?, start_at, end_at, status(pending\|confirmed\|in_progress\|done\|no_show\|rescheduled\|cancelled\|expired), hold_expires_at?, reschedule_of_id?, reschedule_count, cancel_reason?, source(user\|agent\|assistant\|widget), conversation_id?, note, reminders_sent jsonb. **Ràng buộc:** `EXCLUDE USING gist (workspace_id WITH =, staff_id WITH =, tstzrange(start_at, end_at + buffer) WITH &&) WHERE (status IN ('pending','confirmed','in_progress'))`; idx(ws, start_at) INCLUDE(staff_id, status) |

**support.prisma**

| Bảng | Trường |
|---|---|
| `sla_policy` | ws, name, is_default (không xoá được), frt_human_min (10), ttr_human_min (240), business_hours_only, escalation jsonb, active |
| `ticket` | ws, code, contact_id, conversation_id?, title, description, category, priority(high\|medium\|low), status(open\|in_progress\|waiting\|closed), assignee_user_id?, assignee_agent_id?, sla_policy_id, sla_policy_name, frt_due_at, ttr_due_at, first_response_at?, paused_since?, paused_total_sec, sla_result(met\|breached)?, close_reason(resolved\|duplicate\|withdrawn\|out_of_scope)?, csat?, closed_at?, reopened_count. Index: idx(ws, status, ttr_due_at) INCLUDE(priority, assignee_user_id) |
| `ticket_comment` | ws, ticket_id, author_type, author_id, body, internal bool |

**marketing.prisma** — `segment(ws, name, filter jsonb /* AST điều kiện */, is_dynamic, last_count)`; `campaign(ws, code, name, kind(reactivation|upsell|conversion|aftercare|manual), channel(zalo|email), segment_id, content jsonb {text, variables, cta, attachments}, ab jsonb?, status(draft|pending_approval|approved|scheduled|running|paused|completed|rejected|cancelled), scheduled_at?, approved_by?, approved_at?, est_recipients, est_credits, stats jsonb, suggestion_id?)`; `campaign_recipient(ws, campaign_id, contact_id, status(pending|skipped|sent|failed|replied|converted), skip_reason?, message_id?, sent_at?)` với unique(campaign_id, contact_id); `campaign_suggestion(ws, kind, title, reason, segment_filter, est_count, best_time, channel, status(new|used|dismissed), generated_at)`.

**loyalty.prisma** — `loyalty_config(ws pk, enabled, earn_vnd_per_point (10000), redeem_vnd_per_point (100), tiers jsonb [{key:'member',min:0,mult:1},{key:'silver',min:5000,mult:1},{key:'gold',min:15000,mult:1.5},{key:'diamond',min:40000,mult:2}], expiry_months?)`; `loyalty_ledger(ws, contact_id, delta, balance_after, kind(earn|redeem|adjust|expire|reverse), reason, ref_type, ref_id, actor_type, actor_id, reversed_by_id?)` với idx(ws, contact_id, created_at desc).

**ai-*.prisma** — `ai_run`, `ai_run_step` → ai-runs (TIP-019) · `kb_*` → ai-kb (TIP-020) · `ai_agent`, `agent_template`, `approval_request`, `ai_governance` → ai-agents (TIP-021) · `assistant_*` → ai-assistant (TIP-023) · `ai_task` → ai-tasks (TIP-035)

| Bảng | Trường |
|---|---|
| `ai_agent` | ws, name, role(sales\|cs\|booking\|marketing\|accounting\|ops\|custom), avatar, persona, tone, system_prompt, model_tier(standard\|advanced\|max), tool_ids text[] (action ids), kb_source_ids uuid[], channel_account_ids uuid[], confidence_threshold (0.7), approval_rules jsonb, working_hours jsonb, status(draft\|active\|paused), template_key?, version |
| `agent_template` (platform) | key, role, industry_group?, industry?, name, description, defaults jsonb |
| `kb_source` | ws, agent_id?, kind(file\|url\|text\|catalog), name, file_id?, url?, status(pending\|processing\|ready\|failed), error?, chunk_count, refreshed_at |
| `kb_chunk` | ws, source_id, content, embedding vector(1536), token_count, meta jsonb. Index: `hnsw (embedding vector_cosine_ops)`; idx(ws, source_id) |
| `ai_run` | ws, kind(agent_reply\|assistant\|delegate\|consult\|task\|suggestion), parent_run_id?, root_run_id?, depth, state jsonb? (messages + pending tool call khi chờ duyệt), agent_id?, conversation_id?, assistant_session_id?, task_id?, initiated_by_user_id?, status(queued\|running\|waiting_approval\|completed\|failed\|cancelled\|handoff), plan jsonb?, input jsonb, output jsonb?, error?, confidence?, credits_used, started_at, finished_at. Index: idx(ws, status, started_at desc) |
| `ai_run_step` | ws, run_id, idx, type(llm\|tool\|delegate\|consult\|handoff\|ui_command), agent_id?, action_id?, input jsonb, output jsonb, status, provider?, model?, tokens_in, tokens_out, credits, latency_ms |
| `approval_request` | ws, run_id, step_id, action_id, input jsonb, preview jsonb, risk, reason, status(pending\|approved\|rejected\|edited\|expired), requested_at, decided_by?, decided_at?, decision_note?. partial idx(ws, requested_at desc) WHERE status='pending' |
| `assistant_session` | ws, user_id, title, mode(chat\|cowork), last_message_at, archived_at? |
| `assistant_message` | ws, session_id, role(user\|assistant\|tool), content jsonb (parts: text, card, ui_command, attachment), run_id? |
| `ai_task` | ws, name, goal, department, agent_id, trigger(manual\|schedule\|event), cron?, event_type?, data_scope jsonb, tool_ids text[], credit_limit_per_run, ask_before_send bool, model_tier, status(active\|paused), last_run_at, next_run_at |
| `ai_governance` | ws pk, banned_words text[], force_approval jsonb (quote_total_over 20000000, discount_over_pct, refund, bulk_send, contract), pii_filter bool, default_threshold |

**kernel.prisma** (hạ tầng chung — TIP-002)

| Bảng | Trường |
|---|---|
| `action_log` | ws, action_id, risk, source(ui\|assistant\|agent\|task\|system\|api), actor_type(user\|agent\|assistant\|system), actor_id, on_behalf_of_user_id?, run_id?, input jsonb, before jsonb?, after jsonb?, result jsonb?, status(succeeded\|failed\|undone), error?, undo_until?, undone_by?, undone_at?, created_at. Index: idx(ws, created_at desc) INCLUDE(action_id, actor_type, status); idx(ws, run_id). **Đây cũng là audit log.** |
| `outbox_event` | id, ws, topic, payload jsonb, status(pending\|published\|failed), attempts, available_at, created_at. idx(status, available_at) |
| `idempotency_key` | ws, key, route, request_hash, response jsonb, status_code, created_at. pk(ws, key); TTL 24h (job dọn) |
| `file` | ws, storage_key, name, mime, size, sha256, uploaded_by, purpose |
| `sequence_counter` | ws, kind, value | pk(ws, kind) |
| `notification` | ws, user_id, type, title, body, link, read_at?. idx(ws, user_id, read_at, created_at desc) |

### 2.3 Domain events (outbox → BullMQ queue `events`)

| Event | Payload | Consumer |
|---|---|---|
| `message.received` | ws, conversation_id, message_id, contact_id | ai (agent reply nếu auto), support (FRT), crm (last_interaction), notify |
| `message.sent` | … | support (first_response), marketing (stats) |
| `conversation.handoff` | reason, summary | notify Owner/assignee |
| `contact.created` / `contact.merged` / `contact.stage_changed` | | timeline, marketing segments, ai tasks |
| `quote.sent` / `quote.accepted` / `quote.rejected` | | crm stage → quote / won; timeline |
| `order.completed` / `order.cancelled` | total, contact_id | loyalty earn / reverse, crm stage won, total_spent |
| `invoice.paid` | | order.pay_status |
| `appointment.created` / `confirmed` / `completed` / `no_show` / `cancelled` | | reminders, timeline, ai tasks, loyalty (gói buổi) |
| `ticket.sla_warning` / `ticket.sla_breached` / `ticket.closed` | | notify, escalation, csat |
| `campaign.approved` / `campaign.completed` | | sender job, campaign stats |
| `ai.run.completed` / `approval.requested` / `approval.decided` | | WS push, notify, resume run |
| `credits.low` / `credits.exhausted` / `credits.restored` | | notify; inbox chuyển hội thoại auto về người / mở lại |
| `subscription.changed` / `trial.expired` | | quota, notify |

---

## 3. ACTION REGISTRY (lõi "Action-first")

### 3.1 Định nghĩa (`packages/actions`)

```ts
// packages/actions/src/define.ts
export type Risk = 'read' | 'write' | 'send' | 'money' | 'delete' | 'config';
export type Permission = 'member' | 'owner' | 'platform_admin';
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
  workspaceId: string; source: 'ui'|'assistant'|'agent'|'task'|'system'|'api';
  actor: { type: 'user'|'agent'|'assistant'|'system'; id: string };
  onBehalfOfUserId?: string;   // assistant / task luôn mang user gốc → quyền = quyền user đó
  runId?: string; stepId?: string; idempotencyKey?: string; confirmToken?: string;
}
interface ActionHandler<I, O> {
  execute(ctx: ActionContext, input: I, tx: TenantTx): Promise<O>;
  preview?(ctx: ActionContext, input: I, tx: TenantTx): Promise<ActionPreview>; // diff before/after, count
  undo?(ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void>;
}
// @ActionHandler('quote.send') — đăng ký qua decorator; boot fail nếu registry có id thiếu handler
```

**`ActionExecutor.execute(ctx, id, input)`**, các bước theo đúng thứ tự:

1. Tra registry. Không có action → `ACTION_NOT_FOUND`.
2. Zod parse input, lỗi → `422`.
3. Kiểm quyền theo membership role của `onBehalfOfUserId ?? actor`.
4. Áp **policy** (§3.3). Kết quả là chạy ngay, hoặc trả `PREVIEW_REQUIRED` (kèm preview + `confirm_token` lưu Redis 10 phút, gắn với hash của input), hoặc tạo `APPROVAL_REQUIRED` (insert `approval_request`).
5. Kiểm `Idempotency-Key`.
6. Mở tenant transaction, gọi `handler.execute`, ghi `action_log` (before/after), ghi `outbox_event`.
7. Trả `{ result, actionLogId, undoUntil?, uiTarget? }`.

### 3.3 Policy theo nguồn × rủi ro

| Nguồn \ Risk | read | write | send | money | delete | config |
|---|---|---|---|---|---|---|
| `ui` (người bấm) | chạy | chạy | chạy | chạy | chạy (UI tự hiện dialog xác nhận) | chạy (chỉ owner nếu permission=owner) |
| `assistant` | chạy | **preview → xác nhận** | preview → xác nhận | preview → xác nhận | preview → xác nhận | preview → xác nhận |
| `agent` (trực kênh) | chạy | chạy nếu được cấp và confidence ≥ ngưỡng, không thì approval | chỉ trả lời trong hội thoại đang phục vụ; gửi khác → approval | **approval** | **cấm** | **cấm** |
| `task` (Cowork) | chạy | chạy trong `data_scope` | approval nếu `ask_before_send` | approval | luôn approval | cấm |

- `bulk=true` luôn yêu cầu preview kèm số bản ghi, kể cả khi nguồn là `ui`.
- Luật **governance** luôn ép approval, không phụ thuộc bảng trên: báo giá > 20.000.000₫, giảm giá ngoài chính sách, hoàn tiền, gửi hàng loạt, hợp đồng.
- Từ cấm: chặn nội dung, đặt `handoff`.

### 3.4 Danh mục action (đầy đủ cho phát hành)

Cột "Agent" = `agentGrantable`. Cột "Undo" = có hoàn tác (thời hạn).

**identity / settings** (risk config, owner trừ khi ghi chú khác)
- `workspace.update`
- `business_profile.update`
- `member.invite` (send)
- `member.remove` (delete)
- `member.set_role`
- `invite.revoke`
- `profile.update` (member, write)
- `working_hours.update`
- `notification.mark_read` (member, write)

**channels**
- `channel.zalo.start_login`: trả QR qua WS.
- `channel.email.connect`
- `channel.update_settings`
- `channel.reconnect`
- `channel.disconnect` (owner)
- `webchat.update_widget`

**inbox** (member)

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
| `message.recall` | send | | |
| `note.add` | write | | 24h |
| `canned_reply.create` / `canned_reply.update` / `canned_reply.delete` | config | | |
| `tag.create` / `tag.update` / `tag.delete` | config | | |

**crm** (member)

| Action | Risk | Agent | Undo |
|---|---|---|---|
| `contact.search` | read | ✓ | |
| `contact.get_360` | read | ✓ | |
| `contact.create` | write | ✓ | 24h |
| `contact.update` | write | ✓ | 24h |
| `contact.set_stage` | write | ✓ | 24h |
| `contact.tag` | write | ✓ | 24h |
| `contact.add_note` | write | ✓ | 24h |
| `contact.remember` | write | ✓ | |
| `contact.bulk_update` | write, bulk | | 24h |
| `contact.merge` | write | | 7d |
| `contact.delete` | delete | | 30d, xoá mềm |
| `contact.import` | write, bulk | | 24h, theo lô |
| `contact.export` | read | | luôn preview |
| `contact.forget` | delete, owner | | không hoàn tác: ẩn danh hoá |
| `custom_field.define` / `custom_field.update` / `custom_field.delete` | config | | |

**catalog**

| Action | Risk | Agent | Undo |
|---|---|---|---|
| `product.search` | read | ✓ | |
| `product.get` | read | ✓ | |
| `product.create` | write | | 24h |
| `product.update` | write | | 24h |
| `product.archive` | delete | | 30d |
| `product.import` | write, bulk | | |
| `category.create` / `category.update` / `category.delete` | config | | |

**sales**

| Action | Risk | Agent | Undo |
|---|---|---|---|
| `quote.create` | write | ✓ | 24h, khi chưa gửi |
| `quote.update` | write, chỉ ở draft | ✓ | |
| `quote.send` | send | ✓ khi đúng policy | |
| `quote.revise` | write, tạo version n+1 | ✓ | |
| `quote.mark_accepted` | write | ✓ | 24h |
| `quote.mark_rejected` | write | ✓ | 24h |
| `quote.approve` | money, owner | | |
| `order.create` | write | ✓ | 24h, khi ở new |
| `order.confirm` | write | ✓ | 24h |
| `order.update_status` | write | | 24h |
| `order.complete` | money | | 24h, đảo cả điểm |
| `order.cancel` | money | | |
| `invoice.create` | write | | 24h |
| `invoice.send_payment_qr` | send | ✓ | |
| `invoice.mark_paid` | money | | 24h |
| `invoice.void` | money | | |
| `payment_account.update` | config, owner | | |

**booking**

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

**support**

| Action | Risk | Agent | Undo |
|---|---|---|---|
| `ticket.search` | read | ✓ | |
| `ticket.create` | write | ✓ | 24h |
| `ticket.update` | write | | 24h |
| `ticket.assign` | write | ✓ | 24h |
| `ticket.set_status` | write | ✓ | 24h |
| `ticket.comment` | write | ✓ | 24h |
| `ticket.close` | write, lý do bắt buộc | ✓ | 24h |
| `ticket.reopen` | write | | |
| `ticket.bulk_update` | write, bulk | | 24h |
| `sla.update_default` | config | | |

**marketing**

| Action | Risk | Agent | Undo |
|---|---|---|---|
| `segment.preview` | read | | |
| `segment.create` / `segment.update` / `segment.delete` | write | | |
| `campaign.suggest` | read, AI | | |
| `campaign.create` | write | | 24h |
| `campaign.update` | write, chỉ draft | | |
| `campaign.submit` | write | | 24h |
| `campaign.send_test` | send | | |
| `campaign.approve` | send, bulk, owner, **luôn xác nhận** | | |
| `campaign.reject` | write | | |
| `campaign.pause` | write | | |
| `campaign.resume` | write | | |
| `campaign.cancel` | write | | |
| `campaign.delete` | delete | | |

**loyalty**
- `loyalty.get_member`: read, agent ✓.
- `loyalty.update_config`: config.
- `loyalty.adjust_points`: money; bắt buộc 1 trong 7 lý do; undo 24h.
- `loyalty.redeem`: money; đổi điểm khi tạo đơn hoặc hoá đơn; undo 24h.

**ai**

| Action | Risk | Agent | Undo |
|---|---|---|---|
| `agent.create` | config | | |
| `agent.update` | config | | 24h |
| `agent.publish` | config | | |
| `agent.pause` | config | | |
| `agent.delete` | delete | | 30d |
| `agent.test` | read | | |
| `kb.search` | read | ✓ | |
| `kb.add_source` | write | | |
| `kb.remove_source` | delete | | |
| `kb.refresh_source` | write | | |
| `approval.approve` / `approval.reject` / `approval.edit_and_approve` | owner | | |
| `run.cancel` | write | | |
| `ai_task.create` / `ai_task.update` / `ai_task.pause` / `ai_task.delete` | config | | |
| `ai_task.run_now` | write | | |
| `governance.update` | config, owner | | |

**billing** (owner)
- `billing.create_invoice`: money; mua gói hoặc credit, sinh QR.
- `billing.cancel_invoice`
- `billing.report_transfer`: write; "Tôi đã chuyển khoản" → `pending_review`.
- `billing.set_auto_topup`: config.

**insights**
- `insight.query`: read, agent ✓. Chỉ chạy metric đã định nghĩa sẵn trong `insights/metrics/*` (doanh số theo kỳ, khách sắp rời, hiệu suất agent…), không chạy SQL tự do. Dùng cho Tổng quan và cho Trợ lý AI trả lời số liệu (REQ-E07).

**platform** (platform_admin)
- `admin.plan.upsert`
- `admin.model_price.upsert`
- `admin.model_route.upsert`
- `admin.invoice.confirm_transfer`: money.
- `admin.workspace.suspend` / `admin.workspace.resume`
- `admin.agent_template.upsert`

> Thêm tính năng sau này = thêm action vào danh mục này (REQ-N13). Không có thao tác ghi nào nằm ngoài Registry.

---

## 4. API CONTRACTS

### 4.1 Quy ước

- Base: `/v1`.
- Header bắt buộc: `Authorization: Bearer <access JWT 15m>` và `X-Workspace-Id: <uuid>` (trừ `/v1/auth/*`, `/v1/me`, `/hooks/*`).
- Thành công: `200 { data, meta? }`.
- List: `{ data: T[], next_cursor: string | null }`. Cursor là base64 của `(sortKey, id)`; tham số `?limit=` (≤ 100, mặc định 30) và `?cursor=`.
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
| crm | `GET /v1/contacts?stage=&group=&tag_id=&owner_id=&q=&sort=` · `GET /v1/contacts/:id` (360) · `GET /v1/contacts/:id/timeline?cursor=` · `GET /v1/contacts/duplicates` · `GET /v1/custom-fields?entity=` |
| catalog | `GET /v1/products?type=&category_id=&status=&q=` · `GET /v1/products/:id` · `GET /v1/categories` |
| sales | `GET /v1/quotes?status=&contact_id=` · `GET /v1/quotes/:id` (gồm các version) · `GET /v1/quotes/:id/pdf` · `GET /v1/orders?…` · `GET /v1/orders/:id` · `GET /v1/invoices?…` · `GET /v1/invoices/:id` · `GET /v1/invoices/:id/qr` |
| booking | `GET /v1/appointments?from=&to=&staff_id=&status=` · `GET /v1/appointments/:id` · `GET /v1/staff` · `GET /v1/booking/slots?service_id=&date=&staff_id=` |
| support | `GET /v1/tickets?status=&priority=&assignee=&sla=` · `GET /v1/tickets/:id` · `GET /v1/tickets/counts` · `GET /v1/sla-policies` |
| marketing | `GET /v1/segments` · `POST /v1/segments/preview` (đọc) · `GET /v1/campaigns?status=` · `GET /v1/campaigns/:id` (+stats) · `GET /v1/campaign-suggestions` |
| loyalty | `GET /v1/loyalty/config` · `GET /v1/loyalty/members?tier=&q=` · `GET /v1/loyalty/members/:contactId/ledger` |
| ai | `GET /v1/agents` · `GET /v1/agents/:id` · `GET /v1/agents/:id/stats?from=&to=` · `GET /v1/agent-templates?role=&industry=` · `GET /v1/kb/sources?agent_id=` · `GET /v1/runs?status=&agent_id=&conversation_id=` · `GET /v1/runs/:id` (+steps) · `GET /v1/approvals?status=pending` · `GET /v1/ai-tasks` · `GET /v1/governance` |
| assistant | `GET /v1/assistant/sessions?q=` · `GET /v1/assistant/sessions/:id/messages` |
| channels | `GET /v1/channels` · `GET /v1/channels/:id` (health) · `GET /v1/webchat/widget` |
| billing | `GET /v1/billing/summary` (gói, hạn, credit, giới hạn) · `GET /v1/billing/plans` · `GET /v1/billing/ledger?cursor=` · `GET /v1/billing/invoices` · `GET /v1/billing/invoices/:id` (QR, trạng thái) |
| dashboard / insights | `GET /v1/dashboard` (việc cần tôi, AI hôm nay, follow-up, onboarding, credit) · `GET /v1/insights/:metric?from=&to=` (metric đọc sẵn) |
| misc | `POST /v1/files` (multipart, trả `file_id`, giới hạn 25MB) · `GET /v1/files/:id` (signed URL) · `GET /v1/notifications?unread=` · `GET /v1/settings/:section` |
| admin | `GET /v1/admin/workspaces` · `GET /v1/admin/plans` · `GET /v1/admin/model-prices` · `GET /v1/admin/transfers?status=pending_review` |

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

- `POST /hooks/payments/:provider`: kiểm chữ ký/API key của provider, insert `bank_transaction` idempotent, khớp `transfer_code` → `invoice.paid`. Luôn trả 200 nhanh; phần khớp chạy bất đồng bộ.
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
export interface ToolSpec { name: string; description: string; inputSchema: JSONSchema;
  execute(input: unknown, meta: { stepId: string }): Promise<ToolOutcome>; }
export type ToolOutcome =
  | { kind: 'ok'; output: unknown }
  | { kind: 'needs_confirmation'; preview: ActionPreview; confirmToken: string }   // dừng run, chờ người
  | { kind: 'needs_approval'; approvalId: string }                                 // dừng run, chờ Owner
  | { kind: 'error'; code: string; message: string };
export type RunEvent = { type: 'delta'|'tool_call'|'tool_result'|'paused'|'usage'|'finish'|'error'; … };
```

- **Engine mặc định:** `AiSdkEngine` (Vercel AI SDK v7, `ToolLoopAgent`/`streamText`). Tool `execute` gọi `ActionExecutor`.
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
| `delegate(agent_id\|role, task, context)` | Trợ lý AI | Tạo `ai_run` con (`kind=delegate`, `parent_run_id`), chạy agent đích với bộ tool của agent đó, trả tóm tắt kết quả. Run con cần duyệt thì cả run cha chờ theo |
| `transfer_to_agent(role, reason, summary)` | Agent trực kênh | Đổi `conversation.assignee_agent_id`, ghi `ai_run_step(type=handoff)`, agent mới nhận summary và tiếp tục ngay trong lượt đó. Có thể trả lại agent cũ |
| `consult(role, question)` | Agent trực kênh, agent con | Chạy agent đích ở chế độ **chỉ đọc** (chỉ được dùng action có risk `read`), trả lời ngắn, không gửi gì cho khách |

- **Rào chắn phối hợp:**
  - Độ sâu `delegate`/`consult` tối đa 2 cấp.
  - Tối đa 3 lần `transfer_to_agent` mỗi lượt khách; A → B → A trong cùng một lượt thì handoff sang người.
  - Ngân sách credit chung cho cả cây run (run con trừ vào budget của run gốc).
  - Mọi bước đều ghi vào `ai_run_step` và phát `run.step` qua WS để Owner xem trực tiếp và bấm dừng (`run.cancel` huỷ cả cây).
- **Không làm swarm:** không có kênh để agent tự nhắn agent khác ngoài 3 tool trên; mỗi lần phối hợp đều có một run cha làm đầu mối.
- **Usage:** mỗi bước LLM phát event `usage` → `CreditMeter.charge(ws, provider, model, in, out, runId)`. Hàm này ghi ledger và trừ ví trong cùng transaction. Trước mỗi bước kiểm `balance > 0`; ví hết thì phát `CREDIT_EXHAUSTED`.
- **LLM Router:**
  - Đọc `model_route` theo tier/purpose. Lỗi 5xx, 429 hoặc timeout 30s thì chuyển sang provider kế tiếp.
  - API key của provider đặt trong env. Chỉ bật provider có key.
  - Embedding dùng 1536 chiều, provider cấu hình trong `model_route` purpose=embed.

### 5.2 Trợ lý AI (Orchestrator + Copilot)

Danh mục action quá lớn để nhồi hết vào prompt, nên Trợ lý chỉ nhận **meta-tools**:

| Meta-tool | Việc |
|---|---|
| `find_actions(query, module?)` | Tìm action phù hợp (lọc theo quyền user) → trả id + mô tả + input schema rút gọn. Index tìm bằng embedding của description, có cache |
| `call_action(action_id, input)` | Gọi `ActionExecutor` với `source='assistant'`, `onBehalfOfUserId=user` → read chạy ngay; còn lại trả `needs_confirmation` |
| `delegate(agent_id \| role, task, context)` | Tạo `ai_run` con (kind=delegate) chạy agent chuyên trách với tool set của agent; trả tóm tắt kết quả; hiển thị trong plan |
| `ui(command: UiCommand)` | Phát `ui.command` tới user (điều hướng, mở drawer, điền form, lọc, highlight) |
| `query_data(metric, params)` | = `insight.query` (metric định nghĩa sẵn, chỉ đọc); trả bảng/biểu đồ nhỏ ngay trong thẻ trả lời |
| `plan(steps[])` / `update_step(id, status)` | Cập nhật thẻ kế hoạch |

- **System prompt** gồm: vai trò, quyền của user, màn hiện tại và bản ghi đang xem (từ `context`), danh sách agent đang có, quy tắc xác nhận và hoàn tác. Viết bằng tiếng Việt, trả lời tiếng Việt.
- **Chế độ Chat:** chỉ cho dùng `find_actions` với read và `query_data`. **Chế độ Cowork:** mở toàn bộ meta-tools.

### 5.3 Agent trực kênh

Khi có `message.received` mà `ai_mode=auto` và có `assignee_agent_id` (hoặc agent mặc định của kênh), chạy pipeline sau:

1. **Debounce 3 giây** (gom tin liên tiếp). Job id = `agent-reply:{conversationId}`, nên không chạy song song trên cùng một hội thoại.
2. **Lắp ngữ cảnh:** 20 tin gần nhất, `contact.get_360` rút gọn, `contact_memory`, top-6 chunk từ `kb.search`, giờ mở cửa, chính sách của agent.
3. **Tools** = `tool_ids` của agent, cộng thêm `reply(text, attachments?)` (chính là `message.send` vào hội thoại hiện tại), `handoff(reason, summary)` (chuyển sang người), `transfer_to_agent(role, reason, summary)` và `consult(role, question)` (xem §5.1).
4. **Output bắt buộc có cấu trúc** `{ reply?, confidence 0–1, intent, sentiment, needs_human?: reason }`.
   - Nếu `confidence < threshold`, hoặc khách đòi gặp người, hoặc cùng câu hỏi lặp 3 lần, hoặc sentiment tiêu cực / khiếu nại, hoặc chạm từ cấm → **handoff**: không gửi reply, lưu bản nháp, đặt `ai_state=handoff`, thông báo.
5. **Copilot mode:** cùng pipeline nhưng chỉ sinh gợi ý (không gửi), đẩy về UI.
6. **Lọc PII trước khi gửi LLM:** regex CCCD/CMND, số thẻ, số tài khoản → thay bằng token. Khi gửi ra ngoài thì khôi phục lại.

### 5.4 Tác vụ tự chủ & chủ động

- Lưu trong `ai_task` và chạy bằng BullMQ repeatable (cron) hoặc consumer theo event.
- **Mẫu dựng sẵn:**
  - Follow-up khách im lặng N ngày.
  - Hỏi lại báo giá treo quá 3 ngày.
  - Nhắc hẹn (24h / 2h).
  - Chăm sóc sau mua (D+3).
  - Briefing sáng 08:00 cho Owner (gửi vào Trợ lý và thông báo).
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

- **Account lease:** mỗi `channel_account` chỉ do **một** worker giữ phiên. Dùng Redis lock `lease:channel:{id}`, TTL 30 giây, heartbeat 10 giây. Worker khởi động sẽ nhận các account `connected` chưa có lease.
- **Zalo cá nhân** (zca-js; thiết kế theo OpenClaw `zalouser`, MIT):
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
    ├── TopBar  { onSearch; workspace: WorkspaceSummary }           # tìm kiếm ⌘/, thông báo, trợ giúp, trial badge, WorkspaceSwitcher
    ├── <main>{children}</main>
    ├── AssistantDock { context: AssistantContext }                 # Ctrl+K; panel phải 420px (< md: toàn màn); dùng chung AssistantThread
    ├── ConfirmActionHost                                           # nhận preview từ useAction / assistant
    └── Toaster · RealtimeProvider · UiCommandHost
```

Primitive dùng chung (`packages/ui` + `shared`), kèm props chính:

```ts
DataTable<T>   { columns: TableColumnsType<T>; query: UseInfiniteQueryResult<Page<T>>; selection?: Key[];   // bọc antd Table (virtual)
                 onRowClick?(row: T): void; bulkActions?: BulkAction[]; aiColumn?: (row: T) => AiSuggestion | null;
                 mobileCard?: (row: T) => ReactNode /* < md: render danh sách thẻ */ }
KanbanBoard<T> { columns: { key: string; label: string; color: string }[]; items: T[]; groupBy(item: T): string;
                 onMove(item: T, to: string): void /* gọi action */; renderCard(item: T): ReactNode }
FilterBar      { fields: FilterField[]; value: FilterState; onChange(v: FilterState): void; savedViews?: SavedView[] }
EntityDrawer   { entity: EntityKind; id: string; tabs: DrawerTab[]; onClose(): void }   // antd Drawer; < md: placement="bottom", full height
PageHeader     { title: string; actions?: ReactNode; kpis?: KpiItem[] }
PageStates     { state: 'empty'|'loading'|'error'|'ready'; empty?: EmptySpec; onRetry?(): void; children }
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
    │   ├── ChatHeader (assign, tag, AiModeToggle, status, "Chuyển thành ▾")
    │   ├── MessageThread (virtual, load-more) · AiSuggestionBar (copilot) · HandoffBanner
    │   └── Composer (text, emoji, attach, canned "/", note mode, AI rewrite/translate)
    └── ContextPanel → Customer360Panel { contactId }   # tóm tắt AI, info, đơn/báo giá/lịch/ticket, ghi chú, hạng

customers/                CustomersPage → PageHeader + StageTabs + FilterBar + (DataTable | KanbanBoard) → Customer360Drawer
customers/[id]            Customer360Page tabs: Tổng quan · CRM · AI · Tệp · Lịch sử
products/ quotes/ orders/ invoices/   cùng mẫu ListPage + EntityDrawer; QuoteEditor { quoteId? } (line items, chiết khấu, tổng, preview PDF)
appointments/             CalendarPage → ViewSwitch(day|week|month|list) · StaffLanes · AppointmentBlock · AppointmentDrawer · SlotPicker
tickets/                  TicketsPage → KpiStrip(5) · FilterBar · (DataTable | Kanban 4 cột) · TicketDrawer (timeline, comment, SLA clock)
marketing/                MarketingPage → SuggestionTable(7 cột) · CampaignList · CampaignWizard(steps: đối tượng → nội dung → kênh & lịch → duyệt) · CampaignDetail(stats)
loyalty/                  LoyaltyPage → Overview · MemberTable · AdjustPointsDialog(3 bước) · ConfigDialog
agents/                   AgentsPage (list + stats) · TemplateGallery(lọc Nhóm ngành → Ngành) · AgentBuilder{ agentId } (trái: cấu hình/prompt/tools/tri thức/kênh/ngưỡng · phải: TestChat) · ApprovalsQueue · AgentActivity(action log)
dashboard/                DashboardPage → GreetingBar(hỏi Trợ lý) · NeedsMe · AiTodayFeed · FollowUpWidget · OnboardingChecklist · CreditCard
settings/[section]        SettingsShell (nav nhóm, ô tìm kiếm) → SettingsSection registry: general · members · profile · channels · webchat · fields · tags · replies · hours · ai-models · ai-governance · ai-log · billing · notifications
(admin)/admin/[section]   workspaces · plans · model-prices · transfers · templates
(onboarding)/declare      DeclareBusinessModal (không đóng được; 2 bước) · welcome → TrialWelcome (2 nút)
```

### 7.3 Client state

- **Server state:** TanStack Query. Key theo dạng `[module, entity, params]`. Realtime event chỉ invalidate hoặc patch cache, không lưu state song song.
- **UI state:** Zustand, chỉ gồm `assistantDock` (mở/đóng, context), `inboxUi` (folder, mật độ hiển thị) và `shell` (thu gọn).
- **Form:** antd `Form` + rule sinh từ zod schema của `packages/actions` (helper `zodRule(schema)`), để cùng validate với server.
- **UI Command Bus:** mỗi page đăng ký handler bằng `useUiCommand('prefill', 'quote.form', handler)`. Lệnh không có handler thì chuyển thành `navigate` tới route mặc định của entity.

---

## 8. INTEGRATION POINTS

| Tích hợp | Cách làm | Trạng thái |
|---|---|---|
| LLM: Anthropic, OpenAI, Google, DeepSeek | AI SDK providers; key trong env; route trong DB | Cần key (OQ-06) |
| Zalo cá nhân | zca-js (pin version), adapter riêng | Spike trong TIP-014 |
| Email gửi hệ thống (OTP, thông báo) | SMTP qua nodemailer, interface `Mailer` | Cần SMTP (OQ-07) |
| Tra cứu MST | interface `TaxLookupProvider`; bản `mock` + bản thật (ứng viên cần kiểm chứng: API VietQR business lookup) | OQ-05 |
| VietQR (AppChat thu tiền và DN thu tiền khách) | Tự sinh payload EMVCo/NAPAS (BIN + STK + số tiền + nội dung), render QR bằng `qrcode` | Tự làm |
| Webhook ngân hàng | interface `BankFeedProvider`; adapter ứng viên SePay / Casso; bản `mock` cho dev | OQ-04 |
| Object storage | interface `Storage`: `local` (dev, thư mục `./.data/files`) và `s3` (prod, S3-compatible) | |
| PDF báo giá/hoá đơn | `@react-pdf/renderer` chạy trong worker; font Plus Jakarta Sans nhúng sẵn | |
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
| i18n | Không hard-code chuỗi UI; `vi` mặc định, có `en`; tiền `1.250.000₫`, ngày `dd/MM/yyyy` |
| Test | unit (core services + policy), integration (Postgres thật DB `appchat_test`, Redis thật), RLS isolation, e2e Playwright, AI eval (fixture replay + live gated `AI_EVAL_LIVE=1`) |
| Vận hành | PM2 ecosystem; log JSON (pino); `/healthz` (process sống), `/readyz` (DB, Redis); backup `pg_dump` hằng ngày + WAL archive (RPO ≤ 5 phút khi bật) |

---

## 10. RỦI RO KỸ THUẬT CẦN XỬ LÝ SỚM

| # | Rủi ro | Xử lý |
|---|---|---|
| K1 | **pgvector trên Windows chạy native** khó cài (cần build hoặc binary đúng phiên bản PG16) | TIP-002 kiểm `CREATE EXTENSION vector`. Nếu không cài được: dev tạm dùng `kb_chunk.embedding` kiểu `real[]` + tìm tuyến tính (chỉ cho dev). Prod chạy Linux có pgvector. Escalate nếu cả hai đều không được |
| K2 | zca-js không chính thức, có thể bị Zalo đổi giao thức hoặc khoá tài khoản | Adapter cô lập; pin version; health probe; cảnh báo Owner; thiết kế sẵn chỗ cho Zalo OA (P2) |
| K3 | Prisma + RLS: mỗi request một transaction | `db.tenant()` dùng batch `$transaction([set_config, query])` cho đọc đơn giản; interactive transaction cho action. Đo p95 ở TIP-002 |
| K4 | Tên trường `usage` của AI SDK v7 khi stream nhiều bước chưa kiểm | Spike nửa ngày ở đầu TIP AI: kiểm `usage` + chạy tiếp sau restart worker; viết test hợp đồng cho `CreditMeter` |
| K5 | Prisma multi-file schema và tên cờ preview đổi theo phiên bản | TIP-001 chốt phiên bản Prisma/Next/Nest ổn định mới nhất, ghi lại vào `product/tech-stack.md` |
