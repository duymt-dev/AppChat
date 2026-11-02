# TIP-033d — Cọc đơn theo % và gợi ý bật cọc

## HEADER
- TIP-ID: TIP-033d; Project: AppChat V2; Module: orders deposit; Priority: P0; Estimated: M. TIP bổ sung cho TIP-033 (đã DONE, không sửa file gốc — DC-233).
- Depends on: 032c, 027b, 033b, 038b (adapter import/export đơn) đã tích hợp; Q-038/Q-039 chặn phần % và gợi ý theo ngưỡng/no-show; trước 044/045/046.
- **Files touched:** [exact M/C manifest](manifests/TIP-033d-files.md) — 15 paths (5 C). M path tương lai phải do TIP tạo trước tích hợp xong.
- **Parallel-safe with:** tuần tự với mọi TIP chung file (dòng khai hai phía bên dưới, máy kiểm `python -X utf8 tools/obligations/manifests.py --order`).
- **Parallel-safe with TIP-003f (coverage-closure manifest):** sequential, shares `apps/web/src/features/orders/components/OrderFormModal.tsx`; integrate 003f before033d.
- **Parallel-safe with TIP-003g (coverage-closure manifest):** sequential, shares `apps/web/src/features/orders/components/OrderFormModal.tsx`; integrate 003g before033d.
- **Parallel-safe with TIP-031b (coverage-closure manifest):** sequential, shares `packages/actions/src/orders.ts`; integrate 031b before033d.
- **Parallel-safe with TIP-015e (coverage-closure manifest):** sequential, shares `packages/core/src/sales/orders/actions/order-create.handlers.ts`; integrate 015e before033d.
- **Parallel-safe with TIP-015f (coverage-closure manifest):** sequential, shares `apps/web/messages/en/orders.json`, `apps/web/messages/vi/orders.json`, `packages/actions/src/orders.ts`, `packages/core/src/sales/orders/actions/order-create.handlers.ts`, `packages/db/prisma/tenant/sales-orders.prisma`; integrate 015f before033d.
- **Parallel-safe with TIP-023b (coverage-closure manifest):** sequential, shares `packages/core/src/sales/orders/actions/order-create.handlers.ts`, `packages/core/src/sales/orders/actions/order-edit.handlers.ts`; integrate 023b before033d.
- **Parallel-safe with TIP-023c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/orders.json`, `apps/web/messages/vi/orders.json`; integrate 023c before033d.
- **Parallel-safe with TIP-023g (coverage-closure manifest):** sequential, shares `apps/web/messages/en/orders.json`, `apps/web/messages/vi/orders.json`; integrate 023g before033d.
- **Parallel-safe with TIP-025b (coverage-closure manifest):** sequential, shares `apps/web/src/features/orders/hooks/useOrderForm.ts`, `packages/actions/src/orders.ts`, `packages/core/src/sales/orders/actions/order-create.handlers.ts`; integrate 025b before033d.
- **Parallel-safe with TIP-032b (coverage-closure manifest):** sequential, shares `packages/actions/src/orders.ts`, `packages/core/src/sales/orders/actions/order-create.handlers.ts`, `packages/db/prisma/tenant/sales-orders.prisma`; integrate 032b before033d.
- **Parallel-safe with TIP-032d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/orders.json`, `apps/web/messages/vi/orders.json`; integrate 032d before033d.
- **Parallel-safe with TIP-042c (coverage-closure manifest):** sequential, shares `packages/core/src/sales/orders/actions/order-create.handlers.ts`, `packages/db/prisma/tenant/sales-orders.prisma`; integrate 042c before033d.
- **Parallel-safe with TIP-045b (coverage-closure manifest):** sequential, shares `apps/web/src/features/orders/components/OrderFormModal.tsx`, `apps/web/src/features/orders/hooks/useOrderForm.ts`; integrate 045b before033d.
- **Dòng COVERAGE nhận:** COM-4-7; COM-4-8; STD-domain-money-1.4.

## CONTEXT
- Hiện trạng đối chiếu mã 2026-11-02 (file:dòng, không tin trạng thái DONE):
  - `packages/actions/src/orders.ts:24,109` chỉ `deposit_amount`; `order-edit.handlers.ts:103–104,145–151` kiểm amount ≤ total.
  - `catalog.prisma:63` đã có `Product.deposit` BigInt. `useOrderForm.ts:47–51` so sánh bằng Number (JS).
  - standards/domain/money-time-numbering.md:16 đã chốt: chia đợt/cọc theo % làm tròn **xuống** tới đồng, đợt cuối nhận phần dư. Q-038 (căn cứ % / precision / tính lại khi sửa đơn) và Q-039 (gợi ý: cộng cọc sản phẩm, ngưỡng cao, cửa sổ no-show) chưa duyệt.
  - Nguồn: `reports/commerce-card-deposit-source-audit-2026-11-02.md`.

## APPLICABLE STANDARDS
- COMMERCE §4 L90; domain/money-time-numbering.md §1.4; actions/action-registry.md.
- Không đổi luật COMMERCE, 5 vai trò, quyền đã chốt, đơn giá Credit. Quyết định mới → DECISIONS (DC), câu hỏi → QUESTIONS.

