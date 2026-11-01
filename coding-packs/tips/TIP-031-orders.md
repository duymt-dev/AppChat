# TIP-031: Đơn hàng + kho + khung đồng bộ sàn — `sales-orders.prisma`, 2 trục trạng thái, tạo từ báo giá / hợp đồng, xác nhận → trừ kho, hoàn tất → điểm / Đã mua, huỷ → hoàn kho / chờ hoàn tiền, `OrderSyncProvider` + `mock` + queue `order-sync`, nối trang Đơn hàng (mã `DH-`)

## HEADER
- TIP-ID: TIP-031
- Project: AppChat V2
- Module: `packages/db/prisma/tenant/sales-orders.prisma` + migration 031 · `packages/core/src/sales/orders/**`, `sales/jobs/order-sync.jobs.ts` · `apps/api/src/http/sales/orders.controller.ts` · `packages/integrations/src/{ports/order-sync, connectors/mock/order-sync}.ts` · `packages/shared/src/{orders/order-state, api/orders}.ts` · FE `apps/web/src/features/orders/**` · mock `domains/orders*.ts`
- Depends on: TIP-027 (sản phẩm, sổ kho `recordMovement`), TIP-029 (báo giá đã chốt), TIP-030 (hợp đồng đã ký), TIP-012 (kết nối, webhook, `integration_event`), TIP-015 / 016 (khách, identity, giai đoạn) — nhánh xếp chồng từ `tip/030-contracts`
- Priority: P0 · REQ: F07, F07b, F10 · Decision: D31, D42, D52, COMMERCE §4, §4b, §7, §8
- Estimated effort: 18 giờ

## CONTEXT
Khảo sát đầu TIP: `sales-orders.prisma` là stub; 10 action `order.*` trả 501; không có `ORDER_FLOW` dùng chung (mock tự kiểm `INVALID_STATE`, điểm = tổng / 10.000 bỏ hạng). Mã đơn mock / fixture `SP290411` trùng tiền tố mã sản phẩm (D52 chốt `DH-`). Màn Đơn hàng chạy mock đầy đủ (D42 + kanban, form, drawer 5 tab) nhưng thẻ CRM / tệp drawer là dữ liệu mẫu chung, nút chân drawer theo `status` cứng. Chưa có port `order_sync` / adapter `mock`; registry chỉ có thẻ "Sắp có" port `commerce_sync`.

## TASK
1. **Schema + migration 031**: enum `order_status` / `pay_status` (+ `partially_refunded`) / `order_source`; `order` (mã unique, nguồn, kết nối + mã ngoài unique, `locked_lines`, phụ trách, khách FK, `quote_id` unique FK, `contract_id` FK, 2 trục, cọc, tổng, đã thu / đã hoàn, điểm dùng / điểm được, chờ hoàn tiền, vận chuyển jsonb, `stock_ref`, mốc xác nhận / hoàn tất / huỷ, lý do huỷ, custom); `order_item` (như `quote_item` + `variant_id`); `order_event` (nhật ký); CHECK tiền ≥ 0, cọc bật ⇔ > 0, huỷ phải có lý do, đơn sàn ⇔ có mã ngoài; index partial D42 recent / status / pay (đơn chưa huỷ) / owner, khách (INCLUDE status, total), hợp đồng, mã prefix, GIN custom, biểu thức `action_log`.
2. **Shared**: `ORDER_FLOW` (ma trận test), `SHIPPING_EDITABLE`, `payStatusOf`, chip ↔ pay_status, `pointsFor` + `TIER_MULTIPLIER`; shape `orderRowSchema` / `ordersPageSchema` / `ordersMetaSchema`; event `order.created / confirmed / completed / cancelled / imported / external_updated`; timeline `order_*`; i18n server (gợi ý cột AI, panel Trợ lý, nhận định, tên sàn, lý do sàn huỷ).
3. **Core `sales/orders/`**: create / create_from_quote (đã chốt, một báo giá một đơn, `quote.order_id`) / create_from_contract (đã ký, dòng từ báo giá nguồn hoặc một dòng giá trị) + hoàn tác khi còn `new`; update (new tự do, processing chỉ khi chưa thu, đơn sàn chỉ phụ trách / ghi chú / tuỳ biến, + hoàn tác), set_deposit, update_shipping; confirm (trừ kho theo dòng, combo theo thành phần, `sold`; hoàn tác hoàn kho); complete (điểm × hạng ghi trên đơn, khách Đã mua + tổng chi + lần mua cuối; hoàn tác); cancel (lý do, hoàn kho, đã thu → chờ hoàn tiền); `OrdersReadService` (D42 deferred join, chi tiết, meta + theo đơn).
4. **Đồng bộ sàn**: port `order_sync` (`pull`, `handleWebhook`, `mapStatus`) + connector `mock_marketplace` ẩn; `OrderSyncService` (pull từ lần trước − 10 phút, nhập idempotent, đi tiếp trạng thái theo sàn), `order.sync_now`, queue riêng `order-sync` mỗi 5 phút, consumer webhook `integration.event_received` (port order_sync).
5. **API**: `GET /v1/orders` (D42), `/orders/meta?order_id=`, `/orders/:id`.
6. **FE**: mã `DH-` ở fixture / mock / E2E (D52), meta theo đơn đang mở, nút drawer theo `ORDER_FLOW`, nhãn `partially_refunded` / `refunded`; mock cùng schema + `ORDER_FLOW` + `payStatusOf` + `pointsFor`.

## ACCEPTANCE CRITERIA
1. Integration `orders.test.ts` (15 ca): bảng + index + EXPLAIN (recent / pay); create DH-001001 + cọc + hoàn tác; update / set_deposit / shipping + hoàn tác; confirm trừ kho (combo theo thành phần, sold) + hoàn tác hoàn kho; processing sửa dòng chưa thu (trừ lại) / đã thu 409; complete điểm × hạng + Đã mua + tổng chi + event + hoàn tác; cancel lý do / hoàn kho / chờ hoàn tiền; từ báo giá / hợp đồng; đơn sàn qua `mock_marketplace` (sync_now, idempotent, khoá dòng, không điểm, webhook huỷ); D42 + chip + meta; scope sales / cs / kế toán.
2. Unit shared `order-state.test.ts` + integrations `order-sync.test.ts` + mock shape `orders-shape.test.ts`.
3. E2E http `orders.spec.ts`: sản phẩm tồn 10 + khách → đơn cọc (DH-001001, Chờ cọc) → xác nhận → hoàn tất (điểm) → lịch sử; đơn 2 xác nhận rồi huỷ; chip Đã huỷ; tồn còn 8.
4. E2E mock `orders` xanh + parity `orders:*` < 5% + `inbox:*` không hồi quy (fixture đổi mã đơn).

## CONSTRAINTS
- COMMERCE §4 / §4b / §7 / §8 không đổi: trừ kho khi xác nhận, hoàn khi huỷ; sửa tự do ở new, processing chỉ khi chưa thu; huỷ bắt buộc lý do, đã thu → yêu cầu hoàn tiền Owner duyệt; đơn sàn khoá dòng / giá / tổng, không tích điểm mặc định; điểm một lần khi hoàn tất; Đã mua không bao giờ hạ.
- Khoản thu / đề nghị thanh toán / yêu cầu hoàn tiền / liệu trình: TIP-032. Sổ điểm + số dư: TIP-036 (tiêu thụ `order.completed`).
- Adapter sàn thật + đẩy trạng thái / tồn lên sàn: P2.
