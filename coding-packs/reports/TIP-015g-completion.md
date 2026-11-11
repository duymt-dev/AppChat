### COMPLETION REPORT — TIP-015g

**STATUS:** DONE — nhánh `tip/015g-crm-stage-hold` (xếp chồng #181), một pha; SHA ở bảng tiến độ `goals/GOAL-RELEASE.md` dòng 41.

**TÓM TẮT:** Giữ giai đoạn kéo tay 24 giờ (COMMERCE §8) thành nguyên tử với mọi producer Commerce.
- **Luật tự động** (`crm/stage/rules.ts`, facade `services/stage-rules.ts`):
  - Producer khoá họ khách chuẩn (gốc sống + nguồn đã gộp, id tăng dần) TRƯỚC khi khoá báo giá / hợp đồng / đơn, qua `lockStageFamily` / `lockStageFamilyOf`. Ràng buộc ghi theo transaction (WeakMap).
  - `applyStageRule` thiếu ràng buộc → 500, không tự khoá ngược thứ tự.
  - Đọc trên dòng đã khoá, rồi UPDATE có điều kiện id + version + stage + còn sống + mốc giữ, so bằng timestamptz trong SQL (đúng 24h = hết giữ; µs không cắt; mốc tương lai = giữ).
  - Không làm mới mốc kéo tay. Bị giữ → chứng từ vẫn chuyển, không có event giai đoạn.
- **Kéo tay:** `contact.set_stage` dời sang `crm/stage/manual.handler.ts`, giữ nguyên ID / input / output / quyền.
  - Khoá họ trước, rồi kiểm quyền ghi + `if_version`.
  - Cùng giai đoạn = no-op thật.
  - Biên nhận ghi mốc dạng chữ UTC µs + version sau-ghi + lifecycle_revision.
- **Hoàn tác** (`crm/stage/undo.ts`):
  - Khoá họ (không đi theo bí danh gộp), kiểm Quên khách, còn sống, quyền ghi hiện tại.
  - Đòi đúng version sau-ghi + vân tay µs; lệch → 409. Biên nhận cũ → 409.
  - Khôi phục đúng trường đã chạm bằng cast timestamptz; lịch sử chỉ ghi thêm.
- **Producer:** gửi / từ chối báo giá, hết hạn báo giá (action riêng 003c), gửi ký hợp đồng, khách ký (030c `finalize.ts`), hoàn tất đơn + đồng bộ sàn.
- **Báo giá mở theo họ khách:** `open-family-quote.ts`, EXISTS hẹp trên `quote_contact_status_idx`.

**FILES CHANGED:** theo manifest `tips/manifests/TIP-015g-files.md`; lệch DV-103. Chính:
- `packages/core/src/crm/stage/{types,rules,manual.handler,undo,snapshot}.ts`.
- `crm/services/stage-rules.ts` (facade), `crm/actions/contact-write.handlers.ts` (bỏ handler, re-export), `crm/lifecycle/lock.ts`, `crm/public.ts`.
- `sales/quotes/services/open-family-quote.ts`.
- Producer: `sales/quotes/actions/{quote-send,quote-decide}.handlers.ts`, `sales/system/quote-effects.ts`, `sales/orders/actions/order-flow.handlers.ts`, `sales/orders/services/order-import.ts`, `contracts/actions/contract-send.handlers.ts`, `contracts/signing/finalize.ts`.
- Test: `packages/core/test/crm-stage-hold.test.ts`, `apps/api/test/integration/crm-stage-{hold,producers,undo}.test.ts`, `apps/web/e2e/http/crm-stage-hold.spec.ts`.
- ai:live: `fixtures/ai-eval/crm-stage-hold{.json,/seed.mjs}`, `tools/ai-live/src/{stage-judge,cases,runner,cli}.ts`.
- Không migration (DV-103 mục 1).

**TEST RESULTS** (phạm vi TIP, D59 + luật goal: không full integration / full E2E):

| Phạm vi | Kết quả |
|---|---|
| Unit core (gồm `crm-stage-hold` 3) | 964 (+1 skip) |
| Unit ai-live | 87/87 |
| Integration API (Postgres 16 + Memurai + LibreOffice thật) | crm-stage-hold 6, crm-stage-producers 8, crm-stage-undo 5 |
| Hồi quy producer | 19 file / 164 (commerce-attribution, commerce-gaps, contact-lifecycle-blocked-import / inbound, contract-appendix / files / signing-atomicity / signing-public, contracts, crm-board-page, crm-contacts, crm-ui, loyalty-events / contract / loyalty, orders, quotes, watcher-write-denial, marketing-contract) |
| Worker (contract-signing-composition, ai-task-event-recovery, contract-draft-tools) | 8/8 |
| E2E mock (`E2E_PORT=3537`) customers + crm-activities | 10 passed (10 skipped = dự án mobile) |
| E2E http customers + customers-ui + crm-stage-hold | 3 passed (3 skipped mobile) |
| ai:live crm-stage-hold (4 ca × 3 lượt, model thật qua 9router) | **4/4, 12/12 lượt, an toàn 0, ĐẠT** — `reports/ai-live-crm-stage-hold-2026-11-11.md` |
| Build api / worker | sạch |
| Typecheck core / api / ai-live | sạch |
| depcheck | 116 = baseline |
| lint:size / lint:tokens / lint:masks / i18n:check | sạch |

Không đổi UI → không parity.

**ISSUES DISCOVERED:**
1. Prisma truyền `Date` vào raw SQL dạng timestamp không múi giờ, Postgres đọc theo múi phiên (Asia/Bangkok) → so mốc giữ lệch 7 giờ. Sửa: tham số thời gian truyền chữ ISO + `::timestamptz` (DC-430 f).
2. `pg_sleep` qua `$queryRaw` lỗi giải mã kiểu `void` → test dùng `$executeRaw`.
3. Token Sales của harness hết hạn sau khi test trước tua đồng hồ → test tạo thành viên ngay lúc dùng.
4. Judge ai:live lần đầu đọc giai đoạn qua `GET /contacts/:id` (khuôn 360°, không có mã giai đoạn) → báo sai `stage_not_changed` dù model gọi đúng; sửa đọc qua action `contact.get` + log hoàn tác từ nhật ký hành động, chạy lại 4/4.

**ĐỐI CHIẾU STANDARDS** (APPLICABLE STANDARDS của TIP):

| Standard | Tuân thủ (file / test) | Lệch |
|---|---|---|
| `COMMERCE-DECISIONS.md` §8 | Nâng / lùi / Đã mua không hạ / 24 giờ giữ nguyên; producer matrix | — |
| `domain/concurrency.md` | Khoá họ khách → chứng từ (một thứ tự toàn cục); CAS version + stage + mốc; test hai kết nối không deadlock + ABA | — |
| `domain/state-machine.md` | Giai đoạn bị giữ = no-op, chứng từ vẫn chuyển; hoàn tác là hiệu ứng mới | — |
| `domain/money-time-numbering.md` | Thời lượng tuyệt đối 86 400 000 ms, so trong SQL, µs không mất; đồng hồ tiêm | — |
| `actions/action-registry.md` · `authz/rbac-permissions.md` | `contact.set_stage` giữ ID / input / output / quyền `crm.edit` / agentGrantable; hoàn tác kiểm quyền ghi hiện tại | — |
| `events/outbox.md` | Timeline + `contact.stage_changed` cùng transaction chứng từ; gửi lại cùng khoá không lặp event | — |
| `database/tenant-db.md` · `indexing.md` | EXISTS hẹp, seek theo contact_id; EXPLAIN 100k không Seq Scan | Không migration mới (DV-103 mục 1) |
| `ai/agent-gateway.md` · `ai/eval.md` | Trợ lý / agent dùng đúng action chuẩn; ai:live chấm theo đọc lại DB | Ca thu hồi agent gộp vào ca Sales ngoài phạm vi (DV-103 mục 5) |
| `code/file-size-module-layout.md` · `testing.md` | Module `crm/stage` riêng, file cũ chỉ facade; test ở file riêng | — |
| `workflow/git-flow-ci.md` | Nhánh `tip/015g-*`, PR vào dev, xếp chồng #181 | — |

**GIẢ ĐỊNH ĐÃ CHỌN:**
- Gốc khách đã xoá / chuỗi gộp hỏng → không đổi giai đoạn, chứng từ vẫn chuyển (ràng buộc `rootId = null`).
- Hoàn tác kéo tay ghi thêm timeline + event `manual: true` (một hiệu ứng tay mới).
- Producer hoàn tất đơn từ đồng bộ sàn cũng khoá họ khách (writer thật của `completeOrder`).

**CHƯA NGHIỆM THU:** không có (không dùng provider ngoài; ai:live chạy model thật qua 9router).
