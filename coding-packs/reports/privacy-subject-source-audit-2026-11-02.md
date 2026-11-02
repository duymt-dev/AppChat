# Privacy subject source audit — 2026-11-02

Independent source review by review_insights_billing, parent checked Blueprint/COMMERCE and contracts schema. Docs only, no erasure or productiondata/services change.015c not yet written; no owner assigned solely from reserved filename.

## Authority and conflict
Blueprint650/833: contact.forget, privacy.erase Owner-only, irreversible anonymization. DC235 separates contact.memory_forget. contracts.prisma25–26/62–66 freezes issued/signed files+hashes; ContractSigner110–117 and SignatureEvent140 retain signer identifiers/signature/IP/meta, append-only audit. Silent modification/deletion of signed evidence would conflict with COMMERCE. Current docs do not establish legal retention durations or full treatment of shared messages/provider copies.

Q033 approved by owner: “Duyệt giữ chứng từ, nêu rõ ngoại lệ” → DC259. Q034 approved: “Duyệt chặn tự tái tạo” → DC260. Preserve issued/signed evidence under existing financial authority, exclude it from AI and disclose retention; workspace-keyed one-way identity guard prevents automatic recreation, fresh profile needs separate authorized confirmation and never restores old history. These two decisions are explicit, not inferred from delegation. Outstanding obligations/shared third-party message content/backups/provider-copy treatment also need explicit matrix before destructive implementation; do not smuggle decisions through generic 'privacy erase' acceptance. Continue other goalwork meanwhile.

## Existing subject inventory
- crm.prisma Contact87–121 fields/custom; Identity133 providerID/display; Memory203; Timeline216/payload225; Note232/body235.
- inbox.prisma Conversation105/suggestion124/lastSenderName129; Message152/sender/body/attachments159–163; Participant204/external/display206–207; OutboxMessage243/payload247.
- channels-webchat.prisma visitor31–36; channels-email.prisma EmailThread7+ address/thread metadata.
- ai-runs.prisma Run49 input/state/output55–69; Step83 input/output90–91; ai-assistant Message33/content37; approval inputs ai-agents.
- ai-kb.prisma Source47/body60/file56; Chunk83/content87/meta92/embedding.
- kernel.prisma ActionLog43/input/before/after/result52–55; Outbox69/payload72; Idempotency84/response88; File97/storageKey/name/hash99–103; Notification121/title/body125–126.
- integrations.prisma IntegrationEvent86/payload91, IntegrationMapping52/externalId57 can replay/reidentify.
- Commerce snapshots/signers/audit/issued files and source-contact ledger references must be classified individually, not blanket delete.

## Planned inventory that015c must own explicitly
015b memory/summary/privateundo;015e merge candidate/plan/receipt/items;015f lifecycle/privateblocked external payload;038b upload/parsedrows/proposals/previews/exports/artifactauthority;012c/037 renderedmail/audience/delivery/unresolvedcallback/suppression;043 pending/approved conversation-derived KB/chunks/provenance. Sanitized text is not proof of anonymity.

## Technical proposal (not missing policy approval)
Resolve full merged family and terminal erasure generation under015f roots; immediately fence AI/sends/imports/restores/old inverses. Durable resumable domain cleanup receipts, fail-closed projections during pending/failure; report pending/completed-with-explicit-exclusions/failed honestly. Remove subject-linked mutable structuredPII/derivedartifacts/undo snapshots only per approved matrix, preserve nonidentifying record IDs/financial amounts/status/idempotency. Revoke fileaccess before physicalpurge and honor shared refs. Provenance registry required; regex/LLM search cannot prove exhaustive erasure. Backup restore must reapply approved tombstones before reopening access; no claim remoteprovider/recipient copies were erased.

## Continue
Privacy decision gates do not block033b/023d/kernel event integrity and other verticalpacks. Independent sevenpart/wholegraph finalreview remains. No runtimePASS or goalcompletion.
