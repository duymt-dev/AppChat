# TIP-045b: Bảo mật & vận hành trong app — metrics, SSRF, kiểm file tải lên, rate limit chung, CORS, audit, chuyển chủ workspace, lọc trường theo vai trò, đối soát, AI nhường người, job nặng chạy nền

## HEADER
- **Parallel-safe with TIP-023b (complete manifest intersection):** sequential, shares `packages/actions/src/index.ts`, `packages/core/src/ai/ai.module.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/ai/reply/reply.service.ts`, `packages/core/src/inbox/actions/message.handlers.ts`, `packages/core/src/kernel/actions/executor.ts`; integrate TIP-023b before TIP-045b.
- **Parallel-safe with TIP-023b (exact manifest audit):** sequential, shares `packages/actions/src/index.ts`, `packages/core/src/ai/ai.module.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/ai/reply/reply.service.ts`, `packages/core/src/inbox/actions/message.handlers.ts`, `packages/core/src/kernel/actions/executor.ts`; integrate TIP-023b before TIP-045b. Recompute on later manifest expansion; this is not whole-graph parallel clearance.
- **Parallel-safe with TIP-032b:** sequential, shares `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/kernel/actions/executor.ts`; integrate TIP-032b before TIP-045b. Recompute after incomplete manifests expand.
- **Parallel-safe with TIP-015b:** sequential, shares `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`; integrate TIP-015b before TIP-045b. Recompute after incomplete manifests expand.
- **Parallel-safe with TIP-041:** sequential, shares `packages/actions/src/index.ts`; integrate this TIP before 041. Recheck incomplete manifests.
- **Parallel-safe with TIP-038b:** sequential, shares `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`; integrate this TIP before 038b. Recheck incomplete manifests.
- **Parallel-safe with TIP-040:** sequential, shares `packages/actions/src/index.ts`, `packages/core/src/kernel/actions/executor.ts`; integrate this TIP before 040. Recheck incomplete manifests.
- **Parallel-safe with TIP-039:** sequential, shares `packages/actions/src/index.ts`; integrate this TIP before 039. Recheck incomplete manifests.
- **Parallel-safe with TIP-038 (expanded manifest):** sequential, shares `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`; integrate this TIP before 038; recheck after remaining manifests expand.
- **Parallel-safe with TIP-038:** sequential, shares `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`; integrate this TIP before 038. Recheck after incomplete manifests expand.
- **Parallel-safe with TIP-037:** sequential, shares `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`; integrate this TIP before 037. Recheck when incomplete manifests expand.
- **Parallel-safe with TIP-042b:** sequential, shares `packages/actions/src/index.ts`; integrate this TIP before 042b; recheck after incomplete manifests are expanded.
- **Parallel-safe with TIP-042:** sequential, shares `packages/actions/src/index.ts`; integrate this TIP before 042. Recheck intersections when incomplete manifests are expanded.
- **Parallel-safe with TIP-020b:** sequential, shares `packages/actions/src/index.ts`; integrate 020b after 036, before 043/045b. For 043 also shares `packages/db/prisma/tenant/ai-kb.prisma`, `packages/core/src/ai/ai.module.ts`, `apps/api/src/http/ai/ai.http.module.ts`, `apps/web/src/features/settings/components/RagSection.tsx`, `apps/web/src/shared/api/mock/domains/settings-ai.ts`, settings/action locale files.
- **Parallel-safe with TIP-043:** sequential, shares `packages/actions/src/index.ts` and (where applicable) `packages/core/src/ai/jobs/ai.jobs.module.ts`; TIP-043 integrates after 015b/023b/023c/030b/032b/036 and before 045b.
- TIP-ID: TIP-045b (bổ sung — chèn trước TIP-045 / 046, DC-232)
- Project: AppChat V2
- Module: `packages/core/src/kernel/{metrics, http/safe-fetch, files/upload-guard, ratelimit, audit}/**` · `apps/api/src/{main.ts, http/files.controller.ts}` · `packages/core/src/inbox/actions/message.handlers.ts` · `packages/core/src/ai/reply/reply.service.ts` · `packages/core/src/kernel/actions/executor.ts` (202 job) · `packages/core/src/billing/jobs/reconcile.ts` · `packages/actions/src/identity.ts` (`workspace.transfer_ownership`) · serializer CRM
- Depends on: TIP-003, 005, 006, 009, 014, 016, 020, 022 (đã xong)
- Priority: P0 · REQ: N06, N07, N08, A05, F01 · Decision: standard `ops/observability-security`, `authz/rbac-permissions` §7–8, `database/tenant-db` §5, `domain/concurrency` §5 §7, `domain/validation-defaults` §4 · DC-232
- Estimated effort: 20 giờ

