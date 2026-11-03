# TIP-011b — Chọn lĩnh vực theo taxonomy ngành 2 cấp (10 nhóm) khi khai báo doanh nghiệp

## HEADER
- TIP-ID: TIP-011b; Project: AppChat V2; Module: onboarding; Priority: P1; Estimated: S. TIP bổ sung cho TIP-011 (đã DONE, không sửa file gốc — DC-233).
- Depends on: 041 (workspace settings) đã tích hợp; trước 044/045/046.
- **Files touched:** [exact M/C manifest](manifests/TIP-011b-files.md) — 9 paths (2 C). M path tương lai phải do TIP tạo trước tích hợp xong.
- **Parallel-safe with:** tuần tự với mọi TIP chung file (dòng khai hai phía bên dưới, máy kiểm `python -X utf8 tools/obligations/manifests.py --order`).
- **Parallel-safe with TIP-004b (coverage-closure manifest):** sequential, shares `coding-packs/docs/06-prototype/DEVIATIONS.md`; integrate 004b before011b.
- **Parallel-safe with TIP-003f (coverage-closure manifest):** sequential, shares `packages/actions/src/onboarding.ts`; integrate 003f before011b.
- **Parallel-safe with TIP-013b (coverage-closure manifest):** sequential, shares `apps/web/src/features/settings/components/GeneralSection.tsx`; integrate 011b before013b.
- **Parallel-safe with TIP-020b (coverage-closure manifest):** sequential, shares `coding-packs/docs/06-prototype/DEVIATIONS.md`; integrate 020b before011b.
- **Parallel-safe with TIP-023b (coverage-closure manifest):** sequential, shares `packages/core/src/identity/actions/business-profile-update.handler.ts`; integrate 023b before011b.
- **Parallel-safe with TIP-032b (coverage-closure manifest):** sequential, shares `coding-packs/docs/06-prototype/DEVIATIONS.md`; integrate 032b before011b.
- **Parallel-safe with TIP-034b (coverage-closure manifest):** sequential, shares `coding-packs/docs/06-prototype/DEVIATIONS.md`; integrate 034b before011b.
- **Parallel-safe with TIP-034d (coverage-closure manifest):** sequential, shares `coding-packs/docs/06-prototype/DEVIATIONS.md`; integrate 034d before011b.
- **Parallel-safe with TIP-037 (coverage-closure manifest):** sequential, shares `coding-packs/docs/06-prototype/DEVIATIONS.md`; integrate 037 before011b.
- **Parallel-safe with TIP-038 (coverage-closure manifest):** sequential, shares `coding-packs/docs/06-prototype/DEVIATIONS.md`; integrate 038 before011b.
- **Parallel-safe with TIP-038b (coverage-closure manifest):** sequential, shares `coding-packs/docs/06-prototype/DEVIATIONS.md`; integrate 038b before011b.
- **Parallel-safe with TIP-039 (coverage-closure manifest):** sequential, shares `coding-packs/docs/06-prototype/DEVIATIONS.md`; integrate 039 before011b.
- **Parallel-safe with TIP-040 (coverage-closure manifest):** sequential, shares `coding-packs/docs/06-prototype/DEVIATIONS.md`; integrate 040 before011b.
- **Parallel-safe with TIP-042 (coverage-closure manifest):** sequential, shares `coding-packs/docs/06-prototype/DEVIATIONS.md`; integrate 042 before011b.
- **Parallel-safe with TIP-042b (coverage-closure manifest):** sequential, shares `coding-packs/docs/06-prototype/DEVIATIONS.md`; integrate 042b before011b.
- **Parallel-safe with TIP-043 (coverage-closure manifest):** sequential, shares `coding-packs/docs/06-prototype/DEVIATIONS.md`; integrate 043 before011b.
- **Parallel-safe with TIP-045b (coverage-closure manifest):** sequential, shares `packages/core/src/identity/actions/business-profile-update.handler.ts`; integrate 045b before011b.
- **Dòng COVERAGE nhận:** REQ-A02d.

