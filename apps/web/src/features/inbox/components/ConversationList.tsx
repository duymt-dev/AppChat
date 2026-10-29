// Cột danh sách hội thoại — prototype L1629–1734: tiêu đề + "Kết nối kênh" · tìm kiếm · lọc kênh · chọn tài khoản · sắp xếp · danh sách.
'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { Can } from '@/shared/authz/Can';
import { useListStyles } from '../styles/list.styles';
import { useInboxUi } from '../inbox-store';
import { AccountSelect } from './AccountSelect';
import { ConvRow } from './ConvRow';
import type { ChannelAccount, ChannelMeta, ChannelType, Conversation } from '../types';

const SORTS = ['latest', 'unread', 'priority', 'vip', 'sla'] as const;

export interface ConversationListProps {
  conversations: Conversation[];
  channels: Record<ChannelType, ChannelMeta> | undefined;
  accounts: ChannelAccount[];
  unreadTotal: number;
  className?: string;
}

export function ConversationList({ conversations, channels, accounts, unreadTotal, className }: ConversationListProps) {
  const t = useTranslations('inbox.list');
  const { styles, cx } = useListStyles();
  const ui = useInboxUi();
  const [q, setQ] = useState('');
  const needle = q.trim().toLowerCase();
  const rows = needle ? conversations.filter((c) => `${c.title} ${c.preview}`.toLowerCase().includes(needle)) : conversations;
  const byChannel = (ch: ChannelType) => conversations.filter((c) => c.channel === ch).length;

  return (
    <div className={cx(styles.col, className)} data-testid="conv-list">
      <div className={styles.head}>
        <div className={styles.titleRow}>
          <div>
            <div className={styles.title}>{t('title')}</div>
            <div className={styles.sub}>{t('sub', { total: conversations.length, unread: unreadTotal })}</div>
          </div>
          <Can p="channels.manage">
            <button type="button" className={styles.connect} onClick={() => ui.set({ modal: 'connect' })} data-testid="inbox-connect">
              <Icon name="ic-plus" size={15} strokeWidth={2} color={color.white} />
              {t('connect')}
            </button>
          </Can>
        </div>
        <div className={styles.search}>
          <Icon name="ic-search" size={14} color={color.text4} className={styles.searchIcon} />
          <input className={styles.searchBox} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('search')} aria-label={t('search')} />
          <span className={styles.kbd}>{t('kbd')}</span>
        </div>
        <div className={styles.chips}>
          <button type="button" className={cx(styles.chip, ui.channel === null && styles.chipOn)} onClick={() => ui.set({ channel: null })}>
            {t('allChannels')}
            <span className={styles.chipCount}>{conversations.length}</span>
          </button>
          {channels
            ? (Object.entries(channels) as [ChannelType, ChannelMeta][]).map(([key, ch]) => (
                <button
                  key={key}
                  type="button"
                  className={cx(styles.chip, styles.chipIcon, ui.channel === key && styles.chipOn)}
                  onClick={() => ui.set({ channel: ui.channel === key ? null : key })}
                >
                  <span className={styles.chBadge} style={{ background: ch.color }}>
                    {ch.short}
                  </span>
                  {ch.label}
                  <span className={styles.chipCount}>{byChannel(key)}</span>
                </button>
              ))
            : null}
        </div>
        <AccountSelect accounts={accounts} channels={channels} />
        <div className={cx(styles.chips, styles.chipsLast)}>
          {SORTS.map((s) => (
            <button key={s} type="button" className={cx(styles.chip, ui.sort === s && styles.chipOn)} onClick={() => ui.set({ sort: s })}>
              {t(`sort.${s}`)}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.scroll}>
        {rows.length === 0 ? (
          <div className={styles.empty} data-testid="conv-empty">
            <Icon name="ic-inbox" size={32} color={color.text4} className={styles.emptyIcon} />
            <div className={styles.emptyTitle}>{t('emptyTitle')}</div>
            {needle ? t('emptySearch') : t('emptyHint')}
          </div>
        ) : (
          rows.map((c) => <ConvRow key={c.id} conv={c} channel={channels?.[c.channel]} selected={c.id === ui.selectedId} />)
        )}
      </div>
    </div>
  );
}
