### COMPLETION REPORT — TIP-006b

**STATUS:** DONE — nhánh `tip/006b-event-delivery` (xếp chồng #179), 4 pha; SHA từng pha ở bảng tiến độ `goals/GOAL-RELEASE.md` dòng 39.

**TÓM TẮT:** Giao bền sau sự kiện. **Fanout niêm phong** (`kernel/events/fanout`): open → lease (token + thế hệ) → MỘT INSERT…SELECT (một snapshot) → niêm phong CAS; xử lý trang ≤ 100, mỗi mục khoá + settle trong tx hiệu ứng. **Tác vụ AI:** occurrence (event / lịch) + run + `task_dispatch_intent` (+ tiến `next_run_at`) một tx dưới khoá tác vụ; bận / tắt / thế hệ cũ → no_effect; run_now giữ 409; `ai_task.trigger_generation`; job `task-<run>-<gen>`, quét `recoverTasks` mọi workspace. **Thông báo:** `notification` + ý định mail + ý định realtime cùng tx; mail claim CAS → thẩm quyền HIỆN TẠI (workspace, thành viên, quyền, Owner, prefs, nguồn chưa xoá) → provider một lần; ≥ 400 thử lại ≤ 5, còn lại `unknown` không gửi lại; job chỉ (ws, id, thế hệ), job thô cũ bỏ; quét 10 phút. **Catalog:** nguồn + `ingest_seq` pending là ý định nạp; không đổi mà còn pending → đẩy lại; quét ROLE=ai. **v2:** hợp đồng notify / realtime (projection) + catalog-sync / ai-tasks (handoff) + hook `after`; manifest 4 consumer `active`. **Client:** realtime mang `rt_id`, web bỏ trùng. **Quên khách:** xoá event → chữ thông báo xoá (đọc chữ chung), mail chờ suppressed, realtime chờ failed.

**FILES CHANGED:** theo manifest `tips/manifests/TIP-006b-files.md`; lệch DV-101. Chính:
- `packages/db/prisma/tenant/event-delivery.prisma` + migration `20261111030000` / `040000` / `050000` / `060000`; nền tảng `20261111030000_delivery_membership_index` (db:generate + migrate-tenants 15 DB + db:setup).
- `packages/core/src/kernel/events/fanout/*`; `kernel/events/protocol/{types,dispatch-claim,readiness}.ts`; `kernel/privacy/cleanup.ts`.
- `packages/core/src/ai/tasks/{occurrence,event-admission,event-fanout,event-dispatch,dispatch-intent,recovery,task-scheduler,task.handlers,task.queue,task.jobs}.ts`; `ai/kb/ingest-recovery.ts`.
- `packages/core/src/notify/delivery/{types,store,source-guard,mail,realtime,selection,admission}.ts`; `notify/services/{notifier,notifications.service}.ts`; `notify/jobs/{notify-mail.processor,delivery-recovery,notify.jobs.module}.ts`.
- `packages/core/src/catalog/events/{catalog-handoff,catalog-sync}.ts`; `catalog/jobs/catalog.jobs.module.ts`.
- `apps/worker/src/event-protocol.manifest.ts`; `apps/web/src/shared/realtime/event-invalidation.ts`.

**TEST RESULTS** (phạm vi TIP, D59 + luật goal: không full integration / full E2E):
- Unit: core **956** (+1 skip) gồm task-event-fanout 4, notify-delivery 4; web realtime `event-delivery.test.ts` **3/3**.
- Integration API (Postgres 16 + Memurai thật): event-fanout, task-fanout, event-delivery (5, gồm Quên khách), catalog-handoff + hồi quy ai-runtime-lineage / ai-tasks / catalog / digest / event-protocol-{concurrency,cutover,recovery} / kb / notify / realtime / record-scope-realtime — **15 file, 91/91**.
- Worker: event-protocol-composition + ai-task-event-recovery **7/7**.
- E2E mock (`E2E_PORT=3537`): shell + settings-ops + inbox **20 passed**. E2E http: ai-tasks + products + kb-management **3 passed**. Không đổi màn → không parity.
- Build db / core / api / worker / web sạch; lint + typecheck core / api / worker / web sạch (web 22 cảnh báo có từ trước, 0 lỗi); depcheck **116** = baseline; lint:size / lint:tokens / lint:masks / i18n:check sạch.

**ISSUES DISCOVERED:**
1. Test unit cũ `ai-task-event-dispatch.test.ts` gắn với SQL lấy 100 tác vụ đầu → xoá, thay `task-event-fanout.test.ts`.
2. Vòng import catalog-handoff ↔ catalog-sync (depcheck lỗi) → chuyển consumer v1 sang `catalog-handoff.ts`.
3. Đồng hồ JS và `now()` của DB lệch trong test claim hết hạn → test đặt `claim_until` theo đồng hồ ứng dụng.

**ĐỐI CHIẾU STANDARDS** (APPLICABLE STANDARDS của TIP):

| Standard | Tuân thủ (file / test) | Lệch |
|---|---|---|
| `events/outbox.md` | Hiệu ứng consumer + ý định cùng biên nhận / tx; khoá tất định (notification id, fanout unique, occurrence key); hợp đồng v2 4 consumer | Còn consumer `requires_adapter` (DV-101 mục 5) |
| `domain/concurrency.md` | Claim CAS theo thế hệ; khoá mục → khoá tác vụ FOR UPDATE; race hai sweeper / thủ công vs event có test | — |
| `domain/state-machine.md` | Pha ý định đóng (pending → dispatching → accepted / suppressed / unknown / failed); không hồi `unknown` | — |
| `database/tenant-db.md` · `indexing.md` | Bảng tenant không workspace_id; index partial bằng trước / phạm vi sau + INCLUDE; quét keyset ≤ 200; EXPLAIN Index Only Scan `ai_task_event_select_idx` | — |
| `authz/rbac-permissions.md` | Thẩm quyền hiện tại ngay trước gửi; Owner biểu tượng ràng lúc gửi; không tin snapshot địa chỉ | — |
| `ops/observability-security.md` | Job chỉ id + thế hệ; safe_code không nội dung; Quên khách xoá chữ + chặn gửi | Metric 045b chưa nối (DV-101 mục 7) |
| `api/response-envelope.md` · `i18n/i18n.md` | run_now 409; chữ chung theo locale người xem | — |
| `code/file-size-module-layout.md` · `testing.md` | Mọi file ≤ 600; test ở file riêng | Bố cục khác manifest (DV-101 mục 2) |
| `workflow/git-flow-ci.md` | Nhánh `tip/006b-*`, PR vào dev, xếp chồng #179 | — |

**GIẢ ĐỊNH ĐÃ CHỌN:**
- Mail chỉ thử lại khi provider từ chối rõ (`MailSendError` ≥ 400); mọi lỗi khác coi là có thể đã tới provider → `unknown` (DC-428 b).
- Quên khách giữ id thông báo + dòng ý định làm khoá chống trùng, xoá chữ (DC-428 d).
- Realtime dedupe ở client theo id ý định, bộ nhớ có giới hạn; thứ tự lệch vô hại vì client chỉ invalidate.

**CHƯA NGHIỆM THU:** với provider thật Brevo / SMTP (chưa nghiệm thu với provider thật); bật v2 thật cho workspace (chờ adapter còn lại).
