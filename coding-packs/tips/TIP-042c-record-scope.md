# TIP-042c — Scope bản ghi thống nhất và watcher chỉ đọc

## HEADER
- **Parallel-safe with TIP-015c (Privacy manifest):** sequential, shares `packages/core/src/booking/services/calendar-read.service.ts`, `packages/core/src/contracts/services/contracts-read.service.ts`, `packages/core/src/crm/services/access.ts`, `packages/core/src/crm/services/contacts.service.ts`, `packages/core/src/crm/services/identity.service.ts`, `packages/core/src/inbox/services/access.ts`, `packages/core/src/inbox/services/pipeline.ts`, `packages/core/src/inbox/services/read.service.ts`, `packages/core/src/sales/orders/services/order-import.ts`, `packages/core/src/sales/orders/services/orders-read.service.ts`, `packages/core/src/sales/payments/services/invoices-read.service.ts`, `packages/core/src/sales/quotes/services/quotes-read.service.ts`, `packages/core/src/support/services/tickets-read.service.ts`; integrate 042c before015c.
- **Parallel-safe with TIP-033b (Booking operations manifest):** sequential, shares `packages/core/src/booking/actions/appointment-book.handlers.ts`, `packages/core/src/booking/booking-access.ts`, `packages/core/src/booking/services/calendar-read.service.ts`, `packages/core/src/sales/payments/services/invoices-read.service.ts`, `packages/db/prisma/tenant/booking.prisma`; integrate 042c before033b.
- **Parallel-safe with TIP-015e (Contact merge manifest):** sequential, shares `packages/core/src/authz/data-access/record-policy.ts`, `packages/core/src/authz/data-access/scope-sql.ts`, `packages/core/src/booking/actions/appointment-book.handlers.ts`, `packages/core/src/booking/booking-access.ts`, `packages/core/src/booking/services/calendar-read.service.ts`, `packages/core/src/contracts/actions/contract-write.handlers.ts`, `packages/core/src/contracts/contract-access.ts`, `packages/core/src/contracts/services/contracts-read.service.ts`, `packages/core/src/crm/actions/contact-owner.handlers.ts`, `packages/core/src/crm/services/access.ts`, `packages/core/src/crm/services/identity.service.ts`, `packages/core/src/inbox/services/access.ts`, `packages/core/src/inbox/services/pipeline.ts`, `packages/core/src/inbox/services/read.service.ts`, `packages/core/src/sales/orders/actions/order-create.handlers.ts`, `packages/core/src/sales/orders/actions/order-flow.handlers.ts`, `packages/core/src/sales/orders/order-access.ts`, `packages/core/src/sales/orders/services/orders-read.service.ts`, `packages/core/src/sales/payments/actions/invoice-write.handlers.ts`, `packages/core/src/sales/payments/invoice-access.ts`, `packages/core/src/sales/payments/services/invoices-read.service.ts`, `packages/core/src/sales/quotes/actions/quote-write.handlers.ts`, `packages/core/src/sales/quotes/quote-access.ts`, `packages/core/src/sales/quotes/services/quote-send.ts`, `packages/core/src/sales/quotes/services/quotes-read.service.ts`, `packages/core/src/support/actions/ticket-create.handler.ts`, `packages/core/src/support/services/tickets-read.service.ts`, `packages/db/prisma/tenant/crm.prisma`; integrate 042c before015e.
- **Parallel-safe with TIP-015f (Contact lifecycle manifest):** sequential, shares `packages/core/src/booking/actions/appointment-book.handlers.ts`, `packages/core/src/contracts/actions/contract-approval.handlers.ts`, `packages/core/src/contracts/actions/contract-send.handlers.ts`, `packages/core/src/contracts/actions/contract-write.handlers.ts`, `packages/core/src/contracts/contract-access.ts`, `packages/core/src/crm/actions/contact-owner.handlers.ts`, `packages/core/src/crm/services/access.ts`, `packages/core/src/crm/services/identity.service.ts`, `packages/core/src/inbox/actions/email-send.handlers.ts`, `packages/core/src/inbox/inbox.module.ts`, `packages/core/src/inbox/services/access.ts`, `packages/core/src/inbox/services/pipeline.ts`, `packages/core/src/inbox/services/read.service.ts`, `packages/core/src/notify/realtime/filter.ts`, `packages/core/src/sales/orders/actions/order-create.handlers.ts`, `packages/core/src/sales/orders/actions/order-flow.handlers.ts`, `packages/core/src/sales/orders/order-access.ts`, `packages/core/src/sales/orders/services/order-import.ts`, `packages/core/src/sales/payments/actions/invoice-pay.handlers.ts`, `packages/core/src/sales/payments/actions/invoice-write.handlers.ts`, `packages/core/src/sales/payments/invoice-access.ts`, `packages/core/src/support/actions/ticket-create.handler.ts`, `packages/db/prisma/tenant/crm.prisma`, `packages/db/prisma/tenant/sales-orders.prisma`; integrate 042c before015f.
- **Parallel-safe with TIP-032c (Commerce edit manifest):** sequential, shares `packages/core/src/authz/data-access/record-policy.ts`, `packages/core/src/authz/data-access/scope-sql.ts`, `packages/core/src/contracts/actions/contract-approval.handlers.ts`, `packages/core/src/contracts/actions/contract-write.handlers.ts`, `packages/core/src/contracts/contract-access.ts`, `packages/core/src/contracts/services/contracts-read.service.ts`, `packages/core/src/sales/orders/actions/order-create.handlers.ts`, `packages/core/src/sales/orders/actions/order-flow.handlers.ts`, `packages/core/src/sales/orders/order-access.ts`, `packages/core/src/sales/orders/services/order-import.ts`, `packages/core/src/sales/orders/services/orders-read.service.ts`, `packages/db/prisma/tenant/contracts.prisma`, `packages/db/prisma/tenant/sales-orders.prisma`; integrate 042c before032c.
- **Parallel-safe with TIP-015d (CRM ownership manifest):** sequential, shares `packages/core/src/authz/data-access/record-policy.ts`, `packages/core/src/authz/data-access/scope-sql.ts`, `packages/core/src/booking/actions/appointment-book.handlers.ts`, `packages/core/src/booking/booking-access.ts`, `packages/core/src/crm/actions/contact-owner.handlers.ts`, `packages/core/src/crm/services/access.ts`, `packages/core/src/inbox/actions/conversation-assign.handlers.ts`, `packages/core/src/inbox/actions/email-send.handlers.ts`, `packages/core/src/inbox/inbox.module.ts`, `packages/core/src/inbox/services/owner-move.ts`, `packages/core/src/inbox/services/pipeline.ts`, `packages/core/src/notify/realtime/filter.ts`, `packages/core/src/sales/quotes/actions/quote-decide.handlers.ts`, `packages/core/src/sales/quotes/actions/quote-write.handlers.ts`, `packages/core/src/sales/quotes/quote-access.ts`, `packages/core/src/sales/quotes/services/quote-send.ts`, `packages/core/src/sales/quotes/services/quotes-read.service.ts`, `packages/db/prisma/tenant/booking.prisma`, `packages/db/prisma/tenant/crm.prisma`, `packages/db/prisma/tenant/inbox.prisma`, `packages/db/prisma/tenant/sales-quotes.prisma`; integrate 042c before015d.
- **Parallel-safe with TIP-026b (CRM activity manifest):** sequential, shares `packages/core/src/crm/repos/contacts.repo.ts`, `packages/db/prisma/tenant/crm.prisma`; integrate 042c before026b.
- **Parallel-safe with TIP-012b (Bank integration manifest):** sequential, shares `packages/core/src/sales/payments/services/invoices-read.service.ts`, `packages/db/prisma/tenant/sales-payments.prisma`; integrate 042c before012b.
- **Parallel-safe with TIP-019b (Runtime integration manifest):** sequential, shares `packages/core/src/notify/realtime/filter.ts`; integrate 042c before019b.
- **Parallel-safe with TIP-025b (Inbox integration manifest):** sequential, shares `packages/core/src/booking/actions/appointment-book.handlers.ts`, `packages/core/src/contracts/actions/contract-write.handlers.ts`, `packages/core/src/inbox/actions/conversation-assign.handlers.ts`, `packages/core/src/inbox/inbox.module.ts`, `packages/core/src/inbox/services/read.service.ts`, `packages/core/src/sales/orders/actions/order-create.handlers.ts`, `packages/core/src/sales/quotes/actions/quote-write.handlers.ts`, `packages/core/src/support/actions/ticket-create.handler.ts`, `packages/db/prisma/tenant/crm.prisma`, `packages/db/prisma/tenant/inbox.prisma`; integrate 042c before025b.
- **Parallel-safe with TIP-022b (agent behavior manifest):** sequential, shares `packages/core/src/inbox/services/pipeline.ts`, `packages/core/src/support/actions/ticket-create.handler.ts`, `packages/db/prisma/tenant/inbox.prisma`, `packages/db/prisma/tenant/support.prisma`; integrate 042c before022b.
- **Parallel-safe with TIP-014b (Zalo lifecycle manifest):** sequential, shares `packages/core/src/contracts/actions/contract-send.handlers.ts`, `packages/core/src/crm/services/identity.service.ts`, `packages/core/src/inbox/inbox.module.ts`, `packages/core/src/inbox/services/pipeline.ts`, `packages/core/src/sales/quotes/services/quote-send.ts`, `packages/db/prisma/tenant/inbox.prisma`; integrate 014b before042c.
- **Parallel-safe with TIP-032b (accepted foundation manifest):** sequential, shares `coding-packs/plans/BLUEPRINT.md`, `packages/core/src/contracts/actions/contract-send.handlers.ts`, `packages/core/src/contracts/actions/contract-write.handlers.ts`, `packages/core/src/sales/orders/actions/order-create.handlers.ts`, `packages/core/src/sales/orders/actions/order-flow.handlers.ts`, `packages/core/src/sales/orders/services/order-import.ts`, `packages/core/src/sales/quotes/actions/quote-send.handlers.ts`, `packages/core/src/sales/quotes/services/quote-send.ts`, `packages/db/prisma/tenant/sales-orders.prisma`, `packages/db/prisma/tenant/sales-payments.prisma`, `packages/db/prisma/tenant/sales-quotes.prisma`; integrate 032b before042c.
- **Parallel-safe with TIP-045b (hardening manifest):** sequential, shares `packages/core/src/authz/public.ts`, `packages/core/src/authz/services/authz-resolver.ts`, `packages/core/src/booking/services/calendar-read.service.ts`, `packages/core/src/contracts/services/contracts-read.service.ts`, `packages/core/src/crm/repos/contacts.repo.ts`, `packages/core/src/inbox/actions/email-send.handlers.ts`, `packages/core/src/inbox/inbox.module.ts`, `packages/core/src/notify/realtime/filter.ts`, `packages/core/src/sales/orders/services/orders-read.service.ts`, `packages/core/src/sales/payments/services/invoices-read.service.ts`, `packages/core/src/sales/quotes/services/quotes-read.service.ts`, `packages/core/src/support/services/tickets-read.service.ts`, `packages/db/prisma/tenant/crm.prisma`, `packages/db/prisma/tenant/inbox.prisma`; integrate 045b before042c. Recompute for later TIPs.
- **Parallel-safe with TIP-030b (contract files manifest):** sequential, shares `packages/core/src/contracts/actions/contract-approval.handlers.ts`, `packages/core/src/contracts/actions/contract-write.handlers.ts`, `packages/core/src/contracts/services/contracts-read.service.ts`, `packages/db/prisma/tenant/contracts.prisma`; integrate 030b before042c. Recompute when incomplete manifests expand.
- **Parallel-safe with TIP-023b (complete manifest intersection):** sequential, shares `packages/core/src/booking/actions/appointment-book.handlers.ts`, `packages/core/src/booking/services/calendar-read.service.ts`, `packages/core/src/contracts/actions/contract-approval.handlers.ts`, `packages/core/src/contracts/actions/contract-send.handlers.ts`, `packages/core/src/contracts/actions/contract-write.handlers.ts`, `packages/core/src/contracts/services/contracts-read.service.ts`, `packages/core/src/crm/actions/contact-owner.handlers.ts`, `packages/core/src/inbox/actions/conversation-assign.handlers.ts`, `packages/core/src/inbox/actions/email-send.handlers.ts`, `packages/core/src/inbox/inbox.module.ts`, `packages/core/src/inbox/services/read.service.ts`, `packages/core/src/sales/orders/actions/order-create.handlers.ts`, `packages/core/src/sales/orders/actions/order-flow.handlers.ts`, `packages/core/src/sales/orders/services/orders-read.service.ts`, `packages/core/src/sales/payments/actions/invoice-pay.handlers.ts`, `packages/core/src/sales/payments/actions/invoice-write.handlers.ts`, `packages/core/src/sales/payments/services/invoices-read.service.ts`, `packages/core/src/sales/quotes/actions/quote-decide.handlers.ts`, `packages/core/src/sales/quotes/actions/quote-send.handlers.ts`, `packages/core/src/sales/quotes/actions/quote-write.handlers.ts`, `packages/core/src/sales/quotes/services/quotes-read.service.ts`, `packages/core/src/support/actions/ticket-create.handler.ts`, `packages/core/src/support/services/tickets-read.service.ts`; integrate TIP-023b before TIP-042c.
- **Parallel-safe with TIP-023b (exact manifest audit):** sequential, shares `packages/core/src/booking/actions/appointment-book.handlers.ts`, `packages/core/src/booking/services/calendar-read.service.ts`, `packages/core/src/contracts/actions/contract-approval.handlers.ts`, `packages/core/src/contracts/actions/contract-send.handlers.ts`, `packages/core/src/contracts/actions/contract-write.handlers.ts`, `packages/core/src/contracts/services/contracts-read.service.ts`, `packages/core/src/crm/actions/contact-owner.handlers.ts`, `packages/core/src/inbox/actions/conversation-assign.handlers.ts`, `packages/core/src/inbox/actions/email-send.handlers.ts`, `packages/core/src/inbox/inbox.module.ts`, `packages/core/src/inbox/services/read.service.ts`, `packages/core/src/sales/orders/actions/order-create.handlers.ts`, `packages/core/src/sales/orders/actions/order-flow.handlers.ts`, `packages/core/src/sales/orders/services/orders-read.service.ts`, `packages/core/src/sales/payments/actions/invoice-pay.handlers.ts`, `packages/core/src/sales/payments/actions/invoice-write.handlers.ts`, `packages/core/src/sales/payments/services/invoices-read.service.ts`, `packages/core/src/sales/quotes/actions/quote-decide.handlers.ts`, `packages/core/src/sales/quotes/actions/quote-send.handlers.ts`, `packages/core/src/sales/quotes/actions/quote-write.handlers.ts`, `packages/core/src/sales/quotes/services/quotes-read.service.ts`, `packages/core/src/support/actions/ticket-create.handler.ts`, `packages/core/src/support/services/tickets-read.service.ts`; integrate TIP-023b before TIP-042c. Recompute on later manifest expansion; this is not whole-graph parallel clearance.
- **Parallel-safe with TIP-032b:** sequential, shares `coding-packs/plans/BLUEPRINT.md`, `packages/core/src/contracts/actions/contract-send.handlers.ts`, `packages/core/src/contracts/actions/contract-write.handlers.ts`, `packages/core/src/sales/orders/actions/order-create.handlers.ts`, `packages/core/src/sales/orders/actions/order-flow.handlers.ts`, `packages/core/src/sales/orders/services/order-import.ts`, `packages/core/src/sales/quotes/actions/quote-send.handlers.ts`, `packages/core/src/sales/quotes/services/quote-send.ts`, `packages/db/prisma/tenant/sales-orders.prisma`, `packages/db/prisma/tenant/sales-payments.prisma`, `packages/db/prisma/tenant/sales-quotes.prisma`; integrate TIP-032b before TIP-042c. Recompute after incomplete manifests expand.
- **Parallel-safe with TIP-015b:** sequential, shares `coding-packs/plans/BLUEPRINT.md`, `packages/core/src/contracts/services/contracts-read.service.ts`, `packages/core/src/sales/payments/services/invoices-read.service.ts`, `packages/db/prisma/tenant/crm.prisma`; integrate TIP-015b before TIP-042c. Recompute after incomplete manifests expand.
- **Parallel-safe with TIP-041:** sequential, shares `coding-packs/plans/BLUEPRINT.md`; integrate this TIP before 041. Recheck incomplete manifests.
- **Parallel-safe with TIP-038b:** sequential, shares `coding-packs/plans/BLUEPRINT.md`; integrate this TIP before 038b. Recheck incomplete manifests.
- **Parallel-safe with TIP-040:** sequential, shares `coding-packs/plans/BLUEPRINT.md`; integrate this TIP before 040. Recheck incomplete manifests.
- **Parallel-safe with TIP-039:** sequential, shares `coding-packs/plans/BLUEPRINT.md`; integrate this TIP before 039. Recheck incomplete manifests.
- **Parallel-safe with TIP-038 (expanded manifest):** sequential, shares `coding-packs/plans/BLUEPRINT.md`, `packages/core/src/booking/services/calendar-read.service.ts`; integrate this TIP before 038; recheck after remaining manifests expand.
- **Parallel-safe with TIP-038:** sequential, shares `packages/core/src/booking/services/calendar-read.service.ts`, `coding-packs/plans/BLUEPRINT.md`; integrate this TIP before 038. Recheck after incomplete manifests expand.
- **Parallel-safe with TIP-037:** sequential, shares `coding-packs/plans/BLUEPRINT.md`; integrate this TIP before 037. Recheck when incomplete manifests expand.
- TIP-ID: TIP-042c; Project: AppChat V2; Module: authz data-access across CRM/inbox/sales/booking/support; Priority: P0 security + P1 team; Estimated: XL.
- Depends on:005/015/016/029–034,042/042b/045b; tích hợp sau015b/020b/023b/023c/030b/032b/036/043 có shared domain; trước044/046.
- **Gate:** Q-029 phải chốt semantics team nhiều nhóm trước build phần team/backfill. Không tự biến teamUserIds thành OR team_id để “tương thích” nhưng mở rộng quyền. Watcher/read-write có luật D32 rõ, không chờ để nghiên cứu.
- **Dòng COVERAGE nhận:** STD-authz-rbac-5a, STD-authz-rbac-5b, STD-database-tenantdb-9, BP-3.5-e, COM-8b-2, COM-8b-2-write, Q-029. Field-level REQ-A05b-3/STD-authz-rbac-8 ở045b, không nhận trùng một phần mà bỏ sót.
- **Parallel-safe with:** sequential. Shares crm.prisma with015b/036/042b; contacts.service.ts with032b/036; quote-write.handlers.ts with032b; Blueprint with020b/036/042/042b/043; authz/public.ts + integration/authz.test.ts with042; pipeline.ts + future routing.handlers.ts with042b. Các TIP này đã có khai báo ngược chính xác; chưa mở parallel với TIP manifest chưa đủ.
- **Files touched:** bảng M/C dưới. M routing.handlers.ts do042b tạo trước, chưa tồn tại lúc lập TIP. Chỉ tài liệu, không cho phép code khi câu A chưa hoàn tất.

