### COMPLETION REPORT — TIP-003c

**STATUS:** DONE — một nhánh `tip/003c-system-actions` (xếp chồng #178), 12 pha + test + sửa; SHA từng pha ở bảng tiến độ `goals/GOAL-RELEASE.md` dòng 38.

**TÓM TẮT:** Biên action riêng của hệ thống. **Cổng:** action `exposure:'internal'` chỉ vào được Executor qua `SystemCapability` niêm phong (WeakMap) do `runSystemAction` cấp sau verifier của nguồn — kiểm trước prepare; route / Trợ lý / Builder / discovery / grant cũ không thấy internal (403). **Trigger:** tất định theo (loại nguồn, nguồn bền, action, op, mục tiêu, thế hệ domain, mốc) → `idempotencyKey system:<id>`; verifier đọc lại nguồn đã lưu (thế hệ đổi → 409, mất nguồn → 404, input đúc lại → 409). **Biên nhận:** `system_action_receipt` ghi cùng transaction handler + action_log + outbox; quét keyset ID-only ≤ 200/trang, `settled()` bỏ trigger đã xong. **Họ action:** quote / invoice / package / appointment / contract / ticket / channel / kb / approval / order import / inbox agent. **Tiền nhiệm** 036 / 038 / 039 / 042b thành internal, giữ khoá chống lặp của domain (`domainVerifier`, DC-427). **Adapter v2** (action-mode, 003b) cho 6 consumer: sales.payment-packages, sales.bank-ingest, support, crm.lead-routing, loyalty.orders, loyalty.payments; `sales.quote-owner` retired.

**FILES CHANGED:** theo manifest `tips/manifests/TIP-003c-files.md`; lệch DV-100. Chính:
- `packages/actions/src/system/{common,sales,booking,support,channels,kb,ai,inbox}.ts`; tiền nhiệm `loyalty*.ts`, `insights*.ts`, `billing-lifecycle.ts`, `lead-routing.ts` → `exposure:'internal'`.
- `packages/db/prisma/tenant/*.prisma` + migration `20261111010000` / `20261111020000` (db:generate + migrate-tenants + db:setup).
- `packages/core/src/kernel/actions/system/{capability,admission,schedule,domain,event-adapter,trigger-id,index}.ts`; `executor.ts` (admitInternal).
- `packages/core/src/{sales,sales/orders,booking,contracts,support,channels}/system/*`, `ai/{kb,approvals,reply}/system/*`; job / consumer cũ gọi qua `runSystemAction` / `runTrigger`.
- `apps/worker/src/event-protocol.manifest.ts` (6 `active`, quote-owner `retired`).

**TEST RESULTS** (phạm vi TIP, D59 + luật goal: không full integration / full E2E):
- Unit: core **951** (+1 skip) gồm system-sales 6, system-booking-support 5, system-contract-billing 4, system-channel-ai 10, lead-routing; actions **26**.
- Integration API (Postgres + Memurai thật): `system-actions-scope`, `system-actions-replay`, domain sales / booking / contracts / support / kb / billing / loyalty / insights / channels / agents; lượt hồi quy cuối 170/171 — đỏ duy nhất openapi AC4 (226 > 175 route, có từ trước — xem dưới). Sau adapter payment-packages: commerce-packages / customer-packages / payments / booking **41/41**.
- Worker: `event-protocol-composition` **2/2** (manifest phủ đúng consumer đăng ký; blocker còn lại chủ 003c / 006b).
- E2E mock: agents + platform-admin **8 passed** (`E2E_PORT=3537`). Không đổi UI → không parity.
- Lint + typecheck actions / core / api / worker sạch; depcheck **116** = baseline; lint:size / lint:tokens / lint:masks / i18n:check sạch.

**ĐỎ CÓ TỪ TRƯỚC** (đã kiểm bằng cách stash thay đổi 003c — vẫn đỏ): openapi AC4 226 > 175; channel-avatars 5 ca; agent-reply LOOP_GUARD; worker `roles.test` exit 134; billing-lifecycle AC10 `setFaultHook`; insights-dashboard 2 ca; safe-fetch / assistant-input-parsing flaky khi tải nặng (chạy riêng xanh).

**ISSUES DISCOVERED:**
1. `inbox.system_agent_transition` thiếu TIP chủ → boot ai-role lỗi; thêm vào `tip-owners.ts`.
2. Nhiều app Nest một tiến trình → "Trùng system verifier"; `domainVerifier` cache theo (actor, loại nguồn).
3. `QuotesReadService` bắt buộc executor làm app không DB / Redis không boot (health.test) → executor tuỳ chọn.
4. Commit 82616c7f có unit lead-routing đỏ → sửa ở e4ed5fa6 (bài học: đọc output cổng trước commit).

**ĐỐI CHIẾU STANDARDS** (APPLICABLE STANDARDS của TIP):

| Standard | Tuân thủ (file / test) | Lệch |
|---|---|---|
| `actions/action-registry.md` | Mọi chuyển hệ thống là `defineAction` + `@ActionHandler` qua một Executor; internal không agentGrantable, preview 403; tip-owners | — |
| `domain/state-machine.md` | Handler khoá hàng + đọc lại vị từ hiện tại; thế hệ domain (valid_until / due_date / start_at / expires_at / aiEpoch) | — |
| `domain/concurrency.md` | Biên nhận unique cùng tx; khoá FOR UPDATE trước kiểm; trigger tất định → retry / song song hội tụ | — |
| `events/outbox.md` | Outbox cùng tx handler; consumer có thay đổi nghiệp vụ qua action (6 adapter v2) | 3 consumer chưa adapter v2 (DV-100 mục 6) |
| `database/tenant-db.md` · `indexing.md` | Bảng tenant không workspace_id; quét keyset `(mốc, id)` theo index partial, ID-only ≤ 200 | — |
| `authz/rbac-permissions.md` | Không mượn Owner; actor hệ thống có tên; capability gắn nguồn, không nâng quyền agent | — |
| `ops/observability-security.md` | Input chỉ id; staging trong tiến trình (không log / Redis), kết quả đăng nhập kênh mã hoá TTL 10 phút | Chưa mục privacy inventory cho biên nhận (DV-100 mục 5) |
| `code/file-size-module-layout.md` · `testing.md` | Mọi file ≤ 600; test ở file riêng | Bố cục `system/` không module riêng (DV-100 mục 2) |
| `workflow/git-flow-ci.md` | Nhánh `tip/003c-*`, PR #179 vào dev, xếp chồng #178 | — |

**GIẢ ĐỊNH ĐÃ CHỌN:**
- Action tiền nhiệm giữ biên nhận của domain, không thêm `system_action_receipt` (DC-427 a).
- Gọi lại sau crash không có bản staging → `no_effect revision_missing`; nguồn bền (event / poll) giao lại (DC-427 b).
- v1 và v2 dùng chung hàm trigger → cùng biên nhận; v2 chưa bật (DC-426).

**CHƯA NGHIỆM THU:** với provider thật Zalo / SePay / Brevo (chưa nghiệm thu với provider thật); bật v2 thật cho workspace (cần 006b + adapter còn lại).
