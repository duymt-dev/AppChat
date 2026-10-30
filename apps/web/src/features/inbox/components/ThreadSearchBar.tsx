// Tìm trong hội thoại này (REQ-C12) — prototype ver2.1 #3: ô tìm + lọc người gửi + điều hướng kết quả.
'use client';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useChatStyles } from '../styles/chat.styles';
import { threadQuery } from '../api';
import { useInboxUi } from '../inbox-store';
import type { Conversation, Message } from '../types';

const SENDERS = ['all', 'contact', 'user', 'agent'] as const;
const SENDER_KEY: Record<(typeof SENDERS)[number], string> = { all: 'senderAll', contact: 'senderContact', user: 'senderUser', agent: 'senderAgent' };

const matchesSender = (m: Message, f: (typeof SENDERS)[number]) => {
  if (f === 'all') return true;
  if (f === 'contact') return m.direction === 'in';
  if (f === 'agent') return m.direction === 'out' && !!m.sender?.startsWith('AI');
  return m.direction === 'out' && !m.sender?.startsWith('AI');
};

export function ThreadSearchBar({ conv }: { conv: Conversation }) {
  const t = useTranslations('inbox.chat.search2');
  const { styles, cx } = useChatStyles();
  const ui = useInboxUi();
  const thread = useQuery(threadQuery(conv.id));
  const [active, setActive] = useState(0);
  const q = ui.searchQuery.trim().toLowerCase();

  const hits = useMemo(() => {
    if (!q) return [];
    return (thread.data?.data ?? []).filter((m) => matchesSender(m, ui.searchSender) && (m.body ?? '').toLowerCase().includes(q));
  }, [thread.data, q, ui.searchSender]);

  // Reset vị trí kết quả khi đổi câu/lọc — điều chỉnh state khi render (tránh setState trong effect gây render dồn).
  const [resetKey, setResetKey] = useState('');
  const queryKey = `${q}|${ui.searchSender}`;
  if (queryKey !== resetKey) {
    setResetKey(queryKey);
    setActive(0);
  }

  useEffect(() => {
    const m = hits[active];
    if (m) document.getElementById(`msg-${m.id}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [active, hits]);

  const step = (dir: 1 | -1) => setActive((i) => (hits.length ? (i + dir + hits.length) % hits.length : 0));

  return (
    <div className={styles.search} data-testid="thread-search">
      <div className={styles.searchRow}>
        <Icon name="ic-search" size={15} color={color.chatIcon} />
        <input
          className={styles.searchInput}
          autoFocus
          value={ui.searchQuery}
          onChange={(e) => ui.set({ searchQuery: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Escape') ui.set({ searchOpen: false, searchQuery: '' });
            if (e.key === 'Enter') step(e.shiftKey ? -1 : 1);
          }}
          placeholder={t('placeholder')}
        />
        <select className={styles.searchSelect} value={ui.searchSender} onChange={(e) => ui.set({ searchSender: e.target.value as (typeof SENDERS)[number] })}>
          {SENDERS.map((s) => (
            <option key={s} value={s}>
              {t(SENDER_KEY[s] as never)}
            </option>
          ))}
        </select>
        {q ? <span className={styles.searchCount}>{t('count', { i: hits.length ? active + 1 : 0, n: hits.length })}</span> : null}
        <button type="button" className={styles.searchBtn} title={t('prev')} aria-label={t('prev')} disabled={!hits.length} onClick={() => step(-1)}>
          <Icon name="ic-chevron-right" size={14} color={color.chatIcon} style={{ transform: 'rotate(90deg)' }} />
        </button>
        <button type="button" className={styles.searchBtn} title={t('next')} aria-label={t('next')} disabled={!hits.length} onClick={() => step(1)}>
          <Icon name="ic-chevron-right" size={14} color={color.chatIcon} style={{ transform: 'rotate(-90deg)' }} />
        </button>
        <button type="button" className={cx(styles.searchBtn)} title={t('close')} aria-label={t('close')} onClick={() => ui.set({ searchOpen: false, searchQuery: '' })}>
          <Icon name="ic-x" size={14} color={color.chatIcon} />
        </button>
      </div>
      {q && !hits.length ? <div className={styles.searchNone}>{t('none', { q: ui.searchQuery })}</div> : null}
    </div>
  );
}
