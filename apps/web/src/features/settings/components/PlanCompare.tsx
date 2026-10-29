// "So sánh chi tiết các gói" — prototype L6496–6499 / L1015–1018: đầu (Thu gọn / Mở rộng tất cả + segment riêng), header 4 gói,
// nhóm thu gọn được. Bỏ nhóm OUT (Gọi điện, Workflow, Báo cáo — prototype-parity §6) ngay ở dữ liệu.
'use client';
import { useTranslations } from 'next-intl';
import { usePlanStyles } from '../styles/plans.styles';
import { useBillingUi } from '../billing-store';
import type { BillingCatalog, PlanSeg } from '../types';

const SEGS: PlanSeg[] = ['personal', 'business'];
const OPEN = '▾';
const CLOSED = '▸';

export function PlanSeg({ value, onChange, small }: { value: PlanSeg; onChange: (s: PlanSeg) => void; small?: boolean }) {
  const t = useTranslations('settings.billing.seg');
  const { styles, cx } = usePlanStyles();
  return (
    <div className={cx(styles.seg, small && styles.segSm)}>
      {SEGS.map((s) => (
        <button key={s} type="button" aria-pressed={value === s} onClick={() => onChange(s)} data-testid={`seg-${s}`}>
          {t(s)}
        </button>
      ))}
    </div>
  );
}

export function PlanCompare({ cat }: { cat: BillingCatalog }) {
  const t = useTranslations('settings.billing.cmp');
  const { styles, cx } = usePlanStyles();
  const { cmpSeg, cmpClosed, set } = useBillingUi();
  const allClosed = cmpClosed.length === cat.compare.length;
  const toggle = (g: string) => set({ cmpClosed: cmpClosed.includes(g) ? cmpClosed.filter((x) => x !== g) : [...cmpClosed, g] });
  return (
    <div className={styles.cmp} data-testid="plan-compare">
      <div className={styles.cmpHead}>
        <div className={styles.cmpT}>{t('title')}</div>
        <button type="button" className={styles.chip} onClick={() => set({ cmpClosed: allClosed ? [] : cat.compare.map((g) => g.group) })}>
          {t(allClosed ? 'expand' : 'collapse')}
        </button>
        <PlanSeg small value={cmpSeg} onChange={(s) => set({ cmpSeg: s })} />
      </div>
      <div className={cx(styles.cmpRow, styles.cmpTh)}>
        <span className={styles.cmpThL}>{t('feature')}</span>
        {cat.plans[cmpSeg].map((p) => (
          <span key={p.key}>{p.name}</span>
        ))}
      </div>
      {cat.compare.map((g) => {
        const open = !cmpClosed.includes(g.group);
        return (
          <div key={g.group} data-cmp-group={g.group}>
            <button type="button" className={styles.cmpG} onClick={() => toggle(g.group)} aria-expanded={open}>
              <span className={styles.caret}>{open ? OPEN : CLOSED}</span>
              {t(`group.${g.group}`)}
            </button>
            {open
              ? g.rows.map((r) => (
                  <div key={r.feature} className={styles.cmpRow}>
                    <span className={styles.cmpFeat}>{r.feature}</span>
                    {r[cmpSeg].map((v, i) => (
                      <span key={i}>{v}</span>
                    ))}
                  </div>
                ))
              : null}
          </div>
        );
      })}
    </div>
  );
}
