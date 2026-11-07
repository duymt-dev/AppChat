# TIP-004c — Brevo: webhook bounce / complaint cho email nền tảng

## HEADER
- TIP-ID: TIP-004c; Project: AppChat V2; Module: platform mail; Priority: P1; Estimated: S. TIP bổ sung cho TIP-004 (đã DONE, không sửa file gốc — DC-233).
- Depends on: 012c (sự kiện delivery tenant mail), 045b (webhook verify) đã tích hợp; trước 044/045/046.
- **Files touched:** [exact M/C manifest](manifests/TIP-004c-files.md) — 7 paths (4 C). M path tương lai phải do TIP tạo trước tích hợp xong.
- **Parallel-safe with:** tuần tự với mọi TIP chung file (dòng khai hai phía bên dưới, máy kiểm `python -X utf8 tools/obligations/manifests.py --order`).
- **Parallel-safe with TIP-004b (coverage-closure manifest):** sequential, shares `packages/core/src/identity/services/auth.service.ts`; integrate 004b before004c.
- **Parallel-safe with TIP-041 (coverage-closure manifest):** sequential, shares `apps/api/src/http/identity/identity.http.module.ts`; integrate 041 before004c.
- **Dòng COVERAGE nhận:** BP-8-b.

## CONTEXT
- Hiện trạng đối chiếu mã 2026-11-02 (file:dòng, không tin trạng thái DONE):
  - `packages/integrations/src/connectors/brevo/mail.ts` gửi (CHỜ-TK Q-004); không có endpoint webhook bounce/complaint cho mail **nền tảng** (OTP, mời, hoá đơn gói). 012c chỉ làm delivery facts cho mail của workspace.

## APPLICABLE STANDARDS
- integrations/provider-ports.md; ops/observability-security.md (xác thực webhook, không log PII); Blueprint §8.
- Không đổi luật COMMERCE, 5 vai trò, quyền đã chốt, đơn giá Credit. Quyết định mới → DECISIONS (DC), câu hỏi → QUESTIONS.

## Rà trước khi làm
1. Đọc lại mọi file trong manifest sau khi TIP phụ thuộc đã tích hợp; lệch CONTEXT → sửa TIP/manifest trước khi code.
2. `python -X utf8 tools/obligations/manifests.py 004c` tính lại giao file; thêm path thì cập nhật manifest + header hai phía.
3. Đọc 012c delivery-fact model; dùng chung kiểu sự kiện, chỉ khác phạm vi platform.

## TASK
Nhận webhook Brevo (hard_bounce, spam/complaint, blocked) cho mail nền tảng, ghi danh sách chặn, không gửi tiếp tới địa chỉ đó, báo người dùng ở màn đăng nhập/mời.

## SPECIFICATIONS
### 1. Webhook
1. `POST /hooks/mail/brevo` xác thực token/IP allowlist theo cấu hình 045b; idempotent theo message-id + event.
2. Bảng platform `mail_suppression(email_hash, reason, at)`; gửi OTP/mời tới địa chỉ bị chặn → lỗi rõ `MAIL_SUPPRESSED`, gợi ý dùng email khác.

## ACCEPTANCE CRITERIA
|AC|Given / When|Then — bằng chứng|
|---|---|---|
|1|Webhook hard_bounce giả|địa chỉ vào suppression; gửi lại bị chặn — integration|
|2|Webhook sai chữ ký|401, không ghi|
|3|Gửi trùng sự kiện|một bản ghi|
|4|Brevo thật|chờ Q-004|

### Commands / evidence gate
- `pnpm --filter @appchat/api test:integration -- test/integration/mail-webhook.test.ts`
- Ba cổng D59 (khi làm · trước commit · chốt TIP); parity màn liên quan; E2E mock + http của luồng TIP. Lệnh là cổng tương lai, chưa chạy khi viết TIP.

## CONSTRAINTS
- Không log email thô (hash); không thêm thư viện.
- Backend 200–400 dòng/file (trần 600), FE trần 400, màn chỉ orchestrator; test file riêng; ghi chỉ qua ActionExecutor; Postgres index `=` trước range/sort, EXPLAIN cho list mới.

## Quality Gate
- Manifest 7 path, header khai hai phía, 4 AC đo được. Viết 2026-11-02 trong đợt đóng lỗ hổng sổ phủ; rà độc lập ở `reports/coverage-closure-audit-2026-11-02.md`. Chưa code / chưa runtime.

## ⚠️ BUILDER-CHECKLIST
- [ ] Rà trước khi làm xong; manifest khớp.
- [ ] Mọi AC có test chạy thật, dán output.
- [ ] Cập nhật COVERAGE (parts + merge.py) với bằng chứng file:dòng + test.
- [ ] Commit, `git status --short` sạch, báo Git SHA; PR vào dev.
