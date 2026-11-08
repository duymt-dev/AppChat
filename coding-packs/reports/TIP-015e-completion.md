# TIP-015e — Completion Report

**STATUS:** ĐANG LÀM — 1 / 5 pha. P1 DC-403 (ứng viên trùng thật theo scope + action đọc + modal chọn cặp / bản chính). Còn: P2 kế hoạch gộp gắn phiên bản + quyền (cùng chủ + ACL) + lineage / biên nhận; P3 hoàn tác có điều kiện + dọn biên nhận hết hạn; P4 chiếu theo họ khách (báo giá / đơn / đề nghị / hợp đồng / lịch hẹn / gói / điểm); P5 Trợ lý + gộp hàng loạt theo đơn vị + ai:live 8 ca + chốt D59.

**MIGRATION:** tenant `20261108110000_contact_duplicate_keys` (P1 — 2 index một phần) → sau merge chạy `pnpm --filter @appchat/db db:migrate-tenants`.

---

## Pha 1 — ứng viên trùng thật theo scope, action đọc, modal chọn cặp / bản chính (§1.1–§1.3, §5; AC1) — DC-403, DV-077

**Rà trước khi làm (code thật)**
- `duplicates.service.ts`: truy vấn ngoài có scope nhưng truy vấn con (GROUP BY HAVING) quét toàn workspace → khách ẩn quyết định khách thấy được có "trùng"; ghép cặp O(n²) trong JS, cắt 500; điểm 96 / 90 / 88 / 70 cố định hiển thị như %.
- `DedupeModal.tsx`: regex `NO_MATCH` giả kết quả tìm; "Hợp nhất đã chọn" gửi MỌI nhóm; radio bản chính chỉ trang trí.
- `contact.merge` không khoá / không phiên bản, gộp hợp ACL (thêm phụ trách bản phụ làm collaborator), hoàn tác ghi đè — để P2 / P3.
- Index: email có `contact_email_lower_idx`; tên chỉ có GIN trigram (không phục vụ phép bằng); MST không có index.

**FILES CHANGED** (lệch manifest ở DV-077)
- db: migration `20261108110000_contact_duplicate_keys`.
- shared: `api/contact-merge.ts` (mới), `api/index.ts`. actions: `contact-merge.ts` (mới — `contact.duplicate_candidates`), `index.ts`.
- core: `crm/merge/{candidates,candidates.handler,module}.ts` (mới), `crm/crm.module.ts`, `crm/public.ts`. api: `http/crm/contacts.controller.ts` (GET /contacts/duplicates/candidates).
- web: `hooks/useDedupe.ts` (+ test), `components/dedupe/{DedupeGroup,DedupeEvidence}.tsx` (mới), `DedupeModal.tsx` (orchestrator), `api.ts` / `types.ts` / `CustomersScreen.tsx` (huy hiệu theo scope); mock `domains/contact-merge.ts` (mới), `routes.ts`, `customers.ts`; i18n customers / actions vi + en.
- test: api ma trận `contact.duplicate_candidates` (6), web `useDedupe` (4), e2e `contact-merge.spec.ts` (3).

**Giả định đã chọn (gap-filling)**
- Hạng luật hiển thị "Khớp mạnh / vừa / yếu" thay cho "% trùng" của prototype (ghi lệch prototype — lý do: không phải xác suất đo được).
- Dấu thế hệ cursor tính trên tập khách sống trong scope (đếm + tổng version + updated_at mới nhất) — đủ phát hiện đổi tên / email / MST / gộp / xoá giữa hai trang, không cần bảng snapshot riêng.
- Email / MST trùng không tạo được qua form (chặn trùng email) — chúng đến từ nhập / hồ sơ DN; test dựng bằng ghi cột trực tiếp.

**TEST (cổng khi làm — D59)**
- `db:test-reset` → ma trận `contact.duplicate_candidates` **6/6** (scope Sales own không thấy cặp có khách ẩn; hạng / bằng chứng / bản chính; cursor không lặp / bỏ; dữ liệu đổi → 409; tìm; GET cùng reader; EXPLAIN 10k khách: tra khoá email / MST / tên dùng `contact_email_lower_idx` / `contact_tax_code_live_idx` / `contact_name_key_live_idx`, không Seq Scan).
- web `useDedupe` **4/4**; turbo lint / typecheck / test `...[origin/dev]` **36/36**; lint:size / lint:tokens OK; i18n 100% (6614).
- E2E mock `contact-merge` + `customers` **11/11**. Parity mock: customers:dedupe 3,58% · customers:table 0,97% (≤ 4,2%).
- `assistant-vertical` mục lục ma trận đỏ sẵn (11 action TIP khác — Q-056); action mới có file ma trận.

