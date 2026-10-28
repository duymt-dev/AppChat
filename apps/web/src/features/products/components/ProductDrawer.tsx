// Drawer chi tiết sản phẩm — prototype L5691–5749: EntityDrawer (392px, nền xám) với đầu tuỳ biến + 5 tab.
'use client';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { EntityDrawer, Icon, color, type IconName } from '@appchat/ui';
import { useFmt } from '@/shared/i18n/useFmt';
import { useDetailStyles } from '../styles/detail.styles';
import { useProductsUi } from '../products-store';
import { productQuery } from '../api';
import { AiTab, CrmTab, FilesTab, HistoryTab, OverviewTab } from './DetailTabs';
import type { ProductsMeta } from '../types';

const TABS = ['overview', 'crm', 'ai', 'files', 'history'] as const;
const STATUS = { active: [color.brandBg, color.brandInk], draft: [color.pillBg, color.text4] } as const;

export function ProductDrawer({ meta }: { meta: ProductsMeta }) {
  const t = useTranslations('products');
  const fmt = useFmt();
  const { styles, cx } = useDetailStyles();
  const ui = useProductsUi();
  const q = useQuery({ ...productQuery(ui.detail ?? ''), enabled: !!ui.detail });
  const p = q.data;
  const pal = p ? (meta.category_pal[p.category] ?? [p.tint, p.ink, p.icon]) : null;
  const [bg, fg] = STATUS[p?.status ?? 'active'];

  return (
    <EntityDrawer
      open={!!ui.detail}
      onClose={() => ui.set({ detail: null, tab: 'overview' })}
      title={p?.name ?? ''}
      closeLabel={t('detail.close')}
      testId="pd-drawer"
      muted
      tabs={TABS.map((k) => ({ key: k, label: t(`detail.tabs.${k}`) }))}
      tab={ui.tab}
      onTab={(k) => ui.set({ tab: k })}
      header={
        p && pal ? (
          <>
            <div className={styles.top}>
              <span className={styles.icon} style={{ background: pal[0] }}>
                <Icon name={pal[2] as IconName} size={26} color={pal[1]} strokeWidth={1.6} />
              </span>
              <div className={styles.grow}>
                <div className={styles.chips}>
                  <span className={styles.cat}>{p.category}</span>
                  <span className={styles.st} style={{ background: bg, color: fg }}>
                    {t(`status.${p.status}`)}
                  </span>
                </div>
                <div className={styles.name}>{p.name}</div>
              </div>
            </div>
            <div className={styles.kpis}>
              <div className={styles.kpi}>
                <div className={styles.kpiL}>{t('detail.price')}</div>
                <div className={cx(styles.kpiV, styles.green)}>{fmt.moneyShort(p.price)}</div>
              </div>
              <div className={styles.kpi}>
                <div className={styles.kpiL}>{t('detail.sold')}</div>
                <div className={styles.kpiV}>{fmt.number(p.sold)}</div>
              </div>
            </div>
          </>
        ) : null
      }
    >
      {p ? (
        <div className={styles.body}>
          {ui.tab === 'overview' ? <OverviewTab p={p} /> : null}
          {ui.tab === 'crm' ? <CrmTab meta={meta} /> : null}
          {ui.tab === 'ai' ? <AiTab /> : null}
          {ui.tab === 'files' ? <FilesTab meta={meta} /> : null}
          {ui.tab === 'history' ? <HistoryTab meta={meta} /> : null}
        </div>
      ) : null}
    </EntityDrawer>
  );
}
