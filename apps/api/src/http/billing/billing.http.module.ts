// Controller HTTP của domain `billing` (TIP-009): /v1/billing/summary|plans|wallet|ledger; TIP-010: /v1/billing/invoices,
// /hooks/payments/:provider (webhook ngân hàng nền tảng), /v1/admin/transfers. TIP-039: /v1/billing/invoices/:id/pdf (DocRenderer của
// DocumentsModule — gắn ở đây, không ở BillingModule, để tránh vòng documents → ai → billing).
// Chỉ gắn khi env đủ DB + Redis + JWT_SECRET (`register`) — như identity / authz / notify.
import { Module, type DynamicModule } from '@nestjs/common';
import { BillingInvoicePdf, BillingModule, DocRenderer, DocumentsModule, InvoicesService, PAYMENTS_ENV, PLATFORM_DB, type PaymentsEnv } from '@appchat/core';
import type { PlatformDb } from '@appchat/db';
import { ActorModule } from '../kernel/actor.module';
import { AdminTransfersController } from './admin-transfers.controller';
import { BillingController } from './billing.controller';
import { PaymentsHookController } from './payments-hook.controller';

@Module({ imports: [BillingModule] })
export class BillingHttpModule {
  static register(): DynamicModule {
    return {
      module: BillingHttpModule,
      imports: [BillingModule, DocumentsModule, ActorModule],
      controllers: [BillingController, PaymentsHookController, AdminTransfersController],
      providers: [
        {
          provide: BillingInvoicePdf,
          inject: [PLATFORM_DB, InvoicesService, PAYMENTS_ENV, { token: DocRenderer, optional: true }],
          useFactory: (p: PlatformDb, i: InvoicesService, e: PaymentsEnv, d?: DocRenderer | null) => new BillingInvoicePdf(p, i, e, d ?? null),
        },
      ],
    };
  }
}
