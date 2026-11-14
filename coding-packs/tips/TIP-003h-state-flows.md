# TIP-003h — Bảng defineFlow cho mọi entity có trạng thái còn thiếu

## HEADER
- **Parallel-safe with TIP-048f (coverage-closure manifest):** sequential, shares `packages/core/src/inbox/actions/conversation-state.handlers.ts`; integrate 003h before048f.
- **Parallel-safe with TIP-047c (coverage-closure manifest):** sequential, shares `packages/shared/src/index.ts`; integrate 003h before047c.
- **Parallel-safe with TIP-032e (coverage-closure manifest):** sequential, shares `packages/shared/src/index.ts`; integrate 003h before032e.
- TIP-ID: TIP-003h; Project: AppChat V2; Module: shared state machines; Priority: P1; Estimated: M. TIP bổ sung cho TIP-003 (đã DONE, không sửa file gốc — DC-233).
- Depends on: 012b, 014b, 020b, 021b, 032b, 045b (chung handler) đã tích hợp; trước 044/045/046.
- **Files touched:** [exact M/C manifest](manifests/TIP-003h-files.md) — 14 paths (9 C). M path tương lai phải do TIP tạo trước tích hợp xong.
- **Parallel-safe with:** tuần tự với mọi TIP chung file (dòng khai hai phía bên dưới, máy kiểm `python -X utf8 tools/obligations/manifests.py --order`).
- **Parallel-safe with TIP-003f (coverage-closure manifest):** sequential, shares `packages/shared/src/index.ts`; integrate 003f before003h.
- **Parallel-safe with TIP-003b (coverage-closure manifest):** sequential, shares `packages/shared/src/index.ts`; integrate 003b before003h.
- **Parallel-safe with TIP-003c (coverage-closure manifest):** sequential, shares `packages/core/src/ai/agents/agent.handlers.ts`; integrate 003c before003h.
- **Parallel-safe with TIP-012c (coverage-closure manifest):** sequential, shares `packages/shared/src/index.ts`; integrate 012c before003h.
- **Parallel-safe with TIP-015b (coverage-closure manifest):** sequential, shares `packages/shared/src/index.ts`; integrate 015b before003h.
- **Parallel-safe with TIP-015c (coverage-closure manifest):** sequential, shares `packages/shared/src/index.ts`; integrate 015c before003h.
- **Parallel-safe with TIP-015d (coverage-closure manifest):** sequential, shares `packages/core/src/ai/approvals/approval.handlers.ts`, `packages/core/src/inbox/actions/conversation-state.handlers.ts`, `packages/shared/src/index.ts`; integrate 015d before003h.
- **Parallel-safe with TIP-015e (coverage-closure manifest):** sequential, shares `packages/shared/src/index.ts`; integrate 015e before003h.
- **Parallel-safe with TIP-015f (coverage-closure manifest):** sequential, shares `packages/shared/src/index.ts`; integrate 015f before003h.
- **Parallel-safe with TIP-019b (coverage-closure manifest):** sequential, shares `packages/shared/src/index.ts`; integrate 019b before003h.
- **Parallel-safe with TIP-019c (coverage-closure manifest):** sequential, shares `packages/shared/src/index.ts`; integrate 019c before003h.
- **Parallel-safe with TIP-020c (coverage-closure manifest):** sequential, shares `packages/core/src/ai/agents/agent.handlers.ts`; integrate 020c before003h.
- **Parallel-safe with TIP-022b (coverage-closure manifest):** sequential, shares `packages/core/src/ai/agents/agent.handlers.ts`, `packages/core/src/inbox/actions/conversation-state.handlers.ts`, `packages/shared/src/index.ts`; integrate 022b before003h.
- **Parallel-safe with TIP-023b (coverage-closure manifest):** sequential, shares `packages/core/src/ai/agents/agent.handlers.ts`, `packages/core/src/ai/approvals/approval.handlers.ts`, `packages/core/src/inbox/actions/conversation-state.handlers.ts`, `packages/shared/src/index.ts`; integrate 023b before003h.
- **Parallel-safe with TIP-023c (coverage-closure manifest):** sequential, shares `packages/core/src/channels/services/control.ts`, `packages/shared/src/index.ts`; integrate 023c before003h.
- **Parallel-safe with TIP-023d (coverage-closure manifest):** sequential, shares `packages/shared/src/index.ts`; integrate 023d before003h.
- **Parallel-safe with TIP-023e (coverage-closure manifest):** sequential, shares `packages/shared/src/index.ts`; integrate 023e before003h.
- **Parallel-safe with TIP-023f (coverage-closure manifest):** sequential, shares `packages/shared/src/index.ts`; integrate 023f before003h.
- **Parallel-safe with TIP-025b (coverage-closure manifest):** sequential, shares `packages/core/src/inbox/actions/conversation-state.handlers.ts`, `packages/shared/src/index.ts`; integrate 025b before003h.
- **Parallel-safe with TIP-026b (coverage-closure manifest):** sequential, shares `packages/shared/src/index.ts`; integrate 026b before003h.
- **Parallel-safe with TIP-027b (coverage-closure manifest):** sequential, shares `packages/shared/src/index.ts`; integrate 027b before003h.
- **Parallel-safe with TIP-030b (coverage-closure manifest):** sequential, shares `packages/shared/src/index.ts`; integrate 030b before003h.
- **Parallel-safe with TIP-033b (coverage-closure manifest):** sequential, shares `packages/shared/src/index.ts`; integrate 033b before003h.
- **Parallel-safe with TIP-034b (coverage-closure manifest):** sequential, shares `packages/shared/src/index.ts`; integrate 034b before003h.
- **Parallel-safe with TIP-034c (coverage-closure manifest):** sequential, shares `packages/shared/src/index.ts`; integrate 034c before003h.
- **Parallel-safe with TIP-034d (coverage-closure manifest):** sequential, shares `packages/shared/src/index.ts`; integrate 034d before003h.
- **Parallel-safe with TIP-036 (coverage-closure manifest):** sequential, shares `packages/shared/src/index.ts`; integrate 036 before003h.
- **Parallel-safe with TIP-037 (coverage-closure manifest):** sequential, shares `packages/shared/src/index.ts`; integrate 037 before003h.
- **Parallel-safe with TIP-038 (coverage-closure manifest):** sequential, shares `packages/shared/src/index.ts`; integrate 038 before003h.
- **Parallel-safe with TIP-038b (coverage-closure manifest):** sequential, shares `packages/shared/src/index.ts`; integrate 038b before003h.
- **Parallel-safe with TIP-039 (coverage-closure manifest):** sequential, shares `packages/shared/src/index.ts`; integrate 039 before003h.
- **Parallel-safe with TIP-040 (coverage-closure manifest):** sequential, shares `packages/shared/src/index.ts`; integrate 040 before003h.
- **Parallel-safe with TIP-041 (coverage-closure manifest):** sequential, shares `packages/shared/src/index.ts`; integrate 041 before003h.
- **Parallel-safe with TIP-042 (coverage-closure manifest):** sequential, shares `packages/shared/src/index.ts`; integrate 042 before003h.
- **Parallel-safe with TIP-043 (coverage-closure manifest):** sequential, shares `packages/shared/src/index.ts`; integrate 043 before003h.
- **Dòng COVERAGE nhận:** STD-domain-state-1.

