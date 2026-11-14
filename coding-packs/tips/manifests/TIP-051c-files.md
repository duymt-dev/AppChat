# TIP-051c — exact file manifest

M = sửa, C = tạo mới. Không wildcard thư mục; test liệt kê từng file. Handler chứng từ chỉ thêm 1 dòng gọi `assertCustomer`. Đường dẫn handler cơ hội theo manifest TIP-026c (kiểm lại ở Rà #1).

| Mode | Exact file | Responsibility |
|---|---|---|
| M | `packages/db/prisma/tenant/crm.prisma` | Enum `ContactRelation` + `contact.relation` |
| C | `packages/db/prisma/tenant/migrations/20261116110000_contact_relation/migration.sql` | Enum + cột mặc định `customer`, index `contact_customer_recent_idx` (partial) + `contact_relation_recent_idx` |
| C | `packages/db/test/contact-relation-migration.test.ts` | AC1 |
| M | `packages/actions/src/crm-schemas.ts` | `contactFields.relation` |
| C | `packages/actions/src/contact-relation.ts` | `contact.set_relation` (write, `crm.edit`, agentGrantable, undo 24h) |
| M | `packages/actions/src/index.ts` | Đăng ký `contact-relation` |
| M | `apps/web/messages/vi/actions.json` | Tiêu đề `contact.set_relation` |
| M | `apps/web/messages/en/actions.json` | Tiêu đề `contact.set_relation` |
| M | `packages/shared/src/api/crm.ts` | `relation` trên dòng danh sách + Contact360 |
| M | `packages/shared/src/api/inbox.ts` | `contact_relation` optional trên hội thoại |
| M | `packages/shared/src/marketing/segment-filter.ts` | Lá `relation` (in / not_in) + `evaluateSegment` |
| C | `packages/shared/src/marketing/segment-filter.test.ts` | AC7 (phần thuần) |
| C | `packages/core/src/crm/relation/customer-guard.ts` | `assertCustomer`, `CUSTOMER_SQL`, kiểm chứng từ / cơ hội mở |
| C | `packages/core/src/crm/relation/set-relation.handler.ts` | Handler `contact.set_relation` (scope ghi, 409 còn chứng từ mở, timeline, event, undo) |
| M | `packages/core/src/crm/crm.module.ts` | Đăng ký handler `contact.set_relation` |
| M | `packages/core/src/crm/public.ts` | Export guard |
| M | `packages/core/src/crm/actions/contact-write.handlers.ts` | `contact.create` / `update` nhận `relation`; đổi khỏi `customer` gọi kiểm chứng từ mở |
| M | `packages/core/src/crm/services/contacts.service.ts` | Ghi `relation` khi tạo |
| M | `packages/core/src/crm/stage/manual.handler.ts` | `contact.set_stage` → `assertCustomer` |
| M | `packages/core/src/crm/stage/rules.ts` | UPDATE tự động thêm `relation = 'customer'` |
| M | `packages/core/src/crm/routing/routing-apply.handler.ts` | Liên hệ không phải khách → `not_customer` |
| M | `packages/core/src/crm/repos/contacts.repo.ts` | `ContactFilter.relation` (mặc định customer, `all`), kanban luôn customer |
| M | `packages/core/src/crm/repos/board-page.ts` | Cột kanban chỉ customer |
| M | `packages/core/src/crm/services/crm-read.service.ts` | Trả `relation` ở danh sách + 360 |
| M | `apps/api/src/http/crm/contacts.controller.ts` | `contactFilterOf` đọc `relation` |
| M | `packages/core/src/inbox/services/view.ts` | `contact_relation` trên hội thoại |
| M | `packages/core/src/insights/metrics/customers.ts` | Chỉ customer |
| M | `packages/core/src/insights/services/follow-ups.ts` | Chỉ customer (sweep + danh sách) |
| M | `packages/core/src/insights/actions/follow-up.handlers.ts` | Chỉ customer |
| M | `packages/core/src/marketing/services/segments.service.ts` | Không có lá `relation` → thêm `relation = 'customer'` |
| M | `packages/core/src/sales/quotes/actions/quote-write.handlers.ts` | 1 dòng `assertCustomer` (`quote.create`) |
| M | `packages/core/src/contracts/actions/contract-write.handlers.ts` | 1 dòng `assertCustomer` (`contract.create` / `create_from_quote`) |
| M | `packages/core/src/sales/orders/actions/order-create.handlers.ts` | 1 dòng `assertCustomer` (3 handler tạo đơn) |
| M | `packages/core/src/sales/orders/actions/order-from-appointment.handler.ts` | 1 dòng `assertCustomer` |
| M | `packages/core/src/sales/payments/actions/invoice-write.handlers.ts` | 1 dòng `assertCustomer` (`invoice.create`) |
| M | `packages/core/src/crm/opportunities/write.handlers.ts` | 1 dòng `assertCustomer` (`contact_opportunity.create`, file của 026c) |
| C | `packages/core/test/contact-relation.test.ts` | Unit guard + rules bỏ qua + insight / follow-up (AC3, AC8) |
| C | `apps/api/test/integration/contact-relation-guard.test.ts` | AC2 |
| C | `apps/api/test/integration/contacts-relation-list.test.ts` | AC6 + EXPLAIN |
| C | `apps/api/test/integration/actions/contact.set_relation.action.test.ts` | AC4–5 |
| M | `apps/api/test/integration/actions/contact.set_stage.action.test.ts` | AC3 |
| M | `apps/api/test/integration/actions/lead_routing.apply.action.test.ts` | `not_customer` |
| M | `apps/api/test/integration/actions/segment.preview.action.test.ts` | AC7 |
| M | `apps/web/src/features/customers/types.ts` | `relation` trên dòng + filter |
| M | `apps/web/src/features/customers/crm-store.ts` | `filter.relation` |
| M | `apps/web/src/features/customers/api.ts` | Tham số `relation` |
| M | `apps/web/src/features/customers/columns.tsx` | Cột "Loại" + chip mobile |
| C | `apps/web/src/shared/crm-forms/RelationChip.tsx` | Chip loại (token màu) dùng chung customers + inbox (không import chéo feature) |
| M | `apps/web/src/features/customers/components/CrmToolbar.tsx` | `FilterSelect` "Loại" |
| M | `apps/web/src/features/customers/components/ContactFormModal.tsx` | Ô "Loại liên hệ" |
| M | `apps/web/src/features/inbox/components/Overview360.tsx` | Chip + menu đổi loại; ẩn khối bán hàng khi không phải khách |
| M | `apps/web/src/features/inbox/components/ChatHeader.tsx` | Chip loại khi khác Khách hàng |
| M | `apps/web/src/shared/api/mock/domains/customers.ts` | Mock `relation` + lọc |
| M | `apps/web/src/shared/api/mock/domains/contact-edit.ts` | Mock `contact.set_relation` |
| M | `apps/web/messages/vi/customers.json` | Chuỗi loại liên hệ |
| M | `apps/web/messages/en/customers.json` | Như trên (en) |
| M | `apps/web/messages/vi/inbox.json` | Chip loại ở Hộp thư / 360 |
| M | `apps/web/messages/en/inbox.json` | Như trên (en) |
| M | `apps/web/e2e/customers.spec.ts` | AC9 (mock) |
| M | `apps/web/e2e/http/customers.spec.ts` | AC9 (http) |
| M | `tools/parity/parity.manifest.ts` | Mask PD-910 cột Loại ở `customers` |
