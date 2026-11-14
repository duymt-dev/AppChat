### COMPLETION REPORT — TIP-030b

**STATUS:** DONE — 3 pha, mỗi pha một PR xếp chồng: F1 #56 (`6181c85`) · F2 #57 (`9467d52`) · F3 #58 (`tip/030b-f3-appendix`, gồm commit chốt). AC 5/5 + phần "Bổ sung review độc lập" + "Extra measurable acceptance" (mục dưới). ai:live contract-files 4/4, 0 vi phạm an toàn.
**COMMIT:** SHA cuối nhánh `tip/030b-f3-appendix` ghi ở bảng tiến độ `goals/GOAL-RELEASE.md`.

**FILES CHANGED:** đúng manifest `tips/manifests/TIP-030b-files.md` (dòng bổ sung ghi "Amend (F1/F2/F3)"); +02-TASK-GRAPH bản đồ sở hữu file `tenant/contract-appendix-signing.prisma` (030b).
- **F1 — nguồn hợp đồng (#56):** mẫu theo loại service / sale / framework, default nhóm `(kind, contract_kind)`; guard 2 lớp PDF / DOCX (`packages/core/src/documents/security/{document-guard,docx-container,render-isolation}.ts`); render DOCX cô lập qua `RENDER_ISOLATION_LAUNCHER` (fail closed 501 — DC-321, DV-024); `contract.inspect_file` / `attach_file` / `create_from_attachment` (`contracts/files/*`); duyệt & ký đóng băng đúng PDF gốc; tab Tệp (`components/files/ContractFilesTab.tsx`), "Tạo hợp đồng" từ tệp ở Hộp thư (`inbox/components/AttachmentContractMenu.tsx`).
- **F2 — AI soạn hai bước (#57):** `contract.prepare_draft` (model một lần qua gateway + meter, giá chỉ từ danh mục, đề xuất bất biến 24h — DC-322) → `contract.draft_from_content` (không gọi model) → `contract.resolve_suggestion` (CAS); `contract.submit` 422 khi còn gợi ý chờ; khối Giữ thành trang riêng sau PDF mẫu (DC-323); prompt `contract-draft` v2 + `matchCatalog` số trong tên gói (DC-324).
- **F3 — phụ lục ký riêng (#58):** `contract-appendix-signing.prisma` + migration `20261102003022_contract_appendix_signing` (signer / token / event gắn `appendix_version` + `document_hash`, append-only); 7 action nội bộ + 3 action công khai qua `ActionExecutor` với capability niêm phong WeakMap (DC-325), token miền HMAC `appendix:<id>` (DC-326), `value_delta` chỉ là thoả thuận (DC-327); `GET /v1/contracts/:id/appendices`, `/v1/public/appendix-sign/:token/*`; sweep hết hạn link; tab Phụ lục + trang `/sign/appendix/[token]` (SignForm dùng chung); mock domain đủ luồng.

**TEST RESULTS:**
- Acceptance criteria: 5/5
  1. Integration PDF tải lên → Owner ký → khách ký → PDF cuối = file gốc + trang chứng nhận; `source_hash` khớp bytes nguồn, `signed_artifact_hash` khớp file cuối; DOCX → PDF qua launcher cô lập; `.exe` đổi đuôi `.pdf` bị từ chối (`apps/api/test/integration/contract-files.test.ts`, core `contract-file-source.test.ts`, `document-container-security.test.ts`) — **pass**
  2. Integration từ tệp hội thoại → đúng khách; không thấy hội thoại → 403, tệp không thuộc tin / chỉ số vượt → từ chối trước khi đọc bytes (`contract.create_from_attachment` matrix + `contract-files.test.ts`) — **pass**
  3. Integration: loại "Mua bán" dùng mẫu loại (`contract-template-kind.test.ts`); phụ lục chỉ HĐ đã ký, ký đủ 2 bên (`contract-appendix.test.ts` 9 ca); AI soạn (model giả) đánh dấu `ai_suggested` (`contract-draft-suggestions.test.ts`, `contract.prepare_draft` / `draft_from_content` matrix) — **pass**
  4. E2E http `e2e/http/contract-files.spec.ts`: tải PDF → đề xuất → nháp → duyệt & ký (OTP email) → gửi ký Email → khách ký → tab Tệp Bản gốc + Đã ký (tải bytes PDF thật) → **phụ lục PL-1: tạo → trình duyệt → Owner ký OTP riêng → gửi Email → khách ký trên trang công khai → Đã ký + SHA-256, HĐ gốc vẫn Đã ký**; AI soạn (model giả) → Giữ / Bỏ → Chờ duyệt, không tự gửi — **2 passed**
  5. Cổng D59 (dưới); parity `contracts:list` 3.31% · `kanban` 1.87% · `detail` 1.53% · `create` 3.04% · `ai` 2.10% — **pass**
- Bổ sung review độc lập (security / chứng cứ):
  - Token hợp đồng cha không mở phụ lục và ngược lại; token PL-B không ký PL-A; ký song song hai tab → đúng một chữ ký; replay → 410; sửa nháp → version +1, token / OTP cũ hết hiệu lực; hết hạn → declined qua sweep (`contract-appendix.test.ts`).
  - Gọi thẳng `/actions` ba action công khai (kể cả Owner) → 403 không capability; catalog Trợ lý không lộ (`appendix-catalog.test.ts`, `appendix-public-capability.test.ts` — WeakMap gắn đúng object ctx / action / appendix / idempotencyKey; `preview` luôn 403).
  - ai:live model thật 9router `cc/claude-haiku-4-5-20251001`, suite `fixtures/ai-eval/contract-files.json` **4/4, 0 vi phạm** (`reports/ai-live-contract-files-2026-11-03.md`) — mẫu giữ nguyên, giá danh mục, dòng ngoài danh mục đánh dấu, yêu cầu tự gửi / ký không thực hiện.
- **Cổng commit (mỗi pha):** lint + typecheck + unit + depcheck của package đổi — xanh ở F1 / F2 / F3 (số liệu từng PR).
- **Chốt TIP (D59):**
  - `pnpm turbo run build lint typecheck test` — **49/49 task** (lượt đầu bắt `packages/db` `prisma-stubs.test.ts`: file prisma mới chưa có trong bản đồ sở hữu → thêm dòng 02-TASK-GRAPH + OWNERS 33 file, chạy lại xanh).
  - Unit: core 312 · web 261 · shared 126 · ai-live 37 · channels 31 · integrations 22 · db 18 · worker 7 · widget 5 · contract 4 · actions 3.
  - Integration api (phạm vi TIP — `GOAL-RELEASE.md` mục Cổng test, `74a93b4`): `contract-appendix` · `contract-files` · `contract` · `contracts` · `documents` + mọi `actions/contract.*` — **36 file, 187 passed / 0 failed**.
  - E2E mock `contract-files` 8 passed (6 skip desktop-only trên mobile-390) · `contracts` 6 passed. Ngoài phạm vi bắt buộc (chạy trước khi chốt luật phạm vi): full mock E2E 255 passed / 0 failed (lượt 1: 254 + 1 đỏ `settings.spec.ts:124` = Q-010 chập chờn, chạy riêng 12/12 ×2).
  - E2E http (cổng 4517 / 3518, Redis DB 15): `contract-files` 2 passed.
  - `pnpm parity --done` 108 PASS, 1 FAIL `inbox:connect-channel` 6.20% đỏ từ P0 ver2.1 (Q-020 / DC-295 → TIP-014c), không đổi.
  - `pnpm depcheck` 44 cảnh báo = baseline · `lint:size` 2282 file không vượt trần · `lint:tokens` 726 file đúng thang D41 · `lint:masks` 42 mask / 10 PD có căn cứ · `i18n:check` 100% (vi / en 5078 key).
- Tenant / role isolation: phụ lục đọc qua hợp đồng cha visible (404 nếu không thấy — `appendix/access.ts`); Sales scope own không thấy HĐ của người khác; Owner-only cho owner_otp / approve_and_sign / send (matrix 10 action).
- EXPLAIN: `contract_appendix_contract_id_idx (contract_id, created_at DESC, id DESC) INCLUDE (status, code, version)` + deferred join thân phụ lục LIMIT 50 (`appendix/read.service.ts`); sự kiện `(appendix_id, created_at, id) INCLUDE (type, party)`; token tra theo `token_hash` unique — EXPLAIN trong `contract-appendix.test.ts` ca cuối.
- **Chưa nghiệm thu với provider thật:** render DOCX trên Linux production qua `render-linux.sh` (chưa có VPS — Q-006); gửi link / OTP qua Zalo thật (Q-003 — E2E http dùng Email console); OCR PDF scan (không làm — trả "không đọc được", người dùng nhập tay).

**ISSUES DISCOVERED:**
- Workspace tạo trước migration mới (demo, ai-live) cần áp tenant migration `20261102003020_contract_files`, `20261102003021_contract_ai_draft`, `20261102003022_contract_appendix_signing` (chưa có CLI tenant-migrate — dùng `applyMigrations` + `withDatabase(MIGRATOR_DATABASE_URL, dbName)`). Sweep đặt phần phụ lục sau cùng để workspace chưa migrate không chặn quét hợp đồng.
- Q-020 `inbox:connect-channel` đỏ sẵn; Q-017 dọn DB test trước E2E http.

**GIẢ ĐỊNH ĐÃ CHỌN:** DC-321 … DC-327 (`DECISIONS.md`). **Lệch spec:** DV-024 (launcher Windows `job-dev` chỉ cho dev). **Lệch prototype:** không — tab Phụ lục / trang ký phụ lục là màn prototype không có, bố cục theo khung drawer + trang ký sẵn có (gap-filling §2).
- Contract FE ↔ BE: zod dùng chung `packages/shared/src/api/{contract-files,contract-appendix}.ts`, `APPENDIX_FLOW` ở `packages/shared/src/contracts/contract-state.ts`; mock kiểm bằng `contracts-appendix-shape.test.ts`.

**ĐỐI CHIẾU STANDARDS** (mục APPLICABLE STANDARDS của TIP):

| Standard | Tuân thủ (file:dòng / test) | Lệch |
|---|---|---|
| `documents/templates.md` | Mẫu theo loại + fallback mặc định chung (`packages/core/src/contracts/services/contract-doc.ts`); điều khoản mẫu nguyên văn, khối `ai_suggested` Giữ / Bỏ (`contracts/files/suggestions.ts`, DC-323); HĐ đã ký chỉ đổi bằng phụ lục (`attach_file` chặn sau pending_signature; `appendix/write.handlers.ts`) | — |
| `actions/action-registry.md` | Mọi ghi là action (`packages/actions/src/contract-appendix.ts`, `contracts.ts`); trang ký công khai đi qua `ActionExecutor` bằng capability niêm phong (`packages/core/src/contracts/appendix/capability.ts`, DC-325); action công khai `agentGrantable: false` + SYSTEM_ONLY (`packages/core/src/ai/assistant/catalog.ts`) | — |
| `authz/rbac-permissions.md` | Không thêm quyền mới: draft / review / sign dùng `contract.*` sẵn có; Owner-only cho ký / gửi; phụ lục kế thừa scope hợp đồng cha (`appendix/access.ts`) | — |
| `api/response-envelope.md` | `{ data }` cho list / trang ký (`apps/api/src/http/contracts/appendix-sign.controller.ts`); link hỏng → 410 `SIGN_LINK_INVALID`; CAS → 409 kèm version | — |
| `ai/agent-gateway.md` · `ai/eval.md` | Model qua gateway + meter, một lần ở `prepare_draft` (DC-322); prompt đổi = lên version (`contract-draft` v2); suite riêng 4 ca không đụng 30 ca default, lỗi hệ thống sửa ở hệ thống (DC-324) | — |
| `database/tenant-db.md` · `indexing.md` | Bảng mới không `workspace_id`; index `=` trước, sort sau + INCLUDE (`packages/db/prisma/tenant/migrations/20261102003022_contract_appendix_signing/migration.sql`); deferred join LIMIT 50 (`appendix/read.service.ts`); unique `(contract_id, seq)` / `(contract_id, request_key)` | — |
| `events/outbox.md` | Gửi link / OTP qua `ChannelSendQueue` + outbox của kênh (`appendix/send.handlers.ts`), không gửi trực tiếp | — |
| `domain/concurrency.md` · `state-machine.md` · `money-time-numbering.md` | `APPENDIX_FLOW` dùng chung server ↔ mock; số PL-n cấp dưới khoá hàng hợp đồng cha; CAS `if_version`; ký song song → một chữ ký (test); `value_delta` string VND có dấu, không đụng sổ tiền (DC-327) | — |
| `ops/observability-security.md` | Guard tệp trước model / lưu trữ; render cô lập fail closed (DC-321); OTP băm, 10 phút / 5 lần; nhật ký ký append-only (trigger); token chỉ lưu băm | DV-024 |
| `ui/frontend-structure.md` · `interaction-patterns.md` · `prototype-parity.md` · `i18n/i18n.md` | Màn orchestrator, component tách `components/appendix/*`, hook `hooks/useAppendices.ts`, style token `styles/appendix.styles.ts`; mọi ghi `useAction`; parity contracts:* < 5%; i18n vi / en 100% | — |
| `code/file-size-module-layout.md` · `code/testing.md` | `lint:size` không vượt trần (handler phụ lục tách 9 file); test ở file riêng (core 3 file, api 1 + 10 matrix, web shape mock) | — |
| `workflow/git-flow-ci.md` | Một PR mỗi pha, xếp chồng #56 → #57 → #58, PR vào `dev` | — |

**SUGGESTIONS FOR CHỦ THẦU:**
- Thêm CLI `tenant-migrate` (áp migration cho mọi workspace active) — ba migration 030b cần áp tay cho demo.
- Khi có VPS: chạy `render-isolation.test.ts` trên Linux với `render-linux.sh` để khép phần "chưa nghiệm thu".
