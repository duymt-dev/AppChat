// Preview mua gói / gói credit / tài nguyên (TIP-023b R2.8, risk money): mặt hàng · kỳ · số tiền (+ credit); còn hoá đơn chờ cùng mặt hàng →
// dùng lại (cảnh báo `reuse:<mã>`, không sinh QR mới). Không mua được → 422 như execute. Chỉ đọc DB nền tảng. TIP-039: giá do server tính
// theo vòng đời gói (nâng giữa kỳ = chênh × kỳ còn lại, addon đồng hạn kỳ gói).
import type { PlatformDb } from '@appchat/db';
import type { ActionInput, ActionPreview, billingCreateInvoice } from '@appchat/actions';
import { created, line, preview } from '../../../kernel/actions/preview-kit';
import type { InvoicesService } from '../../payments/invoices.service';

export async function createInvoicePreview(p: Pick<PlatformDb, 'plan' | 'billingInvoice' | 'subscription'>, invoices: InvoicesService, ws: string, i: ActionInput<typeof billingCreateInvoice>): Promise<ActionPreview> {
  const q = await invoices.quote(p, ws, i);
  const amount = String(q.amount);
  // Nâng gói giữa kỳ / addon đồng hạn: thẻ xác nhận ghi rõ cách tính (giá theo phần kỳ còn lại, Credit chênh) — TIP-039.
  const snap = q.snapshot as { mode?: string; credits?: string; term_end?: string; ends_at?: string | null };
  return preview('money', line(i.item, q.months ? `${q.months}m` : null, amount), {
    changes: [
      created(
        'billing_invoice',
        { kind: i.kind, item: i.item, months: q.months ?? undefined, credits: q.credits ?? undefined, amount, mode: snap.mode, ends_at: snap.term_end ?? snap.ends_at ?? undefined },
        q.open?.id,
      ),
    ],
    ...(q.open ? { warnings: [`reuse:${q.open.code}`] } : {}),
  });
}
