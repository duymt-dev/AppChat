### COMPLETION REPORT — TIP-042b

**STATUS:** DONE. PR (`tip/042b-lead-routing`) xếp chồng trên #88 (TIP-042) → #87 → #86 — merge theo thứ tự #86 → #87 → #88 → PR này. AC 8/8.

**COMMIT:** `16fb7789` (backend) · `5e9acd3f` (FE) · commit chốt (khách mới từ lịch sử, sửa cổng, report + sổ) — SHA ghi ở bảng tiến độ `goals/GOAL-RELEASE.md`.

**MIGRATION** (tenant — workspace cũ / demo cần `pnpm --filter @appchat/db db:migrate-tenants`): `20261102004210_lead_routing` — bảng `lead_routing_rule` (CHECK mode, CHECK team_id XOR user_ids), `lead_routing_cursor` (FK cascade), `lead_routing_decision`; unique `lead_routing_rule_default_key ((true)) WHERE channel_account_id IS NULL`, `lead_routing_rule_account_key`, `lead_routing_decision_contact_key`, `lead_routing_decision_event_key`; `conversation_routing_load_idx (assignee_user_id) INCLUDE (id)` partial open / pending / snoozed, chưa lưu trữ / ẩn. Expand-only; không backfill — DC-238: workspace cũ có `assign_mode` cũ vẫn **tắt** tới khi có người bật rule.

**PHẦN ĐÃ LÀM:**
- **Rule canonical** — `lead_routing.update` (crm.reassign, config, `agentGrantable:false`, undo 24h, CAS `if_version`, tạo lần đầu qua Idempotency-Key của Executor): rule mặc định (`channel_account_id` null) + một ghi đè mỗi tài khoản kênh; pool `user_ids` (≤ 100, không trùng, thành viên active) XOR `team_id`; `by_channel` chỉ ở ghi đè, cần `fixed_user_id` thuộc pool; bật tự động mà pool rỗng → 422; trùng rule → 409 `CONFLICT {rule_id}`. Tắt → bật chốt `enabled_at` (Clock). Preview: số người nhận + cảnh báo `new_leads_only` / `history_import_counts`.
- **Chia lead** — pipeline phát `lead.routing_requested` (schema trong `EVENT_SCHEMAS`) cùng giao dịch outbox **chỉ khi tin 1-1 vừa tạo khách** (live hoặc lịch sử nhập — DC-238 "lead mới" = lúc tạo khách; nhóm / khớp SĐT / identity khách cũ không phát). Consumer `crm.lead-routing` (CrmJobsModule, ROLE=jobs) → `lead_routing.apply` nguồn system (actor `system:lead-routing`, `SYSTEM_ONLY`, chặn preview): nạp lại event đã lưu (đúng topic + workspace), khoá con trỏ → khách → hội thoại; chỉ cấp chủ **đầu tiên** (owner null, chưa xoá, stage lead, khách tạo sau `enabled_at` theo `occurred_at` của event), gán hội thoại 1-1 chỉ khi còn trống (không đụng `assignee_agent_id` / `ai_mode`); một quyết định mỗi khách + mỗi event (unique) — chạy lại trả kết quả cũ, con trỏ không tiến hai lần. Lý do no-op: `manual`, `has_owner`, `not_lead`, `before_enabled`, `manually_assigned`, `no_eligible`, `contact_gone`. Event `contact.owner_changed` (move đều false, `auto`) + `conversation.assigned` (`auto:true`, đúng shape thông báo).
- **Chọn người** — ứng viên = pool ∩ membership active ∩ quyền **hiện tại** crm.view / crm.edit / inbox.view / inbox.reply (vai trò hệ thống ROLE_DEFS hoặc vai trò tuỳ biến còn sống + uỷ quyền, một lượt đọc gom; Owner luôn đủ; không theo tên vai trò / online). round_robin: sắp theo user_id, người kế sau con trỏ, vòng lại; least_busy: ít hội thoại người phụ trách open / pending / snoozed nhất (index `conversation_routing_load_idx`), hoà → vòng tròn; by_channel: người cố định (không đủ điều kiện → `no_eligible`, không lùi người khác).
- **Cấu hình kênh cũ** — `channel.update_settings` không nhận `shift` mới; patch có `assign_mode` cần thêm crm.reassign ngoài channels.manage. `GET /settings/channels` thêm `routing` từng tài khoản (ghi đè / mặc định / chưa cấu hình). `shift` vẫn đọc được (DTO) và hiện nhãn "kiểu cũ — không chạy".
- **Đọc** — `GET /v1/settings/lead-routing` (crm.reassign): rules + ứng viên (thành viên, nhóm, tài khoản kênh + `legacy_assign_mode`), zod chung với mock.
- **UI** — Cài đặt › "Routing & assignment" (nav "Chia lead", nhóm TỰ ĐỘNG HOÁ): ghi chú "chỉ lead mới", hàng rule mặc định + một hàng mỗi tài khoản kênh (nhãn trạng thái + Sửa) → `LeadRoutingEditor` (bật, chiến lược, người / nhóm, người cố định; STALE_VERSION / CONFLICT → tải lại). `ChannelRoutingFields` thay ô "Cách chia" ở wizard bước 3 + drawer Quản lý kênh: hiện rule đang áp, nút mở Chia lead (crm.reassign), không thì chỉ đọc. PD-019.