| Op | File |
|---|---|
| M | `apps/api/test/integration/authz.test.ts` |
| M | `coding-packs/plans/BLUEPRINT.md` |
| M | `packages/core/src/authz/public.ts` |
| M | `packages/core/src/authz/scope.ts` |
| M | `packages/core/src/authz/services/authz-resolver.ts` |
| M | `packages/shared/src/authz/permissions.ts` |
| M | `packages/shared/src/authz/roles.ts` |
| M | `packages/core/src/booking/actions/appointment-book.handlers.ts` |
| M | `packages/core/src/booking/booking-access.ts` |
| M | `packages/core/src/booking/services/calendar-read.service.ts` |
| M | `packages/core/src/contracts/actions/contract-approval.handlers.ts` |
| M | `packages/core/src/contracts/actions/contract-send.handlers.ts` |
| M | `packages/core/src/contracts/actions/contract-write.handlers.ts` |
| M | `packages/core/src/contracts/contract-access.ts` |
| M | `packages/core/src/contracts/services/contracts-read.service.ts` |
| M | `packages/core/src/crm/actions/contact-owner.handlers.ts` |
| M | `packages/core/src/crm/repos/contacts.repo.ts` |
| M | `packages/core/src/crm/services/access.ts` |
| M | `packages/core/src/crm/services/contacts.service.ts` |
| M | `packages/core/src/crm/services/identity.service.ts` |
| M | `packages/core/src/inbox/actions/conversation-assign.handlers.ts` |
| M | `packages/core/src/inbox/actions/email-send.handlers.ts` |
| M | `packages/core/src/inbox/inbox.module.ts` |
| M | `packages/core/src/inbox/services/access.ts` |
| M | `packages/core/src/inbox/services/owner-move.ts` |
| M | `packages/core/src/inbox/services/pipeline.ts` |
| M | `packages/core/src/inbox/services/read.service.ts` |
| M | `packages/core/src/notify/realtime/filter.ts` |
| M | `packages/core/src/sales/orders/actions/order-create.handlers.ts` |
| M | `packages/core/src/sales/orders/actions/order-flow.handlers.ts` |
| M | `packages/core/src/sales/orders/order-access.ts` |
| M | `packages/core/src/sales/orders/services/order-import.ts` |
| M | `packages/core/src/sales/orders/services/orders-read.service.ts` |
| M | `packages/core/src/sales/payments/actions/invoice-pay.handlers.ts` |
| M | `packages/core/src/sales/payments/actions/invoice-write.handlers.ts` |
| M | `packages/core/src/sales/payments/invoice-access.ts` |
| M | `packages/core/src/sales/payments/services/invoices-read.service.ts` |
| M | `packages/core/src/sales/quotes/actions/quote-decide.handlers.ts` |
| M | `packages/core/src/sales/quotes/actions/quote-send.handlers.ts` |
| M | `packages/core/src/sales/quotes/actions/quote-write.handlers.ts` |
| M | `packages/core/src/sales/quotes/quote-access.ts` |
| M | `packages/core/src/sales/quotes/services/quote-send.ts` |
| M | `packages/core/src/sales/quotes/services/quotes-read.service.ts` |
| M | `packages/core/src/support/actions/ticket-create.handler.ts` |
| M | `packages/core/src/support/services/tickets-read.service.ts` |
| M | `packages/core/src/support/ticket-access.ts` |
| M | `packages/core/test/authz-unit.test.ts` |
| M | `packages/db/prisma/tenant/booking.prisma` |
| M | `packages/db/prisma/tenant/contracts.prisma` |
| M | `packages/db/prisma/tenant/crm.prisma` |
| M | `packages/db/prisma/tenant/inbox.prisma` |
| M | `packages/db/prisma/tenant/sales-orders.prisma` |
| M | `packages/db/prisma/tenant/sales-payments.prisma` |
| M | `packages/db/prisma/tenant/sales-quotes.prisma` |
| M | `packages/db/prisma/tenant/support.prisma` |
| M | `packages/core/src/crm/routing/routing.handlers.ts` |
| C | `packages/db/prisma/tenant/migrations/20261102004220_record_scopes/migration.sql` |
| C | `packages/core/src/authz/data-access/access-mode.ts` |
| C | `packages/core/src/authz/data-access/contact-grants.ts` |
| C | `packages/core/src/authz/data-access/record-policy.ts` |
| C | `packages/core/src/authz/data-access/scope-sql.ts` |
| C | `packages/core/src/authz/data-access/team-snapshot.ts` |
| C | `packages/core/test/record-scope.test.ts` |
| C | `packages/core/test/contact-grants.test.ts` |
| C | `apps/api/test/integration/record-scope.test.ts` |
| C | `apps/api/test/integration/watcher-write-denial.test.ts` |
| C | `apps/api/test/integration/record-scope-realtime.test.ts` |
| C | `apps/web/e2e/http/record-scope.spec.ts` |
| C | `coding-packs/reports/TIP-042c-completion.md` |

