### COMPLETION REPORT — TIP-020e

**STATUS:** DONE (AC9 chưa nghiệm thu với provider thật — Q-066) — PR #226, nhánh `tip/020e-rag-model-lifecycle` (từ `204c59db`, xếp chồng trên #224), ba commit:
- P1 backend: `0b5d1daa`.
- P2 FE / E2E: `03255634`.
- P3 không gian ổn định + suite ai:live + sổ: `bcc52d2e`.

Kết quả AC:
- AC1–5, AC7, AC10 đạt bằng unit + integration Postgres 16 thật + test ghép worker.
- AC6 đạt bằng test `platform-config` + router (cổng ở `config-validation.ts` thay `provider-probe.ts` chưa có — Q-071).
- AC8 đạt bằng component + E2E mock / http + parity.
- AC9: suite `rag-model-lifecycle` (8 ca, embedding OpenAI thật, seed đổi route bằng action Quản trị nền tảng thật) đã viết xong. Cả 2 lần chạy hỏng ở seed, trước ca đầu tiên, vì cạn slot Postgres dùng chung (53300 / P2037) → **chưa nghiệm thu với provider thật**, ghi Q-066. Rerank: chưa có provider `/rerank` + đơn vị giá (Q-041, Q-071) → ca `rml-rerank-off` kiểm route rerank bị từ chối, search giữ RRF.

**TÓM TẮT:**
- **Rà trước khi làm (§1):**
  - 023e `config-revision.ts` + ứng viên ghim đã có.
  - 019b metered embedding có.
  - 020c / 020d (writer fence, citation chunk id) có.
  - 015c privacy inventory có.
  - 040 KHÔNG có `provider-probe.ts`: route được kiểm ở `platform/services/config-validation.ts` → cổng rerank đặt ở đó (Q-071).
  - Pricebook chỉ có đơn vị per-1k token, chưa có đơn vị rerank (DC-303).
  - 9router không có `/rerank`.
- **Không gian embedding (§1, DC-452):**
  - Khoá = `provider:model:1536:<spaceRevision>`, với `spaceRevision` = HMAC(ENC_KEY) chỉ của model + params của route.
  - P3 sửa một lỗi rà ra khi viết suite live:
    - Trước đó khoá dùng `routeRevision`, gồm id + priority.
    - `admin.model_route.upsert` xoá rồi tạo lại cả nhóm (id mới), nên chỉ cần LƯU LẠI cấu hình cũng làm kho "cũ" và tắt nhánh vector ("model đã gỡ").
    - Khoá cache handle vẫn theo `routeRevision`.
  - Câu hỏi và lần nạp đều ghim space của khe đang phục vụ, không fallback chéo space.
  - Route của khe bị gỡ → `degraded: embed_space_retired` + nhánh từ khoá.
- **Đổi route (§2.1):**
  - Chỉ đánh dấu `stale` + outbox `kb.index_stale` khi đọc `GET /settings/kb`: 0 embed, 0 Credit (DC-288).
  - Route quay lại đúng space đang phục vụ → hết `stale`, không cần tạo lại.
- **Tạo lại (§2.2–2.5):**
  - `kb.reindex` xem trước BẮT BUỘC: model đích, số đoạn, token, Credit theo giá hiện hành, dung lượng, cảnh báo khe cũ / thay thế / đang chạy.
  - Xác nhận ràng buộc space + số đoạn; đổi giữa chừng → 409.
  - Job `kb-reindex` (ROLE=ai):
    - Lấy ID theo cursor, lô 64; embed ngoài transaction.
    - Ghi có điều kiện: lease + `ingest_seq` + nguồn còn hiệu lực.
    - Catch-up ≤ 3 vòng; publish CAS đổi khe A ↔ B; chunk id giữ nguyên.
    - Credit gom MỘT nhóm / generation → ceil gộp (DC-251).
    - Drain → paused, nhả lease, giữ cursor. Worker chết → lease hết hạn → chạy tiếp từ cursor.
  - Huỷ → dọn khe đích.
- **Rerank (§3):**
  - Capability `rerank`, compatible `/rerank`, `AiSdkReranker` ≤ 40 / 3 s.
  - Stage kiểm index giả / trùng / ngoài khoảng / timeout → RRF + lý do riêng.
  - Thiếu giá → dừng.
  - Route bị chặn `no_rerank` / `no_rerank_price`.
