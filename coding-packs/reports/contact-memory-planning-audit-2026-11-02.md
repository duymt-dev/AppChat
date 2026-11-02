# TIP015b — hoàn thiện kế hoạch sau review độc lập

## Phạm vi

Chỉ sửa tài liệu. Không mutation DB, không gọi model, không chạy test runtime. Đây là một phần của sáu TIP cũ, không phải toàn goal.

## Bằng chứng và bổ sung

- crm.prisma:203–213 thiếu updated_at/provenance; manifest có migration/backfill và memory modules riêng.
- reply-context.ts:81 có đọc memory nhưng chưa writer; action grant/published/scope và copilot phải được kiểm ở writer, không thêm tool bypass.
- contact360.ts:43–59 có placeholders; ContactsController:130–134 trả CRM AI rỗng; contact-view.ts:89 wait. Đã nhận endpoint/thống kê/gợi ý/links thật và nút Giao AI, không chỉ memory CRUD.
- DEF0261 gồm booking/ticket/SLA/CSAT đã được đưa vào scope cụ thể, trạng thái COVERAGE vẫn CHƯA.
- Công nợ dùng helper chung cho360/contracts/invoices, LTV thu ròng confirmed, không biến order cancel thành xoá payment.
- Fingerprint snapshot đã lọc quyền là cache authority; event revision chỉ hint, không dựa contact.updated_at hoặc giả mọi event đã tới.
- Cap50 có contact lock, deterministic eviction, undo kiểm cap/scope. Trigram là tương tự văn bản, không gọi semantic understanding.
- Gate runtime có role/tenant isolation, concurrent51 writes, stale summary/revoked scope, mock/http UI,3 live cases và EXPLAIN.

## Manifest và dependency

-73 đường dẫn duy nhất, M hiện có/C chưa có đã kiểm bằng filesystem. Không thêm source.
-17 cặp giao file đã được khai sequential hai chiều trước thêm manifest. Các TIP cũ còn thiếu manifest nên whole-graph chưa đạt.
-015b sau023b/023c/030b/032b, trước036 và nhánh sau; loyalty036 và release eval044 tích hợp sau, không dependency ngược. Runner023b phải hỗ trợ `--cases`; hiện chưa có, không báo đã chạy lệnh.
- Parity manifest legacy chỉ facade1–2 dòng, logic ở module mới.

## Gate hiện tại

Required sections/manifest và whitespace đã kiểm; đang gửi reviewer rà lại. Chưa claim cục bộ review PASS hoặc ready-to-build toàn graph. Các task/AC mới không thay thế validation runtime của builder.

## Findings vòng review và sửa

Reviewer tìm4 finding: merge/undo vượt cap và mất lock; command integration/HTTP dùng config sai; remember write gắn skill trái D51; runner JSON/--cases chỉ khai một chiều. Đã nhận contact-merge handler + memory/merge helper (manifest73), snapshot undo7 ngày/ordered locks/cap/conflict policy; sửa command integration explicit config và e2e:http; bỏ skill ở remember; bổ sung contract runner/CLI test trong023b. Hai residual nhỏ cũng sửa: AC trigram đúng ngưỡng thay “gần nghĩa”, cấm fallback Contact.aiSummary legacy có thể lộ công nợ. Đang tái kiểm, không coi ghi patch là reviewer đã xác nhận.
