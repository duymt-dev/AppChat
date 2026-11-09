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

## Pha 2 / 3 — fence công bố `utility_operation` + GET kết quả + khôi phục (nhánh `tip/019c-ai-utilities-p2`, từ `origin/dev` sau merge #159)

### Rà trước khi làm (code thật)

| Mục | Hiện trạng trước P2 | Xử lý |
|-----|---------------------|-------|
| Lộ chữ thô | `run-detail.ts` trả `result_text = ai_run.output.text` cho MỌI run completed người xem đọc được → run tiện ích lộ JSON thô model chưa kiểm | Ẩn `result_text` khi `title` ∈ `UTILITY_ACTIONS` (phủ cả run gốc lẫn run con sửa lại — join theo `utility_operation.run_id` sẽ bỏ sót run sửa) |
| SSE / lịch sử Trợ lý | `RunStream`, `genui/history`, `sessions` chỉ dựng trong `turn.service` (kind assistant) | Không áp cho run `consult` của tiện ích — không cần sửa |
| Gọi lặp | P1 gọi model mỗi request, không khoá | `utility_operation` khoá (actor_scope, action_id, invocation_key) — cấp bền trước model |

### FILES

Theo manifest `tips/manifests/TIP-019c-files.md` (thêm 6 dòng P2: `utility-revalidate.ts`, `utility-validators.ts`, `billing.jobs.module.ts`, `openapi/document.ts`, 2 file integration). Migration `20261109020000_ai_utilities` (manifest khai `20261102001930` — đổi tên để xếp SAU migration đã merge, runner lấy version = tên cuối; dòng theo dõi ở DB local đã đổi tên tương ứng).

### Giả định đã chọn

1. **`invocation_key`**: gọi qua tool = khoá con 019b; UI = Idempotency-Key; không có cả hai = băm input. Cùng Idempotency-Key + body khác bị chặn 409 `idempotency_key: mismatch` ở executor TRƯỚC fence tiện ích; fence vẫn tự kiểm (409 `invocation_key: mismatch`) cho đường tool / gọi trực tiếp.
2. **Sửa một lần** là run CON của run gốc (`childKey = repair:<operation>`) — cùng root / ngân sách 019b, mỗi lượt gọi model một `ai_run`. Handle trả người gọi luôn là run gốc.
3. **Khôi phục** (`ai.utility` trên lịch 045b, ROLE=jobs): không gọi lại model. Chưa có chữ thô → `failed/unknown`; có chữ thô → giải lại nguồn theo refs bằng danh tính hệ thống (chỉ để biết dữ liệu còn / đổi, KHÔNG dựng lại quyền theo vai của actor gốc — quyền hiện tại vẫn kiểm ở mọi lần đọc qua GET kết quả / `readableRun`), chạy đúng validator + tham số đã lưu trong `source_bindings.params`. Nguồn bị thu hồi / xoá / gộp → `invalidated`; chữ dán (không lưu chữ nguồn, §1.4) → `failed`.
4. `run_epoch` (= `workspace.authzEpoch`) lưu lúc cấp; chưa so ở P2 — dùng cho vô hiệu theo đổi quyền ở pha sau nếu spec yêu cầu.

### TEST (chạy thật)

| Lệnh | Kết quả |
|------|---------|
| `pnpm --filter @appchat/core test` | 133 file / 796 test pass (gồm `ai-utilities.test.ts` 9 ca: fence, idempotent, 409 hash, sửa 1 lần, sai 2 lần → failed, trích dẫn bịa, 402 / cancelled / 502, recheck 409, biên 16 000) |
| `pnpm --filter @appchat/api test:integration test/integration/ai-utility-results.test.ts test/integration/ai-utilities.test.ts test/integration/ai-run-detail.test.ts` | 3 file / 19 test pass |
| `pnpm turbo run lint typecheck --filter=@appchat/core --filter=@appchat/api --filter=@appchat/db --filter=@appchat/worker` | xanh |
| `pnpm --filter @appchat/api test` | 2 file / 11 pass |
| `pnpm turbo run lint typecheck test --filter="...[origin/dev]"` | 12/12 task xanh (gồm db `prisma-stubs` — thêm `tenant/ai-utilities` → 019c sau khi CI lần 1 đỏ) |
| `pnpm depcheck` | 0 lỗi (113 cảnh báo web mock có sẵn) |
| `node tools/scripts/i18n-check.mjs` | vi / en 100% |
| `pnpm --filter @appchat/api test:integration test/integration/openapi.test.ts` | 4/5 — ca AC4 `x-untyped ≤ 175` đỏ **có sẵn trên origin/dev** (220 > 175, lệch do TIP trước); route mới đã khai schema có kiểu nên không cộng thêm |

