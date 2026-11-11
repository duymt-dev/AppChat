// Khay tệp đính kèm của ô soạn Trợ lý (TIP-023c 8c → TIP-023f §4.1): chip mỗi tệp — đang tải / đang đọc nội dung (huỷ) · lỗi có lý do
// (thử lại) · sẵn sàng (bỏ). Không hiện URL lưu trữ. Khay nằm ngoài popover (đóng menu ＋ không mất tệp). Input file ẩn — menu ＋ /
// Ctrl+U mở nó qua `openAttachPicker`; thả / dán tệp vào ô soạn đi cùng `onAdd`. Tệp sẵn sàng có extension đăng ký theo mime (038b: CSV
// / XLSX "Nhập dữ liệu từ tệp này") → nút gợi ý điền câu lệnh vào ô soạn (người dùng vẫn tự gửi).
'use client';
import { useTranslations } from 'next-intl';
import { Icon } from '@appchat/ui';
import { ATTACH_ACCEPT, attachmentUiFor } from '@/shared/assistant/attachment-extensions';
import { useAttachmentStyles } from '../styles/attachments.styles';
import type { DraftAttachment } from '../input-types';

export const ATTACH_INPUT_ID = 'asst-attach-input';

/** Mở hộp chọn tệp (menu ＋ / Ctrl+U). */
export const openAttachPicker = () => document.getElementById(ATTACH_INPUT_ID)?.click();

export interface AttachmentTrayProps {
  items: DraftAttachment[];
  onAdd: (files: FileList | null) => void;
  onRemove: (key: string) => void;
  onRetry: (key: string) => void;
  /** Gợi ý của extension (labelKey i18n đầy đủ) → điền ô soạn. */
  onHint?: (labelKey: string) => void;
}

export function AttachmentTray({ items, onAdd, onRemove, onRetry, onHint }: AttachmentTrayProps) {
  const t = useTranslations('assistant.attachments');
  const tr = useTranslations();
  const { styles, cx } = useAttachmentStyles();
  const busy = (x: DraftAttachment) => x.status === 'uploading' || x.status === 'preparing';
  return (
    <>
      <input
        id={ATTACH_INPUT_ID}
        type="file"
        multiple
        hidden
        accept={ATTACH_ACCEPT}
        data-testid="asst-attach-input"
        onChange={(e) => {
          onAdd(e.target.files);
          e.target.value = '';
        }}
      />
      {items.length ? (
        <div className={styles.row} data-testid="asst-attachments" aria-live="polite">
          {items.map((x) => (
            <span key={x.key} className={cx(styles.chip, x.status === 'error' && styles.chipError)} data-testid="asst-attachment" data-status={x.status}>
              <Icon name={x.mime.startsWith('image/') ? 'ic-image' : 'ic-doc'} size={13} />
              <span className={styles.name} title={x.name}>
                {x.name}
              </span>
              {busy(x) ? <span className={styles.state}>{t(x.status as 'uploading' | 'preparing')}</span> : null}
              {x.status === 'error' ? (
                <>
                  <span className={styles.state} data-testid="asst-attachment-reason">
                    {t(`reason.${x.reason ?? 'corrupt'}` as never)}
                  </span>
                  <button type="button" className={cx(styles.btn, styles.link)} onClick={() => onRetry(x.key)} data-testid="asst-attachment-retry">
                    {t('retry')}
                  </button>
                </>
              ) : null}
              {x.status === 'ready' && onHint
                ? attachmentUiFor(x.mime).map((e) => (
                    <button key={e.key} type="button" className={cx(styles.btn, styles.link)} onClick={() => onHint(e.labelKey)} data-testid="asst-attachment-hint" data-ext={e.key}>
                      {tr(e.labelKey as never)}
                    </button>
                  ))
                : null}
              <button type="button" className={styles.btn} aria-label={busy(x) ? t('cancel') : t('remove', { name: x.name })} onClick={() => onRemove(x.key)} data-testid="asst-attachment-remove">
                <Icon name="ic-x" size={12} />
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </>
  );
}
