### COMPLETION REPORT — TIP-032d

**STATUS:** DONE (ai:live `commerce-files` chưa chạy được — Postgres dùng chung cạn slot, xem CHƯA NGHIỆM THU) — 4 pha, mỗi pha một PR xếp chồng: pha 1 #197 (`tip/032d-commerce-record-files`, trên #196) · pha 2 #198 · pha 3 #199 · pha 4 chốt `tip/032d-p4-close` (trên #199). SHA ở bảng tiến độ `goals/GOAL-RELEASE.md` dòng 47.

**TÓM TẮT:** Tab Tệp của drawer đơn hàng / đề nghị thanh toán thành tính năng thật. Luồng: tải lên kèm đích → kiểm cấu trúc cô lập → liên kết theo bản ghi → liệt kê / mở / tải theo quyền hiện hành → gỡ (giữ tệp). Trợ lý dùng cùng action và biên nhận, thêm đường sao chép tệp có đồng ý:
- **Backend (pha 1, §1–§2):**
  - Bảng liên kết riêng mỗi cha `order_attachment` / `invoice_attachment`: index một phần list + INCLUDE, live unique.
  - Giành tệp một-chủ trung lập `file_claim` (PK `file_id`).
  - `attachment_staging`: status + validator_version + digest.
  - `record_attachment_state`: revision bộ tệp mỗi cha (CAS). Không đổi tiền / trạng thái / version cha.
  - 6 action `order|invoice.file_attach / file_detach / files_list`: xem trước, sự kiện, không undo.
  - Tải `record_attachment` kèm đích: kiểm quyền ghi cha trước khi lưu.
  - Kiểm cấu trúc (không phải quét virus) ở `prepare`, ngoài transaction, trong tiến trình con `node --permission`. Bundle có ở cả api + worker. Thiếu bundle → 503 `VALIDATION_ISOLATION_UNAVAILABLE`.
  - Tệp đã thuộc bản ghi chỉ tải được theo quyền đọc cha hiện hành. Người tải lên không là đường tắt; link ký raw từ chối.
  - PDF đề nghị / phiếu thu đã sinh: liệt kê chỉ đọc, bản gốc mất thì nói thật.
- **Giao diện (pha 2, §3):**
  - `shared/commerce-files` (RecordFilesPanel + useRecordFiles) ở OrderDrawer / InvoiceDrawer, drawer chỉ truyền loại + id.
  - Chỉ biên nhận 200 mới hiện "đã gắn"; lỗi có lý do; 409 → đọc lại.
  - Gỡ có xác nhận (tệp gốc vẫn giữ); chứng từ đã sinh chỉ Mở.
  - Bỏ `FilesTab` tĩnh + `meta.files` giả.
- **Sao chép tệp Trợ lý có đồng ý (pha 3, §3.3):**
  - Registry nguồn trung lập ở kernel; adapter nguồn của Trợ lý đăng ký từ input providers. Sales không import AI.
  - Kiểm nguồn hiện hành: chủ / revision / phase / phiên run / tệp gốc + digest. HTML / EML / markdown bị chặn.
  - Sau xác nhận → tệp MỚI riêng cho đích, cùng bytes, id tất định theo thao tác → kiểm cấu trúc → gắn qua staging như đường tải tay.
  - `bindPreview` ràng `artifact:revision:digest`; nguồn đổi / thu hồi → 409. Đổi đích → xem trước lại. Artifact gốc không đổi.
- **Chốt (pha 4):** E2E http (bytes khớp sha256), suite ai:live `commerce-files` 8 ca, COVERAGE `PRO-orders-files` / `PRO-invoices-files` → ĐẠT.

