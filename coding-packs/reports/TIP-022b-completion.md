### COMPLETION REPORT — TIP-022b

**STATUS:** DONE. PR (`tip/022b-agent-channel-behavior`) xếp chồng trên #90 (TIP-042c) → #89 → #88 → #87 → #86 → #85 → #84 — merge theo thứ tự đó rồi PR này. AC 9/10 + AC10 "chưa nghiệm thu với provider thật" (harness `ai:live` chỉ chạy lượt Trợ lý — Q-051).

**COMMIT:** SHA ghi ở bảng tiến độ `goals/GOAL-RELEASE.md` (commit code + commit chốt).

**MIGRATION** (tenant — workspace cũ / demo cần `pnpm --filter @appchat/db db:migrate-tenants`): `20261102002220_agent_channel_behavior` — `ai_agent.weekly_schedule jsonb NULL`; `conversation.intent_source jsonb NULL` + `handoff_summary jsonb NULL`; `message.purpose text NULL` + CHECK `message_purpose_chk` (`greeting`) + partial `message_greeting_idx (conversation_id) WHERE purpose = 'greeting'`; bảng `ai_turn_receipt` (PK `(conversation_id, source_message_id)`, FK hội thoại, CHECK binding_source / greeting_phase / answer_phase, partial `ai_turn_receipt_pending_idx`) và `ai_complaint_receipt` (PK `source_message_id`, CHECK kind / status, `ai_complaint_receipt_conversation_idx`). Expand-only.

**PHẦN ĐÃ LÀM:**
- **A — Lịch hoạt động.** `shared/ai/weekly-schedule.ts`: IANA timezone, 7 ngày (Thứ 2 = 0), ≤ 4 khung nửa mở `[from, to)`, qua đêm tách hai ngày (chỉ khi người dùng xác nhận), đánh giá theo thời điểm qua `Intl` (không thư viện ngày mới). `office` giữ 08:00–17:30 Asia/Ho_Chi_Minh (DC-136); `custom` cũ chưa có lịch → `needs_configuration`: hành vi đã xuất bản giữ nguyên, cảnh báo ở Builder, chặn xuất bản mới (quay lại phiên bản cũ được miễn). Giờ hiệu lực = lịch tài khoản ∩ lịch agent; ngoài giờ không gọi model, không gửi, không trừ credit → bàn giao `out_of_hours`; chạy tiếp sau duyệt kiểm lại giờ.
- **B — Phân luồng + lời chào.** Phân luồng từ khoá theo tài khoản (opt-in, ≤ 25 agent đã xuất bản, ưu tiên tường minh; khớp cả cụm sau fold; ưu tiên ↓ → khớp dài nhất → id); không khớp → agent mặc định → hàng chờ nhân viên; gán tay / chuyển agent giữ nguyên. Receipt lượt `ai_turn_receipt` lưu agent đã chọn + nguồn gán + pha chào / trả lời — retry / restart dùng lại cùng lựa chọn. Lời chào `greeting_enabled` (mặc định tắt cho cấu hình cũ) gửi một lần qua `message.send` (`ActionContext.outboundPurpose` ràng run + tin nguồn), không xoá FRT / chưa đọc / gợi ý / nháp; kết quả gửi chưa rõ không gửi lại.
- **C — Ý định + tóm tắt.** Bộ đóng `buy/question/complaint/booking/other` (alias chuẩn hoá, lạ → `other`), ghi CAS theo fence (run cũ không đè). Tóm tắt bàn giao có cấu trúc `conversation.handoff_summary` (trích xuất, không LLM — chạy cả khi hết credit / lỗi provider) trên mọi đường handoff; hành động ghi kết quả thật (ok / pending / denied / error); đọc qua `GET /conversations/:id/handoff-summary` chiếu theo quyền hiện tại của người xem (guard `visible*` của từng domain). Tệp đính kèm vào ngữ cảnh dạng metadata + `attachment_unreadable`.
- **D — Khiếu nại → ticket.** Outbox `ai.complaint_detected` → consumer `support.ai-complaint` (ROLE=jobs) kiểm lại grant `ticket.create` của phiên bản đã xuất bản → `ticket.create` qua Executor (actor agent). `ai_complaint_receipt` dùng chung giữa tool của model và consumer (nguồn suy từ `ai_run.input.source_message_id`; nguồn lạ → 403) → đúng một ticket; trùng ticket mở → `duplicate`, agent không dùng `on_duplicate` merge / create (422 cần người chọn). Thiếu grant → bàn giao `missing_ticket_grant`.
- **E — Mẫu rev 2 + gán.** Sales 25 tool, Booking 10 (`template-revisions.ts`); nâng chỉ mẫu dựng sẵn chưa sửa (CAS theo nội dung), mẫu đã sửa báo cáo + giữ nguyên; agent đã có không đổi. `GET /agents/channel-binding-preview` đọc agent đang gán thật; `binding_version` (băm agent_id + routing) → `channel.update_settings.expected_version` lệch → 409 giữ gán cũ. Prompt `agent-reply` v2 (vi / en, test parity registry).
- **FE.** Builder: `WeeklyScheduleEditor` (lịch tuần, lỗi theo luật chung server, cảnh báo cần cấu hình) + `BindingPreview`. Drawer Quản lý kênh: khối "Hành vi AI Agent" (`ChannelRoutingSettings` — lịch tài khoản, lời chào, phân luồng; lưu riêng + dirty / hoàn tác / chỉ đọc). Hộp thư: `HandoffSummaryPanel` (tải / lỗi + thử lại / rỗng) dưới thẻ "Cần người", `IntentBadge` ở đầu khung chat. Ô lịch dùng chung `shared/forms/WeeklyScheduleFields` + `useWeeklySchedule`. Mock: `channel-behavior.ts`, `inbox-handoff.ts`, agents `schedule_state` + chặn xuất bản `needs_configuration`.

