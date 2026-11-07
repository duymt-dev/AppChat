# TIP-046 — exact file manifest

M modify, C create. 046 tiêu thụ bằng chứng của 044 (AI) và 045 (hạ tầng/backup), không chứa logic RAG/backup/eval. Test file riêng.

| Mode | Exact file | Responsibility |
|---|---|---|
| M | `package.json` | smoke:build, release:gate, perf, a11y scripts |
| M | `pnpm-lock.yaml` | Dev dependency @axe-core/playwright (ghi DV) |
| M | `.github/workflows/ci.yml` | Gọi backend-it khi đổi backend; i18n required-locale test |
| M | `.github/workflows/full.yml` | Thêm build smoke + http E2E + gate report; tách eval bootstrap |
| C | `.github/workflows/backend-it.yml` | Postgres 16 + pgvector + Redis native service trên runner, integration + tenant/role isolation |
| M | `tools/scripts/e2e-http.mjs` | Chế độ --release: không đọc .env, cổng/thư mục tường minh, chờ mọi worker ready, chờ thoát rồi mới dọn đúng tài nguyên mình tạo (Q-017) |
| M | `apps/web/playwright.http.config.ts` | Release mode cấm reuseExistingServer, kiểm SHA/nonce + URL http/WS đã bake |
| M | `apps/web/package.json` | Dev dep axe + script e2e:release |
| M | `tools/scripts/i18n-check.mjs` | Lỗi khi thiếu thư mục locale bắt buộc; kiểm placeholder ICU vi/en khớp |
| M | `tools/parity/src/cli.ts` | Receipt release: SHA/build/fixture/baseline/mask digest, viewport; tập chọn rỗng = lỗi; completeness theo manifest |
| M | `tools/parity/parity.manifest.ts` | Đánh dấu release-required states |
| C | `tools/scripts/smoke-build.mjs` | Chạy bản build api + 3 worker role, đợi readiness 045, ghi job+outbox receipt, kiểm từ chối tenant/role |
| C | `tools/scripts/smoke-build.test.mjs` | Unit smoke runner (fake processes) |
| C | `tools/scripts/i18n-check.test.mjs` | Thiếu thư mục vi/en phải đỏ |
| C | `tools/release/manifest.mjs` | Danh sách bằng chứng bắt buộc theo dòng COVERAGE/AC |
| C | `tools/release/evidence.mjs` | Đọc receipt (044 AI, 045 infra, parity, perf, a11y, smoke, http E2E), kiểm SHA |
| C | `tools/release/gate.mjs` | Từ chối thiếu/cũ/skip/sai SHA/unknown-resource; ngoại lệ chỉ khi có D/DC |
| C | `tools/release/report.mjs` | Báo cáo release (lần đỏ đầu, retry, ngoại lệ) — không lộ dữ liệu riêng |
| C | `tools/release/release.schema.json` | Schema receipt |
| C | `tools/release/tests/gate.test.mjs` | Unit gate: thiếu/cũ/sai SHA/skip/ngoại lệ |
| C | `tools/release/performance/scenarios.mjs` | Kịch bản: API đọc list, gửi tin, LCP, bundle, list 1M dòng, 200 tenant |
| C | `tools/release/performance/measure.mjs` | Đo cold/warm, p50/p95/p99, lỗi/timeout, máy/tải/dataset |
| C | `tools/release/performance/report.mjs` | Báo cáo hiệu năng, không bỏ mẫu chậm/lỗi |
| C | `tools/release/performance/workload.schema.json` | Schema workload/fixture |
| C | `tools/release/performance/seed-large.ts` | Sinh dataset 1M dòng vào workspace test riêng (native) |
| C | `apps/web/e2e/release/accessibility.spec.ts` | axe trên route/state inventory |
| C | `apps/web/e2e/release/localization.spec.ts` | Render vi/en trên trình duyệt, không key thô |
| C | `apps/web/e2e/release/performance.spec.ts` | LCP + bundle per route |
| C | `apps/web/e2e/release/routes.ts` | Inventory route/state bắt buộc |
| C | `apps/api/test/integration/role-isolation-release.test.ts` | Ma trận tenant/role isolation cho backend-it |
| M | `coding-packs/standards/workflow/git-flow-ci.md` | Ghi backend-it, smoke:build, release gate vào bảng cổng D59 |
| M | `coding-packs/DEVIATIONS.md` | DV dev dependency axe |
