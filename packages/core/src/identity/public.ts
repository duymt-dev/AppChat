// API công khai của domain identity cho apps/api (controller) + test. Một dòng re-export ở src/index.ts (facade).
export { readIdentityEnv, type IdentityEnv } from './identity.env';
export { AccessTokens, ACCESS_TTL_SEC, jwtKeysFromEnv, type AccessClaims } from './services/access-tokens';
export { AuthService, PASSWORD_MIN, RESET_TTL_MS, toPublic, type LoginOutcome, type PublicUser } from './services/auth.service';
export { SessionsService, REFRESH_TTL_MS, type ClientInfo, type IssuedSession } from './services/sessions.service';
export { OtpService, OTP_MAX_ATTEMPTS, OTP_TTL_MS, AUTH_RULES, type OtpPurpose } from './services/otp.service';
export { WorkspacesService, type MembershipRow, type ProvisionQueue, type ProvisioningStatus } from './services/workspaces.service';
export { InvitesService, INVITE_TTL_MS } from './services/invites.service';
export { SettingsReadService, ONLINE_WINDOW_MS } from './settings/settings-read.service';
export { IDENTITY_ENV, MAIL_PROVIDER, RATE_LIMITER, TAX_LOOKUP, TENANT_PROVISION_QUEUE } from './services/identity.tokens';
export { hashPassword, verifyPassword, normalizeEmail, sha256 } from './services/secrets';
export { provisionWorkspace, tenantSeedDb, BullProvisionQueue, TENANT_QUEUE, PROVISION_JOB, type ProvisionDeps } from './jobs/tenant-provision.processor';
// Vòng đời workspace (TIP-041).
export { TenantQueueDispatcher } from './lifecycle/dispatcher';
export { LifecycleModule } from './lifecycle/lifecycle.module';
export { LifecycleJobs, createLifecycleJob } from './lifecycle/jobs';
export { processLifecycleJob, lifecycleErrorCode, type LifecycleRunDeps } from './lifecycle/recovery';
export { runArchive, rollbackArchive, ArchiveBusyError, ArchiveActivityError, type ArchiveRunDeps } from './lifecycle/archive-run';
export { runRestore, NoArchiveError, type RestoreRunDeps } from './lifecycle/restore-run';
export { lifecycleInfraFromEnv, archiveKeysFromEnv, BullLifecycleWake, TENANT_LIFECYCLE_JOB } from './lifecycle/lifecycle.providers';
export { LIFECYCLE_INFRA, LIFECYCLE_QUEUE, LIFECYCLE_MAX_ATTEMPTS, type LifecycleInfra, type LifecycleJobRow } from './lifecycle/types';
export { workingHoursOf, type WorkingHours } from './settings/workspace-settings';
export { WorkspaceLifecycleReader } from './lifecycle/status';
export { WorkspaceOpenHandler } from './lifecycle/restore-request';
export { scanArchiveCandidates, archiveOn, WARN_DAYS, type ScanDeps, type ScanReport } from './lifecycle/archive-scan';
export { touchActivity, activityConsumer, installActivityConsumer, ACTIVITY_TOPICS } from './lifecycle/activity';
export { ARCHIVE_SCAN_JOB } from './lifecycle/dispatcher';
