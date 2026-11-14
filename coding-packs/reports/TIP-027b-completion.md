### COMPLETION REPORT — TIP-027b

**STATUS:** DONE (ai:live `product-media` chưa nghiệm thu: Postgres dùng chung cạn slot, xem CHƯA NGHIỆM THU)

4 pha, PR xếp chồng:

| Pha | PR | Nhánh | Xếp chồng trên |
|---|---|---|---|
| 1 + 2 | #201 | `tip/027b-product-media-description` | #200 (pha 2 đẩy nhầm cùng nhánh pha 1, thân PR đã ghi) |
| 3 | #203 | `tip/027b-p3-web` | #201 |
| 4 (chốt) | — | `tip/027b-p4-close` | #203 |

SHA ở `goals/GOAL-RELEASE.md` dòng 48.

**TÓM TẮT:** Năm nút định dạng mô tả và tab Tệp của sản phẩm thành tính năng thật, dữ liệu bền theo quyền hiện hành.

- **Mô tả có định dạng (pha 1, §2):**
  - Schema đóng v1 (`packages/shared/src/catalog/description.ts`):
    - Nút: đoạn / danh sách chấm / danh sách số / mục / chữ.
    - Dấu: đậm / nghiêng / gạch chân.
    - Giới hạn: 32 KiB, 200 nút, sâu 4, 4000 ký tự chữ.
  - Cột `product.description_doc` JSONB. `product.description` vẫn là phép chiếu chữ thuần, dùng cho API cũ / tìm kiếm / KB / xuất.
  - `normalizeDescription` dùng chung cho create / update / nhập 032b:
    - Có tài liệu + chữ lệch → 422.
    - Client cũ gửi lại nguyên chữ → giữ định dạng.
    - Đổi chữ → một đoạn mỗi dòng.
    - Rỗng → xoá cả hai.
  - Undo cũ sau khi đã sửa mới → 409 `superseded`.
  - 038b:
    - Thêm cột JSON `description_doc` (product `schemaVersion` 2).
    - Cảnh báo `formatting_reset` ở xem trước, kèm `hint` / `warnings` trong metadata trường.
    - Xuất sản phẩm thêm 2 cột mô tả (khứ hồi).
- **Ảnh / tài liệu riêng tư (pha 2, §1, §4.3):**
  - Bảng `product_media` / `product_media_state` (version CAS) / `product_media_intent` (ý định trước khi chép bytes).
  - Kernel trung lập để catalog dùng lại 032d mà không import sales:
    - `kernel/files/attachment-targets.ts`: registry đích tải lên, hồ sơ kiểm `record` | `product`.
    - `artifact-copy.ts` chuyển từ sales sang kernel.
  - `image-bounds`: PNG / JPEG / WEBP, ≤ 8000 px mỗi cạnh, ≤ 40 MP, không ảnh động (APNG / WEBP ANIM). Chạy trong tiến trình con cô lập.
  - 5 action `product.media_*`:
    - Ghi: catalog.manage, `agentGrantable` false (như product.create / update).
    - Đọc: catalog.view.
  - Thứ tự khoá: sản phẩm → bộ media → claim tệp → liên kết.
  - Quy tắc media:
    - Ảnh đầu tiên là ảnh chính.
    - Gỡ ảnh chính → ảnh kế tiếp lên thay.
    - Sắp xếp phải gửi hoán vị đủ.
    - Giới hạn 10 ảnh / 20 tài liệu.
  - Hoàn tác tạo sản phẩm khi đã có lịch sử media → 409 `HAS_DEPENDENCIES`.
  - Tải bytes qua nguồn claim: catalog.view + sản phẩm sống + liên kết sống.
