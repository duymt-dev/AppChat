// Bảng dòng + tổng trong drawer — prototype L5085–5108. Sửa được khi báo giá ở nháp / yêu cầu sửa (COMMERCE §3, quote.update);
// thuế theo từng dòng sau chiết khấu; điểm loyalty không trừ trên báo giá (§3, §7).
'use client';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useCan } from '@/shared/authz/useCan';
import { useFmt } from '@/shared/i18n/useFmt';
import { useLineStyles } from '../styles/lines.styles';
import { initialQuoteDraft, useQuoteDraft } from '../hooks/useQuoteDraft';
import type { Quote } from '../types';

export function QuoteLines({ q }: { q: Quote }) {
  const t = useTranslations('quotes.detail');
  const fmt = useFmt();
  const { styles, cx } = useLineStyles();
  const canEdit =
    useCan('quote.create') && ['draft', 'revision_requested', 'pending_approval'].includes(q.status);
  const f = useQuoteDraft(initialQuoteDraft({ ...q, header_discount: q.header_discount }));
  const update = useAction('quote.update');
  const dirty =
    JSON.stringify(f.input.items) !== JSON.stringify(q.items) ||
    (f.d.header_pct || 0) !== (q.header_discount?.kind === 'pct' ? q.header_discount.value : 0);
  const save = () =>
    void update.run({
      quote_id: q.id,
      patch: { items: f.input.items, header_discount: f.input.header_discount },
    });
  const tax = f.d.items[0]?.tax_rate ?? 0;

  return (
    <div data-testid="q-detail-lines">
      <div className={styles.head}>
        <div className={styles.title}>{t('linesTitle')}</div>
        <button
          type="button"
          className={styles.add}
          disabled={!canEdit}
          onClick={() => f.lines.add({ name: t('newLine'), qty: 1, unit_price: '1000000', tax_rate: 8 })}
          data-testid="q-add-line"
        >
          <Icon name="ic-plus" size={13} color={color.brandInk} strokeWidth={2.2} />
          {t('addLine')}
        </button>
      </div>
      <div className={cx(styles.grid, styles.th)}>
        <span>{t('item')}</span>
        <span className={styles.center}>{t('qty')}</span>
        <span className={styles.right}>{t('price')}</span>
        <span className={styles.right}>{t('line')}</span>
        <span />
      </div>
      {f.d.items.map((it, i) => (
        <div key={i} className={cx(styles.grid, styles.tr)}>
          <div className={styles.stack}>
            <input
              className={styles.in}
              value={it.name}
              disabled={!canEdit || !!it.product_id}
              onChange={(e) => f.lines.edit(i, { name: e.target.value })}
              aria-label={t('item')}
            />
            <input
              className={cx(styles.in, styles.variant)}
              value={it.variant ?? ''}
              placeholder={t('variantPh')}
              disabled={!canEdit}
              onChange={(e) => f.lines.edit(i, { variant: e.target.value })}
              aria-label={t('variantPh')}
            />
          </div>
          <input
            className={cx(styles.in, styles.center, styles.top)}
            value={it.qty}
            disabled={!canEdit}
            onChange={(e) => f.lines.edit(i, { qty: Number(e.target.value.replace(/[^\d.]/g, '')) || 0 })}
            aria-label={t('qty')}
            data-testid="q-detail-qty"
          />
          <input
            className={cx(styles.in, styles.right, styles.top)}
            value={fmt.number(it.unit_price)}
            disabled={!canEdit || !!it.product_id}
            onChange={(e) => f.lines.edit(i, { unit_price: f.lines.money(e.target.value) })}
            aria-label={t('price')}
          />
          <span className={styles.amount}>{fmt.money(f.totals.lines[i]?.gross ?? '0')}</span>
          <button
            type="button"
            className={styles.del}
            disabled={!canEdit}
            onClick={() => f.lines.del(i)}
            aria-label={t('remove')}
          >
            <Icon name="ic-trash" size={14} color={color.dangerDeep} />
          </button>
        </div>
      ))}
      <div className={styles.sum}>
        <div className={styles.sumRow}>
          <span className={styles.grow}>{t('subtotal')}</span>
          <span className={styles.v}>{fmt.money(f.totals.subtotal)}</span>
        </div>
        <div className={styles.sumRow}>
          <span className={styles.grow}>{t('disc')}</span>
          <input
            className={styles.pct}
            value={f.d.header_pct}
            disabled={!canEdit}
            onChange={(e) =>
              f.set('header_pct', Math.min(100, Number(e.target.value.replace(/\D/g, '')) || 0))
            }
            aria-label={t('disc')}
            data-testid="q-detail-disc"
          />
          <span className={styles.unit}>%</span>
          <span className={cx(styles.v, styles.minus)}>
            {t('minus', { v: fmt.money(f.totals.discount_total) })}
          </span>
        </div>
        <div className={styles.sumRow}>
          <span className={styles.grow} title={t('vatHint')}>
            {t('vat')}
          </span>
          <input className={styles.pct} value={tax} disabled aria-label={t('vatHint')} />
          <span className={styles.unit}>%</span>
          <span className={styles.v}>{t('plus', { v: fmt.money(f.totals.tax_total) })}</span>
        </div>
        <div className={styles.totalRow}>
          <span className={styles.totalL}>{t('total')}</span>
          <span className={styles.totalV} data-testid="q-detail-total">
            {fmt.money(f.totals.total)}
          </span>
        </div>
      </div>
      {canEdit && dirty ? (
        <div className={styles.saveRow}>
          <button type="button" className={styles.save} onClick={save} data-testid="q-save-lines">
            <Icon name="ic-check" size={13} color={color.white} strokeWidth={2} />
            {t('saveEdit')}
          </button>
        </div>
      ) : null}
    </div>
  );
}
