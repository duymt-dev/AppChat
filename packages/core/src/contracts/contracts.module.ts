// Domain `contracts` (TIP-030): hợp đồng + ký điện tử native (OTP + ký tay — COMMERCE §9 C1). Handler 13 action `contract.*`, đọc cho
// /v1/contracts*, trang ký công khai /v1/public/sign/:token, PDF (DocRenderer — TIP-028). Thiếu DB / khoá → service null / 501.
import { Module } from '@nestjs/common';
import type { PlatformDb, TenantDbResolver } from '@appchat/db';
import type { MailProvider } from '@appchat/integrations';
import type { Redis } from 'ioredis';
import { CLOCK, type Clock } from '../kernel/clock';
import { ENC_KEY } from '../kernel/crypto';
import { ENV_SOURCE } from '../kernel/kernel.module';
import { FilesService } from '../kernel/files/files.service';
import type { RateLimiter } from '../kernel/rate-limit';
import { REDIS } from '../kernel/redis';
import { PLATFORM_DB, TENANT_RESOLVER } from '../kernel/tenant/tenant.providers';
import { ChannelsModule } from '../channels/channels.module';
import { ChannelSendQueue, widgetUrlsFor } from '../channels/public';
import { CrmModule } from '../crm/crm.module';
import { CrmMembers } from '../crm/public';
import { DocumentsModule } from '../documents/documents.module';
import { DocRenderer } from '../documents/public';
import { IdentityModule } from '../identity/identity.module';
import { MAIL_PROVIDER, RATE_LIMITER } from '../identity/services/identity.tokens';
import { SalesModule } from '../sales/sales.module';
import { ContractApproveAndSignHandler, ContractRejectInternalHandler, ContractRequestChangesHandler, ContractSubmitHandler } from './actions/contract-approval.handlers';
import { ContractExtendLinkHandler, ContractRemindHandler, ContractSendHandler, ContractTerminateHandler } from './actions/contract-send.handlers';
import { ContractCreateHandler, ContractDeleteHandler, ContractFromQuoteHandler, ContractRenewHandler, ContractUpdateHandler } from './actions/contract-write.handlers';
import { ContractGetHandler, ContractSearchHandler } from './actions/contract-read.handlers';
import { ContractDeps, contractEnvFor } from './services/contract-deps';
import { ContractsReadService } from './services/contracts-read.service';
import { PublicSignService } from './services/public-sign.service';

const opt = (token: symbol | typeof FilesService | typeof DocRenderer | typeof ChannelSendQueue) => ({ token, optional: true });

const HANDLERS = [
  ContractCreateHandler, ContractFromQuoteHandler, ContractUpdateHandler, ContractDeleteHandler, ContractRenewHandler,
  ContractSubmitHandler, ContractRequestChangesHandler, ContractRejectInternalHandler, ContractApproveAndSignHandler,
  ContractSendHandler, ContractRemindHandler, ContractExtendLinkHandler, ContractTerminateHandler,
  ContractSearchHandler, ContractGetHandler,
];

@Module({
  imports: [CrmModule, DocumentsModule, ChannelsModule, SalesModule, IdentityModule],
  providers: [
    ...HANDLERS,
    {
      provide: ContractDeps,
      inject: [opt(TENANT_RESOLVER), opt(PLATFORM_DB), opt(DocRenderer), opt(FilesService), opt(ENV_SOURCE), opt(ENC_KEY), CrmMembers, opt(MAIL_PROVIDER), opt(RATE_LIMITER), opt(REDIS)],
      useFactory: (
        r: TenantDbResolver | undefined,
        p: PlatformDb | undefined,
        d: DocRenderer | null | undefined,
        f: FilesService | undefined,
        src: Record<string, string | undefined> | undefined,
        key: Buffer | undefined,
        m: CrmMembers,
        mail: MailProvider | null | undefined,
        limiter: RateLimiter | null | undefined,
        redis: Redis | undefined,
      ) => {
        const env = src ?? process.env;
        return new ContractDeps(r ?? null, p ?? null, d ?? null, f ?? null, contractEnvFor(env, key, widgetUrlsFor(env).api), m, mail ?? null, limiter ?? null, redis ?? null);
      },
    },
    {
      provide: ContractsReadService,
      inject: [ContractDeps, CLOCK],
      useFactory: (d: ContractDeps, c: Clock) => (d.tenants && d.platform ? new ContractsReadService(d, () => c.now()) : null),
    },
    {
      provide: PublicSignService,
      inject: [ContractDeps, opt(ChannelSendQueue), CLOCK],
      useFactory: (d: ContractDeps, q: ChannelSendQueue | null | undefined, c: Clock) => (d.tenants && d.platform ? new PublicSignService(d, q ?? null, () => c.now()) : null),
    },
  ],
  exports: [ContractsReadService, PublicSignService, ContractDeps],
})
export class ContractsModule {}
