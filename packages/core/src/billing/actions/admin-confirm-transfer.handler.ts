// admin.invoice.confirm_transfer (db platform, platform_admin, money) — duyệt chuyển khoản thủ công (REQ-L04): hoá đơn còn chờ
// (pending / pending_review / expired) → paid (method bank_transfer, confirmed_by) rồi ghi nhận (kích hoạt gói / cộng credit) SAU
// commit (`afterCommit`). Hoá đơn thuộc workspace bất kỳ; chạy ở ngữ cảnh nền tảng (TIP-040, DC-368 — thay DC-054): audit nền tảng ghi
// workspace của hoá đơn, không cần membership của admin. Đã paid / huỷ → 409.
import { Inject, Injectable } from '@nestjs/common';
import type { PlatformDb } from '@appchat/db';
import { AppError } from '@appchat/shared';
import type { ActionInput, adminInvoiceConfirmTransfer } from '@appchat/actions';
import type { PlatformTx } from '../../kernel/actions/action-context';
import { ActionHandler } from '../../kernel/actions/handler';
import { PlatformActionHandler, type PlatformContext, type AdminOutcome } from '../../kernel/actions/platform-context';
import { confirmTransferPreview } from './previews/admin-confirm-transfer.handler.preview';
import { InvoiceFulfiller } from '../payments/fulfil';

type Input = ActionInput<typeof adminInvoiceConfirmTransfer>;
type Output = { invoice_id: string; status: 'paid' };

@Injectable()
@ActionHandler('admin.invoice.confirm_transfer')
export class AdminConfirmTransferHandler extends PlatformActionHandler<Input, Output> {
  constructor(@Inject(InvoiceFulfiller) private readonly fulfiller: InvoiceFulfiller | null) {
    super();
  }

  async executePlatform(ctx: PlatformContext, input: Input, ptx: PlatformTx): Promise<AdminOutcome<Output>> {
    if (!this.fulfiller) throw new AppError('INTERNAL', 500, undefined, 'admin.invoice.confirm_transfer cần InvoiceFulfiller');
    const inv = await ptx.billingInvoice.findUnique({ where: { id: input.invoice_id } });
    if (!inv) throw new AppError('NOT_FOUND', 404, { invoice_id: 'not_found' });
    if (!(await this.fulfiller.markPaid(ptx, inv.id, { method: 'bank_transfer', confirmedBy: ctx.actor.id }))) throw new AppError('CONFLICT', 409, { status: inv.status });
    const fulfiller = this.fulfiller;
    return {
      // Ghi nhận cần transaction riêng của ví / subscription → sau commit; lỗi / tiến trình chết giữa chừng → scheduler quét hoá
      // đơn paid chưa ghi nhận (DC-055).
      afterCommit: async () => void (await fulfiller.fulfil(inv.id)),
      result: { invoice_id: inv.id, status: 'paid' },
      targetWorkspaceId: inv.workspaceId,
      before: { invoice_id: inv.id, workspace_id: inv.workspaceId, status: inv.status },
      after: { invoice_id: inv.id, workspace_id: inv.workspaceId, status: 'paid', note: input.note ?? null },
    };
  }

  async previewPlatform(_ctx: PlatformContext, input: Input, db: PlatformDb) {
    return confirmTransferPreview(db, input);
  }
}
