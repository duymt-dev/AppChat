# TIP-036 — Loyalty: sổ điểm, đổi điểm, hạn điểm, hạng và nối HTTP

## HEADER
- **Parallel-safe with TIP-023g (Record AI manifest):** sequential, shares `packages/shared/src/api/index.ts`; integrate 036 before023g.
- **Parallel-safe with TIP-030c (Parent signing manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`; integrate 036 before030c.
- **Parallel-safe with TIP-006b (Event delivery manifest):** sequential, shares `packages/core/src/ai/jobs/ai.jobs.module.ts`; integrate 036 before006b.
- **Parallel-safe with TIP-003c (System actions manifest):** sequential, shares `apps/api/src/app.module.ts`, `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/actions/src/loyalty-system.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/loyalty/actions/ledger-system.handlers.ts`, `packages/core/src/loyalty/events/order-consumer.ts`, `packages/core/src/loyalty/events/payment-consumer.ts`, `packages/core/src/loyalty/jobs/loyalty.scheduler.ts`; integrate 036 before003c.
- **Parallel-safe with TIP-003b (Event protocol manifest):** sequential, shares `packages/shared/src/index.ts`; integrate 036 before003b.
- **Parallel-safe with TIP-023f (Assistant input manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate 036 before023f.
- **Parallel-safe with TIP-023e (Action discovery manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate 036 before023e.
- **Parallel-safe with TIP-023d (Assistant plans manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate 036 before023d.
- **Parallel-safe with TIP-015c (Privacy manifest):** sequential, shares `apps/api/src/app.module.ts`, `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/reply/reply-context.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate 036 before015c.
- **Parallel-safe with TIP-019c (AI utilities manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate 036 before019c.
- **Parallel-safe with TIP-033b (Booking operations manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate 036 before033b.
- **Parallel-safe with TIP-012c (Tenant mail manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate 036 before012c.
- **Parallel-safe with TIP-015e (Contact merge manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/reply/reply-context.ts`, `packages/core/src/crm/services/contact360.ts`, `packages/core/src/loyalty/actions/ledger-system.handlers.ts`, `packages/core/src/loyalty/actions/member.handlers.ts`, `packages/core/src/loyalty/actions/redeem-points.handler.ts`, `packages/core/src/loyalty/jobs/loyalty.scheduler.ts`, `packages/core/src/loyalty/repos/ledger.repo.ts`, `packages/core/src/loyalty/repos/member.repo.ts`, `packages/core/src/loyalty/services/ledger.service.ts`, `packages/core/src/loyalty/services/member-read.service.ts`, `packages/core/src/sales/orders/actions/order-flow.handlers.ts`, `packages/core/src/sales/payments/services/payment-write.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate 036 before015e.
- **Parallel-safe with TIP-015f (Contact lifecycle manifest):** sequential, shares `apps/api/src/app.module.ts`, `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/reply/reply-context.ts`, `packages/core/src/loyalty/actions/ledger-system.handlers.ts`, `packages/core/src/loyalty/actions/member.handlers.ts`, `packages/core/src/loyalty/actions/redeem-points.handler.ts`, `packages/core/src/loyalty/loyalty.module.ts`, `packages/core/src/loyalty/repos/ledger.repo.ts`, `packages/core/src/sales/orders/actions/order-flow.handlers.ts`, `packages/core/src/sales/payments/services/payment-write.ts`, `packages/core/src/sales/payments/services/refunds.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate 036 before015f.
- **Parallel-safe with TIP-032c (Commerce edit manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/sales/orders/actions/order-flow.handlers.ts`; integrate 036 before032c.
- **Parallel-safe with TIP-015d (CRM ownership manifest):** sequential, shares `apps/api/src/app.module.ts`, `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate 036 before015d.
- **Parallel-safe with TIP-026b (CRM activity manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/crm/services/contact360.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate 036 before026b.
- **Parallel-safe with TIP-012b (Bank integration manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate 036 before012b.
- **Parallel-safe with TIP-019b (Runtime integration manifest):** sequential, shares `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/ai/reply/reply-context.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate 036 before019b.
- **Parallel-safe with TIP-025b (Inbox integration manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/crm/services/contact360.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate 036 before025b.
- **Parallel-safe with TIP-022b (agent behavior manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/ai/reply/reply-context.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate 036 before022b.
- **Parallel-safe with TIP-014b (Zalo lifecycle manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate 036 before014b.
- **Parallel-safe with TIP-032b (accepted foundation manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/sales/orders/actions/order-flow.handlers.ts`, `packages/core/src/sales/payments/services/payment-write.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate 032b before036.
- **Parallel-safe with TIP-045b (hardening manifest):** sequential, shares `apps/api/src/app.module.ts`, `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/ai/reply/reply-context.ts`, `packages/core/src/crm/services/contact360.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate 036 before045b. Recompute for later TIPs.
- **Parallel-safe with TIP-030b (contract files manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate 030b before036. Recompute when incomplete manifests expand.
- **Parallel-safe with TIP-023c (genui revised manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate 023c before036. Recompute when remaining manifests expand.
- **Parallel-safe with TIP-023c (genui exact manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate TIP-023c before TIP-036. Recompute after incomplete manifests expand.
- **Parallel-safe with TIP-023b (complete manifest intersection):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/sales/orders/actions/order-flow.handlers.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `tools/ai-live/cases.yaml`; integrate TIP-023b before TIP-036.
- **Parallel-safe with TIP-023b (public API wiring):** sequential, shares `packages/shared/src/index.ts`, `packages/shared/src/api/index.ts`; integrate TIP-023b before TIP-036.
- **Parallel-safe with TIP-023b (exact manifest audit):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `packages/actions/src/index.ts`, `packages/core/src/ai/ai.module.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/sales/orders/actions/order-flow.handlers.ts`, `tools/ai-live/cases.yaml`; integrate TIP-023b before TIP-036. Recompute on later manifest expansion; this is not whole-graph parallel clearance.
- **Parallel-safe with TIP-032b:** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/sales/orders/actions/order-flow.handlers.ts`, `packages/core/src/sales/payments/services/payment-write.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate TIP-032b before TIP-036. Recompute after incomplete manifests expand.
- **Parallel-safe with TIP-015b:** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/core/src/ai/reply/reply-context.ts`, `packages/core/src/crm/services/contact360.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate TIP-015b before TIP-036. Recompute after incomplete manifests expand.
- **Parallel-safe with TIP-041:** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate this TIP before 041. Recheck incomplete manifests.
- **Parallel-safe with TIP-038b:** sequential, shares `apps/api/src/app.module.ts`, `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate this TIP before 038b. Recheck incomplete manifests.
- **Parallel-safe with TIP-040:** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate this TIP before 040. Recheck incomplete manifests.
- **Parallel-safe with TIP-039:** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate this TIP before 039. Recheck incomplete manifests.
- **Parallel-safe with TIP-038 (expanded manifest):** sequential, shares `apps/web/messages/en/actions.json`, `apps/web/messages/vi/actions.json`, `coding-packs/plans/BLUEPRINT.md`, `packages/actions/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`; integrate this TIP before 038; recheck after remaining manifests expand.
- **Parallel-safe with TIP-038:** sequential, shares `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `apps/web/messages/vi/actions.json`, `apps/web/messages/en/actions.json`, `coding-packs/plans/BLUEPRINT.md`; integrate this TIP before 038. Recheck after incomplete manifests expand.
- **Parallel-safe with TIP-037:** sequential, shares `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `packages/core/src/ai/jobs/ai.jobs.module.ts`, `apps/web/messages/vi/actions.json`, `apps/web/messages/en/actions.json`, `coding-packs/plans/BLUEPRINT.md`; integrate this TIP before 037. Recheck when incomplete manifests expand.
- **Parallel-safe with TIP-042c:** sequential, shares `coding-packs/plans/BLUEPRINT.md`, `packages/core/src/sales/orders/actions/order-flow.handlers.ts`; integrate this TIP before 042c. Recheck after incomplete manifests expand.
- **Parallel-safe with TIP-042b:** sequential, shares `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `apps/web/messages/vi/actions.json`, `apps/web/messages/en/actions.json`, `coding-packs/plans/BLUEPRINT.md`; integrate this TIP before 042b; recheck after incomplete manifests are expanded.
- **Parallel-safe with TIP-042:** sequential, shares `packages/actions/src/index.ts`, `packages/shared/src/api/index.ts`, `packages/shared/src/index.ts`, `apps/web/messages/vi/actions.json`, `apps/web/messages/en/actions.json`, `coding-packs/plans/BLUEPRINT.md`; integrate this TIP before 042. Recheck intersections when incomplete manifests are expanded.
- **Parallel-safe with TIP-020b:** sequential, shares `packages/actions/src/index.ts`; integrate 020b after 036, before 043/045b. For 043 also shares `packages/db/prisma/tenant/ai-kb.prisma`, `packages/core/src/ai/ai.module.ts`, `apps/api/src/http/ai/ai.http.module.ts`, `apps/web/src/features/settings/components/RagSection.tsx`, `apps/web/src/shared/api/mock/domains/settings-ai.ts`, settings/action locale files.
- **Parallel-safe with TIP-043:** sequential, shares `packages/actions/src/index.ts` and (where applicable) `packages/core/src/ai/jobs/ai.jobs.module.ts`; TIP-043 integrates after 015b/023b/023c/030b/032b/036 and before 045b.
- TIP-ID: TIP-036
- Project: AppChat V2
- Trạng thái tài liệu: đủ khung để rà; **chưa chốt gate Q-027 và chưa rà độc lập**, không phải lệnh bắt đầu code.
- Module: loyalty; tích hợp orders/payments/CRM/agent theo COMMERCE §7.
- Priority: P1; REQ-J01–J04, REQ-F02d; D24, D27, D31, D32, D42, D51, DC-186.
- Depends on: 015, 031, 032, 023b, 023c, 015b, 032b; tích hợp sau 030b để không đụng registry. Không chờ 044 để tự test.
- Estimated: XL, chia 4 bước commit (schema/ledger → payment/events → API/UI → nghiệm thu); một TIP, không bỏ bước cuối.
- **Dòng COVERAGE nhận:** REQ-J01, REQ-J02, REQ-J03, REQ-J04, REQ-F02d; COM-4-11, COM-7-1, COM-7-2, COM-7-4, COM-7-5, COM-7-6, COM-7-7; D08c, DC-186; ACT-loyalty.get_member, ACT-loyalty.adjust_points, ACT-loyalty.update_config, ACT-payment.redeem_points; BP-4.4-loyalty; phần loyalty của BP-4.1-d và STD-api-envelope-2b; STD-domain-money-1.5; DEF-031-3, DEF-032-1; PRO-loyalty-read, PRO-loyalty-adjust, PRO-loyalty-config, PRO-loyalty-memberacts, PRO-loyalty-files.
- Gate bổ sung nhận: Q-027; không coi câu hỏi tiền là nghĩa vụ đã đạt.
- **Parallel-safe with:** sequential. Shares `packages/core/src/crm/services/contact360.ts` và `packages/core/src/ai/reply/reply-context.ts` với 015b; `packages/core/src/sales/payments/services/payment-write.ts`, `packages/core/src/sales/orders/actions/order-flow.handlers.ts` với 032b; `packages/actions/src/index.ts` với 023b/023c/030b/045b; `packages/core/src/ai/jobs/ai.jobs.module.ts` với 023b/045b. 023b/023c/030b/015b/032b trước 036, 045b sau 036. Các TIP 037–046 chưa có manifest không được mặc nhiên coi độc lập; rà giao file trước thi công.
- **Files touched:** danh sách dưới là ranh giới file, C=create, M=modify. Không sửa code trong phiên viết TIP này.

### Files touched — backend và contracts
| Op | File |
|---|---|
| M | `packages/db/prisma/tenant/loyalty.prisma` |
| C | `packages/db/prisma/tenant/migrations/20261102003600_loyalty/migration.sql` |
| M | `packages/actions/src/loyalty.ts` |
| C | `packages/actions/src/loyalty-system.ts` |
| C | `packages/actions/src/loyalty-payments.ts` |
| M | `packages/actions/src/index.ts` |
| C | `packages/shared/src/api/loyalty.ts` |
| M | `packages/shared/src/api/index.ts` |
| C | `packages/shared/src/loyalty/math.ts` |
| C | `packages/shared/src/loyalty/events.ts` |
| M | `packages/shared/src/index.ts` |
| M | `packages/shared/src/orders/order-state.ts` |
| M | `packages/core/src/loyalty/loyalty.module.ts` |
| C | `packages/core/src/loyalty/public.ts` |
| C | `packages/core/src/loyalty/loyalty.seed.ts` |
| C | `packages/core/src/loyalty/repos/member.repo.ts` |
| C | `packages/core/src/loyalty/repos/ledger.repo.ts` |
| C | `packages/core/src/loyalty/services/ledger.service.ts` |
| C | `packages/core/src/loyalty/services/member-read.service.ts` |
| C | `packages/core/src/loyalty/services/config.service.ts` |
| C | `packages/core/src/loyalty/services/member-files.service.ts` |
| C | `packages/core/src/loyalty/actions/member.handlers.ts` |
| C | `packages/core/src/loyalty/actions/config.handler.ts` |
| C | `packages/core/src/loyalty/actions/ledger-system.handlers.ts` |
| C | `packages/core/src/loyalty/actions/redeem-points.handler.ts` |
| C | `packages/core/src/loyalty/actions/member-files.handlers.ts` |
| C | `packages/core/src/loyalty/events/order-consumer.ts` |
| C | `packages/core/src/loyalty/events/payment-consumer.ts` |
| M | `packages/core/src/loyalty/jobs/loyalty.jobs.module.ts` |
| C | `packages/core/src/loyalty/jobs/loyalty.scheduler.ts` |
| M | `packages/core/src/sales/orders/actions/order-flow.handlers.ts` |
| M | `packages/core/src/sales/payments/services/payment-write.ts` |
| M | `packages/core/src/sales/payments/services/refunds.ts` |
| M | `packages/core/src/crm/services/contact360.ts` |
| M | `packages/core/src/ai/reply/reply-context.ts` |
| M | `packages/core/src/ai/jobs/ai.jobs.module.ts` |
| M | `apps/api/src/http/loyalty/loyalty.http.module.ts` |
| C | `apps/api/src/http/loyalty/loyalty.controller.ts` |
| M | `apps/api/src/app.module.ts` |

### Files touched — FE, tests, i18n, evidence
| Op | File |
|---|---|
| M | `apps/web/src/features/loyalty/api.ts` |
| M | `apps/web/src/features/loyalty/types.ts` |
| M | `apps/web/src/features/loyalty/components/MemberDrawer.tsx` |
| M | `apps/web/src/features/loyalty/components/MemberTabs.tsx` |
| C | `apps/web/src/features/loyalty/components/MemberAiTab.tsx` |
| C | `apps/web/src/features/loyalty/components/MemberFilesTab.tsx` |
| M | `apps/web/src/features/loyalty/components/ChurnCard.tsx` |
| M | `apps/web/src/features/loyalty/components/SimulatorModal.tsx` |
| M | `apps/web/src/shared/api/mock/domains/loyalty.ts` |
| M | `apps/web/src/shared/api/mock/domains/loyalty.test.ts` |
| M | `apps/web/messages/vi/loyalty.json` |
| M | `apps/web/messages/en/loyalty.json` |
| M | `apps/web/messages/vi/actions.json` |
| M | `apps/web/messages/en/actions.json` |
| C | `packages/shared/test/loyalty-math.test.ts` |
| C | `packages/core/test/loyalty-ledger.test.ts` |
| C | `apps/api/test/integration/loyalty.test.ts` |
| C | `apps/api/test/integration/loyalty-concurrency.test.ts` |
| C | `apps/api/test/integration/loyalty.contract.test.ts` |
| M | `apps/web/e2e/loyalty.spec.ts` |
| C | `apps/web/e2e/http/loyalty.spec.ts` |
| M | `tools/ai-live/cases.yaml` (do 023b tạo trước) |
| M | `coding-packs/plans/BLUEPRINT.md` (ghi hợp đồng bổ sung, không đổi luật) |
| C | `coding-packs/reports/TIP-036-completion.md` |

## CONTEXT
- Working dir: repo AppChat_Ver2; stack theo `BUILDER-HANDOFF.md` (NestJS, Prisma/Postgres native, BullMQ, Next/Ant Design, zod).
- Mốc khảo sát `fba7c2b`: `packages/db/prisma/tenant/loyalty.prisma:1` chỉ comment; `loyalty.module.ts:5`, `loyalty.jobs.module.ts:6`, HTTP module cũng stub. Có import HTTP module trong AppModule nhưng đường register thực chưa có loyalty.
- `packages/actions/src/loyalty.ts:9-65` có 3 ActionDef, chưa có handler. `payment.redeem_points` chưa khai. Không tạo lại/đổi input ba action đã có.
- `order-flow.handlers.ts:22-44` tính points và ghi trên đơn; undo hoàn tất chỉ xoá pointsEarned/tổng chi, chưa đảo sổ điểm. `orders/order-state.ts:63-67` dùng hệ số cố định. Cần dùng cấu hình snapshot thay vì tin points cũ khi config thay đổi.
- `payment-write.ts:16,59-99` chưa có method/kind points trong đường ghi chung; không dựng sổ thu tiền thứ hai ở loyalty.
- `contact360.ts:40` quy đổi ×10 sai luật ×100. `reply-context.ts:80-101` đọc tên/giai đoạn nhưng chưa đưa hạng/điểm vào ngữ cảnh.
- FE có năm GET trong `features/loyalty/api.ts:8-23`; `types.ts` là contract mock hiện hành. `MemberTabs.tsx:140-191` dùng i18n làm danh sách AI và toast giả cho AI/tệp; file dùng chung từ overview không gắn đúng contact.
- Đọc trước: COMMERCE §4/4b/7/8b; Blueprint §2.2 loyalty, §2.3 events, §3.4/3.5, §4.4, §7.2; REQ-J01–J04; DC-186; prototype L4778–5202. Churn J05 và voucher P2 không phải scope TIP này.

## APPLICABLE STANDARDS
- `actions/action-registry.md`, `api/response-envelope.md`: một đường ghi, preview/idempotency, zod và read service dùng chung.
- `authz/rbac-permissions.md`, `database/tenant-db.md`, `database/indexing.md`: quyền/scope phía server, DB riêng, deferred join và EXPLAIN.
- `events/outbox.md`, `domain/concurrency.md`, `domain/money-time-numbering.md`, `domain/state-machine.md`: sổ điểm/tiền atomic, event retry, Clock/timezone, không đổi ORDER_FLOW.
- `domain/gap-filling.md`, `domain/validation-defaults.md`: không tự đổi luật tiền/điểm, mở rộng contract tương thích.
- `ui/frontend-structure.md`, `ui/prototype-parity.md`, `ui/interaction-patterns.md`, `i18n/i18n.md`: không dựng lại màn, D42, token, vi/en.
- `ai/agent-gateway.md`, `ai/eval.md`, `ops/observability-security.md`, `code/file-size-module-layout.md`, `code/testing.md`, `workflow/git-flow-ci.md`; cổng backend D59 trong GOAL-BACKEND.

## Rà trước khi làm
1. Rebase `origin/dev`; đối chiếu 023b/023c/015b/032b/030b đã merge, đọc report và các file chia sẻ. Chưa có dependency thì không giả lập bằng stub để chốt TIP.
2. Kiểm đường migration hiện dùng; timestamp trên là tên dự kiến cố định, nếu đã tồn tại phải cập nhật manifest trước code. Không chạy migration vào tenant demo.
3. Đọc đầy đủ schema invoice/payment/order, payload `order.completed`, `order.cancelled`, refund và undo thực tế. Thêm field optional/định nghĩa action mới trong TIP; không âm thầm thay permission hay enum cũ.
4. Kiểm các file M/C; file mà TIP trước đã tạo thì đổi C thành M sau khi đọc. Rà intersection với mọi TIP mới phát sinh, serialize shared registry/module/i18n.
5. **Gate tiền/điểm Q-027:** phải có quyết định được duyệt cho hoàn điểm đã hết hạn, đảo điểm đã tiêu hết, và căn cứ earn khi completed nhưng chưa trả đủ. Không suy diễn từ mock; chưa chốt thì giữ các AC tiền liên quan chưa đạt, không báo DONE.

## TASK
Hoàn thiện một domain loyalty dùng chung cho UI, agent và sự kiện commerce. Tạo sổ điểm atomic/idempotent, nối màn hiện có sang API thật và thay mọi nút giả trong phạm vi; không thay chương trình điểm đã chốt.

### 1. Schema, seed, truy vấn
- `loyalty_config` singleton đúng Blueprint; seed khi provision bằng registry seed DC-026, và backfill idempotent tenant cũ. Không sửa lịch sử earn khi cấu hình đổi.
- `loyalty_ledger`: delta/balance_after, kind, reason, ref_type/ref_id, actor, expires_at, remaining, reversed_by_id; snapshot căn cứ và hệ số tại earn. Sổ giao dịch chỉ thêm; thay remaining qua bảng phân bổ FIFO riêng trong `loyalty.prisma`, không xoá lịch sử. Đặt unique chống replay earn và unique từng reversal/refund/expiry.
- Thêm bảng liên kết `loyalty_member_file(contact_id,file_id,created_by,created_at)` trong file Prisma của TIP, unique contact/file. Không FK sang platform; bảo vệ file theo scope contact.
- Index ledger `(contact_id, created_at DESC, id DESC) INCLUDE (kind,delta,balance_after)`; lô FIFO `(contact_id, expires_at, id)` partial còn số dư, INCLUDE số dư; quét hạn `(expires_at,id)` partial còn số dư. Member list dùng partial contact index `(tier_key,created_at DESC,id DESC)` và biến thể owner/team theo scope; dùng lại phone_norm và trigram expression tên. Không thêm workspace_id.
- List chọn ID trước LIMIT/OFFSET rồi JOIN payload; ledger cursor `(created_at,id)`. EXPLAIN ANALYZE với >=10k member/ledger, lọc tier/own/q; test số query không tăng tuyến tính theo số member.

### 2. Action và sổ điểm
- Cài `loyalty.get_member`, `loyalty.adjust_points` (7 lý do, undo 24h), `loyalty.update_config` đúng ActionDef. Config chỉ bật/tắt, 4 hệ số riêng từng tier, marketplace_earn; không sửa rates/expiry/max redemption/ngưỡng hạng đã chốt.
- Cấu hình tiers phải đủ bốn key duy nhất; delta nguyên khác 0, reason enum, note <=500. Tiền bigint/string, điểm ở JSON number chỉ trong safe integer range. Preview có số dư trước/sau và căn cứ; agent không được adjust/config.
- Action system-only cho earn/reverse/expire/review, định nghĩa tại `loyalty-system.ts`, không agentGrantable. Consumer/job gọi Executor source=system với context tenant đã xác thực; HTTP không được giả source system. Cấm trực tiếp ghi từ controller/tool/queue callback.
- Khoá contact/lô FIFO và payment/order theo thứ tự đồng nhất; cập nhật ledger, cache `points_balance`, timeline, outbox cùng transaction. Consumer chống duplicate `(event_id,consumer)` và semantic reference; không dùng memory lock.
- Earn một lần tại completed, không earn tại appointment.done hay mỗi payment. Hệ số snapshot, loại phần dùng điểm trước VAT; làm tròn theo money standard. Marketplace mặc định tắt; config loyalty là nguồn quyết định, không giữ flag connector cũ trái config.
- Undo completed phải có reversal durable; complete lại không double earn hoặc bị unique cũ chặn vĩnh viễn. Cancel/refund một phần đảo đúng tỷ lệ, delta tính theo tổng hoàn luỹ kế trừ phần đã đảo để tránh rounding drift. Chỉ refund đã duyệt/xác nhận mới đảo; retry/out-of-order không cộng lại khoản đã huỷ. Không cho phép huỷ completed bằng cách sửa ORDER_FLOW.
- Job hết hạn FIFO 12 tháng và xét hạng đầu quý theo điểm tích 12 tháng/Clock timezone workspace. Retry theo bucket + contact; resume sau restart, không expiry hai lần. Không tính điểm đã dùng thành điểm tích mới.

### 3. Đổi điểm vào khoản thu
- `payment.redeem_points` mới: input `{invoice_id,points}` (uuid, positive integer); output `{payment_id,invoice_id,order_id,points,amount,balance_after}`. Risk money, permission dùng quyền ghi khoản thu hiện hành, agentGrantable=false theo bảng Blueprint; undo 24h. Thêm description/example/i18n và invalidates loyalty/invoices/orders/contact.
- Server xác định contact/order từ invoice; invoice phải còn phải thu và có order; không tin contact_id do client cung cấp. Cùng transaction: lock, kiểm số điểm còn dùng, cap **tổng** điểm dùng trên đơn <=50%, mỗi điểm 100đ, không vượt công nợ invoice; trừ FIFO và ghi customer_payment kind/method points qua đường payment dùng chung.
- Hai invoice của một đơn không được né cap; đổi đồng thời không double spend. Không dùng điểm để giảm quote, không tính điểm trả thành tiền mặt nhận ngân hàng, không đưa điểm vào khoản hoàn tiền mặt lần nữa.
- Undo ghi bù, không DELETE ledger/payment; khôi phục phân bổ FIFO theo quyết định Q-027, cập nhật cache/đơn/invoice/timeline. Không bypass kiểm version/trạng thái.

### 4. API, agent, UI
- GET `/loyalty/config`, `/members`, `/members/:contactId`, `/members/:contactId/ledger`, `/overview`, `/lookup?phone=`; scopeFilter mọi read, lookup ngoài scope không tiết lộ tồn tại/PII. DTO zod tách từ FE, tiền string, ISO dates; page/limit/meta.total đúng D42, ledger cursor.
- Overview/thuộc tính member tính thật theo DB; không cấp churn score giả (J05 P2: ghi rõ Sắp có, không nút no-op). Tệp từ member endpoint có file_id, không lấy overview chung của workspace; giữ shape cũ bằng field bổ sung tương thích.
- Upload dùng transport.upload purpose attachment; action `loyalty.attach_file` xác nhận file thuộc tenant/người tải và quyền sửa contact hiện hành; GET nội dung qua route loyalty đã kiểm scope trước Storage. Không dùng file_id để đọc tệp khách khác. Toast chỉ sau server thành công, không tạo action nghiệp vụ bằng POST riêng.
- Tách AiTab/FilesTab khỏi MemberTabs. AI gợi ý gửi ngữ cảnh contact/tier/points đến Trợ lý 023c, tạo run thật và hiển thị lỗi/quyền/confirm; không lấy t.raw làm dữ liệu kết quả, không tự gửi khách.
- `loyalty.get_member` và context reply cung cấp hạng/điểm thật sau khi kiểm quyền agent/user, không lộ khách khác. CRM quy đổi ×100. Simulator/mock dùng chung pure math, hiển thị tiền qua fmt.
- Đăng ký module API có DB và handler trong ROLE=ai để action được resume không rơi 501; ROLE=jobs nạp scheduler. Không sửa client transport toàn cục để che thiếu route.

## ACCEPTANCE CRITERIA
| AC | Given / When / Then — bằng chứng bắt buộc |
|---|---|
| AC1 | Given tenant mới/cũ, When seed chạy hai lần, Then đúng 1 config và không đổi ledger; 2 tenant cô lập. Migration DB thật + test schema/index. |
| AC2 | Given base 19.999đ, hạng Vàng, When completed, Then floor(1×1,5)=1 điểm; 20.000đ →3; retry event 10 lần →1 earn; appointment.done không earn. Config hệ số đổi chỉ ảnh hưởng đơn sau. |
| AC3 | Given order 100.000đ và 1.000 điểm, When đổi 500 điểm, Then thu 50.000đ; 501 bị chặn. Hai invoice/request cùng đơn tổng không vượt 500; thiếu điểm/công nợ thì toàn transaction rollback. |
| AC4 | Given earn/đổi/undo/refund, When duplicate hoặc out-of-order, Then tổng ledger/cache khớp; undo rồi complete lại không mất/nhân điểm; refund 2 lần một phần không đảo quá earn gốc. Ca Q-027 phải có expected được duyệt trước chạy. |
| AC5 | Given hai lô hạn khác nhau, When redeem/expire cạnh tranh, Then FIFO, không double spend; job Clock qua hạn 12 tháng và đầu quý cập nhật đúng một lần; restart tiếp tục được. |
| AC6 | Given 5 vai trò và 2 tenant, When GET/action/lookup/file/agent truy cập, Then đúng permission và own/team/all; watcher chỉ đọc; agent không adjust/config; secret/PII ngoài scope không xuất hiện trong preview/error. |
| AC7 | Given members có đủ ba trang và filter tier/q, When HTTP + mock đọc, Then parse cùng zod/meta.total; count đúng scope; query có EXPLAIN và không N+1. |
| AC8 | Given màn loyalty ở http, When adjust→undo/config/upload/open file/giao AI rồi reload, Then trạng thái DB thật hiển thị, không toast giả; lỗi mạng/quyền có phản hồi; vi/en và mobile 390 hoạt động. |
| AC9 | Given 9router thật tenant seed riêng, When hỏi số điểm/hạng, quy đổi giá trị, yêu cầu vượt 50%, When giao agent không quyền, Then số liệu đúng DB, chặn vượt hạn/quyền và không ghi ngoài xác nhận; 4 ca hệ thống phải pass, lưu run/action IDs không key. |
| AC10 | Given API và ROLE=ai thật, When assistant gọi get_member và xác nhận action được phép, Then handler đúng module, không 501; test preview-coverage của 023b xanh. |

### Lệnh nghiệm thu (builder phải chạy, phiên viết TIP chưa chạy)
- Unit targeted: `pnpm --filter @appchat/shared test -- loyalty-math`; `pnpm --filter @appchat/core test -- loyalty-ledger`.
- Integration: `pnpm --filter @appchat/api test:integration -- loyalty` (2 file); contract: đưa `loyalty.contract.test.ts` vào harness hiện hành và xác nhận runner thật collect file, không chấp nhận “0 tests”.
- E2E: `pnpm e2e loyalty`; `pnpm e2e:http loyalty`; parity `pnpm parity loyalty` (xác nhận selector của manifest), `pnpm i18n:check`, `pnpm ai:live` (023b cung cấp).
- Trước mỗi commit: lint/typecheck/test package đổi + `pnpm depcheck`. Chốt TIP: full lint/typecheck/unit/integration/depcheck/build, E2E mock/http flow, full E2E hồi quy một lần, parity liên quan theo D59; shared thay đổi → parity --done.
- Integration cần PG/Redis native riêng; không dùng/chỉnh tenant demo, không tự dừng worker demo. Ghi môi trường và mọi ô provider thật chưa nghiệm thu, không giả PASS.

## CONSTRAINTS
- DO NOT: đổi COMMERCE rates/cap/thời hạn/quyền, cấp loyalty.adjust cho agent, gộp điểm với credit nền tảng, dùng số liệu i18n/mock để trả API.
- REUSE: ActionExecutor, TenantDbResolver, scopeFilter, Clock, outbox, payment service, Storage, math/formatter và UI có sẵn. Không thêm framework/thư viện.
- SKIP có nguồn: churn/voucher J05–J06 P2; không bỏ các nút AI/tệp in-scope. 044 đánh giá tổng thể không thay test của 036.
- Backend <600 dòng (500 phải tách), FE <400; file chính orchestration, test riêng. Không thêm logic vào file vượt trần; manifest cập nhật module tách trước code.

## BUILDER-CHECKLIST
- [ ] Files touched/overlap và Q-027 đã rà; không code vượt quyết định tiền/quyền.
- [ ] AC1–AC10 từng dòng có bằng chứng, không lấy unit fake làm live.
- [ ] Atomic ledger/payment, FIFO, idempotency, tenant/role isolation và undo trên PG thật xanh.
- [ ] Action-first + snapshot điểm, không đường ghi thứ hai; agent đúng giao quyền D51.
- [ ] D59, parity, mock/http, EXPLAIN, i18n và live chạy thật; report ghi ca chưa chạy.
- [ ] Sửa parts COVERAGE rồi chạy merge.py, report SHA; commit sạch, PR chỉ vào dev.
