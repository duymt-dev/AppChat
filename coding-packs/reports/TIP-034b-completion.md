### COMPLETION REPORT — TIP-034b

**STATUS:** DONE (ai:live chưa nghiệm thu — Postgres dùng chung cạn slot, Q-066)

Bốn pha, PR xếp chồng:

| Pha | PR | Nhánh | Xếp chồng trên |
|---|---|---|---|
| 1 — từ điển + action + nhãn đã dùng theo scope (backend) | #208 | `tip/034b-support-categories` | #207 (028b pha 2) |
| 2 — tệp CSV / XLSX qua engine 038b + `ticket_categories.export` | #209 | `tip/034b-p2-category-transfer` | #208 |
| 3 — web: Cài đặt › Danh mục ticket + combobox danh mục ở ticket | #210 | `tip/034b-p3-category-web` | #209 |
| 4 — chốt: E2E http, worker composition, ai:live, sổ sách | — | `tip/034b-p4-close` | #210 |

SHA ở `goals/GOAL-RELEASE.md` dòng 50.

**TÓM TẮT:** Bộ **gợi ý** danh mục ticket cấu hình được (dùng được qua Trợ lý trước, và bằng tay). Ticket vẫn nhận danh mục chữ tự do; sửa bộ gợi ý không đổi ticket cũ. Đóng rò nhãn đã dùng ngoài scope. Nhập / xuất tệp đi qua engine 038b có sẵn (không có trình nhập thứ hai).

**Pha 1 — §1 từ điển + action, §2 nhãn đã dùng theo scope (AC1–AC4, AC8)**

- **Bảng `ticket_category_config`** (một dòng, key `ticket_categories`): labels jsonb có thứ tự, version, updated_at, updated_by. Migration `20261112070000_ticket_categories`.
  - Chưa có dòng → version 0 ảo, 8 nhãn prototype. GET không ghi.
  - Sửa lần đầu: `INSERT … ON CONFLICT DO NOTHING` (hai lượt version 0 đồng thời chỉ một thành công); sau đó `UPDATE … WHERE version = $if_version`.
- **Validator dùng chung** (`packages/shared/src/support/category-config.ts`): NFC + trim, 1–60 code point, không ký tự điều khiển / xuống dòng, 1–100 nhãn, trùng theo khoá không phân biệt hoa thường (khác dấu là hai nhãn). Action / mock / adapter tệp / UI cùng dùng.
- **Action** (`packages/actions/src/support-categories.ts`):
  - `ticket_categories.get` — settings.manage, read, không cấp agent.
  - `ticket_categories.replace` — settings.manage, config, không cấp agent, `if_version` bắt buộc.
    - Xem trước: trước / sau, thêm / bỏ (đổi tên = bỏ + thêm), mặc định đổi, cảnh báo `existing_tickets_unchanged`.
    - Ghi + outbox trong một transaction. Version tăng một lần.
    - Undo 24h: chỉ khi version hiện tại = version sau lần ghi và người làm vẫn có settings.manage; khôi phục bộ trước ở version MỚI. Undo lần đầu trả 8 nhãn prototype thành version mới (không xoá dòng).
  - `ticket.category_suggestions` — ticket.view, read, `agentGrantable` + kỹ năng nhưng **không tự cấp** (DC-445).
- **Nhãn đã dùng** (`support/categories/read.ts`):
  - Chỉ từ ticket người xem đang thấy, cùng vị từ `supportScopeSql` của danh sách. Level none → rỗng.
  - Thứ tự byte (`COLLATE "C"`), trang ≤ 50. Scope all: CTE đệ quy skip-scan trên `ticket_category_c_idx`. Own / team: DISTINCT + BitmapOr.
  - Cursor mờ HMAC gắn workspace + người xem + thế hệ scope. Cursor sai → 403; scope đổi → 409 `{cursor:'stale'}`.
  - `/tickets/meta`: `categories` = bộ cấu hình rồi trang đầu nhãn đã dùng (khử trùng); thêm `category_config`, `used_has_more`. Hết distinct toàn bảng (đóng rò).
- **Realtime:** event `ticket_categories.changed` (chỉ key + version) → hai gói `ticket_categories.config` (settings.manage) và `ticket_categories.suggestions` (ticket.view). Không có thông báo / email.
- Route: `GET /v1/settings/ticket-categories` (settings.manage, chỉ bộ cấu hình), `GET /v1/support/category-suggestions?cursor=` (ticket.view).

**Pha 2 — §4 tệp CSV / XLSX qua 038b (AC7)**

