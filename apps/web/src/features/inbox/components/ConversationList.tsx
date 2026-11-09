// Cột danh sách hội thoại — prototype L1629–1734: tiêu đề + "Kết nối kênh" · tìm kiếm · lọc kênh · chọn tài khoản · sắp xếp · danh sách.
// Tìm kiếm / kênh / tài khoản / sắp xếp lọc ở API (TIP-025). Không chọn nhiều / thao tác hàng loạt (gỡ theo Q-019 revert — nghiệp vụ gán
// theo tài khoản kênh, không gán lẻ từng hội thoại); thao tác theo hội thoại dùng menu "⋯" (ConvMenu).
'use client';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { Can } from '@/shared/authz/Can';
import { useListStyles } from '../styles/list.styles';
import { useInboxUi } from '../inbox-store';
import { AccountSelect } from './AccountSelect';
import { ConvRow } from './ConvRow';
import type { ChannelAccount, ChannelMeta, ChannelType, Conversation, FolderCounts } from '../types';

const SORTS = ['latest', 'unread', 'priority', 'vip', 'sla'] as const;

export interface ConversationListProps {
  conversations: Conversation[];
  /** Tổng hội thoại đang hiện (đếm thư mục "Tất cả"). */
  total: number;
  hasMore: boolean;
  onMore: () => void;
  channels: Record<ChannelType, ChannelMeta> | undefined;
  accounts: ChannelAccount[];
  counts: FolderCounts | undefined;
  unreadTotal: number;
  className?: string;
}

export function ConversationList({ conversations, total, hasMore, onMore, channels, counts, accounts, unreadTotal, className }: ConversationListProps) {
  const t = useTranslations('inbox.list');
  const { styles, cx } = useListStyles();
  const ui = useInboxUi();
  const needle = ui.listQuery.trim();
  const rows = conversations;
  const byChannel = (ch: ChannelType) => counts?.channels.find(([k]) => k === ch)?.[1] ?? 0;

  return (
    <div className={cx(styles.col, className)} data-testid="conv-list">
      <div className={styles.head}>
        <div className={styles.titleRow}>
          <div>
            <div className={styles.title}>{t('title')}</div>
            <div className={styles.sub}>{t('sub', { total, unread: unreadTotal })}</div>
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
          <input className={styles.searchBox} value={ui.listQuery} onChange={(e) => ui.set({ listQuery: e.target.value })} placeholder={t('search')} aria-label={t('search')} />
          <span className={styles.kbd}>{t('kbd')}</span>
        </div>
        <div className={styles.chips}>
          <button type="button" className={cx(styles.chip, ui.channel === null && styles.chipOn)} onClick={() => ui.set({ channel: null })}>
            {t('allChannels')}
            <span className={styles.chipCount}>{total}</span>
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
      <div
        className={styles.scroll}
        onScroll={(e) => {
          const el = e.currentTarget;
          if (hasMore && el.scrollTop + el.clientHeight >= el.scrollHeight - 120) onMore();
        }}
        data-testid="conv-scroll"
      >
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
