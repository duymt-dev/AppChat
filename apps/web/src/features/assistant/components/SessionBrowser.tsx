// Trình duyệt phiên Trợ lý (REQ-E10a, TIP-023c G2.8a): drawer "Lịch sử trò chuyện" — tìm theo tiêu đề (debounce), danh sách phiên của
// chính người dùng (mới nhất trước, tải thêm theo cursor), trống / lỗi / thử lại. Mở phiên → nạp tin đã lưu (chữ / thẻ / cây GenUI dựng
// lại theo quyền hiện hành) — không gọi model, không chạy lại action. Prototype không vẽ màn này (PD-009).
'use client';
import { useTranslations } from 'next-intl';
import { EntityDrawer } from '@appchat/ui';
import { useFmt } from '@/shared/i18n/useFmt';
import { useAssistantSessions } from '../hooks/useAssistantSessions';
import { useSessionStyles } from '../styles/sessions.styles';

export interface SessionBrowserProps {
  open: boolean;
  current?: string;
  onClose: () => void;
  onOpen: (id: string) => void;
}

export function SessionBrowser({ open, current, onClose, onOpen }: SessionBrowserProps) {
  const t = useTranslations('assistant.sessions');
  const fmt = useFmt();
  const { styles, cx } = useSessionStyles();
  const { text, setText, q, rows, list } = useAssistantSessions(open);

  const body = list.isError ? (
    <div className={styles.muted} data-testid="asst-sessions-error">
      {t('error')}{' '}
      <button type="button" className={styles.more} onClick={() => void list.refetch()}>
        {t('retry')}
      </button>
    </div>
  ) : list.isPending ? (
    <div className={styles.muted}>{t('loading')}</div>
  ) : !rows.length ? (
    <div className={styles.muted} data-testid="asst-sessions-empty">
      {q ? t('noMatch') : t('empty')}
    </div>
  ) : (
    <div className={styles.list} role="list">
      {rows.map((s) => (
        <button
          key={s.id}
          type="button"
          role="listitem"
          className={cx(styles.row, s.id === current && styles.active)}
          onClick={() => onOpen(s.id)}
          data-testid="asst-session"
          data-session={s.id}
        >
          <span className={styles.title}>{s.title || t('untitled')}</span>
          <span className={styles.meta}>
            {t(`mode.${s.mode}`)} · {fmt.date(s.last_message_at)} {fmt.time(s.last_message_at)}
          </span>
        </button>
      ))}
      {list.hasNextPage ? (
        <button type="button" className={styles.more} onClick={() => void list.fetchNextPage()} disabled={list.isFetchingNextPage} data-testid="asst-sessions-more">
          {t('more')}
        </button>
      ) : null}
    </div>
  );

  return (
    <EntityDrawer open={open} onClose={onClose} title={t('title')} icon="ic-inbox" closeLabel={t('close')} testId="asst-sessions">
      <div className={styles.body}>
        <input className={styles.search} value={text} onChange={(e) => setText(e.target.value)} placeholder={t('search')} aria-label={t('search')} data-testid="asst-sessions-search" />
        {body}
      </div>
    </EntityDrawer>
  );
}
