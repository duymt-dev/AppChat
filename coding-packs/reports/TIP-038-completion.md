### COMPLETION REPORT — TIP-038 (pha 1–3 / 4)

> Pha 2, pha 3 ở mục **PHA 2**, **PHA 3** cuối file (mỗi pha một PR). Phần ngay dưới là pha 1.

**STATUS:** MỘT PHẦN — xong **pha 1** (metric registry + `insight.query` / `GET /v1/insights/:metric` / Trợ lý `query_data` + thống kê agent có nguồn), AC01–AC03 đạt. TIP ghi "XL, chia implementation theo metric → dashboard → export → digest" (DC-363). Pha 2–4 (dashboard / follow-up / gia hạn AC04–06, xuất danh sách AC07–08, digest) làm ở PR sau. Nhánh `tip/038-insights-dashboard` xếp chồng trên `tip/037-marketing` (#92).

**COMMIT:** `5085d203` (code + test), `bd6d3dba` (sổ / Blueprint / COVERAGE); SHA cuối nhánh ở bảng tiến độ `goals/GOAL-RELEASE.md`.

**MIGRATION:** tenant `20261102003800_insights` — chỉ index (không bảng mới ở pha 1):
- `ai_run_agent_reply_idx`;
- `ticket_agent_closed_idx`;
- `ticket_closed_idx`;
- `customer_payment_confirmed_paid_idx`.

Sau merge chạy `pnpm --filter @appchat/db db:migrate-tenants`, rồi build lại api + worker (worker ROLE=ai nạp `InsightsModule` để `insight.query` có handler khi agent / tác vụ gọi).

**FILES CHANGED** (theo manifest pha 1; ngoài manifest ghi ở DV-030)
- shared:
  - `insights/metrics.ts` (allowlist, tham số strict, bucket);
  - `api/insights.ts` (`insightResultSchema`, `agentStatsSchema`);
  - `api/ai.ts` (`AgentDto.stats?`).
- actions:
  - `insights.ts` (`insight.query`, module `insights`);
  - `define.ts` (`ModuleKey` + `insights`).
- core:
  - `insights/metrics/{common,registry,sales,customers,agents,support}.ts`;
  - `insights/services/{agent-stats,insights-read.service}.ts`;
  - `insights/actions/insight-query.handler.ts`;
  - `insights/{insights.providers,insights.module,public}.ts`;
  - `ai/assistant/{meta-tools,read-dispatch}.ts`;
  - `ai/agents/agents.read.ts` (nhận `statsOf`);
  - `ai/jobs/ai-domain-handlers.module.ts`.
- api:
  - `http/insights/{insights.controller,insights.http.module}.ts`;
  - `http/ai/{agents.controller,ai.http.module}.ts`;
  - `app.module.ts` (register).
- web:
  - `features/agents/{components/AgentStatsPanel.tsx, hooks/useAgentStats.ts, components/AgentCard.tsx, types.ts}`;
  - mock `domains/agent-stats.ts`;
  - i18n vi + en (`agents`, `actions`, `common`).
- db: migration trên.

**TEST RESULTS** (pha 1)

1. **AC01 registry / tool** — **pass**. Test `insights.test.ts` AC01 (3) + ma trận `insight.query` (5) + `assistant.test.ts` (query_data).
   - Cùng params thì HTTP = action UI = action nguồn Trợ lý (rows / sources / window / sample_count giống nhau).
   - Metric lạ / khoá lạ (`sql`) / SQL làm tên metric → 422.
   - Thiếu `insights.view` → 403.
   - Sales (own) chỉ thấy đơn mình.
   - CSKH thiếu `order.view` → `availability: unavailable`, `excluded: permission:order.view`, `rows: []` (không trả tổng).
   - query_data đi qua ActionExecutor với quyền người dùng (Cowork / agent: executor giao quyền agent ∩ người ra lệnh).
2. **AC02 số học** — **pass**. Test `insights.test.ts` AC02 (4) + unit `insight-metrics.test.ts` (8).
   - Đơn huỷ không vào doanh số đặt.
   - Bigint 9.007.199.254.740.993 đúng từng đồng (chuỗi).
   - Kỳ nửa mở theo giờ workspace: đơn 23:59 ngày 31/10 ở trong, 00:00 01/11 ở ngoài.
   - Thu ròng = khoản thu xác nhận − hoàn xác nhận; hoàn chờ duyệt và điểm không tính; ngày trống điền 0.
   - Mẫu số rỗng → `null` + n 0.
   - Giờ mùa hè: mốc kỳ ở Europe/Berlin quanh 25/10 đúng 49 giờ.
   - Ngày không có thật (30/02) → 422.
3. **AC03 thống kê agent** — **pass**. Test `insights.test.ts` AC03 (4).
   - Dry-run không tính; handoff vào mẫu số tỷ lệ lượt (66,7% / 3 lượt).
   - CSAT chỉ ticket có điểm giao cho agent, đóng trong kỳ (4 / n 2); ticket ngoài kỳ / không điểm bị loại.
   - Người thật so cùng kỳ (CSAT 4 / n 1; tỷ lệ chốt 0 / n 1 — khách chỉ có người phản hồi).
   - Credit chỉ run thật (6, không cộng 50 của dry-run).
   - Agent không lượt → `available: false, reason: no_samples`.
   - CSKH: tỷ lệ chốt unavailable (`permission:order.view`), Credit không trả.
   - Thẻ `/agents` cùng service; `agents.performance` qua insight.query khớp `/agents/:id/stats`.
   - UI: AgentStatsPanel hiện "—" khi không khả dụng, tooltip ghi tử / mẫu số, nguồn và giới hạn (tương quan, không tính hoa hồng).
4. **AC04–AC08** — **chưa làm (pha sau, DC-363)**:
   - dashboard / MyWork / AI hôm nay / credit card;
   - follow-up bền + `follow_up.complete`;
   - gia hạn T-30;
   - xuất 4 danh sách;
   - digest.

**EXPLAIN** (`.data/gate/038-explain.txt`, `EXPLAIN (ANALYZE, BUFFERS)`) — mọi truy vấn là Index Only Scan:
- lượt agent → `ai_run_agent_reply_idx`;
- ticket đóng theo kỳ / CSAT agent → `ticket_closed_idx` (planner chọn index kỳ khi ít dòng; `ticket_agent_closed_idx` cho agent nhiều ticket);
- thu tiền → `customer_payment_confirmed_paid_idx`.
- Doanh số đặt dùng index sẵn có `order_live_recent_idx` / `order_live_owner_idx` / `order_team_recent_idx`.

**Cổng D59 (phạm vi TIP):**
- Đầu cổng: `pnpm --filter @appchat/db db:test-reset`.
- Lint + typecheck + unit: `turbo` (core, api, shared, actions, web, worker, db) 21/21 task.
  - core 99 file / 630 (+ insight-metrics 8);
  - web 98 / 308;
  - shared 135; actions 12; db 21; api 11; worker 7.
- Integration:
  - `insights.test.ts` 12 / 12;
  - ma trận `insight.query` 5 + `assistant.test.ts` + `assistant-vertical.test.ts` (24 / 24);
  - `agents.test.ts` + `agents-ui.test.ts` 27 / 27.
- Worker: `ai-role-handlers.test.ts` (handler ROLE=ai như API) 1 / 1.
- Build + bundle: build api + worker xanh; `pnpm check:bundle` (api 34 / worker 30 gói khai đủ).
- E2E mock `agents` 6 passed (cổng 3462).
- Parity: `agents:list` 0,46% · `agents:template-gallery` 2,13% · `agents:ai-create` 0,74%.
- Còn lại:
  - `pnpm depcheck` 0 lỗi (69 cảnh báo, baseline);
  - `lint:size` không vượt trần;
  - i18n vi / en 100%.
- **Không chạy** ai:live cho query_data — chưa có suite metric (sẽ thêm cùng pha dashboard / digest hoặc TIP-044); hành vi tool kiểm tất định ở integration (model giả).

**ISSUES DISCOVERED:**
- **Q-053:** Postgres dev đặt `TimeZone = Asia/Bangkok`. Adapter `@prisma/adapter-pg` gửi tham số `Date` không kèm offset nên Postgres hiểu theo múi của phiên (lệch 7 giờ khi so với hằng SQL / `AT TIME ZONE`). Test mép kỳ bắt được lỗi này.
  - Code 038 đã sửa để tính mốc kỳ ở JS và join `unnest(k, s, e)`, không phụ thuộc múi phiên.
  - Đề xuất provision `timezone = 'UTC'` ở TIP-045.
- Sửa test cũ có kỳ vọng lỗi thời (DV-030):
  - `prisma-stubs.test.ts` thiếu `ai-channel-behavior` của 022b — đỏ sẵn từ #91;
  - `agents.test.ts` AC4 worker chờ NOT_IMPLEMENTED, nhưng từ 037 worker có handler `campaign.delete` thật → NOT_FOUND.

**GIẢ ĐỊNH ĐÃ CHỌN** (DC-363):
- `insight.query` thuộc module `insights`.
- Thẻ agent: 30 ngày gần nhất theo quyền người xem.
- Credit agent chỉ cho người có `agents.manage` / `billing.manage` (không mở ví).
- `customers.at_risk` = khách có đơn hoàn tất trước kỳ, không có đơn trong `days` ngày (mặc định 30), xếp theo đã chi.
- Không cache (số liệu theo scope người xem).

**Lệch spec / prototype:**
- DV-030: file ngoài manifest.
- Thẻ agent giữ đúng 3 ô prototype; chi tiết nằm ở tooltip.
- Không thêm thư viện.

**ĐỐI CHIẾU STANDARDS:**

| Standard | Tuân thủ (file:dòng / test) | Lệch |
|---|---|---|
| `actions/action-registry.md` | `insight.query` (`packages/actions/src/insights.ts:7`) risk read, agentGrantable, skill, có Example; handler `@ActionHandler` qua ActionExecutor; query_data gọi executor (`meta-tools.ts` callAction) — không đường đọc thứ hai | — |
| `api/response-envelope.md` | `{ data }`; lỗi `{ error: { code, message, fields } }` (422 `params.*`, 403, 404); tiền chuỗi VND | — |
| `authz/rbac-permissions.md` | Cổng `insights.view`; mỗi nguồn kiểm quyền module (`order.view` / `invoice.manage`·`payment.record` / `crm.view` / `ticket.view` / `inbox.view`) + scope ≠ none (`common.ts` `sourceDenial`); scope insights ∩ domain (`insightAuthz`); SQL scope qua helper 042c (`orderScopeSql`, `invoiceScopeSql`, `crmScopeSql`, `supportScopeSql`, `convScopeSql`); Owner theo resolver | — |
| `database/tenant-db.md` · `indexing.md` | Migration `20261102003800_insights` chỉ index, không `workspace_id`; `=` trước khoảng sau, partial + INCLUDE; deferred join `customers.at_risk`; EXPLAIN ANALYZE BUFFERS ghi file | — |
| `domain/money-time-numbering.md` · `validation-defaults.md` | Tiền bigint → chuỗi; kỳ nửa mở theo `workspace.timezone`, mốc `wallToUtc` từng ngày (đúng giờ mùa hè); trần 366 ngày / 100 dòng; ngày không có thật → 422 | — |
| `ai/agent-gateway.md` · `ai/eval.md` | Model chỉ thấy metric allowlist, không SQL; kết quả qua `safeForModel`; ai:live suite metric chưa có (ghi ở báo cáo) | ai:live chưa chạy |
| `ui/frontend-structure.md` · `prototype-parity.md` · `i18n/i18n.md` | AgentStatsPanel + hook tách khỏi card; token theme; vi + en; parity agents < 5% | — |
| `code/file-size-module-layout.md` · `code/testing.md` | Mọi file dưới trần (meta-tools 179, agents.read ~130); test ở file riêng (unit / integration / matrix / mock shape) | — |
| `workflow/git-flow-ci.md` | Nhánh `tip/038-insights-dashboard` xếp chồng #92, PR vào `dev` | — |
| `plans/COMMERCE-DECISIONS.md` | Không cộng báo giá + đơn + thu thành "doanh thu"; thu ròng theo sổ khoản thu; không đổi quyền / giá | — |


---

## PHA 2 — Tổng quan thật, việc follow bền, gia hạn T-30 (AC04–AC06)

**STATUS:** MỘT PHẦN (TIP) — pha 2 / 4 xong, AC04–AC06 đạt. Còn pha 3 (xuất 4 danh sách — AC07–08), pha 4 (digest — AC09). Nhánh `tip/038-insights-dashboard-p2` từ `origin/dev` `34a7654b`.

**MIGRATION:** tenant `20261106003800_follow_up`:
- bảng `follow_up` + enum `follow_up_status`;
- index `follow_up_pending_due_idx (due_at, id) INCLUDE (contact_id, version) WHERE status = 'pending'`;
- index `follow_up_contact_pending_idx (contact_id) WHERE status = 'pending'`;
- unique `source_key`.

Sau merge chạy `pnpm --filter @appchat/db db:migrate-tenants`, rồi build lại api + worker (worker ROLE=jobs nạp lịch `insights.follow-up-sweep`).

**FILES CHANGED** (manifest TIP-038 mục 3; ngoài manifest ghi ở DV-031)
- db:
  - `prisma/tenant/insights.prisma`;
  - migration trên;
  - `test/prisma-stubs.test.ts` (41 file).
- shared:
  - `api/dashboard.ts` (`dashboardSchema`);
  - `insights/events.ts`, `events.ts`;
  - `i18n/server/{vi,en}/insights.ts` + index;
  - `ai-tasks/task-catalog.ts` (`contract.expiring`).
- actions:
  - `dashboard.ts` (`follow_up.complete` nhận id thật);
  - `insights.ts` (`follow_up.reconcile` system-only).
- core:
  - `insights/services/{follow-ups,work-items,renewal-suggestions,dashboard.service,dashboard-blocks,calendar-follow-ups}.ts`;
  - `insights/actions/follow-up.handlers.ts`;
  - `insights/jobs/{follow-up.consumer,insights.jobs.providers,insights.jobs.module}.ts`;
  - `insights.{providers,module}.ts`, `public.ts`;
  - `booking/services/calendar-read.service.ts` (follow_ups thật);
  - `ai/tasks/task-briefing.ts` (dùng selector chung, hết coi team như all);
  - `ai/tasks/task.runner.ts` (sự kiện hợp đồng: người tạo tác vụ phải còn đọc được);
  - `ai/assistant/catalog.ts` (SYSTEM_ONLY), `kernel/actions/tip-owners.ts`.
- api: `http/insights/{dashboard.controller,insights.http.module}.ts`.
- web:
  - `features/dashboard/types.ts`, `screens/DashboardScreen.tsx`;
  - `components/{MyWorkPanel,AiTodayPanel,CreditBalanceCard,WorkSection,work.styles,UpdatesWidget}`;
  - mock `domains/dashboard.ts`;
  - i18n `dashboard` + `actions` (vi / en).

**TEST RESULTS** (pha 2)

1. **AC04 cô lập** — **pass**. `insights-dashboard.test.ts` AC04 (2 test):
   - schema đúng;
   - Sales (own) chỉ thấy việc follow của khách mình (tổng = 1);
   - CSKH không có mục hợp đồng (scope sales none);
   - Credit ví và Credit AI chỉ Owner thấy;
   - workspace thứ hai thấy 0;
   - mục chờ duyệt chỉ hiện cho người quyết định được (CSKH không thấy);
   - onboarding TIP-011 giữ nguyên (toggle → done_count 1).
2. **AC05 follow-up** — **pass**. AC05 (3 test) + ma trận `follow_up.complete` (6 test):
   - hai sweep song song + chạy lại → một việc; khách won / vừa tương tác không sinh việc; không có outbox `message.*`;
   - dashboard trả 5 dòng theo hạn + tổng 7; lịch hẹn trả cùng id; complete → tổng còn 6, dòng biến mất;
   - tương tác mới → `superseded`; việc đã xong không sinh lại;
   - bấm lại idempotent;
   - 404 với id lạ / khách ngoài scope; 403 khi CSKH đọc được nhưng không ghi được;
   - STALE_VERSION khi khách có tương tác mới;
   - undo 24h đúng phiên bản; có tương tác mới sau khi xong → undo 409;
   - preview cho Trợ lý.

   Ma trận `follow_up.reconcile` (3 test): gọi qua HTTP → 403; header system → 422; ẩn khỏi Trợ lý.
3. **AC06 gia hạn** — **pass**. AC06 (1 test):
   - hợp đồng đã ký còn 20 ngày → một mục `contract_renewal` kèm câu "chỉ soạn nháp";
   - `sweepContracts` chạy hai lần → một `contract.expiring`;
   - Sales (own, không liên quan hợp đồng) → `eventRecordVisible` false (tác vụ không chạy); Owner → true;
   - xoá hợp đồng → mục biến mất.

   Bản tin sáng dùng cùng selector (`ai-tasks.test.ts` AC5 xanh).

**EXPLAIN** (`.data/gate/038p2-explain.txt`):
- danh sách việc mở → `Bitmap Index Scan on follow_up_pending_due_idx` (bảng nhỏ nên planner chọn bitmap + sort 5 dòng);
- thay việc theo khách → `Index Scan using follow_up_contact_pending_idx`;
- sweep tìm khách im lặng dùng `contact_live_recent_idx` có sẵn.

**Cổng D59 (phạm vi TIP):**
- Đầu cổng: `pnpm --filter @appchat/db db:test-reset` (platform 13 migration, template +1).
- Lint + typecheck + unit (`turbo`: shared / actions / core / db / web / api / worker) — core 99 file, web 99, shared 25.
  - Lần đầu, `render-isolation.test.ts` (render DOCX bằng LibreOffice) hụt hạn chót khi chạy song song.
  - Chạy riêng: 7 / 7 xanh. Chạy lại `turbo test` core / web / shared: 3 / 3 xanh. Test này không thuộc phạm vi 038.
- Integration:
  - `insights-dashboard.test.ts` 7 / 7;
  - ma trận `follow_up.complete` + `follow_up.reconcile` + `actions.test.ts` + `ai-tasks.test.ts` + `insights.test.ts` + `assistant-vertical.test.ts` + `onboarding.toggle_step` 54 / 54;
  - `booking.test.ts` + `agents.test.ts` + `contracts.test.ts` 45 / 45.
- E2E mock (cổng 3462): `dashboard` + `calendar` + `onboarding` 22 passed (10 skip do chỉ chạy mobile / desktop); `dashboard` sau khi thêm ca Việc cần tôi: 7 passed.
- E2E http (API 4327 / web 3428):
  - `insights` (mới) + `agents` + `calendar` xanh;
  - `agents-ui:60` đỏ khi chạy `E2E_WORKERS=jobs,ai` (thiếu worker kênh để gửi tin widget); chạy lại đủ worker: 2 / 2 xanh.
- Parity (mock): `dashboard:default` 1,70% · `dashboard:new-workspace` 0,84% · `dashboard:widget-picker` 2,57% (khối mới nằm dưới khung 900 px).
- Còn lại:
  - `pnpm depcheck` 0 lỗi;
  - `lint:size` không vượt trần;
  - `lint:tokens` đúng thang D41;
  - `lint:masks` 54 mask đều có căn cứ;
  - i18n vi / en 100%.
- Không chạy ai:live (pha 2 không đổi tool của model).

**GIẢ ĐỊNH ĐÃ CHỌN** (DC-364):
- việc follow sinh khi khách im lặng 7 ngày; hạn = mốc + 7 ngày; quá hạn = hạn trước 00:00 hôm nay theo giờ workspace;
- `news` rỗng ở http (không có nguồn tin — catalog không bịa);
- kênh gửi ra trong catalog chỉ có Zalo cá nhân + Email Marketing (D29);
- thẻ thống kê thứ 3 là "Thao tác hôm nay" (số thật) thay "API calls" của prototype, vì không có số API calls thật.

**Lệch spec / prototype:**
- DV-031: file ngoài manifest, tên file test được gộp.
- Bốn thẻ thống kê giữ bố cục prototype; nhãn thẻ 3 đổi như trên; parity dashboard < 3%.

**ĐỐI CHIẾU STANDARDS (pha 2):**

| Standard | Tuân thủ (file:dòng / test) | Lệch |
|---|---|---|
| `actions/action-registry.md` | `follow_up.complete` (crm.edit, write, undo 24h, preview) + `follow_up.reconcile` (system-only, SYSTEM_ONLY + guard actor, preview 403) qua ActionExecutor (`follow-up.handlers.ts`); sweep gọi executor (`follow-up.consumer.ts`); ma trận 2 file | — |
| `api/response-envelope.md` | `GET /v1/dashboard` → `{ data }` (`dashboardSchema`); lỗi 404 / 403 / 409 STALE_VERSION có `fields` | — |
| `events/outbox.md` | `follow_up.completed` / `follow_up.undone` cùng transaction (`writeOutbox`), schema ở `insights/events.ts` trong `EVENT_SCHEMAS` | — |
| `authz/rbac-permissions.md` | Mỗi khối kiểm quyền module + scope (`work-items.ts`: approvals.decide ∧ permission gốc, convScopeSql, supportScopeSql, bookingScopeSql, contractScopeSql); việc follow `crmScopeSql`; ghi = `editableContact` (watcher không ghi); ví chỉ billing.manage; Credit AI chỉ agents.manage / billing.manage; bản tin hết coi team như all | — |
| `database/tenant-db.md` · `indexing.md` | Bảng không `workspace_id`; partial pending `(due_at, id) INCLUDE`; unique `source_key`; CHECK done ↔ completed_at; EXPLAIN ghi file | — |
| `domain/concurrency.md` · `state-machine.md` | `FOR UPDATE` + CAS version; `ON CONFLICT (source_key) DO NOTHING`; undo kiểm phiên bản + nguồn | — |
| `domain/money-time-numbering.md` | Mốc ngày theo giờ workspace tính ở JS (`dayBounds`, `wallToUtc`), không `AT TIME ZONE` (Q-053) | — |
| `ui/frontend-structure.md` · `prototype-parity.md` · `i18n/i18n.md` | Màn chỉ điều phối; panel / style tách file; token theme; vi + en 100%; parity dashboard < 3% | — |
| `code/file-size-module-layout.md` · `testing.md` | Mọi file dưới trần (dashboard-blocks 181, follow-up.handlers 99); test ở file riêng (unit mock shape, integration, ma trận, E2E mock + http) | — |
| `workflow/git-flow-ci.md` | Nhánh `tip/038-insights-dashboard-p2` từ `origin/dev`, PR vào `dev` | — |
| `plans/COMMERCE-DECISIONS.md` §9 | T-30 nhắc một lần (giữ contracts.sweep) + Việc cần tôi + gợi ý soạn gia hạn — không tự gửi, không tự gia hạn | — |

---

## PHA 3 — Xuất 4 danh sách thật (AC07–AC08)

**STATUS:** MỘT PHẦN (TIP) — pha 3 / 4 xong, AC07–AC08 đạt (phần xuất của AC10: 4 nút thật ở mock + http). Còn pha 4 (digest — AC09, DC-241). Nhánh `tip/038-insights-exports` xếp chồng `tip/038-insights-dashboard-p2` (#95).

**COMMIT:** `a68e9ecb` (code + test); sổ / COVERAGE / report ở commit kế (SHA cuối nhánh ở bảng tiến độ GOAL-RELEASE).

**MIGRATION:** không có. Việc xuất dùng bảng `data_job` / `data_job_item` của TIP-045b (DC-365). Sau merge chỉ cần build lại api + worker (worker ROLE=jobs đăng ký 4 kind xuất).

**FILES CHANGED** (manifest TIP-038 mục 3; lệch ghi ở DV-032)
- shared:
  - `api/list-exports.ts` (bộ lọc allowlist, kết quả, trần / ngưỡng);
  - `i18n/server/{vi,en}/insights.ts` (`export.*` — tên cột / trạng thái / tên tệp).
- actions: `list-exports.ts` (4 action) + `index.ts`.
- core:
  - `insights/exports/{types,export-columns,sales-readers,ticket-reader,export-runner}.ts`;
  - `insights/actions/export.handlers.ts`;
  - `insights/jobs/{exports.worker,insights.jobs.providers,insights.jobs.module}.ts`;
  - `insights.providers.ts`, `public.ts`;
  - `snapshot{Quote,Order,Contract}Ids` ở 3 repo danh sách;
  - `support/services/tickets-read.service.ts` (tách `ticketWhereSql` / `ticketOrderSql`);
  - `kernel/jobs/bulk-status.ts` (dấu quyền theo kind + mime XLSX), `kernel/actions/tip-owners.ts`.
- api: `http/kernel/data-jobs.controller.ts` (content-type theo tệp).
- web:
  - `shared/actions/useListExport.ts`;
  - `QuotesToolbar` / `OrdersToolbar` / `ContractsToolbar` / `TicketsHeader`;
  - mock `domains/{list-exports,data-jobs}.ts`, `mock-transport.ts`, `handlers.ts`;
  - i18n `common` + `actions` (vi / en).

**TEST RESULTS** (pha 3)

1. **AC07 nội dung tệp** — **pass**. `list-exports.test.ts` (Postgres thật):
   - 2.100 báo giá (vượt LIMIT 2000 cũ) → 202, worker dựng XLSX đủ 2.100 dòng;
   - ô `=…` / `+…` / `@…` là chữ, không có ô công thức (kiểm từng ô);
   - tiền `123456789012345` đủ chữ số;
   - Owner thấy cột tuỳ biến `Hạng` + `Mật`; Sales chỉ dòng của mình, không có cột `Mật` (trường chỉ vai trò owner);
   - bộ lọc 0 dòng → tệp chỉ có tiêu đề;
   - lọc theo trường ẩn → 422;
   - đơn / hợp đồng / ticket đúng tập theo bộ lọc + scope.

   Unit `packages/core/test/list-exports.test.ts` (5): workbook mở lại được, bigint 18 chữ số, 0 dòng, ngày theo giờ workspace, cột tuỳ biến theo vai trò ∩ "Xuất", dấu quyền đổi khi scope / nhóm đổi. Quá trần 100.000 → 422 `rows: too_many` (handler; trần kiểm bằng `LIMIT cap + 1`).
2. **AC08 quyền / phục hồi** — **pass**.
   - Manager không thấy việc / tệp của Owner (404).
   - Vai trò người tạo đổi sau khi xuất → link biến mất, tải 410.
   - Quá 24 giờ → 410.
   - Worker chạy lại / event lặp → `skipped` (một tệp).
   - Người tạo mất quyền trước khi worker chạy → `failed` / `forbidden`, không link.
   - Cùng Idempotency-Key → cùng việc.
   - Ma trận 4 action (16 test): happy, 403 thiếu quyền xem, ngoài scope → 0 dòng, thẻ xác nhận Trợ lý có số dòng, idempotency, không cấp agent.
3. **AC10 (phần xuất)** — **pass**.
   - E2E mock `list-exports.spec.ts`: 4 nút → tải tệp + "Đã xuất n dòng".
   - E2E http `insights.spec.ts`: ticket thật → tệp `ticket-YYYY-MM-DD.xlsx`.
   - Mock shape `list-exports-shape.test.ts` (3).

**EXPLAIN** (`.data/gate/038p3-explain.txt`):
- chốt id báo giá → `quote_live_recent_idx`;
- đơn → `Index Only Scan order_live_recent_idx`;
- hợp đồng → `Index Only Scan contract_live_recent_idx`;
- lô biên nhận → `data_job_item_pkey`.

Cột đủ nạp theo PK cho từng lô 1.000 id (deferred join).

**Cổng D59 (phạm vi TIP):**
- Đầu cổng: `pnpm --filter @appchat/db db:test-reset`.
- Lint + typecheck + unit (`turbo`, 6 package): 18 / 18 task xanh.
- Integration:
  - `list-exports` 8 / 8;
  - ma trận 4 action 16 / 16;
  - hồi quy `support` / `quotes` / `orders` / `contracts` / `hardening-jobs` (045b — `contact.export` + dấu quyền) / `assistant-vertical` (mục lục ma trận): 11 file, 91 / 91.
- E2E mock (cổng 3462): `list-exports` + `quotes` + `orders` + `contracts` + `tickets` 31 passed (31 skip mobile / desktop); chạy lại sau chỉnh: 11 passed.
- E2E http (API 4327 / web 3428): `insights` + `tickets` 3 passed. Log có `WORKSPACE_UNAVAILABLE` lúc workspace mới đang provision — spec tự chờ, không lỗi.
- Parity (mock):
  - `quotes:list` 2,38%;
  - `orders:list` 3,26%;
  - `contracts:list` 3,31%;
  - `tickets:list` 4,21% (màn trong sổ nợ, trần 5,4% — không đổi sổ).
- Còn lại:
  - `pnpm depcheck` 0 lỗi;
  - `lint:size` không vượt trần (file lớn nhất `export-runner.ts` 194 dòng);
  - `lint:tokens` đúng thang D41;
  - i18n vi / en 100%;
  - build api + worker + `check:bundle` xanh (exceljs đã khai ở core / api / worker).

**GIẢ ĐỊNH ĐÃ CHỌN** (DC-365):
- dùng `data_job` thay bảng `ExportJob` mới;
- ngưỡng chạy nền 50 dòng (theo concurrency §7 — cùng ngưỡng sửa hàng loạt);
- tệp XLSX một sheet: dòng 1 ghi múi giờ, dòng 2 là tiêu đề;
- hợp đồng không có trường tuỳ biến (entity custom field không gồm contract);
- `contact.export` (CSV, 045b) giữ nguyên.

**Lệch spec / prototype:**
- DV-032: không bảng / migration mới, không `exports.controller.ts` riêng (tải qua route data-jobs có sẵn), file ngoài manifest.
- UI: nút giữ chữ prototype; khi đang xuất, chữ đổi thành "Đang xuất n/N" (trạng thái thật); parity các màn danh sách < 5%.

**ĐỐI CHIẾU STANDARDS (pha 3):**

| Standard | Tuân thủ (file:dòng / test) | Lệch |
|---|---|---|
| `actions/action-registry.md` | 4 action qua ActionExecutor (`export.handlers.ts`), có preview (số dòng), không undo, `agentGrantable: false`; ma trận 4 file | — |
| `api/response-envelope.md` | 200 `{ data: { result } }` / 202 `job_accepted` (`jobAccepted`) / 422 `rows: too_many` có `fields` / 410 tải hết hạn; Idempotency-Key trả đúng handle | — |
| `events/outbox.md` | `data_job.requested` cùng transaction action; thông báo xong việc `notify.requested` qua runner kernel | — |
| `authz/rbac-permissions.md` | quyền = `quote.view` / `order.view` / `contract.view` / `ticket.view`; scope qua `quoteScopeSql` / `orderScopeSql` / `contractScopeSql` / `supportScopeSql` lúc chốt + lúc dựng (quyền hiện tại); tải chỉ người tạo; dấu quyền khác → 410 | — |
| `domain/custom-fields.md` §4c | cột tuỳ biến = vai trò đọc được ∩ `visible_in.export` (`exportCustomKeys`); lọc trường ẩn → 422 (`assertQueryFields`) | — |
| `database/indexing.md` | chốt id dùng index danh sách có sẵn + deferred join theo PK từng lô; EXPLAIN ghi file | — |
| `domain/money-time-numbering.md` | tiền là chuỗi chữ số (bigint); ngày theo giờ workspace tính ở JS (`utcToWall`) | — |
| `domain/concurrency.md` | > 50 dòng chạy nền; lease / fence + biên nhận của `data_job`; chạy lại không dựng lần hai | — |
| `ui/frontend-structure.md` · `i18n/i18n.md` | hook chung `shared/actions/useListExport.ts`, màn chỉ gọi hook; vi + en 100% | — |
| `code/file-size-module-layout.md` · `testing.md` | mọi file dưới trần; test ở file riêng (unit, mock, integration, ma trận, E2E mock + http) | — |
| `workflow/git-flow-ci.md` | nhánh `tip/038-insights-exports` xếp chồng #95, PR vào `dev` | — |
