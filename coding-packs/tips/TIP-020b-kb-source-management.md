# TIP-020b — Hoàn thiện quản lý nguồn và thư mục RAG

## HEADER
- **Parallel-safe with TIP-023b (complete manifest intersection):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/ai.module.ts`, `packages/core/src/ai/kb/kb.handlers.ts`, `packages/core/src/ai/kb/kb.read.ts`, `packages/shared/src/api/index.ts`; integrate TIP-023b before TIP-020b.
- **Parallel-safe with TIP-023b (public API wiring):** sequential, shares `packages/shared/src/api/index.ts`; integrate TIP-023b before TIP-020b.
- **Parallel-safe with TIP-023b (exact manifest audit):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/ai.module.ts`, `packages/core/src/ai/kb/kb.handlers.ts`, `packages/core/src/ai/kb/kb.read.ts`; integrate TIP-023b before TIP-020b. Recompute on later manifest expansion; this is not whole-graph parallel clearance.
- **Parallel-safe with TIP-032b:** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`; integrate TIP-032b before TIP-020b. Recompute after incomplete manifests expand.
- **Parallel-safe with TIP-015b:** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`; integrate TIP-015b before TIP-020b. Recompute after incomplete manifests expand.
- **Parallel-safe with TIP-041:** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`; integrate this TIP before 041. Recheck incomplete manifests.
- **Parallel-safe with TIP-038b:** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`; integrate this TIP before 038b. Recheck incomplete manifests.
- **Parallel-safe with TIP-040:** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`; integrate this TIP before 040. Recheck incomplete manifests.
- **Parallel-safe with TIP-039:** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/vi/settings.json`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/actions/src/settings-ai.ts`, `packages/shared/src/api/index.ts`; integrate this TIP before 039. Recheck incomplete manifests.
- **Parallel-safe with TIP-038 (expanded manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`; integrate this TIP before 038; recheck after remaining manifests expand.
- **Parallel-safe with TIP-038:** sequential, shares `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `apps/web/messages/vi/actions.json`, `apps/web/messages/en/actions.json`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `coding-packs/plans/BLUEPRINT.md`; integrate this TIP before 038. Recheck after incomplete manifests expand.
- **Additional overlap with TIP-037 caps UI:** sequential, shares `apps/web/messages/vi/settings.json`, `apps/web/messages/en/settings.json`; integrate this TIP before 037.
- **Parallel-safe with TIP-037:** sequential, shares `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `apps/web/messages/vi/actions.json`, `apps/web/messages/en/actions.json`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `coding-packs/plans/BLUEPRINT.md`; integrate this TIP before 037. Recheck when incomplete manifests expand.
- **Parallel-safe with TIP-042c:** sequential, shares `coding-packs/plans/BLUEPRINT.md`; integrate this TIP before 042c. Recheck after incomplete manifests expand.
- **Parallel-safe with TIP-042b:** sequential, shares `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `apps/web/messages/vi/settings.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/en/actions.json`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `coding-packs/plans/BLUEPRINT.md`; integrate this TIP before 042b; recheck after incomplete manifests are expanded.
- **Parallel-safe with TIP-042:** sequential, shares `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `apps/web/messages/vi/settings.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/en/actions.json`, `coding-packs/docs/06-prototype/DEVIATIONS.md`, `coding-packs/plans/BLUEPRINT.md`; integrate this TIP before 042. Recheck intersections when incomplete manifests are expanded.
- TIP-ID: TIP-020b; Project: AppChat V2; Module: AI/KB source management; Priority: P0; Estimated: M.
- Depends on: 020, 027, 023b; tích hợp sau 036 (registry/i18n), trước 043 và 045b. Không sửa TIP-020 đã DONE.
- **Dòng COVERAGE nhận:** ACT-kb.folder.delete, ACT-kb.folder.update, STD-ai-rag-3b, DEF-027-1, PRO-settings-ragdownload.
- **Parallel-safe with:** sequential, shares `packages/actions/src/index.ts` với 015b/023b/023c/030b/032b/036/043/045b. Với 043 còn chia sẻ `packages/db/prisma/tenant/ai-kb.prisma`, `packages/core/src/ai/ai.module.ts`, `apps/api/src/http/ai/ai.http.module.ts`, `apps/web/src/features/settings/components/RagSection.tsx`, `apps/web/src/shared/api/mock/domains/settings-ai.ts`, `apps/web/messages/vi/settings.json`, `apps/web/messages/en/settings.json`, `apps/web/messages/vi/actions.json`, `apps/web/messages/en/actions.json`. Các TIP chưa có manifest phải rà trước mở song song.
- **Files touched:** C=create, M=modify; danh sách file chính xác dưới đây.

