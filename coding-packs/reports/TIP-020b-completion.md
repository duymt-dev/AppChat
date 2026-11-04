### COMPLETION REPORT — TIP-020b

**STATUS:** DONE. Một PR (`tip/020b-kb-source-management`) xếp chồng trên #69 (TIP-036 chốt), nên phải merge #69 trước. Đạt AC 7/7. Các dòng ACT-kb.folder.delete, ACT-kb.folder.update, STD-ai-rag-3b, DEF-027-1 và PRO-settings-ragdownload đều ĐẠT (`COVERAGE.md`, merge.py còn 0 lỗ hổng).
**COMMIT:** SHA cuối nhánh ghi ở bảng tiến độ `goals/GOAL-RELEASE.md`.

**FILES CHANGED:** khớp bảng file của TIP. Ngoài bảng có các file sau, mỗi file kèm lý do:
- `packages/core/src/ai/kb/previews/kb.handlers.preview.ts`: preview của `kb.add_source` / `update_source` phải resolve kế thừa và guard catalog giống handler.
- `packages/core/src/ai/public.ts`: export `sourceDownload` cho controller.
- `apps/web/src/features/settings/{settings-store.ts,types.ts}`: state drawer thư mục, kiểu `KbFolder` và `origin`.
- `apps/web/src/features/settings/styles/rag-folder.styles.ts`: tách khỏi `rag.styles.ts`, vì gộp vào thì file này lên 398 dòng, sát trần.
- `apps/web/src/shared/api/mock/{domains/kb-folders.ts,handlers.ts,mock-transport.ts}`: mock áp cùng quy tắc kế thừa, guard catalog và blob tải.
- `apps/api/test/integration/actions/kb.folder.{update,delete}.action.test.ts`: ma trận action, mỗi action trong registry bắt buộc có.
- `actions/kb.folder.create.action.test.ts`: kiểm output `version`.
- `apps/web/e2e/{settings-ai,http/rag}.spec.ts`: locator thêm `exact: true`, vì aria-label nút sửa thư mục chứa tên thư mục.
- `packages/core/test/assistant-coverage.test.ts`: EXEMPT `parent_id` (chọn từ danh sách thư mục, không cần đường tra).
- `coding-packs/DECISIONS.md`: DC-352.
- `tools/obligations/parts/*.md`: COVERAGE.

Chi tiết theo phần:
- **Migration `20261102002010_kb_source_management`:**
  - Thêm `kb_folder.version`.
  - Đổi tên thư mục trùng thành `"<tên> (n)"` trước khi tạo unique, không xoá thư mục nào.
  - Unique `kb_folder_name_key` trên `f_unaccent(lower(btrim(name)))`.
  - Partial `kb_source_folder_trash_idx (folder_id) WHERE deleted_at IS NOT NULL AND folder_id IS NOT NULL`.
- **Action:** `kb.folder.update` / `kb.folder.delete` ở `packages/actions/src/kb-folders.ts`, chuyển `kb.folder.create` sang cùng file với id và input cũ, thêm `visibility` / `parent_id`, output thêm `version`. `kb.add_source.visibility` bỏ `.default('public')`.
- **Core:**
  - `source-policy.ts`: kế thừa visibility và guard catalog.
  - `folder.repo.ts`: khoá `FOR UPDATE`, CAS, tên trùng, cây, phụ thuộc.
  - `folder.handlers.ts`: create / update / delete, có preview và hoàn tác 24h.
  - `source-download.ts`.
- **API:** `GET /v1/kb/sources/:id/download` (`kb-management.controller.ts`).
- **FE:**
  - Drawer "Sửa thư mục" (`KbFolderEditor.tsx`).
  - Nút ⬇ tải thật (`useKbDownload.ts`).
  - Hàng nguồn catalog: thay thao tác sửa / xoá bằng "Sửa ở Sản phẩm".
  - Ô "Ai được dùng" khi tải lên để trống nghĩa là theo thư mục.

