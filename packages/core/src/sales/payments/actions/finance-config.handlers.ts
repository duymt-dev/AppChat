// payment_account.update · bank_feed.connect · bank_feed.disconnect (`finance.manage` — Owner; Blueprint §3.4, COMMERCE §5). Tài khoản nhận
// tiền = nguồn VietQR của đề nghị thanh toán. Bank feed = kết nối connector port `bank_feed` (bí mật mã hoá ở `integration_connection`,
// kiểm thông tin qua adapter) + dòng `tenant_bank_feed` + route `tenant_bank_feed_route` ở DB nền tảng (action `db: 'platform'` —
// nền tảng trước, Blueprint §2.0). Kết nối lại dùng lại feed cũ (giữ link webhook DN đã dán vào SePay / Casso).
import { accountOrEmpty } from '@appchat/integrations';
import { Inject, Injectable, Optional } from '@nestjs/common';
import { AppError } from '@appchat/shared';
import type { ActionInput, bankFeedConnect, bankFeedDisconnect, paymentAccountUpdate } from '@appchat/actions';
import { CLOCK, SystemClock, type Clock } from '../../../kernel/clock';
import type { ActionContext, PlatformTx, TenantTx } from '../../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../../kernel/actions/handler';
import { uuidv7 } from '../../../kernel/ids';
import { actorUserId } from '../../../crm/public';
import { ConnectionsService, queueProbe, rotated } from '../../../integrations/public';
import { webhookPathOf } from '../services/bank-feed';
import { applyBind, bindExisting, type BindPlan } from './bank-feed-bind';
import { accountPreview, connectPreview, disconnectPreview } from '../previews/finance-config.handlers.preview';

const need = (c: ConnectionsService | null) => {
  if (!c) throw new AppError('NOT_IMPLEMENTED', 501, undefined, 'integrations chưa cấu hình (APP_ENC_KEY)');
  return c;
};
const needPtx = (ptx?: PlatformTx) => {
  if (!ptx) throw new AppError('NOT_IMPLEMENTED', 501, undefined, 'PlatformDb chưa cấu hình');
  return ptx;
};

@Injectable()
@ActionHandler('payment_account.update')
export class PaymentAccountUpdateHandler implements Handler<ActionInput<typeof paymentAccountUpdate>, { ok: boolean }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof paymentAccountUpdate>, tx: TenantTx): Promise<HandlerOutcome<{ ok: boolean }>> {
    const prev = await tx.paymentAccount.findUnique({ where: { id: 1 } });
    const data = { bank: input.bank, bankBin: input.bank_bin, accountNo: input.account_no, accountName: input.account_name.toUpperCase(), updatedBy: actorUserId(ctx), updatedAt: this.clock.now() };
    await tx.paymentAccount.upsert({ where: { id: 1 }, create: { id: 1, ...data }, update: data });
    const view = (a: { bank: string; bankBin: string; accountNo: string; accountName: string } | null) => (a ? { bank: a.bank, bin: a.bankBin, account_no: a.accountNo, account_name: a.accountName } : null);
    return { result: { ok: true }, before: view(prev), after: view(data) };
  }

  async preview(_ctx: ActionContext, input: ActionInput<typeof paymentAccountUpdate>, tx: TenantTx) {
    return accountPreview(tx, input);
  }
}