| Op | File |
|---|---|
| M | `packages/db/prisma/tenant/ai-kb.prisma` |
| C | `packages/db/prisma/tenant/migrations/20261102002010_kb_source_management/migration.sql` |
| M | `packages/actions/src/settings-ai.ts` |
| C | `packages/actions/src/kb-folders.ts` |
| M | `packages/actions/src/index.ts` |
| C | `packages/shared/src/api/kb-management.ts` |
| M | `packages/shared/src/api/index.ts` |
| C | `packages/core/src/ai/kb/source-policy.ts` |
| C | `packages/core/src/ai/kb/folder.handlers.ts` |
| C | `packages/core/src/ai/kb/folder.repo.ts` |
| C | `packages/core/src/ai/kb/source-download.ts` |
| M | `packages/core/src/ai/kb/kb.handlers.ts` |
| M | `packages/core/src/ai/kb/kb.read.ts` |
| M | `packages/core/src/ai/ai.module.ts` |
| C | `apps/api/src/http/ai/kb-management.controller.ts` |
| M | `apps/api/src/http/ai/ai.http.module.ts` |
| M | `apps/web/src/features/settings/components/RagSection.tsx` |
| M | `apps/web/src/features/settings/components/RagUploadModal.tsx` |
| C | `apps/web/src/features/settings/components/KbFolderEditor.tsx` |
| C | `apps/web/src/features/settings/hooks/useKbDownload.ts` |
| M | `apps/web/src/shared/api/mock/domains/settings-ai.ts` |
| M | `apps/web/messages/vi/settings.json` |
| M | `apps/web/messages/en/settings.json` |
| M | `apps/web/messages/vi/actions.json` |
| M | `apps/web/messages/en/actions.json` |
| C | `packages/core/test/kb-source-policy.test.ts` |
| C | `apps/api/test/integration/kb-management.test.ts` |
| C | `apps/api/test/integration/kb-management.contract.test.ts` |
| C | `apps/web/e2e/kb-management.spec.ts` |
| C | `apps/web/e2e/http/kb-management.spec.ts` |
| M | `coding-packs/docs/06-prototype/DEVIATIONS.md` |
| M | `coding-packs/plans/BLUEPRINT.md` |
| C | `coding-packs/reports/TIP-020b-completion.md` |

## CONTEXT
- Working dir: AppChat_Ver2; stack BUILDER-HANDOFF, Nest/Prisma/Postgres native + Next/Ant Design, không thêm thư viện.
- Khảo sát `c55298b`: `settings-ai.ts:43` default visibility public xoá mất phân biệt input omitted; `kb.handlers.ts:78` dùng thẳng giá trị đó. Folder có visibility nhưng tạo source không kế thừa (rag §3).
- `kb.handlers.ts:94-132` update/remove không chặn origin catalog; `catalog/events/catalog-sync.ts` là chủ dữ liệu nguồn catalog. TIP-027 report đã nêu thiếu guard.
- `kb.folder.create` có handler, update/delete chưa ActionDef; bảng KbFolder đã có parentId/visibility/sort nhưng UI chưa quản lý đầy đủ.
- `RagSection.tsx:67` nút download không onClick. `files.controller.ts:59-75` có GET file xác thực, còn `/raw` cần ws+sig, không phải URL chỉ cần file_id. Không gắn nút vào URL raw đoán được.
- Đọc Blueprint §3.4 kb.folder.*, §2.2 ai-kb; standards/ai/rag §1–3; prototype RAG; TIP-020/027 reports; mọi file M trước sửa.

