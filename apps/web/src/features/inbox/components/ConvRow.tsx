// Một dòng hội thoại (cá nhân / nhóm) + menu ⋯ — prototype L1650–1734.
'use client';
import { useTranslations } from 'next-intl';
import { Icon, color, type IconName } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useRowStyles } from '../styles/row.styles';
import { useInboxUi } from '../inbox-store';
import { TAG_TONE } from '../tones';
import type { ChannelMeta, Conversation } from '../types';

const MENU: [key: string, icon: IconName, sub: boolean][] = [
  ['close', 'ic-check', false],
  ['snooze', 'ic-eye', true],
  ['shortcut', 'ic-bolt', true],
  ['assign', 'ic-users', true],
  ['lifecycle', 'ic-flow', true],
  ['tag', 'ic-gift', false],
];

export interface ConvRowProps {
  conv: Conversation;
  channel: ChannelMeta | undefined;
  selected: boolean;
}

export function ConvRow({ conv, channel, selected }: ConvRowProps) {
  const t = useTranslations('inbox.list');
  const { styles, cx } = useRowStyles();
  const ui = useInboxUi();
  const markRead = useAction('conversation.mark_read');
  const setStatus = useAction('conversation.set_status');
  const assign = useAction('conversation.assign');
  const tag = useAction('conversation.tag');
  const menuOpen = ui.pop === 'convMenu' && ui.menuFor === conv.id;
  const isGroup = conv.kind === 'group';
  const chBg = channel?.color ?? color.text3;

  const open = () => {
    ui.select(conv.id);
    if (conv.unread > 0) void markRead.run({ conversation_id: conv.id }, { silent: true });
  };

  const pick = (key: string) => {
    ui.closePop();
    const id = conv.id;
    if (key === 'close') void setStatus.run({ conversation_id: id, status: 'closed' });
    if (key === 'snooze') void setStatus.run({ conversation_id: id, status: 'snoozed', snooze_hours: 4 });
    if (key === 'assign') void assign.run({ conversation_id: id, user_id: 'u_tram' });
    if (key === 'tag') void tag.run({ conversation_id: id, tag: 'VIP' });
  };

  return (
    <div className={cx(styles.row, selected && styles.on)} data-testid="conv-row" data-conv={conv.id}>
      <button type="button" className={styles.hit} onClick={open} aria-label={conv.title} />
      <div className={styles.av}>
        {isGroup ? (
          <>
            {/* màu avatar sinh theo hội thoại — giá trị động */}
            <div className={styles.stack} style={{ left: 0, top: 0, background: conv.hue }}>
              {conv.initials}
            </div>
            <div className={styles.stack} style={{ right: 0, bottom: 0, background: conv.more_hue }}>
              {conv.more}
            </div>
            <div className={cx(styles.ch, styles.chLeft)} style={{ background: chBg }}>
              {channel?.short}
            </div>
          </>
        ) : (
          <>
            <div className={styles.avatar} style={{ background: conv.hue }}>
              {conv.initials}
            </div>
            <div className={styles.ch} style={{ background: chBg }}>
              {channel?.short}
            </div>
            {conv.online ? <span className={styles.online} /> : null}
          </>
        )}
      </div>
      <div className={styles.main}>
        <div className={styles.top}>
          <span className={styles.name}>{conv.title}</span>
          <span className={styles.time}>{conv.time}</span>
        </div>
        <div className={styles.preview}>
          {conv.preview_sender ? <b className={styles.sender}>{conv.preview_sender}: </b> : null}
          {conv.preview}
        </div>
        <div className={styles.tags}>
          {conv.tags.map((g) => (
            <span key={g.label} className={styles.tag} style={{ background: TAG_TONE[g.tone].bg, color: TAG_TONE[g.tone].fg }}>
              {g.label}
            </span>
          ))}
          {conv.unread > 0 ? <span className={styles.unread}>{conv.unread}</span> : null}
        </div>
      </div>
      {!isGroup ? (
        <button
          type="button"
          className={cx(styles.dots, 'conv-dots', menuOpen && styles.dotsOn)}
          title={t('menu')}
          aria-label={t('menu')}
          aria-expanded={menuOpen}
          onClick={() => ui.togglePop('convMenu', conv.id)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <circle cx="5" cy="12" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="19" cy="12" r="2" />
          </svg>
        </button>
      ) : null}
      {menuOpen ? (
        <div className={styles.menu} role="menu" data-testid="conv-menu">
          {MENU.map(([key, icon, sub]) => (
            <button key={key} type="button" role="menuitem" className={styles.item} onClick={() => pick(key)}>
              <Icon name={icon} size={15} color={color.text3} />
              <span className={styles.grow}>{t(`actions.${key}` as never)}</span>
              {sub ? <span className={styles.caret}>{t('caret')}</span> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
