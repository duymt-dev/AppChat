// Khung đọc chính tả của ô soạn Trợ lý (TIP-023f §4.4-4.5): thông báo trước lần đầu (trình duyệt có thể gửi âm thanh tới dịch vụ nhận giọng
// của nó — AppChat không lưu âm thanh, không hứa xử lý ngoại tuyến) → đang nghe (chữ tạm in nghiêng, Dừng) → bản xem lại SỬA ĐƯỢC →
// "Chèn" (tại con trỏ nếu bản nháp chưa đổi; đổi rồi → chọn thêm vào cuối / thay). Không tự gửi. Lỗi / không hỗ trợ → gõ phím.
'use client';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useAttachmentStyles } from '../styles/attachments.styles';
import type { useAssistantDictation } from '../hooks/useAssistantDictation';

export function VoiceInput({ d }: { d: ReturnType<typeof useAssistantDictation> }) {
  const t = useTranslations('assistant.dictation');
  const { styles, cx } = useAttachmentStyles();
  const s = d.state;
  if (s.kind === 'idle') return null;
  const atCaret = s.kind === 'review' && d.canInsertAtCaret();
  return (
    <div className={styles.panel} role="status" aria-live="polite" data-testid="asst-dictation" data-state={s.kind}>
      <Icon name="ic-mic" size={13} color={color.text3} />
      <div className={styles.body}>
        {s.kind === 'consent' ? <div data-testid="asst-dictation-notice">{t('notice')}</div> : null}
        {s.kind === 'listening' ? (
          <>
            <div>{t('listening')}</div>
            {s.interim ? <div className={styles.interim} data-testid="asst-dictation-interim">{s.interim}</div> : null}
          </>
        ) : null}
        {s.kind === 'review' ? (
          <>
            <div>{atCaret ? t('review') : t('changed')}</div>
            <textarea className={styles.edit} value={s.text} aria-label={t('editLabel')} onChange={(e) => d.edit(e.target.value)} data-testid="asst-dictation-text" />
          </>
        ) : null}
        {s.kind === 'error' ? <div data-testid="asst-dictation-error">{t(`error.${s.reason}`)}</div> : null}
        <div className={styles.actions}>
          {s.kind === 'consent' ? (
            <button type="button" className={cx(styles.action, styles.primary)} onClick={d.accept} data-testid="asst-dictation-start">
              {t('start')}
            </button>
          ) : null}
          {s.kind === 'listening' ? (
            <button type="button" className={cx(styles.action, styles.primary)} onClick={d.stop} data-testid="asst-dictation-stop">
              {t('stop')}
            </button>
          ) : null}
          {s.kind === 'review' && atCaret ? (
            <button type="button" className={cx(styles.action, styles.primary)} onClick={() => d.insert('caret')} data-testid="asst-dictation-insert">
              {t('insert')}
            </button>
          ) : null}
          {s.kind === 'review' && !atCaret ? (
            <>
              <button type="button" className={cx(styles.action, styles.primary)} onClick={() => d.insert('end')} data-testid="asst-dictation-append">
                {t('append')}
              </button>
              <button type="button" className={styles.action} onClick={() => d.insert('replace')} data-testid="asst-dictation-replace">
                {t('replace')}
              </button>
            </>
          ) : null}
        </div>
      </div>
      <button type="button" className={styles.btn} onClick={d.cancel} aria-label={t('cancel')} data-testid="asst-dictation-cancel">
        <Icon name="ic-x" size={13} color={color.text3} />
      </button>
    </div>
  );
}
