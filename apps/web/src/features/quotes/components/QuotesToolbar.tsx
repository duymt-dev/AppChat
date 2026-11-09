// Thanh lọc Báo giá — prototype L4969–4990: chip trạng thái (kèm số), Lọc nâng cao, Xuất Excel, Danh sách / Kanban.
// Thanh chọn nhiều L4993–4999: Chọn tất cả · Chuyển tiếp · Gán phụ trách · Duyệt báo giá.
'use client';
import { App } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { FilterPopover, Icon, color } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useCan } from '@/shared/authz/useCan';
import { useListExport } from '@/shared/actions/useListExport';
import { membersQuery } from '@/features/customers';
import { useQuotesStyles } from '../styles/quotes.styles';
import { useQuotesUi } from '../quotes-store';
import { FILTERS } from '../status';
import type { Quote, QuotesMeta } from '../types';
import { customFilterValue, pickCustomFilter, useCustomFilterFields } from '@/shared/custom-fields';

export function QuotesToolbar({ meta }: { meta?: QuotesMeta }) {
  const t = useTranslations('quotes');
  const { styles, cx } = useQuotesStyles();
  const ui = useQuotesUi();
  const members = useQuery(membersQuery()).data ?? [];
  const exp = useListExport('quote.export');
  const cfFilters = useCustomFilterFields('quote');
  const VIEWS = [
    ['list', 'ic-inbox'],
    ['kanban', 'ic-grid'],
  ] as const;
  return (
    <div className={styles.bar}>
      <div className={styles.chips} data-testid="q-chips">
        {FILTERS.map((k) => (
          <button
            key={k}
            type="button"
            className={cx(styles.chip, ui.filter.status === k && styles.chipOn)}
            onClick={() => ui.setFilter({ status: k })}
          >
            {t(`status.${k}`)}
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
            key: 'assigned_user_id',
            label: t('filter.assigned'),
            options: [
              { value: 'all', label: t('filter.assignedAll') },
              ...members.map((m) => ({ value: m.id, label: m.name })),
            ],
          },
          {
            key: 'returning',
            label: t('filter.cust'),
            options: [
              { value: 'all', label: t('filter.custAll') },
              { value: 'old', label: t('filter.old') },
              { value: 'new', label: t('filter.new') },
            ],
          },
          ...cfFilters,
        ]}
        value={{
          owner_id: ui.filter.owner_id,
          assigned_user_id: ui.filter.assigned_user_id ?? 'all',
          returning: ui.filter.returning,
          ...customFilterValue(ui.filter.custom),
        }}
        onApply={(v) =>
          ui.setFilter({
            owner_id: v.owner_id ?? 'all',
            assigned_user_id: v.assigned_user_id ?? 'all',
            returning: v.returning ?? 'all',
            custom: pickCustomFilter(v),
          })
        }
        clearLabel={t('filter.clear')}
        applyLabel={t('filter.apply')}
      />
      <button
        type="button"
        className={styles.tool}
        data-testid="q-export"
        disabled={exp.busy}
        aria-busy={exp.busy}
        onClick={() => void exp.start(ui.filter)}
      >
        <Icon name="ic-dl" size={14} color={color.text2} />
        {exp.label ?? t('export')}
      </button>
      <div className={styles.seg}>
        {VIEWS.map(([k, ic]) => (
          <button
            key={k}
            type="button"
            className={cx(styles.segBtn, ui.layout === k && styles.segOn)}
            onClick={() => ui.set({ layout: k })}
            data-testid={`q-view-${k}`}
          >
            <Icon name={ic} size={14} color="currentColor" />
            {t(`layout.${k}`)}
          </button>
        ))}
      </div>
    </div>
  );
}

export function BulkBar({ rows }: { rows: Quote[] }) {
  const t = useTranslations('quotes.bulk');
  const { message } = App.useApp();
  const { styles, cx } = useQuotesStyles();
  const ui = useQuotesUi();
  const canApprove = useCan('quote.approve');
  const approve = useAction('quote.approve');
  const all = rows.length > 0 && ui.selected.length === rows.length;
  const n = ui.selected.length;
  const approveAll = async () => {
    for (const id of ui.selected)
      await approve.run({ quote_id: id }, { silent: id !== ui.selected[ui.selected.length - 1] });
    ui.set({ selected: [] });
  };
  return (
    <div className={styles.bulk}>
      <label className={styles.selAll}>
        <input
          type="checkbox"
          checked={all}
          onChange={() => ui.set({ selected: all ? [] : rows.map((r) => r.id) })}
          data-testid="q-select-all"
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
      {canApprove ? (
        <button
          type="button"
          className={cx(styles.bulkBtn, styles.bulkPrimary)}
          disabled={!n}
          onClick={() => void approveAll()}
          data-testid="q-bulk-approve"
        >
          <Icon name="ic-check" size={14} color={color.white} strokeWidth={2} />
          {t('approve')}
        </button>
      ) : null}
    </div>
  );
}
