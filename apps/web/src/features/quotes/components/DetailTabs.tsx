// Tab CRM · AI · Lịch sử của drawer báo giá — prototype L5130–5160. Lịch sử thêm danh sách các version (request_revision → n+1).
'use client';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useCan } from '@/shared/authz/useCan';
import { useFmt } from '@/shared/i18n/useFmt';
import { useQuoteTabStyles } from '../styles/tabs.styles';
import { useQuoteDetailStyles } from '../styles/detail.styles';
import { useQuoteSend } from '../hooks/useQuoteSend';
import { useQuotesUi } from '../quotes-store';
import { quoteVersionsQuery } from '../api';
import { useStamp } from '../columns';
import { STATUS_TONE } from '../status';
import { Comments, Ring, closeChance } from './parts';
import type { Quote, QuotesMeta } from '../types';

export function CrmTab({ q, meta }: { q: Quote; meta: QuotesMeta }) {
  const t = useTranslations('quotes.detail');
  const fmt = useFmt();
  const { styles, cx } = useQuoteTabStyles();
  const d = useQuoteDetailStyles().styles;
  const canSend = useCan('quote.send');
  const send = useQuoteSend();
  const extend = useAction('quote.extend_validity');
  const sent = ['sent', 'viewed', 'expired'].includes(q.status);
  return (
    <>
      <div className={styles.stats}>
        {meta.crm_stats.map(([k, v, c]) => (
          <div key={k} className={cx(styles.card, styles.cardPad)}>
            <div className={styles.statL}>{t(`crm.${k}` as never)}</div>
            <div className={styles.statV} style={{ color: c }}>
              {v}
            </div>
          </div>
        ))}
      </div>
      <div className={cx(styles.card, styles.cardPad)}>
        <div className={styles.t13}>{t('sendTrack')}</div>
        <div className={styles.row}>
          <button
            type="button"
            className={d.send}
            disabled={!canSend}
            onClick={() => void send.run(q.id, 'zalo_personal')}
          >
            <span className={d.dot} />
            {t('sendZalo')}
          </button>
          <button
            type="button"
            className={d.send}
            disabled={!canSend}
            onClick={() => void send.run(q.id, 'email')}
          >
            <Icon name="ic-mail" size={14} color={color.text2} />
            {t('sendEmail')}
          </button>
        </div>
        <div className={styles.note}>
          <Icon name="ic-clock" size={14} color={color.text4} />
          {sent ? t('validUntil', { d: fmt.date(q.valid_until) }) : t('validity', { n: q.valid_days })}
          {sent && canSend ? (
            <button
              type="button"
              className={styles.link}
              onClick={() => void extend.run({ quote_id: q.id, days: 7 })}
            >
              {t('extend')}
            </button>
          ) : null}
        </div>
      </div>
    </>
  );
}

export function AiTab({ q }: { q: Quote }) {
  const t = useTranslations('quotes.detail');
  const { styles, cx } = useQuoteTabStyles();
  const chance = closeChance(q);
  const suggest = q.returning ? t('suggestOld') : t('suggestNew');
  return (
    <>
      <div className={styles.card}>
        <div className={styles.head}>
          <Icon name="ic-spark" size={15} color={color.violet} />
          <span className={styles.t13}>{t('forecast')}</span>
        </div>
        <div className={styles.ringRow}>
          <Ring pct={chance} label={t('pct', { n: chance })} size={72} />
          <div className={styles.body}>{suggest}</div>
        </div>
      </div>
      <div className={cx(styles.card, styles.cardPad, styles.aiBox)}>
        <div className={styles.head}>
          <Icon name="ic-spark" size={14} color={color.violetInk} />
          <span className={cx(styles.h, styles.aiH)}>{t('suggest')}</span>
        </div>
        <div className={styles.body}>{suggest}</div>
      </div>
      <div className={cx(styles.card, styles.cardPad)}>
        <div className={styles.t13}>{t('follow')}</div>
        <div className={cx(styles.body, styles.follow)}>
          <Icon name="ic-clock" size={15} color={color.amberGold} />
          {t('followText')}
        </div>
      </div>
    </>
  );
}

export function HistoryTab({ q, meta }: { q: Quote; meta: QuotesMeta }) {
  const t = useTranslations('quotes.detail');
  const ts = useTranslations('quotes.status');
  const { styles, cx } = useQuoteTabStyles();
  const d = useQuoteDetailStyles().styles;
  const stamp = useStamp();
  const ui = useQuotesUi();
  const versions = useQuery(quoteVersionsQuery(q.id)).data ?? [];
  const who = (k: string) => (k === 'open' ? '—' : q.owner_name);
  return (
    <>
      <div className={cx(styles.card, styles.cardPad)}>
        <div className={styles.t13}>{t('historyTitle')}</div>
        {meta.history.map(([k, c]) => (
          <div key={k} className={styles.tl}>
            <span className={styles.tlIc}>
              <span className={styles.tlDot} style={{ background: c }} />
            </span>
            <div className={d.grow}>
              <div className={cx(styles.tlT, styles.tlB)}>
                {k === 'current' ? t('hist.current', { n: q.version }) : t(`hist.${k}` as never)}
              </div>
              <div className={styles.tlM}>{t('histWho', { who: who(k), at: stamp(q.created_at) })}</div>
            </div>
          </div>
        ))}
      </div>
      {versions.length > 1 ? (
        <div className={cx(styles.card, styles.cardPad)} data-testid="q-versions">
          <div className={styles.t13}>{t('versions')}</div>
          {versions.map((v) => (
            <button
              key={v.id}
              type="button"
              className={cx(styles.todo, styles.verBtn)}
              onClick={() => ui.set({ detail: v.id, tab: 'overview' })}
              data-testid="q-version"
            >
              <span className={styles.todoT}>{t('version', { n: v.version })}</span>
              <span
                className={d.st}
                style={{ color: STATUS_TONE[v.status][0], background: STATUS_TONE[v.status][1] }}
              >
                {ts(v.status)}
              </span>
            </button>
          ))}
        </div>
      ) : null}
      <Comments q={q} />
    </>
  );
}
