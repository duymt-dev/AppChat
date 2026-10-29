// Thông báo hết trial — prototype L716–737. Đóng được (X / bấm nền / Esc); tài khoản đã về gói Miễn phí.
'use client';
import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useOnbStyles } from '../onboarding.styles';
import { useTrialStyles } from '../trial.styles';

const LOCKS = ['1', '2', '3', '4'] as const;

export interface TrialExpiredProps {
  onClose: () => void;
  onUpgrade: () => void;
}

export function TrialExpired({ onClose, onUpgrade }: TrialExpiredProps) {
  const t = useTranslations('onboarding.expired');
  const { styles: o, cx } = useOnbStyles();
  const { styles } = useTrialStyles();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className={cx(o.veil, o.veilDark, styles.expiredZ)} onClick={onClose} data-testid="trial-expired" role="dialog" aria-modal="true">
      <div className={cx(styles.card, styles.cardSm)} data-testid="onb-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className={styles.close} onClick={onClose} aria-label={t('close')} data-testid="trial-expired-close">
          <Icon name="ic-x" size={16} strokeWidth={2.2} />
        </button>
        <div className={styles.exHead}>
          <div className={styles.exIcon}>
            <Icon name="ic-clock" size={24} strokeWidth={2} color={color.dangerDeep} />
          </div>
          <div className={styles.exTitle}>{t('title')}</div>
          <div className={styles.exBody}>{t.rich('body', { b: (c) => <b>{c}</b> })}</div>
        </div>
        <div className={styles.exPad}>
          <div className={styles.locks}>
            {LOCKS.map((k) => (
              <div key={k} className={styles.lock}>
                <Icon name="ic-x" size={14} strokeWidth={2.3} color={color.dangerDeep} />
                {t(`locks.${k}`)}
              </div>
            ))}
          </div>
          <button type="button" className={styles.cta} onClick={onUpgrade} data-testid="trial-upgrade">
            {t('upgrade')}
            <Icon name="ic-arrow" size={16} strokeWidth={2.2} color={color.white} />
          </button>
          <div className={cx(styles.foot, styles.footTight)}>{t('note')}</div>
        </div>
      </div>
    </div>
  );
}
