# Rà độc lập sáu TIP pending cũ — 2026-11-02

Reviewer: `/root/audit_remaining_requirements`. Chỉ đọc code/tài liệu; không runtime. **Chưa đạt planning gate.** Các mục dưới là việc phải sửa, không phải thiết kế đã triển khai.

## Finding chung

Cả015b/023b/023c/030b/032b/045b thiếu header Dòng COVERAGE nhận, exact M/C manifest, mục Rà trước khi làm, lệnh targeted test. Các đoạn overlap không thay manifest. Phải hoàn thiện sáu file rồi tính lại whole-graph; không đánh parallel-safe theo metadata hiện tại.

## 023b — assistant coverage

- REQ-E03b đòi diff **và Sửa**; task7/AC3 hiện chỉ diff. Bổ sung edit theo schema → mất hiệu lực token cũ → preview lại → confirm input mới, có negative test token cũ.
- Manifest phải có actions/define.ts (ActionPreview hiện `changes`, TIP đề xuất `diff/money/recipients` chưa thống nhất); actions/index.ts; core/ai/assistant/{card,assistant.service,types}.ts; ai/jobs/ai.jobs.module.ts; web/features/assistant/{components/ChatThread.tsx,types.ts}; từng read handler/action/domain module; root package.json; từng file runner/scorer/report/cases.yaml/seed của tools/ai-live.
- 27/30 là gate riêng đã chốt, nhưng zero authorization leak và zero unconfirmed write bắt buộc; không cho ba lỗi safety lọt qua tổng điểm.

## 023c — GenUI và assistant UX

- REQ-E05b highlight và REQ-E10a list/search/reopen session đang được nhận nhưng chưa có task/AC. AssistantController:70–77 có endpoint session cần nối thật, không chỉ chuyển session_id.
-038b phụ thuộc attachment023c nhưng023c mới có boundary note. Cần generic upload/filehandle/authorization extension;038b đăng ký TransferPanel sau,023c không import component tương lai.
- Manifest: actions/define.ts secret metadata; kernel/actions/executor.ts redaction; assistant controller/service/types/meta-tools; web/shared/api/http-transport.ts; assistant types; từng drawer CRM/Quote/Contract/Order/Calendar/Tickets/Marketing, InboxAiModal, hooks/stores, channel.status handler, locales/tests, renderer từng khối.
- AC bổ sung stream abort/reconnect/replay không ghi hai lần; refs kiểm lại quyền khi reopen; QR lifecycle; secret không nằm history/log/event/step.

## 030b — contract files

- Manifest: tenant/contracts.prisma và schema template xác minh tên thật; migration source/template_kind/appendix; contracts module, contract-doc/sign-pdf/public-sign service/controller; ContractFormModal/useContractForm/DetailTabs; inbox attachment component cụ thể; PDF/DOCX fixtures và tests.
- Không bắt030b chờ045b vì có chuỗi ngược. Guard upload reusable do030b tạo,045b mở rộng; chỉ một validator.
- create_from_attachment phải test cross-tenant, invisible conversation, file không thuộc message, attachment index sai.
- Source hash bất biến khác signed-artifact hash sau ghép chứng nhận; AC chỉ rõ từng loại.
- Appendix cần identity/token/OTP/expiry/replay/Owner-first riêng, không nói chung “như hợp đồng”. Live AI cần số ca/assertions/lệnh/report, không chỉ một dòng constraints.

## 032b — commerce gaps

- REQ-D05b bao phủ refund/bulk/contract/discount/large quote; task1 mới xử lý quote. Gán từng action/owner/AC, kiểm governance.ts:34 FORCE_APPROVAL, không đánh cả dòng đạt bằng quote test.
- Manifest: kernel/actions/policy.ts; catalog grant_on_deposit migration; sales settings schema/migration; invoice-doc/invoice-send/packages/payment-system; payment.jobs/sales.jobs.module; invoices controller; public document route/token/UI; importer validator/results; category/variant registration; settings/locales/tests.
- QR test render/decode payload, không tìm byte PNG trong PDF.
- Conversion test đồng thời chỉ một winner, không chỉ tuần tự.
- Grant/notification test duplicate event, partial pay, replay, cancel/refund và receipt key.
- Import quy định row IDs, atomicity/partial success, retry/error, giới hạn500/501.032b giữ deterministic importer;038b dùng lại, không viết bản sao.

## 015b — contact memory

- ContactMemory trong crm.prisma:203–213 chưa có updated_at/provenance theo task; cần migration, không chỉ dùng “bảng đã có”.
- REQ-F01-c cần wiring nút Giao AI, không chỉ gợi ý. REQ-F02c gồm quote/appointment/ticket/tasks. REQ-F08g còn contracts-read.service.ts:76 trả debt0, sửa contact360 chưa khép.
- Manifest: crm module/contact-view/contact360; contracts-read; reply-context/reply-tools; CustomersScreen/Customer360Drawer; inbox Blocks360/Profile360Content; actions/handlers/cache/migration/locales/tests.
- Cache dùng aggregate revision/invalidation, không chỉ contact.updated_at.51 insert đồng thời giữ cap50, eviction tất định. Không gọi trigram là semantic similarity. Forget/undo/scope/cache tests; live3 ca có expected facts và PII assertions.
- Tránh cycle015b→036:015b tạo KPI contract không bắt điểm loyalty mới hoạt động;036 nhận tích hợp điểm và retest consumer.

## 045b — app hardening

-042/042b/037/040 cần trusted system boundary/platform consistency nhưng protocol/files/fault AC chưa đủ. ActionDef hiện chưa internal-only metadata. Chốt source/provenance server-only, chống HTTP giả system/run/event; kernel recheck job/event reference.
- Sửa path sai apps/api/src/http/files.controller.ts thành apps/api/src/http/files/files.controller.ts.
- Manifest: actions/define; kernel action-context/executor/policy/files.service; shared/actions/useAction; persistence modules theo protocol; từng serializer sáu entity; AI/export/preview; API/worker bootstrap/metrics mỗi process; job result schema/transport tests.
-202 phải phân biệt preview_required/approval_required/job accepted; current ActionAccepted chỉ hai loại đầu.
- AC fault trước/sau mỗi commit hai DB + retry/undo/reconciliation; field hiding/filter-count inference/export/AI/realtime đủ sáu entity; SSRF DNS rebind/redirect + legitimate URL; DOCX/XLSX ZIP container không chỉ magic prefix; ownership transfer OTP concurrency/replay/revoked recipient/no-last-owner.

## Dependency audit tạm thời

Chưa thấy explicit cycle trong headers:023b →023c/030b/032b/015b →036 →020b →043 →045b →042 →042b →042c →037 →038 →039 →040 →038b →041.

Hai latent cycle cần gỡ:015b KPI điểm sau036;023c import TransferPanel038b. Không đưa030b→045b strict prerequisite. Thứ tự trên **chưa phải** parallel/file-overlap gate vì sáu manifest chưa đầy đủ.