## CONTEXT
- Working dir: AppChat_Ver2, stack product/tech-stack.md + Blueprint/BUILDER-HANDOFF. D27 và native/no-Docker mới hơn câu Owner+Member/Testcontainers cũ trong product doc.
- Khảo sát a5947eb:
  - authz/scope.ts:26 dùng teamUserIds; ScopeFields không có team column. CRM/inbox/support có team_id; quote/contract/order/invoice/appointment chưa có.
  - sales/orders/order-access.ts:17 và contracts/contract-access.ts:17 lọc chỉ collaborator, không watcher. booking-access.ts cũng vậy; vì vậy watcher thấy khách nhưng không thấy các chứng từ/lịch hẹn theo D32.
  - order-access.ts:36-45 và contract-access.ts:36-45: detail trả row khi owner==me trước khi chặn scope none; SQL list trả FALSE với none. “Có gọi helper” không chứng minh list/detail cùng quyền.
  - crm/services/access.ts:35-42: owner/cc được xét trước/ngoài gate none; inbox/services/access.ts:62-67 writableConversation chỉ kiểm canSeeConversation, chưa tách watcher đọc khỏi ghi.
  - lockOrder/lockContract/lockAppointment gọi visible*; nếu chỉ thêm watcher vào visible thì vô tình cấp quyền ghi cho watcher. Phải tách mode trước khi mở đọc.
  - field visibility là lỗ khác: contact-view.ts:94/contact360.ts:61 và calendar-read.service.ts:77 trả custom nguyên trạng; contacts.repo.ts lọc cf.* chưa kiểm field quyền. Không coi sửa scope ở đây giải được field leak;045b phải nhận cả read/filter/AI/export.
