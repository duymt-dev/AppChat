# AppChat V2 — Project Instructions

> Đọc file này đầu mỗi phiên. Thiết kế đã duyệt 2026-10-28; mọi quyết định nằm trong `coding-packs/`. Chỉ dùng nguồn trong repo này.

## 1. Dự án

Nền tảng cho doanh nghiệp dịch vụ nhỏ theo mô hình **One-Person Company**: một người vận hành doanh nghiệp cùng đội AI Agents. **Trợ lý AI = orchestrator + copilot**: điều khiển được mọi thao tác trên UI với đúng quyền người ra lệnh và điều phối agent chuyên trách. Kênh: Zalo cá nhân, web widget, email. Sản phẩm thương mại hoàn chỉnh (không phải bản thử).

Stack: pnpm monorepo · Next.js App Router + Ant Design v6 + Ant Design X · NestJS (api + worker) · PostgreSQL 16 (DB nền tảng + **DB riêng mỗi workspace**) · Redis + BullMQ · Vercel AI SDK v7. **Không Docker.**

## 2. Đọc trước khi code (bắt buộc)

**Luôn đọc:**
1. `coding-packs/BUILDER-HANDOFF.md` — quy tắc thi công, mẫu Completion Report, escalation.
2. TIP / goal đang làm (`coding-packs/tips/TIP-XXX-*.md` hoặc `coding-packs/goals/*.md`).
3. Các standard mà TIP / goal ghi tên — danh mục `coding-packs/standards/README.md`.

**Theo loại việc:**

| Việc | Đọc thêm |
|------|----------|
| Frontend / UI | `standards/ui/frontend-structure.md` · `standards/ui/prototype-parity.md` · `standards/i18n/i18n.md` · Blueprint §7 · prototype (mục 6 dưới) |
| Backend / action | `standards/actions/action-registry.md` · `standards/api/response-envelope.md` · `standards/events/outbox.md` · `standards/domain/*` (state-machine, concurrency, money-time-numbering, validation-defaults) · `standards/ops/observability-security.md` · Blueprint §3, §4 |
| Thiết kế không nói / prototype chưa đủ nghiệp vụ | `standards/domain/gap-filling.md` (thang tra cứu, được tự quyết / phải hỏi, ghi "Giả định đã chọn") |
| Schema / query | `standards/database/tenant-db.md` · `standards/database/indexing.md` · Blueprint §2 · `02-TASK-GRAPH.md` → Bản đồ sở hữu file |
| Phân quyền / dữ liệu có chủ sở hữu | `standards/authz/rbac-permissions.md` · Blueprint §3.5 |
| Commerce (báo giá, hợp đồng, đơn, thu tiền, loyalty) | `plans/COMMERCE-DECISIONS.md` (luật đã chốt — **không được đổi**) · `standards/documents/templates.md` |
| AI | `standards/ai/agent-gateway.md` · `standards/ai/rag.md` · `standards/ai/eval.md` · Blueprint §5 |
| Kênh / tích hợp | `standards/channels/omnichannel-adapter.md` · `standards/integrations/provider-ports.md` · Blueprint §6, §8 |
| Hạ tầng | Blueprint §11 |
| Git / PR / CI | `standards/workflow/git-flow-ci.md` |

**Thứ tự ưu tiên khi tài liệu mâu thuẫn:** `COMMERCE-DECISIONS.md` > `BLUEPRINT.md` > `standards/` > `01-REQUIREMENTS-MATRIX.md` (Decisions D01–D51) > `00-PROJECT-CONTEXT.md` (Vision) > `docs/`. Về **hình ảnh UI**: prototype thắng, trừ các ngoại lệ có mã quyết định trong `standards/ui/prototype-parity.md`. **Bản prototype mới (ver2.1 trở đi) không ghi đè hành vi bảng danh sách D42** (cuộn trong khung, header dính, phân trang có số trang) — D43. Mâu thuẫn không giải được → dừng, hỏi (escalation L2).

## 3. Cấu trúc code

