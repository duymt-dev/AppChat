### COMPLETION REPORT — TIP-041 (pha 1 / 3 — archive / restore native)

**STATUS:** pha 1 DONE (TIP chưa DONE). Chia pha theo DC-375, mỗi pha một PR xếp chồng: **P1** nền tảng lưu trữ / khôi phục DB tenant trên Postgres native (PR này) → **P2** hoạt động + quét 90 ngày + cảnh báo 14 ngày + member mở workspace → khôi phục (UI "Đang khôi phục") → **P3** Owner danger zone (xoá + OTP + backup 30 ngày + purge, yêu cầu đóng băng, xuất logic).

**COMMIT:** P1 code + test ở nhánh `tip/041-workspace-lifecycle` (SHA ở bảng tiến độ `goals/GOAL-RELEASE.md`).

**MIGRATION:** **platform** `20261102004100_workspace_lifecycle` (`workspace.lifecycle_generation`, `workspace_lifecycle_job`, `archive_manifest`). Sau merge: `pnpm --filter @appchat/db db:migrate-tenants` (áp migration platform còn thiếu) + **`pnpm --filter @appchat/db db:setup`** (tạo template nền `appchat_tenant_base` chỉ extension — cần quyền admin cụm; idempotent) + build lại api / worker. Production cần `ARCHIVE_KEYS` + `ARCHIVE_KEY_ID` + `ARCHIVE_DIR` (045 cấp); thiếu khoá → worker không chạy lưu trữ (lệnh nằm chờ, không mất).

---

## Pha 1 — thay đổi

**FILES CHANGED** (manifest + ngoài manifest ở DV-042)
- db:
  - `prisma/platform/workspace-lifecycle.prisma` + migration;
  - `identity.prisma` (`lifecycleGeneration`);
  - `src/lifecycle/pg-process.ts` — pg_dump / pg_restore theo argv, env con tối giản, mật khẩu chỉ ở PGPASSWORD, stderr đã che;
  - `src/lifecycle/archive-storage.ts` — phong bì AES-256-GCM theo khối, key ring, kho tệp cục bộ có gốc cố định;
  - `src/lifecycle/operation-lock.ts` — advisory lock theo cluster, DROP / CREATE trên kết nối giữ khoá;
  - `src/lifecycle/archive.ts` — dump → mã → kho → đọc lại → kiểm;
  - `src/lifecycle/restore.ts` — DB tạm → restore → migrate → rename;
  - `src/setup.ts` (template nền), `src/index.ts`.
- actions: `workspace-lifecycle.ts` (`admin.workspace.archive / restore`), `index.ts`.
- core `identity/lifecycle/`:
  - `types.ts`, `jobs.ts` (lệnh bền + CAS);
  - `archive-run.ts`, `restore-run.ts`, `recovery.ts` (ma trận lỗi);
  - `actions.ts` (handler nền tảng), `lifecycle.providers.ts` (env → hạ tầng), `lifecycle.module.ts`;
  - `dispatcher.ts` (worker duy nhất queue `tenant`).
- core khác:
  - `identity.module.ts`, `jobs/identity.jobs.module.ts`;
  - `jobs/tenant-provision.processor.ts` — chỉ provision từ `provisioning`, CAS active;
  - `kernel/actions/platform-execution.ts` (`PLATFORM_ALWAYS_PREVIEW`);
  - `identity/public.ts`.
- i18n: `actions.admin.workspace.{archive,restore}.title` vi / en.
- test:
  - `packages/db/test/lifecycle.test.ts`;
  - `packages/core/test/workspace-lifecycle.test.ts`;
  - `apps/api/test/integration/workspace-lifecycle.test.ts` (+ helper, `ARCHIVE_DIR` tạm ở setup);
  - sửa `prisma-stubs.test.ts`, `cross-db-handlers.test.ts`.

**Giả định đã chọn (gap-filling):**
1. Khôi phục không superuser: template nền chỉ extension (`appchat_tenant_base`, db:setup dựng) + danh mục pg_restore bỏ mục EXTENSION. Đã thử: restore vào DB từ `template0` bằng provisioner lỗi `permission denied to create extension "vector"`.
2. Outbox sự kiện chờ phát không chặn lưu trữ: sự kiện nằm trong dump, relay phát sau khôi phục. Chỉ run AI `running` và tin gửi `dispatch_reserved` / `sending` chặn (tác dụng ra ngoài).
3. Kho lưu trữ là thư mục cục bộ (`ARCHIVE_DIR`); bucket S3 riêng để 045 khi có VPS (Q-006).

## Kiểm thử (pha 1 — D59 trước commit)

