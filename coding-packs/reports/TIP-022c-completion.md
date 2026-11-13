### COMPLETION REPORT — TIP-022c

**STATUS:** DONE — 5 pha, mỗi pha một PR xếp chồng: pha 1 #217 (`tip/022c-sales-behavior`, trên #216) · pha 2 #218 · pha 3 #219 · pha 4 #220 · pha 5 chốt `tip/022c-p5-templates-live` (trên #220). SHA ở bảng tiến độ `goals/GOAL-RELEASE.md` dòng 53. AC 1–9 đạt bằng bằng chứng tất định (model giả + Postgres / Redis thật); AC10 (16 ca model thật) **chưa nghiệm thu với provider thật** — harness `ai:live` chưa chạy agent trực kênh (Q-051 → TIP-044), 16 ca đã cố định ở `fixtures/ai-eval/sales-agent-behavior.json`.

**TÓM TẮT:** Sales agent trực kênh không còn tự quyết báo giá hay hứa tồn / giá theo chữ model:
- **Cổng ý định khách (pha 1, §1–§2, COM-3-11):**
  - Phân loại chỉ đọc (run consult con, chung ngân sách gốc, prompt `sales-intent` v1), ngưỡng cứng 70% không làm tròn (69.99 ≠ 70).
  - Biên nhận bền `ai_sales_intent` khoá theo (tin nguồn, revision), ghi `prepared` TRƯỚC hiệu ứng dưới khoá hội thoại; handle niêm phong theo đúng ctx của lời gọi tool (WeakMap).
  - Guard domain đọc lại biên nhận dưới khoá, tiêu thụ cùng transaction với hiệu ứng (rollback → còn prepared).
  - Phát lại không đổi đích sang báo giá mới gửi; gọi thẳng Executor nguồn agent / task không handle → 403.
- **Lệnh người vận hành (pha 2, §2.2):**
  - Agent / tác vụ làm thay người (`onBehalfOfUserId`) → executor ép duyệt; dòng duyệt ràng dấu báo giá (`bindPreview`).
  - Sau duyệt, guard kiểm người duyệt + đúng action / báo giá / run / dấu; lượt kênh không người ra lệnh vẫn 403.
  - Thẻ Trợ lý cảnh báo `operator_decision`.
- **Tồn kho có căn cứ (pha 3, §3.1–3.6, COM-2-8):**
  - Cổng kernel `observeStock`, CatalogModule cài (chỉ đọc; vật lý / dịch vụ / combo ≤ 50 thành phần / 5 tầng).
  - Model khai `sales_plan` (schema đóng, không trường số) → câu server dựng (`sales.advice.*`, giá / số / giờ kiểm thật, "chưa giữ hàng").
  - Lệch / không đọc được / sai khuôn → chuyển người với nháp trung thực; thay thế chỉ id đọc được còn hàng, ≤ 3.
  - Không kế hoạch mà lượt có tool thương mại → lượt kiểm `sales-response-check` chặn khẳng định không căn cứ.
- **Công bố / hàng rào nguồn / privacy (pha 4, §2.3, §3.7–3.8, §4.2–4.3):**
  - Căn cứ `ai_sales_publication` theo run (digest sự thật HIỂN THỊ + chữ).
  - Đặt chỗ gửi (`reserveDispatch`) quan sát lại ngay trước kênh: tồn / giá đổi, agent mất grant, chữ khác câu đã dựng, khách bị quên → không gửi.
  - `message.send.ai_draft_ref` kiểm dưới quyền NGƯỜI GỬI → 409 `ai_draft: stock_*`, chữ giữ nguyên.
  - Hàng rào nguồn khách (`inbox/services/customer-source-fence.ts`): xoá / hoàn xoá / thu hồi (cục bộ, sự kiện kênh, ACK) / xoá lịch sử khoá khách → hội thoại → tin → biên nhận, vô hiệu căn cứ ngay; hoàn xoá không hồi sinh.
  - Biên nhận ghi `ai_epoch`: tiếp quản / đổi chế độ → 409 kể cả khi về lại auto.
  - Kiểm kê + erase "Quên khách" cho biên nhận và căn cứ (giữ khoá nguồn chống phát lại).
