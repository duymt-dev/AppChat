### COMPLETION REPORT — TIP-042c

**STATUS:** DONE. PR (`tip/042c-record-scope`) xếp chồng trên #89 (TIP-042b) → #88 → #87 → #86 — merge theo thứ tự #86 → #87 → #88 → #89 → PR này. AC 8/8 (AC4 phần `ai:live` — xem "Chưa nghiệm thu").

**COMMIT:** SHA ghi ở bảng tiến độ `goals/GOAL-RELEASE.md` (commit code + commit chốt).

**MIGRATION** (tenant — workspace cũ / demo cần `pnpm --filter @appchat/db db:migrate-tenants`): `20261102004220_record_scopes` — `team_id uuid NULL` cho `quote`, `contract`, `order`, `invoice`, `appointment` (contact / conversation / ticket đã có); backfill CHỈ lineage rõ (khách / báo giá / lịch hẹn ← nhóm duy nhất của người phụ trách; bản sửa báo giá ← bản gốc; HĐ ← báo giá; đơn ← báo giá → HĐ; đề nghị ← đơn; hội thoại ← khách → nhóm duy nhất người được gán khi không khách); người 0 / nhiều nhóm → null. Index partial equality-first: `quote/contract/order/invoice_team_recent_idx (team_id, created_at DESC, id DESC)`, `appointment_team_start_idx (team_id, start_at)`, `conversation_team_recent_idx (team_id, last_message_at DESC, id DESC)`, `ticket_team_recent_idx`; `contact_collaborator_user_id_contact_id_idx` dựng lại `(user_id, contact_id) INCLUDE (role)` (cùng tên). Expand-only, không FK tới `team` (như các cột team_id sẵn có — không có team.delete).

**PHẦN ĐÃ LÀM:**
- **Bảng chân trị DC-299 / D32** (ghi trước khi sửa predicate):

  | Trường hợp | own | team | all | none |
  |---|---|---|---|---|
  | Bản ghi của mình (owner / assignee) | ✓ | ✓ | ✓ | ✗ (chặn trước mọi nhánh) |
  | Người khác, `team_id` ∈ nhóm mình | ✗ | ✓ | ✓ | ✗ |
  | Người khác cùng nhóm nhưng bản ghi `team_id` nhóm khác (owner nhiều nhóm) | ✗ | ✗ (không suy từ thành viên) | ✓ | ✗ |
  | `team_id` null (mơ hồ) | chỉ owner / quan hệ | chỉ owner / quan hệ | ✓ | ✗ |
  | Owner đổi nhóm sau khi tạo | theo `team_id` đã chụp | theo `team_id` đã chụp | ✓ | ✗ |
  | Khách mình là collaborator | đọc + ghi | đọc + ghi | ✓ | ✗ |
  | Khách mình là watcher | **chỉ đọc** | **chỉ đọc** | ✓ (ghi theo scope all) | ✗ |
  | Hội thoại nhóm (không khách) | người được gán | + `team_id` | ✓ | ✗ |
  | Ticket | assignee / người tạo — **không** theo quan hệ khách | + `team_id` | ✓ | ✗ |
  | Owner workspace (resolver) | luôn all | | | |

