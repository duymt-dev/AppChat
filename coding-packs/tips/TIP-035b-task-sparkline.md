# TIP-035b — Thẻ tác vụ Cowork: sparkline hiệu suất từ số liệu thật

## HEADER
- TIP-ID: TIP-035b; Project: AppChat V2; Module: assistant tasks; Priority: P2; Estimated: S. TIP bổ sung cho TIP-035 (đã DONE, không sửa file gốc — DC-233).
- Depends on: 038 (agent statistics), 019b đã tích hợp; trước 044/045/046.
- **Files touched:** [exact M/C manifest](manifests/TIP-035b-files.md) — 3 paths (0 C). M path tương lai phải do TIP tạo trước tích hợp xong.
- **Parallel-safe with:** tuần tự với mọi TIP chung file (dòng khai hai phía bên dưới, máy kiểm `python -X utf8 tools/obligations/manifests.py --order`).
- **Parallel-safe with TIP-003g (coverage-closure manifest):** sequential, shares `packages/core/src/ai/tasks/tasks.read.ts`; integrate 003g before035b.
- **Dòng COVERAGE nhận:** PRO-assistant-taskspark.

## CONTEXT
- Hiện trạng đối chiếu mã 2026-11-02 (file:dòng, không tin trạng thái DONE):
  - `features/assistant/components/TaskCard.tsx:8` `SPARK=[42,55,48,68,60,80,72]` cứng.

## APPLICABLE STANDARDS
- ui/prototype-parity.md; database/indexing.md.
- Không đổi luật COMMERCE, 5 vai trò, quyền đã chốt, đơn giá Credit. Quyết định mới → DECISIONS (DC), câu hỏi → QUESTIONS.

## Rà trước khi làm
1. Đọc lại mọi file trong manifest sau khi TIP phụ thuộc đã tích hợp; lệch CONTEXT → sửa TIP/manifest trước khi code.
2. `python -X utf8 tools/obligations/manifests.py 035b` tính lại giao file; thêm path thì cập nhật manifest + header hai phía.
3. Xác nhận chỉ số theo prototype L1361 (số lượt chạy thành công / ngày, 7 ngày).

## TASK
Sparkline 7 ngày lấy từ lượt chạy tác vụ thật.

## SPECIFICATIONS
### 1. Dữ liệu
1. `GET /v1/ai/tasks` thêm `spark: number[7]` (số lượt chạy thành công mỗi ngày theo tz workspace), một truy vấn GROUP BY cho cả trang (không N+1), index `ai_task_run(task_id, started_at)`.

## ACCEPTANCE CRITERIA
|AC|Given / When|Then — bằng chứng|
|---|---|---|
|1|Tác vụ có lượt chạy|sparkline khớp DB|
|2|Tác vụ mới|đường phẳng 0, không số giả|
|3|Trang 20 tác vụ|1 truy vấn spark|

### Commands / evidence gate
- `pnpm --filter @appchat/api test:integration -- test/integration/ai-tasks.test.ts`
- `pnpm e2e assistant`
- Ba cổng D59 (khi làm · trước commit · chốt TIP); parity màn liên quan; E2E mock + http của luồng TIP. Lệnh là cổng tương lai, chưa chạy khi viết TIP.

## CONSTRAINTS
- Không đổi hình prototype.
- Backend 200–400 dòng/file (trần 600), FE trần 400, màn chỉ orchestrator; test file riêng; ghi chỉ qua ActionExecutor; Postgres index `=` trước range/sort, EXPLAIN cho list mới.

## Quality Gate
- Manifest 3 path, header khai hai phía, 3 AC đo được. Viết 2026-11-02 trong đợt đóng lỗ hổng sổ phủ; rà độc lập ở `reports/coverage-closure-audit-2026-11-02.md`. Chưa code / chưa runtime.

## ⚠️ BUILDER-CHECKLIST
- [ ] Rà trước khi làm xong; manifest khớp.
- [ ] Mọi AC có test chạy thật, dán output.
- [ ] Cập nhật COVERAGE (parts + merge.py) với bằng chứng file:dòng + test.
- [ ] Commit, `git status --short` sạch, báo Git SHA; PR vào dev.
