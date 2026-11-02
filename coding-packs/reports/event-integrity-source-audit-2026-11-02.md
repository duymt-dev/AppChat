# Event/system integrity source audit — 2026-11-02

Docs-only, parent source inspection plus independent reviewer audit_blueprint_remainder. No runtime/native changes. Ledger1539/126 gaps before this audit; candidate pack names below are reservations, not ownership or implementation claims.

## Kernel findings
- dispatcher.ts26–36 reads receipt, calls handler, inserts receipt separately. Two concurrent dispatches or crash after domain effect before receipt can repeat effect; unique receipt is not exactly-once execution. consumer.ts explicitly documents outside-handler transaction and delegates all safety to handlers without proof matrix.
- dispatcher.ts24 returns success when no registered consumer matches. Worker startup/readiness and intended no-consumer disposition must be explicit; missing domain module cannot ACK work as completed.
- relay.ts35–61 has no durable claim; success CAS pending, failure update only byID can overwrite another relay's published state. attempts derive stale snapshot. Process-local busy in outbox.jobs.module cannot coordinate multiple processes.
- EventsRunner concurrency8 and availableAt relay ordering provide no persisted entity FIFO; an entity mutex alone cannot prevent newer event overtaking older retry. Need event aggregate identity/sequence and blocked retry-head behavior, not BullMQ Pro group assumption.
- BullEventPublisher job retention1000completed/5000failed means jobId dedupe is temporary. Published means queued, not every consumer done. Durable dispatch/consumer status, failures and bounded recovery required; never report external delivery exactly-once from queue retention.

## Current consumer matrix (all registerEventConsumer callers inspected)
|Consumer|Source|Classification / missing proof|
|---|---|---|
|sales.quote-owner|sales/jobs/sales.jobs.module.ts29–35 → quotes/services/quote-system.ts|Business owner mutation from stale event;015d already removes it in favor of atomic transfer. Do not add another owner-changing consumer or override immutable attribution.|
|sales.payment-packages|sales/jobs/payment.jobs.ts40–46 → payments/services/payment-system.ts81+|Order lock+grant/outbox but no Executor/action log;032b owns grant rules. Needs private canonical system wrapper and atomic receipt/current-state proof without policy change.|
|sales.order-sync|sales/jobs/order-sync.jobs.ts → OrderSyncService.handleEvent|External ingress/business import. Existing012b/015f/032b receipts/current connector/lifecycle guards must remain; processed_at alone not atomic effect proof.|
|billing.trial|billing/events/billing.events.ts45–53 → subscriptions.service.ts35–45|Platform subscription/wallet commit then emit to tenant. Crash before emit, replay sees existing subscription and returnsfalse, loses downstream event. Needs durable platform→tenant intent/recovery;039/045b existing crossDB contracts, not fictitious distributed transaction.|
|catalog-sync|catalog/events/catalog-sync.ts48–84|KB derived source projection then queue.push. Crash after create/update before enqueue can replay as unchanged and omit ingestion forever. Need same-transaction durable ingest intent, source revision uniqueness and current privacy/lifecycle guard;020b/043/019b boundaries.|
|support|support/jobs/support.jobs.module.ts46–56 → support-system.ts|Ticket reopen/status/first-response/SLA/CSAT business mutation, not mere counter. System action/current-state/version/event receipt required; preserve response-clock rules.|
|notify|notify/events/notify.consumers.ts9–16 → services/notifier.ts48+|Notification projection uses deterministic IDs but WS/email enqueue outside insertion. Needs durable delivery intents/receipts with current recipient/field/privacy checks; no claim of exactly-once email.|
|realtime|notify.consumers.ts19–31|Invalidation/projection, not business mutation. At-least-once eventID/version, duplicate/out-of-order tolerant clients and current gateway authority are valid; no business action wrapper merely for WS.|
|ai-tasks|ai/tasks/task-scheduler.ts19–37/76–84|Busy check races run creation; queueRun then push gap; schedule advances nextRunAt before durable run/dispatch intent. Event fanout take100 with no cursor can ACK after omitting task101+. Need bounded durable fanout/current task generation and stable per-trigger receipts, no new autonomous budget.|

