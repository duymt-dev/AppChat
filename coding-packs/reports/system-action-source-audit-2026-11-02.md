# System-action adapter source audit — 2026-11-02

Docs-only continuation after003b checkpoint. Parent inspection plus independent audit_remaining_requirements. No runtime/native changes; no ownership assignment to candidate003c/006b/030c yet.

## Boundary

003b provides transaction collector, aggregate/receipt/head protocol and private admission port, not domain authority. Next003c must turn existing business transitions into canonical private actions with verified trigger identity, current native transaction checks and durable effect receipts.006b owns projection/delivery/fanout; parent public signing is sufficiently separate to reserve030c rather than bury signing/render/OTP logic inside kernel.

`packages/actions/src/define.ts` currently has permission/risk/agentGrantable but no enforced internal exposure contract. `kernel/actions/authorizer.ts` grants self immediately; `policy.ts` allows every system risk. Neither source='system' nor agentGrantable=false is an authentication capability. Existing030b appendix/capability.ts uses a module-private WeakMap tied to the exact internally constructed ActionContext; reuse that pattern instead of serializable client/job flags or fabricated Owner.

## Source-to-adapter inventory

|Domain / source|Actual path/function|Required adapter and existing policy owner|
|---|---|---|
|Quotes|sales/quotes/services/quote-system.ts markViewed17, expireDue32, remindExpiring54|View/expiry/reminder metadata+timeline/outbox are direct transactions; private actions with event/schedule/token identity, current due/state checks and log. Preserve032b/015f and COMMERCE T-2.|
|Removed owner consumer|quote-system.ts moveOpenQuotes89; sales.jobs.module registration|015d already replaces asynchronous owner change with atomic transfer; do not implement another system owner-change action or restore obsolete consumer.|
|Invoices/packages|sales/payments/services/payment-system.ts markOverdue21, remindDue42, packagesOnConfirm81; packages.ts expireDuePackages50|Invoice reminder forges isOwner:true and commits marker/outgoing before enqueue.003c supplies source authority/action/receipt;032b owns grant/reminder rules,006b/outgoing recovery owns actual transport. Preserve package line identity fixed by032b, not legacy product-key semantics.|
|Booking|booking/services/booking-system.ts expireHolds19, remindAppointments61|Direct hold expiry and reminder mutations; forged Owner context near78. Bound appointment/hold or start generation/milestone;033b policy,032b reminder rules and014b/045b send reservation remain authoritative.|
|Support|support/services/support-system.ts sweepSla32, onCustomerMessage86, onAgentReply118|SLA warning/breach/handoff, reopen, CSAT, comments and first response are business effects. Bind source event/message and selected ticket; reread message/source+current ticket under privacy/root/row locks. Outer lookup/message body is not current authority. Preserve D52 and existing clock/calendar rules.|
|Contracts jobs|contracts/services/contract-system.ts expireLinks26, remindRenewal52, expireContracts76|Private scheduled actions; repeat predicate inside transaction including current deadline/token generation. No auto-renew policy or changed sign expiry. Reminder accepted receipt is not sent.|
|Trial/subscription|billing/events/billing.events.ts trialConsumer45; subscriptions.service.ts startTrial31, expireTrials50, activate86|039 owns period/grants/fulfil idempotence,045b owns authoritative platform intents. Current subscription commit→wallet.emit/events.emit gap loses delivery when replay sees existing subscription.003c only verified event/scheduler adapter and durable operation identity. Never reintroduce old30-day paid-period rule.|
|Billing invoice|billing/payments/fulfil.ts markPaid27, fulfil36, expire71|Bound verified provider/admin evidence and invoice operation.039 policy owner; no generic public set-paid or system bypass of proof.|
|External order/bank|sales/orders/services/order-sync.ts; sales/payments/services/bank-feed.ts|012b/015f/032b current connection/revision/identity/receipt guards. Canonical private ingress commit; transport accepted/processed_at is not complete financial evidence. Legacy DV011 describes bypass proposal, not permission to contradict current action-first standard; corrective decision must record supersession while preserving endpoint/business behavior.|
|Approval expiry|ai/approvals/resume.ts93–103|Current approval CAS/outbox and separate RunStore.finish.019b already owns atomic expiry/handoff/outbox/current-Owner notification;003c only trusted internal action integration, no second engine/scheduler.|
|Channel lifecycle|channels/jobs/login.processor.ts35–103; sessions.ts markDown149|014b verified login/session attempt and generation;045b routing consistency. Bind actual stored adapter result/current account; arbitrary job declaring success cannot become trusted. QR/heartbeat transport bookkeeping distinct.|
|KB publication|ai/kb/ingest.ts69–112|Processing attempt can remain runtime bookkeeping; ready/failed publication/chunk replacement must use current source revision/lease/privacy and trusted commit.020b/043 source policy,019b metering,006b catalog durable ingest intent; no stale/deleted source resurrection. learn=false deletion/publication path also needs explicit classification.|
|Agent assignment/handoff|ai/reply/reply.service.ts66,76,166,209,220,230|Business assignment/handoff source-bound to current conversation generation, agent version and trusted root.022b behavior/045b takeover fences; transient running/idle checkpoints are runtime state, not new public actions.|

