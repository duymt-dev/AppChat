# TIP-047c — exact file manifest

M = sửa, C = tạo mới. M ở tương lai cần các TIP đứng trước đã tích hợp:
- 047b: bảng, quyền, `CODE_FORMATS.call`, `tenant_call_route`.
- 047: `packages/voice`.
- 026c: `crm/public.ts` với `soleOpenOpportunity` / `recordOpportunityEvent`.

Domain mới `packages/core/src/callcenter/`. Không thêm `callcenter` vào `DOMAINS`; đăng ký theo tiền lệ `data-transfer` / `privacy`. Không dùng wildcard thư mục; test liệt kê từng file.

| Mode | Exact file | Responsibility |
|---|---|---|
| C | `packages/actions/src/callcenter.ts` | `call.list/get/kpis/dial/answer/hangup/hold/mute/dtmf/transfer/monitor/assign_contact/link_opportunity/save_note/create_ticket/schedule_callback/zcc_request_consent/recording_url/export` |
| C | `packages/actions/src/callcenter-config.ts` | `call_line.*` · `call_extension.*` · `call_queue.*` · `call_ivr.update` · `call_settings.update` · `call_line.list` (read, tra id) |
| C | `packages/actions/src/system/callcenter.ts` | Internal `call.ingest_event` · `call.finalize` · `call.record_missed` · `call.voice_turn` |
| M | `packages/actions/src/index.ts` | Import / export / registry nhóm callcenter |
| C | `packages/actions/test/callcenter-actions.test.ts` | Schema, quyền, risk, agentGrantable (chỉ `schedule_callback` + read), internal |
| M | `packages/shared/src/events.ts` | EVENT_SCHEMAS `call.ingress` · `call.ringing` · `call.answered` · `call.ended` · `call.missed` · `call.recording_ready` · `call.transcript_ready` · `callcenter.extension_status` (chỉ id) |
| M | `packages/shared/src/events/protocol/aggregate.ts` | `by('call','call_id')`, `by('call_extension','extension_id')` |
| M | `packages/shared/test/event-protocol.test.ts` | Topic mới khớp registry + aggregate |
| C | `packages/shared/src/api/callcenter.ts` | DTO nhật ký (D42 meta + đếm tab), chi tiết, KPI, máy nhánh, cấu hình 4 tab, token, consent preview |
| M | `packages/shared/src/api/index.ts` | Export DTO callcenter |
| M | `packages/shared/src/api/list-exports.ts` | `LIST_EXPORT_KINDS` thêm `call` |
| M | `packages/shared/src/api/calendar.ts` | `callbacks[]` (việc gọi lại trong kỳ) trong phản hồi lịch |
| M | `packages/shared/src/api/webchat.ts` | Ack `visitor.call` (token khách) + cờ `calls` trong cấu hình widget |
| M | `packages/shared/src/notify/catalog.ts` | Kind `call_missed`, `call_callback_due`, `zcc_consent_result` |
| M | `packages/shared/src/i18n/server/vi/notify.ts` | Tiêu đề 3 kind mới |
| M | `packages/shared/src/i18n/server/en/notify.ts` | Như trên (en) |
| C | `packages/shared/src/callcenter/call-state.ts` | `CALL_STATUSES`, `CALL_FLOW` (hàm thuần dùng chung core + web), tab → trạng thái |
| C | `packages/shared/src/callcenter/call-state.test.ts` | Bảng chuyển trạng thái hợp lệ / cấm |
| M | `packages/shared/src/index.ts` | Export `callcenter/call-state` |
| M | `packages/core/src/index.ts` | Một dòng `export * from './callcenter/public'` + module |
| C | `packages/core/src/callcenter/public.ts` | Export module / jobs module / read service / hằng |
| C | `packages/core/src/callcenter/callcenter.module.ts` | Module Nest (handler + service, API + worker ai) |
| C | `packages/core/src/callcenter/callcenter.providers.ts` | Provider port voice (LiveKit / SIP / ZCC / recorder / Voice AI) từ env, mock khi thiếu |
| C | `packages/core/src/callcenter/jobs/callcenter.jobs.module.ts` | ROLE=jobs: system adapter + verifier (ingest, missed), lịch expiry / receipts_gc / callback_reminder |
| C | `packages/core/src/callcenter/jobs/callcenter-media.module.ts` | ROLE=channels: phòng / SIP / ghi âm / phiên Voice AI |
| C | `packages/core/src/callcenter/jobs/callcenter-ai.module.ts` | ROLE=ai: transcript + tóm tắt sau `call.recording_ready` |
| C | `packages/core/src/callcenter/jobs/expiry.ts` | Xoá ghi âm / transcript hết hạn hoặc đã quên (dòng → Storage), giữ tóm tắt |
| C | `packages/core/src/callcenter/jobs/callback-reminder.ts` | Nhắc trước 10 phút + chạy Hẹn gọi lại `caller: agent` |
| C | `packages/core/src/callcenter/jobs/receipts-gc.ts` | Dọn biên nhận webhook > 30 ngày |
| C | `packages/core/src/callcenter/ingress/receipt.ts` | Biên nhận `(provider, event_id)` + outbox `call.ingress` cùng transaction |
| C | `packages/core/src/callcenter/ingress/livekit.ts` | Verify + tách workspace / call từ tên phòng |
| C | `packages/core/src/callcenter/ingress/zcc.ts` | Verify + tra `tenant_call_route` |
| C | `packages/core/src/callcenter/services/lifecycle.ts` | Áp `CALL_FLOW` + CAS + mốc thời gian + topic |
| C | `packages/core/src/callcenter/services/router.ts` | Định tuyến gọi vào: khớp khách, giờ làm việc, IVR, nhóm 4 cách, tràn |
| C | `packages/core/src/callcenter/services/business-hours.ts` | Trong giờ / đầu giờ ngày làm việc kế (múi workspace, `business_hours`) |
| C | `packages/core/src/callcenter/services/dialer.ts` | Gọi ra theo kênh (ZCC cửa sổ / consent, SIM trần 1, chuyển tiếp chỉ nhận) |
| C | `packages/core/src/callcenter/services/extensions.ts` | Trạng thái máy nhánh, cấp số lẻ từ 101, hạn mức `call_extensions` |
| C | `packages/core/src/callcenter/services/recording.ts` | Ghi âm → FilesService purpose `call_recording` + `call_recording` |
| C | `packages/core/src/callcenter/services/voice-session.ts` | Phiên Voice AI: tools = quyền agent ∩ người hẹn, handoff, credit theo lượt |
| C | `packages/core/src/callcenter/services/consent.ts` | Yêu cầu gọi Zalo: phí, trừ / hoàn credit theo `ZCC_BILLING` |
| C | `packages/core/src/callcenter/services/scope.ts` | SQL scope `callcenter` own (nghe / gọi / chặng / nhỡ nhóm / khách phụ trách) |
| C | `packages/core/src/callcenter/services/calls.repo.ts` | Nhật ký id-first deferred join + đếm tab |
| C | `packages/core/src/callcenter/services/kpis.repo.ts` | 6 KPI + theo giờ + bảng máy nhánh (≤ 3 truy vấn) |
| C | `packages/core/src/callcenter/services/calls-read.service.ts` | Ráp list / get / kpis / meta / cấu hình theo quyền (`call.listen` mới có transcript) |
| C | `packages/core/src/callcenter/services/callbacks-read.ts` | Việc gọi lại trong kỳ cho Lịch hẹn (scope khách) |
| C | `packages/core/src/callcenter/actions/call-read.handlers.ts` | `call.list` · `call.get` · `call.kpis` · `call_line.list` |
| C | `packages/core/src/callcenter/actions/call-dial.handler.ts` | `call.dial` + preview kênh / phí |
| C | `packages/core/src/callcenter/actions/call-control.handlers.ts` | `answer` · `hangup` · `hold` · `mute` · `dtmf` · `transfer` · `monitor` |
| C | `packages/core/src/callcenter/actions/call-assign.handlers.ts` | `assign_contact` · `link_opportunity` · `save_note` · `create_ticket` + undo |
| C | `packages/core/src/callcenter/actions/callback.handler.ts` | `call.schedule_callback` + preview + undo |
| C | `packages/core/src/callcenter/actions/zcc-consent.handler.ts` | `call.zcc_request_consent` + preview phí |
| C | `packages/core/src/callcenter/actions/recording.handlers.ts` | `call.recording_url` (ký 5 phút + audit) · `call.export` |
| C | `packages/core/src/callcenter/actions/config-lines.handlers.ts` | `call_line.*` (mã hoá bí mật, `ensureTrunk`, route nền tảng) |
| C | `packages/core/src/callcenter/actions/config-routing.handlers.ts` | `call_extension.*` · `call_queue.*` · `call_ivr.update` · `call_settings.update` |
| C | `packages/core/src/callcenter/actions/system.handlers.ts` | Internal `ingest_event` · `finalize` · `record_missed` · `voice_turn` |
| C | `packages/core/src/callcenter/actions/previews.ts` | Preview dùng chung (kênh, phí, máy nhánh, ảnh hưởng xoá nhóm) |
| C | `packages/core/src/callcenter/events/call.rules.ts` | Realtime `call.*` / `callcenter.extension_status` + notify gọi nhỡ / hẹn gọi lại / consent |
| C | `packages/core/src/callcenter/events/missed.consumer.ts` | Trigger `call.missed` → `call.record_missed` |
| C | `packages/core/src/callcenter/exports/call-reader.ts` | Reader export nhật ký (không transcript) |
| C | `packages/core/src/callcenter/privacy/adapter.ts` | `callcenterPrivacyAdapter` |
| C | `packages/core/src/callcenter/privacy/inventory.ts` | Artifact theo khách: call, recording, transcript, summary, consent |
| C | `packages/core/src/callcenter/privacy/cleanup.ts` | Scrub / xoá dòng; đánh dấu ghi âm để job xoá byte |
| M | `packages/core/src/kernel/privacy/types.ts` | `PrivacyDomain` + `PRIVACY_DOMAINS` thêm `callcenter` |
| M | `packages/core/src/composition/privacy.module.ts` | Đăng ký `callcenterPrivacyAdapter` |
| M | `packages/core/src/kernel/files/upload-guard.ts` | Purpose `call_recording` + `call_greeting`, loại `ogg`, giới hạn 200MB riêng |
| M | `packages/core/src/kernel/files/magic.ts` | Nhận diện `OggS` (opus / ogg) + MP3 (lời chào) |
| M | `packages/core/test/upload-guard.test.ts` | Ca purpose / loại / giới hạn mới |
| M | `packages/core/src/billing/services/credit-meter.ts` | `chargeVoice` (ref `voice_turn`, đơn vị theo `model_price.unit`) — tách file nếu > 200 dòng |
| C | `packages/core/src/billing/services/voice-meter.ts` | Định giá voice / phí consent + biên nhận idempotent (dùng `usage-receipt`) |
| M | `packages/core/src/billing/public.ts` | Export `VoiceMeter` |
| M | `packages/core/src/kernel/actions/policy.ts` | `call.zcc_request_consent` vào `MANDATORY_PREVIEW_ACTIONS` + `FORCE_APPROVAL_ACTIONS` |
| M | `packages/core/src/ai/assistant/catalog.ts` | Mô tả nhóm callcenter; `SYSTEM_ONLY` thêm 4 action internal |
| M | `packages/core/src/ai/jobs/ai-domain-handlers.module.ts` | `CallcenterModule` vào `AI_DOMAIN_MODULES` |
| M | `packages/core/src/notify/events/domain.rules.ts` | Import `callcenter/events/call.rules` |
| M | `packages/core/src/crm/public.ts` | Facade: export `ContactIdentityService` đã có; thêm `contactOwnerOf` nếu chưa export (1 dòng) |
| M | `packages/core/src/insights/exports/export-runner.ts` | Nối reader `call` (1 dòng facade) |
| M | `packages/core/src/booking/services/calendar-read.service.ts` | Gắn `callbacks` từ `callcenter/public` vào phản hồi kỳ (facade) |
| M | `packages/core/src/crm/services/timeline.service.ts` | `TimelineKey` `call_in` / `call_out` / `call_missed`, `TimelineType` `call` (kiểu + style icon) |
| M | `packages/shared/src/i18n/server/vi/crm.ts` | Nhãn timeline cuộc gọi |
| M | `packages/shared/src/i18n/server/en/crm.ts` | Như trên (en) |
| M | `packages/actions/src/settings-apps.ts` | `webchat.update_widget` nhận `settings.calls` |
| M | `packages/core/src/channels/webchat/webchat.handlers.ts` | Lưu `settings.calls` (chỉ khi có máy nhánh nhận cuộc gọi) |
| M | `packages/core/src/channels/webchat/visitor.service.ts` | Ack `visitor.call` khi widget bật gọi + trong giờ + rate-limit |
| M | `packages/core/src/channels/webchat/widget.service.ts` | Cờ `calls` trong cấu hình widget gửi visitor |
| M | `packages/core/src/ai/agents/agent-tools.ts` | Kênh `call` hợp lệ cho agent bật "Xử lý cuộc gọi" |
| M | `packages/core/test/assistant-coverage.test.ts` | ALIAS `line_id` / `extension_id` / `queue_id` (có lý do) |
| C | `packages/core/test/callcenter-lifecycle.test.ts` | Bảng vòng đời + sự kiện trễ / lặp / ngược thứ tự |
| C | `packages/core/test/callcenter-router.test.ts` | 4 cách đổ chuông, tràn, máy offline |
| C | `packages/core/test/callcenter-business-hours.test.ts` | Hạn gọi lại trong / ngoài giờ, ngày nghỉ |
| C | `apps/api/src/http/callcenter/callcenter.http.module.ts` | Module HTTP (register) |
| C | `apps/api/src/http/callcenter/hooks.controller.ts` | `POST /hooks/livekit` · `POST /hooks/zalo-zcc/:appId` (rawBody, ≤ 64KB) |
| C | `apps/api/src/http/callcenter/calls.controller.ts` | `GET /v1/calls` · `/calls/:id` · `/calls/kpis` · `/calls/meta` · `/calls/token` |
| C | `apps/api/src/http/callcenter/callcenter-settings.controller.ts` | `GET /v1/settings/callcenter` |
| M | `apps/api/src/app.module.ts` | `CallcenterHttpModule.register()` trong `withActions` |
| M | `apps/api/src/http/channels/widget.gateway.ts` | Sự kiện `visitor.call` |
| M | `apps/worker/src/event-protocol.manifest.ts` | `action('callcenter.ingest', ['call.ingress'])` · `action('callcenter.missed', ['call.missed'])` |
| M | `apps/worker/src/roles/channels.module.ts` | `CallcenterMediaModule` |
| M | `apps/worker/src/roles/ai.module.ts` | `CallcenterAiModule` |
| M | `apps/worker/src/roles/jobs.module.ts` | `CallcenterJobsModule` vào `JOBS_EXTRA` |
| M | `apps/worker/test/roles.test.ts` | Danh sách module theo role có module callcenter |
| M | `apps/worker/test/ai-role-handlers.test.ts` | Handler callcenter có ở worker ROLE=ai |
| C | `apps/api/test/integration/callcenter-webhooks.test.ts` | AC1 |
| C | `apps/api/test/integration/callcenter-routing.test.ts` | AC2 |
| C | `apps/api/test/integration/callcenter-missed.test.ts` | AC3–4 |
| C | `apps/api/test/integration/callcenter-scope.test.ts` | AC5 |
| C | `apps/api/test/integration/callcenter-zcc.test.ts` | AC6 |
| C | `apps/api/test/integration/callcenter-voice-ai.test.ts` | AC7 |
| C | `apps/api/test/integration/callcenter-privacy.test.ts` | AC8 |
| C | `apps/api/test/integration/callcenter-config.test.ts` | AC9 |
| C | `apps/api/test/integration/callcenter-callback.test.ts` | AC10 |
| M | `apps/api/test/integration/realtime.test.ts` | AC11 ca `call.ringing` / `callcenter.extension_status` |
| M | `apps/api/test/integration/actions.test.ts` | AC12 `pendingByTip = {}` có action callcenter |
| M | `apps/api/test/integration/record-ai-privacy.test.ts` | Quên khách có domain callcenter |
| C | `fixtures/ai-eval/callcenter.json` | 6 ca Trợ lý: tra cuộc gọi, hẹn gọi lại, yêu cầu gọi Zalo (preview), cấm agent gửi consent |
| M | `apps/web/messages/vi/actions.json` | `actions.call__*.title` |
| M | `apps/web/messages/en/actions.json` | Như trên (en) |
