# Code — Testing

## Quy tắc

1. **Test ở file riêng**, không viết test inline trong file production.
   - Unit / integration: `*.test.ts` cạnh file hoặc trong `test/`.
   - E2E: `apps/web/e2e/*.spec.ts`.
   - Parity: `tools/parity`.
2. **Tầng test:**
   - **unit** (vitest): business rule, policy matrix, tính tiền / VAT / loyalty, scope filter.
   - **integration** (vitest + Postgres thật + Redis thật / Memurai): `appchat_platform_test` + DB tenant tạo từ template cho mỗi suite, drop khi xong. **Không mock DB.**
   - **contract:** channel adapter, connector (mock + fixture), action registry (mỗi action có handler, schema hợp lệ, có description).
   - **e2e** (Playwright): luồng chính desktop 1440 và mobile 390.
   - **parity** (`ui/prototype-parity.md`).
   - **AI eval** (`ai/eval.md`).
3. **Test bắt buộc theo loại thay đổi:**
   - Action mới: các ca ở `actions/action-registry.md` §12.
   - Bảng nghiệp vụ có chủ sở hữu: **role-isolation** (sales A không thấy dữ liệu của sales B khi scope `own`).
   - Route / job mới chạm DB tenant: **tenant-isolation**.
   - Kênh / connector mới: contract test dùng chung.
   - Màn UI: parity + e2e mobile.
4. **Dữ liệu test:** factory trong `packages/db/test/factories`. Không phụ thuộc thứ tự test. Đồng hồ cố định bằng `Clock` trong kernel, không dùng `Date.now()` trực tiếp.
4b. **Phạm vi test = phần bị ảnh hưởng, không chạy lại từ đầu đến cuối (D39):**
   - Unit / integration: chỉ package bị đổi + package phụ thuộc nó — `pnpm turbo run test lint typecheck --filter=...[origin/main]` (hoặc `vitest related <file đã sửa>` khi đang làm).
   - Parity: chỉ ID của màn / trạng thái vừa sửa — `pnpm parity <id>`.
   - E2E: chỉ spec của module vừa sửa — `pnpm e2e <module>` (desktop + mobile 390).
   - **Ngoại lệ — sửa lớp dùng chung** (`packages/ui` theme / primitive, `apps/web/src/shared/*`, `packages/shared`, schema trong `packages/actions`, kernel backend): chạy thêm `pnpm parity --done` (mọi màn đã ✅) và test của các module dùng phần đó.
   - **Chạy toàn bộ** chỉ ở cổng: cuối pha / cuối wave, PR vào `main` (CI `full.yml`), và gate cuối (F7 / TIP-046). CI chi tiết: `workflow/git-flow-ci.md` §4.
   - Report ghi đúng lệnh đã chạy và phạm vi; phần không chạy thì ghi "không bị ảnh hưởng", không ghi "pass".
5. **Báo kết quả trung thực:** Completion Report ghi đúng lệnh đã chạy và `N passed / M failed`. Có test bị skip thì ghi rõ lý do. Không báo DONE khi còn đỏ.
6. **Commit ngay khi pass:** `git status --short` sạch trước khi báo DONE; báo **git commit SHA**.
