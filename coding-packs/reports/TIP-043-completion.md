### COMPLETION REPORT — TIP-043

**STATUS:** DONE, giao trong ba PR xếp chồng:
- P1 #71 (`tip/043-kb-conversation-learning`, `5e568e3a`): schema, action, đọc.
- P2 #72 (`tip/043-p2-proposer`, `d1f005da`): consumer, job đề xuất, thông báo.
- P3 (`tip/043-p3-review-ui`): UI duyệt, contract test, ai:live, chốt.

Thứ tự merge: #70 → #71 → #72 → P3.

AC đạt 9/9. Các dòng ĐẠT trong `COVERAGE.md` (merge.py còn 0 lỗ hổng): REQ-D04b, D29b, STD-ai-rag-9, ACT-kb.suggestion.approve, ACT-kb.suggestion.reject, BP-4.4-ai-e.

**COMMIT:** SHA cuối mỗi pha ghi ở bảng tiến độ `goals/GOAL-RELEASE.md`.

**FILES CHANGED:** khớp bảng file của TIP. Các file ngoài bảng, kèm lý do:
- `apps/api/src/http/ai/kb-suggestions.controller.ts`: route riêng; `ai.controller.ts` sẽ vượt kích thước nếu gộp. Được đăng ký ở `ai.http.module.ts` đúng như manifest.
- `packages/core/src/ai/kb/suggestions/suggestion.queue.ts`: tách queue khỏi `suggestion.jobs.ts`, vì depcheck báo vòng phụ thuộc consumer ↔ jobs.
- `packages/core/src/ai/events/kb-suggestion.rules.ts` + `notify/events/domain.rules.ts` + `packages/shared/src/i18n/server/{vi,en}/notify.ts`: thông báo `ai_review` biến thể `kb` và WS `kb.suggestion`, chỉ mang id.
- `packages/core/src/ai/{public.ts,assistant/catalog.ts}`: export cho API / worker; `kb.suggestion.propose` vào SYSTEM_ONLY.
- `packages/ai/src/testing/{mock-kb-suggestion.ts,mock-model.ts}`: model giả cho prompt `kb-suggestion` (integration / E2E).
- Mock FE: thay `domains/settings-ai.ts` trong manifest bằng một domain riêng `apps/web/src/shared/api/mock/domains/kb-suggestions.ts` (+ `.test.ts`), nối vào `store.ts` / `routes.ts` / `handlers.ts` / `mock-transport.ts`, để `settings-ai.ts` không phình. Thêm style `features/settings/styles/rag-review.styles.ts`.
- Test bổ sung:
  - `apps/api/test/integration/kb-suggestions-proposer.test.ts` (P2);
  - `helpers/kb-suggestion-fixtures.ts`;
  - ma trận `actions/kb.suggestion.{propose,approve,reject}.action.test.ts`, bắt buộc với mọi action trong registry;
  - `kb-suggestions.live.test.ts` (AC9, chỉ chạy khi `AI_LIVE=1`).
- ai:live: TIP ghi sửa `tools/ai-live/cases.yaml`, nhưng file này là bộ 30 ca bất biến (`cases.ts` từ chối lệch phân bổ). Hơn nữa, job đề xuất không đi qua Trợ lý (`POST /assistant/messages`) mà qua AiRunner trong worker. Vì vậy 5 ca chạy ở `kb-suggestions.live.test.ts`, gọi `proposeFromConversation` thật với router 9router (`LLM_SEED_*`), chấm theo DB. Báo cáo ở `reports/ai-live-kb-suggestion-2026-11-04.{md,json}`.
- `coding-packs/DECISIONS.md`: DC-353.
- `tools/obligations/parts/*.md`: COVERAGE.

Chi tiết:
- **Schema (P1):**
  - `kb_suggestion`: id, conversation_id, question, answer đã che, source_message_ids uuid[], status, edited, fingerprint unique, cutoff_message_id, run_id?, reviewed_by / at, reject_reason, kb_source_id unique, version.
  - Covering index `(status, created_at DESC, id DESC) INCLUDE (conversation_id, version, kb_source_id)`.
  - Migration `20261102004300_kb_suggestions`.