**TEST RESULTS:**
- Acceptance criteria: 7/7
  1. **AC1:** sales không có `kb.manage` bị 403 với create / update / delete; thư mục của tenant khác trả 404; hai `kb.folder.update` cùng `if_version` chạy song song thì đúng một bản 200, bản kia 409 `STALE_VERSION`, version +1 (`kb-management.test.ts` "quyền + tenant", "CAS"; ma trận `kb.folder.*`) — **pass**
  2. **AC2:**
     - Tên `"  CHINH SACH "` / `"chính sách"` bị 409 `duplicate` ở cả create và update.
     - Insert thẳng DB `"Chinh Sach"` vẫn bị unique index chặn.
     - Đặt cha là chính nó → `self`; đặt cha là con → `cycle`.
     - Xoá thư mục có con / có nguồn trong thùng rác → `HAS_DEPENDENCIES` kèm số đếm, nguồn còn nguyên.
     - Xoá thư mục rỗng thì hoàn tác tạo lại đúng tên và visibility.
     - Test: `kb-management.test.ts`.
     - **pass**
  3. **AC3:**
     - Thư mục internal + `kb.add_source` không gửi visibility (action trực tiếp, không qua FE) → nguồn internal; preview của Trợ lý cũng internal.
     - Agent khách tìm với `['public']` qua `searchKb` sau khi worker ingest thật → không ra nguồn đó; tìm với public + internal → ra.
     - Gửi `public` tường minh → giữ public; không thư mục → public.
     - Đổi mặc định thư mục sang public → nguồn cũ vẫn internal.
     - `GET /settings/kb` khớp `kbDataSchema`. Parser giữ visibility bỏ trống (`kb-source-policy.test.ts`).
     - **pass**
  4. **AC4:**
     - Nguồn catalog: update / remove / update qua Trợ lý → 409 `catalog_managed`, `reason: edit_product`, `product_id`; DB không đổi.
     - `product.update` rồi `syncProduct` → `updated`, vẫn đúng một nguồn catalog, nội dung mới.
     - Test: `kb-management.test.ts` AC4, `kb-source-policy.test.ts`.
     - **pass**
  5. **AC5:**
     - Tệp `Bảng giá Hè 2026.md`: sha256 của bytes tải về khớp bản upload; `content-disposition: attachment; filename*=UTF-8''…`; `nosniff`, `no-store`.
     - Sales → 403; tenant khác → 404 `NOT_FOUND`; dùng `file_id` thay `source_id` → 404; id không phải uuid → 404; nguồn đã xoá → 404.
     - Test: `kb-management.test.ts` AC5.
     - HTTP UI: `e2e/http/kb-management.spec.ts` tải qua nút ⬇ rồi so sha256.
     - **pass**
  6. **AC6:**
     - Văn bản → `text/plain`, tên `.txt`, đúng nội dung.
     - URL → JSON `{kind:'url', url}` theo `kbSourceLinkSchema`; server không fetch website.
     - Catalog → `{kind:'product', product_id}`.
     - Test: `kb-management.test.ts` AC6. FE: URL mở tab sau khi kiểm http/https, catalog sang /products (`e2e/kb-management.spec.ts`).
     - **pass**
  7. **AC7:**
     - Mock và http dùng chung zod (`kb-management.contract.test.ts`: GET, output action, envelope lỗi).
     - Mock: sửa / chuyển cha / xoá / lỗi trùng / `HAS_DEPENDENCIES`, tải, catalog khoá, vi / en, bàn phím, mobile 390 (`e2e/kb-management.spec.ts`).
     - http: `e2e/http/kb-management.spec.ts`.
     - Parity `settings:rag` 2,36% (PD-012).
     - **pass**
- **Cổng commit:**
  - `turbo lint typecheck test` cho core + web: 6/6, core 348 passed, web 275 passed.
  - actions / shared / api lint + typecheck xanh.
  - depcheck bằng baseline.
  - lint:size / lint:tokens / lint:masks / i18n:check xanh.
- **Chốt TIP (D59, phạm vi TIP):**
  - Build api + worker + web: 3/3.
  - Integration (Postgres 16 + Memurai):
    - `kb-management.test.ts`, `kb-management.contract.test.ts`, `actions/kb.folder.{create,update,delete}.action.test.ts`: 22 passed.
    - `kb-management.test.ts` + `kb.test.ts` sau khi thêm bước search AC3: 20 passed.
  - E2E mock (3419): `kb-management` + `settings-ai` + `settings`, 21 passed.
  - E2E http (API 4517 / web 3518, Redis DB 15): `kb-management` 2 passed, `rag` 1 passed.
  - Parity: `settings:rag` 2,36%. Đã sửa `packages/shared` / `actions` / `apps/web/src/shared` nên chạy thêm `pnpm parity --done`: 108 PASS, 1 FAIL `inbox:connect-channel` 6,20%. FAIL này đỏ sẵn (Q-020 → TIP-014c, các log 015b-P3 / 036 cùng giá trị).
- **EXPLAIN** (`kb-management.test.ts` "EXPLAIN", `enable_seqscan=off`):
  - tên thư mục → `kb_folder_name_key`;
  - cha → `kb_folder_parent_id_idx`;
  - đếm nguồn sống → `kb_source_folder_status_idx`;
  - đếm nguồn trong thùng rác → `kb_source_folder_trash_idx`.
- **ai:live:** TIP không thêm lời gọi model. Việc agent không thấy nguồn internal được kiểm qua `searchKb` thật (AC3); bộ live tổng làm ở TIP-044.
- **Chưa nghiệm thu với provider thật:** embedding OpenAI thật cho nguồn mới; test dùng embedding giả tất định như TIP-020.

