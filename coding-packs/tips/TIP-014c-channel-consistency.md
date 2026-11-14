# TIP-014c — Kênh: cảnh báo rủi ro Zalo, SLA theo tài khoản, UI chỉ đọc manifest, tạm ẩn hội thoại đúng mốc

## HEADER
- **Parallel-safe with TIP-048b (coverage-closure manifest):** sequential, shares `packages/core/src/channels/services/accounts.service.ts`; integrate 014c before048b.
- **Parallel-safe with TIP-048c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/inbox.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/components/ChannelCard.tsx`, `apps/web/src/features/settings/components/ConnectChannelModal.tsx`, `apps/web/src/features/settings/components/ManageChannelDrawer.tsx`, `tools/parity/parity.manifest.ts`; integrate 014c before048c.
- **Parallel-safe with TIP-048d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 014c before048d.
- **Parallel-safe with TIP-048e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 014c before048e.
- **Parallel-safe with TIP-048f (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/inbox.json`, `tools/parity/parity.manifest.ts`; integrate 014c before048f.
- **Parallel-safe with TIP-048g (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/inbox.json`, `tools/parity/parity.manifest.ts`; integrate 014c before048g.
- **Parallel-safe with TIP-048h (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/inbox.json`, `apps/web/messages/vi/settings.json`; integrate 014c before048h.
- **Parallel-safe with TIP-047b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 014c before047b.
- **Parallel-safe with TIP-047d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/inbox.json`, `apps/web/messages/vi/settings.json`, `tools/parity/parity.manifest.ts`; integrate 014c before047d.
- **Parallel-safe with TIP-026c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/inbox.json`, `tools/parity/parity.manifest.ts`; integrate 014c before026c.
- **Parallel-safe with TIP-032e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/inbox.json`, `tools/parity/parity.manifest.ts`; integrate 014c before032e.
- **Parallel-safe with TIP-006d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 014c before006d.
- TIP-ID: TIP-014c; Project: AppChat V2; Module: channels + inbox snooze; Priority: P0; Estimated: M. TIP bổ sung cho TIP-014 (đã DONE, không sửa file gốc — DC-233).
- Depends on: 014b, 022b, 025b, 034b, 042b đã tích hợp; trước 044/045/046.
- **Files touched:** [exact M/C manifest](manifests/TIP-014c-files.md) — 16 paths (4 C). M path tương lai phải do TIP tạo trước tích hợp xong.
- **Parallel-safe with:** tuần tự với mọi TIP chung file (dòng khai hai phía bên dưới, máy kiểm `python -X utf8 tools/obligations/manifests.py --order`).
- **Parallel-safe with TIP-015c (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 015c before014c.
- **Parallel-safe with TIP-019b (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 019b before014c.
- **Parallel-safe with TIP-023d (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 023d before014c.
- **Parallel-safe with TIP-023f (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 023f before014c.
- **Parallel-safe with TIP-023g (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 023g before014c.
- **Parallel-safe with TIP-027b (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 027b before014c.
- **Parallel-safe with TIP-032c (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 032c before014c.
- **Parallel-safe with TIP-032d (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 032d before014c.
- **Parallel-safe with TIP-034c (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 034c before014c.
- **Parallel-safe with TIP-034d (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 034d before014c.
- **Parallel-safe with TIP-038 (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 038 before014c.
- **Parallel-safe with TIP-038b (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 038b before014c.
- **Parallel-safe with TIP-040 (coverage-closure manifest):** sequential, shares `tools/parity/parity.manifest.ts`; integrate 040 before014c.
- **Parallel-safe with TIP-022d (coverage-closure manifest):** sequential, shares `packages/core/src/channels/services/accounts.service.ts`; integrate 014c before022d.
- **Parallel-safe with TIP-001b (coverage-closure manifest):** sequential, shares `apps/web/src/features/settings/components/ManageChannelDrawer.tsx`; integrate 001b before014c.
- **Parallel-safe with TIP-004b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 004b before014c.
- **Parallel-safe with TIP-013b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 013b before014c.
- **Parallel-safe with TIP-013c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 013c before014c.
- **Parallel-safe with TIP-012b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 012b before014c.
- **Parallel-safe with TIP-012c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 012c before014c.
- **Parallel-safe with TIP-015b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/inbox.json`; integrate 015b before014c.
- **Parallel-safe with TIP-015d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/inbox.json`; integrate 015d before014c.
- **Parallel-safe with TIP-015e (coverage-closure manifest):** sequential, shares `packages/core/src/support/actions/ticket-create.handler.ts`; integrate 015e before014c.
- **Parallel-safe with TIP-015f (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/features/inbox/components/ConvMenu.tsx`, `packages/core/src/support/actions/ticket-create.handler.ts`; integrate 015f before014c.
- **Parallel-safe with TIP-017b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 014c before017b.
- **Parallel-safe with TIP-018b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 014c before018b.
- **Parallel-safe with TIP-019c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/inbox.json`; integrate 019c before014c.
- **Parallel-safe with TIP-020b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 020b before014c.
- **Parallel-safe with TIP-020c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/inbox.json`; integrate 020c before014c.
- **Parallel-safe with TIP-020d (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/inbox.json`, `apps/web/messages/vi/settings.json`; integrate 020d before014c.
- **Parallel-safe with TIP-020e (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 020e before014c.
- **Parallel-safe with TIP-023b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/inbox.json`, `apps/web/src/features/inbox/components/ConvMenu.tsx`, `packages/core/src/support/actions/ticket-create.handler.ts`; integrate 023b before014c.
- **Parallel-safe with TIP-023c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/inbox.json`; integrate 023c before014c.
- **Parallel-safe with TIP-026b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/inbox.json`, `apps/web/messages/vi/settings.json`; integrate 026b before014c.
- **Parallel-safe with TIP-030b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/inbox.json`, `apps/web/messages/vi/settings.json`; integrate 030b before014c.
- **Parallel-safe with TIP-031c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 014c before031c.
- **Parallel-safe with TIP-032b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 032b before014c.
- **Parallel-safe with TIP-033b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/inbox.json`, `apps/web/messages/vi/settings.json`; integrate 033b before014c.
- **Parallel-safe with TIP-033c (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/vi/inbox.json`; integrate 033c before014c.
- **Parallel-safe with TIP-037 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`, `apps/web/src/features/settings/components/ManageChannelDrawer.tsx`, `packages/core/src/channels/services/accounts.service.ts`; integrate 037 before014c.
- **Parallel-safe with TIP-039 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 039 before014c.
- **Parallel-safe with TIP-041 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 041 before014c.
- **Parallel-safe with TIP-042 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 042 before014c.
- **Parallel-safe with TIP-042c (coverage-closure manifest):** sequential, shares `packages/core/src/support/actions/ticket-create.handler.ts`; integrate 042c before014c.
- **Parallel-safe with TIP-043 (coverage-closure manifest):** sequential, shares `apps/web/messages/en/settings.json`, `apps/web/messages/vi/settings.json`; integrate 043 before014c.
- **Parallel-safe with TIP-045b (coverage-closure manifest):** sequential, shares `apps/web/messages/en/inbox.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/inbox.json`, `apps/web/messages/vi/settings.json`; integrate 045b before014c.
- **Dòng COVERAGE nhận:** REQ-B04a; REQ-B11d; STD-channels-adapter-2; REQ-C10a; D48; Q-020.

## CONTEXT
- Hiện trạng đối chiếu mã 2026-11-02 (file:dòng, không tin trạng thái DONE):
  - `packages/channels/src/zalo-personal/manifest.ts:11` có `riskNotice: channels.zalo_personal.risk` nhưng FE không dùng, không có chuỗi i18n.
  - `channels/services/accounts.service.ts:18–19` lưu `assign_mode`/`sla_policy`; không code đọc. 042b nhận phần assignment của REQ-B11d; phần SLA chưa ai nhận (`support/actions/ticket-create.handler.ts:78` luôn dùng policy mặc định).
  - STD-channels-adapter-2: cần rà mọi consumer UI/AI còn `switch(type)` thay vì đọc ChannelManifest.
  - `features/inbox/components/ConvMenu.tsx:63` "sáng mai" = +16 giờ, "tuỳ chọn" = +24 giờ cố định.

## APPLICABLE STANDARDS
- channels/omnichannel-adapter.md §2; COMMERCE §8b; ui/interaction-patterns.md.
- Không đổi luật COMMERCE, 5 vai trò, quyền đã chốt, đơn giá Credit. Quyết định mới → DECISIONS (DC), câu hỏi → QUESTIONS.

## Rà trước khi làm
1. Đọc lại mọi file trong manifest sau khi TIP phụ thuộc đã tích hợp; lệch CONTEXT → sửa TIP/manifest trước khi code.
2. `python -X utf8 tools/obligations/manifests.py 014c` tính lại giao file; thêm path thì cập nhật manifest + header hai phía.
3. Grep `switch (.*type)|=== .zalo_personal.|=== .email.|=== .webchat.` trong `apps/web/src`, `packages/core/src/ai`, `packages/ai` — lập danh sách.

## TASK
Hiện cảnh báo rủi ro khi kết nối Zalo, áp SLA theo tài khoản kênh cho ticket/hội thoại, gỡ rẽ nhánh theo loại kênh ở UI/AI, sửa mốc Tạm ẩn.

## SPECIFICATIONS
### 1. Rủi ro Zalo
1. Wizard kết nối bước xác thực đọc `manifest.connect.riskNotice` → hộp cảnh báo + ô "Tôi hiểu" bắt buộc trước khi hiện QR.
### 2. SLA theo tài khoản
1. Ticket tạo từ hội thoại của tài khoản có `sla_policy` → dùng policy đó (thay mặc định); hội thoại hiện đồng hồ phản hồi đầu theo policy.
### 3. Manifest
1. Thay `switch(type)` bằng thuộc tính manifest (capabilities, connect.kind, icon, labels).
### 4. Tạm ẩn
1. "Sáng mai" = 08:00 ngày kế theo giờ làm việc workspace (`business-time`), "Tuỳ chọn" mở DateTimePicker.
### 5. Research khoá (D48)
1. Dòng Research/Web search trong menu ＋ giữ khoá + nhãn "Sắp có" (D48), không có onClick; thêm test.
### 6. Parity `inbox:connect-channel` (Q-020, DC-295)
1. Mask lưới kênh trong modal kết nối theo registry (như `inbox:account-switch`): chỉ so khung, tiêu đề, chip nhóm; lưới thẻ kênh render từ manifest (D28) nên mask có mã DC-295. `inbox:default` soi lại khi chạy `pnpm parity --done`, < 5%.

## ACCEPTANCE CRITERIA
|AC|Given / When|Then — bằng chứng|
|---|---|---|
|1|Kết nối Zalo|chưa tick "Tôi hiểu" không hiện QR|
|2|Ticket từ tài khoản có SLA riêng|hạn theo policy đó — integration|
|3|grep switch(type) ở UI/AI|0 (trừ adapter)|
|4|Tạm ẩn sáng mai lúc 21:00|tới 08:00 hôm sau — unit|
|5|Mở menu ＋|dòng Research khoá, có "Sắp có", bấm không làm gì — `AgentToolsMenu.test.tsx`|
|6|`pnpm parity inbox:connect-channel inbox:default`|< 5%; mask ghi chú DC-295 trong manifest|

### Commands / evidence gate
- `pnpm --filter @appchat/api test:integration -- test/integration/channel-sla.test.ts`
- `pnpm --filter @appchat/web test`
- `pnpm e2e settings inbox`
- Ba cổng D59 (khi làm · trước commit · chốt TIP); parity màn liên quan; E2E mock + http của luồng TIP. Lệnh là cổng tương lai, chưa chạy khi viết TIP.

## CONSTRAINTS
- Không đổi luật SLA mặc định.
- Backend 200–400 dòng/file (trần 600), FE trần 400, màn chỉ orchestrator; test file riêng; ghi chỉ qua ActionExecutor; Postgres index `=` trước range/sort, EXPLAIN cho list mới.

## Quality Gate
- Manifest 16 path, header khai hai phía, 6 AC đo được. Viết 2026-11-02 trong đợt đóng lỗ hổng sổ phủ; rà độc lập ở `reports/coverage-closure-audit-2026-11-02.md`. Chưa code / chưa runtime.

## ⚠️ BUILDER-CHECKLIST
- [ ] Rà trước khi làm xong; manifest khớp.
- [ ] Mọi AC có test chạy thật, dán output.
- [ ] Cập nhật COVERAGE (parts + merge.py) với bằng chứng file:dòng + test.
- [ ] Commit, `git status --short` sạch, báo Git SHA; PR vào dev.
