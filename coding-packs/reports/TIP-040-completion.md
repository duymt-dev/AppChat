### COMPLETION REPORT — TIP-040 Quản trị nền tảng (DONE)

> TIP XL, làm theo 6 pha trên một nhánh `tip/040-platform-admin` (một PR, xếp chồng trên #100):
> - **pha 1** ngữ cảnh nền tảng trong ActionExecutor (DC-368);
> - **pha 2** cấu hình có phiên bản: gói / đơn giá / định tuyến / mẫu agent (DC-370);
> - **pha 2b** provider LLM: bí mật chỉ ghi, kiểm URL, probe (DC-371);
> - **pha 3** đối soát chuyển khoản nền tảng (DC-372);
> - **pha 4** tạm dừng / mở lại workspace chặn thật (DC-373);
> - **pha 5** màn `/admin` (PD-022) + script cấp quyền + cổng chốt.

**STATUS:** DONE.
- Đạt: AC01–AC09.
- AC10 đạt một phần với provider thật — chi tiết ở mục AC10 bên dưới.

**COMMIT:** `41c48d6a` · `b8750d28` · `a05230f2` · `d05dc3b7` · `3a94320b` (pha 1–4) và commit pha 5 (SHA ở bảng tiến độ `goals/GOAL-RELEASE.md`, dòng 19).

**MIGRATION** — chỉ DB nền tảng, không có migration tenant:
- `20261107004000_admin_versions` — `version` / `status_version` + bảng `admin_operation`;
- `20261107014000_admin_config` — `platform_config_revision` + cột version cho giá / route / mẫu;
- `20261107024000_provider_secrets` — `headers_enc`;
- `20261107034000_admin_reconcile` — 4 index đối soát + `workspace_status_created_idx`.

Sau khi merge: chạy `pnpm --filter @appchat/db db:migrate-tenants` (lệnh này áp cả migration platform còn thiếu), rồi build lại api + worker.

**Cấp quyền admin nền tảng:**
- Lệnh: `pnpm --filter @appchat/db db:grant-platform-admin <email> [--revoke]`.
- Chỉ chạy được từ shell vận hành; mỗi lần chạy ghi một dòng `platform_audit_log` (`ops.platform_admin.grant|revoke`).
- Không có action, UI hay API nào tự cấp quyền.
- Cần cấp cho tài khoản vận hành đầu tiên sau khi deploy.

**Host nội bộ cho provider:** env `LLM_PRIVATE_HOSTS` (host[:port]) cho phép provider trỏ tới host nội bộ, ví dụ 9router trên cùng VPS. Mặc định không mở host nội bộ nào.

---

#### Thay đổi chính

| Pha | Việc |
|---|---|
| 1 | `platformContext` (marker server-only) · `PlatformActionHandler` (`prepare` ngoài tx / `executePlatform` / `previewPlatform`) · `executePlatformAction`: zod → `platform_admin` sống → biên nhận `admin_operation` → audit `platform_audit_log` (target workspace từ input / entity) → afterCommit. HTTP `/v1/actions/:id` chọn nhánh theo quyền registry; trợ lý / GenUI / agent gọi `admin.*` → 403. `GET /v1/admin/session`. |
| 2 | `admin.plan.upsert`, `model_price.upsert`, `model_route.upsert` (thay cả nhóm, CAS `route:<tier>:<purpose>`), `agent_template.upsert` (tool phải `agentGrantable`). CAS `if_version` (409 `stale` / `required`). `platform_config_revision` tăng cùng tx → `RevisionWatch` (≤ 2 s) cho ProviderStore / DbPriceBook. Seed không ghi đè cấu hình admin. |
| 2b | `admin.llm_provider.upsert / probe / disable`: key + header mã hoá, đọc chỉ thấy `has_api_key` + tên header; đổi host phải nhập lại key; `vetProviderUrl` (SSRF 045b + allowlist env); `probeProvider` (packages/ai) mỗi khả năng một lời gọi `streamText`, lỗi chỉ mã sạch. |
| 3 | `admin.bank_transaction.match` (khoá bank_tx → invoice, đúng số tiền, thiếu / thừa → 422, một giao dịch một hoá đơn); `confirm_transfer` cần `note` + `evidence`; `GET /admin/transfers · bank-transactions · sales-inquiries` con trỏ + deferred join. |
| 4 | `admin.workspace.suspend / resume` (CAS `status_version`, active ↔ suspended; resume kiểm DB tenant `SELECT 1`). `registry.generation()` scope `workspace_status` → `TenantDbResolver.refreshGeneration` xoá cache; `WorkspaceAccess` chặn bước AI mới (`assertOpen`) và gửi tin (`suspendHold` hoãn 10 phút); API workspace → 423. |
| 5 | Route `(admin)/admin` riêng (không AppShell / workspace picker), `AdminGuard` (`/admin/session` 401 → đăng nhập, 403 → không có quyền), 7 tab deep-link `?tab=`, mọi ghi qua `useAction('admin.*')`, phân trang con trỏ, form CAS, probe hiện kết quả từng khả năng; mock domain; i18n `platformAdmin` vi + en; script `db:grant-platform-admin`. Sửa phát hiện ở cổng: `AdminWorkspaceResumeHandler` cần `DB_ENV` tuỳ chọn (app dựng không có DB vẫn khởi động); probe chuyển sang `streamText` (9router trả SSE cả khi không xin stream); router bỏ provider có lần probe gần nhất hỏng chat (agent-gateway §12 — chưa probe vẫn route). |

Ngoài manifest / đổi tên: DV-037. Prototype: PD-022 (không có màn — không tuyên bố pixel).

---

#### Acceptance criteria

| AC | Kết quả | Bằng chứng |
|---|---|---|
| AC01 platform context | ĐẠT | `platform-admin.test.ts`: admin không membership / workspace suspended vẫn chạy; Owner / role tuỳ chỉnh / header giả / trợ lý → 403; thu quyền giữa preview và confirm → 403 |
| AC02 atomicity | ĐẠT | `platform-admin.test.ts`: gửi lại cùng khoá → cùng kết quả, 1 audit; khác input cùng khoá → 409; không ghi action_log tenant lạ |
| AC03 config | ĐẠT | `platform-config.test.ts`: 2 admin cùng version → 1 thắng, 409 stale; tier / tool / route không giá bị chặn; seed khởi động lại không đè |
| AC04 secret / probe | ĐẠT | `platform-providers.test.ts`: canary key / header không có trong đọc / preview / audit / biên nhận / lỗi probe; SSRF + đổi host; chat ok ≠ embed; timeout; `probe.test.ts` |
| AC05 distributed config | ĐẠT | `platform-providers.test.ts` / `platform-config.test.ts`: tiến trình thứ hai ngừng dùng provider tắt ≤ 2 s; giá lịch sử giữ ảnh chụp |
| AC06 transfers | ĐẠT | `platform-reconcile.test.ts`: một giao dịch → một hoá đơn, thiếu / thừa 422, 2 admin đồng thời, fulfil 039 một lần, audit actor / lý do |
| AC07 workspace | ĐẠT | `platform-workspaces.test.ts` (423 ngay, tiến trình khác ≤ 2 s, resume chỉ từ suspended), `workspace-suspend-gates.test.ts` (AI / gửi), `resolver-generation.test.ts` |
| AC08 template / plans | ĐẠT | `platform-config.test.ts`: tắt gói không đổi subscription / hoá đơn đã trả; mẫu không cấp tool cấm, agent đã clone không đổi |
| AC09 UI / perf | ĐẠT | E2E http `e2e/http/platform-admin.spec.ts` (owner → không có quyền; admin tạm dừng → 423 → mở lại; tab deep-link; mobile 390 không cuộn ngang) · E2E mock `e2e/platform-admin.spec.ts` · unit `AdminGuard` / `WorkspaceTable` / `ProviderForm` + `platform-admin-shape.test.ts` · EXPLAIN index ở `platform-workspaces` / `platform-reconcile` |
| AC10 live provider | ĐẠT một phần | Xem chi tiết dưới bảng |

**AC10 — probe với provider thật** (`probeProvider` chạy tay ngày 2026-11-07, chỉ in kết quả đã làm sạch):

| Provider | Khả năng | Kết quả |
|---|---|---|
| 9router (chat) | chat | ok |
| 9router (chat) | tools | ok |
| 9router (chat) | streaming | ok |
| 9router (chat) | json_schema | `bad_response` — model không trả object đúng schema qua 9router, ghi đúng sự thật |
| 9router (chat) | embeddings | `unsupported` — không suy từ chat |
| OpenAI (embed) | embeddings | ok |

- Không có fallback mock nào trong lượt chạy này.
- **Chưa nghiệm thu với provider thật:** luồng ghi `usage` của probe qua UI `/admin` (lượt chạy dùng hàm probe trực tiếp, không qua DB demo), và probe ở production.

---

#### Cổng test (D59 — phạm vi TIP)

| Cổng | Kết quả |
|---|---|
| `db:test-reset` | xong (drop 9 DB test, 19 migration platform) |
| lint + typecheck (shared, actions, db, ai, core, api, worker, web) | 16/16 xanh (web 13 cảnh báo có sẵn, không ở file admin) |
| unit | shared 142 · actions 12 · db 23 · ai 57 · core 651 · web 354 · api 11 · worker 7 |
| integration api (platform-admin / config / providers / reconcile / workspaces, billing-payments, confirm_transfer, authz, ai-runtime, agent-reply) | 11 file / 67 test |
| integration worker | 6 file / 15 test |
| depcheck | 0 lỗi (78 cảnh báo `no-circular-web` theo mẫu mock domain sẵn có) |
| build api + worker + web · `check:bundle` | xanh — api 34 / worker 30 gói đều khai báo |
| E2E http `platform-admin` | 2 passed (desktop + mobile-390) |
| E2E mock `platform-admin` | 2 passed |
| `pnpm parity --done` (sửa lớp dùng chung: mock store / routes / handlers, `i18n/messages.ts`) | 102 PASS; màn trong sổ nợ ≤ trần (DC-360); 0 FAIL |
| lint:size · lint:tokens · i18n | không file vượt trần · đúng thang D41 · vi / en 5992 key 100% |

Log: `.data/gate/040-*.log`.

---

### Đối chiếu standards

| Standard | Áp dụng ở TIP-040 | Bằng chứng |
|---|---|---|
| actions/action-registry | 12 action `admin.*` (platform_admin, db platform, `agentGrantable: false`, risk config, money cho confirm / match), ví dụ trong mô tả; FE ghi chỉ bằng `useAction` | `examples.test.ts`, `cross-db-handlers.test.ts` (platform_only), `assistant-coverage.test.ts` |
| api/response-envelope | `{ data }` / `{ data, next_cursor }`; lỗi `{ error: { code, fields } }` (409 `stale`, 422, 423, 501); tiền string VND | integration platform-* (parse schema), `platform-admin-shape.test.ts` |
| authz/rbac-permissions | admin ≠ Owner; `platform_admin` kiểm sống mỗi lời gọi; không tự cấp qua UI / API (chỉ script shell) | `platform-admin.test.ts`, E2E http 403 |
| database/indexing | `workspace(status, created_at, id)`, `invoice` partial pending INCLUDE, bank_tx chưa khớp partial INCLUDE amount; keyset + deferred join; EXPLAIN | `platform-workspaces.test.ts`, `platform-reconcile.test.ts` |
| database/tenant-db | admin không mở DB tenant khi liệt kê; resume kiểm DB bằng kết nối riêng; cache resolver xoá theo generation | `resolver-generation.test.ts`, `platform-workspaces.test.ts` |
| events/outbox | revision cấu hình + trạng thái workspace ghi cùng transaction; afterCommit chỉ invalidate cache cục bộ | `platform-config.test.ts`, `platform-workspaces.test.ts` |
| domain/concurrency | CAS `if_version` mọi cấu hình, `status_version` workspace; khoá bank_tx → invoice | test 2 admin song song (config, reconcile) |
| domain/money-time-numbering | giá / Credit decimal có giới hạn; khớp đúng số tiền, không tự chia / bù | `platform-reconcile.test.ts` |
| integrations/provider-ports + ai/agent-gateway | probe trong packages/ai, cùng đường `streamText` với engine; chat ≠ embed; không fallback mock | `probe.test.ts`, AC10 live |
| ops/observability-security | bí mật mã hoá AES-GCM, không vào log / audit / preview / stderr; SSRF + allowlist env; header allowlist | canary test `platform-providers.test.ts` |
| ui/frontend-structure | screen chỉ điều phối; panel / form / hook / types riêng; file ≤ 250 dòng | lint:size |
| ui/prototype-parity + interaction-patterns | không có prototype → PD-022, không baseline; token-only; trạng thái loading / empty / denied / error; mobile 390 | lint:tokens, E2E mobile |
| i18n | namespace `platformAdmin` + tiêu đề action vi / en | i18n-check 100% |
| code/testing (D59) | test file riêng; cổng theo phạm vi TIP + parity --done vì sửa lớp dùng chung | mục cổng |
| workflow/git-flow-ci | nhánh `tip/040-platform-admin`, PR vào `dev` xếp chồng trên #100 | PR |
