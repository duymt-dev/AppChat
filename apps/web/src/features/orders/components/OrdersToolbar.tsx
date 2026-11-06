// Thanh lọc Đơn hàng — prototype L5503–5509: chip (Tất cả · Đã thanh toán · Đã cọc · Chờ cọc · Đã huỷ), Lọc nâng cao
// (Người tạo · Giá trị · Nguồn — D31), Đồng bộ sàn, Xuất Excel, Danh sách / Kanban. Thanh chọn nhiều L5511–5517: … · Xác nhận đơn.
'use client';
import { App } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { FilterPopover, Icon, color } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useCan } from '@/shared/authz/useCan';
import { useListExport } from '@/shared/actions/useListExport';
import { membersQuery } from '@/features/customers';
import { useOrdersStyles } from '../styles/orders.styles';
import { useOrdersUi } from '../orders-store';
import { FILTERS } from '../status';
import type { Order, OrdersMeta } from '../types';
import { customFilterValue, pickCustomFilter, useCustomFilterFields } from '@/shared/custom-fields';

const VIEWS = [
  ['list', 'ic-inbox'],
  ['kanban', 'ic-grid'],
] as const;
const VALUES = ['lt5', '5to20', 'gt20'] as const;
const SOURCES = ['manual', 'quote', 'contract', 'marketplace'] as const;

export function OrdersToolbar({ meta }: { meta?: OrdersMeta }) {
  const t = useTranslations('orders');
  const { message } = App.useApp();
  const { styles, cx } = useOrdersStyles();
  const ui = useOrdersUi();
  const members = useQuery(membersQuery()).data ?? [];
  const exp = useListExport('order.export');
  const cfFilters = useCustomFilterFields('order');
  const canSync = useCan('integrations.manage');
  const sync = useAction<{ imported: number }>('order.sync_now');
  return (
    <div className={styles.bar}>
      <div className={styles.chips} data-testid="od-chips">
        {FILTERS.map((k) => (
          <button
            key={k}
            type="button"
            className={cx(styles.chip, ui.filter.chip === k && styles.chipOn)}
            onClick={() => ui.setFilter({ chip: k })}
          >
            {t(`chip.${k}`)}
            <span className={styles.chipN}>{meta?.counts[k] ?? 0}</span>
          </button>
        ))}
      </div>
      <span className={styles.grow} />
      <FilterPopover
        buttonLabel={t('filter.btn')}
        title={t('filter.title')}
        fields={[
          {
            key: 'owner_id',
            label: t('filter.owner'),
            options: [
              { value: 'all', label: t('filter.ownerAll') },
              ...members.map((m) => ({ value: m.id, label: m.name })),
            ],
          },
          {
            key: 'value',
            label: t('filter.value'),
            options: [
              { value: 'all', label: t('filter.valueAll') },
              ...VALUES.map((v) => ({ value: v, label: t(`filter.${v}`) })),
            ],
          },
          {
            key: 'source',
            label: t('filter.source'),
            options: [
              { value: 'all', label: t('filter.sourceAll') },
              ...SOURCES.map((v) => ({ value: v, label: t(`source.${v}`) })),
            ],
          },
          ...cfFilters,
        ]}
        value={{
          owner_id: ui.filter.owner_id,
          value: ui.filter.value,
          source: ui.filter.source,
          ...customFilterValue(ui.filter.custom),
        }}
        onApply={(v) =>
          ui.setFilter({
            owner_id: v.owner_id ?? 'all',
            value: v.value ?? 'all',
            source: v.source ?? 'all',
            custom: pickCustomFilter(v),
          })
        }
        clearLabel={t('filter.clear')}
        applyLabel={t('filter.apply')}
      />
      <button
        type="button"
        className={styles.tool}
        data-testid="od-export"
        disabled={exp.busy}
        aria-busy={exp.busy}
        onClick={() => void exp.start(ui.filter)}
      >
        <Icon name="ic-dl" size={14} color={color.text2} />
        {exp.label ?? t('export')}
      </button>
      {canSync ? (
        <button
          type="button"
          className={styles.tool}
          onClick={async () => {
            const r = await sync.run({}, { silent: true });
            if (r) void message.info(t('synced'));
          }}
          data-testid="od-sync"
        >
          <Icon name="ic-refresh" size={14} color={color.text2} />
          {t('sync')}
        </button>
      ) : null}
      <div className={styles.seg}>
        {VIEWS.map(([k, ic]) => (
          <button
            key={k}
            type="button"
            className={cx(styles.segBtn, ui.layout === k && styles.segOn)}
            onClick={() => ui.set({ layout: k })}
            data-testid={`od-view-${k}`}
          >
            <Icon name={ic} size={14} color="currentColor" />
            {t(`layout.${k}`)}
          </button>
        ))}
      </div>
    </div>
  );
}

export function BulkBar({ rows }: { rows: Order[] }) {
  const t = useTranslations('orders.bulk');
  const { message } = App.useApp();
  const { styles, cx } = useOrdersStyles();
  const ui = useOrdersUi();
  const canManage = useCan('order.manage');
  const confirm = useAction('order.confirm');
  const all = rows.length > 0 && ui.selected.length === rows.length;
  const n = ui.selected.length;
  const confirmAll = async () => {
    const ids = rows.filter((r) => ui.selected.includes(r.id) && r.status === 'new').map((r) => r.id);
    for (const id of ids) await confirm.run({ order_id: id }, { silent: id !== ids[ids.length - 1] });
    ui.set({ selected: [] });
  };
  return (
    <div className={styles.bulk}>
      <label className={styles.selAll}>
        <input
          type="checkbox"
          checked={all}
          onChange={() => ui.set({ selected: all ? [] : rows.map((r) => r.id) })}
          data-testid="od-select-all"
        />
        {t('all')}
      </label>
      <span className={styles.sep} />
      <button
        type="button"
        className={styles.bulkBtn}
        onClick={() => void message.info(t('forwardDone', { n }))}
      >
        <Icon name="ic-arrow" size={14} color={color.text2} />
        {t('forward')}
      </button>
      <button
        type="button"
        className={styles.bulkBtn}
        onClick={() => void message.info(t('assignDone', { n }))}
      >
        <Icon name="ic-users" size={14} color={color.text2} />
        {t('assign')}
      </button>
      {canManage ? (
        <button
          type="button"
          className={cx(styles.bulkBtn, styles.bulkPrimary)}
          disabled={!n}
          onClick={() => void confirmAll()}
          data-testid="od-bulk-confirm"
        >
          <Icon name="ic-check" size={14} color={color.white} strokeWidth={2} />
          {t('confirm')}
        </button>
      ) : null}
    </div>
  );
}
