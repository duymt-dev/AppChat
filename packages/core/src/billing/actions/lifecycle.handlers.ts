// billing.lifecycle_step / billing.apply_invoice (TIP-039, DC-242) — system-only (actor `system:billing`). Pha nền tảng của sổ thao tác
// (045b): biên nhận kỳ / ghi nhận hoá đơn + sổ ví trong PlatformTx của action; event (`subscription.changed`, `billing.invoice_paid`,
// thông báo Owner) trả ở `events` → pha tenant ghi outbox cùng biên nhận — tiến trình chết sau commit nền tảng thì khôi phục ROLE=jobs làm
// nốt (không mất thông báo). Cờ ngưỡng ví (`credits.*`) phát sau commit (WalletService.emit — giành cờ có điều kiện).
import { Inject, Injectable } from '@nestjs/common';
import { AppError } from '@appchat/shared';
import type { ActionInput, billingApplyInvoice, billingLifecycleStep } from '@appchat/actions';
import type { ActionContext, PlatformTx, TenantTx } from '../../kernel/actions/action-context';
import {
  ActionHandler,
  type ActionHandler as Handler,
  type HandlerOutcome,
} from '../../kernel/actions/handler';
import { CLOCK, type Clock } from '../../kernel/clock';
import { applyPaidInvoice } from '../lifecycle/apply-invoice';
import { BILLING_ACTOR } from '../lifecycle/types';
import { stepWorkspace } from '../services/periods.service';
import { WalletService, type WalletChange } from '../services/wallet.service';

const system = (ctx: ActionContext) => {
  if (ctx.source !== 'system' || ctx.actor.type !== 'system' || ctx.actor.id !== BILLING_ACTOR)
    throw new AppError('FORBIDDEN', 403, { source: ctx.source });
};
const need = <T>(v: T | null | undefined, what: string): T => {
  if (!v) throw new AppError('INTERNAL', 500, undefined, `${what} cần PlatformTx + WalletService`);
  return v;
};
const emitAll = (wallet: WalletService, changes: WalletChange[]) => async () => {
  for (const c of changes) await wallet.emit(c);
};

type StepOut = { granted: number; skipped: number; expired: boolean; switched: boolean };

@Injectable()
@ActionHandler('billing.lifecycle_step')
export class BillingLifecycleStepHandler implements Handler<
  ActionInput<typeof billingLifecycleStep>,
  StepOut
> {
  constructor(
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(WalletService) private readonly wallet: WalletService | null,
  ) {}

  async preview(): Promise<never> {
    throw new AppError('FORBIDDEN', 403, { source: 'system_only' });
  }

  async execute(
    ctx: ActionContext,
    _input: ActionInput<typeof billingLifecycleStep>,
    _tx: TenantTx,
    ptx?: PlatformTx,
  ): Promise<HandlerOutcome<StepOut>> {
    system(ctx);
    const wallet = need(this.wallet, 'billing.lifecycle_step');
    const r = await stepWorkspace(
      need(ptx, 'billing.lifecycle_step'),
      wallet,
      ctx.workspaceId,
      this.clock.now(),
    );
    return {
      result: { granted: r.granted, skipped: r.skipped, expired: r.expired, switched: r.switched },
      events: r.events,
      afterCommit: emitAll(wallet, r.changes),
    };
  }
}

type ApplyOut = { invoice_id: string; status: 'applied' | 'replayed' | 'held'; reason?: string };

@Injectable()
@ActionHandler('billing.apply_invoice')
export class BillingApplyInvoiceHandler implements Handler<
  ActionInput<typeof billingApplyInvoice>,
  ApplyOut
> {
  constructor(
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(WalletService) private readonly wallet: WalletService | null,
  ) {}

  async preview(): Promise<never> {
    throw new AppError('FORBIDDEN', 403, { source: 'system_only' });
  }

  async execute(
    ctx: ActionContext,
    input: ActionInput<typeof billingApplyInvoice>,
    _tx: TenantTx,
    ptx?: PlatformTx,
  ): Promise<HandlerOutcome<ApplyOut>> {
    system(ctx);
    const wallet = need(this.wallet, 'billing.apply_invoice');
    const t = need(ptx, 'billing.apply_invoice');
    const owned = await t.billingInvoice.findFirst({
      where: { id: input.invoice_id, workspaceId: ctx.workspaceId },
      select: { id: true },
    });
    if (!owned) throw new AppError('NOT_FOUND', 404, { invoice_id: 'not_found' });
    const r = await applyPaidInvoice(t, wallet, input.invoice_id, this.clock.now());
    return {
      result: { invoice_id: input.invoice_id, status: r.status, ...(r.reason ? { reason: r.reason } : {}) },
      events: r.events,
      afterCommit: emitAll(wallet, r.changes),
    };
  }
}
