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
5. **Báo kết quả trung thực:** Completion Report ghi đúng lệnh đã chạy và `N passed / M failed`. Có test bị skip thì ghi rõ lý do. Không báo DONE khi còn đỏ.
6. **Commit ngay khi pass:** `git status --short` sạch trước khi báo DONE; báo **git commit SHA**.