- Nguồn: D27/D32, COMMERCE §8b, Blueprint §2.2/§3.5, rbac-permissions, tenant-db §9. Không dùng completed report để thay bằng chứng code.

## APPLICABLE STANDARDS
- authz/rbac-permissions.md; actions/action-registry.md; api/response-envelope.md: permission AND data scope, read/write khác nhau, thông báo lỗi không lộ dữ liệu.
- database/tenant-db.md; database/indexing.md; domain/concurrency.md: nullable team_id scalar, compatible migration, composite indexes, deferred join, race-safe checks.
- events/outbox.md; ops/observability-security.md; ai/agent-gateway.md: realtime/worker/AI không bypass, quyền hiện tại mỗi tool.
- domain/gap-filling.md; code/file-size-module-layout.md; code/testing.md; D59 GOAL-BACKEND; workflow/git-flow-ci.md.
- domain/custom-fields.md là boundary045b, không tự coi visible_in là quyền dữ liệu ở đây.

## Rà trước khi làm
1. Chốt Q-029 và cập nhật bảng truth-table trước sửa predicate/migration. Ghi rõ row team_id null, owner nhiều team, owner đổi team, record có team khác owner, group conversation không contact.
2. Sau rebase chạy inventory mọi visible*/lock*/scopeSql caller, kể cả read action mới023b và worker ai. Manifest ghi code hiện có; dependency tạo thêm caller thì bổ sung manifest/overlap trước sửa, không sửa rộng không ghi nhận.
3. Đo file lines; các domain file chỉ thay call/import facade, không nhét generic policy vào từng handler/monolith. Helpers data-access/ chuyên biệt, test riêng.
4. Kiểm event schema/realtime: không chỉ sửa filter rồi payload vẫn thiếu teamId/contact grant. API socket join và event emit phải dựa policy hiện hành, không tin payload client.
5. Không chạy test isolation trên DB/Redis demo; không đổi services/port. Đọc chuẩn migration backfill và provider gate.

