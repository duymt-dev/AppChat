| ID | Nghĩa vụ | Nguồn | TIP nhận | Trạng thái | Bằng chứng |
|---|---|---|---|---|---|
| REQ-A01a | Đăng ký / đăng nhập bằng OTP email | 01-REQUIREMENTS-MATRIX.md:34 | 004, 011 | ĐẠT | packages/core/src/identity/services/otp.service.ts:43, auth.service.ts:47; test apps/api/test/integration/auth.test.ts (AC2, OTP login) |
| REQ-A01b | Email + mật khẩu, "Ghi nhớ 30 ngày" (không ghi nhớ 1 ngày) | 01-REQUIREMENTS-MATRIX.md:34 | 004, 011 | ĐẠT | packages/core/src/identity/services/sessions.service.ts:12; auth.service.ts:62; test auth.test.ts AC5/AC6 |
| REQ-A01c | Quên mật khẩu: link 15 phút, chống dò tài khoản | 01-REQUIREMENTS-MATRIX.md:34 | 004, 011 | ĐẠT | auth.service.ts:16,75; test auth.test.ts AC3 + "AC6 quên mật khẩu"; e2e http/auth-onboarding.spec.ts |
| REQ-A01d | Gửi OTP / link qua Brevo thật | 01-REQUIREMENTS-MATRIX.md:34 | 004 | CHỜ-TK | identity.module.ts:10 BrevoMailProvider; test packages/integrations/test/ports.test.ts — Q-004 |
| REQ-A02a | Popup khai báo bắt buộc, không đóng được trước khi khai báo | 01-REQUIREMENTS-MATRIX.md:35 | 011 | ĐẠT | apps/web/src/features/onboarding/components/OnboardingGate.tsx:32 (không nút đóng); test onboarding.test.ts AC2/AC3; e2e http/auth-onboarding.spec.ts |
| REQ-A02b | DN / Hộ KD: tra MST rồi tự điền | 01-REQUIREMENTS-MATRIX.md:35 | 004, 011 | ĐẠT | packages/integrations/src/connectors/vietqr/tax-lookup.ts:14; apps/api/src/http/identity/workspaces.controller.ts:51; test ports.test.ts, workspaces.test.ts AC11 |
| REQ-A02c | Cá nhân: nhập VNeID (12 số) + nhập tay | 01-REQUIREMENTS-MATRIX.md:35 | 004, 011 | ĐẠT | packages/actions/src/onboarding.ts:16,25; DeclareStepInfo.tsx:55; test workspaces.test.ts AC9 |
| REQ-A02d | Chọn lĩnh vực theo taxonomy ngành 2 cấp, 10 nhóm | 01-REQUIREMENTS-MATRIX.md:35 | 011b | MỘT PHẦN | Chỉ ô mô tả tự do (DeclareBusinessModal.tsx:32, onboarding.ts:23) theo prototype ver2.1; không taxonomy, không mã quyết định bỏ; TIP-011b nhận (2026-11-02) |
| REQ-A03a | Mỗi workspace một DB riêng, tạo tự động khi đăng ký | 01-REQUIREMENTS-MATRIX.md:36 | 002, 004 | ĐẠT | packages/db/src/provisioner.ts:35; test packages/db/test/integration/tenant-isolation.test.ts, workspaces.test.ts AC7 |
| REQ-A03b | Migration áp cho mọi DB tenant | 01-REQUIREMENTS-MATRIX.md:36 | 002 | ĐẠT | packages/db/src/tenant-migrate.ts:28; test tenant-migrate.test.ts |
| REQ-A03c | Test tự động chống rò dữ liệu giữa tenant | 01-REQUIREMENTS-MATRIX.md:36 | 002 | ĐẠT | test tenant-isolation.test.ts "(d) 2 workspace ghi song song" |
| REQ-A04 | User nhiều workspace, đổi workspace từ menu Hồ sơ | 01-REQUIREMENTS-MATRIX.md:37 | 004, 011 | ĐẠT | identity/actions/workspace-switch.handler.ts:12; apps/web/src/shared/shell/UserMenu.tsx:45; test workspaces.test.ts AC9 |
| REQ-A05a | Permission engine + 5 vai trò mặc định | 01-REQUIREMENTS-MATRIX.md:38 | 005 | ĐẠT | packages/core/src/authz/seed.ts:7; test authz.test.ts AC2/AC3, packages/shared/src/authz/roles.test.ts |
| REQ-A05b | Data scope Của tôi / Nhóm / Tất cả áp mọi list / get | 01-REQUIREMENTS-MATRIX.md:38 | 005 | ĐẠT | packages/core/src/authz/scope.ts:20; test authz.test.ts AC8, inbox.test.ts AC4 |
| REQ-A05c | AI chạy đúng quyền người ra lệnh | 01-REQUIREMENTS-MATRIX.md:38 | 021, 022, 023 | ĐẠT | packages/core/src/ai/assistant/delegate.ts:1-4; test assistant.test.ts "quyền: sales…", ai-tasks.test.ts "quyền" |
| REQ-A05d | Trang Vai trò & phân quyền chỉ đọc | 01-REQUIREMENTS-MATRIX.md:38 | 013 | ĐẠT | apps/web/src/features/settings/components/RolesSection.tsx:29; test settings.test.ts AC8, e2e roles.spec.ts |
| REQ-A05e | Mời thành viên bằng email | 01-REQUIREMENTS-MATRIX.md:38 | 013 | ĐẠT | identity/actions/member-invite.handler.ts:23; test settings.test.ts AC2, workspaces.test.ts AC10 |
| REQ-A05f | Mời thành viên bằng SĐT | 01-REQUIREMENTS-MATRIX.md:38 | 013b | CHƯA | packages/actions/src/settings.ts:39 input chỉ email; MemberModal.tsx:12; TIP-013b nhận (2026-11-02) |
| REQ-A05g | Số user giới hạn theo gói | 01-REQUIREMENTS-MATRIX.md:38 | 009, 013 | ĐẠT | member-invite.handler.ts:31; test settings.test.ts "vượt hạn mức gói → 402" |
| REQ-A05b-1 | Vai trò tuỳ biến (nhân bản, sửa ma trận quyền) | 01-REQUIREMENTS-MATRIX.md:39 | 042 | ĐẠT | RoleEditor nhân bản / sửa ma trận quyền; E2E settings-roles (mock + http) |
| REQ-A05b-2 | Quản lý Nhóm (team) | 01-REQUIREMENTS-MATRIX.md:39 | 042 | ĐẠT | TeamsSection + team.*; E2E settings-roles (mock + http) |
| REQ-A05b-3 | Ẩn trường theo vai trò phía server | 01-REQUIREMENTS-MATRIX.md:39 | 045b | ĐẠT | core/src/authz/fields/* FieldPolicy — DTO 6 thực thể, cf.* 422 trước truy vấn, output action (Trợ lý / agent / API), realtime, export; hardening-fields.test.ts; field-*-leak.test.ts; ai:live hardening 2 ca canary 0 lộ; e2e hardening mock + http |
| REQ-A06a | Trial 15 ngày Cá nhân Pro + 10.000 credit | 01-REQUIREMENTS-MATRIX.md:40 | 009 | ĐẠT | packages/core/src/billing/services/subscriptions.service.ts:31; test billing.test.ts AC3 |
| REQ-A06b | Màn chào mừng 2 nút + badge "Còn X ngày" | 01-REQUIREMENTS-MATRIX.md:40 | 011 | ĐẠT | OnboardingGate.tsx:34; apps/web/src/shared/shell/RailFoot.tsx:22; test onboarding.test.ts AC4, e2e http/auth-onboarding.spec.ts |
| REQ-A06c | Hết hạn → gói Miễn phí, thông báo đóng được, dữ liệu giữ | 01-REQUIREMENTS-MATRIX.md:40 | 009, 011 | ĐẠT | subscriptions.service.ts:69-76; TrialExpired.tsx:21; test billing.test.ts AC7, onboarding.test.ts AC5 |
| REQ-A07a | Audit: mọi hành động người + AI ghi action_log | 01-REQUIREMENTS-MATRIX.md:41 | 003 | ĐẠT | packages/core/src/kernel/actions/executor.ts:150; test actions.test.ts "happy path … action_log" |
| REQ-A07b | Trang Cài đặt Audit log / AI Audit log dữ liệu thật | 01-REQUIREMENTS-MATRIX.md:41 | 045b | ĐẠT | audit.controller.ts + audit-read.service.ts (trang 50, deferred join, EXPLAIN); FE lọc / Xem thêm / rỗng do lọc; hardening-audit.test.ts |
| REQ-A07c | admin.* ghi platform_audit_log; sự kiện nhạy cảm cờ audit | 01-REQUIREMENTS-MATRIX.md:41 | 045b | ĐẠT | audit.service.ts — platform_audit_log cho admin.*; action_log cờ audit + event audit.security_event → thông báo Owner (notify/events/security.rules.ts); hardening-audit.test.ts |
| REQ-A09a | Tự lưu trữ gói Miễn phí sau 90 ngày, báo trước 14 ngày | 01-REQUIREMENTS-MATRIX.md:42 | 041 | CHƯA | Chỉ cột plan archiveInactiveDays (billing/seed.ts:24); không job |
| REQ-A09b | Lưu trữ = dump + drop; đăng nhập lại khôi phục < 2 phút | 01-REQUIREMENTS-MATRIX.md:42 | 041 | CHƯA | Không code dump / restore |
| REQ-A08 | Đăng nhập social | 01-REQUIREMENTS-MATRIX.md:43 | — | NGOÀI | P2 theo ma trận |
| REQ-B01a | Kiến trúc adapter kênh, chuẩn hoá schema chung | 01-REQUIREMENTS-MATRIX.md:48 | 014 | ĐẠT | packages/channels/src/types.ts, registry.ts; test packages/channels/test/registry.test.ts |
| REQ-B01b | Chống trùng UNIQUE(channel_account_id, external_msg_id) | 01-REQUIREMENTS-MATRIX.md:48 | 016 | ĐẠT | packages/db/prisma/tenant/inbox.prisma:173; inbox/services/pipeline.ts:60; test inbox.test.ts AC2 |
| REQ-B01c | Gửi qua outbox, retry back-off, dead-letter | 01-REQUIREMENTS-MATRIX.md:48 | 003, 014, 016 | ĐẠT | channels/services/send-queue.ts:34,46; kernel/outbox/relay.ts:46; test inbox.test.ts AC3, relay-sequence.test.ts |
| REQ-B02a | Zalo cá nhân kết nối QR | 01-REQUIREMENTS-MATRIX.md:49 | 014 | CHỜ-TK | channels/actions/channel-connect.handlers.ts:24; zalo-personal/zca-transport.ts:77; test channels.test.ts AC3 — Q-003 |
| REQ-B02b | Credential mã hoá, tự kết nối lại | 01-REQUIREMENTS-MATRIX.md:49 | 014 | CHỜ-TK | channels/jobs/sessions.ts; test channels.test.ts AC3/AC9 — Q-003 |
| REQ-B02c | Nhận / gửi 1-1 text, ảnh, file, sticker | 01-REQUIREMENTS-MATRIX.md:49 | 014, 016 | CHỜ-TK | zalo-personal/adapter.ts:101-114; test zalo-adapter.test.ts — Q-003 |
| REQ-B02d | Đồng bộ danh bạ Zalo | 01-REQUIREMENTS-MATRIX.md:49 | 014b | ĐẠT | TIP-014b D3: `channel.sync_contacts` → ảnh chụp danh bạ riêng 24 giờ (core/src/channels/operations/contact-sync.ts), nhập khách chỉ khi chọn tay qua `contact.import`; test apps/api/test/integration/channel-contact-sync.test.ts, packages/core/test/channel-contacts-sync.test.ts; Zalo thật chờ Q-003 (DEF-014-1) |
| REQ-B02e | Đồng bộ tin gần đây | 01-REQUIREMENTS-MATRIX.md:49 | 014 | CHỜ-TK | adapter.ts:95; channel-manage.handlers.ts:88; test channels.test.ts AC6 — Q-003 |
| REQ-B02f | Báo trạng thái kênh | 01-REQUIREMENTS-MATRIX.md:49 | 014 | ĐẠT | sessions.ts:149; test channels.test.ts AC9 |
| REQ-B03a | Nhận tin nhóm Zalo | 01-REQUIREMENTS-MATRIX.md:50 | 014, 016 | CHỜ-TK | test inbox.test.ts AC2 (nhóm → participant), zalo-adapter.test.ts — Q-003 |
| REQ-B03b | AI nhóm 3 chế độ đổi được | 01-REQUIREMENTS-MATRIX.md:50 | 025b | MỘT PHẦN | Backend đọc group_ai_policy (pipeline.ts:29; agent-reply.test.ts); FE đổi chỉ useState (GroupSections.tsx:37,109), không action ghi |
| REQ-B04a | Cảnh báo rủi ro khi kết nối Zalo | 01-REQUIREMENTS-MATRIX.md:51 | 014c | CHƯA | manifest.ts:11 riskNotice không được FE dùng, không có chuỗi i18n; TIP-014c nhận (2026-11-02) |
| REQ-B04b | Random delay + giới hạn / phút | 01-REQUIREMENTS-MATRIX.md:51 | 014 | CHỜ-TK | channels/jobs/send.processor.ts:42-59; test channels.test.ts AC8 — Q-003 |
| REQ-B04c | Quota tin / ngày | 01-REQUIREMENTS-MATRIX.md:51 | 037 | MỘT PHẦN | send.processor.ts:43 chỉ tin chủ động, không số mặc định (Q-013) |
| REQ-B04d | Tự ngắt khi bị chặn | 01-REQUIREMENTS-MATRIX.md:51 | 014 | CHỜ-TK | sessions.ts:149; test channels.test.ts AC8/AC9 — Q-003 |
| REQ-B05a | Widget JS nhúng, realtime | 01-REQUIREMENTS-MATRIX.md:52 | 017 | ĐẠT | apps/widget/src/main.ts:55; test webchat.test.ts, apps/widget/test/ui.test.ts, e2e http/webchat.spec.ts |
| REQ-B05b | Tuỳ chỉnh màu, lời chào | 01-REQUIREMENTS-MATRIX.md:52 | 017 | ĐẠT | packages/actions/src/settings-apps.ts:256-261; test webchat.test.ts AC2 |
| REQ-B05c | Tuỳ chỉnh logo widget | 01-REQUIREMENTS-MATRIX.md:52 | 017b | CHƯA | webchat.update_widget không có ô logo (settings-apps.ts:256-275); TIP-017b nhận (2026-11-02) |
| REQ-B05d | Form thu lead (pre-chat) | 01-REQUIREMENTS-MATRIX.md:52 | 017 | ĐẠT | channels/webchat/widget.service.ts:48; test webchat.test.ts AC3+AC4 |
| REQ-B05e | Chọn AI Agent trực widget | 01-REQUIREMENTS-MATRIX.md:52 | 017, 022 | ĐẠT | settings-apps.ts:266; e2e http/agent-reply.spec.ts |
| REQ-B06a | Email IMAP + SMTP | 01-REQUIREMENTS-MATRIX.md:53 | 018 | ĐẠT | packages/channels/src/email/imap-transport.ts:122; test email.test.ts, email-adapter.test.ts, smtp.test.ts |
| REQ-B06b | Gmail OAuth | 01-REQUIREMENTS-MATRIX.md:53 | 018b | CHƯA | Không nhánh OAuth; Q-016 mở; TIP-018b nhận (2026-11-02) |
| REQ-B06c | Gom email theo thread | 01-REQUIREMENTS-MATRIX.md:53 | 018 | ĐẠT | channels/email/threads.ts:19; test email.test.ts AC3/AC4 |
| REQ-B07 | Trang Kênh kết nối: danh sách, sức khoẻ, kết nối lại, ngắt | 01-REQUIREMENTS-MATRIX.md:54 | 014 | ĐẠT | channel-manage.handlers.ts:142; test channels.test.ts AC5/AC9/AC10, e2e http/channels.spec.ts |
| REQ-B08 | Zalo OA / FB / IG / Telegram / WhatsApp / TikTok | 01-REQUIREMENTS-MATRIX.md:55 | — | NGOÀI | P2 theo ma trận, D04 |
| REQ-B09a | Một kênh nhiều tài khoản; sức khoẻ = tài khoản kém nhất | 01-REQUIREMENTS-MATRIX.md:56 | 014 | ĐẠT | channels/services/read.service.ts:50; test channels.test.ts AC5/AC10 |
| REQ-B09b | Bộ lọc tài khoản Hộp thư cùng dữ liệu | 01-REQUIREMENTS-MATRIX.md:56 | 016, 025 | ĐẠT | GET /inbox/accounts; test inbox-ui.test.ts "lọc tài khoản" |
| REQ-B10a | Kết nối 3 bước + cấu hình nhanh | 01-REQUIREMENTS-MATRIX.md:57 | 014, 018 | ĐẠT | features/settings/components/ConnectChannelModal.tsx; test email.test.ts AC2, e2e http/channels.spec.ts |
| REQ-B10b | OAuth / kênh ngoài manifest "Sắp có" | 01-REQUIREMENTS-MATRIX.md:57 | 014 | ĐẠT | packages/channels/src/coming-soon.ts; test channels.test.ts AC5 |
| REQ-B10c | Kết nối kênh qua Trợ lý (QR trong chat) | 02-TASK-GRAPH.md:82 | 023c | CHỜ-TK | Khối qr + channel.status (packages/core/src/channels/actions/channel-status.handler.ts, services/login-attempt.ts), assistant.resume theo biên nhận; test genui-qr.test.ts, channel.status.action.test.ts, ai:live connect-zalo-qr pass; quét QR Zalo thật chưa nghiệm thu (Q-003) |
| REQ-B11a | Drawer: kiểm tra, đồng bộ lại | 01-REQUIREMENTS-MATRIX.md:58 | 014 | ĐẠT | channel-manage.handlers.ts:88,111; test channels.test.ts AC6 |
| REQ-B11b | Hiệu suất 7 ngày | 01-REQUIREMENTS-MATRIX.md:58 | 014 | ĐẠT | read.service.ts:72; test channels.test.ts AC5 |
| REQ-B11c | Trả lời tự động: agent, chế độ, giờ, lời chào | 01-REQUIREMENTS-MATRIX.md:58 | 022b | MỘT PHẦN | agent / ai_mode / greeting dùng; hours chỉ chèn prompt (reply-context.ts:93), không chặn ngoài giờ Planned022b: explicit behavior, scoped action/receipt, UI/native/real-model acceptance; no runtime promotion. |
| REQ-B11d | Phân công & SLA theo tài khoản | 01-REQUIREMENTS-MATRIX.md:58 | 014c | MỘT PHẦN | assign_mode / sla_policy chỉ lưu (accounts.service.ts:18-19), không code đọc; TIP-014c nhận (2026-11-02) |
| REQ-B11e | Đồng bộ: tin nhắn, tự tạo liên hệ, lịch sử 0/7/30/90 | 01-REQUIREMENTS-MATRIX.md:58 | 014b | ĐẠT | TIP-014b D1 + C2: core/src/inbox/services/inbound-sync-policy.ts áp sync_messages / sync_auto_create_contact trước khi ghi (live + lịch sử chung chính sách); lịch sử 0/7/30/90 bền có giới hạn (operations/history-run.ts); test apps/api/test/integration/channel-sync-policy.test.ts, channel-history.test.ts |
| REQ-B11f | Vùng nguy hiểm: tạm dừng / tiếp tục, kết nối lại, ngắt | 01-REQUIREMENTS-MATRIX.md:58 | 014 | ĐẠT | channel-manage.handlers.ts:50,68,142; test channels.test.ts AC6/AC9/AC10 |
| REQ-C01a | Inbox 3 cột chạy API thật | 01-REQUIREMENTS-MATRIX.md:63 | 016, 025 | ĐẠT | features/inbox/screens/InboxScreen.tsx; e2e http/inbox.spec.ts, http/inbox-live.spec.ts |
| REQ-C01b | Realtime WebSocket | 01-REQUIREMENTS-MATRIX.md:63 | 006, 025 | ĐẠT | test inbox.test.ts AC9, inbox-ui.test.ts "realtime", e2e http/inbox-live.spec.ts |
| REQ-C01c | Đo p95 < 1s | 01-REQUIREMENTS-MATRIX.md:63 | 046 | CHƯA | Chưa có phép đo |
| REQ-C02 | Chế độ AI off / copilot / auto + mặc định theo kênh | 01-REQUIREMENTS-MATRIX.md:64 | 016, 022 | ĐẠT | inbox/actions/conversation-state.handlers.ts:96; test agent-reply.test.ts "copilot" |
| REQ-C03 | Folder views (AI đang xử lý, Cần người, AI chờ duyệt…) | 01-REQUIREMENTS-MATRIX.md:65 | 016 | ĐẠT | inbox/repos/conversations.repo.ts:31-59; test inbox.test.ts AC7 |
| REQ-C04a | Gán cho người hoặc AI Agent | 01-REQUIREMENTS-MATRIX.md:66 | 016 | ĐẠT | conversation-assign.handlers.ts:23; test inbox.test.ts AC5 |
| REQ-C04b | Gắn thẻ dùng chung | 01-REQUIREMENTS-MATRIX.md:66 | 016 | ĐẠT | conversation-assign.handlers.ts:47,66; test inbox.test.ts AC5/AC8 |
| REQ-C04c | Ghi chú nội bộ @mention | 01-REQUIREMENTS-MATRIX.md:66 | 016, 025 | ĐẠT | message.handlers.ts:188; test inbox-ui.test.ts "note.add @nhắc" |
| REQ-C04d | Ghim, lưu trữ | 01-REQUIREMENTS-MATRIX.md:66 | 016 | ĐẠT | conversation-state.handlers.ts:58,68; test inbox.test.ts AC5 |
| REQ-C05a | Composer đính kèm file | 01-REQUIREMENTS-MATRIX.md:67 | 025 | ĐẠT | Composer.tsx:84; test inbox-ui.test.ts "Email: gửi ảnh" |
| REQ-C05b | Câu trả lời mẫu | 01-REQUIREMENTS-MATRIX.md:67 | 016, 025 | ĐẠT | ComposerPopovers.tsx:33-50; test inbox.test.ts AC8 |
| REQ-C05c | AI soạn / viết lại trong composer | 01-REQUIREMENTS-MATRIX.md:67 | 023c | ĐẠT | packages/core/src/ai/assistant/genui/inbox-draft.ts:3 (inbox.reply + scope trước model, không tool) + apps/web/src/features/inbox/hooks/useAssistantDraft.ts; test inbox-assistant-draft.test.ts (core + api), useAssistantDraft.test.tsx, e2e inbox.spec.ts, ai:live inbox-rewrite-draft pass (PD-010) |
| REQ-C05d | Tự dịch tin gửi đi | 01-REQUIREMENTS-MATRIX.md:67 | 025b | GIẢ | Popover xl chỉ bật cờ ui.autoXl (ComposerPopovers.tsx:96); submit không dịch Planning owner025b TranslationSPEC3/AC7 covers outgoing target preview/confirmation/stale drafts/revoke/no-credit; runtime status unchanged. |
| REQ-C05e | Nhãn ý định MUA / HỎI / KHIẾU NẠI / ĐẶT LỊCH | 01-REQUIREMENTS-MATRIX.md:67 | 022b | CHƯA | conversation.intent (inbox.prisma:125) không nơi ghi; intent agent (packages/ai/src/reply/output.ts:9) bị bỏ Planned022b: explicit behavior, scoped action/receipt, UI/native/real-model acceptance; no runtime promotion. |
| REQ-C06a | Tự gắn khách theo ID kênh / SĐT | 01-REQUIREMENTS-MATRIX.md:68 | 015, 016 | ĐẠT | crm/services/identity.service.ts:30-55; test inbox.test.ts AC2 |
| REQ-C06b | Chưa có thì tạo hồ sơ nháp | 01-REQUIREMENTS-MATRIX.md:68 | 015 | ĐẠT | identity.service.ts:40-47; test inbox.test.ts AC2 |
| REQ-C06c | Khớp không chắc → gợi ý gộp | 01-REQUIREMENTS-MATRIX.md:68 | 015, 026 | ĐẠT | crm/services/crm-read.service.ts:107; test crm-contacts.test.ts AC7 |
| REQ-C07 | "Chuyển thành" Đơn / Báo giá / Lịch hẹn / Ticket gắn hội thoại | 01-REQUIREMENTS-MATRIX.md:69 | 025b | MỘT PHẦN | Profile360Actions.tsx:52-55 mở form chỉ có contact_id; quote / order không nhận conversation_id; chỉ e2e mock inbox.spec.ts:69 |
| REQ-C08a | Thao tác hàng loạt hội thoại (backend) | 01-REQUIREMENTS-MATRIX.md:70 | 016 | ĐẠT | conversation-assign.handlers.ts:100; test inbox.test.ts AC5 |
| REQ-C08b | Multi-select hội thoại trên UI | 01-REQUIREMENTS-MATRIX.md:70 | 025b | CHƯA | FE không gọi conversation.bulk_update; Q-019 mở |
| REQ-C08c | Tìm không dấu | 01-REQUIREMENTS-MATRIX.md:70 | 016, 025 | ĐẠT | test inbox.test.ts AC7, e2e http/inbox-live.spec.ts:41 |
| REQ-C09a | Cảm xúc (bấm lại bỏ), chỉ hiện ở kênh hỗ trợ | 01-REQUIREMENTS-MATRIX.md:71 | 025b | MỘT PHẦN | Backend ĐẠT (message.handlers.ts:148; inbox.test.ts AC6); FE hiện mọi kênh (MessageMenu.tsx:76) |
| REQ-C09b | Trả lời trích · Sao chép · Chuyển tiếp · Ghim | 01-REQUIREMENTS-MATRIX.md:71 | 016, 025 | ĐẠT | MessageMenu.tsx:35-38; message.handlers.ts:76,161; test inbox.test.ts AC3/AC6 |
| REQ-C09c | Dịch tin | 01-REQUIREMENTS-MATRIX.md:71 | 025 | CHỜ-TK | ai/skills/translate.handler.ts:22; test inbox-ui.test.ts "ai.translate (model giả)" — Q-001 |
| REQ-C09d | Tạo ticket từ tin | 01-REQUIREMENTS-MATRIX.md:71 | 025, 034 | ĐẠT | MessageMenu.tsx:41-48; TicketsScreen.tsx:45; test support.test.ts (source_message_id) |
| REQ-C09e | Thu hồi / Xoá có xác nhận | 01-REQUIREMENTS-MATRIX.md:71 | 016 | ĐẠT | message.handlers.ts:100,115; test inbox.test.ts AC6 |
| REQ-C10a | Đóng · Tạm ẩn 1 giờ / 3 giờ / sáng mai / tuỳ chọn | 01-REQUIREMENTS-MATRIX.md:72 | 014c | MỘT PHẦN | ConvMenu.tsx:63 "sáng mai" = +16 giờ, "tuỳ chọn" = +24 giờ cố định; TIP-014c nhận (2026-11-02) |
| REQ-C10b | Phím tắt chèn câu trả lời mẫu | 01-REQUIREMENTS-MATRIX.md:72 | 025 | ĐẠT | ConvMenu.tsx:110-119; e2e inbox.spec.ts:23 |
| REQ-C10c | Phân công nhân viên + agent kèm tải | 01-REQUIREMENTS-MATRIX.md:72 | 025b | MỘT PHẦN | ConvMenu.tsx:121-140 không hiện tải |
| REQ-C10d | Vòng đời = contact.stage (D49) | 01-REQUIREMENTS-MATRIX.md:72 | 025 | ĐẠT | ConvMenu.tsx:16,143; test crm-contacts.test.ts |
| REQ-C10e | Gắn nhiều thẻ, tạo thẻ mới | 01-REQUIREMENTS-MATRIX.md:72 | 016, 025 | ĐẠT | ConvMenu.tsx:168; test inbox.test.ts AC5 |
| REQ-C10f | Lưu trữ · Ẩn trò chuyện · Xoá lịch sử | 01-REQUIREMENTS-MATRIX.md:72 | 016 | ĐẠT | conversation-state.handlers.ts:68,82,125; test inbox.test.ts AC5 |
| REQ-C10g | Tạo nhóm "Sắp có" | 01-REQUIREMENTS-MATRIX.md:72 | 025 | ĐẠT | ConvMenu.tsx:189 (D50) |
| REQ-C11a | Menu ＋: Thêm tệp · Chụp ảnh màn hình | 01-REQUIREMENTS-MATRIX.md:73 | 025b | GIẢ | "Chụp ảnh màn hình" chỉ đóng menu (AgentToolsMenu.tsx:32) |
| REQ-C11b | Quyền của agent chỉ xem, nhóm module + Kỹ năng AI, badge, link Builder | 01-REQUIREMENTS-MATRIX.md:73 | 021, 025 | ĐẠT | AgentToolsMenu.tsx:36-64; test agents.test.ts AC5 |
| REQ-C11c | Research / Web search "Sắp có" (D48) | 01-REQUIREMENTS-MATRIX.md:73 | 025 | ĐẠT | AgentToolsMenu.tsx:56-59 |
| REQ-C12 | Tìm trong hội thoại không dấu, N/M, lọc người gửi | 01-REQUIREMENTS-MATRIX.md:74 | 025b | MỘT PHẦN | Backend TIP016/025 có search (conversations.controller.ts:57; read.service.ts:119; inbox.test.ts AC7). Rà lại 2026-11-02: apps/web/src/features/inbox/components/ThreadSearchBar.tsx:37–40 chỉ cuộn DOM đã tải; :54–57 chỉ Escape/Enter, thiếu phím lên/xuống và tải tin cũ để định vị. TIP025b SPEC search/AC2 nhận phím lên/xuống, old-hit positioning và bounded native query; chưa triển khai, không dùng TIP đã DONE làm owner sửa lỗi. |
| REQ-C13 | Header + khung nhập ver2.1 | 01-REQUIREMENTS-MATRIX.md:75 | 025 | ĐẠT | ChatHeader.tsx:27; Composer.tsx:147; MessageBubble.tsx:139; e2e inbox.spec.ts |
| REQ-D01a | Agent runtime sau Agent Gateway | 01-REQUIREMENTS-MATRIX.md:80 | 019 | ĐẠT | packages/ai/src/gateway/engine.ts:35; test packages/ai/test/engine.test.ts |
| REQ-D01b | Ngữ cảnh → RAG → tools → trả lời, bất đồng bộ trong worker | 01-REQUIREMENTS-MATRIX.md:80 | 022 | ĐẠT | ai/reply/reply.service.ts; test agent-reply.test.ts "worker ROLE=ai" |
| REQ-D01c | Stream kết quả | 01-REQUIREMENTS-MATRIX.md:80 | 023c | ĐẠT | Chữ hiện dần qua SSE + khung xương cây từ tool-input delta (packages/ai/src/genui/structured-stream.ts, apps/web/src/shared/genui/GenUiSkeleton.tsx); test genui-structured-stream.test.ts, genui-stream.test.ts, GenUiSkeleton.test.tsx |
| REQ-D02a | LLM Router đa provider + OpenAI-compatible | 01-REQUIREMENTS-MATRIX.md:81 | 019 | CHỜ-TK | packages/ai/src/router/providers.ts; test router.test.ts — Q-001 |
| REQ-D02b | Định tuyến theo tác vụ / mức, fallback | 01-REQUIREMENTS-MATRIX.md:81 | 019 | ĐẠT | packages/ai/src/router/router.ts:29; test router.test.ts "503 → provider kế" |
| REQ-D02c | Ẩn tên model | 01-REQUIREMENTS-MATRIX.md:81 | 019 | ĐẠT | test ai-runtime.test.ts AC5 |
| REQ-D03a | Tools agent ⊆ Action Registry, cấp theo agent | 01-REQUIREMENTS-MATRIX.md:82 | 021 | ĐẠT | ai/agents/agent-tools.ts:57; test agents.test.ts AC2 |
| REQ-D03b | Bộ tool mặc định Sales đủ (SP / giá / tồn, đơn, lịch, ticket, gửi file…) | 01-REQUIREMENTS-MATRIX.md:82 | 022b | MỘT PHẦN | templates.seed.ts:9 sales chỉ 4 tool Planned022b: explicit behavior, scoped action/receipt, UI/native/real-model acceptance; no runtime promotion. |
| REQ-D04a | Kho RAG thư mục, thẻ, tải PDF/DOCX/XLSX/CSV/TXT/MD | 01-REQUIREMENTS-MATRIX.md:83 | 020 | ĐẠT | ai/kb/parse.ts:18; kb.handlers.ts:33,160; test kb.test.ts AC4, e2e http/rag.spec.ts |
| REQ-D04a-2 | Nguồn URL, văn bản, danh mục sản phẩm | 01-REQUIREMENTS-MATRIX.md:83 | 020, 027 | ĐẠT | kb.handlers.ts:63-71; catalog/events/catalog-sync.ts; test kb.test.ts, catalog.test.ts:212 |
| REQ-D04c | Trạng thái index, số đoạn, index lại | 01-REQUIREMENTS-MATRIX.md:83 | 020 | ĐẠT | kb.handlers.ts:137; test kb.test.ts AC6 |
| REQ-D04d | public / internal | 01-REQUIREMENTS-MATRIX.md:83 | 020 | ĐẠT | kb-search.handler.ts:15; test kb.test.ts AC5 |
| REQ-D04e | Hybrid + không dấu + ngưỡng căn cứ + trích nguồn | 01-REQUIREMENTS-MATRIX.md:83 | 020 | CHỜ-TK | ai/kb/search.ts:77; test kb.test.ts AC5 (embed giả) — Q-002 |
| REQ-D04f | Giá / tồn / lịch không lấy từ RAG | 01-REQUIREMENTS-MATRIX.md:83 | 020, 027 | ĐẠT | test kb.test.ts "đoạn có giá không bao giờ ra" |
| REQ-D04b | AI học từ hội thoại, người duyệt | 01-REQUIREMENTS-MATRIX.md:84 | 043 | ĐẠT | Học từ hội thoại đóng → đề xuất đã che PII → duyệt / từ chối ở Dữ liệu RAG; e2e kb-suggestions mock + http; ai:live 5/5 (TIP-043) |
| REQ-D05a | Tự làm khi tin cậy ≥ 70% | 01-REQUIREMENTS-MATRIX.md:85 | 022 | ĐẠT | packages/ai/src/reply/handoff.ts:26; test reply.test.ts, agent-reply.test.ts |
| REQ-D05b | Ép duyệt: giảm giá ngoài chính sách, hoàn tiền, báo giá > 20M, HĐ, gửi hàng loạt | 01-REQUIREMENTS-MATRIX.md:85 | 032b | MỘT PHẦN | Báo giá > ngưỡng / giảm ngoài chính sách / hoàn tiền / HĐ ép duyệt (FORCE_APPROVAL DC-329, commerce-gaps.test.ts); phần gửi hàng loạt nghiệm thu ở 037 — không hạ luật 20M / 5% |
| REQ-D06a | Handoff theo các lý do | 01-REQUIREMENTS-MATRIX.md:86 | 022 | ĐẠT | handoff.ts:26; test agent-reply.test.ts |
| REQ-D06b | Handoff kèm nháp + folder Cần người | 01-REQUIREMENTS-MATRIX.md:86 | 022 | ĐẠT | reply.service.ts:76; test agent-reply.test.ts "độ tin cậy thấp" |
| REQ-D06c | Handoff kèm tóm tắt | 01-REQUIREMENTS-MATRIX.md:86 | 022b | MỘT PHẦN | Chỉ lý do; tóm tắt chỉ khi agent tự gọi tool (reply.service.ts:107) Planned022b: explicit behavior, scoped action/receipt, UI/native/real-model acceptance; no runtime promotion. |
| REQ-D07a | Hàng chờ duyệt Duyệt / Sửa / Từ chối | 01-REQUIREMENTS-MATRIX.md:87 | 021, 024 | ĐẠT | approval.handlers.ts:74-92; test agents.test.ts AC4, e2e http/agents-ui.spec.ts:60 |
| REQ-D07b | Duyệt ở thông báo | 01-REQUIREMENTS-MATRIX.md:87 | 021 | ĐẠT | ai/events/agents.rules.ts:8; test agents.test.ts AC4 |
| REQ-D07c | Thẻ duyệt trong Inbox | 01-REQUIREMENTS-MATRIX.md:87 | 025b | CHƯA | Chỉ folder ai_pending_approval (FolderRail.tsx:108) |
| REQ-D07d | Thẻ duyệt ở Tổng quan | 01-REQUIREMENTS-MATRIX.md:87 | 038 | GIẢ | GET /dashboard missing ở API |
| REQ-D08a | Nhật ký run (prompt, nguồn, tools, token, credit) | 01-REQUIREMENTS-MATRIX.md:88 | 019 | ĐẠT | ai/runs/run.store.ts; test ai-runtime.test.ts AC4 |
| REQ-D08b | Hoàn tác nhóm cho phép | 01-REQUIREMENTS-MATRIX.md:88 | 003, 024 | ĐẠT | kernel/actions/undo.service.ts:19; test actions.test.ts AC7 |
| REQ-D09a | Builder đủ trường | 01-REQUIREMENTS-MATRIX.md:89 | 021, 024 | ĐẠT | ai/agents/agent.handlers.ts:30-130; test agents.test.ts, agents-ui.test.ts |
| REQ-D09a-2 | "Tối ưu prompt" bằng AI | 01-REQUIREMENTS-MATRIX.md:89 | 021 | CHỜ-TK | agent-llm.handlers.ts:99; test agents.test.ts AC3 — Q-001 |
| REQ-D09c | Nháp ↔ đang chạy, phiên bản, quay lại | 01-REQUIREMENTS-MATRIX.md:89 | 021 | ĐẠT | agent.handlers.ts:86,98; test agents.test.ts AC2 |
| REQ-D09d | Chat thử giả lập | 01-REQUIREMENTS-MATRIX.md:89 | 021 | ĐẠT | agent-llm.handlers.ts:38; test agents.test.ts AC3 |
| REQ-D09b-a | 3 cách tạo agent | 01-REQUIREMENTS-MATRIX.md:90 | 021, 024 | ĐẠT | agent.handlers.ts:41; agent-llm.handlers.ts:74; e2e http/agents-ui.spec.ts:15 |
| REQ-D09b-b | Tools ⊆ quyền ∩ agentGrantable; max_agents | 01-REQUIREMENTS-MATRIX.md:90 | 021 | ĐẠT | test agents.test.ts AC2/AC3 |
| REQ-D10a | Agent đọc 360° (mua, hẹn, ghi chú, hạng) | 01-REQUIREMENTS-MATRIX.md:91 | 015b | ĐẠT | reply-context.ts đọc 20 fact (recentFacts) + Trợ lý contact.get_360 trả memory (DC-344); ai:live mem-allergy-recall 3/3 |
| REQ-D10b | Agent ghi sự kiện về khách | 01-REQUIREMENTS-MATRIX.md:91 | 015b | ĐẠT | contact.remember (agentGrantable, trần 50 + chống trùng trigram, chặn CCCD / thẻ / mật khẩu — normalize.ts sensitive); contact-memory.test.ts; ai:live mem-pii-refused 3/3 |
| REQ-D11a | Lọc PII trước prompt | 01-REQUIREMENTS-MATRIX.md:92 | 022 | ĐẠT | packages/ai/src/reply/pii.ts:28; test reply.test.ts, agent-reply.test.ts "PII" |
| REQ-D11b | Guardrail + từ cấm | 01-REQUIREMENTS-MATRIX.md:92 | 021, 022 | ĐẠT | governance.ts:31; test agent-reply.test.ts "từ cấm" |
| REQ-D12 | Chủ động theo lịch, tôn trọng giới hạn Zalo | 01-REQUIREMENTS-MATRIX.md:93 | 035 | ĐẠT | ai/tasks/task-scheduler.ts, task-targets.ts; test ai-tasks.test.ts:199,257,312 |
| REQ-D13a | Chuyển hội thoại + hỏi ý agent khác | 01-REQUIREMENTS-MATRIX.md:94 | 022 | ĐẠT | ai/reply/reply-tools.ts:16; test agent-reply.test.ts "transfer", "consult" |
| REQ-D13b | Giới hạn bước, ngân sách, trace | 01-REQUIREMENTS-MATRIX.md:94 | 019, 022 | ĐẠT | reply-tools.ts:18; test agent-reply.test.ts "A → B → A" |
| REQ-D15 | 6 agent mẫu + mẫu ngành | 01-REQUIREMENTS-MATRIX.md:95 | 021, 024 | ĐẠT | ai/agents/templates.seed.ts:8-15; test agents-ui.test.ts "D15" |
| REQ-D14a | Số hội thoại, tỉ lệ tự xử lý | 01-REQUIREMENTS-MATRIX.md:96 | 021 | ĐẠT | ai/agents/agents.read.ts:22-45; test agents.test.ts AC5 |
| REQ-D14b | Tỉ lệ chốt, CSAT, credit, so với nhân sự | 01-REQUIREMENTS-MATRIX.md:96 | 038 | CHƯA | agents.read.ts:40 csat: 0 cứng |
| REQ-D16a | Tools nhóm module + Kỹ năng AI, n/tổng | 01-REQUIREMENTS-MATRIX.md:97 | 021 | ĐẠT | agent-tools.ts:35; test agents.test.ts AC5, apps/web/src/shared/ai/agent-tools.test.ts |
| REQ-D16b | Badge Cần kết nối / Sắp có | 01-REQUIREMENTS-MATRIX.md:97 | 021 | ĐẠT | agent-tools.ts:25-28; test agents.test.ts AC5 |
| REQ-D17a | kb_scope chọn trong Builder | 01-REQUIREMENTS-MATRIX.md:98 | 020, 021 | ĐẠT | agent.store.ts:98; KnowledgeSection.tsx:22-45; e2e agents.spec.ts:91 |
| REQ-D17b | Trả lời khách chỉ public trong kb_scope | 01-REQUIREMENTS-MATRIX.md:98 | 022 | ĐẠT | reply-context.ts:86; test agent-reply.test.ts |
| REQ-D17c | delegate / Cowork: kb_scope ∩ quyền người ra lệnh | 01-REQUIREMENTS-MATRIX.md:98 | 020c | CHƯA | kb.search bỏ qua kb_scope (kb-search.handler.ts:26); delegate / task không truyền phạm vi |
| REQ-D17d | Trợ lý: cả kho trong quyền đọc người hỏi | 01-REQUIREMENTS-MATRIX.md:98 | 020 | ĐẠT | kb-search.handler.ts:15; test kb.test.ts "Owner thấy internal, sales chỉ public" |
| REQ-E01 | Action Registry dùng chung, một đường thực thi | 01-REQUIREMENTS-MATRIX.md:103 | 003 | ĐẠT | packages/actions/src/define.ts:42; kernel/actions/executor.ts:73; test registry.test.ts, actions.test.ts, actions-unit.test.ts |
| REQ-E02 | Trợ lý làm mọi action với quyền người ra lệnh | 01-REQUIREMENTS-MATRIX.md:104 | 023b | ĐẠT | meta-tools.ts quyền hiện tại mỗi lần gọi; action đọc search/get; khuôn lồng nhau (catalog.ts briefSchema); test assistant-vertical.test.ts (scope sales → 404) |
| REQ-E03a | Đọc chạy ngay; ghi hiện thẻ Xác nhận / Huỷ | 01-REQUIREMENTS-MATRIX.md:105 | 023 | ĐẠT | ai/assistant/card.ts; test assistant.test.ts "ghi → thẻ confirm" |
| REQ-E03b | Thẻ có diff + nút Sửa | 01-REQUIREMENTS-MATRIX.md:105 | 023b | ĐẠT | ActionPreviewCard.tsx (changes trước → sau, Sửa) + EditActionPreviewModal.tsx; POST /assistant/preview-edit (edit-preview.ts); test assistant-preview-edit.test.ts, e2e http assistant-vertical (PD-008, DC-312) |
| REQ-E03c | Hàng loạt bắt buộc xác nhận số lượng | 01-REQUIREMENTS-MATRIX.md:105 | 003 | ĐẠT | policy.ts:24; test actions-unit.test.ts "bulk luôn preview" |
| REQ-E03d | Đề xuất tái dùng luồng trước | 01-REQUIREMENTS-MATRIX.md:105 | 023d | CHƯA | Không có code |
| REQ-E04a | Phân rã kế hoạch, giao agent, tổng hợp | 01-REQUIREMENTS-MATRIX.md:106 | 023 | ĐẠT | meta-tools.ts:124; delegate.ts; test assistant.test.ts "plan", "delegate" |
| REQ-E04b | Hiện kế hoạch + tiến độ; dừng / sửa kế hoạch | 01-REQUIREMENTS-MATRIX.md:106 | 023d | MỘT PHẦN | Dừng qua run.cancel; FE không render plan (features/assistant/types.ts:45); không sửa kế hoạch |
| REQ-E05a | Điều hướng, mở bản ghi, điền form, áp lọc qua command bus | 01-REQUIREMENTS-MATRIX.md:107 | 023 | ĐẠT | apps/web/src/shared/assistant/ui-command-bus.ts; features/*/ui-commands.ts; test ui-command-bus.test.ts, ui-commands.test.tsx |
| REQ-E05b | Làm nổi bật phần tử | 01-REQUIREMENTS-MATRIX.md:107 | 023c | ĐẠT | UiCommandBus highlight (apps/web/src/shared/assistant/ui-command-bus.ts:17) + DataTable highlightKey; test ui-command-bus.test.ts, e2e screen-assistant.spec.ts tô sáng dòng |
| REQ-E05c | Thẻ deep-link tới kết quả | 01-REQUIREMENTS-MATRIX.md:107 | 023 | ĐẠT | card.ts; e2e http/assistant.spec.ts |
| REQ-E06a | Trợ lý theo module tự nạp ngữ cảnh | 01-REQUIREMENTS-MATRIX.md:108 | 023c | ĐẠT | useRegisterScreenContext mỗi feature → context route / entity / id / selection (apps/web/src/shared/assistant/screen-context.ts); server đọc lại theo quyền (packages/core/src/ai/assistant/genui/context.ts); test genui-context.test.ts, screen-context.test.tsx, e2e/http/screen-assistant.spec.ts |
| REQ-E06b | Gọi bằng Ctrl+K | 01-REQUIREMENTS-MATRIX.md:108 | 023 | ĐẠT | apps/web/src/shared/shell/AppShell.tsx:29; e2e shell.spec.ts:44 |
| REQ-E07 | Truy vấn / phân tích NL có nguồn | 01-REQUIREMENTS-MATRIX.md:109 | 038, 023c | CHƯA | meta-tools.ts:117 query_data NOT_IMPLEMENTED |
| REQ-E08 | Briefing đầu ngày | 01-REQUIREMENTS-MATRIX.md:110 | 035 | ĐẠT | ai/tasks/task-briefing.ts; test ai-tasks.test.ts:330 |
| REQ-E09a | Ghi mọi action Trợ lý / agent (ai, input, trước/sau) | 01-REQUIREMENTS-MATRIX.md:111 | 003, 024 | ĐẠT | packages/db/prisma/tenant/kernel.prisma:50-54; test assistant.test.ts, agents-ui.test.ts |
| REQ-E09b | Lọc theo loại | 01-REQUIREMENTS-MATRIX.md:111 | 024 | ĐẠT | ai/assistant/action-logs.read.ts:12; test agents-ui.test.ts |
| REQ-E09c | Hoàn tác trong hạn; đã gửi → ghi đính chính | 01-REQUIREMENTS-MATRIX.md:111 | 003e | MỘT PHẦN | Undo ĐẠT; không cơ chế đính chính; TIP-003e nhận (2026-11-02) |
| REQ-E10a | Danh sách phiên, tìm, mở lại | 01-REQUIREMENTS-MATRIX.md:112 | 023c | ĐẠT | GET /assistant/sessions keyset (last_message_at, id) + tìm trigram; FE SessionBrowser.tsx; test assistant-sessions.test.ts, e2e screen-assistant.spec.ts lịch sử trò chuyện |
| REQ-E10b | Nhớ ngữ cảnh dài trong phiên | 01-REQUIREMENTS-MATRIX.md:112 | 023 | ĐẠT | ai/assistant/sessions.ts:10,63; test assistant.test.ts |
| REQ-E11a | Chat / Cowork | 01-REQUIREMENTS-MATRIX.md:113 | 023 | ĐẠT | meta-tools.ts:53; test assistant.test.ts "ghi ở Chat → FORBIDDEN" |
| REQ-E11b | Chọn agent + cấp độ AI | 01-REQUIREMENTS-MATRIX.md:113 | 023d | MỘT PHẦN | Mức AI ĐẠT; chọn agent chỉ lưu ui.agent (ComposerPopovers.tsx:92), sendTurn không gửi |
| REQ-E12a | Đính kèm tệp / ảnh / email vào lệnh | 01-REQUIREMENTS-MATRIX.md:114 | 023f | GIẢ | Mục file không upload; server chỉ nhận tên (assistant-prompt.ts:35) |
| REQ-E12b | Nhập lệnh bằng giọng nói | 01-REQUIREMENTS-MATRIX.md:114 | 023f | GIẢ | Nút mic không onClick (features/assistant/components/Composer.tsx:76) |
| REQ-E13a | Coworks ngay / lịch / sự kiện | 01-REQUIREMENTS-MATRIX.md:115 | 035 | ĐẠT | ai/tasks/task.handlers.ts:35,186; test ai-tasks.test.ts:143,199,228 |
| REQ-E13b | Giới hạn công cụ / dữ liệu / credit | 01-REQUIREMENTS-MATRIX.md:115 | 035 | ĐẠT | test ai-tasks.test.ts:246 |
| REQ-E13c | Hỏi trước khi xoá / gửi (bật tắt) | 01-REQUIREMENTS-MATRIX.md:115 | 035 | ĐẠT | policy.ts:14,21; test ai-tasks.test.ts:257,282 |
| REQ-E14a | Khung "Trợ lý AI đang điều phối" + Dừng / Duyệt & gửi | 01-REQUIREMENTS-MATRIX.md:116 | 023 | ĐẠT | RunsOrchestrationBar.tsx:35,108; test ai-runtime.test.ts AC5 |
| REQ-E14b | Tab Công cụ & Quyền chỉ hiển thị + link Builder | 01-REQUIREMENTS-MATRIX.md:116 | 035 | ĐẠT | TaskDrawer.tsx:132-144; test ai-tasks.test.ts:347 |
| REQ-E15 | Generative UI mức 2 | 01-REQUIREMENTS-MATRIX.md:117 | 023c | ĐẠT | packages/shared/src/genui/* + meta-tool render + renderer web 15 khối; test schema.test.ts, genui*.test.ts (api), blocks/*.test.tsx, e2e genui.spec.ts (mock + http); ai:live genui-screen 9/10 an toàn 0 |

| PLAN-RECEIPT-PROGRESS | Plan progress from durable primary-effect receipts, not model status | DC267; TIP-023d §2 | 023d | CHƯA | Current meta-tools update_step accepts model status; planned single logical claim/reducer only |
| PLAN-EDIT-CHECKPOINT | Human edit pause drains admitted effects, checkpoints tool batches, resumes same budget | DC267; TIP-023d §3 | 023d | CHƯA | Existing engine confirmation snapshot is not edit checkpoint; no runtime implementation |
| PLAN-REUSE-PRIVACY | Reuse safe plan structure with fresh authority/inputs, no old customer or execution context | DC267; TIP-023d §4 | 023d | CHƯA | No reusable-plan service; source lineage/015c gates planned |
| ASSISTANT-SELECTED-AGENT | Stable selected agent ID/version/mode through child tools, confirmation and restart | DC267; TIP-023d §5 | 023d | CHƯA | Current card/picker stores name; request omits selection; child binding seam planned |

| INPUT-MODEL-CONTENT | Actual bounded file/image/email content with truthful source locators reaches compatible model | DC269; TIP023f §2–3 | 023f | CHƯA | prompt.ts35 only names; existing PDF parser loses pages and CSV renumbers; new source adapters planned |
| INPUT-CURRENT-HYDRATION | Every initial/history/resume/selected-child provider call hydrates current-authorized private source references | DC269; TIP023f §3 | 023f | CHƯA | Current history text-only, model route lacks required vision filter; no content hydration proof |
| INPUT-DRAFT-RECOVERY | Upload/parse/send replay preserves draft and privacy-fenced artifact state; capture/dictation never autosend | DC269; TIP023f §1/4 | 023f | CHƯA | Existing controls inert; artifact-backed recovery/native sandbox/browser lifecycle planned |

Ghi chú:
- Mock / adapter giả do thiếu tài khoản → CHỜ-TK (Q-001 LLM, Q-002 embed, Q-003 Zalo, Q-004 Brevo); GIẢ chỉ khi code tự giả.
- REQ-A02d: prototype ver2.1 đổi sang mô tả tự do, chưa có mã quyết định bỏ taxonomy.
- REQ-A07b / REQ-D07d: FE gọi route không có ở API (routes.json missing).
- Dừng sớm theo lệnh điều phối (hết quota) — một số ô chưa kiểm sâu.
Đã rà nốt 2026-11-02: REQ-D04 tách D04a–f (D04b → 043, D04e CHỜ-TK); REQ-D09b tách a/b ĐẠT; REQ-B11 tách a/b ĐẠT, c → 022b, d → 042b + 014c; REQ-C12 → 025b (thread search/phím).
