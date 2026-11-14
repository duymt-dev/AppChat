// Thông báo xung đột khi sửa đơn (TIP-032c §4.1): bản ghi vừa được người khác sửa (409 STALE_VERSION) — nội dung đang nhập giữ nguyên,
// người dùng chủ động "Tải lại" để xem bản mới; không tự lưu lại / thử lại.
'use client';
import { useTranslations } from 'next-intl';
import { useOrderFormStyles } from '../styles/form.styles';

export function OrderEditConflict({ onReload }: { onReload: () => void }) {
  const t = useTranslations('orders.form');
  const { styles, cx } = useOrderFormStyles();
  return (
    <div className={styles.err} role="alert" data-testid="od-conflict">
      <b>{t('conflictTitle')}</b> {t('conflictBody')}{' '}
      <button type="button" className={cx(styles.btn)} onClick={onReload} data-testid="od-conflict-reload">
        {t('conflictReload')}
      </button>
    </div>
  );
}