**ISSUES DISCOVERED:**
- Template DB tenant chưa có migration mới, gây lỗi `kb_folder.version does not exist`. Đã chạy `pnpm --filter @appchat/db db:setup` (idempotent, `.env` không đổi). Workspace demo / ai-live tạo trước đó cần chạy tenant-migrate trước khi dùng tính năng này.
- Index `kb_source_folder_created_idx` dự định ban đầu trùng vai với index có sẵn, làm EXPLAIN của `kb.test.ts` đổi plan. Đã thay bằng partial index cho thùng rác.
- `RowMenu` không có trạng thái `disabled`, kho icon không có `ic-lock`. Hàng catalog vì vậy dùng `ic-box` và mục "Sửa ở Sản phẩm" (điều hướng), không hiện mục bị cấm.
- `e2e/http/rag.spec.ts` đỏ một lần (thư mục chưa hiện sau "Tạo"), chạy lại riêng và chạy chung đều xanh: flaky, không lặp lại.
- Log E2E http có lỗi `WORKSPACE_UNAVAILABLE (provisioning)` khi đăng ký workspace test. Đây là request hỏi trước khi provision xong, spec tự chờ; xuất hiện ở các TIP trước, không do TIP này.

**ĐỐI CHIẾU STANDARDS** (mục APPLICABLE STANDARDS của TIP):

| Standard | Tuân thủ (file:dòng / test) | Lệch |
|---|---|---|
| `actions/action-registry.md` | Ghi đều là action (`packages/actions/src/kb-folders.ts`): `kb.manage`, `agentGrantable: false`, risk write / delete, undo 24h, invalidates kb; preview gồm diff + số nguồn / thư mục con (`folder.handlers.ts:51,92`); ma trận `kb.folder.*` | — |
| `api/response-envelope.md` | `{ data }`; lỗi `{ error: { code, message, fields } }` dùng `STALE_VERSION` / `HAS_DEPENDENCIES` / `CONFLICT` / `NOT_FOUND`; route tải trả byte hoặc `{ data: { kind } }` (`kb-management.contract.test.ts`) | — |
| `authz/rbac-permissions.md` | `kb.manage` kiểm ở server cho action và route tải (`kb-management.controller.ts:22`); không đổi quyền KB | — |
| `database/tenant-db.md` · `indexing.md` | Bảng tenant không có `workspace_id`; migration mới không sửa migration cũ; unique expression, partial trash; EXPLAIN 4 truy vấn (`kb-management.test.ts:196-200`) | — |
| `ai/rag.md` | §3: visibility nguồn mới kế thừa thư mục, resolve ở server (`source-policy.ts:12,20`), nguồn giữ snapshot; agent khách chỉ tìm public (`searchKb`, AC3); nguồn catalog do catalog-sync quản lý (`source-policy.ts:25`) | — |
| `domain/concurrency.md` | `SELECT … FOR UPDATE` + CAS `if_version` (`folder.repo.ts:16-20`); hai lệnh song song thì một thắng (AC1) | — |
| `domain/validation-defaults.md` | Tên trim 1–60, visibility chỉ public / internal, `if_version` ≥ 1 (`kb-source-policy.test.ts` "ActionDef thư mục") | — |
| `domain/gap-filling.md` | Xoá chỉ thư mục rỗng, đổi tên bản trùng thay vì xoá, đổi mặc định không ghi lại nguồn cũ (DC-352) | — |
| `ops/observability-security.md` | Tải theo source_id, file id lấy từ nguồn; `safeName` (`source-download.ts:22`); `nosniff` + `no-store`, không lộ đường dẫn storage; URL không fetch (không SSRF) | — |
| `ui/frontend-structure.md` · `interaction-patterns.md` | Drawer / hook / style tách file; ghi bằng `useAction`; `EntityDrawer`, token, bàn phím; blob có thu hồi object URL (`useKbDownload.ts:40`) | — |
| `ui/prototype-parity.md` | `settings:rag` 2,36% | PD-012 (mức 1: thêm control nghiệp vụ còn thiếu) |
| `i18n/i18n.md` | `settings.rag.folderEdit.*`, `dl*`, `catalogLocked`, `modal.visInherited`; `actions.kb.folder.update / delete` có cả vi + en; i18n:check xanh | — |
| `code/file-size-module-layout.md` · `code/testing.md` | File lớn nhất `RagSection.tsx` 219 dòng, `kb.handlers.ts` 178; test ở file riêng (unit / integration / contract / matrix / e2e) | — |
| `workflow/git-flow-ci.md` | Nhánh `tip/020b-kb-source-management` xếp chồng trên #69, PR vào `dev` | — |

**GIẢ ĐỊNH ĐÃ CHỌN:** DC-352 (`DECISIONS.md`). **Lệch spec:** không có, không thêm thư viện. **Lệch prototype:** PD-012.
