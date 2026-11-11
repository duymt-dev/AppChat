// Domain `contracts` (TIP-030): hợp đồng + ký điện tử native (OTP + ký tay — COMMERCE §9 C1). Handler 13 action `contract.*`, đọc cho
// /v1/contracts*, trang ký công khai /v1/public/sign/:token, PDF (DocRenderer — TIP-028). Thiếu DB / khoá → service null / 501.
import { Module, type OnModuleInit } from '@nestjs/common';
import type { PlatformDb, TenantDbResolver } from '@appchat/db';
import type { MailProvider } from '@appchat/integrations';
import type { Redis } from 'ioredis';
import { AiModule } from '../ai/ai.module';
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
import { DocRenderer, ISOLATED_CONVERTER, type IsolatedConverter } from '../documents/public';
import { IdentityModule } from '../identity/identity.module';
import { MAIL_PROVIDER, RATE_LIMITER } from '../identity/services/identity.tokens';
import { SalesModule } from '../sales/sales.module';
import { ContractApproveAndSignHandler, ContractRejectInternalHandler, ContractRequestChangesHandler, ContractSubmitHandler } from './actions/contract-approval.handlers';
import { ContractExtendLinkHandler, ContractRemindHandler, ContractSendHandler, ContractTerminateHandler } from './actions/contract-send.handlers';
import { ContractCreateHandler, ContractDeleteHandler, ContractFromQuoteHandler, ContractRenewHandler, ContractUpdateHandler } from './actions/contract-write.handlers';
import { ContractGetHandler, ContractSearchHandler } from './actions/contract-read.handlers';
import { ContractAttachFileHandler, ContractFromAttachmentHandler, ContractInspectFileHandler } from './actions/contract-file.handlers';
import { ContractPrepareDraftHandler } from './actions/contract-draft-prepare.handler';
import { ContractDraftFromContentHandler } from './actions/contract-draft.handler';
import { ContractResolveSuggestionHandler } from './actions/contract-suggestion.handler';
import { ContractDeps, contractEnvFor } from './services/contract-deps';
import { ContractsReadService } from './services/contracts-read.service';
import { PublicSignService } from './services/public-sign.service';
import { APPENDIX_HANDLERS, APPENDIX_SERVICES } from './appendix/appendix.module';
import { AppendixPublicService } from './appendix/public.service';
import { registerSystemVerifier } from '../kernel/actions/system';
import { APPENDIX_PUBLIC_ACTIONS, verifyAppendixPublic } from './appendix/system-verifier';
import { ContractSystemTransitionHandler } from './system/handlers';
import { verifyContractTrigger } from './system/sources';
import { AppendixReadService } from './appendix/read.service';
import { ContractPublicDeclineHandler, ContractPublicOpenHandler, ContractPublicOtpHandler } from './signing/public.handlers';
import { ContractRequestSignOtpHandler } from './signing/owner-otp.handler';
import { ContractSignAttemptPrepareHandler, ContractSignAttemptStageHandler } from './signing/attempt.handlers';
import { ContractPublicSignHandler } from './signing/finalize';
import { SIGNING_RECIPIENTS, signingRecipients } from './signing/recipients';
import { PUBLIC_SIGN_ACTIONS, verifyParentPublic } from './signing/module';
import { AuthzModule } from '../authz/authz.module';
import { AuthzResolver } from '../authz/services/authz-resolver';
import { ActionExecutor } from '../kernel/actions/executor';

const opt = (token: symbol | typeof FilesService | typeof DocRenderer | typeof ChannelSendQueue) => ({ token, optional: true });

