# TIP-003d — OpenAPI tự sinh tại /v1/docs

## HEADER
- **Parallel-safe with TIP-048 (coverage-closure manifest):** sequential, shares `apps/api/src/http/kernel/kernel.http.module.ts`; integrate 003d before048.
- **Parallel-safe with TIP-048b (coverage-closure manifest):** sequential, shares `apps/api/src/bootstrap.ts`; integrate 003d before048b.
- **Parallel-safe with TIP-047d (coverage-closure manifest):** sequential, shares `apps/api/src/openapi/route-scan.ts`; integrate 003d before047d.
- TIP-ID: TIP-003d; Project: AppChat V2; Module: api contract; Priority: P0; Estimated: M. TIP bổ sung cho TIP-003 (đã DONE, không sửa file gốc — DC-233).
- Depends on: 003 kernel; 045b actions controller; trước 044/045/046.
- **Files touched:** [exact M/C manifest](manifests/TIP-003d-files.md) — 9 paths (7 C). M path tương lai phải do TIP tạo trước tích hợp xong.
- **Parallel-safe with:** tuần tự với mọi TIP chung file (dòng khai hai phía bên dưới, máy kiểm `python -X utf8 tools/obligations/manifests.py --order`).
- **Parallel-safe with TIP-023c (coverage-closure manifest):** sequential, shares `apps/api/src/http/kernel/kernel.http.module.ts`; integrate 023c before003d.
- **Dòng COVERAGE nhận:** REQ-N03b; STD-api-envelope-10b.

## CONTEXT
- Hiện trạng đối chiếu mã 2026-11-02 (file:dòng, không tin trạng thái DONE):
  - `grep openapi|swagger` trong apps/packages = 0. Chỉ có `GET /v1/actions` trả `input_schema` qua `z.toJSONSchema` (`apps/api/src/http/kernel/actions.controller.ts:54`).
  - Không thêm `@nestjs/swagger` (ngoài stack) — sinh từ metadata route Nest + zod 4 `toJSONSchema` có sẵn.

## APPLICABLE STANDARDS
- api/response-envelope.md §10; actions/action-registry.md; ops/observability-security.md (không lộ route nội bộ).
- Không đổi luật COMMERCE, 5 vai trò, quyền đã chốt, đơn giá Credit. Quyết định mới → DECISIONS (DC), câu hỏi → QUESTIONS.

## Rà trước khi làm
1. Đọc lại mọi file trong manifest sau khi TIP phụ thuộc đã tích hợp; lệch CONTEXT → sửa TIP/manifest trước khi code.
2. `python -X utf8 tools/obligations/manifests.py 003d` tính lại giao file; thêm path thì cập nhật manifest + header hai phía.
3. Liệt kê route thật bằng `tools/obligations/routes.mjs` (api), so với spec sinh ra — mọi route phải có mặt.

## TASK
Sinh tài liệu OpenAPI 3.1 từ route Nest + action registry, phục vụ `GET /v1/docs` (JSON) và `/v1/docs/ui` (trang tĩnh tối giản, không CDN ngoài).

## SPECIFICATIONS
### 1. Sinh spec
1. Duyệt controller qua `DiscoveryService` + `PATH_METADATA`/`METHOD_METADATA`; mỗi route có tag module, security cookie/bearer, envelope `{data}`/`{data,next_cursor}`/`{error}`.
2. Action: `POST /v1/actions/{id}` sinh một operation mỗi action với `input`/`output` zod → JSON Schema, `risk`, `permission`, header `Idempotency-Key` khi tạo/send/money.
3. Route đọc chưa có zod DTO: schema `data` = `{}` kèm `x-untyped: true` — test đếm số route untyped và chỉ được giảm.
### 2. Phục vụ
1. `/v1/docs` cache theo SHA build; production chỉ bật khi `API_DOCS=1`, không liệt kê `/hooks/*` bí mật.

## ACCEPTANCE CRITERIA
|AC|Given / When|Then — bằng chứng|
|---|---|---|
|1|Gọi `/v1/docs`|JSON hợp lệ OpenAPI 3.1 (validate bằng schema chính thức lưu trong test fixture)|
|2|So routes.json|mọi route API có trong spec; mọi action có input/output schema|
|3|`API_DOCS` tắt|404|
|4|Số route `x-untyped`|ghi baseline, test chặn tăng|

### Commands / evidence gate
- `pnpm --filter @appchat/api test -- test/openapi.test.ts`
- `pnpm --filter @appchat/api test:integration -- test/integration/openapi.test.ts`
- Ba cổng D59 (khi làm · trước commit · chốt TIP); parity màn liên quan; E2E mock + http của luồng TIP. Lệnh là cổng tương lai, chưa chạy khi viết TIP.

## CONSTRAINTS
- Không thêm thư viện; không đổi envelope; không lộ secret/route nội bộ.
- Backend 200–400 dòng/file (trần 600), FE trần 400, màn chỉ orchestrator; test file riêng; ghi chỉ qua ActionExecutor; Postgres index `=` trước range/sort, EXPLAIN cho list mới.

## Quality Gate
- Manifest 9 path, header khai hai phía, 4 AC đo được. Viết 2026-11-02 trong đợt đóng lỗ hổng sổ phủ; rà độc lập ở `reports/coverage-closure-audit-2026-11-02.md`. Chưa code / chưa runtime.

## ⚠️ BUILDER-CHECKLIST
- [ ] Rà trước khi làm xong; manifest khớp.
- [ ] Mọi AC có test chạy thật, dán output.
- [ ] Cập nhật COVERAGE (parts + merge.py) với bằng chứng file:dòng + test.
- [ ] Commit, `git status --short` sạch, báo Git SHA; PR vào dev.