**FILES CHANGED:** theo manifest + DV-028 (module tách ngoài manifest, mock / fixture test).

**TEST RESULTS** (đầu cổng chốt đã chạy `db:test-reset`):
- Acceptance criteria:
  1. **AC1 giờ** — `agent-schedules.test.ts` (FixedClock: khung tuần, qua đêm, DST múi khác, giao tài khoản ∩ agent, office cũ không đổi, custom cũ needs_configuration); worker `agent-channel-behavior.test.ts` ngoài giờ: 0 run model, 0 tin gửi, credit không đổi, bàn giao `out_of_hours`. ĐẠT.
  2. **AC2 phân luồng** — `agent-keyword-routing.test.ts` (3 ứng viên chồng cụm → thắng tất định, không khớp → mặc định / hàng chờ, tạm dừng / ngoài giờ bị loại, gán tay giữ); worker: tin trùng / restart dùng lại receipt lượt; tài khoản không cấu hình không nhận agent theo loại kênh. ĐẠT.
  3. **AC3 lời chào** — `agent-greeting.test.ts` + worker: đúng một tin chào xác nhận qua restart; crash sau commit chào vẫn ra câu trả lời / bàn giao từ cùng nguồn; lịch sử / nhóm / copilot / ngoài giờ = 0; kết quả chưa rõ không gửi lần hai. ĐẠT.
  4. **AC4 ý định + tóm tắt** — `agent-intent.test.ts` (enum, lạ → other, run cũ không đè), `agent-handoff-summary.test.ts` (mọi lý do bàn giao có tóm tắt, kể cả hết credit; không bịa hành động ok), `HandoffSummaryPanel.test.tsx`. ĐẠT.
  5. **AC5 ticket khiếu nại** — `complaint-ticket.test.ts`, api `agent-channel-config.test.ts` (sự kiện trùng + tool model chạy đua → 1 ticket; thu grant / sai nguồn / copilot / lịch sử → 0; trùng ticket mở cần người chọn), worker `complaint-ticket-recovery.test.ts` (ROLE=jobs thật, restart). ĐẠT.
  6. **AC6 báo giá / lịch hẹn qua agent** — mẫu rev 2 có đủ tool khai báo, agent đã xuất bản giữ nguyên grant (`agent-template-upgrade.test.ts`); đường đọc / ghi dùng cùng action Executor với Trợ lý (không thêm đường ghi). Hành vi ngôn ngữ (mơ hồ hỏi lại, "đang xem" ≠ chốt) kiểm bằng prompt + model thật → chưa nghiệm thu (AC10).
  7. **AC7 gán** — `agent-binding-preview.test.ts` + api: cảnh báo đọc agent gán thật; đổi gán đồng thời → 409; người chỉ có agents.manage không đổi gán; E2E mock: cảnh báo hiện đúng tài khoản + agent, xuất bản không đổi gán. ĐẠT.
  8. **AC8 UI** — E2E mock `agent-channel-behavior.spec.ts` 5 passed (desktop 1440 + mobile 390): lịch tuần lưu + xuất bản, lỗi chồng khung, khối Hành vi lưu / tải lại, tóm tắt + nhãn ý định, lỗi tải + Thử lại, không tràn ngang. E2E http `agent-channel-behavior.spec.ts` 1 passed: lịch agent lưu DB, widget → ý định "Muốn mua" từ worker, gặp nhân viên → tóm tắt bàn giao thật, drawer Zalo lưu lịch / lời chào / phân luồng và tải lại. ĐẠT.
  9. **AC9 native** — worker integration 6 file / 15 test (ROLE=ai / jobs thật, DB + Redis, restart) xanh; EXPLAIN: ứng viên tra theo id cấu hình (≤ 26 id, PK), receipt theo PK, tóm tắt một dòng hội thoại — không quét agent toàn tenant, không nạp log JSON không giới hạn. ĐẠT.
  10. **AC10 model thật 12 ca** — `fixtures/ai-eval/agent-channel-vertical.json` (12 ca, cổng 12/12 an toàn + ≥ 11/12 hành vi) — **chưa chạy**: harness `pnpm ai:live` chỉ chạy lượt Trợ lý, chưa có runner agent trực kênh (Q-051 → TIP-044). **Chưa nghiệm thu với provider thật.**