- **Chốt (pha 5, §4.1, AC8, AC10):**
  - Mẫu Sales rev 3 = rev 2 + `stock.get` + `quote.request_revision`.
  - Nâng chỉ mẫu dựng sẵn rev 1 / rev 2 chưa sửa; mẫu quản trị đã sửa giữ nguyên + xem trước thay thế; agent đã tạo không đổi.
  - E2E http luồng Builder → widget → Hộp thư; fixture ai-eval 16 ca; COVERAGE COM-2-8 / COM-3-11 ĐẠT.

**FILES CHANGED** (theo pha; lệch manifest ở DV-120)
- **Pha 1:**
  - kernel `actions/customer-intent.ts` (mới), `action-context.ts`.
  - ai `sales-behavior/{types,source,quote-intent,admission,receipts}.ts` (mới), `agents/agent.runtime.ts`, `reply/{reply-tools,reply.service}.ts`, `approvals/resume.ts`, `ai.module.ts`.
  - sales `quotes/decisions/{accept,reject,revision,shared}.handler.ts` (tách), `services/customer-intent-guard.ts` (mới), `actions/quote-decide.handlers.ts` (facade).
  - packages/ai `prompts/sales-intent.{vi,en}.md` + registry.
  - db `ai-sales-behavior.prisma` + 3 migration `20261113040000…042000`.
  - test: core `sales-intent-admission`, `sales-intent-provenance`; ai `sales-prompt-runtime`; api `sales-customer-intent`.
- **Pha 2:**
  - kernel `customer-intent.ts` (đường người vận hành), `executor.ts`.
  - ai `sales-behavior/command-provenance.ts` (mới), `approvals/approval.gateway.ts`.
  - sales `previews/quote-decide.handlers.preview.ts`; i18n shared / web.
  - test: core `sales-command-provenance`; api `sales-command-provenance`.
- **Pha 3:**
  - kernel `actions/sales-publication.ts` (mới); catalog `services/sales-stock-observation.ts` (mới), `catalog.module.ts`.
  - ai `sales-behavior/{stock,alternatives,response,response-check,orchestrator}.ts` (mới), `reply/reply.service.ts`.
  - packages/ai `reply/{sales-plan,output}.ts`, prompt agent-reply v3 + `sales-response-check.{vi,en}.md`.
  - shared i18n `sales-advice.ts` vi / en.
  - test: core `sales-stock-grounding`, `sales-response-check`; ai `sales-plan`; api `sales-stock-grounding`.
- **Pha 4:**
  - ai `sales-behavior/{publication,privacy}.ts` (mới), `reply/send-fence.ts`, `kb/scope/draft-binding.ts`, `privacy/{inventory,cleanup}.ts`.
  - inbox `services/customer-source-fence.ts` (mới), `actions/{message,message-provider,conversation-state}.handlers.ts`, `jobs/inbox.jobs.module.ts`, `public.ts`.
  - channels `operations/provider-event.ts`, `jobs/poller.ts`, `public.ts`; sales `customer-intent-guard.ts`.
  - db migration `20261113043000_ai_sales_publication`; web `hooks/useAiDraftBinding.ts` + i18n inbox.
  - test: core `sales-behavior-privacy`; web `useAiDraftBinding.sales`; api `sales-draft-publication`, `sales-intent-races`; worker `sales-behavior-recovery`.
- **Pha 5:**
  - ai `agents/{template-revisions,templates.seed}.ts`, `public.ts`.
  - packages/ai `testing/mock-sales.ts` (mới) + 1 dòng `mock-model.ts`.
  - e2e http `sales-agent-behavior.spec.ts` (mới); `fixtures/ai-eval/sales-agent-behavior.json` (mới).
  - test core `sales-template-tools` (mới), `agent-template-upgrade`; COVERAGE `parts/part-decisions-commerce.md`.

**TEST**

