// Phần phụ của ô soạn (TIP-025): chip tệp chờ gửi (tải lên → ✓, bấm × bỏ) và gợi ý thành viên khi gõ `@` trong ghi chú nội bộ
// (chọn → chèn "@Tên " + lưu user id để `note.add { mentions }`).
'use client';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useComposerStyles } from '../styles/composer.styles';
import { usePopStyles } from '../styles/popover.styles';
import { mentionMembersQuery } from '../api';
import type { PendingFile } from '../hooks/useComposerFiles';

export function FileChips({ files, onRemove }: { files: PendingFile[]; onRemove: (key: string) => void }) {
  const t = useTranslations('inbox.composer');
  const { styles } = useComposerStyles();
  if (!files.length) return null;
  return (
    <div className={styles.replyBar} data-testid="composer-files">
      {files.map((f) => (
        <span key={f.key} className={styles.grow} data-testid="composer-file">
          <Icon name={f.file_id ? 'ic-check' : 'ic-refresh'} size={12} color={f.file_id ? color.brand : color.text4} /> {f.name}
          <button type="button" className={styles.replyX} onClick={() => onRemove(f.key)} aria-label={t('removeFile', { name: f.name })}>
            <Icon name="ic-x" size={13} color={color.text3} />
          </button>
        </span>
      ))}
    </div>
  );
}

/** `@từ` đang gõ ở cuối ô soạn → chuỗi tìm (null = không gợi ý). */
export const mentionNeedle = (draft: string): string | null => /(?:^|\s)@([\p{L}\d_]*)$/u.exec(draft)?.[1] ?? null;

export function MentionPicker({ needle, onPick }: { needle: string; onPick: (m: { id: string; name: string }) => void }) {
  const t = useTranslations('inbox.composer');
  const { styles: ps } = usePopStyles();
  const { styles } = useComposerStyles();
  const members = useQuery(mentionMembersQuery()).data ?? [];
  const n = needle.toLowerCase();
  const rows = members.filter((m) => m.name.toLowerCase().includes(n)).slice(0, 6);
  return (
    <div className={`${ps.pop} ${ps.popNarrow}`} data-testid="mention-pop" role="listbox" aria-label={t('mention')}>
      <div className={ps.popBody}>
        {rows.length ? (
          rows.map((m) => (
            <button key={m.id} type="button" role="option" aria-selected={false} className={ps.slot} onMouseDown={(e) => (e.preventDefault(), onPick(m))}>
              <Icon name="ic-users" size={14} color={color.text3} />
              <span className={styles.grow}>{m.name}</span>
            </button>
          ))
        ) : (
          <div className={ps.popHint}>{t('mentionNone')}</div>
        )}
      </div>
    </div>
  );
}
