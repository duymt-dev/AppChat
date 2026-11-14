# TIP-013c — Người phụ trách vắng / ngoài ca → hàng chung hoặc agent

## HEADER
- **Parallel-safe with TIP-026c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/core/src/crm/crm.module.ts`, `packages/core/src/crm/services/crm-read.service.ts`; integrate 013c before026c.
- **Parallel-safe with TIP-032e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/core/src/crm/services/crm-read.service.ts`; integrate 013c before032e.
- **Parallel-safe with TIP-006d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `packages/actions/src/settings.ts`; integrate 013c before006d.
- TIP-ID: TIP-013c; Project: AppChat V2; Module: identity availability + inbox routing; Priority: P0; Estimated: L. TIP bổ sung cho TIP-013 (đã DONE, không sửa file gốc — DC-233).
- Depends on: 042b (chia lead mới), 022b (agent theo kênh), 045b (send fence), 025b (inbox) đã tích hợp; trước 044/045/046.
- **Files touched:** [exact M/C manifest](manifests/TIP-013c-files.md) — 23 paths (9 C). M path tương lai phải do TIP tạo trước tích hợp xong.
- **Parallel-safe with:** tuần tự với mọi TIP chung file (dòng khai hai phía bên dưới, máy kiểm `python -X utf8 tools/obligations/manifests.py --order`).
- **Parallel-safe with TIP-033c (coverage-closure manifest):** sequential, shares `packages/core/src/inbox/inbox.module.ts`; integrate 033c before013c.
- **Parallel-safe with TIP-003e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/db/prisma/tenant/crm.prisma`; integrate 003e before013c.
- **Parallel-safe with TIP-004b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `packages/actions/src/settings.ts`, `packages/core/src/identity/identity.module.ts`; integrate 004b before013c.
- **Parallel-safe with TIP-013b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/components/MembersSection.tsx`, `packages/actions/src/settings.ts`; integrate 013b before013c.
- **Parallel-safe with TIP-003b (coverage-closure manifest):** sequential, shares `packages/core/src/inbox/services/pipeline.ts`; integrate 003b before013c.
- **Parallel-safe with TIP-003c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`; integrate 003c before013c.
- **Parallel-safe with TIP-012b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`; integrate 012b before013c.
- **Parallel-safe with TIP-012c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`; integrate 012c before013c.
- **Parallel-safe with TIP-014b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `packages/core/src/inbox/services/pipeline.ts`; integrate 014b before013c.
- **Parallel-safe with TIP-014c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 013c before014c.
- **Parallel-safe with TIP-015b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/core/src/crm/crm.module.ts`, `packages/db/prisma/tenant/crm.prisma`; integrate 015b before013c.
- **Parallel-safe with TIP-015c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/core/src/inbox/services/pipeline.ts`; integrate 015c before013c.
- **Parallel-safe with TIP-015d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/core/src/crm/crm.module.ts`, `packages/core/src/inbox/services/pipeline.ts`, `packages/db/prisma/tenant/crm.prisma`; integrate 015d before013c.
- **Parallel-safe with TIP-015e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/core/src/crm/crm.module.ts`, `packages/core/src/inbox/services/pipeline.ts`, `packages/db/prisma/tenant/crm.prisma`; integrate 015e before013c.
- **Parallel-safe with TIP-015f (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/core/src/crm/crm.module.ts`, `packages/core/src/inbox/services/pipeline.ts`, `packages/db/prisma/tenant/crm.prisma`; integrate 015f before013c.
- **Parallel-safe with TIP-015g (coverage-closure manifest):** sequential, shares `packages/core/src/crm/crm.module.ts`; integrate 015g before013c.
- **Parallel-safe with TIP-017b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 013c before017b.
- **Parallel-safe with TIP-018b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 013c before018b.
- **Parallel-safe with TIP-019c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`; integrate 019c before013c.
- **Parallel-safe with TIP-020b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`; integrate 020b before013c.
- **Parallel-safe with TIP-020d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 020d before013c.
- **Parallel-safe with TIP-020e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`; integrate 020e before013c.
- **Parallel-safe with TIP-023b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/core/src/crm/crm.module.ts`, `packages/core/src/identity/identity.module.ts`; integrate 023b before013c.
- **Parallel-safe with TIP-023c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`; integrate 023c before013c.
- **Parallel-safe with TIP-023d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`; integrate 023d before013c.
- **Parallel-safe with TIP-023e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`; integrate 023e before013c.
- **Parallel-safe with TIP-023f (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`; integrate 023f before013c.
- **Parallel-safe with TIP-026b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `packages/core/src/crm/crm.module.ts`, `packages/db/prisma/tenant/crm.prisma`; integrate 026b before013c.
- **Parallel-safe with TIP-027b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`; integrate 027b before013c.
- **Parallel-safe with TIP-030b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`; integrate 030b before013c.
- **Parallel-safe with TIP-030c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`; integrate 030c before013c.
- **Parallel-safe with TIP-031b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`; integrate 013c before031b.
- **Parallel-safe with TIP-031c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 013c before031c.
- **Parallel-safe with TIP-032b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`; integrate 032b before013c.
- **Parallel-safe with TIP-032c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`; integrate 032c before013c.
- **Parallel-safe with TIP-032d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`; integrate 032d before013c.
- **Parallel-safe with TIP-033b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`; integrate 033b before013c.
- **Parallel-safe with TIP-034b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`; integrate 034b before013c.
- **Parallel-safe with TIP-034c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`; integrate 034c before013c.
- **Parallel-safe with TIP-034d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`; integrate 034d before013c.
- **Parallel-safe with TIP-036 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`; integrate 036 before013c.
- **Parallel-safe with TIP-037 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`; integrate 037 before013c.
- **Parallel-safe with TIP-038 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`; integrate 038 before013c.
- **Parallel-safe with TIP-038b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`; integrate 038b before013c.
- **Parallel-safe with TIP-039 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`; integrate 039 before013c.
- **Parallel-safe with TIP-040 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`; integrate 040 before013c.
- **Parallel-safe with TIP-041 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `packages/core/src/identity/identity.module.ts`; integrate 041 before013c.
- **Parallel-safe with TIP-042 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/components/MembersSection.tsx`, `packages/actions/src/settings.ts`, `packages/core/src/identity/identity.module.ts`; integrate 042 before013c.
- **Parallel-safe with TIP-042c (coverage-closure manifest):** sequential, shares `packages/core/src/inbox/services/pipeline.ts`, `packages/db/prisma/tenant/crm.prisma`; integrate 042c before013c.
- **Parallel-safe with TIP-043 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`; integrate 043 before013c.
- **Dòng COVERAGE nhận:** REQ-F01b-6; COM-8b-5; DC-081; DEF-013-1; D32; STD-domain-money-2.7.

## CONTEXT
- Hiện trạng đối chiếu mã 2026-11-02 (file:dòng, không tin trạng thái DONE):
  - `reports/crm-owner-stage-source-audit-2026-11-02.md`: `inbox/services/pipeline.ts:108` gán `contact.ownerUserId` không xét người có đang làm việc; DC-081 hoãn vì "chưa có dữ liệu ca".
  - `ai-agents.prisma:56 workingHours` là của agent; giờ làm việc workspace có (`working_hours.update`, `identity/actions/working-hours-update.handler.ts`); không có ca/vắng của thành viên.
  - 042b chỉ chia lead mới, giữ owner cũ; 022b là agent theo tài khoản kênh; 015d là chuyển chủ có duyệt — không cái nào xử lý owner vắng.

## APPLICABLE STANDARDS
- COMMERCE §8b L180; authz/rbac-permissions.md; domain/concurrency.md; database/indexing.md.
- Không đổi luật COMMERCE, 5 vai trò, quyền đã chốt, đơn giá Credit. Quyết định mới → DECISIONS (DC), câu hỏi → QUESTIONS.

## Rà trước khi làm
1. Đọc lại mọi file trong manifest sau khi TIP phụ thuộc đã tích hợp; lệch CONTEXT → sửa TIP/manifest trước khi code.
2. `python -X utf8 tools/obligations/manifests.py 013c` tính lại giao file; thêm path thì cập nhật manifest + header hai phía.
3. Đọc pipeline.ts + 042b eligible selection đã tích hợp; nối vào cùng chỗ chọn người, không thêm đường gán thứ hai.

## TASK
Thành viên có lịch ca + báo vắng; tin mới của khách có owner đang vắng/ngoài ca → hội thoại vào hàng chung hoặc agent của tài khoản kênh, không đổi owner khách.

## SPECIFICATIONS
### 1. Dữ liệu
1. Tenant `member_availability(user_id, weekly jsonb, tz)` và `member_absence(user_id, from, to, note)`; mặc định không có lịch = theo giờ làm việc workspace.
2. Action `availability.update_self` (risk write, chỉ cho chính mình — không cần permission quản trị, như sửa hồ sơ cá nhân) và `availability.update` (risk config, quyền members.manage); undo 24h.
### 2. Định tuyến
1. Inbound hội thoại 1-1 mới: owner tồn tại và đang làm việc → gán như cũ; vắng/ngoài ca/đã bị gỡ → `assignee_user_id = null` (hàng chung) + `assignee_agent_id` của tài khoản nếu có; ghi lý do `owner_unavailable` vào sự kiện hội thoại; không đổi `contact.owner`.
2. Owner quay lại không tự giật hội thoại đang có người xử lý.
### 3. UI
1. Hồ sơ cá nhân: lịch ca tuần + báo vắng; Cài đặt › Thành viên: quản lý ca thành viên; badge "Vắng" trong danh sách phân công.
### 4. Thành viên bị gỡ (DEF-013-1)
1. Consumer `member.removed` ở domain inbox: hội thoại đang gán người đó → hàng chung (sự kiện hội thoại ghi lý do).
2. Consumer ở domain crm: **không** tự chuyển khách; gửi một thông báo tới Owner/Quản lý kèm link bộ lọc "Khách của thành viên đã gỡ" (`owner_removed=true`) để họ dùng `contact.transfer_owner` của 015d từng khách hoặc theo lô bằng thanh chọn nhiều (bulk qua `bulk-dispatch` theo mẫu 034c). Không định nghĩa đối tượng "yêu cầu chuyển" mới.
### 5. Đồng phụ trách + giờ làm việc dùng chung
1. D32 (1 chính + đồng phụ trách / theo dõi): phần quyền xem chứng từ thuộc 042c (COM-8b-2), chuyển kèm lịch hẹn thuộc 015d (COM-8b-4); TIP này đảm bảo đồng phụ trách nhận hội thoại khi owner chính vắng (thứ tự: owner → đồng phụ trách đang làm việc → hàng chung).
2. SLA + mốc nhắc + availability dùng chung `businessTime` (`packages/shared/src/time/business-time.ts`), không tự tính giờ riêng.

## ACCEPTANCE CRITERIA
|AC|Given / When|Then — bằng chứng|
|---|---|---|
|1|Owner trong ca|gán owner|
|2|Owner báo vắng / ngoài ca / qua đêm / DST không áp dụng (VN)|hàng chung + agent — unit + integration|
|3|Owner đã bị gỡ|hàng chung|
|4|Inbound trùng (retry)|một hội thoại, một lần gán|
|5|Người khác đang xử lý khi owner quay lại|không đổi người|
|6|Gỡ thành viên đang phụ trách 30 khách|hội thoại về hàng chung; Owner nhận 1 thông báo; bộ lọc trả đúng 30 khách; owner khách giữ nguyên tới khi chuyển|
|7|Owner vắng, đồng phụ trách trong ca|gán đồng phụ trách|
|8|grep tính giờ làm việc riêng ngoài businessTime|0|

### Commands / evidence gate
- `pnpm --filter @appchat/core test -- test/availability.test.ts`
- `pnpm --filter @appchat/api test:integration -- test/integration/owner-availability.test.ts`
- `pnpm e2e settings-availability`
- Ba cổng D59 (khi làm · trước commit · chốt TIP); parity màn liên quan; E2E mock + http của luồng TIP. Lệnh là cổng tương lai, chưa chạy khi viết TIP.

## CONSTRAINTS
- Không đổi owner khách; không mượn quyền sla.manage; không tự gửi tin.
- Backend 200–400 dòng/file (trần 600), FE trần 400, màn chỉ orchestrator; test file riêng; ghi chỉ qua ActionExecutor; Postgres index `=` trước range/sort, EXPLAIN cho list mới.

## Quality Gate
- Manifest 23 path, header khai hai phía, 8 AC đo được. Viết 2026-11-02 trong đợt đóng lỗ hổng sổ phủ; rà độc lập ở `reports/coverage-closure-audit-2026-11-02.md`. Chưa code / chưa runtime.

## ⚠️ BUILDER-CHECKLIST
- [ ] Rà trước khi làm xong; manifest khớp.
- [ ] Mọi AC có test chạy thật, dán output.
- [ ] Cập nhật COVERAGE (parts + merge.py) với bằng chứng file:dòng + test.
- [ ] Commit, `git status --short` sạch, báo Git SHA; PR vào dev.
