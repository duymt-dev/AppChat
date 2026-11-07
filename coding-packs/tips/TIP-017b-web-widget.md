# TIP-017b — Widget web: logo, nút hành động, nhiều widget, agent.status/typing, đủ danh sách agent

## HEADER
- TIP-ID: TIP-017b; Project: AppChat V2; Module: webchat widget; Priority: P1; Estimated: L. TIP bổ sung cho TIP-017 (đã DONE, không sửa file gốc — DC-233).
- Depends on: 022b, 045b (file security), 014b đã tích hợp; trước 044/045/046.
- **Files touched:** [exact M/C manifest](manifests/TIP-017b-files.md) — 17 paths (3 C). M path tương lai phải do TIP tạo trước tích hợp xong.
- **Parallel-safe with:** tuần tự với mọi TIP chung file (dòng khai hai phía bên dưới, máy kiểm `python -X utf8 tools/obligations/manifests.py --order`).
- **Parallel-safe with TIP-001b (coverage-closure manifest):** sequential, shares `apps/web/src/features/settings/components/WidgetSection.tsx`; integrate 001b before017b.
- **Parallel-safe with TIP-004b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 004b before017b.
- **Parallel-safe with TIP-013b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 013b before017b.
- **Parallel-safe with TIP-013c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 013c before017b.
- **Parallel-safe with TIP-014c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 014c before017b.
- **Parallel-safe with TIP-006b (coverage-closure manifest):** sequential, shares `apps/api/src/http/notify/realtime/ws.gateway.ts`; integrate 006b before017b.
- **Parallel-safe with TIP-012b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `packages/actions/src/settings-apps.ts`; integrate 012b before017b.
- **Parallel-safe with TIP-012c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 012c before017b.
- **Parallel-safe with TIP-015c (coverage-closure manifest):** sequential, shares `packages/core/src/channels/webchat/publisher.ts`; integrate 015c before017b.
- **Parallel-safe with TIP-015f (coverage-closure manifest):** sequential, shares `apps/api/src/http/notify/realtime/ws.gateway.ts`; integrate 015f before017b.
- **Parallel-safe with TIP-018b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 017b before018b.
- **Parallel-safe with TIP-019b (coverage-closure manifest):** sequential, shares `apps/api/src/http/notify/realtime/ws.gateway.ts`; integrate 019b before017b.
- **Parallel-safe with TIP-020b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 020b before017b.
- **Parallel-safe with TIP-020d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 020d before017b.
- **Parallel-safe with TIP-020e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 020e before017b.
- **Parallel-safe with TIP-023b (coverage-closure manifest):** sequential, shares `packages/core/src/channels/webchat/webchat.handlers.ts`; integrate 023b before017b.
- **Parallel-safe with TIP-023c (coverage-closure manifest):** sequential, shares `packages/actions/src/settings-apps.ts`; integrate 023c before017b.
- **Parallel-safe with TIP-026b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `packages/actions/src/settings-apps.ts`; integrate 026b before017b.
- **Parallel-safe with TIP-030b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 030b before017b.
- **Parallel-safe with TIP-031c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 017b before031c.
- **Parallel-safe with TIP-032b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 032b before017b.
- **Parallel-safe with TIP-033b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `packages/actions/src/settings-apps.ts`; integrate 033b before017b.
- **Parallel-safe with TIP-034b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 034b before017b.
- **Parallel-safe with TIP-037 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `packages/actions/src/settings-apps.ts`; integrate 037 before017b.
- **Parallel-safe with TIP-039 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 039 before017b.
- **Parallel-safe with TIP-041 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 041 before017b.
- **Parallel-safe with TIP-042 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 042 before017b.
- **Parallel-safe with TIP-042b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `packages/actions/src/settings-apps.ts`; integrate 042b before017b.
- **Parallel-safe with TIP-043 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 043 before017b.
- **Dòng COVERAGE nhận:** REQ-B05c; PRO-settings-widgetacts; DC-086; DEF-017-2; DEF-017-3; BP-4.6-c.

## CONTEXT
- Hiện trạng đối chiếu mã 2026-11-02 (file:dòng, không tin trạng thái DONE):
  - `webchat.update_widget` (`packages/actions/src/settings-apps.ts:256–275`) không có ô logo; `WidgetSection.tsx:72,91` `message.info(addActionSoon)`.
  - DC-086: một widget mỗi workspace (P1 nhiều widget); bảng `webchat_widget` gắn `channel_account(type=webchat)`.
  - `apps/api/src/http/notify/realtime/ws.gateway.ts:93` chỉ typing nhân viên `/ws`; `widget.gateway.ts` không phát `agent.status`/typing tới khách.
  - `channels/webchat/widget.service.ts:100–103` `agentChoices` lấy agent active/selected không phân trang, không test DB.

