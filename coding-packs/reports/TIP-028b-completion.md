### COMPLETION REPORT — TIP-028b

**STATUS:** DONE

Hai pha, PR xếp chồng:

| Pha | PR | Nhánh | Xếp chồng trên |
|---|---|---|---|
| 1 — phiên bản mẫu / bảng kiểm / hoàn tác tạo mẫu | #205 | `tip/028b-document-integrity` | #204 (027b pha 4) |
| 2 — queue `doc-render` (chốt) | — | `tip/028b-p2-doc-render` | #205 |

SHA ở `goals/GOAL-RELEASE.md` dòng 49.

**TÓM TẮT:** Ba việc của chứng từ:

- PDF báo giá phát hành chuyển sang worker ROLE=jobs (API trả ngay).
- Đề nghị thanh toán / phiếu thu ghi phiên bản mẫu.
- Bảng kiểm pháp lý hiện trong hộp xác nhận gửi / duyệt. Tạo mẫu hoàn tác được.

**Pha 1 — §2 phiên bản mẫu + bảng kiểm, §3 hoàn tác (AC3 / AC4 / AC5)**

- **Phiên bản mẫu:**
  - `invoice` / `customer_payment` thêm `template_id` + `template_version` (migration `20261112050000_doc_template_version`).
  - Chụp mẫu mặc định lúc tạo đề nghị (`invoice.create`) và lúc ghi khoản thu (phiếu thu).
  - Render / gửi lại / tải PDF dùng mẫu đã chụp (`renderDocPdf(…, templateId)`).
  - Index partial `template_id` trên 4 bảng chứng từ.
- **Bảng kiểm pháp lý:**
  - `checklist[{code, ok, hint}]` có ở preview `quote.send`, `contract.submit`, `contract.approve_and_sign`, `contract.send_for_signature`, `invoice.send_payment_qr` (gửi lần đầu).
  - Tính theo mẫu sẽ dùng + dữ liệu thật (`documents/services/doc-checklist.ts`):
    - Mẫu thiếu mục → `hint: template`.
    - Mẫu có biến nhưng giá trị trống → `hint: empty:<biến>`.
  - **Cảnh báo, không chặn (DC-444).**
  - UI xin xem trước: header `x-action-preview` + `REQUESTABLE_PREVIEW_ACTIONS`; `useAction` tự xin. Hộp `ConfirmActionHost` hiện `ChecklistPanel`.
- **Hoàn tác tạo mẫu:**
  - `doc_template.create` có undo 24h: xoá mềm + trả mặc định nhóm về mẫu trước.
  - Mẫu đã có chứng từ dùng → 409 `HAS_DEPENDENCIES` `used_by:<loại>`.

**Pha 2 — §1 queue `doc-render` (AC1 / AC2, DEF-028-1)**

- **Bảng `document_render`:**
  - Một dòng mỗi chứng từ: thế hệ, `pending_render` / `rendered` / `render_failed`, số lượt, mã lỗi đã làm sạch, tệp, tham số phát hành.
  - Migration `20261112060000_doc_render`; index partial `pending_render` cho vòng quét.
- **`quote.send`:**
  - Trong transaction: khoá → kiểm ngưỡng / kênh nhận → `sent` + hạn + chụp mẫu.
  - Ghi `document_render` (kênh, định dạng, người gửi) + outbox `document.render_requested`.
  - Event `quote.sent`, timeline, giai đoạn khách ghi ngay. **API trả ngay, không render.**
- **Queue `doc-render`** (`documents/jobs/doc-render.processor.ts`, ROLE=jobs):
  - Consumer `documents.render` đẩy job `render-<id>-<thế hệ>`; đẩy lặp không nhân đôi.
  - 2 việc / tiến trình; thử lại 3 lần (back-off mũ).
  - Vòng quét mỗi phút đẩy lại dòng đứng yên > 2 phút (mất Redis / worker chết).
