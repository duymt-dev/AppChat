// Ba tab trang chi tiết chiến dịch — prototype L3816–3863: Danh sách khách hàng (5 thẻ số, pill trạng thái, bảng người nhận) · Nội dung ·
// Lịch sử gửi. Số đo theo bằng chứng (DC-240): Đã gửi = kênh nhận / snapshot đủ điều kiện; Phản hồi / Chuyển đổi đếm khách duy nhất; kênh
// không xác nhận đọc → thẻ "Chưa rõ kết quả" (cần kiểm, không tự gửi lại). Người nhận phân trang ở server (GET /campaigns/:id/recipients).
'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Icon, color, type IconName } from '@appchat/ui';
import { useFmt } from '@/shared/i18n/useFmt';
import { ListPager } from '@/shared/list/ListPager';
import type { PageState } from '@/shared/list/paged';
import { useDetailStyles } from '../styles/detail.styles';
import { useRecStyles } from '../styles/recipients.styles';
import { recipientsQuery } from '../api';
import { CHANNEL_LOOK, REC_TONE, avColor } from '../status';
import type { CampaignDetail } from '../types';
import { RecipientActions } from './RecipientActions';

const PILLS = ['all', 'sent', 'replied', 'converted', 'pending', 'skipped', 'failed'] as const;
const R_COLS = ['cust', 'phone', 'status', 'sent', 'reply'] as const;
const EV_LOOK: Record<string, [IconName, string]> = {
  created: ['ic-plus', color.violet],
  submitted: ['ic-send', color.info],
  approved: ['ic-check', color.closedGreen],
  started: ['ic-mega', color.amberGold],
  completed: ['ic-check', color.violet],
  rejected: ['ic-x', color.dangerStrong],
  paused: ['ic-clock', color.amberGold],
  held: ['ic-clock', color.amberText],
  resumed: ['ic-play', color.okStrong],
  cancelled: ['ic-x', color.text3],
  edited: ['ic-edit', color.blue],
  reopened: ['ic-edit', color.blue],
  test_sent: ['ic-mail', color.info],
  undo: ['ic-refresh', color.text3],
};
/** Detail kèm trang đầu 50 người nhận — các trang sau cùng cỡ. */
const FIRST: PageState = { page: 1, limit: 50 };
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 1000) / 10}%` : '—');

export function RecipientsTab({ c }: { c: CampaignDetail }) {
  const t = useTranslations('marketing.detail');
  const fmt = useFmt();
  const d = useDetailStyles().styles;
  const { styles, cx } = useRecStyles();
  const [pill, setPill] = useState<(typeof PILLS)[number]>('all');
  const [pg, setPg] = useState(FIRST);
  const first = pill === 'all' && pg.page === 1;
  const page = useQuery({ ...recipientsQuery(c.id, pill === 'all' ? undefined : pill, pg), enabled: !first });
  const rows = first ? c.recipients : (page.data?.data ?? []);
  const meta = first ? { total: c.recipients_total, page: 1, limit: pg.limit } : page.data?.meta;
  const s = c.stats;
  const stats: [string, string, string, string, IconName][] = [
    ['sent', fmt.number(s.sent), t('ofEligible', { n: fmt.number(s.eligible) }), color.info, 'ic-send'],
    ['reply', fmt.number(s.replied), pct(s.replied, s.sent), color.brand, 'ic-reply'],
    ['conv', fmt.number(s.converted), pct(s.converted, s.sent), color.violet, 'ic-check'],
    ['unknown', fmt.number(s.unknown), s.unknown ? t('unknownHint') : t('none'), color.amberText, 'ic-help'],
    ['revenue', fmt.money(s.revenue), t('revenueHint'), color.amberGold, 'ic-trend'],
  ];
  return (
    <>
      <div className={styles.stats}>
        {stats.map(([k, v, sub, tone, ic]) => (
          <div key={k} className={styles.stat} data-testid={`mk-stat-${k}`}>
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
      {c.capabilities.read_receipt ? null : <div className={d.sub}>{t('noReadReceipt')}</div>}
      <div className={styles.pills}>
        {PILLS.map((p) => (
          <button key={p} type="button" className={cx(styles.pill, pill === p && styles.pillOn)} onClick={() => (setPill(p), setPg(FIRST))} data-testid={`mk-pill-${p}`}>
            {t(`pills.${p}`)}
          </button>
        ))}
      </div>
      <div className={styles.listH}>
        <span className={styles.listT}>{t('list')}</span>
        <span className={d.sub}>{t('listN', { n: fmt.number(meta?.total ?? 0) })}</span>
      </div>
      <div className={styles.table} data-testid="mk-recipients">
        <div className={styles.thead}>
          <span />
          {R_COLS.map((k) => (
            <span key={k}>{t(`rCol.${k}`)}</span>
          ))}
          <span />
          <span className={d.end}>{t('rCol.act')}</span>
        </div>
        {rows.map((r) => {
          const [fg, bg] = REC_TONE[r.status] ?? REC_TONE.sent!;
          const label = r.outcome === 'unknown' ? t('rst.unknown') : r.status === 'skipped' && r.skip_reason ? t(`skip.${r.skip_reason}`) : t(`rst.${r.status}`);
          return (
            <div key={r.id} className={styles.row} data-rec={r.status}>
              <span />
              <div className={styles.who}>
                <span className={styles.av} style={{ background: avColor(r.name) }}>
                  {r.name.charAt(0)}
                </span>
                <span className={styles.rn}>{r.name}</span>
              </div>
              <span className={styles.ph}>{r.endpoint}</span>
              <span>
                <span className={styles.rst} style={{ color: fg, background: bg }}>
                  {label}
                </span>
              </span>
              <span className={styles.t1}>{r.sent_at ? `${fmt.date(r.sent_at)} ${fmt.time(r.sent_at)}` : '—'}</span>
              <span className={styles.t2}>{r.replied_at ? `${fmt.date(r.replied_at)} ${fmt.time(r.replied_at)}` : '—'}</span>
              <span />
              <RecipientActions r={r} />
            </div>
          );
        })}
        {rows.length ? null : <div className={styles.empty}>{c.stats.eligible || c.recipients_total ? t('noMatch') : t('notSent')}</div>}
      </div>
      {meta && meta.total > meta.limit ? <ListPager meta={meta} unit={t('unit')} onChange={setPg} testId="mk-rec-pager" /> : null}
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
          {`${t(`chanLabel.${c.channel}`)} · ${c.account_name}`}
          <span className={styles.grow} />
          {c.approved_at ? <span className={styles.cardN}>{t('detail.approved')}</span> : null}
        </div>
        {c.content.subject ? <div className={styles.subj}>{c.content.subject}</div> : null}
        <div className={styles.bubble}>{c.content.text}</div>
        {c.ab ? <div className={styles.bubble}>{`${t('detail.variantB')}: ${c.ab.text_b}`}</div> : null}
      </div>
    </div>
  );
}

export function HistoryTab({ c }: { c: CampaignDetail }) {
  const t = useTranslations('marketing.detail');
  const fmt = useFmt();
  const { styles } = useDetailStyles();
  return (
    <div className={styles.narrow} data-testid="mk-history">
      <div className={styles.secT}>{t('historyT')}</div>
      {c.history.map(([kind, by, at], i) => {
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
              <div className={styles.evT}>{t(`ev.${kind}` as never)}</div>
              <div className={styles.evS}>{`${by} · ${fmt.date(at)} ${fmt.time(at)}`}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
