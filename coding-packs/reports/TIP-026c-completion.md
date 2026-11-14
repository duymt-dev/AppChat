### COMPLETION REPORT — TIP-026c

**STATUS:** DONE — nhánh `tip/026c-sales-pipeline` (luồng B, worktree wt2), rebase lên `origin/dev` `c0ff47d6` (sau #233). Bảy commit, một PR:
- `79ee37dd` pha 1 — backend lõi (bảng hằng, migration, action, core `crm/opportunities`, 360° / cột / chip / stats, nhập / xuất).
- `94f5c5df` pha 2 — nối producer chứng từ (báo giá / hợp đồng / đơn / lịch hẹn), đọc HTTP, integration.
- `92b24f0b` pha 4 — web (thẻ 360°, drawer, chip, cột, form Báo giá / Lịch hẹn, mock cùng luật).
- `1036145a` pha 5 — E2E http + parity thẻ 360° / drawer.
- `b75259a0` — ai-eval `sales-pipeline` 6 ca × 3 lượt (model thật).
- `f8e097f7` — nhãn tool agent cho 6 action mới.
- `42026290` — lịch hẹn trả `opportunity_id`.
(Pha 3 "đọc / 360 / chip / cột" gộp vào pha 1 + 4.)

**TÓM TẮT:** Khối cơ hội Hồ sơ 360° của 026b thành Sales Pipeline đúng COMMERCE §8 (D60, DC-901):
- 7 giai đoạn, xác suất cố định theo bảng hằng (`@appchat/shared` `opportunity-stages.ts`), không còn cột `probability` (gửi lên → 422 `field_removed`).
- Chuỗi chứng từ: báo giá → [hợp đồng ký → đơn] / đơn → đề nghị thanh toán → thu.
- Giai đoạn cơ hội tự chạy theo producer chứng từ thật. Giai đoạn khách suy từ cơ hội + sàn chứng từ (giữ tay 24 giờ của 015g thắng).
- Agent dùng được (DC-922).

---

#### RÀ TRƯỚC KHI LÀM (kết quả thật trên code)

1. **Giao file (`manifests.py 026c`):** giao với ~70 TIP. Các TIP khai "tích hợp trước 026c" mà chưa làm lúc bắt đầu:
   - Đã merge vào dev trong lúc làm, đã rebase: 003e · 003g · 014c · 022d · 031c.
   - Còn mở, thuộc luồng A theo phân luồng HANDOFF 035d: 003f · 004b · 011b · 013b · 013c · 031b · 033d.
   - Rebase cuối xung đột 3 file: `inbox/services/{read.service,view}.ts` và `features/inbox/types.ts`. Giải theo khoá dòng, giữ SLA 014c + chip cơ hội.
2. **Thứ tự khoá producer (015g):** họ khách → chứng từ → cơ hội.
   - Đã đúng: `quote.send` · `quote.mark_rejected` · `quote.expire` · `contract.public_sign` · `order.complete`.
   - **Thiếu khoá họ khách, đã thêm `lockStageFamilyOf` trước khoá chứng từ:**
     - `quote.mark_accepted` (`decisions/accept.handler.ts`)
     - `contract.public_decline`
     - hết hạn link hợp đồng (`contracts/system/effects.ts`)
     - `order.cancel`
     - `order.create` / `create_from_quote` / `create_from_contract` / `create_from_appointment`
   - `appointment.complete` không đổi giai đoạn, chỉ ghi event `ai_suggested`.
   - File `quote-decide.handlers.ts` trong manifest nay là facade (022c đã tách `decisions/*`) → sửa ở `decisions/{accept,reject,revision,shared}.ts` (DV-801).
3. **Dữ liệu `contact_opportunity`** (psql 2026-11-14):
   - `appchat_platform_wt2` / `_test_wt2`: 0 workspace.
   - Demo ở checkout chính (`appchat_platform`): 15 workspace, **0 dòng** `contact_opportunity` mọi workspace, nên 0 dòng có `quote_id` / `probability`.
   - Migration vẫn viết đủ ánh xạ (open → lead, proposal → quote; `quote_id` → `quote.opportunity_id` + chuỗi phiên bản + đơn kế thừa). Test trên bản chụp 026b dựng tay (`packages/db/test/opportunity-pipeline-migration.test.ts`).
4. **Prototype 2026-11-10:**
   - Thẻ 360° L2386–2417, drawer L2852–2915, đối chiếu từng dòng.
   - Lệch mức 1 → PD-901 (có sẵn, đề xuất).
   - Mức 4 trích luật:
     - "Hóa đơn HD-" → "Đề nghị thanh toán TT-" (COMMERCE §5).
     - "Khách duyệt" → "Khách chốt" (COMMERCE §3).
     - Nhãn giai đoạn khách theo D60.
   - Thẻ "⚠ Công nợ · Tài chính" ở 360° (L2378) là của TIP-032e → không dựng ở 026c.
5. **Tên cũ còn dùng ngoài manifest** (`probability`, `deal`, `close_pct`, `crm.open_deal`):
   - Test 026b, dataset nhập / xuất, `list-exports`, nhãn cột xuất insights, mock FE.
   - Sửa hết, ghi DV-801.

#### GIẢ ĐỊNH ĐÃ CHỌN (gap-filling §6 → DC-801)

| Chỗ trống | Bậc dừng | Lựa chọn | Lý do | Đảo ngược |
|---|---|---|---|---|
| "Bỏ qua" gợi ý AI lưu ở đâu | §1 bậc 4 (TIP im lặng) | Chỉ ẩn trong phiên (state của `OpportunityPanel`), không event | Không thêm bảng / event ngoài TIP; gợi ý mới vẫn hiện | Thêm event `ai_dismissed` + lọc ở `suggestionOf` |
| Đích "Xem thu tiền" khi chưa có Tài chính | bậc 4 | `/invoices` tới TIP-032e | Màn Tài chính là TIP kế, không dựng tạm | 032e đổi `useOpportunityChain.finance` |
| Cờ đồng bộ tắt khi gửi báo giá | bậc 4 | Giữ giá trị cơ hội, chỉ đổi giai đoạn | Cờ là ý người tạo báo giá | Bỏ điều kiện cờ ở `onQuoteSent` |
| Tên migration `20261112100000` trùng mốc trước 003e | bậc 3 (thứ tự áp theo tên) | `20261114100000_opportunity_pipeline` | Chạy sau `20261114040000_action_integrity` đã áp ở DB khác | Không đảo sau khi áp |
| Cột "Cơ hội đang mở" mở cơ hội nào khi có nhiều | bậc 4 | Giai đoạn cao nhất (`opportunityRank`), cùng hạng thì mới nhất | Khớp nhãn cột (`openSummary.top_stage`) | Đổi `OpportunityCell` |

---

#### TEST (cổng chốt D59 — chỉ phạm vi TIP; full integration / full E2E để TIP-046)

| Cổng | Kết quả (output thật, sau rebase `c0ff47d6`) |
|---|---|
| Migration (wt2) | `db:generate` ✔ · `db:migrate-tenants` "tenant …: 0 DB xong, 0 lỗi" (wt2 chưa có workspace) · `-- --test` "5 DB xong, 0 lỗi" · `db:setup` "appchat_tenant_template_wt2 +3 migration" |
| Integration TIP (Postgres 16 + Memurai wt2) | **14 file / 69 test xanh**:<br>• `opportunity-pipeline` · `opportunity-producers` · `crm-stage-producers` · `contact-activities` · `contact-activity-transfer` · `contact.summarize`<br>• 8 ma trận `contact_opportunity.{create,update,get,list,set_stage,mark_lost,reopen,set_owner}`<br>Chạy lại `opportunity-producers` + `read-shape-contract` sau khi thêm `opportunity_id` lịch hẹn: 2 file / 101 test xanh |
| Unit | shared 39 file / 228 · actions 15 / 59 · db 7 / 38 · ui 1 / 2 · core 210 file / 1358 (1 skip) · web 178 file / 611 · ai-live 13 / 90 |
| Typecheck / lint | `turbo typecheck` web / core / shared / actions / api / ui 6/6 ✔ · eslint 0 lỗi (web 24 cảnh báo có sẵn ở file ngoài TIP) |
| depcheck · lint:size · lint:tokens · lint:masks · i18n | 0 vi phạm (4671 module) · sạch · 1162 file đúng thang D41 · 56 mask có căn cứ · vi + en 7560 key 100% |
| Build | `turbo build` api + worker ✔ · `next build` web (mock) ✔ |
| E2E mock | `pnpm e2e sales-pipeline` 4 passed (desktop + mobile-390) · inbox / customers / quotes / calendar / crm-activities 35 passed / 33 skip / 0 fail |
| E2E http | `TENANT_CLIENT_CACHE=10 pnpm e2e:http sales-pipeline` **1 passed** (mobile skip theo spec) — 422 probability / won_needs_document, quote.send (kênh Email giả) → Báo giá 18tr, chốt → Đàm phán, Thua đối thủ → Mở lại → Đủ điều kiện |
| ai:live | `ai-live-stack -- --cases fixtures/ai-eval/sales-pipeline.json --attempts 3` → **6/6 ca, 18/18 lượt, an toàn 0, ĐẠT** — model thật 9router `cx/gpt-6-sol`, stack cổng 5261 (`reports/ai-live-sales-pipeline-2026-11-14.md`) |
| Parity màn TIP | `customers:360-pipeline` **2,98%** · `deal:drawer` **1,40%** · `customers:table` 3,05% · `quotes:editor` 4,75% · `calendar:appointment` 4,46% |
| `parity --done` (lớp dùng chung đổi) | 99 PASS · 3 PAID · 1 DEBT · 6 FAIL — cả 6 đều **đỏ sẵn trên dev** (run 43591756291): xem dưới |

**EXPLAIN (AC8 — 100k khách / 300k cơ hội, `opportunity-pipeline.test.ts`):** `openSummary` một truy vấn cho 50 khách:
```
GroupAggregate (actual time=0.674..0.951 rows=50)
  ->  Incremental Sort  Presorted Key: o.contact_id
        ->  Nested Loop
              ->  Index Only Scan using contact_opportunity_open_idx on contact_opportunity o  (rows=112)
                    Index Cond: (contact_id = ANY ('{…50 id…}'::uuid[]))   Heap Fetches: 0
              ->  Index Scan using contact_pkey on contact c   Filter: (deleted_at IS NULL)
Execution Time: 0.984 ms
```
Danh sách theo khách: keyset `contact_opportunity_contact_idx (contact_id, updated_at DESC, id DESC)` (assert trong test).

**Parity đỏ sẵn (chứng minh không do 026c):**

| Màn | Dev CI 43591756291 | Nhánh này (Windows) | Ghi chú |
|---|---|---|---|
| `inbox:default` | 9,27% | 7,74% | Tốt hơn dev. Gỡ thẻ Công nợ (032e) khỏi prototype khi đo thử: 7,15% → phần còn lại là nợ cũ của Hộp thư |
| `inbox:folder-rail` | 7,78% | 6,50% | Tốt hơn dev |
| `inbox:conv-menu` | 7,52% | 6,69% | Tốt hơn dev |
| `inbox:chat-menu` | 7,69% | 7,39% | Tốt hơn dev |
| `customers:360` | 14,28% | 9,99% | Tốt hơn dev. Gỡ thẻ Công nợ (032e): 6,94%; thẻ cơ hội riêng đo ở `customers:360-pipeline` 2,98% |
| `calendar:create` | size mismatch 540×810 vs 540×779 | như dev | Không đụng |

So từng màn với dev: chỉ `settings:sla` tăng > 1 điểm (2,69% → 3,82%, vẫn PASS, không thuộc TIP — dao động Windows / Linux).

**AC:**

| AC | Kết quả |
|---|---|
| 1 Migration | ✅ `opportunity-pipeline-migration.test.ts` (bản chụp 026b: open / qualified / proposal / won / lost, `quote_id`, `probability`): id / version / timeline giữ, stage ánh xạ, `quote.opportunity_id` + chuỗi phiên bản + đơn kế thừa, cột cũ bỏ; template + test DB cùng schema |
| 2 Thẻ 360° + ẩn tiền | ✅ `opportunity-pipeline` + `OpportunityPanel.test` 6 ca (50% / 24tr / 6 bước / "Ẩn theo quyền") + E2E mock / http |
| 3 Báo giá → Đàm phán → Đã mua | ✅ `opportunity-producers` (gửi → 70% + giá trị = tổng + việc +2 ngày, chốt → 85%, đơn → Đã mua; khách theo, chưa Đã mua tới khi đơn hoàn tất) |
| 4 Đường hợp đồng / hết hạn | ✅ `opportunity-producers` + `crm-stage-producers` (Đã mua lúc khách ký; từ chối / link hết hạn → Đàm phán; báo giá hết hạn không còn báo giá mở → Tư vấn / Demo) |
| 5 Thua / Mở lại | ✅ ma trận `mark_lost` / `reopen` + producers (sent → rejected, nháp giữ, 0%; Mở lại → giai đoạn trước; đơn sống → 409; preview liệt kê báo giá bị từ chối) |
| 6 Giai đoạn khách | ✅ `opportunity-stage-sync.test.ts` + integration với giữ tay 015g |
| 7 Agent / Trợ lý | ✅ ma trận (agentGrantable, 422 như người) + ai:live 18/18 (tạo đúng giai đoạn, đổi giai đoạn, Thua có lý do / hỏi lại lý do, mở lại, tra pipeline — ghi đều dừng ở thẻ xác nhận) |
| 8 Hiệu năng | ✅ EXPLAIN trên, một truy vấn mỗi trang, Index Only Scan |
| 9 Form Báo giá / Lịch hẹn | ✅ `opportunity-producers` (cơ hội khác họ → 422, lịch hẹn lưu / bỏ / hoàn tác, hoàn thành → chỉ gợi ý; `GET /calendar` trả `opportunity_id`) + E2E |
| 10 Parity / mobile / i18n | ✅ 2,98% / 1,40%; mobile 390 E2E; vi + en 100% |

---

#### FILES

- Manifest `tips/manifests/TIP-026c-files.md`: 134 file đã sửa / tạo.
- 61 file ngoài manifest: DV-801 (danh sách đầy đủ trong sổ).
- Chính:
  - `packages/shared/src/crm/opportunity-stages.ts` · `packages/shared/src/api/{opportunities,quotes,calendar,crm,inbox}.ts`
  - `packages/actions/src/contact-opportunit{ies,y-flow}.ts`
  - `packages/db/prisma/tenant/migrations/20261114100000_opportunity_pipeline/`
  - `packages/core/src/crm/opportunities/*`
  - Producer báo giá / hợp đồng / đơn / lịch hẹn
  - `apps/api/src/http/crm/opportunities.controller.ts`
  - `apps/web/src/shared/opportunities/*` · inbox chip / tab CRM · customers cột · form Báo giá / Lịch hẹn · mock domains
  - `fixtures/ai-eval/sales-pipeline{.json,-seed.mjs}` · `tools/parity/modules/sales-pipeline.ts`

#### ISSUES DISCOVERED

- **`assistant-vertical.test.ts` đỏ sẵn trên dev:** 1/4 "mọi action có file ma trận riêng hoặc thuộc TIP sau".
  - 47 action thuộc TIP 027 / 032 / 019c / 023f… chưa nằm trong `LATER_TIPS`.
  - Không có action `contact_opportunity.*` nào trong danh sách: 8 action của 026c đều có ma trận.
  - Ngoài phạm vi; để TIP sở hữu `fixtures/action-matrix.ts`.
- **`db:migrate-tenants` không tự nạp `.env`** (`db:setup` thì có). Trong worktree phải export env trước (`set -a; . ../../.env`), không sửa `.env`. Đề xuất: script tự đọc `.env` như `setup-dev.ts`.
- **`test:integration -- <file>`**: dấu `--` làm vitest bỏ bộ lọc và chạy cả bộ. Gọi `vitest run --config vitest.integration.config.ts <files>` trực tiếp (qua `pg-slot`).
- **Chập chờn:** `assistant-input-parsing` (XLSX) timeout 5 giây khi turbo chạy song song nặng; chạy riêng 10/10.

#### ĐỐI CHIẾU STANDARDS (APPLICABLE STANDARDS của TIP + bảng CLAUDE.md §2)

| Standard | Tuân thủ (file / test) | Lệch |
|---|---|---|
| `plans/COMMERCE-DECISIONS.md` §3 / §5 / §8 / §9 | Bảng 7 giai đoạn + xác suất 10…100 / 0 (`opportunity-stages.ts`); Đã mua chỉ khi có HĐ ký / đơn (`won_needs_document`, `transitions.ts`); "Khách chốt" (§3); bước 3 chuỗi = Đề nghị thanh toán TT- (§5); không đổi ngưỡng duyệt báo giá | — |
| `domain/state-machine.md` | Chuyển giai đoạn qua `set_stage` / producer; đóng (won / lost) chỉ qua chứng từ / `mark_lost`; `reopen` về giai đoạn trước; event append-only `contact_opportunity_event` | — |
| `domain/concurrency.md` | `if_version` mọi action ghi; khoá họ khách → chứng từ → cơ hội (sắp theo id, `locks.ts`); thiếu khoá ở 7 producer đã thêm; FE 409 → làm mới, giữ lựa chọn (`useOpportunityActions`) | — |
| `domain/money-time-numbering.md` | Tiền chuỗi VND; dự báo half-up (`forecastOf`); hạn việc theo dõi +2 ngày; ngày chốt là ngày lịch | — |
| `domain/validation-defaults.md` | zod: tên ≤ 200, giá trị ≥ 0, lý do Thua enum bắt buộc; `probability` / `quote_id` → 422 `field_removed` | — |
| `domain/gap-filling.md` | DC-801 (5 giả định), DV-801 | — |
| `database/tenant-db.md` | Bảng tenant không `workspace_id`; DB qua `TenantDbResolver`; đủ generate → migrate-tenants (dev + test) → setup | Tên migration (DC-801 (4), DV-801) |
| `database/indexing.md` | `contact_opportunity_contact_idx (contact_id, updated_at DESC, id DESC)` keyset; `_open_idx (contact_id) INCLUDE (stage, amount_vnd)` partial; `owner_close_idx`; partial `quote/order/appointment_opportunity_idx`; EXPLAIN 100k / 300k dán trên | — |
| `actions/action-registry.md` | 9 action (`create / update / archive / set_stage / mark_lost / reopen / set_owner / list / get`): zod, quyền `crm.*`, risk, undo 24 giờ, preview Thua, `invalidates: ['crm']`, agentGrantable theo DC-922 (archive false); FE chỉ `useAction` | — |
| `api/response-envelope.md` | `{ data }` / `{ data, next_cursor }` (`GET /contacts/:id/opportunities`, `/opportunities/:id`); lỗi `{ error: { code, fields } }`; `read-shape-contract` xanh | — |
| `events/outbox.md` | Event cơ hội + timeline + thông báo `opportunity_lost_reason` cùng transaction với hiệu ứng | — |
| `authz/rbac-permissions.md` | `crm.view` / `crm.edit` + scope khách; tiền theo `quote.view` (vắng + `amount_hidden`) / ghi tiền `quote.create`; chuỗi chứng từ ẩn theo quyền từng loại (`hidden`) | — |
| `integrations/provider-ports.md` | Không thêm provider; E2E http dùng kênh Email giả (TIP-018) | — |
| `ops/observability-security.md` | Không log bí mật; ai:live an toàn 0; mã lỗi an toàn | — |
| `ai/agent-gateway.md` · `ai/eval.md` | Tool agent theo DC-922; "Áp dụng" gợi ý chạy `set_stage` + `suggestion_id` dưới quyền người bấm; ai:live 6 ca × 3 lượt | — |
| `ui/frontend-structure.md` | `shared/opportunities/*` (component ≤ 250, hook / store / styles / types tách); màn chỉ nối; facade `contact-activities/Opportunity{Card,Form}.tsx` | File tách thêm (DV-801) |
| `ui/prototype-parity.md` | `customers:360-pipeline` 2,98% (mask PD-901, 6,5% khung), `deal:drawer` 1,40% (không mask); mask có mã (lint:masks) | PD-901 (đề xuất, có sẵn) |
| `ui/interaction-patterns.md` | Xem trước + xác nhận cho Thua (liệt kê báo giá bị từ chối); 409 làm mới; Esc / nền đóng drawer; mobile 390 toàn màn | — |
| `i18n/i18n.md` | `common.opportunity.*`, nhãn giai đoạn khách D60 (`customers` / `inbox`), `actions.contact_opportunity.*`, server `notify` / `insights` — vi + en 100% | — |
| `code/file-size-module-layout.md` | lint:size sạch (backend ≤ 600, web ≤ 400); test file riêng | — |
| `code/testing.md` / D59 | Chỉ phạm vi TIP; lint / typecheck / unit / depcheck mỗi commit; chốt: build, integration domain, E2E mock + http, parity + `--done`, ai:live | — |
| `workflow/git-flow-ci.md` | Nhánh `tip/026c-sales-pipeline` từ `origin/dev`, rebase `c0ff47d6`, PR vào `dev` | — |

**Chưa nghiệm thu với provider thật:** không (LLM 9router thật đã chạy). Không cần Zalo / SePay / Brevo.

**SUGGESTIONS FOR CHỦ THẦU:**
- Duyệt PD-901.
- Khi 032e dựng thẻ Công nợ ở 360°: đo lại `customers:360` / `inbox:default` (thẻ Công nợ hiện là phần lớn lệch còn lại).
- Nối `migrate-tenants.ts` tự đọc `.env`.
