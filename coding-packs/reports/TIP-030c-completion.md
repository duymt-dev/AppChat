### COMPLETION REPORT — TIP-030c

**STATUS:** DONE — nhánh `tip/030c-parent-signing` (xếp chồng #180), 3 pha; SHA từng pha ở bảng tiến độ `goals/GOAL-RELEASE.md` dòng 40.

**TÓM TẮT:** Ký hợp đồng cha qua action riêng + biên nhận lần ký. **Công khai:** GET `/public/sign/:token` + `/pdf` chỉ đọc; POST open / otp / decline / sign mang `request_id` UUID → `request_ref = sha256(scope|op|id)`, chạy action `exposure:'internal'` (`contract.public_open` / `public_otp` / `public_decline` / `public_sign` / `sign_attempt_prepare` / `sign_attempt_stage`) qua capability niêm phong (WeakMap) + verifier 003c (biên nhận trigger theo request) — không còn ctx Owner giả. **OTP:** lưu HMAC(khoá ứng dụng, người ký, thế hệ, mã); `otp_generation` tăng mỗi lần phát / huỷ. **Lần ký khách:** prepare (kiểm OTP dưới khoá người ký; sai → `otp_fail` + biên nhận `rejected` bền, ném 422 / 410 sau commit) → claim render (lease 90 s + thế hệ) → render + tải ứng viên NGOÀI khoá, đọc lại SHA → stage → chốt một tx CAS thế hệ OTP + băm mã + version / nguồn / ứng viên, unique (người ký, thế hệ) khi finalized → một bên thắng; gửi lại cùng request → kết quả cũ. **Owner:** `contract.request_sign_otp` (ui-only, quyền `contract.sign`) + ý định gửi bền (mã AES-GCM, claim CAS → người nhận hiện tại → MailProvider một lần; ≥ 400 thử lại ≤ 5, còn lại `unknown` không gửi lại); `approve_and_sign` kiểm OTP qua biên nhận + chốt CAS thế hệ. **Khôi phục (ROLE=jobs, `sweepContracts`):** lần thử bỏ dở → `expired` (không chốt hộ), dọn tệp ứng viên chưa xác nhận, khôi phục ý định OTP Owner. **Quên khách:** kiểm kê attempt / delivery; log che `signature_png` / `sign_token` / `encrypted_secret` / `verification_digest`.

**FILES CHANGED:** theo manifest `tips/manifests/TIP-030c-files.md`; lệch DV-102. Chính:
- `packages/db/prisma/tenant/contract-signing.prisma` + `contracts.prisma` (`otp_generation`) + migration `20261111070000_parent_signing_receipts` (db:generate + migrate-tenants 15 DB + db:setup).
- `packages/actions/src/contract-signing.ts` (7 action, đăng ký `index.ts`).
- `packages/core/src/contracts/signing/{capability,otp,delivery,read,recipients,module,public.handlers,owner-otp.handler,attempts,attempt.handlers,finalize,render,owner-attempt,recovery,redaction}.ts`; `contracts/services/public-sign.service.ts` (facade 163 dòng); `contracts/actions/contract-approval.handlers.ts`; `contracts/contract-system.ts`; `contracts/services/contracts-read.service.ts`; `contracts/contracts.module.ts`; `contracts/contracts.jobs.module.ts`; `contracts/privacy/inventory.ts`; `packages/shared/src/log/redact.ts`.
- `apps/api/src/http/contracts/{public-sign,contracts}.controller.ts`.
- `apps/web/src/features/contracts/{signing-api.ts,hooks/useSigningAttempt.ts,api.ts,screens/SignScreen.tsx,components/SignModals.tsx}`; mock `contracts-sign.ts` / `contracts-actions.ts`; i18n `actions.json` + `contracts.json` (vi + en).

**TEST RESULTS** (phạm vi TIP, D59 + luật goal: không full integration / full E2E):
- Unit: core **961** (gồm contract-signing-otp, contract-signing-capability); shared **182**; actions **26**; web contracts + mock **58 file / 228** (gồm `signing.test.tsx`, `contracts-shape.test.ts`).
- Integration API (Postgres 16 + Memurai + LibreOffice thật): contract-signing-public (7), contract-signing-atomicity (5), contract-signing-recovery (5) + hồi quy contracts / contract-files / contract-appendix — **53/53**.
- Worker: contract-signing-composition (ROLE=jobs + ai: handler thật, verifier đăng ký, ctx thường → 403) **2/2**.
- E2E mock (`E2E_PORT=3537`): contracts + contract-files + shell **19 passed**. E2E http (`3538`): contracts **1 passed**. Bố cục trang ký không đổi, manifest parity không có mục trang ký → không parity.
- Build db / actions / core / api / worker / web sạch; lint + typecheck sạch (web 22 cảnh báo có từ trước, 0 lỗi); depcheck **116** = baseline; lint:size / lint:tokens / lint:masks / i18n:check sạch.

**ISSUES DISCOVERED:**
1. Kết quả action tính trước commit → facade `sign-otp` trả `queued` dù mail đã gửi sau commit → thêm `ownerOtpStatus` đọc lại sau execute.
2. Module `'use client'` không gọi được từ server component (Next.js) → tách helper request_id thuần sang `signing-api.ts`.
3. Mục đích tệp `signing_candidate` không có trong `UPLOAD_PURPOSES` → ứng viên dùng `document`, chưa xác nhận tới khi chốt.
4. Owner cũng ghi biên nhận `finalized` → test đếm lọc theo `party`.

**ĐỐI CHIẾU STANDARDS** (APPLICABLE STANDARDS của TIP):

| Standard | Tuân thủ (file / test) | Lệch |
|---|---|---|
| `actions/action-registry.md` | 7 action zod in / out; action riêng `exposure:'internal'`, không agent-grantable; `request_sign_otp` có Example; preview không ghi / không kiểm bí mật (public preview luôn từ chối) | — |
| `events/outbox.md` | `contract.signed` + timeline + gửi khách cùng tx chốt; đúng một `contract.signed` khi hai tab (atomicity AC5) | — |
| `domain/state-machine.md` | Pha lần ký rejected / verified / rendering / staged / finalized / stale / expired, không hồi; hợp đồng `moveContract` → signed chỉ ở chốt | — |
| `domain/concurrency.md` | Khoá họ liên hệ → hợp đồng → người ký → token; CAS thế hệ OTP + băm mã; unique finalized (người ký, thế hệ); lease render theo thế hệ; test đồng thời sai OTP + hai tab | — |
| `database/tenant-db.md` · `indexing.md` | Bảng tenant không workspace_id; partial unique finalized; index lịch sử `(contract_id, party, created_at DESC, id DESC) INCLUDE`; quét `(phase, expires_at, id)` / `(phase, next_due, id)` ≤ 200 | — |
| `documents/templates.md` | Render nguồn bất biến (version / sha nguồn), SHA cuối = bytes đọc lại | Render Owner vẫn trong prepare (DV-102 mục 7) |
| `authz/rbac-permissions.md` | `contract.sign` kiểm lúc phát OTP Owner + người nhận hiện tại lúc gửi (thành viên, quyền, email); công khai chỉ qua capability token | — |
| `api/response-envelope.md` | 422 thiếu / sai request_id, 422 sai OTP, 410 khoá link, 409 request đổi nội dung / đang render | — |
| `ops/observability-security.md` | Không lưu OTP / chữ ký thô ở biên nhận / action_log (test); mã Owner mã hoá, xoá khi xong; log che khoá ký | Metric 045b chưa nối; `redactSignUrl` chưa nối logger HTTP (DV-102 mục 8) |
| `ui/frontend-structure.md` · `i18n/i18n.md` | Hook `useSignVisit`, helper `signing-api.ts`, màn chỉ orchestrator; chuỗi mới vi + en | Không có `useOwnerSigning` (DV-102 mục 2) |
| `code/testing.md` | Test ở file riêng; integration native + worker composition | Không có unit render / delivery / privacy riêng (DV-102 mục 3) |
| `COMMERCE-DECISIONS.md` §9 | Owner ký trước; OTP 10 phút, sai 5 lần khoá; không đổi luật | — |
| `workflow/git-flow-ci.md` | Nhánh `tip/030c-*`, PR vào dev, xếp chồng #180 | — |

**GIẢ ĐỊNH ĐÃ CHỌN:**
- Sai OTP là hiệu ứng bền: biên nhận + đếm commit rồi mới trả lỗi (DC-429 c); gửi lại cùng request không đếm lại, cùng request khác nội dung → 409.
- Lượt render chết không được chốt hộ (không có OTP / chữ ký gốc) → `expired`; khách ký lại bằng request mới.
- OTP Owner chết sau khi gọi provider → `unknown`, không gửi lại; Owner bấm Gửi mã để phát thế hệ mới (DC-429 e).
- Kênh OTP công khai giữ tin vào hội thoại đã gửi link (outbox kênh), `delivery_status` = `queued` (DV-102 mục 6).

**CHƯA NGHIỆM THU:** với provider thật Brevo / SMTP (mail OTP Owner) và Zalo cá nhân (OTP + PDF đã ký gửi khách) — chưa nghiệm thu với provider thật.
