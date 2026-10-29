// Tab "Nạp tiền" của Ví — prototype L6479–6530: Gói dịch vụ (segment + 4 thẻ), So sánh chi tiết, cửa hàng (Nạp credit · Tài nguyên).
// Bỏ "Tất cả / Dịch vụ chuyên nghiệp" và thẻ ZNS / SMS / Voice / token theo model (OUT, D29); mua thêm chỉ credit + người dùng / kênh
// (billing_invoice.kind credits | addon). Mọi nút mua → billing.create_invoice → hộp QR.
'use client';
import { useQuery } from '@tanstack/react-query';
import { App } from 'antd';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useFmt } from '@/shared/i18n/useFmt';
import { useMe } from '@/shared/shell/useShellData';
import { PageStates, stateOf } from '@/shared/states/PageStates';
import { useWalletStyles } from '../styles/wallet.styles';
import { billingPlansQuery } from '../api';
import { useBillingUi } from '../billing-store';
import { useBuy } from '../hooks/useBuy';
import { PlanCards } from './PlanCards';
import { PlanCompare, PlanSeg } from './PlanCompare';

const SHOP = ['credit', 'addon'] as const;

export function WalletShop() {
  const t = useTranslations('settings.wallet');
  const fmt = useFmt();
  const { message } = App.useApp();
  const { styles, cx } = useWalletStyles();
  const { seg, shopTab, set } = useBillingUi();
  const q = useQuery(billingPlansQuery());
  const me = useMe().data;
  const { buy, pending } = useBuy();
  return (
    <PageStates state={stateOf(q)} onRetry={() => void q.refetch()}>
      {q.data ? (
        <>
          <div className={styles.head}>
            <div className={styles.h}>{t('plans')}</div>
            <PlanSeg value={seg} onChange={(s) => set({ seg: s })} />
          </div>
          <div className={styles.block}>
            <PlanCards plans={q.data.plans[seg]} trial={{ key: 'personal_pro', days: me?.billing.trial_days_left ?? 0 }} onContact={() => void message.info(t('contacted'))} />
          </div>
          <div className={styles.block}>
            <PlanCompare cat={q.data} />
          </div>
          <div className={styles.shop}>
            {SHOP.map((k) => (
              <button key={k} type="button" aria-pressed={shopTab === k} onClick={() => set({ shopTab: k })} data-testid={`wal-shop-${k}`}>
                {t(`shop.${k}`)}
              </button>
            ))}
          </div>
          {shopTab === 'credit' ? (
            <>
              <div className={styles.h}>{t('creditT')}</div>
              <div className={styles.hint}>{t('creditHint')}</div>
              <div className={styles.packs}>
                {q.data.credit_packs.map((p) => (
                  <div key={p.key} className={cx(styles.pack, p.popular && styles.packHot)}>
                    <div className={styles.pRow}>
                      <span className={styles.cr}>{fmt.number(p.credits)}</span>
                      <span className={styles.unit}>{t('unit')}</span>
                      {p.bonus ? <span className={styles.bonus}>{t('bonus', { n: p.bonus })}</span> : null}
                    </div>
                    <div className={styles.approx}>{t('approx', { n: fmt.number(p.credits) })}</div>
                    <div className={styles.pFoot}>
                      <span className={styles.price}>{fmt.money(p.price)}</span>
                      <button type="button" className={styles.buy} disabled={pending} onClick={() => void buy('credit', p.key)} data-testid={`wal-buy-${p.key}`}>
                        {t('topupBtn')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className={styles.h}>{t('addonT')}</div>
              <div className={styles.hint}>{t('addonHint')}</div>
              <div className={styles.packs}>
                {q.data.addons.map((a) => (
                  <div key={a.key} className={styles.pack} data-addon={a.kind}>
                    <div className={styles.cr}>{t(`addon.${a.kind}`)}</div>
                    <div className={styles.approx}>{t(`addonD.${a.kind}`)}</div>
                    <div className={styles.pFoot}>
                      <span className={styles.price}>
                        {fmt.money(a.price)}
                        {t('perMonth')}
                      </span>
                      <button type="button" className={styles.buy} disabled={pending} onClick={() => void buy('addon', a.key)} data-testid={`wal-buy-${a.key}`}>
                        <Icon name="ic-plus" size={13} color={color.white} strokeWidth={2} />
                        {t('buy')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      ) : null}
    </PageStates>
  );
}
