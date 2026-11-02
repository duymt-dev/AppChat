# Privacy subject source audit — 2026-11-02

Independent source review by review_insights_billing, parent checked Blueprint/COMMERCE and contracts schema. Docs only, no erasure or productiondata/services change.015c not yet written; no owner assigned solely from reserved filename.

## Authority and conflict
Blueprint650/833: contact.forget, privacy.erase Owner-only, irreversible anonymization. DC235 separates contact.memory_forget. contracts.prisma25–26/62–66 freezes issued/signed files+hashes; ContractSigner110–117 and SignatureEvent140 retain signer identifiers/signature/IP/meta, append-only audit. Silent modification/deletion of signed evidence would conflict with COMMERCE. Current docs do not establish legal retention durations or full treatment of shared messages/provider copies.

Q033 approved by owner: “Duyệt giữ chứng từ, nêu rõ ngoại lệ” → DC259. Q034 approved: “Duyệt chặn tự tái tạo” → DC260. Preserve issued/signed evidence under existing financial authority, exclude it from AI and disclose retention; workspace-keyed one-way identity guard prevents automatic recreation, fresh profile needs separate authorized confirmation and never restores old history. These two decisions are explicit, not inferred from delegation. Q035 now approved “Duyệt chặn đến khi xử lý xong” → DC262: open orders/contracts/receivables/pending refunds block irreversibleforget, no automatic settlement/cancellation. Shared third-party message content/backups/provider-copy treatment still need explicit matrix before destructive implementation; do not smuggle decisions through generic 'privacy erase' acceptance. Continue other goalwork meanwhile.

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

## Policy closure — Q036/Q037 approved

Q036 → DC264: “Duyệt xoá nội dung nội bộ”. Direct private chat content stored in AppChat, notes, AI memory and exclusively subject-owned files must be erased; minimal dedupe record identifiers retained. No remote Zalo/email deletion or change to DC259 issued/signed evidence.

Q037 → DC265: “Duyệt cách ly để rà”. Suspect mixed/shared/group/legacy-unattributed material is excluded from AI/export/download pending separate review, not wholesale deletion of others' content and not a permanent retention exemption. Outstanding items prevent reporting forget complete. All five privacy policy choices now explicitly approved; this does not constitute a complete TIP or runtime acceptance.

## Independent domain matrix to implement in015c

| Domain | Required disposition | Safety / evidence |
|---|---|---|
| CRM full merged family | Resolve canonical+member roots, check obligations, establish terminal erasure generation, scrub operational identifiers/custom/notes/activity/memory | No restore/merge inverse/stale writer can cross generation; minimal entity IDs for retained accounting only |
| Identity ingress | Workspace-keyed canonical identifier/provider/account tokens; new inbound cannot recreate CRM | Separate authorized fresh-profile confirmation and generation, no historic relinking; never log raw identities/token keys |
| Lifecycle/merge/memory receipts | Erase private undo, candidate/plan and blocked-import PII payloads; invalidate inverses | Keep minimal operation IDs/state/cleanup receipts, not a replayable payload |
| AI | Fence queued/running/resumed runs before cleanup; clear subject-bound prompts, outputs, steps, cards, approvals, summaries and019c private generations/results | Preserve non-content usage/accounting; no result/history/SSE or resume can republish old content |
| KB | Use043 message/conversation provenance to disable retrieval immediately, then purge affected exclusive sources/chunks/vectors; quarantine mixed content | Cancel ingest/publication; sanitized text is not evidence of anonymity |
| Private Inbox | DC264 erases bodies, sender labels, attachments, previews, suggestions and subject-bound email/web visitor metadata | Minimal dedupe without raw body/recipient payload; do not erase remote copies or silently create a fresh CRM profile |
| Group/shared/unknown | DC265 quarantine suspect artifacts from AI/export/download pending itemized disposition | Do not delete entire group/others' file; unresolved inventory blocks completion |
| Files/038b | Revoke access first; invalidate parsed rows/plans/previews/exports/caches; purge physical bytes only after shared/retained reference checks | Preserve issued/signed references; queued generation/download capabilities also fenced |
| Integrations/mail/bank | Scrub or quarantine subject-bound raw events/blocked imports/callback/rendered-mail payloads | Minimal trusted dedupe/accounting receipt; late callbacks cannot restore CRM or enqueue new outreach; workspace connector credentials not deleted |
| Issued/signed evidence | DC259 retains original bytes/hash/signature evidence under existing human financial authority | Exclude AI/OCR/RAG/utilities/summary/general operational exports, disclose categories; no invented legal retention duration |
| Provider/recipient/backup | Disclose out-of-local scope; restore must reapply fences/tokens before reads/workers/ingress reopen | Do not claim external deletion or regulatory compliance; test restore without touching native demo services/data |

This matrix is planning evidence, not permission to execute erasure. Non-issued financial drafts, free-text audit fields, raw routing IDs and ambiguous legacy references still require exact handling in the TIP. Existing source anchors above and kernel.prisma43–88, inbox.prisma152–173/204–211/243–247, channels-email.prisma7–21, files.service.ts60–64 and contracts.prisma25–26/62–66/102–140 identify critical read/replay boundaries.

## Latest implementation-plan owner (not implementation)

TIP015c-contact-privacy.md and297-path manifest now receive this inventory/policy scope. See privacy-planning-audit-2026-11-02.md for both independent review rounds and corrections. Key additional source findings: invoices-read126–150 fallback renders mutable Contact into historical PDFs; FilesService call sites need trusted purpose propagation; signed raw/public history paths need current disposition; run-list title can leak before cleanup. The earlier statements that015c is unwritten are historical. Runtime/provider/native verification still pending.
