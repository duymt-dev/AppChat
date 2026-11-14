# Planning audit — TIP-038, 2026-11-02

## Phạm vi và kết quả

Chỉ tài liệu. TIP-038 mới có102 file manifest và10 AC, nhận thêm DEF-006-1 từ orphan. COVERAGE sinh lại:1463 dòng/215 orphan gaps; trạng thái runtime không được nâng. Chưa xong câu A; chưa review độc lập, chưa code hay chạy builder tests.

## Bằng chứng code đã đọc

- insights module/jobs/HTTP còn stub; dashboard mock fixture, calendar-read.service.ts:166 trả follow_ups rỗng; follow_up.complete chỉ ActionDef.
- ai/assistant/meta-tools.ts:114–117 query_data NOT_IMPLEMENTED; agents.read.ts:20–40 số liệu run không window, csat hardcode0. support.prisma có assigneeAgentId/csat nên không phải chỉ thiếu account ngoài.
- contracts/services/contract-system.ts:50–67 đã phát contract.expiring + notification T-30; task-catalog.ts:54 chưa event đó. Pack reuse event/scheduler cũ, không tạo luồng nhắc gia hạn thứ hai.
- notify/services/prefs.service.ts đã đọc daily/weekly/off, chưa digest scheduler. task-briefing.ts:24–49 team không lọc như own: pack buộc reuse042c policy, không sao chép lỗi sang digest.
- QuotesToolbar:82, OrdersToolbar:96, ContractsToolbar:69, TicketsHeader:143 toast export; quotes.repo.ts:44 branch page=null LIMIT2000 không đủ xuất allfiltered.
- Permission registry có order.view/quote.view/contract.view/ticket.view, **không sales.view/support.view**. Đã sửa nháp để không invent permission, scope-module khác permission.

## Thiết kế cần kiểm trước build

DC241 là technical proposal, không thay commerce/giá/quyền; Q029 team còn gate ở042c. API/job/internal writes dùng Executor; aggregate/export/mail đều scope+fieldvisibility, không tổng tenant rồi chỉ che UI. Export snapshot/revalidation/expiry, digest durable ledger/unknown-send, CSAT sample và close-rate tương quan có định nghĩa. Thống kê không dùng để trả hoa hồng hoặc sửa doanh số.

102files là scope lớn: build từng phần metric/dashboard/export/digest theo task, file caps bắt buộc; review cuối cần cân nhắc tách supplemental nếu không giữ được cohesive ownership. Chưa coi draft đủ độc lập review hoặc ready-to-build toàn bộ batch.

## Validation của tài liệu

- Kiểm102 manifest path unique, M tồn tại/C chưa có; chỉMarkdown thay đổi.
- Tính overlap trước tạoTIP, cập nhật13 pendingTIP hai chiều; khi bổ sung locales/mock manifest đã tính lại. Các6 pending cũ chưa exactmanifest nên không có tuyên bố parallel-safe toàn batch.
- merge.py:1463 rows/215 gaps (A29 B14 C22 D23 E38 F48 G41); DEF0061 CHƯA, không dùng pack làm bằng chứng runtime.
- Chưa chạy unit/integration/E2E/provider/live9router: không có source change. Lệnh trong pack là yêu cầu builder tương lai.

## Tiếp nối

039–041/044–046 chưa có TIP;6 pending cũ còn phải hoàn thiện;215 orphan gaps và nghĩa vụ gán riêng TIP-DONE vẫn cần audit. Rà toàn graph/index ownership (038 nay có insights.prisma), deferred claims, CHỜ-TK/exclusions và independent review cuối. Không bắt đầu câu B.
