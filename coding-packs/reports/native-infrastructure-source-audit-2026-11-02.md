# Native infrastructure source inventory — 2026-11-02

Bounded read-only independent inventory by audit_blueprint_remainder, checked against repository by parent. Preparation for full TIP045, NOT a pack or implementation acceptance. No services, native DB/Redis, env secrets or production network changed.

## Authoritative scope and ownership
- Blueprint§11 (lines1406 onward): native Ubuntu24.04, systemd infrastructure/PM2 app, APP+MON topology, nginx TLS/WS, private PG16/pgvector/PgBouncer/Redis, exporters+Prometheus/Alertmanager/Loki/Alloy/Grafana, pgBackRest and offsite file backup, deployment/rollback/restore runbooks.
- Existing045 owners: REQ-N01b (PM2/systemd), REQ-N02c (PgBouncer), REQ-N06d (TLS), REQ-N09c (observability), BP-11-a, D20. REQ-N08a shared045/046 (PITR/RPO<=5min/RTO<=1h); BP-11-d shared002/045 (four roles and routing).
- Unowned BP-11-b needs full nginx→API→job→worker→Loki evidence;045b owns app instrumentation,045 owns proxy/log pipeline and cross-process verification. Do NOT assign until full045 task/manifest/AC exists.
- Add atomic child obligations for Blueprint§11.4 dashboard/alert inventory,§11.5 VPS hardening, offsite file backup and isolated restore verification when drafting045; current umbrella owner is not proof each obligation was covered.

## Actual source, not assumed capability
1. `Test-Path -LiteralPath infra` returns False; there is no production config/scripts directory. OnlyTIP045b exists, notTIP045.
2. packages/db/src/env.ts6–16 separates app URLs and optional provisioner/migrator URLs. packages/db/src/setup.ts provides shared four-role/bootstrap/migration logic; production wrapper must reuse it and secure explicit credentials, not invent competing grants. setupCluster alters role passwords on rerun: idempotent infra must not silently rotate secrets or substitute fixture defaults.
3. apps/api/src/http/health/health.controller.ts8–15 implements liveness only. Repo search finds no `/readyz` or actual `/health/ready` handler; the file comment is NOT implementation.045b owns metrics instrumentation but its exact manifest does not own a readiness controller. Full045 must explicitly own small readiness adapter/wiring/tests or correctly name a separately added owner; deploy cannot smoke-test a fictitious endpoint.
4. apps/worker/src/main.ts enables Nest shutdown hooks only. Real graceful queue pause/drain60s, channel lease handoff and event003b startup epoch need deployment integration evidence. PM2 reload alone does not prove safe worker shutdown or exactly-once external effects; preserve014b unknown-send contract.
5. kernel/files/storage.ts specifies production local root `/srv/appchat/files`. PG backup alone cannot restore these bytes; private source/evidence files, retained legal originals, hash manifests and key versions must survive the declared restore point. Existing045b owns optional S3 adapter;045 must back up the configured mode, not claim switching env implements S3.
6. Blueprint provision tree comment still says Node22, while CLAUDE/current CI/workflow standard use Node24 and pnpm11. Correct technical instruction to pinned Node24 in045; no silent downgrade.
7. .github/workflows/ci.yml runs affected lint/typecheck/test plus static checks, not release build/artifact/native backup/deploy gate.044 adds eval CI separately; deploy must consume exact verified SHA evidence/artifact rather than assume any green workflow means release ready.
8.041 SPEC operation-lock holds dedicated session advisory lock on tenant registry target cluster/maintenance DB. Never route this connection or migration/provisioning through PgBouncer transaction pooling. App URLs alone go through app pools; dynamic tenant mapping/maintenance allowlist/readiness must match actual041 config.