- Tập 038b `ticket_category_suggestions` (cấu hình, không phải bản ghi ticket). Cột `position`, `label`. Quyền nhập / xuất / đọc = settings.manage.
- Cờ registry `atomic` (dùng chung với sản phẩm): một dòng lỗi chặn cả tệp, không có "chỉ dòng hợp lệ", luôn ghi đồng bộ.
- Kế hoạch chụp version cấu hình lúc lập; version trong tệp không có giá trị. Cấu hình đổi sau khi lập → xác nhận 409 `STALE_VERSION`, không tự lập lại.
- Commit = MỘT `ticket_categories.replace` (nguồn system thay mặt người gọi, cùng thẻ xác nhận risk config). Mọi dòng trỏ cùng action_log.
- `ticket_categories.export` (action mới, DV-117): data_job hoàn tất trong transaction, tải qua `/v1/data-jobs/:id/download`, hạn 24h. Chỉ bộ cấu hình, không nhãn từ ticket. CSV thoát `'` trước `= + - @ '` (nhập bỏ đúng một); XLSX ô chuỗi. Khứ hồi ra đúng chuỗi.

**Pha 3 — §3 màn Cài đặt + §2.5 ô danh mục ở ticket (AC2, AC5)**

- **Cài đặt › Danh mục ticket** (`/settings/ticket_categories`, alias `ticket-categories`): mục cuối nav, quyền settings.manage (không phải sla.manage), không đẩy lệch hàng prototype.
  - Sửa / thêm / xoá / đổi chỗ (nút + Alt+↑/↓, giữ tiêu điểm). Nhãn đầu gắn "Mặc định". Lỗi theo dòng.
  - Tóm tắt thay đổi trước khi lưu. Lưu một lần qua xem trước.
  - 409 → giữ nháp + dải xung đột (lưu lên bản mới hoặc tải lại). Chặn rời mục / đóng tab khi còn nháp. Nháp rỗng là lỗi kiểm, không tự trả về mặc định.
  - Nhập (TransferPanel dùng chung), Xuất (XLSX).
- **Trợ lý:** `open:settings` mở được mục; `prefill:ticket_categories` chỉ điền nháp (không ghi). Bộ nhận chỉ đăng ký khi mục đang mở và đã có cấu hình của workspace hiện tại → chưa mở thì bus trả "không có handler", không báo đã điền giả.
- **Ticket:** `TicketCategoryInput` — combobox chữ tự do (ARIA combobox / listbox), nhóm "Gợi ý" + "Đã dùng trong ticket", "Tải thêm" theo cursor (khoá query theo workspace → đổi workspace bỏ trang cũ). Mặc định form = nhãn đầu bộ cấu hình. Nhãn cũ (kể cả dài > 60) giữ nguyên. Bộ lọc giữ `<select>` thêm optgroup, khớp đúng chuỗi.
- `ConfirmActionHost` dịch mã cảnh báo qua `actions.warn.*` (có fallback mã thô).

**Pha 4 — chốt**

- E2E http `e2e/http/support-categories.spec.ts`; worker `support-categories-composition.test.ts`; ai:live `fixtures/ai-eval/support-categories.json` (6 ca) + seed + bộ chấm `tools/ai-live/src/support-categories-judge.ts`.
- BLUEPRINT (bảng, action, event, route), DV-117, PD-031, DC-445, COVERAGE (DC-215, DEF-034-2 → ĐẠT; 4 dòng ACT mới).

**FILES CHANGED** (lệch manifest ở DV-117)

- **Pha 1:**
  - DB: `tenant/ticket-categories.prisma`, migration `20261112070000_ticket_categories`, `test/prisma-stubs.test.ts` (OWNERS).
  - Shared: `support/{category-config,category-config.test,category-events}.ts`, `api/{ticket-categories,tickets,index}.ts`, `events.ts`, `index.ts`.
  - Actions: `support-categories.ts`, `index.ts`, `define.ts` (`REQUESTABLE_PREVIEW_ACTIONS`).
  - Core: `support/categories/{repository,read,handlers,events,providers}.ts`, `support/{support.module,public}.ts`, `support/services/tickets-read.service.ts`, `kernel/actions/tip-owners.ts`.
  - API: `http/support/{ticket-categories.controller,support.http.module}.ts`.
- **Pha 2:**
  - Shared: `data-transfer/registry.ts` (tập + `atomic`), i18n server `support.ts`.
  - DB: migration `20261113010000_transfer_ticket_categories`, `data-transfer.prisma` (chú thích).
  - Core: `data-transfer/{adapters/{ticket-categories,index},services/{plan-view,planner},actions/commit.handlers,assistant-extension}.ts`, `support/categories/export.ts`.
  - Actions: `support-categories.ts` (`ticket_categories.export`), `data-transfer.ts`.
  - Web: `messages/{vi,en}/{actions,data-transfer}.json`, `features/data-transfer/components/TransferPanel.tsx`, mock `domains/data-transfer.ts` + `data-transfer-shape.test.ts`.
