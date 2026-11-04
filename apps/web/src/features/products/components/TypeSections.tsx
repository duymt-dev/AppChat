// Khối nhập theo loại sản phẩm + trường riêng + thuộc tính / biến thể — prototype L4080–4148.
'use client';
import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { CustomFieldInputs, type CustomDraft } from '@/shared/custom-fields';
import { useProductFormStyles } from '../styles/form.styles';
import type { ProductDraft, ProductFormApi } from '../hooks/useProductForm';

const RENT_UNITS = ['hour', 'day', 'week', 'month'] as const;

type Field = [label: string, key: keyof ProductDraft, ph: string, money?: boolean];

function Sec({
  title,
  hint,
  action,
  children,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const { styles } = useProductFormStyles();
  return (
    <div>
      <div className={styles.secHead}>
        <span className={styles.secTitle}>{title}</span>
        {hint ? <span className={styles.secHint}>{hint}</span> : null}
        <span className={styles.grow} />
        {action}
      </div>
      {children}
    </div>
  );
}

function Three({ f, fields }: { f: ProductFormApi; fields: Field[] }) {
  const { styles, cx } = useProductFormStyles();
  return (
    <div className={styles.three}>
      {fields.map(([label, k, ph, money]) => (
        <div key={k}>
          <label className={styles.label}>{label}</label>
          <input
            className={cx(styles.input, styles.inputSm)}
            placeholder={ph}
            value={String(f.d[k])}
            inputMode={money || (k !== 'sku' && k !== 'staff') ? 'numeric' : undefined}
            onChange={(e) =>
              money ? f.money(k as 'price')(e.target.value) : f.set(k, e.target.value as never)
            }
            data-testid={`pd-f-${k}`}
          />
        </div>
      ))}
    </div>
  );
}

function TypeBlock({ f }: { f: ProductFormApi }) {
  const t = useTranslations('products.form');
  const { styles, cx } = useProductFormStyles();
  switch (f.d.type) {
    case 'physical':
      return (
        <Sec title={t('stockSec')}>
          <Three
            f={f}
            fields={[
              [t('sku'), 'sku', t('skuPh')],
              [t('stock'), 'stock', t('zero')],
              [t('cost'), 'cost', t('zero'), true],
            ]}
          />
        </Sec>
      );
    case 'service':
      return (
        <Sec title={t('serviceSec')}>
          <Three
            f={f}
            fields={[
              [t('duration'), 'duration', t('durationPh')],
              [t('staff'), 'staff', t('staffPh')],
              [t('cost'), 'cost', t('zero'), true],
            ]}
          />
        </Sec>
      );
    case 'package':
      return (
        <Sec title={t('cardSec')}>
          <Three
            f={f}
            fields={[
              [t('sessions'), 'sessions', t('sessionsPh')],
              [t('validMonths'), 'validMonths', t('validPh')],
              [t('perSession'), 'perSession', t('perSessionPh'), true],
            ]}
          />
          <label className={styles.check}>
            <input type="checkbox" checked={f.d.grantOnDeposit} onChange={(e) => f.set('grantOnDeposit', e.target.checked)} data-testid="pf-grant-on-deposit" />
            {t('grantOnDeposit')}
          </label>
        </Sec>
      );
    case 'rental':
      return (
        <Sec title={t('rentSec')}>
          <div className={styles.three}>
            <div>
              <label className={styles.label}>{t('rentUnit')}</label>
              <select
                className={cx(styles.input, styles.inputSm, styles.select)}
                value={f.d.rentUnit}
                onChange={(e) => f.set('rentUnit', e.target.value as ProductDraft['rentUnit'])}
              >
                {RENT_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {t(`rentUnits.${u}`)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={styles.label}>{t('deposit')}</label>
              <input
                className={cx(styles.input, styles.inputSm)}
                placeholder={t('zero')}
                value={f.d.deposit}
                onChange={(e) => f.money('deposit')(e.target.value)}
              />
            </div>
            <div>
              <label className={styles.label}>{t('available')}</label>
              <input
                className={cx(styles.input, styles.inputSm)}
                placeholder={t('one')}
                value={f.d.available}
                onChange={(e) => f.set('available', e.target.value)}
              />
            </div>
          </div>
        </Sec>
      );
    case 'combo':
      return (
        <Sec title={t('comboSec')} hint={t('comboHint')}>
          <div className={styles.rows}>
            {f.d.combo.map((r, i) => (
              <div key={i} className={styles.row}>
                <input
                  className={cx(styles.input, styles.inputSm, styles.grow)}
                  placeholder={t('comboName')}
                  value={r.name}
                  onChange={(e) => f.combo.edit(i, { name: e.target.value })}
                  data-testid="pd-combo-name"
                />
                <input
                  className={cx(styles.input, styles.inputSm, styles.qty)}
                  placeholder={t('comboQty')}
                  value={r.value}
                  onChange={(e) => f.combo.edit(i, { value: e.target.value.replace(/\D/g, '') })}
                  data-testid="pd-combo-qty"
                />
                <button
                  type="button"
                  className={styles.del}
                  onClick={() => f.combo.del(i)}
                  aria-label={t('remove')}
                >
                  <Icon name="ic-trash" size={15} color={color.dangerDeep} />
                </button>
              </div>
            ))}
            <button type="button" className={styles.link} onClick={f.combo.add} data-testid="pd-combo-add">
              {t('comboAdd')}
            </button>
          </div>
        </Sec>
      );
    default:
      return null;
  }
}

/** `cf` = trường tuỳ biến của sản phẩm (D56) — định nghĩa ở Cài đặt › Trường dữ liệu, trường trùng cột thật là `sys`. */
export function TypeSections({ f, cf }: { f: ProductFormApi; cf: CustomDraft }) {
  const t = useTranslations('products.form');
  const { styles, cx } = useProductFormStyles();
  return (
    <div className={styles.blocks}>
      <TypeBlock f={f} />
      <Sec title={t('cfSec')} hint={t('cfHint')} action={<span className={styles.link}>{t('cfAdd')}</span>}>
        {cf.fields.length ? (
          <CustomFieldInputs draft={cf} title={false} dense />
        ) : (
          <div className={styles.cfEmpty}>{t.rich('cfEmpty', { b: (c) => <b>{c}</b> })}</div>
        )}
      </Sec>
      <Sec
        title={t('attrSec')}
        hint={t('attrHint')}
        action={
          <button type="button" className={styles.link} onClick={f.attrs.add} data-testid="pd-attr-add">
            {t('attrAdd')}
          </button>
        }
      >
        <div className={styles.rows}>
          {f.d.attrs.map((a, i) => (
            <div key={i} className={styles.row}>
              <input
                className={cx(styles.input, styles.inputSm, styles.attrName)}
                placeholder={t('attrName')}
                value={a.name}
                onChange={(e) => f.attrs.edit(i, { name: e.target.value })}
                data-testid="pd-attr-name"
              />
              <input
                className={cx(styles.input, styles.inputSm, styles.grow)}
                placeholder={t('attrVals')}
                value={a.value}
                onChange={(e) => f.attrs.edit(i, { value: e.target.value })}
                data-testid="pd-attr-vals"
              />
              <button
                type="button"
                className={styles.del}
                onClick={() => f.attrs.del(i)}
                aria-label={t('remove')}
              >
                <Icon name="ic-trash" size={15} color={color.dangerDeep} />
              </button>
            </div>
          ))}
        </div>
      </Sec>
      {f.variants.length ? (
        <Sec title={t('variants')} hint={t('variantsHint', { n: f.variants.length })}>
          <div className={styles.vTable} data-testid="pd-variants">
            <div className={styles.vHead}>
              <span>{t('vName')}</span>
              <span>{t('vSku')}</span>
              <span>{t('vPrice')}</span>
              <span>{t('vStock')}</span>
            </div>
            {f.variants.map((v) => (
              <div key={v} className={styles.vRow}>
                <span>{v}</span>
                <input placeholder={t('vSku')} />
                <input placeholder={t('vPrice')} />
                <input placeholder={t('zero')} />
              </div>
            ))}
          </div>
        </Sec>
      ) : null}
    </div>
  );
}
