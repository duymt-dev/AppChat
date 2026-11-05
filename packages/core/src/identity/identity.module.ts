// Domain `identity` — user, workspace, membership, invite, auth (OTP, password, tokens), business-profile (TIP-004).
// Service dựng bằng factory từ env (ENV_SOURCE): thiếu DB / Redis / JWT_SECRET → service = null (process không cần auth,
// vd. test health / worker không DB vẫn boot); HTTP controller của identity chỉ đăng ký khi đủ (apps/api).
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Module, type FactoryProvider, type OnApplicationShutdown } from '@nestjs/common';
import { Queue } from '../kernel/jobs/with-job-context';
import type { Redis } from 'ioredis';
import type { PlatformDb, TenantDbResolver } from '@appchat/db';
import { BrevoMailProvider, MemoryMailProvider, SmtpMailProvider, MockTaxLookupProvider, VietQrTaxLookupProvider, type MailProvider } from '@appchat/integrations';
import { CLOCK, type Clock } from '../kernel/clock';
import { ENV_SOURCE } from '../kernel/kernel.module';
import { RateLimiter } from '../kernel/rate-limit';
import { REDIS } from '../kernel/redis';
import { PLATFORM_DB, TENANT_RESOLVER } from '../kernel/tenant/tenant.providers';
import { BusinessProfileUpdateHandler } from './actions/business-profile-update.handler';
import { InviteRevokeHandler } from './actions/invite-revoke.handler';
import { MemberInviteHandler } from './actions/member-invite.handler';
import { MemberRemoveHandler } from './actions/member-remove.handler';
import { MemberSearchHandler } from './actions/member-read.handler';
import { MemberSetRoleHandler } from './actions/member-set-role.handler';
import { OnboardingToggleStepHandler } from './actions/onboarding-toggle-step.handler';
import { ProfileUpdateHandler } from './actions/profile-update.handler';
import { WorkingHoursUpdateHandler } from './actions/working-hours-update.handler';
import { WorkspaceSwitchHandler } from './actions/workspace-switch.handler';
import { WorkspaceUpdateHandler } from './actions/workspace-update.handler';
import { WorkspaceRequestTransferOtpHandler } from './actions/workspace-transfer-otp.handler';
import { WorkspaceTransferOwnershipHandler } from './actions/workspace-transfer.handler';
import { readIdentityEnv, type IdentityEnv } from './identity.env';
import { BullProvisionQueue, TENANT_QUEUE } from './jobs/tenant-provision.processor';
import { AccessTokens, jwtKeysFromEnv } from './services/access-tokens';
import { AuthService } from './services/auth.service';
import { IDENTITY_ENV, MAIL_PROVIDER, RATE_LIMITER, TAX_LOOKUP, TENANT_PROVISION_QUEUE } from './services/identity.tokens';
import { InvitesService } from './services/invites.service';
import { InviteEffectsInstaller } from './services/invite-effects';
import { OtpService } from './services/otp.service';
import { SessionsService } from './services/sessions.service';
import { WorkspacesService } from './services/workspaces.service';
import { SettingsReadService } from './settings/settings-read.service';
import { TAX_FIXTURE } from './tax-fixture';

const opt = (token: symbol) => ({ token, optional: true });
type Src = Record<string, string | undefined>;

/** Thư console: dev in mã / link ra stderr để đăng nhập thử (không qua logger có cấu trúc — ops §1.4); test chỉ giữ trong bộ nhớ. */
const consoleMail = (env: IdentityEnv) =>
  new MemoryMailProvider((m) => {
    if (env.NODE_ENV === 'development') process.stderr.write(`[mail:console] ${m.subject}\n${m.text}\n`);
    // E2E http (TIP-011) đọc OTP / link từ file; env validate cấm biến này ở production.
    if (env.MAIL_CONSOLE_DIR) {
      mkdirSync(env.MAIL_CONSOLE_DIR, { recursive: true });
      writeFileSync(join(env.MAIL_CONSOLE_DIR, `${m.to}.txt`), m.text);
    }
  });

const mailFor = (env: IdentityEnv): MailProvider => {
  const sender = { email: env.MAIL_FROM_EMAIL, name: env.MAIL_FROM_NAME };
  if (env.MAIL_PROVIDER === 'brevo') return new BrevoMailProvider({ apiKey: env.BREVO_API_KEY!, sender });
  if (env.MAIL_PROVIDER === 'smtp')
    return new SmtpMailProvider({ host: env.SMTP_HOST!, port: env.SMTP_PORT, secure: env.SMTP_SECURE === 'true', user: env.SMTP_USER, pass: env.SMTP_PASS, sender });
  return consoleMail(env);
};

class QueueCloser implements OnApplicationShutdown {
  constructor(private readonly q: BullProvisionQueue | null) {}
  async onApplicationShutdown(): Promise<void> {
    await this.q?.close();
  }
}

