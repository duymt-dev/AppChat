# Sales agent behavior ownership/source audit — 2026-11-02

Read-only bounded independent audit by audit_remaining_requirements; source verified against existing behavior. No runtime tests or business-policy change.

## Two044 owners were too broad

COM-2-8 requires runtime stock-before-delivery promise and honest scoped alternatives. agentSystem only tells model to look up prices/stock;023b exposes existing product/stock reads, but neither023b nor022b defines complete alternative/admission flow.022b suggested Sales tools omit stock.get.

COM-3-11 requires three customer quote intents with confidence>=70% before effect.022b covers correct customer/quote and accept/reject/defaults, but its suggested set lacks quote.request_revision and no pre-effect70% gate. reply.service.ts131 tools run before final parsed reply/confidence171; handoff.ts34 runs afterward. Thus a low final confidence can handoff after a quote was already mutated. agent.runtime.ts73–89 forwards tools to Executor without per-intent confidence evidence.019c ai.detect_intent is explicitly read-only, not the quote workflow.

Original parent IDs/text retained, owner cleared rather than falsely claiming harness supplies functionality. Added only COM-2-8-eval and COM-3-11-eval assigned full044. Parent statuses remain MỘT PHẦN. This increases visible gaps by2, not a regression in source code.

## Smallest future functional supplement

Candidate022c Sales-agent stock and quote-intent behavior (not written/owned yet). Inventory actual reply.service/reply-tools,agent.runtime;022b versioned templates/prompts;catalog reads;quote decide/preview and045b served-source fences. Bounded stock.ts/quote-intent.ts/admission.ts plus native/live tests, no new engine.

Bind intent to exact source message/revision,served customer,quote ID/version,intent/confidence; threshold70% fixed Commerce, not configurable generic reply threshold. Below70 no mutation before asking/handoff.>=70 still current grants/risk/approval and no automatic tool grant. Alternatives use real current scoped catalog/stock, not reserve inventory or guarantee unchanged availability.

Native cases:69.99/70/70.01,all3 intents,multiple quote/wrong customer/just browsing,revoke/recall/replay,zero/negative/unavailable stock,real available alternatives, mutation count0 before admission and receipt before success claim. Existing Commerce remains authoritative.

## Follow-through checkpoint

Full functional TIP022c now drafted with83 exact paths and39 bilateral intersections; its two parent IDs are assigned, not marked implemented. Earlier candidate/not-written wording records source-audit time. Planning validation and independent findings are tracked in sales-agent-behavior-planning-audit-2026-11-02.md.
