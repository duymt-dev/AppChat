# Domain — Tự hoàn thiện khi tài liệu im lặng

> Thiết kế (prototype, Blueprint, COMMERCE) không thể nói hết mọi nút, mọi trạng thái, mọi ca biên. Standard này quy định **thợ tự quyết thế nào** để sản phẩm "bấm hết vẫn đúng", mà không đoán mỗi TIP một kiểu và không dừng hỏi từng chỗ.
> Đi cùng: `domain/state-machine.md` · `domain/concurrency.md` · `domain/money-time-numbering.md` · `domain/validation-defaults.md` · `ops/observability-security.md` · `ui/interaction-patterns.md`.

## 1. Thang tra cứu (dừng ở bậc đầu tiên trả lời được)

1. `plans/COMMERCE-DECISIONS.md` — luật commerce đã chốt (không được đổi).
2. `01-REQUIREMENTS-MATRIX.md` → Decisions D01–D51 + REQ của TIP.
3. `plans/BLUEPRINT.md` — entity, action, endpoint, event.
4. `standards/domain/*` + `standards/ui/interaction-patterns.md` — **mặc định của hệ thống** (file này và các file cùng thư mục).
5. `docs/03-module-specs/*`, `docs/04-wireframes/*`, `docs/01-requirements/SRS-v4.0.html` — chi tiết nghiệp vụ cũ; chỉ dùng phần **không mâu thuẫn** với bậc 1–4 và không thuộc mục OUT (Call Center, Workflow, Báo cáo, ZNS / SMS, kênh chưa có manifest).
6. Prototype (`AppChat.dc.html`, logic trong `renderVals()` và `class Component`) — hành vi suy ra từ code prototype.
7. Không bậc nào trả lời → **giả định an toàn** (§3) nếu thuộc loại được tự quyết (§2); ngược lại escalation L2.

## 2. Được tự quyết / phải hỏi

| Được tự quyết (ghi "Giả định đã chọn") | Phải escalation L2 |
|---|---|
| Ca biên, validate, thông báo lỗi, giá trị mặc định trong khung của `validation-defaults.md` | Thêm / bỏ trạng thái của entity, đổi chuyển trạng thái đã có trong bảng |
| Trạng thái UI không vẽ (`interaction-patterns.md` IP-5) | Luật tiền, thuế, điểm, ngưỡng duyệt, thời hạn pháp lý |
| Thứ tự sắp xếp, cột hiển thị phụ, phân trang | Quyền: thêm permission, đổi vai trò mặc định, đổi data scope |
| Tên field nội bộ, cấu trúc service / repo | Hành vi gửi ra ngoài (khách nhận gì, khi nào) chưa có trong thiết kế |
| Index, câu SQL, cache | Thêm bảng / cột ngoài file Prisma của TIP; sửa action của TIP khác |
| Mã lỗi mới trong domain của TIP | Thêm thư viện ngoài tech stack |

## 3. Giả định an toàn (khi buộc phải chọn)

- **Hẹp hơn thay vì rộng hơn:** ít quyền hơn, ít dữ liệu trả về hơn, không tự gửi ra ngoài.
- **Có người duyệt thay vì tự động** với mọi thứ chạm khách, tiền, kho, hợp đồng.
- **Đảo ngược được:** xoá mềm, có `undo`, có action bù.
- **Một nguồn sự thật:** dùng lại enum / hàm / bảng trạng thái đã có, không tạo bản thứ hai (ví dụ D49 dùng `contact.stage`).
- **Không nút chết:** mọi nút / mục menu gọi đúng một action, một read hoặc một `UiCommand`; chưa làm được thì "Sắp có" có mã quyết định, hoặc ẩn. Không toast giả, không `TODO` trong handler.

## 4. Luật nghiệp vụ là hàm thuần dùng chung

- Mọi tính toán / kiểm tra nghiệp vụ (tổng tiền, thuế, ngưỡng duyệt, slot, chuyển trạng thái, chuẩn hoá SĐT, khớp mã chuyển khoản, cộng / đổi điểm…) là **hàm thuần** trong `packages/shared/src/<domain>/`, có test riêng (`*.test.ts`).
- **Mock FE (`apps/web/src/shared/api/mock`) và handler BE gọi cùng hàm**, không viết lại. Đã có: `commerce/quote-math.ts`, `commerce/vietqr.ts`, `booking/slots.ts`, `documents/variables.ts`, `authz/roles.ts`.
- Phát hiện mock FE có luật viết inline → chuyển vào `packages/shared` trong TIP backend của domain đó (đây là phần được phép sửa ngoài `Files touched`, ghi vào report).

## 5. Contract đã có thắng code mới

FE (goal `fe-prototype` + ver2.1) đã dựng xong bằng mock. Với TIP backend:

1. **Action đã có trong `packages/actions`** → cài handler đúng `input` / `output` zod đó. Muốn đổi schema → escalation L2 (đổi schema là đổi contract FE).
2. **Shape đọc** → `packages/shared/src/api/<domain>.ts` (zod). Chưa có thì TIP backend **tách từ mock + `features/<module>/types.ts`** ra file này trước, rồi FE và BE cùng import.
3. **Harness contract** (`apps/api/test/contract/<domain>.contract.test.ts`): cùng request chạy qua mock transport và HTTP, parse bằng cùng zod; lệch là fail. Bật `NEXT_PUBLIC_API_MODE=http` cho module chỉ khi harness xanh.
4. Mock trả dữ liệu hoặc hành vi mà Blueprint không có → không tự hợp thức hoá; ghi vào report để Chủ thầu chốt bên nào đúng.

## 6. Ghi lại quyết định

Completion Report có mục **"Giả định đã chọn"**, mỗi dòng: chỗ trống · bậc tra cứu đã dừng (§1) · lựa chọn · lý do (§3) · đảo ngược thế nào. Chủ thầu duyệt lúc verify; giả định được chấp nhận và có tính chung thì Chủ thầu bổ sung vào standard tương ứng (không để mỗi TIP chọn lại).