## TASK
Chuẩn hoá cùng một policy cho SQL list/count/search, get/detail, action write và realtime để không có đường truy cập “rộng hơn một chút”. Mở quyền đọc chứng từ/lịch hẹn cho watcher theo D32 nhưng không mở quyền ghi; bổ sung team_id cho tám bảng theo quyết định Q-029 mà không sửa snapshot doanh số.

### 1. Policy read/write có truth-table
- Tách AccessMode read/write rõ ràng; domain visible* chỉ cho đọc, lock*/editable* kiểm write. Không để mode mặc định read trong handler ghi cũ. contact-grants phân biệt collaborator/watcher thay vì trả list IDs chung cho mọi operation.
- Permission module vẫn kiểm trước; có relationship không cấp thêm permission. isOwner từ workspace resolver, không từ role string.
- Scope none chặn trước mọi owner/assignee/collaborator/team branch (trừ Owner resolver vốn all); SQL và in-memory/get phải bằng nhau. scope all/own/team theo bảng được duyệt, không đặc cách detail theo owner nếu list deny.
- own đọc: owner/assignee và khách mình collaborator **hoặc watcher**, áp quote/contract/order/invoice/appointment cùng CRM/inbox theo D32. own ghi: owner/assignee/collaborator với permission tương ứng, **không dùng watcher làm bằng chứng ghi**. collaborator không được chuyển owner/xoá khách; giữ crm.reassign/crm.delete và luật D32 hiện hành.
- Nếu vừa watcher vừa có quyền độc lập owner/all/team: phân biệt grant độc lập với “đọc nhờ watcher”; không làm membership watcher vô tình xoá quyền Owner. Test ma trận ghi nêu rõ đường grant nào thắng theo luật hiện hành; không suy chỉ từ có row watcher.
- CRM hỗ trợ đặc thù CSKH all-read/own-write đã chốt, không tái dùng read scope cho write. Thêm writeScope hiệu lực vào AuthzContext và metadata preset vai trò (không đổi tập permission): resolver dựng theo ma trận Blueprint; helper chỉ nhận scope/mode, không kiểm tên vai trò. Custom role scope áp cả read/write trừ policy được duyệt ghi rõ khác; không tự thừa kế quyền rộng của system role. Cache revision042 chứa đủ read/write scope, payload cũ thiếu writeScope phải reload chứ không mặc định all. Inbox writableConversation phải gọi write policy, không chỉ canSee.
- Không mở quyền support bằng contact relationship nếu chuẩn không yêu cầu; giữ assignee/created_by semantics ticket hiện có trừ Q-029 team. Ghi bảng module-specific; tránh generic helper vô tình lan quyền CRM vào ticket.
- Ngoài quyền đọc:404 không payload bản ghi; ghi đã thấy nhưng thiếu write:403 SCOPE_FORBIDDEN; scope none không leak mã/tên khách ở error. API/UI/AI cùng kết quả.

