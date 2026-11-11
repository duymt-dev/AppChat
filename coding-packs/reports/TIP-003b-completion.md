### COMPLETION REPORT — TIP-003b

**STATUS:** DONE — một nhánh `tip/003b-event-protocol`, PR #178 (xếp chồng #177), 5 pha; SHA từng pha ở bảng tiến độ `goals/GOAL-RELEASE.md` dòng 37.

**TÓM TẮT:** Giao thức sự kiện kernel bền, có phiên bản. **Producer:** `writeOutbox` trong transaction đã đăng ký chỉ gom vào collector gắn đúng client transaction; flush DUY NHẤT cuối callback (sau action_log / idempotency / CAS undo) — đọc trạng thái giao thức FOR SHARE (rào cutover), v2 kiểm schema + aggregate + trần, cấp seq theo (kind, id) bằng một câu upsert đã sắp (không chu trình khoá), chèn outbox + event_dispatch; rollback kéo bộ đếm lùi cùng. Executor, Undo, 36 chủ transaction trực tiếp và 019b (run.store, usage-settlement) đăng ký. **Relay:** claim lô SKIP LOCKED + token / generation / lease DB, CAS published / failed (lỗi cũ không ghi đè thành công mới, attempts không phồng), v2 chỉ đánh thức id. **Dispatch:** head theo aggregate (chỉ seq = next_seq; sau → hoãn; trước → chỉ khi đã kết thúc), biên nhận theo registry_version BẤT BIẾN đã lưu, chế độ projection / handoff (hiệu ứng + biên nhận cùng transaction, fence kiểm đầu) và cổng action (digest input, 409 khi khác), `void` không là bằng chứng, thiếu adapter / sai version → chặn stream có lý do. **Sẵn sàng:** registry đóng băng sau Nest init, so manifest kỳ vọng độc lập của worker; chưa đạt → job v2 bị từ chối. **Cutover:** rào → sổ legacy → bật (epoch, registry theo digest). **Privacy:** event v2 của stream khách vào kiểm kê kernel; erase giữ id / seq, xoá thân, dispatch → privacy_suppressed. Mọi workspace vẫn ở **v1** (DC-426) — bật khi 003c / 006b có adapter.

**FILES CHANGED:** theo manifest `tips/manifests/TIP-003b-files.md`; lệch DV-099. Chính:
- `packages/shared/src/events/protocol/{metadata,aggregate,baseline,extensions}.ts`, `events.ts` + `index.ts` (facade).
- `packages/db/prisma/tenant/event-protocol.prisma`, `kernel.prisma` (cột envelope / relay), migration `20261111000000_event_protocol` (đã db:generate + migrate-tenants dev 15 / test 16 + db:setup).
- `packages/core/src/kernel/outbox/{collector,transaction,sequence,claim}.ts`, `outbox.ts`, `relay.ts`, `outbox.jobs.module.ts`; `kernel/events/protocol/{types,registry,readiness,start,dispatch-store,dispatch-head,dispatch-claim,dispatch-projection,dispatch-action-port,dispatch-recovery,cutover,diagnostics,v2-job}.ts`; `events.runner.ts`; `kernel/actions/{executor,undo.service}.ts`; `kernel/privacy/{inventory,cleanup,adapter}.ts`; 36 chủ transaction (danh sách trong commit pha 5).
- `apps/worker/src/{event-protocol.manifest,start-events}.ts`, `main.ts`.

