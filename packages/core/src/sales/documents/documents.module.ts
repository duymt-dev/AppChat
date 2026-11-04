// Link công khai chứng từ bán hàng (TIP-032b P2): `PublicDocumentService` cho `/v1/public/documents/:token`. Module riêng, không import
// SalesModule (SalesModule import module này). Thiếu DB / khoá → service vẫn tạo, gọi trả 501.
import { Module } from '@nestjs/common';
import type { PlatformDb, TenantDbResolver } from '@appchat/db';
import { CLOCK, type Clock } from '../../kernel/clock';
import { ENC_KEY } from '../../kernel/crypto';
import { FilesService } from '../../kernel/files/files.service';
import type { RateLimiter } from '../../kernel/rate-limit';
import { PLATFORM_DB, TENANT_RESOLVER } from '../../kernel/tenant/tenant.providers';
import { RATE_LIMITER } from '../../identity/services/identity.tokens';
import { PublicDocumentService } from './public-document';

const opt = (token: symbol | typeof FilesService) => ({ token, optional: true });

@Module({
  providers: [
    {
      provide: PublicDocumentService,
      inject: [opt(TENANT_RESOLVER), opt(PLATFORM_DB), opt(FilesService), opt(ENC_KEY), opt(RATE_LIMITER), CLOCK],
      useFactory: (r: TenantDbResolver | undefined, p: PlatformDb | undefined, f: FilesService | undefined, key: Buffer | undefined, l: RateLimiter | undefined, c: Clock) =>
        new PublicDocumentService({ tenants: r ?? null, platform: p ?? null, files: f ?? null, key: key ?? null, limiter: l ?? null, now: () => c.now() }),
    },
  ],
  exports: [PublicDocumentService],
})
export class SalesDocumentsModule {}