### Đối chiếu standards

| Standard | Đạt |
|----------|-----|
| indexing.md | Unique (actor_scope, action_id, invocation_key); unique run_id; partial `(phase, updated_at, id) INCLUDE (run_id, action_id) WHERE phase IN (generating, validating)` cho quét khôi phục |
| concurrency.md | Mọi chuyển pha `updateMany` có điều kiện phase (CAS); `beginRepair` chặn bằng `repaired=false` |
| response-envelope.md | GET kết quả `{ data: UtilityEnvelope }`; 404 đồng nhất (ngoài scope / không tồn tại / không phải tiện ích / id rác) |
| ai/agent-gateway.md | Run consult không tool; chữ thô không ra API / run-detail |
| Kích thước file | File P2 lớn nhất 135 dòng |

## Pha 3 / 3 — UI UtilityMenu/Form/Result/Host, E2E mock + http, parity, chốt TIP (nhánh `tip/019c-ai-utilities-p3`, từ nhánh P2 chưa merge)

### Rà trước khi làm (code thật)

| Mục | Hiện trạng trước P3 | Xử lý |
|-----|---------------------|-------|
| Nút ⚡ Composer Trợ lý | Tĩnh, không `onClick` (`Composer.tsx`) | Mở `UtilityMenu` qua popover `utility` mới trong `assistant-store` |
| `/ai.*` trong ô soạn | Không nhận diện, gửi thẳng thành lượt chat | `utilityCommandOf` chặn ở `useAssistantChat.send` trước khi gọi `stream.run` |
| AgentToolsMenu (Hộp thư) | Chỉ hiển thị quyền của agent (chỉ xem) | Thêm khối `UtilityMenu` riêng — "Kỹ năng AI cho bạn", chạy bằng quyền người dùng, tách bạch hẳn khỏi danh sách quyền agent |
| Form / kết quả | Không tồn tại | `packages/shared` không đổi; toàn bộ ở `apps/web/src/shared/ai-utilities/*` dùng lại kiểu + action đã có từ P1/P2 |

### FILES

Theo manifest `tips/manifests/TIP-019c-files.md` — thêm 6 dòng không khai trước (`SourcePicker.tsx`, `ProposalView.tsx`, `ExtractFields.tsx`, `styles.ts`, `ai-utilities.test.tsx`, sửa `mock-transport.ts`); các dòng UI/E2E/i18n còn lại đã khai sẵn từ P1.

### Giả định đã chọn

1. **Host bền ngoài popover**: `UtilityHost` (Trợ lý) / `InboxUtilityHost` (Hộp thư) nhận state từ store riêng từng feature (`utility: UtilityActionId | null`) — đóng popover ＋/⚡ không unmount form đang chạy; đổi hội thoại / khách (đổi `contextId`) mới đóng form + bỏ kết quả cũ (so khoá `${conversationId}|${contactId}`).
2. **Lệnh gạch chéo** chỉ 4 id cố định (`UTILITY_ACTIONS`); lệnh khác giữ nguyên là chữ nháp — không suy diễn, không gọi action nào khác.
3. **Nguồn tường minh trong form**: hội thoại → tối đa 30 tin chữ gần nhất (checkbox chọn tay, không tự chọn hết); khách → chỉ để tick chọn (không hiện SĐT/email/tiền — đúng chiếu hẹp đã có từ P1); chữ dán → luôn gắn nhãn "chưa được xác minh". `ai.score_lead` bắt buộc có khách đang mở (không khách → chỉ hiện thông báo, không render SourcePicker).
4. **Hiển thị kết quả**: nhận dạng theo trường có trong proposal (không theo action id) để không lệch khi thêm kỹ năng sau; luôn chữ thuần (React escape) + trích dẫn cắt đúng offset server trả — không `dangerouslySetInnerHTML`, không in JSON. Nút "Sao chép dạng chữ" chỉ xuất hiện khi `state=completed`.
5. **Mock domain** (`shared/api/mock/domains/ai-utilities.ts`) dựng tối giản: trích tiền/ngày bằng regex cố định, đóng vai "model giả" cho mock E2E — không chung code với `packages/ai/src/testing/mock-utility.ts` (hai runtime khác nhau, mock web không gọi được model backend thật).

