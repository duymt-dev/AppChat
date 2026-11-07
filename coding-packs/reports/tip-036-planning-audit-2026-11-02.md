# Lượt viết TIP-036 — nghiên cứu và kiểm tài liệu

**PARTIAL, chưa phải completion của TIP code hay câu A.** Code khảo sát `fba7c2b`.

## Kết quả
- Tạo `tips/TIP-036-loyalty.md`: manifest 63 file, context code thật,
  nghĩa vụ nhận theo ID, preflight, task theo schema/ledger/payment/API/UI,
  10 AC, lệnh test, constraints và builder checklist.
- Đọc COMMERCE-DECISIONS toàn bộ; đối chiếu Blueprint loyalty/events/API,
  DC-186, ActionDef loyalty, stub Prisma/module/API, order complete/undo,
  payment-write/refunds, CRM 360, reply context, FE API/types/tabs và test config.
- Phát hiện undo complete chưa có reversal ledger; flag earn marketplace nằm ở
  connector khác nguồn cấu hình loyalty; rates dùng hằng số; payment helper chưa
  nhận points. TASK 2–3 nhận các điểm này, không chỉ thêm route đọc mock.
- Sửa STD-api-envelope-2b từ ĐẠT thành MỘT PHẦN: test 7 domain chưa chứng minh
  đủ 9 bảng; loyalty và marketing còn stub. Không sửa code để làm sổ xanh.
- Thêm report bổ sung cho 031/032; cập nhật task graph, bỏ câu D57 viết TIP sát
  thi công đã bị DC-233 đảo; ghi DC-234 về thứ tự tích hợp và metadata chia sẻ file.

## Kiểm đã chạy
- Manifest: **63 đường dẫn duy nhất**; mọi M tồn tại trừ
  `tools/ai-live/cases.yaml` đã ghi rõ do TIP-023b tạo trước; mọi C chưa tồn tại.
- Đã bắt và sửa nhầm đường i18n: code thực là `apps/web/messages`, không phải
  cây `src/messages` trong sơ đồ tài liệu. Contract test đặt dưới
  `apps/api/test/integration/` để runner thực `vitest.integration.config.ts` collect.
- Header/Context/Standards/Task/AC/Constraints/Checklist có mặt; đây chỉ là
  kiểm cấu trúc, **không chứng minh đủ nghiệp vụ**.
- 1.459 ID COVERAGE duy nhất; tất cả bảng nguồn sáu cột; merge UTF-8 thành công.
  Còn **223 lỗ hổng theo bộ đếm**, chưa audit toàn bộ chủ TIP chờ.
- `git diff --check` sạch. Không chạy test sản phẩm ở lượt chỉ viết Markdown;
  không migration, không sửa dữ liệu/dịch vụ, không gọi model thật.

## Gate còn thiếu
- Q-027 đã hỏi Chủ nhà: đảo điểm đã dùng hết, hoàn lô quá hạn, căn cứ earn khi
  completed chưa thu đủ. Đây là luật tiền, không tự quyết theo nguyên tắc kỹ thuật.
- Sáu TIP chờ cũ mới thêm quan hệ tuần tự liên quan 036, **chưa** hoàn thiện
  manifest/task/AC toàn bộ. File intersection toàn batch chưa thể PASS khi
  037–046 chưa viết; không dùng metadata mới để tuyên bố rà độc lập đã xong.
- Tiếp theo viết 037–046 và TIP bổ sung, tiếp tục các phần “chưa rà hết”, rồi
  rà độc lập toàn bộ COVERAGE ↔ code ↔ TIP; không bắt đầu code.
