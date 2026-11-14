// Mua gói / credit / tài nguyên: billing.create_invoice (risk money → Idempotency-Key ở useAction) rồi mở hộp QR của hoá đơn vừa tạo.
'use client';
import { useAction } from '@/shared/actions/useAction';
import { useBillingUi } from '../billing-store';

export function useBuy() {
  const create = useAction<{ invoice_id: string }>('billing.create_invoice');
  const set = useBillingUi((s) => s.set);
  const buy = async (kind: 'plan' | 'credit' | 'addon', item: string) => {
    const r = await create.run({ kind, item }, { silent: true });
    if (r) set({ invoiceId: r.result.invoice_id, upgradeOpen: false, creditOpen: false });
  };
  return { buy, pending: create.isPending };
}