## APPLICABLE STANDARDS
- channels/omnichannel-adapter.md; ops/observability-security.md (public endpoint); REQ-B05.
- Không đổi luật COMMERCE, 5 vai trò, quyền đã chốt, đơn giá Credit. Quyết định mới → DECISIONS (DC), câu hỏi → QUESTIONS.

## Rà trước khi làm
1. Đọc lại mọi file trong manifest sau khi TIP phụ thuộc đã tích hợp; lệch CONTEXT → sửa TIP/manifest trước khi code.
2. `python -X utf8 tools/obligations/manifests.py 017b` tính lại giao file; thêm path thì cập nhật manifest + header hai phía.
3. Đo kích thước `apps/widget` dist hiện tại; thay đổi không được vượt +10 KB gzip.

## TASK
Hoàn thiện widget: logo, nút hành động thật, nhiều widget/tài khoản webchat, trạng thái agent + đang gõ tới khách, danh sách agent đúng.

## SPECIFICATIONS
### 1. Cấu hình
1. `update_widget { widget_id, logo_file_id, actions[{label, kind: link|phone|zalo|form, value}] ≤ 4 }`; logo qua 045b file security.
2. `actions[].value`: `link` chỉ `https:`; `phone` theo E.164 → `tel:`; `zalo` → `https://zalo.me/…`; cấm `javascript:`/`data:`/scheme khác (validate ở action + render widget).
3. Nhiều widget: `webchat.create_widget` tạo channel_account webchat mới, tính vào quota kênh của gói (cùng bộ đếm 039, không quota riêng, không giá mới); Cài đặt liệt kê widget, chọn để sửa.
### 2. Realtime khách
1. Widget gateway phát `agent.status {online|away}` (từ presence nhân viên/agent AI bật) và `typing` của người/AI đang trả lời hội thoại đó; throttle 3s; không lộ tên nhân viên nếu cấu hình ẩn.
### 3. Agent
1. `agentChoices` phân trang server + tìm kiếm; test DB active/selected/deleted, tách tenant.

## ACCEPTANCE CRITERIA
|AC|Given / When|Then — bằng chứng|
|---|---|---|
|1|Đổi logo + thêm 2 nút|widget nhúng hiện đúng — E2E http widget|
|2|Tạo widget thứ 2|mã nhúng riêng, hội thoại vào đúng tài khoản|
|3|Nhân viên gõ|khách thấy "đang trả lời" ≤ 1s|
|4|Nhân viên online → offline, AI bật/tắt|khách nhận `agent.status` online/away đúng — integration widget gateway|
|5|Nút action `javascript:alert(1)`|400 VALIDATION|
|6|Gói hết quota kênh|create_widget bị từ chối với lý do quota|
|7|> 50 agent|chọn được agent thứ 51 — integration|
|8|Bundle widget|≤ +10 KB gzip|

### Commands / evidence gate
- `pnpm --filter @appchat/widget build`
- `pnpm --filter @appchat/api test:integration -- test/integration/webchat.test.ts test/integration/webchat-multi.test.ts`
- `pnpm e2e:http webchat`
- Ba cổng D59 (khi làm · trước commit · chốt TIP); parity màn liên quan; E2E mock + http của luồng TIP. Lệnh là cổng tương lai, chưa chạy khi viết TIP.

## CONSTRAINTS
- Không giá mới; endpoint công khai giữ rate limit 045b.
- Backend 200–400 dòng/file (trần 600), FE trần 400, màn chỉ orchestrator; test file riêng; ghi chỉ qua ActionExecutor; Postgres index `=` trước range/sort, EXPLAIN cho list mới.

## Quality Gate
- Manifest 17 path, header khai hai phía, 8 AC đo được. Viết 2026-11-02 trong đợt đóng lỗ hổng sổ phủ; rà độc lập ở `reports/coverage-closure-audit-2026-11-02.md`. Chưa code / chưa runtime.

## ⚠️ BUILDER-CHECKLIST
- [ ] Rà trước khi làm xong; manifest khớp.
- [ ] Mọi AC có test chạy thật, dán output.
- [ ] Cập nhật COVERAGE (parts + merge.py) với bằng chứng file:dòng + test.
- [ ] Commit, `git status --short` sạch, báo Git SHA; PR vào dev.