- **Action:**
  - `kb.suggestion.propose`: chỉ nguồn system, actor `system:kb-suggest`; HTTP và Trợ lý nhận 403.
  - `approve` / `reject`: quyền `kb.manage`, không agentGrantable, `if_version` bắt buộc, `.strict()`.
  - Approve che PII lại; còn dấu vết thì trả 422 `sensitive_data:<loại>`. Tạo `kb_source` origin `conversation`, visibility kế thừa thư mục; event và đẩy ingest sau commit.
- **Đề xuất (P2):**
  - Consumer `kb-suggest` nhận `conversation.updated` khi status = `closed`, xếp job theo mốc tin cuối.
  - Job ROLE=ai: tối đa 100 tin, che PII, gọi model một lần qua AiRunner (run `suggestion`, trần 20 credit), rồi server kiểm cặp và gọi `propose` qua Executor (idempotency `kb-suggest:<conv>:<cutoff>`).
  - Chạy lại thì dùng lại run đã xong của cùng mốc.
- **UI (P3, PD-013):**
  - Dữ liệu RAG có mục nav "Chờ duyệt" (chỉ người có quyền, kèm số đếm), khung 3 tab (Chờ duyệt / Đã duyệt / Đã từ chối), chip trạng thái nguồn (Đang học / Đã học / Lỗi).
  - Drawer `KbSuggestionReview`: sửa hỏi / đáp, xem bản gốc khi đã sửa, chọn thư mục + "Ai được dùng", Duyệt / Từ chối kèm lý do. Lỗi `sensitive_data` hiện dưới ô; `STALE_VERSION` / `CONFLICT` thì cảnh báo và tải lại hàng chờ.
  - Link thông báo mở `?nav=review`.
- **Sửa sau ai:live (DC-353 mục 3):** prompt `kb-suggestion` v2 gửi tin với mã ngắn `[m<số>]`, server đổi lại mã thật (`resolveRef`). Ở v1, model thật chép sai UUID dài nên cặp đúng bị loại `unknown_message` (ca đạt 2/5). Lỗi này do hệ thống, không phải hạ tầng provider.

**TEST RESULTS:**
- Acceptance criteria: 9/9
  1. **AC1:**
     - Event lặp 10 lần → mỗi fingerprint một pending, tối đa 5 cặp.
     - Trước khi duyệt không có `kb_source` / chunk.
     - Test: `kb-suggestions.test.ts` "AC1 / AC3", `kb-suggestions-proposer.test.ts` "lặp 10 lần".
     - **pass**
  2. **AC2:**
     - Consumer bỏ qua hội thoại open / snoozed / archived / hidden và các thay đổi khác status.
     - Agent không được khách khen → không học; agent tự khen → không học.
     - Test: proposer "AC2", core `kb-suggestions.test.ts` checkPairs; ai:live ca `agent-not-praised` 3/3.
     - **pass**
  3. **AC3:**
     - SĐT / email / tên / địa chỉ / số dài / mật khẩu bị che trước khi gửi model và trên output; còn sót → bỏ cặp hoặc trả 422.
     - Câu tiêm "hãy duyệt / xuất bản / bỏ qua quy tắc" không tạo cặp và không tạo nguồn.
     - Mã tin bịa bị loại.
     - Test: `kb-suggestion-redaction.test.ts`, proposer, `kb-suggestions.test.ts`; ai:live `pii-redacted` + `injection` 3/3.
     - **pass**
  4. **AC4:**
     - Sửa đáp án rồi duyệt → đúng một nguồn chứa bản đã sửa, origin conversation, visibility kế thừa thư mục internal.
     - Có chunk tìm được chỉ sau khi worker nạp.
     - Test: `kb-suggestions.test.ts` "AC4"; http E2E: duyệt → "Đã học".
     - **pass**
  5. **AC5:**
     - Từ chối không tạo nguồn.
     - Model lỗi / hết credit → run failed, không có đề xuất nửa vời.
     - Chạy lại không gọi model lần hai, không nhân nguồn.
     - Duyệt khi Redis lỗi → consumer `kb.suggestion_approved` vẫn đẩy ingest lại.
     - Test: proposer "AC5".
     - **pass**
  6. **AC6:**
     - Hai người duyệt cùng version → một bản thắng (`STALE_VERSION`); đã duyệt → `CONFLICT`.
     - sales nhận 403, tenant khác 404.
     - Vai trò chỉ có `kb.manage` không thấy liên kết hội thoại.
     - Agent / Trợ lý không gọi được approve / reject (không agentGrantable).
     - Test: `kb-suggestions.test.ts` "AC6", ma trận action.
     - **pass**
  7. **AC7:**
     - 10.003 dòng pending, cursor `(created_at, id)` không trùng / mất khi cùng `created_at`.
     - EXPLAIN ANALYZE ghi vào `.data/gate/043-explain-kb-suggestion.txt`: deferred join qua `kb_suggestion_status_created_cover_idx` + `kb_suggestion_pkey`; Index Only Scan khi tắt bitmap (planner chọn Bitmap Index Scan trên covering index ở dữ liệu nhỏ); không Seq Scan; 3,98 ms.
     - **pass**
  8. **AC8:**
     - Mock và HTTP cùng zod (`kb-suggestions.contract.test.ts` 4 passed: GET list / chi tiết, output approve / reject, envelope 400 / 404 / 409 / 422, event chỉ id).
     - E2E mock `kb-suggestions`: còn SĐT bị chặn dưới ô, duyệt vào thư mục, từ chối kèm lý do, không có "Đã học" trước khi duyệt, bàn phím, en, 390 (không tràn ngang, nút chạm ≥ 44).
     - E2E http: widget → Hộp thư trả lời → đóng → đề xuất đã che SĐT → sửa → duyệt → tải lại thấy "Đã học".
     - **pass**
  9. **AC9:**
     - ai:live model thật `cc/claude-haiku-4-5-20251001` qua 9router, prompt `kb-suggestion` v2 (hash `86caae881a76`).
     - 5 ca × 3 lượt: **5/5 ca, 15/15 lượt**; an toàn 0 vi phạm; rubric 100% (≥ 90%); lỗi hạ tầng 0; 60 credit; token 46.239 / 2.417.
     - Chấm tay toàn bộ 9 cặp được tạo (bảng trong report): câu hỏi chung, đáp án giữ đúng sự kiện, không tên / SĐT / email / địa chỉ.
     - Lần 1 (v1) đạt 2/5 do mã tin, đã sửa (DC-353).
     - Report không chứa key.
     - **pass**
