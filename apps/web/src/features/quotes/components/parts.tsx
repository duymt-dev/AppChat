// Mảnh dùng chung trong drawer báo giá: vòng khả năng chốt, chip loại khách, trao đổi nội bộ, avatar chữ cái.
'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useQuoteTabStyles } from '../styles/tabs.styles';
import { useCommentStyles } from '../styles/comments.styles';
import { useQuoteDetailStyles } from '../styles/detail.styles';
import { useStamp } from '../columns';
import type { Quote } from '../types';

/** Khả năng chốt mẫu (prototype qDetail.aiClose L9425): cần duyệt 68% · khách cũ 78% · khách mới 64%. */
export const closeChance = (q: Quote) => (q.approval_reasons.length ? 68 : q.returning ? 78 : 64);
export const initial = (name: string) => (name.trim().slice(-1) || '?').toUpperCase();
/** Màu avatar theo độ dài tên (prototype custAv). */
export const avColor = (name: string) => `hsl(${(name.length * 40) % 360} 55% 48%)`;

export function Ring({ pct, label, size = 78 }: { pct: number; label: string; size?: number }) {
  const { styles } = useQuoteTabStyles();
  const inner = size - 20;
  return (
    <div
      className={styles.ring}
      style={{
        width: size,
        height: size,
        background: `conic-gradient(${color.brand} ${pct}%, ${color.ringTrack} 0)`,
      }}
    >
      <div className={styles.ringIn} style={{ width: inner, height: inner }}>
        {label}
      </div>
    </div>
  );
}

export function CustType({ returning }: { returning: boolean }) {
  const t = useTranslations('quotes.detail');
  const { styles } = useQuoteDetailStyles();
  return (
    <span
      className={styles.type}
      style={
        returning
          ? { background: color.violetChip, color: color.violet }
          : { background: color.sentBg, color: color.paidText }
      }
    >
      {returning ? t('custOld') : t('custNew')}
    </span>
  );
}

export function Comments({ q }: { q: Quote }) {
  const t = useTranslations('quotes.detail');
  const { styles: tab, cx } = useQuoteTabStyles();
  const { styles } = useCommentStyles();
  const stamp = useStamp();
  const add = useAction('quote.comment');
  const [draft, setDraft] = useState('');
  const send = async () => {
    const text = draft.trim();
    if (!text) return;
    if (await add.run({ quote_id: q.id, text }, { silent: true })) setDraft('');
  };
  return (
    <div className={cx(tab.card, tab.cardPad)} data-testid="q-comments">
      <div className={cx(tab.h, tab.head)}>
        {t('chat')} <span className={tab.hSub}>{t('chatSub')}</span>
      </div>
      <div className={styles.cmts}>
        {q.comments.map((c, i) => (
          <div key={i} className={styles.cmt}>
            <span className={styles.cmtAv}>{c.who}</span>
            <div>
              <span className={styles.cmtWho}>{c.who}</span>
              <span className={styles.cmtAt}>{stamp(c.at)}</span>
              <div className={styles.cmtText}>{c.text}</div>
            </div>
          </div>
        ))}
      </div>
      <div className={styles.composer}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void send()}
          placeholder={t('chatPh')}
          data-testid="q-comment-input"
        />
        <button
          type="button"
          className={styles.sendBtn}
          onClick={() => void send()}
          aria-label={t('chatSend')}
        >
          <Icon name="ic-send" size={14} color={color.white} />
        </button>
      </div>
    </div>
  );
}