### 2. Team schema và propagation (gate Q-029)
- Thêm nullable teamId vào Quote/Contract/Order/Invoice/Appointment, giữ cột đã có ởContact/Conversation/Ticket. Không thêm workspace_id tenant, không relation Prisma xuyên file. SQL FK trong cùng tenant nếu cần; no FK platform user.
- **Chưa được tự chốt:** team-based row access hay dynamic member-owned access. Khi Q-029 trả lời, ghi một predicate duy nhất cho scopeSql/inScope/guards; không OR cả hai để tránh migration khó. Không chọn “team đầu tiên” khi owner nhiều team.
- Backfill dùng bằng chứng nguồn rõ: invoice từ order, order từ quote/contract khi lineage tồn tại, conversation từ contact nếu phù hợp quyết định; chỉ suy từ owner khi mapping được quyết định cho phép và không mơ hồ. Nếu mơ hồ để null + báo count để xử lý theo policy đã duyệt, không bịa team.
- New records dùng team-snapshot helper: quote/contract/order/invoice/appointment theo nguồn và owner đúng COMMERCE; contact/inbox/support theo assignment. Manifest bao gồm create, clone/revision, import, pipeline và routing042b, không chỉ một HTTP create.
- Chuyển phụ trách không sửa owner_user_id lịch sử chứng từ/doanh số. team_id scope không là doanh số. Propagation khi chuyển owner phải theo Q-029, giữ option move hội thoại hiện có; undo CAS không phục hồi team cũ nếu người khác đổi tiếp.
- Nullable additive + feature gate khi schema chưa migrate, không query cột thiếu; code mới một version cũ chạy được theo tenant-db §6. Không sử dụng fallback rộng hơn để che thiếu migration.
- Index theo list thực: equality team_id trước status/range/sort + id tie-break; partial WHERE team_id IS NOT NULL và deleted_at IS NULL khi bảng có deleted_at. INCLUDE chỉ payload nhỏ/id/owner/contact, không custom JSON. Không duplicate index; mỗi domain ghi EXPLAIN cho own/team/collaborator/watchers.
- Contact grants query dùng index(user_id,contact_id) INCLUDE(role) nếu chưa covering; EXISTS/ID subquery trước payload, không fetch tất cả record để lọc trong JS; count và pagination cùng scope.

