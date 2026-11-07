// Xem trước ảnh chụp màn hình trước khi đính kèm (TIP-025b §F.4): cảnh báo dữ liệu nhạy cảm đang hiện trên màn hình; Chấp nhận → tệp chờ
// gửi (chưa gửi); Bỏ → giải phóng ảnh. Huỷ / từ chối quyền / trình duyệt không hỗ trợ (kể cả di động) → gợi ý đính kèm tệp thường.
'use client';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useAssistStyles } from '../styles/assist.styles';
import type { CaptureState } from '../hooks/useInboxCapture';

export function CapturePreview({ state, onAccept, onCancel, onPickFile }: { state: CaptureState; onAccept: () => void; onCancel: () => void; onPickFile: () => void }) {
  const t = useTranslations('inbox.composer.capture');
  const { styles, cx } = useAssistStyles();
  if (state.kind === 'idle') return null;
  return (
    <div className={styles.bar} role="status" data-testid="capture-preview">
      <Icon name="ic-image" size={13} color={color.text3} />
      <div className={styles.body}>
        {state.kind === 'busy' ? t('busy') : null}
        {state.kind === 'error' ? t(state.reason) : null}
        {state.kind === 'preview' ? (
          <>
            <img src={state.url} alt={t('alt')} className={styles.shot} data-testid="capture-img" />
            <div>{t('warn')}</div>
          </>
        ) : null}
      </div>
      {state.kind === 'preview' ? (
        <button type="button" className={cx(styles.btn, styles.primary)} onClick={onAccept} data-testid="capture-accept">
          {t('accept')}
        </button>
      ) : null}
      {state.kind === 'error' ? (
        <button type="button" className={styles.btn} onClick={() => (onCancel(), onPickFile())} data-testid="capture-fallback">
          {t('fallback')}
        </button>
      ) : null}
      <button type="button" className={styles.btn} onClick={onCancel} aria-label={t('cancel')} data-testid="capture-cancel">
        <Icon name="ic-x" size={13} color={color.text3} />
      </button>
    </div>
  );
}
