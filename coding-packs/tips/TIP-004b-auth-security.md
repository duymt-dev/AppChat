# TIP-004b — Bảo mật tài khoản: 2FA TOTP, chính sách mật khẩu, khoá sau N lần sai, làm mới phiên nhiều tab

## HEADER
- **Parallel-safe with TIP-048c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/api.ts`, `apps/web/src/shared/api/mock/domains/settings-apps.ts`, `tools/parity/parity.manifest.ts`; integrate 004b before048c.
- **Parallel-safe with TIP-048d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 004b before048d.
- **Parallel-safe with TIP-048e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 004b before048e.
- **Parallel-safe with TIP-048f (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 004b before048f.
- **Parallel-safe with TIP-048g (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 004b before048g.
- **Parallel-safe with TIP-048h (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 004b before048h.
- **Parallel-safe with TIP-047b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 004b before047b.
- **Parallel-safe with TIP-047d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/registry.ts`, `tools/parity/parity.manifest.ts`; integrate 004b before047d.
- **Parallel-safe with TIP-026c (coverage-closure manifest):** sequential, shares `coding-packs/docs/06-prototype/DEVIATIONS.md`, `tools/parity/parity.manifest.ts`; integrate 004b before026c.
- **Parallel-safe with TIP-032e (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 004b before032e.
- **Parallel-safe with TIP-006d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `packages/actions/src/settings.ts`; integrate 004b before006d.
- TIP-ID: TIP-004b; Project: AppChat V2; Module: identity security; Priority: P0; Estimated: L. TIP bổ sung cho TIP-004 (đã DONE, không sửa file gốc — DC-233).
- Depends on: 045b (platform audit), 041/042 chung identity; trước 044/045/046.
- **Files touched:** [exact M/C manifest](manifests/TIP-004b-files.md) — 27 paths (10 C). M path tương lai phải do TIP tạo trước tích hợp xong.
- **Parallel-safe with:** tuần tự với mọi TIP chung file (dòng khai hai phía bên dưới, máy kiểm `python -X utf8 tools/obligations/manifests.py --order`).
- **Parallel-safe with TIP-011b (coverage-closure manifest):** sequential, shares `coding-packs/docs/06-prototype/DEVIATIONS.md`; integrate 004b before011b.
- **Parallel-safe with TIP-003i (coverage-closure manifest):** sequential, shares `apps/api/src/http/identity/settings.controller.ts`; integrate 003i before004b.
- **Parallel-safe with TIP-004c (coverage-closure manifest):** sequential, shares `packages/core/src/identity/services/auth.service.ts`; integrate 004b before004c.
- **Parallel-safe with TIP-046 (release gate manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 004b before046.
- **Parallel-safe with TIP-012b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/api.ts`, `tools/parity/parity.manifest.ts`; integrate 012b before004b.
- **Parallel-safe with TIP-012c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/api.ts`, `apps/web/src/features/settings/registry.ts`, `apps/web/src/shared/api/mock/domains/settings-apps.ts`, `tools/parity/parity.manifest.ts`; integrate 012c before004b.
- **Parallel-safe with TIP-013b (coverage-closure manifest):** sequential, shares `apps/api/src/http/identity/settings.controller.ts`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/api.ts`, `apps/web/src/features/settings/registry.ts`, `apps/web/src/shared/api/mock/domains/settings-apps.ts`, `packages/actions/src/settings.ts`, `tools/parity/parity.manifest.ts`; integrate 004b before013b.
- **Parallel-safe with TIP-013c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `packages/actions/src/settings.ts`, `packages/core/src/identity/identity.module.ts`; integrate 004b before013c.
- **Parallel-safe with TIP-014b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/api.ts`, `tools/parity/parity.manifest.ts`; integrate 014b before004b.
- **Parallel-safe with TIP-014c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 004b before014c.
- **Parallel-safe with TIP-015b (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 015b before004b.
- **Parallel-safe with TIP-015c (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 015c before004b.
- **Parallel-safe with TIP-015d (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 015d before004b.
- **Parallel-safe with TIP-015e (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 015e before004b.
- **Parallel-safe with TIP-015f (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 015f before004b.
- **Parallel-safe with TIP-017b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 004b before017b.
- **Parallel-safe with TIP-018b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 004b before018b.
- **Parallel-safe with TIP-019b (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 019b before004b.
- **Parallel-safe with TIP-019c (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 019c before004b.
- **Parallel-safe with TIP-020b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 020b before004b.
- **Parallel-safe with TIP-020d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `tools/parity/parity.manifest.ts`; integrate 020d before004b.
- **Parallel-safe with TIP-020e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/api.ts`; integrate 020e before004b.
- **Parallel-safe with TIP-022b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/api.ts`, `apps/web/src/shared/api/mock/domains/settings-apps.ts`, `tools/parity/parity.manifest.ts`; integrate 022b before004b.
- **Parallel-safe with TIP-023b (coverage-closure manifest):** sequential, shares `packages/core/src/identity/identity.module.ts`, `tools/parity/parity.manifest.ts`; integrate 023b before004b.
- **Parallel-safe with TIP-023c (coverage-closure manifest):** sequential, shares `apps/web/src/shared/api/mock/domains/settings-apps.ts`, `tools/parity/parity.manifest.ts`; integrate 023c before004b.
- **Parallel-safe with TIP-023d (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 023d before004b.
- **Parallel-safe with TIP-023f (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 023f before004b.
- **Parallel-safe with TIP-023g (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 023g before004b.
- **Parallel-safe with TIP-025b (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 025b before004b.
- **Parallel-safe with TIP-026b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/api.ts`, `tools/parity/parity.manifest.ts`; integrate 026b before004b.
- **Parallel-safe with TIP-027b (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 027b before004b.
- **Parallel-safe with TIP-030b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `tools/parity/parity.manifest.ts`; integrate 030b before004b.
- **Parallel-safe with TIP-031c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 004b before031c.
- **Parallel-safe with TIP-032b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/registry.ts`, `tools/parity/parity.manifest.ts`; integrate 032b before004b.
- **Parallel-safe with TIP-032c (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 032c before004b.
- **Parallel-safe with TIP-032d (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 032d before004b.
- **Parallel-safe with TIP-033b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/api.ts`, `apps/web/src/features/settings/registry.ts`, `tools/parity/parity.manifest.ts`; integrate 033b before004b.
- **Parallel-safe with TIP-033c (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 033c before004b.
- **Parallel-safe with TIP-034b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/registry.ts`, `tools/parity/parity.manifest.ts`; integrate 034b before004b.
- **Parallel-safe with TIP-034c (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 034c before004b.
- **Parallel-safe with TIP-034d (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 034d before004b.
- **Parallel-safe with TIP-037 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `tools/parity/parity.manifest.ts`; integrate 037 before004b.
- **Parallel-safe with TIP-038 (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 038 before004b.
- **Parallel-safe with TIP-038b (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 038b before004b.
- **Parallel-safe with TIP-039 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/api.ts`, `tools/parity/parity.manifest.ts`; integrate 039 before004b.
- **Parallel-safe with TIP-040 (coverage-closure manifest):** sequential, shares `packages/db/prisma/platform/identity.prisma`, `tools/parity/parity.manifest.ts`; integrate 040 before004b.
- **Parallel-safe with TIP-042b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/registry.ts`, `apps/web/src/shared/api/mock/domains/settings-apps.ts`, `tools/parity/parity.manifest.ts`; integrate 042b before004b.
- **Parallel-safe with TIP-043 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `tools/parity/parity.manifest.ts`; integrate 043 before004b.
- **Dòng COVERAGE nhận:** PRO-settings-security; Q-018.

## CONTEXT
- Hiện trạng đối chiếu mã 2026-11-02 (file:dòng, không tin trạng thái DONE):
  - Prototype L6465 mục "Bảo mật" (2FA, chính sách mật khẩu, khoá sau N lần sai) không có trong `features/settings/registry.ts`; prototype-parity §6 chỉ ẩn SSO/Compliance.
  - `identity/services/sessions.service.ts:40–52` `rotate`: token đã xoay bị dùng lại → thu hồi cả family ngay — hai tab làm mới cùng lúc đăng xuất người dùng (Q-018).
  - Refresh token chỉ lưu `token_hash` (sha256, `identity.prisma:88`) — không giữ plaintext để trả lại token kế tiếp.
  - Prototype L6464–6480 có thêm: "Cho phép đăng nhập bằng mật khẩu", hết hạn mật khẩu 90/60 ngày, độ phức tạp Mạnh ≥12 / Trung bình ≥8, session 8h–30d, logout khi đổi IP, buộc logout session khác khi đổi mật khẩu, IP allowlist admin panel, 2FA "hoặc SMS".
  - Tài khoản và đăng nhập ở platform (một user nhiều workspace); chính sách đặt theo workspace.
  - Không có thư viện OTP — TOTP RFC 6238 viết bằng `node:crypto` (HMAC-SHA1), không thêm dependency.

## APPLICABLE STANDARDS
- ops/observability-security.md (audit đăng nhập/đổi mật khẩu, không log secret); authz/rbac-permissions.md; Blueprint §4.2.
- Không đổi luật COMMERCE, 5 vai trò, quyền đã chốt, đơn giá Credit. Quyết định mới → DECISIONS (DC), câu hỏi → QUESTIONS.

## Rà trước khi làm
1. Đọc lại mọi file trong manifest sau khi TIP phụ thuộc đã tích hợp; lệch CONTEXT → sửa TIP/manifest trước khi code.
2. `python -X utf8 tools/obligations/manifests.py 004b` tính lại giao file; thêm path thì cập nhật manifest + header hai phía.
3. Đọc auth.service login flow + rate-limit hiện có (`kernel/rate-limit.ts`) để khoá dựa trên đó, không thêm cơ chế song song.

## TASK
Thêm mục Cài đặt › Bảo mật thật và sửa xung đột làm mới phiên nhiều tab mà không nới phát hiện token bị đánh cắp.

## SPECIFICATIONS
### 1. 2FA
1. Bật: tạo secret (mã hoá `APP_ENC_KEY`), hiện secret + link `otpauth://` (QR qua block QR của 023c nếu đã có), xác nhận 1 mã → bật + 10 mã khôi phục (hash).
2. Đăng nhập: sau mật khẩu đúng → bước OTP; mã đúng nhưng `step ≤ last_used_step` bị từ chối (chống dùng lại trong cùng bước); sai 5 lần → khoá 15 phút. Tắt 2FA cần mật khẩu + OTP.
3. Owner bật "bắt buộc 2FA cho thành viên" (settings.manage).
### 2. Mật khẩu + khoá
1. Chính sách workspace theo đúng lựa chọn prototype: độ phức tạp Trung bình (≥ 8) / Mạnh (≥ 12, hỗn hợp); hết hạn mật khẩu 60 / 90 ngày / Không đổi; áp khi đổi/đặt lại và nhắc khi hết hạn.
2. Áp lúc đăng nhập (platform): chính sách **chặt nhất** trong các workspace user là thành viên active; chuyển sang workspace có chính sách chặt hơn → yêu cầu bước bổ sung (OTP / đổi mật khẩu) trước khi vào (DC-293).
3. Khoá theo cặp (tài khoản, IP/thiết bị): sau N (3–10, mặc định 5) lần sai trong 15 phút khoá cặp đó 15 phút, kèm trễ tăng dần (1s, 2s, 4s…) từ lần sai thứ 3 — kẻ tấn công không khoá được chủ tài khoản ở thiết bị khác; mở sau thời gian hoặc qua quên mật khẩu; audit + thông báo Owner.
4. Buộc logout mọi session khác khi đổi mật khẩu: bật mặc định (thu hồi family khác).
### 3. Phạm vi hàng prototype
1. Làm: Bắt buộc 2FA (TOTP), độ phức tạp, hết hạn mật khẩu, khoá sau N lần sai, buộc logout khi đổi mật khẩu.
2. Ẩn có mã quyết định, ghi `coding-packs/docs/06-prototype/DEVIATIONS.md` mức §6b: 2FA qua SMS (không SMS provider), "Cho phép đăng nhập bằng mật khẩu" (chưa có SSO/passwordless), Hết hạn session 8h–30d (Blueprint §4.2 cố định access 15 phút + refresh), Logout khi đổi IP (mạng di động VN đổi IP liên tục), IP allowlist admin panel (admin panel là của 040). Parity mask đúng các hàng ẩn.
### 4. Phiên nhiều tab
1. Khi xoay, lưu `successor_ciphertext` (AES-GCM bằng `APP_ENC_KEY`) + `successor_until = now + 10s` trên dòng token cũ; xoá khi hết 10 giây (job dọn) hoặc khi token kế tiếp được xoay tiếp (DC-293).
2. Token đã xoay dùng lại trong cửa sổ, cùng family + cùng user-agent → giải mã trả lại đúng token kế tiếp (idempotent), tối đa 2 lần trả lại; lần thứ 3, ngoài cửa sổ, hoặc khác user-agent → thu hồi family như cũ.

## ACCEPTANCE CRITERIA
|AC|Given / When|Then — bằng chứng|
|---|---|---|
|1|Bật 2FA, đăng nhập|yêu cầu OTP; mã khôi phục dùng 1 lần|
|2|Sai mật khẩu N lần|khoá + audit + thông báo Owner|
|3|Hai tab làm mới cùng lúc|không đăng xuất — integration `auth-refresh-race.test.ts`|
|4|Dùng lại token sau 11 giây|thu hồi family|
|5|Dùng lại token cũ lần 3 trong cửa sổ|thu hồi family; DB không còn successor_ciphertext sau 10 giây|
|6|Sai mật khẩu 5 lần từ IP A|IP A bị khoá; cùng tài khoản đăng nhập đúng từ thiết bị B vẫn được|
|7|User thuộc 2 workspace (Trung bình / Mạnh)|đăng nhập áp Mạnh|
|8|Mã TOTP đã dùng, nhập lại trong cùng bước 30s|từ chối (`last_used_step`)|
|9|UI Cài đặt › Bảo mật|vi/en, 390px, parity với prototype L6465 (mask đúng các hàng ẩn đã ghi DEVIATIONS)|

### Commands / evidence gate
- `pnpm --filter @appchat/core test -- test/totp.test.ts`
- `pnpm --filter @appchat/api test:integration -- test/integration/auth-security.test.ts test/integration/auth-refresh-race.test.ts`
- `pnpm e2e settings-security`
- `pnpm parity settings:security`
- Ba cổng D59 (khi làm · trước commit · chốt TIP); parity màn liên quan; E2E mock + http của luồng TIP. Lệnh là cổng tương lai, chưa chạy khi viết TIP.

## CONSTRAINTS
- Không thêm thư viện; không log secret/OTP; không đổi 5 vai trò.
- Backend 200–400 dòng/file (trần 600), FE trần 400, màn chỉ orchestrator; test file riêng; ghi chỉ qua ActionExecutor; Postgres index `=` trước range/sort, EXPLAIN cho list mới.

## Quality Gate
- Manifest 27 path, header khai hai phía, 9 AC đo được. Viết 2026-11-02 trong đợt đóng lỗ hổng sổ phủ; rà độc lập ở `reports/coverage-closure-audit-2026-11-02.md`. Chưa code / chưa runtime.

## ⚠️ BUILDER-CHECKLIST
- [ ] Rà trước khi làm xong; manifest khớp.
- [ ] Mọi AC có test chạy thật, dán output.
- [ ] Cập nhật COVERAGE (parts + merge.py) với bằng chứng file:dòng + test.
- [ ] Commit, `git status --short` sạch, báo Git SHA; PR vào dev.