- **Web (pha 3, §2.4–2.5, §3.1, §3.4):**
  - `ProductDescriptionEditor`:
    - contentEditable chỉ nhận vùng chọn + `beforeinput` gốc. Mọi thay đổi đi qua mô hình dòng / run (`description-selection.ts`), DOM chỉ là hình chiếu React.
    - Không tách grapheme / cặp surrogate. Dán chỉ text/plain. IME nhận chữ ở `compositionend`.
    - Lịch sử 50 bước; phím tắt Ctrl/Cmd + B / I / U / Z / Y.
  - `ProductDescriptionView`: thẻ ngữ nghĩa bằng nút chữ React, không `dangerouslySetInnerHTML`.
  - `ProductMediaEditor` + `useProductMedia` thay `FilesTab` tĩnh + toast:
    - Tải `record_attachment` đích product → gắn theo version.
    - Ảnh chính / dời / gỡ (có xác nhận) / tải về qua blob.
    - Object URL xem trước thu hồi khi đổi sản phẩm / gỡ / unmount.
    - "Thử lại" gắn đúng id tệp đã tải.
- **Chốt (pha 4):**
  - E2E http.
  - Suite ai:live `product-media` 6 ca (seed + judge).
  - Test schema action `packages/actions/test/product-media.test.ts`.
  - COVERAGE `REQ-F05b` / `PRO-products-files` / `PRO-products-richtext` → ĐẠT.

**FILES CHANGED** (lệch manifest ở DV-112, DV-113, DV-114)

- **Pha 1:**
  - shared:
    - `catalog/description.ts` (+ test).
    - `data-transfer/{fields,field-types,registry}.ts`, `api/{catalog,data-transfer}.ts`.
    - i18n server `insights`.
  - actions: `catalog.ts`, `catalog-operations.ts`.
  - core:
    - `catalog/description/normalize.ts`, `catalog/{actions/product.handlers,services/product-columns,services/catalog-read.service}.ts`.
    - `catalog/import/{parse,validate,receipt}.ts`.
    - `data-transfer/{adapters/catalog,services/validation,services/file-parser,actions/sample.handler}.ts`.
    - `insights/exports/catalog-readers.ts`.
  - db: migration `20261112030000_product_description_doc`.
  - web:
    - data-transfer `PreviewTable` / `MappingEditor` / styles, mock data-transfer.
    - i18n `data-transfer.json`.
  - test:
    - core `product-description{,-import}.test.ts`.
    - api `product-media.test.ts`.
- **Pha 2:**
  - kernel files: `attachment-targets.ts`, `artifact-copy.ts` (chuyển), `image-bounds.ts`, `attachment-validation.ts`, `attachment-validator-entry.ts`, `index.ts`.
  - sales files: re-export + đăng ký đích.
  - db `product-media.prisma` + migration `20261112040000_product_media` + OWNERS `prisma-stubs.test.ts`.
  - actions `product-media.ts`.
  - core `catalog/media/{repository,attach,edit,read,source,handlers,module,pristine}.ts`.
  - shared:
    - `api/product-media.ts`.
    - events `commerce-files.ts` + `aggregate.ts`.
  - fixtures `product-media/images.ts`.
  - test:
    - core `product-media.test.ts`.
    - api `product-media-files.test.ts` + 5 ma trận `product.media_*.action.test.ts` + helper.
    - worker `product-media-composition.test.ts`.
    - `assistant-coverage.test.ts`.
- **Pha 3:**
  - web products:
    - `components/{ProductDescriptionEditor,ProductDescriptionView,ProductMediaEditor}.tsx` (+ 2 test).
    - `hooks/{description-selection,description-history,useProductDescription,useProductMedia}.ts` (+ `description-model.test.ts`).
    - `styles/{description,media}.styles.ts`.
    - `ProductFormModal`, `DetailTabs`, `ProductDrawer`, `useProductForm`, `types`, `form/detail.styles`.
  - mock `domains/{product-media,products}.ts`, `handlers.ts`, `mock-transport.ts`, `product-media-shape.test.ts`.
  - i18n `products.json` vi / en.
  - e2e `product-media.mock.spec.ts`, `http/products.spec.ts`.
