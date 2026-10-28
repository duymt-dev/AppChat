// Hội thoại Trợ lý — prototype L1256–1311: bong bóng người dùng / AppChat AI, thẻ xác nhận (Xác nhận & lưu / Huỷ),
// trạng thái đã lưu (mở kết quả) / đã huỷ, "đang soạn", composer đáy.
'use client';
import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Icon, color, type IconName } from '@appchat/ui';
import { useThreadStyles } from '../styles/thread.styles';
import { useAssistantUi } from '../assistant-store';
import type { ChatMessage } from '../types';
import { BotFaceSmall } from './BotFace';
import { Composer } from './Composer';

export interface ChatThreadProps {
  onSend: () => void;
  onDecide: (m: ChatMessage, d: 'confirm' | 'cancel') => void;
  onOpen: (m: ChatMessage) => void;
}

function ActionCard({ m, onDecide, onOpen }: { m: ChatMessage } & Omit<ChatThreadProps, 'onSend'>) {
  const t = useTranslations('assistant');
  const { styles } = useThreadStyles();
  const c = m.card!;
  const cancelled = m.status === 'cancelled';
  return (
    <div className={styles.card} style={{ borderColor: cancelled ? color.border : c.color, opacity: cancelled ? 0.6 : 1 }} data-testid="asst-card" data-status={m.status}>
      <div className={styles.cardHead} style={{ background: `${c.color}10` }}>
        <span className={styles.cardIcon} style={{ background: `${c.color}20` }}>
          <Icon name={c.icon as IconName} size={16} color={c.color} />
        </span>
        <div>
          <div className={styles.cardTitle}>{c.title}</div>
          <div className={styles.cardDesc}>{c.desc}</div>
        </div>
      </div>
      {m.status === 'pending' ? (
        <div className={styles.cardFoot}>
          <button type="button" className={styles.ok} onClick={() => onDecide(m, 'confirm')}>
            <Icon name="ic-check" size={13} color={color.white} strokeWidth={2.4} />
            {t('confirm')}
          </button>
          <button type="button" className={styles.no} onClick={() => onDecide(m, 'cancel')}>
            {t('cancel')}
          </button>
        </div>
      ) : null}
      {m.status === 'done' ? (
        <button type="button" className={styles.done} style={{ background: `${c.color}0D`, color: c.color }} onClick={() => onOpen(m)}>
          <Icon name="ic-check" size={14} strokeWidth={2.2} />
          {t('saved', { dest: c.dest })}
          <span style={{ flex: 1 }} />
          <Icon name="ic-arrow" size={14} strokeWidth={2.2} />
        </button>
      ) : null}
      {cancelled ? <div className={styles.cancelled}>{t('cancelled')}</div> : null}
    </div>
  );
}

export function ChatThread({ onSend, onDecide, onOpen }: ChatThreadProps) {
  const t = useTranslations('assistant');
  const { styles } = useThreadStyles();
  const { messages, typing } = useAssistantUi();
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView?.({ block: 'end' });
  }, [messages.length, typing]);

  return (
    <>
      <div className={styles.scroll} data-testid="asst-thread">
        <div className={styles.list}>
          {messages.map((m) =>
            m.role === 'user' ? (
              <div key={m.id} className={styles.userRow}>
                <div className={styles.user} data-testid="asst-user-msg">
                  {m.text}
                </div>
              </div>
            ) : (
              <div key={m.id} className={styles.aiRow}>
                <span className={styles.avatar}>
                  <BotFaceSmall />
                </span>
                <div className={styles.aiCol}>
                  <div className={styles.aiName}>{t('ai')}</div>
                  <div className={styles.ai} data-testid="asst-ai-msg">
                    {m.card ? t('confirmLead') : m.text}
                  </div>
                  {m.card ? <ActionCard m={m} onDecide={onDecide} onOpen={onOpen} /> : null}
                </div>
              </div>
            ),
          )}
          {typing ? (
            <div className={styles.aiRow} data-testid="asst-typing">
              <span className={styles.avatar}>
                <BotFaceSmall talking />
              </span>
              <div className={styles.typing}>
                <span />
                <span />
                <span />
              </div>
            </div>
          ) : null}
          <div ref={end} />
        </div>
      </div>
      <div className={styles.foot}>
        <div className={styles.footInner}>
          <Composer rows={1} placeholder={t('placeholderShort')} onSend={onSend} sendIcon="plane" testId="asst-composer" />
        </div>
      </div>
    </>
  );
}