- Lệnh đã chạy:
  - Unit: core 9 file mới / 37 test + hồi quy core 561; ai 54 (gồm `prompts.test.ts`); web 98 file / 308 (gồm `WeeklyScheduleEditor.test.tsx` 5, `HandoffSummaryPanel.test.tsx` 3).
  - Typecheck + lint: core / shared / actions / ai / api / worker / db (14 task) + web — 0 lỗi.
  - Integration api: `agent-channel-config` 10; hồi quy agent-reply / agents-ui / hardening-takeover 31, support / inbox / webchat 74, agents / channels / channel-* / lead-routing 52 — xanh. Worker integration 6 file / 15 — xanh (dist build mới).
  - E2E mock: `agent-channel-behavior` 5 passed; hồi quy `agents` `inbox` `settings` `settings-routing` 32 passed.
  - E2E http (cổng 4327 / 3428, Redis DB 15, build api + worker mới): `agent-channel-behavior` 1 passed; hồi quy `agent-reply` `agents-ui` `agents` `channels` `settings-routing` `inbox` `webchat` — 8 passed; `inbox-live` đỏ **sẵn trên origin/dev** (kiểm ở worktree sạch 58592061, cùng dòng 78 — Q-052); `inbox` đỏ một lần do onboarding chậm khi chạy song song, chạy lại riêng xanh.
  - Parity (DC-360): `agent-channel-behavior:builder-hours` 1,16% · `agent-channel-behavior:handoff-summary` 0,64% · `inbox:handoff` 0,64% · `agents:builder` 1,16% · `settings:channels` 4,19% · `inbox:default` 4,70% (≤ trần 5,6%).
  - `i18n:check` 100% (vi / en 5.582 key) · `lint:size` không file vượt trần · `depcheck` 0 lỗi (sửa vòng `agent.store ↔ schedule-config`) · `check:bundle` api / worker đạt.
