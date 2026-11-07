// Khối gập của "Thông tin nhóm" (prototype L1941–2008): tiêu đề · số mục · mũi tên — dùng chung GroupBoard + GroupSections.
'use client';
import { useTranslations } from 'next-intl';
import { useGroupStyles } from '../styles/group.styles';

export function GroupFold({ title, meta, open, onToggle, children }: { title: string; meta?: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  const t = useTranslations('inbox.group');
  const { styles } = useGroupStyles();
  return (
    <>
      <div className={styles.gap} />
      <div className={styles.block}>
        <button type="button" className={styles.foldHead} onClick={onToggle} aria-expanded={open}>
          <span className={styles.title}>{title}</span>
          {meta ? <span className={styles.foldMeta}>{meta}</span> : null}
          <span className={styles.caret}>{t(open ? 'caretOpen' : 'caretClosed')}</span>
        </button>
        {open ? children : null}
      </div>
    </>
  );
}