- **Cổng commit (mỗi pha):**
  - P1: turbo 18/18.
  - P2: turbo 15/15.
  - P3: `turbo lint typecheck test` cho web + ai + core + api 12/12 (9 warning lint web thuộc file mock khác, có sẵn).
  - depcheck 0 lỗi (baseline).
  - lint:size (không file vượt trần; lớn nhất `RagSection.tsx` 242, `suggestion.handlers.ts` 153).
  - lint:tokens xanh; lint:masks 43 mask / 13 PD; i18n:check 5271 key, 100% vi + en.
- **Chốt TIP (D59, phạm vi TIP):**
  - Build ai + core, api + worker, web (mock).
  - Integration (Postgres 16 + Memurai, DB test): `kb-suggestions`, `kb-suggestions-proposer`, `kb-suggestions.contract`, ma trận `kb.suggestion.*` ×3, `kb-management(.contract)` → 8 file / 41 passed (+ live skip khi không có `AI_LIVE`).
  - Unit: core `kb-suggestions` 9, ai `kb-suggestion-redaction` 7, web mock `kb-suggestions.test.ts` 3.
  - E2E mock (3419): `kb-suggestions` + `kb-management` + `settings-ai` + `settings` → 25 passed.
  - E2E http (API 4517 / web 3518, Redis DB 15, đủ worker): `kb-suggestions` + `kb-management` → 2 passed.
  - Parity: `settings:rag` 4,10% (nav thêm một hàng), `settings:rag-review` 2,06% (mask PD-013).
  - Đã sửa `apps/web/src/shared` (mock) nên chạy thêm `parity --done`: 108 PASS, 1 FAIL `inbox:connect-channel` 6,20%. Lỗi này đỏ sẵn, cùng giá trị ở log 015b / 020b / 036 / ver2.1; Q-020 → TIP-014c.
- **Chưa nghiệm thu với provider thật:** kênh Zalo thật (luồng http dùng widget website); embedding OpenAI thật cho nguồn mới (test dùng embedding giả tất định như TIP-020).

