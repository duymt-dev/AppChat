// GET /v1/admin/transfers?status=pending_review (Blueprint §4.4 admin — TIP-010): hoá đơn gói chờ duyệt chuyển khoản thủ công,
// mọi workspace. Chỉ platform admin (user `is_platform_admin`); không cần X-Workspace-Id. Duyệt = action admin.invoice.confirm_transfer.
import { Controller, Get, Inject, Query, Req } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';
import { PLATFORM_DB } from '@appchat/core';
import type { PlatformDb } from '@appchat/db';
import { AppError, BILL_INVOICE_STATUSES } from '@appchat/shared';
import { ACTOR_RESOLVER, type ActorResolver } from '../kernel/request-actor';

@Controller('admin')
export class AdminTransfersController {
  constructor(
    @Inject(ACTOR_RESOLVER) private readonly actors: ActorResolver,
    @Inject(PLATFORM_DB) private readonly platform: PlatformDb,
  ) {}

  @Get('transfers')
  async list(@Req() req: IncomingMessage, @Query('status') status?: string) {
    const userId = await this.actors.user(req);
    const u = await this.platform.user.findUnique({ where: { id: userId }, select: { isPlatformAdmin: true } });
    if (!u?.isPlatformAdmin) throw new AppError('FORBIDDEN', 403, { permission: 'platform_admin' });
    const st = (BILL_INVOICE_STATUSES as readonly string[]).includes(status ?? '') ? (status as (typeof BILL_INVOICE_STATUSES)[number]) : 'pending_review';
    const rows = await this.platform.billingInvoice.findMany({ where: { status: st }, orderBy: { createdAt: 'asc' }, take: 200 });
    const names = new Map((await this.platform.workspace.findMany({ where: { id: { in: rows.map((r) => r.workspaceId) } }, select: { id: true, name: true } })).map((w) => [w.id, w.name]));
    return {
      data: rows.map((r) => ({
        id: r.id,
        code: r.code,
        workspace_id: r.workspaceId,
        workspace_name: names.get(r.workspaceId) ?? '',
        kind: r.kind,
        item: r.item,
        amount: String(r.amount),
        transfer_code: r.transferCode,
        status: r.status,
        reported_at: r.reportedAt?.toISOString() ?? null,
        created_at: r.createdAt.toISOString(),
        vat_info: r.vatInfo,
      })),
    };
  }
}
