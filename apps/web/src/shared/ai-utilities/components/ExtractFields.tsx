// Danh sách trường cần trích cho ai.extract_info (TIP-019c §1): nhãn + kiểu; tiền luôn VND. Mặc định 3 trường hay dùng, sửa / bỏ / thêm.
'use client';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { EXTRACT_TYPES } from '@appchat/shared';
import { useUtilityStyles } from '../styles';
import type { ExtractField } from '../types';

/** 3 trường hay dùng — nhãn theo ngôn ngữ người dùng. */
export const defaultFields = (t: (k: string) => string): ExtractField[] => [
  { key: 'phone', label: t('defaults.phone'), type: 'string' },
  { key: 'date', label: t('defaults.date'), type: 'date' },
  { key: 'budget', label: t('defaults.budget'), type: 'money', currency: 'VND' },
];

/** Đủ điều kiện gửi: có ≥ 1 trường, nhãn không rỗng, khoá không trùng (server cũng kiểm — 422). */
export const fieldsValid = (fields: ExtractField[]) => fields.length > 0 && fields.every((f) => f.label.trim()) && new Set(fields.map((f) => f.key)).size === fields.length;

const keyOf = (label: string, i: number) => label.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40) || `field_${i + 1}`;

export function ExtractFields({ fields, onChange }: { fields: ExtractField[]; onChange: (f: ExtractField[]) => void }) {
  const t = useTranslations('assistant.utility');
  const { styles } = useUtilityStyles();
  const patch = (i: number, p: Partial<ExtractField>) =>
    onChange(
      fields.map((f, j) => {
        if (j !== i) return f;
        const next = { ...f, ...p } as ExtractField;
        if (p.label !== undefined) next.key = keyOf(p.label, i);
        if (next.type === 'money') return { ...next, currency: 'VND' };
        const rest = { ...next } as ExtractField & { currency?: string };
        delete rest.currency;
        return rest;
      }),
    );

  return (
    <div data-testid="utility-fields">
      <span className={styles.label}>{t('fields')}</span>
      {fields.map((f, i) => (
        <div key={i} className={styles.row} style={{ marginTop: 4 }}>
          <input className={styles.input} value={f.label} maxLength={60} aria-label={t('fieldLabel')} onChange={(e) => patch(i, { label: e.target.value })} data-testid={`utility-field-${i}`} />
          <select className={styles.input} value={f.type} aria-label={t('fieldType')} onChange={(e) => patch(i, { type: e.target.value as ExtractField['type'] })}>
            {EXTRACT_TYPES.filter((x) => x !== 'enum').map((x) => (
              <option key={x} value={x}>
                {t(`type.${x}`)}
              </option>
            ))}
          </select>
          <button type="button" className={styles.ghost} aria-label={t('removeField')} onClick={() => onChange(fields.filter((_, j) => j !== i))}>
            <Icon name="ic-x" size={13} color={color.text3} />
          </button>
        </div>
      ))}
      {fields.length < 20 ? (
        <button type="button" className={styles.item} onClick={() => onChange([...fields, { key: `field_${fields.length + 1}`, label: '', type: 'string' }])} data-testid="utility-field-add">
          <Icon name="ic-plus" size={13} color={color.brandInk} />
          {t('addField')}
        </button>
      ) : null}
    </div>
  );
}