## Not a public business action for each internal counter

-019b run.store claim/checkpoint/step/finalization and usage receipt accounting stay runtime bookkeeping with their existing durable ledger/authorization; do not introduce per-token model actions or new tariffs.
- task.runner runCount/lastRunAt/lastRunStatus projections require idempotence but are not independent public domain writes. task-scheduler's advance-before-enqueue and take100 fanout gaps belong to006b durable occurrence/fanout, preserving019b root identity/budget.
- Channel lastEventAt/heartbeat, integration attempt logs, provider result receipts and provisioning progress remain internal operational lifecycle. Business commit endpoints/handlers are the canonical-action boundary.
- Pure notification/realtime/derived catalog projection can use003b projection or durable handoff; no generic business mutation callback hidden behind projection mode.

## Parent signing must not be assumed covered by appendix pack

030b task15 explicitly canonicalizes contract.appendix_public_* only. Parent `public-sign.service.ts` still directly writes open audit, OTP/hash/failure counters, decline/sign/token/file/outgoing. `systemCtx` at end forges Owner. Existing DV009 provides POST /public/sign/:token/open (GET remains read-only); preserve that route behavior, do not infer service.open is called from GET. Parent OTP and signature scope require a dedicated030c exact pack or explicit scoped expansion, not a fake closure from appendix manifest overlap.

- `public-sign.service.ts` OTP/live checks happen before transaction; OTP incorrect increments s.otpFails from earlier snapshot, so concurrent failures need atomic counter/cap guard. Successful sign rechecks otpHash equality but token/deadline/privacy/source snapshot require current final admission too.
- `contract-approval.handlers.ts` checkOtp123–131 writes failures during prepare; execute142 consumes any non-null OTP hash rather than the exact verified hash/generation. Bind successful proof to signer/hash generation, immutable document hash, actor and attempt; new OTP between prepare/render and commit must invalidate stale proof. Do not change OTP TTL/maxfail or Owner-first signing.
- Wrong-OTP counter/audit must commit even when response is422; simply throwing inside the same action transaction would roll back those safety mutations. Design explicit private attempt result then map to public error after committed safety receipt; never label a rejected signature as signed or log raw OTP/token/signature.
- Rendering/storage stays outside locks with protected candidate result. Final canonical action validates token/signer/document/current privacy and consumes proof with receipt; stale render does not confirm a file or send signed output. Unknown outgoing delivery cannot be automatically resent because a job lease expired.
- Issued/signed document retention DC259 is preserved; public link access after privacy processing follows015c current disposition, not blanket retained-document access.

## Proposed private adapter contract — design work still required

1. Internal exposure metadata plus mandatory Executor pre-prepare check; hide from discover/semantic cache/Builder/ordinary HTTP even for Owner. Validate a module-private bound capability, not source/self/permission input. Capability binds action/workspace/trigger/current generation/canonical digest; no raw credential/token in public input or log.
2. Factory independently reads/verifies stored event, due schedule, connector result or existing approved operation. Only exact action/target/transition is admissible; no grant to call arbitrary send/money/config actions. System scheduler cannot impersonate human sign/refund approval.
3. Same-tenant action effect+action_log+trigger receipt+outbox in003b enrolled transaction. Event consumer uses head→dispatch→receipt→domain lock order; schedule uses stable domain generation/milestone receipt before domain locks. CrossDB uses045b operation identity instead of tenant receipt pretending platform atomicity.
4. Replay same trigger/digest returns existing receipt/reference; different digest conflicts. Superseded/not-due/no-longer-eligible returns explicit no_effect, not invalid “success”. A new schedule/deadline generation is a new legitimate operation, not reuse of old business effect.
5. Scanners select bounded due IDs using equality/range indexes and keyset cursors; handlers reread actual Clock/current state in transaction. No network under domain/root/sequence lock. Reminder sends create durable outgoing intent, never remote completion in action result.
6. Adapters reuse pre-existing030b/015c/012b sealed capabilities and registered actions where applicable; don't create duplicate parallel implementations. Exact action IDs, schemas, composition files and all public catalog filters must be enumerated before writing003c.

## Next evidence gates

Forged ordinary HTTP/model/Owner invocation denied before prepare; event/attempt tenant mismatch; duplicate/concurrent scheduler/event replay; same-key changed digest; deadline edit/reopen/reschedule racing job; provider/login old generation; OTP failure concurrency and new OTP during render; approval expiry/current run binding; platform commit before tenant intent; privacy revocation between read and commit; native action_log/effect/outbox cardinalities. Full adapter matrix must run in actual jobs/ai/channels/API compositions, not only fixture registration.

No TIP owner/runtime promotion from this report. Continue exact003c/006b and reserve030c parent-signing corrective scope; remaining seven-part/fullgraph goal still active.