**FILES CHANGED:** theo manifest TIP (44 path). Lệch — DV-026:
- **Thêm ngoài manifest:** `crm/routing/routing-apply.handler.ts` (handler system tách riêng), FE `routing.types.ts`, `hooks/useLeadRouting.ts`, `styles/routing.styles.ts`; mock `shared/api/mock/domains/lead-routing.ts` (+ store / routes / handlers); `ai/assistant/catalog.ts` (SYSTEM_ONLY), `kernel/actions/tip-owners.ts`, `shared/src/events.ts` (schema), `channels/services/read.service.ts` (`routing`), `crm/public.ts`; lịch sử: `channels/operations/{history-run,types}.ts` (phát cho khách mới từ lịch sử); test `actions/lead_routing.{update,apply}.action.test.ts` (ma trận), `actions-unit.test.ts` (mã TIP có hậu tố chữ), `assistant-coverage.test.ts` (ô `rule_id` / `fixed_user_id`), `channel-history.test.ts` (khẳng định lead từ lịch sử).
- **M không cần sửa:** `apps/web/src/features/settings/api.ts` (query ở `api/lead-routing.ts`).

**TEST RESULTS** (đầu cổng chốt đã chạy `db:test-reset`):
- Acceptance criteria: 8/8
  1. **AC1 cấu hình** — Owner tạo / sửa; sales / cs → 403 (HTTP + GET); CAS cũ 409; thiếu `if_version` 422; người lạ 422 `not_member`; tài khoản lạ 404; `shift` 422; trùng rule 409; preview Trợ lý → xác nhận; idempotency cùng khoá; undo trả cấu hình, không đảo chủ đã cấp. `lead-routing.test.ts`, ma trận `lead_routing.update.action.test.ts`, contract.
  2. **AC2 chế độ** — 9 lead / 3 người vòng tròn = 3-3-3 theo thứ tự id, con trỏ bền trong DB; least_busy chọn tải tối thiểu (dữ liệu thật); by_channel người cố định; ghi đè manual không lùi về mặc định → `manual`; không rule → `manual`. Unit: least_busy 3/1/2 → người 1, hoà vòng tròn, con trỏ trỏ người đã bị gỡ khỏi pool không kẹt (`packages/core/test/lead-routing.test.ts`).
  3. **AC3 không giành** — khách cũ khớp / nhóm → không event; hội thoại gán tay trước worker → `manually_assigned`, chủ giữ nguyên; khách đã có chủ → `has_owner`; stage khác lead / đã xoá → no-op (unit); khách tạo trước `enabled_at` → `before_enabled`.
  4. **AC4 đua** — cùng event giao 3 lần song song + thêm lần nữa → 1 quyết định, 1 chủ, 1 `contact.owner_changed`, con trỏ tiến đúng 1 lần; hai lead khác nhau song song → hai người khác nhau (khoá con trỏ).
  5. **AC5 bảo mật** — `lead_routing.apply` qua HTTP (Owner, ui / assistant) → 403, `x-action-source: system` → 422; ẩn khỏi Trợ lý / agent; actor system khác (loyalty) → 403; event workspace khác / sai topic → 404; input chỉ `event_id`. Ứng viên theo quyền hiện tại (vai trò tuỳ biến đã xoá / thành viên không active bị loại — unit).
  6. **AC6 kênh** — pipeline (Zalo giả, webchat) → outbox bền → consumer → Executor; lịch sử: khách mới từ lần nhập phát đúng 1 yêu cầu, khách cũ không (`channel-history.test.ts`); event `lead.routing_requested` parse `EVENT_SCHEMAS`. SLA không đổi.
  7. **AC7 migration / UI** — `assign_mode: shift` cũ vẫn đọc được (`/settings/channels` + `legacy_assign_mode`), không tự bật; mock = HTTP cùng zod (contract); E2E mock `settings-routing.spec.ts` (bật vòng tròn, ghi đè by_channel, drawer kênh hiện rule đang áp không còn "Cách chia", Quản lý vào được / CSKH 403, mobile 390 không tràn ngang) + E2E http `settings-routing.spec.ts` (bật → tải lại đọc DB → kết nối Zalo → drawer "Theo mặc định · Xoay vòng" → ghi đè thủ công).
  8. **AC8 truy vấn / kiến trúc** — EXPLAIN (6.000 hội thoại, ANALYZE bằng chủ bảng): truy vấn tải pool nhỏ → `conversation_routing_load_idx`, pool 100 → không Seq Scan; rule theo tài khoản / mặc định, quyết định theo khách / event → đúng unique index. Ứng viên đọc gom (1 membership + 1 role), không N+1 từng người.