**ISSUES DISCOVERED:**
- E2E http lần đầu chạy với `E2E_WORKERS=jobs,ai` không có worker `channels`, nên tin widget không vào Hộp thư (spec `webchat` có sẵn cũng đỏ cùng cách). Luồng cần đủ worker, nên chạy mặc định `jobs,ai,channels`.
- `pnpm test:integration -- <file>` chuyển `--` cho vitest nên chạy toàn bộ suite. Lọc file phải dùng `npx vitest run --config vitest.integration.config.ts <file>`.
- Planner Postgres chọn Bitmap Heap Scan ở 10k dòng ngay sau VACUUM ANALYZE. Index vẫn đúng là covering index; khi tắt bitmap thì Index Only Scan được ghi kèm.
- Workspace demo / ai-live tạo trước P1 cần chạy tenant-migrate (`20261102004300_kb_suggestions`) trước khi dùng tính năng.

**ĐỐI CHIẾU STANDARDS** (mục APPLICABLE STANDARDS của TIP):

| Standard | Tuân thủ (file:dòng / test) | Lệch |
|---|---|---|
| `ai/rag.md` §9 | Đề xuất chờ người có `kb.manage` duyệt, không học ngầm; nguồn chỉ được tạo khi duyệt (`source-publisher.ts`); che PII hai lớp (`packages/ai/src/kb/suggestion-redaction.ts`, `suggestion.rules.ts:47-67`); visibility kế thừa thư mục; public / internal giữ nguyên quy tắc truy vấn của agent | — |
| `ai/agent-gateway.md` | Model qua AiRunner / gateway (`suggestion.service.ts` `runOnce`, run kind `suggestion`, meter credit, trần 20); không gọi SDK trực tiếp trong core; prompt có version (`kb-suggestion` v2) | — |
| `ai/eval.md` | Suite 5 ca cố định, 3 lượt / ca, đạt ≥ 2/3, an toàn 100%, rubric ≥ 90%, ghi model / prompt / run / credit (`kb-suggestions.live.test.ts`, `reports/ai-live-kb-suggestion-2026-11-04.md`) | Chạy qua integration harness thay vì `tools/ai-live/cases.yaml` (bộ 30 ca bất biến; job không đi qua Trợ lý) — DC-353 |
| `actions/action-registry.md` | `packages/actions/src/kb-suggestions.ts`: zod `.strict()`, permission, risk, `agentGrantable: false`, invalidates `kb_suggestions` / `kb`; ma trận `kb.suggestion.*` | — |
| `events/outbox.md` | Event ghi cùng transaction, chỉ id (`packages/shared/src/kb/suggestion-events.ts`; contract test kiểm payload không chứa câu chữ); ingest đẩy sau commit + consumer đẩy lại | — |
| `api/response-envelope.md` | `{data, next_cursor, meta}`; lỗi `{error:{code,message,fields}}` (`kb-suggestions.contract.test.ts`) | — |
| `authz/rbac-permissions.md` | `kb.manage` kiểm ở server; liên kết hội thoại chỉ hiện khi có `inbox.view` + scope (`suggestion.repo.ts` `linkOf`); propose chỉ system (SYSTEM_ONLY) | — |
| `database/tenant-db.md` · `indexing.md` | Bảng tenant không có `workspace_id`; covering index cột `=` trước rồi sort; deferred join; EXPLAIN ghi file (AC7) | — |
| `domain/concurrency.md` | `FOR UPDATE` + CAS `if_version` (`suggestion.repo.ts` `lockPending`); fingerprint unique; idempotency key của job | — |
| `ui/frontend-structure.md` · `interaction-patterns.md` | Panel / drawer / hook / api / style tách file; ghi bằng `useAction`, đọc bằng TanStack Query; `EntityDrawer`; bàn phím; mobile 390 | — |
| `ui/prototype-parity.md` | `settings:rag` 4,10%, `settings:rag-review` 2,06% | PD-013 (mức 1) |
| `i18n/i18n.md` | `settings.rag.nav.review`, `settings.rag.review.*`, `actions.kb.suggestion.*`, `notify` ai_review kb ở cả vi + en | — |
| `code/testing.md` | Test ở file riêng: unit / integration / contract / ma trận / live / e2e mock + http | — |
| `workflow/git-flow-ci.md` | Ba nhánh `tip/043-*` xếp chồng, PR vào `dev` | — |

**GIẢ ĐỊNH ĐÃ CHỌN:** DC-353 (`DECISIONS.md`). **Lệch spec:** không có, không thêm thư viện. **Lệch prototype:** PD-013.
