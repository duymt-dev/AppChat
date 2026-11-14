// Thanh lọc Hợp đồng — prototype L5357–5363: chip trạng thái pill (kèm số), Lọc nâng cao (Người tạo · Giá trị), Xuất Excel, Danh sách / Kanban.
// Thanh chọn nhiều L5365–5371: Chọn tất cả · Chuyển tiếp · Gán phụ trách · Duyệt hợp đồng (mở "Duyệt & ký" cho từng HĐ chờ duyệt).
'use client';
import { App } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { FilterPopover, Icon, color } from '@appchat/ui';
import { useCan } from '@/shared/authz/useCan';
import { useListExport } from '@/shared/actions/useListExport';
import { membersQuery } from '@/features/customers/api';
import { useContractsStyles } from '../styles/contracts.styles';
import { useContractsUi } from '../contracts-store';
import { FILTERS } from '../status';
import type { Contract, ContractsMeta } from '../types';

const VIEWS = [
  ['list', 'ic-inbox'],
  ['kanban', 'ic-grid'],
] as const;
const VALUES = ['lt10', '10to30', 'gt30'] as const;

export function ContractsToolbar({ meta }: { meta?: ContractsMeta }) {
  const t = useTranslations('contracts');
  const { styles, cx } = useContractsStyles();
  const ui = useContractsUi();
  const members = useQuery(membersQuery()).data ?? [];
  const exp = useListExport('contract.export');
  return (
    <div className={styles.bar}>
      <div className={styles.chips} data-testid="ct-chips">
        {FILTERS.map((k) => (
          <button
            key={k}
            type="button"
            className={cx(styles.chip, ui.filter.status === k && styles.chipOn)}
            onClick={() => ui.setFilter({ status: k })}
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
            key: 'assigned_user_id',
            label: t('filter.assigned'),
            options: [
              { value: 'all', label: t('filter.assignedAll') },
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
        ]}
        value={{ owner_id: ui.filter.owner_id, assigned_user_id: ui.filter.assigned_user_id ?? 'all', value: ui.filter.value }}
        onApply={(v) => ui.setFilter({ owner_id: v.owner_id ?? 'all', assigned_user_id: v.assigned_user_id ?? 'all', value: v.value ?? 'all' })}
        clearLabel={t('filter.clear')}
        applyLabel={t('filter.apply')}
      />
      <button
        type="button"
        className={styles.tool}
        data-testid="ct-export"
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
            data-testid={`ct-view-${k}`}
          >
            <Icon name={ic} size={14} color="currentColor" />
            {t(`layout.${k}`)}
          </button>
        ))}
      </div>
    </div>
  );
}

export function BulkBar({ rows }: { rows: Contract[] }) {
  const t = useTranslations('contracts.bulk');
  const { message } = App.useApp();
  const { styles, cx } = useContractsStyles();
  const ui = useContractsUi();
  const canSign = useCan('contract.sign');
  const all = rows.length > 0 && ui.selected.length === rows.length;
  const n = ui.selected.length;
  // Duyệt & ký phải OTP + chữ ký từng hợp đồng — mở hộp cho hợp đồng chờ duyệt đầu tiên trong lựa chọn.
  const approve = () => {
    const first = rows.find((r) => ui.selected.includes(r.id) && r.status === 'pending_approval');
    if (first) ui.set({ signFor: first.id });
    else void message.info(t('approveHint'));
  };
  return (
    <div className={styles.bulk}>
      <label className={styles.selAll}>
        <input
          type="checkbox"
          checked={all}
          onChange={() => ui.set({ selected: all ? [] : rows.map((r) => r.id) })}
          data-testid="ct-select-all"
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
      {canSign ? (
        <button
          type="button"
          className={cx(styles.bulkBtn, styles.bulkPrimary)}
          onClick={approve}
          data-testid="ct-bulk-approve"
        >
          <Icon name="ic-check" size={14} color={color.white} strokeWidth={2} />
          {t('approve')}
        </button>
      ) : null}
    </div>
  );
}
