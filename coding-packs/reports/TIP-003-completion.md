### COMPLETION REPORT — TIP-003

**STATUS:** DONE
**COMMIT:** `4597498` (code) · `cd429a4` (fix quyền provisioner) · `fc262e2` (test AC3) trên nhánh `tip/003-action-kernel` (xếp chồng trên `tip/002-db-platform-tenant`) — SHA cuối ở bảng tiến độ `goals/GOAL-BACKEND.md`

**FILES CHANGED:**
- Created:
  - `packages/shared/src/errors.ts` (`AppError`, `HTTP_STATUS_OF`, `isAppError`), `state/flow.ts` (`defineFlow`, `nextState`, `assertTransition`, `allowedActions`, `assertVersion`) + test, `codes.ts` (`formatCode`, `CODE_FORMATS`).
  - `packages/core/src/kernel/actions/` — `tip-owners.ts`, `action-context.ts` (`ActionContext`, `Authorizer` port), `policy.ts`, `handler.ts` (`@ActionHandler`), `handler-registry.ts` (`NotImplementedHandler`, boot check), `confirm-token.ts`, `executor.ts` (7 bước), `undo.service.ts`, `dev-authorizer.ts` (`ContextAuthorizer`), `actions.module.ts` (DiscoveryService nạp handler).
  - `packages/core/src/kernel/{redis.ts, sequence.ts}`, `outbox/{outbox.ts, relay.ts, outbox.jobs.module.ts}`.
  - `packages/core/src/notify/actions/notification-mark-read.handler.ts` — handler thật đầu tiên.
  - `apps/api/src/http/kernel/{error.filter.ts, request-actor.ts, actions.controller.ts, kernel.http.module.ts}`.
  - `tools/contract/` (`@appchat/contract`: `CONTRACT_CASES`, `checkActionResponse`) + `apps/web/src/shared/api/mock/contract.test.ts` + `apps/api/test/integration/contract.test.ts`.
  - Test: `packages/core/test/actions-unit.test.ts`, `apps/api/test/integration/{setup,actions.test,relay-sequence.test,contract.test}.ts`, `apps/api/vitest.integration.config.ts`.
- Modified: `packages/shared/src/{api/envelope.ts (+7 mã lỗi), index.ts}`, `packages/core/src/kernel/{kernel.module.ts, index.ts}`, `notify/notify.module.ts`, `apps/api/src/{app.module.ts (forRoot), bootstrap.ts}`, `apps/api/test/health.test.ts`, `apps/worker/src/worker.module.ts` (relay ở ROLE=jobs / all), `packages/db/src/setup.ts` (provisioner + `pg_signal_backend`), `package.json` của core / api / web, `pnpm-workspace.yaml` (+`tools/contract`), `.env.example` (`REDIS_URL`, `APP_ENC_KEY`), `coding-packs/DECISIONS.md`.

**TEST RESULTS:**
- Acceptance criteria: 13/13 pass (Postgres 16 native + Memurai thật cho các ca DB / Redis)
  1. `POST /v1/actions/unknown.x` → 404 `ACTION_NOT_FOUND` — **pass**
  2. Input sai zod → 422 `VALIDATION_FAILED`, `fields.ids` — **pass**
  3. Accountant gọi `tag.create` → 403 `FORBIDDEN`; handler ném scope → 403 `SCOPE_FORBIDDEN`, không có `action_log` — **pass**
  4. Bảng 6 nguồn × 6 risk + bulk (unit); `assistant` + config → 202 `preview_required` + `confirm_token`; kèm token → 200; token gắn input khác / dùng lại → preview lại — **pass**
  5. Idempotency: cùng key + body → kết quả cũ, handler 1 lần; khác body → 409 `CONFLICT`; thiếu key với `*.create` → 422 `fields.idempotency_key = required` — **pass**
  6. `action_log` có `trace_id`, input che PII (`redactDeep`); outbox cùng transaction (payload `ws`, `occurred_at`); handler ném → 500 `INTERNAL`, không log / outbox / dữ liệu / idempotency key — **pass**
  7. Undo trong hạn → khôi phục + `undone`; lần 2 → 409; quá hạn → `UNDO_EXPIRED`; không hỗ trợ → `UNDO_NOT_SUPPORTED` — **pass**
  8. Mọi action trong registry có TIP chủ; handler id lạ / trùng / thiếu decorator → boot fail; `contact.update` → 501 `NOT_IMPLEMENTED` `tip=015` — **pass**
  9. Relay trên Memurai: published; lỗi → `attempts` + `available_at` lùi 2^n giây; lần 8 → `failed`; `outbox:dirty` được rút — **pass**
  10. `assertTransition` / `formatCode` / `assertVersion` (unit); `nextCode` 20 transaction song song → `KH-1001..1020` không trùng; rollback không nhảy số — **pass**
  11. Thiếu / sai `X-Workspace-Id` → 403 trước khi mở DB tenant; thiếu user → 401 — **pass**
  12. Contract `notification.mark_read`: mock transport và HTTP thật cùng qua `checkActionResponse` (envelope + zod output) — **pass**
  13. Cổng D59 — **pass** (dưới)
