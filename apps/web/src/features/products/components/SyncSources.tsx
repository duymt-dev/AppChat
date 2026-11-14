// Thẻ "Nguồn đồng bộ đa kênh" + thanh chip danh mục / chuyển Danh sách–Kanban — prototype L5638–5642.
'use client';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useProductsStyles } from '../styles/products.styles';
import { useProductsUi } from '../products-store';
import type { ProductsMeta } from '../types';

const ALL = 'all';

export function SyncSources({ meta }: { meta: ProductsMeta }) {
  const t = useTranslations('products');
  const { styles } = useProductsStyles();
  return (
    <div className={styles.sources} data-testid="pd-sources">
      <div className={styles.srcHead}>
        <Icon name="ic-globe" size={15} color={color.brandInk} />
        <span className={styles.srcTitle}>{t('sources.title')}</span>
        <span className={styles.srcSub}>{t('sources.sub')}</span>
      </div>
      <div className={styles.srcList}>
        {meta.sync_sources.map((s) => (
          <span key={s.key} className={styles.src}>
            <span className={styles.srcDot} style={{ background: s.color }} />
            {t(`source.${s.key}` as never)}
            <span className={styles.srcAt}>
              {s.status === 'synced' ? t('sources.synced', { at: s.at ?? '' }) : t('sources.soon')}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function CategoryBar({ meta }: { meta: ProductsMeta }) {
  const t = useTranslations('products');
  const { styles, cx } = useProductsStyles();
  const ui = useProductsUi();
  const cats = [ALL, ...meta.categories];
  const VIEWS = [
    ['list', 'ic-grid'],
    ['kanban', 'ic-flow'],
  ] as const;
  return (
    <div className={styles.bar}>
      <div className={styles.cats} data-testid="pd-cats">
        {cats.map((c) => (
          <button
            key={c}
            type="button"
            className={cx(styles.cat, ui.filter.category === c && styles.catOn)}
            onClick={() => ui.setFilter({ category: c })}
          >
            {c === ALL ? t('all') : c}
          </button>
        ))}
      </div>
      <span className={styles.grow} />
      <div className={styles.seg}>
        {VIEWS.map(([k, ic]) => (
          <button
            key={k}
            type="button"
            className={cx(styles.segBtn, ui.layout === k && styles.segOn)}
            onClick={() => ui.set({ layout: k })}
            data-testid={`pd-view-${k}`}
          >
            <Icon name={ic} size={13} color="currentColor" strokeWidth={1.9} />
            {t(`layout.${k}`)}
          </button>
        ))}
      </div>
    </div>
  );
}
