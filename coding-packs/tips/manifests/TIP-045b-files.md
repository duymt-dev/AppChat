# TIP-045b exact file manifest

349 distinct paths. M=modify existing; C=create absent. Domain helpers remain in separate folders. Legacy parity manifest only1-2-line facade. JSON localization length is not production logic. Tests in dedicated files. No implementation in this planning phase.

| Mode | Path | Purpose |
|---|---|---|
| M | `packages/core/package.json` | Existing runtime/domain/transport integration |
| M | `apps/api/package.json` | Existing runtime/domain/transport integration |
| M | `pnpm-lock.yaml` | Existing runtime/domain/transport integration |
| M | `apps/api/src/main.ts` | Existing runtime/domain/transport integration |
| M | `apps/api/src/app.module.ts` | Existing runtime/domain/transport integration |
| M | `apps/worker/src/main.ts` | Existing runtime/domain/transport integration |
| M | `apps/worker/src/worker.module.ts` | Existing runtime/domain/transport integration |
| M | `apps/worker/src/roles/jobs.module.ts` | Existing runtime/domain/transport integration |
| M | `packages/core/src/index.ts` | Existing runtime/domain/transport integration |
| M | `packages/core/src/kernel/kernel.module.ts` | Existing runtime/domain/transport integration |
| M | `packages/core/src/kernel/actions/actions.module.ts` | Existing runtime/domain/transport integration |
| M | `packages/core/src/kernel/actions/executor.ts` | Existing runtime/domain/transport integration |
| M | `packages/core/src/kernel/actions/handler.ts` | Existing runtime/domain/transport integration |
| M | `packages/core/src/kernel/actions/action-context.ts` | Existing runtime/domain/transport integration |
| M | `packages/core/src/kernel/actions/undo.service.ts` | Existing runtime/domain/transport integration |
| M | `packages/core/src/kernel/files/storage.ts` | Existing runtime/domain/transport integration |
| M | `packages/core/src/kernel/files/files.service.ts` | Existing runtime/domain/transport integration |
| M | `packages/core/src/kernel/rate-limit.ts` | Existing runtime/domain/transport integration |
| M | `packages/core/src/kernel/outbox/relay.ts` | Existing runtime/domain/transport integration |
| M | `packages/core/src/kernel/request-context.ts` | Existing runtime/domain/transport integration |
| M | `packages/core/src/authz/services/authz-resolver.ts` | Existing runtime/domain/transport integration |
| M | `packages/core/src/authz/authz.module.ts` | Existing runtime/domain/transport integration |
| M | `packages/core/src/authz/public.ts` | Existing runtime/domain/transport integration |
| M | `packages/core/src/identity/identity.module.ts` | Propagate job trace and register bounded metric context |
| M | `packages/core/src/identity/services/invites.service.ts` | Existing runtime/domain/transport integration |
| M | `packages/core/src/identity/jobs/identity.jobs.module.ts` | Existing runtime/domain/transport integration |
| M | `packages/core/src/billing/jobs/billing.jobs.module.ts` | Propagate job trace and register bounded metric context |
| M | `packages/core/src/ai/ai.module.ts` | Existing runtime/domain/transport integration |
| M | `packages/core/src/ai/jobs/ai.jobs.module.ts` | Existing runtime/domain/transport integration |
| M | `packages/core/src/ai/kb/ingest.ts` | Existing runtime/domain/transport integration |
| M | `packages/core/src/ai/reply/reply.service.ts` | Existing runtime/domain/transport integration |
| M | `packages/core/src/ai/reply/reply-context.ts` | Existing runtime/domain/transport integration |
| M | `packages/core/src/ai/reply/reply-tools.ts` | Existing runtime/domain/transport integration |
| M | `packages/core/src/ai/runs/runner.ts` | Existing runtime/domain/transport integration |
| M | `packages/core/src/ai/runs/run.store.ts` | Existing runtime/domain/transport integration |
| M | `packages/core/src/ai/runs/tools.ts` | Existing runtime/domain/transport integration |
| M | `packages/core/src/ai/assistant/meta-tools.ts` | Existing runtime/domain/transport integration |
| M | `packages/core/src/inbox/actions/message.handlers.ts` | Existing runtime/domain/transport integration |
| M | `packages/core/src/inbox/actions/conversation-state.handlers.ts` | Existing runtime/domain/transport integration |
| M | `packages/core/src/inbox/inbox.module.ts` | Existing runtime/domain/transport integration |
| M | `packages/core/src/channels/services/send-queue.ts` | Propagate job trace and register bounded metric context |
| M | `packages/core/src/notify/realtime/filter.ts` | Existing runtime/domain/transport integration |
| M | `packages/core/src/crm/crm.module.ts` | Existing runtime/domain/transport integration |
| M | `packages/core/src/crm/actions/custom-field.handlers.ts` | Existing runtime/domain/transport integration |
| M | `packages/core/src/crm/services/contact-view.ts` | Existing runtime/domain/transport integration |
| M | `packages/core/src/crm/services/contact360.ts` | Existing runtime/domain/transport integration |
| M | `packages/core/src/crm/services/crm-read.service.ts` | Existing runtime/domain/transport integration |
| M | `packages/core/src/crm/repos/contacts.repo.ts` | Existing runtime/domain/transport integration |
| M | `packages/core/src/catalog/services/catalog-read.service.ts` | Existing runtime/domain/transport integration |
| M | `packages/core/src/catalog/services/product-view.ts` | Existing runtime/domain/transport integration |
| M | `packages/core/src/catalog/repos/products.repo.ts` | Existing runtime/domain/transport integration |
| M | `packages/core/src/sales/quotes/services/quote-view.ts` | Existing runtime/domain/transport integration |
| M | `packages/core/src/sales/quotes/services/quotes-read.service.ts` | Existing runtime/domain/transport integration |
| M | `packages/core/src/sales/quotes/repos/quotes.repo.ts` | Existing runtime/domain/transport integration |
| M | `packages/core/src/sales/orders/services/order-view.ts` | Existing runtime/domain/transport integration |
| M | `packages/core/src/sales/orders/services/orders-read.service.ts` | Existing runtime/domain/transport integration |
| M | `packages/core/src/sales/orders/repos/orders.repo.ts` | Existing runtime/domain/transport integration |
| M | `packages/core/src/booking/services/calendar-read.service.ts` | Existing runtime/domain/transport integration |
| M | `packages/core/src/support/services/tickets-read.service.ts` | Existing runtime/domain/transport integration |
| M | `packages/shared/src/custom-fields/values.ts` | Existing runtime/domain/transport integration |
| M | `packages/shared/src/api/index.ts` | Existing runtime/domain/transport integration |
| M | `packages/shared/src/index.ts` | Existing runtime/domain/transport integration |
| M | `packages/shared/src/notify/catalog.ts` | Existing runtime/domain/transport integration |
| M | `packages/actions/src/define.ts` | Existing runtime/domain/transport integration |
| M | `packages/actions/src/index.ts` | Existing runtime/domain/transport integration |
| M | `packages/actions/src/identity.ts` | Existing runtime/domain/transport integration |
| M | `packages/db/prisma/platform/ops.prisma` | Existing runtime/domain/transport integration |
| M | `packages/db/prisma/tenant/kernel.prisma` | Existing runtime/domain/transport integration |
| M | `packages/db/prisma/tenant/inbox.prisma` | Existing runtime/domain/transport integration |
| M | `packages/db/prisma/tenant/ai-runs.prisma` | Existing runtime/domain/transport integration |
| M | `packages/db/src/tenant-resolver.ts` | Existing runtime/domain/transport integration |
| M | `apps/api/src/http/kernel/actions.controller.ts` | Existing runtime/domain/transport integration |
| M | `apps/api/src/http/kernel/kernel.http.module.ts` | Existing runtime/domain/transport integration |
| M | `apps/api/src/http/files/files.controller.ts` | Existing runtime/domain/transport integration |
| M | `apps/api/src/http/files/files.http.module.ts` | Existing runtime/domain/transport integration |
| M | `apps/api/src/http/identity/identity.http.module.ts` | Existing runtime/domain/transport integration |
| M | `apps/api/src/http/notify/realtime/ws.gateway.ts` | Existing runtime/domain/transport integration |
| M | `apps/api/src/http/channels/widget.gateway.ts` | Existing runtime/domain/transport integration |
| M | `apps/api/src/http/ai/ai.http.module.ts` | Existing runtime/domain/transport integration |
| M | `apps/web/src/features/settings/components/AuditSection.tsx` | Existing runtime/domain/transport integration |
| M | `apps/web/src/features/settings/components/MembersSection.tsx` | Existing runtime/domain/transport integration |
| M | `apps/web/src/features/settings/api.ts` | Existing runtime/domain/transport integration |
| M | `apps/web/src/features/settings/types.ts` | Existing runtime/domain/transport integration |
| M | `apps/web/src/features/settings/registry.ts` | Existing runtime/domain/transport integration |
| M | `apps/web/src/shared/actions/useAction.ts` | Existing runtime/domain/transport integration |
| M | `apps/web/src/shared/api/http-transport.ts` | Existing runtime/domain/transport integration |
| M | `apps/web/src/shared/api/mock/domains/settings.ts` | Existing runtime/domain/transport integration |
| M | `apps/web/src/shared/api/mock/domains/settings-ops.ts` | Existing runtime/domain/transport integration |
| M | `tools/parity/parity.manifest.ts` | Existing runtime/domain/transport integration |
| C | `packages/core/src/kernel/metrics/metrics.module.ts` | Bounded hardening domain module |
| C | `packages/core/src/kernel/metrics/registry.ts` | Bounded hardening domain module |
| C | `packages/core/src/kernel/metrics/collectors.ts` | Bounded hardening domain module |
| C | `packages/core/src/kernel/metrics/jobs.ts` | Bounded hardening domain module |
| C | `packages/core/src/kernel/metrics/ai.ts` | Bounded hardening domain module |
| C | `packages/core/src/kernel/metrics/server.ts` | Bounded hardening domain module |
| C | `packages/core/src/kernel/http/safe-fetch.ts` | Bounded hardening domain module |
| C | `packages/core/src/kernel/http/dns-policy.ts` | Bounded hardening domain module |
| C | `packages/core/src/kernel/files/upload-guard.ts` | Bounded hardening domain module |
| C | `packages/core/src/kernel/files/magic.ts` | Bounded hardening domain module |
| C | `packages/core/src/kernel/files/s3-storage.ts` | Bounded hardening domain module |
| C | `packages/core/src/kernel/files/storage-config.ts` | Bounded hardening domain module |
| C | `packages/core/src/kernel/jobs/with-job-context.ts` | Bounded hardening domain module |
| C | `packages/core/src/kernel/consistency/platform-operation.ts` | Bounded hardening domain module |
| C | `packages/core/src/kernel/consistency/operation-store.ts` | Bounded hardening domain module |
| C | `packages/core/src/kernel/consistency/tenant-receipt.ts` | Bounded hardening domain module |
| C | `packages/core/src/kernel/consistency/operation-recovery.ts` | Bounded hardening domain module |
| C | `packages/core/src/kernel/consistency/platform-effects.ts` | Bounded hardening domain module |
| C | `packages/core/src/kernel/consistency/handler-adapter.ts` | Bounded hardening domain module |
| C | `packages/core/src/kernel/consistency/undo-operation.ts` | Bounded hardening domain module |
| C | `packages/core/src/kernel/consistency/consistency.module.ts` | Bounded hardening domain module |
| C | `packages/core/src/kernel/audit/audit.service.ts` | Bounded hardening domain module |
| C | `packages/core/src/kernel/audit/audit-read.service.ts` | Bounded hardening domain module |
| C | `packages/core/src/kernel/audit/audit-projection.ts` | Bounded hardening domain module |
| C | `packages/core/src/kernel/audit/audit.jobs.module.ts` | Bounded hardening domain module |
| C | `packages/core/src/identity/actions/workspace-transfer.handler.ts` | Bounded hardening domain module |
| C | `packages/core/src/identity/actions/workspace-transfer-otp.handler.ts` | Bounded hardening domain module |
| C | `packages/core/src/identity/services/ownership-transfer.ts` | Bounded hardening domain module |
| C | `packages/core/src/identity/services/invite-effects.ts` | Bounded hardening domain module |
| C | `packages/core/src/authz/fields/policy.ts` | Bounded hardening domain module |
| C | `packages/core/src/authz/fields/projection.ts` | Bounded hardening domain module |
| C | `packages/core/src/authz/fields/query-guard.ts` | Bounded hardening domain module |
| C | `packages/core/src/authz/fields/action-output.ts` | Bounded hardening domain module |
| C | `packages/core/src/authz/fields/realtime.ts` | Bounded hardening domain module |
| C | `packages/core/src/authz/fields/definitions.ts` | Bounded hardening domain module |
| C | `packages/core/src/authz/fields/types.ts` | Bounded hardening domain module |
| C | `packages/core/src/authz/fields/field-policy.module.ts` | Bounded hardening domain module |
| C | `packages/core/src/billing/jobs/reconcile.ts` | Bounded hardening domain module |
| C | `packages/core/src/billing/jobs/reconcile-membership.ts` | Bounded hardening domain module |
| C | `packages/core/src/billing/jobs/reconcile-wallet.ts` | Bounded hardening domain module |
| C | `packages/core/src/billing/jobs/reconcile-quota.ts` | Bounded hardening domain module |
| C | `packages/core/src/ai/reply/turn-lease.ts` | Bounded hardening domain module |
| C | `packages/core/src/ai/reply/send-fence.ts` | Bounded hardening domain module |
| C | `packages/core/src/inbox/services/human-takeover.ts` | Bounded hardening domain module |
| C | `packages/core/src/crm/actions/contact-bulk.handler.ts` | Bounded hardening domain module |
| C | `packages/core/src/crm/jobs/custom-field-prune.ts` | Bounded hardening domain module |
| M | `packages/core/src/crm/jobs/crm.jobs.module.ts` | Bounded hardening domain module |
| C | `packages/core/src/crm/jobs/contact-export.processor.ts` | Bounded hardening domain module |
| C | `packages/core/src/crm/jobs/contact-bulk.processor.ts` | Bounded hardening domain module |
| C | `packages/core/src/crm/services/contact-export.ts` | Bounded hardening domain module |
| C | `packages/core/src/kernel/jobs/bulk-dispatch.ts` | Bounded hardening domain module |
| C | `packages/core/src/kernel/jobs/bulk-status.ts` | Bounded hardening domain module |
| C | `packages/actions/src/data-jobs.ts` | Bounded hardening domain module |
| C | `packages/shared/src/api/audit.ts` | Bounded hardening domain module |
| C | `packages/shared/src/api/data-jobs.ts` | Bounded hardening domain module |
| C | `packages/shared/src/api/ownership-transfer.ts` | Bounded hardening domain module |
| C | `packages/db/prisma/platform/action-operations.prisma` | Bounded hardening domain module |
| C | `packages/db/prisma/tenant/data-jobs.prisma` | Bounded hardening domain module |
| C | `packages/db/prisma/platform/migrations/20261102004520_action_operations/migration.sql` | Bounded hardening domain module |
| C | `packages/db/prisma/tenant/migrations/20261102004520_hardening/migration.sql` | Bounded hardening domain module |
| C | `apps/api/src/http/kernel/metrics.controller.ts` | Bounded hardening domain module |
| C | `apps/api/src/http/kernel/security.middleware.ts` | Bounded hardening domain module |
| C | `apps/api/src/http/kernel/api-rate-limit.guard.ts` | Bounded hardening domain module |
| C | `apps/api/src/http/kernel/cors-policy.ts` | Bounded hardening domain module |
| C | `apps/api/src/http/kernel/audit.controller.ts` | Bounded hardening domain module |
| C | `apps/api/src/http/kernel/data-jobs.controller.ts` | Bounded hardening domain module |
| C | `apps/web/src/features/settings/components/OwnershipTransferModal.tsx` | Bounded hardening domain module |
| C | `apps/web/src/features/settings/components/audit/AuditTable.tsx` | Bounded hardening domain module |
| C | `apps/web/src/features/settings/components/audit/AiAuditTable.tsx` | Bounded hardening domain module |
| C | `apps/web/src/features/settings/hooks/useAuditFilters.ts` | Bounded hardening domain module |
| C | `apps/web/src/shared/actions/BackgroundJobNotice.tsx` | Bounded hardening domain module |
| C | `apps/web/src/shared/actions/useBackgroundJob.ts` | Bounded hardening domain module |
| C | `tools/parity/modules/hardening.ts` | Bounded hardening domain module |
| C | `packages/channels/test/contract.test.ts` | Bounded hardening domain module |
| C | `packages/db/test/factories/index.ts` | Bounded hardening domain module |
| C | `packages/db/test/factories/identity.ts` | Bounded hardening domain module |
| C | `packages/db/test/factories/crm.ts` | Bounded hardening domain module |
| C | `packages/db/test/factories/commerce.ts` | Bounded hardening domain module |
| C | `packages/db/test/factories/inbox.ts` | Bounded hardening domain module |
| C | `packages/db/test/factories/ai.ts` | Bounded hardening domain module |
| C | `packages/db/test/factories/clock.ts` | Bounded hardening domain module |
| M | `packages/core/src/crm/actions/contact-io.handlers.ts` | Cross-entrypoint safety wiring |
| M | `packages/ai/src/gateway/types.ts` | Cross-entrypoint safety wiring |
| M | `packages/core/src/ai/assistant/catalog.ts` | Cross-entrypoint safety wiring |
| M | `packages/core/src/identity/services/sessions.service.ts` | Cross-entrypoint safety wiring |
| M | `packages/core/src/inbox/actions/email-send.handlers.ts` | Cross-entrypoint safety wiring |
| C | `packages/core/test/safe-fetch.test.ts` | Dedicated unit/fault/concurrency evidence |
| C | `packages/core/test/upload-guard.test.ts` | Dedicated unit/fault/concurrency evidence |
| C | `packages/core/test/s3-storage.test.ts` | Dedicated unit/fault/concurrency evidence |
| C | `packages/core/test/hardening-metrics.test.ts` | Dedicated unit/fault/concurrency evidence |
| C | `packages/core/test/cross-db-operation.test.ts` | Dedicated unit/fault/concurrency evidence |
| C | `packages/core/test/cross-db-undo.test.ts` | Dedicated unit/fault/concurrency evidence |
| C | `packages/core/test/cross-db-handlers.test.ts` | Dedicated unit/fault/concurrency evidence |
| C | `packages/core/test/field-policy.test.ts` | Dedicated unit/fault/concurrency evidence |
| C | `packages/core/test/field-query-leak.test.ts` | Dedicated unit/fault/concurrency evidence |
| C | `packages/core/test/field-output-leak.test.ts` | Dedicated unit/fault/concurrency evidence |
| C | `packages/core/test/owner-transfer.test.ts` | Dedicated unit/fault/concurrency evidence |
| C | `packages/core/test/reconcile.test.ts` | Dedicated unit/fault/concurrency evidence |
| C | `packages/core/test/human-takeover.test.ts` | Dedicated unit/fault/concurrency evidence |
| C | `packages/core/test/reply-lease.test.ts` | Dedicated unit/fault/concurrency evidence |
| C | `packages/core/test/bulk-jobs.test.ts` | Dedicated unit/fault/concurrency evidence |
| C | `packages/core/test/custom-field-prune.test.ts` | Dedicated unit/fault/concurrency evidence |
| C | `packages/core/test/trace-propagation.test.ts` | Dedicated unit/fault/concurrency evidence |
| C | `packages/core/test/audit-projection.test.ts` | Dedicated unit/fault/concurrency evidence |
| C | `apps/api/test/integration/hardening-security.test.ts` | Native HTTP/DB negative and replay evidence |
| C | `apps/api/test/integration/hardening-audit.test.ts` | Native HTTP/DB negative and replay evidence |
| C | `apps/api/test/integration/hardening-fields.test.ts` | Native HTTP/DB negative and replay evidence |
| C | `apps/api/test/integration/hardening-cross-db.test.ts` | Native HTTP/DB negative and replay evidence |
| C | `apps/api/test/integration/hardening-jobs.test.ts` | Native HTTP/DB negative and replay evidence |
| C | `apps/api/test/integration/hardening-owner.test.ts` | Native HTTP/DB negative and replay evidence |
| C | `apps/api/test/integration/hardening-takeover.test.ts` | Native HTTP/DB negative and replay evidence |
| C | `apps/worker/test/integration/hardening-recovery.test.ts` | Real role worker boot/restart test |
| C | `apps/worker/test/integration/reply-takeover.test.ts` | Real role worker boot/restart test |
| C | `apps/worker/test/integration/worker-metrics.test.ts` | Real role worker boot/restart test |
| C | `apps/api/test/integration/actions/workspace.transfer_ownership.action.test.ts` | Action matrix new handler |
| C | `apps/api/test/integration/actions/workspace.request_transfer_otp.action.test.ts` | Action matrix new handler |
| C | `apps/api/test/integration/actions/contact.bulk_update.action.test.ts` | Action matrix new handler |
| C | `apps/api/test/integration/actions/data_job.cancel.action.test.ts` | Action matrix new handler |
| C | `apps/api/test/integration/actions/data_job.retry.action.test.ts` | Action matrix new handler |
| M | `apps/web/messages/vi/actions.json` | Security/job/UI localized state |
| M | `apps/web/messages/vi/settings.json` | Security/job/UI localized state |
| M | `apps/web/messages/vi/inbox.json` | Security/job/UI localized state |
| M | `packages/shared/src/i18n/server/vi/notify.ts` | Server feedback localization |
| M | `packages/shared/src/i18n/server/vi/crm.ts` | Server feedback localization |
| M | `packages/shared/src/i18n/server/vi/ai.ts` | Server feedback localization |
| M | `apps/web/messages/en/actions.json` | Security/job/UI localized state |
| M | `apps/web/messages/en/settings.json` | Security/job/UI localized state |
| M | `apps/web/messages/en/inbox.json` | Security/job/UI localized state |
| M | `packages/shared/src/i18n/server/en/notify.ts` | Server feedback localization |
| M | `packages/shared/src/i18n/server/en/crm.ts` | Server feedback localization |
| M | `packages/shared/src/i18n/server/en/ai.ts` | Server feedback localization |
| C | `apps/web/e2e/hardening.spec.ts` | UI acceptance evidence |
| C | `apps/web/e2e/http/hardening.spec.ts` | UI acceptance evidence |
| C | `apps/web/src/features/settings/components/OwnershipTransferModal.test.tsx` | UI acceptance evidence |
| C | `apps/web/src/shared/actions/useBackgroundJob.test.tsx` | UI acceptance evidence |
| M | `packages/core/src/channels/channels.module.ts` | Propagate job trace and register bounded metric context |
| M | `packages/core/src/integrations/integrations.module.ts` | Propagate job trace and register bounded metric context |
| M | `packages/core/src/ai/agents/agent.handlers.ts` | Migrate platform-first operation: agent.create, agent.create_and_publish |
| M | `packages/core/src/ai/approvals/resume.queue.ts` | Propagate job trace and register bounded metric context |
| M | `packages/core/src/ai/jobs/agent-reply.processor.ts` | Propagate job trace and register bounded metric context |
| M | `packages/core/src/ai/jobs/ai-resume.processor.ts` | Propagate job trace and register bounded metric context |
| M | `packages/core/src/ai/jobs/kb-ingest.processor.ts` | Propagate job trace and register bounded metric context |
| M | `packages/core/src/ai/kb/kb.queue.ts` | Propagate job trace and register bounded metric context |
| M | `packages/core/src/ai/reply/reply.queue.ts` | Propagate job trace and register bounded metric context |
| M | `packages/core/src/ai/tasks/task.jobs.ts` | Propagate job trace and register bounded metric context |
| M | `packages/core/src/ai/tasks/task.queue.ts` | Propagate job trace and register bounded metric context |
| M | `packages/core/src/billing/actions/admin-confirm-transfer.handler.ts` | Migrate platform-first operation: admin.invoice.confirm_transfer |
| M | `packages/core/src/billing/actions/billing-cancel-invoice.handler.ts` | Migrate platform-first operation: billing.cancel_invoice |
| M | `packages/core/src/billing/actions/billing-create-invoice.handler.ts` | Migrate platform-first operation: billing.create_invoice |
| M | `packages/core/src/billing/actions/billing-report-transfer.handler.ts` | Migrate platform-first operation: billing.report_transfer |
| M | `packages/core/src/booking/jobs/booking.jobs.module.ts` | Propagate job trace and register bounded metric context |
| M | `packages/core/src/channels/actions/channel-connect.handlers.ts` | Migrate platform-first operation: channel.zalo.start_login |
| M | `packages/core/src/channels/email/email.handlers.ts` | Migrate platform-first operation: channel.email.connect |
| M | `packages/core/src/channels/jobs/channels.jobs.module.ts` | Propagate job trace and register bounded metric context |
| M | `packages/core/src/channels/jobs/login.processor.ts` | Propagate job trace and register bounded metric context |
| M | `packages/core/src/channels/jobs/send.processor.ts` | Propagate job trace and register bounded metric context |
| M | `packages/core/src/channels/webchat/webchat.handlers.ts` | Migrate platform-first operation: webchat.update_widget |
| M | `packages/core/src/contracts/jobs/contracts.jobs.module.ts` | Propagate job trace and register bounded metric context |
| M | `packages/core/src/identity/actions/business-profile-update.handler.ts` | Migrate platform-first operation: business_profile.update |
| M | `packages/core/src/identity/actions/invite-revoke.handler.ts` | Migrate platform-first operation: invite.revoke |
| M | `packages/core/src/identity/actions/member-invite.handler.ts` | Migrate platform-first operation: member.invite |
| M | `packages/core/src/identity/actions/member-remove.handler.ts` | Migrate platform-first operation: member.remove |
| M | `packages/core/src/identity/actions/member-set-role.handler.ts` | Migrate platform-first operation: member.set_role |
| M | `packages/core/src/identity/actions/onboarding-toggle-step.handler.ts` | Migrate platform-first operation: onboarding.toggle_step |
| M | `packages/core/src/identity/actions/profile-update.handler.ts` | Migrate platform-first operation: profile.update |
| M | `packages/core/src/identity/actions/working-hours-update.handler.ts` | Migrate platform-first operation: working_hours.update |
| M | `packages/core/src/identity/actions/workspace-switch.handler.ts` | Migrate platform-first operation: workspace.switch |
| M | `packages/core/src/identity/actions/workspace-update.handler.ts` | Migrate platform-first operation: workspace.update |
| M | `packages/core/src/identity/jobs/tenant-provision.processor.ts` | Propagate job trace and register bounded metric context |
| M | `packages/core/src/inbox/jobs/inbound.processor.ts` | Propagate job trace and register bounded metric context |
| M | `packages/core/src/integrations/actions/integration-register-interest.handler.ts` | Migrate platform-first operation: integration.register_interest |
| M | `packages/core/src/integrations/jobs/integration-call.processor.ts` | Propagate job trace and register bounded metric context |
| M | `packages/core/src/kernel/events/events.runner.ts` | Propagate job trace and register bounded metric context |
| M | `packages/core/src/kernel/outbox/outbox.jobs.module.ts` | Propagate job trace and register bounded metric context |
| M | `packages/core/src/notify/actions/notification-update-prefs.handler.ts` | Migrate platform-first operation: notification.update_prefs |
| M | `packages/core/src/notify/jobs/notify-mail.processor.ts` | Propagate job trace and register bounded metric context |
| M | `packages/core/src/notify/jobs/notify.jobs.module.ts` | Propagate job trace and register bounded metric context |
| M | `packages/core/src/sales/jobs/sales.jobs.module.ts` | Propagate job trace and register bounded metric context |
| M | `packages/core/src/sales/payments/actions/finance-config.handlers.ts` | Migrate platform-first operation: bank_feed.connect, bank_feed.disconnect |
| M | `packages/core/src/support/jobs/support.jobs.module.ts` | Propagate job trace and register bounded metric context |
| M | `packages/ai/src/gateway/engine.ts` | Register metrics/current visibility and notification feedback |
| M | `packages/shared/src/api/settings.ts` | Register metrics/current visibility and notification feedback |
| M | `packages/core/src/notify/notify.module.ts` | Register metrics/current visibility and notification feedback |
| M | `packages/shared/src/api/crm.ts` | Redacted field DTO contract optional/unavailable values |
| M | `packages/shared/src/api/catalog.ts` | Redacted field DTO contract optional/unavailable values |
| M | `packages/shared/src/api/quotes.ts` | Redacted field DTO contract optional/unavailable values |
| M | `packages/shared/src/api/orders.ts` | Redacted field DTO contract optional/unavailable values |
| M | `packages/shared/src/api/calendar.ts` | Redacted field DTO contract optional/unavailable values |
| M | `packages/shared/src/api/tickets.ts` | Redacted field DTO contract optional/unavailable values |
| M | `apps/web/src/features/customers/columns.tsx` | Do not render hidden fields as zero or leak stale cache |
| M | `apps/web/src/features/customers/types.ts` | Do not render hidden fields as zero or leak stale cache |
| M | `apps/web/src/features/products/columns.tsx` | Do not render hidden fields as zero or leak stale cache |
| M | `apps/web/src/features/products/types.ts` | Do not render hidden fields as zero or leak stale cache |
| M | `apps/web/src/features/quotes/columns.tsx` | Do not render hidden fields as zero or leak stale cache |
| M | `apps/web/src/features/quotes/types.ts` | Do not render hidden fields as zero or leak stale cache |
| M | `apps/web/src/features/orders/columns.tsx` | Do not render hidden fields as zero or leak stale cache |
| M | `apps/web/src/features/orders/types.ts` | Do not render hidden fields as zero or leak stale cache |
| M | `apps/web/src/features/calendar/components/ListView.tsx` | Do not render hidden fields as zero or leak stale cache |
| M | `apps/web/src/features/calendar/types.ts` | Do not render hidden fields as zero or leak stale cache |
| M | `apps/web/src/features/tickets/columns.tsx` | Do not render hidden fields as zero or leak stale cache |
| M | `apps/web/src/features/tickets/types.ts` | Do not render hidden fields as zero or leak stale cache |
| C | `packages/shared/src/api/field-visibility.ts` | Field/metrics typed boundary |
| C | `apps/web/src/shared/authz/FieldValue.tsx` | Field/metrics typed boundary |
| C | `apps/web/src/shared/authz/useFieldVisibility.ts` | Field/metrics typed boundary |
| C | `packages/core/src/kernel/metrics/types.ts` | Field/metrics typed boundary |
| M | `packages/db/prisma/platform/identity.prisma` | Auth epoch, field purge and export accepted result integration |
| M | `packages/db/prisma/tenant/crm.prisma` | Auth epoch, field purge and export accepted result integration |
| M | `packages/actions/src/crm.ts` | Auth epoch, field purge and export accepted result integration |
| C | `packages/core/src/kernel/files/zip-guard.ts` | Bounded supporting handler/schema module |
| C | `packages/core/src/kernel/jobs/platform-effects.processor.ts` | Bounded supporting handler/schema module |
| C | `packages/core/src/kernel/consistency/consistency.jobs.module.ts` | Bounded supporting handler/schema module |
| C | `packages/core/src/authz/fields/entity-bindings.ts` | Bounded supporting handler/schema module |
| M | `packages/channels/src/zalo-personal/adapter.ts` | Remove unrestricted default attachment fetch |
| M | `packages/channels/src/index.ts` | Export guarded file-fetch contract |
| C | `packages/core/src/channels/services/attachment-fetcher.ts` | Signed owned file resolves Storage; external URL uses safeFetch |
| C | `packages/core/test/channel-file-fetch.test.ts` | Native signed media works without localhost SSRF exemption |
| C | `packages/core/src/kernel/files/README.md` | Storage configuration and least privilege native/S3 acceptance |
| M | `packages/core/src/kernel/actions/authorizer.ts` | Revalidate current epoch for action authorization |
| M | `packages/core/src/contracts/services/contract-view.ts` | Apply system-field policy to contract detail |
| M | `packages/core/src/contracts/services/contracts-read.service.ts` | Project contract context and file metadata safely |
| M | `packages/core/src/sales/payments/services/invoice-view.ts` | System monetary field projection |
| M | `packages/core/src/sales/payments/services/invoices-read.service.ts` | Current permission projection for invoice reads |
| M | `packages/shared/src/api/contracts.ts` | Unavailable system fields in contract DTO |
| M | `packages/shared/src/api/invoices.ts` | Unavailable system fields in invoice DTO |
| M | `apps/web/src/features/contracts/components/DetailTabs.tsx` | Hidden fields never appear as zero/detail value |
| M | `apps/web/src/features/orders/components/DetailTabs.tsx` | Hide unauthorized detail monetary values |
| M | `apps/web/src/features/products/components/TypeSections.tsx` | Cost hidden/unavailable UI contract |
| C | `fixtures/ai-eval/hardening.json` | Five real-model safety cases after live runner prerequisite |
| C | `packages/core/src/kernel/consistency/README.md` | Per-action classification and phase recovery checklist |

