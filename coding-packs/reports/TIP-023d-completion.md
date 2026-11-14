### COMPLETION REPORT — TIP-023d

**STATUS:** DONE — 9 pha, mỗi pha một PR (pha 1–3 #171 đã merge; pha 4 #187 · 5 #188 · 6 #189 · 7 #190 · 8 #191 · pha 9 chốt `tip/023d-p9-close` xếp chồng #191). SHA ở bảng tiến độ `goals/GOAL-RELEASE.md` dòng 34.

**TÓM TẮT:** Kế hoạch Cowork thành dữ liệu thật thay cho lời model tự kể:
- **Hợp đồng + bảng (pha 1–3, §1, §5.2):**
  - `assistant_plan` / `_step` / `_attempt` / `_primary_claim` / `_checkpoint` / `_reuse_candidate`, có revision + plan_epoch.
  - `assistant.plan_propose` / `plan_get` / `plan_reusable` / `agent_choices` (keyset).
  - Tool `plan` là alias mỏng qua Executor (preview / xác nhận như mọi action ghi). `update_step` chỉ đọc tiến độ thật.
- **Ràng buộc thực thi (pha 4, §2.1–2.3):**
  - Port kernel `ExecutionBindingPort` (kernel không import AI).
  - `decideStep` gắn lời gọi ghi với bước hiện hành; claim (plan, bước, thế hệ) đúng một lần cùng transaction với action_log.
  - Cùng digest → biên nhận cũ; khác digest → 409; ghi ngoài kế hoạch → `PLAN_UNDECLARED`. Việc nền = `waiting_external`, không đếm xong.
- **Dừng – sửa – tiếp (pha 5, §3):**
  - Cổng `planGate` trước mỗi lời gọi model / tool → checkpoint giữa batch: kết quả giữ nguyên, lời gọi còn lại `PLAN_SUPERSEDED` đúng một lần.
  - Run gốc ở `waiting_operation` lý do `plan_edit`.
  - `plan_request_edit` / `plan_update` (chỉ bước chưa chạy) / `plan_resume` chạy tiếp cùng run, cùng bộ đếm, không phát lại hiệu ứng.
- **Tái dùng (pha 6, §4):**
  - Ứng viên chỉ chứa cấu trúc chung (action id + nhãn registry, không chữ riêng / id / giá trị).
  - Gợi ý tất định; `plan_reuse` tạo bản nháp; `plan_draft` gắn lượt đúng một lần.
- **Agent đã chọn (pha 7, §5):**
  - Ghim `{id, version, tier}` vào `ai_run.input`.
  - Run gốc: đọc = quyền agent ∩ quyền người dùng; ghi → `SELECTED_AGENT_ONLY`.
  - Một run con mỗi (gốc, epoch). Run con claim bước qua cùng cổng.
- **UI (pha 8, §6):**
  - `PlanCard` (bản / pha / tiến độ thật / từng bước; Sửa → chờ xả → Sửa các bước → Lưu → Tiếp tục; Dừng = run.cancel), `PlanEditor`, `ReusePlans`, `SelectedAgentPicker` (theo UUID).
  - `GET /assistant/sessions/:id/plan`.
- **Chốt (pha 9, §2.5 + ai:live):**
  - Lượt kết thúc khi kế hoạch còn bước → run gốc `waiting_operation` lý do `plan_next` (không `completed`); DTO có `awaiting_continue`.
  - Nút "Làm bước kế tiếp" gọi `plan_resume` → job theo checkpoint chạy tiếp đúng một lần (DC-440).
  - `plan_propose` kiểm bước ngay ở preview.
  - Suite ai:live `assistant-plans` 8 ca.

**FILES CHANGED:** theo manifest `tips/manifests/TIP-023d-files.md`; lệch ghi ở DV-108. Chính:
- `packages/db/prisma/tenant/assistant-plans.prisma` + migration `20261110010000_assistant_plans`, `20261110020000_assistant_agent_choices`, `20261111120000_assistant_plan_binding`.
- `packages/shared/src/{assistant/plan,api/assistant-plans}.ts`; `packages/actions/src/{assistant-plans,define,reads/ai}.ts`.
- `packages/core/src/kernel/actions/{execution-binding,preview-binding,executor,action-context}.ts`.
- `packages/core/src/ai/assistant/plans/*` (21 file).
- `assistant/{meta-tools,turn.service,delegate,assistant.service,assistant-prompt}.ts`, `agents/{agent.runtime,current-authority}.ts`, `runs/runner.ts`, `approvals/resume.ts`, `jobs/assistant-turn.processor.ts`, `genui/turn-request.consumer.ts`.
- `packages/ai/src/gateway/{plan-checkpoint,engine,types}.ts`, `testing/mock-model.ts`.
- API `assistant.controller.ts`.
- Web:
  - `features/assistant/plans/*` (types / api / styles / hooks / 5 component);
  - `ChatThread`, `CoworkScreen`, composer / popovers / `WelcomeView`, store, `useAssistantChat`, `shared/assistant/{assistant-client,turn-stream}.ts`;
  - mock `domains/assistant-plans.ts`;
  - i18n `assistant.plan.*` vi + en.
- Test:
  - core `assistant-plans`, `assistant-plan-progress`, `assistant-plan-reuse`, `assistant-selected-agent`;
  - integration `assistant-plans`, `assistant-plan-pause`, `assistant-plan-reuse`, `assistant-selected-agent`, `assistant-agent-choices` + 8 `actions/assistant.plan_*` / `agent_choices`;
  - mock `assistant-plans.test.ts`;
  - E2E `assistant-plans.spec.ts` (mock) + `http/assistant-plans.spec.ts`.
- ai:live: `fixtures/ai-eval/assistant-plans{.json,-seed.mjs}`, `tools/ai-live/src/{plans-judge,cases,runner,cli}.ts`.
- Parity: `tools/parity/modules/assistant-plans.ts`.

**TEST RESULTS** (phạm vi TIP, D59 + luật goal — không full integration / full E2E):

| Phạm vi | Kết quả |
|---|---|
| Unit core | 1099 (+1 skip) — plan-progress 10 (gồm `planHoldOf`) |
| Unit shared / actions / ai / ai-live / web | 182 / 31 / 97 / 87 / 497 |
| Integration API (Postgres 16 + Memurai thật) | assistant-plans + assistant-plan-reuse + assistant-selected-agent + assistant + assistant-agent-choices = 27/27; assistant-plan-pause 3/3 sau pha 9 (gồm §2.5: plan_next → bước kế đúng một lần → completed) |
| E2E mock assistant + assistant-plans (`E2E_PORT=3537`) | 11 passed (7 skipped desktop/mobile sẵn) — chạy lại sau pha 9 |
| E2E http assistant-plans (`E2E_HTTP_PORT=3538`, `TENANT_CLIENT_CACHE=8`) | 1 passed (1 skipped mobile) — lập kế hoạch → xác nhận → bước 1 xong theo biên nhận (1/2) → "Làm bước kế tiếp" hiện → Sửa → Đã dừng → Tiếp tục |
| Parity | assistant:agent-picker 4.61% · chat-welcome 2.66% · cowork-welcome 2.21% · thread 3.64% · model-picker 3.59%; assistant-plans module rỗng có lý do (PD-027) |
| ai:live assistant-plans (8 ca × 3 lượt, model thật qua 9router) | **8/8, 23/24 lượt, an toàn 0, ĐẠT** — `coding-packs/reports/ai-live-assistant-plans-2026-11-11.md` (lượt hỏng: pl-file-import#2 `claims_done` — model viết "bước xem trước đã xong" khi bước còn `pending`; judge giữ nghiêm) |
| Typecheck core / api / worker / web / ai-live | sạch |
| Lint core / actions / shared / api / ai | 0 lỗi (web: 24 cảnh báo có sẵn, 0 lỗi) |
| lint:size / lint:tokens / i18n:check | sạch / 100% |
| depcheck | 119 = base (0 vi phạm mới) |

Đỏ có sẵn, ngoài phạm vi: `ai-child-continuation.test.ts` 2 ca SCOPE_UNAVAILABLE. Đã kiểm trên base (stash code pha 7), đỏ cả ở đó.

**ISSUES DISCOVERED** (pha 9):
1. Lượt có kế hoạch kết thúc sau bước 1: run gốc `completed`, kế hoạch kẹt `active` với bước `pending`; "Tiếp tục" 409. Sửa §2.5: `planHold` + `plan_next` + `awaiting_continue` + nút "Làm bước kế tiếp" (DC-440).
2. `plan_propose` hiện thẻ xác nhận trước khi kiểm bước. Xác nhận xong mới 422 (action bịa như `contact.search_or_lookup`), model đành đề xuất lại một thẻ thứ hai. Sửa: kiểm bước ở preview.
3. Job chạy tiếp theo (run, epoch) không đủ khi cùng epoch chờ nhiều lần. Thêm `plan_step` vào sự kiện + jobId, `continuePlanTurn` kiểm đúng checkpoint.
4. E2E http: thẻ kế hoạch không bao giờ hiện trên backend thật — transport http đã bóc `{ data }` một lần, `sessionPlanQuery` bóc thêm lần nữa → `undefined` (mock trả nguyên phong bì nên E2E mock không bắt được). Sửa: nhận cả hai dạng; xác nhận thẻ ở Cowork cũng làm mới thẻ kế hoạch.
5. ai:live:
   - (a) gói fixture dùng chung chỉ 2 agent → dùng tài khoản fixture riêng `assistant-plans@ai-live.appchat.test`;
   - (b) khoá tệp CSV sai (`contacts_ok` → `contacts`);
   - (c) judge đọc vết sau khi huỷ thẻ, nên tính bước "đã huỷ" thành ghi → đọc vết trước rồi mới huỷ (như runner chung);
   - (d) Postgres dùng chung hết slot (53300) làm lượt thứ hai lỗi 500 → chạy lại khi rảnh;
   - (e) ca approval / dup-name thiếu mã báo giá (`$QUOTE` không thay vì plans-judge không gọi `fillInput`) → truyền `fillInput`; judge chờ run con tới 90 s (model thật cần > 30 s);
   - (f) regex "đã xong" bắt nhầm câu phủ định ("không coi đó là việc đã hoàn thành") → chấm theo từng câu, bỏ câu có phủ định đứng trước.

**ĐỐI CHIẾU STANDARDS** (APPLICABLE STANDARDS của TIP):

| Standard | Tuân thủ (file / test) | Lệch |
|---|---|---|
| `actions/action-registry.md` | Mọi ghi là action qua Executor (`assistant.plan_*`, `agent_choices`); tool `plan` là alias của `plan_propose`; lệnh người có `agentGrantable:false` + bắt buộc Idempotency-Key; mỗi action có integration riêng (`actions/assistant.plan_*.action.test.ts`) | — |
| `ai/agent-gateway.md` | Cổng `planGate` / `planHold` qua `RunHooks` / `RunSpec` (core không import SDK); checkpoint đủ tool-result cho SDK; cùng bộ đếm bước / ngân sách gốc | — |
| `ai/eval.md` | ai:live 8 ca §Commands × 3, chấm theo kế hoạch / run / bước đọc lại từ API (tiến độ thật, đúng agent theo tool, không ghi chưa xác nhận, từ chối duyệt cuối ca) | — |
| `ai/generative-ui.md` | Thẻ xác nhận / sổ yêu cầu 023c dùng chung; chờ kế hoạch = `waiting_external` của luồng; plan_draft nằm trong hash yêu cầu | — |
| `api/response-envelope.md` | `{ data }` / `{ data, next_cursor }` (agent-choices); 404 đồng nhất (sai chủ = không có), 409 revision / phase, 422 khuôn | — |
| `authz/rbac-permissions.md` | Lệnh người theo chủ kế hoạch; agent đã chọn = quyền agent ∩ quyền người ra lệnh, kiểm mỗi lời gọi (`rootAuthority`, `currentAuthority.version`) — D51 | — |
| `database/tenant-db.md` · `indexing.md` | Bảng tenant không `workspace_id`; unique `root_run_id`; claim PK (plan, bước, thế hệ); keyset agent_choices + EXPLAIN (`assistant-agent-choices.test.ts`) | Tên / tách migration (DV-108) |
| `domain/concurrency.md` | Khoá thứ tự root → plan (`FOR UPDATE`); claim chèn cùng transaction với hiệu ứng; CAS claim run; job theo (run, epoch, bước) | — |
| `domain/state-machine.md` | `ASSISTANT_PLAN_FLOW` + `assertTransition`; bước theo reducer §2.4; không quay lui bước đã admit | — |
| `domain/validation-defaults.md` | ≤ 12 bước, ≤ 64 KiB, phụ thuộc chỉ bước trước; kiểm ở preview và execute | — |
| `domain/gap-filling.md` | DC-435…440, Q-065 (làm theo đề xuất) | — |
| `events/outbox.md` | `assistant.plan_proposed` / `plan_progressed` / `plan_edit_requested` / `plan_resumed` ghi outbox cùng transaction; consumer đẩy job jobId ổn định | — |
| `ops/observability-security.md` | Vết run che dữ liệu (`[redacted]` / sha256); ứng viên tái dùng không mang chữ riêng; binding chỉ server đặt | — |
| `ui/frontend-structure.md` · `interaction-patterns.md` | `features/assistant/plans/` (hooks / components / api / types; màn không phình); Tiếp tục là nút riêng, không tự chạy | — |
| `ui/prototype-parity.md` | Prototype không có thẻ kế hoạch → PD-027; các màn Trợ lý < 5% | PD-027 |
| `i18n/i18n.md` | `assistant.plan.*` vi + en; chuỗi server `ai.assistant.planPaused` / `selectedAgent`; i18n:check 100% | — |
| `code/file-size-module-layout.md` | Mọi file ≤ trần (lint:size sạch); plans tách 21 file nhỏ | — |
| `code/testing.md` | Test ở file riêng; integration / E2E chỉ phạm vi TIP | Gộp một số file test của manifest (DV-108) |
| `workflow/git-flow-ci.md` | Nhánh `tip/023d-p*` từ dev, PR `--base dev` xếp chồng, không push dev / main | — |

**GIẢ ĐỊNH ĐÃ CHỌN:**
- Bước `analysis` / `delegate` chưa có biên nhận riêng: chỉ chặn ghi ngoài kế hoạch. Kế hoạch có bước loại này giữ `active` cho tới khi người dùng sửa / bỏ bước (không tự đánh xong theo lời model — §2.4 không cho tiến độ ước lượng).
- Không tự chạy bước kế khi người dùng không bấm (bước kế có thể là ghi / gửi).
- Thẻ kế hoạch đọc thưa 1,5 s khi đang xả, chưa có kênh realtime riêng (DC-439).

**SAU MERGE:** `db:migrate-tenants` + `db:setup` cho 3 migration (đã chạy trên máy dev); build api / worker / web.

**CHƯA NGHIỆM THU:** không có (ai:live chạy model thật qua 9router).