## CONTEXT
- Hiện trạng đối chiếu mã 2026-11-02 (file:dòng, không tin trạng thái DONE):
  - `defineFlow` (`packages/shared/src/state/flow.ts:6`) dùng cho 6 entity: quote, order, contract, invoice, appointment, ticket.
  - Thiếu flow: customer_payment, customer_package, conversation, channel_account, ai_agent, kb_source, approval_request — kiểm inline (vd `approval.handlers.ts:46`, `agent.handlers.ts:120`). Campaign → 037.

## APPLICABLE STANDARDS
- domain/state-machine.md §1–4.
- Không đổi luật COMMERCE, 5 vai trò, quyền đã chốt, đơn giá Credit. Quyết định mới → DECISIONS (DC), câu hỏi → QUESTIONS.

## Rà trước khi làm
1. Đọc lại mọi file trong manifest sau khi TIP phụ thuộc đã tích hợp; lệch CONTEXT → sửa TIP/manifest trước khi code.
2. `python -X utf8 tools/obligations/manifests.py 003h` tính lại giao file; thêm path thì cập nhật manifest + header hai phía.
3. Đọc enum status trong prisma của 7 entity và mọi chỗ ghi status; lập bảng chuyển trạng thái hiện hành (không đổi hành vi).

## TASK
Thêm 7 bảng flow mô tả đúng hành vi hiện tại, đổi kiểm inline sang `assertTransition`, thêm test bảng.

## SPECIFICATIONS
### 1. Flow
1. `packages/shared/src/{sales,crm-packages,inbox,channels,ai}/…-state.ts` với terminal rõ; mọi handler ghi status gọi `assertTransition` → `INVALID_TRANSITION` 409.
2. FE lấy `allowedActions` để ẩn nút không hợp lệ (thay điều kiện cứng).

## ACCEPTANCE CRITERIA
|AC|Given / When|Then — bằng chứng|
|---|---|---|
|1|Unit mỗi flow|mọi cặp (from, action) hợp lệ/không hợp lệ|
|2|Gọi action sai trạng thái|409 INVALID_TRANSITION — integration|
|3|Hành vi hiện tại|không đổi (E2E module liên quan xanh)|

### Commands / evidence gate
- `pnpm --filter @appchat/shared test`
- `pnpm --filter @appchat/api test:integration -- test/integration/state-flows.test.ts`
- Ba cổng D59 (khi làm · trước commit · chốt TIP); parity màn liên quan; E2E mock + http của luồng TIP. Lệnh là cổng tương lai, chưa chạy khi viết TIP.

## CONSTRAINTS
- Chỉ chuẩn hoá, không đổi luật chuyển trạng thái; đổi luật phải hỏi.
- Backend 200–400 dòng/file (trần 600), FE trần 400, màn chỉ orchestrator; test file riêng; ghi chỉ qua ActionExecutor; Postgres index `=` trước range/sort, EXPLAIN cho list mới.

## Quality Gate
- Manifest 14 path, header khai hai phía, 3 AC đo được. Viết 2026-11-02 trong đợt đóng lỗ hổng sổ phủ; rà độc lập ở `reports/coverage-closure-audit-2026-11-02.md`. Chưa code / chưa runtime.

## ⚠️ BUILDER-CHECKLIST
- [ ] Rà trước khi làm xong; manifest khớp.
- [ ] Mọi AC có test chạy thật, dán output.
- [ ] Cập nhật COVERAGE (parts + merge.py) với bằng chứng file:dòng + test.
- [ ] Commit, `git status --short` sạch, báo Git SHA; PR vào dev.
