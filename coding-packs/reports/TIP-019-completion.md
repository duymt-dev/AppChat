### COMPLETION REPORT — TIP-019

**STATUS:** DONE (chưa nghiệm thu với LLM thật — Q-001)
**COMMIT:** `c3fb211` (code) trên nhánh `tip/019-ai-runtime` (xếp chồng trên `tip/018-email-channel`) — SHA ở bảng tiến độ `goals/GOAL-BACKEND.md`

**FILES CHANGED:**
- Created:
  - `packages/ai`: `gateway/{types.ts (RunMessage, ToolSpec, ToolOutcome, PausedState, RunRequest, RunEvent, AgentEngine, ModelSource), messages.ts (resultPart, resumeMessages, countCalls), engine.ts (AiSdkEngine — vòng bước tự quản, loop guard, maxSteps, budget, huỷ, fallback provider)}`, `router/{providers.ts (buildModel: anthropic / openai / google / deepseek / openai_compatible), router.ts (LlmRouter, isFallbackError)}`, `testing/mock-model.ts` (model giả theo kịch bản), `test/{engine,router}.test.ts` (10).
  - Schema: `platform/migrations/20261031500000_019_ai_config` (FK route → provider, CHECK đơn giá), `tenant/migrations/20261031500000_019_ai_runs` (FK step → run, run → cha, CHECK một dòng `ai_setting`, partial index `ai_run_live_idx`).
  - Core `ai/`: `ai.env.ts`, `public.ts`, `router/provider.store.ts` (đọc `llm_provider` / `model_route` / `model_price`, cache 60 giây, giải mã key, seed env), `runs/{run.store.ts, runner.ts (AiRunner), tools.ts (action → ToolSpec), runs.service.ts (GET /runs, pub/sub huỷ), run-cancel.handler.ts, cancel.listener.ts}`, `settings/{ai-settings.service.ts, ai-settings.handlers.ts}`.
  - API: `http/ai/ai.controller.ts` (`GET /v1/settings/ai`, `GET /v1/runs`).
  - Shared: `api/ai.ts` (mức AI theo gói, tác vụ, `aiSettingsSchema`, `runRowSchema`).
  - Test: `packages/core/test/ai-unit.test.ts` (7), `apps/api/test/integration/ai-runtime.test.ts` (8), `apps/web/e2e/http/ai-settings.spec.ts`.
  - TIP: `coding-packs/tips/TIP-019-ai-runtime.md`.
