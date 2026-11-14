# TIP-022d — Zalo cá nhân: cap 200 tin chủ động / ngày cấu hình được

## HEADER
- **Parallel-safe with TIP-051b (coverage-closure manifest):** sequential, shares `packages/core/src/channels/services/accounts.service.ts`; integrate 022d before051b.
- **Parallel-safe with TIP-048b (coverage-closure manifest):** sequential, shares `packages/core/src/channels/jobs/send.processor.ts`, `packages/core/src/channels/services/accounts.service.ts`; integrate 022d before048b.
- TIP-ID: TIP-022d; Project: AppChat V2; Module: channels send policy; Priority: P0; Estimated: S. TIP bổ sung cho TIP-022 (đã DONE, không sửa file gốc — DC-233).
- Depends on: 014b, 037 (dùng cap cho chiến dịch) đã tích hợp; trước 044/045/046.
- **Files touched:** [exact M/C manifest](manifests/TIP-022d-files.md) — 4 paths (1 C). M path tương lai phải do TIP tạo trước tích hợp xong.
- **Parallel-safe with:** tuần tự với mọi TIP chung file (dòng khai hai phía bên dưới, máy kiểm `python -X utf8 tools/obligations/manifests.py --order`).
- **Parallel-safe with TIP-003g (coverage-closure manifest):** sequential, shares `packages/core/src/channels/jobs/send.processor.ts`; integrate 003g before022d.
- **Parallel-safe with TIP-014c (coverage-closure manifest):** sequential, shares `packages/core/src/channels/services/accounts.service.ts`; integrate 014c before022d.
- **Parallel-safe with TIP-015c (coverage-closure manifest):** sequential, shares `packages/core/src/channels/jobs/send.processor.ts`; integrate 015c before022d.
- **Parallel-safe with TIP-015f (coverage-closure manifest):** sequential, shares `packages/core/src/channels/jobs/send.processor.ts`; integrate 015f before022d.
- **Parallel-safe with TIP-020c (coverage-closure manifest):** sequential, shares `packages/core/src/channels/jobs/send.processor.ts`; integrate 020c before022d.
- **Parallel-safe with TIP-022b (coverage-closure manifest):** sequential, shares `packages/core/src/channels/services/accounts.service.ts`; integrate 022b before022d.
- **Parallel-safe with TIP-022c (coverage-closure manifest):** sequential, shares `packages/core/src/channels/jobs/send.processor.ts`; integrate 022c before022d.
- **Parallel-safe with TIP-023b (coverage-closure manifest):** sequential, shares `packages/channels/src/zalo-personal/manifest.ts`, `packages/core/src/channels/jobs/send.processor.ts`; integrate 023b before022d.
- **Parallel-safe with TIP-025b (coverage-closure manifest):** sequential, shares `packages/channels/src/zalo-personal/manifest.ts`; integrate 025b before022d.
- **Parallel-safe with TIP-040 (coverage-closure manifest):** sequential, shares `packages/core/src/channels/jobs/send.processor.ts`; integrate 040 before022d.
- **Parallel-safe with TIP-042b (coverage-closure manifest):** sequential, shares `packages/core/src/channels/services/accounts.service.ts`; integrate 042b before022d.
- **Parallel-safe with TIP-045b (coverage-closure manifest):** sequential, shares `packages/core/src/channels/jobs/send.processor.ts`; integrate 045b before022d.
- **Dòng COVERAGE nhận:** BP-5.4-b.

## CONTEXT
- Hiện trạng đối chiếu mã 2026-11-02 (file:dòng, không tin trạng thái DONE):
  - `packages/channels/src/zalo-personal/manifest.ts:22` có jitter 2–6s; `perDayProactive` không đặt → `channels/jobs/send.processor.ts:43` không có cap mặc định. D35c mặc định 200 — 037 nhận D35c cho chiến dịch nhưng cap kênh (mọi tin chủ động, không chỉ chiến dịch) chưa ai nhận.

## APPLICABLE STANDARDS
- channels/omnichannel-adapter.md; D35c; REQ-B04 (an toàn tài khoản).
- Không đổi luật COMMERCE, 5 vai trò, quyền đã chốt, đơn giá Credit. Quyết định mới → DECISIONS (DC), câu hỏi → QUESTIONS.

## Rà trước khi làm
1. Đọc lại mọi file trong manifest sau khi TIP phụ thuộc đã tích hợp; lệch CONTEXT → sửa TIP/manifest trước khi code.
2. `python -X utf8 tools/obligations/manifests.py 022d` tính lại giao file; thêm path thì cập nhật manifest + header hai phía.
3. Đọc 037 cap chiến dịch đã tích hợp; cap kênh là trần chung, chiến dịch dùng phần của nó — không đếm hai lần.

## TASK
Đặt `perDayProactive` mặc định 200 cho Zalo cá nhân, cấu hình theo tài khoản, áp cho mọi tin chủ động (không phải trả lời trong 24h hội thoại khách nhắn).

## SPECIFICATIONS
### 1. Cap
1. Manifest `perDayProactive: 200`; `channel.update_settings` cho chỉnh 50–500 (cảnh báo rủi ro khi > 200).
2. Đếm theo ngày tz workspace bằng khoá Redis + bảng dự phòng; vượt cap → tin chờ ngày sau với trạng thái `deferred_cap`, không mất.

## ACCEPTANCE CRITERIA
|AC|Given / When|Then — bằng chứng|
|---|---|---|
|1|Gửi 201 tin chủ động|200 gửi, 1 deferred|
|2|Trả lời khách vừa nhắn|không tính cap|
|3|Mất Redis|đếm từ bảng, không vượt|

### Commands / evidence gate
- `pnpm --filter @appchat/core test -- test/zalo-cap.test.ts`
- `pnpm --filter @appchat/api test:integration -- test/integration/channels.test.ts`
- Ba cổng D59 (khi làm · trước commit · chốt TIP); parity màn liên quan; E2E mock + http của luồng TIP. Lệnh là cổng tương lai, chưa chạy khi viết TIP.

## CONSTRAINTS
- Không nới an toàn tài khoản; không đổi jitter.
- Backend 200–400 dòng/file (trần 600), FE trần 400, màn chỉ orchestrator; test file riêng; ghi chỉ qua ActionExecutor; Postgres index `=` trước range/sort, EXPLAIN cho list mới.

## Quality Gate
- Manifest 4 path, header khai hai phía, 3 AC đo được. Viết 2026-11-02 trong đợt đóng lỗ hổng sổ phủ; rà độc lập ở `reports/coverage-closure-audit-2026-11-02.md`. Chưa code / chưa runtime.

## ⚠️ BUILDER-CHECKLIST
- [ ] Rà trước khi làm xong; manifest khớp.
- [ ] Mọi AC có test chạy thật, dán output.
- [ ] Cập nhật COVERAGE (parts + merge.py) với bằng chứng file:dòng + test.
- [ ] Commit, `git status --short` sạch, báo Git SHA; PR vào dev.
