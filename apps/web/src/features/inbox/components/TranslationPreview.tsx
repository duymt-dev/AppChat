// Xem trước bản dịch tin soạn (TIP-025b §F.3): nguyên văn + bản dịch; chỉ "Gửi bản dịch" mới gửi (message.send). Huỷ giữ nguyên nháp;
// lỗi / hết credit → báo và cho thử lại hoặc gửi nguyên văn — không bao giờ tự gửi.
'use client';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useAssistStyles } from '../styles/assist.styles';
import type { DraftXl } from '../hooks/useDraftTranslation';

export interface TranslationPreviewProps {
  state: DraftXl;
  busy: boolean;
  onSendTranslated: (text: string) => void;
  onSendOriginal: () => void;
  onRetry: () => void;
  onCancel: () => void;
}

export function TranslationPreview({ state, busy, onSendTranslated, onSendOriginal, onRetry, onCancel }: TranslationPreviewProps) {
  const t = useTranslations('inbox.composer.xl');
  const { styles, cx } = useAssistStyles();
  if (state.kind === 'idle') return null;
  return (
    <div className={styles.bar} role="status" data-testid="xl-preview">
      <Icon name="ic-globe" size={13} color={color.blue} />
      <div className={styles.body}>
        {state.kind === 'pending' ? t('pending') : null}
        {state.kind === 'error' ? t('failed') : null}
        {state.kind === 'preview' ? (
          <>
            <div data-testid="xl-original">{state.original}</div>
            <div className={styles.translated} data-testid="xl-translated">{state.text}</div>
          </>
        ) : null}
      </div>
      {state.kind === 'preview' ? (
        <button type="button" className={cx(styles.btn, styles.primary)} disabled={busy} onClick={() => onSendTranslated(state.text)} data-testid="xl-send">
          {t('sendTranslated')}
        </button>
      ) : null}
      {state.kind === 'error' ? (
        <>
          <button type="button" className={styles.btn} onClick={onRetry} data-testid="xl-retry">
            {t('retry')}
          </button>
          <button type="button" className={styles.btn} disabled={busy} onClick={onSendOriginal} data-testid="xl-send-original">
            {t('sendOriginal')}
          </button>
        </>
      ) : null}
      <button type="button" className={styles.btn} onClick={onCancel} aria-label={t('cancel')} data-testid="xl-cancel">
        <Icon name="ic-x" size={13} color={color.text3} />
      </button>
    </div>
  );
}
