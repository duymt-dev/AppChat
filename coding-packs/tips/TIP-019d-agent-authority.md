# TIP-019d — Quyền agent: write theo ngưỡng confidence, delegate lồng = giao quyền agent cha, kb_scope khi kb.search qua tool

## HEADER
- **Parallel-safe with TIP-047c (coverage-closure manifest):** sequential, shares `packages/core/src/kernel/actions/policy.ts`; integrate 019d before047c.
- TIP-ID: TIP-019d; Project: AppChat V2; Module: AI policy/authority; Priority: P0; Estimated: M. TIP bổ sung cho TIP-019 (đã DONE, không sửa file gốc — DC-233).
- Depends on: 023b (current-authority resolver), 020c (effective KB scope), 019b, 022b đã tích hợp; trước 044/045/046.
- **Files touched:** [exact M/C manifest](manifests/TIP-019d-files.md) — 7 paths (3 C). M path tương lai phải do TIP tạo trước tích hợp xong.
- **Parallel-safe with:** tuần tự với mọi TIP chung file (dòng khai hai phía bên dưới, máy kiểm `python -X utf8 tools/obligations/manifests.py --order`).
- **Parallel-safe with TIP-003c (coverage-closure manifest):** sequential, shares `packages/core/src/ai/runs/tools.ts`; integrate 003c before019d.
- **Parallel-safe with TIP-015c (coverage-closure manifest):** sequential, shares `packages/core/src/kernel/actions/policy.ts`; integrate 015c before019d.
- **Parallel-safe with TIP-015d (coverage-closure manifest):** sequential, shares `packages/core/src/kernel/actions/policy.ts`; integrate 015d before019d.
- **Parallel-safe with TIP-020d (coverage-closure manifest):** sequential, shares `packages/core/src/ai/assistant/delegate.ts`, `packages/core/src/ai/kb/kb-search.handler.ts`; integrate 020d before019d.
- **Parallel-safe with TIP-020e (coverage-closure manifest):** sequential, shares `packages/core/src/ai/kb/kb-search.handler.ts`; integrate 020e before019d.
- **Parallel-safe with TIP-022c (coverage-closure manifest):** sequential, shares `packages/core/src/ai/assistant/delegate.ts`; integrate 022c before019d.
- **Parallel-safe with TIP-023d (coverage-closure manifest):** sequential, shares `packages/core/src/ai/assistant/delegate.ts`; integrate 023d before019d.
- **Parallel-safe with TIP-023f (coverage-closure manifest):** sequential, shares `packages/core/src/ai/assistant/delegate.ts`; integrate 023f before019d.
- **Parallel-safe with TIP-032b (coverage-closure manifest):** sequential, shares `packages/core/src/ai/runs/tools.ts`, `packages/core/src/kernel/actions/policy.ts`; integrate 032b before019d.
- **Parallel-safe with TIP-045b (coverage-closure manifest):** sequential, shares `packages/core/src/ai/runs/tools.ts`; integrate 045b before019d.
- **Dòng COVERAGE nhận:** BP-3.3-c; BP-3.3b-e; BP-3.3b-f.

## CONTEXT
- Hiện trạng đối chiếu mã 2026-11-02 (file:dòng, không tin trạng thái DONE):
  - `packages/core/src/kernel/actions/policy.ts:14` bảng `agent.write = run`, không xét confidence; confidence chỉ dùng quyết định handoff trả lời (`ai/reply/reply.service.ts:174–182`). Blueprint §3.3: agent write chạy khi được cấp **và** confidence ≥ ngưỡng, không thì approval.
  - `ai/assistant/delegate.ts:41` có DEPTH_LIMIT; `:62` truyền `commander = t.authz` của người dùng, không giao với quyền agent cha cho run con lồng (§3.3b-e).
  - `ai/kb/kb-search.handler.ts:15–17` áp visibility nhưng kb_scope của agent không áp khi gọi `kb.search` như tool trong run giao (§3.3b-f) — 020c nhận REQ-D17c/STD-ai-rag-2/3a (scope hiệu lực) nhưng chưa ghi dòng này; TIP này chỉ thêm test chứng minh + phần còn thiếu nếu 020c chưa phủ đường tool.
  - 023b `current-authority.ts` kiểm grant/agent/commander hiện tại mỗi lần gọi tool nhưng không định nghĩa ngưỡng confidence hay giao quyền lồng.