- **`authz/data-access/`** — `access-mode` (read / write; scope ghi không rộng hơn đọc), `contact-grants` (collaborator vs watcher, EXISTS theo chế độ), `record-policy` (`decide` / `allows` / `guardRecord`: 404 khi không đọc được, 403 `SCOPE_FORBIDDEN` khi đọc được mà không ghi được), `scope-sql` (`recordScopeSql` — cùng bảng chân trị; cột là hằng của repo), `team-snapshot` (nhóm nguồn → nhóm duy nhất).
- **`writeScope`** trong `AuthzContext` + preset `ROLE_DEFS.cs.writeScope` (crm `own` — Blueprint §3.5 "all (đọc) / own (sửa)"); resolver cache kèm writeScope, payload cũ thiếu → đọc lại DB; vai trò tuỳ biến = scope đọc; agent có người ra lệnh mang writeScope người đó.
- **Domain** (facade giữ tên cũ, thêm tham số `mode`): CRM `scopeSql` / `accessOf` (none trước owner) / `editableContact` (scope ghi + collaborator); inbox `convScopeSql` / `canAccessConversation` / `writableConversation` = policy GHI; báo giá / HĐ / đơn / đề nghị / lịch hẹn: list SQL + `visible*` đọc gồm watcher, `lock*` = GHI; ticket theo policy support. Mọi handler / preview / `prepare` của action ghi gọi mode `write` (static inventory: không còn guard đọc trong đường ghi — 36 điểm chuyển); `contact.transfer_owner` cần scope ghi; `inSalesScope` / `inBookingScope` nhận ref (owner, team, contact) + mode; lịch sử khách ở `/calendar/meta?appointment_id=` chỉ cho lịch đọc được (trước đây lộ lịch sử khách ngoài scope).
- **Team snapshot** — tạo khách / hội thoại (pipeline, email, gửi báo giá) / báo giá / bản sửa / HĐ (từ báo giá, gia hạn) / đơn (3 nguồn + lịch hẹn) / đơn sàn / đề nghị / lịch hẹn / ticket / chia lead (nhóm của rule); chuyển phụ trách đổi nhóm khách + hội thoại chuyển kèm, undo trả nhóm chỉ khi chưa ai đổi tiếp; chứng từ cũ giữ owner + nhóm (doanh số).
- **Realtime** — `require.record` (policy đọc chung) thay `require.scope` cho hội thoại / AI handoff / ticket; quan hệ khách tra DB lúc phát (`registerGrantLookup`, một truy vấn / envelope / node) → gỡ watcher có hiệu lực ở event kế tiếp; `conv.join` dùng cùng policy; payload event hội thoại / ticket thêm `team_id` (+ `created_by_user_id` ticket) — schema `EVENT_SCHEMAS` optional.

**FILES CHANGED:** theo manifest + DV-027 (caller thật ngoài manifest, fixture test, test cũ sửa theo DC-299).

**TEST RESULTS** (đầu cổng chốt đã chạy `db:test-reset`):
- Acceptance criteria: 8/8
  1. **AC1 scope nhất quán** — `record-scope.test.ts` (integration): list HTTP / detail HTTP / action đọc nguồn Trợ lý cùng tập id cho own / team (owner ở 2 nhóm, team_id null) / none (không thấy cả của mình) trên báo giá, HĐ, đơn, đề nghị, khách, hội thoại, lịch hẹn. Unit `record-scope.test.ts` (bảng chân trị decide = SQL). Cô lập tenant giữ ở `workspaces` / `hardening-cross-db` (chạy trong lượt hồi quy domain).
  2. **AC2 watcher đọc** — thêm watcher → thấy đúng bộ của khách đó; gỡ → request kế tiếp không thấy (integration + E2E http).
  3. **AC3 watcher không ghi** — `watcher-write-denial.test.ts`: 17 action ghi (gửi tin, lưu trữ, đánh dấu đọc, sửa khách, sửa / bình luận / gửi báo giá, sửa / gửi ký HĐ, sửa / xác nhận / huỷ đơn, ghi nhận tiền / huỷ / gửi QR đề nghị, huỷ / check-in lịch) → 403, preview Trợ lý 403, ảnh chụp DB + outbox + khoản thu không đổi; collaborator ghi được nhưng không chuyển phụ trách / xoá khách.
  4. **AC4 System / AI** — action đọc nguồn `assistant` cùng tập id với màn (AC1); preview Trợ lý của watcher 403; agent có người ra lệnh mang scope + writeScope người đó (unit). `ai:live` watcher: chưa chạy (DV-027 / Q-050).
  5. **AC5 team** — migration + backfill lineage (template + test DB), snapshot tạo mới / bản sửa / nguồn / chia lead / chuyển phụ trách + undo; owner doanh số không đổi.
  6. **AC6 đồng thời / đổi quyền** — hạ collaborator → watcher giữa chừng: ghi kế tiếp 403; preview cũ (confirm_token) sau khi hạ → 403; CSKH đọc khách người khác nhưng sửa 403.
  7. **AC7 realtime / HTTP** — `record-scope-realtime.test.ts`: phụ trách + watcher nhận, người ngoài không và `conv.join` SCOPE_FORBIDDEN; gỡ watcher → event kế tiếp không nhận; team theo team_id; none không nhận dù được gán; ticket không theo quan hệ khách. E2E http `record-scope.spec.ts`: Chủ sở hữu mua gói Team (webhook ngân hàng giả) → mời Sales → watcher thấy báo giá trong danh sách + drawer, tải lại vẫn đọc; sửa / bình luận / gửi / sửa khách → server 403; gỡ theo dõi → 404, danh sách không còn.
  8. **AC8 SQL** — EXPLAIN 5.000 báo giá / 20 nhóm (ANALYZE bằng chủ bảng): list team → `quote_team_recent_idx`, không Seq Scan; quan hệ khách → index `(user_id, contact_id) INCLUDE (role)`; scope là EXISTS / điều kiện trong bước id-first trước LIMIT (deferred join sẵn có), không lọc JS.
