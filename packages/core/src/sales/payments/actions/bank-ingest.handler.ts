// bank_feed.ingest (TIP-012b P2, DC-383) — CHỈ hệ thống (actor `system:bank-ingress`, nguồn system từ consumer ROLE=jobs): một biên
// nhận đã xác thực → claim (FOR UPDATE, phải còn `accepted`) → kiểm lại feed hiện tại (còn bật, đúng provider + tài khoản) → khớp / ghi
// nhận theo luật hiện có (bank/reconcile.ts) → biên nhận `processed` + bank_tx CÙNG transaction. Biên nhận đã xử lý → trả kết quả cũ
// (`duplicate`), không ghi lần hai. Feed đã ngắt / đổi tài khoản → `ignored` (giữ bằng chứng, không ghi nhận tiền).
import { Inject, Injectable, Optional } from '@nestjs/common';
import { AppError } from '@appchat/shared';
import type { PlatformDb } from '@appchat/db';
import type { ActionInput, bankFeedIngest } from '@appchat/actions';
import { accountOrEmpty } from '@appchat/integrations';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../../kernel/actions/handler';
import { CLOCK, type Clock } from '../../../kernel/clock';
import { PLATFORM_DB } from '../../../kernel/tenant/tenant.providers';
import { reconcileBankTx } from '../bank/reconcile';

export const BANK_INGRESS_ACTOR = 'bank-ingress';

type Out = { status: 'matched' | 'review' | 'ignored' | 'duplicate'; bank_tx_id: string | null };

@Injectable()
@ActionHandler('bank_feed.ingest')
export class BankFeedIngestHandler implements Handler<ActionInput<typeof bankFeedIngest>, Out> {
  constructor(
    @Inject(CLOCK) private readonly clock: Clock,
    @Optional() @Inject(PLATFORM_DB) private readonly platform: PlatformDb | undefined,
  ) {}

  /** Callback hệ thống không có thẻ xác nhận — chặn ngay ở preview. */
  async preview(ctx: ActionContext): Promise<never> {
    throw new AppError('FORBIDDEN', 403, { source: ctx.source });
  }

  async execute(ctx: ActionContext, i: ActionInput<typeof bankFeedIngest>, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    if (ctx.source !== 'system' || ctx.actor.type !== 'system' || ctx.actor.id !== BANK_INGRESS_ACTOR) throw new AppError('FORBIDDEN', 403, { source: ctx.source });
    const [r] = await tx.$queryRaw<{ id: string; status: string; bank_tx_id: string | null }[]>`
      SELECT id, status::text AS status, bank_tx_id FROM bank_receipt WHERE id = ${i.receipt_id}::uuid FOR UPDATE`;
    if (!r) throw new AppError('NOT_FOUND', 404, { receipt_id: 'not_found' });
    if (r.status !== 'accepted') return { result: { status: r.status === 'processed' ? 'duplicate' : 'ignored', bank_tx_id: r.bank_tx_id } };
    const rc = await tx.bankReceipt.findUniqueOrThrow({ where: { id: r.id } });
    const now = this.clock.now();
    const feed = await tx.tenantBankFeed.findUnique({ where: { id: rc.feedId } });
    // Kiểm lại ở lúc xử lý (không tin trạng thái lúc nhận): feed còn bật + đúng provider + đúng tài khoản đang gắn.
    if (!feed || feed.status !== 'active' || feed.provider !== rc.provider || accountOrEmpty(feed.accountNo) !== rc.accountNo) {
      await tx.bankReceipt.update({ where: { id: rc.id }, data: { status: 'ignored', reason: 'feed_inactive', processedAt: now } });
      return { result: { status: 'ignored', bank_tx_id: null } };
    }
    const w = await this.platform?.workspace.findUnique({ where: { id: ctx.workspaceId }, select: { timezone: true } });
    const out = await reconcileBankTx(tx, ctx.workspaceId, { feedId: feed.id, externalId: rc.externalId, accountNo: rc.accountNo, amount: rc.amount, content: rc.content, occurredAt: rc.occurredAt }, now, w?.timezone ?? 'Asia/Ho_Chi_Minh');
    await tx.bankReceipt.update({ where: { id: rc.id }, data: { status: 'processed', bankTxId: out.bankTxId, processedAt: now } });
    return { result: { status: out.status, bank_tx_id: out.bankTxId } };
  }
}