## CONTEXT
- Hiện trạng đối chiếu mã 2026-11-02 (file:dòng, không tin trạng thái DONE):
  - Prototype ver2.1 chỉ có ô mô tả tự do (`DeclareBusinessModal.tsx:32`, `packages/actions/src/onboarding.ts:23`); REQ-A02 vẫn yêu cầu taxonomy 2 cấp 10 nhóm, chưa có mã quyết định bỏ.
  - Nguồn danh mục: `docs/06-prototype/jsx-reference/CLAUDE.md:7–20` "Bộ chọn ngành chính thức" (Nhóm ngành → Ngành cụ thể); 00-PROJECT-CONTEXT:19 dùng cho onboarding, segment, template.

## APPLICABLE STANDARDS
- i18n/i18n.md; ui/prototype-parity.md §6b (lệch có chủ đích ghi DEVIATIONS).
- Không đổi luật COMMERCE, 5 vai trò, quyền đã chốt, đơn giá Credit. Quyết định mới → DECISIONS (DC), câu hỏi → QUESTIONS.

## Rà trước khi làm
1. Đọc lại mọi file trong manifest sau khi TIP phụ thuộc đã tích hợp; lệch CONTEXT → sửa TIP/manifest trước khi code.
2. `python -X utf8 tools/obligations/manifests.py 011b` tính lại giao file; thêm path thì cập nhật manifest + header hai phía.
3. Chép đúng danh mục từ jsx-reference, không tự thêm ngành; đếm đủ 10 nhóm.

## TASK
Thêm bộ chọn 2 cấp (bắt buộc nhóm, tuỳ chọn ngành) bên cạnh ô mô tả, lưu `workspace.settings.industry {group, sector}`.

## SPECIFICATIONS
### 1. Danh mục
1. `packages/shared/src/identity/industry.ts` mã ổn định + nhãn i18n vi/en.
2. Action onboarding nhận `industry` (zod enum); Cài đặt › Chung cho sửa sau.
### 2. UI
1. Cascader antd trong DeclareBusinessModal; ghi lệch prototype (thêm ô) vào `docs/06-prototype/DEVIATIONS.md`.

## ACCEPTANCE CRITERIA
|AC|Given / When|Then — bằng chứng|
|---|---|---|
|1|Khai báo DN|bắt buộc chọn nhóm; lưu đúng mã|
|2|Danh mục|đủ 10 nhóm, khớp jsx-reference — unit|
|3|Parity onboarding|< 5% sau mask ô mới|

### Commands / evidence gate
- `pnpm --filter @appchat/shared test`
- `pnpm e2e onboarding`
- `pnpm parity onboarding:declare`
- Ba cổng D59 (khi làm · trước commit · chốt TIP); parity màn liên quan; E2E mock + http của luồng TIP. Lệnh là cổng tương lai, chưa chạy khi viết TIP.

## CONSTRAINTS
- Không đổi luồng MST/VNeID.
- Backend 200–400 dòng/file (trần 600), FE trần 400, màn chỉ orchestrator; test file riêng; ghi chỉ qua ActionExecutor; Postgres index `=` trước range/sort, EXPLAIN cho list mới.

## Quality Gate
- Manifest 9 path, header khai hai phía, 3 AC đo được. Viết 2026-11-02 trong đợt đóng lỗ hổng sổ phủ; rà độc lập ở `reports/coverage-closure-audit-2026-11-02.md`. Chưa code / chưa runtime.

## ⚠️ BUILDER-CHECKLIST
- [ ] Rà trước khi làm xong; manifest khớp.
- [ ] Mọi AC có test chạy thật, dán output.
- [ ] Cập nhật COVERAGE (parts + merge.py) với bằng chứng file:dòng + test.
- [ ] Commit, `git status --short` sạch, báo Git SHA; PR vào dev.
