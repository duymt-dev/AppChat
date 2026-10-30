// Đầu màn Marketing — prototype L3396–3477: topbar (AI phân tích · Tạo thủ công · Trợ lý AI), tab kênh (Tất cả · Email · Zalo cá nhân · Automation),
// hero theo kênh hoặc 4 KPI tổng quan, tab trạng thái (+ Chờ duyệt / Nháp / Từ chối), hàng lọc. Ngoại lệ §6 Kênh: bỏ SMS / ZNS / ZBS.
'use client';
import { useTranslations } from 'next-intl';
import { AiButton, Icon, color, type IconName } from '@appchat/ui';
import { useCan } from '@/shared/authz/useCan';
import { useMarketingStyles } from '../styles/marketing.styles';
import { useMarketingUi } from '../marketing-store';
import { CHAN_TABS, EXTRA_TABS, STATUS_TABS } from '../status';
import type { CampaignStatus, MarketingMeta } from '../types';
import { ChannelHero } from './ChannelHero';

const KPI_LOOK: Record<string, [IconName, string]> = {
  running: ['ic-mega', color.brand],
  sent: ['ic-send', color.info],
  open: ['ic-eye', color.amberGold],
  click: ['ic-chart', color.violet],
};
const STATUSES: CampaignStatus[] = ['running', 'scheduled', 'completed', 'paused', 'cancelled'];

function Kpis({ meta }: { meta: MarketingMeta }) {
  const t = useTranslations('marketing.kpi');
  const { styles } = useMarketingStyles();
  return (
    <div className={styles.kpis} data-testid="mk-kpis">
      {meta.kpis.map(([k, v, trend]) => {
        const [ic, c] = KPI_LOOK[k] ?? KPI_LOOK.running!;
        return (
          <div key={k} className={styles.kpi}>
            <div className={styles.kpiH}>
              <span className={styles.kpiIc} style={{ background: `${c}18` }}>
                <Icon name={ic} size={15} color={c} />
              </span>
              {t(k)}
            </div>
            <div className={styles.kpiV}>{v}</div>
            <div className={styles.kpiT}>{t('trend', { v: trend })}</div>
          </div>
        );
      })}
    </div>
  );
}

export function MarketingHeader({ meta }: { meta: MarketingMeta | undefined }) {
  const t = useTranslations('marketing');
  const tc = useTranslations('common');
  const { styles, cx } = useMarketingStyles();
  const ui = useMarketingUi();
  const canCreate = useCan('campaign.manage');
  const f = ui.filter;
  const tabs = [...STATUS_TABS, ...EXTRA_TABS];
  return (
    <>
      <div className={styles.top}>
        <div className={styles.title}>{t('title')}</div>
        <span className={styles.sub}>{t('sub')}</span>
        <span className={styles.grow} />
        <button type="button" className={styles.dark} onClick={() => ui.set({ analyze: 'loading', pick: null })} data-testid="mk-analyze">
          <Icon name="ic-spark" size={15} color={color.sparkMint} strokeWidth={1.9} />
          {t('analyze')}
        </button>
        {canCreate ? (
          <button
            type="button"
            className={styles.outline}
            onClick={() => ui.set({ wizard: true, fromSuggestion: null, prefill: null })}
            data-testid="mk-create"
          >
            <Icon name="ic-plus" size={14} color={color.text3} strokeWidth={2} />
            {t('create')}
          </button>
        ) : null}
        <AiButton label={tc('aiButton')} module={t('title')} onClick={() => ui.set({ aiOpen: true })} testId="mk-ai-open" />
      </div>
      <div className={styles.chans} role="tablist">
        {CHAN_TABS.map(([k, c, ic]) => {
          const on = f.channel === k;
          return (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={on}
              className={cx(styles.chan, on && styles.chanOn)}
              style={on ? { background: c } : undefined}
              onClick={() => ui.setFilter({ channel: k })}
              data-testid={`mk-chan-${k}`}
            >
              <Icon name={ic} size={14} color={on ? color.white : c} strokeWidth={1.9} />
              {t(`chan.${k}`)}
            </button>
          );
        })}
      </div>
      {meta && f.channel !== 'all' ? <ChannelHero meta={meta} chan={f.channel} /> : null}
      {meta && f.channel === 'all' ? <Kpis meta={meta} /> : null}
      <div className={styles.tabs} role="tablist">
        {tabs.map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={f.status === k}
            className={cx(styles.tab, f.status === k && styles.tabOn)}
            onClick={() => ui.setFilter({ status: k })}
            data-testid={`mk-tab-${k}`}
          >
            {t(`status.${k}`)}
            {k === 'pending_approval' && meta?.pending ? <span className={styles.tabN}>{meta.pending}</span> : null}
          </button>
        ))}
      </div>
      <div className={styles.bar}>
        <div className={styles.search}>
          <Icon name="ic-search" size={13} color={color.text4} strokeWidth={1.9} />
          <input
            value={f.q}
            onChange={(e) => ui.setFilter({ q: e.target.value })}
            placeholder={t('search')}
            aria-label={t('search')}
            data-testid="mk-search"
          />
        </div>
        <select
          className={styles.select}
          value={f.channel === 'auto' ? 'all' : f.channel}
          onChange={(e) => ui.setFilter({ channel: e.target.value as 'all' | 'zalo' | 'email' })}
          aria-label={t('col.channel')}
        >
          <option value="all">{t('col.channel')}</option>
          <option value="zalo">{t('chanLabel.zalo')}</option>
          <option value="email">{t('chanLabel.email')}</option>
        </select>
        <select
          className={styles.select}
          value={f.status}
          onChange={(e) => ui.setFilter({ status: e.target.value as CampaignStatus | 'all' })}
          aria-label={t('col.status')}
          data-testid="mk-f-status"
        >
          <option value="all">{t('col.status')}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(`status.${s}`)}
            </option>
          ))}
        </select>
        <DateRange />
        <span className={styles.grow} />
        <span className={styles.chip}>
          <Icon name="ic-sort" size={13} color={color.text3} />
          {t('sort')}
        </span>
      </div>
    </>
  );
}

function DateRange() {
  const t = useTranslations('marketing');
  const { styles } = useMarketingStyles();
  return (
    <>
      <input className={styles.date} placeholder={t('from')} aria-label={t('from')} />
      <span className={styles.arrow}>→</span>
      <input className={styles.date} placeholder={t('to')} aria-label={t('to')} />
    </>
  );
}
