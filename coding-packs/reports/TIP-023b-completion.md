### COMPLETION REPORT — TIP-023b

**STATUS:** DONE — trừ 5 ca integration kênh Zalo giả đỏ do môi trường máy dev (Q-042, có bằng chứng dưới); không có ca đỏ thuộc phạm vi 023b.
**COMMIT:** xem SHA cuối nhánh `tip/023b-assistant-coverage` ở bảng tiến độ `goals/GOAL-RELEASE.md` (33+ commit, mỗi lô một commit).

**FILES CHANGED:** đúng manifest `tips/manifests/TIP-023b-files.md` (399 file thêm · 174 file sửa; manifest được amend khi thi công — mọi file trong `git diff origin/dev` đều có dòng manifest, kiểm bằng vòng lặp `MISSING` = 0).
- R1: `assistant/{catalog.ts, schema-brief.ts, meta-tools.ts, pending-action.ts, read-dispatch.ts}` — chỉ action có handler thật (`implementedBy`), khuôn input lồng nhau + ví dụ tối thiểu, input chuẩn hoá lưu ở `ai_run.state.canonicalInput` gắn token; `tools/ai-live/*` (30 ca cố định, `--cases`, chấm an toàn trước), `run-trace.read.ts` (`GET /assistant/runs/:id/trace`).
- R2: action đọc `packages/actions/src/reads/*` (quote/order/invoice/contract search + get, contact.get/get_360, conversation.search/get, staff/service/agent/member/tag/doc_template/channel/kb.source/run search, appointment.get, ticket.get) + handler cùng query / scope màn; **preview cho mọi action ghi có handler** (helper `previews/*.preview.ts` theo domain — `PREVIEW_DEBT` rỗng); 220 file ma trận `apps/api/test/integration/actions/<id>.action.test.ts` + khung `helpers/action-matrix.ts` + mục lục `fixtures/action-matrix.ts`.
- SPEC A: `agents/current-authority.ts` — quyền hiện hành mỗi lần agent gọi tool; `assistant/reference-resolver.ts` — mã → id theo đường dẫn schema (lồng `items[].product_id`, mảng `<thực thể>_ids`), chỉ trong scope người gọi; `custom-schema.ts` — ô `custom` có `ai = true` theo vai trò.
- SPEC C: `appointment.update` (`packages/actions/src/booking-update.ts` + handler + test).
- SPEC D: `conversation.create_group` (yêu cầu bền + outbox + worker nhóm giữ lease; capability `createGroup` Zalo cá nhân; migration `20261102002310_assistant_groups`); ConvMenu chỉ mở khi kênh có capability.
- REQ-E03b / R2.8: thẻ xem trước hiện `changes` (trước → sau, số bản ghi, cảnh báo) + nút **Sửa** (`EditActionPreviewModal.tsx`, `POST /assistant/preview-edit` — token cũ thu hồi, xem trước lại, không thực thi); `useAction` xử lý 202 `approval_required` (toast "Đã gửi duyệt").
- Worker: `AiDomainHandlersModule` — ROLE=ai nạp cùng module domain như API (DC-313).
- Prompt Trợ lý v4 (vi / en, registry `prompts/index.ts`): chờ duyệt ≠ đã xong; trả lời theo `readback`; trường tuỳ biến theo khuôn.

**TEST RESULTS:**
- Acceptance criteria: 6/6
  1. `assistant-coverage.test.ts` xanh, `PREVIEW_DEBT` rỗng, miễn trừ ô id có lý do từng dòng — **pass**
  2. Catalog: `briefSchema(contact.update)` có `patch.phone`; `quote.create` có `items[].product_id`, `items[].qty`; action không handler không xuất hiện (`assistant-unit`, `assistant-implemented-tools`) — **pass**
  3. Integration: sửa SĐT theo tên → `contact.search` → `contact.update` → thẻ có `changes` phone cũ → mới (`assistant.test.ts`, `assistant-preview-edit.test.ts`); tra BG- → `quote.get` (`quote.get.action.test.ts`, `assistant-vertical.test.ts`); agent tool nhận mã KH (`agent-current-authority.test.ts`) — **pass**
  4. Mỗi action đọc mới có ma trận với ô scope (sales own → 404 không xác nhận tồn tại); catalog (product / stock) quyền `catalog.view` mọi vai trò nên ô scope là "người ngoài workspace" — **pass**
  5. `pnpm ai:live` model thật 9router `cc/claude-haiku-4-5-20251001`, prompt v4: **27/30, 0 vi phạm an toàn → ĐẠT** (`reports/ai-live-2026-11-03.md`). Ca fail: `lookup-stock` (model trả lời đúng "còn 40" từ kết quả `product.search` mà không gọi `stock.get` — model chọn đường khác), `update-quote-validity` (seed báo giá nháp, không gia hạn được — lỗi seed Q-044), `chain-en-update` (model ghi "Huế", ca mong "Hue" — không hạ chuẩn bộ chấm). Lần đầu 18/30 → các lỗi **hệ thống** tìm ra và đã sửa: find_actions thiếu từ đồng nghĩa (dịch vụ / gói / gia hạn / ngừng bán) + xếp hạng dự phòng; mã trong mảng `product_ids`; `product.search` service ↔ package; vết che SĐT làm bộ chấm không so được (dấu vân tay); seed không khai báo DN (thiếu MST); runner tính lỗi provider là model sai.
     Suite bổ sung `--cases fixtures/ai-eval/assistant-vertical.json` (không cổng): 3/10 — 2 ca provider đứt stream (`LLM_ERROR`, nay tính lỗi hạ tầng), còn lại model dùng `quote.search` thay `quote.get` / hỏi giá thay vì tra sản phẩm (`reports/ai-live-assistant-vertical-2026-11-03.md`).
  6. Cổng D59 — **pass** (trừ Q-042 dưới).
