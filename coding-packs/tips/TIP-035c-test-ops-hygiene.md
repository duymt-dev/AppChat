# TIP-035c — Vệ sinh kiểm thử & job quét: generator fixture, db:cleanup-test, E2E chập chờn, tập workspace "armed"

## HEADER
- **Parallel-safe with TIP-031c (coverage-closure manifest):** sequential, shares `packages/core/src/sales/jobs/order-sync.jobs.ts`; integrate 031c before035c.
- TIP-ID: TIP-035c; Project: AppChat V2; Module: test tooling + tenant sweeps; Priority: P1; Estimated: M. TIP bổ sung cho TIP-035 (đã DONE, không sửa file gốc — DC-233).
- Depends on: 003c, 006b, 041 (lifecycle), 045b đã tích hợp; trước 044/045/046.
- **Files touched:** [exact M/C manifest](manifests/TIP-035c-files.md) — 17 paths (4 C). M path tương lai phải do TIP tạo trước tích hợp xong.
- **Parallel-safe with:** tuần tự với mọi TIP chung file (dòng khai hai phía bên dưới, máy kiểm `python -X utf8 tools/obligations/manifests.py --order`).
- **Parallel-safe with TIP-003g (coverage-closure manifest):** sequential, shares `packages/core/src/sales/jobs/sales.jobs.module.ts`; integrate 003g before035c.
- **Parallel-safe with TIP-012b (coverage-closure manifest):** sequential, shares `packages/core/src/sales/jobs/sales.jobs.module.ts`; integrate 012b before035c.
- **Parallel-safe with TIP-015d (coverage-closure manifest):** sequential, shares `packages/core/src/sales/jobs/sales.jobs.module.ts`; integrate 015d before035c.
- **Parallel-safe with TIP-022b (coverage-closure manifest):** sequential, shares `packages/core/src/support/jobs/support.jobs.module.ts`; integrate 022b before035c.
- **Parallel-safe with TIP-030b (coverage-closure manifest):** sequential, shares `packages/core/src/contracts/jobs/contracts.jobs.module.ts`; integrate 030b before035c.
- **Parallel-safe with TIP-030c (coverage-closure manifest):** sequential, shares `packages/core/src/contracts/jobs/contracts.jobs.module.ts`; integrate 030c before035c.
- **Parallel-safe with TIP-032b (coverage-closure manifest):** sequential, shares `packages/core/src/sales/jobs/payment.jobs.ts`, `packages/core/src/sales/jobs/sales.jobs.module.ts`; integrate 032b before035c.
- **Parallel-safe with TIP-034c (coverage-closure manifest):** sequential, shares `packages/core/src/support/jobs/support.jobs.module.ts`; integrate 034c before035c.
- **Parallel-safe with TIP-034d (coverage-closure manifest):** sequential, shares `packages/core/src/support/jobs/support.jobs.module.ts`; integrate 034d before035c.
- **Dòng COVERAGE nhận:** DEF-031-4; DEF-031-5; DEF-035-1; DEF-035-2; Q-010.

## CONTEXT
- Hiện trạng đối chiếu mã 2026-11-02 (file:dòng, không tin trạng thái DONE):
  - `tools/scripts/fixtures/gen-assistant.py:137` vẫn sinh `conversation.close`; generator `gen-inbox.py`/`gen-assistant.py` lệch fixture đang commit.
  - `packages/db/package.json:17` `tsx scripts/cleanup-test-workspaces.ts` không `--env-file`.
  - E2E mock đỏ sẵn: `settings` "thêm email qua wizard 3 bước" (DEF-035-1); chập chờn `quotes.spec.ts:37`, `settings-ops.spec.ts:44`, `settings.spec.ts:124` (Q-010).
  - Job quét mọi workspace active mỗi chu kỳ: `support/jobs/support.jobs.module.ts:31`, `booking/jobs/booking.jobs.module.ts:35`, `contracts/jobs/contracts.jobs.module.ts:21`, `sales/jobs/{sales.jobs.module.ts:42, payment.jobs.ts:26, order-sync.jobs.ts:14}` (DEF-035-2).