- **FE (§4):**
  - `KbIndexStatus` (PD-033), chỉ hiện với người có `kb.manage`. Các trạng thái:
    - cũ;
    - đang tạo lại + tiến độ thật + Huỷ;
    - lỗi (lý do đã dịch);
    - suy giảm.
  - `kbIndexQuery` có khoá gắn workspace, poll 5 s khi đang chạy.
  - Mock có các kịch bản `ac_mock_kb_index`.
  - i18n vi / en.

**FILES CHANGED** (lệch manifest ở DV-124):
- `packages/ai`:
  - `embed/embedder.ts` (space / has / ghim);
  - `router/{router,providers}.ts`;
  - `gateway/types.ts`;
  - `rerank/*`.
- `packages/core`:
  - `ai/kb/reindex/*` (space, estimate, generation.store, index-status, publish, reindex.service / queue / handler / usage, providers);
  - `ai/kb/{search,ingest,query-run}.ts`, `kb/system/effects.ts`;
  - `ai/router/{config-revision,provider.store}.ts`;
  - `platform/services/config-validation.ts`;
  - privacy `kb_index_vector`.
- `packages/db`: migrations `20261114030000_kb_vector_generations`, `20261114030100_ai_usage_rerank_kind`; `prisma/tenant/ai-kb.prisma` (đã có trong OWNERS `prisma-stubs` — không thêm file .prisma mới).
- `packages/actions/src/settings-ai.ts` (`kb.reindex`, `kb.reindex_cancel`).
- `packages/shared`: events `kb.index_*`, `KbIndexStatus`.
- `apps/web`:
  - `features/settings/{components/KbIndexStatus.tsx, hooks/useKbIndexStatus.ts, styles/kb-index.styles.ts, api.ts, types.ts, components/RagSection.tsx}`;
  - mock `domains/kb-index.ts`;
  - messages vi / en;
  - e2e `kb-reindex.spec.ts` + `http/kb-reindex.spec.ts`.
- `apps/worker`: test `kb-reindex-composition`.
- `tools/ai-live`: `src/rag-lifecycle-judge.ts`, `cases.ts`, `runner.ts`, `cli.ts`.
- `fixtures/ai-eval`: `rag-model-lifecycle.json`, `rag-model-lifecycle-seed.mjs`.

**MIGRATION** — đã áp đủ 4 bước: `db:generate` → `db:migrate-tenants` (dev + `--test`) → `db:setup` (template).

**EXPLAIN** (`kb-reindex.test.ts`, 100.000 đoạn, ANALYZE bằng PROVISIONER):

| Truy vấn | Kế hoạch | Thời gian |
|---|---|---|
| Purge khe đích theo generation | Index Only Scan `kb_chunk_embed_generation_b_idx` | 0,639 ms |
| Lô kế (cursor id) | Index Scan `kb_chunk_pkey` + `kb_source_scope_ready_idx`, không Sort | 0,070 ms |
| Vector khe B | Index Scan `kb_chunk_embedding_b_hnsw_idx` | — |

**TEST**

| Cổng | Kết quả |
|---|---|
| Unit ai | 118 (P1) · P3: `router` + `embed-space` **11/11** |
| Unit core | 1326 (P1) · P3: `ai-provider-revision` (thêm `spaceRevision` giữ nguyên khi id / priority đổi) + `kb-vector-slot` + `kb-reindex` **22/22** |
| Unit shared / actions / db | 218 / 53 / 35 |
| Unit ai-live | **90/90** (13 file), typecheck sạch; `--dry` suite `rag-model-lifecycle` 8 ca, cổng 8 |
| Integration API (Postgres 16) | `kb-reindex` **12/12** (P3 chạy lại sau sửa reconcile; AC2 thêm: route quay lại → hết cũ, đổi lần nữa → outbox thứ hai, 0 embed / 0 Credit) + hồi quy KB · `platform-config` (cổng rerank) |
| Worker composition | `kb-reindex-composition` **1/1** (AC10: drain → paused, khởi động lại → tiếp cursor, gọi [64, 2]) |
| Component web | `KbIndexStatus` **7/7** (vi / en); web 590 |
| E2E mock (`E2E_PORT=3537`) | `kb-reindex` **6** + hồi quy `kb-management` / `kb-suggestions` |
| E2E http (`E2E_HTTP_PORT=3538`, `--workers=1`) | `kb-reindex` **1/1** (worker ai thật publish) |
| Parity | `settings:rag` 4,10% · `settings:rag-review` 2,06% |
| ai:live (`ai-live-stack`, OpenAI embed thật, `--attempts 3`) | **chưa nghiệm thu với provider thật**: 2/2 lần hỏng ở seed (lần 1 `contact.create` 500 P2037; lần 2 `db:grant-platform-admin --test` không lấy được kết nối — 53300). Slot trống lúc kiểm trước: 56 (dự án khác giữ 38). Q-066 |
| Lint / typecheck / depcheck / size / tokens / i18n | sạch theo gói đổi (P1 / P2); P3 typecheck ai / core / ai-live sạch |