- Lệnh đã chạy:
  - `turbo lint typecheck test build` 7 package (shared / actions / core / db / api / worker / web) — 24/24 task: unit core 527 · web 300 · shared 135 · db 21 · actions 12 · api 11 · worker 7; chạy lại core / api / worker sau sửa lịch sử: 11/11.
  - Integration 9 file trong phạm vi (lead-routing · lead-routing.contract · 2 ma trận · mục lục actions · channels · inbox · crm-contacts · channel-history) — **67 passed**.
  - E2E mock `settings-routing` + `settings` (+ `settings-channel-friends` lượt đầu) — passed (desktop / mobile skip theo spec); E2E http `settings-routing` + `channels` (+ `settings-roles` lượt đầu) — passed, API + worker build mới, cổng 4327 / 3428.
  - Parity: `settings:routing` (mới) 2,24% · `settings:channels` 4,19%; `parity --done` 102 PASS, `inbox:connect-channel` 6,20% ≤ trần 6,5% (DC-360).
  - `depcheck` 0 lỗi (cảnh báo vòng ở mock domain theo mẫu sẵn có store / routes / handlers — như TIP-042); `check:bundle` api / worker đạt; lint:size / lint:tokens / i18n:check (5.517 key, 100%) sạch.
- Chưa nghiệm thu với provider thật: Zalo thật (Q-003) — chỉ transport giả.

**ISSUES DISCOVERED:**
- EXPLAIN trong integration trên bảng rỗng / chưa ANALYZE bằng chủ bảng (user test không ANALYZE được) làm planner chọn index bất kỳ → test dựng dữ liệu + ANALYZE qua kết nối provisioner.
- Test `actions-unit` bắt mã TIP đúng 3 chữ số → nới cho phép hậu tố chữ (`042b`).

**ĐỐI CHIẾU STANDARDS** (mục APPLICABLE STANDARDS của TIP):

| Standard | Tuân thủ (file / test) | Lệch |
|---|---|---|
| `actions/action-registry.md` | 2 action zod, risk config / write, `agentGrantable:false`, undo 24h cho update, `Example` kiểm bằng unit; 2 file ma trận | — |
| `events/outbox.md` | `lead.routing_requested` ghi cùng giao dịch inbound / lịch sử; consumer `event_consumption` + unique quyết định; event hiệu ứng trong giao dịch apply | — |
| `api/response-envelope.md` | `{data}`; 409 `STALE_VERSION` / `CONFLICT {rule_id}`; 422 theo ô; 403 `{permission}` | — |
| `authz/rbac-permissions.md` | crm.reassign (GET + update + patch assign_mode); ứng viên theo quyền hiện tại, không theo tên vai trò; Owner từ `ownerUserId` | — |
| `database/tenant-db.md` + `indexing.md` | Bảng tenant không `workspace_id`; partial unique; index tải partial + INCLUDE; EXPLAIN trong contract test | Không có endpoint danh sách quyết định (không cần — TIP nói không thêm) |
| `domain/concurrency.md` | Thứ tự khoá cố định con trỏ → khách → hội thoại; CAS rule `FOR UPDATE` + version; quyết định unique | — |
| `domain/validation-defaults.md` / `gap-filling.md` | pool ≤ 100, không trùng; DC-238 (opt-in, định nghĩa tải, lead mới = lúc tạo khách) | — |
| `channels/omnichannel-adapter.md` | Adapter không đổi — pipeline dùng NormalizedInbound | — |
| `ops/observability-security.md` | Quyết định không lưu tin / SĐT; log consumer theo runner sẵn có | — |
| `ui/frontend-structure.md` / `interaction-patterns.md` | Section orchestrator ≤ 86 dòng, editor / fields / hook / types / styles tách file; ghi chỉ `useAction`; đóng hộp chỉ khi thành công | — |
| `ui/prototype-parity.md` | `settings:routing` 2,24% | PD-019 (mức 1, đề xuất) |
| `i18n/i18n.md` | `settings.routing.*`, `nav/head.routing`, `group.automation`, `actions.lead_routing.*` vi + en, 100% | — |
| `code/file-size-module-layout.md` + `testing.md` | Backend ≤ 112 dòng / file mới, FE ≤ 119; pipeline 220; test ở file riêng | — |
| `workflow/git-flow-ci.md` | Nhánh `tip/042b-lead-routing`, PR vào `dev`, xếp chồng #88 | — |

**GIẢ ĐỊNH ĐÃ CHỌN:** DC-238 (đề xuất kỹ thuật trong TIP) áp nguyên: tắt khi nâng cấp; tải = hội thoại người phụ trách open / pending / snoozed; "lead mới" = khách tạo sau `enabled_at` (kể cả từ lịch sử nhập). Mốc so "lead mới" dùng `occurred_at` của event (đồng hồ hệ thống lúc tạo khách), không theo giờ gửi của tin.

**Lệch spec:** không thêm thư viện; không sửa `ActionExecutor` / `ROLE_DEFS` / COMMERCE; không đụng `contact.transfer_owner`; REQ-B11d giữ MỘT PHẦN (SLA theo tài khoản vẫn của TIP-014c).