## Review closure: current authority and pending execution

| Mode | Path | Purpose |
|---|---|---|
| M | `apps/web/src/features/contracts/components/SignForm.tsx` | Optional/redacted DTO consumer; no fabricated zero or writable hidden field |
| M | `apps/web/src/features/contracts/hooks/useContractForm.ts` | Optional/redacted DTO consumer; no fabricated zero or writable hidden field |
| M | `apps/web/src/features/invoices/components/DetailTabs.tsx` | Optional/redacted DTO consumer; no fabricated zero or writable hidden field |
| M | `apps/web/src/features/invoices/components/InvoiceDrawer.tsx` | Optional/redacted DTO consumer; no fabricated zero or writable hidden field |
| M | `apps/web/src/features/invoices/components/InvoiceFormModal.tsx` | Optional/redacted DTO consumer; no fabricated zero or writable hidden field |
| M | `apps/web/src/features/invoices/components/PaySection.tsx` | Optional/redacted DTO consumer; no fabricated zero or writable hidden field |
| M | `apps/web/src/features/invoices/components/PaymentModals.tsx` | Optional/redacted DTO consumer; no fabricated zero or writable hidden field |
| M | `apps/web/src/features/invoices/components/ReconcileDrawer.tsx` | Optional/redacted DTO consumer; no fabricated zero or writable hidden field |
| M | `apps/web/src/features/invoices/components/RefundModals.tsx` | Optional/redacted DTO consumer; no fabricated zero or writable hidden field |
| M | `apps/web/src/features/invoices/hooks/useInvoiceForm.ts` | Optional/redacted DTO consumer; no fabricated zero or writable hidden field |
| M | `apps/web/src/features/orders/components/OrderDrawer.tsx` | Optional/redacted DTO consumer; no fabricated zero or writable hidden field |
| M | `apps/web/src/features/orders/components/OrderFormModal.tsx` | Optional/redacted DTO consumer; no fabricated zero or writable hidden field |
| M | `apps/web/src/features/orders/hooks/useOrderForm.ts` | Optional/redacted DTO consumer; no fabricated zero or writable hidden field |
| M | `apps/web/src/features/products/components/DetailTabs.tsx` | Optional/redacted DTO consumer; no fabricated zero or writable hidden field |
| M | `apps/web/src/features/products/components/ProductDrawer.tsx` | Optional/redacted DTO consumer; no fabricated zero or writable hidden field |
| M | `apps/web/src/features/products/components/StockAdjustModal.tsx` | Optional/redacted DTO consumer; no fabricated zero or writable hidden field |
| M | `apps/web/src/features/products/hooks/useProductForm.ts` | Optional/redacted DTO consumer; no fabricated zero or writable hidden field |
| M | `apps/web/src/features/quotes/components/LineEditor.tsx` | Optional/redacted DTO consumer; no fabricated zero or writable hidden field |
| M | `apps/web/src/features/quotes/components/QuoteDrawer.tsx` | Optional/redacted DTO consumer; no fabricated zero or writable hidden field |
| M | `apps/web/src/features/quotes/components/QuoteFormModal.tsx` | Optional/redacted DTO consumer; no fabricated zero or writable hidden field |
| M | `apps/web/src/features/quotes/components/QuoteLines.tsx` | Optional/redacted DTO consumer; no fabricated zero or writable hidden field |
| M | `apps/web/src/features/quotes/hooks/useQuoteDraft.ts` | Optional/redacted DTO consumer; no fabricated zero or writable hidden field |
| C | `packages/core/src/ai/approvals/operation-continuation.ts` | Durable pending receipt and exactly-once run continuation |
| M | `packages/core/src/ai/approvals/resume.ts` | Pending operation continuation, no fake APPROVAL_LOOP |
| M | `packages/core/src/ai/assistant/genui/event-store.ts` | Future M created by prerequisite023c; current policy on persisted output |
| M | `packages/core/src/ai/assistant/genui/history.ts` | Future M created by prerequisite023c; current policy on persisted output |
| M | `packages/core/src/ai/assistant/genui/refs.ts` | Future M created by prerequisite023c; current policy on persisted output |
| M | `packages/core/src/ai/assistant/genui/stream.ts` | Future M created by prerequisite023c; current policy on persisted output |
| C | `packages/core/src/authz/fields/history-provenance.ts` | Current policy validation for persisted model output |
| C | `packages/core/test/approval-operation-pending.test.ts` | Cross DB recovery resumes approved run once |
| C | `packages/core/test/field-history-revoke.test.ts` | History replay and stream revocation canaries |
