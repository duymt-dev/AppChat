// Hộp "Thử nghiệm tính điểm" (560px) — prototype L4639–4664. Công thức COMMERCE §7: floor(số tiền thực trả trước VAT / 10.000) × hệ số hạng
// — tính bằng `earnPoints` dùng chung server / mock.
'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { earnPoints } from '@appchat/shared';
import { Icon, color } from '@appchat/ui';
import { useModalStyles } from '../styles/modal.styles';
import { useLoyaltyUi } from '../loyalty-store';
import { loyaltyConfigQuery } from '../api';
import { pts } from '../status';

const SAMPLE = '2000000';

export function SimulatorModal() {
  const open = useLoyaltyUi((s) => s.sim);
  const cfg = useQuery({ ...loyaltyConfigQuery(), enabled: open }).data;
  const t = useTranslations('loyalty');
  const { styles, cx } = useModalStyles();
  const set = useLoyaltyUi((s) => s.set);
  const [tier, setTier] = useState('gold');
  const [amount, setAmount] = useState(SAMPLE);
  if (!open || !cfg) return null;
  const close = () => set({ sim: false });
  // Cùng hàm với server (packages/shared loyalty/math — TIP-036): floor(floor(net / 10.000) × hệ số).
  const { base, mult: m, points: total } = earnPoints(BigInt(parseInt(amount, 10) || 0), tier, cfg.tiers);
  return (
    <div className={styles.veil} onClick={close} data-testid="ly-sim">
      <div className={cx(styles.box, styles.w560)} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className={styles.head}>
          <div className={styles.grow}>
            <div className={styles.hT}>{t('sim.title')}</div>
            <div className={styles.hS}>{t('sim.sub')}</div>
          </div>
          <button type="button" className={styles.x} onClick={close} aria-label={t('sim.close')}>
            <Icon name="ic-x" size={18} color={color.text3} />
          </button>
        </div>
        <div className={styles.body}>
          <div className={styles.two}>
            <div>
              <div className={styles.label}>{t('sim.tier')}</div>
              <select className={styles.select} value={tier} onChange={(e) => setTier(e.target.value)} data-testid="ly-sim-tier">
                {cfg.tiers.map((x) => (
                  <option key={x.key} value={x.key}>
                    {t(`tier.${x.key}`)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className={styles.label}>{t('sim.amount')}</div>
              <input
                className={styles.input}
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
                inputMode="numeric"
                data-testid="ly-sim-amount"
              />
            </div>
          </div>
          <div className={styles.res}>
            <div className={styles.resH}>{t('sim.applied')}</div>
            <div className={styles.resRow}>
              <span className={styles.grow}>{t('sim.base')}</span>
              <b>{`+${pts(base)}`}</b>
            </div>
            {m > 1 ? (
              <div className={styles.resRow}>
                <span className={styles.grow}>{t('sim.mult', { t: t(`tier.${tier}`), m: String(m).replace('.', ',') })}</span>
                <b>{`+${pts(total - base)}`}</b>
              </div>
            ) : null}
            <div className={styles.resTot}>
              <span className={styles.grow}>{t('sim.total')}</span>
              <b data-testid="ly-sim-total">{pts(total)}</b>
            </div>
          </div>
          <div className={styles.muted}>{t('sim.note')}</div>
        </div>
        <div className={styles.foot}>
          <span className={styles.grow} />
          <button type="button" className={styles.ghost} onClick={close}>
            {t('sim.done')}
          </button>
        </div>
      </div>
    </div>
  );
}