const providers: FactoryProvider[] = [
  { provide: IDENTITY_ENV, inject: [opt(ENV_SOURCE)], useFactory: (src?: Src) => (src ? readIdentityEnv(src) : null) },
  { provide: MAIL_PROVIDER, inject: [IDENTITY_ENV], useFactory: (env: IdentityEnv | null) => (env ? mailFor(env) : null) },
  {
    provide: TAX_LOOKUP,
    inject: [IDENTITY_ENV],
    useFactory: (env: IdentityEnv | null) => (env?.TAX_LOOKUP_PROVIDER === 'vietqr' ? new VietQrTaxLookupProvider() : new MockTaxLookupProvider(TAX_FIXTURE, true)),
  },
  { provide: RATE_LIMITER, inject: [opt(REDIS)], useFactory: (r?: Redis) => (r ? new RateLimiter(r) : null) },
  {
    provide: AccessTokens,
    inject: [IDENTITY_ENV],
    useFactory: (env: IdentityEnv | null) => (env ? new AccessTokens(jwtKeysFromEnv(env.JWT_SECRET, env.JWT_SECRETS_OLD, env.JWT_KID)) : null),
  },
  {
    provide: TENANT_PROVISION_QUEUE,
    inject: [opt(REDIS)],
    useFactory: (r?: Redis) => (r ? new BullProvisionQueue(new Queue(TENANT_QUEUE, { connection: r.duplicate() })) : null),
  },
  { provide: 'IDENTITY_QUEUE_CLOSER', inject: [TENANT_PROVISION_QUEUE], useFactory: (q: BullProvisionQueue | null) => new QueueCloser(q) },
  {
    provide: OtpService,
    inject: [opt(PLATFORM_DB), MAIL_PROVIDER, RATE_LIMITER, CLOCK],
    useFactory: (db: PlatformDb | undefined, mail: MailProvider | null, rl: RateLimiter | null, c: Clock) => (db && mail && rl ? new OtpService(db, mail, rl, c) : null),
  },
  {
    provide: SessionsService,
    inject: [opt(PLATFORM_DB), AccessTokens, CLOCK],
    useFactory: (db: PlatformDb | undefined, a: AccessTokens | null, c: Clock) => (db && a ? new SessionsService(db, a, c) : null),
  },
  {
    provide: AuthService,
    inject: [opt(PLATFORM_DB), OtpService, SessionsService, MAIL_PROVIDER, IDENTITY_ENV, CLOCK],
    useFactory: (db: PlatformDb | undefined, o: OtpService | null, s: SessionsService | null, m: MailProvider | null, e: IdentityEnv | null, c: Clock) =>
      db && o && s && m && e ? new AuthService(db, o, s, m, e, c) : null,
  },
  {
    provide: WorkspacesService,
    inject: [opt(PLATFORM_DB), TENANT_PROVISION_QUEUE, CLOCK],
    useFactory: (db: PlatformDb | undefined, q: BullProvisionQueue | null, c: Clock) => (db && q ? new WorkspacesService(db, q, c) : null),
  },
  {
    provide: InvitesService,
    inject: [opt(PLATFORM_DB), MAIL_PROVIDER, IDENTITY_ENV, CLOCK, opt(TENANT_RESOLVER)],
    useFactory: (db: PlatformDb | undefined, m: MailProvider | null, e: IdentityEnv | null, c: Clock, t?: TenantDbResolver) => (db && m && e ? new InvitesService(db, m, e, c, t ?? null) : null),
  },
  { provide: SettingsReadService, inject: [opt(PLATFORM_DB), CLOCK], useFactory: (db: PlatformDb | undefined, c: Clock) => (db ? new SettingsReadService(db, () => c.now()) : null) },
];

// Handler Cài đặt (TIP-013). member.set_role inject PLATFORM_DB tuỳ chọn (undo ghi DB nền tảng).
const SETTINGS_HANDLERS = [WorkspaceUpdateHandler, WorkingHoursUpdateHandler, MemberInviteHandler, InviteRevokeHandler, MemberSetRoleHandler, MemberRemoveHandler, MemberSearchHandler, WorkspaceRequestTransferOtpHandler, WorkspaceTransferOwnershipHandler];

@Module({
  providers: [...providers, InviteEffectsInstaller, ProfileUpdateHandler, WorkspaceSwitchHandler, BusinessProfileUpdateHandler, OnboardingToggleStepHandler, ...SETTINGS_HANDLERS],
  exports: [
    IDENTITY_ENV,
    MAIL_PROVIDER,
    TAX_LOOKUP,
    RATE_LIMITER,
    AccessTokens,
    TENANT_PROVISION_QUEUE,
    OtpService,
    SessionsService,
    AuthService,
    WorkspacesService,
    InvitesService,
    SettingsReadService,
  ],
})
export class IdentityModule {}
