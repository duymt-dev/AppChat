// Khối "Chi tiết sản phẩm" của form báo giá — prototype L5197 (viền đứt + "Thêm dòng") mở rộng theo COMMERCE §3:
// chọn sản phẩm từ catalog (giá + thuế lấy từ catalog) hoặc hàng ngoài danh mục; SL · đơn giá · CK % · thuế · thành tiền.
'use client';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useFmt } from '@/shared/i18n/useFmt';
import { productsQuery } from '@/features/products/api';
import { useQuoteFormStyles } from '../styles/form.styles';
import type { QuoteDraftApi } from '../hooks/useQuoteDraft';

const OFF = '__off';
const TAXES = [0, 5, 8, 10] as const;

export function LineEditor({ f }: { f: QuoteDraftApi }) {
  const t = useTranslations('quotes.form');
  const fmt = useFmt();
  const { styles, cx } = useQuoteFormStyles();
  const products = useQuery(productsQuery({ category: 'all', q: '' })).data?.data ?? [];
  const pick = (id: string) => {
    if (!id) return;
    if (id === OFF) return f.lines.add({ name: t('offCatalog'), qty: 1, unit_price: '0', tax_rate: 8 });
    const p = products.find((x) => x.id === id);
    if (p) f.lines.add({ product_id: p.id, name: p.name, qty: 1, unit_price: p.price, tax_rate: p.tax_rate });
  };
  return (
    <div className={styles.box} data-testid="q-lines">
      <div className={styles.hint}>{t('linesHint')}</div>
      <div className={styles.rows}>
        {f.d.items.map((it, i) => {
          const pct = it.discount?.kind === 'pct' ? it.discount.value : 0;
          return (
            <div key={i} className={styles.row} data-testid="q-line">
              <input
                className={styles.cell}
                value={it.name}
                disabled={!!it.product_id}
                onChange={(e) => f.lines.edit(i, { name: e.target.value })}
                aria-label={t('pickProduct')}
              />
              <input
                className={cx(styles.cell, styles.num)}
                inputMode="decimal"
                value={it.qty}
                onChange={(e) => f.lines.edit(i, { qty: Number(e.target.value.replace(/[^\d.]/g, '')) || 0 })}
                aria-label={t('qty')}
                data-testid="q-line-qty"
              />
              <input
                className={cx(styles.cell, styles.num)}
                inputMode="numeric"
                value={it.unit_price}
                disabled={!!it.product_id}
                onChange={(e) => f.lines.edit(i, { unit_price: f.lines.money(e.target.value) })}
                aria-label={t('price')}
                data-testid="q-line-price"
              />
              <input
                className={cx(styles.cell, styles.num, styles.mHide)}
                inputMode="numeric"
                value={pct}
                onChange={(e) => {
                  const v = Math.min(100, Number(e.target.value.replace(/\D/g, '')) || 0);
                  f.lines.edit(i, { discount: v ? { kind: 'pct', value: v } : null });
                }}
                aria-label={t('disc')}
              />
              <select
                className={cx(styles.cell, styles.mHide)}
                value={it.tax_rate}
                onChange={(e) => f.lines.edit(i, { tax_rate: Number(e.target.value) })}
                aria-label={t('tax')}
              >
                {TAXES.map((x) => (
                  <option key={x} value={x}>
                    {`${x}%`}
                  </option>
                ))}
              </select>
              <span className={cx(styles.amount, styles.mHide)}>
                {fmt.money(f.totals.lines[i]?.net ?? '0')}
              </span>
              <button
                type="button"
                className={styles.del}
                onClick={() => f.lines.del(i)}
                aria-label={t('remove')}
              >
                <Icon name="ic-trash" size={14} color={color.dangerDeep} />
              </button>
            </div>
          );
        })}
      </div>
      <div className={styles.boxFoot}>
        <select
          className={cx(styles.cell, styles.grow)}
          value=""
          onChange={(e) => pick(e.target.value)}
          aria-label={t('pickProduct')}
          data-testid="q-pick"
        >
          <option value="">{t('pickProduct')}</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {`${p.name} · ${fmt.money(p.price)}`}
            </option>
          ))}
          <option value={OFF}>{t('offCatalog')}</option>
        </select>
        <button type="button" className={styles.addLine} onClick={() => pick(OFF)}>
          <Icon name="ic-plus" size={13} color={color.brandDeep} strokeWidth={2.2} />
          {t('addLine')}
        </button>
      </div>
    </div>
  );
}
