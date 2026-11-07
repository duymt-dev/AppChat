### COMPLETION REPORT — TIP-019b (Runtime AI — ngân sách chung, usage bền vững, trạng thái thật)

**STATUS:** pha 2 / 4 DONE (TIP chưa DONE). Chia 4 pha theo DC-379: **P1** §1 + §2 (#116) → **P2** §3 + §4.5–4.6 tiện ích / RAG chung gốc, embedding có đo, hết hạn duyệt báo Owner, handler ROLE=ai (#117) → P3 §4.1–4.4 + §5 lineage bền / trạng thái chờ + chi tiết run + sự kiện + giao diện → P4 ai:live 12 ca.

**COMMIT:** nhánh `tip/019b-runtime-integrity` xếp chồng trên `tip/025b-inbox-vertical-p7` (#115). SHA ở bảng tiến độ `goals/GOAL-RELEASE.md`.

**MIGRATION (tenant):** P1 `20261102001920_ai_runtime_integrity`; P2 `20261107080000_ai_runtime_lineage` (`ai_run.child_key` + unique partial (cha, khoá), khoá biên nhận theo nhóm, `ai_expiry_delivery`). (đúng tên manifest; tên cũ hơn các migration đã áp nhưng bộ áp migration theo tập tên đã ghi, không theo mốc — đã kiểm áp được trên 15 DB local + template test). Sau merge: `pnpm --filter @appchat/db db:migrate-tenants` + build lại api / worker.

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

