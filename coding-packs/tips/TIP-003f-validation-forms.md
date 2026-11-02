# TIP-003f — Chuẩn hoá validate dùng chung, zodRule, MoneyInput/PhoneInput, hỏi khi bỏ form đang sửa

## HEADER
- TIP-ID: TIP-003f; Project: AppChat V2; Module: shared validate + web forms; Priority: P0; Estimated: L. TIP bổ sung cho TIP-003 (đã DONE, không sửa file gốc — DC-233).
- Depends on: 003e (useAction); TIP FE chung form modal; trước 044/045/046.
- **Files touched:** [exact M/C manifest](manifests/TIP-003f-files.md) — 31 paths (14 C). M path tương lai phải do TIP tạo trước tích hợp xong.
- **Parallel-safe with:** tuần tự với mọi TIP chung file (dòng khai hai phía bên dưới, máy kiểm `python -X utf8 tools/obligations/manifests.py --order`).
- **Parallel-safe with TIP-003b (coverage-closure manifest):** sequential, shares `packages/shared/src/index.ts`; integrate 003b before003f.
- **Parallel-safe with TIP-003g (coverage-closure manifest):** sequential, shares `apps/web/src/features/contracts/components/ContractFormModal.tsx`, `apps/web/src/features/invoices/components/InvoiceFormModal.tsx`, `apps/web/src/features/orders/components/OrderFormModal.tsx`; integrate 003f before003g.
- **Parallel-safe with TIP-003h (coverage-closure manifest):** sequential, shares `packages/shared/src/index.ts`; integrate 003f before003h.
- **Parallel-safe with TIP-011b (coverage-closure manifest):** sequential, shares `packages/actions/src/onboarding.ts`; integrate 003f before011b.
- **Parallel-safe with TIP-012b (coverage-closure manifest):** sequential, shares `packages/shared/src/index.ts`; integrate 012b before003f.
- **Parallel-safe with TIP-012c (coverage-closure manifest):** sequential, shares `packages/shared/src/index.ts`; integrate 012c before003f.
- **Parallel-safe with TIP-014b (coverage-closure manifest):** sequential, shares `packages/shared/src/index.ts`; integrate 014b before003f.
- **Parallel-safe with TIP-015b (coverage-closure manifest):** sequential, shares `packages/shared/src/index.ts`; integrate 015b before003f.
- **Parallel-safe with TIP-015c (coverage-closure manifest):** sequential, shares `packages/actions/src/crm.ts`, `packages/shared/src/index.ts`; integrate 015c before003f.
- **Parallel-safe with TIP-015d (coverage-closure manifest):** sequential, shares `apps/web/src/features/quotes/components/QuoteFormModal.tsx`, `packages/actions/src/crm.ts`, `packages/shared/src/index.ts`; integrate 015d before003f.
- **Parallel-safe with TIP-015e (coverage-closure manifest):** sequential, shares `packages/actions/src/crm.ts`, `packages/shared/src/index.ts`; integrate 015e before003f.
- **Parallel-safe with TIP-015f (coverage-closure manifest):** sequential, shares `apps/web/messages/en/errors.json`, `apps/web/messages/vi/errors.json`, `packages/actions/src/crm.ts`, `packages/shared/src/index.ts`; integrate 015f before003f.
- **Parallel-safe with TIP-019b (coverage-closure manifest):** sequential, shares `packages/shared/src/index.ts`; integrate 019b before003f.
- **Parallel-safe with TIP-019c (coverage-closure manifest):** sequential, shares `packages/shared/src/index.ts`; integrate 019c before003f.
- **Parallel-safe with TIP-022b (coverage-closure manifest):** sequential, shares `packages/shared/src/index.ts`; integrate 022b before003f.
- **Parallel-safe with TIP-023b (coverage-closure manifest):** sequential, shares `packages/shared/src/index.ts`; integrate 023b before003f.
- **Parallel-safe with TIP-023c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/common.json`, `apps/web/messages/vi/common.json`, `packages/shared/src/index.ts`; integrate 023c before003f.
- **Parallel-safe with TIP-023d (coverage-closure manifest):** sequential, shares `packages/shared/src/index.ts`; integrate 023d before003f.
- **Parallel-safe with TIP-023e (coverage-closure manifest):** sequential, shares `packages/shared/src/index.ts`; integrate 023e before003f.
- **Parallel-safe with TIP-023f (coverage-closure manifest):** sequential, shares `packages/shared/src/index.ts`; integrate 023f before003f.
- **Parallel-safe with TIP-025b (coverage-closure manifest):** sequential, shares `apps/web/src/features/customers/components/ContactFormModal.tsx`, `apps/web/src/features/tickets/components/TicketFormModal.tsx`, `packages/actions/src/crm.ts`, `packages/shared/src/index.ts`; integrate 025b before003f.
- **Parallel-safe with TIP-026b (coverage-closure manifest):** sequential, shares `packages/actions/src/crm.ts`, `packages/shared/src/index.ts`; integrate 026b before003f.
- **Parallel-safe with TIP-027b (coverage-closure manifest):** sequential, shares `apps/web/src/features/products/components/ProductFormModal.tsx`, `packages/shared/src/index.ts`; integrate 027b before003f.
- **Parallel-safe with TIP-030b (coverage-closure manifest):** sequential, shares `apps/web/src/features/contracts/components/ContractFormModal.tsx`, `packages/shared/src/index.ts`; integrate 030b before003f.
- **Parallel-safe with TIP-032b (coverage-closure manifest):** sequential, shares `apps/web/src/features/products/components/ProductFormModal.tsx`, `packages/shared/src/index.ts`; integrate 032b before003f.
- **Parallel-safe with TIP-032c (coverage-closure manifest):** sequential, shares `apps/web/src/features/contracts/components/ContractFormModal.tsx`, `apps/web/src/features/orders/components/OrderFormModal.tsx`; integrate 032c before003f.
- **Parallel-safe with TIP-033b (coverage-closure manifest):** sequential, shares `apps/web/src/features/calendar/components/AppointmentFormModal.tsx`, `packages/shared/src/index.ts`; integrate 033b before003f.
- **Parallel-safe with TIP-033d (coverage-closure manifest):** sequential, shares `apps/web/src/features/orders/components/OrderFormModal.tsx`; integrate 003f before033d.
- **Parallel-safe with TIP-034b (coverage-closure manifest):** sequential, shares `apps/web/src/features/tickets/components/TicketFormModal.tsx`, `packages/shared/src/index.ts`; integrate 034b before003f.
- **Parallel-safe with TIP-034c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/errors.json`, `apps/web/messages/vi/errors.json`, `packages/shared/src/index.ts`; integrate 034c before003f.
- **Parallel-safe with TIP-034d (coverage-closure manifest):** sequential, shares `packages/shared/src/index.ts`; integrate 034d before003f.
- **Parallel-safe with TIP-036 (coverage-closure manifest):** sequential, shares `packages/shared/src/index.ts`; integrate 036 before003f.
- **Parallel-safe with TIP-037 (coverage-closure manifest):** sequential, shares `packages/shared/src/index.ts`; integrate 037 before003f.
- **Parallel-safe with TIP-038 (coverage-closure manifest):** sequential, shares `packages/shared/src/index.ts`; integrate 038 before003f.
- **Parallel-safe with TIP-038b (coverage-closure manifest):** sequential, shares `packages/shared/src/index.ts`; integrate 038b before003f.
- **Parallel-safe with TIP-039 (coverage-closure manifest):** sequential, shares `packages/shared/src/index.ts`; integrate 039 before003f.
- **Parallel-safe with TIP-040 (coverage-closure manifest):** sequential, shares `packages/shared/src/index.ts`; integrate 040 before003f.
- **Parallel-safe with TIP-041 (coverage-closure manifest):** sequential, shares `packages/shared/src/index.ts`; integrate 041 before003f.
- **Parallel-safe with TIP-042 (coverage-closure manifest):** sequential, shares `packages/shared/src/index.ts`; integrate 042 before003f.
- **Parallel-safe with TIP-043 (coverage-closure manifest):** sequential, shares `packages/shared/src/index.ts`; integrate 043 before003f.
- **Parallel-safe with TIP-045b (coverage-closure manifest):** sequential, shares `apps/web/src/features/invoices/components/InvoiceFormModal.tsx`, `apps/web/src/features/orders/components/OrderFormModal.tsx`, `apps/web/src/features/quotes/components/QuoteFormModal.tsx`, `packages/actions/src/crm.ts`, `packages/shared/src/index.ts`; integrate 045b before003f.
- **Dòng COVERAGE nhận:** STD-domain-validate-1; STD-ui-fe-6; STD-ui-ip-3.2; STD-ui-ip-3.4; STD-domain-money-1.7.

