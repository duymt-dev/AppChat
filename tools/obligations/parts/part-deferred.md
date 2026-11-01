| ID | Nghĩa vụ | Nguồn | TIP nhận | Trạng thái | Bằng chứng |
|----|----------|-------|----------|-----------|------------|
| DEF-001-1 | Gỡ 99 vòng phụ thuộc `apps/web` (barrel features + mock transport), xoá dòng baseline khi nối http | reports/TIP-001-completion.md:51 | — | CHƯA | `.dependency-cruiser-known-violations.json` vẫn 99 mục (đếm 2026-11-01) — không giảm sau 25 TIP nối http |
| DEF-001-2 | Standard omnichannel-adapter ghi `capabilities.reactions` + `group: 'commerce'` cho khớp code | reports/TIP-001-completion.md:65 | — | CHƯA | standards/channels/omnichannel-adapter.md:30 vẫn `'chat'\|'social'\|'email'\|'sms'\|'web'`; code packages/channels/src/types.ts:15 đã có `commerce` (việc tài liệu) |
| DEF-002-1 | CI GitHub chạy integration test với Postgres + Redis (Q-008) | reports/TIP-002-completion.md:38 | 046 | CHƯA | .github/workflows/{ci,e2e,full,parity}.yml không có service postgres; TG row 046 "CI backend-it.yml" |
| DEF-002-2 | Cache registry workspace qua Redis / invalidate pub/sub khi nhiều tiến trình api | reports/TIP-002-completion.md:51; TIP-003:49 | — | CHƯA | packages/db/src/tenant-resolver.ts:81 TTL 60s trong process, `invalidate` (L62) chỉ xoá cache cục bộ |
| DEF-003-1 | Provisioner có `pg_signal_backend` khi xoá workspace ở production | reports/TIP-003-completion.md:36 | 041 | MỘT PHẦN | packages/db/src/setup.ts:57 cấp ở db:setup (dev); luồng xoá workspace prod chưa có (TIP-041), infra/ chưa có |
| DEF-004-1 | Bước smoke bản build (`pnpm smoke:build`) trong cổng chốt TIP (Q-009) | reports/TIP-004-completion.md:48 | 046 | CHƯA | package.json không có script `smoke:build`; TG row 046 ghi Q-009 |
| DEF-004-2 | FE quên mật khẩu gọi đúng `/auth/password/reset-request` của backend | reports/TIP-004-completion.md:49 | 011 | ĐẠT | apps/api/src/http/identity/auth.controller.ts:85; apps/web/src/features/auth/api.ts:47; test apps/web/e2e/http/auth-onboarding.spec.ts:45 |
| DEF-005-1 | `scopeFilter` nhận `contactIds` collaborator / watcher (TIP-015) | reports/TIP-005-completion.md:44 | 015 | ĐẠT | packages/core/src/authz/scope.ts:2,12; test apps/api/test/integration/crm-contacts.test.ts |
| DEF-006-1 | Job gửi email tóm tắt `digest` daily / weekly (DC-030 hẹn TIP-038) | reports/TIP-006-completion.md:43 | — | CHƯA | Không có job digest trong packages/core/src (grep `digest` chỉ thấy hash); TG row 038 không ghi digest |
| DEF-006-2 | Gửi thông báo kênh `mobile` (web push / app) | reports/TIP-006-completion.md:42 | — | NGOÀI | DC-029: chỉ lưu tuỳ chọn, TIP push = P2 |
| DEF-006-3 | Guard hội thoại + luật realtime `member.role_changed` / `member.removed` + client socket FE | reports/TIP-006-completion.md:51-53 | 013/016/025 | ĐẠT | packages/core/src/inbox/inbox.module.ts:55; notify/events/kernel.rules.ts:17; apps/web/src/shared/realtime/socket.ts; test realtime.test.ts, e2e/http/inbox-live.spec.ts |
| DEF-009-1 | `channels.used` của billing summary đếm `channel_account` thật | reports/TIP-009-completion.md:32 | — | GIẢ | packages/core/src/billing/services/billing-read.service.ts:73 vẫn `used: 0` cứng (comment "tới TIP-014") |
| DEF-009-2 | `PRICE_BOOK` đọc bảng `model_price` | reports/TIP-009-completion.md:45 | 019 | ĐẠT | billing/billing.module.ts:64 `DbPriceBook`; test apps/api/test/integration/ai-runtime.test.ts |
| DEF-009-3 | `QuotaService.assert` trước khi thêm thành viên / kênh / agent | reports/TIP-009-completion.md:46 | 013/014/021 | ĐẠT | identity/actions/member-invite.handler.ts:31; channels/actions/channel-connect.handlers.ts:38; ai/agents/agent.handlers.ts:22; test settings.test.ts:116 |
| DEF-009-4 | Consumer `credits.exhausted` chuyển mọi hội thoại `auto` về người | reports/TIP-009-completion.md:47 | — | MỘT PHẦN | Chỉ handoff từng lượt khi run lỗi credit (ai/reply/reply.service.ts:144); không có consumer topic `credits.exhausted` (billing/events/billing.events.ts:32 chỉ phát) |
| DEF-010-1 | Job cấp lại credit hằng tháng `period:<ws>:<yyyy-mm>` / gia hạn kỳ | reports/TIP-009-completion.md:44; TIP-010 | 039 | CHƯA | Chỉ có comment billing/services/wallet.service.ts:105; TG row 039 ghi rõ job này |
| DEF-010-2 | Hạn mức addon (user / kênh mua thêm) trong `QuotaService` + nâng gói giữa kỳ tính chênh | reports/TIP-010-completion.md:44 | — | CHƯA | billing/services/quota.service.ts:23 chỉ đọc max của gói; TG row 039 không ghi addon / chênh giá |
| DEF-010-3 | Màn admin đối soát giao dịch nền tảng không khớp (`matched_invoice_id` null) | reports/TIP-010-completion.md:45 | 040 | MỘT PHẦN | Chỉ có apps/api/src/http/billing/admin-transfers.controller.ts:17 (pending_review); không có danh sách giao dịch lệch |
| DEF-010-4 | SePay nền tảng nhận webhook thật (AC3 với giao dịch thật) | reports/TIP-010-completion.md:32,46 | — | CHỜ-TK | Q-004; packages/integrations/src/connectors/sepay/adapter.ts + test sepay.test.ts |
| DEF-012-1 | Action `integration.test` (kiểm tra kết nối connector) | reports/TIP-012-completion.md:37 | 023c | CHƯA | Không có trong registry (51 action thiếu); TIP-023c mục 10 "Kiểm tra kết nối (probe connector)" |
| DEF-012-2 | Action `integration.sync_now` | reports/TIP-012-completion.md:37 | — | CHƯA | Không có trong packages/actions; không TIP chờ nào ghi |
| DEF-012-3 | Adapter Casso thật (verifyWebhook / parseTransactions) | reports/TIP-012-completion.md:43 | — | GIẢ | packages/integrations/src/registry.ts:17 gắn `MockBankFeedProvider` cho casso; connectors/casso/ chỉ có manifest.ts — không phải thiếu tài khoản mà thiếu code |
| DEF-012-4 | Brevo / SMTP workspace gửi thư thật | reports/TIP-012-completion.md:43 | — | CHỜ-TK | Q-004; connectors/brevo/mail.ts, test packages/integrations/test/smtp.test.ts |
| DEF-013-1 | Chuyển phụ trách khách của thành viên bị gỡ | reports/TIP-013-completion.md:42 | — | CHƯA | identity/actions/member-remove.handler.ts:2 chỉ đặt `removed`; không consumer `member.removed` ở crm |
| DEF-013-2 | Seed `sla_policy` + đồng hồ SLA theo giờ làm việc workspace | reports/TIP-013-completion.md:41 | 034 | ĐẠT | support/services/sla-clock.ts; test support.test.ts:53 |
| DEF-014-1 | Zalo cá nhân thật: QR, listener, gửi ảnh / file / sticker, đồng bộ lịch sử | reports/TIP-014-completion.md:49 | — | CHỜ-TK | Q-003; adapter sau `ZaloTransport`, nghiệm thu bằng fake (DC-074) |
| DEF-014-2 | Cap tin chủ động / ngày Zalo cá nhân (Q-013) | reports/TIP-014-completion.md:55 | 037 | MỘT PHẦN | channels/jobs/send.processor.ts:43 áp `daily_cap`; packages/channels/src/zalo-personal/manifest.ts:22 không có `perDayProactive` mặc định |
| DEF-015-1 | Consumer `contact.owner_changed` chuyển lịch hẹn mở (move.appointments) | reports/TIP-015-completion.md:53 | — | MỘT PHẦN | Báo giá ĐẠT (quotes.test.ts:309); crm/actions/contact-owner.handlers.ts:98 `appointments: 0`, booking không có consumer |
| DEF-015-2 | KPI 360° (công nợ, HĐ hiệu lực, đơn / thu gần nhất) + LTV | reports/TIP-015-completion.md:53 | 015b | CHƯA | crm/services/contact360.ts:52-55 `kpis: []`, `recent_order` / `recent_payment` rỗng |
| DEF-015-3 | Cột "AI gợi ý" + `/crm/ai` có dữ liệu thật | reports/TIP-015-completion.md:54 | 015b | GIẢ | apps/api/src/http/crm/contacts.controller.ts:133 trả `{ runs: {}, peek: [] }` cứng |
| DEF-015-4 | `contact.remember` + tóm tắt 360° bằng AI | reports/TIP-015-completion.md:54 | 015b | CHƯA | Không có action `contact.remember` trong packages/actions |
| DEF-016-1 | Tin vào / gửi thật qua Hộp thư với Zalo cá nhân | reports/TIP-016-completion.md:49 | — | CHỜ-TK | Q-003 |
| DEF-017-1 | Nginx `widget.<domain>` phục vụ widget.js + proxy socket `/widget` | reports/TIP-017-completion.md:49 | 045 | CHƯA | Thư mục infra/ chưa tồn tại |
| DEF-017-2 | Typing indicator / `agent.status` tới widget (Blueprint §4.6) | reports/TIP-017-completion.md:50 | — | CHƯA | apps/api/src/http/notify/realtime/ws.gateway.ts:93 chỉ typing nhân viên `/ws`; không phát `agent.status` |
| DEF-017-3 | `/settings/widget` liệt kê đủ agent thật | reports/TIP-017-completion.md:48 | 022 | ĐẠT | channels/webchat/widget.service.ts:102 (`agents`, `agent_ids`); test apps/web/src/shared/api/mock/widget-shape.test.ts |
| DEF-018-1 | IMAP / SMTP thật (Gmail mật khẩu ứng dụng, Zoho…) | reports/TIP-018-completion.md:39 | — | CHỜ-TK | Chưa có hộp thư thử của Chủ nhà (không có mã Q riêng; gần Q-004) |
| DEF-018-2 | Worker `ROLE=channels` mở ra cổng 993 / 465 / 587 ở VPS | reports/TIP-018-completion.md:42 | 045 | CHƯA | infra/ chưa có |
| DEF-019-1 | Nghiệm thu LLM thật qua 9router (engine, agent, Trợ lý, dịch, soạn chứng từ) | reports/TIP-019:40; 021:38; 022:35; 024:31; 025:30; 028:27; 029:28; 035:30 | 044 | CHỜ-TK | Q-001 (gộp các TIP AI); report 023 bổ sung 2026-11-01 đã chạy thử 9router thật, ra 023b/023c |
| DEF-019-2 | Ghi `llm_provider` / `model_route` / `model_price` + `ProviderStore.invalidate()` | reports/TIP-019-completion.md:45 | 040 | CHƯA | admin.llm_provider.* / model_route / model_price thiếu trong registry |
| DEF-020-1 | Embedding thật + chỉnh `min_score` bằng eval rag | reports/TIP-020-completion.md:37 | 044 | CHỜ-TK | Q-001 / Q-002 |
| DEF-020-2 | Tải URL ngoài thật (fetch trang) qua `safeFetch` chống SSRF | reports/TIP-020-completion.md:37 | 045b | CHƯA | TIP-045b mục 2 (`ai/kb/ingest.ts:46`) |
| DEF-021-1 | Worker `ROLE=ai` nạp handler mọi domain agent gọi được (sales, booking, support, contracts, catalog) cho `ai-resume` | reports/TIP-021-completion.md:33 | — | MỘT PHẦN | ai/jobs/ai.jobs.module.ts:117 chỉ import Billing/Authz/Channels/Crm/Inbox → action duyệt của domain khác rơi `NotImplementedHandler` (kernel/actions/handler-registry.ts:41) ở worker |
| DEF-021-2 | CRUD `agent_template` nền tảng | reports/TIP-021-completion.md:44 | 040 | CHƯA | admin.agent_template.upsert thiếu trong registry |
| DEF-022-1 | Ghi `contact_memory` tự động từ lượt agent | reports/TIP-022-completion.md:40 | 015b | CHƯA | Chỉ đọc (ai/reply/reply-context.ts:81); không có `contactMemory.create` |
| DEF-022-2 | Eval suite `agent-reply` | reports/TIP-022-completion.md:41 | 044 | CHƯA | Không có harness eval; TG row 044 |
| DEF-022-3 | CSAT theo agent trên thẻ agent | reports/TIP-022-completion.md:39 | 038 | GIẢ | ai/agents/agents.read.ts:40 `csat: 0` cứng |
| DEF-022-4 | `ai_escalate` (khiếu nại) → tự mở ticket | reports/TIP-022-completion.md:39 | — | CHƯA | Không consumer `ai.handoff` ở support (chỉ thông báo — ai/events/reply.rules.ts:7) |
| DEF-023-1 | `preview` cụ thể cho mọi handler ghi (thay thẻ mặc định DC-128) | reports/TIP-023-completion.md:43 | 023b | MỘT PHẦN | Chỉ 14 file handler có `preview(` trong packages/core/src |
| DEF-023-2 | Màn lịch sử phiên Trợ lý dùng `GET /assistant/sessions` | reports/TIP-023-completion.md:41 | — | CHƯA | apps/web/src/features/assistant không gọi `/assistant/sessions` |
| DEF-023-3 | `query_data` thật qua `insight.query` | reports/TIP-023-completion.md:42 | 038 | CHƯA | ai/assistant/meta-tools.ts:7 NOT_IMPLEMENTED; `insight.query` không có trong registry |
| DEF-023-4 | `find_actions` tìm bằng embedding description (Blueprint §5.2, DC-129) | reports/TIP-023-completion.md:37 | — | CHƯA | DC-129 bản từ khoá; TIP-023b không ghi embedding |
| DEF-023-5 | 7 drawer "Trợ lý AI · [module]" + hộp lệnh Hộp thư gọi Trợ lý thật (REQ-E06) | reports/TIP-023-completion.md:46 | 023c | GIẢ | Report bổ sung 2026-11-01; `packages/shared/src/genui` chưa tồn tại |
| DEF-023-6 | Action đọc `search` / `get` từng bản ghi + khuôn input lồng nhau + `pnpm ai:live` | reports/TIP-023-completion.md:46 | 023b | CHƯA | tools/ai-live/ không tồn tại; không script `ai:live` |
| DEF-024-1 | Lịch hoạt động tuỳ chỉnh agent theo ngày / ca (`custom`) | reports/TIP-024-completion.md:35 | — | GIẢ | ai/agents/agent.runtime.ts:50 chỉ xét `office`; `custom` = luôn trực |
| DEF-024-2 | `GET /agents/:id/stats` hiệu suất agent | reports/TIP-024-completion.md:36 | 038 | CHƯA | Không có route trong apps/api/src/http/ai; TG row 038 ghi rõ |
| DEF-024-3 | Định tuyến nhiều agent theo từ khoá ưu tiên | reports/TIP-024-completion.md:34 | — | MỘT PHẦN | Từ khoá chỉ chèn prompt (ai/agents/agent.runtime.ts:35), không chọn agent theo từ khoá |
| DEF-025-1 | "Chuyển thành" Báo giá / Đơn / Lịch hẹn / Ticket từ Hộp thư | reports/TIP-025-completion.md:35 | 029/031/033/034 | ĐẠT | apps/web/src/features/inbox/components/Profile360Actions.tsx:13-28; test apps/web/e2e/inbox.spec.ts:74,88,93 |
| DEF-025-2 | Popover "Đặt lịch hẹn" ở ô soạn lấy khung giờ thật | reports/TIP-025-completion.md (khảo sát) | — | GIẢ | apps/web/src/features/inbox/api.ts:98-99 gọi `GET /booking/slots` — API không có (routes.json missing), API thật là `/calendar/slots`; chỉ chạy ở mock |
| DEF-025-3 | Nginx chuyển `/socket.io` (Upgrade) sang API | reports/TIP-025-completion.md:33 | 045 | CHƯA | infra/ chưa có |
| DEF-026-1 | Khối 360° báo giá / đơn / lịch hẹn / ticket / SLA / CSAT có dữ liệu | reports/TIP-026-completion.md:31 | 015b | CHƯA | apps/web/src/features/inbox/components/Blocks360.tsx:2-3 "chưa có dữ liệu"; 015b chỉ ghi KPI + đơn / thu gần nhất (lịch / ticket / SLA chưa ai nhận) |
| DEF-026-2 | Kanban khách > 50 thẻ / cột có "Xem thêm" | reports/TIP-026-completion.md:32 | — | CHƯA | Không có load-more ở features/customers |
| DEF-027-1 | Chặn sửa / xoá tay nguồn RAG `origin=catalog` | reports/TIP-027-completion.md:32 | — | CHƯA | ai/kb/kb.handlers.ts không kiểm `origin` catalog |
| DEF-027-2 | Lỗi `permission denied for table outbox_event` lần provision đầu — tìm nguyên nhân | reports/TIP-027-completion.md:26 | — | CHƯA | "theo dõi ở TIP hạ tầng" nhưng TG 045 / 045b không ghi |
| DEF-028-1 | Queue `doc-render` (ROLE=jobs) cho PDF chứng từ phát hành | reports/TIP-028-completion.md:30 | — | MỘT PHẦN | PDF đóng băng render trong `prepare` của API (DV-008/009); không có queue `doc-render` (documents/jobs/documents.jobs.module.ts:2 chỉ comment) |
| DEF-028-2 | systemd LibreOffice (user riêng, không mạng) + `SOFFICE_PATH` + bộ font | reports/TIP-028-completion.md:31 | 045 | CHƯA | infra/ chưa có; TG 045 ghi "LibreOffice + font" |
| DEF-029-1 | Gửi báo giá / HĐ / đề nghị / nhắc hẹn / CSAT qua Zalo / Email thật | reports/TIP-029:28; 030:29; 032:28; 033:29; 034:29; 035:30 | — | CHỜ-TK | Q-003 / Q-004 (adapter giả) |
| DEF-030-1 | Phụ lục hợp đồng `contract.create_appendix` | reports/TIP-030-completion.md:3,33 | 030b | CHƯA | Bảng packages/db/prisma/tenant/contracts.prisma:83 có; action không có trong registry |
| DEF-030-2 | AI soạn nháp hợp đồng `contract.draft_from_content` | reports/TIP-030-completion.md:3 | 030b | CHƯA | Không có trong packages/actions |
| DEF-030-3 | Bảng chỉ thêm khác (stock_movement, order_event, ticket_event…) chặn UPDATE / DELETE bằng trigger | reports/TIP-030-completion.md:25 | — | CHƯA | Chỉ migration 20261101600000_030_contracts có trigger |
| DEF-031-1 | Adapter sàn thật (Shopee / TikTok Shop / Sapo…) | reports/TIP-031-completion.md:3 | — | NGOÀI | REQ-F07b adapter P2 |
| DEF-031-2 | `order.cancelled` (`refund_requested`) sinh yêu cầu hoàn tiền | reports/TIP-031-completion.md:27 | 032 | ĐẠT | sales/payments/services/refunds.ts:3; test payments.test.ts:268-270 |
| DEF-031-3 | `order.completed` ghi sổ điểm + đảo khi hoàn tác | reports/TIP-031-completion.md:33 | 036 | CHƯA | packages/core/src/loyalty chỉ có module rỗng + jobs/; TG row 036 |
| DEF-031-4 | Đồng bộ generator fixture `gen-inbox.py` / `gen-assistant.py` với fixture đang commit | reports/TIP-031-completion.md:26; TIP-024:27 | — | CHƯA | tools/scripts/fixtures/gen-assistant.py:137 vẫn `conversation.close` |
| DEF-031-5 | `db:cleanup-test` tự nạp `.env` | reports/TIP-031-completion.md:25 | — | CHƯA | packages/db/package.json:17 `tsx scripts/cleanup-test-workspaces.ts` không `--env-file` |
| DEF-032-1 | Khoản thu `points` + `payment.redeem_points` | reports/TIP-032-completion.md:32 | 036 | CHƯA | `payment.redeem_points` thiếu trong registry; TG row 036 |
| DEF-032-2 | Trừ buổi liệu trình khi lịch hẹn hoàn tất (`package_usage`) | reports/TIP-032-completion.md:31 | 033 | ĐẠT | booking/services/appointment-write.ts:66-76; test booking.test.ts:4 |
| DEF-032-3 | Form chứng từ FE dùng ngày thật (`todayIso`) thay ngày cứng parity | reports/TIP-032-completion.md:25 | — | MỘT PHẦN | apps/web/src/shared/time/today.ts:7 dùng ở 4 form (contracts / invoices / orders); không có unit test helper |
| DEF-033-1 | Mục Cài đặt "Đặt lịch": nhân sự / ca / giờ mở cửa (UI) | reports/TIP-033-completion.md:25 | — | CHƯA | Chỉ action + API; FE chỉ có mock domains/calendar-actions.ts (DV-015) |
| DEF-034-1 | Xu hướng KPI ticket (`trend`) so kỳ trước | reports/TIP-034-completion.md:25 | — | GIẢ | support/services/tickets-read.service.ts:185 trả chuỗi rỗng |
| DEF-034-2 | Màn cấu hình danh mục ticket | reports/TIP-034-completion.md:26 | — | CHƯA | Danh mục là text tự do (packages/actions/src/support.ts:49) |
| DEF-034-3 | Parity `tickets:detail` 4,91% sát ngưỡng — rà lại drawer | reports/TIP-034-completion.md:27 | 046 | MỘT PHẦN | Chưa rà; TG 046 "chạy parity mọi màn" |
| DEF-034-4 | Nhiều chính sách SLA + leo thang 4 cấp | reports/TIP-034-completion.md:3 | — | NGOÀI | P3 theo report |
| DEF-035-1 | E2E mock `settings` "thêm email qua wizard 3 bước" đỏ sẵn | reports/TIP-035-completion.md:25 | — | CHƯA | Chưa sửa (gần Q-010) |
| DEF-035-2 | Tập "armed" cho mọi job quét tenant (sla / booking / contracts / sales / payment / order-sync) | reports/TIP-035-completion.md:27,34 | — | CHƯA | support/jobs/support.jobs.module.ts:31, booking/jobs/booking.jobs.module.ts:35, contracts/jobs/contracts.jobs.module.ts:21, sales/jobs/{sales.jobs.module.ts:42, payment.jobs.ts:26, order-sync.jobs.ts:14} quét mọi workspace active |
| Q-001 | Nạp 9router (base URL, key, model) qua env / `admin.llm_provider.upsert`, chạy nghiệm thu AI thật | QUESTIONS.md:9 | 044 | CHỜ-TK | Q-001 mở |
| Q-002 | Route `purpose=embed` sang model 1536 chiều (9router hoặc OpenAI) | QUESTIONS.md:10 | 046 | CHỜ-TK | Q-002 mở; TG 046 "re-embed khi đổi model" |
| Q-003 | Spike `zca-js` với tài khoản Zalo phụ | QUESTIONS.md:11 | — | CHỜ-TK | Q-003 mở |
| Q-004 | SePay + Brevo (domain SPF / DKIM / DMARC) thật | QUESTIONS.md:12 | — | CHỜ-TK | Q-004 mở |
| Q-006 | VPS + domain để deploy / nghiệm thu 045, 046 | QUESTIONS.md:14 | 045 | CHỜ-TK | Q-006 mở |
| Q-008 | Job CI `integration` (service postgres:16 + pgvector + Redis) | QUESTIONS.md:16 | 046 | CHƯA | Workflows không có postgres; TG 046 |
| Q-009 | Script `pnpm smoke:build` + thêm vào bảng cổng D59 | QUESTIONS.md:17 | 046 | CHƯA | Không có script; TG 046 |
| Q-010 | Sửa E2E mock chập chờn (`quotes.spec.ts:37`, `settings-ops.spec.ts:44`, `settings.spec.ts:124`) nhánh `fix/e2e-flaky` | QUESTIONS.md:18 | — | CHƯA | Không có commit fix flaky trong git log |
| Q-011 | Trial cho mời thành viên? (mặc định giữ luật gói) | QUESTIONS.md:19 | 013 | ĐẠT | Mặc định = hành vi hiện tại: 402 PLAN_LIMIT_REACHED — test settings.test.ts:116; đổi chỉ khi Chủ nhà quyết |
| Q-013 | Cap 100 tin chủ động / tài khoản Zalo / ngày, Owner chỉnh ở drawer kênh | QUESTIONS.md:21 | 037 | MỘT PHẦN | send.processor.ts:43 có cơ chế; manifest Zalo chưa đặt số; drawer chưa có ô |
| Q-014 | `ChannelAdapter.recall?` / `react?` thực hiện thu hồi / cảm xúc phía Zalo | QUESTIONS.md:22 | — | CHƯA | packages/channels/src/types.ts:22 chỉ cờ `reactions`, không có hàm recall / react |
| Q-015 | Nhiều widget / workspace (`widget_id`) | QUESTIONS.md:23 | 017 | ĐẠT | Mặc định một widget (DC-086) = code hiện tại; mở rộng là P1 nếu Chủ nhà duyệt — test webchat.test.ts |
| Q-016 | Gmail / Outlook OAuth (XOAUTH2) cho kênh email | QUESTIONS.md:24 | — | CHỜ-TK | Cần app OAuth của Chủ nhà; REQ-B06 P1 |
| Q-017 | `e2e-http.mjs` tự dọn workspace test sau lượt | QUESTIONS.md:25 | — | MỘT PHẦN | `db:cleanup-test` có (packages/db/package.json:17); tools/scripts/e2e-http.mjs không gọi dọn |
| Q-018 | Cửa sổ ~10 giây dùng lại refresh token vừa xoay (nhiều tab) + sửa generator lệch fixture | QUESTIONS.md:26 | — | CHƯA | identity/services/sessions.service.ts:45-49 thu hồi cả family ngay |
| Q-019 | Chọn nhiều hội thoại + thanh thao tác hàng loạt ở Hộp thư (REQ-C08) | QUESTIONS.md:27 | — | CHƯA | Backend `conversation.bulk_update` có; features/inbox không có UI bulk |
| Q-020 | Ngoại lệ D28 / mask cho parity `inbox:connect-channel` (6,20%) + soi `inbox:default` | QUESTIONS.md:28 | 046 | MỘT PHẦN | tools/parity/parity.manifest.ts:348-357 chưa có mask lưới kênh |
| Q-021 | "Chuyển tiếp" hàng loạt khách = gửi danh sách cho thành viên | QUESTIONS.md:29 | — | CHƯA | Nút đang ẩn; chờ Chủ nhà xác nhận |
| Q-023 | Ngưỡng `pnpm ai:live` ≥ 27/30 | QUESTIONS.md:31 | 023b | CHƯA | tools/ai-live/ chưa có |
| Q-024 | "Xuất Excel" Báo giá / Đơn / HĐ / Ticket bằng exceljs theo bộ lọc | QUESTIONS.md:32 | 038 | GIẢ | message.info: features/quotes/components/QuotesToolbar.tsx:82, orders/OrdersToolbar.tsx:96, contracts/ContractsToolbar.tsx:69, tickets/TicketsHeader.tsx:143 |
| Q-025 | Chặn chéo: báo giá đã sinh đơn không sinh HĐ và ngược lại | QUESTIONS.md:33 | 032b | CHƯA | TIP-032b mục 2 |
| DV-001 | Duyệt baseline vòng `apps/web` hoặc gỡ vòng | DEVIATIONS.md:18 | — | CHƯA | Baseline vẫn 99 (xem DEF-001-1) |
| DV-002 | Duyệt `platform/notify.prisma` + `event_consumption` + thư viện socket.io / nodemailer | DEVIATIONS.md:19 | 006 | ĐẠT | packages/db/prisma/platform/notify.prisma:7; tenant/kernel.prisma:137; test notify.test.ts |
| DV-003 | Duyệt Storage / `POST /v1/files` ở kernel (s3 sau) | DEVIATIONS.md:20 | 020 | ĐẠT | apps/api/src/http/files/files.controller.ts:32; test documents.test.ts, inbox-ui.test.ts |
| DV-004 | Duyệt `prepare` ngoài transaction + `/agents/meta` + `/settings/governance` | DEVIATIONS.md:21 | 021 | ĐẠT | kernel/actions/handler.ts:35; test agents.test.ts |
| DV-005 | Duyệt prompt `.md` + bản TS; job agent-reply đẩy thẳng từ channel-inbound | DEVIATIONS.md:22 | 022 | ĐẠT | packages/ai/src/prompts/*.md + index.ts; test packages/ai/test/reply.test.ts:71 |
| DV-006 | SSE cho `POST /assistant/messages` + `transport.stream` FE | DEVIATIONS.md:23 | 023c | CHƯA | Không có `text/event-stream` trong apps/api; TIP-023c mục 6a |
| DV-007 | Duyệt LibreOffice cho mẫu rich + docxtemplater / pizzip + preview trong API | DEVIATIONS.md:24 | 028 | ĐẠT | documents/services/doc-renderer.ts:40; test documents.test.ts (queue doc-render xem DEF-028-1) |
| DV-008 | Duyệt `/quotes/meta`, link công khai, queue `sales-scheduler` | DEVIATIONS.md:25 | 029 | ĐẠT | apps/api/src/http/sales/public-quotes.controller.ts:1; test quotes.test.ts |
| DV-009 | Duyệt `pdf-lib` + endpoint ký / OTP + `contracts-scheduler` | DEVIATIONS.md:26 | 030 | ĐẠT | contracts/services/contract-sign-pdf.ts:3; test contracts.test.ts |
| DV-010 | Làm phụ lục + AI soạn nháp HĐ | DEVIATIONS.md:27 | 030b | CHƯA | Xem DEF-030-1/2 |
| DV-011 | Duyệt cột đơn mới + `order_event`; `order.import_external` không là action | DEVIATIONS.md:28 | 031 | ĐẠT | packages/db/prisma/tenant/sales-orders.prisma:124; test orders.test.ts |
| DV-012 | Duyệt `ConnectorManifest.hidden` + `mock_marketplace` | DEVIATIONS.md:29 | 031 | ĐẠT | packages/integrations/src/connectors/mock/order-sync.ts:19, define.ts:10; test packages/integrations/test/order-sync.test.ts |
| DV-013 | Duyệt `bank_tx` / `payment_account` / `package_usage` + `payment.refund_approve` / `refund_reject` | DEVIATIONS.md:30 | 032 | ĐẠT | packages/actions/src/payments.ts:33; test payments.test.ts:268 |
| DV-014 | Duyệt `/invoices/meta`, PDF phiếu thu, `/settings/payments`, phương thức `points` / `marketplace` | DEVIATIONS.md:31 | 032 | ĐẠT | apps/api/src/http/sales/invoices.controller.ts:39; test payments.test.ts |
| DV-015 | Duyệt bảng booking mới + `/v1/calendar`; thiếu UI cấu hình nhân sự / giờ mở cửa | DEVIATIONS.md:32 | — | MỘT PHẦN | Backend ĐẠT (booking.prisma:39,53; calendar.controller.ts:34; booking.test.ts); UI chưa (DEF-033-1) |
| DV-016 | Duyệt `ticket_event` + cột ticket + `/tickets/meta` | DEVIATIONS.md:33 | 034 | ĐẠT | packages/db/prisma/tenant/support.prisma:110; tickets.controller.ts:32; test support.test.ts |
| DV-017 | Duyệt cột `ai_task` mới + `ai_task.delete` / `run_now` + notify | DEVIATIONS.md:34 | 035 | ĐẠT | packages/actions/src/ai.ts:306; test ai-tasks.test.ts |

Ghi chú:
- Đã đọc hết phần ISSUES / SUGGESTIONS / STATUS của 33 report (001–035) và mọi dòng mở của QUESTIONS (Q-001…Q-025) + DEVIATIONS (DV-001…DV-017). Bỏ qua: Q-005/007/022 (đã trả lời / đã xử lý), Q-012 (tạm theo đề xuất, crm_owner đã có — shared/notify/catalog.ts:22), gợi ý tuỳ chọn ("nếu cần": presence, topic loyalty.* cho ai_task, phạm vi tri thức riêng tác vụ).
- CHỜ-TK của LLM thật / Zalo / Email nhiều TIP gộp vào DEF-019-1 và DEF-029-1 (gộp cùng loại, cùng Q).
- Phát hiện đáng chú ý: Casso chỉ có adapter mock (DEF-012-3, không phải thiếu TK); worker ROLE=ai thiếu module sales/booking/support/contracts cho ai-resume (DEF-021-1); popover Đặt lịch ở Hộp thư gọi route không tồn tại (DEF-025-2); `channels.used` billing cứng 0 (DEF-009-1).
- CHƯA RÀ HẾT: chưa kiểm sâu code cho DEF-017-3, DEF-025-1 (test chỉ mock E2E), DEF-032-3; chưa kiểm code adapter thật cho các dòng CHỜ-TK (brevo/mail.ts, imap-transport, zca-js transport); DEF-027-2 / DEF-035-1 chưa tái hiện; chưa đối chiếu Blueprint cho DEF-023-4 / DEF-028-1.
