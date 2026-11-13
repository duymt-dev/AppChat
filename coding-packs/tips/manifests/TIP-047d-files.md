# TIP-047d — exact file manifest

M = sửa, C = tạo mới. Các dòng M sau chỉ làm được khi TIP đứng trước đã tích hợp:
- 047c: action / API / realtime / DTO `@appchat/shared` callcenter, `GET /calendar` có `callbacks`, `webchat.update_widget` có `settings.calls`.
- 047b: `/me.features.calls`, quyền `call.*`, addon `call_extension`, `contact_task.kind`.
- 032e: `features/finance/*`, `finance.json`, rail `finance`, `capture.ts` đã gỡ "Tài chính".
- 026c: `shared/opportunities/*`, `contact-activities` facade.

Feature mới `apps/web/src/features/callcenter/`. Host toàn cục `apps/web/src/app/(app)/_webphone/` (app được import feature — ESLint boundaries). Store / nút gọi dùng chung `apps/web/src/shared/webphone/`. Không dùng wildcard thư mục; test liệt kê từng file.

| Mode | Exact file | Responsibility |
|---|---|---|
| C | `apps/web/src/app/(app)/callcenter/page.tsx` | Route (chỉ routing) → `CallCenterScreen` |
| C | `apps/web/src/features/callcenter/index.ts` | Barrel: screen, `callsQuery`, `callMetaQuery`, `CallDetailModal` |
| C | `apps/web/src/features/callcenter/api.ts` | Query nhật ký (D42 `page` / `limit`), chi tiết, KPI, meta, token |
| C | `apps/web/src/features/callcenter/types.ts` | Kiểu web (tab, kỳ, lọc) |
| C | `apps/web/src/features/callcenter/columns.tsx` | Cột nhật ký + thẻ mobile |
| C | `apps/web/src/features/callcenter/callcenter-store.ts` | Tab, kỳ, trang, chi tiết đang mở, drawer Trợ lý |
| C | `apps/web/src/features/callcenter/ui-commands.ts` | `open:call`, `filter:calls` |
| C | `apps/web/src/features/callcenter/ui-commands.test.tsx` | Lệnh Trợ lý mở / lọc |
| C | `apps/web/src/features/callcenter/screens/CallCenterScreen.tsx` | Orchestrator màn |
| C | `apps/web/src/features/callcenter/components/CallCenterHeader.tsx` | Tiêu đề, kỳ, Export, Gọi đi, AiButton |
| C | `apps/web/src/features/callcenter/components/CallKpis.tsx` | 6 KPI so kỳ trước |
| C | `apps/web/src/features/callcenter/components/HourlyChart.tsx` | Cột Gọi vào / Gọi ra theo giờ (div + token) |
| C | `apps/web/src/features/callcenter/components/ExtensionBoard.tsx` | Bảng máy nhánh realtime + giám sát + lối Cấu hình |
| C | `apps/web/src/features/callcenter/components/CallLogTable.tsx` | Nhật ký 6 tab, DataTable + ListPager (D42) |
| C | `apps/web/src/features/callcenter/components/CallDetailModal.tsx` | Chi tiết (orchestrator khối con) |
| C | `apps/web/src/features/callcenter/components/RecordingPlayer.tsx` | Player sóng âm Web Audio, tốc độ, tua, tải |
| C | `apps/web/src/features/callcenter/components/TranscriptView.tsx` | Transcript theo người nói + Dịch tiếng Việt |
| C | `apps/web/src/features/callcenter/components/CallOpportunityBlock.tsx` | Khối cơ hội (026c) + đề xuất AI Áp dụng / Bỏ qua |
| C | `apps/web/src/features/callcenter/components/CallAssignActions.tsx` | Gán khách / ticket / ghi chú / Hẹn gọi lại / tải ghi âm (+ undo) |
| C | `apps/web/src/features/callcenter/components/ContactSearchSelect.tsx` | Ô chọn khách (Select showSearch, `GET /contacts?q=`) |
| C | `apps/web/src/features/callcenter/components/RetryOptions.tsx` | Hai nút một chạm: hotline / SIM · Gửi yêu cầu gọi Zalo (D61 #9) |
| C | `apps/web/src/features/callcenter/components/CallCenterAiDrawer.tsx` | Trợ lý thu nhỏ (4 gợi ý, useDrawerAsk) |
| C | `apps/web/src/features/callcenter/components/PlanLockedState.tsx` | Màn "Gói hiện tại chưa có Gọi điện" + Nâng cấp |
| C | `apps/web/src/features/callcenter/hooks/useCallLog.ts` | Nhật ký + đếm tab + KPI theo kỳ |
| C | `apps/web/src/features/callcenter/hooks/useCallDetail.ts` | Chi tiết + URL ghi âm ký (làm mới khi hết hạn) |
| C | `apps/web/src/features/callcenter/hooks/useAssistantContext.ts` | `useRegisterScreenContext` (module callcenter, call đang mở) |
| C | `apps/web/src/features/callcenter/styles/callcenter.styles.ts` | Style token màn |
| C | `apps/web/src/features/callcenter/styles/detail.styles.ts` | Style token chi tiết / player / transcript |
| C | `apps/web/src/features/callcenter/components/CallCenterScreen.test.tsx` | Unit màn: tab, ẩn Nghe lại theo quyền, khoá gói, rỗng |
| C | `apps/web/src/features/callcenter/components/CallDetailModal.test.tsx` | Unit chi tiết: quyền listen, đề xuất AI, ghi âm đã xoá, hai nút thay thế |
| C | `apps/web/src/app/(app)/_webphone/WebPhoneHost.tsx` | Host toàn cục: nối LiveKit khi có máy nhánh, chọn màn theo store |
| C | `apps/web/src/app/(app)/_webphone/useWebPhone.ts` | `livekit-client`: token, phòng, micro, đa tab (BroadcastChannel) |
| C | `apps/web/src/app/(app)/_webphone/useWebPhone.test.ts` | Unit vòng đời mock: đổ chuông / nghe / chuyển / kết thúc / tab khác |
| C | `apps/web/src/app/(app)/_webphone/Dialer.tsx` | Bàn phím + Caller ID (prototype L4844) |
| C | `apps/web/src/app/(app)/_webphone/IncomingCall.tsx` | Cuộc gọi đến (PD-902 mức 2) |
| C | `apps/web/src/app/(app)/_webphone/InCall.tsx` | Đang gọi: mute / hold / DTMF / chuyển / kết thúc / banner ghi âm |
| C | `apps/web/src/app/(app)/_webphone/TransferPanel.tsx` | Chuyển blind / consult tới máy lẻ / nhóm |
| C | `apps/web/src/app/(app)/_webphone/MiniPill.tsx` | Pill thu nhỏ giữ cuộc khi điều hướng |
| C | `apps/web/src/app/(app)/_webphone/MonitorBar.tsx` | Nghe cùng / Nhắc nhỏ / Tham gia (Manager) |
| C | `apps/web/src/app/(app)/_webphone/AfterCall.tsx` | ACW 30 giây + gợi ý sau cuộc gọi |
| C | `apps/web/src/app/(app)/_webphone/livekit-mock.ts` | LiveKit giả cho chế độ mock / e2e mock |
| C | `apps/web/src/app/(app)/_webphone/webphone.styles.ts` | Style token WebPhone (desktop + mobile toàn màn) |
| M | `apps/web/src/app/(app)/layout.tsx` | Mount `WebPhoneHost` cạnh `CrmFormsHost` |
| C | `apps/web/src/shared/webphone/index.ts` | Barrel `CallButton`, `useCallAccess`, `useWebPhoneUi` |
| C | `apps/web/src/shared/webphone/webphone-store.ts` | Zustand: dialer / cuộc gọi / `openDialer(...)` |
| C | `apps/web/src/shared/webphone/useCallAccess.ts` | `call.use` + gói + máy `can_dial` + "Bấm số để gọi ngay" (`/calls/meta`) |
| C | `apps/web/src/shared/webphone/CallButton.tsx` | Nút gọi dùng chung (ẩn khi không đủ điều kiện) |
| C | `apps/web/src/shared/webphone/CallButton.test.tsx` | Unit ẩn / hiện theo quyền, gói, máy nhánh, cài đặt |
| C | `apps/web/src/shared/contact-activities/CallbackModal.tsx` | Modal Hẹn gọi lại (prototype L2835) → `call.schedule_callback` |
| C | `apps/web/src/shared/contact-activities/CallbackModal.test.tsx` | Unit 4 mốc giờ theo múi, chọn AI chỉ khi agent xử lý cuộc gọi |
| M | `apps/web/src/shared/contact-activities/activity-store.ts` | `openCallback({ contactId, name, phone, callId? })` |
| M | `apps/web/src/shared/contact-activities/ActivityFormHost.tsx` | Mount `CallbackModal` |
| M | `apps/web/src/shared/contact-activities/TaskCard.tsx` | Thẻ việc kind `callback`: giờ gọi, người gọi / AI, số lần nhỡ, nút Gọi lại |
| M | `apps/web/src/shared/contact-activities/commands.ts` | `prefill:call.callback` vào `ACTIVITY_PREFILL` |
| M | `apps/web/src/shared/contact-activities/index.ts` | Export `CallbackModal` |
| M | `apps/web/src/shared/contact-activities/ActivityCards.test.tsx` | Ca thẻ việc gọi lại |
| M | `apps/web/src/app/(app)/_crm-forms/FormCommandHost.tsx` | Đăng ký lệnh `prefill:call.callback` |
| M | `apps/web/src/app/(app)/_crm-forms/FormCommandHost.test.tsx` | Ca lệnh Hẹn gọi lại |
| M | `apps/web/src/shared/shell/nav-config.ts` | `NavKey` `callcenter`, rail giữa Lịch hẹn và AI Agents, `requires: 'calls'`, chú thích L1 |
| M | `apps/web/src/shared/shell/nav-config.test.ts` | Thứ tự rail có `callcenter`, quyền `call.view` |
| M | `apps/web/src/shared/shell/NavRail.tsx` | Lọc mục theo cờ gói `features.calls` |
| M | `apps/web/src/shared/shell/MobileTabBar.tsx` | Lọc "Thêm" theo cờ gói |
| M | `apps/web/src/shared/shell/useShellData.ts` | Kiểu `MeWorkspace.features.calls` |
| M | `apps/web/src/shared/realtime/event-invalidation.ts` | `EVENT_KEYS` topic `call.*` / `callcenter.extension_status` |
| M | `apps/web/src/shared/realtime/event-delivery.test.ts` | Ca `keysFor` topic cuộc gọi |
| M | `apps/web/src/features/inbox/components/Overview360.tsx` | SĐT → `CallButton` |
| M | `apps/web/src/features/inbox/components/Blocks360.tsx` | SĐT khối liên hệ → `CallButton` |
| M | `apps/web/src/features/inbox/components/Profile360Actions.tsx` | Nút "Gọi" ở thanh hành động 360° |
| M | `apps/web/src/features/inbox/components/ConnectChannelModal.tsx` | Thẻ `callcenter` mở `/settings/callcenter` |
| M | `apps/web/src/features/customers/columns.tsx` | Icon gọi ở cột SĐT (bảng + thẻ mobile) |
| M | `apps/web/src/features/customers/hooks/useRowMenu.ts` | Mục menu "Gọi điện" |
| M | `apps/web/src/features/finance/components/FinanceCustomerDrawer.tsx` | Bỏ ẩn nút "Gọi điện" → `CallButton` (032e tạo) |
| M | `apps/web/src/features/calendar/components/AppointmentDrawer.tsx` | `tel:` → `CallButton` khi đủ điều kiện, ngược lại giữ `tel:` |
| M | `apps/web/src/features/calendar/api.ts` | Nhận `callbacks` trong phản hồi `/calendar` |
| M | `apps/web/src/features/calendar/types.ts` | Kiểu `CallbackItem` |
| M | `apps/web/src/features/calendar/screens/CalendarScreen.tsx` | Truyền `callbacks` xuống các view |
| M | `apps/web/src/features/calendar/components/ListView.tsx` | Chip gọi lại trong danh sách ngày |
| M | `apps/web/src/features/calendar/components/WeekDayViews.tsx` | Chip gọi lại ở tuần / ngày |
| M | `apps/web/src/features/calendar/components/TimeGrid.tsx` | Đặt chip gọi lại theo giờ |
| M | `apps/web/src/features/calendar/components/MonthView.tsx` | Đếm / chip gọi lại ở ô tháng |
| C | `apps/web/src/features/calendar/components/CallbackChip.tsx` | Chip gọi lại (token riêng, icon phone, mở khách / gọi) |
| M | `apps/web/src/features/settings/registry.ts` | `SectionKey` `callcenter` vào HIDDEN (`callcenter.manage`) |
| M | `apps/web/src/features/settings/screens/SettingsScreen.tsx` | SECTIONS `callcenter: CallCenterSection` |
| C | `apps/web/src/features/settings/components/CallCenterSection.tsx` | Orchestrator: thanh trạng thái + 4 tab (Nhân sự mặc định) |
| C | `apps/web/src/features/settings/components/callcenter/StatusBar.tsx` | Trạng thái tổng đài, số chính, online, kênh đồng thời thật |
| C | `apps/web/src/features/settings/components/callcenter/ExtensionsTab.tsx` | Bảng nhân sự / máy lẻ + 3 bước + Thêm nhân sự |
| C | `apps/web/src/features/settings/components/callcenter/InboundTab.tsx` | Luồng, lời chào, AI nghe trước, IVR, nhóm, ngoài giờ |
| C | `apps/web/src/features/settings/components/callcenter/OutboundTab.tsx` | Caller ID, ai gọi ra, Bấm số để gọi ngay, Tự động quay số = Sắp có |
| C | `apps/web/src/features/settings/components/callcenter/AdvancedTab.tsx` | Số tổng đài, Ghi âm & giám sát, Kết nối nhà mạng |
| C | `apps/web/src/features/settings/components/callcenter/LineFormModal.tsx` | Thêm số: 4 loại + Kiểm tra kết nối |
| C | `apps/web/src/features/settings/components/callcenter/CallCenterFormModal.tsx` | Khung form dùng chung (lỗi inline, CAS 409) |
| C | `apps/web/src/features/settings/components/callcenter/ExtensionForm.tsx` | Thân form máy nhánh (số lẻ tự cấp, thiết bị Sắp có) |
| C | `apps/web/src/features/settings/components/callcenter/QueueForm.tsx` | Thân form nhóm (thành viên, 4 cách đổ chuông, chờ, không ai nghe) |
| C | `apps/web/src/features/settings/components/callcenter/IvrKeyForm.tsx` | Thân form phím IVR |
| C | `apps/web/src/features/settings/components/callcenter/CallerIdForm.tsx` | Thân form Caller ID theo nhóm |
| C | `apps/web/src/features/settings/hooks/useCallCenterSettings.ts` | Đọc `GET /v1/settings/callcenter` + action `call_*` |
| C | `apps/web/src/features/settings/styles/callcenter.styles.ts` | Style token section |
| C | `apps/web/src/features/settings/components/CallCenterSection.test.tsx` | Unit tab, quyền, vượt gói 402, codec thật, thiết bị Sắp có |
| M | `apps/web/src/features/settings/components/WidgetSection.tsx` | Công tắc "Cho khách gọi thoại từ widget" (`settings.calls`) |
| M | `apps/web/src/features/settings/components/WalletShop.tsx` | Thẻ addon `call_extension` |
| M | `apps/web/src/features/settings/components/PlanCompare.tsx` | Hiện nhóm "Gọi điện (Call-center)", sửa chú thích |
| M | `apps/web/src/features/settings/types.ts` | `addons[].kind` thêm `call_extension` |
| M | `apps/web/src/features/agents/components/builder/RoutingSection.tsx` | Chip kênh "Cuộc gọi" (`call`) |
| M | `packages/core/src/ai/agents/catalog.ts` | `CHANNEL_COLORS.call`; mô tả tpl_9 / tpl_25 bỏ "Gọi tự động" |
| M | `packages/core/src/ai/agents/agents.read.ts` | Meta chỉ trả kênh `call` khi gói có Gọi điện |
| M | `packages/core/src/integrations/services/read.service.ts` | Thẻ lối tắt `callcenter` đầu nhóm `channels_studio` |
| M | `packages/core/src/inbox/services/meta.service.ts` | Thẻ "Tổng đài / Call Center" ở Kết nối kênh theo gói |
| M | `packages/shared/src/i18n/server/vi/inbox.ts` | Tag / thời gian thẻ callcenter |
| M | `packages/shared/src/i18n/server/en/inbox.ts` | Như trên (en) |
| M | `packages/shared/src/i18n/server/vi/insights.ts` | Pill "Gọi điện" giữa Lịch hẹn và AI Agents |
| M | `packages/shared/src/i18n/server/en/insights.ts` | Như trên (en) |
| M | `apps/api/test/integration/integrations.test.ts` | 19 thẻ, `callcenter` đầu |
| M | `apps/api/test/integration/inbox.test.ts` | Thẻ callcenter theo gói ở `/inbox/connect-channels` |
| M | `apps/api/test/integration/agents-ui.test.ts` | Meta kênh `call` theo gói |
| M | `apps/widget/src/main.ts` | Đọc cờ `calls`, tải lười `widget-call.js` |
| M | `apps/widget/src/ui.ts` | Nút gọi trong cửa sổ chat |
| M | `apps/widget/src/styles.ts` | Style nút / thanh cuộc gọi |
| M | `apps/widget/src/i18n.ts` | Chuỗi gọi (vi / en) |
| M | `apps/widget/src/types.ts` | Cấu hình `calls`, ack `visitor.call` |
| C | `apps/widget/src/call/main.ts` | Chunk gọi: `livekit-client`, micro, nối phòng, kết thúc |
| M | `apps/widget/scripts/build.mjs` | Entry thứ hai `widget-call.js`; ngân sách 40KB chỉ cho `widget.js` |
| M | `apps/widget/package.json` | Dependency `livekit-client` (DV-901) |
| M | `apps/widget/test/ui.test.ts` | Nút gọi theo cờ / giờ; tải lười |
| M | `apps/web/package.json` | Dependency `livekit-client` (DV-901) |
| M | `pnpm-lock.yaml` | Khoá `livekit-client` |
| M | `apps/api/src/http/channels/widget-script.controller.ts` | Phục vụ thêm `widget-call.js` |
| M | `apps/api/src/http/kernel/prefix.ts` | Exclude `widget-call.js` khỏi `/v1` |
| M | `apps/api/src/http/kernel/api-rate-limit.guard.ts` | SKIP `widget-call.js` |
| M | `apps/api/src/http/kernel/cors-policy.ts` | OPEN `widget-call.js` (mọi origin, không credentials) |
| M | `apps/api/src/openapi/route-scan.ts` | UNPREFIXED `widget-call.js` |
| M | `apps/api/test/integration/webchat.test.ts` | Tải `widget-call.js` (CORS `*`) |
| C | `apps/web/src/shared/api/mock/domains/callcenter.ts` | Mock đọc: nhật ký, KPI, máy nhánh, chi tiết, meta, cấu hình 4 tab, token giả |
| C | `apps/web/src/shared/api/mock/domains/callcenter-actions.ts` | Mock action `call.*` / `call_*` (402 vượt gói, 409 đã nghe) |
| C | `apps/web/src/shared/api/mock/callcenter-shape.test.ts` | Shape mock ↔ DTO `@appchat/shared` |
| M | `apps/web/src/shared/api/mock/routes.ts` | Nối route mock callcenter |
| M | `apps/web/src/shared/api/mock/handlers.ts` | Nối handler action callcenter |
| M | `apps/web/src/shared/api/mock/store.ts` | State `callcenter` |
| M | `apps/web/src/shared/api/mock/bulk.ts` | Nhân dòng nhật ký cho `?session=…,bulk` |
| M | `apps/web/src/shared/api/mock/domains/calendar.ts` | Trả `callbacks` |
| M | `apps/web/src/shared/api/mock/domains/integration-runtime.ts` | Lọc thẻ lối tắt `callcenter` như `web_widget` |
| C | `tools/scripts/fixtures/gen-callcenter.py` | Sinh `callcenter.json` từ seed prototype (L8758–8763, L12899–12961), mã `CG-`, bỏ demo |
| C | `fixtures/prototype-parity/callcenter.json` | Dữ liệu parity / mock |
| M | `tools/scripts/fixtures/gen-settings.py` | Dòng connector `callcenter` |
| M | `tools/scripts/fixtures/settings_billing.py` | `COMPARE` nhóm Gọi điện + `ADDONS` `addon_call_extension` |
| M | `fixtures/prototype-parity/settings.json` | Sinh lại (connector, so sánh gói, addon) |
| M | `tools/scripts/fixtures/gen-inbox.py` | Thẻ Kết nối kênh `callcenter` |
| M | `fixtures/prototype-parity/inbox.json` | Sinh lại `connect_channels` |
| M | `fixtures/prototype-parity/agents.json` | `channels` thêm `call` |
| M | `fixtures/prototype-parity/dashboard.json` | Pill "Gọi điện" |
| M | `apps/web/src/i18n/messages.ts` | MODULES thêm `callcenter` |
| C | `apps/web/messages/vi/callcenter.json` | Chuỗi màn + WebPhone (vi) |
| C | `apps/web/messages/en/callcenter.json` | Như trên (en) |
| M | `apps/web/messages/vi/settings.json` | Section callcenter, 4 tab, form, `desc.callcenter`, addon, nhóm so sánh, công tắc widget |
| M | `apps/web/messages/en/settings.json` | Như trên (en) |
| M | `apps/web/messages/vi/shell.json` | `nav.callcenter` |
| M | `apps/web/messages/en/shell.json` | Như trên (en) |
| M | `apps/web/messages/vi/common.json` | `modules.callcenter`, `activities.callback*`, nút Gọi |
| M | `apps/web/messages/en/common.json` | Như trên (en) |
| M | `apps/web/messages/vi/customers.json` | Menu "Gọi điện" |
| M | `apps/web/messages/en/customers.json` | Như trên (en) |
| M | `apps/web/messages/vi/inbox.json` | Nút Gọi 360° |
| M | `apps/web/messages/en/inbox.json` | Như trên (en) |
| M | `apps/web/messages/vi/calendar.json` | Chip gọi lại |
| M | `apps/web/messages/en/calendar.json` | Như trên (en) |
| M | `apps/web/messages/vi/agents.json` | `b.channel.call` |
| M | `apps/web/messages/en/agents.json` | Như trên (en) |
| M | `apps/web/messages/vi/finance.json` | Nút Gọi điện (032e tạo) |
| M | `apps/web/messages/en/finance.json` | Như trên (en) |
| C | `tools/parity/modules/callcenter.ts` | Entry `callcenter:list/detail/dial/ai/callback`, `settings:callcenter`, `settings:callcenter-form` + mask có mã |
| M | `tools/parity/parity.manifest.ts` | Nối module callcenter; gỡ mask thẻ "Tổng đài (Call Center)" (integProto) và chip "Tổng đài / Call Center" (`inbox:connect-channel`) |
| M | `tools/parity/src/capture.ts` | Gỡ "Gọi điện" khỏi `OUT_LABELS` (cùng commit thêm rail) |
| C | `apps/web/e2e/callcenter.spec.ts` | E2E mock: rail, màn, gọi nhỡ → Hẹn gọi lại → Lịch hẹn, dialer, chuyển máy, Cài đặt, 402, quyền; mobile 390 |
| C | `apps/web/e2e/http/callcenter.spec.ts` | E2E http cùng luồng (LiveKit `--dev` hoặc provider mock) |
| M | `apps/web/e2e/dashboard.spec.ts` | Bỏ khẳng định không có "Gọi điện" (L18) |
| M | `apps/web/e2e/roles.spec.ts` | Ma trận RAIL có `callcenter` cho 5 vai trò |
| M | `apps/web/e2e/list-scroll.spec.ts` | `['/callcenter', 'cc-table', 'data-call']` (D42) |
| M | `apps/web/e2e/mobile-sweep.spec.ts` | Route `/callcenter` |
| M | `apps/web/e2e/http/webchat.spec.ts` | Widget bật gọi (công tắc Cài đặt) → website khách có nút gọi, tải lười `widget-call.js` |