- **Runner** (`documents/render/runner.ts`):
  - Render ngoài transaction. Tệp id tất định theo (render, thế hệ, phần) → chạy lại không thêm tệp.
  - Phát hành trong transaction có collector: khoá dòng, kiểm thế hệ, domain gắn tệp + ghi tin → `rendered` + `document.rendered`.
  - Còn lượt → ném cho BullMQ thử lại. Lượt cuối, hoặc lỗi vĩnh viễn (chứng từ không còn hợp lệ) → `render_failed` + `document.render_failed`.
- **Kind `quote`** (`sales/quotes/services/quote-render.ts`):
  - PDF theo mẫu + hạn đã chụp; ảnh trang (format image); link công khai webchat.
  - Tin + tệp vào hội thoại của khách theo người gửi đã chụp. Tin đẩy hàng gửi kênh sau commit.
- **Thử lại:** action `quote.retry_render` (quyền `quote.send`, scope ghi). Chỉ từ `render_failed` → thế hệ mới; job thế hệ cũ bỏ qua.
- **Web:**
  - `RenderStatus` trong drawer báo giá: "Đang tạo PDF…" / lỗi + "Thử lại".
  - WS `document.render` (luật `documents/events/render.rules.ts`, quyền `quote.view`) làm mới báo giá.
  - Mock mô phỏng job (`mock/domains/quote-render.ts`).

**FILES CHANGED** (lệch manifest ở DV-115, DV-116)

- **Pha 1:**
  - DB: `sales-payments.prisma`, migration `20261112050000_doc_template_version`.
  - Actions: `define.ts`, `documents.ts`.
  - Shared: `api/assistant.ts`, `documents/template-text.ts`.
  - Core:
    - `documents/{services/doc-checklist,services/template-usage,actions/doc-template.handlers,public}.ts`
    - `contracts/actions/{contract-approval,contract-send}.handlers.ts` + `previews/{contract-approval,contract-send}.handlers.preview.ts` + `contract-checklist.ts`
    - `sales/payments/{actions/invoice-write.handlers,previews/invoice-write.handlers.preview,services/{invoice-doc,invoice-delivery,invoices-read.service,payment-write,receipt-file}}.ts`
    - `sales/quotes/{actions/quote-send.handlers,previews/quote-send.handlers.preview}.ts`
    - `kernel/actions/{action-context,executor,policy}.ts`
  - API: `http/kernel/{actions.controller,cors-policy}.ts`, `openapi/action-ops.ts`.
  - Web: `shared/actions/{ConfirmActionHost,ChecklistPanel,useAction}.tsx/ts`, `shared/api/{transport,http-transport,mock/handlers,mock/mock-transport,mock/domains/doc-checklist}.ts`, `messages/{vi,en}/actions.json`.
- **Pha 2:**
  - DB: `documents.prisma`, migration `20261112060000_doc_render`.
  - Shared: `events/document-render.ts`, `events.ts`, `events/protocol/{aggregate,extensions}.ts`, `api/quotes.ts`, `index.ts`.
  - Actions: `quotes.ts` (`quote.retry_render`).
  - Core:
    - `documents/{render/{kinds,request,runner},jobs/{doc-render.processor,documents.jobs.module},events/render.rules,public}.ts`
    - `sales/quotes/{actions/{quote-send.handlers,quote-render.handler},services/{quote-render,quote-image,quote-view,quotes-read.service}}.ts`
    - `sales/sales.module.ts`, `notify/events/domain.rules.ts`, `kernel/actions/tip-owners.ts`, `index.ts`
  - Worker: `event-protocol.manifest.ts`.
  - Web:
    - `features/quotes/{components/{RenderStatus,QuoteDrawer},styles/render.styles,types}.ts(x)`
    - `shared/api/mock/{handlers,domains/{quote-render,quotes,quotes-actions}}.ts`, `shared/realtime/event-invalidation.ts`
    - `messages/{vi,en}/{actions,quotes}.json`
