### COMPLETION REPORT — TIP-038 (pha 1 / 4)

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
