# Rà kế hoạch lifecycle workspace — 2026-11-02

## Phạm vi và trạng thái

Chỉ tài liệu, chưa chạy archive/restore/delete, chưa thay dịch vụ hoặc DB demo.
TIP041 hiện có 78 đường dẫn manifest duy nhất và 8 nhóm AC (mở rộng sau review); không đồng nghĩa ready-to-build của toàn graph hoặc đã nghiệm thu.

## Bằng chứng hiện trạng

- `packages/db/src/provisioner.ts:27–65`: provision/drop, chưa có dump và restore protocol.
- `packages/core/src/identity/jobs/tenant-provision.processor.ts:37–55`: cần guard archived/restoring để không provision DB rỗng rồi đánh active.
- `packages/core/src/identity/services/sessions.service.ts:36–39`: lastLoginAt chỉ thuộc user; không đủ đại diện activity từng workspace.
- `packages/core/src/kernel/actions/executor.ts:150–172`: action log và outbox trong transaction; chưa có generic activity event. Manifest thêm helper riêng, không import ngược identity domain vào kernel.
- `packages/core/src/kernel/events/consumer.ts:10–29`: consumer hiện nhận TenantDb; platform receipt cần045b bridge, không giả transaction xuyên DB.
- `apps/api/src/http/identity/session.controller.ts:40–66`: GET session; không biến GET thành thao tác restore. Gọi action workspace.open từ OnboardingGate sau xác thực.
- `packages/core/src/inbox/services/pipeline.ts:148`: message.received đã tồn tại. Consumer phải dùng timestamp gốc, không thời gian retry.

## Lỗ hổng đã đưa vào kế hoạch

1. Khoá generation/CAS, quiesce/drain và kiểm activity lần cuối trước archive; bỏ qua khi bridge backlog không rõ.
2. Stream mã hoá, checksum readback, manifest durable và kiểm catalog trước DROP; negative guard DB platform/template.
3. Crash sau DROP không được rollback status active giả; recovery dựa manifest.
4. Restore DB rỗng đúng đích, migrate và kiểm integrity trước ready; chống job provision tranh chấp.
5. Owner không nhận raw dump; freeze request admin; xoá xác thực lại và backup30 ngày. DC245 ghi rõ đây là đề xuất kỹ thuật theo uỷ quyền.
6. Dispatcher tenant queue duy nhất, không worker bỏ qua job khác rồi ACK thành công.
7. API/module/shared DTO/i18n và activity helper/consumer có exact path; overlap metadata cập nhật hai chiều trước mở rộng manifest.

## Kiểm tra và phần còn lại

- Manifest path existence/uniqueness và whitespace được kiểm ở pha docs; lệnh runtime trong TIP là hướng dẫn cho builder, chưa chạy.
- Các manifest cũ chưa đủ nên kết quả overlap hiện tại chỉ là tạm thời; toàn graph cần kiểm lại sau khi hoàn thiện sáu TIP cũ.
- Còn final independent review TIP041 và toàn bộ goal; không dùng report này thay review đó.
- Những chuỗi văn bản dính từ trong bản nháp TIP cần biên tập ở lượt chất lượng cuối; không được đánh whole-goal hoàn thành trước khi bàn giao đọc rõ.

## Review độc lập cục bộ và sửa tài liệu

Reviewer `/root/audit_blueprint_remainder` phát hiện 3 HIGH và4 MEDIUM; không chạy runtime.

| Finding | Sửa trong TIP041 | Bằng chứng cần khi build |
|---|---|---|
| HIGH member restore vẫn mở tenant qua AuthzResolver | Task3 capability member-only, allowlist và6 path actor/controller/context | HTTP với DB đã DROP; không mở resolver; action khác không dùng được capability |
| HIGH stale worker có thể DROP sau lease takeover | Task2 dedicated session advisory lock, destructive SQL trên chính connection giữ lock | Native fault test stale worker sau takeover, không DROP generation mới |
| HIGH step-up thiếu binding/replay | Task4 challenge riêng5 phút, hash preview/version/actor/workspace, atomic consume | OTP login/cross-workspace/expired/replay/changed-preview bị chặn |
| MEDIUM nhiều archive generation còn indefinite sau delete | Task4 chuyển retention mọi generation và reference, ngoại lệ hold có audit | Multi-generation + shared object + hold + expired purge |
| MEDIUM warning/ready thiếu delivery wiring | Task5 platform delivery receipt, MAIL_PROVIDER, catalog/locale/rules, polling fallback | Provider accepted/in-app persisted, fail/retry; không mở tenant khi DB vắng |
| MEDIUM freeze request không ai nhận | Task4 request state machine + admin list/decide + panel | Durable request, suspend ack mới approve, retry/reject/revoke |
| MEDIUM041 phụ thuộc thiết kế045 ngược | Encryption/keyring contract ở041/045b;045 chỉ deployment | Kiểm graph và integration contract |

Đã gửi reviewer kiểm lại sau sửa. Đây là trạng thái “đã sửa tài liệu, chờ tái kiểm”, không tự đóng finding chỉ vì đã viết giải pháp. M future `AdminScreen.tsx` thuộc prerequisite040 được khai rõ; không tính là đường dẫn hiện có.

Vòng2 reviewer xác nhận5/7 finding đã xử lý ở mức kế hoạch. Hai residual đã sửa tiếp: lock/DROP đặt trên target-cluster maintenance connection chuẩn (không mặc định platform cluster); MailProviderModule riêng được cả IdentityModule/LifecycleModule import, kèm boot test API/jobs. AC06 bỏ từ adminallowed mơ hồ: workspace.delete chỉ exact Owner, không suy diễn quyền xoá từ platform-admin. Chưa có xác nhận reviewer vòng3 tại thời điểm ghi dòng này.
