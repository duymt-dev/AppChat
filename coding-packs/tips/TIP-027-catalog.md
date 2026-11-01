# TIP-027: Catalog — `catalog.prisma` (6 loại, biến thể, combo, `stock_movement`), action `product.*` / `category.*` / `stock.*`, nối trang Sản phẩm, đồng bộ mô tả sang RAG

## HEADER
- TIP-ID: TIP-027
- Project: AppChat V2
- Module: `packages/db/prisma/tenant/catalog.prisma` + migration 027 · `packages/core/src/catalog/**` · `apps/api/src/http/catalog/**` · `packages/actions/src/catalog.ts` · `packages/shared/src/api/catalog.ts` · FE `apps/web/src/features/products/**` · mock `domains/products.ts` · RAG `packages/core/src/ai/kb/{ingest,catalog-sync}.ts`
- Depends on: TIP-005 (authz), TIP-020 (RAG — `kb_source.origin=catalog`, `product_id`), TIP-015 (trường tuỳ biến D56) — nhánh xếp chồng từ `tip/026-customers`
- Priority: P0 · REQ: F05 · Decision: D24, D42, D56, COMMERCE-DECISIONS §2, rag §2, concurrency §1/§3
- Estimated effort: 14 giờ

## CONTEXT
Khảo sát đầu TIP: `catalog.prisma` mới là stub 3 dòng (chưa có bảng / migration), `CatalogModule` rỗng, chưa có controller; 5 action (`product.create/update/archive`, `category.create`, `stock.adjust`) đã định nghĩa nhưng trả 501 (NotImplemented — chủ 027). Màn Sản phẩm chạy hoàn toàn bằng mock: `GET /products?category=&q=` (D42), `/products/:id`, `/products/meta` (danh mục + màu, nguồn đồng bộ kênh bán, KPI, tab CRM / Tệp / Lịch sử từ fixture). FE và action nhận **tên** danh mục và **tên** thành phần combo (Blueprint dùng `category_id` / `child_id`); form có bộ sinh biến thể nhưng chỉ gửi `attrs`. Card "Nguồn đồng bộ đa kênh" là kênh bán (Shopee / TikTok / Sapo / KiotViet = sắp có — D04), không phải RAG. Không có gì tạo nguồn `kb_source.origin=catalog`.

