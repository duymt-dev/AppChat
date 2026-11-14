### COMPLETION REPORT — TIP-036

**STATUS:** DONE — 4 pha, mỗi pha một PR xếp chồng: P1 #66 (`11edcd6`) · P2 #67 (`d60f6fe`) · P3 #68 (`53f1d5a`) · P4 chốt (`tip/036-close`, xếp chồng #68). AC 10/10. REQ-J01–J04, REQ-F02d, COM-4-11 / 7-1 / 7-2 / 7-4 / 7-5 / 7-6 / 7-7, D08c, DC-186, ACT-loyalty.get_member / adjust_points / update_config, ACT-payment.redeem_points, BP-4.4-loyalty, DEF-031-3, DEF-032-1, PRO-loyalty-read / adjust / config / memberacts / files → ĐẠT (`COVERAGE.md`). Q-027 → DC-297 a/b/c có test PG thật.
**COMMIT:** SHA cuối nhánh `tip/036-close` ghi ở bảng tiến độ `goals/GOAL-RELEASE.md`.

**FILES CHANGED:** đúng bảng file của TIP. Ngoài bảng (lý do ở DC): `packages/actions/src/{loyalty-system,loyalty-payments,loyalty-reasons}.ts` (action hệ thống + đổi điểm — DC-348/350), `packages/shared/src/loyalty/{math,events}.ts`, `packages/core/src/loyalty/{actions,services,repos,events,jobs}/*` (tách theo trần dòng), `sales/payments/services/{payment-write,refunds}.ts` (kind `points`, hoàn tiền mặt trừ phần điểm — DC-349), `packages/actions/src/reads/crm.ts` + `crm/actions/contact-read.handlers.ts` (`tier` — DC-351), `ai/assistant/catalog.ts` (động từ đổi điểm), `packages/ai/src/gateway/engine.ts` (FORBIDDEN nêu tool được dùng — DC-351), `tools/ai-live/src/{cases,cli,runner,loyalty-judge}.ts` + `fixtures/ai-eval/{loyalty.json,loyalty-seed.mjs}` (ca AC9 — `tools/ai-live/cases.yaml` không đổi: bộ 30 ca bất biến theo eval.md, ca bổ sung ở file riêng), `tools/parity/parity.manifest.ts` (cuộn `loyalty:config`).
- **P1 (#66):** migration `20261102003600_loyalty` (config 1 dòng, sổ chỉ thêm + lô FIFO + `loyalty_alloc`, `dedupe_key` duy nhất, tệp thành viên); `shared/loyalty/math`; ledger.service (nợ DC-297 a, trả đúng lô DC-297 b); `loyalty.get_member` / `adjust_points` / `update_config`; `/v1/loyalty/*` đọc.
- **P2 (#67):** tích theo lượt hoàn tất + snapshot thực thu (DC-348); đảo hoàn tác / huỷ / hoàn tiền luỹ kế (DC-349); `payment.redeem_points` (DC-350); job `loyalty.sweep` hết hạn FIFO + xét hạng quý; migration `20261102003610_loyalty_events`.
- **P3 (#68):** `/loyalty/overview` thật, tệp thành viên (`loyalty.attach_file` + đọc bytes kiểm scope), tab AI gửi lượt Trợ lý thật, churn "Sắp có" không nút giả, Simulator dùng `earnPoints`, 360° ×100, ngữ cảnh agent hạng / điểm.
- **P4 (chốt):** `loyalty.contract.test.ts`; ai:live 4 ca (AC9) + sửa hệ thống DC-351; ghi chú BLUEPRINT §3.4 / §4.4 (bổ sung hợp đồng, không đổi luật).

**TEST RESULTS:**
- Acceptance criteria: 10/10
  1. AC1 seed hai lần → 1 config, sổ không đổi, tenant khác cô lập; migration DB thật (`loyalty.test.ts` "config + seed") — **pass**
  2. AC2 19.999đ Vàng → 1 điểm, 20.000đ → 3; event lặp 10 lần → 1 earn; hệ số đổi chỉ ảnh hưởng đơn sau (`loyalty-events.test.ts`, `packages/shared/test/loyalty-math.test.ts`) — **pass**
  3. AC3 đơn 100.000đ: đổi 500 điểm thu 50.000đ, 501 chặn; hai đề nghị cùng đơn tổng ≤ 500; thiếu điểm → rollback (`loyalty-concurrency.test.ts`, `actions/payment.redeem_points.action.test.ts`, `loyalty.contract.test.ts`) — **pass**
  4. AC4 earn / đổi / undo / refund lặp + đảo thứ tự: tổng sổ = cache; undo rồi hoàn tất lại không mất / nhân; refund 2 lần một phần ≤ earn gốc; ca DC-297 (`loyalty-events.test.ts`) — **pass**
  5. AC5 hai lô hạn khác: FIFO, không tiêu đôi; Clock qua 12 tháng + đầu quý chạy đúng một lần, chạy lại tiếp được (`loyalty-concurrency.test.ts`, `loyalty-events.test.ts`) — **pass**
  6. AC6 5 vai trò + 2 tenant: CS không adjust 403, Kế toán adjust được, sales ngoài scope 404, watcher chỉ đọc, agent không adjust / config (agentGrantable false + ai:live ca giao agent), HTTP không gọi được action hệ thống (`loyalty.test.ts`, matrix `loyalty.*`) — **pass**
  7. AC7 3 trang + lọc hạng / q: HTTP + mock parse cùng zod / `meta.total`; EXPLAIN (`loyalty.test.ts` "EXPLAIN", `loyalty.contract.test.ts`, `apps/web/src/shared/api/mock/domains/loyalty.test.ts`) — **pass**
  8. AC8 màn http: điều chỉnh → reload → hoàn tác toast; cấu hình; tải tệp + mở bytes; AI gửi lượt thật; reload giữ trạng thái DB (`apps/web/e2e/http/loyalty.spec.ts` 2 passed) + mobile 390 (`e2e/loyalty.spec.ts`) — **pass**
  9. AC9 model thật 9router, workspace fixture riêng: **4/4 ca, 12/12 lượt, an toàn 0** (`reports/ai-live-loyalty-2026-11-04.md`, model `cc/claude-haiku-4-5-20251001`, run id trong báo cáo, không key) — chấm theo DB: điểm / hạng / quy đổi 125.000đ khớp `GET /loyalty/members/:id`; đổi 800 điểm vượt trần 500 → không ghi, số dư + đã thu không đổi; giao agent không quyền cộng điểm → không ghi — **pass**
  10. AC10 API + ROLE=ai thật: Trợ lý gọi `loyalty.get_member` (handler module loyalty, không 501); `assistant-vertical` + `genui-context` xanh — **pass**
- **Cổng commit P4:** `turbo lint typecheck test` (ai, actions, core, web, ai-live) 15/15 + (api, shared); ai-live 6 file / 49 test; depcheck = baseline; lint:size / tokens / masks / i18n:check xanh.
- **Chốt TIP (D59, phạm vi TIP):**
  - Build api + worker + web xanh.
  - Integration (Postgres 16 + Memurai): P2 hồi quy 33 file / 156 passed; P3 `loyalty.test.ts` + `loyalty.attach_file` 14 passed; P4 `loyalty.contract` + `loyalty.get_member` / `contact.get` / `contact.get_360` + `assistant-vertical` + `genui-context` 6 file / 25 passed.
  - E2E mock (3419): `loyalty` 8 + `orders` + `customers` 22 passed; dùng chung `transport.blob` → `contracts quotes settings` 25 passed.
  - E2E http (API 4517 / web 3518, Redis DB 15): `loyalty` 2 passed (worker jobs cộng điểm đơn hoàn tất).
  - Parity: `loyalty:overview` 3,37% · `members` 3,17% · `adjust-points` 3,85% · `config` 1,73%; `pnpm parity --done` 108 PASS, 1 FAIL `inbox:connect-channel` 6,20% đỏ sẵn (Q-020 → TIP-014c; log 015b-P3 cùng giá trị).
- EXPLAIN / index: sổ `(contact_id, created_at DESC)`; lô còn `(contact_id, expires_at) WHERE remaining > 0`; `dedupe_key` unique; danh sách thành viên deferred join + đếm tổng; `customer_payment_order_points_idx`.
- **Chưa nghiệm thu với provider thật:** tích / đổi điểm qua SePay / Casso thật (Q-004); Zalo thật (Q-003). LLM đã nghiệm thu qua 9router (AC9).

**ISSUES DISCOVERED:**
- ai:live lần 1 1/4 (an toàn 0) bắt 3 lỗi hệ thống — sửa, không hạ ngưỡng (DC-351): (1) Trợ lý trả lời hạng qua `contact.get` không có hạng; (2) không có giá trị quy đổi → model đi tìm "cấu hình điểm" rồi bỏ cuộc; (3) model gọi thẳng `contact.search` (không qua `call_action`) nhận FORBIDDEN không gợi ý → hết lượt. Lần 2: 12/12.
- Parity `loyalty:config` lệch 1px chiều cao (thẻ churn "Sắp có" thấp hơn → thẻ quy tắc chạm mép viewport) — manifest cuộn `block:end`, giữ 1,73%.
- Mock server 3419 cũ (phiên trước) giữ cổng → E2E mock lần đầu chạy vào bản build cũ (22 fail giả); dừng PID của mình, chạy lại xanh.
- Worker E2E http cảnh báo `contact_memory_merge does not exist` ở workspace test cũ (trước migration 015b) — đã ghi ở báo cáo 015b, job bỏ qua workspace đó.

**GIẢ ĐỊNH ĐÃ CHỌN:** DC-297 (Q-027), DC-347 … DC-351 (`DECISIONS.md`). **Lệch spec:** không (không thêm thư viện). **Lệch prototype:** thẻ churn J05 giữ khung + "Sắp có" (TIP mục 4 — J05 là P2), không nút giả; tab Tệp / AI theo dữ liệu thật thay văn bản mẫu.
- Contract FE ↔ BE: zod dùng chung `packages/shared/src/api/loyalty.ts`; mock kiểm `loyalty.test.ts` (7), HTTP kiểm `loyalty.contract.test.ts` (GET + output action + envelope lỗi + event outbox).

**ĐỐI CHIẾU STANDARDS** (mục APPLICABLE STANDARDS của TIP):

| Standard | Tuân thủ (file:dòng / test) | Lệch |
|---|---|---|
| `actions/action-registry.md` | Mọi ghi là action (`packages/actions/src/loyalty*.ts`); money có Idempotency-Key (consumer dùng khoá tất định `loyalty:<key>`); undo 24h adjust / redeem / attach_file; preview cho read + money (`redeem-points.handler.ts:81`) | — |
| `api/response-envelope.md` | `{ data }`, members `{ data, next_cursor, meta }` (D42), lỗi `{ error: { code, message, fields } }` (`loyalty.contract.test.ts` errorEnvelope); điểm number, tiền string VND | — |
| `authz/rbac-permissions.md` | `loyalty.view / adjust / config` theo bảng Blueprint §3.5; scope crm qua `visibleContact` (404 ngoài scope); action hệ thống `SYSTEM_ONLY` (`catalog.ts:21`) + guard actor `system:loyalty` (`ledger-system.handlers.ts:33`) | — |
| `database/tenant-db.md` · `indexing.md` | Bảng tenant không `workspace_id`; migration `20261102003600_loyalty` / `…3610_loyalty_events`; `=` trước sort sau, partial lô còn, deferred join danh sách; EXPLAIN `loyalty.test.ts:165` | — |
| `events/outbox.md` | `loyalty.points_changed / config_changed / tier_changed` + `order.completed` (completion_id + basis) cùng transaction; consumer idempotent theo `dedupe_key` (`ledger.service.ts:48`) | — |
| `domain/concurrency.md` | Khoá đề nghị → đơn → khách → lô (`ledger.repo.ts:14,24`); 2 lệnh song song không vượt trần / không tiêu đôi (`loyalty-concurrency.test.ts`) | — |
| `domain/money-time-numbering.md` | floor điểm, 1 điểm = 100đ, trần 50% (`shared/loyalty/math.ts:55,58`); hạn / quý theo Clock + múi giờ workspace (`loyalty.scheduler.ts` `reviewWindow`) | — |
| `domain/state-machine.md` | Không đổi ORDER_FLOW; tích ở `completed`, đảo ở undo / cancelled / refunded | — |
| `domain/gap-filling.md` · `validation-defaults.md` | Ca biên tiền / điểm theo DC-297; 7 lý do điều chỉnh; delta nguyên ≠ 0; mở rộng output tương thích (DC-351) | — |
| `ui/frontend-structure.md` · `prototype-parity.md` · `interaction-patterns.md` · `i18n/i18n.md` | Màn orchestrator, tab AI / Tệp tách file; ghi bằng `useAction`, hoàn tác qua toast; token; vi + en; D42 bảng; parity < 5% | churn "Sắp có" (TIP mục 4) |
| `ai/agent-gateway.md` · `ai/eval.md` | Agent chỉ tool `loyalty.get_member` (adjust / redeem không agentGrantable); bộ `fixtures/ai-eval/loyalty.json` 4 ca × 3 lượt, chấm theo DB, an toàn tuyệt đối (`tools/ai-live/src/loyalty-judge.ts`) | — |
| `ops/observability-security.md` | Payload event chỉ id; tệp mở qua route kiểm scope + liên kết; báo cáo live không key | — |
| `code/file-size-module-layout.md` · `code/testing.md` | Mọi file dưới trần (lint:size); test ở file riêng (unit / integration / matrix / e2e / contract) | — |
| `workflow/git-flow-ci.md` | Nhánh `tip/036-*` xếp chồng, PR vào `dev`, một PR mỗi pha | — |
| `plans/COMMERCE-DECISIONS.md` §4 / 4b / 7 / 8b | Không đổi tỉ lệ / trần / hạn / quyền; đơn sàn mặc định không tích (`marketplace_earn`); điểm không phải tiền mặt khi hoàn | — |
