// "Trung tâm cập nhật" — 3 tab Cần follow / Tin tức / Thông báo, thu nhỏ thành nút "Cập nhật" (prototype L1138–1176).
// Follow-up xong → follow_up.complete (hoàn tác 24h). Việc follow là bản ghi thật (TIP-038 pha 2): API trả ≤ 5 theo hạn + `total` còn lại
// người xem thấy; "Mở tất cả" khi đã mở rộng → Khách hàng.
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useWidgetStyles } from './widget.styles';
import type { FollowUp, NewsItem, NotificationItem } from '../types';

type Tab = 'follow' | 'news' | 'notif';
/** Prototype: mặc định thu gọn 2 khách, mở rộng 5 (L9227, fuCollapsed = true). */
const LIMIT = { collapsed: 2, expanded: 5 } as const;
const tint = (c: string) => `${c}18`;

export interface UpdatesWidgetProps {
  followUps: FollowUp[];
  /** Số việc follow còn mở người xem thấy (có thể > số dòng trả về). */
  total: number;
  news: NewsItem[];
  notifications: NotificationItem[];
}

export function UpdatesWidget({ followUps, total, news, notifications }: UpdatesWidgetProps) {
  const t = useTranslations('dashboard.widget');
  const router = useRouter();
  const { styles, cx } = useWidgetStyles();
  const complete = useAction('follow_up.complete');
  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState<Tab>('follow');
  const [expanded, setExpanded] = useState(false);
  const overdue = followUps.filter((f) => f.overdue).length;
  const unread = notifications.filter((n) => n.unread).length;

  if (!open) {
    return (
      <button type="button" className={styles.pill} onClick={() => setOpen(true)} data-testid="updates-pill">
        <Icon name="ic-bell" size={18} strokeWidth={1.9} color={color.white} />
        {t('short')}
        <span className={styles.pillCount}>{total}</span>
      </button>
    );
  }

  const tabBtn = (k: Tab, label: string, count?: number, red?: boolean) => (
    <button type="button" className={cx(styles.tab, tab === k && styles.tabOn)} onClick={() => setTab(k)} aria-pressed={tab === k}>
      {label}
      {count ? <span className={cx(styles.count, red && styles.countRed)}>{count}</span> : null}
    </button>
  );

  return (
    <aside className={styles.panel} data-testid="updates-widget">
      <div className={styles.head}>
        <Icon name="ic-bell" size={16} strokeWidth={1.9} color={color.white} />
        <span className={styles.title}>{t('title')}</span>
        <button type="button" className={styles.min} onClick={() => setOpen(false)} aria-label={t('collapse')}>
          ▾
        </button>
      </div>
      <div className={styles.tabs}>
        {tabBtn('follow', t('follow'), total)}
        {tabBtn('news', t('news'))}
        {tabBtn('notif', t('notif'), unread, true)}
      </div>
      <div className={styles.body}>
        {tab === 'follow' ? (
          <>
            <div className={styles.bar}>
              <span className={styles.grow}>
                {t('due', { n: total })}
                {overdue ? <span className={styles.overdue}>{t('overdue', { n: overdue })}</span> : null}
              </span>
              <button type="button" className={styles.openAll} onClick={() => (expanded ? router.push('/customers') : setExpanded(true))}>
                {t('openAll')}
              </button>
            </div>
            {followUps.length === 0 ? <div className={styles.empty}>{t('empty')}</div> : null}
            {followUps.slice(0, expanded ? LIMIT.expanded : LIMIT.collapsed).map((f) => (
              <div key={f.id} className={styles.row} data-testid="follow-row">
                <div className={styles.avatarWrap}>
                  {/* màu avatar / kênh / giai đoạn là dữ liệu của bản ghi */}
                  <span className={styles.avatar} style={{ background: f.avatar }}>
                    {f.initial}
                  </span>
                  <span className={styles.ch} style={{ background: f.channel_bg }}>
                    {f.channel}
                  </span>
                </div>
                <div className={styles.grow}>
                  <div className={styles.name}>{f.name}</div>
                  <div className={styles.svc}>{f.service}</div>
                  <div className={styles.tags}>
                    <span className={styles.tag} style={{ background: tint(f.stage_color), color: f.stage_color }}>
                      {f.stage}
                    </span>
                    <span
                      className={styles.tag}
                      style={f.overdue ? { background: color.dangerBg, color: color.dangerStrong } : { background: color.amberBg, color: color.amberText }}
                    >
                      {f.due}
                    </span>
                  </div>
                </div>
                <button type="button" className={styles.done} aria-label={t('done')} onClick={() => void complete.run({ follow_up_id: f.id })}>
                  <Icon name="ic-check" size={14} strokeWidth={2.6} color={color.white} />
                </button>
              </div>
            ))}
          </>
        ) : null}
        {tab === 'news'
          ? news.map((n) => (
              <div key={n.title} className={cx(styles.row, styles.rowPad)}>
                <div className={styles.grow}>
                  <div className={styles.newsHead}>
                    <span className={styles.newsTag} style={{ background: tint(n.color), color: n.color }}>
                      {n.tag}
                    </span>
                    <span className={styles.date}>{n.date}</span>
                  </div>
                  <div className={styles.newsTitle}>{n.title}</div>
                  <div className={styles.newsDesc}>{n.desc}</div>
                </div>
              </div>
            ))
          : null}
        {tab === 'notif'
          ? notifications.map((n) => (
              <div key={n.text} className={cx(styles.row, styles.rowPad)}>
                <span className={styles.ntIcon} style={{ background: tint(n.color) }}>
                  <Icon name={n.icon} size={15} strokeWidth={1.9} color={n.color} />
                </span>
                <div className={styles.grow}>
                  <div className={styles.ntText}>{n.text}</div>
                  <div className={styles.time}>{n.time}</div>
                </div>
                {n.unread ? <span className={styles.unread} /> : null}
              </div>
            ))
          : null}
      </div>
    </aside>
  );
}