- **Pha 3:**
  - Settings: `category-api.ts`, `hooks/useTicketCategories.ts`, `components/{TicketCategoriesSection,CategorySuggestionsEditor}.tsx` + `TicketCategoriesSection.test.tsx`, `styles/categories.styles.ts`, `registry.ts`, `screens/SettingsScreen.tsx`.
  - Tickets: `components/{TicketCategoryInput,TicketFormModal,TicketsHeader}.tsx`, `hooks/useCategorySuggestions.ts`, `styles/category.styles.ts`, `screens/TicketsScreen.tsx`, `types.ts`.
  - Shared web: `actions/ConfirmActionHost.tsx`, `realtime/event-invalidation.ts`, mock `domains/{ticket-categories,ticket-scope,tickets}.ts` + `handlers.ts` + `routes.ts`.
  - i18n: `messages/{vi,en}/{settings,tickets,actions}.json`. Parity: `parity.manifest.ts` (ghi chú màn mới).
  - E2E: `support-categories.mock.spec.ts`; `tickets.spec.ts` (mock + http — `fill` thay `selectOption`).
- **Pha 4:** `apps/web/e2e/http/support-categories.spec.ts`, `apps/worker/test/integration/support-categories-composition.test.ts`, `fixtures/ai-eval/{support-categories.json,support-categories-seed.mjs}`, `tools/ai-live/src/{support-categories-judge,cases,runner,cli}.ts` + `test/cases-cli.test.ts`, sổ sách.

**TEST**

| Cổng | Kết quả |
|---|---|
| Integration TIP (Postgres 16 + Memurai thật) | `support-categories` 13/13: AC1 (đọc không ghi, CAS v0 đồng thời chỉ một), AC2 (đổi tên / bỏ / đổi chỗ / undo, ticket cũ giữ nhãn, undo cũ 409), AC3 (own / team / none / ticket ẩn, cursor khác workspace 403, scope đổi 409), AC4 (settings.manage ↔ sla.manage độc lập), AC8 (EXPLAIN 100k ticket sau `VACUUM ANALYZE` — Index Only Scan / skip-scan, không seq scan; đếm query không N+1). `support-categories-transfer` 5/5 (AC7: CSV / XLSX khứ hồi, công thức là chữ, một dòng lỗi chặn cả tệp, > 100 không cắt ngầm, cấu hình đổi sau kế hoạch → 409). Ma trận 4 action. Hồi quy 038b 22 + tickets 26 |
| Unit | shared 204 · actions 45 · db 31 · core 1216 (pha 1) · web 72 file / 281 test (pha 3, có `TicketCategoriesSection.test.tsx` 6) · ai-live 13 file / 89 |
| Worker integration | `support-categories-composition` 3/3: ROLE=ai mỗi action đúng một handler; ROLE=jobs dựng được, tập nguyên khối; luật realtime hai gói theo quyền, không nhãn |
| E2E mock (`E2E_PORT=3537`) | `support-categories.mock` + `tickets` 10 passed (desktop + 390); `settings` + `settings-roles` 19 passed |
| E2E http (`E2E_HTTP_PORT=3538`, `TENANT_CLIENT_CACHE=10`) | `support-categories` 1/1 desktop (cấu hình → form mặc định / chữ tự do → bộ lọc "Đã dùng" → CSV trùng chặn cả tệp → CSV sạch một replace version 2 → tải XLSX); `tickets` 1/1. Mobile bỏ qua theo spec (luồng 390 ở mock) |
| ai:live `support-categories` (6 ca × 3) | **Chưa nghiệm thu.** Ba lần dựng stack (cache tenant 5 / 3, workspace fixture riêng `support-categories@ai-live.appchat.test`) đều dừng ở seed: Postgres dùng chung cạn slot (53300 ×975, P1017 / P2037) → đăng ký OTP / khai báo DN không xong — Q-066. Bộ ca + chấm + seed đã có, `--dry` đúng 6 ca / cổng 6 |
| Parity | `settings:shell` 0,34% · `tickets:list` 4,21% · `tickets:kanban` 3,53% · `tickets:detail` 4,91% (≤ trần nợ có sẵn). Màn mới không baseline (PD-031) |
| Typecheck / lint / depcheck | web tsc 0 lỗi, eslint file đổi 0 lỗi; ai-live tsc 0 lỗi; depcheck exit 0 (cảnh báo vòng mock cùng dạng các domain mock khác) |
| lint:size / lint:tokens / i18n:check | sạch / sạch / vi + en 100% |

