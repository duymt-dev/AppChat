### COMPLETION REPORT — TIP-034d

**STATUS:** DONE — PR #224, nhánh `tip/034d-ticket-stock-trends` (từ `8116d4be`, xếp chồng trên #223), hai commit theo pha:
- P1 backend: commit `d252d594`.
- P2 FE / E2E / ai-eval: commit `cc9c77ad`.
- P2 bị push lên cùng nhánh của #224. Không force-push để tách, nên TIP là một PR (DV-123 mục 4).
- SHA cuối ghi ở bảng tiến độ `goals/GOAL-RELEASE.md` dòng 56.

Kết quả AC:
- AC1–5 và AC8 đạt bằng unit + integration Postgres 16 thật.
- AC6 đạt bằng ai:live provider thật 6/6 (3 lượt).
- AC7 đạt bằng component + E2E mock / http + parity.

Phạm vi hạ tầng lineage theo DC-451.

**TÓM TẮT:**
- **Rà trước khi làm (§1–3):**
  - Adapter privacy support hiện chỉ có kiểm kê `ticket` + erase `NOT_IMPLEMENTED`.
  - Fence "Quên khách" là `privacy_family_member`, ghi lúc chấp nhận.
  - KHÔNG có registry lineage / candidate / publication chung của 015c / 045b.
  - `history-provenance.ts` chỉ che câu hỏi tự do.
  - Meta đếm 5 số bằng một câu SQL với Clock tiêm vào; `trend` trả chuỗi rỗng.
  - → Làm bằng cơ chế đã có, ghi DC-451, không dựng registry chung.
- **Số và so sánh (§1, §3.4, §4.1–4.2):**
  - `readStockSummary` chạy MỘT câu SQL với MỘT mốc Clock: tập hiện tại (scope support 042c + nguồn chưa bị fence) LEFT JOIN đúng một lần chụp hoàn tất của hôm qua (theo múi giờ hiện tại, cùng `metric_version`).
  - Ticket mới sau mốc góp 0.
  - Ticket cũ thiếu dòng quan sát → `capture_unavailable`.
  - Nguồn gốc lúc chụp nay đã bị fence → `source_unavailable`.
  - Chưa có mốc → `baseline_missing`.
  - DB chậm schema → `schema_unavailable`; số hiện tại vẫn có.
  - Không bao giờ trả prior / delta = 0 giả.
  - `counts` cũ = `stock_summary.counts`; `trend` cũ giữ rỗng.
  - Thiếu quyền → 403, không trả số trơn.
- **Chụp / dọn (§2):**
  - Job `support.stock-observe` mỗi 15 phút, chạy trên CÙNG queue `support-scheduler` và CÙNG worker với quét SLA.
  - Workspace phân trang keyset 100, tối đa 4 song song, lỗi cô lập theo workspace.
  - Thứ tự trong transaction: khoá control → lấy Clock → `INSERT … SELECT` (không nạp ticket vào Node, không khoá dòng nguồn) → `completed_at`, cùng một transaction.
  - Timeout 2s / 30s. Hai worker chụp cùng lúc → một lần chụp. Lỗi giữa chừng → không có lần chụp.
  - Dọn: giữ hôm nay + 7 ngày theo múi giờ của từng lần chụp; phiên bản số đo khác bị dọn; lô 100.
- **Action `ticket.stock_summary` (§3.5, §4.3):**
  - `ticket.view`, `read`, agent dùng được chỉ khi chủ động chọn tool; input `{}` strict.
  - Tập đóng góp ĐÓNG BĂNG được ghi bằng MỘT CTE, số tính chỉ từ tập vừa ghi; trả `result_id`.
  - `$ref` lịch sử chỉ trả lại số đã lưu khi không nguồn nào bị fence và mọi ticket góp số còn trong scope; ngược lại → null.
- **Privacy (§3.1–3.3):**
  - Artifact `ticket_stock` (record = id ticket), tìm theo khoá nguồn chuẩn hoá (index), kể cả ticket đã xoá cứng.
  - Erase giữ khoá control SAU khoá họ khách: xoá dòng quan sát có nguồn đã fence + mọi kết quả có ticket đó góp số. Idempotent.
  - Hai thứ tự (chụp trước / quên trước) đã kiểm bằng 2 kết nối native.
