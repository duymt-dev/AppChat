// Đầu màn Lịch hẹn — prototype L3873–3911: topbar (tiêu đề, chip Đồng bộ Tasks, tìm, Tạo lịch hẹn, Trợ lý AI), 5 KPI, thanh lọc + chuyển chế độ xem, banner đồng bộ.
// Chế độ xem theo Blueprint §7.2 ViewSwitch(list | day | week | month) — thêm "Ngày" vào nhóm nút của prototype.
'use client';
import { useTranslations } from 'next-intl';
import { AiButton, Icon, color, type IconName } from '@appchat/ui';
import { useCan } from '@/shared/authz/useCan';
import { useCalendarStyles } from '../styles/calendar.styles';
import { useCalendarUi } from '../calendar-store';
import { useTr } from '../hooks/useTr';
import { STATUSES } from '../status';
import type { CalView, CalendarMeta } from '../types';

const VIEWS: [CalView, IconName][] = [
  ['list', 'ic-inbox'],
  ['day', 'ic-clock'],
  ['week', 'ic-grid'],
  ['month', 'ic-cal'],
];
const KPI = [
  ['today', 'ic-cal', color.orange],
  ['arrived', 'ic-check', color.successStrong],
  ['pending', 'ic-clock', color.amberDeep],
  ['util', 'ic-chart', color.periwinkle],
  ['revenue', 'ic-gift', color.lavender],
] as const;

export function CalendarHeader({ meta }: { meta: CalendarMeta | undefined }) {
  const t = useTranslations('calendar');
  const tc = useTranslations('common');
  const { styles, cx } = useCalendarStyles();
  const ui = useCalendarUi();
  const canCreate = useCan('booking.manage');
  const tr = useTr();
  const s = meta?.stats;
  const kv: Record<(typeof KPI)[number][0], [string, string]> = {
    today: [String(s?.today ?? ''), t('kpi.todaySub', { n: s?.confirmed ?? 0 })],
    arrived: [String(s?.arrived ?? ''), t('kpi.arrivedSub', { n: s?.today ?? 0 })],
    pending: [String(s?.pending ?? ''), t('kpi.pendingSub')],
    util: [s ? t('hours', { n: s.hours }) : '', t('kpi.utilSub', { n: s?.capacity ?? 0 })],
    revenue: [s ? tr(s.revenue) : '', t('kpi.revenueSub', { n: s?.paid ?? 0 })],
  };
  return (
    <>
      <div className={styles.top}>
        <div className={styles.title}>{t('title')}</div>
        <span className={styles.syncChip}>
          <Icon name="ic-flow" size={11} color="currentColor" strokeWidth={2} />
          {t('sync')}
        </span>
        <span className={styles.grow} />
        <div className={styles.search}>
          <Icon name="ic-search" size={14} color={color.text4} />
          <input
            value={ui.filter.q}
            onChange={(e) => ui.setFilter({ q: e.target.value })}
            placeholder={t('search')}
            aria-label={t('search')}
            data-testid="cal-search"
          />
        </div>
        {canCreate ? (
          <button
            type="button"
            className={styles.primary}
            onClick={() => ui.set({ form: 'create', prefill: null })}
            data-testid="cal-create"
          >
            <Icon name="ic-plus" size={14} color={color.white} strokeWidth={2} />
            {t('create')}
          </button>
        ) : null}
        <AiButton label={tc('aiButton')} module={t('title')} onClick={() => ui.set({ aiOpen: true })} testId="cal-ai-open" />
      </div>
      <div className={styles.kpis} data-testid="cal-kpis">
        {KPI.map(([k, ic, c]) => (
          <div key={k} className={styles.kpi}>
            <span className={styles.kpiIc} style={{ background: `${c}18` }}>
              <Icon name={ic} size={17} color={c} strokeWidth={1.8} />
            </span>
            <div className={styles.grow}>
              <div className={styles.kpiL}>{t(`kpi.${k}`)}</div>
              <div className={styles.kpiV} data-testid={`cal-kpi-${k}`}>
                {kv[k][0]}
              </div>
              <div className={styles.kpiS}>{kv[k][1]}</div>
            </div>
          </div>
        ))}
      </div>
      <div className={styles.bar}>
        <select
          className={styles.select}
          value={ui.filter.team}
          onChange={(e) => ui.setFilter({ team: e.target.value })}
          aria-label={t('filter.team')}
        >
          <option value="all">{t('filter.team')}</option>
          <option value="tech">{t('filter.teams.tech')}</option>
          <option value="care">{t('filter.teams.care')}</option>
        </select>
        <select
          className={styles.select}
          value={ui.filter.staff_id}
          onChange={(e) => ui.setFilter({ staff_id: e.target.value })}
          aria-label={t('filter.staff')}
          data-testid="cal-f-staff"
        >
          <option value="all">{t('filter.staff')}</option>
          {meta?.staff.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </select>
        <select
          className={styles.select}
          value={ui.filter.status}
          onChange={(e) => ui.setFilter({ status: e.target.value })}
          aria-label={t('filter.status')}
          data-testid="cal-f-status"
        >
          <option value="all">{t('filter.status')}</option>
          {STATUSES.map((x) => (
            <option key={x} value={x}>
              {t(`status.${x}`)}
            </option>
          ))}
        </select>
        <span className={styles.grow} />
        <div className={styles.seg} role="tablist">
          {VIEWS.map(([v, ic]) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={ui.view === v}
              className={cx(styles.segBtn, ui.view === v && styles.segOn)}
              onClick={() => ui.set({ view: v })}
              data-testid={`cal-view-${v}`}
            >
              <Icon name={ic} size={13} color="currentColor" strokeWidth={1.9} />
              {t(`view.${v}`)}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.banner}>
        <Icon name="ic-spark" size={14} color={color.paidText} strokeWidth={1.9} />
        <span className={styles.bannerT}>{t('banner.title')}</span>
        <span className={styles.dot}>·</span>
        <span className={styles.muted}>{t.rich('banner.text', { n: meta?.follow_ups.length ?? 0, b: (c) => <b>{c}</b> })}</span>
        <span className={styles.grow} />
        <span className={styles.live}>{t('banner.live')}</span>
      </div>
    </>
  );
}
