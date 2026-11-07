// "Điều chỉnh tồn" (TIP-027, quyền `stock.adjust`): số cộng / trừ + lý do bắt buộc → `stock.adjust` (sổ kho `adjust`, hoàn tác được).
// Cho tồn âm (COMMERCE §2) — kết quả ≤ ngưỡng thì báo cảnh báo sắp hết.
'use client';
import { useState } from 'react';
import { App } from 'antd';
import { useTranslations } from 'next-intl';
import { ModalShell, color } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useProductFormStyles } from '../styles/form.styles';
import type { Product } from '../types';

export function StockAdjustModal({ p, onClose }: { p: Product; onClose: () => void }) {
  const t = useTranslations('products.stockAdjust');
  const { message } = App.useApp();
  const { styles, cx } = useProductFormStyles();
  const adjust = useAction<{ stock: number; low_stock?: boolean }>('stock.adjust');
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState('');
  const n = Number(delta);
  const valid = /^-?\d+$/.test(delta.trim()) && n !== 0 && !!reason.trim();
  const submit = async () => {
    const r = await adjust.run({ product_id: p.id, delta: n, reason: reason.trim() });
    if (!r) return;
    if (r.result.low_stock) void message.warning(t('low', { stock: r.result.stock }));
    onClose();
  };

  return (
    <ModalShell
      open
      onClose={onClose}
      width={440}
      stacked
      title={t('title')}
      icon="ic-box"
      iconColor={color.teal}
      iconBg={color.tealBg}
      closeLabel={t('close')}
      testId="pd-stock"
      footer={
        <div className={styles.foot}>
          <button type="button" className={styles.cancel} onClick={onClose}>
            {t('cancel')}
          </button>
          <button
            type="button"
            className={styles.save}
            disabled={!valid}
            onClick={() => void submit()}
            data-testid="pd-stock-save"
          >
            {t('save')}
          </button>
        </div>
      }
    >
      <div className={cx(styles.grid, styles.head)}>
        <div className={styles.wide}>
          <div className={styles.hint}>{t('current', { name: p.name, stock: p.stock ?? 0 })}</div>
        </div>
        <div>
          <label className={styles.label} htmlFor="pd-stock-delta">
            {t('delta')}
          </label>
          <input
            id="pd-stock-delta"
            className={styles.input}
            inputMode="numeric"
            placeholder={t('deltaPh')}
            value={delta}
            onChange={(e) => setDelta(e.target.value.replace(/[^\d-]/g, ''))}
            data-testid="pd-stock-delta"
          />
        </div>
        <div>
          <label className={styles.label} htmlFor="pd-stock-reason">
            {t('reason')}
          </label>
          <input
            id="pd-stock-reason"
            className={styles.input}
            placeholder={t('reasonPh')}
            value={reason}
            maxLength={200}
            onChange={(e) => setReason(e.target.value)}
            data-testid="pd-stock-reason"
          />
        </div>
      </div>
    </ModalShell>
  );
}