- **FE (§4.4, §4.7):**
  - `TicketTrendBadge` không tương tác, đặt trong nút lọc của thẻ.
    - Dấu ↑ n / ↓ n / = / —, kèm lời đọc màn hình.
    - Màu theo chiều tốt / xấu của từng số: quá hạn / đang mở / đang chờ tăng = đỏ, đã đóng tăng = xanh, tổng trung tính.
  - `TicketTrendDetails` là nút riêng ngoài hàng thẻ (không lồng nút), mở vùng hiển thị:
    - giờ đo và giờ quan sát theo giờ workspace;
    - 5 dòng trước → nay;
    - lời nhắc tập so sánh hiện tại;
    - hoặc lý do chưa so được.
  - `ticketsMetaQuery`: `staleTime` 30s, đọc lại khi focus, `refetchInterval` 60s, không chạy khi tab ẩn.
  - Đã bỏ chuỗi locale cố định "↑ {v}".
  - Mock `ac_mock_stock` có 4 kịch bản: valid / missing / legacy / scope_lost.
- **Tìm tool cho Trợ lý:**
  - Gợi ý từ khoá hẹp `ACTION_VI['ticket.stock_summary']`.
  - Mô tả `support.performance` trong `insight.query` nói rõ là luồng đóng + CSAT, chỉ sang action stock.
  - Trước khi sửa, model gọi nhầm `support.performance` (0/6). Sau khi sửa đạt 6/6.

**FILES CHANGED** (lệch manifest ở DV-123)
- shared:
  - `support/stock-metrics.ts` (+test)
  - `api/ticket-stock.ts`, `api/tickets.ts`, `api/index.ts`, `index.ts`
- actions:
  - `support-stock.ts` (+test)
  - `index.ts`
  - `insights.ts` (mô tả metric)
- db:
  - `ticket-stock.prisma`
  - migration `20261114020000_ticket_stock`, `20261114020100_privacy_fence_contact`
  - `test/prisma-stubs.test.ts` OWNERS
- core:
  - `support/trends/{types,metrics-sql,control,source-guard,snapshot,read,projection,cleanup,handler,providers,installer}.ts`
  - `support/{support.module,public}.ts`, `support/jobs/support.jobs.module.ts`, `support/services/tickets-read.service.ts`
  - `support/privacy/{adapter,inventory,cleanup}.ts`
  - `kernel/actions/tip-owners.ts`, `ai/assistant/catalog.ts`
  - test `ticket-stock.test.ts`, `ticket-stock-queries.test.ts`
- api: test integration `ticket-stock.test.ts`, `ticket-stock-privacy.test.ts`, `ticket-stock-load.test.ts`, `actions/ticket.stock_summary.action.test.ts`.
- worker: `test/integration/ticket-stock-composition.test.ts`.
- web:
  - `features/tickets/{types,api}.ts`
  - `components/{TicketsHeader,TicketTrendBadge,TicketTrendDetails}.tsx` (+2 test)
  - `styles/tickets.styles.ts`
  - mock `domains/{ticket-stock,tickets}.ts`, `handlers.ts`
  - `messages/{vi,en}/{tickets,actions}.json`
  - E2E `ticket-stock.mock.spec.ts`, `http/ticket-stock.spec.ts`
- Khác:
  - `fixtures/ai-eval/ticket-stock.json`
  - `tools/parity/parity.manifest.ts` (`tickets:kpi-stock`)
- Sổ: BLUEPRINT, DECISIONS DC-451, DEVIATIONS DV-123, prototype DEVIATIONS PD-032, COVERAGE DEF-034-1.
- `authz/fields/history-provenance.ts`: không sửa (DC-451 mục 5).

**MIGRATION** (đã áp: 15 DB dev, 64 DB test, template):
- `20261114020000_ticket_stock`:
  - control singleton (CHECK id = 1, có sẵn một dòng);
  - batch unique `(time_zone, local_date, metric_version) INCLUDE (id, observed_at, completed_at)` + index dọn;
  - observation PK `(batch_id, ticket_id) INCLUDE (status, breached, source_contact_id, source_conversation_id)` + `(ticket_id, batch_id)` + partial theo khách / hội thoại nguồn;
  - contribution + source (PK 6 cột, index khoá nguồn, FK cascade chỉ tới contribution).
