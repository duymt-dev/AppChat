# Sổ lệch spec (goal backend)

> Luật: `goals/GOAL-BACKEND.md` → "Ba sổ của goal" · `BUILDER-HANDOFF.md` → Escalation (L1 ghi vào đây; L2 hỏi trước rồi ghi).
> Ghi chỗ code **cố ý khác** Blueprint / standards / contract FE: thư viện ngoài tech stack, đổi schema action / shape đọc, đổi thứ tự hay phạm vi TIP, đổi cấu trúc thư mục, bỏ / hoãn một phần TIP.
> Lệch **prototype** (UI) ghi ở `docs/06-prototype/DEVIATIONS.md` (PD-xxx), không ghi ở đây.
> Thêm dòng ở cuối, không đánh lại số.

## Trạng thái

- `đề xuất` — thợ ghi khi làm (L1 được làm luôn; L2 đã hỏi Chủ thầu).
- `duyệt` — Chủ thầu duyệt lúc verify (lệch có tính chung thì đưa vào Blueprint / standard và ghi mục đã sửa).
- `từ chối` — sửa code về đúng spec.

## Sổ

| DV | TIP | Spec gốc (file · mục) | Code làm | Lý do | Mức | Ảnh hưởng | Trạng thái |
|----|-----|-----------------------|----------|-------|-----|-----------|-----------|
| DV-001 | 001 | `standards/code/file-size-module-layout.md` §6 (không vòng phụ thuộc) · D59 `pnpm depcheck` | Luật `no-circular` chặn ở mọi package backend + `packages/*`; riêng `apps/web` là `warn` (`no-circular-web`), 99 vòng hiện có ghi baseline `.dependency-cruiser-known-violations.json` — `pnpm depcheck` chỉ đỏ khi có vòng **mới** | Vòng có từ goal FE: barrel `features/*/index.ts` import chéo (customers ↔ quotes / orders / contracts, settings ↔ agents) và mock transport (`store` ↔ `domains/*` ↔ `handlers` / `routes`). Gỡ cần refactor FE ngoài phạm vi TIP-001 | L1 | Không đổi hành vi; vòng mock tự hết khi module nối `http` (TIP 011, 013, 025…); vòng barrel gỡ khi TIP nối API của module chạm tới — xoá dòng khỏi baseline (`npx depcruise … --output-type baseline`) | đề xuất |
| DV-002 | 006 | `02-TASK-GRAPH.md` → Bản đồ sở hữu file (không có file schema cho notify ở DB nền tảng) · CLAUDE.md §9 (thư viện ngoài stack) | Thêm `platform/notify.prisma` (`notification_pref`, TIP-006) + dòng bản đồ sở hữu; `tenant/kernel.prisma` (TIP-002) thêm `event_consumption` + index `notification`. Thư viện: `socket.io` 4.8.4, `@socket.io/redis-adapter` 8.3.0, `@socket.io/redis-emitter` 5.1.0 (Blueprint §4.6 đã chọn), `nodemailer` 10.2.1 (Blueprint §8 đã chọn; bản 10.3.1 chưa qua `minimumReleaseAge`), dev `socket.io-client` 4.8.4 | Tuỳ chọn thông báo theo `db: 'platform'` của action (DC-028); khoá consumer theo outbox §4 (DC-027) | L1 | Không đổi hành vi bảng khác; prisma-stubs test cập nhật 31 file | đề xuất |
| DV-003 | 020 | Blueprint §4.4 misc `POST /v1/files` + §11 `Storage` (L1325, L1402) — không TIP nào trong `02-TASK-GRAPH.md` sở hữu | TIP-020 dựng `kernel/files/{storage.ts (port Storage + LocalStorage), files.service.ts}` trong `KernelModule.forRoot` (global, bật khi có DB) + `apps/api/src/http/files/*` (`POST /v1/files` multipart ≤ 25MB, `GET /v1/files/:id`); env `FILES_DIR` (mặc định `./.data/files`, gitignore). Bản `s3` để khi cần | Kho tri thức cần tải tệp thật; tệp dùng chung cho đính kèm / chứng từ ở TIP sau — đặt ở kernel thay vì trong domain ai | L1 | TIP 024 / 028 / 030 dùng lại `FilesService` + `POST /v1/files` (purpose `attachment` / `document`) | đề xuất |