```
AppChat_Ver2/
├── apps/
│   ├── web/            Next.js — UI + Trợ lý dock (desktop 1440 + mobile web, một codebase)
│   ├── api/            NestJS — HTTP /v1, Socket.IO /ws + /widget, /hooks/*
│   ├── worker/         NestJS standalone — ROLE=channels | ai | jobs
│   └── widget/         web chat widget (1 file JS nhúng)
├── packages/
│   ├── core/           domain NestJS modules — src/<domain>/{<domain>.module.ts, services/, repos/, actions/, events/, jobs/, dto/, tests/}
│   ├── actions/        Action Registry: defineAction (zod input/output, permission, risk, undo, invalidates) — dùng chung web/core/ai
│   ├── db/             prisma/{platform,tenant}/<file>.prisma, PlatformDb, TenantDbResolver, provisioner, tenant-migrate
│   ├── ai/             Agent Gateway, AiSdkEngine, LLM router, prompts/, meta-tools, eval/
│   ├── channels/       ChannelAdapter + manifest + registry (zalo-personal, webchat, email)
│   ├── integrations/   port theo năng lực + ConnectorManifest + registry (sepay, casso, brevo, …)
│   ├── shared/         types, error codes, permissions, events, i18n locales, fmt helpers (không import gói nội bộ)
│   └── ui/             theme.ts (token prototype), primitive: DataTable, KanbanBoard, FilterBar, EntityDrawer, PageHeader, icons
├── tools/parity/       Playwright so ảnh với prototype
├── fixtures/           prototype-parity/, ai-eval/
├── infra/              provision, nginx, systemd, monitoring (native VPS)
├── coding-packs/       thiết kế, standards, TIP, report (không phải code)
└── specs/              tài liệu phi kỹ thuật
```

**`apps/web/src`** (chi tiết: `standards/ui/frontend-structure.md`):
```
app/                    CHỈ routing — (auth) (onboarding) (app) (public)/sign/[token] (admin); page.tsx ≤ 120 dòng
features/<module>/      screens/ · components/ · hooks/ · api.ts · columns.tsx · types.ts · ui-commands.ts · index.ts
shared/                 api/ · actions/ (useAction, ConfirmActionHost) · authz/ (useCan, Can, useScope) · realtime/ · assistant/ · shell/ · states/ · forms/
messages/<locale>/<module>.json   vi (nguồn) + en
```

**Import một chiều:** `apps → core → {db, actions, shared, ai, channels, integrations}`; `web → {actions, shared, ui}` (không bao giờ `core` / `db`); trong web: `app → features → shared → packages`; `features/a` không import `features/b/components/*`.

## 4. Quy tắc bắt buộc

1. **Action-first:** mọi thao tác ghi là action trong `packages/actions` chạy qua `ActionExecutor` (`POST /v1/actions/:id`). FE ghi **chỉ** bằng `useAction(id).run(input)`. Không có đường ghi thứ hai.
2. **Tenant:** DB tenant chỉ lấy qua `TenantDbResolver`; bảng tenant không có `workspace_id`, không RLS; mọi list / get áp `scopeFilter`.
3. **Kích thước file:** backend 200–400 dòng, trần **600** (≥ 500 thì tách); frontend 150–250, trần **400**; màn chỉ là orchestrator. **Test ở file riêng**, không viết inline.
4. **UI:** giống prototype **< 5%** (1440×900, `pnpm parity <id>`); mobile 390×844 qua e2e; chỉ dùng token (`packages/ui/theme.ts`), **cấm hard-code màu / px**, cấm CSS rời; mọi chuỗi qua i18n (vi + en). Bảng danh sách theo D42 (cuộn trong khung, header dính, `Pager` số trang) — prototype mới không ghi đè (D43).
5. **Postgres:** composite index cột `=` trước, range / sort sau; `INCLUDE` cho covering; deferred join cho list có LIMIT; partial / expression index; cursor pagination (9 bảng có số trang dùng `page` + `limit` — D42). Ghi `EXPLAIN` cho list mới.
6. **API:** `{ data }` / `{ data, next_cursor }` / `{ error: { code, message, fields? } }`; tiền là string VND; `Idempotency-Key` cho lệnh tạo và risk send / money.
7. **Luật commerce và quyền đã chốt không được tự đổi** (báo giá 15 ngày, ngưỡng duyệt 20M / 5%, ký hợp đồng Owner trước, đơn 2 trục, đề nghị thanh toán ≠ hoá đơn GTGT, 10.000đ = 1 điểm, 5 vai trò + data scope).
8. **Quyền agent (D51):** chỉ cấu hình ở Builder AI Agents (Tools nhóm theo module + Kỹ năng AI); connector không cấp cho agent; `delegate` / Cowork = quyền agent ∩ quyền người ra lệnh, kiểm mỗi lần gọi tool (Blueprint §3.3b).
9. Không thêm thư viện ngoài tech stack mà không ghi vào Deviations. Không swarm agent. MCP để P2 (D37).

## 5. Git & báo cáo