**TEST RESULTS** (phạm vi TIP, D59 + luật goal: không full integration / full E2E):
- Unit: shared 182 (event-protocol 10); core 909 (+1 skip) gồm event-collector 8, event-dispatch-receipts 4, event-readiness 5.
- Integration API (Postgres + Memurai thật): `event-protocol-concurrency` 5/5 (A→B / B→A đồng thời không deadlock, seq liên tục; rollback không mồ côi / không lỗ; v2 ngoài transaction → EVENT_TRANSACTION_REQUIRED; EXPLAIN 100k event / 1000 aggregate lệch dùng `outbox_event_relay_due_idx` / `relay_claim_idx` / `event_dispatch_due_idx` / `claim_idx`, không Seq Scan); `event-protocol-recovery` 7/7 (fence relay, 8 lần → failed, head chờ event cũ lỗi + aggregate khác chạy, crash trong transaction hiệu ứng → không hiệu ứng, dispatch trùng ×3 → đúng một hiệu ứng, thiếu adapter → chặn, void → không completed, mất job Redis → đánh thức lại khoá mới); `event-protocol-cutover` 3/3.
- Hồi quy v1 (đường hiện hành): actions / relay-sequence / workspaces / inbox / quotes / support / kb / contracts / booking / billing / notify / privacy ×3 / bank-ingress / channel-session-fence / inbox-approval-cards / assistant-input-turn — xanh.
- **Chạy pha v2** (`EVENT_PROTOCOL_TEST_V2=1`): 12 bộ domain — không có EVENT_TRANSACTION_REQUIRED / schema / aggregate nào (mọi chủ transaction đã đăng ký, mọi payload hợp schema). 6 ca `inbox.test.ts` đỏ dưới v2 là ĐÚNG cổng: consumer v1 (notify / realtime / lead-routing…) không chạy dưới v2 khi chưa có adapter → thông báo / realtime / hội thoại tạo từ consumer không xuất hiện. Không phải lỗi 003b — là điều kiện bật (DC-426).
- Worker: `event-protocol-composition` 2/2 (WorkerModule.forRole('jobs') thật: đóng băng sau init, không sẵn sàng, blocker theo chủ 003c / 006b, manifest phủ đúng 31 consumer v1 đang đăng ký).
- Lint + typecheck shared / db / core / api / worker sạch; depcheck 116 = baseline; lint:size sạch. Không đổi UI → không parity / E2E.

**ISSUES DISCOVERED:**
1. 17 topic đang phát chưa khai schema (spec ghi 2) → baseline.ts (DV-099).
2. `sales.quote-owner` vẫn đăng ký (015d bỏ phần ghi, giữ drain + log) — manifest ghi đúng hiện trạng (`requires_adapter` → v2 sẽ là projection `no_effect`).
3. Heredoc Python đổi `\n` thành xuống dòng thật trong 2 file test — đã sửa.

**ĐỐI CHIẾU STANDARDS** (APPLICABLE STANDARDS của TIP):

| Standard | Tuân thủ (file / test) | Lệch |
|---|---|---|
| `events/outbox.md` | Outbox cùng transaction (collector flush cuối), relay drain + sweep + 8 lần 2^n, schema zod mỗi topic, consumer idempotent theo biên nhận (event_id, consumer), thứ tự theo entity (head) | Thứ tự theo entity chỉ hiệu lực ở v2 (DC-426) |
| `database/tenant-db.md` | Bảng tenant không workspace_id / RLS / FK xuyên DB; workspace lấy từ resolver, so với payload | — |
| `database/indexing.md` | Partial `(available_at, id) INCLUDE(topic, protocol_version)`, unique `(kind, id, seq) INCLUDE(id)`, dispatch `(phase, available_at, event_id) INCLUDE(registry_version)`, không INCLUDE JSON; EXPLAIN 100k | — |
| `domain/concurrency.md` | Khoá seq theo thứ tự sắp, không SQL domain sau khoá seq; claim token + generation + lease DB; CAS mọi ACK; head → dispatch → receipts → domain | — |
| `domain/state-machine.md` | Bốn máy trạng thái tách (relay / dispatch / head / receipt), không tự đặt lại failed / unknown | — |
| `actions/action-registry.md` | Executor đăng ký collector; cổng action không cấp quyền hệ thống (003c) | — |
| `ops/observability-security.md` | Wake job chỉ id; log id / lý do; metric `event_dispatch_total{outcome,reason}` nhãn hữu hạn; checkpoint không nội dung khách | — |
| `code/file-size-module-layout.md` · `testing.md` | Mọi file protocol ≤ 112 dòng; test ở file riêng (unit / integration / worker) | — |
| `workflow/git-flow-ci.md` | Nhánh `tip/003b-*`, PR #178 vào dev, xếp chồng #177 | — |

**GIẢ ĐỊNH ĐÃ CHỌN:**
- Pha `fenced` + FOR SHARE là "deployment admission barrier" của §5.5 (DV-099 mục 3).
- Ngoài transaction đã đăng ký ở v1 vẫn ghi thẳng (tương thích); v2 từ chối.
- `custom_field.changed` không có id entity → ý định độc lập như `notify.requested`.
- Đánh thức relay so `available_at` bằng đồng hồ ứng dụng (cùng đồng hồ producer), lease bằng đồng hồ DB.

**CHƯA NGHIỆM THU:** bật v2 thật cho workspace (cần adapter 003c / 006b + giấy phép triển khai); crash giữa cổng action và settle với ActionExecutor thật (003c nối); 045b platform handoff qua v2 (003c / 006b).
