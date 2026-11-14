// "Đang khởi tạo workspace…" (màn mới, loại M — D21): poll GET /workspaces/:id/provisioning tới khi ready.
// Cùng pattern thẻ popup onboarding (token + layout prototype L739).
'use client';
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { authApi, authKeys } from '@/features/auth';
import { useOnbStyles } from '../onboarding.styles';
import { useProvisionStyles } from '../provision.styles';

const STEPS = ['db', 'seed', 'trial'] as const;

export function ProvisioningCard() {
  const t = useTranslations('onboarding.provisioning');
  const qc = useQueryClient();
  const { styles: o, cx } = useOnbStyles();
  const { styles } = useProvisionStyles();
  const { data, refetch } = useQuery({
    queryKey: ['session', 'provisioning'],
    queryFn: authApi.provisioning,
    refetchInterval: (q) => (q.state.data?.status === 'running' ? 1200 : false),
  });
  const status = data?.status ?? 'running';
  useEffect(() => {
    if (status === 'ready') void qc.invalidateQueries({ queryKey: authKeys.session });
  }, [status, qc]);

  return (
    <div className={o.veil} data-testid="provisioning" role="dialog" aria-modal="true" aria-busy={status === 'running'}>
      <div className={o.card} data-testid="onb-card">
        <div className={cx(o.pad, styles.pad)}>
          <div className={styles.spinner} aria-hidden="true" />
          <div className={o.title}>{t('title')}</div>
          <div className={o.sub}>{t('sub')}</div>
          <div className={styles.steps}>
            {STEPS.map((k, i) => {
              const done = status === 'ready' || (status === 'running' && i === 0 && data !== undefined);
              return (
                <div key={k} className={styles.step}>
                  <span className={cx(styles.dot, done && styles.dotDone)}>
                    {done ? <Icon name="ic-check" size={12} strokeWidth={2.6} color={color.white} /> : null}
                  </span>
                  {t(`steps.${k}`)}
                </div>
              );
            })}
          </div>
          {status === 'failed' ? (
            <>
              <div className={styles.failed}>{t('failed')}</div>
              <button type="button" className={o.btn} onClick={() => void refetch()}>
                {t('retry')}
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
