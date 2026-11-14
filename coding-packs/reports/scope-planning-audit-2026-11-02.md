# Câu A — record scope audit / TIP042c, 2026-11-02

**PARTIAL goal.** Khảo sát a5947eb; chỉ Markdown, không sửa source/DB/worker. Lượt trước có tiến triển (TIP042b đã commit); lượt này thêm042c và làm rõ hai bằng chứng quá rộng.

## Bằng chứng chính
1. `sales/orders/order-access.ts:17`/`contracts/contract-access.ts:17`/booking helper chỉ đọc collaborator trong relation check. D32 yêu cầu watcher đọc chứng từ của khách; gán COM-8b-2 trước đây orphan cho042c.
2. order-access và contract-access detail trả row khi owner==me trước gate none, trong khi scope SQL trả FALSE khi none. CRM accessOf cũng xét owner/cc trước gate deny. Hạ STD-authz-rbac-5a/BP-3.5-e từĐẠT sangMỘT PHẦN: test CRM không đủ chứng minh mọi endpoint/domain.
3. Inbox writableConversation gọi canSeeConversation (bao gồm watcher). LockOrder/Contract/Appointment dùng visible*; nếu chỉ thêm watcher vào visible thì mở cả write. Thêm nghĩa vụ COM-8b-2-write và AC3 tách policy read/write. Đây là phân tích source, chưa chạy exploit/integration reproduction.
4. Team có hai cách hiểu khi owner thuộc nhiều nhóm: code teamUserIds so với team_id trong Blueprint. Đã hỏi Q-029; TIP gate không được OR hai cách để rộng quyền rồi coi migration tương thích.
5. FieldsForRole tồn tại nhưng contact-view/contact360/calendar-read trả custom nguyên trạng; contacts.repo cf filter không kiểm quyền field. Giữ045b chủ field-level;042c không tự claim hoàn tất field-level bằng row-scope.

## TIP và ranh giới
- TIP042c:69 file (56M/13C),8 AC, module policy riêng, create/import/revision paths, read/write callers, schema8 bảng, tests real DB/HTTP/realtime/live AI.
- Một M dự kiến `crm/routing/routing.handlers.ts` do042b tạo trước. Các M còn lại tồn tại; C chưa tồn tại.
- Q-029 chặn phần team/backfill; watcher/read-write chuẩn D32 rõ, vẫn lập kế hoạch được. Q-027/Q-028 không phải lý do ngừng các domain khác.
- Graph/DC-239 cập nhật:042c sau042/042b/045b, field-level vẫn045b rồi retest tích hợp, không vòng dependency ngược.
- File-overlap hai chiều với các TIP đã có manifest; các TIP cũ chưa đủ manifest/future023b callers cần kiểm lại, không claim toàn batch parallel-safe.

## Kiểm tài liệu / còn thiếu
- Manifest path/type/unique; COVERAGE sáu cột/ID unique; merge.py và diff check. Runtime tests trong TIP là lệnh builder, chưa chạy ở lượt docs.
- Sổ1.462 dòng,217 orphan gaps; giảm1 nhờ COM-8b-2 có TIP nhận. Hai dòng mới ghi nghĩa vụ watcher-write vàQ-029, không đánh ĐẠT bằng văn bản.
- Chưa independent review;037–041/044–046 và các bổ sung còn phải viết,6 TIP cũ cần hoàn thiện; mục chưa rà hết7 nguồn vẫn còn. Không hoàn thành goal.

## Tiếp theo
Chuyển sang037 marketing để phủ domain chưa có TIP thay vì đứng chờ Q-029. Trước chốt batch cần rà lại042b/042c với manifest chính xác của023b/030b/032b/045b; audit pending ownership cho CHỜ-TK và nghĩa vụ chỉ trỏ TIP DONE, không chỉ nhìn số217.
