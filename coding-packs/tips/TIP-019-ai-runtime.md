# TIP-019: AI runtime — Agent Gateway (AI SDK v7), LLM Router đa provider + OpenAI-compatible, lưu / chạy tiếp run, rào chắn, trừ credit

## HEADER
- TIP-ID: TIP-019
- Project: AppChat V2
- Module: `packages/ai/**` · `packages/db/prisma/platform/ai-config.prisma` · `packages/db/prisma/tenant/ai-runs.prisma` · `packages/core/src/ai/{runs,router,settings}/**`
- Depends on: TIP-003 (ActionExecutor, outbox, BullMQ), TIP-009 (CreditMeter, ví) — nhánh xếp chồng từ `tip/018-email-channel`
- Priority: P0 · REQ: D01, D02, L01
- Estimated effort: 18 giờ
- **Files touched:**
  - Schema: `platform/ai-config.prisma` (`llm_provider`, `model_route`, `model_price`) + migration platform `<ts>_019_ai_config`; `tenant/ai-runs.prisma` (`ai_run`, `ai_run_step`, `ai_setting`) + migration tenant `<ts>_019_ai_runs`.
  - AI (`packages/ai` — chỗ duy nhất import `ai` / `@ai-sdk/*`): `gateway/types.ts` (AgentEngine, RunRequest, ToolSpec, ToolOutcome, RunEvent), `gateway/engine.ts` (`AiSdkEngine` — `streamText` tool loop, rào chắn), `router/{providers.ts, router.ts}` (LanguageModel theo `llm_provider` + fallback theo `model_route.priority`), `testing/mock-model.ts` (mock model kịch bản cho test / dev khi chưa có key — Q-001).
  - Core: `ai/router/{provider.store.ts (cache 60 giây, giải key), price-book.ts (PriceBook từ `model_price`)}`, `ai/runs/{run.store.ts (ai_run / ai_run_step), runner.ts (chạy run: tier → router, credit mỗi bước, lưu `state` khi dừng, `resume`), tools.ts (ToolSpec từ ActionDef → ActionExecutor)}`, `ai/settings/{ai-settings.handlers.ts (`ai_settings.update`), ai-settings.service.ts}`, `ai/ai.module.ts`, `ai/jobs/ai.jobs.module.ts` (queue `ai-resume`), env `AI_ENGINE=sdk|mock`.
  - API: `GET /v1/settings/ai` (mức AI theo gói + tác vụ + hạn mức), `GET /v1/runs` (theo `root_run_id` / `status`), `run.cancel` (handler — TIP-023 dùng); seed provider từ env (`LLM_SEED_*`, không commit key).
  - Test: `packages/ai/test/*` (engine: usage mỗi bước, loop guard, maxSteps, budget, dừng `needs_*` + chạy tiếp, fallback router), `apps/api/test/integration/ai-runtime.test.ts`, contract `ai_settings.update`.

## CONTEXT
- Blueprint §5.1 Agent Gateway (interface, lưu / chạy tiếp run, loop guard, phối hợp, usage, router D33), §2.2 `model_price` / `llm_provider` / `model_route` / `ai_run` / `ai_run_step`, §11.5 rủi ro K4.
- `standards/ai/agent-gateway.md` (12 quy tắc), `standards/actions/action-registry.md` (tool = action), D33 (provider gốc + OpenAI-compatible), D29 (ẩn tên model, chỉ "mức AI").
- Q-001 (9router chưa cấp): code + test bằng mock model; nạp provider bằng seed env / `admin.llm_provider.upsert` (TIP-040) — không sửa code.
- Spike K4 (đầu TIP): AI SDK v7 `streamText` + tool loop phát `usage` từng bước ở `onStepFinish` / `finish-step` (`inputTokens` / `outputTokens` số nguyên), `totalUsage` = tổng — trừ credit theo bước dùng được.

