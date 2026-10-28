// Thư viện mẫu theo ngành — prototype L2240–2287: tìm + 3 select (nhóm ngành / ngành / AI Agent) + Xoá lọc, lưới 5 cột, 20 mẫu / trang.
'use client';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Icon, color, type IconName } from '@appchat/ui';
import { useAgentsStyles } from '../styles/agents.styles';
import { templatesQuery } from '../api';
import { ALL_TEMPLATES, useAgentsUi } from '../agents-store';
import type { AgentTemplate, AgentsMeta, TemplateFilter } from '../types';

const PAGE = 20;

export function TemplateGallery({ meta, onPick }: { meta: AgentsMeta; onPick: (tpl: AgentTemplate) => void }) {
  const t = useTranslations('agents');
  const { styles, cx } = useAgentsStyles();
  const f = useAgentsUi((s) => s.tplFilter);
  const pg = useAgentsUi((s) => s.tplPage);
  const setPg = (tplPage: number) => useAgentsUi.getState().set({ tplPage });
  const q = useQuery(templatesQuery(f));
  const rows = q.data?.data ?? [];
  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const cur = Math.min(pg, pages);
  const shown = rows.slice((cur - 1) * PAGE, cur * PAGE);
  const patch = (p: Partial<TemplateFilter>) => useAgentsUi.getState().setTplFilter(p);
  const industries = meta.taxonomy.find((g) => g.group === f.group)?.industries ?? [];
  const groupOf = (tag: string) => meta.taxonomy.find((g) => g.industries.includes(tag))?.group;
  const names = meta.template_names.filter(
    (n) => (f.group === 'all' || groupOf(n.tag) === f.group) && (f.industry === 'all' || n.tag === f.industry),
  );

  return (
    <section data-testid="ag-gallery">
      <div className={styles.secHead}>
        <Icon name="ic-spark" size={17} color={color.brand} strokeWidth={1.9} />
        <div className={styles.secTitle}>{t('tplTitle')}</div>
        <span className={styles.grow} />
        <span className={styles.hint}>{t('tplHint')}</span>
      </div>
      <div className={styles.secSub}>{t('tplSub')}</div>
      <div className={styles.filters}>
        <label className={styles.search}>
          <Icon name="ic-search" size={15} color={color.text4} strokeWidth={1.9} />
          <input value={f.q} onChange={(e) => patch({ q: e.target.value })} placeholder={t('search')} aria-label={t('search')} data-testid="ag-search" />
        </label>
        <select className={styles.select} value={f.group} onChange={(e) => patch({ group: e.target.value, industry: 'all', name: 'all' })} aria-label={t('groupAll')} data-testid="ag-group">
          <option value="all">{t('groupAll')}</option>
          {meta.taxonomy.map((g) => (
            <option key={g.group} value={g.group}>
              {g.group}
            </option>
          ))}
        </select>
        <select className={styles.select} value={f.industry} onChange={(e) => patch({ industry: e.target.value, name: 'all' })} aria-label={t('industryAll')} data-testid="ag-industry">
          <option value="all">{t('industryAll')}</option>
          {industries.map((i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </select>
        <select className={styles.select} value={f.name} onChange={(e) => patch({ name: e.target.value })} aria-label={t('agentAll')} data-testid="ag-name">
          <option value="all">{t('agentAll')}</option>
          {names.map((n) => (
            <option key={n.name} value={n.name}>
              {n.name}
            </option>
          ))}
        </select>
        <button type="button" className={styles.clear} onClick={() => patch(ALL_TEMPLATES)} data-testid="ag-clear">
          {t('clear')}
        </button>
      </div>
      <div className={styles.grid}>
        {shown.map((tpl) => (
          <button key={tpl.id} type="button" className={styles.card} onClick={() => onPick(tpl)} data-testid="ag-tpl">
            <div className={styles.cardHead}>
              <span className={styles.cardIcon} style={{ background: tpl.tint }}>
                <Icon name={tpl.icon as IconName} size={15} color={tpl.color} strokeWidth={1.9} />
              </span>
              <span className={styles.cardName}>{tpl.name}</span>
            </div>
            <div className={styles.cardDesc}>{tpl.desc}</div>
            <div className={styles.cardFoot}>
              <span className={styles.tag} style={{ color: tpl.color, background: tpl.tint }}>
                {tpl.tag}
              </span>
              <span className={styles.grow} />
              <span className={styles.install}>{t('install')}</span>
            </div>
          </button>
        ))}
        {q.isSuccess && !total ? <div className={styles.empty}>{t('noTpl')}</div> : null}
      </div>
      <div className={styles.pager}>
        <span className={styles.pgInfo} data-testid="ag-pg-info">
          {t('pageInfo', { from: total ? (cur - 1) * PAGE + 1 : 0, to: Math.min(cur * PAGE, total), total })}
        </span>
        <span className={styles.grow} />
        <button type="button" className={cx(styles.pg, styles.pgArrow)} disabled={cur <= 1} onClick={() => setPg(cur - 1)} aria-label={t('prev')}>
          {t('prev')}
        </button>
        {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
          <button key={n} type="button" className={cx(styles.pg, n === cur && styles.pgOn)} aria-current={n === cur} onClick={() => setPg(n)}>
            {n}
          </button>
        ))}
        <button type="button" className={cx(styles.pg, styles.pgArrow)} disabled={cur >= pages} onClick={() => setPg(cur + 1)} aria-label={t('next')}>
          {t('next')}
        </button>
      </div>
    </section>
  );
}
