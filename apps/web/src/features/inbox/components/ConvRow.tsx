// Một dòng hội thoại (cá nhân / nhóm) + menu ⋯ (REQ-C10) — prototype L1650–1734, L1978–2033. Không chọn nhiều — thao tác qua menu ⋯
// từng hội thoại (gán, giai đoạn, gắn thẻ, đóng, lưu trữ…); nghiệp vụ gán theo cả tài khoản kênh, không gán lẻ từng hội thoại.
'use client';
import { useTranslations } from 'next-intl';
import { color } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useRowStyles } from '../styles/row.styles';
import { useInboxStyles } from '../styles/inbox.styles';
import { useInboxUi } from '../inbox-store';
import { TAG_TONE } from '../tones';
import { ConvMenu } from './ConvMenu';
import { AvatarFace } from './AvatarFace';
import type { ChannelMeta, Conversation } from '../types';
import { OpportunityChip } from './OpportunityChip';

export interface ConvRowProps {
  conv: Conversation;
  channel: ChannelMeta | undefined;
  selected: boolean;
}

export function ConvRow({ conv, channel, selected }: ConvRowProps) {
  const t = useTranslations('inbox.list');
  const { styles, cx } = useRowStyles();
  const { styles: base } = useInboxStyles();
  const ui = useInboxUi();
  const markRead = useAction('conversation.mark_read');
  const menuOpen = ui.pop === 'convMenu' && ui.menuFor === conv.id;
  const isGroup = conv.kind === 'group';
  const chBg = channel?.color ?? color.text3;

  const open = () => {
    ui.select(conv.id);
    if (conv.unread > 0) void markRead.run({ conversation_id: conv.id }, { silent: true });
  };

  return (
    <div className={cx(styles.row, 'conv-row', selected && styles.on)} data-testid="conv-row" data-conv={conv.id}>
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
            <AvatarFace className={styles.avatar} background={conv.hue} src={conv.avatar_url}>
              {conv.initials}
            </AvatarFace>
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
          <OpportunityChip chip={conv.opportunity_chip} compact />
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
      {menuOpen ? <div className={base.veil} onClick={ui.closeConvMenu} /> : null}
      <ConvMenu conv={conv} open={menuOpen} onClose={ui.closeConvMenu} />
    </div>
  );
}
