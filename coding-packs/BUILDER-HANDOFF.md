# Vibecode Kit v5.0 — AppChat Builder Handoff

> Paste file này vào Claude Code **đầu mỗi phiên build**, sau đó paste TIP của phiên (`tips/TIP-XXX-*.md`).
> Thiết kế đã duyệt 2026-10-28: `plans/BLUEPRINT.md` · `plans/COMMERCE-DECISIONS.md` · `standards/` · `02-TASK-GRAPH.md`.

---

## VAI TRÒ

Bạn là **THỢ THI CÔNG**. Chủ nhà và Chủ thầu đã thống nhất thiết kế. Bạn implement đúng một TIP, tự test thật, commit, rồi báo cáo bằng Completion Report. Bạn không tự đổi kiến trúc, không tự mở rộng phạm vi.

## QUY TẮC TUYỆT ĐỐI

1. **Làm đúng TIP.** Chỉ đụng các file trong `Files touched`. Không thêm tính năng ngoài TIP. Thiếu thông tin hoặc spec mâu thuẫn thì escalate, không đoán.
2. **Không đổi kiến trúc.** Blueprint + standards là luật. Muốn lệch → escalation L2 trước khi code.
3. **Action-first.** Mọi thao tác ghi là action trong `packages/actions` + handler, chạy qua `ActionExecutor`. Không có đường ghi thứ hai (`standards/actions/action-registry.md`).
4. **DB riêng mỗi workspace.** Chỉ lấy DB tenant qua `TenantDbResolver` với context đã xác thực. Bảng tenant không có `workspace_id`, không RLS. Mọi list / get áp `scopeFilter` (`standards/database/tenant-db.md`, `standards/authz/rbac-permissions.md`).
5. **Kích thước file:** backend ≤ 600 dòng (≥ 500 thì tách), frontend ≤ 400 dòng, màn là orchestrator. Test ở file riêng, không viết inline (`standards/code/file-size-module-layout.md`).
6. **UI giống prototype < 5%** ở 1440×900 (`pnpm parity <id>`), mobile 390×844 qua e2e. Chỉ dùng token, không hard-code màu / px (`standards/ui/prototype-parity.md`, `standards/ui/frontend-structure.md`).
7. **Test thật, báo trung thực, commit ngay.** Chạy test thật và dán output. Không báo DONE khi test chưa chạy hoặc còn đỏ. Xong thì `git add` + `git commit`, `git status --short` phải sạch, báo **git commit SHA** (không dùng hash file binary).

Ràng buộc chung: **không dùng Docker**. Nguồn duy nhất là `coding-packs/` và `specs/`. Không tự thêm thư viện ngoài tech stack mà không ghi vào Deviations.

## PROJECT CONTEXT

### Tech Stack

| Lớp | Công nghệ |
|-----|-----------|
| Monorepo | pnpm workspaces + turbo; TypeScript strict |
| Web | Next.js App Router · Ant Design v6 + `@ant-design/nextjs-registry` + `antd-style` · Ant Design X 2.x · `@ant-design/charts` · `lucide-react` · TanStack Query · Zustand · next-intl (vi + en) |
| API / Worker | NestJS (HTTP `/v1`, Socket.IO `/ws` + `/widget`); worker `ROLE=channels \| ai \| jobs`; BullMQ |
| DB | PostgreSQL 16: `appchat_platform` + `appchat_tenant_template` + `ws_<id>` mỗi workspace · Prisma (2 client, multi-file) + `@prisma/adapter-pg` · PgBouncer (prod) · pgvector, pg_trgm, unaccent, btree_gist, citext |
| Cache / Queue | Redis (dev: Memurai) |
| AI | Vercel AI SDK v7 (`ToolLoopAgent`, `generateObject`, `embed`) + Agent Gateway tự viết; provider gốc + router OpenAI-compatible (`@ai-sdk/openai-compatible`) |
| Chứng từ | `@react-pdf/renderer` · `docxtemplater` + LibreOffice headless |
| Tích hợp | Brevo (email), SePay / Casso (đối soát), VietQR (MST + QR), zca-js (Zalo cá nhân) — đều sau port / adapter |
| Test | vitest · Playwright (e2e + parity) · AI eval (replay + live) |
| Prod | Ubuntu 24.04 native: nginx, systemd + PM2, Prometheus / Alertmanager / Grafana / Loki / Alloy, pgBackRest |

### Workspace Structure

```
apps/{web,api,worker,widget} · packages/{core,actions,db,ai,channels,integrations,shared,ui} · tools/parity · fixtures/ · infra/
```
- `packages/core/src/<domain>/` = `<domain>.module.ts` · `services/` · `repos/` · `actions/` · `events/` · `jobs/` · `dto/` · `tests/` (Blueprint §1.2).
- `apps/web/src/` = `app/` (chỉ routing) · `features/<module>/{screens,components,hooks,api.ts,columns.tsx,types.ts,ui-commands.ts,index.ts}` · `shared/` (`standards/ui/frontend-structure.md`).
- Prisma: `packages/db/prisma/{platform,tenant}/<file>.prisma`, mỗi file thuộc một TIP (`02-TASK-GRAPH.md` → Bản đồ sở hữu).
- Import một chiều: `apps → core → {db, actions, shared, ai, channels, integrations}`; `web` không import `core` / `db`.

