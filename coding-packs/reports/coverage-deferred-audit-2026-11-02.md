# Rà tiếp COVERAGE — phần mục hoãn, 2026-11-02

**Trạng thái: PARTIAL — chưa hoàn thành câu giao việc A.**
Mốc code kiểm tra: `8a3fd96` trên `dev`. Chỉ sửa tài liệu; không chạy provider thật,
không thay đổi dữ liệu Postgres, không dừng worker demo. Đây là lượt nghiên cứu của
người viết, **không thay thế lượt rà độc lập cuối cùng**.

## Bằng chứng và điều chỉnh

| ID | Đã kiểm trực tiếp | Kết luận để viết TIP |
|---|---|---|
| DEF-012-4 | `packages/integrations/src/registry.ts:13-14`, `packages/core/src/integrations/services/resolver.ts:25`, `packages/core/src/identity/identity.module.ts:54-56`, `packages/integrations/test/ports.test.ts`, `smtp.test.ts` | Adapter email nền tảng tồn tại nhưng connector workspace không có adapter trong registry. Không được dùng unit Brevo nền tảng để tuyên bố connector workspace chỉ còn thiếu tài khoản. Chuyển CHỜ-TK → MỘT PHẦN; TIP connector cần test secret riêng hai workspace và gửi qua đường nghiệp vụ. |
| DEF-017-3 | `packages/core/src/channels/webchat/widget.service.ts:103-105`, `apps/api/test/integration/webchat.test.ts`, `apps/web/src/shared/api/mock/widget-shape.test.ts` | Có đọc agent thật nhưng chỉ 50; test dẫn trước đây không kiểm danh sách DB. ĐẠT → MỘT PHẦN. Cần ca active / selected / deleted / tenant khác và giới hạn danh sách. Không tự đổi quota. |
| DEF-025-1 | `apps/web/src/features/inbox/components/Profile360Actions.tsx:42-58`, `apps/web/e2e/inbox.spec.ts:74-101`, `apps/web/e2e/http/inbox.spec.ts` | Code mở form với contact_id; E2E mock chỉ mở form, HTTP không thử chuyển thành chứng từ. ĐẠT → MỘT PHẦN; phải tạo, lưu, đọc lại đúng liên hệ/quyền qua HTTP. |
| DEF-032-3 | `apps/web/src/shared/time/today.ts:7-11` và bốn vị trí `const TODAY = todayIso()` ở form | Helper đúng ngày lúc import nhưng không cập nhật ngày khi tab sống qua nửa đêm. TIP cần fake-clock qua ngày và giữ mốc parity mock, không chỉ thêm test helper. |
| DEF-023-4 | `plans/BLUEPRINT.md:1098`, `DECISIONS.md` DC-129, `packages/core/src/ai/assistant/catalog.ts` | Embedding description + cache còn là nghĩa vụ; từ khoá là lựa chọn tạm, không phải quyết định bỏ embedding. Cần đưa rõ vào TIP-023b, gồm invalidation và kiểm quyền trước trả kết quả. |
| DEF-028-1 | `plans/BLUEPRINT.md:124,1327`, `packages/core/src/documents/jobs/documents.jobs.module.ts:5`, `packages/core/src/contracts/actions/contract-approval.handlers.ts:108-114` | Queue doc-render chưa có. DV-007 hoãn tới chứng từ, không loại khỏi phạm vi. Cần TIP tài liệu/chứng từ riêng hoặc mở rộng TIP chờ với retry/idempotency/timeout/freeze PDF. |
| DEF-027-2 | `packages/db/src/provisioner.ts:38-46`, `packages/db/src/setup.ts:100-108`, report TIP-027 | Có cấp quyền sau clone, chưa xác định nguyên nhân workspace cũ. Không tuyên bố lỗi còn tái hiện hay đã sửa. TIP cần thử clone + migrate với role tenant_app thật; không mở rộng quyền app thành superuser. |
| DEF-014-1, DEF-018-1 | `zca-transport.ts`, `imap-transport.ts` đầy đủ; `packages/core/src/channels/channels.module.ts:59-60` | Có transport SDK thật và lựa chọn env. Unit fake không thay live. Handoff nói demo Zalo đã đăng nhập: giữ nghĩa vụ nghiệm thu, không khẳng định tài khoản vẫn chưa được cấp. |

## Kiểm tra đã chạy

- `pnpm --filter @appchat/integrations test`: **5 file, 22 test passed**.
- `pnpm --filter @appchat/channels test`: **4 file, 27 test passed**.
- Lần sandbox đầu không khởi động được Vite (`spawn EPERM`); chạy lại sau cấp
  quyền ngoài sandbox thành công. Không có test sản phẩm fail trong hai lần chạy lại.
- `ports.test.ts` inject fetch giả, `smtp.test.ts` dùng JSON/stream transport;
  test Zalo/email dùng fake. Kết quả chỉ xác nhận bộ unit, không nhận webhook,
  gửi email, giao dịch ngân hàng hay nhắn Zalo thật.
- Kiểm cấu trúc 7 bảng nguồn phát hiện 3 dòng prototype chứa dấu `|` trong regex
  chưa escape. Đổi sang entity `&#124;` trong cột bằng chứng, không đổi nghĩa vụ.
- Sinh lại sổ bằng `python tools/obligations/merge.py`; không sửa tay COVERAGE.

## Việc tiếp theo (giữ nguyên toàn bộ scope câu A)

1. Hoàn tất phần còn bỏ ngỏ của từng phần: REQ-AE, decisions/commerce,
   Blueprint, prototype; phần deferred còn tái hiện DEF-027-2 / DEF-035-1.
   Không dùng trạng thái DONE cũ hay grep tên test làm bằng chứng đầy đủ.
2. Gom nghĩa vụ thiếu thành TIP bổ sung theo domain, cùng bổ sung report gốc;
   sửa sáu TIP chờ và viết đủ 036–046. Chưa gán chủ chỉ để giảm số lỗ hổng:
   mỗi chủ phải có TASK + AC nhận đúng nghĩa vụ.
3. Kiểm mọi dòng kể cả CHỜ-TK và những dòng ghi TIP DONE nhưng chưa đạt;
   số `gaps` của merge.py chỉ phát hiện CHƯA/GIẢ/MỘT PHẦN có chủ `—`,
   **không đủ** chứng minh mọi nghĩa vụ đã có TIP chờ nhận.
4. Kiểm file-intersection và khai tuần tự cho mọi cặp TIP chia sẻ file.
   Task graph hiện nói cả W8 độc lập nhưng chưa có danh sách file để chứng minh.
5. Rà độc lập COVERAGE ↔ code ↔ TIP; chỉ sau khi không còn thiếu mới chốt A.

## Quality gate hiện tại

- Đã có bằng chứng mới sửa các khẳng định quá mức ở sổ nguồn.
- Chưa có đủ TIP, chưa hết lỗ hổng, chưa rà độc lập: **không PASS / không DONE**.
- Không đổi luật COMMERCE, quyền, TIP đã DONE 001–035 hoặc code.