### 3. Điểm tích hợp bắt buộc
| Surface | Thay đổi và bằng chứng |
|---|---|
| CRM list/detail | scopeSql/accessOf cùng truth-table, none/CS write và collaborator/watcher; giữ soft-delete |
| Inbox list/detail/send/assign | convScopeSql/canSee/writable khác mode; contact owner không thay human assignee; group team null có case riêng |
| Quote/contract/order/invoice | list SQL cho watcher đọc, visible detail cùng policy; lock/write/send/approve/pay không chỉ gọi read guard |
| Booking | inBookingScope mang mode/team ref, list/get/book/update/cancel/checkin cùng role policy; khách ngoài scope không leak trong slots/details |
| Support | assignee/creator + team, không tự grant toàn bộ ticket từ watcher CRM |
| Realtime | scopeCols/ref + socket guard đủ team/contact context; kiểm quyền hiện tại khi emit/join, grant revoke không đợi payload cache cũ; notification chỉ đọc vẫn được theo D32 |
| AI/exports/preview | dùng read service scoped, còn mutate qua Executor write guard; preview không tiết lộ ngoài scope; không mở special AI bypass |

- Domain read action bổ sung023b phải reuse service không truy vấn raw. Export038 và serializer045b dùng policy này; các TIP đó phải khai dependency/rà overlap khi manifest hoàn thiện.
- Không sửa client để “ẩn nút là xong”. Không cần UI feature mới; HTTP E2E đăng nhập watcher chứng minh đọc được nhưng mutation403; reload vẫn đúng.
- Tách reusable policy trong data-access; domain SQL alias/field map allowlist do server định nghĩa, không nhận identifier SQL từ caller.