## CONTEXT

**Ranh giới tuần tự bổ sung:** sequential, shares `packages/actions/src/index.ts` and `packages/core/src/ai/jobs/ai.jobs.module.ts` with TIP-036; 036 xong trước 045b. Mọi file-overlap khác phải rà lại khi hai manifest được hoàn thiện.
Rà standards 2026-11-01: phần **trong code** của `ops/observability-security` ghi "mọi TIP backend phải làm" nhưng không TIP nào làm; TIP-045 chỉ hạ tầng (Prometheus / Grafana cần app mở `/metrics`), TIP-046 chỉ rà soát. Đã kiểm code: không có `prom-client`, `safeFetch`, kiểm magic bytes, rate limit chung (chỉ OTP / widget / ký), CORS, chỗ ghi `platform_audit_log`, `workspace.transfer_ownership`, lọc trường phía server, job đối soát, chuyển `ai_mode` khi người gửi, job cho export / bulk lớn.

## TASK

**Nền202 trước045b:** TIP032b nhận ActionAccepted `job_accepted`, helper kernel và useAction accepted state/callback cho importer>500;045b reuse/mở rộng sang mọi bulk/export, không tạo union/dispatcher thứ hai và không kéo032b phụ thuộc ngược045b. Khi hoàn thiện manifest045b phải nhận tests regression cả preview_required/approval_required/job_accepted. Chưa coi foundation này đã được triển khai.
**Ranh giới với042c (2026-11-02):** 045b tiếp tục sở hữu REQ-A05b-3/STD-authz-rbac-8 cho field visibility;042c chỉ row-scope/read-write. Khi hoàn thiện manifest045b, nhận rõ `crm/services/contact-view.ts`, `contact360.ts`, custom payload6 thực thể, cf.* filter/count side-channel, AI context/export/preview/realtime. Không chỉ gọi fieldsForRole ở FE; không cần042c làm prerequisite ngược (045b trước042), nhưng phải retest tích hợp sau042c. Các path này còn phải chia module và ghi manifest chính xác, chưa coi task paragraph là bộ TIP hoàn chỉnh.

**Bổ sung khảo sát 2026-11-02 — dependency của042:** nhận STD-database-tenantdb-5a cùng5b. `kernel/actions/executor.ts:133-137` lồng tenant transaction bên trong platform; tenant log/outbox/idempotency lại ghi ở transaction sau:139-170. Không lấy comment “platform trước” làm bằng chứng atomic. Khi hoàn thiện manifest045b, tách module consistency/reconciliation riêng (facade ở kernel), kiểm fault ở từng commit và retry cho member.invite/set_role/accept/undo. 042 không được đi trước nền này rồi tự vá kernel ngoài manifest. Đây là yêu cầu còn phải thiết kế/kiểm thử, không báo đã sửa.

