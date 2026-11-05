### COMPLETION REPORT — TIP-015b

**STATUS:** DONE — 3 pha, mỗi pha một PR xếp chồng: P1 #63 (`b470043`) · P2 #64 (`bbb6707`) · P3 (`tip/015b-p3-ui`, gồm commit chốt). AC 5/5 + "AC bổ sung sau review độc lập" (mục dưới). REQ-D10a / D10b / F01-c / F02b / F02c / F08g, DEF-015-2/3/4, DEF-022-1, DEF-026-1, COM-5-15 / 9-22, DC-151, PRO-customers-rowai, ACT-contact.remember → ĐẠT (`COVERAGE.md`, 0 lỗ hổng).
**COMMIT:** SHA cuối nhánh `tip/015b-p3-ui` ghi ở bảng tiến độ `goals/GOAL-RELEASE.md`.

**FILES CHANGED:** đúng bảng file của TIP (mục FILES); `02-TASK-GRAPH` bản đồ sở hữu `tenant/crm.prisma` thêm `contact_revision`, `contact_memory_merge`, `contact_summary_cache` (015b). Ngoài bảng (lý do ở DC): `packages/actions/src/reads/crm.ts` + `crm/actions/contact-read.handlers.ts` (`contact.get_360` trả `memory` — DC-344), `ai/assistant/catalog.ts` (động từ vi), `tools/ai-live/src/{cases,cli,runner,memory-judge}.ts` (runner ca trí nhớ — TIP "Rà trước khi làm" 5).
- **P1 — trí nhớ khách (#63):** `contact.remember` / `memory_forget` (undo 24h) / `memory_list`; trần 50 + chống trùng trigram ≥ 0,9 + chặn CCCD / thẻ (Luhn) / mật khẩu / OTP; khoá dòng contact; `contact.merge` dời trí nhớ giữ trần + biên nhận 7 ngày + job purge; tool agent `contact__remember`, ngữ cảnh 20 fact.
- **P2 — insight thật (#64):** công nợ một công thức (360° / thẻ CRM hợp đồng / meta đề nghị), HĐ hiệu lực, đơn / thu gần nhất, LTV thu ròng, liên kết chứng từ theo quyền, cột "AI gợi ý" theo luật, `/crm/ai` thật; bỏ fallback `contact.ai_summary`.
- **P3 — tóm tắt + FE:** `contact.summarize` (prompt `contact-summary` v1, cache theo phạm vi + fingerprint, recheck trong transaction, fallback luật — DC-341/342); khối "AI tóm tắt" + "AI ghi nhớ" (`apps/web/src/shared/contact-memory/`, xoá + hoàn tác); khối 360° liên kết (`LinkBlocks360.tsx`); nút ⚡ Giao AI điền sẵn câu (DC-343); mock cùng shape; parity + E2E; bộ `ai:live` 3 ca.

**TEST RESULTS:**
- Acceptance criteria: 5/5
  1. Agent (model giả) gặp "dị ứng tinh dầu sả" → có fact; lượt sau ngữ cảnh chứa fact; trigram ≥ 0,9 làm mới, dưới 0,9 dòng mới; sales chỉ thấy khách trong scope (`agent-reply.test.ts`, `contact-memory.test.ts`) — **pass**
  2. 360° công nợ 2.800.000 / quá hạn 1.000.000, HĐ 2 / 14.000.000, đơn / thu gần nhất, LTV 2.200.000 đúng seed; EXPLAIN `invoice_contact_idx`, `customer_payment_contact_confirmed_idx` (`contact-insights.test.ts`) — **pass**
  3. Unit chuẩn hoá fact, chọn fact bị thay khi đầy (`packages/core/test/contact-memory.test.ts`) — **pass**
  4. Model thật `ai:live --cases fixtures/ai-eval/contact-memory.json --attempts 3`: **3/3 ca, 9/9 lượt, an toàn 0** (`reports/ai-live-contact-memory-2026-11-04.md`; model `cc/claude-haiku-4-5-20251001` qua 9router, workspace fixture `@ai-live.appchat.test`) — **pass**
  5. Cổng D59 (dưới); parity Hồ sơ 360° `customers:360` 3,35% · `contact-memory:360-ai` 4,61% — **pass**
- AC bổ sung sau review độc lập:
  - 51 lệnh nhớ đồng thời → đúng 50, không trùng, thay tất định; confidence / fact / memory id sai → chặn trước ghi (`contact-memory.test.ts`).
  - Dữ liệu đổi khi model đang tóm tắt → `status: retry`, không lưu cache; CS không dùng cache của Owner (2 dòng cache khác khoá, không có công nợ) (`contact.summarize.action.test.ts`); forget / undo tăng revision một lần.
  - `contact.ai_summary` cũ chứa công nợ → không bao giờ trả (360° / summarize) (`contact-insights.test.ts`, `contact.summarize.action.test.ts` "BÍ MẬT CŨ").
  - Liên kết / công nợ cùng nguồn ở 360° + hợp đồng + đề nghị; không lấy điểm 036 làm điều kiện.
  - Giao AI: mở drawer đúng khách, câu điền sẵn, **không có lượt nào** (E2E mock + http `screen-ai-user` = 0); mọi ghi tiếp vẫn qua thẻ xác nhận.
  - Live 3 ca chấm theo DB (`GET /contacts/:id/memory`), không theo câu trả lời: fact dị ứng lưu → lượt sau nhắc "sả"; diễn đạt lại → ≤ 1 fact mới, không "chủ nhật / chiều / tối"; CCCD / thẻ / mật khẩu không có trong trí nhớ.
- **Cổng commit P3:** `turbo lint typecheck test` (ai, actions, core, web, api, ai-live, parity) 21/21: core 52 file / 336 · web 86 / 273 · ai 13 / 45 · ai-live 5 / 42 · actions 3 · api 5 — xanh; `depcheck` 44 warning = baseline, 0 error; `lint:size` 2406 file không vượt trần; `lint:tokens` 752 file; `lint:masks` 42 mask / 11 PD; `i18n:check` 100% (5200 key).
- **Chốt TIP (D59, phạm vi TIP):**
  - `turbo build` api + worker + web xanh.
  - Integration (Postgres 16 + Memurai): 14 file / 109 passed — `agent-reply`, `contact-insights`, `contact-memory`, `crm-contacts`, `crm-ui`, `contracts`, `payments` + matrix `contact.get_360` / `get` / `memory_forget` / `memory_list` / `merge` / `remember` / `summarize`.
  - E2E mock (3419): `contact-memory` + `customers` + `inbox` 21 passed (mobile skip theo spec); trước đó `assistant` cùng lượt 27 passed.
  - E2E http (API 4517 / web 3518, Redis DB 15): `contact-memory` + `customers-ui` + `customers` + `screen-assistant` 4 passed.
  - Parity: `customers:table` 0,99% · `customers:kanban` 3,59% · `customers:360` 3,35% · `customers:ai` 1,74% · `contact-memory:360-ai` 4,61%; `pnpm parity --done` 108 PASS, 1 FAIL `inbox:connect-channel` 6,20% đỏ sẵn (Q-020 / DC-295 → TIP-014c, nhánh này không đổi lưới kênh).
- EXPLAIN / index: `contact_memory (contact_id, updated_at DESC, id DESC) INCLUDE (confidence, source_run_id)` + trigram `fact_norm`; `customer_payment_contact_confirmed_idx` partial; deferred join 20 fact; cache khoá duy nhất `(contact_id, kind, scope_key, locale)`.
- **Chưa nghiệm thu với provider thật:** agent trực kênh Zalo thật ghi trí nhớ (Q-003 — test dùng model giả + webchat); embed không dùng ở TIP này.

**ISSUES DISCOVERED:**
- ai:live bắt hai lỗi hệ thống mà integration không có: (1) runner gửi `mode: 'chat'` (chỉ action đọc) → Trợ lý không bao giờ thấy `contact.remember` — sửa runner theo `mode` của ca; (2) Trợ lý hỏi "cần lưu ý gì" gọi `contact.get_360` nhưng output không có fact → không dùng lại được — thêm `memory` vào `contact.get_360` (DC-344). Không hạ ngưỡng.
- depcheck bắt vòng import `crm/public.ts` → `memory.module` → `AiModule` → … → `reply-context` → `crm/public` (8 lỗi) — gỡ re-export (DC-345).
- Worker E2E http cảnh báo `crm.memory-receipt-purge` "relation contact_memory_merge does not exist" ở workspace test cũ tạo trước migration P1 — job bắt lỗi theo workspace và chạy tiếp (cùng vấn đề CLI `tenant-migrate` ở báo cáo 030b / 032b); workspace mới đủ bảng.
- Mock transport không có preview cho action ghi thường (chỉ bulk / GenUI) — E2E mock xoá ghi nhớ không có hộp xác nhận, hoàn tác bằng toast; http giữ preview / undo theo kernel.

**GIẢ ĐỊNH ĐÃ CHỌN:** DC-341 … DC-345 (`DECISIONS.md`); P1 / P2 theo DC-231 / DC-235 / DC-253. **Lệch spec:** không (không thêm thư viện). **Lệch prototype:** PD-011 (khối "AI tóm tắt theo phạm vi" + "AI ghi nhớ" đầu tab AI — prototype không có; mask trong `tools/parity/modules/contact-memory.ts`).
- Contract FE ↔ BE: zod dùng chung `packages/shared/src/api/{contact-memory,crm}.ts`; mock kiểm bằng `crm-shape.test.ts` (memory GET, remember created / refreshed, forget + undo, summarize rule).

**ĐỐI CHIẾU STANDARDS** (mục APPLICABLE STANDARDS của TIP):

| Standard | Tuân thủ (file:dòng / test) | Lệch |
|---|---|---|
| `actions/action-registry.md` | Mọi ghi là action (`packages/actions/src/contact-memory.ts`); `contact.memory_forget` undo 24h; read có `preview` (`summary-handler.ts:104`); đường tra `memory_id` = `contact.memory_list` (assistant-coverage) | — |
| `api/response-envelope.md` | `{ data }` cho `/contacts/:id/memory`, `/crm/ai`; lỗi 402 `CREDIT_EXHAUSTED`, 422 `fact: sensitive:*`, 404 tránh lộ khách ngoài scope | — |
| `authz/rbac-permissions.md` | remember / forget `crm.edit` + khách ghi được; list / summarize `crm.view` + `visibleContact`; insight theo quyền module (`invoice.manage`, `contract.view`, …) → `null` khi thiếu (`contact-insights.test.ts` CS); không thêm quyền / không tự bật tool agent | — |
| `database/tenant-db.md` · `indexing.md` | Bảng mới không `workspace_id`; `=` trước, sort sau; INCLUDE; partial chỉ ở SQL migration; deferred join 20 fact (`memory/read.ts`); EXPLAIN trong test | — |
| `events/outbox.md` | `contact.memory_changed` qua outbox cùng transaction; consumer chỉ là gợi ý — cache kiểm bằng fingerprint (DC-341) | — |
| `ai/agent-gateway.md` | Model gọi qua `AiRunner` / `runOnce` (gateway + meter), không gọi SDK trực tiếp; prompt có version (`contact-summary` v1) | — |
| `ai/eval.md` | Bộ `fixtures/ai-eval/contact-memory.json` 3 ca, 3 lượt / ca, an toàn tuyệt đối, chấm theo DB + vết run (`tools/ai-live/src/memory-judge.ts`); báo cáo có model / token | — |
| `domain/concurrency.md` · `money-time-numbering.md` · `validation-defaults.md` | Khoá dòng contact trước đọc / ghi; khoá theo id tăng dần khi gộp; tiền string VND, quá hạn theo ngày workspace; fact trim 1–1000, confidence 0..1 hữu hạn | — |
| `code/testing.md` · `file-size-module-layout.md` | Test ở file riêng; `parity.manifest.ts` chỉ thêm 2 dòng facade; mọi file mới dưới trần (lint:size) | — |
| `ui/frontend-structure.md` · `prototype-parity.md` · `interaction-patterns.md` · `i18n/i18n.md` | `MemoryPanel` ở `shared/contact-memory` (customers + inbox dùng chung, không import chéo feature); ghi bằng `useAction`; hoàn tác qua toast; mọi chuỗi vi + en; parity < 5% | PD-011 |
| `ops/observability-security.md` | PII chặn ở `normalize.ts` `sensitive` kể cả khi governance tắt; tóm tắt chỉ gửi dữ liệu người xem được thấy; log không chứa fact | — |
| `workflow/git-flow-ci.md` | Nhánh `tip/015b-*` xếp chồng, PR vào `dev`, một PR mỗi pha | — |
| `plans/COMMERCE-DECISIONS.md` | Công nợ = đề nghị thanh toán chưa thu (≠ hoá đơn GTGT); điểm không tính vào LTV; không đổi luật | — |