**FILES CHANGED** (theo pha; lệch manifest ở DV-110, DV-111)
- **Pha 1:**
  - actions `order-files.ts`, `invoice-files.ts`, `commerce-file-schemas.ts`, `index.ts`.
  - kernel files `file-claims.ts`, `attachment-validation.ts`, `attachment-validator-entry.ts`, `attachment-zip-bounds.ts`, `upload-guard.ts`.
  - sales `files/{association,handlers-kit,module,staging,validation}.ts`, `orders/files/{handlers,read,source}.ts`, `payments/files/{handlers,read,source}.ts`, `privacy/inventory.ts`, `sales.module.ts`, `public.ts`.
  - db `commerce-files.prisma`, `file-claims.prisma` + migration `20261112020000_commerce_record_files`.
  - api `files.controller.ts`, `attachment-validator-main.ts`, `tsup.config.ts`; worker `attachment-validator-main.ts`, `tsup.config.ts`.
  - shared events `commerce-files.ts` + `events.ts` + `aggregate.ts`, `errors.ts`, `envelope.ts`; i18n `actions.json` vi / en.
  - test: api `commerce-files.test.ts` + 6 ma trận + fixtures; core `commerce-files{,-privacy}.test.ts`, `commerce-attachment-validation.test.ts`; actions `commerce-files.test.ts`; worker `commerce-files-composition.test.ts`.
- **Pha 2:**
  - web `shared/commerce-files/{types,useRecordFiles,record-files.styles,RecordFilesPanel,RecordFilesPanel.test}.ts(x)`.
  - drawer: orders / invoices `DetailTabs.tsx`, `OrderDrawer.tsx`, `InvoiceDrawer.tsx`, `types.ts`.
  - transport `transport.ts`, `http-transport.ts`; mock `domains/record-files.ts` (+ `handlers.ts`, `mock-transport.ts`, orders / invoices).
  - server `order-insights.ts`, `invoices-read.service.ts` (bỏ `meta.files`); shared `api/{orders,invoices}.ts`.
  - i18n `common.recordFiles`; parity manifest `orders:files`, `invoices:files`; e2e `commerce-files.mock.spec.ts`.
- **Pha 3:**
  - kernel `files/attachment-source-registry.ts` (mới), `files.service.ts` (`id?`).
  - ai input `record-attachment-source.ts` (mới), `artifact-store.ts` (`sourceLocator`), `providers.ts`, `hydrate.ts` (`revision=`).
  - sales `files/artifact-copy.ts` (mới), `handlers-kit.ts`, handler đơn / đề nghị (`bindPreview`, `prepared`).
  - test: core `commerce-attachment-artifact.test.ts`, api `commerce-attachment-artifact.test.ts`, ma trận file_attach.
- **Pha 4:**
  - e2e http `commerce-files.spec.ts`.
  - ai:live `fixtures/ai-eval/commerce-files.json` + `commerce-files-seed.mjs`, `tools/ai-live/src/record-files-judge.ts` (mới), `cases.ts` / `runner.ts` / `cli.ts`.
  - COVERAGE parts + merge.

**TEST**