1. **Metrics** (`prom-client`, đã nằm trong Blueprint §11): `/metrics` (chỉ localhost / token nội bộ) cho api + worker: `http_request_duration_seconds{route,method,status}`, `action_total{action,source,result}`, `queue_depth{queue}`, `outbox_lag_seconds`, `llm_tokens_total{provider,model,purpose}`, `llm_errors_total`, `channel_account_status{type,status}`, `tenant_pool_clients`. Không nhãn theo workspace / user (cardinality).
2. **SSRF:** `safeFetch` (chặn private / loopback / link-local / metadata, kiểm sau DNS resolve + sau redirect, timeout, giới hạn byte) — thay mọi `fetch` ra URL do người dùng nhập (`ai/kb/ingest.ts:46`, webhook test, connector probe).
3. **Tải file:** allowlist mime theo mục đích + magic bytes (`file-type` logic tự viết cho PDF / DOCX / XLSX / PNG / JPG / WebP / MP4 / CSV), giới hạn dung lượng theo loại; `files.controller` từ chối đổi đuôi. (Presign S3 để khi có storage s3 — DV-003 giữ multipart.)
4. **Rate limit chung** (Redis, sliding window): đọc 600 / phút / user, action 120 / phút / user, trang công khai (xem báo giá / HĐ / ký) 30 / phút / IP; 429 + `Retry-After`, envelope lỗi chuẩn.
5. **CORS:** chỉ origin app + widget (env), credentials đúng.
6. **Audit:** `admin.*` ghi `platform_audit_log`; sự kiện nhạy cảm (đăng nhập thiết bị mới, đổi vai trò, mời / xoá thành viên, kết nối / ngắt kênh, xuất dữ liệu, đổi chủ) ghi `action_log` cờ `audit` + thông báo Owner (rbac §7).
7. **`workspace.transfer_ownership { to_user_id, otp }`** (config, OTP email của Owner hiện tại, người nhận phải là thành viên active; Owner cũ thành admin); FE nút ở Cài đặt → Thành viên (Can `workspace.transfer`).
8. **Lọc trường theo vai trò phía server:** serializer CRM / chứng từ dùng `fieldsForRole` (đã ở shared) để bỏ trường bị ẩn khỏi response + export + output action đọc (023b).
9. **Đối soát hằng giờ** DB nền tảng ↔ tenant: membership, hạn mức (kênh, ghế), ví credit vs sổ usage; lệch → log + metric + thông báo admin nền tảng, không tự sửa.
10. **AI nhường người** (concurrency §5): người gửi tin khi `ai_mode=auto` → chuyển `copilot` (ghi sự kiện); run agent kiểm lại `ai_mode` ngay trước bước gửi, đã đổi → bỏ gửi, lưu nháp.
11. **Job nặng chạy nền:** export > 5.000 dòng → job + link tải (thông báo); bulk > 50 bản ghi → executor trả 202 `{ job_id }`, tiến độ qua WS; áp `contact.export`, `contact.import`, `*.bulk_update`.
12. Dọn: giá trị trường tuỳ biến đã xoá giữ 30 ngày rồi job dọn (custom-fields §2); contract test chung `packages/channels/test/contract.test.ts` cho mọi adapter; factory `packages/db/test/factories`.

## ACCEPTANCE CRITERIA
1. Unit / integration: `safeFetch` chặn 127.0.0.1, 10.x, 169.254.169.254, IPv6 loopback, redirect sang IP nội bộ; file `.exe` đổi tên `.pdf` → 415; rate limit trả 429 đúng ngưỡng (đồng hồ giả); CORS origin lạ bị chặn.
2. Integration: `/metrics` có đủ metric sau khi gọi 1 action + 1 run model giả; `admin.*` ghi audit; đổi vai trò → thông báo Owner; transfer ownership đủ luồng OTP + vai trò sau đổi.
3. Integration: sales không nhận trường bị ẩn trong `GET /contacts/:id` và `contact.export`; đối soát phát hiện lệch giả lập; người gửi khi AI auto → `copilot` + run đang chạy không gửi.
4. Integration: export 6.000 dòng → 202 + job + link; bulk 60 → 202.
5. Contract test kênh chạy cho zalo / webchat / email (fake transport).
6. Cổng D59 + full hồi quy (đụng kernel / executor).

## CONSTRAINTS
- `prom-client` đã nằm trong Blueprint §11 (không phải thư viện mới ngoài stack); `file-type` không thêm — tự kiểm magic bytes.
- Không đổi hợp đồng API đã có ngoài thêm 202 `{ job_id }` cho job nặng; FE `useAction` xử lý 202 job (thêm trong TIP này nếu chưa có).
