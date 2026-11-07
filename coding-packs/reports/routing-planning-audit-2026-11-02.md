# Câu A — lead routing planning, 2026-11-02

**PARTIAL goal, docs only.** Mốc code983346e. Có TIP042b đầy đủ cấu trúc, chưa implement; independent review toàn goal chưa làm.

## Bằng chứng
- AccountSettings và API/FE có round_robin/least_busy/shift nhưng runtime không dùng để chọn user. Action thật tên `channel.update_settings`, không `update_config`; đã sửa tên trong TIP sau kiểm registry.
- InboundPipeline resolve contact rồi gán hội thoại mới theo owner, chưa có owner vào hàng chung. ContactIdentityService trả `created`, có event contact.created; không tự ghép email/name. TIP phát routing_requested chỉ khi contact thực sự mới/direct, sau đó worker gọi Executor.
- Contact create tay/import hiện gán owner cho người tạo, không tự giành để chia vòng tròn. Worker chỉ CAS owner null, không sử dụng transfer_owner để ghi đè.
- NormalizedInbound không có cờ history. Không viết yêu cầu giả “đã có cờ realtime”; DC-238 định nghĩa lead mới bằng contact được tạo sau opt-in. UI phải nói rõ nhập lịch sử sau bật có thể tạo lead mới và được chia, không dùng sentAt quyết định.
- TicketCreateHandler vẫn dùng defaultPolicy; REQ-B11d có cả SLA nên không gán xong cả nghĩa vụ cho routing. Giữ dòng này chưa khép thay vì che phần thiếu.

## Tài liệu tạo
- Manifest44 đường dẫn (24M/20C);8 AC modes/ownership/races/security/channels/migration/UI/query.
- Bilateral shared-file declarations với10 TIP pending trước khi tạo042b. 042b sau042/045b, trước044/046; 042c cần rà tiếp, không giả parallel-safe.
- Không mở skill routing/phân ca/workflow của prototype. ManageChannelDrawer369 dòng: trích ChannelRoutingFields, không nhồi logic vượt400.
- Tài liệu không đổi quyền/commerce; DC-238 là lựa chọn kỹ thuật có thể rà trước thi công, không phê duyệt Q-027/Q-028.

## Kiểm tra và giới hạn
- Kiểm đường dẫn M tồn tại/C chưa tồn tại; manifest unique, header/CONTEXT/standards/task/AC/constraints/checklist có đủ.
- Regenerate COVERAGE bằng merge.py; kiểm Markdown6 cột với escaped pipes, ID unique; diff check.
- Chưa chạy test implementation/9router/provider (không có code mới); lệnh trong TIP là gate builder, không kết quả test.
- Goal còn218 lỗ hổng, TIP042c/037–041/044–046 và bổ sung khác chưa viết,6 TIP cũ cần hoàn thiện, full overlap và independent review chưa xong.

## Tiếp nối
Viết042c từ8 bảng ownership + scopeFilter/collaborator + server serializer, rồi quay lại các domain chưa viết. Không chờ Q-027/Q-028 để dừng toàn bộ công việc tài liệu.
