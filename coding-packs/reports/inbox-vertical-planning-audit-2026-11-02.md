# Inbox vertical planning audit — 2026-11-02

Docs-only continuation of câu A. TIP025b is a pending plan, not implementation/DONE.

## Source audit and ownership

- Independent pre-draft audit identified: scheduling needs service/date and distinction proposal vs persisted booking; translator saved-message vi/en is not bidirectional composer; bulk all-or-nothing and unsafe snapshot undo; search LIMIT200 and no old-hit positioning; counts need scoped invalidation; provider membership is not local observed50; context must survive real writers; CSV timeline is not six-domain contact export; contact notes/deals/tasks need own domain.
- Draft maps25 existing owner gaps plus2 explicit child obligations INBOX-BULK-RESULTS/INBOX-FILTER-COUNTS. Does not claim ticket bulk, run events or CRM deal/task/contact-note gaps completed.
- Written TIP independent review found2 HIGH and1 MEDIUM: missing actual contact CAS writer; UI command listeners only mounted in domain screens; transfer modal still requires full ContactRow. All three fixed and independently rechecked; reviewer found no further blocker in this bounded recheck. Local review is not whole-goal review.

## Concrete design

- Group policy action+revision; separate local pin and provider mute/manage;014b durable commands/status with current policy, partial members and unknown result.
- Bounded search-page/around-message, total snapshot semantics, Unicode ranges, current scope and clear-history on every surface.
- Bulk per-ID transaction via trusted internal action/current Executor, parent receipt/retry/undo; preserve combined input contract.
- Canonical commerce fields/writers retain conversation/contact/source-message; global contact edit host avoids unmounted Customers screen and feature-cycle import. Masked fields never written empty.
- Export-only contact_timeline adapter extends038b AI/manual pipeline, real scoped CSV and current authorized download.6001rows proves no first-page truncation.
- Real slots require input/current slot; booking vs confirmation send separate. Bidirectional translation preserves original/current draft, no tools/auto-send; screenshot explicit capture/preview/accept.
- Inbox approvals are scoped by trusted run/entity relation, pending execution honest; counts events carry invalidation only.

## Planning checks

- Final237 unique M/C paths,13 future M from predecessor manifests;20 complete bilateral file intersections declared. No completed TIP001–035 modified. Additional global form, version-CAS and worker-composition evidence files are explicit.
- Ten Given/When/Then acceptance groups, native/mock/http/UI/real-model commands. Contact native BEFORE UPDATE version trigger covers legacy writers; global prefills register once at app host, minimal transfer DTO avoids fabricated masked fields.
- DC250 resolves Q019 design under owner delegation, not runtime completion. Ledger regenerated1484 rows,171 unowned gaps;25 prior gaps assigned and2 bounded children added. No runtime state promoted.
- Runtime tests, provider calls and source implementation **not run** in this documentation task. Native DB/processes untouched.

## Remaining whole-goal work

Continue019b/012b/026b and other missing supplemental ownership,044–046, seven-part remaining notes, whole DAG/overlap and independent COVERAGE↔code↔TIP audit. A clean docs commit is a checkpoint only.
