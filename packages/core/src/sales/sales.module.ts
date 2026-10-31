// Domain `sales` — quote (TIP-029), order (031), invoice / customer payment / customer_package / bank feed (032). Báo giá: handler 13
// action `quote.*`, đọc cho /v1/quotes*, trang xem công khai, PDF (DocRenderer — TIP-028). Thiếu DB / khoá → service null / 501.
import { Module } from '@nestjs/common';
import type { PlatformDb, TenantDbResolver } from '@appchat/db';
import { CLOCK, type Clock } from '../kernel/clock';
import { ENC_KEY } from '../kernel/crypto';
import { ENV_SOURCE } from '../kernel/kernel.module';
import { FilesService } from '../kernel/files/files.service';
import { PLATFORM_DB, TENANT_RESOLVER } from '../kernel/tenant/tenant.providers';
import { AiModule } from '../ai/ai.module';
import { ChannelsModule } from '../channels/channels.module';
import { widgetUrlsFor } from '../channels/public';
import { CrmModule } from '../crm/crm.module';
import { CrmMembers } from '../crm/public';
import { DocumentsModule } from '../documents/documents.module';
import { DocRenderer } from '../documents/public';
import { QuoteApproveHandler, QuoteRejectInternalHandler, QuoteSubmitHandler } from './quotes/actions/quote-approval.handlers';
import { QuoteAcceptHandler, QuoteRejectHandler, QuoteRevisionHandler } from './quotes/actions/quote-decide.handlers';
import { QuoteDraftFromContentHandler } from './quotes/actions/quote-draft.handler';
import { QuoteExtendHandler, QuoteSendHandler } from './quotes/actions/quote-send.handlers';
import { QuoteCommentHandler, QuoteCreateHandler, QuoteDeleteHandler, QuoteUpdateHandler } from './quotes/actions/quote-write.handlers';
import { QuoteDeps } from './quotes/services/quote-deps';
import { quoteEnvFor } from './quotes/services/quote-env';
import { QuotesReadService } from './quotes/services/quotes-read.service';

const opt = (token: symbol | typeof FilesService | typeof DocRenderer) => ({ token, optional: true });

const HANDLERS = [
  QuoteCreateHandler, QuoteUpdateHandler, QuoteDeleteHandler, QuoteCommentHandler,
  QuoteSubmitHandler, QuoteApproveHandler, QuoteRejectInternalHandler,
  QuoteSendHandler, QuoteExtendHandler,
  QuoteAcceptHandler, QuoteRejectHandler, QuoteRevisionHandler,
  QuoteDraftFromContentHandler,
];

@Module({
  imports: [CrmModule, DocumentsModule, ChannelsModule, AiModule],
  providers: [
    ...HANDLERS,
    {
      provide: QuoteDeps,
      inject: [opt(TENANT_RESOLVER), opt(PLATFORM_DB), opt(DocRenderer), opt(FilesService), opt(ENV_SOURCE), opt(ENC_KEY), CrmMembers],
      useFactory: (r: TenantDbResolver | undefined, p: PlatformDb | undefined, d: DocRenderer | null | undefined, f: FilesService | undefined, src: Record<string, string | undefined> | undefined, key: Buffer | undefined, m: CrmMembers) => {
        const env = src ?? process.env;
        return new QuoteDeps(r ?? null, p ?? null, d ?? null, f ?? null, quoteEnvFor(env, key, widgetUrlsFor(env).api), m);
      },
    },
    {
      provide: QuotesReadService,
      inject: [QuoteDeps, CLOCK],
      useFactory: (d: QuoteDeps, c: Clock) => (d.tenants && d.platform ? new QuotesReadService(d, () => c.now()) : null),
    },
  ],
  exports: [QuotesReadService, QuoteDeps],
})
export class SalesModule {}