@Injectable()
@ActionHandler('bank_feed.connect')
export class BankFeedConnectHandler implements Handler<ActionInput<typeof bankFeedConnect>, { feed_id: string; webhook_path: string }> {
  constructor(
    @Inject(ConnectionsService) private readonly connections: ConnectionsService | null,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** Pha nền tảng (TIP-045b): kiểm thông tin + mã hoá + chọn id feed (tenant chỉ đọc). Ghi tenant ở `applyTenant`, route ở `finalizePlatform`. */
  async execute(ctx: ActionContext, input: ActionInput<typeof bankFeedConnect>, tx: TenantTx, ptx?: PlatformTx): Promise<HandlerOutcome<{ feed_id: string; webhook_path: string }>> {
    needPtx(ptx);
    if (input.connection_id) return bindExisting(ctx, tx, input.provider, input.connection_id, input.if_version, this.clock.now());
    const conn = await need(this.connections).prepareConnect(tx, input.provider, input.fields ?? {}, input.mode);
    const accountNo = accountOrEmpty((conn.config as Record<string, unknown>).account_number);
    const existing = await tx.tenantBankFeed.findUnique({ where: { connectionId: conn.id } });
    const feedId = existing?.id ?? uuidv7(this.clock.now().getTime());
    return {
      result: { feed_id: feedId, webhook_path: webhookPathOf(input.provider, feedId) },
      after: { provider: input.provider, feed_id: feedId, account_no: accountNo, mode: conn.mode },
      tenantPlan: { conn, feedId, accountNo, provider: input.provider, by: actorUserId(ctx) ?? ctx.actor.id, at: this.clock.now().toISOString() },
    };
  }

  async applyTenant(_ctx: ActionContext, plan: Record<string, unknown>, tx: TenantTx) {
    if (plan.bind) return applyBind(tx, plan as unknown as BindPlan);
    const p = plan as { conn: Parameters<ConnectionsService['applyConnect']>[2]; feedId: string; accountNo: string; provider: string; by: string; at: string };
    const row = await need(this.connections).applyConnect(tx, p.by, p.conn);
    // Thăm dò đọc bền cho khoá mới (worker; quét khôi phục 60 giây đẩy — §4.1 B). Không gọi mạng trong transaction.
    await queueProbe(tx, row.id, p.by, new Date(p.at));
    const existing = await tx.tenantBankFeed.findUnique({ where: { id: p.feedId } });
    if (existing) await tx.tenantBankFeed.update({ where: { id: p.feedId }, data: { status: 'active', accountNo: p.accountNo, provider: p.provider } });
    else await tx.tenantBankFeed.create({ data: { id: p.feedId, connectionId: row.id, provider: p.provider, accountNo: p.accountNo, createdAt: new Date(p.at) } });
    return { events: [{ topic: 'integration.connected', payload: { connection_id: row.id, connector_key: row.connectorKey } }] };
  }

  async finalizePlatform(ctx: ActionContext, plan: Record<string, unknown>, ptx: PlatformTx) {
    const p = plan as { conn: { id: string }; feedId: string; provider: string };
    await need(this.connections).routeIn(ptx, ctx.workspaceId, p.conn.id, p.provider, 'connected');
    await ptx.tenantBankFeedRoute.upsert({ where: { feedId: p.feedId }, create: { feedId: p.feedId, workspaceId: ctx.workspaceId, provider: p.provider }, update: { provider: p.provider } });
  }

  async preview(_ctx: ActionContext, input: ActionInput<typeof bankFeedConnect>, tx: TenantTx) {
    return connectPreview(tx, this.connections, input);
  }
}

@Injectable()
@ActionHandler('bank_feed.disconnect')
export class BankFeedDisconnectHandler implements Handler<ActionInput<typeof bankFeedDisconnect>, { ok: boolean }> {
  constructor(
    @Inject(ConnectionsService) private readonly connections: ConnectionsService | null,
    @Optional() @Inject(CLOCK) private readonly clock: Clock = new SystemClock(),
  ) {}

  /** Pha nền tảng: chỉ kiểm có kết nối (tenant chỉ đọc); ngắt ở tenant, gỡ route ở `finalizePlatform`. */
  async execute(_ctx: ActionContext, input: ActionInput<typeof bankFeedDisconnect>, tx: TenantTx, ptx?: PlatformTx): Promise<HandlerOutcome<{ ok: boolean }>> {
    needPtx(ptx);
    need(this.connections);
    const row = await tx.integrationConnection.findFirst({ where: { connectorKey: input.provider, status: { not: 'disconnected' } }, select: { id: true } });
    if (!row) throw new AppError('NOT_FOUND', 404, { provider: 'not_connected' });
    const feed = await tx.tenantBankFeed.findUnique({ where: { connectionId: row.id }, select: { id: true } });
    return { result: { ok: true }, before: { provider: input.provider, feed_id: feed?.id ?? null }, tenantPlan: { provider: input.provider, connectionId: row.id, feedId: feed?.id ?? null, at: this.clock.now().toISOString() } };
  }

  async applyTenant(_ctx: ActionContext, plan: Record<string, unknown>, tx: TenantTx) {
    const p = plan as { provider: string; connectionId: string; feedId: string | null; at: string };
    const cur = await tx.integrationConnection.findUnique({ where: { id: p.connectionId } });
    if (cur && cur.status !== 'disconnected') {
      await tx.integrationConnection.update({ where: { id: cur.id }, data: { status: 'disconnected', secretEnc: null, credentialRev: { increment: 1 } } });
      await rotated(tx, cur.id, new Date(p.at));
    }
    if (p.feedId) await tx.tenantBankFeed.updateMany({ where: { id: p.feedId }, data: { status: 'disconnected' } });
    return { events: [{ topic: 'integration.disconnected', payload: { connection_id: p.connectionId, connector_key: cur?.connectorKey ?? p.provider } }] };
  }

  async finalizePlatform(ctx: ActionContext, plan: Record<string, unknown>, ptx: PlatformTx) {
    const p = plan as { provider: string; connectionId: string; feedId: string | null };
    await need(this.connections).routeIn(ptx, ctx.workspaceId, p.connectionId, p.provider, 'disconnected');
    if (p.feedId) await ptx.tenantBankFeedRoute.deleteMany({ where: { feedId: p.feedId } });
  }

  async preview(_ctx: ActionContext, input: ActionInput<typeof bankFeedDisconnect>, tx: TenantTx) {
    return disconnectPreview(tx, input);
  }
}