- Modified: `packages/db/prisma/{platform/ai-config.prisma, tenant/ai-runs.prisma}`; `packages/ai/{package.json (ai 7.0.152, @ai-sdk/* — bản ≥ 7 ngày), tsconfig.json, src/index.ts}`; `packages/core/{package.json (@appchat/ai), src/ai/ai.module.ts, src/billing/{billing.module.ts, public.ts, services/credit-meter.ts (DbPriceBook)}, src/kernel/actions/tip-owners.ts (run.cancel → 019), src/index.ts}`; `packages/shared/src/{api/index.ts, events.ts (run.cancelled)}`; `apps/{api,worker}/package.json` (ai / @ai-sdk/* — bundle để gói ngoài), `apps/api/src/{app.module.ts, http/ai/ai.http.module.ts}`; ESLint của apps + packages backend (`no-restricted-imports`); `tools/contract/src/cases.ts`, `tools/scripts/e2e-http.mjs` (`AI_ENGINE=mock`); `coding-packs/DECISIONS.md`.

**TEST RESULTS:**
- Acceptance criteria: 7/7 pass
  1. Migration 019 platform + tenant: index viết tay (`ai_run_status_started_at_idx`, `ai_run_root_run_id_started_at_idx`, `ai_run_live_idx`, unique `(run_id, idx)`), FK route → provider, CHECK đơn giá ≥ 0, CHECK `ai_setting.id = 1`; EXPLAIN run con theo gốc dùng `ai_run_root_run_id_started_at_idx`, run đang sống dùng `ai_run_live_idx` — **pass**
  2. Engine (mock model trên AI SDK thật): chữ → `delta` + `usage` + `finish(stop)`; tool loop 2 bước → 2 `usage`; cùng tool + input lần 3 → `loop_guard`; `maxSteps` → `max_steps`; hết ngân sách run → `budget`; `beforeStep` ném (ví hết) → `error`; `needs_confirmation` → `paused` + state, chạy tiếp → `finish`; tool lạ → FORBIDDEN, run tiếp; huỷ → `cancelled` — **pass** (6 ca)
  3. Router: theo priority, bỏ provider tắt / thiếu key / không tool (agent có tool) / không embeddings; provider đầu 503 / 429 → provider kế, 401 → lỗi; không route → `NO_MODEL_ROUTE`; `openai_compatible` cần base_url — **pass** (4 ca)
  4. Run (Postgres + Memurai): ví 0 → `CREDIT_EXHAUSTED` trước bước, model không được gọi, run `failed`; 2 bước LLM (tool → trả lời) → ví −5 đúng `model_price` (1 + 4), `credit_ledger` 2 dòng `ai_step` (`runId:0`, `runId:1`), `ai_run_step` `llm 1 · tool contact.search · llm 4`, `credits_used` 5, charge lại cùng bước không trừ; tool cần duyệt → `waiting_approval` + state, **runner khác** chạy tiếp → `completed`, resume lần 2 → null; `run.cancel` trong lúc tool chạy → run con dừng `cancelled` trước bước 2, cả cây `cancelled`, gọi lại trả `cancelled`, id lạ 404 — **pass**
  5. `GET /v1/settings/ai` khớp `aiSettingsSchema` (Miễn phí: chỉ tiêu chuẩn mở); `ai_settings.update` lưu + đọc lại; `max` / tác vụ `advanced` ở gói Miễn phí → 402 `{resource: ai_tier}`; tác vụ lạ 422; sales 403 (đọc + ghi); `GET /v1/runs?root_run_id=` khớp `runsListSchema` (chỉ run con), lọc `status`, status lạ 400 — **pass**
  6. Contract `ai_settings.update` mock + HTTP; ESLint `no-restricted-imports` chặn `ai`, `ai/test`, `@ai-sdk/openai` ngoài `packages/ai` (đã thử file mẫu — 3 lỗi), `@appchat/ai` không bị chặn — **pass**
  7. Cổng D59 — **pass** (dưới)
- **Cổng "trước commit":** `pnpm turbo run lint typecheck test` (10 package đổi) 30/30; `pnpm depcheck` xanh; `lint:size` không file vượt trần.
- **Cổng "chốt TIP":** `pnpm turbo run build lint typecheck test` **46/46** task · `api test:integration` **179 test / 20 file**: lượt đầy đủ 178 passed + 1 fail do sửa `action_id` (ghi id action thay tên tool) giữa lượt → chạy lại `ai-runtime.test.ts` sau sửa **8/8** · contract mock + HTTP **19/19** · `pnpm depcheck` xanh · `i18n:check` 100% (4493 key) · `lint:size` / `lint:tokens` xanh · smoke worker `ROLE=ai` bản build 20 giây — 0 log error · **E2E http 15 passed · 9 skipped** (toàn bộ, gồm `ai-settings.spec.ts` mới; 23 log `WORKSPACE_UNAVAILABLE` lúc vừa khai báo DN — workspace còn provisioning, có từ trước TIP này, test vẫn xanh) · full E2E hồi quy mock **222 passed · 0 failed · 196 skipped** · parity: không đổi màn nào (không chạy).

**INDEX / EXPLAIN:** `GET /v1/runs?root_run_id=` → `ai_run_root_run_id_started_at_idx` (Index Scan); `status=live` → `ai_run_live_idx` (partial); bước của run → unique `(run_id, idx)`; đơn giá / route / provider đọc toàn bảng nhỏ ở DB nền tảng, cache 60 giây.

**ISSUES DISCOVERED:**
- Luật dependency-cruiser "AI SDK chỉ trong packages/ai" (bản nháp) không bao giờ bắn: cấu hình `exclude` loại `node_modules` khỏi đồ thị → chuyển sang ESLint (DC-102).
- `actionIdOf` trùng tên export với kernel → đổi `toolActionId`.
- Bundle tsup của api / worker để gói npm ngoài → `ai` / `@ai-sdk/*` khai ở `apps/{api,worker}/package.json` (như `zca-js`, `imapflow`).

**GIẢ ĐỊNH ĐÃ CHỌN:** DC-096 … DC-103.

**DEVIATIONS FROM SPEC:** không có.

**Chưa nghiệm thu với provider thật:** LLM qua 9router (Q-001) — toàn bộ chạy engine AI SDK thật với model giả; khác biệt khi có key chỉ ở `buildModel` (provider) + chất lượng trả lời. Nạp provider: env `LLM_SEED_PROVIDER_KEY` / `KIND` / `BASE_URL` / `API_KEY` / `MODEL` lúc boot, không sửa code.

**SUGGESTIONS FOR CHỦ THẦU:**
- TIP-021 (agent + duyệt): `ApprovalGateway` quyết định → gọi `AiRunner.resume(ws, store, runId, outcome, spec)` (idempotent); job `ai-resume` đặt ở `AiJobsModule`; `max_credits` theo agent ghi vào `ai_run.max_credits`.
- TIP-023 (Trợ lý): `AiRunner` có `onEvent` cho SSE / WS `run.step`; tool từ action dùng `actionTool(def, executor, ctxOf)`.
- TIP-040 (Quản trị LLM): ghi `llm_provider` / `model_route` / `model_price` → gọi `ProviderStore.invalidate()` (process khác tự nạp sau ≤ 60 giây).

## Bổ sung2026-11-02 — runtime integrity, chưa triển khai

TIP-019b-runtime-integrity.md nhận shared-root usage, utility/query-embedding lineage, crash-safe original-price settlement, durable resume/transfer/stop states và scoped detail/events. Rà lại cho thấy test hiện hữu không chứng minh các cửa sổ crash/cây run; xem runtime-integrity-planning-audit-2026-11-02.md. Không sửa TIP đã DONE hoặc coi kế hoạch là runtime PASS.

## Bổ sung019c — chưa triển khai

[TIP-019c](../tips/TIP-019c-ai-utilities.md) nhận ai.summarize/detect_intent/extract_info/score_lead, source-scoped evidence, restricted metered generation và protected publication/result UI. Khác contact.summarize015b; không ghi business state. Runtime/native/live chưa chạy, không sửa kết luận lịch sử thành bằng chứng cho phần mới.