| Cổng | Kết quả |
|---|---|
| Unit core (toàn bộ, sau pha 4) | **1276 passed** · pha 5 `sales-template-tools` 3 + `agent-template-upgrade` 3 |
| Unit packages/ai / shared / db / worker | 101 / 210 / 31 / 7 |
| Unit web | `useAiDraftBinding.sales` 7/7 · `features/inbox` 58/58 |
| Integration API (Postgres 16 + Memurai thật) | `sales-customer-intent` 9 · `sales-command-provenance` 5 · `sales-stock-grounding` 6 · `sales-draft-publication` 5 · `sales-intent-races` 7 (EXPLAIN 100k: `ai_sales_intent_run_idx` / `_contact_idx` / `_prepared_conv_idx` / `ai_sales_publication_run_key`, không Seq Scan) → **32/32** · hồi quy `hardening-takeover`, `kb-effective-scope`, `privacy-cleanup`, `record-ai-privacy` xanh · `inbox.test` 14/14 chạy riêng |
| Integration worker (ROLE=channels production) | `sales-behavior-recovery` **2/2** |
| E2E http (`E2E_HTTP_PORT=3538`, `TENANT_CLIENT_CACHE=10`, `--workers=1`) | `sales-agent-behavior` **chưa chạy qua được** — 3 lần đều hỏng ở onboarding chung (`e2e/http/support.ts`: OTP "Mã chưa đúng" / `trial-welcome` / `register-step-2`), TRƯỚC bước của TIP; log stack 53300 "remaining connection slots are reserved" 260–388 dòng + `WORKSPACE_UNAVAILABLE` (workspace mới kẹt provisioning). Postgres dùng chung: dự án khác giữ ~66 / 100 kết nối lúc chạy. Ghi Q-066; chạy lại khi slot rảnh. Luồng tương đương đã có bằng chứng tất định ở integration API (`sales-stock-grounding`, `sales-draft-publication`) + worker (`sales-behavior-recovery`) |
| ai:live 16 ca | **chưa chạy** — harness chưa có runner agent trực kênh (Q-051 → TIP-044). Chưa nghiệm thu với provider thật |
| Typecheck / lint / depcheck | sạch · 0 lỗi · 0 vi phạm (đã gỡ vòng import publication → reply-context ở pha 4) |
| lint:size / i18n:check | sạch / 100% |

**ISSUES DISCOVERED**
- Postgres 100 slot dùng chung với OPCHUB: nhiều lần 53300 khi chạy `agent-reply.test.ts` và khi chạy chung nhiều file integration (inbox.test đỏ 13 ca khi chạy cùng 4 file khác, chạy riêng 14/14). **`agent-reply.test.ts` chưa chạy lại được sau pha 3** (trước pha: 12/14, A → B → A đỏ sẵn — Q-059).
- Poller kênh (ROLE=channels) để rơi unhandled rejection khi Redis đóng lúc tắt tiến trình — lộ ra ở test worker; đã bắt lỗi ở chỗ gọi nền (`channels/jobs/poller.ts`).
- Vòng import mới publication.ts → reply-context → channels/public → … (depcheck) — đọc phiên bản agent trực tiếp qua `agent.store`.
- `agent-draft-publish.test.ts` vẫn kỳ vọng `ai_run` erase NOT_IMPLEMENTED (pha erase AI của 015c) — không đổi.

**ĐỐI CHIẾU STANDARDS** (APPLICABLE STANDARDS của TIP):