| Cổng | Kết quả |
|---|---|
| Integration API (Postgres 16 + Memurai thật, validator bundle thật) | `commerce-files` 11 + ma trận 6 action + `commerce-attachment-artifact` 4. Gồm: EXPLAIN 100k → `*_attachment_list_idx` không Seq Scan / Sort; hai lượt gắn song song → một thành công; macro / quan hệ ngoài bị chặn; thiếu bundle → 503; người tải mất quyền → 404; chứng từ đã sinh không gỡ; sao chép Trợ lý bytes khớp, gửi lại → biên nhận cũ, đổi đích → xem trước lại, nguồn gỡ → 409, HTML → 422. Lượt chốt pha 3: 27/27 + 4/4 |
| Unit | core 1175 (artifact 25, commerce-files 21, privacy 2, validation) · actions 36 · web 513 (panel 8, mock shape 12) · ai-live 88 · composition worker 2/2 |
| E2E mock (`E2E_PORT=3537`) | `commerce-files.mock` 4 passed (desktop 3 + mobile 390), 4 skip theo thiết bị · hồi quy orders / invoices 15 passed (pha 2) |
| E2E http (`E2E_HTTP_PORT=3538`, `TENANT_CLIENT_CACHE=10`) | `commerce-files` 2 passed: đơn tải → gắn → mở lại → Mở đúng bytes (sha256) → HTML giả PDF bị từ chối → đơn khác trống → gỡ có xác nhận; đề nghị gắn / gỡ |
| Parity | `orders:files` 3.98% · `invoices:files` 2.07% · không hồi quy `orders:detail` 3.52% · `invoices:detail-qr` 3.22% |
| ai:live commerce-files (8 ca × 3 lượt, model thật qua 9router) | **Chưa chạy được (môi trường)** — suite sẵn sàng: `--dry` nạp 8 ca, seed + judge typecheck + ai-live test 88/88. Bốn lượt dựng stack (`AI_LIVE_TENANT_CACHE` 12 → 5 → 2 → 3) đều lỗi P2037 / 53300 "Too many database connections". Postgres dùng chung bị dự án khác giữ 35–49/100 slot (`appchat` + `appchat_bkn005_*_test`, đo `pg_stat_activity`). Stack ai-live (api + 3 worker, mỗi tiến trình pool platform 10 + client tenant) cần phần còn lại. Lượt Trợ lý 500, vết rỗng, không gọi model. Chạy lại khi slot rảnh: `AI_LIVE_TENANT_CACHE=5 AI_LIVE_EMAIL=assistant-plans@ai-live.appchat.test node tools/scripts/ai-live-stack.mjs --no-build -- --cases fixtures/ai-eval/commerce-files.json --attempts 3` |
| Typecheck / lint / depcheck | sạch · 0 lỗi · depcheck 0 lỗi (131 cảnh báo; 4 `no-circular-web` mới cùng dạng nợ mock có sẵn — pha 2) |
| lint:size / lint:tokens / i18n:check | sạch / sạch / 100% |

**ISSUES DISCOVERED**
- Đỏ có sẵn ngoài phạm vi: mục lục ma trận `assistant-vertical` thiếu 44 action của TIP khác. 6 action 032d đã có ma trận.
- E2E http / ai:live trên máy dev: worker và API quét MỌI workspace test cũ (~43 ở `appchat_platform_test`), mỗi workspace một client tenant, nên tự cạn 100 slot Postgres dù không có dự án khác chạy. Biểu hiện: onboarding kẹt `trial-welcome`, đăng ký 500. Cách chạy: `TENANT_CLIENT_CACHE=10` (E2E http) / `AI_LIVE_TENANT_CACHE=5` (ai:live). Đã ghi vào memory dự án; không đổi code.
- Thẻ `<attachment>` gửi model trước chỉ có `artifact_id`, nên model không dựng được `assistant_artifact_ref` (cần cả revision). Đã thêm `revision=` (DV-111).
- Server parity `next start -p 3537` của pha 2 còn chạy mồ côi (tiến trình cha đã thoát) → chặn E2E mock. Đã tắt đúng PID tôi khởi chạy (kiểm dòng lệnh + giờ chạy).

**ĐỐI CHIẾU STANDARDS** (APPLICABLE STANDARDS của TIP):

