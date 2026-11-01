# TIP-003: Action kernel + API core

## HEADER
- TIP-ID: TIP-003
- Project: AppChat V2
- Module: `packages/core/src/kernel` + `apps/api` (route `/v1/actions`, `/v1/action-logs`) + `apps/worker` (outbox relay)
- Depends on: TIP-002 (xếp chồng — nhánh tách từ `tip/002-db-platform-tenant`)
- Priority: P0 · REQ: E01, E03, E09, N03, N05, N13, A07
- Estimated effort: 16 giờ
- **Files touched:**
  - `packages/shared/src/errors.ts` (create: `AppError`, `HTTP_STATUS_OF`) + `api/envelope.ts` (modify: thêm mã `INVALID_TRANSITION`, `STALE_VERSION`, `UNDO_EXPIRED`, `UNDO_NOT_SUPPORTED`, `NOT_IMPLEMENTED`, `HAS_DEPENDENCIES`, `SLOT_TAKEN` — mở rộng tương thích ngược)
  - `packages/shared/src/state/flow.ts` (create: `defineFlow`, `nextState`, `assertTransition`, `allowedActions`) + test
  - `packages/shared/src/codes.ts` (create: `formatCode(kind, n)` theo money-time-numbering §3) + test
  - `packages/core/src/kernel/actions/*` — `action-context.ts`, `handler.ts` (`ActionHandler` + decorator `@ActionHandler` + `ActionHandlerRegistry`), `policy.ts` (source × risk §3.3, bulk), `confirm-token.ts`, `idempotency.ts`, `executor.ts`, `undo.service.ts`, `not-implemented.ts`, `tip-owners.ts` (action → TIP), `actions.module.ts`
  - `packages/core/src/kernel/outbox/{outbox.ts, relay.ts, dirty-set.ts}` · `kernel/sequence.ts` (`nextCode`) · `kernel/redis.ts` (ioredis client)
  - `packages/core/src/kernel/errors/*` không — lỗi dùng `AppError` của shared
  - `apps/api/src/http/kernel/{actions.controller.ts, action-logs.controller.ts, error.filter.ts, tenant.guard.ts, kernel.http.module.ts}`; `apps/api/src/app.module.ts` (modify: + `KernelHttpModule`, filter toàn cục)
  - `apps/worker/src/roles/jobs.module.ts` không đổi — relay đăng ký ở `kernel/outbox/outbox.jobs.module.ts` import trong `JobsRoleModule` (modify 1 dòng)
  - `packages/core/test/*`, `apps/api/test/{actions,contract}.test.ts`, `tools/contract/` (harness FE ↔ BE)
- **Parallel-safe with:** sequential (004–006 dựa trên executor)

## CONTEXT
- Blueprint §3.1–3.3b, §4.1, §4.3; standards `actions/action-registry.md`, `api/response-envelope.md`, `events/outbox.md`, `domain/{state-machine,concurrency,money-time-numbering}.md`.
- FE: `apps/web/src/shared/api/{transport,http-transport,mock/mock-transport}.ts` — contract `POST /v1/actions/:id` (200 `{ data: ActionResult }` / 202 `{ data: ActionAccepted }`), `POST /v1/action-logs/:id/undo`.
- `packages/actions` có ~187 action (contract, không đổi schema — action-registry §13).
- Chưa có auth (TIP-004) / authz (TIP-005): executor nhận `Authorizer` port (DC-010).

## TASK
1. **`AppError` + filter toàn cục** → envelope `{ error: { code, message, fields? } }`; zod lỗi → 422 `fields` (path → mã lỗi); lỗi lạ → 500 `INTERNAL` không lộ stack; `WorkspaceUnavailableError` / `WorkspaceNotFoundError` / `TenantContextError` của `@appchat/db` map đúng mã.
2. **`ActionExecutor.execute(ctx, id, input, opts)`** đúng 7 bước action-registry §5: registry → zod → permission (`Authorizer.can`) + scope (handler tự kiểm qua `ctx.authz`) → policy (source × risk, bulk → preview, `PREVIEW_REQUIRED` + `confirm_token` Redis 10 phút gắn hash input) → idempotency (`idempotency_key` DB tenant: replay trả kết quả cũ, khác body → `CONFLICT`) → transaction tenant (`handler.execute` + `action_log` + outbox) → `{ result, action_log_id, undo_until?, ui_target? }`. Approval (`APPROVAL_REQUIRED`) để hook — bảng `approval_request` thuộc TIP-021 (DC-011).
3. **Registry handler:** `@ActionHandler('quote.send')` đăng ký class; boot kiểm **mọi** action trong `packages/actions` có handler — action chưa tới TIP dùng `NotImplementedHandler` trả `NOT_IMPLEMENTED` 501 kèm TIP chủ (`tip-owners.ts`, theo bản đồ sở hữu); handler cho id không có trong registry / trùng → boot fail.
4. **Undo:** `POST /v1/action-logs/:id/undo` → `UndoService` (quá `undo_until` → `UNDO_EXPIRED` 409; handler không có `undo` → `UNDO_NOT_SUPPORTED` 409; đã undone → `CONFLICT`); ghi `status=undone`.
5. **Outbox:** `Outbox.add(tx, topic, payload)` ghi `outbox_event` trong transaction; sau commit `SADD outbox:dirty <ws>`; relay (worker jobs) drain set → publish queue BullMQ `events` → `published`; lỗi retry `2^n` tối đa 8 → `failed`; sweep mọi DB 10 phút.
6. **`defineFlow` / `assertTransition`** (shared) + **`formatCode`** (shared) + `nextCode(tx, kind)` (kernel, `UPDATE … RETURNING`, tạo dòng nếu chưa có).
7. **`if_version`:** helper `assertVersion(row.version, input.if_version)` → `STALE_VERSION` 409.
8. **API:** `POST /v1/actions/:id` (header `X-Workspace-Id`, `Idempotency-Key`, `X-Action-Source`), `GET /v1/actions` (danh mục kèm JSON Schema input, lọc theo quyền), `POST /v1/action-logs/:id/undo`. Guard workspace: thiếu / không hợp lệ `X-Workspace-Id` → 403 trước khi mở DB tenant (TIP-004 thay bằng membership thật — tạm `DevAuthGuard` chỉ bật khi `NODE_ENV≠production`, đọc header `X-Dev-User` — DC-010).
9. **Harness contract FE ↔ BE** (`tools/contract`): chạy cùng request qua mock transport và HTTP API thật, parse cùng zod output; TIP-003 phủ action mẫu `notification.mark_read` (kernel) — TIP sau thêm ca của domain.