| Standard | Tuân thủ (file / test) | Lệch |
|---|---|---|
| `plans/COMMERCE-DECISIONS.md` §2 / §3 / §8 / §8b | Ngưỡng 70% cố định không làm tròn, tự làm chỉ khi ≥ 70 + căn cứ nguồn (`customer-intent-guard.ts`, `sales-customer-intent.test.ts` 69.99 / 70); xin sửa = bản nháp n+1 thật, không áp giảm giá khách xin; tra tồn trước khi nói còn / hết, thay thế thật đã kiểm (`sales-stock-grounding.test.ts`); không giữ hàng / đổi tồn / tạo đơn | — |
| `plans/BLUEPRINT.md` §3.3 / §3.3b / §5.3 | Quyền agent = grant đã xuất bản (∩ người ra lệnh khi delegate); đường người vận hành qua duyệt thật; kiểm lại grant hiện hành ở đặt chỗ gửi (`publication.ts` `agentGrant`) | — |
| `ai/agent-gateway.md` | Mọi lượt model qua Gateway / AiRunner (run consult con, chung ngân sách gốc); prompt có phiên bản (agent-reply v3, sales-intent v1, sales-response-check v1); output schema đóng (`sales-plan.ts`) | — |
| `ai/rag.md` | Tồn / giá không lấy từ RAG / trí nhớ — chỉ cổng quan sát canonical; nháp phụ thuộc tri thức giữ kiểm 020c (`dispatchKnowledgeOk` trước kiểm bán hàng) | — |
| `ai/eval.md` | 16 ca cố định + cổng (an toàn 100%, hành động ≥ 95%, mỗi ca ≥ 2/3, rubric ≥ 90%) ở `fixtures/ai-eval/sales-agent-behavior.json`; ngưỡng biên kiểm tất định | AC10 chưa chạy model thật (Q-051) |
| `actions/action-registry.md` | Không action mới, không đường ghi thứ hai: quyết định báo giá vẫn là 3 action chuẩn qua Executor; cổng chạy trong handler; `bindPreview` cho dấu báo giá | — |
| `events/outbox.md` | Hiệu ứng + timeline + event cùng transaction với tiêu thụ biên nhận; người ghi nguồn phát event như cũ | — |
| `authz/rbac-permissions.md` | Nháp người gửi kiểm dưới quyền người gửi hiện tại (`catalog.view`); CSKH không gán được `quote.request_revision` (`sales-template-tools.test.ts`) | — |
| `database/tenant-db.md` | Bảng tenant không `workspace_id`; DB qua TenantDbResolver; migration chạy dev / test / template | — |
| `database/indexing.md` | Index `=` trước: run_idx (run_id, id) INCLUDE (state, action_log_id); contact_idx partial; prepared_conv_idx partial INCLUDE (source_ids); publication_run_key unique; EXPLAIN 100k không Seq Scan (`sales-intent-races.test.ts`) | — |
| `domain/concurrency.md` | Thứ tự khoá khách gốc → (báo giá) → hội thoại → tin (id tăng dần) → biên nhận ở cổng và mọi người ghi nguồn (`sales-behavior-privacy.test.ts` thứ tự khoá, `sales-intent-races.test.ts`); không gọi mạng / model khi giữ khoá | — |
| `domain/state-machine.md` | Biên nhận prepared → consumed / invalidated (CHECK DB), không mở lại; báo giá theo `QUOTE_FLOW` | — |
| `domain/gap-filling.md` | Giả định ghi DC-448 (a–j); câu hỏi mở Q-051 / Q-059 / Q-066 kèm đề xuất | — |
| `code/file-size-module-layout.md` | Module bounded `ai/sales-behavior/*` ≤ 120 dòng / file; reply.service 346 dòng; không file vượt trần (lint:size) | — |
| `code/testing.md` | Test ở file riêng; unit + integration native + worker production + E2E http; D59 chỉ phạm vi TIP | — |
| `i18n/i18n.md` | Câu server dựng `sales.advice.*`, lý do chuyển người `ai.handoff.sales_*`, web `aiDraftRef.stock*` vi + en (i18n:check 100%) | — |
| `workflow/git-flow-ci.md` | Nhánh `tip/022c-*` từ origin/dev, PR chỉ vào dev, xếp chồng ghi trong thân PR | — |

**DEVIATIONS:** DV-120 (manifest: inbox.prisma / send.processor / outbound / operation-service KHÔNG sửa — lý do trong DV; file ngoài manifest liệt kê theo pha).

**DECISIONS:** DC-448 (a–j).

**CHƯA NGHIỆM THU VỚI PROVIDER THẬT:** AC10 16 ca model thật (Q-051); Zalo thật (Q-003).

**CHƯA CHẠY QUA ĐƯỢC DO MÔI TRƯỜNG:** E2E http `sales-agent-behavior` (cạn slot Postgres dùng chung — Q-066); `agent-reply.test.ts` sau pha 3 (cùng lý do).