- **Pha 4:**
  - e2e http `product-media.spec.ts`.
  - ai:live:
    - `fixtures/ai-eval/product-media{.json,-seed.mjs}`.
    - `tools/ai-live/src/product-media-judge.ts` + `cases.ts` / `runner.ts` / `cli.ts`.
  - actions `test/product-media.test.ts`.
  - COVERAGE parts + `merge.py`.

**TEST**

| Cổng | Kết quả |
|---|---|
| Integration API (Postgres 16 + Memurai thật, validator bundle thật) | Chốt pha 4: 7 file / 37 test, gồm `product-media` 4, `product-media-files` 5, ma trận 5 action 28. Nội dung kiểm: (1) EXPLAIN 100k → `product_media_list_idx`; (2) attach ↔ create-undo / pending-copy ↔ undo / attach → detach → undo; (3) gắn song song → một ảnh chính; (4) APNG / quá cỡ / giả đuôi bị chặn; (5) tải bytes khớp. Hồi quy 032d 44/44 (pha 2) |
| Unit | Lần chạy chốt: shared 199 · actions 40 · db 31 · ai-live 88 · core 1196 (+ 1 skip). Chi tiết ở dòng dưới |
| Unit — web | 62 file / 259 test (products + mock + data-transfer), mới 26 |
| Unit — worker composition | 2/2 |
| Unit — test chập chờn ngoài phạm vi | `assistant-input-parsing.test.ts` "XLSX thật" (023f) timeout 5 s khi chạy song song cả suite. Chạy riêng 10/10 xanh. File không đổi ở TIP này |
| E2E mock (`E2E_PORT=3537`) | `product-media.mock` 4 passed (desktop 3 + mobile 390) · hồi quy `products` + `commerce-files.mock` 9 passed |
| E2E http (`E2E_HTTP_PORT=3538`, `TENANT_CLIENT_CACHE=10`) | `product-media` 2 passed. Mô tả: gõ phím → đậm + danh sách số → `product.get` đọc lại đúng cấu trúc + chữ chiếu → mở lại form còn định dạng. Ảnh: ảnh chính → đổi → dời → APNG / 9000 px bị từ chối → PDF Mở đúng sha256 → gỡ ảnh chính → ảnh còn lại lên chính; sản phẩm khác trống. `products` http cập nhật gõ phím |
| Parity | `products:list` 3.79% · `products:detail` 3.20% · `products:create` 2.29% |
| ai:live product-media (6 ca × 3 lượt) | **Chưa nghiệm thu (môi trường).** Suite sẵn sàng: schema nạp 6 ca, typecheck, ai-live test 88/88. Hai lượt dựng stack (`AI_LIVE_TENANT_CACHE` 4 → 2) đều lỗi "Too many database connections" ở đăng nhập OTP. Postgres dùng chung đang 52–55/100 slot trước khi dựng (Q-066) |
| Typecheck / lint / depcheck | sạch · 0 lỗi · depcheck 0 lỗi (135 cảnh báo; `no-circular-web` của mock cùng dạng nợ có sẵn) |
| lint:size / lint:tokens / i18n:check | sạch / sạch / 100% |

**CHƯA NGHIỆM THU**

- ai:live `product-media` (6 ca: formatted, attach, unresolved, restricted, retained, malformed). Chạy lại khi slot Postgres rảnh:
  `AI_LIVE_TENANT_CACHE=5 AI_LIVE_EMAIL=assistant-plans@ai-live.appchat.test node tools/scripts/ai-live-stack.mjs --no-build -- --cases fixtures/ai-eval/product-media.json --attempts 3`

**ISSUES DISCOVERED**

- **Q-067:** media chép từ tệp Trợ lý có thể chứa dữ liệu khách, nhưng artifact 023f không có khoá khách. Đề xuất coi media sản phẩm là tài sản catalog. Chưa thêm `catalog/privacy/{inventory,cleanup}.ts` (manifest C): không có cột khách để kiểm kê.
- **Q-068:** ô ảnh trong form TẠO sản phẩm. Tạm theo đề xuất: chỉ tải ở tab Tệp của sản phẩm đã có.
- **Thẻ GenUI riêng cho media** (`genui/{extension-registry,refs,history}.ts`): không thêm. Action `product.media_*` đi qua thẻ xác nhận chuẩn của Executor như mọi action ghi. Chưa có thẻ hiển thị lưới ảnh trong Trợ lý.
- **`record-attachment-source.ts`:** không phải sửa. Nguồn `assistant_artifact_ref` trung lập, đích product dùng chung.
- **Mục lục `assistant-vertical`:** thiếu 45 action của TIP khác (đã có sẵn). 5 action 027b đã có ma trận.

