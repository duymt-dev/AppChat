"""Dữ liệu TIP bổ sung (phần C): 020f 035c + bổ sung cho 013c, 014c."""
T = {}

T['020f'] = dict(
 slug='kb-parsers', title='Kho tri thức: đọc pptx và ảnh (OCR qua model vision) để AI học',
 parent='020', module='KB parsing', pri='P1', est='M',
 deps='020b, 020c, 019b (metering), 023f (input ảnh) đã tích hợp; trước 044/045/046.',
 rows=['DC-110'],
 context=['DC-110: tệp pptx / ảnh / mp4 lưu với `learn=false` (P1). `packages/core/src/ai/kb/parse.ts` đọc pdf (`pdf-parse`), docx (`mammoth`), csv/xlsx; không pptx, không ảnh.',
  '`pizzip@3.3.0` đã cài (pptx = zip XML) — không cần thư viện mới. OCR: không có tesseract; dùng model vision qua AI SDK (route chat có capability `vision`) — tính Credit theo pricebook hiện có (019b), không giá mới.'],
 std='ai/rag.md §5 (parse/chunk), §10; ai/agent-gateway.md (metering); ops/observability-security.md.',
 review=['Kiểm route chat có `vision=true` trong cấu hình 040; không có → ảnh giữ `learn=false` với lý do `no_vision_route` (trung thực).'],
 task='Parser pptx (text slide + ghi chú) và OCR ảnh qua model vision để tài liệu thuộc hai loại này học được.',
 spec=[('pptx', ['Đọc `ppt/slides/slideN.xml` + `notesSlides` theo thứ tự, mỗi slide một block có `meta.page = N`; giới hạn 300 slide.']),
  ('Ảnh', ['png/jpg/webp ≤ 10 MB: gọi model vision (prompt cố định "chép nguyên văn chữ trong ảnh, không suy diễn"), qua 019b metered; kết quả là block text `meta.ocr=true`.', 'Người thêm tài liệu thấy **ước tính** Credit trước khi bật "Cho AI học" ảnh (preview action kb.add_source/kb.update_source); số trừ thật là usage thực tế qua 019b metering, không phải số ước tính.', 'mp4 vẫn `learn=false` (ngoài phạm vi).'])],
 ac=[('pptx 10 slide','10 block đúng thứ tự — unit fixture'),('Ảnh hoá đơn mẫu','text OCR vào kho, trích nguồn ghi page/ocr'),('Không route vision','learn=false + lý do'),('Model vision thật','`pnpm ai:live --cases fixtures/ai-eval/kb-ocr.json` 4 ca ×3; thiếu key → chưa nghiệm thu')],
 cmds=['pnpm --filter @appchat/core test -- test/kb-parse-pptx.test.ts test/kb-ocr.test.ts','pnpm --filter @appchat/api test:integration -- test/integration/kb.test.ts'],
 cons=['Không thêm thư viện; không giá mới; không đọc video.'],
 files=[('M','packages/core/src/ai/kb/parse.ts','Rẽ pptx/ảnh'),('C','packages/core/src/ai/kb/parsers/pptx.ts','Parser pptx'),('C','packages/core/src/ai/kb/parsers/image-ocr.ts','OCR vision'),
  ('M','packages/core/src/ai/kb/ingest.ts','Ước tính + metering OCR'),('C','packages/core/test/kb-parse-pptx.test.ts','Unit pptx'),('C','packages/core/test/kb-ocr.test.ts','Unit OCR replay'),
  ('C','packages/core/test/fixtures/kb/sample.pptx','Fixture'),('C','fixtures/ai-eval/kb-ocr.json','Ca live')])

