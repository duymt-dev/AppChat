### COMPLETION REPORT — TIP-026b (Hoạt động CRM: ghi chú / bình luận, việc chăm sóc, cơ hội)

**STATUS:** ĐANG LÀM — pha 1 / 4 (DC-387). P2 giao diện, P3 Kanban + CAS bố cục, P4 nhập / xuất + ai:live + chốt.

**COMMIT:** nhánh `tip/026b-crm-activities` xếp chồng trên `tip/012b-bank-connectors-p5` (#126). SHA ở bảng tiến độ `goals/GOAL-RELEASE.md`.

**MIGRATION:** P1 **tenant** `20261108040000_crm_activities` → sau merge chạy `db:migrate-tenants` + build lại api / worker.

---

## Pha 1 — nền server: schema, 9 action, reader, Hồ sơ 360° thật (§1–2, §3.1, §6 — AC1–AC4)

**FILES CHANGED** (manifest `tips/manifests/TIP-026b-files.md`; lệch ghi ở DV-061)
- db: `prisma/tenant/crm.prisma` (`contact_note` thêm kind / version / deleted_at / nguồn / actor, tác giả nullable; TimelineType thêm comment / contact_task / contact_opportunity), `prisma/tenant/crm-activities.prisma` (mới — `contact_task`, `contact_opportunity`), migration `20261108040000_crm_activities` (CHECK tiêu đề 1–200, tiền 0…999.999.999.999, xác suất 0–100, done ⇔ completed_at; 3 index covering / partial).
- shared: `crm/activity-state.ts` (trạng thái + chuyển việc + regex tiền), `api/contact-activities.ts` (DTO trang / tóm tắt), `contact360Schema.activities`, khoá timeline server vi / en.
- actions: `contact-notes.ts` (contact.add_note agentGrantable true, contact.add_comment, contact_activity.list), `contact-tasks.ts`, `contact-opportunities.ts`; `crm-schemas.ts` `activitySource`.
- core: `crm/activities/*` (authority, member-authz, projection, repository, read.service, undo, previews, 3 file handler, module); `contact360.ts` `withActivities`; `crm-read.service.ts` `activities`; `timeline.service.ts`; ghi chú lúc tạo khách ghi tác giả / actor đúng.
- api: `GET /v1/contacts/:id/activities` (`contact-activities.controller.ts`).
- web: tiêu đề 9 action vi + en.
- test mới: api `contact-activities.test.ts` (9) + 9 ma trận action (27).

**Giả định đã chọn (gap-filling)**
- Tiền cơ hội dùng quyền sẵn có: đọc crm.view ∩ quote.view (thiếu → vắng `amount_vnd` + `amount_hidden`), ghi crm.edit ∩ quote.create (thiếu → 403) — không thêm quyền / vai trò.
- Hoàn tác bản ghi mới = xoá mềm / huỷ / lưu trữ (không xoá cứng); đã bị sửa sau action → 409.
- Agent kênh không có user → tác giả null + actor_type / actor_id; không giao việc cho agent.
- Cursor giữ timestamp dạng text (micro giây) — Date JS mất micro giây gây lặp dòng giữa trang.

**CỔNG TEST (P1)**
- `db:test-reset` → api `contact-activities` 9/9 (EXPLAIN 10k: Index Only Scan cả 3 index, không Sort, ~0,08 ms — `.data/gate/026b-p1-explain.txt`) + 9 ma trận 27/27; hồi quy CRM 11 file 65/65.
- `pnpm turbo run lint typecheck test --filter="...[origin/dev]"`: 39/39 (core 718). `pnpm depcheck` 0 lỗi. `i18n-check` 100%.
- Web inbox / customers / shared api unit 270/270. P1 không đổi giao diện → parity / E2E màn ở P2.

**ĐỐI CHIẾU STANDARDS (P1)**

| Standard | Kết quả |
|---|---|
| `actions/action-registry.md` | 9 action zod input / output, permission, risk, preview lệnh ghi, undo 24h theo version, invalidates; agentGrantable theo Blueprint |
| `database/tenant-db.md` | bảng tenant không workspace_id; qua TenantDbResolver; scope khách cha áp ở mọi đọc / ghi |
| `database/indexing.md` | bằng trước, sắp xếp sau; INCLUDE version; partial chưa xoá / chưa lưu trữ; EXPLAIN ghi lại |
| `domain/concurrency.md` | FOR UPDATE + if_version → 409 STALE_VERSION; không đổi gì → không tăng version |
| `domain/money-time-numbering.md` | tiền chuỗi VND BIGINT; due_at có offset; ngày dự kiến DATE |
| `authz/rbac-permissions.md` | quyền khách cha hiện tại; người được giao kiểm theo quyền của họ; tiền theo quote.view / quote.create |
| `events/outbox.md` | sự kiện chỉ {contact_id, activity_id, version}; cùng transaction |
| `api/response-envelope.md` | `{data, next_cursor}`; lỗi theo trường 422 / 409 / 404 |
| `code/file-size-module-layout.md` | file ≤ 250 dòng; test riêng |