## System transition inventory outside consumers
quote-system expire/view/remind; payment-system overdue/remind and packages expiry; booking-system hold expiry/reminder; support-system SLA sweep/customer replies; subscription trial expiry. Some fabricate system context with isOwner:true rather than invoking Executor. Existing locks/CAS are not action log or trusted private system authority. Full source list/typed action IDs still needed before pack assignment. State-machine STD-domain-state1 missing shared tables is separate from system execution STD-domain-state4.

## Candidate split and non-overlap intent
1. **003b event transport/consumer protocol**: durable relay claims/CAS, entity sequence/head blocking, receipt contract/readiness, internal projection mode versus canonical action mode versus durable external delivery. Small kernel modules; domain logic never inside dispatcher. Exact schema/cutover/mapping and all existing/future registrants still require inventory before writing.
2. **003c system transition adapters**: action-first trusted internal dispatch for existing business transitions and scheduler paths; current state rechecked inside native transaction, deterministic operation keys, audit/outbox atomically. Preserve015d disabled owner consumer,032b money/grant logic,033b booking behavior and039/045b crossDB intent.
3. **006b projection/delivery/fanout repair** or separate cohesive packs if needed: catalog ingest gap, notify delivery intents and task trigger fanout. Do not force database projections into business actions or hold tenant transactions across provider/network work. Pending023e build.queue must satisfy the same protocol when implemented.

These names do not yet receive STD-events-outbox4/5/6 or STD-domain-state4. Need exact manifests, source-to-consumer matrix, measurable AC and independent review before claiming coverage.

## Design checks required next
- Event aggregate = server-derived typed topic/entity mapping, never arbitrary payload id guessed by dispatcher. Transactional sequence is order evidence only for new writes; do not reconstruct historical commit order from timestamp/UUID.
- Consumer claim token by itself cannot prove effect safety after lease expiry. Domain effect must have stable operation key and same-transaction receipt or durable external operation admission; unknown effect blocks automatic retry.
- Pure projections can write receipt with projection transaction; system business effect via Executor can reference trusted event identity in atomic result/actionlog. CrossDB consumers need recoverable receipts in authoritative DB, not nested transaction pretense.
- No network under domain/sequence lock. Audit writeOutbox placement and deterministic lock ordering; root locks/family privacy fence remain authoritative. Per-entity poison event blocks its sequence with visible reason, not silent skip; unrelated entities proceed.
- Distinguish old events safely reconcilable by current-state projection from old noncommutative business deltas requiring explicit review. Legacycutover plan cannot call them ordered/done without evidence.
- Registration readiness per deployed consumer version/topic catalog. No matching subscribers can be intentional only with explicit catalog disposition; missing module/migration retries or fails visibly.

## Mandatory future acceptance cases
Concurrent duplicate dispatch; crash before/after effect/receipt/queue publish; stale relay failure after another success; retained jobs removed then replay; same-entity older retry/newer event; missing consumer at boot; crossentity concurrency; fanout>100; busy task race; schedule advance crash; trial platform commit-before-tenant emit; catalog source commit-before-ingest enqueue; notification recipient/privacy revocation before send; unresolved remote outcome no duplicate send. Native two-connection/barrier tests plus actual API/jobs/ai composition, not only mocks.

## Continue
No owner/runtime promotion from this audit. Next author bounded exact packs, reconcile already-covered orphan rows independently, then remaining module/standard/prototype/fullgraph work. All six goal conditions remain active; checkpoint is not completion.

## Concrete foundation follow-up

TIP003b now specifies a transaction-scoped collector (all25 direct-writer caller files plus Executor/undo), so nested helper batches allocate sorted sequence only once at outer transaction end. Foundation build precedes003c/006b; activation still requires those actual adapters. Independent review found two currently emitted undeclared topics: workspace.ready at tenant-provision.processor.ts43 and tag.created at inbox/actions/settings.handlers.ts50.003b owns explicit schema/identity/disposition and exhaustive producer tests; STD-events-outbox3 downgraded to MỘT PHẦN rather than trusting old claimed schema coverage. Distinct relay/dispatch/head/receipt lease and fencing fields made explicit. No runtime verification.