## CONTEXT
- Hiện trạng đối chiếu mã 2026-11-02 (file:dòng, không tin trạng thái DONE):
  - `packages/shared/src/validate/` không tồn tại; các mã PHONE/EMAIL/TAX_CODE/NATIONAL_ID/URL/AMOUNT/QTY/PERCENT/COLOR_INVALID = 0.
  - `normalizePhone` (`packages/shared/src/crm/phone.ts:5`) lưu `0…`, chưa E.164; MST regex chỉ ở `onboarding.ts:15`.
  - `apps/web/src/shared/forms` chỉ có `SignaturePad.tsx`; zodRule/MoneyInput/PhoneInput = 0; 9 FormModal (quotes, orders, invoices, contracts, products, customers, calendar, tickets, settings) tự validate; không hỏi khi đóng form đang sửa.

## APPLICABLE STANDARDS
- domain/validation-defaults.md; ui/frontend-structure.md §6; ui/interaction-patterns.md §3.2, §3.4; domain/money-time-numbering.md §1.7.
- Không đổi luật COMMERCE, 5 vai trò, quyền đã chốt, đơn giá Credit. Quyết định mới → DECISIONS (DC), câu hỏi → QUESTIONS.

## Rà trước khi làm
1. Đọc lại mọi file trong manifest sau khi TIP phụ thuộc đã tích hợp; lệch CONTEXT → sửa TIP/manifest trước khi code.
2. `python -X utf8 tools/obligations/manifests.py 003f` tính lại giao file; thêm path thì cập nhật manifest + header hai phía.
3. Kiểm dữ liệu `phone_norm` hiện có trong DB dev (dạng `0…`) — migration chuyển E.164 phải giữ tìm kiếm cũ và chạy theo lô.

