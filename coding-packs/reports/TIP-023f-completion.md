### COMPLETION REPORT — TIP-023f

**STATUS:** DONE — 5 pha, PR xếp chồng: #173 (P1) → #174 (P2) → #175 (P3) → #176 (P4) → PR P5 (nhánh `tip/023f-p5-close`). SHA từng pha ở bảng tiến độ `goals/GOAL-RELEASE.md` dòng 36.

**TÓM TẮT:** Trợ lý hiểu NỘI DUNG tệp / ảnh / email chứ không chỉ tên tệp. Tải lên (`POST /files`, purpose attachment) → `assistant.attachment_prepare` (useAction, agentGrantable=false) → artifact `assistant_input_artifact` (idempotent theo chủ / nháp / digest / phiên bản parser, lease + fence) → worker ROLE=ai parse trong tiến trình con cô lập (`dist/parser.cjs`, `node --permission`, chặn mạng, 30s, RSS ≤ 128 MiB, DC-425) → phần riêng `assistant_input_part` có vị trí thật (trang PDF, đoạn DOCX/HTML, bản ghi + dòng vật lý CSV, sheet/dòng XLSX, .eml bỏ header vận chuyển, PNG/JPEG ≤ 4096px / 16MP) → lượt gửi mang `inputs[{artifact_id, revision}]`, buộc vào phiên trong transaction (hash gồm id/revision/digest; gửi lại → cùng run, đổi danh sách → 409) → engine dựng nội dung trước MỖI lời gọi model (cửa sổ 32k ký tự + 4 ảnh, đánh dấu dữ liệu không tin cậy, kiểm lại quyền nguồn), `stripMedia` trước khi lưu. Ảnh chỉ đi tới route khai `params.vision` (ModelRoutesPanel "Đọc ảnh"); không có → `VISION_UNAVAILABLE`, giữ nháp. UI: khay tệp (tiến trình / lý do lỗi / gỡ), chụp màn hình một khung có xem lại, đọc chính tả trình duyệt có báo trước + xem lại + chèn tại con trỏ, không bao giờ tự gửi; gửi chỉ tệp → server điền câu hỏi trung tính.

**FILES CHANGED:** theo manifest `tips/manifests/TIP-023f-files.md`; lệch DV-095 (tên migration), DV-096 (seam parser), DV-097 (bind.ts, `params.vision`, `ATTACHMENT_NOT_PREPARED`), DV-098 (công tắc vision, `infra/parser`, fixture ai:live, privacy). Chính:
- `packages/shared/src/api/assistant-input.ts`, `packages/actions/src/assistant-input.ts`, Prisma `assistant-input.prisma` + migration `20261110040000_assistant_input`, `packages/channels/src/email/parse-upload.ts`.
- `packages/core/src/ai/assistant/input/*` (artifact-store, actions, prepare, read, bind, hydrate, extract, document-parts, table-parts, images, parse-bounds, sandbox, parse-worker, processor, queue, recovery, installer), `packages/ai/src/gateway/input-parts.ts`, router vision.
- `apps/api/src/http/ai/assistant.controller.ts` (`GET /v1/assistant/input/:id(/parts)`, lượt chỉ tệp), `apps/worker` tsup entry `parser.cjs`.
- Web `features/assistant/{components/AttachmentTray,AttachmentPreview,InputSourcePicker,VoiceInput; hooks/attachment-store,useAssistantAttachments,useAssistantCapture,useAssistantDictation}`, mock `assistant-input-store` + domain; `features/platform-admin/components/ModelRoutesPanel.tsx` (vision).
- `infra/parser/*`, `fixtures/ai-eval/assistant-input*`, `tools/ai-live/src/input-judge.ts`, `tools/parity/modules/assistant-input.ts`.

**TEST RESULTS** (phạm vi TIP, D59 + luật goal: không full integration / full E2E):
- Unit: actions 23/23; channels 88/88; ai 77; core 892 (+1 skip); web vitest 476/476 (gồm useAssistantAttachments 6, useAssistantDictation 5, useAssistantCapture 3, mock assistant-input 4).
- Integration API: `assistant-input.test.ts` 5/5 (prepare idempotent → sandbox → ready theo trang, CSV nhiều dòng, ảnh → image_ref, tệp hỏng → failed có lý do, 404 người khác, ≤ 5 tệp, GET routes, EXPLAIN index draft / work); `assistant-input-turn.test.ts` 4/4 (PDF tới model kèm trang, gửi lại cùng run, 409, ATTACHMENT_NOT_PREPARED, VISION_UNAVAILABLE vs bytes ảnh tới route vision, nguồn mất quyền → không khả dụng); `platform-config.test.ts` 6/6 (gồm route vision).
- Integration worker: `parser-sandbox.test.ts` 4/4 (mạng bị chặn, ghi đĩa bị chặn, quá giờ / quá RSS → giết cây, bundle thiếu → parser_isolation_unavailable).
- E2E mock: assistant-input, assistant, data-transfer, genui, screen-assistant, shell, platform-admin — xanh. E2E http: assistant-input (PDF thật → ready → gửi → model nhận `<attachment name="bao-gia.pdf" kind="pdf"`; PDF mã hoá → lý do lỗi, Gửi khoá) + assistant + platform-admin — 6 passed.
- Parity: `assistant-input:tray` 2.19% (< 5%, mask D29 + PD-026); `assistant:*` 6/6 không hồi quy.
- ai:live `fixtures/ai-eval/assistant-input.json` trên `cx/gpt-6-sol`: **8/8 ca, 24/24 lần, an toàn 0** (`reports/ai-live-assistant-input-2026-11-10.md`) — PDF VI, DOCX EN, chỉ ảnh, .eml, ảnh chụp màn hình, CSV, tiêm lệnh ở Chat và Cowork (không thao tác ghi nào chạy).
- depcheck 116 cảnh báo = baseline, 0 lỗi; lint:size / lint:tokens / lint:masks sạch; i18n:check 100%. Lint + typecheck actions / shared / core / web / api / ai-live sạch (cổng P5).

