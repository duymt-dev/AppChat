# TIP-001c — Web: đủ 5 trạng thái, vùng chạm ≥ 44, ma trận mobile 390 và sửa lỗi WCAG AA

## HEADER
- **Parallel-safe with TIP-047d (coverage-closure manifest):** sequential, shares `apps/web/e2e/mobile-sweep.spec.ts`; integrate 001c before047d.
- TIP-ID: TIP-001c; Project: AppChat V2; Module: apps/web trạng thái + mobile + a11y; Priority: P0; Estimated: L. TIP bổ sung cho TIP-001 (đã DONE, không sửa file gốc — DC-233).
- Depends on: 001b; mọi TIP FE chung file; trước 044/045/046 (046 đo, 001c sửa).
- **Files touched:** [exact M/C manifest](manifests/TIP-001c-files.md) — 14 paths (7 C). M path tương lai phải do TIP tạo trước tích hợp xong.
- **Parallel-safe with:** tuần tự với mọi TIP chung file (dòng khai hai phía bên dưới, máy kiểm `python -X utf8 tools/obligations/manifests.py --order`).
- **Parallel-safe with TIP-003e (coverage-closure manifest):** sequential, shares `apps/web/src/shared/actions/useAction.ts`; integrate 003e before001c.
- **Parallel-safe with TIP-023b (coverage-closure manifest):** sequential, shares `apps/web/src/shared/actions/useAction.ts`; integrate 023b before001c.
- **Parallel-safe with TIP-034c (coverage-closure manifest):** sequential, shares `apps/web/src/shared/actions/useAction.ts`; integrate 034c before001c.
- **Parallel-safe with TIP-039 (coverage-closure manifest):** sequential, shares `apps/web/src/shared/actions/useAction.ts`; integrate 039 before001c.
- **Parallel-safe with TIP-040 (coverage-closure manifest):** sequential, shares `apps/web/src/shared/actions/useAction.ts`; integrate 040 before001c.
- **Parallel-safe with TIP-045b (coverage-closure manifest):** sequential, shares `apps/web/src/shared/actions/useAction.ts`; integrate 045b before001c.
- **Parallel-safe with TIP-023c (coverage-closure manifest):** sequential, shares `apps/web/src/features/quotes/screens/QuotesScreen.tsx`; integrate 023c before001c.
- **Parallel-safe with TIP-032b (coverage-closure manifest):** sequential, shares `apps/web/src/features/products/screens/ProductsScreen.tsx`; integrate 032b before001c.
- **Dòng COVERAGE nhận:** STD-ui-fe-9; STD-ui-ip-5; STD-ui-ip-7.4; STD-ui-parity-9; REQ-N10d; STD-ui-ip-4.5; STD-ui-ip-1.6; DEF-034-3.

## CONTEXT
- Hiện trạng đối chiếu mã 2026-11-02 (file:dòng, không tin trạng thái DONE):
  - `shared/states/PageStates.tsx:17–21` chỉ sinh empty khi có predicate, không có trạng thái không-có-quyền; `QuotesScreen.tsx:87`, `ProductsScreen.tsx:98` gọi `stateOf(list)` không predicate.
  - `apps/web/e2e/mobile-sweep.spec.ts` chỉ kiểm tràn ngang + chiều cao nút/tab đang thấy; không đo chiều rộng, không kiểm action chính từng màn.
  - Không có axe / jsx-a11y; 046 sẽ đo tự động — lỗi phát hiện phải có chỗ sửa (TIP này), không để 046 "đo là đạt".

## APPLICABLE STANDARDS
- ui/interaction-patterns.md §5, §7.4; ui/frontend-structure.md §9; ui/prototype-parity.md §9; REQ-N10 (WCAG AA).
- Không đổi luật COMMERCE, 5 vai trò, quyền đã chốt, đơn giá Credit. Quyết định mới → DECISIONS (DC), câu hỏi → QUESTIONS.

## Rà trước khi làm
1. Đọc lại mọi file trong manifest sau khi TIP phụ thuộc đã tích hợp; lệch CONTEXT → sửa TIP/manifest trước khi code.
2. `python -X utf8 tools/obligations/manifests.py 001c` tính lại giao file; thêm path thì cập nhật manifest + header hai phía.
3. Lập ma trận màn × panel × trạng thái (loading, empty-chưa-có, empty-lọc-rỗng, error+retry, no-permission, dữ liệu cực trị) từ `features/*/screens` (25 màn) và drawer chính.
4. Chạy thử axe (dev dependency do 046 thêm; nếu 046 chưa tích hợp thì thêm ở đây và ghi DV) trên 25 màn, lưu baseline lỗi vào report.