- Lệnh đã chạy:
  - Unit: core 85 file / 561 · shared 135 · db 21 · actions 12 · web 300; typecheck core / api / shared / web; lint core / api / web (0 lỗi).
  - Integration: 3 file mới 14 passed; hồi quy domain 18 file 189 passed (inbox, realtime, quotes, orders, payments, contracts, contract-appendix, booking, appointment-update, support, lead-routing, commerce-packages, loyalty, contact-memory, custom-roles, teams, hardening-owner, ai-tasks) + authz / crm-contacts 17 passed.
  - E2E http (cổng 4327 / 3428, api + worker build mới): `record-scope` + `quotes` + `customers` + `inbox` — passed (mobile skip theo spec).
  - `depcheck` 0 lỗi; `check:bundle` api / worker đạt; `lint:size` không file vượt trần. Không đổi UI → không chạy parity.
- Chưa nghiệm thu với provider thật: `pnpm ai:live` ca watcher (harness chỉ actor Owner — Q-050, TIP-044).

**ISSUES DISCOVERED:**
- `/calendar/meta?appointment_id=` trả lịch sử khách của lịch bất kỳ (không kiểm scope) — đã chặn bằng `visibleAppointment`.
- Handler ghi trước đây trả 403 cho bản ghi người gọi không được thấy (lộ tồn tại) — nay 404 (test inbox cũ sửa theo).

**ĐỐI CHIẾU STANDARDS** (mục APPLICABLE STANDARDS của TIP):

| Standard | Tuân thủ (file / test) | Lệch |
|---|---|---|
| `authz/rbac-permissions.md` | permission vẫn ở executor trước; scope đọc / ghi tách; none trước mọi nhánh; isOwner từ resolver; 404 / 403 không lộ dữ liệu — `record-policy.ts`, `record-scope*.test.ts` | — |
| `actions/action-registry.md` | Không thêm action; handler / preview / undo đi qua guard GHI | — |
| `api/response-envelope.md` | `NOT_FOUND` 404 / `SCOPE_FORBIDDEN` 403 `{scope}` | — |
| `database/tenant-db.md` + `indexing.md` | team_id nullable scalar, không workspace_id; index equality-first partial + INCLUDE; EXPLAIN integration; expand-only | Không FK tới `team` (thống nhất cột sẵn có) |
| `domain/concurrency.md` | Kiểm quyền trong transaction sau khoá dòng (`lock*`); undo trả nhóm theo CAS giá trị | — |
| `events/outbox.md` | Payload thêm `team_id` optional (schema) — consumer cũ không vỡ | — |
| `ops/observability-security.md` | Realtime tra quyền hiện tại lúc phát; không log dữ liệu khách | — |
| `ai/agent-gateway.md` | Agent / Trợ lý qua cùng service + Executor; writeScope theo người ra lệnh | ai:live chưa chạy (DV-027) |
| `domain/gap-filling.md` | DC-299 áp nguyên; giả định ghi dưới | — |
| `code/file-size-module-layout.md` + `testing.md` | data-access 5 file ≤ 80 dòng; facade ở file domain; test riêng | — |
| `workflow/git-flow-ci.md` | Nhánh `tip/042c-record-scope`, PR vào `dev`, xếp chồng #89 | — |
| `domain/custom-fields.md` | Không đụng field-level (045b) | — |

**GIẢ ĐỊNH ĐÃ CHỌN:** (1) Scope ghi preset chỉ CSKH khác scope đọc (crm `own`) — đúng ô Blueprint §3.5; các vai trò khác ghi = đọc. (2) Đơn sàn lấy nhóm của khách khi khách có người phụ trách. (3) Ticket không chọn nhóm → nhóm duy nhất của người được gán (giao AI → null). (4) Không FK `team_id → team` (không có xoá nhóm; giữ tenant-migrate trên DB cũ).

**Lệch spec:** DV-027. Không đổi D32 / tiền / Owner; không đổi tập permission; field-level giữ ở 045b.