## TASK
Một bộ hàm chuẩn hoá + mã lỗi dùng chung FE/BE, form antd validate bằng schema của action, ô tiền/SĐT chuẩn, và xác nhận bỏ thay đổi.

## SPECIFICATIONS
### 1. Validate
1. `packages/shared/src/validate/{phone,email,tax-code,national-id,url,amount,qty,percent,color}.ts` trả `{ok, value, code}`; phone → E.164 (+84), lưu `phone_norm` E.164, hiển thị nội địa.
2. Zod refinements dùng các hàm này trong `packages/actions` (input contact/quote/order…); lỗi có `fields[].code`.
3. Migration tenant chuyển `phone_norm` sang E.164 theo lô 500, idempotent.
### 2. Form kit
1. `shared/forms/zodRule.ts` sinh rule antd từ schema action; validate khi rời ô / bấm Lưu; thông báo theo `errors.<CODE>`; cuộn tới lỗi đầu.
2. `MoneyInput` (VND string, không float), `PhoneInput` (chuẩn hoá khi rời ô).
3. `useDirtyGuard`: đóng modal/drawer khi form bẩn → hỏi "Bỏ thay đổi?".
### 3. Áp dụng
1. 9 FormModal dùng zodRule + MoneyInput/PhoneInput + useDirtyGuard.

## ACCEPTANCE CRITERIA
|AC|Given / When|Then — bằng chứng|
|---|---|---|
|1|Unit validate 9 loại|đúng/sai + mã — `packages/shared/src/validate/*.test.ts`|
|2|Nhập SĐT `0912…` / `+84912…`|lưu cùng E.164; tìm được bằng cả hai|
|3|Form tiền nhập `1.234.567`|gửi chuỗi `"1234567"`; không float|
|4|Đóng form đã sửa|hỏi xác nhận; form sạch đóng ngay — E2E|
|5|Server trả VALIDATION_FAILED fields|hiện dưới đúng ô, cuộn tới ô đầu|

### Commands / evidence gate
- `pnpm --filter @appchat/shared test`
- `pnpm --filter @appchat/actions test`
- `pnpm --filter @appchat/api test:integration -- test/integration/validation.test.ts`
- `pnpm e2e forms`
- Ba cổng D59 (khi làm · trước commit · chốt TIP); parity màn liên quan; E2E mock + http của luồng TIP. Lệnh là cổng tương lai, chưa chạy khi viết TIP.

## CONSTRAINTS
- Không thêm thư viện; giữ mã lỗi theo standard; không đổi luật tiền.
- Backend 200–400 dòng/file (trần 600), FE trần 400, màn chỉ orchestrator; test file riêng; ghi chỉ qua ActionExecutor; Postgres index `=` trước range/sort, EXPLAIN cho list mới.

## Quality Gate
- Manifest 31 path, header khai hai phía, 5 AC đo được. Viết 2026-11-02 trong đợt đóng lỗ hổng sổ phủ; rà độc lập ở `reports/coverage-closure-audit-2026-11-02.md`. Chưa code / chưa runtime.

## ⚠️ BUILDER-CHECKLIST
- [ ] Rà trước khi làm xong; manifest khớp.
- [ ] Mọi AC có test chạy thật, dán output.
- [ ] Cập nhật COVERAGE (parts + merge.py) với bằng chứng file:dòng + test.
- [ ] Commit, `git status --short` sạch, báo Git SHA; PR vào dev.
