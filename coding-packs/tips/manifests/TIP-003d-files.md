# TIP-003d — exact file manifest

M modify, C create. Không wildcard; test file riêng.

| Mode | Exact file | Responsibility |
|---|---|---|
| M | `apps/api/src/bootstrap.ts` | Gắn module docs |
| M | `apps/api/src/http/kernel/kernel.http.module.ts` | Đăng ký controller docs |
| C | `apps/api/src/http/kernel/openapi.controller.ts` | GET /v1/docs, /v1/docs/ui |
| C | `apps/api/src/openapi/document.ts` | Dựng document từ route + action |
| C | `apps/api/src/openapi/route-scan.ts` | Quét metadata Nest |
| C | `apps/api/src/openapi/action-ops.ts` | Operation cho action |
| C | `apps/api/test/openapi.test.ts` | Unit dựng spec |
| C | `apps/api/test/integration/openapi.test.ts` | Integration route phủ |
| C | `apps/api/test/fixtures/openapi-3.1.schema.json` | Schema validate |