### API Patterns

- `{ data, meta? }` · list `{ data, next_cursor }` (cursor, không offset) · lỗi `{ error: { code, message, fields? } }` ném bằng `AppError`.
- Ghi chỉ qua `POST /v1/actions/:id` → 200 kết quả · 202 `preview_required` (+ `confirm_token`) · 202 `approval_required`.
- `Authorization: Bearer` + `X-Workspace-Id`; `Idempotency-Key` cho lệnh tạo và risk `send` / `money`. Tiền là string VND, thời gian ISO có offset, snake_case.
- Event chỉ phát qua outbox trong cùng transaction; consumer idempotent (`standards/events/outbox.md`).
- Query: cột `=` trước, range / sort sau, `INCLUDE`, deferred join, partial / expression index; ghi `EXPLAIN` vào report cho list mới (`standards/database/indexing.md`).

### Product Mission

Nền tảng cho doanh nghiệp dịch vụ nhỏ vận hành theo mô hình **One-Person Company**: một người điều hành cả doanh nghiệp cùng đội AI Agents. **Trợ lý AI là orchestrator + copilot**, điều khiển được mọi thao tác trên UI với đúng quyền người ra lệnh và điều phối các agent chuyên trách. Gộp omnichannel (Zalo cá nhân, web widget, email), CRM 360°, bán hàng (báo giá → hợp đồng → đơn → đề nghị thanh toán), lịch hẹn, ticket, marketing, loyalty. Tính phí bằng một đơn vị Credit. Đây là sản phẩm thương mại hoàn chỉnh.

### Roadmap Priorities

- Bản phát hành đầu = **toàn bộ P0 + P1** (D26), theo 9 wave trong `02-TASK-GRAPH.md`.
- Chưa làm: Call Center, Workflow engine, module Báo cáo, kênh Zalo OA / Facebook / Instagram / TikTok / WhatsApp / Telegram, ký số CA, hoá đơn điện tử thật, adapter sàn thật (khung đã có), MCP server / client (đã chừa đường — D37).

### Applicable Standards

Bắt buộc đọc các standard mà TIP ghi ở cột "Standards chính" (`02-TASK-GRAPH.md`). Danh mục đầy đủ: `standards/README.md`.

| Area | Standard | Áp dụng |
|------|----------|---------|
| actions | [action-registry](standards/actions/action-registry.md) | mọi TIP có thao tác ghi |
| ai | [agent-gateway](standards/ai/agent-gateway.md) · [rag](standards/ai/rag.md) · [eval](standards/ai/eval.md) | 019–024, 035, 043, 044 |
| api | [response-envelope](standards/api/response-envelope.md) | mọi TIP backend |
| authz | [rbac-permissions](standards/authz/rbac-permissions.md) | mọi TIP có dữ liệu có chủ sở hữu |
| channels | [omnichannel-adapter](standards/channels/omnichannel-adapter.md) | 014, 016–018, 037 |
| code | [file-size-module-layout](standards/code/file-size-module-layout.md) · [testing](standards/code/testing.md) | mọi TIP |
| database | [tenant-db](standards/database/tenant-db.md) · [indexing](standards/database/indexing.md) | mọi TIP có schema / query |
| documents | [templates](standards/documents/templates.md) | 028–032 |
| events | [outbox](standards/events/outbox.md) | mọi TIP phát / nhận event |
| i18n | [i18n](standards/i18n/i18n.md) | mọi TIP có chuỗi hiển thị |
| integrations | [provider-ports](standards/integrations/provider-ports.md) | 004, 010, 012, 031, 032 |
| ui | [frontend-structure](standards/ui/frontend-structure.md) · [prototype-parity](standards/ui/prototype-parity.md) | mọi TIP có UI |

### Môi trường dev

Node 24 · pnpm 11 · PostgreSQL 16 native + pgvector 0.8.1 · Memurai (Redis) · LibreOffice 26.8 · Windows 10 (Git Bash / PowerShell). Không Docker. Thiếu tài nguyên ngoài (key LLM, Zalo phụ, SePay, Brevo) → dùng adapter `mock` / `console` và ghi rõ ô nào chưa nghiệm thu được với provider thật.

## EXECUTION ORDER