- `20261114020100_privacy_fence_contact`: `privacy_family_member(contact_id)` cho guard nguồn.

**EXPLAIN / ĐO** (`ticket-stock-load.test.ts`: 100.000 ticket rải 40 người, 8 lần chụp, hai tenant, ANALYZE bằng chủ bảng):
- Chụp 100k: max **1,68 s**, p50 1,63 s (≤ 30 s).
- Đọc `/tickets/meta` p95 trên 20 lượt nóng: Chủ **253 ms**, sales own **95 ms** (≤ 2 s).
- Heap Node tăng **+5,7 MiB** (≤ 64 MiB).
- Số câu đọc cố định là 3; số câu chụp cố định là 8 (unit `ticket-stock-queries`).
- Own (EXPLAIN ANALYZE BUFFERS): `ticket_assignee_category_c_idx` (Bitmap) → mốc nối qua `ticket_stock_observation_pkey` (Index Cond `batch_id =`). Execution 61 ms.
- All: đếm toàn bộ 100k là bản chất câu hỏi (không LIMIT, không lấy mẫu), mốc vẫn đi qua PK. Execution 213 ms.
- Header ngày: khi tắt seqscan → seek theo `(time_zone, local_date, …)`. Với 8 dòng thì Seq Scan là đúng.
- Tenant B chỉ thấy số của mình (`baseline_missing`).

**TEST**

| Cổng | Kết quả |
|---|---|
| Unit shared `stock-metrics` | 8/8 (vị từ tham chiếu: đúng hạn / +1ms / tạm dừng trước-sau hạn / đóng breached) |
| Unit actions | 53/53 — `support-stock` 4 (registry, read, agentGrantable, input strict, unavailable không prior) |
| Unit core | `ticket-stock` 9 + `ticket-stock-queries` 6. Toàn gói 1305 passed. `assistant-input-parsing` XLSX hết thời gian khi chạy song song toàn gói; chạy riêng 10/10, ngoài phạm vi TIP |
| Unit worker composition | 2/2 (một handler ở ROLE=ai / jobs; `observeAll` trang 100, ≤ 4 song song, lỗi cô lập, log chỉ id) |
| Integration API (Postgres 16) | `ticket-stock` **9/9**: AC1 năm số = `stockCounts` (9 ticket mốc hạn), AC2 xoá / mới / đổi trạng thái / own / rỗng / thiếu dòng, 403, AC3 nửa đêm 23:59:59.999 → 00:00, đổi nhãn múi giờ, crash, song song, dọn 8 ngày |
| | `ticket-stock-privacy` **3/3**: fence trực tiếp + qua hội thoại, kiểm kê + erase + idempotent, đổi khách sau chụp → `source_unavailable` + xoá cứng, hai thứ tự khoá |
| | `actions/ticket.stock_summary` **7/7**: happy = meta, 403, scope, assistant, agent có / không chọn tool, `$ref` sau đổi phụ trách |
| | `ticket-stock-load` **3/3** (AC8) |
| Hồi quy integration | `support` 10/10 · `privacy-cleanup` · `nav-badges` (19/19 cùng lượt) |
| Component web | `TicketTrendBadge` 4 + `TicketTrendDetails` 3 = **7/7** (vi / en) |
| E2E mock (`E2E_PORT=3537`) | `ticket-stock.mock` **6 passed** / 2 bỏ qua theo thiết bị (4 kịch bản, không nút lồng nút, phím Enter, lọc KPI giữ, refetch 60 s qua nửa đêm + refocus, mobile 390 không tràn) · hồi quy `tickets` + `ticket-bulk.mock` xanh |
| E2E http (`E2E_HTTP_PORT=3538`, `TENANT_CLIENT_CACHE=10`, `--workers=1`, slot trống 55) | `ticket-stock` **1/1** + hồi quy `tickets` 1/1 (desktop) |
| Parity (`PARITY_APP_URL=http://localhost:3537`) | `tickets:kpi-stock` **0,77%** (mới) · `tickets:list` 4,40% · `tickets:kanban` 3,76% · `tickets:detail` 4,91% (≤ trần nợ) |
| ai:live (`ai-live-stack`, cx/gpt-6-sol, `--attempts 3`) | **6/6** ca (17/18 lượt), **0 vi phạm an toàn**: so với hôm qua / chưa có mốc / en / hỏi nguyên nhân không ghi / lệnh tiêm / chỉ 5 số. Lượt trước khi sửa mô tả: 0/6 → 2/6 (3 ca lỗi hạ tầng 53300 do dự án khác giữ slot) → 6/6 |
| Lint / typecheck / depcheck / lint-size / lint-tokens / i18n | sạch (web chỉ cảnh báo cũ) · 0 vi phạm phụ thuộc · không file vượt trần · thang D41 · vi / en 100% |

