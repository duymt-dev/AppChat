# TIP-030: Hợp đồng + ký điện tử — `contracts.prisma`, Owner "Duyệt & ký" (OTP email), link ký một lần, trang ký công khai, PDF có trang chứng nhận + SHA-256, nhắc gia hạn T-30, nối trang Hợp đồng

## HEADER
- TIP-ID: TIP-030
- Project: AppChat V2
- Module: `packages/db/prisma/tenant/contracts.prisma` + migration 030 · `packages/core/src/contracts/**` · `apps/api/src/http/contracts/{contracts,public-sign}.controller.ts` · `packages/shared/src/{contracts/contract-state,api/contracts,i18n/server/*/{sales,crm,notify}}.ts` · FE `apps/web/src/features/contracts/**` · mock `domains/contracts*.ts`
- Depends on: TIP-029 (báo giá đã chốt → hợp đồng, gửi vào hội thoại khách), TIP-028 (mẫu chứng từ + `DocRenderer`), TIP-020 (tệp), TIP-006 (thông báo), TIP-015 / 016 (khách, giai đoạn) — nhánh xếp chồng từ `tip/029-quotes`
- Priority: P0 · REQ: F07, F07b · Decision: D25, D42, D46, COMMERCE §9
- Estimated effort: 20 giờ

## CONTEXT
Khảo sát đầu TIP: `contracts.prisma` là stub; 14 action `contract.*` trả 501; không có `CONTRACT_FLOW` dùng chung (mock tự kiểm trạng thái, cho sửa khi chờ duyệt, gia hạn link từ `declined`). Màn Hợp đồng chạy mock đầy đủ (danh sách D42 + kanban, form, drawer 5 tab, Duyệt & ký với khung ký tay, gửi ký, trang `/sign/[token]`). OTP Duyệt & ký là hằng số, "Tải PDF" chỉ báo toast, panel CRM / tệp của drawer là dữ liệu mẫu chung.

## TASK
1. **Schema + migration 030**: `contract` (mã `HĐ-{n}`, `quote_id` unique, ngày `date`, `renew_notice_at`, PDF nội dung đóng băng `file_id` + `file_sha256`, bản đã ký `signed_file_id` + `signed_sha256`, lý do từ chối / chấm dứt), `contract_appendix`, `contract_signer` (bên DN / khách — OTP băm, hết hạn, số lần sai, ảnh chữ ký, IP, UA), `contract_signature_event` (chỉ thêm — trigger chặn sửa / xoá / truncate), `contract_sign_token` (hash, hạn, đã dùng); nền tảng `tenant_sign_route` (hash token → workspace); CHECK giá trị ≥ 0, kết thúc > bắt đầu, đã ký phải có tệp + sha, chấm dứt phải có lý do; index partial danh sách / trạng thái / phụ trách / khách / sắp hết hạn (INCLUDE) / hạn link / mã / trigram tên, index biểu thức `action_log`; timeline CRM loại `contract`.
2. **Shared**: `CONTRACT_FLOW` (ma trận test), chip gộp, hằng số link / OTP / T-30; shape `contractRowSchema`, `contractsPageSchema`, `contractsMetaSchema`, `signViewSchema`; event `contract.*`; thông báo `contract_approval` / `contract_signed` / `contract_declined` / `contract_expiring`; i18n server (tin gửi khách, OTP, trang chứng nhận, gợi ý AI).
3. **Core `contracts/`**: create / create_from_quote (báo giá phải đã chốt, không tạo trùng) / update (chỉ nháp, khách không đổi, hoàn tác) / delete (xoá mềm, hoàn tác) / renew; submit (thông báo người có `contract.sign`) / request_changes / reject_internal / approve_and_sign (OTP email + chữ ký PNG, render + đóng băng PDF nội dung trong `prepare`); send_for_signature (kiểm kênh khách trong `prepare`, link một lần 7 ngày vào hội thoại Zalo đã nhắn / email mở chuỗi mới, giai đoạn khách → Hợp đồng) / remind_signer / extend_sign_link / terminate (lý do bắt buộc); `ContractsReadService` (D42 deferred join, chi tiết, meta + theo hợp đồng, PDF, OTP Duyệt & ký); `PublicSignService` (mở / OTP qua đúng kênh / ký / từ chối / PDF, rate limit token + IP, outbox + markDirty); PDF đã ký = PDF đóng băng + trang chữ ký + chứng nhận (LibreOffice HTML → PDF, ghép `pdf-lib`), SHA-256 tệp cuối; job 15 phút trên queue riêng `contracts-scheduler` (link quá hạn → declined, T-30 nhắc một lần, quá ngày kết thúc → expired).
4. **API**: `GET /v1/contracts` (D42), `/contracts/meta?contract_id=`, `/contracts/:id`, `/contracts/:id/pdf`, `POST /contracts/:id/sign-otp`; công khai `GET /v1/public/sign/:token`, `POST /:token/{open,otp,sign,decline}`, `GET /:token/pdf`.
5. **FE**: nút drawer theo `CONTRACT_FLOW`, "Gửi mã" OTP thật, Tải PDF thật, meta theo hợp đồng, chọn báo giá khi tạo = tạo từ báo giá, từ chối có lý do, OTP trang ký báo đúng kênh; nhãn thông báo contract_* ở Cài đặt; mock cùng schema + cùng `CONTRACT_FLOW`.

## ACCEPTANCE CRITERIA
1. Integration `contracts.test.ts` (16 ca): bảng + index + EXPLAIN; tạo / sửa + hoàn tác / xoá + hoàn tác / từ báo giá; nhật ký ký chỉ thêm; trình duyệt + thông báo + quyền; Duyệt & ký (OTP sai / đúng / dùng một lần, PDF đóng băng); gửi ký Zalo (chưa nhắn → 409) / email; trang công khai (open, token sai 410, OTP vào hội thoại, sai OTP, ký → PDF cuối + SHA-256 khớp tệp, link dùng một lần); từ chối; nhắc / gia hạn link; quét (link quá hạn, T-30 một lần, expired); renew; terminate; scope sales / cs / kế toán; D42 + meta.
2. Unit core `contracts-unit.test.ts` (token, OTP, che đích, trang chứng nhận escape, ghép PDF) + shared `contract-state.test.ts` + mock shape `contracts-shape.test.ts`.
3. E2E http `contracts.spec.ts`: kết nối email → khách → tạo → trình duyệt → Duyệt & ký (OTP email thật) → gửi ký Email → khách mở link (không đăng nhập) → OTP trong hội thoại → ký → chứng nhận + SHA-256 → nội bộ Đã ký + Tải PDF.
4. E2E mock `contracts` xanh + parity `contracts:*` < 5%.

## CONSTRAINTS
- COMMERCE §9 không đổi: Owner ký trước, khách ký sau qua link một lần 7 ngày + OTP; sau khi ký khoá nội dung; chấm dứt cần lý do; gia hạn = hợp đồng mới; nhắc trước 30 ngày.
- Bản ký là chứng từ: PDF nội dung đóng băng lúc Duyệt & ký; SHA-256 tính trên tệp cuối; nhật ký ký chỉ thêm.
- Zalo cá nhân không nhắn chủ động: chỉ gửi vào hội thoại khách đã nhắn.
- Hợp đồng → đơn hàng ở TIP-031.
- Phụ lục (`contract.create_appendix`) và AI soạn nháp hợp đồng (`contract.draft_from_content`): registry / prototype / FE chưa có → chỉ dựng bảng `contract_appendix` + cột `appendix_id`; action + màn chờ Q-022 (DV-010).
