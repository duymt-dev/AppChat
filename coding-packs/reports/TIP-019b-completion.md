### COMPLETION REPORT — TIP-019b (Runtime AI — ngân sách chung, usage bền vững, trạng thái thật)

**STATUS:** pha 4 / 4 DONE — **TIP-019b DONE** (AC1–AC10; AC10 ai:live 12/12, an toàn 0). Chia 4 pha theo DC-379: **P1** §1 + §2 (#116) → **P2** §3 + §4.5–4.6 tiện ích / RAG chung gốc, embedding có đo, hết hạn duyệt báo Owner, handler ROLE=ai (#117) → **P3** §4.1–4.4 + §5 lineage bền / trạng thái chờ + chi tiết run + sự kiện + giao diện (#118) → **P4** ai:live 12 ca (nhánh `tip/019b-runtime-integrity-p4`, xếp chồng #118).

**COMMIT:** nhánh `tip/019b-runtime-integrity` xếp chồng trên `tip/025b-inbox-vertical-p7` (#115). SHA ở bảng tiến độ `goals/GOAL-RELEASE.md`.

**MIGRATION (tenant):** P1 `20261102001920_ai_runtime_integrity`; P2 `20261107080000_ai_runtime_lineage` (`ai_run.child_key` + unique partial (cha, khoá), khoá biên nhận theo nhóm, `ai_expiry_delivery`); P3 `20261107090000_ai_run_events` (3 trạng thái chờ, `transfer_count` / `visited_agents` / `event_seq`, bảng `ai_run_event`). (đúng tên manifest; tên cũ hơn các migration đã áp nhưng bộ áp migration theo tập tên đã ghi, không theo mốc — đã kiểm áp được trên 15 DB local + template test). Sau merge: `pnpm --filter @appchat/db db:migrate-tenants` + build lại api / worker.

---

## Pha 1 — cổng nhận lời gọi + biên nhận + quyết toán hai DB (§1, §2)

**FILES CHANGED** (đúng manifest `tips/manifests/TIP-019b-files.md`; lệch nhỏ ở DV-052)
- ai: `gateway/attempts.ts` (phân loại kết quả lời gọi: `rejected` khi nhà cung cấp trả lời từ chối / chưa từng kết nối, `unknown` khi có thể đã chạy), `gateway/limits.ts` (trần chữ ra 2048 / 8192, request ≤ 256 KiB), `gateway/engine.ts` (mỗi ứng viên một lời gọi có `beforeAttempt` / `afterAttempt`, `maxRetries: 0`, lỗi không rõ không chuyển ứng viên, hết ngân sách sau usage → bỏ tool đã yêu cầu, `beforeTool` trước mỗi tool, hook giữ mã lỗi), `gateway/types.ts`, `index.ts`.
- db: `prisma/tenant/ai-usage.prisma` (ai_root_budget, ai_usage_group, ai_usage_receipt, ai_usage_settlement), `ai-runs.prisma` (`subtree_credits`, `stop_reason`), migration (FK, CHECK, partial index biên nhận chưa xong INCLUDE root, index bước / con, ánh xạ bước LLM cũ → nhóm đã quyết toán, không tính lại tiền cũ).
- core `ai/runs/`: `root-budget.ts` (một lời gọi / gốc bằng CAS một câu UPDATE, không giữ khoá qua mạng; hạn mức con là hạn mức nhỏ hơn trong ví gốc; cách ly khi không rõ), `usage-receipts.ts` (biên nhận ghi trước khi gửi, giá chụp, chi phí thô Decimal), `usage-settlement.ts` (intent → ví theo ref → tenant một transaction: lượt settled, nhóm, bước llm, credit run + subtree tổ tiên + gốc; ví không đủ → denied + unbilled), `usage-recovery.ts` + `runtime.providers.ts` (khôi phục trên lịch `consistency.recover` của 045b qua `registerRecoveryAdapter`, nạp ở BillingJobsModule ROLE=jobs), `attempt-hooks.ts`, `metered-db.ts`, `budget-defaults.ts`; `runner.ts` (dùng hook khi có ví theo ref + bảng tenant, giữ cách cũ cho test đơn vị; `stop_reason`), `run.store.ts`; `assistant/delegate.ts` (phần còn lại theo `observed` của gốc, bỏ cộng tay vào gốc).
- core billing: `services/usage-receipt.ts` (`UsageWallet`: gọi lại cùng ref trả đúng số đã trừ, đọc từ sổ), `credit-meter.ts` (`price`, `usage`), `billing.module.ts`, `public.ts`, `jobs/reconcile-wallet.ts` (gộp ref `:s<n>` theo bước), `jobs/billing.jobs.module.ts`.
- core kernel: `consistency/operation-recovery.ts` (bộ khôi phục phụ), `consistency.jobs.module.ts`.
- test: ai `attempt-usage.test.ts` (5), `budget-tools-gate.test.ts` (3); core `ai-root-budget.test.ts` (3); api `ai-root-budget.test.ts` (6), `ai-usage-recovery.test.ts` (5); db `prisma-stubs.test.ts` (thêm file chủ 019b).

**Giả định đã chọn (gap-filling)**
- Lỗi mạng không mã HTTP / timeout / đứt giữa chừng = `unknown` (có thể nhà cung cấp đã chạy) → không chuyển ứng viên, không gửi lại; chỉ lỗi HTTP có mã và lỗi chưa kết nối (ECONNREFUSED / ENOTFOUND) mới coi là chưa chạy.
- Lượt quyết toán đầu giữ ref sổ cũ `<run>:<bước>` (tương thích đối soát 045b); lượt thêm của cùng bước dùng `<run>:<bước>:s<n>`, đối soát gộp theo bước.
- Gốc đang bận: lời gọi khác cùng gốc chờ tối đa 30 giây (thăm dò, huỷ được) rồi trả 409; không tự nhả chỗ của tiến trình chết (có thể đã chạy).
- Runner không có DB nền tảng (test đơn vị, StaticPriceBook) giữ đường trừ cũ — mọi composition thật (api / worker) có DB nền tảng nên đi đường biên nhận.

**CỔNG TEST (P1)**
- `db:test-reset` (template +1) → integration `ai-root-budget` (6) + `ai-usage-recovery` (5) pass; hồi quy `ai-runtime`, `agent-reply`, `assistant`, `assistant-vertical` (3/4), `ai-tasks`, `hardening-reconcile` pass khi chạy riêng.
- `pnpm turbo run lint typecheck test` ai / core / db / api / worker: 15/15 task pass (ai 65, core 702, db). `pnpm depcheck` pass (đã gỡ vòng phụ thuộc). Build api + worker, `check:bundle` pass. lint-size pass.
- **Đỏ sẵn, không do 019b** (kiểm trên code không đổi): `assistant-vertical` › "mục lục ma trận theo action" — 9 action của TIP 027 / 032 / 013 / 038b thiếu file ma trận; `hardening-reconcile` › EXPLAIN đỏ khi chạy chung với `ai-runtime` + `agent-reply` + `assistant` (planner chọn `credit_ledger_ws_created_idx` theo dữ liệu chung; chạy riêng xanh; truy vấn không đổi). Ghi Q-056.
- Nhà cung cấp thật: **chưa nghiệm thu với provider thật** ở P1 (model giả); ai:live ở P4.

**ĐỐI CHIẾU STANDARDS (P1)**

| Standard | Kết quả |
|---|---|
| `ai/agent-gateway.md` §5–6 | kiểm ví > 0 ngay trước MỖI lời gọi (kể cả ứng viên dự phòng) và trước mỗi tool; trừ idempotent theo ref; ngân sách cả cây theo usage thật (rào mềm, không hứa trần cứng) |
| `domain/money-time-numbering.md` | chi phí thô Decimal, làm tròn lên một lần theo tổng nhóm; `creditsFor` một lời gọi không đổi; không âm, không trừ một phần, không nợ |
| `domain/concurrency.md` | một lời gọi / gốc bằng CAS, không giữ khoá dòng qua mạng; quyết toán lặp lại an toàn (unique (nhóm, thứ tự), ref sổ) |
| `database/tenant-db.md` · `indexing.md` | không `workspace_id`; FK / CHECK viết tay; partial index biên nhận chưa xong INCLUDE root (EXPLAIN trong test); index bước / con |
| `events/outbox.md` · 045b | hai DB không chung transaction: intent → nền tảng → tenant; khôi phục dùng lịch 045b, không bộ điều phối thứ hai |
| `code/file-size-module-layout.md` | file mới ≤ 200 dòng; runner 195 dòng; test riêng |

---

## Pha 2 — tiện ích / RAG chung gốc, embedding có đo, hết hạn duyệt báo Owner, handler ROLE=ai (§3, §4.5–4.6 — AC3, AC4, AC6, AC7)

**FILES CHANGED** (manifest + lệch ở DV-053)
- ai: `embed/attempts.ts` (hook từng lô), `embed/embedder.ts` (đường có đo: `maxRetries 0`, `classifyAttemptError`, thiếu usage — SDK điền NaN — là không rõ, chuyển ứng viên chỉ khi bị từ chối rõ, làm lại từ lô 0, không trộn vector hai model), `testing/mock-embed.ts`, `index.ts`; test `embedding-usage.test.ts` (5).
- db: migration `20261107080000_ai_runtime_lineage`; `ai-runs.prisma` (`childKey`), `ai-usage.prisma` (khoá biên nhận theo nhóm, `AiExpiryDelivery`).
- core `ai/runs/`: `run-lineage.ts` (cha tin cậy chỉ từ `ActionContext.runId`; cha thiếu / đã kết thúc → 409; khoá con = action + khoá idempotent của lời gọi tool, action đọc → bước:action; run con đã xong → trả kết quả cũ, đang chạy → chờ ≤ 30 giây), `metered-embedding.ts` (biên nhận từng lô + nhận chỗ của gốc + quyết toán nhóm; `queryEmbedder` giành bước mới mỗi lần; `isMeteringStop`), `usage-receipts.ts` / `usage-settlement.ts` (ghi `raw_cost` luỹ kế lên nhóm, ref theo loại), `run.store.ts` (`childKey`); `agents/agent.runtime.ts` (`runOnce` nhận `parent` — dùng lại run con, tranh chấp unique → đọc lại).
- core gọi tiện ích với cha tin cậy: `agent.test` / `agent.draft_from_description` / `agent.optimize_prompt`, `ai.translate`, `ai.translate_draft`, `doc_template.detect_fields`, `quote.draft_from_content`, `contract.prepare_draft`, `contact.summarize`, `campaign.draft_content`. Gọi trực tiếp từ UI (không run) → gốc riêng như cũ; job nền (gợi ý kho, phân tích chiến dịch) giữ gốc riêng của job.
- core RAG: `kb/kb-search.handler.ts` (embed câu hỏi ở `prepare`, ngoài transaction), `kb/query-run.ts`, `kb/search.ts` (`queryEmbedding` truyền sẵn), `reply/reply.service.ts` (run lượt tạo TRƯỚC khi lắp ngữ cảnh; lỗi ngân sách / ví / không rõ → run lỗi có `stop_reason`, lượt chuyển người), `reply/reply-context.ts` (bỏ `.catch(() => null)` nuốt mọi lỗi — chỉ lỗi không phải đo mới rơi về nhánh từ khoá), `jobs/ai.jobs.module.ts`; nạp kho `kb/ingest.ts` + `kb/ingest-usage.ts` (run gốc cố định theo (nguồn, lần nạp), biên nhận từng lô, bỏ trừ gộp `kb:<nguồn>` khi có ví theo ref — không bao giờ cả hai).
- core thông báo: `notify/rules.ts` (`to.ownerOnly`, `onceKey`), `notify/services/recipients.ts` (Owner đọc lúc gửi, phải còn active), `notify/services/notifier.ts` + `notify/delivery-receipts.ts` (một thông báo / khoá, id theo khoá), `ai/approvals/expiry-delivery.ts`, `ai/events/agents.rules.ts` (luật `ai.approval_expired`: `ai_review` biến thể `expired`, link hàng chờ, không input / preview).
- test: core `ai-utility-lineage.test.ts` (5), `ai-expiry-notification.test.ts` (3); api `ai-runtime-lineage.test.ts` (5); worker `ai-runtime-domain-handlers.test.ts` (2).

**Giả định đã chọn (gap-filling)**
- Khoá run con theo khoá idempotent của lời gọi tool (run + bước + id lời gọi) — hai lời gọi cùng action trong một bước là hai run con; action đọc không có khoá → `<bước>:<action>`.
- Embedding câu hỏi mỗi lần là một nhóm `query_embed` mới (giành bằng INSERT ON CONFLICT), làm tròn riêng từng lần tìm — không gộp nhiều lần tìm khác nhau vào một lần làm tròn.
- Nạp kho không theo ngân sách lượt (trần 1.000.000) — chỉ chặn bởi ví; mỗi lần nạp một run gốc `consult` id cố định (sha256 của nguồn + lần nạp).
- Thông báo hết hạn dùng loại `ai_review` (biến thể `expired`) — không thêm loại thông báo mới vào catalog tuỳ chọn.

**CỔNG TEST (P2)**
- `db:migrate-tenants` (15 DB) + `db:test-reset` (template +1) → integration api `ai-runtime-lineage` 5/5; hồi quy `ai-root-budget` 6, `ai-usage-recovery` 5, `ai-runtime` 8, `agent-reply` 14, `kb` 10, `kb-management` 10, `kb-suggestions` 7, `kb-suggestions-proposer` 8, `inbox-translation` 3, `inbox-assistant-draft` 3, `notify` 6, `assistant` 15, `ai-tasks` 13 — pass.
- Worker (build `dist`): `ai-runtime-domain-handlers` 2/2 (tiến trình ROLE=ai thật, chạy lại + job lặp không chạy lần hai, hàng đợi kênh không bị nhận), hồi quy `ai-commerce-resume` 2/2.
- `pnpm turbo run lint typecheck test --filter="...[origin/dev]"` 36/36; `pnpm depcheck`, build api + worker, `pnpm check:bundle`, lint-size pass.
- Nhà cung cấp thật: **chưa nghiệm thu với provider thật** (model / embedding giả); ai:live ở P4.

**ĐỐI CHIẾU STANDARDS (P2)**

| Standard | Kết quả |
|---|---|
| `ai/agent-gateway.md` §1, §5–6 | tiện ích trong run dùng chung gốc + ngân sách; kiểm ví + nhận chỗ trước MỖI lô embedding; không đường SDK thứ hai |
| `ai/rag.md` §6, §10 | embedding câu hỏi cùng router, so đúng `embed_model`; lỗi route embed giữ nhánh từ khoá, lỗi ngân sách / ví không bị nuốt |
| `domain/money-time-numbering.md` | nạp kho làm tròn một lần theo tổng các lô (0,2 + 0,2 → 1); không phí theo lô |
| `domain/concurrency.md` | run con unique (cha, khoá) + đọc lại khi tranh chấp; nhóm embedding giành bằng INSERT ON CONFLICT; biên nhận thông báo chỉ đổi dòng chưa gửi |
| `database/tenant-db.md` · `indexing.md` | không `workspace_id`; unique partial `(parent_run_id, child_key) WHERE child_key IS NOT NULL`; khoá biên nhận (nhóm, ứng viên, lô) |
| `events/outbox.md` · notify | thông báo qua consumer `notify` + luật thuần; Owner đọc lúc gửi, không chụp vào event; một thông báo / yêu cầu duyệt |
| `code/file-size-module-layout.md` | file mới ≤ 120 dòng; reply.service 317 dòng (< 400); test riêng |

## Pha 3 — lineage bền, trạng thái chờ / dừng thật, sự kiện đã commit, chi tiết run có scope, giao diện (§4.1–4.4, §5 — AC5, AC8, AC9)

**FILES CHANGED** (manifest + lệch ở DV-054; quyết định DC-380)
- db: migration `20261107090000_ai_run_events`; `ai-runs.prisma` (enum + `transferCount` / `visitedAgents` / `eventSeq`), `ai-usage.prisma` (`AiRunEvent`).
- ai: `gateway/types.ts` + `engine.ts` — kết quả tool `waiting_child` dừng run như chờ duyệt.
- core `ai/runs/`: `run.store.ts` (`observed(ws, kv)` — mỗi bước mới / chuyển trạng thái ghi `ai_run_event` + outbox cùng transaction; `wait()` có kiểu; huỷ cây từng run + `stop_reason`), `run-events.ts` (seq theo gốc qua `ai_run.event_seq`, `run.step` / `run.done`, payload chỉ id + seq + trạng thái), `runner.ts` (dừng an toàn max_steps / loop_guard / budget → `failed` + `stop_reason` + mã lỗi; `waiting_child`; claim mọi trạng thái chờ; kv đánh dấu outbox), `child-continuation.ts`, `run-status.ts` (`readableRun` — runScope theo người khởi tạo run GỐC), `run-detail.ts` (chi tiết / bước / con, keyset + chọn id trước), `run-guard.installer.ts`, `runs.service.ts` (lifecycle + stop_reason, pct null khi không chạy, chờ con / thao tác / usage vẫn là "đang chạy"), `usage-settlement.ts` (bước llm mới phát sự kiện), `run-cancel.handler.ts`.
- core khác: `assistant/delegate.ts` (con chờ → `waiting_child`), `assistant/turn.service.ts` + `genui/execution-lease.ts` (sổ lượt: `waiting_external` + `waiting_for.reason`), `approvals/resume.ts` (`continueParents` sau khi con kết thúc / hết hạn), `reply/reply.service.ts` (lineage chuyển agent bền: `transfer_count` / `visited_agents`), `events/run.rules.ts`, `notify/realtime/{envelope,filter,run-guard}.ts` (`require.run` tra lại quyền đọc run mỗi lần phát), `ai.module.ts`.
- shared: `api/ai-runs.ts` (schema chi tiết / bước / con), `api/ai.ts` (`runRowSchema` + lifecycle, pct nullable), `events.ts` (`run.step` / `run.done`).
- api: `http/ai/runs.controller.ts` (GET /v1/runs/:id · /steps · /children, limit 1–100 mặc định 30, 404 như nhau) + `ai.http.module.ts`.
- web: `run-types.ts`, `run-api.ts`, `hooks/useRunDetail.ts`, `components/{RunStatusBadge,RunStepList,RunDetailDrawer,run-tone}.tsx|ts`, `RunsOrchestrationBar.tsx` (token thay mã màu, không thanh 100% giả, "Xem kết quả" / bấm hàng mở drawer), `styles/runs.styles.ts`, `types.ts`, `shared/realtime/event-invalidation.ts` (`run.step` / `run.done` → khoá `runs`), mock `domains/{assistant,ai-tasks,run-detail}.ts` + `mock-transport.ts`, i18n `assistant.json` vi + en.
- test: api `ai-run-detail.test.ts` (5 — sự kiện + seq + outbox một lần, dừng an toàn, chi tiết / bước / con + 404 + cursor, /runs lifecycle, WS chỉ người đọc được), `ai-child-continuation.test.ts` (2), sửa `ai-root-budget.test.ts` (budget → failed); web `RunDetailDrawer.test.tsx` (4), `assistant-shape.test.ts` (+1); e2e `ai-runtime.spec.ts`; parity `ai-runtime:run-row`.

**Giả định đã chọn (gap-filling)**
- Run chờ con / thao tác / đối soát vẫn thuộc nhóm "đang chạy" của `/runs` (danh sách đang sống); nhãn thật ở `lifecycle`.
- Sự kiện WS phát vào phòng `ws:{id}` rồi lọc từng người bằng guard đọc run (không tin người khởi tạo trong payload) — cùng `readableRun` với REST.
- Cha chờ con: chạy tiếp tối đa 3 tầng tổ tiên trong một lần; kết quả con chiếu lại chỉ tên agent + trạng thái + tóm tắt chữ.

**CỔNG TEST (P3)**
- `migrate-tenants` (15 DB, `20261107090000_ai_run_events` 0 lỗi) + `db:test-reset` (template +1).
- Integration api: `ai-run-detail` 5/5, `ai-child-continuation` 2/2; hồi quy `ai-root-budget` 6, `ai-runtime-lineage` 5, `ai-runtime` 8, `ai-usage-recovery` 5, `assistant` 15, `agents`, `realtime`, `record-scope-realtime` — 71/71 pass.
- Unit core 710/710; web `features/assistant` + shape mock pass.
- E2E mock (port 3462): `ai-runtime` 1/1, `assistant` / `screen-assistant` / `assistant-vertical` 21 pass (20 skip mobile / http).
- Parity: `ai-runtime:run-row` 0,56%, `assistant:chat-welcome` 2,66%, `assistant:cowork-welcome` 2,21%, `assistant:thread` 3,64%.
- `pnpm turbo run lint typecheck test --filter="...[origin/dev]"` 36/36; `pnpm depcheck` 0 lỗi; build api + worker; `pnpm check:bundle`; lint-size / lint-tokens / i18n-check 100%.
- Nhà cung cấp thật: **chưa nghiệm thu với provider thật** ở P3 (model giả); ai:live 12 ca ở P4.

**ĐỐI CHIẾU STANDARDS (P3)**

| Standard | Kết quả |
|---|---|
| `ai/agent-gateway.md` §5–6 | dừng an toàn không còn `completed`; chờ con là trạng thái bền, chạy tiếp qua claim (một lần) |
| `events/outbox.md` §3, §8 | `ai_run_event` + outbox cùng transaction; payload chỉ id / seq / trạng thái; WS lọc theo quyền đọc hiện tại |
| `api/response-envelope.md` | `{ data }` / `{ data, next_cursor }`; 404 `NOT_FOUND` không phân biệt; limit sai → 400 |
| `authz/rbac-permissions.md` | `assistant.use` + runScope (Chủ / `ai.governance` thấy cả workspace, còn lại chỉ cây mình khởi tạo) — REST và WS cùng hàm |
| `database/indexing.md` · `tenant-db.md` | `ai_run_event` PK (root, seq) + covering `INCLUDE (run_id, kind)`; bước / con keyset, chọn id trước rồi đọc đúng N dòng |
| `domain/concurrency.md` | seq tăng bằng `UPDATE … RETURNING` trên dòng gốc; finish / claim CAS — sự kiện kết thúc đúng một lần |
| `ui/prototype-parity.md` · `frontend-structure.md` | chỉ token; drawer qua `EntityDrawer`; component ≤ 150 dòng; lệch ghi PD-024 |
| `i18n/i18n.md` | mọi chuỗi mới vi + en |
| `code/file-size-module-layout.md` | file mới ≤ 150 dòng; run.store 237, runner 218, reply.service 320; test riêng |

## Pha 4 — ai:live 12 ca toàn vẹn runtime (AC10)

**FILES CHANGED**
- `fixtures/ai-eval/runtime-integrity/cases.json` (12 ca theo TIP §Validation), `fixtures/ai-eval/runtime-seed.mjs` (agent Sales gửi báo giá — `quote.send` từ agent luôn qua duyệt; agent CSKH chỉ tra cứu).
- `tools/ai-live/src/runtime-judge.ts` (chấm theo `GET /runs/:id` + `/children` thật: con chờ duyệt + gốc `waiting_child`; từ chối duyệt → cây chạy tiếp tới kết thúc; huỷ gốc khi con còn chờ → cả cây `cancelled`, duyệt sau đó không chạy tiếp; báo giá không chuyển "đã gửi"; credit cây khớp `credits_subtree` = gốc + Σ con; lỗi provider mà run `completed` = thành công giả; thẻ xác nhận huỷ theo chuỗi ≤ 4 vòng, chỉ ca xuất xác nhận thẻ `*.export`), `cases.ts` (`runtime`), `runner.ts`, `cli.ts` (cổng 11/12); test `tools/ai-live/test/runtime-judge.test.ts` (5).

**KẾT QUẢ** — `node tools/scripts/ai-live-stack.mjs -- --cases fixtures/ai-eval/runtime-integrity/cases.json` (stack riêng cổng 4617, Redis DB 14, LLM 9router `ag/gemini-3-flash` thật, embedding OpenAI `text-embedding-3-small` thật): **12/12, an toàn 0, ĐẠT** (`reports/ai-live-runtime-integrity-2026-11-07.md`). Lượt đầu 10/12: (1) bộ chấm chỉ chấp nhận `quote.draft_from_content` / `contract.prepare_draft` — model soạn nháp qua thẻ tạo (bị huỷ, không ghi gì) cũng đúng → nhận nhiều đường hợp lệ; (2) bộ chấm chỉ huỷ thẻ của lượt đầu, thẻ mới trong lượt chạy tiếp còn treo → huỷ theo chuỗi; (3) câu ca huỷ gốc không nói rõ "giao việc" nên model tự gửi (bị chặn quyền, không ghi gì) → câu ca nêu rõ delegate. Hai ca sửa chạy lại 3/3 mỗi ca, rồi cả suite 12/12.

**Giả định đã chọn**
- Ca (2) "consult root exhaustion" đo ở lượt Trợ lý (năm lần tra khách trong một gốc, không tràn ngân sách, không bịa) — tràn ngân sách gốc thật kiểm tất định ở integration `ai-root-budget` (không cố tình đốt credit provider thật — TIP §Validation).
- Ca (9) "transfer loop" là lượt Trợ lý giao agent không đủ quyền gửi: không vòng lặp, không gửi; vòng chuyển A→B→A qua khởi động lại kiểm tất định ở `agent-reply` + lineage bền P3.
- Ca (12) lỗi provider thật không tạo được theo yêu cầu: bộ chấm vẫn có nhánh "lỗi provider mà completed = thành công giả" (unit test), ca live kiểm model không khẳng định khách đã nhận khi `quote.send` bị chặn.

- Bổ sung đóng sổ: `usage-settlement.ts` ghi `ai_run_step.meta.provider_cost` (chi phí thô luỹ kế theo giá đã chụp — BP-5.1-j); web `shared/realtime/socket.ts` + `event-invalidation.ts`: nối lại WS sau khi rớt → làm mới khoá `runs` (sự kiện lỡ không phát lại, đọc lại REST có scope).

**CỔNG TEST (P4)** — `tools/ai-live` typecheck + 83/83 unit; ai:live 12/12 (provider thật); integration api `ai-root-budget` (+ provider_cost), `ai-usage-recovery`, `ai-runtime-lineage`, `ai-run-detail` 21/21; `pnpm turbo run lint typecheck test --filter="...[origin/dev]"` 39/39; depcheck, lint-size, lint-tokens; E2E mock `ai-runtime` / `assistant` / `shell` 14 pass.

**ĐỐI CHIẾU STANDARDS (P4)**

| Standard | Kết quả |
|---|---|
| `ai/eval.md` §2, §4 | suite riêng 12 ca, chấm theo trạng thái thật / DB, cổng ≥ 11/12 + an toàn tuyệt đối; lỗi hạ tầng không tính pass |
| `ai/agent-gateway.md` §5 | ai:live xác nhận chờ duyệt / chờ con / huỷ cây / không thành công giả với model thật |
| `events/outbox.md` §8 | nối lại WS → đọc lại REST có scope, không phát lại payload cũ |
| `domain/money-time-numbering.md` | `provider_cost` là chuỗi thập phân, không làm tròn; credit làm tròn một lần theo nhóm (không đổi) |

**AC:** AC1–AC4, AC6–AC7 (P1–P2), AC5, AC8, AC9 (P3), AC10 (P4) — **ĐẠT**.