T['035c'] = dict(
 slug='test-ops-hygiene', title='Vệ sinh kiểm thử & job quét: generator fixture, db:cleanup-test, E2E chập chờn, tập workspace "armed"',
 parent='035', module='test tooling + tenant sweeps', pri='P1', est='M',
 deps='003c, 006b, 041 (lifecycle), 045b đã tích hợp; trước 044/045/046.',
 rows=['DEF-031-4','DEF-031-5','DEF-035-1','DEF-035-2','Q-010'],
 context=['`tools/scripts/fixtures/gen-assistant.py:137` vẫn sinh `conversation.close`; generator `gen-inbox.py`/`gen-assistant.py` lệch fixture đang commit.',
  '`packages/db/package.json:17` `tsx scripts/cleanup-test-workspaces.ts` không `--env-file`.',
  'E2E mock đỏ sẵn: `settings` "thêm email qua wizard 3 bước" (DEF-035-1); chập chờn `quotes.spec.ts:37`, `settings-ops.spec.ts:44`, `settings.spec.ts:124` (Q-010).',
  'Job quét mọi workspace active mỗi chu kỳ: `support/jobs/support.jobs.module.ts:31`, `booking/jobs/booking.jobs.module.ts:35`, `contracts/jobs/contracts.jobs.module.ts:21`, `sales/jobs/{sales.jobs.module.ts:42, payment.jobs.ts:26, order-sync.jobs.ts:14}` (DEF-035-2).'],
 std='code/testing.md; database/tenant-db.md; workflow/git-flow-ci.md.',
 review=['Chạy lại 3 spec chập chờn 20 lần (`--repeat-each=20`) ghi tỉ lệ đỏ trước khi sửa.'],
 task='Đồng bộ generator với fixture, `db:cleanup-test` tự nạp env, sửa E2E đỏ/chập chờn tận gốc, và chỉ quét workspace có việc đến hạn ("armed").',
 spec=[('Fixture + script', ['Sửa generator để `python gen-*.py` tái tạo đúng fixture đang commit (diff rỗng); test CI so sánh.', '`db:cleanup-test` dùng `--env-file=../../.env` nếu tồn tại, không đè env tường minh.']),
  ('E2E', ['Sửa nguyên nhân (chờ điều hướng/URL, chờ dữ liệu, mask drawer chặn click) — không tăng timeout/retry che lỗi; 20 lần liên tiếp xanh.']),
  ('Armed set', ['Bảng platform `workspace_due(workspace_id, domain, due_at)` cập nhật khi tạo/sửa bản ghi có hạn (SLA, nhắc, hết hạn HĐ, sync); job quét `WHERE due_at <= now()` theo keyset ≤ 200, không quét mọi workspace; workspace suspended/archived bỏ qua (041).'])],
 ac=[('Chạy generator','fixture không đổi — `tools/scripts/fixtures/check.mjs`'),('`pnpm --filter @appchat/db db:cleanup-test` không export env','chạy được'),
  ('3 spec chập chờn + wizard email `--repeat-each=20`','20/20 xanh'),('1.000 workspace, 3 có việc','job chạm đúng 3 tenant DB — integration đếm kết nối')],
 cmds=['node tools/scripts/fixtures/check.mjs','pnpm e2e settings quotes settings-ops -- --repeat-each=20','pnpm --filter @appchat/api test:integration -- test/integration/armed-sweeps.test.ts'],
 cons=['Không nới timeout/retry để che lỗi.'],
 files=[('M','tools/scripts/fixtures/gen-assistant.py','Đồng bộ'),('M','tools/scripts/fixtures/gen-inbox.py','Đồng bộ'),('C','tools/scripts/fixtures/check.mjs','So fixture'),
  ('M','packages/db/package.json','--env-file'),('M','apps/web/e2e/settings.spec.ts','Sửa wizard + chờ'),('M','apps/web/e2e/quotes.spec.ts','Chờ URL'),('M','apps/web/e2e/settings-ops.spec.ts','Chờ dữ liệu'),
  ('M','packages/db/prisma/platform/ops.prisma','workspace_due'),('C','packages/db/prisma/platform/migrations/20261102006700_workspace_due/migration.sql','Bảng + index (due_at, workspace_id)'),
  ('C','packages/core/src/kernel/jobs/due-registry.ts','Ghi/đọc armed set'),('M','packages/core/src/support/jobs/support.jobs.module.ts','Quét armed'),
  ('M','packages/core/src/booking/jobs/booking.jobs.module.ts','Quét armed'),('M','packages/core/src/contracts/jobs/contracts.jobs.module.ts','Quét armed'),
  ('M','packages/core/src/sales/jobs/sales.jobs.module.ts','Quét armed'),('M','packages/core/src/sales/jobs/payment.jobs.ts','Quét armed'),('M','packages/core/src/sales/jobs/order-sync.jobs.ts','Quét armed'),
  ('C','apps/api/test/integration/armed-sweeps.test.ts','Integration')])

# Bổ sung vào TIP đã soạn ở phần B
EXTRA = {
 '013c': dict(rows=['DEF-013-1'],
   spec=('Thành viên bị gỡ (DEF-013-1)', ['Consumer `member.removed` ở domain inbox: hội thoại đang gán người đó → hàng chung (sự kiện hội thoại ghi lý do).', 'Consumer ở domain crm: **không** tự chuyển khách; gửi một thông báo tới Owner/Quản lý kèm link bộ lọc "Khách của thành viên đã gỡ" (`owner_removed=true`) để họ dùng `contact.transfer_owner` của 015d từng khách hoặc theo lô bằng thanh chọn nhiều (bulk qua `bulk-dispatch` theo mẫu 034c). Không định nghĩa đối tượng "yêu cầu chuyển" mới.']),
   ac=[('Gỡ thành viên đang phụ trách 30 khách','hội thoại về hàng chung; Owner nhận 1 thông báo; bộ lọc trả đúng 30 khách; owner khách giữ nguyên tới khi chuyển')],
   files=[('C','packages/core/src/inbox/events/member-removed.consumer.ts','Hội thoại → hàng chung'),('M','packages/core/src/inbox/inbox.module.ts','Đăng ký consumer'),
   ('C','packages/core/src/crm/events/member-removed.consumer.ts','Thông báo + bộ lọc owner_removed'),('M','packages/core/src/crm/crm.module.ts','Đăng ký consumer'),('M','packages/core/src/crm/services/crm-read.service.ts','Bộ lọc owner_removed')]),
 '014c': dict(rows=['D48'],
   spec=('Research khoá (D48)', ['Dòng Research/Web search trong menu ＋ giữ khoá + nhãn "Sắp có" (D48), không có onClick; thêm test.']),
   ac=[('Mở menu ＋','dòng Research khoá, có "Sắp có", bấm không làm gì — `AgentToolsMenu.test.tsx`')],
   files=[('C','apps/web/src/features/inbox/components/AgentToolsMenu.test.tsx','Test khoá D48')]),
}