- `pnpm --filter @appchat/db db:test-reset` — xong (platform 20 migration, template nền được tạo).
- `pnpm turbo run lint typecheck` (db / core / actions / api / worker / web) — xanh.
- `pnpm turbo run test` (db / core / actions / api / worker / web / shared) — xanh:
  - db `lifecycle.test.ts` 8 ca: khứ hồi 0 B / 17 B / 2,5 MiB; nonce khác mỗi bản; sửa 1 byte / cắt khối cuối / đảo khối / khoá lạ / khoá sai → lỗi; xoay khoá; khoá kho chặn `../`; tên DB tạm chặn platform / template / postgres; host ngoài allowlist; che mật khẩu stderr;
  - core `workspace-lifecycle.test.ts` 9 ca: ma trận quyết định sau lỗi, key ring dev / production.
- Integration Postgres 16 + pg_dump / pg_restore thật — `onboarding`, `workspaces` (provision qua dispatcher mới), `platform-workspaces`, `platform-admin`, `workspace-lifecycle` — **5 file / 30 test xanh**. Riêng `workspace-lifecycle`:
  - action luôn 202 trước; người thường / Owner 403; `if_version` cũ 409; một lệnh đang chạy → lệnh thứ hai 409;
  - lưu trữ: DB tenant mất, registry archived, API 423; bản `.acar` đúng kích thước manifest, không chứa tên / SĐT rõ; provision lạc trả `skipped`, không tạo DB rỗng;
  - khôi phục: 300 khách về đủ, đọc qua API, schema version hiện tại, bản lưu trữ gốc còn;
  - lỗi trước DROP (kho trả byte sai khi đọc lại) → DB còn, active, lệnh failed, không thêm manifest;
  - khoá advisory bị giữ → `lock_busy`, DB không đụng; host lạ → từ chối;
  - restore checksum sai → DB tạm thế hệ đã dọn, vẫn restoring; sửa xong thử lại → active;
  - crash giả sau bước drop → thử lại hoàn tất archived dựa manifest, đúng một manifest mới.
- `pnpm depcheck`, build api + worker, `pnpm check:bundle`, `lint:size` — xanh.
- **Benchmark khôi phục (AC05, fixture khai báo):**
  - fixture: DB tenant 142 bảng + 300 khách — dump 474 KB, bản mã 474 KB;
  - thời gian: wall 2,3 giây (verify 38 ms · pg_restore 1 757 ms · migrate 35 ms · kiểm 64 ms; chưa gồm hàng đợi);
  - kết luận: ≤ 120 giây với fixture này. **Không** suy ra SLA cho workspace lớn — số đo workspace thật ghi ở P2 / 045.

## Đối chiếu standards

| Standard | Tuân thủ (file / test) | Lệch |
|---|---|---|
| `database/tenant-db.md` | DB tenant chỉ qua registry + resolver; tên DB `ws_<12>` kiểm dạng trước mọi DDL; DROP không bao giờ platform / template / postgres (test tên) | — |
| `database/indexing.md` | `workspace_lifecycle_job_due_idx (status, next_attempt_at, id) INCLUDE` partial; unique partial một lệnh active; manifest `(workspace_id, created_at desc, id) INCLUDE (checksum, retention_kind, expires_at)`; purge partial `(expires_at, id)` | — |
| `actions/action-registry.md` | 2 action platform_admin, config, `agentGrantable: false`, LUÔN preview, CAS `if_version`; ghi qua ActionExecutor (audit + biên nhận cùng transaction); handler chỉ tạo lệnh bền | — |
| `events/outbox.md` | `workspace.ready` qua outbox tenant sau active; wake BullMQ chỉ là tín hiệu (lệnh bền ở DB, quét 30 giây) | — |
| `domain/state-machine.md` · `concurrency.md` | db_status CAS từng chuyển; `lifecycle_generation` + lease + khoá cluster; worker cũ không ghi đè | — |
| `ops/observability-security.md` | pg chạy argv, không shell; mật khẩu chỉ env con; stderr đã che; lỗi trả mã (không đường dẫn); bản lưu trữ mã hoá AES-256-GCM, khoá không vào manifest / bản lưu trữ | — |
| `authz/rbac-permissions.md` | `platform_admin` kiểm sống mỗi lần; Owner workspace không lưu trữ / khôi phục | — |
| `api/response-envelope.md` | 202 preview / 409 CONFLICT / INVALID_TRANSITION / 423 WORKSPACE_UNAVAILABLE theo envelope | — |
| `code/file-size-module-layout.md` · `testing.md` | file lifecycle tách theo trách nhiệm, đều dưới trần (lint:size); test riêng unit / integration native | DV-042 (tách thêm file) |
| `workflow/git-flow-ci.md` | nhánh `tip/041-workspace-lifecycle` xếp chồng #105, PR vào `dev` | — |

**Chưa nghiệm thu với provider thật:** không có provider ngoài ở P1. Kho S3 / VPS và khoá production (045, Q-006) chưa có — chạy local `ARCHIVE_DIR` + khoá dẫn xuất dev.
