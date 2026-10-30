// Phần "Thông tin thêm" cuối form tạo / sửa (D56 §4 form): ô dựng theo kiểu trường; nhãn hiển thị nguyên văn (custom-fields §5).
'use client';
import { useTranslations } from 'next-intl';
import { fieldOptions, type CustomFieldDef } from '@appchat/shared';
import { useCustomFieldStyles } from './custom-fields.styles';
import type { CustomDraft, RawValue } from './useCustomDraft';

const INPUT_TYPE: Record<string, string> = { number: 'number', date: 'date', email: 'email', phone: 'tel', currency: 'text' };
const WIDE = new Set(['textarea', 'multi', 'tags']);

interface InputProps {
  f: CustomFieldDef;
  value: RawValue;
  onChange: (v: RawValue) => void;
  bad: boolean;
  dense: boolean;
}

function FieldInput({ f, value, onChange, bad, dense }: InputProps) {
  const t = useTranslations('common.customFields');
  const { styles, cx } = useCustomFieldStyles();
  const id = `cfx-${f.key}`;
  const cls = cx(styles.input, dense && styles.inputDense, bad && styles.bad);
  const test = `cf-in-${f.key}`;
  if (f.type === 'picklist' || f.type === 'tier')
    return (
      <select id={id} className={cls} data-testid={test} value={String(value)} onChange={(e) => onChange(e.target.value)}>
        <option value="">{t('pick')}</option>
        {fieldOptions(f).map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
  if (f.type === 'multi') {
    const on = Array.isArray(value) ? value : [];
    return (
      <div className={styles.chips} role="group" aria-labelledby={`${id}-l`} data-testid={test}>
        {fieldOptions(f).map((o) => (
          <button
            key={o}
            type="button"
            aria-pressed={on.includes(o)}
            className={cx(styles.chip, on.includes(o) && styles.chipOn)}
            onClick={() => onChange(on.includes(o) ? on.filter((x) => x !== o) : [...on, o])}
          >
            {o}
          </button>
        ))}
      </div>
    );
  }
  if (f.type === 'textarea')
    return <textarea id={id} className={cx(cls, styles.area)} data-testid={test} placeholder={t('ph')} value={String(value)} onChange={(e) => onChange(e.target.value)} />;
  return (
    <input
      id={id}
      className={cls}
      type={INPUT_TYPE[f.type] ?? 'text'}
      inputMode={f.type === 'currency' ? 'numeric' : undefined}
      placeholder={f.type === 'tags' ? t('tagsHint') : f.type === 'date' ? undefined : t('ph')}
      data-testid={test}
      value={String(value)}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

/**
 * Ẩn hẳn khi thực thể chưa có trường tuỳ biến nào hiện ở form. `title=false` khi màn đã có khung riêng
 * (Sản phẩm: "Trường dữ liệu riêng" của prototype L4487); `dense` = ô 36px, khoảng cách 8 như khung đó.
 */
export function CustomFieldInputs({ draft, title = true, dense = false }: { draft: CustomDraft; title?: boolean; dense?: boolean }) {
  const t = useTranslations('common.customFields');
  const { styles, cx } = useCustomFieldStyles();
  if (!draft.fields.length) return null;
  return (
    <div className={title ? styles.section : undefined} data-testid="cf-inputs" data-custom-field="form">
      {title ? <div className={styles.title}>{t('section')}</div> : null}
      <div className={cx(styles.grid, dense && styles.gridDense)}>
        {draft.fields.map((f) => {
          const err = draft.errors[f.key];
          return (
            <div key={f.key} className={cx(styles.field, WIDE.has(f.type) && styles.wide)} data-cf={f.key}>
              <label className={styles.label} id={`cfx-${f.key}-l`} htmlFor={`cfx-${f.key}`}>
                {f.required ? t('required', { label: f.label }) : f.label}
                {f.ai ? <span className={styles.ai} title={t('aiHint')}>{t('aiMark')}</span> : null}
              </label>
              <FieldInput f={f} value={draft.raw[f.key] ?? ''} onChange={(v) => draft.set(f.key, v)} bad={!!err} dense={dense} />
              {err ? <span className={styles.err}>{t(`error.${err}` as never)}</span> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
