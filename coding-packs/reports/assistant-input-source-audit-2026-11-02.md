# Assistant input source audit — 2026-11-02

Docs-only, parent inspection plus independent review_insights_billing. Candidate023f, not yet written/assigned. Ledger1539/120 unowned. This fills an important gap in AI-first file use, not another CSV import implementation.

## Existing evidence
- ComposerPopovers38–43 closes file/screenshot controls without action; Composer76 microphone has no handler. Store/hook/api have no actual attachment draft/send pipeline.
- assistant.controller21 and turn119–141 carry names/IDs; prompt35 lists filenames in system context, but no file bytes. sessions14/68–80 flattens history to text. Model can hallucinate knowledge of an unread named file.
-023c explicitly owns safe filehandle/metadata guards, not actual understanding.025b screen capture explicitly only Inbox. Neither receives full REQ-E12a/b or Assistant screenshot/mic.
- Existing multipart upload through shared transport and files.controller33–44; kernel FilesService supports25MB.015c planned purpose/source/reference current guard supersedes uploader-only access. Do not fetch model input via public signed URL.
- core/ai/kb/parse.ts supports PDF text/DOCX/CSV/XLSX/TXT/MD/HTML; reuse bounded pure parsing without KB source creation. Scanned/password-protected PDF and unsupported types must be explicit, not fake empty success.
- channels/email/imap-transport62–80 private mailparser parser loses attachment bytes; uploaded.eml needs own bounded exported MIME parse seam using existing dependency. No mailbox connection, .msg support claim, remote HTML/images/links or nested attachment auto execution.
- ProviderCapabilities.vision exists but engine105/ModelSource only request tools. Need image-capable candidate filter on every initial/fallback/resume call, real inline guarded bytes at SDK boundary, no silent image omission/text-only fallback success.

## Bounded technical proposal
**Files/images/email:** browser picker/drop/paste → existing authenticated staging upload → source-bound canonical attachment preparation → local/server-safe metadata preview → explicit normal Send into023c immutable request ledger. Prepared artifact binds file digest/parser revision/session/uploader/current source capability; parsing errors keep draft, no unsupported claim. Remove draft reference is not deleting retained source/history. Model-ready material only current-authorized at actual dispatch and every resume/history reconstruction;015c cleanup/inventory includes parsed text/images/private replay payload. Malicious filenames/document text never become system instructions.

**Images/screenshot:** one user-selected display capture, stop every track immediately after capture or error/unmount/workspace change, preview/remove before ordinary upload/Send. No continuous screen recording. Unsupported/denied → image upload. PNG/JPEG allowlist/bounded dimensions and bytes, no arbitrary SVG/URL fetch; source-reference guards apply to provider bytes. Screenshot reuse025b shared/media/screen-capture.ts, do not duplicate browser capture engine.

**Voice:** requirements matrix114/Blueprint1243/prototype1504 require voice command input, not server STT or audio recording. Use capability-gated browser speech recognition with upfront disclosure that browser may use an external speech service; explicit start/stop, editable transcript, no automatic Send/action. Unsupported/denied/error → typing. No AppChat audio storage/new STT tariff/provider, no offline/all-browser claim. Stop on reset/session/workspace navigation; preserve concurrent typed edits and reject stale transcript callbacks. Real supported-browser operator test separate from mocked recognition.

**Actual AI-first transfer:** asking to summarize a file is not importing it;038b remains parse/mapping/preview/canonical business import/export with actual CSV/XLSX and manual fallback. Attachment content can supply source handle to038b only through fresh current-authorized user request/confirmation, never data in file triggering writes. Quotes/contracts continue own finance/issued-evidence protections.

## Manifest and acceptance seams still to write
Composer/popovers/store/hook/api/preview/capture/dictation modules; controller/shared DTO; attachment preparation actions/handlers/artifact schema/bounded parser and MIME seam; sessions/history/run input/private replay; SDK hydration port and vision candidate needs;019b selected-child/source/current-root guards;015c source/read/write/inventory/cleanup; actual API/ai/jobs composition; standalone tests/E2E/parity/live fixtures. No new source files implemented in this phase.

AC must prove real file contents (unique canary not filename) reached permitted provider context and answer citation; image-only question; .eml body without remote fetch; failed upload/send draft retention; text-only route refusal; current source revocation between parse and dispatch/resume; privacy erase private cached payload; screenshot tracks stop; dictation transcript edit before Send; Chat attachment cannot write; actual CSV mapping/import/export plus manual LLMoff path. Need exact version/hash/limits/input errors and real model evidence gates, not handle denial tests alone.

## Continue
Author023f exact manifest and contracts next, independently review before ownership. Event003b/003c/006b source audit remains queued; no candidate name counts as received obligation. No runtime/native/provider tests or goal completion claimed.
