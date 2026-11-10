// Xem lại ảnh chụp màn hình trước khi đính kèm (TIP-023f §4.3): cảnh báo dữ liệu nhạy cảm đang hiện trên màn hình; "Đính kèm" → khay
// (chưa gửi); Bỏ → giải phóng ảnh. Từ chối quyền / huỷ / trình duyệt không hỗ trợ (kể cả di động) → gợi ý chọn ảnh thủ công.
'use client';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useAttachmentStyles } from '../styles/attachments.styles';
import type { CaptureState } from '../input-types';

export function AttachmentPreview({ state, onAccept, onCancel, onPickFile }: { state: CaptureState; onAccept: () => void; onCancel: () => void; onPickFile: () => void }) {
  const t = useTranslations('assistant.capture');
  const { styles, cx } = useAttachmentStyles();
  if (state.kind === 'idle') return null;
  return (
    <div className={styles.panel} role="status" data-testid="asst-capture" data-state={state.kind}>
      <Icon name="ic-image" size={13} color={color.text3} />
      <div className={styles.body}>
        {state.kind === 'busy' ? t('busy') : null}
        {state.kind === 'error' ? t(state.reason) : null}
        {state.kind === 'review' ? (
          <>
            <img src={state.url} alt={t('alt')} className={styles.shot} data-testid="asst-capture-img" />
            <div>{t('warn')}</div>
          </>
        ) : null}
        <div className={styles.actions}>
          {state.kind === 'review' ? (
            <button type="button" className={cx(styles.action, styles.primary)} onClick={onAccept} data-testid="asst-capture-accept">
              {t('accept')}
            </button>
          ) : null}
          {state.kind === 'error' ? (
            <button type="button" className={styles.action} onClick={() => (onCancel(), onPickFile())} data-testid="asst-capture-fallback">
              {t('fallback')}
            </button>
          ) : null}
        </div>
      </div>
      <button type="button" className={styles.btn} onClick={onCancel} aria-label={t('cancel')} data-testid="asst-capture-cancel">
        <Icon name="ic-x" size={13} color={color.text3} />
      </button>
    </div>
  );
}
