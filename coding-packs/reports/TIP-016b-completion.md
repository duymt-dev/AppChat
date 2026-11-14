### COMPLETION REPORT — TIP-016b

**STATUS:** DONE — một PR (`tip/016b-nav-badges`, từ `origin/dev` `9f72ade8`). SHA ở bảng tiến độ `goals/GOAL-RELEASE.md` dòng 55. AC1 / AC2 / AC3 đạt bằng integration Postgres 16 thật + E2E http AC1.

**TÓM TẮT:**
- **API `GET /v1/nav/badges` (§1.1):**
  - Trả `{ inbox?, tickets?, calendar? }` của người xem.
  - Mỗi số là một COUNT trong data scope đọc của module, dùng cùng hàm SQL với list (`convScopeSql` / `supportScopeSql` / `bookingScopeSql`). Không lộ bản ghi ngoài scope.
  - Thiếu `inbox.view` / `ticket.view` / `booking.view` → không có khoá đó. Kế toán nhận `{}` và không mở DB tenant.
- **Định nghĩa badge (DC-450, prototype L1089):**
  - Hộp thư = hội thoại đang hiện (cùng điều kiện thư mục Hộp thư) có `unread_count > 0`.
  - Ticket = đang chạy SLA (`open`, `in_progress`).
  - Lịch = lịch bắt đầu hôm nay theo múi giờ workspace, trừ đã huỷ (= KPI "Hôm nay" màn Lịch hẹn).
  - "Của tôi" = scope đọc: own chỉ của mình, all toàn workspace.
- **Cache 15s theo người (§1.1):**
  - Khoá cache là (workspace, user, quyền + scope + nhóm); đổi vai trò dùng khoá khác.
  - Gateway `/ws` ở mọi node nhận mọi envelope. Khi có event đổi số (`message.*`, `conversation.updated`, `ticket.updated`, `appointment.updated`), `touchNavBadges` tăng thế hệ workspace, nên lần đọc FE ngay sau đó tính lại, không trả số cũ.
- **FE invalidate (§1.2):**
  - `useNavBadges` đọc DTO chung (`navBadgesSchema`), `staleTime` 15s.
  - `event-invalidation` thêm `ticket.updated` và `appointment.updated` → `qk.navBadges()`; `message.*` / `conversation.updated` đã có.
  - `conversation.counts` là invalidation-only (025b), không phải event WS riêng.
- **WS lịch hẹn (mới — trước đây không có):**
  - Luật `booking/events/appointment.rules.ts`: 8 topic vòng đời → `appointment.updated` (chỉ id + loại thay đổi), lọc `booking.view` + policy booking (người phụ trách / nhóm / quan hệ khách).
  - `appointmentEvent` thêm `owner_user_id`, `team_id` tuỳ chọn. Event cũ thiếu cột thì chỉ Chủ / scope all nhận (thu hẹp, không mở rộng).
- **Rà trước khi làm (§1–3):**
  - Đã đọc lại 6 file manifest sau 025b / 034b / 033b.
  - CONTEXT `useShellData.ts:34` khớp; mock vẫn trả fixture `shell.json`.
  - Badge keys ở `nav-config.ts`: inbox / tickets / calendar.
  - Prototype chỉ có số tĩnh 7 / 3 / 7.

**FILES CHANGED** (lệch manifest ở DV-122)
- Manifest:
  - api `http/inbox/inbox-meta.controller.ts`
  - core `inbox/services/nav-badges.ts` (mới), `inbox/public.ts`
  - web `shared/shell/useShellData.ts`, `shared/realtime/event-invalidation.ts`
  - test `apps/api/test/integration/nav-badges.test.ts` (mới)
- Ngoài manifest:
  - shared `api/inbox.ts`, `events.ts`
  - core `booking/services/appointment-write.ts`, `booking/events/appointment.rules.ts` (mới), `notify/realtime/records.ts`, `notify/events/domain.rules.ts`
  - migration tenant `20261114010000_nav_badges`
  - api `openapi/document.ts`, `http/notify/realtime/ws.gateway.ts`
  - web `shared/shell/NavItemButton.tsx`
  - test core `nav-badges.test.ts`, web `shared/realtime/event-delivery.test.ts`, E2E http `nav-badges.spec.ts`

**MIGRATION:** tenant `20261114010000_nav_badges` — partial index `conversation_unread_live_idx (assignee_user_id) INCLUDE (id, team_id, contact_id, status, snoozed_until) WHERE unread_count > 0 AND archived_at IS NULL AND hidden_at IS NULL AND status <> 'closed'`. Đã áp cho 15 DB dev, 63 DB test và template (`db:setup`). Sau khi merge: `pnpm --filter @appchat/db db:migrate-tenants`, rồi build lại api / worker.

