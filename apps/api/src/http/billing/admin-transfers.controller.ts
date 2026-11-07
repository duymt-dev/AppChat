// Đối soát nền tảng cho màn /admin › Chuyển khoản (TIP-010 → TIP-040 pha 3): chỉ admin nền tảng (kiểm sống), không X-Workspace-Id.
//   GET /v1/admin/transfers?status=&workspace_id=&q=&cursor=&limit=     hoá đơn (mặc định pending_review), cursor — không cắt 200 dòng
//   GET /v1/admin/bank-transactions?provider=&from=&to=&q=&cursor=      giao dịch tiền vào CHƯA khớp
//   GET /v1/admin/sales-inquiries?status=&cursor=                       yêu cầu liên hệ gói Doanh nghiệp (039)
// Duyệt = action `admin.invoice.confirm_transfer` (tay, có bằng chứng) / `admin.bank_transaction.match` (gắn giao dịch).
import { Controller, Get, Inject, Query, Req } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';
import { PLATFORM_DB, TransfersReadService } from '@appchat/core';
import type { PlatformDb } from '@appchat/db';
import { ACTOR_RESOLVER, type ActorResolver } from '../kernel/request-actor';
import { platformAdmin } from '../platform/admin-actor';

type Q = Record<string, string | undefined>;
const pick = (q: Q, keys: string[]) => Object.fromEntries(keys.flatMap((k) => (typeof q[k] === 'string' ? [[k, q[k]]] : [])));

@Controller('admin')
export class AdminTransfersController {
  constructor(
    @Inject(ACTOR_RESOLVER) private readonly actors: ActorResolver,
    @Inject(PLATFORM_DB) private readonly platform: PlatformDb,
    @Inject(TransfersReadService) private readonly read: TransfersReadService,
  ) {}

  @Get('transfers')
  async list(@Req() req: IncomingMessage, @Query() q: Q) {
    await platformAdmin(this.actors, this.platform, req);
    return this.read.invoices(pick(q, ['status', 'workspace_id', 'q', 'cursor', 'limit']));
  }

  @Get('bank-transactions')
  async unmatched(@Req() req: IncomingMessage, @Query() q: Q) {
    await platformAdmin(this.actors, this.platform, req);
    return this.read.unmatched(pick(q, ['provider', 'from', 'to', 'q', 'cursor', 'limit']));
  }

  @Get('sales-inquiries')
  async inquiries(@Req() req: IncomingMessage, @Query() q: Q) {
    await platformAdmin(this.actors, this.platform, req);
    return this.read.inquiries(pick(q, ['status', 'cursor', 'limit']));
  }
}
