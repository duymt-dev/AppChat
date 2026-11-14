### COMPLETION REPORT — TIP-003d

**STATUS:** DONE. Một PR (`tip/003d-openapi`), xếp chồng trên #85 (TIP-045b chốt). Thứ tự merge: #84 → #85 → PR này.

AC đạt 4/4. COVERAGE: REQ-N03b, STD-api-envelope-10b → ĐẠT (`merge.py` 0 lỗ hổng).

**COMMIT:** ghi ở bảng tiến độ `goals/GOAL-RELEASE.md`.

**FILES CHANGED:** khớp manifest `tips/manifests/TIP-003d-files.md`, trừ một chỗ lệch và hai file thêm:
- **Lệch:** `apps/api/src/bootstrap.ts` (M trong manifest) không cần sửa. Controller docs đăng ký ở `kernel.http.module.ts`, nên `createApi()` và harness test cùng nhận route mà không phải gắn thêm module.
- **Thêm** `apps/api/test/fixtures/json-schema-lite.ts`: validator JSON Schema 2020-12 tối giản, đủ đúng các keyword mà schema chính thức OAS 3.1 dùng. TIP cấm thêm thư viện, nên không dùng ajv.
- **Thêm** `.env.example`: `API_DOCS`, `APP_BUILD_SHA`.

Chi tiết:
- **`route-scan.ts`:** quét controller qua `DiscoveryService` + `PATH_METADATA` / `METHOD_METADATA`.
  - Ghép prefix `/v1` như `prefix.ts`; `:id` → `{id}`.
  - Bỏ `/hooks/*` (webhook nhà cung cấp), `/metrics` và chính `/v1/docs`.
  - Đọc method qua property descriptor, nên không gọi getter của controller. `AuthController.secure` từng làm `/v1/docs` trả 500; đã có test hồi quy.
- **`action-ops.ts`:** mỗi action là một operation riêng `POST /v1/actions/{action.id}`.
  - `input` / `output` zod → JSON Schema 2020-12 (`z.toJSONSchema`, `unrepresentable: 'any'`).
  - Header `Idempotency-Key` bắt buộc theo `requiresIdempotencyKey` (cùng luật executor).
  - Kèm `x-risk`, `x-permission`, `x-agent-grantable`, `x-bulk`.
  - 200 trả `ActionResult`; 202 trả `ActionAccepted` (oneOf preview / duyệt / việc nền / thao tác chờ áp).
- **`document.ts`:** dựng OpenAPI 3.1.0 với `jsonSchemaDialect` base.
  - Envelope: `Data` / `Page` (`next_cursor`) / `Error`.
  - Security: bearer + `x-workspace-id`; route công khai (auth, public, health, business-lookup) khai `security: []`.
  - Route chưa có DTO zod gắn `x-untyped: true`.
- **`openapi.controller.ts`:**
  - `GET /v1/docs`: JSON, dựng một lần mỗi tiến trình, ETag `"oas-<APP_BUILD_SHA>"` → 304.
  - `GET /v1/docs/ui`: HTML render sẵn ở server, không script / CDN, chạy được dưới CSP `default-src 'none'`.
  - Bật khi không phải production, hoặc khi `API_DOCS=1`; tắt thì trả 404 envelope chuẩn.

**TEST RESULTS** (đầu cổng đã chạy `db:test-reset`):
- Acceptance criteria: 4/4
  1. **AC1:** `/v1/docs` hợp lệ OpenAPI 3.1 theo schema chính thức (fixture `openapi-3.1.schema.json`, spec.openapis.org 2022-10-07). Validator được kiểm ngược: thiếu `info`, `openapi: '2.0'`, path không có `/` đều bị bắt.
     - Test: `test/openapi.test.ts`, `test/integration/openapi.test.ts`. **pass**
  2. **AC2:** mọi route Nest đã đăng ký (> 150, quét độc lập trong test) có trong spec, trừ hooks / metrics / docs; mọi action có operation kèm input / output schema; không lộ `/hooks/*` / `/metrics`.
     - **pass**
  3. **AC3:** production không đặt `API_DOCS=1` → `/v1/docs` và `/v1/docs/ui` trả 404 `NOT_FOUND`; `API_DOCS=1` → bật lại.
     - **pass**
  4. **AC4:** số operation `x-untyped` = 175. Baseline đặt 175 trong test; tăng thì đỏ, giảm thì hạ baseline.
     - **pass**
- Lệnh đã chạy:
  - api unit: 2 file / 11 test (openapi 6, health 5).
  - integration: `openapi` 5 + `hardening-security` 8 (header bảo mật / CORS không đổi).
  - api lint + typecheck xanh.
  - build api + worker → `pnpm check:bundle` xanh (api 34, worker 30 gói đều khai). `depcheck` 0 lỗi.
  - Spec thực tế: 464 operation, khoảng 695 KB JSON.
- Không chạy E2E / parity: TIP không có UI người dùng (`/v1/docs/ui` là trang tĩnh cho dev, không có trong prototype).

**ISSUES DISCOVERED:**
- Quét prototype bằng `proto[key]` gọi getter → 500. Đã sửa bằng descriptor; unit test có controller mang getter phụ thuộc state.
- Khởi động lại harness với `NODE_ENV=production` bị kiểm env production chặn (`MAIL_PROVIDER` console). Test AC3 đổi tạm env của app đang chạy thay vì khởi động lại; cổng docs đọc env mỗi request vì `ENV_SOURCE` truyền theo tham chiếu.

**ĐỐI CHIẾU STANDARDS** (mục APPLICABLE STANDARDS của TIP):

| Standard | Tuân thủ (file / test) | Lệch |
|---|---|---|
| `api/response-envelope.md` §10 | `document.ts` components `Data` / `Page` / `Error` + `responses.Error`; 202 `ActionAccepted`; tiền vẫn là string theo schema zod của action | — |
| `actions/action-registry.md` | Một operation mỗi action từ `registry` (input / output zod, risk, permission, agentGrantable); Idempotency-Key theo `requiresIdempotencyKey` (`test/openapi.test.ts`) | — |
| `ops/observability-security.md` | Không liệt kê `/hooks/*`, `/metrics`; production tắt mặc định (`docsEnabled`); không secret / URL nội bộ (test regex postgres / redis / localhost) | — |
| `code/testing.md` | Unit + integration ở file riêng; fixture schema chính thức; baseline untyped | — |
| `workflow/git-flow-ci.md` | Nhánh `tip/003d-openapi`, PR vào `dev`, xếp chồng #85 | — |

**GIẢ ĐỊNH ĐÃ CHỌN:**
- Tag theo đoạn path đầu sau `/v1`, ổn định và khớp nhóm route FE gọi.
- Docs bật mặc định ngoài production (dev / test), production chỉ khi `API_DOCS=1` (TIP SPEC 2).
- Route GET không kết thúc bằng tham số mô tả là danh sách `{ data, next_cursor }`, trừ counts / stats / me / board / overview / summary.

**Lệch spec:** không thêm thư viện. Validator tự viết chỉ dùng trong test.