- Chưa nghiệm thu với provider thật: AC10 12 ca model thật (Q-051); Zalo thật (Q-003).

**ISSUES DISCOVERED:**
- Mock `channel.update_settings` ghi đè trường `undefined` (xoá tên tài khoản khi chỉ đổi agent) — sửa: bỏ trường rỗng như server.
- E2E http `inbox-live.spec.ts:78` đỏ sẵn từ TIP-045b D1 (người gửi khi auto → copilot) — spec chưa theo luật tiếp quản (Q-052, không thuộc phạm vi).

**ĐỐI CHIẾU STANDARDS** (mục APPLICABLE STANDARDS của TIP):

| Standard | Tuân thủ (file / test) | Lệch |
|---|---|---|
| `ai/agent-gateway.md` | Agent đi qua Executor + receipt; lượt có fence / epoch; ngoài giờ không gọi model; không cấp tool mới; ý định bộ đóng | — |
| `ai/rag.md` | Không đổi truy hồi; tệp đính kèm chỉ metadata + unreadable, không OCR | — |
| `ai/eval.md` | 12 ca + cổng khai ở fixture | Chưa chạy model thật (Q-051, DV-028) |
| `actions/action-registry.md` | `channel.update_settings` mở rộng patch + `expected_version`; không action mới, không đường ghi thứ hai | — |
| `events/outbox.md` | `ai.complaint_detected` qua outbox + schema `EVENT_SCHEMAS`; consumer idempotent theo receipt | — |
| `authz/rbac-permissions.md` | Đổi gán cần channels.manage; consumer kiểm lại grant hiện tại; tóm tắt chiếu theo quyền người xem | — |
| `domain/concurrency.md` | Receipt PK + ON CONFLICT / FOR UPDATE; CAS ý định theo fence; CAS nâng mẫu; 409 binding_version | — |
| `domain/state-machine.md` | greeting_phase / answer_phase CHECK; bàn giao nguyên tử (state + tóm tắt + receipt + outbox) | — |
| `domain/money-time-numbering.md` | Giờ theo IANA + `Intl`, khung nửa mở; không thư viện ngày mới | — |
| `domain/gap-filling.md` | Giả định ghi dưới | — |
| `database/tenant-db.md` + `indexing.md` | Không workspace_id; PK / partial index equality-first; tra ứng viên theo id; expand-only | — |
| `ui/interaction-patterns.md` + `frontend-structure.md` | Trạng thái tải / lỗi / thử lại / rỗng / dirty / chỉ đọc; màn chỉ orchestrator, khối tách component; token | — |
| `ui/prototype-parity.md` | Parity ≤ 5% (2 màn mới), PD-020 | Mức 1 — đề xuất |
| `i18n/i18n.md` | Mọi chuỗi vi + en (common / agents / settings / inbox); chữ server qua `serverMessages` | — |
| `code/testing.md` + `file-size-module-layout.md` | Test file riêng; reply.service tách module (agent-pick, turn-handoff, greeting…); mọi file ≤ trần | — |
| `workflow/git-flow-ci.md` | Nhánh `tip/022b-agent-channel-behavior`, PR vào `dev`, xếp chồng #90 | — |

**GIẢ ĐỊNH ĐÃ CHỌN:** (1) Lịch tài khoản `null` = không giới hạn (chỉ lịch agent áp). (2) Khung kết thúc `24:00` hiển thị 23:59 ở ô `time` của trình duyệt. (3) Tóm tắt bàn giao là trích xuất tất định (không gọi model) để có cả khi hết credit. (4) Ý định chỉ hiện khi khác `other`. (5) Cảnh báo gán chỉ hiện cho người có channels.manage (người khác không đổi gán được).

**Lệch spec:** DV-028, PD-020. Không đổi luật tiền / quyền; không thêm permission hay auto-grant cho agent.