## APPLICABLE STANDARDS
- Blueprint §3.3, §3.3b; D51 (delegate = quyền agent ∩ quyền người ra lệnh, kiểm mỗi lần gọi tool); ai/agent-gateway.md; authz/rbac-permissions.md.
- Không đổi luật COMMERCE, 5 vai trò, quyền đã chốt, đơn giá Credit. Quyết định mới → DECISIONS (DC), câu hỏi → QUESTIONS.

## Rà trước khi làm
1. Đọc lại mọi file trong manifest sau khi TIP phụ thuộc đã tích hợp; lệch CONTEXT → sửa TIP/manifest trước khi code.
2. `python -X utf8 tools/obligations/manifests.py 019d` tính lại giao file; thêm path thì cập nhật manifest + header hai phía.
3. Đọc 023b `current-authority.ts` + 020c effective scope đã tích hợp; mở rộng, không viết resolver thứ hai.
4. Xác định nguồn confidence cho action write của agent: output có cấu trúc của bước gọi tool (`tool_confidence`) — nếu engine không có, ghi Q và mặc định approval (an toàn).

## TASK
Áp đủ ba luật uỷ quyền còn hở của Blueprint §3.3/3.3b vào resolver hiện hành.

## SPECIFICATIONS
### 1. Confidence
1. Policy agent write: `run` nếu tool được cấp **và** `confidence ≥ workspace.ai.write_threshold` (mặc định = ngưỡng handoff hiện có), không thì `approval`; confidence không có → approval.
### 2. Delegate lồng
1. Run con độ sâu 2: authority = quyền agent con ∩ quyền agent cha ∩ quyền người ra lệnh gốc; kiểm mỗi lần gọi tool (dùng resolver 023b).
### 3. kb_scope
1. `kb.search` gọi qua tool trong run có agent: scope = kb_scope agent ∩ quyền đọc người ra lệnh (020c); agent trực kênh chỉ tài liệu public trong scope.

## ACCEPTANCE CRITERIA
|AC|Given / When|Then — bằng chứng|
|---|---|---|
|1|Agent write confidence 0,5 < ngưỡng 0,7|tạo approval, không chạy — integration|
|2|Confidence thiếu|approval|
|3|Delegate lồng: agent cha không có `quote.create`|run con không gọi được dù agent con có|
|4|kb.search qua tool, agent scope chỉ thư mục A|không trả tài liệu thư mục B|
|5|Ca live 9router|`pnpm ai:live --cases fixtures/ai-eval/agent-authority.json` 6 ca ×3; an toàn 100%|

### Commands / evidence gate
- `pnpm --filter @appchat/core test -- test/agent-authority.test.ts`
- `pnpm --filter @appchat/api test:integration -- test/integration/agent-authority.test.ts`
- Ba cổng D59 (khi làm · trước commit · chốt TIP); parity màn liên quan; E2E mock + http của luồng TIP. Lệnh là cổng tương lai, chưa chạy khi viết TIP.

## CONSTRAINTS
- Không nới quyền; mọi nhánh không chắc chắn → approval.
- Backend 200–400 dòng/file (trần 600), FE trần 400, màn chỉ orchestrator; test file riêng; ghi chỉ qua ActionExecutor; Postgres index `=` trước range/sort, EXPLAIN cho list mới.

## Quality Gate
- Manifest 7 path, header khai hai phía, 5 AC đo được. Viết 2026-11-02 trong đợt đóng lỗ hổng sổ phủ; rà độc lập ở `reports/coverage-closure-audit-2026-11-02.md`. Chưa code / chưa runtime.

## ⚠️ BUILDER-CHECKLIST
- [ ] Rà trước khi làm xong; manifest khớp.
- [ ] Mọi AC có test chạy thật, dán output.
- [ ] Cập nhật COVERAGE (parts + merge.py) với bằng chứng file:dòng + test.
- [ ] Commit, `git status --short` sạch, báo Git SHA; PR vào dev.
