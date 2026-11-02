# CRM owner availability and manual-stage source audit — 2026-11-02

Docs-only direct source checks and bounded independent review by audit_remaining_requirements. No runtime acceptance.

## Stage hold — now planned015g, no policy change

COMMERCE8 requires manual stage wins24h. stage-rules.ts24–31 reads hold then CAS only id/stage. Valid stale-write race: manual moves away and back (ABA), returning stage text while creating newer hold/version. Important correction to first review suggestion: contact-write.handlers.ts97 EARLY RETURNS for identical stage, so same-stage request alone does not refresh timestamp. Preserve that existing no-op.

Manual undo108–110 unconditionally restores previous stage/timestamp.025b already owns native contact.version trigger across every update; reuse it.015e/f own canonical-family association/contact-first locks but lack precise24h/ABA/undo acceptance. Existing029 quote_contact_idx uses(contact_id,created_at),035 index uses sent_at; neither supplies exact contact/status lookup.015g defines supporting live partial(contact_id,status,id) index and native producer tests, not a second CRM version counter.

Actual producers: quote-send90, quote-decide26/closeLost, contract-send76, public-sign222→future030c signing/finalize, order-flow43, quote-system expiry→future003c sales/system/handlers. Hold skips stage effect, not valid document transition. No scheduled backfill when24h expires.

## Owner availability — still unowned, cannot blanket assign

REQ-F01b-6 / COM-8b-5 / DC-081 remain real gaps. inbox/services/pipeline.ts108 assigns contact.ownerUserId without human availability; existing conversation branch85–96 does not define availability fallback. ai-agents.prisma56 workingHours belongs to agents, not human member shifts.

042b covers initial lead allocation only and explicitly preserves old owners;022b agent/account eligibility is not human availability;015d intentional approved owner transfer is not inbound routing.032b does not define human shifts either.

Next cohesive pack must specify minimal human schedule/absence source and existing permission boundaries, no inference from WebSocket offline. Separate contact ownership from conversation assignment. Explicit new/reopened/already-human-owned conversation boundary, no automatic stealing of in-progress human work. Reuse existing channel fallback and022b agent eligibility; absent eligible agent means shared queue, not automatic paid model/send.

Candidate seams: inbound pipeline, identity current membership/public facade, channel account config DTO, future022b ai/reply/availability,045b dispatch/takeover fences and042b eligible candidate selection; bounded schema/actions/settings modules with current self/manager rights must be established from authority, not silently borrow sla.manage.

Required native/AI cases: in/out shift, explicit absence precedence, overnight/DST, removed member, fallback/no eligible agent, duplicate inbound, concurrent human takeover, reconnect not availability, no fake model/send. No owner assignment until full pack/manifest/AC is written.
