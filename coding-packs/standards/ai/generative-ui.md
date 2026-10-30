# AI — Generative UI (giao diện do Trợ lý ghép)

> Chốt D55 (2026-10-30). Áp cho drawer "Trợ lý AI · [module]" (8 màn) và màn Trợ lý đầy đủ. Mức 2: LLM **ghép cây giao diện từ khối dựng sẵn**, không viết HTML / JS / CSS.

## Quy tắc

1. **LLM chỉ trả JSON theo schema** `UiTree` (zod, `packages/shared/src/genui/schema.ts`), qua `generateObject` / `streamObject` của AI SDK.
   - Không HTML, không JS, không CSS, không URL ảnh tuỳ ý, không màu / px tuỳ ý.
   - Schema không hợp lệ → thử lại 1 lần với lỗi zod trong prompt; vẫn sai → hiện khối `text` báo lỗi + nút Thử lại. Không bao giờ render nửa vời.
2. **Danh mục khối đóng** (whitelist). Thêm khối mới = sửa schema + renderer + test, không cho model tự đặt tên khối.
   - Bố cục: `stack` (dọc), `row` (ngang, tự xuống dòng trên mobile), `section` (tiêu đề + con).
   - Hiển thị: `text`, `stat` (số + nhãn + so sánh), `stat_group`, `table` (cột + dòng, tối đa 20 dòng, dòng bấm được = `UiCommand open`), `list`, `progress`, `badge`, `chart` (`column` | `line` | `funnel`, `@ant-design/charts` lazy).
   - Hành động: `button`, `button_group`, `form` (xem mục 5).
   - Màu chỉ được chọn **tone ngữ nghĩa** (`default | brand | success | warning | danger | info`), renderer map sang token `packages/ui/theme.ts`.
3. **Số liệu không do LLM viết ra.** Mọi giá trị trong `stat`, `table`, `chart`, `progress` phải là **tham chiếu** tới kết quả `query_data` (`insight.query`) hoặc action đọc đã chạy trong run: `{ "$ref": "step:3.rows" }`. Renderer lấy dữ liệu thật từ `ai_run_step.output`; ref không tồn tại → khối hiện "Không có dữ liệu".
   - LLM chỉ viết chữ diễn giải, tiêu đề, nhãn, thứ tự bố cục.
   - Tiền / ngày / số định dạng ở renderer bằng `fmt.money / date / number` (khai báo `format` trong cột / stat), không để model định dạng.
4. **Nút chỉ có 2 loại:**
   - `ui`: một `UiCommand` (`navigate | open | prefill | filter | highlight`). Chạy ngay, không đổi dữ liệu.
   - `action`: `{ action_id, input }` → đi qua `ActionExecutor` như mọi nguồn khác: kiểm quyền người đang xem, risk ≠ read thì hiện thẻ xem trước (diff, số bản ghi), bulk bắt buộc xác nhận số lượng, có undo theo action (REQ-E03, E09). Renderer **ẩn** nút có `action_id` không tồn tại hoặc người xem không có quyền (`useCan`).
5. **Form trong giao diện (`form`)** — để người dùng sửa nhanh rồi gửi ngay trong drawer:
   - Bắt buộc gắn `action_id`; trường form **sinh từ input schema zod của action** (renderer tự dựng ô theo kiểu), LLM chỉ chọn **tập trường hiện ra + giá trị điền sẵn + nhãn diễn giải**. Không có form "tự do" không gắn action.
   - Giá trị điền sẵn được validate bằng chính schema action trước khi hiện; trường sai bị bỏ trống kèm cảnh báo.
   - Bấm gửi = `useAction(action_id).run(values)` → đúng luồng xác nhận / undo như mục 4. Form dài hoặc nhiều bước thì dùng `ui: prefill` mở form đầy đủ của màn thay vì dựng trong drawer.
6. **Chữ theo locale người dùng** (ngoại lệ có chủ đích của `i18n/i18n.md`): prompt nhận `user.locale`, LLM viết tiêu đề / diễn giải / nhãn đúng ngôn ngữ đó. Nhãn hệ thống (Xác nhận, Huỷ, Thử lại, Không có dữ liệu, trạng thái tải) và định dạng số vẫn qua i18n / `fmt`. Nội dung LLM là **văn bản thuần**: renderer không diễn giải markdown / HTML (chỉ `**đậm**` qua parser an toàn, không link tuỳ ý).
7. **Nội dung không tin cậy:** dữ liệu khách (tin nhắn, ghi chú, email) có thể chứa câu lệnh. Rào chắn: (a) mục 3 — số liệu chỉ từ ref; (b) mục 4–5 — mọi ghi qua Executor + xác nhận; (c) renderer không có đường gọi API ngoài action / UiCommand; (d) eval suite `genui` có ca tiêm lệnh qua dữ liệu khách.
8. **Giới hạn để không vỡ bố cục:** độ sâu cây ≤ 4, tối đa 30 khối, `table` ≤ 6 cột × 20 dòng, `chart` ≤ 24 điểm, `button_group` ≤ 4 nút. Vượt → renderer cắt và thêm nút "Xem đầy đủ" (`UiCommand filter` / `navigate`). Mobile 390: `row` tự xếp dọc, `table` cuộn ngang trong khối, không tràn màn.
9. **Nút "Phân tích nhanh" của drawer** vẫn là danh sách cố định theo màn (không do LLM chọn), mỗi nút = một prompt + metric gợi ý; kết quả do LLM ghép theo các quy tắc trên. Ô chat tự do: LLM tự chọn metric / action đọc + bố cục.
10. **Lưu và phát lại:** cây giao diện lưu trong `assistant_message.content.parts[]` (`{ type: 'ui', tree, run_id }`), mở lại phiên thì render lại từ dữ liệu bước đã lưu (không gọi lại LLM). Stream: render dần theo `streamObject`, khối chưa đủ dữ liệu hiện skeleton.
11. **Kiểm thử:**
    - Unit: schema (khối hợp lệ / bị chặn), renderer từng khối, map tone → token, ẩn nút không quyền, form validate theo schema action.
    - Fixture: mỗi drawer có ≥ 3 cây mẫu trong `fixtures/prototype-parity/<module>.json` → `genui[]` để FE mock và parity.
    - e2e: bấm "Phân tích nhanh" → khối hiện đủ; nút `ui` đổi màn đúng; nút / form `action` ra thẻ xác nhận.
    - Eval `genui` (`ai/eval.md`): schema hợp lệ ≥ 95%, mỗi ca 3 lần đạt ≥ 2/3 (cùng ngưỡng ca chọn action của `ai/eval.md` §4 — lý do bản chất: LLM xác suất; khối bị loại vẫn có đường lỗi an toàn ở §1); **an toàn 100%**: không số liệu ngoài ref, không nút ghi bỏ qua xác nhận, ca tiêm lệnh không tạo hành động.
