# Checkpoint câu A — roles/teams, 2026-11-02

**Trạng thái:** PARTIAL của goal viết đủ TIP, không phải completion implementation042. Chỉ Markdown, không đổi code, DB hoặc tiến trình demo. Khảo sát code tại749d3dc.

## Đã viết / hiệu chỉnh
- TIP042: manifest62 file (35M +27C),9 AC, lifecycle role/team/member, cache revision, UI/HTTP/contract, Q-028 gate.
- DC-237 tách routing042b và scope/field042c. Hai TIP mới **chưa có file**, chưa đạt mục tiêu “đủ TIP”. Số owner không thay bằng bằng chứng AC.
- Khai báo file chung hai chiều với9 TIP chờ trước khi tạo042; tích hợp sau043/045b. Sáu TIP cũ manifest chưa đầy đủ nên còn phải rà giao file toàn batch sau này.
- Đã hỏi Q-028: biên quyền riêng Owner trong custom role. Chưa có trả lời, không tự quyết quyền; không chặn viết TIP domain khác.

## Bằng chứng mới, không dựa trạng thái DONE
1. `identity/settings/settings-read.service.ts:157-172` map SYSTEM_ROLES, trong khi `authz/services/roles.service.ts:11-31` đọc custom role DB. FE dùng đường settings. Chỉ thêm role handler sẽ không làm màn hiển thị role mới.
2. `actions/src/settings.ts:6` enum role chỉ manager/sales/cs/accountant; accept trong `identity/services/invites.service.ts:72-90` chưa validate custom role. TIP042 nhận cả invite/set_role/accept/undo, tránh chỉ sửa ma trận.
3. `apps/api/test/integration/authz.test.ts:116-124` ghi delegations trực tiếp DB rồi GET me/authz: chứng minh resolver đọc, **không** chứng minh Owner grant/revoke qua action/UI. Hạ BP-3.5-d thành MỘT PHẦN, gán042. D35b “mặc định tắt” vẫn ĐẠT đúng phạm vi test roles, không hạ vô cớ.
4. `kernel/actions/executor.ts:133-137` tenant transaction lồng trong platform kết thúc trước platform transaction; log/outbox/idempotency ở transaction tenant tiếp theo. STD-database-tenantdb-5a hạ MỘT PHẦN,045b nhận fault/retry/reconciliation. Đây là bằng chứng cấu trúc code, chưa chạy fault injection; không khẳng định mọi handler hiện tại đã gây corruption.
5. `notify/events/notify.consumers.ts:23-26` invalidate khi event consumer chạy. TIP042 không coi TTL60s hoặc socket refresh là cơ chế bảo mật thu hồi tức thời; revision tenant bền vững và kiểm lại lần resolve là thiết kế dự kiến.
6. PRO-settings-teams từng ghi NGOÀI vì “Phòng ban” bị ẩn. D27b yêu cầu flat team P1: sửa dòng này thành CHƯA042, không mở cây phòng ban P3.
7. Product tech-stack.md có câu Owner+Member và Testcontainers cũ; TIP042 chỉ rõ D27/Blueprint và native/no-Docker ưu tiên, không theo nhầm nguồn cũ.

## Kiểm tra tài liệu
- Manifest042:62 đường dẫn duy nhất; tất cả35M tồn tại,27C chưa tồn tại (kiểm filesystem, không tạo source).
- `python -X utf8 tools/obligations/merge.py`:1.460 dòng; ĐẠT568, CHỜ-TK42, MỘT PHẦN320, CHƯA312, GIẢ118, NGOÀI34, QUY-TẮC66; gaps218.
- `git diff --check`: pass (chỉ cảnh báo CRLF→LF).
- Các lệnh test trong TIP là hướng dẫn builder **chưa chạy**. Đã kiểm script API integration, Playwright HTTP config, parity IDs settings:roles/settings:members thực sự tồn tại.
- Không có lượt rà độc lập trong checkpoint này. Q-027/Q-028 và toàn bộ phần pending vẫn mở; không báo quality gate toàn goal PASS.

## Tiếp theo
1. Viết042b từ accounts.assign_mode + inbound/contact ownership; giữ D32 agent chỉ đề xuất chuyển chủ. REQ-B11d còn assignment và SLA, chưa gán hết bằng một nhãn routing.
2. Viết042c từ scopeFilter/contact collaborator/serializer và8 bảng nghiệp vụ; không đổi snapshot doanh số. Kiểm overlap/schema file đầy đủ, không chỉ ghi “thêm team_id”.
3. Hoàn thiện045b consistency manifest, tránh vòng dependency042↔045b. Chốt Q-028 trước code policy.
4. Viết037–041,044–046 và TIP bổ sung cho gaps; hoàn thiện6 TIP cũ, rà phần chưa hết của7 nguồn, sau đó independent review.
