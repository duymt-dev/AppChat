# Domain — Đồng thời & tính nhất quán

> Nhiều người, Trợ lý, agent, job và webhook cùng ghi một bản ghi. Standard này quy định cách chặn ghi đè và trừ đôi.

## Quy tắc

1. **Khoá lạc quan cho bản ghi người sửa bằng form.**
   - Bảng `contact`, `product`, `quote`, `contract`, `order`, `invoice`, `appointment`, `ticket`, `campaign`, `ai_agent`, `doc_template`, `profile_layout` có cột `version int not null default 1`, tăng mỗi lần ghi.
   - Action sửa (`*.update`, `*.set_*`) nhận `if_version?`; có mà lệch → `AppError('STALE_VERSION', 409)`. FE gửi `if_version` từ bản đang mở; nhận 409 thì hiện "Bản ghi vừa được người khác cập nhật" + nút Tải lại (giữ dữ liệu đang nhập).
   - Output của GET / action trả `version`.
2. **Chuyển trạng thái là compare-and-set:** `UPDATE … SET status = $to WHERE id = $id AND status = $from` (+ `version = version + 1`); 0 dòng → `INVALID_TRANSITION` 409. Không đọc rồi ghi ở hai câu tách rời.
3. **Tiền, kho, điểm, credit, buổi liệu trình** — ghi trong transaction với khoá dòng:
   - `SELECT … FOR UPDATE` trên bản ghi gốc (đơn, ví, gói) trước khi tính.
   - Sổ cái chỉ thêm (`stock_movement`, `credit_ledger`, `loyalty_txn`, `package_usage`, `customer_payment`); số dư là tổng hoặc cột cache cập nhật cùng transaction, có `CHECK (>= 0)` khi nghiệp vụ không cho âm.
   - Unique chống trừ đôi: `loyalty_txn(order_id, kind)`, `package_usage(appointment_id)`, `customer_payment(bank_txn_id)`, `stock_movement(ref_type, ref_id, product_id)`.
4. **Idempotency theo nguồn:**
   - UI / Trợ lý: header `Idempotency-Key` (`api/response-envelope.md` §7).
   - Webhook: khoá `(provider, external_id)` unique.
   - Job / consumer: khoá `(event_id, consumer)` (`events/outbox.md` §4) hoặc compare-and-set trạng thái.
5. **Cuộc đua người – agent trong hội thoại:**
   - Người gửi tin khi `ai_mode = auto` → hội thoại chuyển `copilot` cho người đó trong cùng transaction; run agent đang chạy kiểm `ai_mode` trước bước gửi và huỷ bản nháp nếu đã đổi.
   - Một hội thoại chỉ có một run agent `running` (khoá Redis `conv:{id}:run`, TTL theo timeout run).
6. **Cuộc đua người – job hết hạn:** khách chấp nhận báo giá đúng lúc job `expired` chạy → ai compare-and-set trước thắng; bên thua nhận 409 và đọc lại. Thời điểm chuẩn là `Clock` của server, không phải giờ client.
7. **Thao tác hàng loạt** (`bulk`) xử lý từng bản ghi độc lập, kết quả trả theo từng id (`ok | error.code`); không một bản lỗi làm hỏng cả lô. Lô > 50 bản ghi chạy job, trả 202 + id job.
8. **Lịch hẹn** chống trùng bằng ràng buộc `EXCLUDE USING gist` (Blueprint §2.2), không bằng kiểm tra ở app; vi phạm → `SLOT_TAKEN` 409.
9. **Realtime không phải nguồn sự thật:** FE nhận event chỉ invalidate / patch cache; xung đột luôn do server quyết theo §1–§2.

## Test bắt buộc

- Hai request song song cùng `if_version` → một 200, một `STALE_VERSION`.
- Hai request chuyển trạng thái song song → một thành công, một `INVALID_TRANSITION`.
- Webhook gửi lặp → một khoản thu.
- Trừ kho / điểm / buổi song song → không âm, không trừ đôi (chạy trên Postgres thật).
