// Hộp form gọn của Cài đặt — prototype L7643–7660 (Mời thành viên 460px): đầu tiêu đề 18 + ✕, thân 20 cột gap 12, chân Huỷ / Lưu.
// Dùng chung cho thành viên, thẻ, câu trả lời mẫu, kết nối nền tảng. < md: toàn màn.
'use client';
import type { ReactNode } from 'react';
import { Icon, color } from '@appchat/ui';
import { useFormModalStyles } from '../styles/form-modal.styles';

interface Props {
  open: boolean;
  title: string;
  onClose: () => void;
  onSave: () => void;
  saveLabel: string;
  cancelLabel: string;
  closeLabel: string;
  children: ReactNode;
  pending?: boolean;
  wide?: boolean;
  testId?: string;
}

export function FormModal(p: Props) {
  const { styles, cx } = useFormModalStyles();
  if (!p.open) return null;
  return (
    <div className={styles.veil} onClick={p.onClose} data-testid={p.testId}>
      <div className={cx(styles.box, p.wide && styles.wide)} role="dialog" aria-modal="true" aria-label={p.title} onClick={(e) => e.stopPropagation()}>
        <div className={styles.head}>
          <div className={styles.title}>{p.title}</div>
          <span className={styles.grow} />
          <button type="button" className={styles.x} onClick={p.onClose} aria-label={p.closeLabel}>
            <Icon name="ic-x" size={18} color={color.text4} />
          </button>
        </div>
        <div className={styles.body}>{p.children}</div>
        <div className={styles.foot}>
          <span className={styles.grow} />
          <button type="button" className={styles.ghost} onClick={p.onClose}>
            {p.cancelLabel}
          </button>
          <button type="button" className={styles.primary} onClick={p.onSave} disabled={p.pending} data-testid={p.testId ? `${p.testId}-save` : undefined}>
            {p.saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
