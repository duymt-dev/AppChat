// Một mục trong luồng tin (văn bản / ảnh / ghi âm / thẻ sản phẩm / tệp / hệ thống / ghi chú / cảnh báo nhóm) — prototype L1763–1797.
'use client';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useFmt } from '@/shared/i18n/useFmt';
import { useBubbleStyles } from '../styles/bubble.styles';
import { Attachments } from './Attachments';
import { MessageMenu } from './MessageMenu';
import { MessageProviderStatus } from './MessageProviderStatus';
import { Rich } from './Rich';
import type { Conversation, Message } from '../types';

export interface MessageBubbleProps {
  m: Message;
  conv: Conversation;
}

export function MessageBubble({ m, conv }: MessageBubbleProps) {
  const t = useTranslations('inbox.thread');
  const fmt = useFmt();
  const { styles, cx } = useBubbleStyles();
  const body = m.body ?? '';
  const text = m.deleted ? <span className={styles.muted}>{t('deleted')}</span> : m.recalled ? <span className={styles.muted}>{t('recalled')}</span> : m.plain ? body : <Rich text={body} />;
  const ticks = m.status === 'read' ? ' ✓✓' : m.status === 'sent' ? ' ✓' : '';
  // Tin có tệp thật (API): tệp + chữ kèm (nếu có) trong bong bóng thường.
  const files = !m.deleted && !m.recalled && m.attachments?.length ? <Attachments files={m.attachments} messageId={m.direction === 'in' ? m.id : undefined} /> : null;
  const isGroup = conv.kind === 'group';
  const avatar = (
    <div className={cx(styles.av, isGroup && styles.avSm)} style={{ background: m.sender_hue ?? conv.hue }}>
      {m.sender_initials ?? conv.initials}
    </div>
  );

  switch (m.kind) {
    case 'system':
      return (
        <div className={styles.center} id={`msg-${m.id}`}>
          <span className={styles.pill}>
            <Rich text={body} />
          </span>
        </div>
      );
    case 'date':
      return (
        <div className={styles.dateWrap} id={`msg-${m.id}`}>
          <span className={cx(styles.pill, styles.date)}>{body}</span>
        </div>
      );
    case 'ai_insight':
      return (
        <div className={styles.insightWrap} id={`msg-${m.id}`}>
          <div className={styles.insight}>
            <Icon name="ic-spark" size={12} color={color.brand} />
            <span className={styles.insightLabel}>{t('insight')}</span>
            <span>
              <Rich text={body} />
            </span>
            <span>{t('confidence', { pct: m.confidence ?? 0 })}</span>
          </div>
        </div>
      );
    case 'group_alert':
      return (
        <div className={styles.alert} data-testid="group-alert" id={`msg-${m.id}`}>
          <Icon name="ic-bell" size={15} color={color.vipText} />
          <div>
            <div className={styles.alertTitle}>{m.title}</div>
            <div className={styles.alertBody}>
              <Rich text={body} />
            </div>
          </div>
        </div>
      );
    case 'note':
      return (
        <div className={styles.note} data-testid="note" id={`msg-${m.id}`}>
          <div className={styles.noteLabel}>{t('note')}</div>
          {m.plain ? body : <Rich text={body} />}
        </div>
      );
    case 'typing':
      return (
        <div className={styles.row}>
          <div className={styles.spacer} />
          <div className={cx(styles.in, styles.typing)}>
            <span className={styles.typingDot} />
            <span className={styles.typingDot} />
            <span className={styles.typingDot} />
            <span className={styles.dur}>{body}</span>
          </div>
        </div>
      );
    default:
      break;
  }

  if (m.direction === 'out') {
    if (m.agent) {
      return (
        <div className={cx(styles.row, styles.rowTop, styles.out, styles.outAgent)} data-testid="msg-agent" id={`msg-${m.id}`}>
          <div className={cx(styles.av, styles.avAgent)}>
            <Icon name="ic-spark" size={13} strokeWidth={2} color={color.white} />
          </div>
          <div className={cx(styles.outBubble, styles.agentBubble)}>
            <div className={styles.sender} style={{ color: color.brandInk }}>
              {m.sender}
            </div>
            {text}
            <div className={cx(styles.stamp, styles.stampAgent)}>{`${m.time ?? ''}${ticks}`}</div>
          </div>
        </div>
      );
    }
    return (
      <div className={cx(styles.row, styles.out)} data-testid="msg-out" id={`msg-${m.id}`}>
        <div>
          {m.kind === 'card' ? (
            <div className={styles.card}>
              <div className={styles.cardImg}>
                <Icon name="ic-spark" size={32} color={color.brandDeep} />
              </div>
              <div className={styles.cardBody}>
                <div className={styles.cardTitle}>{m.title}</div>
                <div className={styles.cardSub}>{m.sub}</div>
                <div className={styles.cardPrice}>{`${fmt.money(m.price ?? '0')}/${m.unit ?? ''}`}</div>
              </div>
            </div>
          ) : (
            <div className={cx(styles.outBubble, m.kind === 'sticker' && styles.sticker)}>
              {m.reply_to ? (
                <div className={styles.quoted} data-testid="msg-quoted">
                  {m.reply_to.preview}
                </div>
              ) : null}
              {files}
              {body || !files ? text : null}
              {m.reaction ? <span className={styles.reactionBadge}>{m.reaction}</span> : null}
              <MessageProviderStatus op={m.provider_op} status={m.status} />
              <div className={cx(styles.stamp, styles.stampOut)}>
                {/* Tin gửi đi hiện tên người gửi (REQ-C13) */}
                {m.sender ? <b className={styles.senderOut}>{m.sender}</b> : null}
                {m.sender ? ' · ' : ''}
                {`${m.time ?? ''}${ticks}`}
              </div>
            </div>
          )}
          {m.kind === 'card' ? <div className={cx(styles.stamp, styles.stampOut)}>{`${m.time ?? ''}${ticks}`}</div> : null}
        </div>
      </div>
    );
  }

  return (
    <div className={cx(styles.row, isGroup && styles.rowTop)} data-testid="msg-in" id={`msg-${m.id}`}>
      {avatar}
      {files ? (
        <div className={cx(styles.in, isGroup && styles.inGroup)}>
          {m.sender ? (
            <div className={styles.sender} style={{ color: m.sender_color }}>
              {m.sender}
            </div>
          ) : null}
          {files}
          {body ? text : null}
          <div className={styles.stamp}>{m.time}</div>
        </div>
      ) : m.kind === 'image' ? (
        <div className={cx(styles.in, styles.pad8)}>
          <div className={styles.photo}>{body}</div>
          <div className={styles.stamp}>{m.time}</div>
        </div>
      ) : m.kind === 'audio' ? (
        <div className={cx(styles.in, styles.audio)}>
          <Icon name="ic-play" size={20} color={color.brand} />
          <div className={styles.track}>
            <div className={styles.trackFill} />
          </div>
          <span className={styles.dur}>{body}</span>
        </div>
      ) : m.kind === 'file' ? (
        <div className={cx(styles.in, styles.file)}>
          <div className={styles.fileIcon}>
            <Icon name="ic-doc" size={17} color={color.dangerStrong} />
          </div>
          <div>
            <div className={styles.fileName}>{body}</div>
            <div className={styles.fileMeta}>{m.meta}</div>
          </div>
        </div>
      ) : (
        <div className={cx(styles.in, isGroup && styles.inGroup)}>
          {m.sender ? (
            <div className={styles.sender} style={{ color: m.sender_color }}>
              {m.sender}
            </div>
          ) : null}
          {text}
          {m.reaction ? <span className={styles.reactionBadge}>{m.reaction}</span> : null}
          <MessageProviderStatus op={m.provider_op} />
          <div className={styles.stamp}>{m.time}</div>
        </div>
      )}
      {m.menu && !m.deleted ? <MessageMenu convId={conv.id} message={m} isPinned={conv.pinned_message_id === m.id} /> : null}
    </div>
  );
}
