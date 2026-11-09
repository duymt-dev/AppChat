# TIP-019c — Completion Report

## Pha 1 / 3 — hợp đồng + quyền nguồn + kiểm bằng chứng (PR xếp chồng #158)

**Rà trước khi làm (code thật)**
1. 019b có `trustedParent` / `reuseChild` (run con theo khoá idempotent, phát lại không gọi model lần hai) và `runOnce` gọi model ngoài transaction — dùng nguyên, không gọi SDK trực tiếp.
2. Bộ đọc có quyền: `visibleConversation` (scope inbox + quan hệ khách D32), `visibleContact` (scope crm), FieldPolicy `fieldView` + `projectCustom` (045b), `inSameFamily` (015e). Agent: `ctx.servedConversationId` giới hạn hội thoại đang trực; quyền agent = tool đã cấp ∩ người ra lệnh do executor kiểm.
3. Gateway không có JSON-schema provider → kiểm JSON ở ứng dụng (`parseModelJson` + validator), sai → `failed` có kiểu, không regex chữ thô thành kết quả.
4. Manifest: thêm `packages/ai/src/testing/mock-utility.ts` (+1 dòng mock-model), `crm/public.ts` export `inSameFamily`, `tip-owners.ts` — đã ghi vào manifest trước commit.

**FILES (P1)**
- C `packages/shared/src/ai/utility-schemas.ts`, `utility-evidence.ts` (+ 2 test) · M `packages/shared/src/index.ts`
- C `packages/actions/src/ai-utilities.ts` (+ test) · M `packages/actions/src/index.ts`
- C `packages/core/src/ai/skills/{utility.handlers,utility.providers,utility-run,utility-sources,utility-prompts}.ts`, `sources/{conversation,contact,types}.ts` · M `ai.module.ts`, `crm/public.ts`, `kernel/actions/tip-owners.ts` · C `packages/core/test/ai-utilities.test.ts`
- C `packages/ai/src/testing/mock-utility.ts` · M `mock-model.ts`
- C `apps/api/test/integration/ai-utilities.test.ts`
- M i18n `apps/web/messages/{vi,en}/actions.json` (title + desc 4 action)

**Giả định đã chọn**
- P1 trả envelope `{utility_run_id, schema_version, state, proposal?}` trực tiếp từ action; `utility_run_id` = run con 019b. Chặn đầu ra thô ở đọc run chung + GET kết quả để P2 (bảng utility_operation) — chưa tuyên bố AI-UTILITY-EVIDENCE / READONLY ĐẠT.
- Đầu ra sai sau một lần → `failed` (chưa có lần sửa thứ hai) — lần sửa có tính phí làm ở P2 cùng operation.
- Ghi chú nội bộ chọn đích danh cần `inbox.reply` (quyền tạo ghi chú `note.add`).

**TEST (P1)**
- shared `src/ai/utility-*.test.ts` 15/15 · actions `test/ai-utilities.test.ts` 2/2 · core `test/ai-utilities.test.ts` 5/5 + hồi quy assistant-implemented-tools / actions-unit / agents-ui-unit / assistant-coverage / cross-db-handlers 39/39.
- api integration (`db:test-reset` trước) `test/integration/ai-utilities.test.ts` **8/8**: đầu ra có kiểu + trích dẫn cắt từ tin thật; CSKH ngoài scope 404 không tạo run; tin thu hồi / tin hội thoại khác 404; vai trò thiếu crm.view 403; khách không lộ SĐT / email; score_lead null khi thiếu bằng chứng, khách không đổi; nguồn > 16 000 ký tự 422 không run; nguồn chứa chỉ dẫn độc không đổi tin / báo giá / đơn / khách / outbox gửi.

**ĐỐI CHIẾU STANDARDS (P1)**

| Standard | Kết quả |
|---|---|
| `actions/action-registry.md` | 4 action read + skill, mô tả EN có ví dụ, title i18n, invalidates rỗng, không undo; TIP chủ 019c; preview chỉ giải nguồn + `uses_credit` |
| `authz/rbac-permissions.md` | assistant.use + quyền đọc domain gốc mỗi nguồn (403), scope bản ghi (404), agent trực kênh chỉ hội thoại đang trực |
| `ai/agent-gateway.md` | run consult qua AiRunner + CreditMeter, cha 019b, generator không tool, nguồn trong lượt user (chống chèn chỉ dẫn) |
| `database/indexing.md` | tin đích danh: `id IN (…) AND conversation_id` (PK + `message (conversation_id, created_at, id)`), ≤ 30; không truy vấn lịch sử không chặn; không index mới |
| `api/response-envelope.md` | 422 too_large / schema; 403 / 404; 402 credit; 409 source_changed; 502 lỗi model |
| `ops/observability-security.md` | run chỉ lưu tham chiếu (không chữ nguồn); JSON model chặn khoá nguy hiểm / HTML; khách chiếu cột hẹp |
| `code/file-size-module-layout.md` | file ≤ 220 dòng; test file riêng |
| `plans/COMMERCE-DECISIONS.md` | không đụng; tiền chỉ trích chuỗi VND, không quy đổi / làm tròn; lead không phải xác suất / tín dụng |

**Còn lại (P2, P3):** utility_operation + công bố sau kiểm + chặn đọc run / SSE / lịch sử + khôi phục; GET kết quả; UI menu / form / result (Trợ lý + Hộp thư), E2E mock / http, parity; ai:live 8 ca. AC5, AC7, AC8 chưa.