## Concrete candidate manifest (not yet approved as exact full pack)
Expand every path before TIP publication; no directory wildcard allowed. Main new files proposed:
- infra/README.md; infra/ecosystem.config.cjs.
- infra/scripts/provision-app.sh; provision-mon.sh; deploy.sh; rollback.sh; backup-verify.sh; restore-isolated.sh (each filename under infra/scripts).
- infra/nginx/appchat.conf; infra/nginx/monitoring.conf; infra/nginx/snippets/security.conf.
- infra/postgres/postgresql.conf; infra/postgres/pg_hba.conf; infra/postgres/pgbouncer.ini; infra/postgres/pgbackrest.conf.
- infra/redis/redis.conf; infra/backup/restic.env.example (placeholder keys only).
- infra/prometheus/prometheus.yml; infra/prometheus/rules/appchat.yml; infra/alertmanager/alertmanager.yml; infra/loki/loki.yml; infra/alloy/config.alloy.
- infra/grafana/provisioning/datasources/appchat.yml; infra/grafana/provisioning/dashboards/appchat.yml.
- infra/grafana/dashboards/system.json; api.json; queues.json; channels.json; ai.json; billing.json (all under infra/grafana/dashboards).
- .github/workflows/deploy.yml.
Still enumerate exact unit/timer/exporter/logrotate/SSH/UFW/backup transport configurations, validation/rehearsal tests, release manifests and runtime readiness/drain adapters. This list alone is NOT a complete file manifest. Split shell helpers by deployment/backup/domain below caps; avoid one giant provision script.

## Critical full-pack contracts
- Release SHA-addressed artifacts, trusted protected deployment approval, no branch mutation/auto-PRmain. Reproducible frozen lockfile dependency install and provenance; never run untrusted PR artifacts with deployment secrets.
- Expand-compatible migration on platform/template/all tenant DBs, bounded concurrency4 and failure receipt.003b event epoch/041 lifecycle prevent incompatible downgrade. Binary symlink rollback is NOT DB schema rollback; prohibit unsafe automatic fallback, expose recovery plan.
- API/web zero-downtime claims require real connection/health evidence, Socket.IO affinity, HTTP rewrite/WS routes, raw webhook bytes and server-generated request IDs. Worker AI/jobs/channels shutdown differs from web reload; singleton channel ownership and bounded drain require actual tests.
- Infrastructure private interfaces/TLS/SCRAM/least privilege, admin SSH key and non-sudo app identity. External monitored failure domain, owner-only Grafana and actual2FA enforcement must be configured/tested, not merely a prose checkbox; select a supported mechanism and document any deviation rather than assuming Grafana has native local-user2FA.
- Prom/Alloy/Alertmanager/Grafana configs must implement exact§11.4 thresholds and six dashboards with bounded labels; no tenant/account/run IDs as unbounded metric labels. Channel per-account visibility via authorized logs/query, not cardinality shortcut. No tokens/bodies/query-string secrets in nginx/Alloy logs; trace injection is untrusted until overwritten/validated.
- Continuous WAL/archive health plus weekly full/daily diff and separate files/offsite keys. Backup success differs from restore success. Restore newest verified manifest to explicitly owned isolated cluster/storage only, test RPO/RTO with measured timestamps and reference/byte consistency, and invoke015c privacy restore journal before ANY reopening access. No destructive in-place test against current native5432 or demo queues.
- New isolated rehearsal resources must have exact PID/path/port/cluster ownership; no process-name kill, recursive unknown deletes or wildcard DROP/FLUSHALL. Protected production deployment is a later authorized environment, not this docs phase.

## Boundaries and open resources
-045b: application instrumentation, rate limits, projection, S3 adapter and security code.040: LLM/provider administration.041: workspace archive/delete/restore state machine.015c: privacy journal/reconciliation.044: isolated eval harness;046: release-wide/performance/WCAG/parity evidence. Production monitoring does not replace any of these.
- Q-006 is already open: authorized VPS/domain/TLS resources. Offsite destination/credentials, external uptime host, alert recipients and restore capacity also need explicit environment configuration. No secrets requested in chat or committed.
- Missing resources block real deployment/acceptance, not writing full045 or other remaining goal work. No new question/assumed approval. No owner/status changes made by this inventory.

## Next action
Write complete TIP045 with exact manifest, appropriate readiness/drain ownership, concrete deploy/backup/alert security contracts and measurable tests. Compute bilateral file intersections before publication; reconcile atomic ledger rows; request bounded independent review. Then046 and remaining89 gaps/seven sections/full semantic graph. Goal still active.
