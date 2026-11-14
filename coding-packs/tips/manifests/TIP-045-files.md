# TIP-045 — exact file manifest

M modify, C create. Future M requires predecessor integration. No directory wildcard; tests separate.

| Mode | Exact file | Responsibility |
|---|---|---|
| M | `package.json` | Deployment readiness/drain/storage boundary or exact release config; reuse integrated predecessor modules, no competing domain behavior |
| M | `.github/workflows/ci.yml` | Deployment readiness/drain/storage boundary or exact release config; reuse integrated predecessor modules, no competing domain behavior |
| M | `apps/api/src/main.ts` | Deployment readiness/drain/storage boundary or exact release config; reuse integrated predecessor modules, no competing domain behavior |
| M | `apps/api/src/bootstrap.ts` | Deployment readiness/drain/storage boundary or exact release config; reuse integrated predecessor modules, no competing domain behavior |
| M | `apps/api/src/http/health/health.module.ts` | Deployment readiness/drain/storage boundary or exact release config; reuse integrated predecessor modules, no competing domain behavior |
| M | `apps/worker/src/main.ts` | Deployment readiness/drain/storage boundary or exact release config; reuse integrated predecessor modules, no competing domain behavior |
| M | `apps/worker/src/start-events.ts` | Deployment readiness/drain/storage boundary or exact release config; reuse integrated predecessor modules, no competing domain behavior |
| M | `apps/worker/src/event-protocol.manifest.ts` | Deployment readiness/drain/storage boundary or exact release config; reuse integrated predecessor modules, no competing domain behavior |
| M | `packages/core/src/index.ts` | Deployment readiness/drain/storage boundary or exact release config; reuse integrated predecessor modules, no competing domain behavior |
| M | `packages/core/src/kernel/kernel.module.ts` | Deployment readiness/drain/storage boundary or exact release config; reuse integrated predecessor modules, no competing domain behavior |
| M | `packages/core/src/kernel/jobs/with-job-context.ts` | Deployment readiness/drain/storage boundary or exact release config; reuse integrated predecessor modules, no competing domain behavior |
| M | `packages/core/src/kernel/files/storage.ts` | Deployment readiness/drain/storage boundary or exact release config; reuse integrated predecessor modules, no competing domain behavior |
| M | `packages/core/src/channels/jobs/channels.jobs.module.ts` | Deployment readiness/drain/storage boundary or exact release config; reuse integrated predecessor modules, no competing domain behavior |
| M | `packages/core/src/channels/jobs/sessions.ts` | Deployment readiness/drain/storage boundary or exact release config; reuse integrated predecessor modules, no competing domain behavior |
| M | `packages/core/src/channels/jobs/poller.ts` | Deployment readiness/drain/storage boundary or exact release config; reuse integrated predecessor modules, no competing domain behavior |
| M | `packages/core/src/kernel/events/events.runner.ts` | Deployment readiness/drain/storage boundary or exact release config; reuse integrated predecessor modules, no competing domain behavior |
| M | `packages/core/src/kernel/outbox/outbox.jobs.module.ts` | Deployment readiness/drain/storage boundary or exact release config; reuse integrated predecessor modules, no competing domain behavior |
| M | `packages/core/src/kernel/privacy/restore-gate.ts` | Deployment readiness/drain/storage boundary or exact release config; reuse integrated predecessor modules, no competing domain behavior |
| M | `packages/db/package.json` | Deployment readiness/drain/storage boundary or exact release config; reuse integrated predecessor modules, no competing domain behavior |
| M | `packages/db/src/setup.ts` | Deployment readiness/drain/storage boundary or exact release config; reuse integrated predecessor modules, no competing domain behavior |
| M | `coding-packs/standards/workflow/git-flow-ci.md` | Deployment readiness/drain/storage boundary or exact release config; reuse integrated predecessor modules, no competing domain behavior |
| M | `coding-packs/plans/BLUEPRINT.md` | Deployment readiness/drain/storage boundary or exact release config; reuse integrated predecessor modules, no competing domain behavior |
| C | `infra/README.md` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/versions.lock.json` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/ecosystem.config.cjs` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/env/app.env.example` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/env/monitoring.env.example` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/env/backup.env.example` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/release/manifest.schema.json` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/release/compatibility.schema.json` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/scripts/validate.mjs` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/scripts/render-config.mjs` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/scripts/provision-app.sh` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/scripts/provision-mon.sh` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/scripts/deploy.sh` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/scripts/rollback.sh` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/scripts/backup-verify.sh` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/scripts/restore-isolated.sh` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/scripts/lib/preflight.sh` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/scripts/lib/install.sh` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/scripts/lib/ownership.sh` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/scripts/lib/secrets.sh` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/scripts/lib/release.sh` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/scripts/lib/services.sh` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/scripts/lib/smoke.sh` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/scripts/lib/restore.sh` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/scripts/lib/backup.sh` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/scripts/backup-checkpoint.sh` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/scripts/backup-files.sh` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/scripts/monitor-backup.sh` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/scripts/rotate-secrets.sh` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/scripts/verify-release.mjs` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/nginx/appchat.conf` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/nginx/monitoring.conf` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/nginx/snippets/security.conf` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/nginx/snippets/proxy.conf` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/nginx/snippets/websocket.conf` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/nginx/snippets/admin-allow.conf` | Allowlist IP host admin (Q-054, DC-923) |
| C | `packages/db/prisma/platform/migrations/20261116090000_platform_admin_totp/migration.sql` | Bảng `platform_admin_totp` (Q-054) |
| C | `apps/api/src/http/platform/admin-totp.ts` | Bước TOTP trước ngữ cảnh nền tảng, khoá sai, mã dự phòng, audit (Q-054) |
| C | `apps/api/test/integration/platform-admin-totp.test.ts` | AC Q-054 |
| C | `infra/postgres/postgresql.conf` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/postgres/pg_hba.conf` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/postgres/pgbouncer.ini` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/postgres/pgbackrest.conf` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/redis/redis.conf` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/security/sshd.conf` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/security/fail2ban.conf` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/security/unattended-upgrades.conf` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/security/ufw.rules` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/security/sudoers-deploy` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/security/grafana-identity.md` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/logrotate/appchat.conf` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/prometheus/prometheus.yml` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/prometheus/rules/appchat.yml` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/prometheus/rules/backup.yml` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/prometheus/rules/tenant.yml` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/prometheus/tests/alerts.test.yml` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/alertmanager/alertmanager.yml` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/loki/loki.yml` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/alloy/config.alloy` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/blackbox/blackbox.yml` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/exporters/postgres-queries.yml` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/exporters/targets.schema.json` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/grafana/grafana.ini` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/grafana/provisioning/datasources/appchat.yml` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/grafana/provisioning/dashboards/appchat.yml` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/grafana/dashboards/system.json` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/grafana/dashboards/api.json` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/grafana/dashboards/queues.json` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/grafana/dashboards/channels.json` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/grafana/dashboards/ai.json` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/grafana/dashboards/billing.json` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/backup/manifest.schema.json` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/backup/files-volume.md` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/backup/privacy-journal.md` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/tests/config.test.mjs` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/tests/release.test.mjs` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/tests/ownership.test.mjs` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/tests/backup.test.mjs` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/tests/fixtures/deploy.json` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/tests/fixtures/restore.json` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/tests/rehearsal-deploy.sh` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/tests/rehearsal-restore.sh` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/tests/rehearsal-monitoring.sh` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `.github/workflows/deploy.yml` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `.github/workflows/infra-check.yml` | Native production control-plane configuration, bounded scripts, schemas or dedicated isolated rehearsal evidence |
| C | `infra/systemd/appchat-pm2.service` | Exact native systemd unit/timer; hardened service identity and private listener |
| C | `infra/systemd/appchat-backup-checkpoint.service` | Exact native systemd unit/timer; hardened service identity and private listener |
| C | `infra/systemd/appchat-backup-checkpoint.timer` | Exact native systemd unit/timer; hardened service identity and private listener |
| C | `infra/systemd/appchat-backup-full.service` | Exact native systemd unit/timer; hardened service identity and private listener |
| C | `infra/systemd/appchat-backup-full.timer` | Exact native systemd unit/timer; hardened service identity and private listener |
| C | `infra/systemd/appchat-backup-diff.service` | Exact native systemd unit/timer; hardened service identity and private listener |
| C | `infra/systemd/appchat-backup-diff.timer` | Exact native systemd unit/timer; hardened service identity and private listener |
| C | `infra/systemd/appchat-backup-verify.service` | Exact native systemd unit/timer; hardened service identity and private listener |
| C | `infra/systemd/appchat-backup-verify.timer` | Exact native systemd unit/timer; hardened service identity and private listener |
| C | `infra/systemd/appchat-backup-monitor.service` | Exact native systemd unit/timer; hardened service identity and private listener |
| C | `infra/systemd/appchat-backup-monitor.timer` | Exact native systemd unit/timer; hardened service identity and private listener |
| C | `infra/systemd/appchat-render@.service` | Exact native systemd unit/timer; hardened service identity and private listener |
| C | `infra/systemd/node-exporter.service` | Exact native systemd unit/timer; hardened service identity and private listener |
| C | `infra/systemd/postgres-exporter.service` | Exact native systemd unit/timer; hardened service identity and private listener |
| C | `infra/systemd/pgbouncer-exporter.service` | Exact native systemd unit/timer; hardened service identity and private listener |
| C | `infra/systemd/redis-exporter.service` | Exact native systemd unit/timer; hardened service identity and private listener |
| C | `infra/systemd/nginx-exporter.service` | Exact native systemd unit/timer; hardened service identity and private listener |
| C | `infra/systemd/prometheus.service` | Exact native systemd unit/timer; hardened service identity and private listener |
| C | `infra/systemd/alertmanager.service` | Exact native systemd unit/timer; hardened service identity and private listener |
| C | `infra/systemd/loki.service` | Exact native systemd unit/timer; hardened service identity and private listener |
| C | `infra/systemd/alloy.service` | Exact native systemd unit/timer; hardened service identity and private listener |
| C | `infra/systemd/grafana.service` | Exact native systemd unit/timer; hardened service identity and private listener |
| C | `infra/systemd/blackbox-exporter.service` | Exact native systemd unit/timer; hardened service identity and private listener |
| C | `apps/api/src/http/health/readiness.controller.ts` | Bounded app-owned readiness/drain adapter, DB bootstrap/checkpoint wrapper or dedicated native evidence; no domain action changes |
| C | `apps/api/src/http/health/readiness.service.ts` | Bounded app-owned readiness/drain adapter, DB bootstrap/checkpoint wrapper or dedicated native evidence; no domain action changes |
| C | `apps/api/src/deployment/readiness.ts` | Bounded app-owned readiness/drain adapter, DB bootstrap/checkpoint wrapper or dedicated native evidence; no domain action changes |
| C | `apps/worker/src/deployment/lifecycle.ts` | Bounded app-owned readiness/drain adapter, DB bootstrap/checkpoint wrapper or dedicated native evidence; no domain action changes |
| C | `apps/worker/src/deployment/readiness.ts` | Bounded app-owned readiness/drain adapter, DB bootstrap/checkpoint wrapper or dedicated native evidence; no domain action changes |
| C | `packages/core/src/kernel/deployment/types.ts` | Bounded app-owned readiness/drain adapter, DB bootstrap/checkpoint wrapper or dedicated native evidence; no domain action changes |
| C | `packages/core/src/kernel/deployment/state.ts` | Bounded app-owned readiness/drain adapter, DB bootstrap/checkpoint wrapper or dedicated native evidence; no domain action changes |
| C | `packages/core/src/kernel/deployment/registry.ts` | Bounded app-owned readiness/drain adapter, DB bootstrap/checkpoint wrapper or dedicated native evidence; no domain action changes |
| C | `packages/core/src/kernel/deployment/admission.ts` | Bounded app-owned readiness/drain adapter, DB bootstrap/checkpoint wrapper or dedicated native evidence; no domain action changes |
| C | `packages/core/src/kernel/deployment/drain.ts` | Bounded app-owned readiness/drain adapter, DB bootstrap/checkpoint wrapper or dedicated native evidence; no domain action changes |
| C | `packages/core/src/kernel/deployment/module.ts` | Bounded app-owned readiness/drain adapter, DB bootstrap/checkpoint wrapper or dedicated native evidence; no domain action changes |
| C | `packages/core/src/kernel/files/backup-barrier.ts` | Bounded app-owned readiness/drain adapter, DB bootstrap/checkpoint wrapper or dedicated native evidence; no domain action changes |
| C | `packages/core/src/kernel/files/backup-storage.ts` | Bounded app-owned readiness/drain adapter, DB bootstrap/checkpoint wrapper or dedicated native evidence; no domain action changes |
| C | `packages/db/scripts/setup-production.ts` | Bounded app-owned readiness/drain adapter, DB bootstrap/checkpoint wrapper or dedicated native evidence; no domain action changes |
| C | `packages/db/scripts/migrate-production.ts` | Bounded app-owned readiness/drain adapter, DB bootstrap/checkpoint wrapper or dedicated native evidence; no domain action changes |
| C | `packages/db/scripts/backup-checkpoint.ts` | Bounded app-owned readiness/drain adapter, DB bootstrap/checkpoint wrapper or dedicated native evidence; no domain action changes |
| C | `packages/core/test/deployment-admission.test.ts` | Bounded app-owned readiness/drain adapter, DB bootstrap/checkpoint wrapper or dedicated native evidence; no domain action changes |
| C | `packages/core/test/deployment-drain.test.ts` | Bounded app-owned readiness/drain adapter, DB bootstrap/checkpoint wrapper or dedicated native evidence; no domain action changes |
| C | `packages/core/test/backup-storage.test.ts` | Bounded app-owned readiness/drain adapter, DB bootstrap/checkpoint wrapper or dedicated native evidence; no domain action changes |
| C | `packages/db/test/production-bootstrap.test.ts` | Bounded app-owned readiness/drain adapter, DB bootstrap/checkpoint wrapper or dedicated native evidence; no domain action changes |
| C | `packages/db/test/integration/backup-checkpoint.test.ts` | Bounded app-owned readiness/drain adapter, DB bootstrap/checkpoint wrapper or dedicated native evidence; no domain action changes |
| C | `apps/api/test/integration/deployment-readiness.test.ts` | Bounded app-owned readiness/drain adapter, DB bootstrap/checkpoint wrapper or dedicated native evidence; no domain action changes |
| C | `apps/api/test/integration/nginx-trace.test.ts` | Bounded app-owned readiness/drain adapter, DB bootstrap/checkpoint wrapper or dedicated native evidence; no domain action changes |
| C | `apps/worker/test/integration/deployment-drain.test.ts` | Bounded app-owned readiness/drain adapter, DB bootstrap/checkpoint wrapper or dedicated native evidence; no domain action changes |
| C | `apps/worker/test/integration/deployment-readiness.test.ts` | Bounded app-owned readiness/drain adapter, DB bootstrap/checkpoint wrapper or dedicated native evidence; no domain action changes |
| M | `pnpm-lock.yaml` | Lock existing-stack build tooling for production DB CLI artifact |
| C | `packages/db/tsup.production.config.ts` | Bundle explicit production setup/migration/checkpoint CLI using existing tsup/Node24 toolchain |
| C | `packages/core/src/kernel/deployment/env.ts` | Strict production-only deployment/readiness/drain settings; safe key-only diagnostics |
| C | `infra/scripts/files-snapshot.sh` | Privileged fixed-inventory LVM snapshot helper; separate from unprivileged deploy and application |
| C | `infra/scripts/restore-gate.mjs` | Invoke app-owned privacy/reconciliation CLI against isolated restored environment; not DB-layer import of core |
| M | `apps/worker/tsup.config.ts` | Build dedicated isolated restore CLI entry without production jobs startup |
| C | `apps/worker/src/deployment/restore.ts` | Restore-only CLI validates owned target, invokes privacy/lifecycle gates and reports recovery phases |
| C | `apps/worker/src/deployment/restore.module.ts` | Compose core restore ports without channels/AI/jobs consumers or live ingress |
| M | `packages/core/src/inbox/jobs/inbox.jobs.module.ts` | Admit/drain actual timer, direct sweep and send-result callback, not only BullMQ wrapper |
| M | `packages/db/src/index.ts` | Export maintenance fence and route control port without core dependency |
| M | `packages/db/src/provisioner.ts` | Enroll direct create/grant/drop with global maintenance permit before target locks |
| M | `packages/db/src/migrations.ts` | Enroll direct migrations/bootstrap with inherited maintenance permit |
| M | `packages/db/src/tenant-migrate.ts` | Acquire global maintenance admission before target lock and pooled recorder work |
| M | `packages/db/src/lifecycle/operation-lock.ts` | Shared global maintenance permit precedes dedicated target lock; explicit inherited permit |
| M | `packages/db/src/lifecycle/pg-process.ts` | Guard direct PG child commands and fence lost permit children |
| M | `packages/db/src/lifecycle/archive.ts` | Enroll direct cluster archive/drop phases, preserve recoverable durable phase |
| M | `packages/db/src/lifecycle/restore.ts` | Enroll restore/move physical writes and release permit before route acknowledgement |
| M | `packages/core/src/identity/lifecycle/lifecycle.providers.ts` | Compose production route admission with existing lifecycle ports |
| M | `packages/core/src/identity/lifecycle/restore-request.ts` | Require current generation router acknowledgements before restored workspace live |
| M | `packages/core/src/identity/lifecycle/recovery.ts` | Recover route publication crash and refuse stale active state |
| M | `packages/core/src/identity/jobs/tenant-provision.processor.ts` | Verify route publication for new workspace before ready |
| C | `packages/db/src/backup/maintenance-fence.ts` | Global direct-session/storage maintenance permit and loss fencing |
| C | `packages/db/src/routing/types.ts` | Bounded typed route revisions/control receipts, no arbitrary SQL or DSN |
| C | `packages/db/src/routing/control-client.ts` | Authenticated Unix control client with deadlines and generation checks |
| C | `packages/db/src/routing/reconciler.ts` | Registry mapping reconciliation/verified router publication and crash journal |
| C | `packages/db/scripts/reconcile-routes.ts` | Production route-service CLI, bundled without TS runtime loader |
| C | `packages/core/src/identity/lifecycle/route-admission.ts` | Adapt route port to041 create/restore/recovery composition |
| C | `infra/systemd/appchat-db-routes.service` | Always-running private route reconciliation service |
| C | `infra/scripts/db-router-control.mjs` | Fixed inventory admin control, router startup guard and operation identity |
| C | `infra/scripts/checkpoint-barrier.mjs` | Global multi-router pause/common-cut coordination and recovery fencing |
| C | `infra/scripts/lib/checkpoint-journal.mjs` | Durable checkpoint ownership/generation journal and late-result rejection |
| C | `infra/systemd/pgbouncer-guard.conf` | Native service drop-in denies unfenced router start during checkpoint |
| C | `infra/tests/routing.test.mjs` | Route generation publication and lifecycle ack failure fixtures |
| C | `infra/tests/checkpoint-barrier.test.mjs` | Pause ownership/death/late child/unknown writer and safe recovery matrix |
| C | `packages/db/test/integration/route-reconciler.test.ts` | Native PG/PgBouncer lifecycle mapping changes without redeploy |

## Future M provenance

- `apps/worker/src/start-events.ts`: TIP-003b-event-protocol.md
- `apps/worker/src/event-protocol.manifest.ts`: TIP-003b-event-protocol.md
- `packages/core/src/kernel/jobs/with-job-context.ts`: TIP-045b-app-hardening.md
- `packages/core/src/kernel/privacy/restore-gate.ts`: TIP-015c-contact-privacy.md
- `packages/db/src/lifecycle/operation-lock.ts`: TIP-041-workspace-lifecycle.md
- `packages/db/src/lifecycle/pg-process.ts`: TIP-041-workspace-lifecycle.md
- `packages/db/src/lifecycle/archive.ts`: TIP-041-workspace-lifecycle.md
- `packages/db/src/lifecycle/restore.ts`: TIP-041-workspace-lifecycle.md
- `packages/core/src/identity/lifecycle/lifecycle.providers.ts`: TIP-041-workspace-lifecycle.md
- `packages/core/src/identity/lifecycle/restore-request.ts`: TIP-041-workspace-lifecycle.md
- `packages/core/src/identity/lifecycle/recovery.ts`: TIP-041-workspace-lifecycle.md
