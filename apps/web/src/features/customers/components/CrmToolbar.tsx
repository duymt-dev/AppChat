// Thanh thao tác hàng loạt + bộ lọc — prototype L2478–2512. "Tạo hóa đơn" → "Đề nghị thanh toán" (prototype-parity §6).
// TIP-026: "Gán phụ trách" chuyển các khách đã chọn (contact.transfer_owner từng khách), "Chuyển tiếp" ẩn (chưa có thiết kế — Q-021),
// lọc Tags theo thẻ thật (`tag_id`), Sắp xếp mở menu (recent / name / created / value), Tuỳ chỉnh cột mở Trường mở rộng (cột "Hiện").
'use client';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { FilterPopover, FilterSelect, Icon, color, type IconName } from '@appchat/ui';
import { useCan } from '@/shared/authz/useCan';
import { useCrmStyles } from '../styles/crm.styles';
import { useCrmUi } from '../crm-store';
import { crmStatsQuery, membersQuery } from '../api';
import { SortMenu } from './SortMenu';
import { customFilterValue, pickCustomFilter, useCustomFilterFields } from '@/shared/custom-fields';

const BULK: [key: string, icon: IconName, tone: string, route: string][] = [
  ['ticket', 'ic-ticket', color.violet, '/tickets'],
  ['booking', 'ic-cal', color.sky, '/calendar'],
  ['quote', 'ic-doc', color.text3, '/quotes'],
  ['payment', 'ic-doc', color.text3, '/invoices'],
  ['order', 'ic-cart', color.text3, '/orders'],
];
const GROUPS = ['vip', 'loyal', 'new', 'potential'] as const;
const SOURCES = ['zalo_personal', 'email', 'website', 'referral', 'manual'] as const;
const STAGES = ['lead', 'potential', 'consulting', 'quote', 'contract', 'won', 'lost'] as const;

export function CrmToolbar({ allSelected, selected, onSelectAll }: { allSelected: boolean; selected: number; onSelectAll: (on: boolean) => void }) {
  const t = useTranslations('customers');
  const router = useRouter();
  const { styles, cx } = useCrmStyles();
  const ui = useCrmUi();
  const members = useQuery(membersQuery()).data ?? [];
  const tagDefs = useQuery(crmStatsQuery()).data?.tag_defs ?? [];
  const canReassign = useCan('crm.reassign');
  const canFields = useCan('crm.fields_manage');
  const f = ui.filter;
  const cfFilters = useCustomFilterFields('contact');

  return (
    <div className={styles.bar} data-testid="crm-toolbar">
      <label className={cx(styles.check, styles.hideMd)}>
        <input type="checkbox" checked={allSelected} onChange={(e) => onSelectAll(e.target.checked)} />
        {t('bulk.selectAll')}
      </label>
      {canReassign ? (
        <button type="button" className={cx(styles.bulk, styles.hideMd)} disabled={!selected} onClick={() => ui.open('bulkTransfer')} data-testid="crm-bulk-assign">
          <Icon name="ic-users" size={13} color={color.assignIcon} />
          {t('bulk.assign')}
          {selected ? <span className={styles.badge}>{selected}</span> : null}
        </button>
      ) : null}
      <span className={cx(styles.vsep, styles.hideMd)} />
      {BULK.map(([k, icon, tone, route]) => (
        <button key={k} type="button" className={cx(styles.bulk, styles.hideMd)} onClick={() => router.push(route)}>
          <Icon name={icon} size={13} color={tone} />
          {t(`bulk.${k}` as never)}
        </button>
      ))}
      <span className={cx(styles.grow, styles.hideMd)} />
      <FilterSelect
        strong
        label={t('scope.all')}
        value={f.mine ? 'mine' : ''}
        onChange={(v) => ui.setFilter({ mine: v === 'mine' })}
        options={[
          { value: '', label: t('scope.all') },
          { value: 'mine', label: t('scope.mine') },
        ]}
      />
      <FilterSelect
        label={t('status.label')}
        value={f.status}
        onChange={(v) => ui.setFilter({ status: v })}
        options={[{ value: '', label: t('status.label') }, ...(['active', 'potential', 'inactive'] as const).map((s) => ({ value: s, label: t(`status.${s}`) }))]}
      />
      <FilterSelect
        label={t('owner')}
        value={f.owner_id}
        onChange={(v) => ui.setFilter({ owner_id: v })}
        options={[{ value: '', label: t('owner') }, ...members.map((m) => ({ value: m.id, label: m.name }))]}
      />
      <FilterPopover
        buttonLabel={t('filter.button')}
        title={t('filter.title')}
        clearLabel={t('filter.clear')}
        applyLabel={t('filter.apply')}
        value={{ group: f.group, source: f.source, tags: f.tag_id, stage: f.stage === 'all' ? '' : f.stage, ...customFilterValue(f.custom) }}
        onApply={(v) => ui.setFilter({ group: v.group ?? '', source: v.source ?? '', tag_id: v.tags ?? '', stage: (v.stage || 'all') as never, custom: pickCustomFilter(v) })}
        fields={[
          { key: 'group', label: t('filter.group'), options: [{ value: '', label: t('filter.groupAll') }, ...GROUPS.map((g) => ({ value: g, label: t(`group.${g}`) }))] },
          { key: 'source', label: t('filter.source'), options: [{ value: '', label: t('filter.sourceAll') }, ...SOURCES.map((s) => ({ value: s, label: t(`source.${s}`) }))] },
          { key: 'tags', label: t('filter.tags'), options: [{ value: '', label: t('filter.tagsAll') }, ...tagDefs.map((d) => ({ value: d.id, label: d.label }))] },
          { key: 'stage', label: t('filter.pipeline'), options: [{ value: '', label: t('filter.pipelineAll') }, ...STAGES.map((s) => ({ value: s, label: t(`stages.${s}`) }))] },
          ...cfFilters,
        ]}
      />
      <SortMenu value={f.sort} onChange={(sort) => ui.setFilter({ sort })} />
      {canFields ? (
        <button type="button" className={cx(styles.chip, styles.tool, styles.iconTool, styles.hideMd)} title={t('columns')} aria-label={t('columns')} onClick={() => ui.open('fields')} data-testid="crm-columns">
          <Icon name="ic-columns" size={14} color={color.text3} />
        </button>
      ) : null}
      {canFields ? (
        <button type="button" className={cx(styles.chip, styles.tool, styles.newField, styles.hideMd)} title={t('newFieldHint')} onClick={() => ui.open('fields')}>
          <Icon name="ic-plus" size={13} color={color.brandInk} strokeWidth={2} />
          {t('newField')}
        </button>
      ) : null}
    </div>
  );
}
