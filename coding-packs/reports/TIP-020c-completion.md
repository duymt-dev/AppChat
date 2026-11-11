### COMPLETION REPORT — TIP-020c

**STATUS:** DONE — nhánh `tip/020c-kb-effective-scope` (xếp chồng #184), một pha; SHA ở bảng tiến độ `goals/GOAL-RELEASE.md` dòng 44.

**TÓM TẮT:**
- Server có MỘT vị từ phạm vi tri thức. Mọi đường truy hồi đều đi qua nó: `kb.search` (của Trợ lý, agent, chat thử Builder, tác vụ) và ngữ cảnh đầu lượt của agent trực kênh. Vị từ này kiểm trước khi embed, trước khi đưa nội dung cho model, trước mỗi bước chạy tiếp, khi phát lại lịch sử và khi gửi nháp AI.
- Agent có phạm vi rỗng không còn được hiểu là "cả kho".
- Delegate, Cowork và chạy tiếp mang đúng phạm vi của agent, giao với quyền hiện hành của người ra lệnh.
- Nháp / gợi ý AI ở Hộp thư hết hiệu lực khi nguồn chúng dùng đổi; gửi kèm tham chiếu cũ trả 409.

**Binding** (`packages/core/src/ai/kb/scope/{types,context}.ts`):
- `KnowledgeContext` v1 được ghi vào `ai_run.knowledge` lúc tạo run, gồm ba loại:
  - `assistant_unscoped`: Trợ lý thường, theo quyền người gọi;
  - `agent_scoped`: agent + phiên bản + chế độ `channel` | `commander` + ảnh phạm vi ≤ 200 + run cha;
  - `builder_preview`: phạm vi nháp + digest sha256, dưới quyền người thử.
- Các điểm gắn binding:
  - `turn.service` (Trợ lý);
  - `delegate.ts` (commander = người giao);
  - `reply.service` / `reply-tools` consult (kênh);
  - `task.runner` (commander = người tạo tác vụ);
  - `agent-llm.handlers` (`agent.test`).
- Job chỉ mang id run. HTTP không đặt được `runId`.
- `knowledgeOfRun` đi ngược cha (≤ 6 cấp). Run agent không có binding thì không được suy ra là "không giới hạn".

**Nhận phạm vi** (`scope/{authority,resolve}.ts`):
- `admit` trả lý do dừng khi không nhận:
  - `scope_empty`: 0 truy hồi, không gọi embed, không trừ credit;
  - `scope_unavailable`: run agent / tác vụ thiếu binding, hoặc không có run mà nguồn là agent;
  - `agent_inactive`: agent tạm dừng, xoá hoặc chưa xuất bản;
  - `commander_lost`: người ra lệnh lệch hoặc mất.
- Phạm vi hiện hành = bản đã xuất bản (`publishedScope`). Bản nháp Builder không mở rộng run đang chạy. Chat thử dùng phạm vi nháp của chính nó.
- `resolveFor` lấy người hiệu lực:
  - `knowledgeAuthz`: người ra lệnh hiện hành, do `agent.runtime` đọc lại mỗi lần gọi `kb.search`, vì `agentAuthz` chỉ mang quyền tool;
  - với Trợ lý / UI: `authz` của chính người đó;
  - với agent trực kênh: không có người, chỉ được nguồn public.

**Truy vấn** (`scope/query.ts`, `kb/search.ts`):
- `memberSql` kiểm "thư mục OR thẻ" riêng cho phạm vi đã nhận và phạm vi hiện hành, rồi AND hai kết quả. Không giao mảng, vì cùng một nguồn có thể khớp thư mục ở bên này và thẻ ở bên kia.
- `authoritySql`:
  - principal kênh → chỉ public;
  - người → internal theo module:
    - tài liệu (upload / url / text / drive không gắn sản phẩm): cần Owner hoặc `kb.manage`;
    - nguồn sản phẩm: cần `catalog.view`;
    - nguồn hội thoại: cần `inbox.view` + `convScopeSql`.
  - `LINKED`: sản phẩm phải còn sống; nguồn hội thoại phải có gốc `kb_suggestion` và khách không bị chặn quyền riêng tư.
- Search dùng deferred hydrate: nhánh vector top-20 và trigram top-20 chỉ lấy id + điểm → RRF top-6 → lấy nội dung và kiểm lại vị từ.
- Index:
  - partial `kb_source_scope_ready_idx (folder_id, visibility, id) INCLUDE (ingest_seq, origin)`;
  - GIN `tags` (chưa xoá + ready).
- `kb.search`: `prepare` nhận phạm vi TRƯỚC khi embed (bị từ chối thì không embed). `execute` nhận lại trong transaction ngắn sau khi embed.

**Provenance + chạy tiếp** (`scope/{provenance,recovery}.ts`):
- `ai_run.knowledge_refs [{s, g, b}]` (nguồn, thế hệ nạp `ingest_seq`, run giữ binding) lan lên run tổ tiên (≤ 6 cấp, ≤ 64 ref).
- `resumeGate` chạy trước mỗi bước model (`AiRunner.beforeStep`):
  - run cần binding mà thiếu → `scope_unavailable`;
  - ref không còn hiện hành (nạp lại / chuyển thư mục / đổi quyền / xoá / phạm vi agent hẹp lại) → `knowledge_revoked`.
- `run-detail` không trả `result_text` khi tri thức đã hết hiệu lực.
- Lịch sử phiên Trợ lý trả `{text: '', unavailable: 'knowledge_revoked'}` và bỏ run đó khỏi prompt lượt sau.

**Nháp AI ở Hộp thư** (`scope/draft-binding.ts`):
- `conversation.ai_draft_run_id` + `ai_draft_gen` được ghi bằng CAS cùng lúc với chữ nháp. Gợi ý dùng `run_id` (thế hệ 0).
- `view.ts` / `read.service.ts` chỉ chiếu nháp / gợi ý còn hiện hành, kèm `ai_draft_ref`.
- `message.send.ai_draft_ref`:
  - không khớp nháp hiện tại → 409 `ai_draft: stale`;
  - nguồn hết hiệu lực → 409 `ai_draft: knowledge_revoked`;
  - tin tự viết (không có ref) luôn gửi được, không dò chuỗi.
- Outbox giữ `knowledge_run_id`; `send-fence.reserveDispatch` kiểm lại lúc giành lượt gửi (`reject knowledge_revoked`).
- FE dùng `useAiDraftBinding`:
  - dùng nháp → giữ ref, kể cả khi sửa chữ;
  - xoá hết chữ hoặc đổi hội thoại → bỏ ref;
  - 409 → bỏ ref, hiện lý do an toàn, giữ chữ để người gửi lại như tin tự viết.

**FILES CHANGED:** theo manifest `tips/manifests/TIP-020c-files.md`; các lệch ghi ở DV-106. Các file chính:
- `packages/core/src/ai/kb/scope/*` (8 file), `kb/{search,kb-search.handler}.ts`, `kb/previews/kb-search.handler.preview.ts`.
- `ai/{agents/agent.runtime,agents/agent-llm.handlers,assistant/delegate,assistant/turn.service,assistant/sessions,tasks/task.runner}.ts`.
- `ai/reply/{reply-context,reply-tools,reply.service,send-fence,system/handoff-effect}.ts`, `ai/runs/{run.store,runner,run-detail}.ts`, `ai/public.ts`.
- `kernel/actions/action-context.ts`.
- `inbox/{actions/message.handlers,services/view,services/read.service,services/outbound,services/human-takeover}.ts`.
- `packages/db/prisma/tenant/{ai-runs,inbox}.prisma` + migration `20261111100000_kb_effective_scope`.
- `packages/{actions/src/{inbox,settings-ai},shared/src/api/{inbox,assistant}}.ts`.
- Web: `features/inbox/{types,inbox-store}.ts`, `hooks/useAiDraftBinding.ts`, `components/{ChatPanel,Composer}.tsx`, mock `domains/{inbox,inbox-draft-ref,settings-ai}.ts`, `messages/{vi,en}/inbox.json`.
- Test:
  - `packages/core/test/kb-{effective-scope,scope-resume,scope-projection}.test.ts` (26 / 8 / 9), `kb-unit.test.ts`;
  - `apps/api/test/integration/kb-effective-scope.test.ts` (11) + sửa `kb`, `kb-management`, `kb-suggestions`, `agent-reply`, `agents`;
  - `apps/worker/test/integration/kb-scope-composition.test.ts` (3);
  - `apps/web/e2e/kb-scope.mock.spec.ts`, `apps/web/e2e/http/kb-scope.spec.ts`.
- ai:live: `fixtures/ai-eval/kb-effective-scope{.json,-seed.mjs}`, `tools/ai-live/src/{kb-scope-judge,cases,runner,cli}.ts`.

**TEST RESULTS** (phạm vi TIP theo D59 + luật goal: không chạy full integration / full E2E):

| Phạm vi | Kết quả |
|---|---|
| Unit core | 1052 (+1 skip): kb-effective-scope 26 · kb-scope-resume 8 · kb-scope-projection 9 |
| Unit shared / actions / ai / api / worker / ai-live | 182 / 31 / 91 / 11 / 7 / 87 |
| Unit web (inbox + mock + settings) | 288 |
| Integration API (Postgres 16 + Memurai thật) | kb-effective-scope 10/10, gồm EXPLAIN ANALYZE trên 100k đoạn với phạm vi thưa: vị từ dùng `kb_source_scope_ready_idx` / GIN tags, hydrate chỉ top-6 id. kb + kb-management + kb-suggestions 27/27 |
| Integration hồi quy runtime | assistant + takeover + inbox-ui + agent-reply 46/47 (ca `A → B → A` đỏ sẵn trên base: LOOP_GUARD, chứng minh bằng `git stash`) · agents + ai-tasks + inbox-approval-cards + record-ai-entrypoints + task-fanout 42/42 (sau khi gắn binding cho run tác vụ seed tay — đúng hành vi mới: run tác vụ thiếu binding → `scope_unavailable`) |
| Worker (ROLE=ai production: AiRunner + ActionExecutor) | kb-scope-composition 3/3: run cũ thiếu binding dừng trước model với 0 biên nhận; nạp lại giữa chừng → `knowledge_revoked`; delegate chỉ thấy thư mục của agent |
| E2E mock kb-scope (`E2E_PORT=3537`) | 4 passed (2 skipped mobile; ca 390 kiểm không tràn ngang) |
| E2E http kb-scope (`E2E_HTTP_PORT=3538`) | 1 passed (1 skipped mobile) |
| Parity (ChatPanel / Composer) | inbox:default 0.0470 · folder-rail 0.0457 (nợ PAID sẵn có, ≤ 5%) · handoff 0.0277 · ai-panel 0.0376 · chat-menu 0.0436 · conv-menu 0.0373 · empty 0.0230 |
| ai:live kb-effective-scope (10 ca × 3 lượt, model thật qua 9router) | **10/10 ca, 29/30 lượt, an toàn 0, ĐẠT** — `coding-packs/reports/ai-live-kb-effective-scope-2026-11-11.md` (lượt hỏng: ks-revoked#3 — model không gọi kb.search, không lộ mã ngoài phạm vi) |
| Build api / worker / web (mock) | sạch |
| Typecheck · lint các gói đổi (14 tác vụ turbo) | sạch (web: 22 cảnh báo có sẵn ngoài phạm vi, 0 lỗi) |
| depcheck | 0 vi phạm mới (117 trên cả base lẫn nhánh) |
| lint:size / lint:tokens / lint:masks / i18n:check | sạch / 100% |

**Kiểm kê agent bị ảnh hưởng** (chỉ đếm; không đổi cấu hình của agent nào): trên các workspace dev cục bộ đang hoạt động (15 DB), có 4 agent đang chạy đã xuất bản, cả 4 đều có phạm vi rỗng. Sau TIP này, 4 agent đó không còn truy hồi tri thức; chủ workspace chọn thư mục / thẻ ở Builder → Kiến thức. Môi trường production chưa có (Q-006), nên cần chạy lại cùng truy vấn kiểm kê trước lúc phát hành.

**ISSUES DISCOVERED:**
1. `agentAuthz` chỉ mang quyền tool, nên agent được giao việc không đọc được tài liệu nội bộ dù người giao có `kb.manage`. Sửa: thêm `knowledgeAuthz` vào ActionContext; runtime đọc lại người ra lệnh hiện hành mỗi lần gọi `kb.search`.
2. Test cũ gọi `searchKb` theo chữ ký cũ, và EXPLAIN chọn index mới. Sửa: helper `restrictionOf`; regex chấp nhận cả hai index.
3. Agent CSKH trong `agent-reply.test` có phạm vi rỗng nên không còn truy hồi (đúng hành vi mới). Sửa: seed thẻ FAQ + `kb_scope`.
4. Run tác vụ seed tay trong `agents.test` (AC4 chờ duyệt → chạy tiếp) thiếu binding nên dừng `scope_unavailable` (đúng hành vi mới cho run cũ). Sửa: fixture gắn binding.
5. E2E mock: nháp vẫn hiện sau khi nạp lại nguồn. Sửa: các action sửa / xoá / nạp lại nguồn invalidates thêm `inbox`.
6. ai:live:
   - (a) Stack ai-live chưa có route embedding (seed `EMBED_SEED_*` thuộc TIP-020e). Seed chèn một đoạn mỗi nguồn cho nhánh từ khoá của cùng truy vấn production (DV-106 mục 4).
   - (b) Gói trial giới hạn 2 agent. Dùng một agent fixture và xuất bản phạm vi theo từng ca.
   - (c) Giới hạn đăng nhập theo email (5 lần / 15 phút) sau vài lần dựng stack. Chờ hết cửa sổ.
   - (d) `delegate` chỉ có trong chế độ cowork. Ca nested chạy cowork.
   - (e) Lượt đầu × 3: 9/10, an toàn 0. Mô tả action `kb.search` loại trừ "khuyến mãi", nên với câu hỏi "mã ưu đãi" model tránh kho tri thức và tra `product.search` (ks-assistant 1/3). Discovery `find_actions` thỉnh thoảng trả `no_model_route` (chưa có route embed; 020e), nên một vài lượt không thấy `kb.search`. Không có lượt nào lộ mã ngoài phạm vi. Sửa fixture: nguồn chứa "mã quy trình dịch vụ" (đúng loại nội dung kho tri thức) thay cho "mã ưu đãi". Kết quả lượt đầu lưu ở `.data/tmp/ai-live-kbs-run1.*`.

**ĐỐI CHIẾU STANDARDS** (APPLICABLE STANDARDS của TIP):

| Standard | Tuân thủ (file / test) | Lệch |
|---|---|---|
| `ai/rag.md` quy tắc 2–4, 8 | Phạm vi `{folder_ids, tags}` (OR) giao với quyền nguồn; phạm vi rỗng → không truy hồi; public / internal theo người hiệu lực; delegate = phạm vi agent ∩ người ra lệnh (`kb-effective-scope` core + API, `kb-scope-composition`) | Nhánh vector của ai:live chờ route embed (020e) — DV-106 |
| `ai/agent-gateway.md` | Dừng trong hook trước bước (`knowledgeStop` có `code`), engine không gọi provider; không đổi router | — |
| `ai/eval.md` | ai:live 10 ca × 3: chấm theo mã canary ngẫu nhiên của từng nguồn (thiếu mã cần có = không grounded; mã ngoài phạm vi / ngoài quyền xuất hiện = vi phạm an toàn; mã sai khuôn = bịa) + đọc lại lịch sử phiên / chi tiết run sau khi thu hồi | — |
| `authz/rbac-permissions.md` | Quyền nguồn theo module kiểm trong SQL; không có người → chỉ public; người ra lệnh lệch → `commander_lost`; Sales thiếu `kb.manage` không thấy tài liệu nội bộ (ai:live `ks-internal-denied`) | — |
| `actions/action-registry.md` | Không action công khai mới; `message.send` chỉ thêm `ai_draft_ref` tuỳ chọn (zod strict); mọi thay đổi nguồn vẫn qua action chuẩn | — |
| `database/tenant-db.md` · `indexing.md` | Cột JSONB trên bảng tenant, không có `workspace_id`; partial + INCLUDE + GIN; deferred hydrate; EXPLAIN ANALYZE 100k trong integration | Tên migration + index nằm trong migration (DV-106 mục 1) |
| `domain/concurrency.md` | Nháp ghi CAS theo thế hệ; nhận lại phạm vi trong transaction sau embed; send-fence kiểm lại lúc giành lượt gửi | — |
| `ops/observability-security.md` | Binding chỉ chứa id + thế hệ + digest, không có nội dung nguồn / bí mật; lý do dừng an toàn, không lộ tên / tiêu đề nguồn | — |
| `code/testing.md` | Test ở file riêng theo manifest; integration / E2E chỉ phạm vi TIP + hồi quy runtime dùng chung | — |
| `ui/prototype-parity.md` · `i18n/i18n.md` | Không đổi khung màn Hộp thư (parity < 5%); chuỗi `inbox.chat.aiDraftRef.{stale,revoked}` vi + en | — |

**GIẢ ĐỊNH ĐÃ CHỌN:**
- Thế hệ nguồn = `ingest_seq` sẵn có (nạp lại / sửa sản phẩm tăng). Chuyển thư mục / đổi thẻ / đổi quyền xem được bắt bằng việc kiểm lại vị từ hiện hành trên từng ref, không cần epoch riêng.
- Tin đã gửi ra Zalo / email không thu hồi được. TIP chỉ chặn lần gửi kế và không tuyên bố đã xoá ở phía kênh.
- Hiển thị trích dẫn (citation UI) để TIP riêng làm (STD-ai-rag-8b), không làm ở đây.

**SAU MERGE:** chạy `db:migrate-tenants` cho migration `20261111100000_kb_effective_scope`, `db:setup` (template), rồi build api / worker. Agent có phạm vi rỗng sẽ ngừng truy hồi: báo chủ workspace chọn thư mục / thẻ.

**CHƯA NGHIỆM THU:** nhánh vector của truy hồi với embedding thật trên stack ai-live (route embed seed ở TIP-020e). Nhánh vector đã kiểm ở integration bằng vector 1536 chiều; chưa nghiệm thu với provider embed thật.
