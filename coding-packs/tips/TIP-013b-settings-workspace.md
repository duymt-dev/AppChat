# TIP-013b — Cài đặt thật: chuyển / mua workspace, logo, lọc + xuất thành viên, mời bằng SĐT, số đếm nav, tài khoản nhận tiền, liên kết hướng dẫn

## HEADER
- **Parallel-safe with TIP-051 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/registry.ts`, `tools/parity/parity.manifest.ts`; integrate 013b before051.
- **Parallel-safe with TIP-051b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/shared/api/mock/domains/settings-apps.ts`; integrate 013b before051b.
- **Parallel-safe with TIP-051c (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 013b before051c.
- **Parallel-safe with TIP-049d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/shared/api/mock/domains/settings-apps.ts`, `tools/parity/parity.manifest.ts`; integrate 013b before049d.
- **Parallel-safe with TIP-048c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/api.ts`, `apps/web/src/shared/api/mock/domains/settings-apps.ts`, `tools/parity/parity.manifest.ts`; integrate 013b before048c.
- **Parallel-safe with TIP-048d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 013b before048d.
- **Parallel-safe with TIP-048e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 013b before048e.
- **Parallel-safe with TIP-048f (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 013b before048f.
- **Parallel-safe with TIP-048g (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 013b before048g.
- **Parallel-safe with TIP-048h (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 013b before048h.
- **Parallel-safe with TIP-047b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 013b before047b.
- **Parallel-safe with TIP-047d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/registry.ts`, `tools/parity/parity.manifest.ts`; integrate 013b before047d.
- **Parallel-safe with TIP-026c (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 013b before026c.
- **Parallel-safe with TIP-032e (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 013b before032e.
- **Parallel-safe with TIP-006d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `packages/actions/src/settings.ts`; integrate 013b before006d.
- TIP-ID: TIP-013b; Project: AppChat V2; Module: settings workspace/members/payments; Priority: P0; Estimated: L. TIP bổ sung cho TIP-013 (đã DONE, không sửa file gốc — DC-233).
- Depends on: 039 (chọn gói cho workspace mới), 041 (workspace lifecycle), 042 (roles), 038b (xuất file), 045b (file security + identity.prisma) đã tích hợp; trước 044/045/046.
- **Files touched:** [exact M/C manifest](manifests/TIP-013b-files.md) — 23 paths (7 C). M path tương lai phải do TIP tạo trước tích hợp xong.
- **Parallel-safe with:** tuần tự với mọi TIP chung file (dòng khai hai phía bên dưới, máy kiểm `python -X utf8 tools/obligations/manifests.py --order`).
- **Parallel-safe with TIP-003i (coverage-closure manifest):** sequential, shares `apps/api/src/http/identity/settings.controller.ts`; integrate 003i before013b.
- **Parallel-safe with TIP-046 (release gate manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 013b before046.
- **Parallel-safe with TIP-001b (coverage-closure manifest):** sequential, shares `apps/web/src/features/settings/components/TagsSection.tsx`; integrate 001b before013b.
- **Parallel-safe with TIP-004b (coverage-closure manifest):** sequential, shares `apps/api/src/http/identity/settings.controller.ts`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/api.ts`, `apps/web/src/features/settings/registry.ts`, `apps/web/src/shared/api/mock/domains/settings-apps.ts`, `packages/actions/src/settings.ts`, `tools/parity/parity.manifest.ts`; integrate 004b before013b.
- **Parallel-safe with TIP-011b (coverage-closure manifest):** sequential, shares `apps/web/src/features/settings/components/GeneralSection.tsx`; integrate 011b before013b.
- **Parallel-safe with TIP-012b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/api.ts`, `tools/parity/parity.manifest.ts`; integrate 012b before013b.
- **Parallel-safe with TIP-012c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/api.ts`, `apps/web/src/features/settings/registry.ts`, `apps/web/src/shared/api/mock/domains/settings-apps.ts`, `tools/parity/parity.manifest.ts`; integrate 012c before013b.
- **Parallel-safe with TIP-013c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/components/MembersSection.tsx`, `packages/actions/src/settings.ts`; integrate 013b before013c.
- **Parallel-safe with TIP-014b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/api.ts`, `tools/parity/parity.manifest.ts`; integrate 014b before013b.
- **Parallel-safe with TIP-014c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 013b before014c.
- **Parallel-safe with TIP-015b (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 015b before013b.
- **Parallel-safe with TIP-015c (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 015c before013b.
- **Parallel-safe with TIP-015d (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 015d before013b.
- **Parallel-safe with TIP-015e (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 015e before013b.
- **Parallel-safe with TIP-015f (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 015f before013b.
- **Parallel-safe with TIP-017b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 013b before017b.
- **Parallel-safe with TIP-018b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 013b before018b.
- **Parallel-safe with TIP-019b (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 019b before013b.
- **Parallel-safe with TIP-019c (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 019c before013b.
- **Parallel-safe with TIP-020b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 020b before013b.
- **Parallel-safe with TIP-020d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `tools/parity/parity.manifest.ts`; integrate 020d before013b.
- **Parallel-safe with TIP-020e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/api.ts`; integrate 020e before013b.
- **Parallel-safe with TIP-022b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/api.ts`, `apps/web/src/shared/api/mock/domains/settings-apps.ts`, `tools/parity/parity.manifest.ts`; integrate 022b before013b.
- **Parallel-safe with TIP-023b (coverage-closure manifest):** sequential, shares `packages/core/src/identity/actions/member-invite.handler.ts`, `packages/core/src/identity/actions/workspace-update.handler.ts`, `tools/parity/parity.manifest.ts`; integrate 023b before013b.
- **Parallel-safe with TIP-023c (coverage-closure manifest):** sequential, shares `apps/web/src/shared/api/mock/domains/settings-apps.ts`, `tools/parity/parity.manifest.ts`; integrate 023c before013b.
- **Parallel-safe with TIP-023d (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 023d before013b.
- **Parallel-safe with TIP-023f (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 023f before013b.
- **Parallel-safe with TIP-023g (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 023g before013b.
- **Parallel-safe with TIP-025b (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 025b before013b.
- **Parallel-safe with TIP-026b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/api.ts`, `tools/parity/parity.manifest.ts`; integrate 026b before013b.
- **Parallel-safe with TIP-027b (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 027b before013b.
- **Parallel-safe with TIP-030b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `tools/parity/parity.manifest.ts`; integrate 030b before013b.
- **Parallel-safe with TIP-031c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 013b before031c.
- **Parallel-safe with TIP-032b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/registry.ts`, `tools/parity/parity.manifest.ts`; integrate 032b before013b.
- **Parallel-safe with TIP-032c (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 032c before013b.
- **Parallel-safe with TIP-032d (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 032d before013b.
- **Parallel-safe with TIP-033b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/api.ts`, `apps/web/src/features/settings/registry.ts`, `tools/parity/parity.manifest.ts`; integrate 033b before013b.
- **Parallel-safe with TIP-033c (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 033c before013b.
- **Parallel-safe with TIP-034b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/registry.ts`, `tools/parity/parity.manifest.ts`; integrate 034b before013b.
- **Parallel-safe with TIP-034c (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 034c before013b.
- **Parallel-safe with TIP-034d (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 034d before013b.
- **Parallel-safe with TIP-037 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `tools/parity/parity.manifest.ts`; integrate 037 before013b.
- **Parallel-safe with TIP-038 (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 038 before013b.
- **Parallel-safe with TIP-040 (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 040 before013b.
- **Parallel-safe with TIP-042b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/registry.ts`, `apps/web/src/shared/api/mock/domains/settings-apps.ts`, `tools/parity/parity.manifest.ts`; integrate 042b before013b.
- **Parallel-safe with TIP-043 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `tools/parity/parity.manifest.ts`; integrate 043 before013b.
- **Dòng COVERAGE nhận:** PRO-settings-wsswitch; PRO-settings-wsbuy; PRO-settings-logo; PRO-settings-membersfilter; PRO-settings-membersexport; PRO-settings-navcounts; PRO-settings-paymentaccount; PRO-settings-docs; PRO-settings-tagslearn; REQ-A05f.

## CONTEXT
- Hiện trạng đối chiếu mã 2026-11-02 (file:dòng, không tin trạng thái DONE):
  - `GeneralSection.tsx:91` `message.info(buySoon)`, `:112` `message.success(switched)` dù `workspace.switch` có handler (`UserMenu.tsx:45` dùng đúng), `:128` `message.info(logoSoon)`.
  - `MembersSection.tsx:124` `message.info(filterSoon)`, `:128` `message.success(exported)` không tải file.
  - `features/settings/registry.ts:32,33,45,46` số đếm cứng `12/5/24/48`.
  - `payment_account.update` có action (`packages/actions/src/payments.ts`) + `GET /v1/settings/payments` (`apps/api/src/http/sales/invoices.controller.ts:66`, quyền `finance.manage`) nhưng không có màn FE (DV-014).
  - `SettingsShell.tsx:40` chip "Tài liệu hướng dẫn" = `message.info(docsSoon)`; `TagsSection.tsx:83` "Tìm hiểu thêm" không onClick.
  - `member.invite` (`packages/actions/src/settings.ts:39`) chỉ nhận email; `Invite.email` NOT NULL, không cột phone (`identity.prisma:142–145`); `Workspace` không có cột logo (`identity.prisma:102–120`).
  - 039/REQ-L05 không có addon "workspace" (chỉ credit / kênh / user); mỗi workspace có gói riêng.

## APPLICABLE STANDARDS
- ui/prototype-parity.md; actions/action-registry.md; authz/rbac-permissions.md; database/indexing.md (đếm nav); i18n.
- Không đổi luật COMMERCE, 5 vai trò, quyền đã chốt, đơn giá Credit. Quyết định mới → DECISIONS (DC), câu hỏi → QUESTIONS.

## Rà trước khi làm
1. Đọc lại mọi file trong manifest sau khi TIP phụ thuộc đã tích hợp; lệch CONTEXT → sửa TIP/manifest trước khi code.
2. `python -X utf8 tools/obligations/manifests.py 013b` tính lại giao file; thêm path thì cập nhật manifest + header hai phía.
3. Đọc luồng tạo workspace (onboarding, `workspaces.service.ts:49`) + 039 chọn gói + 041 trước khi nối "Mua thêm workspace"; muốn giới hạn số workspace/tài khoản → Q mới cho Chủ nhà, không tự đặt.
4. Xác nhận kênh gửi lời mời qua SĐT: Zalo cá nhân đã kết nối của workspace (014b) hoặc SMS (chưa có provider → chỉ link sao chép). Không tự chọn provider trả tiền.

## TASK
Thay mọi nút giả ở Cài đặt › Workspace / Thành viên / nav bằng hành vi thật, thêm màn Tài khoản nhận tiền và mời thành viên bằng SĐT.

## SPECIFICATIONS
### 1. Workspace
1. Nút Chuyển gọi `workspace.switch` (như UserMenu) rồi điều hướng.
2. "Mua thêm workspace" = mở luồng tạo workspace mới (onboarding hiện có) rồi chọn gói cho workspace đó qua 039 — không addon "workspace", không giá mới.
3. Đổi logo: upload PNG/SVG ≤ 1 MB qua `/v1/files` (045b kiểm magic bytes, SVG sanitize) → `workspace.update { logo_file_id }`; tệp nằm ở tenant `file`, cột platform `workspace.logo_file_id` chỉ là tham chiếu; rail/PDF đọc qua `/v1/files/:id` trong ngữ cảnh workspace đó (TenantDbResolver), không đọc chéo tenant.
### 2. Thành viên
1. Lọc vai trò/trạng thái server-side (`GET /v1/settings/members?role=&status=`).
2. Xuất CSV/XLSX thật qua job export 038b (quyền members.manage, không lộ token mời).
3. Mời bằng SĐT: `member.invite { phone }` (E.164 qua 003f) tạo lời mời + link; gửi qua Zalo cá nhân nếu workspace đã kết nối và người mời xác nhận, nếu không thì chỉ hiện link để sao chép. Nhận lời mời bằng OTP SĐT không làm (không có SMS) — đăng ký bằng email rồi khớp lời mời.
### 3. Nav + tài khoản nhận tiền + hướng dẫn
1. `GET /v1/settings/nav-counts` trả số thành viên/vai trò/thẻ/câu trả lời mẫu theo quyền (COUNT có index).
2. Mục Tài chính › Tài khoản nhận tiền: form ngân hàng/số TK/chủ TK → `payment_account.update`, preview VietQR.
3. Chip Tài liệu hướng dẫn và "Tìm hiểu thêm" mở `HELP_BASE_URL` theo mục (env, mặc định ẩn nút nếu chưa cấu hình — không link chết).

## ACCEPTANCE CRITERIA
|AC|Given / When|Then — bằng chứng|
|---|---|---|
|1|Bấm Chuyển workspace|đổi workspace thật — E2E http|
|2|Đổi logo SVG có script|bị chặn/sanitize; PNG hợp lệ hiện ở rail|
|3|Lọc + xuất thành viên|đúng dữ liệu, tải file thật|
|4|Mời bằng SĐT|lời mời tạo; Zalo gửi chỉ sau xác nhận; không có Zalo → link|
|5|Số đếm nav|khớp dữ liệu, ẩn khi không quyền|
|6|Tài khoản nhận tiền|lưu + VietQR preview; người không finance.manage không thấy|
|7|Không cấu hình HELP_BASE_URL|nút ẩn|

### Commands / evidence gate
- `pnpm --filter @appchat/api test:integration -- test/integration/settings-workspace.test.ts`
- `pnpm e2e settings settings-members`
- `pnpm parity settings:general settings:members settings:payments`
- Ba cổng D59 (khi làm · trước commit · chốt TIP); parity màn liên quan; E2E mock + http của luồng TIP. Lệnh là cổng tương lai, chưa chạy khi viết TIP.

## CONSTRAINTS
- Không giá mới, không SMS provider tự chọn, không đổi quyền.
- Backend 200–400 dòng/file (trần 600), FE trần 400, màn chỉ orchestrator; test file riêng; ghi chỉ qua ActionExecutor; Postgres index `=` trước range/sort, EXPLAIN cho list mới.

## Quality Gate
- Manifest 23 path, header khai hai phía, 7 AC đo được. Viết 2026-11-02 trong đợt đóng lỗ hổng sổ phủ; rà độc lập ở `reports/coverage-closure-audit-2026-11-02.md`. Chưa code / chưa runtime.

## ⚠️ BUILDER-CHECKLIST
- [ ] Rà trước khi làm xong; manifest khớp.
- [ ] Mọi AC có test chạy thật, dán output.
- [ ] Cập nhật COVERAGE (parts + merge.py) với bằng chứng file:dòng + test.
- [ ] Commit, `git status --short` sạch, báo Git SHA; PR vào dev.
