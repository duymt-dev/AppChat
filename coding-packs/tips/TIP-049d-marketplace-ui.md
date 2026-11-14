# TIP-049d — Giao diện sàn: kết nối Shopee / TikTok Shop + chọn shop, đơn sàn chỉ đọc, Ghép SKU, Kênh bán theo ánh xạ (Sàn, D63)

## HEADER
- **Parallel-safe with TIP-027b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/products.json`, `apps/web/messages/vi/products.json`, `apps/web/src/features/products/api.ts`, `apps/web/src/features/products/components/ProductDrawer.tsx`, `apps/web/src/shared/api/mock/domains/products.ts`, `packages/core/src/catalog/services/catalog-read.service.ts`, `packages/core/src/catalog/services/product-view.ts`, `packages/shared/src/api/catalog.ts`, `tools/parity/parity.manifest.ts`; integrate 027b before049d.
- **Parallel-safe with TIP-046 (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 049d before046.
- **Parallel-safe with TIP-048 (coverage-closure manifest):** sequential, shares `apps/web/src/shared/api/mock/handlers.ts`; integrate 048 before049d.
- **Parallel-safe with TIP-048c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/shared/api/mock/domains/settings-apps.ts`, `apps/web/src/shared/api/mock/handlers.ts`, `tools/parity/parity.manifest.ts`; integrate 048c before049d.
- **Parallel-safe with TIP-001c (coverage-closure manifest):** sequential, shares `apps/web/src/features/products/screens/ProductsScreen.tsx`; integrate 001c before049d.
- **Parallel-safe with TIP-004b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/shared/api/mock/domains/settings-apps.ts`, `tools/parity/parity.manifest.ts`; integrate 004b before049d.
- **Parallel-safe with TIP-006d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 006d before049d.
- **Parallel-safe with TIP-012b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/components/ConnectIntegrationModal.tsx`, `apps/web/src/features/settings/components/IntegrationDetailDrawer.tsx`, `apps/web/src/features/settings/components/IntegrationsSection.tsx`, `apps/web/src/features/settings/integration-types.ts`, `tools/parity/parity.manifest.ts`; integrate 012b before049d.
- **Parallel-safe with TIP-012c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/components/ConnectIntegrationModal.tsx`, `apps/web/src/features/settings/components/IntegrationsSection.tsx`, `apps/web/src/shared/api/mock/domains/settings-apps.ts`, `tools/parity/parity.manifest.ts`; integrate 012c before049d.
- **Parallel-safe with TIP-013b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/shared/api/mock/domains/settings-apps.ts`, `tools/parity/parity.manifest.ts`; integrate 013b before049d.
- **Parallel-safe with TIP-013c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 013c before049d.
- **Parallel-safe with TIP-014b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `tools/parity/parity.manifest.ts`; integrate 014b before049d.
- **Parallel-safe with TIP-014c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `tools/parity/parity.manifest.ts`; integrate 014c before049d.
- **Parallel-safe with TIP-015b (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 015b before049d.
- **Parallel-safe with TIP-015c (coverage-closure manifest):** sequential, shares `apps/web/src/shared/api/mock/handlers.ts`, `tools/parity/parity.manifest.ts`; integrate 015c before049d.
- **Parallel-safe with TIP-015d (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 015d before049d.
- **Parallel-safe with TIP-015e (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 015e before049d.
- **Parallel-safe with TIP-015f (coverage-closure manifest):** sequential, shares `apps/web/messages/en/orders.json`, `apps/web/messages/vi/orders.json`, `apps/web/src/features/orders/components/OrdersToolbar.tsx`, `apps/web/src/shared/api/mock/domains/orders-actions.ts`, `tools/parity/parity.manifest.ts`; integrate 015f before049d.
- **Parallel-safe with TIP-017b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 017b before049d.
- **Parallel-safe with TIP-018b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 018b before049d.
- **Parallel-safe with TIP-019b (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 019b before049d.
- **Parallel-safe with TIP-019c (coverage-closure manifest):** sequential, shares `apps/web/src/shared/api/mock/handlers.ts`, `tools/parity/parity.manifest.ts`; integrate 019c before049d.
- **Parallel-safe with TIP-020b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 020b before049d.
- **Parallel-safe with TIP-020d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `tools/parity/parity.manifest.ts`; integrate 020d before049d.
- **Parallel-safe with TIP-020e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 020e before049d.
- **Parallel-safe with TIP-022b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/shared/api/mock/domains/settings-apps.ts`, `tools/parity/parity.manifest.ts`; integrate 022b before049d.
- **Parallel-safe with TIP-023b (coverage-closure manifest):** sequential, shares `packages/core/src/catalog/services/catalog-read.service.ts`, `tools/parity/parity.manifest.ts`; integrate 023b before049d.
- **Parallel-safe with TIP-023c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/orders.json`, `apps/web/messages/vi/orders.json`, `apps/web/src/shared/api/mock/domains/settings-apps.ts`, `apps/web/src/shared/api/mock/handlers.ts`, `tools/parity/parity.manifest.ts`; integrate 023c before049d.
- **Parallel-safe with TIP-023d (coverage-closure manifest):** sequential, shares `apps/web/src/shared/api/mock/handlers.ts`, `tools/parity/parity.manifest.ts`; integrate 023d before049d.
- **Parallel-safe with TIP-023f (coverage-closure manifest):** sequential, shares `apps/web/src/shared/api/mock/handlers.ts`, `tools/parity/parity.manifest.ts`; integrate 023f before049d.
- **Parallel-safe with TIP-023g (coverage-closure manifest):** sequential, shares `apps/web/messages/en/orders.json`, `apps/web/messages/en/products.json`, `apps/web/messages/vi/orders.json`, `apps/web/messages/vi/products.json`, `apps/web/src/features/orders/columns.tsx`, `apps/web/src/features/products/components/ProductDrawer.tsx`, `tools/parity/parity.manifest.ts`; integrate 023g before049d.
- **Parallel-safe with TIP-025b (coverage-closure manifest):** sequential, shares `apps/web/src/shared/api/mock/domains/orders.ts`, `tools/parity/parity.manifest.ts`; integrate 025b before049d.
- **Parallel-safe with TIP-026b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `tools/parity/parity.manifest.ts`; integrate 026b before049d.
- **Parallel-safe with TIP-026c (coverage-closure manifest):** sequential, shares `apps/web/src/shared/api/mock/domains/orders-actions.ts`, `tools/parity/parity.manifest.ts`; integrate 026c before049d.
- **Parallel-safe with TIP-030b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `tools/parity/parity.manifest.ts`; integrate 030b before049d.
- **Parallel-safe with TIP-031b (coverage-closure manifest):** sequential, shares `apps/web/src/features/orders/components/OrdersToolbar.tsx`; integrate 031b before049d.
- **Parallel-safe with TIP-031c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/components/ConnectIntegrationModal.tsx`; integrate 031c before049d.
- **Parallel-safe with TIP-032b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/products.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/products.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/products/api.ts`, `apps/web/src/features/products/screens/ProductsScreen.tsx`, `apps/web/src/shared/api/mock/domains/products.ts`, `packages/core/src/catalog/services/catalog-read.service.ts`, `packages/core/src/catalog/services/product-view.ts`, `packages/shared/src/api/catalog.ts`, `tools/parity/parity.manifest.ts`; integrate 032b before049d.
- **Parallel-safe with TIP-032c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/orders.json`, `apps/web/messages/vi/orders.json`, `apps/web/src/features/orders/columns.tsx`, `apps/web/src/features/orders/components/DetailTabs.tsx`, `apps/web/src/features/orders/components/OrdersToolbar.tsx`, `apps/web/src/features/orders/components/ShippingCard.tsx`, `apps/web/src/shared/api/mock/domains/orders-actions.ts`, `apps/web/src/shared/api/mock/domains/orders.ts`, `tools/parity/parity.manifest.ts`; integrate 032c before049d.
- **Parallel-safe with TIP-032d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/orders.json`, `apps/web/messages/vi/orders.json`, `apps/web/src/features/orders/components/DetailTabs.tsx`, `apps/web/src/shared/api/mock/domains/orders.ts`, `tools/parity/parity.manifest.ts`; integrate 032d before049d.
- **Parallel-safe with TIP-032e (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 032e before049d.
- **Parallel-safe with TIP-033b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `tools/parity/parity.manifest.ts`; integrate 033b before049d.
- **Parallel-safe with TIP-033c (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 033c before049d.
- **Parallel-safe with TIP-033d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/orders.json`, `apps/web/messages/vi/orders.json`, `apps/web/src/shared/api/mock/domains/orders-actions.ts`; integrate 033d before049d.
- **Parallel-safe with TIP-034b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/shared/api/mock/handlers.ts`, `tools/parity/parity.manifest.ts`; integrate 034b before049d.
- **Parallel-safe with TIP-034c (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 034c before049d.
- **Parallel-safe with TIP-034d (coverage-closure manifest):** sequential, shares `apps/web/src/shared/api/mock/handlers.ts`, `tools/parity/parity.manifest.ts`; integrate 034d before049d.
- **Parallel-safe with TIP-037 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `tools/parity/parity.manifest.ts`; integrate 037 before049d.
- **Parallel-safe with TIP-038 (coverage-closure manifest):** sequential, shares `apps/web/src/features/orders/components/OrdersToolbar.tsx`, `apps/web/src/shared/api/mock/domains/orders.ts`, `tools/parity/parity.manifest.ts`; integrate 038 before049d.
- **Parallel-safe with TIP-038b (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 038b before049d.
- **Parallel-safe with TIP-039 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `tools/parity/parity.manifest.ts`; integrate 039 before049d.
- **Parallel-safe with TIP-040 (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 040 before049d.
- **Parallel-safe with TIP-041 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 041 before049d.
- **Parallel-safe with TIP-042 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `tools/parity/parity.manifest.ts`; integrate 042 before049d.
- **Parallel-safe with TIP-042b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/shared/api/mock/domains/settings-apps.ts`, `tools/parity/parity.manifest.ts`; integrate 042b before049d.
- **Parallel-safe with TIP-043 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `tools/parity/parity.manifest.ts`; integrate 043 before049d.
- **Parallel-safe with TIP-045b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/orders/columns.tsx`, `apps/web/src/features/orders/components/DetailTabs.tsx`, `apps/web/src/features/products/columns.tsx`, `apps/web/src/features/products/components/ProductDrawer.tsx`, `packages/core/src/catalog/services/catalog-read.service.ts`, `packages/core/src/catalog/services/product-view.ts`, `packages/shared/src/api/catalog.ts`, `tools/parity/parity.manifest.ts`; integrate 045b before049d.
- **Parallel-safe with TIP-047b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 047b before049d.
- **Parallel-safe with TIP-047d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/shared/api/mock/handlers.ts`, `tools/parity/parity.manifest.ts`; integrate 047d before049d.
- **Parallel-safe with TIP-048d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 048d before049d.
- **Parallel-safe with TIP-048e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 048e before049d.
- **Parallel-safe with TIP-048f (coverage-closure manifest):** sequential, shares `apps/web/src/shared/api/mock/handlers.ts`, `tools/parity/parity.manifest.ts`; integrate 048f before049d.
- **Parallel-safe with TIP-048g (coverage-closure manifest):** sequential, shares `apps/web/src/shared/api/mock/handlers.ts`, `tools/parity/parity.manifest.ts`; integrate 048g before049d.
- **Parallel-safe with TIP-048h (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 048h before049d.
- **TIP-ID:** TIP-049d · **Project:** AppChat V2 · **Module:** Sàn — giao diện (Cài đặt → Nền tảng kết nối, Đơn hàng, Sản phẩm) · **Priority:** P0 · **Estimated:** L
- **Depends on:** 049, 049b, 049c, 048c và mọi TIP chờ cũ có chung file (dòng khai hai phía ở trên) — trước 044, 045, 046.
- **Vì sao phụ thuộc:**
  - 049: action `integration.oauth_select`, `marketplace.*`, DTO `api/marketplace.ts`, `api/integrations.ts` (`auth_kind`, `capabilities`, `expired`, `grant_expires_at`, `last_run`), `api/orders.ts` (`external_ref.connector` / `shop_name`, `shipping.source`), `order.sync_now` trả `queued`.
  - 049b / 049c: manifest thật `shopee` / `tiktok_shop` (thẻ, nhãn trạng thái sàn); e2e `http` chạy với `SHOPEE_TRANSPORT=fake` / `TTS_TRANSPORT=fake`.
  - 048c: `OAuthConnectStep` + mẫu bước OAuth trong modal + `useOAuthConnect` (048) đã dùng ở kênh; 049d dùng lại hook, không viết lại; cùng sửa `apps/web/messages/{vi,en}/settings.json`, `tools/parity/parity.manifest.ts`.
- **Files touched:** [exact M/C manifest](manifests/TIP-049d-files.md). Thêm component mới thay vì nhồi file gần trần (`settings/types.ts` 384 dòng — không sửa). Sửa có chủ đích ba file backend đọc catalog (027b): `product-view.ts`, `catalog-read.service.ts`, `shared/catalog/labels.ts`.
- **Quyết định nguồn:** D63 · DC-920 · DC-917 · DC-911 · PD-907 · PD-908 · COMMERCE §4b · D42 / D43 · `standards/ui/prototype-parity.md` §6b.
- **Dòng COVERAGE nhận:** REQ-F07c (UI) · D63-ui · PD-907 · PD-908 · DC-920.

## CONTEXT
- **Working dir:** `D:/CODING/AppChat_Ver2`. Web chỉ import `@appchat/{actions,shared,ui}`; ghi chỉ bằng `useAction(id).run(input)`.
- **Hiện trạng (rà 2026-11-13; số dòng `~` kiểm lại ở Rà):**
  - **Nền tảng kết nối:**
    - `IntegrationsSection.tsx` (124): thẻ ~L24–78.
    - `ConnectIntegrationModal.tsx` (82): form `c.fields` ~L50–63, `SECRET` cứng ~L13 — chỉ API key.
    - `IntegrationDetailDrawer.tsx` (71).
    - `settings/types.ts` (384 — gần trần FE 400): `Connector` ~L59–71 → kiểu mới đặt ở `settings/integration-types.ts`.
    - Prototype Nền tảng kết nối ~L7062–7112, catalog ~L12034–12052: nhóm TMĐT = KiotViet / Sapo / Haravan / WooCommerce; **không** có Shopee / TikTok Shop / hãng vận chuyển; modal chỉ API key → PD-907.
  - **Đơn hàng:**
    - `orders/columns.tsx` (263): `SourceBadge` ~L37–46.
    - `DetailTabs.tsx` (258): banner khoá ~L44–53 hiện `platform_status` thô.
    - `ShippingCard.tsx` (63): nhập tay, **sửa được cả đơn sàn** ~L32, không có link tra vận đơn.
    - i18n `orders.json` `platform.tiktok` (~L46–50) lệch key backend `tiktok_shop`.
    - `OrdersToolbar.tsx` ~L34 gọi `order.sync_now` và đọc `imported / blocked / failed`.
    - Prototype Đơn ~L6313–6446: không cột nguồn / sàn / mã ngoài / vận đơn; form giao hàng không có hãng / mã vận đơn / COD → PD-908.
  - **Sản phẩm:**
    - `products/columns.tsx` (203): cột kênh ~L131–143. `SyncSources.tsx` (76). `ProductsScreen.tsx` (146) ~L103.
    - Backend: `catalog-read.service.ts` `meta()` ~L89–121 đọc `SALES_SOURCES` (`shared/catalog/labels.ts` ~L35–42), sàn luôn `soon` ~L103. "Kênh bán" = `connectedChannelTypes` (`product-view.ts` ~L108–111) — giống nhau mọi sản phẩm.
    - Prototype Sản phẩm ~L6448–6577: nút "Đồng bộ kênh" ~L6455, thanh "Nguồn đồng bộ đa kênh" ~L6463 (Shopee / TikTok Shop / KiotViet ~L11095), cột Kênh ~L6470 / ~L6481, drawer "Kênh bán · N kênh" ~L6524 + "Đồng bộ đa kênh" ~L6526–6530.
  - Không file nào vượt trần (`lint-size.mjs`: FE 400, page 120, `*Screen` 250).
- **Key files to read first:** DC-920, PD-907, PD-908, COMMERCE §4b · TIP-049 §3, §7, §9 · TIP-048c (`OAuthConnectStep`) · `apps/web/src/shared/oauth/useOAuthConnect.ts` · `standards/ui/{frontend-structure,prototype-parity,interaction-patterns}.md` · các file nêu trên.
- **Patterns to follow:** bước OAuth của 048c (`OAuthConnectStep.tsx` + `useOAuthConnect`), `DataTable` + `ListPager` (D42), `EntityDrawer`, mock domain theo `shared/api/mock/domains/*.ts` + shape test.

## APPLICABLE STANDARDS
- [ui/frontend-structure](../standards/ui/frontend-structure.md) — màn là orchestrator, component / hook / types tách; FE 150–250 dòng, trần 400.
- [ui/prototype-parity](../standards/ui/prototype-parity.md) — < 5% màn có sẵn; §6b mức 2 (prototype không vẽ) cho PD-907 / PD-908; mask phải có mã.
- [ui/interaction-patterns](../standards/ui/interaction-patterns.md) — empty / error / loading / no-permission, drawer, xác nhận.
- [i18n/i18n](../standards/i18n/i18n.md) — mọi chuỗi vi + en.
- [actions/action-registry](../standards/actions/action-registry.md) — ghi qua `useAction`.
- [authz/rbac-permissions](../standards/authz/rbac-permissions.md) — `integrations.manage`, `catalog.manage`, `order.manage`; ẩn / khoá theo `useCan`.
- [database/indexing](../standards/database/indexing.md) — "Kênh bán" đọc theo lô, không N+1.
- [plans/COMMERCE-DECISIONS](../plans/COMMERCE-DECISIONS.md) §4b — đơn sàn khoá dòng / giá; thanh toán qua sàn.
- [code/testing](../standards/code/testing.md) · [workflow/git-flow-ci](../standards/workflow/git-flow-ci.md).

## Rà trước khi làm
1. Rebase `origin/dev` sau khi 049c và 048c đã merge. `python -X utf8 tools/obligations/manifests.py 049d`. Kiểm lại số dòng `~` trên dev; lệch → sửa TIP dòng "Rà lại <ngày>".
2. Đọc lại bản mới nhất: `OAuthConnectStep.tsx` / `useOAuthConnect.ts` (048 / 048c), DTO 049 (`api/marketplace.ts`, `api/integrations.ts`, `api/orders.ts`), `docs/06-prototype/DEVIATIONS.md` (PD-907 / PD-908 đã ghi bởi PR 2).
3. Chạy `pnpm parity` các màn chạm (Nền tảng kết nối, Đơn hàng, Sản phẩm, drawer đơn / sản phẩm) **trước khi sửa**, lưu số làm mốc.
4. Kiểm `product.stock` + tồn biến thể hiển thị ở drawer sản phẩm sau 049 (Q-916), để cột tồn không lệch.
5. Kiểm `ConnectIntegrationModal.tsx` sau 031c (chọn bên giữ tồn): giữ ô đó cho connector API key; với sàn OAuth đặt ở bước chọn shop.

## TASK
Giao diện cho sàn, đọc API 049; không đổi backend nghiệp vụ (trừ ba file đọc catalog §4).
- Thẻ Shopee / TikTok Shop ở nhóm TMĐT; luồng OAuth + chọn shop; danh sách shop, hạn uỷ quyền, Uỷ quyền lại, Đồng bộ ngay.
- Đơn sàn: badge sàn + shop, mã ngoài, trạng thái sàn có nhãn, vận đơn chỉ đọc khi sàn đã cung cấp, banner khoá, thanh toán "qua sàn".
- Sản phẩm: Ghép SKU (drawer), "Kênh bán" theo ánh xạ thật, nguồn đồng bộ thật.

## SPECIFICATIONS

### 1. Nền tảng kết nối (PD-907)
1. **Thẻ:** `IntegrationsSection.tsx` đọc connector từ API (049 `read.service`) — Shopee / TikTok Shop ở nhóm TMĐT cạnh KiotViet / Sapo / Haravan / WooCommerce (vẫn "Sắp có"); thiếu env (`requiresEnv`) → "Sắp có" + "Đăng ký quan tâm" như thẻ khác. Logo từ `packages/ui` icon `shopee` / `tiktok` (048c đã thêm brand; thiếu → chữ viết tắt trong vòng tròn token, không thêm thư viện).
2. **Kết nối (`ConnectIntegrationModal.tsx` M):** rẽ theo `auth_kind`: `api_key` giữ form cũ; `oauth2` → `MarketplaceConnectStep.tsx` (C). Bỏ `SECRET` cứng ~L13: đọc kiểu trường từ schema form (`integration.form_schema`).
3. **`MarketplaceConnectStep.tsx` (C):** bước 1 "Đăng nhập với Shopee / TikTok Shop" (danh sách quyền đọc đơn / sản phẩm, câu "AppChat chỉ đọc, không đăng / sửa sản phẩm trên sàn") → `useOAuthConnect({ provider, purpose: 'connector', returnTo })` → bước 2 chọn shop (checkbox, tên + mã shop; shop đã nối ở workspace này ghi "Nối lại"); tuỳ chọn `initial_days` (7 / 30 / 90, mặc định 30) và bên giữ tồn (`appchat` mặc định; `external` khoá khi connector không có `pullStock` — 031c) → `integration.oauth_select` (`Idempotency-Key`) → bước 3 kết quả từng shop (thành công / `shop_in_use_elsewhere` / `shop_region_unsupported` với chữ dễ hiểu). Lỗi `oauth_error` → thông báo + nút Thử lại. Popup bị chặn → hook tự chuyển trang (048).
4. **`MarketplaceShops.tsx` (C)** (trong `IntegrationDetailDrawer.tsx` M khi connector là sàn): mỗi shop một dòng — tên, trạng thái (`connected` / `expired` / `error`), lần đồng bộ cuối + số đơn nhập / chặn / lỗi (`last_run`), hạn uỷ quyền thật (`grant_expires_at`; còn ≤ 7 ngày tô cảnh báo), nút **Uỷ quyền lại** (`oauth.start` + `ref`), **Đồng bộ ngay** (`integration.sync_now` → toast "Đã xếp đồng bộ"), **Ngắt** (xác nhận). Thêm shop → mở lại bước OAuth. Không có quyền `integrations.manage` → chỉ xem.
5. Kiểu mới đặt ở `apps/web/src/features/settings/integration-types.ts` (M — file 2 dòng), **không** sửa `settings/types.ts`.

### 2. Đơn hàng (PD-908)
1. **Cột Nguồn (`orders/columns.tsx` M, `SourceBadge` ~L37–46):** đơn `marketplace` → `MarketplaceBadge.tsx` (C): logo sàn + tên shop (tooltip mã ngoài). Sửa key `platform.tiktok` → `platform.tiktok_shop` (giữ key cũ một bản làm bí danh nếu chỗ khác còn dùng — kiểm ở Rà).
2. **Chi tiết đơn (`DetailTabs.tsx` M, banner ~L44–53):** banner "Đơn từ <Sàn> · <shop> · mã <external_id>": trạng thái sàn có nhãn (i18n `orders.platformStatus.<connector>.<STATUS>`, thiếu nhãn → chuỗi gốc), câu "Dòng hàng / giá do sàn quản lý" (COMMERCE §4b), thanh toán "Thanh toán qua sàn" (không nút tạo Đề nghị thanh toán / VietQR cho đơn sàn — đã chặn ở backend 032b, UI ẩn nút).
3. **Vận đơn (`ShippingCard.tsx` M ~L32):** đơn sàn — trường có `shipping.source.<field> = 'platform'` chỉ đọc (khoá + chú thích "Theo <Sàn>"); trường sàn chưa có vẫn nhập tay được (lỗi 1 của 049 đã giữ dữ liệu nhập tay). Đơn thường giữ nguyên.
4. **Đồng bộ (`OrdersToolbar.tsx` M ~L34):** nút hiện theo `useCan` đúng quyền của `order.sync_now` (hiện `integrations.manage`; đổi theo Q-917 nếu Chủ nhà chốt); đọc `queued` → toast "Đã xếp đồng bộ N kết nối"; `queued = 0` → "Chưa có kết nối sàn". Không còn đọc `imported` ngay (049 §5). Mock `orders-actions.ts` trả `queued`.
5. Bảng Đơn giữ D42 (cuộn trong khung, header dính, `Pager`) — D43.

### 3. Sản phẩm (PD-908)
1. **Ghép SKU — `SkuMappingDrawer.tsx` (C) + `useSkuMapping.ts` (C):** mở từ `SyncSources.tsx` (M) và từ drawer sản phẩm.
   - Chọn shop → bảng listing (`GET /v1/integrations/:id/listings`, D42 `Pager`, lọc `unmatched · suggested · mapped`, tìm theo tên / SKU).
   - Mỗi dòng: ảnh, tên + biến thể sàn, `seller_sku`, giá sàn (chỉ hiển thị), tồn sàn, gợi ý ghép (lý do SKU / mã) → nút **Ghép** (`marketplace.map_sku`, chọn biến thể nếu sản phẩm có biến thể) / **Bỏ ghép** (`marketplace.unmap_sku`) / **Chọn sản phẩm khác** (ô tìm sản phẩm có sẵn).
   - Nút **Đọc sản phẩm từ sàn** (`marketplace.import_products`) → toast "Đang đọc…", tự làm mới khi xong (invalidate theo action).
   - Chú thích cố định: "Ghép chỉ áp cho đơn nhập sau. AppChat không tạo / sửa sản phẩm trên sàn."
   - Lỗi `sku_already_mapped` / `listing_variant_required` hiện tại dòng. Không quyền `catalog.manage` → chỉ xem.
2. **Kênh bán theo ánh xạ (backend đọc, M):**
   - `product-view.ts` (~L108–111): thay `connectedChannelTypes` giống nhau mọi sản phẩm bằng danh sách sàn / shop có `integration_mapping` của sản phẩm hoặc biến thể (truy vấn theo lô `IN (...)` cho cả trang, dùng index `integration_mapping (entity, local_id)` của 049).
   - `catalog-read.service.ts` `meta()` (~L89–121): nguồn sàn `active` khi có kết nối `connected` (không còn luôn `soon` ~L103); KiotViet / Sapo / … vẫn `soon`.
   - `shared/catalog/labels.ts` (~L35–42): `SALES_SOURCES` thêm `shopee`, `tiktok_shop` với nhãn / màu token.
3. **Cột Kênh (`products/columns.tsx` M ~L131–143) + `ProductsScreen.tsx` (M ~L103):** hiện icon sàn theo ánh xạ thật; KPI / thanh "Nguồn đồng bộ đa kênh" đọc `meta()` thật. Màn giữ orchestrator (≤ 250 dòng).
4. Không thêm nút "Đẩy tồn lên sàn" / "Đăng lên sàn" (P2 / ngoài phạm vi). "Đồng bộ kênh" của prototype ~L6455 mở Ghép SKU (đọc), không ghi lên sàn.

### 4. Mock + i18n + parity
- Mock `apps/web/src/shared/api/mock/domains/marketplace.ts` (C): connector sàn, shop, listing (≥ 60 dòng cho Pager), kết quả `oauth_select`, `pending_get` của provider sàn; đăng ký ở `mock/handlers.ts` (M). `settings-apps.ts` (M) thêm thẻ Shopee / TikTok Shop; `orders.ts` (M) thêm 3 đơn sàn mẫu (trả trước, COD, có vận đơn sàn).
- i18n vi + en: `settings.json` (thẻ, bước OAuth sàn, chọn shop, drawer shop, lỗi), `orders.json` (badge, banner, trạng thái sàn, vận đơn theo sàn, toast đồng bộ), `products.json` (Ghép SKU, kênh bán). `pnpm i18n:check` sạch.
- `tools/parity/parity.manifest.ts` (M):
  - Thẻ Shopee / TikTok Shop ở Nền tảng kết nối → mask `reason: 'PD-907 — prototype không vẽ thẻ sàn OAuth (mức 2)'`.
  - Badge / banner đơn sàn, vận đơn chỉ đọc, drawer Ghép SKU → `reason: 'PD-908 — không có trong prototype (mức 2)'`.
  - Tổng mask mỗi ID ≤ 15%. Màn / trạng thái hiện có giữ < 5%.

## ACCEPTANCE CRITERIA
| AC | Given / When / Then | Evidence |
|---|---|---|
| 1 | Given mock, when mở Cài đặt → Nền tảng kết nối, then nhóm TMĐT có Shopee + TikTok Shop (kết nối được) và KiotViet / Sapo / Haravan / WooCommerce "Sắp có"; parity màn < 5% với mask PD-907 | `pnpm parity settings-integrations` + `apps/web/e2e/marketplace.spec.ts` |
| 2 | Given mock OAuth trả 2 shop, when kết nối Shopee → đăng nhập → chọn 2 shop, then gọi `integration.oauth_select` đúng một lần (có `Idempotency-Key`), bước 3 hiện 2 thành công; mock trả `shop_in_use_elsewhere` cho một shop → dòng đó báo lỗi rõ, dòng kia vẫn thành công | `marketplace.spec.ts` (mock) |
| 3 | Given kết nối `expired`, when mở drawer, then dòng shop "Hết uỷ quyền" + nút Uỷ quyền lại gọi `oauth.start` có `ref`; còn ≤ 7 ngày → cảnh báo; người không có `integrations.manage` không thấy nút | `marketplace.spec.ts` |
| 4 | Given đơn sàn, when mở danh sách + chi tiết, then cột Nguồn có badge sàn + shop; banner có trạng thái sàn có nhãn + "Thanh toán qua sàn"; không có nút tạo Đề nghị thanh toán; dòng / giá khoá | `marketplace.spec.ts` + `pnpm parity orders` |
| 5 | Given đơn sàn có `shipping.source.tracking = 'platform'`, when mở Vận chuyển, then mã vận đơn chỉ đọc; trường hãng (chưa có từ sàn) vẫn sửa được; đơn thường sửa như cũ | `marketplace.spec.ts` |
| 6 | Given 60 listing mock, when mở Ghép SKU, then Pager D42 (20 / 50 / 100), lọc `unmatched` về trang 1; Ghép một dòng → `marketplace.map_sku` + dòng thành "Đã ghép"; `sku_already_mapped` → lỗi tại dòng; không quyền `catalog.manage` → chỉ xem | `marketplace.spec.ts` |
| 7 | Given sản phẩm A ghép Shopee, B không ghép, when mở danh sách Sản phẩm, then cột Kênh A có Shopee, B không (không còn giống nhau mọi sản phẩm); `meta()` sàn `active` khi có kết nối; số truy vấn "Kênh bán" không tăng theo số dòng | `apps/api/test/integration/catalog.test.ts` (ca mới, đếm query) + `pnpm parity products` |
| 8 | Given chạy `http` (`SHOPEE_TRANSPORT=fake`, `TTS_TRANSPORT=fake`), when luồng kết nối → đồng bộ → mở đơn → ghép SKU, then chạy hết như mock | `apps/web/e2e/http/marketplace.spec.ts` |
| 9 | Given 390×844, when mở bước chọn shop, drawer shop, drawer Ghép SKU, then không tràn ngang, vùng chạm ≥ 44px, thao tác chính chạy được | `marketplace.spec.ts` (mobile) |
| 10 | Given i18n, when `pnpm i18n:check`, then đủ vi + en; không chuỗi cứng; không màu / px cứng (`pnpm lint`); file FE ≤ 400, màn ≤ 250 | `pnpm i18n:check` + `pnpm lint:size` |
| 11 | Given tài khoản Shopee / TikTok Shop thật (Q-914 / Q-915) + domain HTTPS (Q-006), when kết nối từ UI thật, then như AC2–AC5 | **chưa nghiệm thu với provider thật** |

### Commands / evidence gate
- Cổng commit (D59): `pnpm turbo run lint typecheck test --filter=@appchat/{web,shared,core}` · `pnpm depcheck` · `pnpm lint:size` · `pnpm i18n:check` · `pnpm lint:masks`.
- Parity: `pnpm parity settings-integrations` · `pnpm parity orders` · `pnpm parity products` (ID kiểm trong `parity.manifest.ts` ở Rà #3; so với mốc trước khi sửa).
- E2E: `pnpm e2e marketplace` (mock) · `pnpm e2e:http marketplace` (fake transport) · mobile 390×844 trong cùng spec.
- Integration: `pnpm --filter @appchat/api test:integration -- test/integration/catalog.test.ts` (`--workers=1`, slot Postgres).

## CONSTRAINTS
- **DO NOT:**
  - Nút / luồng đẩy tồn, đẩy trạng thái, đăng / sửa sản phẩm lên sàn.
  - Cho sửa dòng / giá / tổng đơn sàn; nút tạo Đề nghị thanh toán / VietQR cho đơn sàn.
  - Viết lại `useOAuthConnect` / `OAuthConnectStep` (048 / 048c).
  - Sửa `settings/types.ts` (gần trần) hay nhồi logic vào màn; thêm thư viện.
  - Màu / px cứng; chuỗi không qua i18n; mask không có mã.
  - Import `@appchat/core` / `@appchat/db` từ web.
- **REUSE:**
  - `useOAuthConnect`, `OAuthConnectStep` (048 / 048c), `useAction`, `useCan` / `Can`.
  - `DataTable` + `ListPager`, `EntityDrawer`, icon brand (048c).
  - DTO + action 049.
- **SKIP:**
  - Chat người mua sàn, livestream sàn (Sắp có).
  - Màn quản lý tồn sàn, báo cáo sàn.
  - Thẻ hãng vận chuyển (P2).

## Quality Gate
- [x] Manifest chính xác (file-level M/C). Giao file khai hai phía bằng `manifests.py --sync 049 049b 049c 049d`.
- [x] PD-907 / PD-908 là mức 2 (prototype không vẽ) — mask có mã; màn có sẵn giữ < 5%; bảng giữ D42 / D43.
- [x] COMMERCE §4b thể hiện trên UI: khoá dòng / giá, thanh toán qua sàn, không nút đẩy lên sàn.
- [x] 11 AC; mobile 390; ô cần tài khoản thật ghi "chưa nghiệm thu với provider thật".
- **Gap đã khai:**
  - Logo sàn dùng icon brand của 048c; chưa có ảnh logo chính thức trong bộ icon thì dùng chữ viết tắt.
  - Nhãn trạng thái sàn lạ (sàn thêm trạng thái mới) hiện chuỗi gốc tới khi bổ sung i18n.

## ⚠️ BUILDER-CHECKLIST (agent PHẢI hoàn thành trước khi báo DONE)
- [ ] Implement đúng `Files touched` (manifest), không thêm file ngoài scope; FE 150–250 dòng, trần 400; màn chỉ orchestrator.
- [ ] AC 1–10 có kết quả từng cái, dán output thật (parity `diffRatio`, e2e, mobile); AC11 ghi "chưa nghiệm thu với provider thật".
- [ ] **UI (BUILDER-HANDOFF #6):** parity < 5% các màn chạm; PD-907 / PD-908 ghi Completion Report (mã, mức, trạng thái); chỉ token, i18n vi + en.
- [ ] **Action-first (BUILDER-HANDOFF #3):** mọi ghi qua `useAction(id).run(input)`; không gọi REST ghi trực tiếp.
- [ ] **Luật COMMERCE §4b:** không nút sửa dòng / giá đơn sàn, không Đề nghị thanh toán cho đơn sàn, không đẩy lên sàn.
- [ ] Không báo DONE nếu test chưa chạy. `git status --short` sạch, báo kèm Git SHA.