**ĐỐI CHIẾU STANDARDS** (APPLICABLE STANDARDS của TIP):

| Standard | Tuân thủ (file / test) | Lệch |
|---|---|---|
| `plans/COMMERCE-DECISIONS.md` §2 | Media / mô tả không đổi giá / tồn / thuế / gói: judge ai:live và E2E đọc lại giá; integration so trước–sau. Không công khai media ra kênh khách | — |
| `actions/action-registry.md` | 5 action trong `packages/actions` (zod in / out, quyền, risk, agentGrantable). Ghi chỉ qua Executor; FE ghi bằng `useAction`. Ma trận mỗi action; `actions/test/product-media.test.ts` | — |
| `authz/rbac-permissions.md` | Ghi catalog.manage, đọc catalog.view. Không đổi grant mặc định; agent không được cấp ghi. Tải bytes theo quyền sản phẩm hiện hành, người tải không là đường tắt. E2E sales chỉ xem | — |
| `api/response-envelope.md` | `{ data }` / `{ error: { code, message, fields } }`; 409 STALE_VERSION / HAS_DEPENDENCIES; không URL / storage key trong output | — |
| `database/tenant-db.md` · `indexing.md` | Không `workspace_id`. Các index: (1) `(product_id, kind, position, id) INCLUDE (file_id, version, is_primary, created_at) WHERE detached_at IS NULL`; (2) unique sống `(product_id, file_id)`; (3) unique một phần ảnh chính; (4) `file_id` cho GC. EXPLAIN 100k | Tên migration tách theo pha (DV-112/113) |
| `domain/concurrency.md` | CAS version bộ media + khoá sản phẩm `FOR UPDATE`; ý định trước khi chép bytes; tạo-undo kiểm ý định; idempotency gửi lại → cùng liên kết | — |
| `ops/observability-security.md` | Kiểm cấu trúc cô lập, không hứa quét virus. Không link công khai: object URL tạm thu hồi. Dán HTML thành chữ. Không log bytes / bí mật | — |
| `ai/agent-gateway.md` · `rag.md` · `eval.md` | Trợ lý dùng cùng action + xác nhận người; agent chỉ đọc không ghi thay. RAG catalog chỉ nhận chữ thuần chiếu, sự kiện `product.media_changed` không vào RAG. Suite ai:live 6 ca × 3 lượt | ai:live chưa chạy được (môi trường) |
| `ui/frontend-structure.md` | Màn là orchestrator; editor / view / media tách `components/`, hook ở `hooks/`, style riêng; mọi file FE < 400 dòng (lint:size) | Thêm `styles/{description,media}` (DV-114) |
| `ui/interaction-patterns.md` | Gỡ có `modal.confirm`; trạng thái đang tải / kiểm / lỗi có lý do / đã đổi + Thử lại; chỉ biên nhận 200 mới hiện đã gắn | — |
| `ui/prototype-parity.md` | Khung prototype L4439 / L6073 giữ nguyên; parity < 5%; mobile 390 không tràn, chạm ≥ 44 | PD-030 |
| `i18n/i18n.md` | `products.media.*`, `form.rtBar`, `data-transfer` lỗi / gợi ý — vi + en, i18n:check 100% | — |
| `code/testing.md` | Test file riêng, chỉ phạm vi TIP (D39 / D59): unit + integration + E2E mock / http + parity | — |
| `BUILDER-HANDOFF` / D59 | 3 cổng mỗi pha; commit + PR mỗi pha; báo SHA | — |
