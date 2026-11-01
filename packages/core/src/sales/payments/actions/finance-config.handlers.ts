// payment_account.update · bank_feed.connect · bank_feed.disconnect (`finance.manage` — Owner; Blueprint §3.4, COMMERCE §5). Tài khoản nhận
// tiền = nguồn VietQR của đề nghị thanh toán. Bank feed = kết nối connector port `bank_feed` (bí mật mã hoá ở `integration_connection`,
// kiểm thông tin qua adapter) + dòng `tenant_bank_feed` + route `tenant_bank_feed_route` ở DB nền tảng (action `db: 'platform'` —
// nền tảng trước, Blueprint §2.0). Kết nối lại dùng lại feed cũ (giữ link webhook DN đã dán vào SePay / Casso).
import { Inject, Injectable } from '@nestjs/common';
import { AppError } from '@appchat/shared';
import type { ActionInput, bankFeedConnect, bankFeedDisconnect, paymentAccountUpdate } from '@appchat/actions';
import { CLOCK, type Clock } from '../../../kernel/clock';
import type { ActionContext, PlatformTx, TenantTx } from '../../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../../kernel/actions/handler';
import { uuidv7 } from '../../../kernel/ids';
import { actorUserId } from '../../../crm/public';
import { ConnectionsService } from '../../../integrations/public';
import { webhookPathOf } from '../services/bank-feed';

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
}

@Injectable()
@ActionHandler('bank_feed.connect')
export class BankFeedConnectHandler implements Handler<ActionInput<typeof bankFeedConnect>, { feed_id: string; webhook_path: string }> {
  constructor(
    @Inject(ConnectionsService) private readonly connections: ConnectionsService | null,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof bankFeedConnect>, tx: TenantTx, ptx?: PlatformTx): Promise<HandlerOutcome<{ feed_id: string; webhook_path: string }>> {
    const p = needPtx(ptx);
    const { row } = await need(this.connections).connect(tx, ctx.workspaceId, actorUserId(ctx) ?? ctx.actor.id, input.provider, input.fields);
    const accountNo = String((row.config as Record<string, unknown>).account_number ?? '').replace(/\D/g, '');
    const existing = await tx.tenantBankFeed.findUnique({ where: { connectionId: row.id } });
    const feedId = existing?.id ?? uuidv7(this.clock.now().getTime());
    if (existing) await tx.tenantBankFeed.update({ where: { id: feedId }, data: { status: 'active', accountNo, provider: input.provider } });
    else await tx.tenantBankFeed.create({ data: { id: feedId, connectionId: row.id, provider: input.provider, accountNo, createdAt: this.clock.now() } });
    await p.tenantBankFeedRoute.upsert({ where: { feedId }, create: { feedId, workspaceId: ctx.workspaceId, provider: input.provider }, update: { provider: input.provider } });
    return {
      result: { feed_id: feedId, webhook_path: webhookPathOf(input.provider, feedId) },
      after: { provider: input.provider, feed_id: feedId, account_no: accountNo },
      events: [{ topic: 'integration.connected', payload: { connection_id: row.id, connector_key: row.connectorKey } }],
    };
  }
}

@Injectable()
@ActionHandler('bank_feed.disconnect')
export class BankFeedDisconnectHandler implements Handler<ActionInput<typeof bankFeedDisconnect>, { ok: boolean }> {
  constructor(@Inject(ConnectionsService) private readonly connections: ConnectionsService | null) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof bankFeedDisconnect>, tx: TenantTx, ptx?: PlatformTx): Promise<HandlerOutcome<{ ok: boolean }>> {
    const p = needPtx(ptx);
    const row = await need(this.connections).disconnect(tx, ctx.workspaceId, input.provider);
    const feed = await tx.tenantBankFeed.findUnique({ where: { connectionId: row.id } });
    if (feed) {
      await tx.tenantBankFeed.update({ where: { id: feed.id }, data: { status: 'disconnected' } });
      await p.tenantBankFeedRoute.deleteMany({ where: { feedId: feed.id } });
    }
    return {
      result: { ok: true },
      before: { provider: input.provider, feed_id: feed?.id ?? null },
      events: [{ topic: 'integration.disconnected', payload: { connection_id: row.id, connector_key: row.connectorKey } }],
    };
  }
}