## TASK
1. **Schema** platform: `llm_provider` (key unique, kind, name, base_url, api_key_enc, headers, capabilities, status, last_probe_at, last_error), `model_route` (tier, purpose, priority, provider_key, model, params; unique(tier, purpose, priority)), `model_price` (provider_key, model, tier, credits_per_1k_in / out, active; unique(provider_key, model)). Tenant: `ai_run` (kind, parent / root, depth, state, agent, conversation, assistant_session, task, initiated_by, status, input / output, error, confidence, credits_used, started / finished; idx(status, started_at desc), idx(root_run_id)), `ai_run_step` (run_id, idx unique theo run, type, action_id, input / output, status, provider, model, tokens, credits, latency_ms, meta), `ai_setting` (một dòng: default_tier, tasks, budget, rate_limit).
2. **Agent Gateway** (`packages/ai`): `AgentEngine.run(req, signal)` → `AsyncIterable<RunEvent>`; `AiSdkEngine` dùng `streamText` + tools; `ToolSpec.execute` trả `ToolOutcome`; `needs_confirmation` / `needs_approval` dừng loop (event `paused` mang `pendingToolCall` + messages); rào chắn: `maxSteps`, cùng tool + cùng input 3 lần, `budget.maxCredits` (engine hỏi `budget` qua callback mỗi bước), `signal` huỷ.
3. **Router**: `LlmRouter.model(tier, purpose)` → danh sách ứng viên theo `model_route.priority` chỉ provider `active` + có key + đủ `capabilities` (agent có tool → `tools`); `kind` gốc → `@ai-sdk/{anthropic,openai,google,deepseek}`, `openai_compatible` → `createOpenAICompatible`; lỗi 5xx / 429 / timeout 30 giây ở bước đầu → ứng viên kế tiếp.
4. **Run service** (core): tạo `ai_run` (queued → running), mỗi bước LLM: `assertBalance` trước, `CreditMeter.charge` (platform, idempotent `runId:stepIdx`) rồi ghi `ai_run_step(llm)` + `credits_used`; bước tool ghi `ai_run_step(tool)`; dừng chờ → `status = waiting_approval` + `state {messages, pendingToolCall, stepIdx}`; `resume(runId, toolResult)` nạp `state` → chạy tiếp (job `ai-resume`, idempotent: run không ở `waiting_approval` thì bỏ); `run.cancel` huỷ cả cây (status `cancelled`, signal tới runner đang chạy qua Redis pub/sub).
5. **PriceBook** thật từ `model_price` (thay StaticPriceBook ở BillingModule khi có PlatformDb).
6. **Cài đặt AI**: `GET /v1/settings/ai` (3 mức, mức theo gói — Miễn phí chỉ tiêu chuẩn; credit / 1k theo `model_price` rẻ nhất của tier; tác vụ + hạn mức từ `ai_setting`), `ai_settings.update` (mức khoá theo gói → 402 `PLAN_LIMIT_REACHED`).
7. **`GET /v1/runs`** (`root_run_id`, `status`) đúng schema FE `Run`; `run.cancel` handler.

## ACCEPTANCE CRITERIA
1. Migration 019 (platform + tenant): bảng + unique + index; EXPLAIN `GET /v1/runs` theo `root_run_id` dùng index.
2. Engine (mock model): trả lời text → `delta` + `usage` + `finish`; tool loop 2 bước → 2 `usage` riêng; cùng tool + input 3 lần → dừng `loop_guard`; vượt `maxSteps` → dừng; `budget` hết → `CREDIT_EXHAUSTED`; tool trả `needs_confirmation` → `paused` (messages + pendingToolCall), chạy tiếp với kết quả tool → `finish`.
3. Router: chọn provider theo priority, bỏ provider `disabled` / thiếu key / thiếu `tools`; provider đầu lỗi 5xx / 429 → dùng provider kế; `openai_compatible` dựng với baseURL + headers.
4. Run (integration, Postgres + Memurai): run 2 bước LLM → ví trừ đúng credit theo `model_price`, `credit_ledger` 2 dòng `ai_step` (idempotent khi chạy lại cùng bước), `ai_run_step.credits` khớp; ví 0 → `CREDIT_EXHAUSTED` trước bước, run `failed`; dừng chờ → `state` lưu, `resume` (sau khi dựng lại runner — không giữ RAM) chạy tiếp tới `completed`; `run.cancel` → `cancelled`.
5. `GET /v1/settings/ai` khớp schema FE; `ai_settings.update` lưu + đọc lại; gói Miễn phí đặt `max` → 402; sales 403; `GET /v1/runs` khớp schema FE.
6. Contract `ai_settings.update` mock + HTTP; ESLint chặn import `ai` / `@ai-sdk/*` ngoài `packages/ai`.
7. Cổng D59 xanh.

## CONSTRAINTS
- Không hard-code tên model trong code (chỉ `model_route` / seed env). Key chỉ ở `api_key_enc` (AES-256-GCM `APP_ENC_KEY`) — env seed không commit.
- Không giữ trạng thái run trong RAM (resume từ `state`).
- Agent / Trợ lý / RAG / approval_request là TIP 020–023 — TIP này chỉ dựng runtime + điểm nối (`ApprovalGateway` vẫn của TIP-021).