## TASK
Mọi màn + panel chính có đủ 5 trạng thái; mobile 390 không tràn, vùng chạm ≥ 44×44, action chính chạy; sửa lỗi WCAG AA (tương phản, aria, bàn phím) mà axe + kiểm tay phát hiện.

## SPECIFICATIONS
### 1. PageStates
1. `stateOf(query, { emptyWhen, filtered, forbidden })`: phân biệt chưa-có / lọc-rỗng; 403 → trạng thái không-có-quyền (không phải lỗi chung).
2. Màn và panel truyền predicate; ESLint rule cục bộ cấm gọi `stateOf` không đối số thứ hai.
### 2. Mobile + chạm
1. `<md`: mọi nút/tab/hàng bấm được ≥ 44×44 (token `size.touch`).
2. Ma trận E2E 390×844: mỗi màn mở được, action chính (tạo / mở chi tiết / lưu) chạy, không tràn ngang, đo width+height target.
### 3. WCAG AA
1. Sửa tương phản theo token (không hard-code màu); `aria-label` cho nút icon; focus trap + Esc cho drawer/modal; thứ tự tab hợp lý; `prefers-reduced-motion`.
### 4. Cập nhật lạc quan
1. `useAction(id, { optimistic: (qc, input) => rollback })` chỉ cho action nhẹ đảo được (message.pin, conversation.mark_read, message.react); lỗi → trả lại + toast; action khác không được dùng (test chặn theo danh sách).
### 5. "Sắp có" thống nhất
1. Primitive `ComingSoon` (khoá + nhãn) trong `packages/ui`; grep `message.info(.*[Ss]oon` trong features = 0 sau khi các TIP màn (013b, 017b…) thay nút giả; lint chặn tái phạm.
### 6. Parity `tickets:detail` (DEF-034-3)
1. Rà drawer ticket so prototype L5203 (khoảng cách, cỡ chữ, header) bằng token; đưa `tickets:detail` từ 4,91% về < 4% không mask thêm.

## ACCEPTANCE CRITERIA
|AC|Given / When|Then — bằng chứng|
|---|---|---|
|1|Ma trận trạng thái 25 màn + drawer chính|mỗi ô có test (unit hoặc E2E mock) — `apps/web/e2e/states-matrix.spec.ts`|
|2|API trả 403 cho list|hiện no-permission, không phải lỗi chung|
|3|E2E mobile 390 toàn bộ màn|0 tràn; 0 target < 44; action chính chạy — `apps/web/e2e/mobile-matrix.spec.ts`|
|4|axe trên 25 màn|0 lỗi serious/critical; ngoại lệ chỉ khi có mã D/DC|
|5|Kiểm tay bàn phím 5 luồng chính|ghi checklist vào completion report|
|6|Ghim tin, server lỗi|UI trả lại trạng thái cũ + toast — unit optimistic|
|7|grep toast "Sắp có" trong features|0; lint chặn|
|8|`pnpm parity tickets:detail`|< 4%, không thêm mask|

### Commands / evidence gate
- `pnpm --filter @appchat/web test`
- `pnpm e2e states-matrix mobile-matrix`
- `pnpm parity --done`
- Ba cổng D59 (khi làm · trước commit · chốt TIP); parity màn liên quan; E2E mock + http của luồng TIP. Lệnh là cổng tương lai, chưa chạy khi viết TIP.

## CONSTRAINTS
- Không đổi hình prototype ngoài sửa a11y (ghi lệch vào docs/06-prototype/DEVIATIONS.md nếu đổi màu tương phản).
- Backend 200–400 dòng/file (trần 600), FE trần 400, màn chỉ orchestrator; test file riêng; ghi chỉ qua ActionExecutor; Postgres index `=` trước range/sort, EXPLAIN cho list mới.

## Quality Gate
- Manifest 14 path, header khai hai phía, 8 AC đo được. Viết 2026-11-02 trong đợt đóng lỗ hổng sổ phủ; rà độc lập ở `reports/coverage-closure-audit-2026-11-02.md`. Chưa code / chưa runtime.

## ⚠️ BUILDER-CHECKLIST
- [ ] Rà trước khi làm xong; manifest khớp.
- [ ] Mọi AC có test chạy thật, dán output.
- [ ] Cập nhật COVERAGE (parts + merge.py) với bằng chứng file:dòng + test.
- [ ] Commit, `git status --short` sạch, báo Git SHA; PR vào dev.
