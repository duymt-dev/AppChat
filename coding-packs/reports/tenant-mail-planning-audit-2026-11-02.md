# Tenant mail planning audit — 2026-11-02

TIP012c docs only:123 exact paths/28 futureM/27 bilateral intersections/7 owned IDs, DC258. No email/provider/network acceptance or production/native data change.

## Scope and source
Source report tenant-mail-source-audit-2026-11-02.md: tenantregistry adapterless, resolver latest-connected unsafe for approvedsender, platform MailProvider not tenant contract, opportunistic SMTP TLS, empty Brevo message ref, disconnected callback rejection.037 channel-only contract explicitly extended to discriminated channel_account vs tenant_mail branch; never fabricate Inbox account or replace platform OTP/invite.

Plan freezes exact connection/sender/revisions, uses012b queue/operation receipts and037 current campaign approval/suppression,023c vault/non-sending probe,045b security/fence. Accepted is not delivered; uncertain dispatch unknown/no blindretry/fallback. Latecallback verifier separate/bounded, no outboundpassword/APIkey retention. Mandatory authoritative providercontract spike; unsupported evidence remains unavailable. AI-first secure configuration/proposals and actualCSV/XLSX recipient/file readback, manual noLLM.

## Independent findings corrected and rechecked
1. Actual /campaigns/mail-senders route missing: added037 marketing controller/httpmodule/static route/permission tests.
2. Test-send incorrectly generic campaign recipient: added verified-user/testinvocation subject discriminator and evidence-only results, no prodmetrics/cooldown/customer suppression.
3. Callback may beat send-response commit: durable unresolved facts reconciled at acceptance/recovery with exactconnection/account/message/recipient binding; no guessing from latestrecipient/time.
4. Retained verifier must be captured before credential replacement/clear: added actual connect/connections/disconnect transaction hook, mail/bindings, operation recovery and nooutboundsecret rule.
5.30day purge was only prose: added mail/purge actual jobregistration, lease/expiry tests, reuse retained existing platformroute status, no unnecessary schema.
6. integrations cannot import core safeFetch: explicit injected transportport from core composition/adapterselection, no reverseimport or unrestrictedfallback.
7. Added actual marketing attribution/AIanalysis/Drawer/settings-appsmock consumers and minimal campaign-only senderprojection.
Both independent reviewers rechecked and found no remaining concrete blocker within localscope. Not fullgoal PASS or runtime/provider evidence.

## Actual docs validation
Localchecker: sections10,paths123,futureM28,bilateral27,owners7 PASS. merge.py:1520 rows/143 unowned gaps;546 ĐẠT/41 CHỜ-TK/373 MỘT PHẦN/342 CHƯA/118 GIẢ/34 NGOÀI/66 QUY-TẮC. git diff --check PASS. Planned tests/AI/providerfiles were not executed.

## Continue
015c privacy source inventory next; reconcile staleownership only against actualtask+AC. Missingverticalpacks and044–046/sevenpart/wholegraph review remain. Commit/checkpoint not stoppingcondition.
