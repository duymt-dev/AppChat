# TIP-015b: Trí nhớ khách của AI — `contact_memory`, `contact.remember`, tóm tắt Hồ sơ 360°, KPI 360° (công nợ, hợp đồng, đơn / thu gần nhất), cột "AI gợi ý"

## HEADER
- TIP-ID: TIP-015b (bổ sung TIP-015 / 022 — chèn sau TIP-023b, DC-231)
- Project: AppChat V2
- Module: `packages/db/prisma/tenant/crm.prisma` (`contact_memory` đã có bảng) · `packages/core/src/crm/services/contact360.ts` · `packages/core/src/ai/reply/{reply-context, reply-tools}.ts` · `packages/actions/src/crm.ts` · FE `features/customers/components/Profile*`
- Depends on: TIP-015 (khách + 360), TIP-022 (agent trực kênh), TIP-029 / 030 / 031 / 032 (chứng từ cho KPI)
- Priority: P0 · REQ: F02, F05, D05 · Decision: D10 (Blueprint §2.2 `contact_memory`, §5.3) · DC-231
- Estimated effort: 10 giờ

## CONTEXT
- Blueprint §2.2 + §5.3: agent lắp ngữ cảnh có `contact_memory`; AI ghi nhớ sự kiện về khách (sở thích, dị ứng, lịch quen…). Bảng có nhưng **không chỗ nào ghi** (chỉ `contact.merge` dời bản ghi); report TIP-015 / 022 ghi "TIP riêng sau" mà task graph không có.
- Hồ sơ 360°: `kpis: []`, `recent_order` / `recent_payment` rỗng, không có công nợ / hợp đồng hiệu lực (`contact360.ts`); quy đổi điểm sai `×10` (TIP-036 sửa).

## TASK
1. **`contact.remember { contact_id, fact, confidence? }`** (risk write, agentGrantable, skill): ghi `contact_memory` (nguồn run / bước, người hoặc agent); chống trùng gần nghĩa (cùng khách, fact chuẩn hoá không dấu trùng ≥ 0.9 trigram → cập nhật `updated_at`, không thêm dòng); tối đa 50 fact / khách (cũ nhất có độ tin thấp bị thay). `contact.forget { memory_id }` (xoá, có undo).
2. **Agent trực kênh tự ghi:** tool `remember` cho agent (sau mỗi lượt, model đề xuất fact mới từ tin khách; chỉ fact về khách, không ghi PII nhạy cảm theo bộ lọc PII sẵn có của TIP-022). Lắp ngữ cảnh đọc ≤ 20 fact mới nhất.
3. **Tóm tắt 360°:** `contact.summarize { contact_id }` (read, skill) → 3–5 dòng từ timeline + memory + chứng từ; cache theo `updated_at` khách, hiện ở đầu Hồ sơ 360° (khối "AI tóm tắt") và trong `contact.get` của 023b.
4. **KPI 360° thật:** công nợ (đề nghị thanh toán chưa thu, quá hạn), hợp đồng hiệu lực + giá trị, đơn gần nhất, khoản thu gần nhất, điểm (sau 036) — điền `kpis[]`, `recent_order`, `recent_payment` đúng shape FE.
5. **Cột / khối "AI gợi ý"** ở danh sách khách (prototype) = hành động tiếp theo gợi ý từ memory + giai đoạn (rule + model rẻ, cache ngày), không tự gửi.
6. FE: khối "AI ghi nhớ" trong Hồ sơ 360° (xem / xoá fact), i18n.

## ACCEPTANCE CRITERIA
1. Integration: agent (model giả) gặp "em dị ứng tinh dầu sả" → `contact_memory` có fact; lượt sau ngữ cảnh chứa fact; trùng gần nghĩa không thêm dòng; sales chỉ thấy memory khách trong scope.
2. Integration: 360° có công nợ / HĐ / đơn / thu đúng số với dữ liệu seed; EXPLAIN các truy vấn KPI dùng index.
3. Unit: chuẩn hoá fact, chọn fact bị thay khi đầy.
4. Model thật: bộ `pnpm ai:live` thêm 3 ca ghi nhớ / dùng lại trí nhớ.
5. Cổng D59; parity Hồ sơ 360° < 5%.

## CONSTRAINTS
- Không lưu số CCCD / thẻ / mật khẩu vào memory (bộ lọc PII).
- Không tự gửi khách dựa trên gợi ý.
