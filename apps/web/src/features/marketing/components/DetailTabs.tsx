// Ba tab trang chi tiết chiến dịch — prototype L3816–3863: Danh sách khách hàng (5 thẻ số, lọc, pill, bảng người nhận) · Nội dung · Lịch sử gửi.
'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Icon, color, type IconName } from '@appchat/ui';
import { useDetailStyles } from '../styles/detail.styles';
import { useRecStyles } from '../styles/recipients.styles';
import { CHANNEL_LOOK, REC_TONE, avColor } from '../status';
import type { CampaignDetail } from '../types';

const PILLS = ['all', 'delivered', 'opened', 'clicked', 'unread', 'failed'] as const;
const SELECTS = ['fStatus', 'fSeg', 'fTime'] as const;
const R_COLS = ['cust', 'phone', 'status', 'sent', 'read', 'click'] as const;
const EV_LOOK: Record<string, [IconName, string]> = {
  created: ['ic-plus', color.violet],
  submitted: ['ic-send', color.info],
  approved: ['ic-check', color.closedGreen],
  started: ['ic-mega', color.amberGold],
  rejected: ['ic-x', color.dangerStrong],
  paused: ['ic-clock', color.amberGold],
  resumed: ['ic-play', color.okStrong],
  cancelled: ['ic-x', color.text3],
  edited: ['ic-edit', color.blue],
};
/** Tỷ lệ chuyển đổi trên click — prototype mkStatCards (cv = click × 0,146). */
const CONV = 0.146;
const num = (n: number) => n.toLocaleString('vi-VN');
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 1000) / 10}%` : '0%');

function matches(st: string, read: string, pill: (typeof PILLS)[number]) {
  if (pill === 'all') return true;
  if (pill === 'unread') return st === 'delivered';
  if (pill === 'opened') return !!read && st !== 'failed';
  return st === pill;
}

export function RecipientsTab({ c }: { c: CampaignDetail }) {
  const t = useTranslations('marketing.detail');
  const d = useDetailStyles().styles;
  const { styles, cx } = useRecStyles();
  const [pill, setPill] = useState<(typeof PILLS)[number]>('all');
  const [q, setQ] = useState('');
  const { sent, open, click } = c.stats;
  const cv = Math.round(click * CONV);
  const stats: [string, string, string, string, IconName][] = [
    ['sent', num(sent), t('all'), color.info, 'ic-trend'],
    ['read', num(open), pct(open, sent), color.brand, 'ic-eye'],
    ['click', num(click), pct(click, sent), color.mkOpen, 'ic-trend'],
    ['conv', num(cv), pct(cv, sent), color.violet, 'ic-check'],
    ['revenue', t('revenueV'), t('roi'), color.amberGold, 'ic-trend'],
  ];
  const rows = sent
    ? c.recipients.filter(([n, ph, st, , read]) => matches(st, read, pill) && (!q || `${n} ${ph}`.toLowerCase().includes(q.toLowerCase())))
    : [];
  return (
    <>
      <div className={styles.stats}>
        {stats.map(([k, v, sub, tone, ic]) => (
          <div key={k} className={styles.stat}>
            <div className={styles.statH}>
              {t(`stat.${k}`)}
              <span className={styles.statIc} style={{ background: `${tone}18` }}>
                <Icon name={ic} size={14} color={tone} strokeWidth={1.9} />
              </span>
            </div>
            <div className={styles.statV}>{v}</div>
            <div className={styles.statS}>{sub}</div>
          </div>
        ))}
      </div>
      <div className={styles.filters}>
        {SELECTS.map((k) => (
          <select key={k} className={styles.sel} aria-label={t(k)}>
            <option>{t(k)}</option>
          </select>
        ))}
        <div className={styles.search}>
          <Icon name="ic-search" size={14} color={color.text4} strokeWidth={1.9} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('rSearch')} aria-label={t('rSearch')} data-testid="mk-rec-q" />
        </div>
        <span className={cx(d.ghost, styles.sel)}>
          <Icon name="ic-filter" size={13} color={color.text3} />
          {t('adv')}
        </span>
      </div>
      <div className={styles.pills}>
        {PILLS.map((p) => (
          <button key={p} type="button" className={cx(styles.pill, pill === p && styles.pillOn)} onClick={() => setPill(p)} data-testid={`mk-pill-${p}`}>
            {t(`pills.${p}`)}
          </button>
        ))}
      </div>
      <div className={styles.listH}>
        <span className={styles.listT}>{t('list')}</span>
        <span className={d.sub}>{t('listN', { n: num(sent) })}</span>
      </div>
      <div className={styles.table} data-testid="mk-recipients">
        <div className={styles.thead}>
          <span />
          {R_COLS.map((k) => (
            <span key={k}>{t(`rCol.${k}`)}</span>
          ))}
          <span className={d.end}>{t('rCol.act')}</span>
        </div>
        {rows.map(([n, ph, st, at, read, cl]) => {
          const [fg, bg] = REC_TONE[st] ?? REC_TONE.delivered!;
          return (
            <div key={ph} className={styles.row} data-rec={st}>
              <input type="checkbox" aria-label={n} />
              <div className={styles.who}>
                <span className={styles.av} style={{ background: avColor(n) }}>
                  {n.charAt(0)}
                </span>
                <span className={styles.rn}>{n}</span>
              </div>
              <span className={styles.ph}>{ph}</span>
              <span>
                <span className={styles.rst} style={{ color: fg, background: bg }}>
                  {t(`rst.${st}`)}
                </span>
              </span>
              <span className={styles.t1}>{at || '—'}</span>
              <span className={styles.t2}>{read || '—'}</span>
              <span className={styles.t2}>{cl || '—'}</span>
              <div className={styles.acts}>
                <button type="button" aria-label={t('view')}>
                  <Icon name="ic-eye" size={14} color={color.text3} />
                </button>
                <button type="button" aria-label={t('more')}>
                  <Icon name="ic-menu" size={15} color={color.text4} />
                </button>
              </div>
            </div>
          );
        })}
        {rows.length ? null : <div className={styles.empty}>{t('notSent')}</div>}
      </div>
    </>
  );
}

export function ContentTab({ c }: { c: CampaignDetail }) {
  const t = useTranslations('marketing');
  const { styles } = useDetailStyles();
  const [tone, g] = CHANNEL_LOOK[c.channel];
  return (
    <div className={styles.narrow} data-testid="mk-content">
      <div className={styles.secT}>{t('detail.contentT')}</div>
      <div className={styles.card}>
        <div className={styles.cardH}>
          <span className={styles.chIcSm} style={{ background: tone }}>
            {g}
          </span>
          {t(`chanLabel.${c.channel}`)}
          <span className={styles.grow} />
          <span className={styles.cardN}>{t('detail.approved')}</span>
        </div>
        {c.content.subject ? <div className={styles.subj}>{c.content.subject}</div> : null}
        <div className={styles.bubble}>{c.content.text}</div>
      </div>
    </div>
  );
}

export function HistoryTab({ c }: { c: CampaignDetail }) {
  const t = useTranslations('marketing.detail');
  const { styles } = useDetailStyles();
  return (
    <div className={styles.narrow} data-testid="mk-history">
      <div className={styles.secT}>{t('historyT')}</div>
      {c.history.map(([kind = '', by, at], i) => {
        const [ic, tone] = EV_LOOK[kind] ?? EV_LOOK.created!;
        return (
          <div key={`${kind}${i}`} className={styles.ev}>
            <div className={styles.evRail}>
              <span className={styles.evIc} style={{ background: `${tone}18` }}>
                <Icon name={ic} size={14} color={tone} />
              </span>
              <span className={styles.evLine} />
            </div>
            <div className={styles.evBody}>
              <div className={styles.evT}>{t(`ev.${kind}`)}</div>
              <div className={styles.evS}>{`${by} · ${at}`}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