## APPLICABLE STANDARDS
`actions/action-registry.md`, `api/response-envelope.md`, `authz/rbac-permissions.md`, `database/tenant-db.md`, `database/indexing.md`, `ai/rag.md`, `domain/concurrency.md`, `domain/validation-defaults.md`, `domain/gap-filling.md`, `ops/observability-security.md`, `ui/frontend-structure.md`, `ui/interaction-patterns.md`, `ui/prototype-parity.md`, `i18n/i18n.md`, `code/file-size-module-layout.md`, `code/testing.md`; D59.

## Rà trước khi làm
1. Rebase/read reports sau 023b/036; nếu 043 đã được tích hợp thì đổi thứ tự và rà lại shared module/schema/UI. Không sửa migration cũ.
2. Đối chiếu defaults zod và các caller/mock. Visibility vẫn optional ở input JSON: bỏ default ở lớp parse, resolve default tại server có folder context theo TASK 2. Không đổi enum/required field, giữ mọi explicit public/internal; ghi contract regression cho omission vì hành vi public cũ là lỗi đối với folder internal (rag §3), không phải hành vi phải bảo tồn.
3. Đọc policy FilesService và folder scopes; test download phải kiểm file gắn với source thật, không chỉ cùng tenant. Rà file sizes, tách helper thay vì mở rộng monolith.

## TASK
Hoàn thiện các thao tác đã có trong thiết kế nhưng còn thiếu ở quản lý KB. Bảo vệ nguồn catalog và quyền tải tài liệu, không đổi logic RAG search/embedding hay tự mở nội dung nội bộ ra khách.

### 1. Folder lifecycle
- Thêm action `kb.folder.update {folder_id,name?,visibility?,parent_id?,if_version?}` output `{folder_id,version}` và `kb.folder.delete {folder_id,if_version?}` output `{ok}`. Permission kb.manage, agentGrantable=false, risk write/delete; preview diff + số nguồn/thư mục con, invalidates kb. Tên trim 1–60, visibility chỉ public/internal.
- Update CAS version; parent khác self, không vòng tổ tiên, không folder tenant khác; tên normalized chống trùng theo quy tắc create hiện hành (toàn kho), unique expression `f_unaccent(lower(name))`. Kiểm/migrate dữ liệu trùng trước tạo index, không tự xoá folder của user.
- Delete chỉ folder rỗng (không nguồn kể cả trash/không thư mục con); HAS_DEPENDENCIES và count ở preview, không cascade mất tài liệu hay đưa internal về public. Thuộc lựa chọn an toàn gap-filling, không thêm xoá hàng loạt.
- Tách create/update/delete thành folder.handlers; giữ ID/input create cũ, thêm visibility/parent_id optional và output version tương thích. Index parent_id, quyền kb.manage server; mọi mutation Executor, outbox/audit đúng kernel.

### 2. Kế thừa visibility và nguồn catalog
- `kb.add_source.visibility` giữ chấp nhận optional public/internal nhưng không chèn `.default('public')` trước handler. API/preview resolve omitted = folder.visibility nếu có folder, nếu không = public; explicit value giữ nguyên. FE khi người dùng chưa chọn gửi omission, không tự chèn public. Mock áp cùng quy tắc. Mọi caller kể cả assistant không được lọt qua inheritance vì parser đã mất thông tin.
- API tự đọc folder trong transaction, không tin visibility của FE lúc chọn. Source lưu snapshot visibility lúc tạo, di chuyển folder/đổi default folder không tự publish lại nguồn cũ. Test server direct action omitted với folder internal bắt buộc đạt, không chỉ sửa FE gửi cờ.
- Policy guard trong update/remove/undo của nguồn catalog: không cho người/agent sửa hay xoá bản đồng bộ. Trả CONFLICT với field reason và chỉ dẫn sửa sản phẩm gốc. Sửa giá/mô tả sản phẩm vẫn được catalog-sync cập nhật nguồn; guard không chặn consumer đồng bộ hợp lệ.
- UI catalog rows ẩn/disable thao tác bị cấm, giải thích lý do; backend vẫn là nguồn kiểm quyền. Refresh nguồn catalog chỉ đọc sản phẩm hiện tại để ingest, không cho body thay thế.