- **Test:**
  - Integration: `doc-render.test.ts` (pha 1), `doc-render-queue.test.ts` (pha 2), `helpers/doc-render.ts`, ma trận `quote.retry_render`.
  - Chỉnh `quotes` / `commerce-delivery` (chạy job sau gửi); ma trận `contract.submit` / `approve_and_sign` / `invoice.send_payment_qr` / `doc_template.create`.
  - Unit: `core/test/doc-checklist.test.ts`, `web/ChecklistPanel.test.tsx`.
  - E2E: `support/confirm.ts`; spec mock + http báo giá / hợp đồng / đơn / đề nghị.

**TEST**

| Cổng | Kết quả |
|---|---|
| Integration TIP (Postgres 16 + Memurai + LibreOffice thật) | **Pha 2:** `doc-render-queue` 5 + `doc-render` 8 = 13/13. Nội dung: (1) AC1: trả ngay, chưa PDF / tin, consumer đẩy job tất định, job → tệp + tin + `rendered` + DTO; (2) AC2: chết sau lưu tệp → chạy lại 1 tệp / 1 tin; (3) lỗi 3 lượt → `render_failed` mã sạch → Thử lại → thế hệ 2, job cũ bỏ qua; (4) chứng từ hết hợp lệ → lỗi vĩnh viễn; (5) vòng quét + EXPLAIN `document_render_pending_idx`. Ma trận `quote.retry_render` 5/5. Hồi quy `quote.send`: quotes / commerce-delivery / ma trận quote.send / commerce-gaps / contracts / crm-stage-producers / watcher-write-denial 7 file / 68 test. **Pha 1:** 12 file liên quan 45 + hồi quy commerce 61 |
| Unit | shared 199 · actions 40 · db 31 · core 1202 (+1 skip) · worker roles / ai-role-handlers 7 · web quotes + shared 353 (pha 2). Pha 1 web 83 + 387 |
| Unit — chập chờn ngoài phạm vi | core `assistant-input-parsing.test.ts` "XLSX thật" (023f) timeout khi chạy cả suite; chạy riêng 10/10 xanh (đã ghi ở 027b) |
| Worker integration | `event-protocol-composition` 2/2: manifest phủ consumer mới `documents.render` |
| E2E mock (`E2E_PORT=3537`) | Pha 2: quotes + orders 14 passed; contracts / commerce-gaps / invoices / contract-files 31 passed. Có "Đang tạo PDF" → tự xong; lỗi → Thử lại. Pha 1: 45 passed |
| E2E http (`E2E_HTTP_PORT=3538`, `TENANT_CLIENT_CACHE=10`) | Pha 2: `quotes` + `documents` 2/2 desktop (worker jobs thật render qua queue). Pha 1: quotes / contracts / contract-files 4/4. Mobile bỏ qua theo spec |
| Parity | quotes:list 2.38% · quotes:detail 4.00% (pha 2, không đổi). Pha 1: contracts 3.31 / 1.53 · invoices 1.89 / 3.22 |
| Typecheck / lint / depcheck | turbo lint + typecheck 7 gói 14/14 (web 0 lỗi, 24 cảnh báo có sẵn). Depcheck 0 lỗi, 139 cảnh báo: base 136 + 3 `no-circular-web` của mock, cùng dạng nợ có sẵn |
| lint:size / lint:tokens / i18n:check | sạch / sạch / 100% |

**ISSUES DISCOVERED**

- **DC-444:** TIP §2.2 / AC4 ghi "chặn". COMMERCE / templates.md §6 / REQ-F06b là luật cao hơn và ghi "cảnh báo, không chặn" → theo luật cao hơn.
- **DV-116, phạm vi queue:** chuyển `quote.send` (AC1).
  - `contract.approve_and_sign`: OTP + chữ ký phải khớp đúng bản PDF đóng băng trong cùng lượt.
  - Đề nghị / phiếu thu / xác nhận đơn: vẫn render trong `prepare`.
  - `registerRenderKind` sẵn để TIP sau thêm loại mà không đổi kernel.
