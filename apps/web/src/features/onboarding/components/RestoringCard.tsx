// "Đang khôi phục workspace…" (TIP-041 pha 2, màn mới loại M — D21): workspace đã lưu trữ / đang khôi phục. Poll GET /workspace/lifecycle
// (chỉ DB nền tảng) tới khi db_status active → làm mới phiên. Bước theo lệnh restore; lỗi hết lượt hiện mã gọn + "Thử lại" (đọc lại,
// không tạo lệnh trùng — partial unique một lệnh / workspace). Cùng khung thẻ ProvisioningCard.
'use client';
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { authApi, authKeys } from '@/features/auth';
import { useOnbStyles } from '../onboarding.styles';
import { useProvisionStyles } from '../provision.styles';

/** Nhóm bước của worker → 3 dòng hiển thị (tạo DB tạm · nạp dữ liệu · kiểm tra + mở lại). */
const STEPS = [
  { k: 'create', of: ['queued', 'create'] },
  { k: 'restore', of: ['restore', 'migrate'] },
  { k: 'checks', of: ['checks', 'activate', 'done'] },
] as const;
const ERRORS = new Set(['failed', 'recovery_needed']);

export function RestoringCard() {
  const t = useTranslations('onboarding.restoring');
  const qc = useQueryClient();
  const { styles: o, cx } = useOnbStyles();
  const { styles } = useProvisionStyles();
  const { data, refetch } = useQuery({
    queryKey: ['session', 'lifecycle'],
    queryFn: authApi.lifecycle,
    refetchInterval: (q) => (q.state.data?.db_status === 'active' || ERRORS.has(q.state.data?.job?.status ?? '') ? false : 1500),
  });
  const active = data?.db_status === 'active';
  const failed = !active && ERRORS.has(data?.job?.status ?? '');
  useEffect(() => {
    if (active) void qc.invalidateQueries({ queryKey: authKeys.session });
  }, [active, qc]);
  const at = active ? STEPS.length : STEPS.findIndex((s) => (s.of as readonly string[]).includes(data?.job?.step ?? 'queued'));

  return (
    <div className={o.veil} data-testid="restoring" role="dialog" aria-modal="true" aria-busy={!failed && !active}>
      <div className={o.card} data-testid="onb-card">
        <div className={cx(o.pad, styles.pad)}>
          <div className={styles.spinner} aria-hidden="true" />
          <div className={o.title}>{t('title')}</div>
          <div className={o.sub}>{t('sub')}</div>
          <div className={styles.steps}>
            {STEPS.map((s, i) => {
              const done = i < at;
              return (
                <div key={s.k} className={styles.step} data-testid={`restoring-step-${s.k}`} data-done={done || undefined}>
                  <span className={cx(styles.dot, done && styles.dotDone)}>
                    {done ? <Icon name="ic-check" size={12} strokeWidth={2.6} color={color.white} /> : null}
                  </span>
                  {t(`steps.${s.k}`)}
                </div>
              );
            })}
          </div>
          {failed ? (
            <>
              <div className={styles.failed} data-testid="restoring-failed">
                {t('failed')}
              </div>
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
