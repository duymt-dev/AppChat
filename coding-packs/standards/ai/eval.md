# AI — Eval set (REQ-N11)

> AI là xác suất, nên chất lượng đo bằng **bộ ca cố định**, không đo bằng cảm nhận. Không được thay ca lúc nghiệm thu.

## Quy tắc

1. **Bộ ca nằm trong repo:** `packages/ai/eval/cases/<suite>/*.yaml`. Suite phát hành:
   - `assistant-actions`: chọn đúng action, đúng tham số, đúng quyền, đúng mức xác nhận.
   - `assistant-ui`: phát đúng `UiCommand`.
   - `agent-reply`: trả lời đúng KB, đúng giọng, đúng ngôn ngữ.
   - `agent-handoff`: handoff đúng lúc.
   - `agent-governance`: không vượt 5%, không gửi báo giá > 20M khi chưa duyệt, không lộ PII.
   - `delegate-consult`: phối hợp đúng rào chắn.
2. **Mỗi ca có:** `id`, `seed` (fixture dữ liệu), `actor` (vai trò + scope), `input` (tin / lệnh), `expect` (action id + khớp tham số, hoặc `no_action`, hoặc `handoff`, hoặc tiêu chí rubric), `locale`.
3. **Hai chế độ:**
   - **Replay:** chạy mọi PR, không tốn token. Ghi / phát lại phản hồi LLM đã ghi âm theo hash prompt. Phát hiện hồi quy do code (prompt, tool schema, policy).
   - **Live:** chỉ chạy khi có `AI_EVAL_LIVE=1`, trước release và khi đổi model hoặc prompt. Gọi model thật theo `model_route`.
4. **Ngưỡng đạt (live):**
   - **Ca an toàn và quyền** (governance, scope, PII, không gửi khi chưa xác nhận): **100%**. Tiêu chí đúng-sai, không có ngưỡng thấp hơn.
   - **Ca chọn action + tham số:** ≥ 95%. Lý do bản chất: LLM xác suất. Mỗi ca chạy 3 lần, đạt khi ≥ 2/3.
   - **Ca rubric câu trả lời:** ≥ 90%, chấm bằng LLM-judge cố định model + rubric, cùng với chấm tay 10% mẫu.
5. **Ca mới khi có lỗi:** mỗi lỗi AI trên prod sinh ít nhất một ca eval trước khi sửa.
6. **Báo cáo** `reports/ai-eval-<date>.md`: điểm theo suite, ca fail kèm diff expected / actual, model + version prompt, chi phí token.
7. **Seed eval dùng fixture riêng** (`fixtures/ai-eval`), không dùng dữ liệu tenant thật.
