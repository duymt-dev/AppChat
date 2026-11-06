// Trang huỷ nhận tin chiến dịch công khai `/campaign/unsubscribe?t=<token>` (TIP-037, REQ-I03) — link ở cuối mỗi tin chiến dịch. Mở trang
// chỉ ĐỌC (GET không ghi gì); khách bấm xác nhận → POST …/confirm (server kiểm token ký, chỉ đặt marketing_opt_out). Không cần đăng nhập,
// không hiện thông tin khách. Token sai / hết hạn → thẻ "liên kết không còn hiệu lực". Không có prototype (màn mới — như trang ký D25).
'use client';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { transport } from '@/shared/api/client';
import { useUnsubStyles } from '../styles/unsubscribe.styles';

type View = { business: string; unsubscribed: boolean };
const path = (token: string) => `/public/campaign-unsubscribe/${encodeURIComponent(token)}`;

export function UnsubscribeConfirm({ token }: { token: string }) {
  const t = useTranslations('marketing.unsub');
  const { styles } = useUnsubStyles();
  const q = useQuery({ queryKey: ['public-unsub', token], queryFn: () => transport.get<View>(path(token)), enabled: !!token, retry: false });
  const confirm = useMutation({ mutationFn: () => transport.post<View>(`${path(token)}/confirm`, {}) });
  const v = confirm.data ?? q.data;
  return (
    <div className={styles.page} data-testid="unsub-page">
      <div className={styles.wrap}>
        {q.isLoading ? null : !v ? (
          <div className={styles.card} data-testid="unsub-invalid">
            <div className={styles.h1}>{t('invalidTitle')}</div>
            <div className={styles.muted}>{t('invalidSub')}</div>
          </div>
        ) : (
          <div className={styles.card}>
            <div className={styles.biz}>{v.business}</div>
            {v.unsubscribed ? (
              <>
                <div className={styles.h1} data-testid="unsub-done">
                  {t('doneTitle')}
                </div>
                <div className={styles.muted}>{t('doneSub', { biz: v.business })}</div>
              </>
            ) : (
              <>
                <div className={styles.h1}>{t('title')}</div>
                <div className={styles.muted}>{t('sub', { biz: v.business })}</div>
                {confirm.isError ? <div className={styles.warn}>{t('error')}</div> : null}
                <button type="button" className={styles.primary} disabled={confirm.isPending} onClick={() => confirm.mutate()} data-testid="unsub-confirm">
                  {t('confirm')}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