**ĐỐI CHIẾU STANDARDS** (APPLICABLE STANDARDS của TIP):

| Standard | Tuân thủ (file / test) | Lệch |
|---|---|---|
| `database/tenant-db.md` | Bảng mới chỉ ở tenant (không `workspace_id`), migration qua MIGRATOR + `db:generate` / `migrate-tenants` / `db:setup`; OWNERS `prisma-stubs` | Tên migration khác manifest (DV-123) |
| `database/indexing.md` | Bằng trước / khoảng sau: batch `(time_zone, local_date, metric_version)`, observation `(batch_id, ticket_id)`; `INCLUDE` covering; partial index nguồn; EXPLAIN 100k ghi ở trên | — |
| `authz/rbac-permissions.md` | Tập hiện tại = `supportScopeSql` (042c); action `ticket.view`; agent = quyền agent ∩ người ra lệnh (test agent sales own) | — |
| `actions/action-registry.md` | `defineAction` zod strict, risk read, `agentGrantable` + `skill`, handler `@ActionHandler`, tip-owner, i18n tiêu đề | — |
| `events/outbox.md` §5 | Projection nội bộ dẫn xuất, không event / thông báo mới; FE làm mới qua invalidation + refetch | — |
| `api/response-envelope.md` | `{ data }`; số là integer an toàn (`safeCount` → RangeError khi vượt) | — |
| `domain/money-time-numbering.md` | Thời gian nghiệp vụ từ Clock tiêm; ngày lịch theo `workspace.timezone` (`utcToWall`); hiển thị ISO kèm offset | — |
| `domain/concurrency.md` | Khoá control FOR UPDATE, thứ tự toàn cục (họ khách → control), unique ngày chống chụp trùng, timeout 2s / 30s | — |
| `domain/gap-filling.md` | DC-451 (hạ tầng lineage chưa có — dùng cơ chế hiện có), giả định ghi trong sổ | — |
| `ops/observability-security.md` | Log job chỉ id workspace / job / batch + thời gian (test composition kiểm khoá log) | — |
| `ai/agent-gateway.md` · `ai/eval.md` | Action đọc qua Executor; `$ref` registerRefSource; ai:live 6 ca × 3 lượt provider thật | — |
| `ui/frontend-structure.md` · `ui/interaction-patterns.md` | Header là orchestrator; badge / chi tiết là component riêng; không nút lồng nút; vùng chạm ≥ 44 trên mobile | — |
| `ui/prototype-parity.md` | Parity < 5%; lệch có chủ đích PD-032 (mask nút chi tiết) | PD-032 |
| `i18n/i18n.md` | Mọi chuỗi qua `tickets.stock.*` vi + en; bỏ chuỗi "↑ {v}" cố định | — |
| `code/file-size-module-layout.md` | Mọi file mới < trần; logic ở `support/trends/*`, không mở rộng file cũ quá trần | — |
| `code/testing.md` · `workflow/git-flow-ci.md` · D59 | Test ở file riêng; cổng chỉ phạm vi TIP; nhánh `tip/034d-…` từ dev, PR theo pha vào `dev`, xếp chồng ghi rõ | — |

**CÒN MỞ / GHI CHÚ**
- Q-070 (OpenAPI `x-untyped` vượt baseline trên nền dev) vẫn mở. Không có route mới trong 034d.
- `source_generation` lưu 0 cho tới khi 015c / 045b có bộ đếm thế hệ (DC-451).
- Cổng ai:live chạy lúc dự án khác giữ ~50 slot Postgres. Một lượt từng lỗi hạ tầng 53300; lượt cuối sạch (Q-066 không cần ghi thêm).
