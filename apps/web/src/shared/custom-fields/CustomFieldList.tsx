// Khối "Thông tin thêm" ở drawer chi tiết / Hồ sơ 360° (D56 §4 detail) và cột DataTable cho trường `visible_in.list`.
'use client';
import { useTranslations } from 'next-intl';
import type { CustomFieldDef, CustomFieldEntity, CustomValues } from '@appchat/shared';
import type { FilterField, TableColumnsType } from '@appchat/ui';
import { fieldOptions } from '@appchat/shared';
import { useFmt } from '../i18n/useFmt';
import { useCustomFields } from './api';
import { useCustomFieldStyles } from './custom-fields.styles';
import { CHOICE_TYPES, LIST_TYPES, formatCustomValue } from './format';

export function CustomFieldList({ entity, values, title = true }: { entity: CustomFieldEntity; values: CustomValues | undefined; title?: boolean }) {
  const t = useTranslations('common.customFields');
  const { styles, cx } = useCustomFieldStyles();
  const fmt = useFmt();
  const fields = useCustomFields(entity, 'detail');
  if (!fields.length) return null;
  return (
    <div className={styles.section} data-testid="cf-detail" data-custom-field="detail">
      {title ? <div className={styles.title}>{t('section')}</div> : null}
      <dl className={styles.list}>
        {fields.map((f) => {
          const v = formatCustomValue(f, values?.[f.key], fmt);
          return [
            <dt key={`${f.key}-l`} className={styles.dt}>
              {f.label}
            </dt>,
            <dd key={`${f.key}-v`} className={cx(styles.dd, !v && styles.muted)} data-cf={f.key}>
              {v || t('empty')}
            </dd>,
          ];
        })}
      </dl>
    </div>
  );
}

const COL_WIDTH = 140;

/** Cột DataTable cho mỗi trường `visible_in.list`; `exclude` bỏ trường đã là cột thật của màn (vd. danh mục sản phẩm). */
export function useCustomColumns<T extends { custom?: CustomValues }>(entity: CustomFieldEntity, exclude: string[] = []): TableColumnsType<T> {
  const { styles } = useCustomFieldStyles();
  const fmt = useFmt();
  return useCustomFields(entity, 'list')
    .filter((f) => !exclude.includes(f.key))
    .map((f) => ({
      key: `cf.${f.key}`,
      title: <span data-custom-field={f.key}>{f.label}</span>,
      width: COL_WIDTH,
      render: (_: unknown, r: T) => {
        const v = formatCustomValue(f, r.custom?.[f.key], fmt);
        return (
          <span className={styles.cell} title={v} data-cf={f.key}>
            {v}
          </span>
        );
      },
    }));
}

/** Ô lọc cho trường `visible_in.filter`: lựa chọn (picklist / tier / multi) → chọn giá trị; chữ → ô "chứa". Key = `cf.<key>`. */
export function useCustomFilterFields(entity: CustomFieldEntity, exclude: string[] = []): FilterField[] {
  const t = useTranslations('common.customFields');
  return useCustomFields(entity, 'filter')
    .filter((f) => !exclude.includes(f.key))
    .flatMap((f: CustomFieldDef): FilterField[] => {
      const key = `cf.${f.key}`;
      if (CHOICE_TYPES.has(f.type) || (LIST_TYPES.has(f.type) && fieldOptions(f).length))
        return [{ key, label: f.label, custom: true, options: [{ value: '', label: t('all') }, ...fieldOptions(f).map((o) => ({ value: o, label: o }))] }];
      if (['text', 'email', 'phone', 'textarea', 'tags'].includes(f.type)) return [{ key, label: f.label, options: [], text: true, custom: true, placeholder: t('contains') }];
      return [];
    });
}

/** Tách giá trị `cf.*` khỏi kết quả FilterPopover → `{ key: value }` để lưu vào filter của màn. */
export const pickCustomFilter = (v: Record<string, string>) =>
  Object.fromEntries(Object.entries(v).filter(([k]) => k.startsWith('cf.')).map(([k, x]) => [k.slice(3), x]));

/** Ngược lại: `{ key: value }` của màn → value cho FilterPopover. */
export const customFilterValue = (custom: Record<string, string> | undefined) =>
  Object.fromEntries(Object.entries(custom ?? {}).map(([k, v]) => [`cf.${k}`, v]));

/** Ô lọc trường tuỳ biến dạng select đặt thẳng trên thanh (Hỗ trợ, Lịch hẹn — màn không dùng FilterPopover). */
export function CustomFilterSelects({ entity, value, onChange, className }: { entity: CustomFieldEntity; value: Record<string, string> | undefined; onChange: (v: Record<string, string>) => void; className: string }) {
  const fields = useCustomFilterFields(entity).filter((f) => !f.text);
  return (
    <>
      {fields.map((f) => {
        const key = f.key.slice(3);
        return (
          <select key={f.key} className={className} aria-label={f.label} value={value?.[key] ?? ''} onChange={(e) => onChange({ ...value, [key]: e.target.value })} data-custom-field={key}>
            {f.options.map((o, i) => (
              <option key={o.value} value={o.value}>
                {i ? o.label : f.label}
              </option>
            ))}
          </select>
        );
      })}
    </>
  );
}