## ACCEPTANCE CRITERIA
1. **Scope consistency:** Given hai tenant, mỗi module có own/team/all/none, owner/assignee khác nhau; When list/count/search/detail/read-action; Then ID set bằng nhau, none không lộ cả record của chính mình, cross-tenant404/403. Có case owner nhiều team theo Q-029.
2. **Watcher reads:** Given sales có module view + watcher của một contact; When xem quote/contract/order/invoice/appointment và CRM/inbox liên quan; Then đọc được đúng khách, không đọc khách khác. Bỏ watcher rồi request tiếp theo không thấy nữa (trừ grant độc lập).
3. **Watcher writes:** Given watcher không có grant ghi độc lập; When send message, assign, edit/send/approve quote/contract, update/cancel/pay order/invoice, reschedule/cancel appointment, preview và undo; Then403, không side effect/outbox/tiền, dù có global action permission. Collaborator hợp lệ ghi được trong phạm vi nhưng không chuyển/xoá khách.
4. **System/AI parity:** Given human/coplayer AI/worker delegated cùng user gốc; When tool đọc/ghi sau revoke; Then cùng kết quả hiện tại, tool_ids không cấp thêm scope; source giả không bypass. Chạy live023b cho watcher yêu cầu đọc rồi sửa để chứng minh từ chối, không chỉ mock.
5. **Team migration:** Given 8 bảng old/new schema, owner1team/nhiềuteam/null, lineage và record chuyển owner; When migration/backfill/new create/import/revision/clone/routing/undo; Then team đúng policyQ-029, mơ hồ không tự gán ngẫu nhiên, owner doanh số không đổi, version compatibility pass.
6. **Concurrency:** Given watcher revoked/team removed trong lúc queued action/preview; When execute/resume; Then kiểm quyền mới, token preview không giữ quyền cũ. CAS/lock đảm bảo không tự cấp lại qua undo/transfer race.
7. **Realtime/HTTP:** Given socket watcher cùng tenant và outsider; When assigned/owner_changed/message event rồi revoke; Then chỉ người được đọc nhận, outsider không join/get payload; E2E HTTP chứng minh drawer đọc nhưng write bị chặn server.
8. **SQL/security:** Given fixture lớn; When list/count own/team/watcher; Then scoped ID stage trước LIMIT/payload, index equality-first/INCLUDE hợp lý, EXPLAIN từng module, không N+1. Static inventory mọi caller không còn write gọi read-only guard.

### Test commands (builder chạy, không phải kết quả đã đạt)
- `pnpm --filter @appchat/core exec vitest run test/authz-unit.test.ts test/record-scope.test.ts test/contact-grants.test.ts`.
- `pnpm --filter @appchat/api exec vitest run --config vitest.integration.config.ts test/integration/authz.test.ts test/integration/record-scope.test.ts test/integration/watcher-write-denial.test.ts test/integration/record-scope-realtime.test.ts`.
- `pnpm --filter @appchat/web exec playwright test --config playwright.http.config.ts record-scope.spec.ts` qua harness HTTP cô lập; full mock/HTTP regression và `pnpm parity --done` vì scope dùng chung, D59 đầy đủ.
- `pnpm ai:live`: ca watcher xem chứng từ/sửa bị từ chối/revoke giữa run. Harness023b phải có case hoặc thêm manifest cả hai TIP trước sửa; thiếu provider ghi chưa nghiệm thu thật.
- EXPLAIN ANALYZE BUFFERS SQL list/get/count; test DB migration old/new, concurrency từ2 process. Không test bằng production/demo data.

## CONSTRAINTS
- DO NOT: mở quyền bằng OR hai định nghĩa team; đổi D32/money/Owner; coi watcher như collaborator khi ghi; lấy role name làm guard; raw source/system bypass; query ngoài resolver.
- REUSE: AuthzResolver revision042, Executor, scoped domain read services, outbox/notify, Clock; module theo domain, không monolith; test ngoài production files.
- SKIP: field-level custom/system data visibility/filter/AI/export ở045b; AI eval tổng044; export UI038. Không đánh field-level ĐẠT vì row-scope đúng.
- Trần file backend600 (tách ở500), frontend400; facade ở file quá trần. Bổ sung report TIP DONE, không sửa001–035.

## Quality Gate: Self-Review
- Header/manifest/context/tasks8AC/constraints/checklist có đủ.
- Chưa ready-to-build phần team: Q-029; manifest có1 M từ dependency042b; full batch overlap chưa thể chốt khi TIP khác chưa đủ file. Independent review chưa chạy.

## ⚠️ BUILDER-CHECKLIST
- [ ] Q-029 chốt + truth-table được ghi; manifest caller/source/realtime sau dependencies đã rà.
- [ ] AC1–8 test thật, ghi kết quả từng module/action; không suy từ test CRM sang mọi chứng từ.
- [ ] Không watcher write/none detail bypass; tenant/role isolation, AI mỗi tool quyền hiện tại.
- [ ] Team backfill/creation/undo không đổi owner doanh số; EXPLAIN/index/late join đúng.
- [ ] File caps/D59/full E2E/parity/live theo phạm vi; không đổi demo DB/ports.
- [ ] Commit tip/042c-* → PR dev, status sạch, Git SHA; cập nhật COVERAGE parts/merge, không claim field-level đã xong.