**EXPLAIN** (`nav-badges.test.ts`, tải 4.000 hội thoại / ticket / lịch hẹn rải 40 người, ANALYZE bằng chủ bảng, kiểm "không Seq Scan"):
- Hội thoại chưa đọc của người xem → `conversation_unread_live_idx`; scope all → cùng index partial.
- Ticket đang mở của người xem → `ticket_assignee*_idx`; scope all → `ticket_open_ttr_idx` / `ticket_status_due_idx`.
- Lịch hôm nay của người xem → `appointment_owner_start_idx` / `appointment_start_idx`; scope all → `appointment_start_idx` / `appointment_open_start_idx`.

**TEST**

| Cổng | Kết quả |
|---|---|
| Unit core (toàn bộ) | **1291 passed** (1 skipped) — mới `nav-badges` 6: 8 topic → `appointment.updated` chỉ id; sales own nhận lịch mình, không nhận lịch người khác; Chủ nhận; kế toán không; event cũ thiếu cột thu hẹp; cache 15s; bỏ cache theo event + workspace; khoá vắng theo quyền |
| Unit shared / db | 210/210 · 35/35 |
| Unit web `shared/*` | 367/367 (mới: ticket / lịch hẹn / tin → khoá badge) |
| Integration API (Postgres 16 thật) | `nav-badges` **5/5**: AC1 + AC2 sales `{inbox 3, tickets 2, calendar 2}` (đã đọc / lưu trữ / đóng / tạm ẩn còn hạn / Đang chờ / đã đóng / đã huỷ / ngày mai / hôm qua / người khác không tính); Chủ `{4, 4, 3}`; AC3 kế toán `{}`, vai trò tuỳ biến chỉ `inbox.view` → `{inbox: 0}`; cache giữ số cũ khi ghi thẳng DB, event → số mới, `conversation.mark_read` → giảm; EXPLAIN tải thật |
| Hồi quy integration (đổi payload lịch hẹn + gateway) | `booking` · `appointment-update` · `booking-operations` · `realtime` · `realtime-events` · `record-scope-realtime` · `event-protocol-cutover` **41/41** |
| OpenAPI integration | AC4 `x-untyped` 232 > 175 **đỏ sẵn trên code nền** (stash kiểm) → Q-070, ngoài phạm vi; route mới có DTO (`TYPED`) nên không tăng số |
| E2E http (`E2E_HTTP_PORT=3538`, `TENANT_CLIENT_CACHE=10`, `--workers=1`, slot trống 52) | `nav-badges` **1/1** desktop (mobile bỏ qua vì rail chỉ có ở desktop): Chủ ở Tổng quan, 3 khách web nhắn → badge Hộp thư `3` không F5; mở 1 hội thoại → `2` (1.4 phút) |
| E2E mock (`E2E_PORT=3537`) | `shell` **5 passed** (3 bỏ qua theo thiết bị) |
| Parity (`PARITY_APP_URL=http://localhost:3537`) | `shell:default` **1.09%** · `shell:rail-collapsed` 0.01% — PASS |
| Typecheck / lint / depcheck / lint:size | sạch (web chỉ còn cảnh báo cũ) · 0 vi phạm phụ thuộc · không file vượt trần |

**ĐỐI CHIẾU STANDARDS** (APPLICABLE STANDARDS của TIP):

| Standard | Tuân thủ (file / test) | Lệch |
|---|---|---|
| `database/indexing.md` | Bằng trước / khoảng sau: lịch `owner_user_id =` + `start_at` khoảng; ticket `status IN` + scope. Partial index cho tập nhỏ hội thoại chưa đọc đang hiện, `INCLUDE` cột scope / tạm ẩn (covering). COUNT không cần deferred join (không LIMIT / không đọc cột rộng). EXPLAIN tải thật ghi trong test + report | — |
| `authz/rbac-permissions.md` (scope) | Mọi COUNT áp scope đọc của module qua cùng hàm SQL list / get; thiếu quyền module → khoá vắng; WS lịch hẹn lọc `booking.view` + policy booking chung (TIP-042c); không quyền mới | — |
| `events/outbox.md` (invalidation) | Không thêm topic: luật realtime mới chỉ map topic `appointment.*` đã có → event WS chỉ id (§8, lọc quyền trước emit); payload thêm 2 cột tuỳ chọn, khoá aggregate không đổi (event-protocol test xanh) | — |
| `api/response-envelope.md` | `{ data }`; số là integer (không phải tiền) | — |
| `ui/frontend-structure.md` | Hook đọc ở `shared/shell`, invalidation ở `shared/realtime`; không đường ghi mới | — |
| `code/testing.md` | Test ở file riêng; unit + integration native + E2E http + mock + parity; D59 chỉ phạm vi TIP | — |
| `workflow/git-flow-ci.md` | Nhánh `tip/016b-nav-badges` từ `origin/dev` mới nhất, PR vào dev | — |

**DEVIATIONS:** DV-122. **DECISIONS:** DC-450. **QUESTIONS:** Q-070 (openapi `x-untyped` đỏ sẵn).
