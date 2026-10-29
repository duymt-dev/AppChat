// Mục Trường dữ liệu — prototype L7099–7122: banner gradient, tab module (Khách hàng · Tickets · Đơn hàng · Sản phẩm + số trường), ô tìm
// theo tên / kiểu, "Thêm trường"; bảng thứ tự · tên (HỆ THỐNG / AI / ĐK) · kiểu (+ tuỳ chọn) · bắt buộc · hiển thị tại (6 chip) · quyền xem
// · ⋯ Chỉnh sửa / Lên trên / Xuống dưới / Xoá trường. Ghi qua custom_field.define / update / delete (Blueprint §2 custom_field_def).
'use client';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Icon, color, type IconName } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useCan } from '@/shared/authz/useCan';
import { PageStates, stateOf } from '@/shared/states/PageStates';
import { useSectionStyles } from '../styles/section.styles';
import { useFieldsStyles } from '../styles/fields.styles';
import { useSettingsUi } from '../settings-store';
import { fieldsQuery } from '../api';
import { foldVi } from '../text';
import { PLACES, type FieldDef, type FieldEntity } from '../types';
import { RowMenu, type RowMenuItem } from './RowMenu';
import { FieldModal } from './FieldModal';

const MODULES: [FieldEntity, IconName][] = [
  ['contact', 'ic-users'],
  ['ticket', 'ic-ticket'],
  ['order', 'ic-cart'],
  ['product', 'ic-box'],
];
const SEP = ' · ';
const LIST = ', ';

function Row({ f, idx, list, can }: { f: FieldDef; idx: number; list: FieldDef[]; can: boolean }) {
  const t = useTranslations('settings.fields');
  const tr = useTranslations('settings.roleName');
  const { styles, cx } = useFieldsStyles();
  const ui = useSettingsUi();
  const update = useAction('custom_field.update');
  const del = useAction('custom_field.delete');
  const move = (d: -1 | 1) => {
    const order = list.map((x) => x.key);
    const j = idx + d;
    if (j < 0 || j >= order.length) return;
    [order[idx], order[j]] = [order[j]!, order[idx]!];
    void update.run({ entity: ui.fieldEntity, fields: [], order }, { silent: true });
  };
  const items: RowMenuItem[] = [
    { key: 'edit', label: t('menu.edit'), icon: 'ic-cog', onClick: () => ui.set({ fieldModal: { key: f.key } }) },
    { key: 'up', label: t('menu.up'), icon: 'ic-up', onClick: () => move(-1) },
    { key: 'down', label: t('menu.down'), icon: 'ic-down', onClick: () => move(1) },
    ...(f.sys ? [] : [{ key: 'del', label: t('menu.del'), icon: 'ic-trash' as const, danger: true, onClick: () => void del.run({ entity: ui.fieldEntity, key: f.key }) }]),
  ];
  return (
    <div className={styles.row} data-field={f.key}>
      <span className={styles.ord}>{idx + 1}</span>
      <div className={styles.nameCell}>
        <span className={styles.name}>{f.label}</span>
        {f.sys ? <span className={styles.bSys}>{t('sys')}</span> : null}
        {f.ai ? <span className={styles.bAi}>{t('ai')}</span> : null}
        {f.condition ? (
          <span className={styles.bCond} title={f.condition}>
            {t('cond')}
          </span>
        ) : null}
      </div>
      <div className={styles.type}>
        {t(`type.${f.type}`)}
        {f.options ? SEP + f.options : ''}
      </div>
      <div className={styles.hideM}>{f.required ? <span className={styles.req}>{t('required')}</span> : null}</div>
      <div className={cx(styles.places, styles.hideM)}>
        {PLACES.map((p) => (
          <span key={p} className={f.visible_in[p] ? styles.pOn : styles.pOff}>
            {t(`place.${p}`)}
          </span>
        ))}
      </div>
      <div className={cx(styles.roles, styles.hideM)}>{f.roles.length ? <b>{f.roles.map((r) => tr(r)).join(LIST)}</b> : <span>{t('allRoles')}</span>}</div>
      {can ? <RowMenu id={`field:${f.key}`} items={items} /> : <span />}
    </div>
  );
}

export function FieldsSection() {
  const t = useTranslations('settings.fields');
  const s = useSectionStyles().styles;
  const { styles, cx } = useFieldsStyles();
  const ui = useSettingsUi();
  const can = useCan('crm.fields_manage');
  const q = useQuery(fieldsQuery(ui.fieldEntity));
  const all = q.data?.data ?? [];
  const k = foldVi(ui.fieldQ.trim());
  const rows = all.filter((f) => !k || foldVi(f.label).includes(k) || foldVi(t(`type.${f.type}`)).includes(k));
  return (
    <>
      <div className={styles.hero}>
        <span className={styles.heroIc}>
          <Icon name="ic-grid" size={17} color={color.brandDeep} />
        </span>
        <div>
          <div className={styles.heroT}>{t('heroT')}</div>
          <div className={styles.heroS}>{t.rich('heroS', { b: (c) => <b>{c}</b> })}</div>
        </div>
      </div>
      <div className={styles.tabs} role="tablist">
        {MODULES.map(([m, ic]) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={ui.fieldEntity === m}
            className={cx(styles.tab, ui.fieldEntity === m && styles.tabOn)}
            onClick={() => ui.set({ fieldEntity: m, fieldQ: '', menuFor: null })}
            data-testid={`st-fd-tab-${m}`}
          >
            <Icon name={ic} size={14} color={ui.fieldEntity === m ? color.brand : color.text3} />
            {t(`module.${m}`)}
            <span className={styles.cnt}>{q.data?.counts[m] ?? ''}</span>
          </button>
        ))}
      </div>
      <div className={styles.bar}>
        <label className={cx(s.search, styles.search)}>
          <Icon name="ic-search" size={14} color={color.text4} strokeWidth={1.9} />
          <input value={ui.fieldQ} onChange={(e) => ui.set({ fieldQ: e.target.value })} placeholder={t('search')} aria-label={t('search')} data-testid="st-fd-search" />
        </label>
        <span className={s.grow} />
        {can ? (
          <button type="button" className={cx(s.primary, styles.add)} onClick={() => ui.set({ fieldModal: {} })} data-testid="st-fd-new">
            <Icon name="ic-plus" size={14} color={color.white} strokeWidth={2} />
            {t('new')}
          </button>
        ) : null}
      </div>
      <PageStates state={stateOf(q)} onRetry={() => void q.refetch()}>
        <div className={styles.table} data-testid="st-fields">
          <div className={styles.th}>
            <span>{t('col.order')}</span>
            <span>{t('col.name')}</span>
            <span>{t('col.type')}</span>
            <span>{t('col.req')}</span>
            <span>{t('col.places')}</span>
            <span>{t('col.roles')}</span>
            <span />
          </div>
          {rows.map((f) => (
            <Row key={f.key} f={f} idx={all.indexOf(f)} list={all} can={can} />
          ))}
          {rows.length === 0 ? <div className={styles.empty}>{t('empty')}</div> : null}
        </div>
      </PageStates>
      {ui.fieldModal ? <FieldModal fieldKey={ui.fieldModal.key} rows={all} /> : null}
    </>
  );
}

