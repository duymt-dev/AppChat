// wallet.update_alerts (TIP-039 pha 2, D24) — bật / tắt nhắc Credit 80% / 95% (`credit_wallet.low_alert`) trong PlatformTx của action
// (billing.manage, risk config). Chỉ đổi việc NHẮC: tắt nhắc không tắt chặn AI khi hết Credit, không tự nạp, không đổi giá. Ghi before /
// after cho audit; `invalidates: ['billing']` làm mới màn Ví.
import { Inject, Injectable, Optional } from '@nestjs/common';
import { AppError } from '@appchat/shared';
import type { PlatformDb } from '@appchat/db';
import type { ActionInput, walletUpdateAlerts } from '@appchat/actions';
import type { ActionContext, PlatformTx, TenantTx } from '../../kernel/actions/action-context';
import {
  ActionHandler,
  type ActionHandler as Handler,
  type HandlerOutcome,
} from '../../kernel/actions/handler';
import { line, preview, updated } from '../../kernel/actions/preview-kit';
import { PLATFORM_DB } from '../../kernel/tenant/tenant.providers';

type Input = ActionInput<typeof walletUpdateAlerts>;

@Injectable()
@ActionHandler('wallet.update_alerts')
export class WalletUpdateAlertsHandler implements Handler<Input, { ok: boolean }> {
  constructor(@Optional() @Inject(PLATFORM_DB) private readonly platform?: PlatformDb) {}

  async execute(
    ctx: ActionContext,
    input: Input,
    _tx: TenantTx,
    ptx?: PlatformTx,
  ): Promise<HandlerOutcome<{ ok: boolean }>> {
    if (!ptx) throw new AppError('INTERNAL', 500, undefined, 'wallet.update_alerts cần PlatformTx');
    // Ví tạo lười (như WalletService) rồi khoá dòng — hai lần bật / tắt song song ghi before đúng thứ tự.
    await ptx.creditWallet.upsert({
      where: { workspaceId: ctx.workspaceId },
      create: { workspaceId: ctx.workspaceId },
      update: {},
    });
    const rows = await ptx.$queryRaw<
      { low_alert: boolean }[]
    >`SELECT low_alert FROM credit_wallet WHERE workspace_id = ${ctx.workspaceId}::uuid FOR UPDATE`;
    if (!rows[0]) throw new AppError('NOT_FOUND', 404, { wallet: 'not_found' });
    const before = { low_alert: rows[0].low_alert };
    if (before.low_alert !== input.low_alert)
      await ptx.creditWallet.update({
        where: { workspaceId: ctx.workspaceId },
        data: { lowAlert: input.low_alert },
      });
    return { result: { ok: true }, before, after: { low_alert: input.low_alert } };
  }

  async preview(ctx: ActionContext, input: Input) {
    // Chưa có ví = mặc định bật nhắc (cùng giá trị màn Ví hiển thị).
    const cur = await this.platform?.creditWallet.findUnique({
      where: { workspaceId: ctx.workspaceId },
      select: { lowAlert: true },
    });
    return preview('config', line('low_alert', input.low_alert ? 'on' : 'off'), {
      changes: updated(
        'credit_wallet',
        ctx.workspaceId,
        { low_alert: cur?.lowAlert ?? true },
        { low_alert: input.low_alert },
      ),
    });
  }
}
