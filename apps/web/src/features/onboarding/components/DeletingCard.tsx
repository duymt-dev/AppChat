// "Workspace đang được xoá" (TIP-041 P3, màn mới loại M — D21): Owner vừa xác nhận xoá → phiên ở `deleting`; mọi truy cập dữ liệu đã chặn
// (resolver từ chối). Thẻ chặn toàn màn: giải thích sao lưu mã hoá giữ 30 ngày + đăng xuất. Xong lệnh (tombstone) membership bị gỡ — lần
// đăng nhập sau chọn / tạo workspace khác. Lỗi lệnh hiện mã gọn (đội vận hành xử lý), không cho mở lại workspace từ đây.
'use client';
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { authApi, authKeys } from '@/features/auth';
import { transport } from '@/shared/api/client';
import { useOnbStyles } from '../onboarding.styles';
import { useProvisionStyles } from '../provision.styles';

const ERRORS = new Set(['failed', 'recovery_needed']);

export function DeletingCard() {
  const t = useTranslations('onboarding.deleting');
  const qc = useQueryClient();
  const router = useRouter();
  const { styles: o, cx } = useOnbStyles();
  const { styles } = useProvisionStyles();
  const { data } = useQuery({
    queryKey: ['session', 'lifecycle'],
    queryFn: authApi.lifecycle,
    refetchInterval: (q) => (ERRORS.has(q.state.data?.job?.status ?? '') || (q.state.data && q.state.data.db_status !== 'deleting') ? false : 5000),
    retry: false,
  });
  const failed = ERRORS.has(data?.job?.status ?? '');
  // Lỗi TRƯỚC DROP → server trả workspace về đúng trạng thái cũ (active / suspended / archived): làm mới phiên để cổng bỏ thẻ này.
  const back = !!data && data.db_status !== 'deleting' && data.db_status !== 'deleted';
  useEffect(() => {
    if (back) void qc.invalidateQueries({ queryKey: authKeys.session });
  }, [back, qc]);
  const logout = async () => {
    await transport.post('/auth/logout').catch(() => undefined);
    qc.clear();
    router.replace('/login');
  };
  return (
    <div className={o.veil} data-testid="deleting" role="dialog" aria-modal="true" aria-busy={!failed}>
      <div className={o.card} data-testid="onb-card">
        <div className={cx(o.pad, styles.pad)}>
          {failed ? null : <div className={styles.spinner} aria-hidden="true" />}
          <div className={o.title}>{t('title')}</div>
          <div className={o.sub}>{t('sub')}</div>
          {failed ? (
            <div className={styles.failed} data-testid="deleting-failed">
              {t('failed')}
            </div>
          ) : null}
          <button type="button" className={o.btn} onClick={() => void logout()} data-testid="deleting-logout">
            {t('logout')}
          </button>
        </div>
      </div>
    </div>
  );
}