- **Event v2:** consumer `documents.render` khai `requires_adapter` (chủ 006b) như các consumer v1 khác.
- **Đổi hành vi UI:** gửi báo giá trả ngay; PDF + tin tới khách sau vài giây. E2E http đợi dải "Đang tạo PDF" mất trước khi Tải PDF.

**ĐỐI CHIẾU STANDARDS** (APPLICABLE STANDARDS của TIP):

| Standard | Tuân thủ (file / test) | Lệch |
|---|---|---|
| `documents/templates.md` §2 | Chứng từ ghi `template_id + template_version` (báo giá / hợp đồng có sẵn; đề nghị / phiếu thu thêm). Render theo mẫu đã chụp. LibreOffice native, không đổi engine (DV-007). Queue `doc-render` 2 việc, timeout 60 s / lượt | — |
| `documents/templates.md` §6 | Bảng kiểm là cảnh báo, không chặn. Mục bắt buộc (dòng không thay thế HĐ GTGT) render tự chèn | DC-444 (TIP ghi "chặn") |
| `documents/templates.md` §7 / COMMERCE §3 | PDF đóng băng `file_id + sha256` lúc phát hành. Ảnh trang từ cùng PDF. Hạn 15 ngày chụp lúc gửi | — |
| Blueprint §2.4 (L124) · §11 (L1345) | Queue `doc-render` ROLE=jobs; worker 2 việc; LibreOffice headless | Chỉ báo giá qua queue (DV-116) |
| `actions/action-registry.md` | `doc_template.create` undo 24h. `quote.retry_render` trong `packages/actions` (zod, quyền, risk, không cấp agent), có ma trận. Ghi chỉ qua Executor; FE `useAction` | — |
| `events/outbox.md` | Event `document.*` khai schema + aggregate + Blueprint §2.3. Outbox ghi cùng transaction (action / collector của job). Consumer idempotent theo jobId + kiểm thế hệ. WS là luật realtime, lọc quyền | — |
| `database/tenant-db.md` · `indexing.md` | Không `workspace_id`. Unique `(kind, document_id)`. Index partial `(updated_at) INCLUDE (kind, document_id, generation) WHERE status='pending_render'` — EXPLAIN. Index partial `template_id` 4 bảng — EXPLAIN | Tên migration khác manifest (DV-115 / 116) |
| `domain/concurrency.md` | `FOR UPDATE` dòng render + báo giá trong phát hành. Thế hệ chặn job cũ. Tệp id tất định chống nhân đôi khi chạy lại | — |
| `domain/state-machine.md` | `QUOTE_FLOW` không đổi (`sent` lúc action). Render có máy trạng thái riêng: pending → rendered / render_failed → (Thử lại) pending | — |
| `authz/rbac-permissions.md` | Thử lại cần `quote.send` + scope ghi báo giá. WS `document.render` yêu cầu `quote.view`. Không đổi grant | — |
| `api/response-envelope.md` | `{ data }` / lỗi `{ error }`; DTO thêm `render {status, error}`; lỗi là mã đã làm sạch | — |
| `ops/observability-security.md` | Mã lỗi render không chứa đường dẫn / stack (test kiểm). Log job không có nội dung chứng từ | — |
| `ui/frontend-structure.md` · `interaction-patterns.md` · `prototype-parity.md` | `RenderStatus` tách component + style; trạng thái đang tạo / lỗi có lý do + Thử lại; parity < 5% | — |
| `i18n/i18n.md` | `quotes.detail.render.*`, `actions.quote.retry_render`, `actions.checklist.*` — vi + en, 100% | — |
| `code/testing.md` / D59 | Test file riêng, chỉ phạm vi TIP; 3 cổng mỗi pha; commit + PR mỗi pha | — |
