# TIP-046 — Release gate: CI backend, build smoke, hiệu năng, a11y, i18n, parity đầy đủ

## HEADER
- **Parallel-safe with TIP-035d (coverage-closure manifest):** sequential, shares `apps/web/package.json`, `package.json`, `tools/parity/src/cli.ts`, `tools/scripts/e2e-http.mjs`; integrate 035d before046.
- **Parallel-safe with TIP-048c (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 048c before046.
- **Parallel-safe with TIP-048d (coverage-closure manifest):** sequential, shares `tools/scripts/e2e-http.mjs`; integrate 048d before046.
- **Parallel-safe with TIP-048e (coverage-closure manifest):** sequential, shares `tools/scripts/e2e-http.mjs`; integrate 048e before046.
- **Parallel-safe with TIP-048f (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 048f before046.
- **Parallel-safe with TIP-048g (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 048g before046.
- **Parallel-safe with TIP-047 (coverage-closure manifest):** sequential, shares `pnpm-lock.yaml`; integrate 047 before046.
- **Parallel-safe with TIP-047d (coverage-closure manifest):** sequential, shares `apps/web/package.json`, `pnpm-lock.yaml`, `tools/parity/parity.manifest.ts`; integrate 047d before046.
- **Parallel-safe with TIP-026c (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 026c before046.
- **Parallel-safe with TIP-032e (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 032e before046.
- **Parallel-safe with TIP-003i (coverage-closure manifest):** sequential, shares `coding-packs/DEVIATIONS.md`; integrate 003i before046.
- TIP-ID: TIP-046; Project: AppChat V2; Module: release evidence gate; Priority: P0; Estimated: XL, bốn lát (CI + smoke, runner + parity receipt, hiệu năng, a11y/i18n + gate report).
- Depends on: **tất cả TIP chờ** (tích hợp sau cùng); tiêu thụ receipt của 044 (AI eval) và 045 (hạ tầng, backup/restore drill). Không chứa logic RAG (020e), backup (045), eval (044) hay sửa UI (001c và các TIP màn).
- **Files touched:** [exact M/C manifest](manifests/TIP-046-files.md) — 33 paths. 046 là TIP tích hợp cuối; dòng khai hai phía bên dưới (`python -X utf8 tools/obligations/manifests.py --order`).
- **Parallel-safe with:** tuần tự với mọi TIP chung file, 046 luôn sau.
- **Parallel-safe with TIP-012b:** sequential, shares `tools/parity/parity.manifest.ts`; integrate 012b before046.
- **Parallel-safe with TIP-012c:** sequential, shares `tools/parity/parity.manifest.ts`; integrate 012c before046.
- **Parallel-safe with TIP-014b:** sequential, shares `tools/parity/parity.manifest.ts`; integrate 014b before046.
- **Parallel-safe with TIP-015b:** sequential, shares `tools/parity/parity.manifest.ts`; integrate 015b before046.
- **Parallel-safe with TIP-015c:** sequential, shares `tools/parity/parity.manifest.ts`; integrate 015c before046.
- **Parallel-safe with TIP-015d:** sequential, shares `tools/parity/parity.manifest.ts`; integrate 015d before046.
- **Parallel-safe with TIP-015e:** sequential, shares `tools/parity/parity.manifest.ts`; integrate 015e before046.
- **Parallel-safe with TIP-015f:** sequential, shares `tools/parity/parity.manifest.ts`; integrate 015f before046.
- **Parallel-safe with TIP-019b:** sequential, shares `tools/parity/parity.manifest.ts`; integrate 019b before046.
- **Parallel-safe with TIP-019c:** sequential, shares `tools/parity/parity.manifest.ts`; integrate 019c before046.
- **Parallel-safe with TIP-020d:** sequential, shares `tools/parity/parity.manifest.ts`; integrate 020d before046.
- **Parallel-safe with TIP-022b:** sequential, shares `tools/parity/parity.manifest.ts`; integrate 022b before046.
- **Parallel-safe with TIP-023b:** sequential, shares `package.json`, `pnpm-lock.yaml`, `tools/parity/parity.manifest.ts`; integrate 023b before046.
- **Parallel-safe with TIP-023c:** sequential, shares `apps/web/package.json`, `pnpm-lock.yaml`, `tools/parity/parity.manifest.ts`; integrate 023c before046.
- **Parallel-safe with TIP-023d:** sequential, shares `tools/parity/parity.manifest.ts`; integrate 023d before046.
- **Parallel-safe with TIP-023f:** sequential, shares `tools/parity/parity.manifest.ts`; integrate 023f before046.
- **Parallel-safe with TIP-023g:** sequential, shares `tools/parity/parity.manifest.ts`; integrate 023g before046.
- **Parallel-safe with TIP-025b:** sequential, shares `tools/parity/parity.manifest.ts`; integrate 025b before046.
- **Parallel-safe with TIP-026b:** sequential, shares `tools/parity/parity.manifest.ts`; integrate 026b before046.
- **Parallel-safe with TIP-027b:** sequential, shares `tools/parity/parity.manifest.ts`; integrate 027b before046.
- **Parallel-safe with TIP-030b:** sequential, shares `tools/parity/parity.manifest.ts`; integrate 030b before046.
- **Parallel-safe with TIP-032b:** sequential, shares `package.json`, `pnpm-lock.yaml`, `tools/parity/parity.manifest.ts`; integrate 032b before046.
- **Parallel-safe with TIP-032c:** sequential, shares `tools/parity/parity.manifest.ts`; integrate 032c before046.
- **Parallel-safe with TIP-032d:** sequential, shares `tools/parity/parity.manifest.ts`; integrate 032d before046.
- **Parallel-safe with TIP-033b:** sequential, shares `tools/parity/parity.manifest.ts`; integrate 033b before046.
- **Parallel-safe with TIP-033c:** sequential, shares `tools/parity/parity.manifest.ts`; integrate 033c before046.
- **Parallel-safe with TIP-034b:** sequential, shares `tools/parity/parity.manifest.ts`; integrate 034b before046.
- **Parallel-safe with TIP-034c:** sequential, shares `tools/parity/parity.manifest.ts`; integrate 034c before046.
- **Parallel-safe with TIP-034d:** sequential, shares `tools/parity/parity.manifest.ts`; integrate 034d before046.
- **Parallel-safe with TIP-037:** sequential, shares `tools/parity/parity.manifest.ts`; integrate 037 before046.
- **Parallel-safe with TIP-038:** sequential, shares `tools/parity/parity.manifest.ts`; integrate 038 before046.
- **Parallel-safe with TIP-038b:** sequential, shares `tools/parity/parity.manifest.ts`; integrate 038b before046.
- **Parallel-safe with TIP-039:** sequential, shares `tools/parity/parity.manifest.ts`; integrate 039 before046.
- **Parallel-safe with TIP-040:** sequential, shares `tools/parity/parity.manifest.ts`; integrate 040 before046.
- **Parallel-safe with TIP-042:** sequential, shares `tools/parity/parity.manifest.ts`; integrate 042 before046.
- **Parallel-safe with TIP-042b:** sequential, shares `tools/parity/parity.manifest.ts`; integrate 042b before046.
- **Parallel-safe with TIP-043:** sequential, shares `tools/parity/parity.manifest.ts`; integrate 043 before046.
- **Parallel-safe with TIP-045b:** sequential, shares `pnpm-lock.yaml`, `tools/parity/parity.manifest.ts`; integrate 045b before046.
- **Parallel-safe with TIP-004b (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 004b before046.
- **Parallel-safe with TIP-013b (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 013b before046.
- **Dòng COVERAGE nhận:** REQ-C01c; REQ-N07 (phần đo); REQ-N08a (phần cổng: tiêu thụ drill 045); REQ-N10d (phần đo tự động, sửa ở 001c); REQ-N14; D40; DEF-002-1; DEF-004-1; DEF-034-3 (phần đo; sửa drawer ở 001c); Q-008; Q-009; Q-017; Q-020 (phần đo; mask lưới kênh theo DC-295, áp ở 014c); STD-workflow-git-4c; STD-workflow-git-4d. STD-ai-rag-6b/10b và Q-002 đã chuyển sang 020e.

## CONTEXT
- Nguồn: `reports/release-gate-source-audit-2026-11-02.md`; đối chiếu lại mã 2026-11-02:
  - `tools/scripts/e2e-http.mjs:11–39` đọc `.env` đè env tường minh (`{...process.env, ...base}`), cổng mặc định 4117, `mkdtemp` không khai báo sở hữu; chỉ chờ `/v1/health` (L62–75), không chờ worker; `stop()` (L57–60) kill rồi xoá thư mục ngay, không chờ thoát; không dọn workspace test (Q-017).
  - `apps/web/playwright.http.config.ts:22` `reuseExistingServer: E2E_REUSE==='1'`, URL API/WS mặc định `localhost:4117`.
  - `.github/workflows/`: ci, e2e, full, parity — **không có `backend-it.yml`**; `full.yml` build mock + parity + E2E mock, không service Postgres/Redis. Root `package.json` không có `smoke:build`.
  - `tools/scripts/i18n-check.mjs:6,18` `REQUIRED=['vi','en']` nhưng chỉ duyệt thư mục đang có — xoá cả thư mục `en` vẫn có thể xanh; không kiểm placeholder ICU.
  - `tools/parity/src/cli.ts:36–81` ghi `results.json` (id/ratio/pass) không SHA/fixture/mask digest; chọn rỗng vẫn thoát 0.
  - `apps/web/package.json` không có axe; `apps/web/e2e/list-scroll.spec.ts` chỉ kiểm cuộn phân trang, không đo hiệu năng.
  - 044 tạo `tools/ai-live/src/native/*` (chưa tồn tại) — 046 dùng entry đã build/export của 044, không import TS tương lai từ `.mjs`.
- CI: dự án không Docker; GitHub runner Ubuntu cài Postgres 16 + pgvector + Redis bằng apt trong job (native service trên runner), không `services:` container. Đây là quyết định kỹ thuật (DC-289), không phải tài nguyên Q-006.

## APPLICABLE STANDARDS
- `workflow/git-flow-ci.md` (D40, backend-it, smoke, bảng cổng D59); `code/testing.md`; `ui/prototype-parity.md` (D42/D43, mask chỉ khi có mã); `ui/interaction-patterns.md`; `i18n/i18n.md`; `ops/observability-security.md`; Blueprint §9 (LCP, bundle, API p95, list 1M, 200 tenant, 99,9%), §11; REQ-N07/N08/N10/N14; D59; DC-289.
- Không đổi luật tiền / quyền / COMMERCE; không nới mask parity (Q-020) khi chưa có mã quyết định.

## Rà trước khi làm
1. Liệt kê receipt thật mà 044 và 045 sinh ra (đường dẫn, schema, SHA) sau khi tích hợp; thiếu → dừng, ghi Q, không tự dựng bằng chứng thay.
2. `python -X utf8 tools/obligations/manifests.py 046` — tính lại giao file với mọi TIP đã tích hợp; thêm path → cập nhật manifest + header hai phía.
3. Chạy `pnpm parity --all` một lượt trên SHA hiện tại, ghi danh sách ca > 4%. `tickets:detail` (DEF-034-3, 4,91%) đã giao 001c sửa; `inbox:connect-channel` (Q-020, 6,20%) có mask lưới kênh theo registry DC-295 do 014c áp. Ca vượt khác phải có TIP màn sửa hoặc mã D/DC mask — 046 không tự mask.
4. Kiểm `.github/workflows/*` hiện có và quota runner; thời gian `backend-it` mục tiêu ≤ 25 phút.

## TASK
Dựng cổng phát hành dựa trên bằng chứng: CI integration backend thật, smoke bản build, runner E2E http an toàn, đo hiệu năng có báo cáo, a11y + i18n tự động, parity có danh tính phát hành, và một gate từ chối mọi ô bằng chứng thiếu / cũ / sai SHA.

## SPECIFICATIONS
### 1. CI backend + build smoke (Q-008, Q-009, DEF-002-1, DEF-004-1, STD-workflow-git-4c/4d)
1. `.github/workflows/backend-it.yml`: trigger PR vào `dev` khi đổi `packages/{core,db,actions,ai,channels,integrations,shared}` hoặc `apps/{api,worker}`, và nightly; cài `postgresql-16`, `postgresql-16-pgvector`, `redis-server` bằng apt, khởi động bằng `pg_ctlcluster`/`redis-server --daemonize`; chạy `pnpm --filter @appchat/db setup:test` rồi integration của mọi package + `role-isolation-release.test.ts` (ma trận 5 vai trò × module × scope + hai tenant chéo). Không secret production; LLM/Zalo/SePay/Brevo = mock.
2. `tools/scripts/smoke-build.mjs` (`pnpm smoke:build`): build api + worker, chạy `node dist/main.js` api + worker `ROLE=jobs|channels|ai` với env tường minh, chờ `/v1/health/ready` của api và cổng health của từng worker (045 định nghĩa) của từng tiến trình, tạo workspace tạm → chạy 1 action ghi → thấy outbox relay + một job tiêu thụ (receipt), kiểm 401/403 chéo tenant/role, tắt êm (SIGTERM, chờ thoát ≤ 30s), dọn đúng workspace mình tạo. Bootstrap eval (044) tách riêng, không nằm trong smoke.
3. Cập nhật bảng cổng D59 trong `git-flow-ci.md`: chốt TIP backend chạy `pnpm smoke:build`.

### 2. Runner E2E http an toàn + parity receipt (Q-017, Q-020, DEF-034-3, REQ-N14)
1. `e2e-http.mjs --release`: không đọc `.env`; mọi cổng/thư mục/DB prefix tường minh qua tham số; ghi `owned.json` (pid, cổng, thư mục, workspace id đã tạo); chờ readiness api + 3 worker; dừng = SIGTERM → chờ exit → mới xoá đúng tài nguyên trong `owned.json`; dọn workspace test qua `db:cleanup-test --ids` (không xoá theo tiền tố rộng). Chế độ dev giữ nguyên hành vi cũ.
2. `playwright.http.config.ts` release mode: cấm reuse server, kiểm `/v1/health` trả SHA/nonce đúng lượt, kiểm URL http/WS đã bake trong bản build web.
3. Parity CLI: receipt `{sha, build_id, fixture_digest, baseline_digest, mask_digest, viewport, ids[], results[]}`; `--release` yêu cầu tập id = mọi state release-required trong manifest (rỗng / thiếu = lỗi); ngưỡng < 5% giữ nguyên. Ca > 5% chặn gate tới khi TIP màn sửa hoặc có mã mask đã duyệt.

### 3. Hiệu năng (REQ-C01c, REQ-N07 phần đo)
1. Kịch bản (Blueprint §9): API đọc list p95 < 300 ms; gửi tin (API nhận → outbox → worker channels fake ack) p95 < 1 s; LCP trang chính < 2,5 s (desktop, build production); JS bundle mỗi route ≤ ngưỡng Blueprint; list 1M dòng (seed native workspace riêng) trang đầu + trang 50 p95 < 300 ms; 200 tenant luân phiên (cache/pool) không lỗi kết nối.
2. Mỗi báo cáo ghi: máy (CPU/RAM/OS), commit SHA, dataset, concurrency, số mẫu cold/warm, p50/p95/p99, lỗi/timeout, provider thật hay replay. Không bỏ mẫu chậm/lỗi. Uptime 99,9% **không** suy từ một lượt đo — ghi "chưa nghiệm thu: cần giám sát 30 ngày (045)".

### 4. A11y + i18n + gate
1. `@axe-core/playwright` (dev dependency, ghi DV): chạy trên inventory route/state (`e2e/release/routes.ts`, gồm 25 màn + drawer chính, mobile 390 và desktop 1440); 0 lỗi serious/critical; kiểm tay bàn phím/focus/tương phản 5 luồng chính ghi checklist. Lỗi tìm thấy giao TIP sửa (001c hoặc TIP màn) — 046 không tự tuyên bố đạt WCAG chỉ nhờ chạy test.
2. i18n: thiếu thư mục locale bắt buộc → đỏ; placeholder ICU vi/en khớp; `localization.spec.ts` render vi/en trên trình duyệt, không key thô.
3. `tools/release/gate.mjs`: đọc `manifest.mjs` (ô bằng chứng bắt buộc theo dòng COVERAGE/AC: CI backend, smoke, http E2E, parity receipt, perf, a11y, i18n, 044 AI receipt, 045 drill RPO/RTO) → mỗi ô phải cùng SHA ứng viên, không skip, không unknown-resource; ngoại lệ chỉ khi trích D/DC. Báo cáo ghi cả lần đỏ đầu và retry. Không có "all green" tự tạo.

## ACCEPTANCE CRITERIA
|AC|Given / When / Then|Evidence|
|---|---|---|
|1|PR đổi `packages/core` → `backend-it` chạy integration + ma trận role/tenant trên Postgres16+pgvector+Redis native runner; đỏ khi một test tenant isolation hỏng (thử bằng nhánh cố ý hỏng)|run log GitHub Actions|
|2|`pnpm smoke:build` → api + 3 worker ready, action ghi → outbox → job receipt, 403 chéo tenant, tắt êm, dọn đúng workspace|`tools/scripts/smoke-build.test.mjs` + log chạy native|
|3|`e2e-http.mjs --release` với `.env` chứa giá trị sai → không bị ảnh hưởng; kill giữa chừng → lượt sau không còn tiến trình/thư mục/workspace mồ côi; không xoá DB ngoài `owned.json`|test runner + kiểm `pg_database` trước/sau|
|4|Parity `--release` với tập rỗng hoặc thiếu state → đỏ; receipt có đủ digest; `tickets:detail`, `inbox:connect-channel` có kết quả thật|`tools/release/tests/gate.test.mjs`, receipt|
|5|Báo cáo hiệu năng đủ trường; ngưỡng §9 đạt hoặc ghi rõ ô không đạt + TIP sửa|`tools/release/performance/report.mjs` output|
|6|axe 0 serious/critical trên inventory; checklist bàn phím 5 luồng|`apps/web/e2e/release/accessibility.spec.ts`|
|7|Xoá `apps/web/messages/en` → `pnpm i18n:check` đỏ; vi/en render thật|`tools/scripts/i18n-check.test.mjs`, `localization.spec.ts`|
|8|Gate với receipt 044 sai SHA / thiếu drill 045 / một ô skip → từ chối, nêu ô; đủ hết → báo cáo phát hành|`gate.test.mjs` + report thật|

### Commands / evidence gate
- `pnpm smoke:build`; `node --test tools/scripts/smoke-build.test.mjs tools/scripts/i18n-check.test.mjs tools/release/tests/gate.test.mjs`
- `node tools/scripts/e2e-http.mjs --release --no-build`; `pnpm parity --all --release`
- `pnpm --filter @appchat/web exec playwright test e2e/release`; `node tools/release/performance/measure.mjs --scenario all`
- `node tools/release/gate.mjs --sha $(git rev-parse HEAD)` — cổng cuối của goal B.
- Thiếu tài nguyên (Q-006 host/domain, Q-001/002 LLM, Q-003 Zalo, Q-004 SePay/Brevo) → ô tương ứng ghi "chưa nghiệm thu với provider thật", gate báo `unknown-resource`, không thay bằng mock.

## CONSTRAINTS
- KHÔNG Docker; KHÔNG secret production trên runner PR; KHÔNG nới mask parity; KHÔNG suy uptime 99,9% từ một lượt; KHÔNG nhét logic RAG/backup/eval vào harness; KHÔNG xoá DB theo tiền tố rộng.
- Thêm `@axe-core/playwright` (dev) phải ghi DEVIATIONS (DV) + lockfile; không thêm thư viện runtime.
- Script ≤ 400 dòng/file, test file riêng; giữ chế độ dev của `e2e-http.mjs` cho người dùng hằng ngày.

## Quality Gate
- Manifest 33 path, header khai hai phía (`manifests.py --order`: 0 vấn đề, 0 vòng), 8 AC đo được; phân ranh giới 020e (rerank/re-embed), 044 (AI), 045 (hạ tầng), 001c (sửa UI). Rà độc lập: `reports/coverage-closure-audit-2026-11-02.md`. Chưa code / chưa chạy CI.

## ⚠️ BUILDER-CHECKLIST
- [ ] Rà trước khi làm 1–4; receipt 044/045 có thật.
- [ ] backend-it + smoke chạy thật trên runner; log dán vào completion report.
- [ ] Runner release không đọc .env, dọn đúng tài nguyên; parity receipt đủ digest.
- [ ] Báo cáo hiệu năng + a11y + i18n đủ trường; ô thiếu tài nguyên ghi rõ.
- [ ] Gate chạy trên SHA ứng viên → commit, `git status --short` sạch, Git SHA; PR vào dev.