| Standard | Tuân thủ (file / test) | Lệch |
|---|---|---|
| `plans/COMMERCE-DECISIONS.md` | Tệp đính kèm là bổ sung, không sửa tiền / trạng thái / version đơn / đề nghị (integration so trước–sau). Không thay `invoice.file_id` / `receiptFileId`. Đề nghị thanh toán ≠ hoá đơn GTGT: chứng từ đã sinh giữ nguyên | — |
| `actions/action-registry.md` | 6 action trong `packages/actions` (zod in / out, quyền, risk write / delete / read, agentGrantable opt-in). Ghi chỉ qua Executor; FE ghi bằng `useAction`; ma trận mỗi action | — |
| `api/response-envelope.md` | `{ data }` / `{ error: { code, message, fields } }`. 503 `VALIDATION_ISOLATION_UNAVAILABLE` có mã riêng. Không URL công khai / storage key trong output | — |
| `authz/rbac-permissions.md` | order.manage / invoice.manage + scope ghi cha để gắn / gỡ, order.view / quyền đọc đề nghị để liệt kê. Tệp đã giành: quyền đọc cha hiện hành, người tải không là đường tắt; ẩn = 404 | — |
| `database/tenant-db.md` · `indexing.md` | Không `workspace_id`. Index một phần `(parent_id, created_at DESC, id DESC) INCLUDE (file_id, version, created_by) WHERE detached_at IS NULL`; keyset; EXPLAIN 100k | Tên migration (DV-110) |
| `domain/concurrency.md` | Khoá khách gốc → cha `FOR UPDATE` → bộ tệp (CAS revision) → claim unique. Song song cùng revision → một thắng. Gửi lại → biên nhận cũ; bản sao Trợ lý id tất định theo thao tác (DC-443) | — |
| `documents/templates.md` | Chứng từ đã sinh giữ bản gốc bất biến (không render lại); bản gốc mất → `available: false`, không bịa đường dẫn | — |
| `ops/observability-security.md` | Kiểm cấu trúc trong tiến trình con `node --permission` (không mạng, FS giới hạn, giới hạn thời gian / bộ nhớ). ZIP preflight (số mục / dung lượng giải nén / tỉ lệ / traversal / macro). Không gọi "đã quét virus". Tải `no-store`; không log bytes / storage key | — |
| `ai/agent-gateway.md` | Trợ lý gắn qua action có xem trước / xác nhận; không file_id tự bịa (chỉ handle tải cho đích hoặc artifact ref được kiểm). Registry nguồn trung lập, không import sales → AI; agent cần action được cấp + người ra lệnh hiện hành | — |
| `ai/eval.md` | ai:live 8 ca §Commands × 3, chấm theo danh sách tệp của bản ghi đọc lại từ API (không theo câu trả lời) | — |
| `ui/frontend-structure.md` | Panel + hook ở `shared/commerce-files`, drawer chỉ truyền loại + id. File < 250 dòng; test file riêng | — |
| `ui/prototype-parity.md` | Màn tab Tệp < 5% (prototype L5967–5978); nút Gỡ / trạng thái thêm ghi PD-029 | PD-029 |
| `i18n/i18n.md` | `common.recordFiles.*`, `actions.order|invoice.file_*` vi + en; 100% | — |
| `code/testing.md` | Test ở file riêng; integration / E2E chỉ phạm vi TIP (không full) | — |
| `BUILDER-HANDOFF` / D59 | 3 cổng theo pha; chốt có E2E mock + http, parity, ai:live | — |

**GIẢ ĐỊNH ĐÃ CHỌN:**
- Kiểm cấu trúc chạy trong `prepare` của action gắn, ngoài transaction, sau xác nhận (DC-442). Không có hàng đợi riêng.
- Định danh bản sao theo thao tác: `Idempotency-Key` → `confirm_token` (DC-443). 045b chưa có sổ thao tác tenant cho action thường.
- Erase / quên khách của Bán hàng vẫn là stub pha sau của 015c. Liên kết đã vào kho dữ liệu Bán hàng (`sales/privacy/inventory.ts`) — DV-110.

**SAU MERGE:** `db:migrate-tenants` + `db:setup` cho migration `20261112020000_commerce_record_files` (đã chạy trên máy dev: dev + test + template); build api / worker (bundle `attachment-validator.cjs`) / web.

**CHƯA NGHIỆM THU:** ai:live `commerce-files` 8 ca × 3. Chưa chạy được vì Postgres dùng chung cạn slot (môi trường, không phải lỗi code / provider). Model thật 9router đã có key. Ghi ở HANDOFF-NEXT để chạy lại khi slot rảnh.
