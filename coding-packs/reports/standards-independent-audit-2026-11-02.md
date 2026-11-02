# Standards — review độc lập phần còn lại

Reviewer `/root/audit_blueprint_remainder`, chỉ đọc, không test runtime. Review có trọng tâm, **không** tuyên bố đã rà mọi action/state/test của28 standards. Phải giữ marker chưa rà hết tới khi các nhóm dưới được xử lý.

## Sai lệch bằng chứng đã sửa trong sổ

- Outbox dispatcher35→36 chạy effect rồi ghi receipt; unique receipt không chứng minh effect idempotent qua crash. STD-events-outbox-4 hạ MỘT PHẦN, cần owner implementation.
- PageStates17–21 cần predicate để empty; QuotesScreen87/ProductsScreen98 thiếu predicate. STD-ui-ip-5/ui-fe-9 hạ MỘT PHẦN.
- mobile-sweep chỉ height button/tab và overflow, không width44/mọi target/action chính; ui-ip7.4/parity9 hạ, không phủ nhận bằng chứng overflow hẹp.
- consult budget40 riêng, runner100 budget từng run; gateway5 hạ MỘT PHẦN phần tree budget, cần AI runtime supplemental.
- Poller105 core branch email không phải bằng chứng UI/AI trái manifest; sửa adapter2 evidence, chưa nâng ĐẠT khi thiếu audit đúng phạm vi.
- WalletService production được billing.module48 inject Clock; bỏ constructor fallback khỏi danh sách vi phạm runtime và bỏ số13 chưa phân loại. send.processor50/103, sessions81–123 vẫn là callsites cần sửa.
- Loyalty concurrency tách atomic row036, không dùng dòng tiền/kho ĐẠT che ledger chưa làm.

## Atomic rows còn phải thêm sau đối chiếu

UI interaction-patterns: IP2 depth≤2/không che context;3.3 loading/double-submit/giữ draft;3.6 prefill;4.4 feedback>1s;4.5 optimistic rollback;5 empty-vs-filter-empty/extreme120ký tự/13chữ số/500dòng/broken image/realtime drawer invalidation;6.2 tooltip+aria-label;6.3 relative time7 ngày/hover;7.1 Esc/Enter;7.2 focus return;7.3 contrast/noncolor;7.5 bottom drawer/mobileCard/action sheet.

Các dòng mới nên MỘT PHẦN/chưa chứng minh đủ, không nói toàn bộ chưa code vì AntD có thể cung cấp một phần. Cần TIP frontend shared/forms/accessibility **implementation**, không blanket046.

Domain: concurrency GET/action version output; state terminal/reopen và từng entity flow (payment/package/conversation/channel/agent/KB/approval/contact_access_request/kb_suggestion); contact restore30 ngày không đồng nhất privacy.erase; agent delete guard đã có agent.handlers136–155 cần test; delete-links preview+unlink; system profile layout delete/role fallback.

## Owner đề xuất — chưa tự gán khi TIP chưa có task/AC/manifest

| Nhóm | Owner đề xuất / việc cần bổ sung |
|---|---|
| Action per-ID tests, customfield ai=true trong find_actions, preview checklist |023b nền;030b/032b legal domain; chọn một owner approval feedback (032b202 foundation hiện nhận trước045b) |
| run.step WS, shared tree budget, one-run/conversation, approval state | AI runtime supplemental; reply.queue debounce3s không phải distributed run mutex; runner callback optional không chứng minh WS |
| Citation DTO/UI, KBsource state, kb_suggestion state |020b/023c/043 theo boundary, không coi backend search là UI citation |
| Invoice/receipt template snapshot; split installment floor+final remainder; quote/invoice business hours; system commerce mutations; payment/package state |032b sau khi thêm exact tasks/manifest, không tự gán từ tên commerce |
| Contact transfer approval, delete dependencies, Kanban2customfields, restore30ngày, layout deletion, contact/profile version | CRM supplemental riêng;042c chỉ scope không tự nhận nghiệp vụ; tên015c phải tránh xung đột TIP privacy dự kiến |
| Tenant SePay/Casso thật, integration.sync_now/test |012b mới; registry16–17 dùng MockBankFeed, không CHỜ-TK |
| Worker trace, event crash gap/order, Clock callsites, bulk orchestration, action-first consumers |045b nền; từng domain vẫn phải nhận effects của mình |
| OpenAPI /v1/docs, tasks query projection, query-count harness/domain adoption | API/runtime supplemental;046 verification không phải chỗ gom code |
| Shared forms zodRule/MoneyInput/PhoneInput, unsaved/conflict UI, i18n/normalization | frontend supplemental; E.164 backend migration/dedupe cần scope riêng, không chỉ thay UI helper |

## Bằng chứng trọng tâm cho phần tiếp theo

- events.runner35–37 concurrency8 chưa entity grouping; traceId payload không tự tạo RequestContext.
- quote-system36–45 tự transaction/updateMany/outbox; payment-system49 tự context,65 reminders chưa giờ làm việc.
- sales-payments.prisma invoice version không đủ chứng minh template snapshot.
- crm transfer_owner riskwrite/grantable + policy assistantpreview/agentwrite→run không bảo đảm D32 approval.
- contact-write157–160 soft delete không dependency lookup; KanbanCard16–45 chưa customvalues.
- tasks.read137 inner SELECT r.* cần projection theo standard nhưng không tự kết luận heap chậm trước EXPLAIN.
- Lưu ý không hạ outbox3 chỉ vì event dùng contact_id/message_id thay literal id: outbox26 bổ sung ws/occurred_at; cần làm rõ contract trước gọi là bug.

P2 channels/provider rows giữ exclusions có mã quyết định. i18n10/parity6c là quy tắc quy trình, không tạo code TIP chỉ để xoá dấu—. Những đề xuất này chưa phải lượt review toàn goal đã khép.