## Rà trước khi làm
1. Đọc lại mọi file trong manifest sau khi TIP phụ thuộc đã tích hợp; lệch CONTEXT → sửa TIP/manifest trước khi code.
2. `python -X utf8 tools/obligations/manifests.py 033d` tính lại giao file; thêm path thì cập nhật manifest + header hai phía.
3. Đọc lại Q-038/Q-039. Chưa duyệt → chỉ làm `splitByPercent` (STD-money-1.4 đã chốt) và gợi ý (a) cọc sản phẩm; chế độ % và gợi ý (b) ngưỡng / (c) no-show nằm sau cờ `orders.deposit_percent` / `orders.deposit_suggest_policy` **tắt**, COM-4-7/COM-4-8 giữ MỘT PHẦN. Luật tiền không tự quyết (gap-filling §2, L2) — không ghi DC cho luật tiền.
4. Duyệt rồi → bật cờ theo đúng câu trả lời, ghi mã quyết định do Chủ nhà chốt.

## TASK
Dựng `splitByPercent` chung và gợi ý cọc từ sản phẩm; chế độ cọc % và gợi ý theo ngưỡng/no-show dựng sẵn sau cờ tắt, chỉ bật khi Chủ nhà duyệt Q-038/Q-039.

## SPECIFICATIONS
### 1. Làm tròn chung (đã chốt)
1. Hàm dùng chung `splitByPercent` trong `packages/shared/src/commerce` (BigInt, floor tới đồng, đợt cuối nhận phần dư — money-time-numbering §1.4) cho chia đợt và cọc.
2. `useOrderForm.ts:47–51` so sánh tiền bằng BigInt/string, không `Number`.
### 2. Cọc % (cờ tắt tới khi Q-038 duyệt)
1. `deposit {mode: amount|percent, value}` trên `order.create`, `order.update` **và `order.set_deposit`** cùng một bộ validate; khi cờ tắt chỉ nhận `mode=amount` (giữ hành vi hiện tại).
2. Căn cứ %, precision, tính lại khi sửa đơn: theo câu trả lời Q-038 — chưa có thì không cài mặc định nào ngoài cờ tắt.
3. Mock FE (`orders-actions.ts`), thẻ đơn của Trợ lý (đọc `deposit_mode`), import/export (adapter 038b) dùng cùng ngữ nghĩa mode; roundtrip export→import giữ nguyên mode.
### 3. Gợi ý
1. (a) có sản phẩm `Product.deposit` → gợi ý tổng theo qty (dữ liệu đã có); hiện lý do, người dùng bấm áp mới đổi, không tự bật.
2. (b) ngưỡng DN và (c) no-show: sau cờ `orders.deposit_suggest_policy` tắt; nơi lưu ngưỡng = `sales_settings` của 032b (không tạo bảng mới); cửa sổ no-show, cap tổng theo câu trả lời Q-039; (c) chỉ khi người dùng có quyền xem lịch hẹn khách.

## ACCEPTANCE CRITERIA
|AC|Given / When|Then — bằng chứng|
|---|---|---|
|1|`splitByPercent(1.000.001, 30%)`|300.000 (floor) — unit|
|2|Chia 3 đợt 100.000đ|33.333 / 33.333 / 33.334|
|3|Cờ tắt, gửi `mode=percent` vào create/update/set_deposit|400 VALIDATION, đơn không đổi|
|4|Sản phẩm có deposit|gợi ý có lý do, không tự bật|
|5|Cờ policy tắt|không gợi ý theo ngưỡng/no-show|
|6|Cờ bật (sau duyệt Q-038/039), người không có quyền xem lịch hẹn|không gợi ý theo no-show|
|7|Export→import đơn có cọc|mode + số tiền giữ nguyên|

### Commands / evidence gate
- `pnpm --filter @appchat/shared test`
- `pnpm --filter @appchat/api test:integration -- test/integration/order-deposit.test.ts`
- `pnpm e2e orders`
- Ba cổng D59 (khi làm · trước commit · chốt TIP); parity màn liên quan; E2E mock + http của luồng TIP. Lệnh là cổng tương lai, chưa chạy khi viết TIP.

## CONSTRAINTS
- Không đổi luật floor đã chốt; không tự bật cọc; không tự đặt luật cọc % / ngưỡng / no-show khi Q-038/Q-039 chưa duyệt (cờ tắt, dòng giữ MỘT PHẦN).
- Backend 200–400 dòng/file (trần 600), FE trần 400, màn chỉ orchestrator; test file riêng; ghi chỉ qua ActionExecutor; Postgres index `=` trước range/sort, EXPLAIN cho list mới.

## Quality Gate
- Manifest 15 path, header khai hai phía, 7 AC đo được. Viết 2026-11-02 trong đợt đóng lỗ hổng sổ phủ; rà độc lập ở `reports/coverage-closure-audit-2026-11-02.md`. Chưa code / chưa runtime.

## ⚠️ BUILDER-CHECKLIST
- [ ] Rà trước khi làm xong; manifest khớp.
- [ ] Mọi AC có test chạy thật, dán output.
- [ ] Cập nhật COVERAGE (parts + merge.py) với bằng chứng file:dòng + test.
- [ ] Commit, `git status --short` sạch, báo Git SHA; PR vào dev.
