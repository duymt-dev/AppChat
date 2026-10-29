// "Chọn gói nạp Credit" — prototype L914–926: 4 gói (credit + % tặng) → billing.create_invoice (kind credit) rồi mở hộp QR.
// Mở từ Ví (Nạp tiền), menu avatar và khi hết credit (D09 / REQ-L03).
'use client';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useFmt } from '@/shared/i18n/useFmt';
import { useBillingModalStyles } from '../styles/billing-modals.styles';
import { billingPlansQuery } from '../api';
import { useBillingUi } from '../billing-store';
import { useBuy } from '../hooks/useBuy';

export function CreditModal() {
  const t = useTranslations('settings.billing.credit');
  const fmt = useFmt();
  const { styles, cx } = useBillingModalStyles();
  const { creditOpen, set } = useBillingUi();
  const q = useQuery({ ...billingPlansQuery(), enabled: creditOpen });
  const { buy, pending } = useBuy();
  if (!creditOpen || !q.data) return null;
  const close = () => set({ creditOpen: false });
  return (
    <div className={styles.veil} onClick={close} data-testid="credit-modal">
      <div className={styles.box} role="dialog" aria-modal="true" aria-label={t('title')} onClick={(e) => e.stopPropagation()}>
        <div className={styles.head}>
          <div className={styles.grow}>
            <div className={styles.t}>{t('title')}</div>
            <div className={styles.s}>{t('sub')}</div>
          </div>
          <button type="button" className={styles.x} onClick={close} aria-label={t('close')}>
            <Icon name="ic-x" size={20} color={color.text4} />
          </button>
        </div>
        <div className={styles.packs}>
          {q.data.credit_packs.map((p) => (
            <button
              key={p.key}
              type="button"
              className={cx(styles.pack, p.popular && styles.packHot)}
              disabled={pending}
              onClick={() => void buy('credit', p.key)}
              data-testid={`credit-pack-${p.key}`}
            >
              <div className={styles.row}>
                <span className={styles.cr}>{fmt.number(p.credits)}</span>
                <span className={styles.unit}>{t('unit')}</span>
                <span className={styles.grow} />
                {p.bonus ? <span className={styles.bonus}>{t('bonus', { n: p.bonus })}</span> : null}
              </div>
              <div className={styles.approx}>{t('approx', { n: fmt.number(p.credits) })}</div>
              <div className={styles.foot}>
                <span className={styles.price}>{fmt.money(p.price)}</span>
                <span className={styles.pick}>{t('pick')}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
