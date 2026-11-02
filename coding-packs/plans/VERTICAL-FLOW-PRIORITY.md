# Ưu tiên chiều dọc: Zalo ↔ CRM ↔ Commerce ↔ AI

Chủ nhà yêu cầu2026-11-02; áp dụng cho câu A (chỉ tài liệu). Không thay luật COMMERCE, D32/D51 hoặc điều kiện kết thúc goal. “Trợ lý toàn năng” = bao phủ thao tác trong quyền người dùng; không phải quyền quản trị vô hạn. Không lấy demo một chiều thay nghiệm thu liên thông hai chiều.

## Thứ tự rà và điểm nối phải chứng minh

| Luồng | Hợp đồng tích hợp / ca nghiệm thu cần có | TIP liên quan và tình trạng |
|---|---|---|
| Kết nối Zalo bằng Trợ lý → nhận tin | QR hết hạn/đăng nhập lại; secret không qua model; webhook/poll replay không tạo trùng tin/khách; xác định đúng tenant, channel, conversation, contact | 023c; 014b now has provider/session/receipt/history manifest and acceptance; not implemented, không coi019/014 DONE là bằng chứng đủ |
| Tin Zalo ↔ hồ sơ CRM | Nhận diện khách không nhập nhằng; mở360 đúng khách từ hội thoại; cập nhật hồ sơ/fact hiển thị ngược lại; merge/undo không mất history; watcher chỉ đọc, không được ghi | 015b,042c; 025b đã có manifest/AC,026b có activity/board/layout manifest;015d lifecycle và015c privacy còn phải viết |
| Ngữ cảnh khách ↔ Agent/Trợ lý | Người dùng hỏi trong hội thoại hoặc360 → tra dữ liệu theo scope, nhớ fact đúng provenance; không có agent thì gợi ý tạo, không tự tạo agent tạm; handoff/coplay không tự gửi | 023b/023c/015b; 022b/019b đã có manifest/AC, assistant UX023d còn phải viết |
| AI ↔ báo giá → hợp đồng/đơn | Tra catalog/variant, điền khách; preview có checklist; sửa preview làm mất hiệu lực confirm cũ; duyệt đúng ngưỡng; quote conversion race không sinh cả hợp đồng và đơn trái luật | 023b,023c,030b,032b; không lấy tool schema có tên thay handler thực |
| Chứng từ ↔ gửi Zalo ↔ phản hồi khách | PDF/ảnh nhiều trang hoặc link thực tải được; trạng thái provider unknown không giả thành sent và không retry mù; khách phản hồi gắn đúng khách/chứng từ, AI đọc trạng thái mới nhất | 032b,030b; channels/inbox supplemental phải nhận correlation/status/retry boundary |
| Thanh toán ↔ CRM ↔ AI hậu mãi | Chống trùng webhook, ledger đúng; trạng thái công nợ cập nhật360 và câu trả lời AI; liệu trình/điểm theo luật; refund không xoá history hoặc làm sai LTV | 032b,015b,036; 012b đã có manifest/AC adapter SePay/Casso thật và canonical ingress; chưa triển khai; không gắn mock thành provider thật |
| Nhập/xuất AI-first xuyên bảng | File CRM/catalog/quotes/orders/contracts/invoices → AI mapping → preview → action domain → dữ liệu đọc lại từ UI/AI; xuất file thật đúng scope; fallback thủ công dùng chung pipeline; không import paid/signed/ledger trực tiếp | 038b; importer catalog nền032b; attachment/generative UI023c; giữ capability matrix sáu domain |

## Bộ bằng chứng đầu-cuối bắt buộc khi triển khai

1. Một journey chuẩn có ID truy vết từ tin Zalo → contact → AI run/action/approval → quote → contract hoặc order → invoice/payment → gửi chứng từ → CRM refresh. Ghi ID thay vì chụp màn rời không liên kết.
2. Chạy từ cả hai điểm vào: khách nhắn Zalo cho agent và nhân viên ra lệnh cho Trợ lý trong ứng dụng; cùng action/domain policies, không có đường ghi riêng cho AI.
3. Ma trận âm: khác tenant, khác scope, watcher read-only, mất quyền giữa preview/confirm, agent bị thu hồi tool, dữ liệu đổi version, thiếu Credit, kênh offline, provider timeout, replay cùng idempotency key. Không rò nội dung trong lỗi, file, AI trace hay cache.
4. Luồng hai chiều: thay đổi hợp lệ qua UI được AI đọc lại; thay đổi qua AI hiện ngay ở UI/360/inbox; cùng nguồn dữ liệu, không chép trạng thái mẫu vào câu trả lời.
5. Với AI phải có ca model thật9router; với Zalo cần bằng chứng provider thật khi có tài nguyên. Mock/contract tests không thay live evidence. Gửi thử chỉ vào tài khoản thử đã được cho phép, không gửi khách thật ngoài ý muốn.
6. Chốt tài liệu: mỗi ca có TIP owner, manifest/wiring, Given/When/Then và lệnh chạy cụ thể. Danh sách này là checklist liên thông, chưa phải TIP đã hoàn thiện hay kết quả test.

## Quy tắc ưu tiên và không bỏ phạm vi

Ưu tiên khép023b →023c →030b/032b →015b và các supplemental ở điểm nối phía trên; thứ tự build cuối cùng phải tuân DAG thực và file-overlap, không suy ra chạy song song từ dấu mũi tên.044 nhận gate eval tổng hợp, không nhận thay phần implementation thiếu owner. Sau luồng dọc vẫn phải rà hết7 phần, gán toàn bộ nghĩa vụ còn lại, hoàn thiện mọi TIP và review độc lập trước khi kết thúc câu A.

## Zalo seam checkpoint2026-11-02

014b provides durable message-operation/provider receipt and history/sync boundaries after045b;025b consumes its capabilities and status rather than recreating queues.022b now plans schedules/routing/turn outcomes;025b now plans group UI, search, bulk, canonical CRM/commerce linkage, booking, approval cards and real timeline CSV.019b runtime now has exact127-path pack and review corrections;012b now has126-path bank/shared connector pack with local independent review fixes;012c tenant mail remains to write. See reports/zalo-lifecycle-planning-audit-2026-11-02.md and reports/inbox-vertical-planning-audit-2026-11-02.md; no runtime or real-provider acceptance claimed.

026b adds grounded CRM360 note/comment/manual-task/opportunity controls and AI-first real files for those datasets. These are not payments, appointments or autonomous AI tasks.015d still needs merge/transfer/delete/restore/forwarding,015c privacy. A local checkpoint does not close the vertical or whole-goal audit.

015d now plans atomic contact ownership across openconversations/currentquotes/upcomingappointments with realAIapproval and immutablequoteattribution. Fullcontract/order attribution bug remains032c, merge/delete/restore015e andprivacy015c still needtheir packs. See ownership source review; no runtimePASS.

032c now specifies contract/order immutable attribution versus responsible assignment, rowCAS and safe inverse across manual/AI/file/conversion paths. It follows015d; contact lifecycle015e/privacy015c remain separate, and the earlier broad015d reservation is superseded by these explicit boundaries. No runtime acceptance.