Lỗi đỏ sẵn ngoài phạm vi, kiểm bằng `git stash` (đỏ cả trên nền):
- agent-reply LOOP_GUARD (Q-059);
- `kb-suggestions-proposer` SCOPE_UNAVAILABLE ×4;
- AC4 53300.

**ĐỐI CHIẾU STANDARDS** (APPLICABLE STANDARDS của TIP):

| Standard | Tuân thủ (file / test) | Lệch |
|---|---|---|
| `ai/rag.md` §6 (rerank khi có route) | Stage rerank + RRF fallback (`kb-rerank-stage.test.ts`, `reranker.test.ts`); route rerank bị chặn tới khi có provider + đơn vị giá | Q-071 (chưa bật được) |
| `ai/rag.md` §10 (đổi model → re-embed, chỉ so cùng không gian) | Space ghim (`embed-space.test.ts`, `kb-vector-slot.test.ts`); `kb.reindex` + job hai khe (`kb-reindex.test.ts` 12/12) | Re-embed có xác nhận, không tự chạy (DC-288) |
| `ai/rag.md` §11 (index) | HNSW khe B, idx (generation, id) hai khe, partial unique generation dở; EXPLAIN 100k ở trên | — |
| `ai/agent-gateway.md` §0, §5–6 | Embed / rerank qua AI SDK (`embedMany`, `rerank`); metering 019b, ceil gộp DC-251, `USAGE_UNKNOWN` → paused | — |
| `ai/eval.md` | Suite `rag-model-lifecycle` 8 ca × 3 lượt, cổng 8/8 + 0 vi phạm; chấm theo dữ liệu đọc lại | Chưa chạy được (Q-066) |
| `actions/action-registry.md` | `kb.reindex` / `kb.reindex_cancel` `defineAction` zod strict, risk config, preview bắt buộc, `agentGrantable: false` | — |
| `authz/rbac-permissions.md` | `kb.manage` (sales 403 — integration); thẻ UI chỉ khi `useCan('kb.manage')` | — |
| `database/tenant-db.md` | Bảng / cột tenant không `workspace_id`; migration qua MIGRATOR, đủ 4 bước | Tên migration khác manifest (DV-124) |
| `database/indexing.md` | Bằng trước / khoảng sau (generation, id); EXPLAIN | — |
| `domain/concurrency.md` | Lease + CAS publish; một generation dở (partial unique); `FOR UPDATE kb_setting` khi xác nhận; ghi có điều kiện | — |
| `events/outbox.md` | `kb.index_stale` / `kb.index_published` qua outbox cùng transaction | — |
| `ops/observability-security.md` | Nhãn không gian chỉ `provider · model` (không lộ thế hệ / key); log job chỉ id | — |
| `ui/*` · `i18n/i18n.md` | Token, vi / en, 390 không tràn, nút ≥ 44 px, parity < 5% | PD-033 |
| `code/testing.md` · D59 | Test file riêng; cổng chỉ phạm vi TIP | — |
| D33 / D35 · DC-251 · DC-288 | Router theo `model_route`; Credit ceil gộp; không job trả tiền ngầm | — |

**SỔ:**
- Q-071 (cổng rerank thay `provider-probe.ts`); Q-066 bổ sung 020e.
- DC-452 (thiết kế vòng đời model, `spaceRevision`).
- DV-124 (lệch manifest).
- PD-033 (thẻ trạng thái chỉ mục).
- COVERAGE:
  - STD-ai-rag-10a / 10b → ĐẠT.
  - STD-ai-rag-6b → MỘT PHẦN.
  - Q-002 → CHỜ-TK.
- BLUEPRINT: `kb_embed_generation`, cột khe, `kb_setting`, events, `GET /settings/kb` `index`, actions, UI.

**VIỆC CÒN LẠI:**
1. Chạy lại `AI_LIVE_TENANT_CACHE=3 node tools/scripts/ai-live-stack.mjs --no-build -- --cases fixtures/ai-eval/rag-model-lifecycle.json --attempts 3` khi Postgres dev đủ slot (Q-066: nâng `max_connections`), rồi commit report.
2. Bật rerank khi có provider `/rerank` + đơn vị giá (Q-041, Q-071).
