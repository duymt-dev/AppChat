# TIP-026c — exact file manifest

M = modify, C = create. Một M ở tương lai chỉ hợp lệ khi TIP đứng trước đã tích hợp xong. Không ghi wildcard thư mục; test để ở file riêng.

| Mode | Exact file | Responsibility |
|---|---|---|
| M | `packages/db/prisma/tenant/crm-activities.prisma` | Enum 7 giai đoạn; thêm owner / team / source / lost / closed / stage_changed vào `contact_opportunity`; bỏ `probability` + `quote_id`; model `contact_opportunity_item`, `contact_opportunity_event` |
| M | `packages/db/prisma/tenant/sales-quotes.prisma` | `quote.opportunity_id` + cờ `opportunity_sync_value` / `opportunity_follow_up` |
| M | `packages/db/prisma/tenant/sales-orders.prisma` | `order.opportunity_id` (chụp lúc tạo) |
| M | `packages/db/prisma/tenant/booking.prisma` | `appointment.opportunity_id` |
| C | `packages/db/prisma/tenant/migrations/20261112100000_opportunity_pipeline/migration.sql` | Ánh xạ stage 026b, chép `quote_id` sang `quote.opportunity_id`, bỏ cột cũ, bảng con, index partial / INCLUDE |
| C | `packages/db/test/opportunity-pipeline-migration.test.ts` | Migration trên bản chụp dữ liệu 026b (id / version / timeline giữ, ánh xạ đúng) |
| C | `packages/shared/src/crm/opportunity-stages.ts` | Bảng hằng giai đoạn: thứ tự, xác suất, màu, ánh xạ giai đoạn khách, lý do Thua, `forecastOf` |
| C | `packages/shared/src/crm/opportunity-stages.test.ts` | Unit bảng hằng + dự báo + ánh xạ |
| M | `packages/shared/src/crm/activity-state.ts` | Re-export giai đoạn mới; bỏ `probabilityOk` |
| M | `packages/shared/src/crm/index.ts` | Export `opportunity-stages` |
| M | `packages/shared/src/crm/labels.ts` | Chú thích nhãn giai đoạn khách theo D60 (khoá giữ) |
| C | `packages/shared/src/api/opportunities.ts` | DTO cơ hội: thẻ, danh sách, drawer, chuỗi chứng từ, openSummary |
| M | `packages/shared/src/api/index.ts` | Export DTO cơ hội |
| M | `packages/shared/src/api/contact-activities.ts` | Bỏ `probability`; tóm tắt hoạt động trỏ DTO cơ hội mới |
| M | `packages/shared/src/api/crm.ts` | Contact360: `opportunity` + `opportunities[]`; bỏ `ai_summary.close_pct`, `crm.open_deal`; cột list `open_opportunity` |
| M | `packages/shared/src/api/inbox.ts` | Hội thoại: `opportunity_chip` (nhãn giai đoạn + giá trị rút gọn, null khi không thấy tiền) |
| M | `packages/shared/src/api/quotes.ts` | Báo giá: `opportunity_id` + hai cờ |
| M | `packages/shared/src/api/calendar.ts` | Lịch hẹn: `opportunity_id` |
| M | `packages/shared/src/data-transfer/activity-fields.ts` | Dataset cơ hội: bỏ `probability`, thêm stage mới / owner / source_kind |
| M | `packages/shared/src/i18n/server/vi/crm.ts` | Nhãn giai đoạn khách D60 + khoá timeline / lịch sử cơ hội |
| M | `packages/shared/src/i18n/server/en/crm.ts` | Như trên (en) |
| M | `packages/actions/src/contact-opportunities.ts` | create / update / archive mới (bỏ probability; agentGrantable theo DC-922) |
| C | `packages/actions/src/contact-opportunity-flow.ts` | `set_stage` · `mark_lost` · `reopen` · `set_owner` · `list` · `get` |
| M | `packages/actions/src/quotes.ts` | `quote.create / update` nhận `opportunity_id` + cờ |
| M | `packages/actions/src/orders.ts` | `order.create` / `create_from_appointment` nhận `opportunity_id` |
| M | `packages/actions/src/booking.ts` | `appointment.create` nhận `opportunity_id` |
| M | `packages/actions/src/booking-update.ts` | `appointment.update` nhận `opportunity_id` |
| M | `packages/actions/src/index.ts` | Đăng ký action mới |
| C | `packages/actions/test/opportunity-actions.test.ts` | Schema, quyền, `agentGrantable`, `field_removed` |
| C | `packages/core/src/crm/opportunities/opportunities.module.ts` | Module Nest của cơ hội |
| C | `packages/core/src/crm/opportunities/write.handlers.ts` | create / update / archive (thay `crm/activities/opportunities.handlers.ts`) |
| C | `packages/core/src/crm/opportunities/flow.handlers.ts` | set_stage / mark_lost / reopen / set_owner + undo |
| C | `packages/core/src/crm/opportunities/previews.ts` | Preview mọi action ghi (mark_lost liệt kê báo giá bị từ chối) |
| C | `packages/core/src/crm/opportunities/locks.ts` | `lockOpportunity` (sau họ khách + chứng từ, theo id tăng dần) |
| C | `packages/core/src/crm/opportunities/links.ts` | Kiểm liên kết cùng họ khách / cơ hội chưa Thua; `soleOpenOpportunity` |
| C | `packages/core/src/crm/opportunities/transitions.ts` | Luật chuyển tự động theo chứng từ (§3.1) — gọi từ producer |
| C | `packages/core/src/crm/opportunities/stage-sync.ts` | `recomputeContactStage` (M / F / allowLower qua `applyStageRule`) |
| C | `packages/core/src/crm/opportunities/history.ts` | `recordOpportunityEvent` + timeline |
| C | `packages/core/src/crm/opportunities/read.service.ts` | listForContact · openSummary · detail (chuỗi chứng từ theo quyền) |
| C | `packages/core/src/crm/opportunities/chain.ts` | Đọc chuỗi Báo giá → HĐ / Đơn → Đề nghị → thu theo quyền người xem |
| C | `packages/core/src/crm/opportunities/next-step.ts` | Bước tiếp theo theo luật (`source: 'rule'`) |
| M | `packages/core/src/crm/activities/opportunities.handlers.ts` | Facade 1–2 dòng trỏ module mới (gỡ thân cũ) |
| M | `packages/core/src/crm/activities/activities.module.ts` | Bỏ handler cơ hội cũ, import module mới |
| M | `packages/core/src/crm/activities/authority.ts` | `canWriteAmount` dùng chung (giữ), bỏ logic probability |
| M | `packages/core/src/crm/activities/projection.ts` | Tóm tắt hoạt động: cơ hội hiện hành theo DTO mới |
| M | `packages/core/src/crm/activities/read.service.ts` | Bỏ đọc cơ hội cũ (chuyển sang `opportunities/read.service.ts`) |
| M | `packages/core/src/crm/activities/previews.ts` | Bỏ preview cơ hội cũ |
| M | `packages/core/src/crm/crm.module.ts` | Import `OpportunitiesModule` |
| M | `packages/core/src/crm/public.ts` | Export `recomputeContactStage`, `applyOpportunityTransition`, `recordOpportunityEvent`, `soleOpenOpportunity`, `checkOpportunityLink` |
| M | `packages/core/src/crm/services/contact360.ts` | Ô `opportunity` / `opportunities`; bỏ `deal`, `close_pct`, `open_deal` |
| M | `packages/core/src/crm/services/crm-read.service.ts` | Cột "Cơ hội đang mở" (openSummary), stats `deals` = số cơ hội mở |
| M | `packages/core/src/crm/memory/summary.ts` | Tóm tắt cơ hội theo giai đoạn + xác suất cố định |
| M | `packages/core/src/crm/merge/relations.ts` | Chuyển item / event theo cơ hội khi gộp |
| M | `packages/core/src/crm/privacy/inventory.ts` | Kê `contact_opportunity_item` / `_event` |
| M | `packages/core/src/crm/privacy/cleanup.ts` | Xoá item / event khi Quên khách |
| M | `packages/core/src/sales/quotes/services/quote-write.ts` | Ghi / kế thừa `opportunity_id` + cờ; kiểm liên kết |
| M | `packages/core/src/sales/quotes/actions/quote-write.handlers.ts` | create / update nhận `opportunity_id` |
| M | `packages/core/src/sales/quotes/actions/quote-send.handlers.ts` | Gửi: cơ hội → Báo giá, sync giá trị, việc theo dõi +2 ngày |
| M | `packages/core/src/sales/quotes/actions/quote-decide.handlers.ts` | Chốt → Đàm phán; từ chối → Tư vấn / Demo + thông báo lý do; `closeLost` qua `recomputeContactStage` |
| M | `packages/core/src/sales/system/quote-effects.ts` | Hết hạn → Tư vấn / Demo khi không còn báo giá mở |
| M | `packages/core/src/sales/orders/actions/order-create.handlers.ts` | `insertOrder` chụp `opportunity_id`, cơ hội → Đã mua; cơ hội Thua → 422 |
| M | `packages/core/src/sales/orders/actions/order-from-appointment.handler.ts` | Lấy `opportunity_id` theo lịch hẹn |
| M | `packages/core/src/sales/orders/actions/order-flow.handlers.ts` | Huỷ đơn: cơ hội won không còn chứng từ sống → Đàm phán |
| M | `packages/core/src/contracts/signing/finalize.ts` | Khách ký → cơ hội (qua quote) Đã mua |
| M | `packages/core/src/contracts/signing/public.handlers.ts` | Khách từ chối ký → cơ hội Đàm phán khi không còn HĐ ký / đơn |
| M | `packages/core/src/contracts/system/effects.ts` | Link ký hết hạn (declined) → như trên |
| M | `packages/core/src/booking/actions/appointment-book.handlers.ts` | Lưu `opportunity_id`, kiểm liên kết |
| M | `packages/core/src/booking/actions/appointment-update.handler.ts` | Đổi `opportunity_id` |
| M | `packages/core/src/booking/actions/appointment-flow.handlers.ts` | Hoàn thành → event `ai_suggested` (không đổi giai đoạn) |
| M | `packages/core/src/inbox/services/view.ts` | Chip cơ hội theo trang (openSummary, không N+1) |
| M | `packages/core/src/data-transfer/adapters/activities.ts` | Nhập / xuất cơ hội theo cột mới |
| M | `packages/core/src/insights/exports/activity-readers.ts` | Xuất cơ hội: stage / xác suất cố định / owner / nguồn |
| M | `packages/core/src/ai/assistant/catalog.ts` | Mô tả corpus cơ hội mới |
| M | `packages/core/src/kernel/actions/tip-owners.ts` | Chủ action / bảng mới = 026c |
| C | `packages/core/test/opportunity-stage-sync.test.ts` | Unit M / F / allowLower, giữ tay, Đã mua không hạ |
| C | `packages/core/test/opportunity-actions.test.ts` | Unit handler + preview + undo |
| C | `apps/api/src/http/crm/opportunities.controller.ts` | `GET /v1/contacts/:id/opportunities` · `GET /v1/opportunities/:id` |
| M | `apps/api/src/http/crm/crm.http.module.ts` | Đăng ký controller |
| C | `apps/api/test/integration/opportunity-pipeline.test.ts` | AC1–2, 5–8 (quyền, Thua, giai đoạn khách, EXPLAIN 100k) |
| C | `apps/api/test/integration/opportunity-producers.test.ts` | AC3–4, 9 (báo giá / HĐ / đơn / lịch hẹn) |
| M | `apps/api/test/integration/crm-stage-producers.test.ts` | Nhãn / luật lùi mới (chứng từ không gắn cơ hội) |
| M | `apps/api/test/integration/contact-activities.test.ts` | Bỏ probability; cơ hội đọc qua module mới |
| C | `apps/web/src/shared/opportunities/index.ts` | Barrel |
| C | `apps/web/src/shared/opportunities/api.ts` | Query cơ hội |
| C | `apps/web/src/shared/opportunities/types.ts` | Kiểu web |
| C | `apps/web/src/shared/opportunities/useOpportunityActions.ts` | `useAction` set_stage / mark_lost / reopen / create |
| C | `apps/web/src/shared/opportunities/opportunity-store.ts` | Trạng thái mở drawer / quick add |
| C | `apps/web/src/shared/opportunities/ui-commands.ts` | `open:opportunity`, `prefill:opportunity.form` |
| C | `apps/web/src/shared/opportunities/OpportunityPanel.tsx` | Thẻ 360° (6 bước, xác suất, dự báo, bước tiếp, AI gợi ý, danh sách) |
| C | `apps/web/src/shared/opportunities/StageBar.tsx` | Thanh giai đoạn bấm được |
| C | `apps/web/src/shared/opportunities/OpportunityQuickAdd.tsx` | Thêm nhanh tên + giá trị |
| C | `apps/web/src/shared/opportunities/OpportunityDrawer.tsx` | Drawer Cơ hội 360° (orchestrator) |
| C | `apps/web/src/shared/opportunities/OpportunityChain.tsx` | 4 bước chứng từ + nút tạo nối tiếp |
| C | `apps/web/src/shared/opportunities/LostReasonPicker.tsx` | Chọn lý do Thua bắt buộc |
| C | `apps/web/src/shared/opportunities/OpportunityCustomer360.tsx` | Khối Khách hàng 360° + cơ hội khác + lịch sử |
| C | `apps/web/src/shared/opportunities/OpportunityPicker.tsx` | Ô "Thuộc cơ hội" (form Báo giá / Lịch hẹn) |
| C | `apps/web/src/shared/opportunities/opportunity.styles.ts` | Style token |
| C | `apps/web/src/shared/opportunities/OpportunityPanel.test.tsx` | Unit thẻ / ẩn tiền / trạng thái |
| C | `apps/web/src/shared/opportunities/OpportunityDrawer.test.tsx` | Unit drawer / Thua / Mở lại / chuỗi |
| M | `apps/web/src/shared/contact-activities/OpportunityCard.tsx` | Facade sang `OpportunityPanel` |
| M | `apps/web/src/shared/contact-activities/OpportunityForm.tsx` | Facade sang `OpportunityQuickAdd` (bỏ ô xác suất) |
| M | `apps/web/src/shared/contact-activities/ActivityCards.tsx` | Trỏ panel mới |
| M | `apps/web/src/shared/contact-activities/ActivityCards.test.tsx` | Cập nhật theo panel mới |
| M | `apps/web/src/shared/contact-activities/ActivityFormHost.tsx` | Mount `OpportunityDrawer` |
| M | `apps/web/src/shared/contact-activities/ActivityListDrawer.tsx` | Danh sách cơ hội mới |
| M | `apps/web/src/shared/contact-activities/activity-store.ts` | Bỏ form cơ hội cũ |
| M | `apps/web/src/shared/contact-activities/api.ts` | Bỏ query cơ hội cũ |
| M | `apps/web/src/shared/contact-activities/commands.ts` | Lệnh Trợ lý trỏ cơ hội mới |
| M | `apps/web/src/features/inbox/components/Overview360.tsx` | Thay khối deal + vòng `close_pct` bằng `OpportunityPanel` |
| M | `apps/web/src/features/inbox/components/Tabs360.tsx` | Tab CRM "Cơ hội đang mở" |
| M | `apps/web/src/features/inbox/components/ChatHeader.tsx` | Chip cơ hội |
| M | `apps/web/src/features/inbox/components/ConvRow.tsx` | Chip cơ hội ở dòng hội thoại |
| M | `apps/web/src/features/inbox/types.ts` | Bỏ `deal`, `close_pct`, `open_deal`; thêm DTO cơ hội |
| M | `apps/web/src/features/customers/columns.tsx` | Cột "Cơ hội đang mở" |
| M | `apps/web/src/features/customers/types.ts` | Kiểu cột cơ hội |
| M | `apps/web/src/features/quotes/components/QuoteFormModal.tsx` | Mount `OpportunityPicker` + hai cờ (logic ở hook) |
| M | `apps/web/src/features/quotes/hooks/useQuoteDraft.ts` | `opportunity_id` + cờ trong nháp |
| M | `apps/web/src/features/quotes/types.ts` | Kiểu báo giá có cơ hội |
| M | `apps/web/src/features/calendar/components/AppointmentFormModal.tsx` | Mount `OpportunityPicker` + ghi chú demo |
| M | `apps/web/src/features/calendar/hooks/useApptForm.ts` | `opportunity_id` trong form |
| M | `apps/web/src/shared/api/mock/domains/contact-activities.ts` | Mock cơ hội mới (giai đoạn cố định, chuỗi) |
| M | `apps/web/src/shared/api/mock/domains/customers.ts` | Mock cột cơ hội + 360 |
| M | `apps/web/src/shared/api/mock/domains/inbox.ts` | Mock chip |
| M | `apps/web/src/shared/api/mock/domains/quotes-actions.ts` | Mock gửi / chốt / từ chối kéo cơ hội |
| M | `apps/web/src/shared/api/mock/domains/orders-actions.ts` | Mock tạo / huỷ đơn kéo cơ hội |
| M | `apps/web/src/shared/api/mock/domains/calendar-actions.ts` | Mock `opportunity_id` |
| M | `apps/web/src/shared/api/mock/contact-activities-shape.test.ts` | Contract shape mới |
| M | `apps/web/messages/vi/common.json` | Khoá `activities` cơ hội mới |
| M | `apps/web/messages/en/common.json` | Như trên (en) |
| M | `apps/web/messages/vi/customers.json` | Nhãn giai đoạn D60 + cột cơ hội |
| M | `apps/web/messages/en/customers.json` | Như trên (en) |
| M | `apps/web/messages/vi/inbox.json` | Nhãn giai đoạn D60, thẻ / chip cơ hội |
| M | `apps/web/messages/en/inbox.json` | Như trên (en) |
| M | `apps/web/messages/vi/quotes.json` | "Thuộc cơ hội", hai cờ, cảnh báo |
| M | `apps/web/messages/en/quotes.json` | Như trên (en) |
| M | `apps/web/messages/vi/calendar.json` | "Thuộc cơ hội", ghi chú demo |
| M | `apps/web/messages/en/calendar.json` | Như trên (en) |
| M | `apps/web/messages/vi/actions.json` | Tiêu đề action cơ hội |
| M | `apps/web/messages/en/actions.json` | Như trên (en) |
| C | `apps/web/e2e/sales-pipeline.spec.ts` | E2E mock: thẻ → drawer → chuỗi → Thua / Mở lại; mobile 390 |
| C | `apps/web/e2e/http/sales-pipeline.spec.ts` | E2E http cùng luồng |
| C | `fixtures/ai-eval/sales-pipeline.json` | 6 ca: agent tạo từ hội thoại đúng giai đoạn, agent đổi giai đoạn chạy thẳng, Trợ lý preview, Áp dụng gợi ý, liên kết sai khách, ẩn tiền |
| C | `tools/parity/modules/sales-pipeline.ts` | Entry `customers:360-pipeline`, `deal:drawer` + mask có mã |
| M | `tools/parity/parity.manifest.ts` | Nối module sales-pipeline |
| M | `tools/parity/src/capture.ts` | `OUT_LABELS` thêm "Báo cáo", "Tài chính" |
| M | `coding-packs/docs/06-prototype/DEVIATIONS.md` | PD-901 → `duyệt` khi verify |