## TASK
1. **Schema + migration 027** (`catalog.prisma`): `product_category(id, name unique lower, color, sort)`, `product(id, code unique, name, type enum 6, category_id?, price bigint, cost?, unit, tax_rate, stock int?, low_stock_threshold?, duration_min?, sessions?, valid_days?, deposit?, rental_unit?, attrs jsonb, description, status(active|draft|archived), custom jsonb, sold int, version int, created_by, created_at, updated_at, deleted_at)`, `product_variant(product_id, sku, name, attrs jsonb, price?, stock, status)` (P1 — bảng + sinh từ form), `product_component(product_id, child_id, qty)`, `stock_movement(product_id, variant_id?, kind(sale|return|adjust|import), qty, ref_type, ref_id, reason?, actor_id, created_at)` append-only, unique `(ref_type, ref_id, product_id)`. Index: trigram `f_unaccent(lower(name))` partial chưa xoá; `(category_id, status, created_at DESC, id DESC)`, `(status, type)`, `(product_id, created_at DESC)` movement; GIN `custom`. Seed 5 danh mục mặc định theo prototype.
2. **Action handler**: `product.create` (mã `SP-{n}`, danh mục theo tên → tạo nếu chưa có, combo theo tên → `product_component` nối sản phẩm có sẵn (không có → 422), `attrs` → `product_variant` tối đa 24, `stock` ban đầu → movement `import`), `product.update` (`if_version` → STALE_VERSION 409; `stock` không sửa qua update — dùng `stock.adjust`), `product.archive` (status `archived`, undo), `category.create`, `stock.adjust` (SELECT FOR UPDATE, movement `adjust`, cho âm + cảnh báo `low_stock` trong output), read action `product.search` / `product.get` / `stock.get` (agent dùng tư vấn — giá + tồn từ DB, không từ RAG). Undo theo khai báo action.
3. **API đọc** (`/v1/products` D42 page + limit + `category` (tên) / `category_id` / `type` / `status` / `q` không dấu + `cf.*`; `/v1/products/:id`; `/v1/products/meta` (danh mục + màu, KPI thật, nguồn kênh bán = kênh đã kết nối ở Kênh + sắp có); `/v1/categories`; `/v1/products/:id/activity` (lịch sử từ action_log + stock_movement)). Deferred join + EXPLAIN.
4. **RAG**: event `product.changed` (create / update / archive) → consumer `catalog-sync` (ROLE=jobs) upsert `kb_source(origin=catalog, kind=product, product_id)` với nội dung = tên + loại + danh mục + mô tả + thuộc tính (**không có giá / tồn** — rag §2) → đẩy `kb-ingest`; archive → xoá mềm nguồn + đoạn. Nguồn catalog không xoá / sửa tay ở Kho tri thức.
5. **FE**: thay mock bằng http — danh sách / chi tiết / meta; form gửi đủ trường theo loại (thời lượng, giá mỗi buổi → không có cột: bỏ); tab Lịch sử dùng `/activity`; tab CRM / Tệp: phần chưa có dữ liệu (báo giá / đơn TIP-029/031) hiện trạng thái trống thật thay fixture; nút "Đồng bộ" của kênh bán chưa có connector → ẩn hành động, giữ nhãn trạng thái. Nút "Điều chỉnh tồn" (`stock.adjust`) cho sản phẩm vật lý (quyền `stock.adjust`). Mock cập nhật cùng shape.
6. **Shape dùng chung** `packages/shared/src/api/catalog.ts` (`productRowSchema`, `productsPageSchema`, `productsMetaSchema`, `productActivitySchema`) — mock + API parse cùng.

## ACCEPTANCE CRITERIA
1. Integration: migration 027 + index (EXPLAIN list theo danh mục / trạng thái dùng index, tìm dùng trigram); create 6 loại (mã SP-1001…, danh mục mới tự tạo, combo nối thành phần, thuộc tính → biến thể, tồn ban đầu → movement), update + `if_version` lệch → 409, archive + undo, `stock.adjust` (movement, cho âm + cờ cảnh báo, 2 request song song không mất số), quyền (sales chỉ xem, không thấy giá vốn nếu thiếu `catalog.cost_view`; kế toán điều chỉnh tồn được), `/products` D42 + lọc + `cf.*`, `/meta` KPI thật, `/activity`; `product.search` / `stock.get` trả giá + tồn; consumer catalog-sync tạo / cập nhật / xoá nguồn RAG không chứa giá.
2. FE unit / mock shape: mock + API cùng schema; form → input theo loại.
3. E2E http: tạo dịch vụ + sản phẩm vật lý (tồn 10) + combo → danh sách / tìm không dấu / lọc danh mục → sửa giá → điều chỉnh tồn −12 (âm, cảnh báo) → lịch sử có 3 mục → lưu trữ + hoàn tác; Kho tri thức có nguồn catalog của sản phẩm.
4. E2E mock `products` xanh; parity `products:*` không hồi quy.

## CONSTRAINTS
- Giá / tồn / khuyến mãi không bao giờ vào RAG (rag §2). Kênh bán (Shopee / TikTok / Sapo / KiotViet) là connector P1+ — không làm đồng bộ ở TIP này.
- Trừ tồn khi đơn xác nhận / hoàn khi huỷ là TIP-031 (dùng `stock_movement(kind=sale|return, ref_type=order)` — TIP này chỉ dựng bảng + hàm ghi dùng chung).
- Bảng giá theo cấp / kênh, check-out thuê = P2 (COMMERCE §2).
