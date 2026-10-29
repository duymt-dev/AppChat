# Ops — Log, theo dõi, bảo mật ứng dụng

> Hạ tầng (nginx, Prometheus, Loki, backup) ở Blueprint §11 + TIP-045. Standard này là phần **code** mọi TIP backend phải làm.

## 1. Log & truy vết

1. **Logger có cấu trúc** (JSON, `pino` qua NestJS logger adapter — thuộc stack Nest, không cần Deviation). Cấm `console.log` trong `apps/api`, `apps/worker`, `packages/*` backend (lint).
2. **Trường bắt buộc mỗi dòng:** `level`, `time`, `msg`, `traceId`, `ws` (nếu có), `userId` (nếu có), `runId` / `actionId` / `conversationId` khi áp dụng (tên trường theo Blueprint §11), `source` (`http | ws | job | webhook | agent`), `job` khi áp dụng.
3. **`traceId`:** nhận header `X-Request-Id` hoặc sinh uuidv7; trả lại ở header response; truyền vào job (BullMQ `data.trace_id`), outbox event, `ai_run`, `action_log` (cột `trace_id`). Một lệnh người dùng truy được xuyên HTTP → action → outbox → worker → kênh.
4. **Không log PII / bí mật:** che `phone`, `email`, `password`, `otp`, `token`, `credentials*`, `authorization`, nội dung tin nhắn, nội dung prompt / output LLM (chỉ log độ dài + `run_id`). Dùng `redact` của logger theo danh sách khoá trong `packages/shared/src/log/redact.ts`.
5. **Mức log:** `error` = cần người xem (kèm `error.code`, stack chỉ trong log, không trả client) · `warn` = tự phục hồi được (retry, rate limit) · `info` = một dòng mỗi request / job / action · `debug` tắt ở prod.
6. **Metric** (Prometheus, `/metrics` chỉ mở nội bộ): `http_request_duration_seconds{route,status}`, `action_total{action_id,result}`, `job_duration_seconds{queue}`, `queue_depth{queue}`, `outbox_lag_seconds`, `llm_tokens_total{provider,model}`, `channel_send_total{type,result}`. Label không chứa id bản ghi / workspace (tránh bùng cardinality) — trừ metric quản trị riêng.

## 2. Bí mật & mã hoá

1. Bí mật chỉ từ biến môi trường / file env của systemd; không commit `.env` (có `.env.example`). Thiếu biến bắt buộc → app không khởi động (validate zod lúc boot).
2. **Thông tin xác thực của DN** (`channel_account.credentials_enc`, `integration_connection.credentials_enc`, khoá API LLM của platform): AES-256-GCM, khoá chủ `APP_ENC_KEY` (32 byte), lưu `key_version` cạnh ciphertext để xoay khoá. Hàm `encrypt/decrypt` một chỗ trong `packages/core/kernel/crypto`.
3. API **không bao giờ trả lại** bí mật đã lưu; GET trả `has_credentials: true` + 4 ký tự cuối nếu cần.
4. Mật khẩu: argon2id. OTP, token mời / ký / reset: chỉ lưu hash (`sha256`), so sánh constant-time.

## 3. Đầu vào & giới hạn

1. **Upload:** presign (`POST /v1/files/presign`) → client tải thẳng lên storage → `file.confirm`. Giới hạn mặc định: ảnh 10 MB, tài liệu 25 MB, DOCX mẫu 10 MB; mime theo allowlist + kiểm magic bytes khi confirm. Tên file chuẩn hoá, không dùng tên người dùng làm đường dẫn.
2. **Rate limit API** (Redis, theo `user_id` + route nhóm): đọc 600/phút, action 120/phút, auth / OTP 5/phút/email + 20/giờ/IP, trang công khai (ký, xem báo giá) 30/phút/IP. Vượt → `RATE_LIMITED` 429 + `Retry-After`.
3. **Webhook:** kiểm chữ ký / secret của provider trước khi đọc body nghiệp vụ; sai → 401, log `warn`, không tiết lộ lý do.
4. **HTML người dùng / AI sinh** (mẫu chứng từ, ghi chú rich, nội dung chiến dịch): sanitize phía server bằng allowlist thẻ trước khi lưu và trước khi render PDF.
5. **SSRF:** server chỉ gọi URL do người dùng nhập (KB thêm URL, webhook ra) qua hàm `safeFetch` chặn IP nội bộ / loopback / metadata, timeout 10 s, ≤ 10 MB.
6. **CORS** chỉ origin app + widget đã khai (`allowed_domains`); cookie refresh `HttpOnly; Secure; SameSite=Lax`.

## 4. Audit

- Mọi action ghi `action_log` (actor, source, input đã che PII theo §1.4, kết quả, `trace_id`). Action chạm DB nền tảng / `admin.*` ghi thêm `platform_audit_log`.
- Đăng nhập, đổi mật khẩu, đổi vai trò, chuyển Owner, kết nối / ngắt kênh, xuất dữ liệu: luôn có bản ghi audit + thông báo cho Owner.

## 5. Test bắt buộc

- Log của một request mẫu không chứa SĐT / email / token (test bắt output logger).
- Bí mật đã lưu không xuất hiện trong response GET.
- Rate limit OTP: lần thứ 6 trong phút → 429.
- Upload sai mime (đổi đuôi) → bị từ chối ở bước confirm.
