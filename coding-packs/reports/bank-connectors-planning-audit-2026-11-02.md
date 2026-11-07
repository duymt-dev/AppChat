# Bank connectors planning audit — 2026-11-02

## Scope

Docs-only câu A, vertical bank→Commerce→CRM→AI. TIP012b now plans real tenant SePay/Casso plus shared connector probe/sync/detail/recovery. Tenant Brevo/SMTP and delivery callbacks are explicitly split to future012c; platform billing and email channel remain distinct. No source, runtime, provider call or native service/data changes.

## Code evidence and owner correction

- Registry tenant bank entries use MockBankFeedProvider; Casso has manifest only. Platform SePay uses a separately constructed real adapter. Missing tenant code is not just missing keys.
- SePay amount Number/truncation and unknown-direction→in; tenant hook accepts missing account. Generic integration callback has no bank consumer, while financial hook writes synchronously.
- Dedupe by feedId does not survive disconnected/recreated connection/feed; shared call worker lacks concurrent claim/unknown recovery and persists raw error.
- AI event scheduler busy-check/new run/queue is not source-event idempotency; dispatch crash can produce another task. This newly identified seam has separate event-dispatch module/schema/receipt/recovery and current-authority tests, not bank-domain logic.
- Exact source paths/lines in TIP CONTEXT and COVERAGE. STD-integrations-ports-5 downgraded ĐẠT→MỘT PHẦN. ACT-integration.test assigned023c because its pack now actually defines the action/handler/tests;012b integrates real bank probe, not duplicate action ownership.

## Independent review

Reviewer `/root/review_insights_billing` audited source then written pack. Corrected:
1. Tenant payments controller omitted despite256KiB canonical body/ACK contract → exact manifest includes controller.
2. Canonical manual action name corrected to invoice.resolve_bank_match (payment.record), not nonexistent bank_tx.match.
3. Settings connection alone could stay unbound → explicit BankFeedBinding finance-only activation/switch and existing-connection reference, projected finance DTO and invoice mocks.
4. Explicit read probe vs confirmed connect probe conflated → separate contracts; existing handler.prepare is outside transaction, waits on bounded read-only queue result; execute is short/projected. Read-probe receipts ephemeral Redis, no DB writes from prepare/health mutation; purpose-bound vault handle only, no raw secret queue/history. Confirmed connect uses045b durable operation lifecycle.
5. AI task source-event replay assumed safe but not implemented → unique(task,event), atomic queued-run/skip marker, fixed-run recovery, current source authority, real worker tests.

Independent recheck of125-path version found no remaining local blocker in these seams, with minor request to state ephemeral read-probe receipts explicitly. Applied that clarification and added126th path (future kernel secret-vault) for purpose-bound worker access without AiModule dependency cycle. Not whole-goal PASS and not provider/runtime acceptance.

## Validation executed

- `python -X utf8 C:/Users/PC/AppData/Local/Temp/validate-012b.py`: PASS sections10;126 unique paths;5 future M with predecessor proof;22 bilateral exact shared-path pairs;15 owned IDs.
- `python -X utf8 tools/obligations/merge.py`:1490 rows;551 ĐẠT/41 CHỜ-TK/349 MỘT PHẦN/331 CHƯA/118 GIẢ/34 NGOÀI/66 QUY-TẮC. **155 unowned gaps**: A16/B9/C17/D12/E35/F39/G27. No runtime state promoted.
- `git diff --check`: PASS. Tests listed in TIP are future implementation gates, not run in documentation phase. Missing authoritative Casso protocol contract is explicit mandatory adapter spike before live activation; no invented authentication/payload claimed.

## Continue

012c tenant mail,026b CRM and remaining supplemental packs,044–046, all seven-part notes, dependency/manifest full audit and independent goal-wide review. REQ-M03b remains broad/unowned until tenant mail/storage portions are properly owned; do not mark it covered merely by bank adapter pack. Commit/checkpoint is not a stopping condition.
