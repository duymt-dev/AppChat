// Header khung chat + thanh ghim — prototype L1739–1762.
'use client';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Icon, color, type IconName } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useChatStyles } from '../styles/chat.styles';
import { threadQuery } from '../api';
import { useInboxUi } from '../inbox-store';
import { Rich } from './Rich';
import type { ChannelMeta, Conversation } from '../types';
import { AvatarFace } from './AvatarFace';
import { IntentBadge } from './IntentBadge';

export function ChatHeader({ conv, channel }: { conv: Conversation; channel: ChannelMeta | undefined }) {
  const t = useTranslations('inbox.chat');
  const { styles, cx } = useChatStyles();
  const ui = useInboxUi();
  const pin = useAction('conversation.pin');
  const pinMessage = useAction('message.pin');
  const thread = useQuery(threadQuery(conv.id));
  const isGroup = conv.kind === 'group';
  const badge = (
    <span className={styles.chBadge} style={{ background: channel?.color }}>
      {channel?.short}
    </span>
  );
  const pinnedMsg = conv.pinned_message_id
    ? (thread.data?.data ?? []).find((m) => m.id === conv.pinned_message_id)
    : undefined;
  // REQ-C13: bỏ gọi thoại/video (module Gọi điện ẩn D07, D19 — chuyển Lịch hẹn để hẹn gọi); thêm nút Tìm trong hội thoại.
  const icons: [IconName, string, () => void, boolean][] = [
    ['ic-search', t('search'), () => ui.set({ searchOpen: !ui.searchOpen }), false],
    ['ic-panel', t('toggle360'), ui.toggle360, false],
  ];

  return (
    <>
      <div className={styles.head} data-testid="chat-header">
        <button type="button" className={styles.back} onClick={ui.backToList} aria-label={t('back')}>
          <Icon
            name="ic-chevron-right"
            size={20}
            color={color.chatIcon}
            style={{ transform: 'rotate(180deg)' }}
          />
        </button>
        {isGroup ? (
          <div className={styles.stackWrap}>
            <div className={styles.stack} style={{ left: 0, top: 0, background: conv.hue }}>
              {conv.initials}
            </div>
            <div className={styles.stack} style={{ right: 0, bottom: 0, background: conv.more_hue }}>
              {conv.more}
            </div>
          </div>
        ) : (
          <AvatarFace className={styles.avatar} background={conv.hue} src={conv.avatar_url}>
            {conv.initials}
          </AvatarFace>
        )}
        <div className={styles.who}>
          <div className={styles.name}>
            {conv.title} <IntentBadge intent={conv.intent} />
          </div>
          <div className={styles.meta}>
            {isGroup ? (
              <>
                {t('members', { n: conv.members ?? 0 })}
                <span className={styles.sepDot}>·</span>
                {t('online', { n: conv.online_count ?? 0 })}
                <span className={styles.sepDot}>·</span>
                {badge}
                {t('zaloGroup')}
              </>
            ) : (
              <>
                {conv.presence ?? t('offline')}
                <span className={styles.sepDot}>·</span>
                {badge}
                {`${channel?.label ?? ''} · ${conv.account}`}
              </>
            )}
          </div>
        </div>
        <div className={styles.icons}>
          {icons.map(([icon, label, onClick, hideMobile]) => (
            <button
              key={icon}
              type="button"
              className={cx(styles.iconBtn, hideMobile && styles.hideMobile)}
              title={label}
              aria-label={label}
              aria-pressed={icon === 'ic-search' ? ui.searchOpen : undefined}
              data-testid={icon === 'ic-search' ? 'chat-search-toggle' : undefined}
              onClick={onClick}
            >
              <Icon name={icon} size={18} color={color.chatIcon} />
            </button>
          ))}
        </div>
      </div>
      {conv.pinned && conv.pinned_note ? (
        <div className={styles.pin} data-testid="chat-pin">
          <span className={styles.pinLabel}>{t('pinned')}</span>
          <span className={styles.pinText}>
            <Rich text={conv.pinned_note} />
          </span>
          <button
            type="button"
            className={styles.unpin}
            onClick={() => void pin.run({ conversation_id: conv.id, pinned: false })}
          >
            {t('unpin')}
          </button>
        </div>
      ) : null}
      {pinnedMsg ? (
        <div className={styles.pin} data-testid="chat-pin-message">
          <span className={styles.pinLabel}>{t('pinnedMsg')}</span>
          <span className={styles.pinText}>{pinnedMsg.body}</span>
          <button
            type="button"
            className={styles.unpin}
            onClick={() =>
              void pinMessage.run(
                { conversation_id: conv.id, message_id: pinnedMsg.id, pinned: false },
                { silent: true },
              )
            }
          >
            {t('unpinMsg')}
          </button>
        </div>
      ) : null}
    </>
  );
}
