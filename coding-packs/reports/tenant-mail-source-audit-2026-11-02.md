# Tenant mail source audit for upcoming012c — 2026-11-02

Independent reviewer review_insights_billing, source/docs only; no edits by reviewer, provider calls or runtime tests. This report does not create a TIP or assign coverage.012c remains to write.

## Three paths must remain separate

1. Platform OTP/invites/notices: identity.module.ts:52–56, notify/jobs/notify-mail.processor.ts:20–27 use platform credentials/provider. Do not replace with tenant config.
2. Inbox/commerce email: inbox/actions/email-send.handlers.ts:34–36 and sales/quotes/services/quote-send.ts:23–65 use Email channel account/thread/reply route. Tenant connector campaigns do not silently replace contact.send_email/quote/invoice delivery.
3. Tenant mail connector: integrations registry:13–14 and core integrations resolver:25 have Brevo/SMTP manifests but no runtime adapters. This is missing implementation, not only missing account.

MailProvider ports/mail.ts:1–16 only accepts to/subject/html/text/tag and constructor credentials, not ConnectionCtx/attachments/idempotency or ConnectorAdapter. Use dedicated tenant adapter/factory/dispatch contract; preserve platform semantics.

## Required contracts for012c

- Explicit sender/reply-to, verification capability and credential revision. SMTP manifest needs port/TLS/sender; socket DNS/private-IP/SSRF controls and mandatory TLS, not HTTP safeFetch alone. Current smtp/mail.ts:30–35 permits opportunistic STARTTLS with secure=false; no silent tenant authentication downgrade.
- Brevo mail.ts:28–29 currently accepts empty provider messageId. Provider acceptance is not delivery. State queued/reserved/accepted/delivered/bounced/complained/unknown; unknown after SMTP DATA/Brevo acceptance cannot blindly retry or fall back to another provider.012b durable call receipts/classification reused.
- Actual Brevo callback protocol/authentication/sender verification requires authoritative captured fixtures; repo does not establish it. Do not invent provider wire contract. Callback key must distinguish multiple event types for one message; messageId alone insufficient. Bind authenticated callback to tenant/account/connection receipt, not arbitrary webhook contact IDs.
- Duplicate/out-of-order/batch/unknown-message callbacks and disconnect/rotation must have explicit handling. Current webhook.service.ts:29–33 rejects disconnected routes: either bounded historical verification is designed, or late evidence remains explicitly unresolved; do not promise impossible recovery.
-037 sender discriminator channel_account vs integration_connection required. Both paths keep approved sender/audience snapshot, current authority, suppression, cooldown, cancellation and dispatch reservation. No generic integration.send bypass; integrations.manage config/probe is not campaign approval/send or CRM permission. Internal dispatch requires verified domain receipt.
- campaign.send_test remains campaign.manage/current-user recipient under037; connection probe does not send mail. Unknown external delivery is not exactly-once merely because BullMQ jobId is fixed.
- Callback metrics/CRM timeline via domain handlers, no fake Inbox conversation/mailbox. Complaint/bounce uses037 policy, not global contact identity deletion or blanket transactional-email suppression. SMTP unsupported delivery/open/click evidence stays unavailable. Replies need separately configured inbound channel.

## Candidate coverage, still unassigned

DEF-012-4; tenant-mail portion of REQ-M03b; PRO-settings-emailmkt (prototype7033 onboarding, registry lacks section); new delivery/callback/suppression/recovery child rows.

BP-8-b platform Brevo bounce/complaint is separate and not closed by tenant callbacks. DEF-018-1 live IMAP/SMTP channel and DEF-029-1 commerce sends remain separate. Q004 provider/domain resources cannot conceal missing adapter code. Continue012c exact manifest/AC/independent review after vertical CRM work.
