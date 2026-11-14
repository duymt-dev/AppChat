# TIP-006b — exact file manifest

M modify, C create. Future M requires predecessor integration. No directory wildcard; tests separate.

| Mode | Exact file | Responsibility |
|---|---|---|
| M | `packages/core/src/notify/events/notify.consumers.ts` | Durable projection/handoff/selection/current authority and recovery wiring |
| M | `packages/core/src/notify/services/notifier.ts` | Durable projection/handoff/selection/current authority and recovery wiring |
| M | `packages/core/src/notify/services/recipients.ts` | Durable projection/handoff/selection/current authority and recovery wiring |
| M | `packages/core/src/notify/services/prefs.service.ts` | Durable projection/handoff/selection/current authority and recovery wiring |
| M | `packages/core/src/notify/jobs/notify-mail.processor.ts` | Durable projection/handoff/selection/current authority and recovery wiring |
| M | `packages/core/src/notify/jobs/notify.jobs.module.ts` | Durable projection/handoff/selection/current authority and recovery wiring |
| M | `packages/core/src/notify/realtime/emitter.ts` | Durable projection/handoff/selection/current authority and recovery wiring |
| M | `packages/core/src/notify/realtime/envelope.ts` | Durable projection/handoff/selection/current authority and recovery wiring |
| M | `packages/core/src/notify/realtime/filter.ts` | Durable projection/handoff/selection/current authority and recovery wiring |
| M | `packages/core/src/catalog/events/catalog-sync.ts` | Durable projection/handoff/selection/current authority and recovery wiring |
| M | `packages/core/src/catalog/jobs/catalog.jobs.module.ts` | Durable projection/handoff/selection/current authority and recovery wiring |
| M | `packages/core/src/ai/tasks/task-scheduler.ts` | Durable projection/handoff/selection/current authority and recovery wiring |
| M | `packages/core/src/ai/tasks/task.handlers.ts` | Durable projection/handoff/selection/current authority and recovery wiring |
| M | `packages/core/src/ai/tasks/task.queue.ts` | Durable projection/handoff/selection/current authority and recovery wiring |
| M | `packages/core/src/ai/tasks/task.jobs.ts` | Durable projection/handoff/selection/current authority and recovery wiring |
| M | `packages/core/src/ai/tasks/task.runner.ts` | Durable projection/handoff/selection/current authority and recovery wiring |
| M | `packages/core/src/ai/runs/run.store.ts` | Durable projection/handoff/selection/current authority and recovery wiring |
| M | `packages/core/src/ai/jobs/ai.jobs.module.ts` | Durable projection/handoff/selection/current authority and recovery wiring |
| M | `packages/core/src/index.ts` | Durable projection/handoff/selection/current authority and recovery wiring |
| M | `apps/api/src/http/notify/realtime/ws.gateway.ts` | Actual role registration and safe duplicate/out-of-order invalidation |
| M | `apps/worker/src/roles/jobs.module.ts` | Actual role registration and safe duplicate/out-of-order invalidation |
| M | `apps/worker/src/roles/ai.module.ts` | Actual role registration and safe duplicate/out-of-order invalidation |
| M | `apps/worker/src/event-protocol.manifest.ts` | Actual role registration and safe duplicate/out-of-order invalidation |
| M | `apps/web/src/shared/realtime/event-invalidation.ts` | Actual role registration and safe duplicate/out-of-order invalidation |
| M | `packages/core/src/kernel/privacy/inventory.ts` | Predecessor adapter classification/privacy/metrics; no policy or paid-root replacement |
| M | `packages/core/src/kernel/privacy/cleanup.ts` | Predecessor adapter classification/privacy/metrics; no policy or paid-root replacement |
| M | `packages/core/src/privacy/services/source-catalog.ts` | Predecessor adapter classification/privacy/metrics; no policy or paid-root replacement |
| M | `packages/core/src/privacy/services/read-catalog.ts` | Predecessor adapter classification/privacy/metrics; no policy or paid-root replacement |
| M | `packages/core/src/privacy/services/write-catalog.ts` | Predecessor adapter classification/privacy/metrics; no policy or paid-root replacement |
| M | `packages/core/src/crm/memory/summary-consumer.ts` | Predecessor adapter classification/privacy/metrics; no policy or paid-root replacement |
| M | `packages/core/src/ai/assistant/discovery/build.queue.ts` | Predecessor adapter classification/privacy/metrics; no policy or paid-root replacement |
| M | `packages/core/src/ai/kb/suggestions/suggestion.consumer.ts` | Predecessor adapter classification/privacy/metrics; no policy or paid-root replacement |
| M | `packages/core/src/marketing/events/campaign-attribution.ts` | Predecessor adapter classification/privacy/metrics; no policy or paid-root replacement |
| M | `packages/core/src/kernel/metrics/collectors.ts` | Predecessor adapter classification/privacy/metrics; no policy or paid-root replacement |
| C | `packages/core/src/notify/delivery/store.ts` | Bounded durable fanout/delivery responsibility; no raw payload in wakeup |
| C | `packages/core/src/notify/delivery/selection.ts` | Bounded durable fanout/delivery responsibility; no raw payload in wakeup |
| C | `packages/core/src/notify/delivery/admission.ts` | Bounded durable fanout/delivery responsibility; no raw payload in wakeup |
| C | `packages/core/src/notify/delivery/recovery.ts` | Bounded durable fanout/delivery responsibility; no raw payload in wakeup |
| C | `packages/core/src/notify/delivery/realtime.ts` | Bounded durable fanout/delivery responsibility; no raw payload in wakeup |
| C | `packages/core/src/notify/delivery/mail.ts` | Bounded durable fanout/delivery responsibility; no raw payload in wakeup |
| C | `packages/core/src/notify/delivery/types.ts` | Bounded durable fanout/delivery responsibility; no raw payload in wakeup |
| C | `packages/core/src/notify/delivery/source-guard.ts` | Bounded durable fanout/delivery responsibility; no raw payload in wakeup |
| C | `packages/core/src/notify/jobs/delivery-recovery.ts` | Bounded durable fanout/delivery responsibility; no raw payload in wakeup |
| C | `packages/core/src/catalog/events/catalog-handoff.ts` | Bounded durable fanout/delivery responsibility; no raw payload in wakeup |
| C | `packages/core/src/ai/tasks/event-fanout.ts` | Bounded durable fanout/delivery responsibility; no raw payload in wakeup |
| C | `packages/core/src/ai/tasks/event-admission.ts` | Bounded durable fanout/delivery responsibility; no raw payload in wakeup |
| C | `packages/core/src/ai/tasks/occurrence.ts` | Bounded durable fanout/delivery responsibility; no raw payload in wakeup |
| C | `packages/core/src/ai/tasks/dispatch-intent.ts` | Bounded durable fanout/delivery responsibility; no raw payload in wakeup |
| C | `packages/core/src/ai/tasks/recovery.ts` | Bounded durable fanout/delivery responsibility; no raw payload in wakeup |
| C | `packages/core/src/kernel/events/fanout/types.ts` | Bounded durable fanout/delivery responsibility; no raw payload in wakeup |
| C | `packages/core/src/kernel/events/fanout/store.ts` | Bounded durable fanout/delivery responsibility; no raw payload in wakeup |
| C | `packages/core/src/kernel/events/fanout/cursor.ts` | Bounded durable fanout/delivery responsibility; no raw payload in wakeup |
| C | `packages/core/src/kernel/events/fanout/selection.ts` | Bounded durable fanout/delivery responsibility; no raw payload in wakeup |
| C | `packages/db/prisma/tenant/event-delivery.prisma` | Tenant fanout snapshot/items, notification delivery and task dispatch intents |
| C | `packages/db/prisma/tenant/migrations/20261102000620_event_delivery/migration.sql` | Tenant fanout snapshot/items, notification delivery and task dispatch intents |
| C | `packages/core/test/notify-delivery.test.ts` | Dedicated crash/replay/authority and durable fanout fixtures |
| C | `packages/core/test/notify-current-authority.test.ts` | Dedicated crash/replay/authority and durable fanout fixtures |
| C | `packages/core/test/realtime-delivery.test.ts` | Dedicated crash/replay/authority and durable fanout fixtures |
| C | `packages/core/test/catalog-handoff.test.ts` | Dedicated crash/replay/authority and durable fanout fixtures |
| C | `packages/core/test/task-event-fanout.test.ts` | Dedicated crash/replay/authority and durable fanout fixtures |
| C | `packages/core/test/task-occurrence.test.ts` | Dedicated crash/replay/authority and durable fanout fixtures |
| C | `packages/core/test/event-future-adapters.test.ts` | Dedicated crash/replay/authority and durable fanout fixtures |
| C | `apps/api/test/integration/event-delivery.test.ts` | Native DB/Redis barriers, selection snapshot and actor/source boundaries |
| C | `apps/api/test/integration/event-delivery-recovery.test.ts` | Native DB/Redis barriers, selection snapshot and actor/source boundaries |
| C | `apps/api/test/integration/event-delivery-privacy.test.ts` | Native DB/Redis barriers, selection snapshot and actor/source boundaries |
| C | `apps/api/test/integration/task-fanout.test.ts` | Native DB/Redis barriers, selection snapshot and actor/source boundaries |
| C | `apps/worker/test/integration/event-delivery-composition.test.ts` | Actual jobs/ai/all startup and historical registry version capability test |
| C | `apps/web/src/shared/realtime/event-delivery.test.ts` | Duplicate/out-of-order/refetch invalidation contract |
| M | `packages/core/src/notify/services/notifications.service.ts` | Current source-aware read/masking and durable invalidation DTO |
| M | `packages/core/src/ai/tasks/task.store.ts` | Stable trigger generation under edit/reschedule; preserve nextRunOf policy |
| M | `packages/db/prisma/tenant/ai-tasks.prisma` | Explicit trigger generation field for task edits and occurrence selection |
| M | `packages/db/prisma/tenant/kernel.prisma` | Notification source lineage/current read references |
| C | `packages/db/prisma/platform/migrations/20261102000621_delivery_membership_index/migration.sql` | Covering active workspace-member selection index; no platform business state changes |

## Future M provenance

- `apps/worker/src/event-protocol.manifest.ts`: TIP-003b-event-protocol.md
- `packages/core/src/kernel/privacy/inventory.ts`: TIP-015c-contact-privacy.md
- `packages/core/src/kernel/privacy/cleanup.ts`: TIP-015c-contact-privacy.md
- `packages/core/src/privacy/services/source-catalog.ts`: TIP-015c-contact-privacy.md
- `packages/core/src/privacy/services/read-catalog.ts`: TIP-015c-contact-privacy.md
- `packages/core/src/privacy/services/write-catalog.ts`: TIP-015c-contact-privacy.md
- `packages/core/src/crm/memory/summary-consumer.ts`: TIP-015b-contact-memory.md
- `packages/core/src/ai/assistant/discovery/build.queue.ts`: TIP-023e-action-discovery.md
- `packages/core/src/ai/kb/suggestions/suggestion.consumer.ts`: TIP-043-kb-conversation-learning.md
- `packages/core/src/marketing/events/campaign-attribution.ts`: TIP-037-marketing.md
- `packages/core/src/kernel/metrics/collectors.ts`: TIP-045b-app-hardening.md
