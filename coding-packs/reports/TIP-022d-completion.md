# Báo cáo hoàn thành TIP-022d — Chặn gửi quá cap Zalo cá nhân (200 tin chủ động / ngày)

**TIP:** `022d` · **Nhánh:** `tip/022d-zalo-proactive-cap` (`wt1` `D:/CODING/AppChat-Agy`) · **Nền rebase:** `origin/dev` `79b8c351` (PR #231 `TIP-003e`) · **Commit code:** *(cập nhật sau PR)* · **PR:** *(cập nhật sau `gh pr create --base dev`)* · **Ngày:** 2026-11-15  
**Trạng thái nghiệm thu provider thật:** **chưa nghiệm thu với provider thật** (`Q-003` — Zalo cá nhân chạy với transport giả `ZALO_TRANSPORT=fake` / mock transport).

---

## 1. Rà trước khi làm (code thật trước khi sửa)

1. **`packages/channels/src/zalo-personal/manifest.ts`:** Đã có khung `manifest`, cần chốt `perDayProactive: 200` và `jitterMs: [2000, 6000]` cho kênh `zalo_personal`.
2. **`packages/core/src/channels/services/accounts.service.ts`:** Chưa có `ZALO_PROACTIVE_CAP` / `checkProactiveCap` kiểm biên `50..500` (`422 { daily_cap: 'out_of_range' }`) và cảnh báo khi cấu hình `daily_cap > 200`. `packages/actions/src/settings-apps.ts` (`channelUpdateSettings.output`) chưa có `warnings`.
3. **`packages/core/src/channels/jobs/send.processor.ts` & `proactive-cap.ts`:** Hiện chỉ kiểm đếm trên Redis SET; nếu Redis mất / flush hoặc `ECONNREFUSED` sẽ hụt đếm cap, chưa có bảng DB dự phòng dùng chung với chiến dịch `cr_*`, chưa miễn trừ trả lời khách trong `24h`, và chưa có trạng thái hoãn `deferred_cap` để dời qua `00:00` ngày mới theo múi giờ workspace (dùng `DelayedError` của BullMQ và `sweepOutbox` quét lại).
4. **Prisma tenant (`channels.prisma`, `inbox.prisma`):** Chưa có bảng `channel_proactive_slot(channel_account_id, day, ref_id)` và chưa có giá trị enum `deferred_cap` cho `outbox_message` / `message` (`inbox/services/outbound.ts`, `view.ts`, `inbound.processor.ts`).

---

## 2. Giả định đã chọn

- **`DC-703` (mới, dải `7xx`):**
  1. Bảng dự phòng tenant `channel_proactive_slot(channel_account_id, day, ref_id)` khoá giao dịch bằng `pg_advisory_xact_lock(hashtext('chcap'), hashtext(account:day))`, tính ngày `YYYY-MM-DD` qua `utcToWall`/`wallToUtc` theo múi giờ workspace (fallback `Asia/Ho_Chi_Minh`, cache 60s ở `channels.jobs.module.ts`), đồng bộ Redis SET `chcap:<account>:<day>` — mất/flush Redis hay `ECONNREFUSED` vẫn đếm và chốt đúng từ Postgres, dùng chung một sổ giữa Inbox và chiến dịch `cr_*`.
  2. `isProactiveSend` kiểm tin khách nhắn (`direction='in'`) gần nhất trong `24h` (`now - 24h`) theo `outboxMessage→message` hoặc `(channelAccountId, externalThreadId)`: có → miễn cap; quá `24h` / mở mới / `proactive:true` → trừ 1 suất.
  3. Hết trần: giữ `SendOutcome` (`partial`/`unknown`), ghi `deferred_cap` trên `outbox_message` (`next_attempt_at = 00:00` ngày mới múi giờ workspace) + `message`, dời job BullMQ qua `DelayedError`; `sweepOutbox` quét cả `['pending', 'deferred_cap']`.
  4. `checkProactiveCap` trong `accounts.service.ts`: `zalo_personal` cho phép `50–500` (`422 { daily_cap: 'out_of_range' }`), `daily_cap > 200` trả `warnings: ['daily_cap_over_default:200']` ở cả preview (`channel-manage.handlers.preview.ts`) và execute (`channel-manage.handlers.ts`).
- **`DV-703` (lệch manifest `tips/manifests/TIP-022d-files.md`):** Giữ nguyên 4 file manifest (3 M đã sửa + 1 C `packages/core/test/zalo-cap.test.ts`) và sửa/thêm 13 file ngoài manifest để đủ schema, action `warnings`, timezone workspace, `proactive-cap`, `inbox` trạng thái `deferred_cap`, `channels.test.ts` AC11 (tổng 17 file code/schema/test, không sửa file manifest theo `DV-122/125/701/702`).
- **Tích hợp provider thật (`Q-003`):** Chưa nghiệm thu với provider Zalo cá nhân thật; mọi test unit / integration / E2E chạy qua transport giả / fake Redis & Postgres thật.

---

## 3. Đối chiếu standards

| Standard / Nguồn | Trạng thái | Bằng chứng tuân thủ ở code / test hoặc mã lệch (`DV`) |
| --- | --- | --- |
| `channels/omnichannel-adapter.md` | Tuân thủ | `packages/channels/src/zalo-personal/manifest.ts` (`perDayProactive: 200`, `jitterMs: [2000, 6000]`); transport giả cho test (`Q-003` chưa nghiệm thu provider thật). |
| `integrations/provider-ports.md` | Tuân thủ | Không gọi trực tiếp provider thật; giữ adapter qua transport/manifest trừu tượng. |
| `events/outbox.md` | Tuân thủ | `packages/core/src/channels/services/send-queue.ts` (`sweepOutbox` quét `['pending', 'deferred_cap']`), `send.processor.ts` cập nhật `outbox_message` (`deferred_cap`, `next_attempt_at`) & dời job qua `DelayedError`. |
| `domain/concurrency.md` | Tuân thủ | `packages/core/src/channels/services/proactive-cap.ts` khoá tuần tự `pg_advisory_xact_lock` trong transaction Postgres trên bảng `channel_proactive_slot`; `zalo-cap.test.ts` & `proactive-cap.test.ts` kiểm giữ trần khi Redis flush/ECONNREFUSED. |
| `domain/money-time-numbering.md` | Tuân thủ | `proactive-cap.ts` & `channels.jobs.module.ts` dùng Clock + `utcToWall`/`wallToUtc` theo múi giờ workspace (fallback `Asia/Ho_Chi_Minh`) tính mốc `00:00` ngày mới, không dùng `new Date()`/`Date.now()`. |
| `domain/validation-defaults.md` & `actions/action-registry.md` | Tuân thủ (`DC-703`, `DV-703`) | `packages/core/src/channels/services/accounts.service.ts` kiểm `50..500` (`422 daily_cap: out_of_range`); `packages/actions/src/settings-apps.ts`, `channel-manage.handlers.ts`, `channel-manage.handlers.preview.ts` trả `warnings: ['daily_cap_over_default:200']`. |
| `database/tenant-db.md` & `database/indexing.md` | Tuân thủ (`DV-703`) | `packages/db/prisma/tenant/channels.prisma` (`ChannelProactiveSlot`), `inbox.prisma` (`deferred_cap`), migration `20261115005000_022d_zalo_proactive_cap/migration.sql`; kiểm `EXPLAIN (COSTS OFF)` dùng `channel_proactive_slot_pkey` & `outbox_message_status_next_attempt_at_idx`. |
| `code/testing.md` & `domain/gap-filling.md` | Tuân thủ | Ghi nhận `DC-703` & `DV-703`; test unit (`zalo-cap.test.ts` 4, `proactive-cap.test.ts` 4, `@appchat/channels` 88) + integration (`channels.test.ts` AC11, `channel.update_settings.action.test.ts`). |
| Blueprint §6 + §8 (`BP-5.4-b`) | Đạt (với transport giả) | `tools/obligations/parts/part-blueprint.md` (`BP-5.4-b`) → `ĐẠT` (`merge.py` `gaps 0`). |

---

## 4. Phạm vi triển khai & kết quả test (sau rebase cuối cùng)

### File đã chạm (17 file code/schema/test + sổ/report)
- **4 file manifest:** `packages/channels/src/zalo-personal/manifest.ts`, `packages/core/src/channels/services/accounts.service.ts`, `packages/core/src/channels/jobs/send.processor.ts`, `packages/core/test/zalo-cap.test.ts`.
- **13 file ngoài manifest (`DV-703`):**
  - `packages/db/prisma/tenant/{channels.prisma, inbox.prisma, migrations/20261115005000_022d_zalo_proactive_cap/migration.sql}`
  - `packages/actions/src/settings-apps.ts`
  - `packages/core/src/channels/{actions/channel-manage.handlers.ts, actions/previews/channel-manage.handlers.preview.ts, services/proactive-cap.ts, services/send-queue.ts, jobs/channels.jobs.module.ts}`
  - `packages/core/src/inbox/{services/outbound.ts, services/view.ts, jobs/inbound.processor.ts}`
  - `apps/api/test/integration/channels.test.ts`
- **Tài liệu / sổ / kiểm tra nghĩa vụ:** `coding-packs/DECISIONS.md` (`DC-703`), `coding-packs/DEVIATIONS.md` (`DV-703`), `coding-packs/tips/TIP-022d-zalo-proactive-cap.md` (BUILDER-CHECKLIST ticked `[x]`), `coding-packs/goals/GOAL-RELEASE.md` (dòng 76 `DONE`), `coding-packs/HANDOFF-NEXT.md`, `tools/obligations/parts/part-blueprint.md` (`BP-5.4-b`), `coding-packs/COVERAGE.md`, `coding-packs/reports/TIP-022d-completion.md`.

### Kết quả kiểm tra (sau rebase lên `origin/dev` `79b8c351`)
- **Migration & DB trên `wt1`:** `pnpm --filter @appchat/db run db:generate` PASS; `db:migrate-tenants` & `db:migrate-tenants -- --test` (`platform +0 · tenant 20261115005000_022d_zalo_proactive_cap: 1 DB xong, 0 lỗi`); `db:setup` PASS (`+1 migration` trên `appchat_tenant_template_wt1`); `db:test-reset` PASS.
- **Static checks (D59):** `pnpm lint:size` (`4707 file, không file nào vượt trần`), `pnpm lint:tokens` (`1138 file, đúng thang D41`), `pnpm lint:masks` (`57 mask, 44 PD trong sổ, đều có căn cứ`), `pnpm i18n:check` (`en: 7416 key, phủ 100.0%`, `vi: 7416 key, phủ 100.0%`), `pnpm depcheck` (`4633 modules, 19498 dependencies cruised, no dependency violations`), `python -X utf8 tools/obligations/manifests.py --order` (`cạnh thứ tự: 3209; vấn đề: 7 (đều là cặp có sẵn trên dev); vòng: 0`).
- **COVERAGE:** `python -X utf8 tools/obligations/merge.py` → `rows 1806 {'ĐẠT': 1290, 'CHỜ-TK': 58, 'MỘT PHẦN': 75, 'CHƯA': 263, 'NGOÀI': 36, 'KHÔNG LÀM': 2, 'QUY-TẮC': 69, 'GIẢ': 13} gaps 0 {}`.
- **Lint / Typecheck / Unit / Build (sau rebase):**
  - `pnpm turbo run lint typecheck test build --filter=@appchat/db --filter=@appchat/channels --filter=@appchat/actions --filter=@appchat/core --concurrency=2` → `Tasks: 12 successful, 12 total`:
    - `@appchat/db`: 6 files, `35 passed`
    - `@appchat/channels`: 13 files, `88 passed`
    - `@appchat/actions`: 14 files, `53 passed` (`examples.test.ts` 3/3, `system-actions.test.ts` 3/3)
    - `@appchat/core`: `zalo-cap.test.ts` `4/4`, `proactive-cap.test.ts` `4/4`, `assistant-coverage.test.ts` `7/7`; tổng `209 passed | 1 skipped` (`assistant-discovery-recall.live.test.ts`), `1348 passed | 1 skipped`
  - `pnpm turbo run lint typecheck build --filter=@appchat/api` → `Tasks: 3 successful, 3 total`.
- **Integration (tuần tự trên Postgres 16 + Memurai 6381 sau `db:test-reset`):**
  - `test/integration/channels.test.ts`: `9 passed (9)` (gồm AC11 TIP-022d: cap `50–500` + cảnh báo `> 200`, mất Redis đếm bảng dự phòng, vượt cap → `deferred_cap`, reply `24h` miễn cap)
  - `test/integration/actions/channel.update_settings.action.test.ts`: `3 passed (3)`
  - `test/integration/inbox.test.ts`: `14 passed (14)`
  - `test/integration/marketing-concurrency.test.ts`: `8 passed (8)` (kể cả trần chủ động `cr_*` chung tài khoản: tin 2 dời sang hôm sau)
  - `test/integration/system-actions-scope.test.ts`: `3 passed (3)`
- **EXPLAIN Postgres (`appchat_tenant_template_wt1`, `enable_seqscan = off`):** dùng `Index Only Scan using channel_proactive_slot_pkey`, `Index Scan using outbox_message_status_next_attempt_at_idx`, `Index Scan using message_conversation_id_created_at_id_idx`.
- **E2E (`@appchat/web`):**
  - Mock (`inbox`, đã chạy cùng mã TIP-022d không đổi UI): `11 passed, 9 skipped (38.3s)`.
  - HTTP (`pnpm e2e:http e2e/http/channels.spec.ts --workers=1`, sau rebase): `1 passed, 1 skipped (1.7m)`.
- **Parity (`http://localhost:5100`, không đổi UI trong TIP-022d):**
  - `pnpm parity settings:channels` → `PASS  settings:channels                  0.0419`.
  - `pnpm parity --done` → `103/109` xanh (`settings:channels 0.0419`, `inbox:connect-channel 0.0089`, `inbox:account-switch 0.0107`, `inbox:handoff 0.0277`, `settings:integrations 0.0007`, `settings:integrations-connect 0.0207` đều PASS; 6 ca FAIL ngoài phạm vi TIP-022d đều đỏ sẵn trên nền `dev`: `inbox:default 0.0814`, `inbox:folder-rail 0.0647`, `inbox:conv-menu 0.0669`, `inbox:chat-menu 0.0739`, `customers:360 0.1287`, `calendar:create size mismatch 540x810 vs 540x779`).
