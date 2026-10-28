# Events — Transactional outbox

## Quy tắc

1. **Event chỉ phát qua outbox.**
   - Insert `outbox_event` (DB tenant) **trong cùng transaction** với thay đổi nghiệp vụ.
   - Sau commit: `SADD outbox:dirty <workspaceId>`.
   - Cấm `queue.add()` hay emit WS trực tiếp từ handler nghiệp vụ.
2. **Relay** (`worker` ROLE=jobs):
   - Drain các workspace trong `outbox:dirty` → publish sang BullMQ queue `events` → đánh dấu `published`.
   - Sweep toàn bộ DB tenant mỗi 10 phút làm lưới an toàn.
   - Lỗi thì retry back-off `2^n`, tối đa 8 lần, rồi `failed` + cảnh báo.
3. **Tên event `<entity>.<past_tense>`** (`order.completed`), khai trong `packages/shared/src/events.ts` với zod payload.
   - Payload luôn có `ws`, `id` của entity chính và `occurred_at`. Không nhét cả bản ghi lớn vào payload; consumer tự đọc lại.
4. **Consumer phải idempotent:** khoá `(event_id, consumer)` trong `event_consumption` hoặc kiểm trạng thái đích.
   - Ví dụ: loyalty earn kiểm `loyalty_txn` unique `(order_id, 'earn')`.
5. **Consumer chạy qua Action** khi có thay đổi nghiệp vụ (`source='system'`), để được log, quyền và outbox tiếp theo. Chỉ phần chiếu dữ liệu nội bộ (counter, stats) được ghi thẳng.
6. **Thứ tự:** chỉ đảm bảo theo từng entity (job id / group theo `entity_id`). Consumer không được giả định thứ tự giữa các entity khác nhau.
7. **Outbox gửi tin** (`outbox_message`) tách khỏi `outbox_event`: có rate limiter riêng cho từng kênh, trạng thái `pending|sending|sent|failed|dead`.
8. **Realtime WS** là một consumer của `events`: map event → room `ws:{id}` / `user:{id}` / `conv:{id}`, và lọc theo quyền người nhận trước khi emit.
9. **Thêm event mới:**
   - khai schema;
   - thêm vào bảng Blueprint §2.3;
   - test "action X phát event Y với payload Z".