- **Cổng "trước commit":** `pnpm turbo run lint typecheck test` cho shared · core · api · worker · contract · actions · db · web — 24/24 task (shared 48 · core 51 · api 5 · worker 6 · contract 4 · actions 3 · db 17 · web 72); `pnpm depcheck` xanh (99 known); `lint:size` 947 file.
- **Cổng "chốt TIP":** `pnpm lint` 13/13 (+ size / tokens / masks) · `pnpm typecheck` 13/13 · `pnpm test` 13/13 task, 0 failed · `pnpm --filter @appchat/db test:integration` 7 passed · `pnpm --filter @appchat/api test:integration` **17 passed** (actions 13 · relay-sequence 3 · contract 1) · `pnpm depcheck` xanh · `pnpm i18n:check` 100% (4471 key) · `pnpm build` 3/3 · full E2E hồi quy mock 418 ca → **222 passed · 0 failed · 196 skipped** (3.9m). E2E http + parity: N/A — TIP không có màn UI mới (FE vẫn chạy mock; nối `httpTransport` theo TIP domain — D57).

**ISSUES DISCOVERED:**
- `db test:integration` đỏ 1 lần khi chạy ngay sau `pnpm test`: `DROP DATABASE … WITH (FORCE)` của `appchat_provisioner` không đuổi được kết nối `appchat_tenant_app` còn sót ("permission denied to terminate process"). Sửa: `db:setup` cấp `pg_signal_backend` cho provisioner (`cd429a4`); chạy lại 3 lần xanh. Prod cần cùng quyền khi xoá workspace (TIP-041).
- CI GitHub vẫn chưa có Postgres / Redis → integration chỉ chạy máy dev (Q-008).

**GIẢ ĐỊNH ĐÃ CHỌN:**
- DC-010 — `Authorizer` port + `DevActorResolver` (header `X-Dev-User` / `X-Workspace-Id` / `X-Dev-Role`, tắt ở production) tới TIP-004 / 005.
- DC-011 — `ApprovalGateway` tuỳ chọn; chưa cài → policy approval trả 501 `NOT_IMPLEMENTED tip=021`.
- DC-013 — harness contract là gói `tools/contract`, mỗi phía chạy trong bộ test của mình (web không được import api / core).
- AC4 ghi "422 `PREVIEW_REQUIRED` lại" khi token sai; Blueprint §4.3 (L926) định nghĩa phản hồi preview là **202** `{ status: 'preview_required', preview, confirm_token, expires_at }` → làm theo Blueprint (thứ tự ưu tiên CLAUDE.md §2): token sai / hết hạn / dùng lại → 202 preview mới. Mã `PREVIEW_REQUIRED` (422) giữ trong envelope cho client không đọc được 202.
- Thêm handler test `tag.create` / `tag.delete` chỉ trong `apps/api/test/integration/setup.ts` (ghi bảng `notification`) để thử preview / undo / outbox; handler tag thật thuộc TIP-016.

**DEVIATIONS FROM SPEC:** không có (chọn Blueprint thay chữ AC4 — ghi ở trên).

**SUGGESTIONS FOR CHỦ THẦU:**
- Registry workspace vẫn cache trong process 60s; khi có nhiều tiến trình api, TIP-004 nên invalidate qua Redis pub/sub.

## Supplemental planning audit (2026-11-02)

See [authz audit](authz-planning-audit-2026-11-02.md), STD-database-tenantdb-5a and [TIP-045b](../tips/TIP-045b-app-hardening.md). Nested platform/tenant transactions and the later audit/outbox/idempotency write require fault/retry verification; comments alone do not prove cross-DB consistency. This is a pending corrective requirement, not a claim of reproduced data corruption.
