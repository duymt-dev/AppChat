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