## SPECIFICATIONS
### Business Rules
- Policy §3.3: `ui` chạy mọi risk; `assistant` mọi risk ≠ read → preview; `agent`: read / write chạy, send / money → approval, delete / config → `FORBIDDEN`; `task`: read / write chạy, send / money / delete → approval, config → `FORBIDDEN`; `system` chạy; `bulk` luôn preview (kể cả ui). `api` = như `ui`.
- `confirm_token` = HMAC(`APP_ENC_KEY`, actionId + hash input + workspace + actor) lưu Redis `confirm:<token>` TTL 600s; dùng một lần.
- `Idempotency-Key` bắt buộc khi risk `send` / `money` hoặc id kết thúc bằng `.create` → thiếu → 422 `fields.idempotency_key = 'required'`.
- `action_log.input` che PII theo `REDACT_KEYS`; `trace_id` từ RequestContext.
- Outbox payload luôn có `ws`, `occurred_at`.

### Validation & Error Handling
- Mọi lỗi qua `AppError(code, http?, fields?)`; controller không tự `res.status()`.

## ACCEPTANCE CRITERIA
1. `POST /v1/actions/unknown.x` → 404 `ACTION_NOT_FOUND`.
2. Input sai zod → 422 `VALIDATION_FAILED` + `fields` theo path.
3. Thiếu quyền → 403 `FORBIDDEN`; handler ném scope → 403 `SCOPE_FORBIDDEN`.
4. Policy: bảng 6 nguồn × 6 risk ra đúng (unit); `assistant` + write → 202 preview + `confirm_token`; gửi lại kèm token → 200; token sai / hết hạn / dùng lại / input khác → 422 `PREVIEW_REQUIRED` lại.
5. Idempotency: cùng key + cùng body → kết quả cũ, handler chạy 1 lần; cùng key khác body → 409 `CONFLICT`; thiếu key với risk send → 422.
6. Thành công → `action_log` có `trace_id`, input đã che PII; `outbox_event` cùng transaction; handler ném → không có `action_log` succeeded, không outbox (rollback).
7. Undo: trong hạn → `undone`; quá hạn → `UNDO_EXPIRED`; không hỗ trợ → `UNDO_NOT_SUPPORTED`.
8. Boot: mọi action trong registry có handler (thật hoặc `NOT_IMPLEMENTED` có TIP chủ); handler cho id lạ → boot fail; gọi action chưa cài → 501 `NOT_IMPLEMENTED` + `tip`.
9. Relay: event pending → published sau drain; lỗi publish → attempts tăng, `available_at` lùi `2^n` giây; 8 lần → `failed`.
10. `assertTransition` / `formatCode` / `nextCode` (20 lần song song → 1..20 không trùng, DB thật) / `assertVersion`.
11. `X-Workspace-Id` thiếu / không có membership → 403 không mở DB tenant.
12. Contract harness: `notification.mark_read` qua mock và HTTP cùng parse output zod.
13. Cổng D59 xanh.

## CONSTRAINTS
- Không đổi schema action trong `packages/actions` (§13). Thêm mã lỗi = mở rộng tương thích ngược (gap-filling §5).
- Thư viện mới: `ioredis`, `bullmq` (stack Blueprint §1.3).

## ⚠️ BUILDER-CHECKLIST
- [ ] Đúng `Files touched` · 13 AC có test thật (Postgres + Memurai)
- [ ] Cổng D59 trước commit + chốt TIP
- [ ] Commit + SHA + report + ba sổ + tiến độ