- **Git flow (D40, `coding-packs/standards/workflow/git-flow-ci.md`):** nhánh việc (`tip/XXX-<slug>`, `goal/<slug>`, `fix/…`, `chore/…`, `docs/…`) tách từ `origin/dev` mới nhất → PR **chỉ vào `dev`** (`gh pr create --base dev`, mẫu thân PR trong standard). **Không bao giờ** PR vào `main`, push thẳng `dev` / `main`, hay tự merge PR — `dev → main` do Chủ nhà tự làm.
- Goal dài: một PR mỗi pha. Trước khi mở PR: `git rebase origin/dev`; CI phải xanh.
- Xong việc + test pass → `git add` + `git commit` **ngay**; `git status --short` phải sạch trước khi báo DONE.
- Báo DONE kèm **git commit SHA** (`git rev-parse --short HEAD`), không dùng hash file binary.
- Commit message kết thúc bằng dòng attribution của phiên.
- **Chỉ test phần bị ảnh hưởng** (D39): test / lint / typecheck theo package đổi (`pnpm turbo run test lint typecheck --filter=...[origin/main]`), `pnpm parity <id>` của màn vừa sửa, `pnpm e2e <module>` của module vừa sửa. Sửa lớp dùng chung (theme, primitive, `shared/*`, schema action, kernel) thì chạy thêm `pnpm parity --done`. Chạy toàn bộ chỉ ở cuối pha, trước merge `main` và gate cuối. Chi tiết: `standards/code/testing.md` §4b.
- Test phải chạy thật, dán output; không báo DONE khi test chưa chạy hoặc còn đỏ. Ô nào thiếu tài nguyên (key LLM, Zalo, SePay, Brevo) thì ghi rõ "chưa nghiệm thu với provider thật".

## 6. Prototype (chuẩn UI duy nhất)

File: `coding-packs/docs/06-prototype/AppChat.dc.html` (**ver2.1**, 12.5k dòng; template + `class Component` logic). Bản prototype mới phải chạy `node tools/scripts/normalize-prototype.mjs` (về thang D41) trước khi commit (D44). Bản đồ dòng ver2.1 đầy đủ: `00-PROJECT-CONTEXT.md` → *SCAN DELTA — Prototype ver2.1*. Các file `.jsx` trong `jsx-reference/` chỉ để đọc logic, **không** dùng để so pixel.

| Vùng | Dòng | Ghi chú |
|------|------|---------|
| CSS toàn cục, keyframes | L39–404 | Plus Jakarta Sans, nền `#F9FAFB`, `.appshell{min-width:1180px}`, `.aibtn`, `.tblpage` |
| Icon SVG sprite (`#ic-*`, 55 icon) | L407–469 | map sang `packages/ui/icons` (lucide tương đương hoặc giữ SVG) |
| Auth: login / register / forgot / OTP | L471–647 | |
| Modal / popover toàn cục | L653–966 | ＋ L653 · tuỳ chỉnh 360° L690 · việc đang chạy L736 · email L760 · kết nối kênh L777 · drawer kênh L870 |
| Popup trial / khai báo DN | L967–1088 | |
| Shell: NavRail (đáy rail: search, thông báo, Nâng cấp, trial badge, avatar) | L1089–1362 | **không có topbar** |
| Màn: dashboard L1369 · assistant L1468 · inbox L1808 · agents L2581 · customers L2805 · marketing L3760 · calendar L4237 · loyalty L4778 · tickets L5203 · quotes L5323 · invoices L5599 · contracts L5709 · orders L5855 · products L5990 · settings L6120 | | workflow L3351, callcenter L4601, reports L5106 = **ẩn** |
| Settings sections | L6141–7813 | in-scope theo Blueprint §7.2 settings registry (thêm Hồ sơ 360° L6397) |
| State + dữ liệu mẫu | L8052+ | nguồn cho `fixtures/prototype-parity` |
| `renderVals()` (logic hiển thị) | L8902+ | |

Thứ tự module trong rail (prototype L8999): dashboard · assistant · inbox · customers · calendar · agents · (workflow) · marketing · (callcenter) · loyalty · (reports) · tickets · quotes · contracts · orders · products · settings.

## 7. Môi trường dev

Windows 10 · Node 24 · pnpm 11 · PostgreSQL 16 native (service `postgresql-x64-16`) + pgvector 0.8.1 · Memurai (Redis-compatible) · LibreOffice 26.8 · Git Bash / PowerShell. Không Docker.

## 8. Goal hiện tại

`coding-packs/goals/GOAL-FE-PROTOTYPE.md` — dựng toàn bộ frontend `apps/web` theo prototype bằng mock transport (D38): **xong F0–F7**.

Kế tiếp: đợt **prototype ver2.1** (D45 — Hộp thư · Hồ sơ 360° · AI Agent · Kênh + nút Trợ lý AI; REQ-B09–B11, C09–C13, D16, E14, F11–F12, M05, N15). Nguồn: `00-PROJECT-CONTEXT.md` → SCAN DELTA ver2.1, Blueprint (cập nhật 2026-10-29). Goal chưa viết.
