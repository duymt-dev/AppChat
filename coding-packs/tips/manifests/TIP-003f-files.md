# TIP-003f — exact file manifest

M modify, C create. Không wildcard; test file riêng.

| Mode | Exact file | Responsibility |
|---|---|---|
| C | `packages/shared/src/validate/index.ts` | Export |
| C | `packages/shared/src/validate/phone.ts` | E.164 |
| C | `packages/shared/src/validate/identity.ts` | MST, CCCD |
| C | `packages/shared/src/validate/basic.ts` | email, url, color |
| C | `packages/shared/src/validate/numbers.ts` | amount, qty, percent |
| C | `packages/shared/src/validate/validate.test.ts` | Unit |
| M | `packages/shared/src/index.ts` | Export validate |
| M | `packages/shared/src/crm/phone.ts` | Uỷ quyền validate/phone |
| M | `packages/actions/src/crm.ts` | Refinement phone/email |
| M | `packages/actions/src/onboarding.ts` | MST/CCCD dùng chung |
| C | `packages/db/prisma/tenant/migrations/20261102006110_phone_e164/migration.sql` | phone_norm E.164 |
| C | `apps/web/src/shared/forms/zodRule.ts` | Rule antd từ zod |
| C | `apps/web/src/shared/forms/MoneyInput.tsx` | Ô tiền |
| C | `apps/web/src/shared/forms/PhoneInput.tsx` | Ô SĐT |
| C | `apps/web/src/shared/forms/useDirtyGuard.ts` | Hỏi bỏ thay đổi |
| C | `apps/web/src/shared/forms/forms.test.tsx` | Unit form kit |
| M | `apps/web/src/features/quotes/components/QuoteFormModal.tsx` | Áp dụng |
| M | `apps/web/src/features/orders/components/OrderFormModal.tsx` | Áp dụng |
| M | `apps/web/src/features/invoices/components/InvoiceFormModal.tsx` | Áp dụng |
| M | `apps/web/src/features/contracts/components/ContractFormModal.tsx` | Áp dụng |
| M | `apps/web/src/features/products/components/ProductFormModal.tsx` | Áp dụng |
| M | `apps/web/src/features/customers/components/ContactFormModal.tsx` | Áp dụng |
| M | `apps/web/src/features/calendar/components/AppointmentFormModal.tsx` | Áp dụng |
| M | `apps/web/src/features/tickets/components/TicketFormModal.tsx` | Áp dụng |
| M | `apps/web/src/features/settings/components/FormModal.tsx` | Áp dụng |
| M | `apps/web/messages/vi/errors.json` | Mã validate |
| M | `apps/web/messages/en/errors.json` | Mã validate |
| M | `apps/web/messages/vi/common.json` | Bỏ thay đổi? |
| M | `apps/web/messages/en/common.json` | Discard changes? |
| C | `apps/api/test/integration/validation.test.ts` | Mã lỗi fields |
| C | `apps/web/e2e/forms.spec.ts` | E2E form kit |