## APPLICABLE STANDARDS
- code/testing.md; database/tenant-db.md; workflow/git-flow-ci.md.
- Không đổi luật COMMERCE, 5 vai trò, quyền đã chốt, đơn giá Credit. Quyết định mới → DECISIONS (DC), câu hỏi → QUESTIONS.

## Rà trước khi làm
1. Đọc lại mọi file trong manifest sau khi TIP phụ thuộc đã tích hợp; lệch CONTEXT → sửa TIP/manifest trước khi code.
2. `python -X utf8 tools/obligations/manifests.py 035c` tính lại giao file; thêm path thì cập nhật manifest + header hai phía.
3. Chạy lại 3 spec chập chờn 20 lần (`--repeat-each=20`) ghi tỉ lệ đỏ trước khi sửa.

## TASK
Đồng bộ generator với fixture, `db:cleanup-test` tự nạp env, sửa E2E đỏ/chập chờn tận gốc, và chỉ quét workspace có việc đến hạn ("armed").

## SPECIFICATIONS
### 1. Fixture + script
1. Sửa generator để `python gen-*.py` tái tạo đúng fixture đang commit (diff rỗng); test CI so sánh.
2. `db:cleanup-test` dùng `--env-file=../../.env` nếu tồn tại, không đè env tường minh.
### 2. E2E
1. Sửa nguyên nhân (chờ điều hướng/URL, chờ dữ liệu, mask drawer chặn click) — không tăng timeout/retry che lỗi; 20 lần liên tiếp xanh.
### 3. Armed set
1. Bảng platform `workspace_due(workspace_id, domain, due_at)` cập nhật khi tạo/sửa bản ghi có hạn (SLA, nhắc, hết hạn HĐ, sync); job quét `WHERE due_at <= now()` theo keyset ≤ 200, không quét mọi workspace; workspace suspended/archived bỏ qua (041).

## ACCEPTANCE CRITERIA
|AC|Given / When|Then — bằng chứng|
|---|---|---|
|1|Chạy generator|fixture không đổi — `tools/scripts/fixtures/check.mjs`|
|2|`pnpm --filter @appchat/db db:cleanup-test` không export env|chạy được|
|3|3 spec chập chờn + wizard email `--repeat-each=20`|20/20 xanh|
|4|1.000 workspace, 3 có việc|job chạm đúng 3 tenant DB — integration đếm kết nối|

### Commands / evidence gate
- `node tools/scripts/fixtures/check.mjs`
- `pnpm e2e settings quotes settings-ops -- --repeat-each=20`
- `pnpm --filter @appchat/api test:integration -- test/integration/armed-sweeps.test.ts`
- Ba cổng D59 (khi làm · trước commit · chốt TIP); parity màn liên quan; E2E mock + http của luồng TIP. Lệnh là cổng tương lai, chưa chạy khi viết TIP.

## CONSTRAINTS
- Không nới timeout/retry để che lỗi.
- Backend 200–400 dòng/file (trần 600), FE trần 400, màn chỉ orchestrator; test file riêng; ghi chỉ qua ActionExecutor; Postgres index `=` trước range/sort, EXPLAIN cho list mới.

## Quality Gate
- Manifest 17 path, header khai hai phía, 4 AC đo được. Viết 2026-11-02 trong đợt đóng lỗ hổng sổ phủ; rà độc lập ở `reports/coverage-closure-audit-2026-11-02.md`. Chưa code / chưa runtime.

## ⚠️ BUILDER-CHECKLIST
- [ ] Rà trước khi làm xong; manifest khớp.
- [ ] Mọi AC có test chạy thật, dán output.
- [ ] Cập nhật COVERAGE (parts + merge.py) với bằng chứng file:dòng + test.
- [ ] Commit, `git status --short` sạch, báo Git SHA; PR vào dev.
