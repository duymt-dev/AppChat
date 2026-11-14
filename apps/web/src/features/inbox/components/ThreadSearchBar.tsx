// Tìm trong hội thoại này (REQ-C12, TIP-025b §B.3) — prototype ver2.1 #3: ô tìm + lọc người gửi + N/M + điều hướng. Tìm có trang ở
// backend (không dấu, cả tin ngoài trang đang tải, tổng đúng trong ảnh chụp); chọn kết quả → cửa sổ quanh tin (onJump). ↑/↓ hoặc
// Enter / Shift+Enter đi kết quả, Esc đóng. Đoạn trích tô đúng vị trí gốc (HitSnippet).
'use client';
import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useChatStyles } from '../styles/chat.styles';
import { useInboxUi } from '../inbox-store';
import { useThreadSearch } from '../hooks/useThreadSearch';
import { HitSnippet } from './HitSnippet';
import type { Conversation } from '../types';

const SENDERS = ['all', 'contact', 'user', 'agent'] as const;
const SENDER_KEY: Record<(typeof SENDERS)[number], string> = { all: 'senderAll', contact: 'senderContact', user: 'senderUser', agent: 'senderAgent' };

export function ThreadSearchBar({ conv, onJump }: { conv: Conversation; onJump: (messageId: string) => void }) {
  const t = useTranslations('inbox.chat.search2');
  const { styles } = useChatStyles();
  const ui = useInboxUi();
  const s = useThreadSearch(conv.id, ui.searchQuery, ui.searchSender);
  const hitId = s.hit?.message_id ?? null;
  useEffect(() => {
    if (hitId) onJump(hitId);
  }, [hitId, onJump]);
  const close = () => ui.set({ searchOpen: false, searchQuery: '' });

  return (
    <div className={styles.search} data-testid="thread-search">
      <div className={styles.searchRow}>
        <Icon name="ic-search" size={15} color={color.chatIcon} />
        <input
          className={styles.searchInput}
          autoFocus
          maxLength={100}
          value={ui.searchQuery}
          onChange={(e) => ui.set({ searchQuery: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Escape') close();
            else if (e.key === 'Enter') s.step(e.shiftKey ? 1 : -1);
            else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
              e.preventDefault();
              s.step(e.key === 'ArrowUp' ? -1 : 1);
            }
          }}
          placeholder={t('placeholder')}
          data-testid="thread-search-input"
        />
        <select className={styles.searchSelect} value={ui.searchSender} onChange={(e) => ui.set({ searchSender: e.target.value as (typeof SENDERS)[number] })} aria-label={t('sender')} data-testid="thread-search-sender">
          {SENDERS.map((x) => (
            <option key={x} value={x}>
              {t(SENDER_KEY[x] as never)}
            </option>
          ))}
        </select>
        {s.q ? (
          <span className={styles.searchCount} data-testid="thread-search-count">
            {t('count', { i: s.total ? s.active + 1 : 0, n: s.total })}
          </span>
        ) : null}
        <button type="button" className={styles.searchBtn} title={t('prev')} aria-label={t('prev')} disabled={!s.total} onClick={() => s.step(-1)} data-testid="thread-search-prev">
          <Icon name="ic-chevron-right" size={14} color={color.chatIcon} style={{ transform: 'rotate(90deg)' }} />
        </button>
        <button type="button" className={styles.searchBtn} title={t('next')} aria-label={t('next')} disabled={!s.total} onClick={() => s.step(1)} data-testid="thread-search-next">
          <Icon name="ic-chevron-right" size={14} color={color.chatIcon} style={{ transform: 'rotate(-90deg)' }} />
        </button>
        <button type="button" className={styles.searchBtn} title={t('close')} aria-label={t('close')} onClick={close}>
          <Icon name="ic-x" size={14} color={color.chatIcon} />
        </button>
      </div>
      {s.loading ? <div className={styles.searchNone}>{t('loading')}</div> : null}
      {s.error ? <div className={styles.searchNone} role="alert">{t('error')}</div> : null}
      {s.q && !s.loading && !s.error && !s.total ? <div className={styles.searchNone}>{t('none', { q: s.q })}</div> : null}
      {s.hit ? <HitSnippet className={styles.searchNone} body={s.hit.body} ranges={s.hit.ranges} /> : null}
    </div>
  );
}
