// Header khung chat + thanh ghim — prototype L1739–1762.
'use client';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Icon, color, type IconName } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useChatStyles } from '../styles/chat.styles';
import { useInboxUi } from '../inbox-store';
import { Rich } from './Rich';
import type { ChannelMeta, Conversation } from '../types';

export function ChatHeader({ conv, channel }: { conv: Conversation; channel: ChannelMeta | undefined }) {
  const t = useTranslations('inbox.chat');
  const router = useRouter();
  const { styles, cx } = useChatStyles();
  const ui = useInboxUi();
  const pin = useAction('conversation.pin');
  const isGroup = conv.kind === 'group';
  const badge = (
    <span className={styles.chBadge} style={{ background: channel?.color }}>
      {channel?.short}
    </span>
  );
  // Gọi thoại / video: module Gọi điện ẩn (D07, D19) — chuyển sang Lịch hẹn để hẹn gọi.
  const icons: [IconName, string, () => void, boolean][] = [
    ['ic-video', t('video'), () => router.push('/calendar'), true],
    ['ic-phone', t('call'), () => router.push('/calendar'), true],
    ['ic-search', t('search'), () => undefined, true],
    ['ic-panel', t('toggle360'), ui.toggle360, false],
  ];

  return (
    <>
      <div className={styles.head} data-testid="chat-header">
        <button type="button" className={styles.back} onClick={ui.backToList} aria-label={t('back')}>
          <Icon name="ic-chevron-right" size={20} color={color.chatIcon} style={{ transform: 'rotate(180deg)' }} />
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
          <div className={styles.avatar} style={{ background: conv.hue }}>
            {conv.initials}
          </div>
        )}
        <div className={styles.who}>
          <div className={styles.name}>{conv.title}</div>
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
            <button key={icon} type="button" className={cx(styles.iconBtn, hideMobile && styles.hideMobile)} title={label} aria-label={label} onClick={onClick}>
              <Icon name={icon} size={icon === 'ic-video' ? 20 : 18} color={color.chatIcon} />
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
          <button type="button" className={styles.unpin} onClick={() => void pin.run({ conversation_id: conv.id, pinned: false })}>
            {t('unpin')}
          </button>
        </div>
      ) : null}
    </>
  );
}