**ĐỎ CÓ SẴN (không thuộc 023f):** `apps/api/test/integration/genui-context.test.ts` ca "thực thể không có action get → chỉ route" — stash toàn bộ thay đổi 023f vẫn đỏ y hệt trên dev.

**ISSUES DISCOVERED:**
1. Ảnh chữ số vẽ tay dạng khối model không đọc được (model vẫn nhận ảnh) → fixture ảnh render chữ bằng Chromium, đọc 100%.
2. PowerShell 5.1 đọc sai `.ps1` UTF-8 không BOM → thêm BOM cho `build.ps1` / `run.ps1`.
3. Model giả của stack http chỉ vọng 200 ký tự đầu → E2E http khẳng định trên header `<attachment … kind="pdf"`.
4. `MockHandler` import vòng làm depcheck tăng 118 → kiểu cục bộ, về baseline 116.

**ĐỐI CHIẾU STANDARDS** (APPLICABLE STANDARDS của TIP):

| Standard | Tuân thủ (file / test) | Lệch |
|---|---|---|
| `actions/action-registry.md` | 4 action `assistant.attachment_prepare/remove/get/read` canonical qua Executor, mutation agentGrantable=false, preview; FE ghi chỉ bằng `useAction` | — |
| `ai/agent-gateway.md` | Dựng phần qua port trung tính `input-parts.ts` (packages/ai không import core/DB); lọc route theo `needs.vision`; usage qua đường đo 019b | — |
| `ai/eval.md` | ai:live 8 ca ×3, model ghi trong report, an toàn 0 | — |
| `ai/generative-ui.md` | Lượt chỉ tệp không sinh thẻ / thao tác tự động | — |
| `api/response-envelope.md` | `{data}` / lỗi 404 · 409 · 413 · 422 · 503 `VISION_UNAVAILABLE` / `ATTACHMENT_NOT_PREPARED` | — |
| `authz/rbac-permissions.md` | `assistant.use`; artifact chỉ chủ; `checkFile` kiểm lại nguồn ở prepare / read / hydrate | Giao agent con chờ 023d (Giả định) |
| `database/tenant-db.md` · `indexing.md` | Bảng tenant không workspace_id; index draft / session / work / parts theo §5.2, INCLUDE không có cột rộng; EXPLAIN trong integration | — |
| `domain/concurrency.md` | Prepare idempotent, lease + fence, publish chỉ khi fence khớp, quét việc chờ không phụ thuộc Redis | — |
| `domain/validation-defaults.md` | ≤ 5 tệp, 25 MiB / tệp, 50 MiB tổng, kiểm cả client lẫn server; loại theo magic bytes | — |
| `ops/observability-security.md` | Parser cô lập (DC-425), lỗi không lộ stack / đường dẫn; không lưu base64 / URL ký vào lịch sử | Launcher OS chưa nghiệm thu VPS |
| `ui/frontend-structure.md` · `interaction-patterns.md` · `prototype-parity.md` | Composer 142 dòng là điều phối; components / hooks tách; parity 2.19% + PD-026 | PD-026 (khay không có trong prototype) |
| `i18n/i18n.md` | Chuỗi mới vi + en (assistant.json, platformAdmin.json); i18n:check 100% | — |
| `code/file-size-module-layout.md` · `testing.md` | Mọi file mới dưới trần; test ở file riêng | — |
| `workflow/git-flow-ci.md` | Nhánh `tip/023f-*`, PR vào `dev` mỗi pha, xếp chồng | — |

**GIẢ ĐỊNH ĐÃ CHỌN:**
- Privacy (§3.5): artifact thuộc người dùng (owner_user_id), không có contact_id → không vào inventory "Quên khách" (adapter `ai` kiểm kê theo hội thoại khách). Nội dung đã parse chỉ đọc lại qua `checkFile` hiện hành; tệp nguồn bị chặn / xoá → hydrate báo không khả dụng (test). Nháp chưa buộc tự dọn 24h (recovery). DV-098.
- Vision: Chủ nền tảng tự khai "Đọc ảnh" cho route chat; mặc định tắt = không gửi ảnh (fail closed). Probe ảnh tổng hợp là Q-064 (mở, không chặn).
- Agent con được chọn (§3.3 selected-child) dùng chung đường dựng khi 023d nối `selected_agent_id` qua request / resume — COVERAGE `INPUT-CURRENT-HYDRATION` MỘT PHẦN.

**CHƯA NGHIỆM THU:**
- Launcher OS `infra/parser` (systemd cgroup + netns / Job Object + AppContainer) trên VPS — DC-304; dev dùng sandbox tầng Node (DC-425).
- Đọc chính tả nói thật VI/EN và chụp màn hình thật trên trình duyệt hỗ trợ — chỉ có bằng chứng bằng recognizer / getDisplayMedia giả trong E2E.
- Probe ảnh route (Q-064).
