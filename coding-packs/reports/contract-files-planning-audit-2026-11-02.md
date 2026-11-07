# Contract files vertical planning audit — 2026-11-02

Docs only. TIP030b now has155 exact paths and20 existing owned COVERAGE IDs; task graph and bilateral sharing updated. No implementation, native DB/service changes or runtime acceptance.

## Code findings and specified fixes
- Contract file field was filename only; FilesTab open/upload were toast placeholders. New action/file intake/real download paths and separate immutable original/unsigned/signed hashes specified.
- detect_fields maps placeholders, not filled values: contract.inspect_file owns typed extraction with manual fallback.
- Existing default template query/index/helper ignore contract subtype. Both rich/DOCX UI, local Settings types, read DTO/service and scoped default uniqueness now covered.
- Existing signer uniqueness(contractId,party) and token shape cannot represent appendix signing. Separate appendix signer/token/event tables preserve parent history; Owner-first signature, independent OTP/version/hash/expiry, immutable parent artifact.
- Public appendix mutations go Executor with sealed private context capability; permission self is not permission to bypass the capability. Ordinary API/model discovery/direct calls denied; catalog path/test explicitly included.
- AI generation is separate explicit prepare_draft utility producing immutable proposal; draft_from_content requires proposal_id. Business preview/confirm never calls model or debits Credit. Old one-step Task5 wording removed.
- Native isolation has concrete Linux/Windows launcher/README/test paths, restricted identity/network/filesystem/resource boundaries and fail-closed prerequisite. Existence of a script is not runtime proof.

## Independent review
audit_remaining_requirements found four blockers (template wiring, preparation order, native launcher deliverables, internal catalog visibility). All were patched; reviewer rechecked155 M/C paths and reported only two stale task sentences. Those Task2/Task5 sentences now match inspect_file/two-stage proposal specification. Local planning closure only, not full-goal PASS.

## Validation
-155 distinct paths; all M exist and all C absent at planning time.
-16 computed bilateral exact-table/linked-manifest intersections declared; incomplete045b still needs full recomputation.
- Existing Settings types384 lines: keep subtype change small under400 or extract with manifest amendment before build. Legacy parity1405 lines only1-2-line facade to new module.
- merge.py:1480 rows,218 owner gaps, no runtime status promotion. git diff --check passed.
- Runtime commands/native sandbox/real model/Zalo tests are required future acceptance, not run in planning phase.

## Remaining goal
045b and remaining supplemental TIPs,032b accepted-job consumer wiring, all7 coverage parts and whole dependency/independent audit remain. The45-minute work window was reached; this checkpoint does not satisfy the six goal completion conditions.