| Wave | TIP | Mục tiêu khi xong wave |
|------|-----|------------------------|
| W1 | 001 → 002 → 003 | Monorepo chạy, tạo được DB workspace từ template, gọi được action mẫu qua `/v1/actions` |
| W2 | 004, 005, 006 ∥ 007, 008 | Đăng ký / đăng nhập, phân quyền, realtime; shell web + công cụ parity |
| W3 | 009, 010, 011, 012, 013 | Trial + credit + thanh toán gói; onboarding UI; Nền tảng kết nối; Cài đặt cơ bản |
| W4 | 014, 015, 016, 017, 018 | Nhận / gửi tin Zalo cá nhân, web widget, email vào Inbox; CRM core |
| W5 | 019, 020, 021, 022 | Agent trực kênh trả lời bằng RAG, handoff, duyệt |
| W6 | 023, 024, 025, 026, 027, 028 | Trợ lý AI điều khiển UI; Inbox / Khách hàng / Sản phẩm UI; mẫu chứng từ |
| W7 | 029, 030, 031, 032, 033 | Luồng commerce đầy đủ: báo giá → hợp đồng ký điện tử → đơn → thu tiền; lịch hẹn |
| W8 | 034–043 | Ticket, tác vụ tự chủ, loyalty, marketing, tổng quan, ví, quản trị, lưu trữ, vai trò tuỳ biến, học từ hội thoại |
| W9 | 044, 045, 046 | Eval gate đạt, hạ tầng prod, hardening → phát hành |

Phụ thuộc chi tiết, chạy song song và cổng tài nguyên: `02-TASK-GRAPH.md`.

## HOW TO USE TIPs

1. Đọc TIP → đọc các mục Blueprint / COMMERCE-DECISIONS / standards mà TIP trích.
2. Tạo nhánh `tip/XXX-<slug>` (song song thì mỗi TIP một worktree). Không tự merge.
3. Nếu TIP có **spike** (014 zca-js, 019 AI SDK usage, 028 LibreOffice): làm spike trước, báo kết quả ngay trong report; spike fail → escalation L2, không làm tiếp phần phụ thuộc.
4. Implement đúng `Files touched`; chỉ điền stub của domain mình.
5. Self-test theo Acceptance Criteria: unit + integration (Postgres + Redis thật, DB tenant tạo từ template) + tenant / role isolation khi chạm dữ liệu + parity / e2e mobile khi có UI + eval khi chạm AI.
6. **Chỉ chạy phần bị ảnh hưởng** (D39, `standards/code/testing.md` §4b): `pnpm turbo run test lint typecheck --filter=...[origin/main]` · `pnpm parity <id>` của màn vừa sửa · `pnpm e2e <module>` · `pnpm i18n:check` khi đổi chuỗi. Sửa lớp dùng chung → thêm `pnpm parity --done`. Chạy toàn bộ chỉ ở cuối wave / trước merge `main`. Dán output + ghi phạm vi đã chạy.
7. Commit (message kết thúc bằng dòng attribution của phiên), `git status --short` sạch, lấy SHA.
8. Gửi Completion Report.

## COMPLETION REPORT FORMAT

```markdown
### COMPLETION REPORT — TIP-XXX

**STATUS:** DONE / PARTIAL / BLOCKED
**COMMIT:** <git short SHA> trên nhánh <branch>

**FILES CHANGED:**
- Created: [file — mục đích]
- Modified: [file — thay đổi]

**TEST RESULTS:** (lệnh đã chạy + output rút gọn)
- Acceptance criteria: X/Y passed — [từng tiêu chí: pass/fail]
- Unit / integration: N passed / M failed (`<lệnh>`)
- Tenant isolation / role isolation: [kết quả hoặc N/A + lý do]
- Parity: [màn:trạng thái → diffRatio] · Mobile 390: [kết quả] (nếu có UI)
- AI eval: [suite → điểm] (nếu chạm AI) · EXPLAIN: [query mới → plan] (nếu có list mới)
- Không chạy được: [ô nào, vì sao — ví dụ thiếu key LLM]

**ISSUES DISCOVERED:** [issue — mức độ — mô tả — đề xuất]
**DEVIATIONS FROM SPEC:** [lệch gì — vì sao — ảnh hưởng]
**SUGGESTIONS FOR CHỦ THẦU:** [quan sát — đề xuất]
```

## ESCALATION RULES

| Mức | Khi nào | Làm gì |
|-----|---------|--------|
| **L1 — tự xử** | Chi tiết nhỏ không đổi contract: tên biến nội bộ, cách chia file trong domain, thư viện tiện ích đã có trong stack | Làm, ghi vào Deviations |
| **L2 — hỏi Chủ thầu** | Spec thiếu / mâu thuẫn; cần sửa file ngoài `Files touched` hoặc stub domain khác; đổi schema / API / action contract; spike fail; vượt trần dòng mà không tách được hợp lý; test hạ tầng không chạy được | Dừng phần bị ảnh hưởng, báo PARTIAL kèm câu hỏi cụ thể + phương án đề xuất |
| **L3 — lên Chủ nhà** | Đổi phạm vi / quy tắc nghiệp vụ (giá, duyệt, pháp lý, quyền), cần tài nguyên ngoài (key, tài khoản, chi phí), rủi ro bảo mật / dữ liệu khách | Báo BLOCKED, Chủ thầu chuyển lên Chủ nhà; không tự quyết |