### TEST (chạy thật)

| Lệnh | Kết quả |
|------|---------|
| `pnpm --filter @appchat/web exec vitest run src/shared/ai-utilities` | 1 file / 6 test pass (lệnh gạch chéo, kết quả theo khuôn không JSON thô, mock quyền nguồn + trích dẫn) |
| `pnpm --filter @appchat/web exec vitest run src/features/assistant src/features/inbox` | 23 file / 68 test pass (hồi quy module dùng chung) |
| `pnpm e2e ai-utilities` | 7/7 pass (desktop + mobile 390) — menu 4 kỹ năng, `/ai.*` mở form, chữ dán gắn nhãn chưa xác minh, kết quả có trích dẫn, kết quả sai → trạng thái riêng không nút sao chép, menu Hộp thư tách khỏi quyền agent, form sống qua đóng menu, đổi hội thoại → đóng form, đánh giá cơ hội cần khách |
| `pnpm e2e:http ai-utilities` | 1/1 pass — chữ dán chạy thật qua action thật (model giả AI_ENGINE=mock) + GET kết quả thật; chỉ dẫn độc trong chữ không tạo thẻ xác nhận / báo giá |
| `pnpm parity --done` | Toàn bộ màn hiện có PASS/PAID (nợ ≤ 5%, không màn nào vượt — không có entry parity riêng cho ai-utilities vì đây là panel mới dưới ô soạn, không phải màn / trạng thái có trong prototype) |
| `pnpm turbo run lint typecheck test --filter="...[origin/dev]"` | 15/15 task xanh |
| `pnpm depcheck` | 0 lỗi (115 cảnh báo — không tăng vòng mới, chỉ tăng đếm cảnh báo có sẵn do thêm file) |
| `node tools/scripts/lint-size.mjs` / `lint-tokens.mjs` / `i18n-check.mjs` | sạch, 100% |

### Đối chiếu standards

| Standard | Đạt |
|----------|-----|
| frontend-structure.md | `shared/ai-utilities/` đúng cấu trúc `components/ hooks/ api.ts types.ts index.ts`; file lớn nhất 125 dòng (`ProposalView.tsx`) |
| interaction-patterns.md | Đường ghi duy nhất qua `useAction`; Enter trong form không lan sang ô soạn chat; Escape đóng form |
| i18n.md | Toàn bộ chữ qua `assistant.utility.*` / `inbox.composer.attachMenu.humanSkills`, vi + en 100% |
| D51 (Builder AI Agents) | Khối "Kỹ năng AI cho bạn" tách bạch quyền người dùng khỏi danh sách quyền agent — không cấp quyền mới cho agent |

### Kết luận TIP-019c

8 AC: AC1–AC4 (P1) + AC5 (P2, một phần — khôi phục chưa so `run_epoch`) + AC6 (P1+P3: snapshot nghiệp vụ trước/sau + E2E http tiêm chỉ dẫn độc) + AC7 (P3: không có đường tạo file / import / export nào từ kỹ năng tiện ích) + AC8 (chưa — cần `pnpm ai:live` với CLI 023b, ghi lại ở DEVIATIONS nếu CLI chưa sẵn khi chốt). Ba pha đã làm đúng tuần tự theo spec, không đổi luật đã chốt ở P1/P2.
