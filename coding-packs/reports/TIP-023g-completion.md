### COMPLETION REPORT — TIP-023g

**STATUS:** DONE — nhánh `tip/023g-record-ai-entrypoints` (xếp chồng #183), một pha; SHA ở bảng tiến độ `goals/GOAL-RELEASE.md` dòng 43.

**TÓM TẮT:** Bảy nút AI trên bản ghi (⚡ / ✦ ở dòng Báo giá / Hợp đồng / Đơn / Ticket / Lịch — cả lịch hẹn lẫn follow-up, tab AI Đề nghị thanh toán / Sản phẩm) thôi là toast giả. Mỗi nút mở Trợ lý gắn đúng bản ghi, server đọc lại theo quyền người bấm; Sản phẩm sinh đề xuất combo / chiến dịch chỉ đọc có hàng rào.
- **Hợp đồng** (`packages/shared/src/api/record-assistant.ts`):
  - `record_intent` đóng: 8 thực thể × cặp ý định khai sẵn; `entity_id` / `request_id` là UUID; `user_task` ≤ 2000.
  - DTO đề xuất `combo` (món ≤ 10, `product_id` + `qty`) / `campaign` (kênh zalo | email, tiêu chí bằng lời) + trạng thái binding.
- **Đọc lại bản ghi** (`ai/assistant/record-intent/{registry,context}.ts`):
  - Bằng action đọc chuẩn qua executor, ngữ cảnh Trợ lý của người bấm. Follow-up đọc qua `visibleFollowUp` (insights — scope crm, còn mở, mốc nguồn = tương tác cuối).
  - Không thấy / ngoài scope / đã xoá → 404 đồng nhất; thiếu quyền nền → 403; `displayed_version` lệch → 409.
  - Lượt Trợ lý mang `record_intent` → ngữ cảnh run = `{route, surface: drawer, entity, id}`, bỏ selection client gửi (`genui/context.ts` `resolveRecordTurnContext`). Dòng ngữ cảnh prompt kèm tên action đọc chuẩn (`assistant-prompt.ts`), không kèm dữ liệu bản ghi.
- **Đề xuất combo / chiến dịch** (`record-intent/{admission,proposal,projection,publication,recovery}.ts`):
  1. Cấp binding `record_proposal` theo (người, request_id) TRƯỚC model; khác input → 409; đang sinh trong lease → 409.
  2. Run 019b → một lời gọi schema không tool, đầu ra protected; combo: enum `product_id` = ứng viên đọc qua `product.search` theo quyền (≤ 20); schema không có khoá giá / tồn kho / số người nhận.
  3. Lưu chữ riêng → kiểm lại nguồn + từng món theo quyền hiện tại, giá lấy từ `product.get` → CAS công bố (phase + validation_generation).
  - Dừng cứng (credit / huỷ) không thành đề xuất. Đọc lại khi nguồn mất quyền → vô hiệu `source_unavailable`.
  - Khôi phục: adapter `ai.record_proposal` trong `AiUtilityRecoveryInstaller` (ROLE=jobs) — sinh dở quá 120 s → failed USAGE_UNKNOWN (không gọi lại provider); chữ kiểm dở > 24 h → vô hiệu.
  - Privacy: erase kind `record_proposal` vô hiệu binding (đề xuất sản phẩm không chứa dữ liệu khách — inventory không liệt kê).
- **API:** `POST /v1/assistant/messages` nhận `record_intent`; `POST /v1/assistant/record-proposals`; `GET /v1/assistant/record-proposals/:requestId` (không phải UUID → 404).
- **FE** (`apps/web/src/shared/assistant/record-intent/`):
  - Store phạm vi theo module (thế hệ tăng khi đổi bản ghi — kết quả trễ của bản ghi cũ bị bỏ; lần gắn workspace đầu giữ phạm vi vừa mở).
  - `RecordAssistantPanel` (mở = 0 lời gọi; chọn ý định; việc; Gửi), `RecordDrawerSection` (drawer module hiện khung gắn + "Bỏ gắn"; ẩn nội dung theo màn), `EmbeddedRecordAssistant` (tab AI hoá đơn / sản phẩm), `RecordIntentCard` (thẻ đề xuất "chưa tạo gì", món + giá danh mục).
  - Việc gợi ý của Đề nghị thanh toán chỉ trích vào ô việc, Gửi mới chạy.

**FILES CHANGED:** theo manifest `tips/manifests/TIP-023g-files.md`; lệch DV-105. Chính:
- `packages/shared/src/api/{record-assistant,index}.ts`.
- `packages/core/src/ai/assistant/record-intent/*` (7 file), `assistant/{assistant.service,turn.service,assistant-prompt}.ts`, `assistant/genui/context.ts`, `runs/runtime.providers.ts`, `privacy/{cleanup,inventory}.ts`, `public.ts`; `insights/{public,services/follow-ups}.ts`.
- `packages/db/prisma/tenant/record-proposal.prisma` + migration `20261111090000_record_proposal_publication`.
- `packages/ai/src/testing/{mock-record-proposal,mock-model}.ts`; `apps/api/src/http/ai/assistant.controller.ts`.
- Web: `shared/assistant/{record-intent/*,useScreenAssistant,ScreenAssistantThread,assistant-client,turn-stream}.ts(x)`, `features/{quotes,contracts,orders,tickets}/columns.tsx`, `calendar/components/ListView.tsx`, 5 drawer AI, `invoices/components/DetailTabs.tsx`, `products/components/{DetailTabs,ProductDrawer}.tsx`, mock `domains/{record-assistant,assistant}.ts`, `messages/{vi,en}/common.json`.
- Test:
  - `packages/core/test/record-ai-{context,proposals,authority,receipts}.test.ts` + `fixtures/record-ai-harness.ts`.
  - `apps/api/test/integration/record-ai-{entrypoints,privacy}.test.ts`, `apps/worker/test/integration/record-ai-composition.test.ts`.
  - `apps/web/src/shared/assistant/record-intent/record-entrypoints.test.tsx`, `apps/web/e2e/record-ai.mock.spec.ts`, `apps/web/e2e/http/record-ai.spec.ts`.
- ai:live: `fixtures/ai-eval/record-ai-{entrypoints.json,seed.mjs}`, `tools/ai-live/src/{record-judge,cases,runner,cli}.ts`. Parity: `tools/parity/manifests/record-ai.ts`.

**TEST RESULTS** (phạm vi TIP, D59 + luật goal: không full integration / full E2E):

| Phạm vi | Kết quả |
|---|---|
| Unit core | 1017 (+1 skip) — record-ai-* 14 |
| Unit shared / ai / api / worker / ai-live | 182 / 91 / 11 / 7 / 87 |
| Unit web (shared + 7 module bị đổi) | 349 (gồm record-entrypoints 5) |
| Integration API (Postgres 16 + Memurai thật) | record-ai-entrypoints 4 + record-ai-privacy 3 = 7 — gồm EXPLAIN 100k binding (seek `record_proposal_request_key`, quét khôi phục `record_proposal_recovery_idx`, không Seq Scan) |
| Worker (ROLE=ai propose + ROLE=jobs adapter khôi phục) | 2/2 |
| E2E mock record-ai (`E2E_PORT=3537`) | 8 passed (8 skipped = dự án mobile) |
| E2E http record-ai (`E2E_HTTP_PORT=3538`) | 1 passed (1 skipped mobile) |
| Parity | `record-ai:quote-bound` 0.0092 · `record-ai:product-tab` 0.0072; quotes / contracts / orders / calendar / invoices / products list + detail PASS (≤ 0.0400); tickets list / detail 0.0421 / 0.0491 (nợ sẵn có, ≤ 5%) |
| ai:live record-ai-entrypoints (10 ca × 3 lượt, model thật qua 9router) | **10/10, 30/30 lượt, an toàn 0, ĐẠT** — `coding-packs/reports/ai-live-record-ai-entrypoints-2026-11-11.md` |
| Build api / worker / web (mock) | sạch |
| Typecheck · lint gói đổi | sạch (web: 22 cảnh báo có sẵn ngoài phạm vi, 0 lỗi) |
| depcheck | 0 vi phạm mới (82 đã biết) |
| lint:size / lint:tokens / lint:masks / i18n:check | sạch / 100% |

Đỏ có sẵn, ngoài phạm vi: `packages/db/test/prisma-stubs.test.ts` 2 ca (như TIP-021b — bản đồ OWNERS thiếu các file tenant đã có trên base; không thuộc manifest). `record-proposal.prisma` ghi đúng header sở hữu TIP-023g.

**ISSUES DISCOVERED:**
1. Vòng import: `record-intent/context.ts` → `insights/public` kéo module jobs → Trợ lý (10 suite core gãy). Sửa: import thẳng service follow-ups.
2. depcheck: `billing.jobs → runtime.providers → record-intent/recovery → meta-tools → … channels` tạo 15 vòng mới. Sửa: hàm quét `recoverProposals` chuyển sang `publication.ts` (chỉ phụ thuộc admission).
3. `GET /record-proposals/:id` 500: đọc lại nguồn với `runId` rỗng. Sửa: dùng `run_id` của binding.
4. E2E mock: lần gắn workspace đầu (`'' → ws`) xoá phạm vi vừa mở → drawer không hiện khung gắn. Sửa store + test đơn vị.
5. ai:live: (a) seed lịch hẹn cần dịch vụ có thời lượng + KTV có kỹ năng → dùng dịch vụ live-seed, KTV fixture riêng; (b) quá nhiều đăng nhập liền → giới hạn OTP theo email 5 / 15 phút, chờ hết cửa sổ; (c) follow-up seed bị coi là cũ (mốc nguồn ≠ tương tác cuối) → seed đặt cả hai cùng mốc; (d) model trả lời "chưa tra được" 2/3 lượt báo giá khi ngữ cảnh chỉ có id → dòng ngữ cảnh kèm tên action đọc chuẩn; (e) đề xuất `STRUCTURED_MALFORMED` (model đặt khoá tiếng Việt — router không ép strict) → chỉ dẫn nêu đủ khoá tiếng Anh. Sau sửa: 30/30.

**ĐỐI CHIẾU STANDARDS** (APPLICABLE STANDARDS của TIP):

| Standard | Tuân thủ (file / test) | Lệch |
|---|---|---|
| `ai/agent-gateway.md` | Đề xuất qua engine structured sẵn có (một lời gọi, không tool, đầu ra protected); core không import SDK; usage ghi trước kiểm schema | — |
| `ai/generative-ui.md` | Lượt theo bản ghi dùng chung luồng 023c (SSE / phiên / thẻ xác nhận); ngữ cảnh do server đọc lại, client không cấp quyền | — |
| `ai/eval.md` | ai:live 10 ca × 3 (8 thực thể + 2 đề xuất + Sales ngoài scope), chấm theo vết run + API thật (getter đúng id, không ghi, giá danh mục, replay cùng binding, không tạo bản ghi, 404) | — |
| `actions/action-registry.md` | Không action mới; mọi đọc qua getter chuẩn + executor; không đường ghi thứ hai (đề xuất không ghi nghiệp vụ) | — |
| `authz/rbac-permissions.md` | Quyền / scope người bấm kiểm TRƯỚC model; 404 đồng nhất (không lộ tồn tại); đọc lại lúc công bố + lúc xem; Sales own 404, CSKH thiếu quote.view 403 (`record-ai-privacy.test.ts`) | — |
| `ui/frontend-structure.md` · `interaction-patterns.md` | Khung gắn bản ghi ở `shared/assistant/record-intent` (feature không import nhau); drawer giữ orchestrator; gợi ý không chạy thẳng (IP-2) | — |
| `ui/prototype-parity.md` | Đầu drawer giữ prototype; thân mới che có lý do (PD-027); màn danh sách / chi tiết < 5% | PD-027 |
| `i18n/i18n.md` | `common.recordAi.*` + `screenAi.err.*` vi + en, i18n:check 100% | Chuỗi dùng chung thay 8 tệp module (DV-105) |
| `api/response-envelope.md` | `{ data }` / `{ error: { code, fields } }`; 404 / 403 / 409 / 422 phân loại rõ | — |
| `database/tenant-db.md` · `indexing.md` | Bảng tenant không `workspace_id`; unique `(user_id, request_id)` + `run_id`; index khôi phục partial `(phase, updated_at, id) INCLUDE (validation_generation, run_id)`; EXPLAIN 100k | Tên migration (DV-105 mục 1) |
| `ops/observability-security.md` | Việc người dùng nằm trong khối dữ liệu (không vào system); run input không chứa việc / dữ liệu sản phẩm; chữ thô chỉ ở `private_generation` tới khi công bố | — |
| `code/testing.md` | Test ở file riêng theo manifest; integration / E2E chỉ phạm vi TIP | — |

**GIẢ ĐỊNH ĐÃ CHỌN:**
- Ứng viên combo = 20 sản phẩm đầu của `product.search` theo quyền (bỏ nháp) — không xếp hạng theo lịch sử mua (chưa có tín hiệu trong phạm vi TIP).
- Chiến dịch chỉ là nội dung + tiêu chí bằng lời. Thẻ đề xuất chưa có nút "Áp dụng" ở tab Sản phẩm (khung có điểm gắn `onApply` cho bước tạo của người dùng ở TIP sau) — TIP này dừng ở đề xuất chỉ đọc, không tạo sản phẩm / chiến dịch.
- Mock FE nhận id fixture không phải UUID.

**SAU MERGE:** `db:migrate-tenants` cho migration `20261111090000_record_proposal_publication` + `db:setup` (template) + build api / worker.

**CHƯA NGHIỆM THU:** không có (ai:live chạy model thật qua 9router).