**ISSUES DISCOVERED**

- **DV-117:** tên migration khác manifest; action `ticket_categories.export` mới (038b xuất bằng action xuất của từng danh sách); cờ `atomic` ở registry; file ngoài manifest (liệt kê ở DV).
- **DC-445:** gợi ý là kỹ năng nhưng không tự cấp; nhập nguyên khối; xuất action riêng.
- **PD-031:** màn mới không có trong prototype; ô danh mục form ticket thành combobox chữ tự do.
- **E2E tickets cũ:** ô danh mục không còn là `<select>` → `selectOption('Billing')` đổi thành `fill('Billing')` ở mock + http.
- **Privacy erase gate:** ticket chưa có cờ xoá / cách ly riêng; scope support là cổng đọc duy nhất (ghi chú trong `read.ts`).
- **ai:live:** chưa nghiệm thu với stack thật — chờ Q-066 (nâng `max_connections` hoặc chạy khi dự án dùng chung rảnh).

**ĐỐI CHIẾU STANDARDS** (APPLICABLE STANDARDS của TIP):

| Standard | Tuân thủ (file / test) | Lệch |
|---|---|---|
| `actions/action-registry.md` | 4 action trong `packages/actions` (zod, quyền, risk, agentGrantable, undo, invalidates); ghi chỉ qua ActionExecutor; FE ghi bằng `useAction`; ma trận 4 action | — |
| `authz/rbac-permissions.md` | settings.manage cho cấu hình / tệp; ticket.view + scope support cho gợi ý; không thêm quyền, không đổi vai trò mặc định; sla.manage không mở cấu hình khác (AC4) | — |
| `api/response-envelope.md` | `{ data }` / `{ data, next_cursor }`; 422 `labels.<i>` / `labels`; 409 `STALE_VERSION` `{version}`; 403 cursor sai | — |
| `database/tenant-db.md` | Bảng tenant không `workspace_id`; DB qua TenantDbResolver; mọi đọc nhãn áp scope | Tên migration (DV-117) |
| `database/indexing.md` | Index `category COLLATE "C"`, `(assignee_user_id, category COLLATE "C")`, `(created_by_type, created_by_id, category COLLATE "C") INCLUDE(id)`; DISTINCT chỉ chiếu một cột (không cần deferred join); EXPLAIN 100k (AC8) | — |
| `domain/concurrency.md` | CAS `if_version`; v0 `ON CONFLICT DO NOTHING`; `FOR UPDATE` khi ghi; undo kiểm version; kế hoạch tệp chụp version | — |
| `domain/gap-filling.md` | DC-445, DV-117, PD-031 ghi đủ | — |
| `domain/validation-defaults.md` | Validator dùng chung NFC / 60 code point / 100 nhãn / không ký tự điều khiển | — |
| `events/outbox.md` | `ticket_categories.changed` khai schema; outbox cùng transaction (cả undo); luật realtime lọc quyền, payload không nhãn | — |
| `ai/agent-gateway.md` · `ai/eval.md` | Config `agentGrantable=false`; gợi ý không tự cấp; bộ ai:live 6 ca (sửa, CSV, XLSX, thiếu quyền, agent đã chọn, tiêm nhãn + kế hoạch cũ) | ai:live chưa nghiệm thu (Q-066) |
| `ui/frontend-structure.md` | Màn orchestrator; hook / component / style / api tách file; FE ≤ 400 dòng | — |
| `ui/interaction-patterns.md` | PageStates (loading / error / no-permission / ready); xem trước trước khi ghi; xung đột giữ nháp; chặn rời khi còn nháp; bàn phím; 390 không tràn, nút ≥ 44px | — |
| `ui/prototype-parity.md` | Màn mới không baseline (PD-031); màn có sẵn < 5% / ≤ trần nợ | — |
| `i18n/i18n.md` | `settings.ticketCategories.*`, `tickets.categoryInput.*`, `actions.warn.*`, server `support.categories.*` — vi + en 100% | — |
| `code/file-size-module-layout.md` | BE ≤ 600, FE ≤ 400 (lint:size sạch); test file riêng | — |
| `code/testing.md` / D59 | Chỉ test phạm vi TIP; 3 cổng mỗi pha; commit + PR mỗi pha | — |
| `workflow/git-flow-ci.md` | Nhánh `tip/034b-*` từ nhánh trước, PR vào `dev` xếp chồng | — |