**ĐỐI CHIẾU STANDARDS (P1)**

| Standard | Kết quả |
|---|---|
| `authz/rbac-permissions.md` | cả hai phía trong scope đọc trước khớp / đếm / trang; không quyền mới; agent chỉ khi được cấp tool (D51) |
| `database/indexing.md` | khoá bằng → index biểu thức một phần trên khách sống; EXPLAIN 10k không Seq Scan; ID trước rồi mới lấy cột |
| `api/response-envelope.md` | `{ data, next_cursor }`; lỗi `STALE_VERSION` có sẵn |
| `actions/action-registry.md` | action đọc mới có ma trận riêng; mô tả hướng model (luật, không xác suất) |
| `ui/frontend-structure.md` | modal = orchestrator; hook + 2 component con; file ≤ 120 dòng |
| `ui/prototype-parity.md` | giữ bố cục 880px; nhãn hạng thay % (lý do: không phải xác suất) — customers:dedupe 3,58% |
| `i18n/i18n.md` | vi + en, thêm khối text, không tuần tự lại JSON |

---

## Pha 2 — gộp gắn phiên bản, không hợp quyền, biên nhận lineage, hoàn tác có điều kiện (§2.1–§2.5, §4; AC2, AC3, AC5) — DC-404, DV-078

**Rà trước khi làm (code thật)**
- `contact-merge.handler.ts` cũ: không khoá, không phiên bản; thêm phụ trách bản phụ làm collaborator của bản chính (hợp quyền); hoàn tác ghi đè từ snapshot (đè thay đổi sau gộp); dời cả đơn / báo giá sang bản chính (mất lineage).

**FILES CHANGED** (lệch manifest ở DV-078)
- db: migration `20261108120000_contact_merge_lineage`, `prisma/tenant/contact-merge.prisma`, `test/prisma-stubs.test.ts`.
- actions: `crm.ts` (`contact.merge` mô tả mới + `expected_versions`).
- core: `crm/merge/{authority,relations,service,handler}.ts` (mới); `crm/actions/contact-merge.handler.ts` (re-export); gỡ `previews/contact-merge.handler.preview.ts`.
- web: `hooks/useDedupe.ts` gửi `expected_versions` (+ test).
- test: ma trận `contact.merge` (viết lại), `contact-merge-authority.test.ts` (mới), `crm-contacts.test.ts` AC7 (bản phụ cùng chủ).

**Giả định đã chọn (gap-filling)**
- Dấu ACL = chủ + tập user:role của cả họ khách; watcher ≠ collaborator (không nâng).
- Xem trước báo số mục dời theo từng bản phụ + kế hoạch bộ nhớ (total / duplicates / evicted) — chỉ số đếm, không lộ nội dung.
- Timeline vẫn dời tạm (có trong biên nhận để hoàn tác) — P4 thay bằng chiếu theo họ.

**TEST (cổng khi làm — D59)**
- `db:test-reset` → ma trận `contact.merge` **3/3**, `contact-merge-authority` **5/5** (khác chủ / khác ACL → 409 không thêm quyền; cặp cùng bản chính một đơn vị; đơn giữ id gốc; sửa bản chính / thêm collaborator sau gộp → hoàn tác 409 không đổi gì; gộp lại khách đã gộp → 404; chồng chéo → 422), `contact.duplicate_candidates` **6/6**, `crm-contacts` + `contact-memory` **20/20**.
- web `useDedupe` **4/4**; turbo lint / typecheck / test `...[origin/dev]` **36/36**; lint:size OK.
- E2E mock `contact-merge` + `customers` **11/11**. UI không đổi bố cục (chỉ gửi thêm `expected_versions`) — parity giữ như P1.

**ĐỐI CHIẾU STANDARDS (P2)**

| Standard | Kết quả |
|---|---|
| `authz/rbac-permissions.md` | không hợp quyền, không collaborator mới; quyền sửa mọi phía; agent không được cấp (giữ) |
| `domain/concurrency.md` | khoá họ tăng dần id; phiên bản người xem → 409 STALE_VERSION; hoàn tác kiểm điều kiện, không ghi đè |
| `domain/state-machine.md` | biên nhận merged → undone (một lần); hết hạn không hoàn tác |
| `actions/action-registry.md` | bulk luôn xem trước; xem trước = cùng điều kiện thực thi; undo theo biên nhận |
| `database/tenant-db.md` · `indexing.md` | bảng tenant không workspace_id; index (primary_id), partial hết hạn `state='merged'` |
| `events/outbox.md` | `contact.merged` mỗi đơn vị trong cùng giao dịch |
| `code/testing.md` | test ở file riêng, Postgres thật |
