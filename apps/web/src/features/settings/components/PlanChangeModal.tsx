// Xác nhận mua / đổi gói (TIP-039 AC03 / AC09, DC-367): "Chọn gói" → đọc giá server tính (`GET /billing/quote`) rồi mới tạo hoá đơn — FE
// không tự tính. Hiện đúng cách tính: mua mới (kỳ từ lúc trả) · gia hạn (nối tiếp ngày hết hạn) · nâng giữa kỳ (chênh × phần kỳ còn lại,
// giữ ngày hết hạn, Credit chênh) · đổi xuống (áp từ kỳ sau, không hoàn tiền). Còn hoá đơn chờ cùng gói → ghi rõ sẽ dùng lại. Lỗi đọc giá
// → báo, không cho mua mù. Xác nhận → billing.create_invoice (useBuy) → hộp QR; gói chỉ kích hoạt khi tiền về (paid), không phải lúc tạo.
'use client';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useFmt } from '@/shared/i18n/useFmt';
import { billQuoteQuery } from '../api';
import { useBillingUi } from '../billing-store';
import { useBuy } from '../hooks/useBuy';
import { useContactSalesStyles } from '../styles/contact-sales.styles';
import { FormModal } from './FormModal';

export function PlanChangeModal({ planName }: { planName: (key: string) => string }) {
  const t = useTranslations('settings.billing.change');
  const fmt = useFmt();
  const c = useContactSalesStyles().styles;
  const item = useBillingUi((x) => x.planChange);
  const set = useBillingUi((x) => x.set);
  const q = useQuery(billQuoteQuery(item));
  const { buy, pending } = useBuy();
  if (!item) return null;
  const close = () => set({ planChange: null });
  const d = q.data;
  const confirm = async () => {
    if (!d) return;
    set({ planChange: null });
    await buy('plan', item);
  };
  const detail = !d
    ? null
    : d.mode === 'upgrade'
      ? t('upgrade', { from: planName(d.from_plan_key ?? ''), to: planName(item), end: d.ends_at ? fmt.date(d.ends_at) : '—' })
      : d.mode === 'switch'
        ? t('switch', { plan: planName(item), at: d.starts_at ? fmt.date(d.starts_at) : '—' })
        : d.mode === 'renew'
          ? t('renew', { at: d.starts_at ? fmt.date(d.starts_at) : '—' })
          : t('new', { n: d.months ?? 1 });
  return (
    <FormModal
      open
      title={t('title', { plan: planName(item) })}
      onClose={close}
      onSave={() => void confirm()}
      saveLabel={t('confirm')}
      cancelLabel={t('cancel')}
      closeLabel={t('close')}
      pending={pending || !d}
      testId="plan-change-modal"
    >
      {q.isError ? (
        <div role="alert" className={c.err} data-testid="plan-change-error">
          {t('error')}
        </div>
      ) : !d ? (
        <p className={c.sub}>{t('loading')}</p>
      ) : (
        <>
          <p className={c.sub} data-testid="plan-change-mode" data-mode={d.mode}>
            {detail}
          </p>
          <p data-testid="plan-change-amount">
            <b>{fmt.money(d.amount)}</b>
            {d.mode === 'upgrade' && d.credits ? ` · ${t('credits', { n: fmt.number(d.credits) })}` : null}
          </p>
          {d.open ? <p className={c.sub} data-testid="plan-change-reuse">{t('reuse', { code: d.open.code })}</p> : null}
          <p className={c.sub}>{t('note')}</p>
        </>
      )}
    </FormModal>
  );
}
