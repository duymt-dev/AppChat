### COMPLETION REPORT — TIP-032b

**STATUS:** DONE — 4 pha, mỗi pha một PR xếp chồng: P1 #59 (`642f3e6`) · P2 #60 (`c9f4c2a`) · P3 #61 (`0bb99d8`) · P4 #62 (`tip/032b-p4-catalog`, gồm commit chốt). AC 6/6 + phần "Bổ sung review độc lập" (mục dưới). REQ-D05b / BP-3.3b-h giữ MỘT PHẦN: phần gửi hàng loạt nghiệm thu ở TIP-037 theo đúng TIP (không hạ luật 20M / 5%).
**COMMIT:** SHA cuối nhánh `tip/032b-p4-catalog` ghi ở bảng tiến độ `goals/GOAL-RELEASE.md`.

**FILES CHANGED:** đúng manifest `tips/manifests/TIP-032b-files.md` (dòng bổ sung ghi "Amend (P1…P4)"); 02-TASK-GRAPH bản đồ sở hữu `tenant/commerce-settings.prisma`, `platform/commerce-links.prisma`, `tenant/catalog-import.prisma` (032b).
- **P1 — chính sách bán hàng (#59):** ngưỡng duyệt + trần giảm giá agent cấu hình theo workspace (`sales_settings.update`, mặc định 20M / 5% — COMMERCE §3), FORCE_APPROVAL contract · refund · bulk_send ở kernel (DC-329), một báo giá → một HĐ **hoặc** một đơn (`lockConversion`, `QUOTE_ALREADY_CONVERTED` — DC-331). Màn Cài đặt › Chính sách bán hàng.
- **P2 — gửi chứng từ (#60):** ảnh VietQR thật (`qrcode`, DV-025) trong PDF đề nghị + `GET /v1/invoices/:id/qr`; link công khai chứng từ qua `commerce_link` (DC-332); kênh webchat cho đề nghị / báo giá / link ký; `order.send_confirmation` (PDF xác nhận từ HTML server — DC-334) + `receipt.send`; báo giá dạng ảnh = raster từng trang PDF đóng băng (DC-333).
- **P3 — liệu trình (#61):** `product.grant_on_deposit`, ảnh chụp liệu trình trên dòng đơn, mỗi dòng một gói (DC-335); nhắc còn 1 buổi / còn 7 ngày bằng biên nhận (gói, mốc, bản hạn — DC-336); trang chứng từ công khai `/documents/[token]`.
- **P4 — catalog (#62):** nền 202 `job_accepted` (DC-337 — executor, Trợ lý, `useAction`); `product.import` / `import_cancel` / `import_retry` (≤ 500 dòng chạy ngay, > 500 việc nền — DC-339; biên nhận dòng — DC-340); `product_variant.create / update / archive` (DC-338); `category.update / delete / list`; `product.get` trả biến thể đang bán; modal "Nhập từ tệp".

**TEST RESULTS:**
- Acceptance criteria: 6/6
  1. Đổi ngưỡng → báo giá 25M không cần duyệt khi ngưỡng 30M; agent giảm 6% → duyệt, Owner 6% không bị trần; báo giá đã sinh HĐ → `order.create_from_quote` 409 `QUOTE_ALREADY_CONVERTED` và ngược lại; đơn từ HĐ vẫn tạo (`apps/api/test/integration/commerce-gaps.test.ts` 10 ca) — **pass**
  2. PDF đề nghị → decode QR (jsqr trên trang raster) đúng tài khoản / số tiền / nội dung; `GET /invoices/:id/qr` 200 / 403 theo scope; `invoice.send_payment_qr` webchat ghi tin có link; `order.send_confirmation` + `receipt.send` ghi tin + đẩy hàng gửi (fake transport) (`commerce-delivery.test.ts` 7 ca) — **pass**
  3. Cọc đơn có sản phẩm `grant_on_deposit` → gói sinh ngay; nhắc đúng mốc, quét lại không nhân, gia hạn → nhắc theo hạn mới (`commerce-packages.test.ts` 7 ca) — **pass**
  4. Nhập 3 dòng CSV + 1 dòng lỗi → báo dòng lỗi; xoá danh mục còn sản phẩm → 409 (`catalog-operations.test.ts` 7 ca) — **pass**
  5. Unit `quote-math` / `commerce-policy` với ngưỡng tham số (biên 20M, 5% vs 5,01%, BigInt); mock FE cùng shape (`commerce-gaps-shape.test.ts`, `product-import-shape.test.ts`); E2E http Báo giá / Đơn — **pass** (số dưới)
  6. Cổng D59 (dưới) — **pass**
- Bổ sung review độc lập:
  - Đồng thời HĐ + đơn từ một báo giá → một winner + một `QUOTE_ALREADY_CONVERTED`; retry winner cùng khoá không tạo thêm (`commerce-gaps.test.ts`).
  - Cọc / thu đủ / event lặp → không sinh gói hai lần, không nhân thông báo; unique `customer_package_order_item_key`, `package_reminder (package_id, milestone, expiry_version)` (`commerce-packages.test.ts`).
  - Nhập: xem trước kiểm toàn tệp + 5 lỗi đầu trước xác nhận; biên nhận theo dòng; chạy lại không nhập lại dòng đã ghi; 500 dòng → sync, 501 → 202 job_accepted (cùng khoá → cùng handle); XLSX hỏng → 422 `unreadable`; SKU lặp trong tệp → lỗi dòng sau; SKU sản phẩm đã lưu trữ → `sku:archived` không hồi sinh; quyền bị thu hồi trước worker → `failed` (forbidden), 0 dòng ghi (`catalog-import-edges.test.ts` 6 ca, `catalog-operations.test.ts`).
  - Báo giá nhiều trang dạng ảnh: đủ trang, khớp PDF đóng băng; token công khai không đọc chứng từ khác / bản mới, hết hạn → 410 (`commerce-delivery.test.ts`).
  - Biến thể có dòng đơn → `product.update` bỏ thuộc tính chỉ lưu trữ (đơn cũ còn trỏ), chưa dùng → xoá; biến thể lưu trữ không nhận sửa; `if_version` cũ → 409; danh mục còn sản phẩm (mọi trạng thái) → 409 (`catalog-import-edges.test.ts`, matrix `product_variant.*`, `category.delete`).
- **Cổng commit (mỗi pha):** lint + typecheck + unit + depcheck của package đổi + lint:size / tokens / masks + i18n — xanh ở P1 / P2 / P3 / P4 (số liệu từng PR).
- **Chốt TIP (D59, phạm vi TIP):**
  - `turbo lint typecheck test` (core, actions, shared, db, ai, api, web): core 50 file / 328 · web 85 file / 269 · shared 24 file · ai 12 file · db 2 · actions 1 · api 1 — xanh. `turbo build` api + worker xanh.
  - Integration (Postgres 16 + Memurai), P4: 23 file / 128 passed (`catalog-operations`, `catalog`, `orders`, `payments`, `commerce-packages`, `actions`, `assistant-vertical` + matrix `product.*` / `product_variant.*` / `category.*` / `stock.*`) + `catalog-import-edges` 6 + `category.list` / `product.get` matrix. P1–P3: 35 file / 223 · 26 file / 191 · 41 file / 198 (thân PR).
  - E2E mock: `commerce-gaps` + `products` 14 passed (12 skip mobile); quotes / orders / invoices / contracts / customers / tickets / genui / settings / assistant (dùng `shared/actions`) 56 passed.
  - E2E http (API 4517 / web 3518, Redis DB 15): `commerce-gaps` 1 passed (liệu trình khi cọc lưu thật + nhập CSV tạo 2 / cập nhật 1 theo SKU / 1 dòng lỗi) · `products` 1 · `quotes` 1 · `orders` 1 · `invoices` 1 — **5 passed** (mobile skip theo spec). Lượt đầu bắt 2 lỗi thật, đã sửa: bản build api / worker thiếu `qrcode` (xem Issues); modal ánh xạ sẵn cột tuỳ chọn không có trong tệp → 422 `mapping.type`, và ô Loại trống khi cập nhật theo SKU bị coi là `physical` → `type:immutable` với liệu trình (sửa: modal gợi ý theo tiêu đề CSV, ô Loại trống giữ loại hiện có — `catalog-import-edges.test.ts` thêm ca)
  - Parity: `products:list` 3.79% · `products:detail` 3.20% · `products:create` 2.29%; `pnpm parity --done` 108 PASS, 1 FAIL `inbox:connect-channel` 6.20% đỏ sẵn từ P0 ver2.1 (Q-020 / DC-295 → TIP-014c), không đổi
  - `pnpm depcheck` 44 = baseline · `lint:size` 2367 file không vượt trần · `lint:tokens` 744 file đúng thang D41 · `lint:masks` 42 mask / 10 PD · `i18n:check` 100% (5167 key).
- EXPLAIN / index: `product_import_actor_idx (actor_id, status, created_at DESC, id)`, partial `product_import_pending_idx`; `product_import_row` PK `(import_id, row_no)` + partial `product_import_row_failed_idx` cho `/errors`; trang dòng deferred join theo PK (`catalog/import/status.ts`); `product_variant_sku_active_key` unique `lower(sku)` WHERE status <> 'archived'; `customer_package_remaining_idx` (biểu thức) cho quét nhắc.
- **Chưa nghiệm thu với provider thật:** gửi Zalo / webchat thật (Q-003 — test dùng fake transport); ngân hàng thật (REQ-F08f, ngoài phạm vi TIP); LibreOffice raster ảnh báo giá trên Linux production (Q-006).

**ISSUES DISCOVERED:**
- Bản build api / worker thiếu khai `qrcode` (tsup để external) → API không khởi động ở E2E http; sửa ở cổng chốt: khai `qrcode` ở `apps/api` + `apps/worker` (DV-025 cập nhật). Unit / integration không bắt được vì chạy từ source.
- Workspace tạo trước các migration mới (demo, ai-live) cần áp tay tenant migration `20261102003210…3240` (commerce settings, links, packages, catalog operations) — cùng vấn đề CLI `tenant-migrate` ở báo cáo 030b; worker cảnh báo `contract_appendix` ở DB test cũ là cùng nguồn.
- E2E http bắt hai lỗi luồng nhập mà integration không có: modal điền sẵn ánh xạ cột tuỳ chọn → server 422 khi tệp không có cột; ô Loại trống bị coi là `physical` nên cập nhật liệu trình theo SKU báo `type:immutable`. Đã sửa + thêm ca integration.
- Kiểm phủ Trợ lý (R1.3) bắt ô `category_id` / `variant_id` / `import_id` chưa có đường tra → thêm `category.list`, biến thể trong `product.get`, miễn trừ `import_id` (handle trả cùng lượt).

**GIẢ ĐỊNH ĐÃ CHỌN:** DC-328 … DC-340 (`DECISIONS.md`). **Lệch spec:** DV-025 (`qrcode`; `jsqr` + `pngjs` devDeps). **Lệch prototype:** không — màn Chính sách bán hàng, trang chứng từ công khai, modal nhập từ tệp không có trong prototype; dựng bằng khung / token sẵn có (gap-filling §2). Nút "Nhập từ tệp" thêm ở đầu màn Sản phẩm, `products:list` vẫn 3.79%.
- Contract FE ↔ BE: zod dùng chung `packages/shared/src/api/{commerce-settings,product-import,catalog}.ts`; mock kiểm bằng `commerce-gaps-shape.test.ts`, `product-import-shape.test.ts`.

**ĐỐI CHIẾU STANDARDS** (mục APPLICABLE STANDARDS của TIP):

| Standard | Tuân thủ (file:dòng / test) | Lệch |
|---|---|---|
| `plans/COMMERCE-DECISIONS.md` §2–6, Q2, Q5 | Mặc định 20M / 5% giữ nguyên, chỉ thêm cấu hình (`packages/core/src/sales/settings/policy.ts`); ký HĐ Owner trước không đổi; đề nghị thanh toán ≠ hoá đơn GTGT (dòng cố định trong PDF xác nhận — DC-334); liệu trình khi cọc chỉ khi sản phẩm cho phép (§6, DC-335); không tự thu hồi buổi đã dùng | — |
| `actions/action-registry.md` | Mọi ghi là action (`packages/actions/src/{commerce-delivery,catalog-operations}.ts`); bulk luôn xem trước (`product.import`); 202 `job_accepted` một hợp đồng chung (`packages/core/src/kernel/actions/job-accepted.ts`, `executor.ts`); mỗi action có matrix riêng (STD-actions-registry-12) | — |
| `authz/rbac-permissions.md` | Không thêm quyền: `catalog.manage` / `catalog.view`, `sales_settings` Owner-only; lần nhập chỉ người gọi / Owner thấy (404 người khác — `catalog/import/status.ts`); worker kiểm lại quyền trước khi ghi | — |
| `api/response-envelope.md` | `{ data }` / page + limit cho `/product-imports/:id/rows`; 202 `{status:'job_accepted', job_id, action_log_id, status_url}`; lỗi theo trường (`mapping.price: column_not_found`, `category_id: has_products`); link hỏng 410 `SIGN_LINK_INVALID` | — |
| `database/tenant-db.md` · `indexing.md` | Bảng mới không `workspace_id`; `=` trước, sort sau; partial / expression index; deferred join trang dòng (migration `20261102003240_catalog_operations`, `…3230_commerce_packages`) | — |
| `domain/concurrency.md` · `state-machine.md` · `money-time-numbering.md` · `validation-defaults.md` | `lockConversion` khoá dòng báo giá; CAS queued → running / cancelling; biến thể `if_version`; tiền string VND, giá nhập bỏ dấu chấm / "đ"; hạn liệu trình theo múi giờ workspace; tối đa 10.000 dòng / 120 ký tự tên | — |
| `events/outbox.md` | `product.import_requested`, `package.reminder_due`, `product.changed` mỗi sản phẩm qua outbox cùng transaction; consumer idempotent (biên nhận) | — |
| `documents/templates.md` | Báo giá ảnh = raster PDF đóng băng (DC-333); xác nhận đơn không thêm loại mẫu (DC-334) | — |
| `integrations/provider-ports.md` · `channels/omnichannel-adapter.md` | Gửi qua `ChannelSendQueue` + năng lực manifest (`send.image`), kênh không hỗ trợ ảnh → 422 `channel_no_image` | — |
| `ops/observability-security.md` | Token công khai HMAC + chỉ lưu băm (DC-332); tệp nhập qua `checkFile` (mục đích / mime) + hash; công thức trong ô giữ là chữ (không tính) | DV-025 |
| `ui/frontend-structure.md` · `prototype-parity.md` · `interaction-patterns.md` · `i18n/i18n.md` | Màn orchestrator; modal / hook tách (`features/products/{components/ProductImportModal,hooks/useProductImport}.tsx`); mọi ghi `useAction`; parity products:* < 5%; i18n vi / en 100% | — |
| `code/testing.md` · `file-size-module-layout.md` | Test ở file riêng; `lint:size` không vượt trần (import tách 6 file, mock tách `product-import.ts`) | — |
| `workflow/git-flow-ci.md` | Một PR mỗi pha, xếp chồng #59 → #60 → #61 → #62, PR vào `dev` | — |

**SUGGESTIONS FOR CHỦ THẦU:**
- CLI `tenant-migrate` (áp migration cho mọi workspace active) — 032b thêm 4 migration tenant cần áp tay cho demo.
- Cổng commit nên chạy `turbo build` api / worker khi `package.json` của package lõi thêm phụ thuộc runtime (lỗi `qrcode` chỉ lộ ở bản build).
