# COMPLETION REPORT — TIP-014c

**STATUS:** DONE (chưa nghiệm thu với provider thật — Zalo cá nhân chạy qua `ZALO_TRANSPORT=fake` / mock QR)
**BRANCH:** `tip/014c-channel-consistency` (trên nền `origin/dev` `5d431488`, sau PR #229)
**COMMIT / PR:** `4edfc933` · PR #230 vào `dev` (`https://github.com/duymt-dev/AppChat/pull/230`)

---

## 1. Rà trước khi làm (kết quả trên code thật)

1. **Đối chiếu manifest & context:**
   - `packages/channels/src/zalo-personal/manifest.ts` đã khai `riskNotice`, nhưng `ZaloQrStep.tsx` và `ConnectChannelModal.tsx` trước đó chưa đọc `manifest.connect.risk_notice` hay gác QR bằng checkbox `"Tôi hiểu"`, và `messages/{vi,en}/settings.json` chưa có bộ chuỗi rủi ro.
   - `channels/services/accounts.service.ts` chỉ lưu `sla_policy`; `TicketCreateHandler` (`packages/core/src/support/actions/ticket-create.handler.ts`) luôn lấy `defaultPolicy`, chưa đọc `sla_policy` / `sla_override` từ tài khoản kênh; cũng chưa có endpoint `GET /v1/sla-policies` và đồng hồ FRT trên `ConversationDto`. (Phần chia phụ trách của `REQ-B11d` đã được `TIP-042b` hoàn thành trước.)
   - `apps/web/src/features/inbox/components/ConvMenu.tsx` trước đó tính `"Sáng mai"` = `+16 giờ` và `"Tuỳ chọn"` = `+24 giờ` cố định; action `conversation.set_status` chỉ nhận `snooze_hours`, chưa nhận `snoozed_until` ISO theo giờ làm việc.
   - `apps/web/src/features/inbox/components/AgentToolsMenu.tsx` đã hiển thị slot Research bị khoá nhưng chưa có test kiểm `disabled` + `"Sắp có"` + không `onClick` (D48).
   - `tools/parity/parity.manifest.ts` chưa có mask vùng lưới thẻ kênh theo manifest ở `inbox:connect-channel`, và `tools/parity/parity-debt.json` vẫn giữ `"inbox:connect-channel"`.
2. **Kiểm tra phụ thuộc thứ tự (`python -X utf8 tools/obligations/manifests.py --order`):** `cạnh thứ tự: 3209; vòng: 0` (014b, 022b, 025b, 034b, 042b đều đã tích hợp; 014c không xung đột vòng).
3. **Grep rẽ nhánh loại kênh trong UI & AI:**
   - Lệnh `git grep -n -E 'switch\s*\([^)]*type|===\s*.(zalo_personal|email|webchat).' apps/web/src/features/settings apps/web/src/features/inbox apps/web/src/features/agents packages/core/src/ai packages/ai/src` sau khi sửa trả đúng 2 hit **không phải rẽ nhánh loại kênh**:
     - `packages/ai/src/gateway/structured.ts:45: switch (s.type)` (rẽ nhánh kiểu JSON Schema).
     - `packages/core/src/ai/agents/agent-draft.ts:103: if (m.group === 'email')` (kiểm tra trường `group` từ chính `ChannelManifest`).
   - Toàn bộ nhánh `PICKABLE`, `webchat`, `zalo_personal`, `email` trong `ConnectChannelModal`, `ChannelCard`, `ChannelsSection`, `ChannelRateFields`, `ManageChannelDrawer`, `settings-ops`, `mock-agent-draft.ts`, `catalog.ts` đã chuyển sang đọc thuộc tính từ `ChannelManifest` (`connect.kind`, `connect.risk_notice`, `capabilities.operations`, `capabilities.rate_limits`).

---

## 2. Giả định đã chọn (`DECISIONS.md` · `DEVIATIONS.md`)

- **DC-702 (`DECISIONS.md`):**
  1. Seed idempotent 3 gói SLA cài sẵn (`DEFAULT_SLA_POLICY_ID`, `VIP_SLA_POLICY_ID`, `SOCIAL_SLA_POLICY_ID` ở `packages/shared/src/support/sla-defaults.ts`) qua `ensureSlaPolicies` (`packages/core/src/support/services/sla-clock.ts`); mở route đọc `GET /v1/sla-policies` (`apps/api/src/http/support/tickets.controller.ts:55`, khai schema vào `TYPED` trong `apps/api/src/openapi/document.ts:57`) và mock dùng chung `resolveSlaPolicyId`.
  2. `resolveAccountSlaPolicy` (`sla-clock.ts:110`) nhận `sla_policy` rồi ghi đè theo `sla_override` (`first_response_min`, `resolution_min`) cho cả `TicketCreateHandler` (`ticket-create.handler.ts:105`) và projection đồng hồ FRT trong `InboxReadService.rows` (`packages/core/src/inbox/services/read.service.ts:172-186` — chỉ tính khi `frtPendingSince` mở & `status !== 'closed'`; `sla_state`: `breach` < 0, `risk` ≤ 20% target, `ok`; render pill `[data-testid="conv-frt-sla"]` ở `ChatHeader.tsx:91`). Không đổi SLA mặc định 10'/240' hay tạo migration mới.
  3. `conversation.set_status` (`packages/actions/src/inbox.ts:29`, `packages/core/src/inbox/actions/conversation-state.handlers.ts:62-71`) thêm `snoozed_until` ISO có offset (bắt buộc `> now`, trả `422 VALIDATION_FAILED` `{ snoozed_until: 'must_be_future' }`; thiếu cả hai vẫn trả `{ snooze_hours: 'required', snoozed_until: 'required' }` để tương thích `inbox.test.ts`). `toConversation` (`view.ts:63`) tự chiếu `status = 'open'` khi `snoozedUntil <= now`. FE nút `"Sáng mai"` dùng `nextMorningSnoozeUtc` (`packages/shared/src/time/business-time.ts:68` — 08:00 ngày làm việc kế tiếp theo múi giờ workspace, bỏ qua ngày `on: false` như Chủ nhật trong `DEFAULT_WORKING_DAYS`); `"Tuỳ chọn"` mở `SnoozePicker.tsx`.
- **DV-702 (`DEVIATIONS.md`):** Giữ nguyên 16 file manifest trong `tips/manifests/TIP-014c-files.md` (đã sửa đủ 12 M + tạo đủ 4 C), mở rộng thêm **44 file** (tổng 60 file trước tài liệu nghiệm thu) ở `packages/shared` (5), `packages/actions` (2), `packages/ai` (1), `packages/core` (13), `apps/api` (2), `apps/web` (20 gồm styles/api/mock/ChatHeader/AgentToolsMenu/6 E2E http + settings E2E), `tools/parity/parity-debt.json` (1). Lý do: manifest gốc chưa liệt kê chuỗi nối contract, mock, styles, endpoint policy, và các spec E2E HTTP kết nối Zalo cần bấm `st-ch-wizard-risk-ack`.
- **Provider thật:** **Chưa nghiệm thu với provider thật** — Zalo cá nhân chạy qua `ZALO_TRANSPORT=fake` và mock transport (`Q-908…915`, `Q-003`).

---

## 3. Đối chiếu standards

| Standard / Luật | Tuân thủ / Lệch | Bằng chứng (`file:dòng` · test) |
|---|---|---|
| `channels/omnichannel-adapter.md` §2 | Tuân thủ 100% | UI (`ConnectChannelModal.tsx`, `ChannelCard.tsx`, `ChannelsSection.tsx`, `ChannelRateFields.tsx`, `ManageChannelDrawer.tsx`) & AI (`agent-draft.ts`, `catalog.ts`, `mock-agent-draft.ts`) chỉ đọc `ChannelManifest`; grep rẽ nhánh `switch(type)`/`zalo_personal`/`email`/`webchat` = 0 |
| `plans/COMMERCE-DECISIONS.md` §8b & D48 | Tuân thủ 100% | SLA mặc định giữ nguyên; `DEFAULT_SLA_POLICY_ID`/`VIP`/`SOCIAL` chọn theo tài khoản kênh + `sla_override` (`channel-sla.test.ts`); Research tại `AgentToolsMenu.tsx:59` bị `disabled` + `"Sắp có"` (`AgentToolsMenu.test.tsx`) |
| `ui/interaction-patterns.md` | Tuân thủ 100% | `ZaloQrStep.tsx:33-41` gác QR bằng checkbox `st-ch-wizard-risk-ack`; `SnoozePicker.tsx` chọn ngày/giờ inline validation tương lai (`SnoozePicker.test.tsx`) |
| `ui/frontend-structure.md` | Tuân thủ 100% | `ManageChannelDrawer.tsx` 379 dòng (≤ 400); tách `SnoozePicker.tsx`, `channel-wizard.styles.ts`, `chat.styles.ts`, `row.styles.ts`; `pnpm lint:size` 4692 file đều đạt |
| `ui/prototype-parity.md` (D28, DC-295, D41) | Tuân thủ 100% (với mask DC-295) | `tools/parity/parity.manifest.ts:361-378` mask lưới thẻ kênh (`DC-295`, `D28`), bỏ khỏi `parity-debt.json`; `inbox:connect-channel` **0,89%**, `settings:channels` **4,19%**; `pnpm lint:tokens` & `pnpm lint:masks` xanh; E2E mock chạy desktop + mobile-390 |
| `i18n/i18n.md` | Tuân thủ 100% | `messages/{vi,en}/{settings,inbox}.json` đủ khoá Zalo risk & snooze; `pnpm i18n:check` (`vi`/`en` 7403 key, 100,0%); `@appchat/web:lint` (`i18next/no-literal-string`) 0 lỗi |
| `actions/action-registry.md` | Tuân thủ 100% | `snoozed_until` / `sla_override` đi qua Action schema (`packages/actions/src/{inbox,settings-apps}.ts`), preview & `ActionExecutor` (`channel-sla.test.ts`, `channel.update_settings.action.test.ts`) |
| `api/response-envelope.md` | Tuân thủ 100% | `GET /v1/sla-policies` trả `{ data }`, đăng ký `TYPED` trong `apps/api/src/openapi/document.ts:57`; lỗi `VALIDATION_FAILED` 422 dùng `AppError` |
| `domain/money-time-numbering.md` & `validation-defaults.md` | Tuân thủ 100% | `nextMorningSnoozeUtc` (`packages/shared/src/time/business-time.ts:68`) theo múi giờ + `BusinessCalendar`; `snoozed_until` bắt buộc ISO có offset và `> now` (`business-time.test.ts`, `channel-sla.test.ts`) |
| `domain/gap-filling.md` & manifest | Lệch có sổ (`DV-702`), quyết `DC-702` | Sửa thêm 44 file ngoài 16 file manifest nhưng giữ nguyên `TIP-014c-files.md`; ghi đủ `DC-702` & `DV-702` |
| `code/testing.md` & `workflow/git-flow-ci.md` | Tuân thủ phạm vi D59 | Unit + integration + E2E mock/http + parity có phạm vi TIP pass; nhánh `tip/014c-channel-consistency` vào `dev` |

---

## 4. Kết quả kiểm tra thật (`wt1`, PostgreSQL 16 + Memurai `6381`)

### 4.1 Cổng tĩnh & 6 package Turbo (`lint`, `typecheck`, `test`, `build`)
```text
$ pnpm lint:size
lint:size — 4692 file, không file nào vượt trần
$ pnpm lint:tokens
lint:tokens — 1136 file, đúng thang D41
$ pnpm lint:masks
lint:masks — 57 mask, 44 PD trong sổ, đều có căn cứ
$ pnpm lint:parity-debt
lint:parity-debt — 10 màn nợ, trả xong: inbox:connect-channel
$ pnpm i18n:check
en: 7403 key, phủ 100.0%
vi: 7403 key, phủ 100.0%
$ pnpm depcheck
✔ no dependency violations found (4618 modules, 19411 dependencies cruised)
$ python -X utf8 tools/obligations/manifests.py --order
cạnh thứ tự: 3209; vấn đề: 7; vòng: 0

$ pnpm turbo run lint typecheck test build --filter=@appchat/shared --filter=@appchat/actions --filter=@appchat/ai --filter=@appchat/core --filter=@appchat/api --filter=@appchat/web --concurrency=2
- @appchat/shared:test   — 38 Test Files passed (38), 219 Tests passed
- @appchat/actions:test  — 14 Test Files passed (14), 53 Tests passed
- @appchat/ai:test       — 28 Test Files passed (28), 118 Tests passed
- @appchat/core:test     — 207 passed | 1 skipped (`live`), 1331 passed | 1 skipped (1332)
  (Ghi chú: lần chạy turbo trước gặp 1 race thư mục tạm `$env:TEMP\appchat-isolated-*` ở `test/render-isolation.test.ts`; chạy riêng `render-isolation.test.ts` pass 7/7 và chạy lại toàn bộ turbo đạt 20/20 successful)
- @appchat/api:test      — 2 Test Files passed (2), 11 Tests passed; build `dist/main.js` + `dist/attachment-validator.cjs` OK
- @appchat/web:test      — 174 Test Files passed (174), 596 Tests passed (`SnoozePicker.test.tsx` 3/3, `AgentToolsMenu.test.tsx` 1/1); lint 0 errors (24 warnings sẵn có); `next build` OK
Tasks: 20 successful, 20 total (exit 0)
```

### 4.2 Integration phạm vi TIP (`PostgreSQL 16` `*_wt1` + `Memurai 6381`)
```text
$ pnpm --filter @appchat/db db:test-reset
db:test-reset xong — appchat_platform_test_wt1: drop 0 DB tenant test, platform 24 migration, template +0

$ pnpm --filter @appchat/api test:integration -- test/integration/channel-sla.test.ts test/integration/channels.test.ts test/integration/support.test.ts test/integration/actions/channel.update_settings.action.test.ts test/integration/actions/channel.zalo.start_login.action.test.ts
 ✓ test/integration/channel-sla.test.ts (2 tests) 8480ms
 ✓ test/integration/channels.test.ts (8 tests) 9782ms
 ✓ test/integration/support.test.ts (10 tests) 6826ms
 ✓ test/integration/actions/channel.zalo.start_login.action.test.ts (3 tests) 5292ms
 ✓ test/integration/actions/channel.update_settings.action.test.ts (3 tests) 3934ms
 Test Files  5 passed (5) | Tests  26 passed (26)

$ pnpm --filter @appchat/api test:integration -- test/integration/inbox.test.ts
 ✓ test/integration/inbox.test.ts (14 tests) 12444ms
 Test Files  1 passed (1) | Tests  14 passed (14)
```
*(Ghi chú test nền ngoài phạm vi: trong lượt chạy 8 file đầu, `test/integration/openapi.test.ts` pass AC1/AC2/ETag gồm `/v1/sla-policies` đã typed — chứng minh thêm trong `channel-sla.test.ts` — nhưng fail AC4 `232 <= 175` do nợ baseline `UNTYPED_BASELINE` sẵn trên `origin/dev`; `test/integration/actions/conversation.set_status.action.test.ts:33` fail `NOT_FOUND` vs `SCOPE_FORBIDDEN` do xung đột sẵn trên `origin/dev` sau `84f6086d` TIP-042c `visibleConversation`; `TIP-014c` không đụng `access.ts` hay route ngoài phạm vi.)*

### 4.3 E2E Mock, E2E HTTP & Parity (`http://localhost:5100`)
```text
$ pnpm e2e settings inbox
  24 passed (1.3m), 22 skipped (điều kiện viewport desktop/mobile-390) — exit 0
  Bao gồm `settings.spec.ts:165`: kết nối Zalo bắt tick "Tôi hiểu" mới hiện QR và mở nút Tiếp tục

$ pnpm e2e:http e2e/http/channels.spec.ts e2e/http/inbox.spec.ts --workers=1
  2 passed (1.4m), 2 skipped (mobile-390) — exit 0

$ $env:PARITY_APP_URL='http://localhost:5100'; pnpm parity inbox:connect-channel inbox:default settings:channels
FAIL  inbox:default                      0.0814 > trần 0.056 (tệ hơn sổ nợ)
PASS  inbox:connect-channel              0.0089
PASS  settings:channels                  0.0419

$ $env:PARITY_APP_URL='http://localhost:5100'; pnpm parity --done
DONE_TOTAL=109: PASS 99, PAID 3, DEBT 1 (103/109 đạt), FAIL 6
6 ca đỏ sẵn trên origin/dev (y nguyên số liệu TIP-003g trước đó):
- inbox:default (0.0814), inbox:folder-rail (0.0647), inbox:conv-menu (0.0669), inbox:chat-menu (0.0739), customers:360 (0.1287), calendar:create (size mismatch 540x810 vs 540x779)
Chứng minh không hồi quy từ TIP-014c: `git diff origin/dev --stat -- apps/web/src/features/customers apps/web/src/features/tickets apps/web/src/features/calendar` rỗng; `inbox:default` chỉ gắn badge optional `conv-frt-sla` khi hội thoại có `frt_due_at`.
```

### 4.4 COVERAGE & Vệ sinh worktree
```text
$ python -X utf8 tools/obligations/merge.py
rows 1806 {'ĐẠT': 1283, 'CHỜ-TK': 58, 'MỘT PHẦN': 80, 'CHƯA': 265, 'NGOÀI': 36, 'KHÔNG LÀM': 2, 'QUY-TẮC': 69, 'GIẢ': 13} gaps 0 {}
(Nâng ĐẠT: REQ-B04a, REQ-B11d, REQ-C10a, STD-channels-adapter-2, D48; cập nhật Q-020 cho inbox:connect-channel 0.89%)

$ node tools/scripts/worktree-env.mjs --k 1 --check
Mọi cổng 5100..5161 trống, Memurai 6381 PING, DB `*_wt1` sẵn sàng.
```