const HANDLERS = [
  ContractCreateHandler, ContractFromQuoteHandler, ContractUpdateHandler, ContractDeleteHandler, ContractRenewHandler,
  ContractSubmitHandler, ContractRequestChangesHandler, ContractRejectInternalHandler, ContractApproveAndSignHandler,
  ContractSendHandler, ContractRemindHandler, ContractExtendLinkHandler, ContractTerminateHandler,
  ContractSearchHandler, ContractGetHandler,
  ContractInspectFileHandler, ContractAttachFileHandler, ContractFromAttachmentHandler,
  // AI soạn hai bước (TIP-030b F2) — AiRunner từ AiModule (gateway + meter).
  ContractPrepareDraftHandler, ContractDraftFromContentHandler, ContractResolveSuggestionHandler,
  // Phụ lục ký riêng (TIP-030b F3) — appendix/.
  ...APPENDIX_HANDLERS,
  // Ký hợp đồng cha qua action chuẩn (TIP-030c).
  ContractPublicOpenHandler, ContractPublicOtpHandler, ContractPublicDeclineHandler, ContractRequestSignOtpHandler,
  ContractSignAttemptPrepareHandler, ContractSignAttemptStageHandler, ContractPublicSignHandler,
];

@Module({
  imports: [CrmModule, DocumentsModule, ChannelsModule, SalesModule, IdentityModule, AiModule, AuthzModule],
  providers: [
    ...HANDLERS,
    // Action riêng chuyển trạng thái hệ thống (TIP-003c).
    ContractSystemTransitionHandler,
    {
      provide: ContractDeps,
      inject: [opt(TENANT_RESOLVER), opt(PLATFORM_DB), opt(DocRenderer), opt(FilesService), opt(ENV_SOURCE), opt(ENC_KEY), CrmMembers, opt(MAIL_PROVIDER), opt(RATE_LIMITER), opt(REDIS), opt(ISOLATED_CONVERTER)],
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
        iso: IsolatedConverter | undefined,
      ) => {
        const env = src ?? process.env;
        const deps = new ContractDeps(r ?? null, p ?? null, d ?? null, f ?? null, contractEnvFor(env, key, widgetUrlsFor(env).api), m, mail ?? null, limiter ?? null, redis ?? null);
        deps.isolated = iso ?? null;
        return deps;
      },
    },
    {
      provide: ContractsReadService,
      inject: [ContractDeps, CLOCK],
      useFactory: (d: ContractDeps, c: Clock) => (d.tenants && d.platform ? new ContractsReadService(d, () => c.now()) : null),
    },
    {
      provide: PublicSignService,
      inject: [ContractDeps, opt(ChannelSendQueue), CLOCK, { token: ActionExecutor, optional: true }],
      useFactory: (d: ContractDeps, q: ChannelSendQueue | null | undefined, c: Clock, x: ActionExecutor | undefined) => (d.tenants && d.platform ? new PublicSignService(d, q ?? null, () => c.now(), x ?? null) : null),
    },
    {
      provide: SIGNING_RECIPIENTS,
      inject: [opt(PLATFORM_DB), { token: AuthzResolver, optional: true }],
      useFactory: (p: PlatformDb | undefined, a: AuthzResolver | null | undefined) => (p && a ? signingRecipients(p, a) : null),
    },
    ...APPENDIX_SERVICES,
  ],
  exports: [ContractsReadService, PublicSignService, ContractDeps, AppendixReadService, AppendixPublicService, SIGNING_RECIPIENTS],
})
export class ContractsModule implements OnModuleInit {
  /** TIP-003c: verifier nguồn (token phụ lục đã lưu) cho `contract.appendix_public_*`. */
  onModuleInit(): void {
    // 030b: token + Idempotency-Key theo nội dung là khoá chống lặp; xin OTP lại là yêu cầu mới (domain).
    for (const id of APPENDIX_PUBLIC_ACTIONS) registerSystemVerifier(id, verifyAppendixPublic, { receipt: 'domain' });
    registerSystemVerifier('contract.system_transition', verifyContractTrigger);
    // TIP-030c: token hợp đồng cha đã lưu; biên nhận trigger theo request (milestone) — sống lâu hơn TTL idempotency.
    for (const id of PUBLIC_SIGN_ACTIONS) registerSystemVerifier(id, verifyParentPublic);
  }
}