### 3. Download thật
- GET `/v1/kb/sources/:id/download` nhận source_id, xác thực kb.manage và tenant/visibility/source live; fileId lấy từ source, không nhận file_id tự do. Dùng FilesService/Storage; Content-Disposition an toàn, nosniff, không lộ storage path/secret, không cache public.
- Có file gốc: trả byte gốc với tên/mime an toàn. Nguồn text/conversation: export text đã được phép đọc; URL không tải nội dung website lại khi bấm (không tạo SSRF), báo không có file gốc và nút Mở URL đã kiểm protocol nếu phù hợp; catalog chỉ điều hướng sản phẩm. Không trả dữ liệu mock hay toast download xong khi chưa có blob.
- Hook download dùng transport.blob, revoke object URL sau dùng, phản hồi 403/404/lỗi mạng; drawer folder edit bằng primitives/token, vi/en/keyboard/mobile. Ghi PD nếu bổ sung control không có trong prototype.

## ACCEPTANCE CRITERIA
| AC | Given / When / Then |
|---|---|
| AC1 | Given hai tenant và vai trò không kb.manage, When tạo/sửa/xoá folder, Then 403/404, không mở dữ liệu tenant khác; hai update cùng version chỉ một thắng. |
| AC2 | Given tên trùng khác dấu/case và cây parent, When create/update/move, Then duplicate/self-cycle/ancestor-cycle bị chặn server+DB; delete folder có source/trash/con không mất dữ liệu. |
| AC3 | Given folder internal, When UI thêm file mặc định kế thừa, Then source internal và agent khách không tìm ra; caller cũ explicit public vẫn giữ contract; đổi folder default sau đó không đổi nguồn đã tạo. |
| AC4 | Given source origin catalog, When update/remove/undo trực tiếp, Then CONFLICT không mutate; khi product update, Then catalog-sync vẫn cập nhật nội dung đúng một nguồn. |
| AC5 | Given file nguồn có dấu trong tên, When tải qua UI HTTP, Then bytes/hash khớp upload, filename UTF-8, không URL giả; source/file ID tenant khác/đã xoá trả 404 và không byte nào. |
| AC6 | Given nguồn text/URL/catalog, When download, Then từng hành vi TASK 3 rõ ràng, không no-op/SSRF/raw file_id bypass. |
| AC7 | Given mock/http và desktop/mobile, When folder edit/delete/download, Then zod contract giống nhau, errors/focus/vi/en đúng; parity RAG <5% theo PD. |

### Lệnh test builder
`pnpm --filter @appchat/core test -- kb-source-policy`; `pnpm --filter @appchat/api test:integration -- kb-management`; `pnpm e2e kb-management`; `pnpm e2e:http kb-management`; `pnpm parity settings:rag`; `pnpm i18n:check`.

DB thật test unique/CAS/tenant; EXPLAIN cho folder name/parent/source lookup. D59 trước commit theo package; chốt đầy đủ lint/typecheck/unit/integration/depcheck/build, mock/http + full E2E hồi quy một lần, parity --done khi đổi shared. TIP không thêm model call: không giả một ca 9router thành test bắt buộc; agent-read visibility kiểm qua harness RAG hiện có, live tổng ở 044.

## CONSTRAINTS
- DO NOT: đổi quyền KB, nội dung catalog bằng tay, thêm public file URL không auth, gọi website bên ngoài từ download, sửa migration đã merge.
- REUSE: Executor, TenantDbResolver, Storage, scope/policy, zod và UI hiện có; backend <600/FE <400, tests riêng.
- SKIP: học từ hội thoại 043; privacy.erase domain CRM; rerank/re-embed 046; safeFetch tổng thể 045b. Không dùng các scope này để bỏ năm dòng COVERAGE nhận.

## BUILDER-CHECKLIST
- [ ] Đọc CONTEXT và dependencies thực, manifest/overlap chuẩn; không sửa TIP DONE.
- [ ] AC1–AC7 có output thật, PG isolation/concurrency và download hash; không chỉ test mock.
- [ ] Action-first và catalog guard server; folder internal không leak; mọi preview/read tuân quyền.
- [ ] D59/parity/i18n/EXPLAIN, update parts+merge, report commit SHA, working tree sạch, PR chỉ dev.
