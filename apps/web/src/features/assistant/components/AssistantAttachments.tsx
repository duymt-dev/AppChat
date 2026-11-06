// Hàng tệp đính kèm của ô soạn Trợ lý (TIP-023c 8c): chip mỗi tệp — đang tải (huỷ) / lỗi (thử lại) / sẵn sàng (bỏ). Không hiện URL
// lưu trữ. Input file ẩn — menu ＋ "Thêm tệp" mở nó qua `openAttachPicker`. Tệp sẵn sàng có extension đăng ký theo mime (038b: CSV / XLSX
// "Nhập dữ liệu từ tệp này") → nút gợi ý điền câu lệnh vào ô soạn (người dùng vẫn tự gửi).
'use client';
import { useTranslations } from 'next-intl';
import { Icon } from '@appchat/ui';
import { ATTACH_ACCEPT, attachmentUiFor } from '@/shared/assistant/attachment-extensions';
import { useAttachmentStyles } from '../styles/attachments.styles';
import type { PendingAttachment } from '../hooks/useAssistantAttachments';

export const ATTACH_INPUT_ID = 'asst-attach-input';

/** Mở hộp chọn tệp (menu ＋ / Ctrl+U). */
export const openAttachPicker = () => document.getElementById(ATTACH_INPUT_ID)?.click();

export interface AssistantAttachmentsProps {
  items: PendingAttachment[];
  onAdd: (files: FileList | null) => void;
  onRemove: (key: string) => void;
  onRetry: (key: string) => void;
  /** Gợi ý của extension (labelKey i18n đầy đủ) → điền ô soạn. */
  onHint?: (labelKey: string) => void;
}

export function AssistantAttachments({ items, onAdd, onRemove, onRetry, onHint }: AssistantAttachmentsProps) {
  const t = useTranslations('assistant.attachments');
  const tr = useTranslations();
  const { styles, cx } = useAttachmentStyles();
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
        <div className={styles.row} data-testid="asst-attachments">
          {items.map((x) => (
            <span key={x.key} className={cx(styles.chip, x.status === 'error' && styles.chipError)} data-testid="asst-attachment" data-status={x.status}>
              <Icon name="ic-doc" size={13} />
              <span className={styles.name} title={x.name}>
                {x.name}
              </span>
              {x.status === 'uploading' ? <span className={styles.state}>{t('uploading')}</span> : null}
              {x.status === 'error' ? (
                <button type="button" className={cx(styles.btn, styles.link)} onClick={() => onRetry(x.key)} data-testid="asst-attachment-retry">
                  {t('retry')}
                </button>
              ) : null}
              {x.status === 'ready' && onHint
                ? attachmentUiFor(x.mime).map((e) => (
                    <button key={e.key} type="button" className={cx(styles.btn, styles.link)} onClick={() => onHint(e.labelKey)} data-testid="asst-attachment-hint" data-ext={e.key}>
                      {tr(e.labelKey as never)}
                    </button>
                  ))
                : null}
              <button type="button" className={styles.btn} aria-label={x.status === 'uploading' ? t('cancel') : t('remove', { name: x.name })} onClick={() => onRemove(x.key)} data-testid="asst-attachment-remove">
                <Icon name="ic-x" size={12} />
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </>
  );
}
