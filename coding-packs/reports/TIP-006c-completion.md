### COMPLETION REPORT — TIP-006c

**STATUS:** DONE — một PR (`tip/006c-realtime-events`, xếp chồng #221). SHA ở bảng tiến độ `goals/GOAL-RELEASE.md` dòng 54. AC1 / AC2 / AC3 đạt bằng integration Postgres 16 + Memurai thật; E2E http AC1 — xem dòng E2E bên dưới.

**TÓM TẮT:**
- **`credits.changed` (§1.1):**
  - Mọi thay đổi ví đã ghi sổ (`applied`; ref trùng không tính) gọi listener với cờ `changed` → outbox tenant `credits.changed {balance_plan, balance_topup, ledger_id}` cùng lô với `credits.low/exhausted/restored`.
  - Luật WS phát hai gói: người có `billing.manage` nhận số dư; người khác nhận `{event_id}` (bộ lọc mới `require.without`). Không ai nhận cả hai.
  - FE làm mới `['billing']`, `['dashboard']`, `me` (số dư ở menu người dùng).
- **`ui.command` (§1.2):**
  - "Phiên" = tab trình duyệt. Client sinh `tab_id` mỗi lần tải trang và gửi ở handshake `/ws` và mỗi lượt Trợ lý; server lưu `ai_run.input.tab_id` (không vào hash idempotent).
  - Gateway cho socket vào phòng `tab:{userId của JWT}:{tab}`. Tool `ui` hợp lệ → outbox `ui.command_issued` (stream run) → WS `ui.command` chỉ tới tab đó, cần `assistant.use`.
  - Không tab (client cũ / tác vụ nền) → không phát; lệnh vẫn đi trong sự kiện lượt.
  - FE chạy lệnh đúng một lần dù tới bằng sự kiện lượt hay realtime (`ui-command-once.ts`).
- **Registry (§2.1):**
  - `TenantDbResolver.invalidate` xoá cục bộ + publish `tenant-registry:invalidate`; `drop` (phía nhận) chỉ xoá cục bộ, không phát lại.
  - Kernel nối kênh ở mọi api / worker có DB + Redis (`kernel/tenant/registry-bus.ts`).
  - Mất Redis → nuốt lỗi + cảnh báo; resolver vẫn theo TTL 60s + thế hệ trạng thái 2s (TIP-040).
- **Rà trước khi làm (§3):** 019b đã phát `run.step` / `run.done` (`ai/events/run.rules.ts`); `conversation.counts` của 025b là invalidation-only (FE làm mới đếm từ `message.*` / `conversation.updated`) — TIP này không làm lại.

**FILES CHANGED** (lệch manifest ở DV-121)
- shared `events.ts` (2 schema), `events/protocol/aggregate.ts`.
- db `registry-pubsub.ts` (mới), `tenant-resolver.ts`, `index.ts`.
- core:
  - `billing/services/wallet.service.ts`, `billing/events/{billing.events,billing.rules}.ts`.
  - `notify/realtime/{envelope,filter}.ts`, `notify/public.ts`.
  - `ai/assistant/{ui-command (mới),meta-tools,types,assistant-prompt,turn.service}.ts`, `plans/continue.ts`, `ai/events/ui-command.rules.ts` (mới), `ai/ai.module.ts`, `ai/jobs/ai.jobs.module.ts`.
  - `kernel/kernel.module.ts`, `kernel/tenant/registry-bus.ts` (mới).
- api `http/ai/assistant.controller.ts` (`tab_id`), `http/notify/realtime/ws.gateway.ts` (phòng tab).
- web:
  - `shared/realtime/{socket,tab-id (mới),event-invalidation}.ts`.
  - `shared/assistant/{turn-stream,useScreenAssistant,ui-command-once (mới),useRealtimeUiCommands (mới)}.ts`.
  - `features/assistant/hooks/useAssistantChat.ts`, `shared/shell/AppShell.tsx`.
- test:
  - db `registry-invalidate.test.ts`, core `realtime-events-006c.test.ts`.
  - api `realtime-events.test.ts`, e2e http `realtime-events.spec.ts`.

**TEST**

| Cổng | Kết quả |
|---|---|
| Unit db | `registry-invalidate` 4 + resolver / generation → **21/21** |
| Unit core (toàn bộ) | **1285 passed** (1 skipped) — mới `realtime-events-006c` 6 |
| Unit shared | 210/210 (event-protocol khớp EVENT_SCHEMAS ↔ AGGREGATE_RULES) |
| Unit web (assistant / realtime / billing) | 51/51 |
| Integration API (Postgres 16 + Memurai thật) | `realtime-events` **4/4**: AC1 nạp Credit → Owner nhận số dư, Sales tín hiệu không số, ref trùng không phát; AC2 chỉ tab người ra lệnh nhận (tab khác cùng người / người khác không), lượt không tab không ghi, `tab_id` sai dạng → 422; AC3 hai resolver qua Redis thật, B từ chối < 2s khi đồng hồ B đứng yên |
| Hồi quy integration | `realtime` · `record-scope-realtime` · `assistant` · `billing-alerts` xanh; `billing.test` 8/9 — AC9 (`GET /billing/summary` 500) **đỏ sẵn trên code nền** (stash kiểm) → Q-069, ngoài phạm vi |
| E2E http (`E2E_HTTP_PORT=3538`, `TENANT_CLIENT_CACHE=10`, `--workers=1`) | `realtime-events` **1/1** desktop (mobile bỏ qua — luồng desktop): tab A đứng ở Ví, tab B mua gói credit, webhook ngân hàng giả → tab A hiện `11.050` không F5, không poll (1.7 phút) |
| E2E mock (`E2E_PORT=3537`, sửa lớp `shared/assistant` + AppShell) | `assistant` · `screen-assistant` · `assistant-vertical` · `settings-billing` **26 passed** (24 bỏ qua theo thiết bị) |
| Typecheck / lint / depcheck / lint:size / i18n | sạch · 0 vi phạm · không file vượt trần · 100% |

**ĐỐI CHIẾU STANDARDS** (APPLICABLE STANDARDS của TIP):

| Standard | Tuân thủ (file / test) | Lệch |
|---|---|---|
| `events/outbox.md` | Cả hai sự kiện đi qua outbox tenant (ví: sink sau commit nền tảng như `credits.*`; lệnh UI: transaction có collector) → relay → consumer realtime lọc quyền rồi emit (§8); tên `<entity>.<past_tense>` (`ui.command_issued`), schema zod + `AGGREGATE_RULES`; payload chỉ id / số dư / lệnh đã qua schema đóng | WS giữ tên Blueprint `ui.command` (DV-121) |
| `ops/observability-security.md` | Số dư chỉ tới `billing.manage`; phòng tab ghép userId của JWT (tab giả không nhận lệnh người khác); `tab_id` regex chặt ở API + schema event; lỗi kênh registry ghi cảnh báo, không lộ ra client | — |
| `database/tenant-db.md` | DB tenant chỉ qua `TenantDbResolver`; vô hiệu cache không đổi cách lấy client; không bảng / migration mới | — |
| `authz/rbac-permissions.md` | Không quyền mới; `billing.manage` (danh mục không có `billing.view`), `assistant.use` cho `ui.command` | — |
| `code/testing.md` | Test ở file riêng; unit + integration native + E2E http; D59 chỉ phạm vi TIP | — |
| `workflow/git-flow-ci.md` | Nhánh `tip/006c-realtime-events`, PR vào dev, xếp chồng ghi trong thân PR | — |

**DEVIATIONS:** DV-121. **DECISIONS:** DC-449. **QUESTIONS:** Q-069 (billing AC9 đỏ sẵn).