- **Chốt TIP:**
  - `pnpm turbo run lint typecheck test build` **49/49** task (unit: core 183 · web 164 · shared 103 · channels 31 · ai 29 · ai-live 26 · integrations 22 · db 18 · worker 7 · api 5 · widget 5 · contract 4 · actions 3 · ui 2).
  - `pnpm depcheck` 0 error / 40 warning (= baseline) · `lint:size` 2010 file không vượt trần · `lint:tokens` xanh · `lint:masks` 42 mask / 8 PD có căn cứ · `i18n:check` 100% (4815 key vi / en).
  - Integration api: **1154 / 1165** (259 file). 11 đỏ → chạy riêng 7 file sau khi dừng mọi tiến trình phụ của thợ: **61 / 66**; 5 ca còn đỏ đều là phiên Zalo giả bị `expired` / tạm dừng (agent-reply AC4, channels AC8 / AC9, inbox AC6 + quét outbox) — worker `channels` của bộ demo native (ZALO_TRANSPORT=zca) đọc cùng `appchat_platform` và nhận tài khoản giả của test (**Q-042**, có từ trước 023b; bằng chứng cổng cuối lấy ở CI runner sạch — DC-289). 6 ca kia (onboarding, notify, integrations, product.search) là do jobs worker `ai:live` của thợ cùng Redis DB 15 — đã dừng, xanh khi chạy lại; tách DB riêng cho ai:live (**Q-046**).
  - Integration worker: **2 / 2** (`ai-commerce-resume` — tiến trình `dist/main.js` ROLE=ai thật; khởi động lại + job lặp không chạy lần hai; người ra lệnh bị thu hồi → FORBIDDEN).
  - E2E: mock `assistant` + `assistant-vertical` 6 passed; http `assistant` + `assistant-vertical` 2 passed (cổng 4217 / 3518, Redis DB 15, không worker kênh — không đụng demo); **full hồi quy mock 229 passed · 0 failed · 203 skipped**.
  - Parity: `assistant:card-preview` 0,06% (mask PD-008) · `assistant:*` khác pass.
- Tenant / role isolation: ma trận theo action (sales own · cs thiếu quyền · người ngoài workspace) + `assistant-vertical.test.ts` (sales nói mã KH ngoài scope → 404, vết không chứa id / tên).
- EXPLAIN: action đọc dùng chung query màn (`list*Ids` + deferred join đã có index); bảng mới `conversation_group_request` — index `(channel_account_id, status, created_at, id) INCLUDE (requester_id)` + partial pending (migration 023b).
- **Chưa nghiệm thu với provider thật:** tạo nhóm Zalo thật (cần quét QR tài khoản nghiệm thu — Q-003); embedding OpenAI không dùng trong 023b.

**ISSUES DISCOVERED:**
- Q-042 (môi trường): integration kênh đỏ khi demo `channels` chạy — đề xuất DB nền tảng riêng cho test hoặc CI sạch.
- Q-044: ca `update-quote-validity` cần báo giá đã gửi trong seed.
- Q-045: test token `sales-unit` chập chờn (~1/30).
- Q-046: `ai:live` cần Redis DB riêng (không chung DB 15 với integration).
- `e2e:http` trước đây dùng Redis của `.env` (chung demo) → nay DB test 15 + `E2E_WORKERS` chọn worker (không bật worker kênh khi spec không cần).

**GIẢ ĐỊNH ĐÃ CHỌN:** DC-306 … DC-313 (`DECISIONS.md`). **Lệch prototype:** PD-008 (thẻ xem trước có khối "đổi gì" + Sửa). **Lệch spec:** DV-021 (`yaml` cho tools/ai-live), DV-022.
- Contract FE ↔ BE: assistant (preview / edit / approval) — zod `packages/shared/src/api/assistant.ts` dùng chung, test web + api xanh.

**ĐỐI CHIẾU STANDARDS** (mục APPLICABLE STANDARDS của TIP; luật máy không kiểm soát tay khi review diff):

