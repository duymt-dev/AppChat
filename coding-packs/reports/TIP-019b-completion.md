### COMPLETION REPORT — TIP-019b (Runtime AI — ngân sách chung, usage bền vững, trạng thái thật)

**STATUS:** pha 1 / 4 DONE (TIP chưa DONE). Chia 4 pha theo DC-379 (bốn lát của TIP): **P1** §1 + §2 (PR này) → P2 §3 + §4 tiện ích / RAG chung gốc, lineage bền, dừng / chờ, hết hạn duyệt báo Owner, handler ROLE=ai → P3 §5 chi tiết run + sự kiện + giao diện → P4 ai:live 12 ca.

**COMMIT:** nhánh `tip/019b-runtime-integrity` xếp chồng trên `tip/025b-inbox-vertical-p7` (#115). SHA ở bảng tiến độ `goals/GOAL-RELEASE.md`.

**MIGRATION (tenant):** `20261102001920_ai_runtime_integrity` (đúng tên manifest; tên cũ hơn các migration đã áp nhưng bộ áp migration theo tập tên đã ghi, không theo mốc — đã kiểm áp được trên 15 DB local + template test). Sau merge: `pnpm --filter @appchat/db db:migrate-tenants` + build lại api / worker.

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
