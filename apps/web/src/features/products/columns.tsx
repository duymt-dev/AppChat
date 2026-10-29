// Cột DataTable Sản phẩm — prototype L5656 (grid 92px 2fr 1fr 1fr 1fr 68px 66px 0.9fr 1.4fr 1.2fr 0.9fr 44px) + thẻ mobile / kanban.
'use client';
import { useTranslations } from 'next-intl';
import { ActionMenu, Icon, color, type IconName, type TableColumnsType } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useCan } from '@/shared/authz/useCan';
import { useFmt } from '@/shared/i18n/useFmt';
import { useProductCellStyles } from './styles/cells.styles';
import { useProductsUi } from './products-store';
import type { Product } from './types';

const STATUS = { active: [color.brandBg, color.brandInk], draft: [color.pillBg, color.text4] } as const;

function NameCell({ p }: { p: Product }) {
  const { styles } = useProductCellStyles();
  return (
    <div className={styles.name}>
      <span className={styles.icon} style={{ background: p.tint }}>
        <Icon name="ic-box" size={18} color={p.ink} strokeWidth={1.6} />
      </span>
      <div className={styles.nameText}>
        <div className={styles.title}>{p.name}</div>
        <div className={styles.desc}>{p.description}</div>
      </div>
    </div>
  );
}

export function StatusChip({ p }: { p: Product }) {
  const t = useTranslations('products');
  const { styles } = useProductCellStyles();
  const [bg, fg] = STATUS[p.status];
  return (
    <span className={styles.status} style={{ background: bg, color: fg }}>
      {t(`status.${p.status}`)}
    </span>
  );
}

function RowMenu({ p }: { p: Product }) {
  const t = useTranslations('products.menu');
  const ui = useProductsUi();
  const archive = useAction('product.archive');
  return (
    <ActionMenu
      open={ui.menuFor === p.id}
      onToggle={() => ui.set({ menuFor: ui.menuFor === p.id ? null : p.id })}
      onClose={() => ui.set({ menuFor: null })}
      label={t('open')}
      variant="ghost"
      testId="pd-row-menu"
      items={[
        {
          key: 'edit',
          label: t('edit'),
          icon: 'ic-cog',
          onClick: () => ui.set({ menuFor: null, form: 'edit', target: p.id, prefill: null }),
        },
        {
          key: 'delete',
          label: t('delete'),
          icon: 'ic-trash',
          danger: true,
          onClick: () => void archive.run({ product_id: p.id }),
        },
      ]}
    />
  );
}

export function useProductColumns(): TableColumnsType<Product> {
  const t = useTranslations('products');
  const fmt = useFmt();
  const canManage = useCan('catalog.manage');
  const canCost = useCan('catalog.cost_view');
  const { styles } = useProductCellStyles();
  const money = (v: string) => t('money', { v: fmt.number(v) });
  const cols: TableColumnsType<Product> = [
    {
      key: 'code',
      title: t('col.code'),
      width: 92,
      render: (_, p) => <span className={styles.code}>{p.code}</span>,
    },
    { key: 'name', title: t('col.name'), width: 210, render: (_, p) => <NameCell p={p} /> },
    {
      key: 'category',
      title: t('col.category'),
      width: 108,
      render: (_, p) => <span className={styles.cat}>{p.category}</span>,
    },
    {
      key: 'price',
      title: <span className={styles.end}>{t('col.price')}</span>,
      width: 108,
      render: (_, p) => <span className={styles.price}>{money(p.price)}</span>,
    },
  ];
  // Giá vốn chỉ hiện cho vai trò có catalog.cost_view (Blueprint §3.5 — Sales không thấy)
  if (canCost)
    cols.push({
      key: 'cost',
      title: <span className={styles.end}>{t('col.cost')}</span>,
      width: 108,
      render: (_, p) => <span className={styles.cost}>{money(p.cost)}</span>,
    });
  cols.push(
    {
      key: 'unit',
      title: t('col.unit'),
      width: 68,
      render: (_, p) => <span className={styles.muted}>{p.unit}</span>,
    },
    {
      key: 'tax',
      title: t('col.tax'),
      width: 66,
      render: (_, p) => <span className={styles.muted}>{t('pct', { n: p.tax_rate })}</span>,
    },
    {
      key: 'sold',
      title: <span className={styles.end}>{t('col.sold')}</span>,
      width: 96,
      render: (_, p) => <span className={styles.sold}>{fmt.number(p.sold)}</span>,
    },
    {
      key: 'channels',
      title: t('col.channels'),
      width: 150,
      render: (_, p) => (
        <div className={styles.tags}>
          {p.channels.map((ch) => (
            <span key={ch} className={styles.chan}>
              {t(`source.${ch}` as never)}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: 'attrs',
      title: t('col.attrs'),
      width: 130,
      render: (_, p) => (
        <div className={styles.tags}>
          {p.attrs.map((a) => (
            <span key={a} className={styles.attr}>
              {a}
            </span>
          ))}
        </div>
      ),
    },
    { key: 'status', title: t('col.status'), width: 96, render: (_, p) => <StatusChip p={p} /> },
    { key: 'actions', title: '', width: 44, render: (_, p) => (canManage ? <RowMenu p={p} /> : null) },
  );
  return cols;
}

export function ProductCard({ p }: { p: Product }) {
  const t = useTranslations('products');
  const fmt = useFmt();
  const { styles } = useProductCellStyles();
  return (
    <div className={styles.mCard}>
      <div className={styles.mRow}>
        <NameCell p={p} />
        <StatusChip p={p} />
      </div>
      <div className={styles.mRow}>
        <span className={styles.cat}>{p.category}</span>
        <span className={styles.price}>{t('money', { v: fmt.number(p.price) })}</span>
      </div>
    </div>
  );
}

export function ProductKanbanCard({ p, onOpen }: { p: Product; onOpen: () => void }) {
  const t = useTranslations('products');
  const fmt = useFmt();
  const { styles } = useProductCellStyles();
  return (
    <div className={styles.kCard} onClick={onOpen} data-product={p.id}>
      <div className={styles.kName}>{p.name}</div>
      <div className={styles.kFoot}>
        <span className={styles.kPrice}>{t('money', { v: fmt.number(p.price) })}</span>
        <span
          className={styles.kSold}
          style={{ color: p.status === 'active' ? color.brandInk : color.text4 }}
        >
          {t('soldN', { n: p.sold })}
        </span>
      </div>
    </div>
  );
}

export const iconOf = (p: Product) => p.icon as IconName;