| Standard | Tuân thủ (file:dòng / test) | Lệch |
|---|---|---|
| `actions/action-registry.md` §1–13 | Mọi ghi qua executor; preview mọi action ghi có handler (`packages/core/test/assistant-coverage.debt.ts:3` rỗng); mô tả có ví dụ / ví dụ sinh từ khuôn (`packages/core/src/ai/assistant/catalog.ts` `exampleInput`); §12 ma trận riêng 220 file `apps/api/test/integration/actions/*.action.test.ts`, ô không áp dụng qua `na()` (`helpers/action-matrix.ts:87`); mục lục `fixtures/action-matrix.ts` | — |
| `authz/rbac-permissions.md` D32 / D51 | Quyền hiện hành mỗi lần agent gọi tool (`packages/core/src/ai/agents/current-authority.ts:40`); mã ngoài scope không đổi id (`reference-resolver.ts` `lookup` + `visible*`); action đọc giữ permission route (`packages/actions/src/reads/*`) | — |
| `ai/agent-gateway.md` | Chỉ action có handler thật lộ cho model (`catalog.ts` `findActions(..., implemented)`); tool agent ∩ quyền người ra lệnh (`agent.runtime.ts:85`) | — |
| `ai/eval.md` | 30 ca bất biến + mix kiểm (`tools/ai-live/src/cases.ts` `loadDefault`); ca bổ sung báo cáo riêng (`--cases`); lỗi mạng / provider = `error`, không pass (`tools/ai-live/src/runner.ts` `INFRA`); an toàn chấm trước (`safety.ts` `judge`) | — |
| `domain/custom-fields.md` §3b / §6 | `custom-schema.ts:53` `withCustomSchema` (ai = true, theo vai trò); chặn ô không ai trước executor (`aiCustomErrors`); `appointment.update` nhận custom | — |
| `api/response-envelope.md` | 202 `preview_required` / `approval_required` xử lý cạn (`read-dispatch.ts` `acceptedOutcome` + `never`; `apps/web/src/shared/actions/useAction.ts:2`) | — |
| `database/tenant-db.md` | Action đọc qua `TenantDbResolver` + `scopeFilter` của màn; không `workspace_id` ở bảng mới | — |
| `database/indexing.md` | `conversation_group_request_account_idx (channel_account_id, status, created_at, id) INCLUDE (requester_id)` + partial pending (`migrations/20261102002310_assistant_groups/migration.sql:33`); action đọc dùng `list*Ids` + deferred join sẵn có | — |
| `events/outbox.md` | `conversation.create_group` ghi yêu cầu + outbox cùng transaction (`inbox/actions/conversation-create-group.handler.ts:52`) | — |
| `domain/concurrency.md` · `state-machine.md` | `appointment.update` khoá dòng + `if_version`, EXCLUDE ở DB (`booking/actions/appointment-update.handler.ts:2`); nhóm Zalo `unknown` không gọi lại (`channels/jobs/create-group.processor.ts:3`) | — |
| `domain/validation-defaults.md` · `money-time-numbering.md` | Preview xoá có tên + mã + hệ quả; tiền string VND trong output / preview | — |
| `documents/templates.md` | Không đổi luật commerce; preview chứng từ không render / gửi | — |
| `channels/omnichannel-adapter.md` · `integrations/provider-ports.md` | `createGroup` sau adapter + capability (`packages/channels/src/zalo-personal/adapter.ts:123`); worker giữ lease | — |
| `ops/observability-security.md` | Model không nhận bí mật (`read-dispatch.ts:10` SECRET, `safeForModel`); vết ai:live che bí mật, SĐT / email thành dấu vân tay (`run-trace.read.ts:19`) | — |
| `ui/frontend-structure.md` · `interaction-patterns.md` §4.3 · `prototype-parity.md` · `i18n/i18n.md` | Modal / hook / component tách (`features/assistant/{components,hooks}`); toast chờ duyệt; parity `assistant:card-preview` 0,06%; i18n 100% | PD-008 |
| `code/file-size-module-layout.md` · `code/testing.md` | `lint:size` 2010 file không vượt trần; test ở file riêng | — |
| `workflow/git-flow-ci.md` | Nhánh `tip/023b-assistant-coverage` từ `origin/dev`, rebase trước PR, PR vào `dev` | — |
| Thư viện ngoài stack | `yaml` cho `tools/ai-live` | DV-021 |

**SUGGESTIONS FOR CHỦ THẦU:**
- TIP-023c: Trợ lý theo màn / Generative UI dùng `readback` + thẻ `changes` đã có.
- Thêm hướng dẫn prompt "tra giá bằng product.search trước khi hỏi người dùng" nếu eval sau còn ca model hỏi lại giá (đang là "model chọn sai", không hạ chuẩn).
- TIP-036–039 thêm ma trận khi cài handler (mục lục `fixtures/action-matrix.ts` tự đỏ nếu action đã có handler mà thiếu file).
