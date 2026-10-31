// Sản phẩm & Dịch vụ (orchestrator) — prototype L5624–5753: PageHeader + KPI · nguồn đồng bộ · chip danh mục · (DataTable | KanbanBoard) · drawer / modal.
'use client';
import { App } from 'antd';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { DataTable, Icon, KanbanBoard, PageHeader, color } from '@appchat/ui';
import { useCan } from '@/shared/authz/useCan';
import { useFmt } from '@/shared/i18n/useFmt';
import { PageStates, stateOf } from '@/shared/states/PageStates';
import { useProductsStyles } from '../styles/products.styles';
import { useProductsUi } from '../products-store';
import { productsMetaQuery, productsQuery } from '../api';
import { ProductCard, ProductKanbanCard, useProductColumns } from '../columns';
import { CategoryBar, SyncSources } from '../components/SyncSources';
import { ProductDrawer } from '../components/ProductDrawer';
import { ProductFormModal } from '../components/ProductFormModal';
import type { Product } from '../types';
import { useProductsUiCommands } from '../ui-commands';
import { ListPager } from '@/shared/list/ListPager';

const KPI = [
  ['total', color.blue, 'ic-box'],
  ['active', color.okStrong, 'ic-check'],
  ['channels', color.violet, 'ic-globe'],
  ['sold', color.warn, 'ic-chart'],
] as const;

export function ProductsScreen() {
  useProductsUiCommands();
  const t = useTranslations('products');
  const fmt = useFmt();
  const { message } = App.useApp();
  const qc = useQueryClient();
  // Kênh bán chưa có connector (D04) → "Đồng bộ" = tải lại danh mục / kênh đã kết nối từ máy chủ.
  const resync = async () => {
    await qc.invalidateQueries({ queryKey: ['catalog'] });
    void message.success(t('synced'));
  };
  const { styles } = useProductsStyles();
  const ui = useProductsUi();
  const list = useQuery(productsQuery(ui.filter, ui.pg));
  const meta = useQuery(productsMetaQuery()).data;
  const canManage = useCan('catalog.manage');
  const columns = useProductColumns();
  const rows = list.data?.data ?? [];
  const open = (p: Product) => ui.set({ detail: p.id, tab: 'overview' });
  const kpiVal = {
    total: meta?.stats.total,
    active: meta?.stats.active,
    channels: meta?.stats.channels,
    sold: meta?.stats.sold_month,
  };

  return (
    <div className={styles.wrap} data-testid="products">
      <PageHeader
        title={t('title')}
        subtitle={t('sub')}
        actions={
          <>
            <div className={styles.search}>
              <Icon name="ic-search" size={14} color={color.text4} />
              <input
                value={ui.filter.q}
                onChange={(e) => ui.setFilter({ q: e.target.value })}
                placeholder={t('search')}
                aria-label={t('search')}
                data-testid="pd-search"
              />
            </div>
            <button type="button" className={styles.chip} onClick={() => void resync()} data-testid="pd-sync">
              <Icon name="ic-refresh" size={14} color={color.text2} strokeWidth={1.9} />
              {t('sync')}
            </button>
            {canManage ? (
              <button
                type="button"
                className={styles.primary}
                onClick={() => ui.set({ form: 'create', target: null, prefill: null })}
                data-testid="pd-add"
              >
                <Icon name="ic-plus" size={15} color={color.white} strokeWidth={2} />
                {t('add')}
              </button>
            ) : null}
          </>
        }
        kpis={KPI.map(([k, c, icon]) => ({
          key: k,
          label: t(`stats.${k}`),
          value: fmt.number(kpiVal[k] ?? 0),
          color: c,
          icon,
        }))}
      />
      {meta ? <SyncSources meta={meta} /> : null}
      {meta ? <CategoryBar meta={meta} /> : null}
      <PageStates state={stateOf(list)} onRetry={() => void list.refetch()}>
        {ui.layout === 'list' ? (
          <DataTable<Product>
            testId="pd-table"
            footer={
              <ListPager
                meta={list.data?.meta}
                unit={t('unit')}
                onChange={ui.setPg}
                testId="pd-table-pager"
              />
            }
            rows={rows}
            columns={columns}
            rowKey={(r) => r.id}
            minWidth={1240}
            onRowClick={open}
            rowProps={(r) => ({ 'data-product': r.id })}
            mobileCard={(r) => <ProductCard p={r} />}
            emptyText={t('empty')}
          />
        ) : (
          <KanbanBoard<Product>
            testId="pd-kanban"
            columns={(meta?.categories ?? []).map((c) => ({
              key: c,
              label: c,
              color: meta?.category_color[c] ?? color.brand,
            }))}
            items={rows}
            itemKey={(r) => r.id}
            groupBy={(r) => r.category}
            renderCard={(r) => <ProductKanbanCard p={r} onOpen={() => open(r)} />}
          />
        )}
      </PageStates>
      {meta ? <ProductDrawer meta={meta} /> : null}
      {meta ? <ProductFormModal meta={meta} /> : null}
    </div>
  );
}
