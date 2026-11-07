// Trang xem báo giá công khai `/q/[token]` (TIP-029, COMMERCE §3 "Link xem báo giá ghi nhận viewed") — khách mở link trong tin Zalo /
// email, không cần đăng nhập. Hiện bên bán, dòng hàng, tổng (thuế sau chiết khấu), hạn hiệu lực, điều khoản; tải PDF đã đóng băng.
// Link sai / báo giá chưa gửi → thẻ "không còn hiệu lực". Không có prototype (màn mới — như trang ký D25).
'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { transport } from '@/shared/api/client';
import { publicQuoteQuery } from '../api';
import { usePublicQuoteStyles } from '../styles/public.styles';

const REVOKE_MS = 60_000;

export function PublicQuoteScreen({ token }: { token: string }) {
  const t = useTranslations('quotes.public');
  const { styles } = usePublicQuoteStyles();
  const q = useQuery(publicQuoteQuery(token));
  const [busy, setBusy] = useState(false);
  const v = q.data;
  const pdf = async () => {
    setBusy(true);
    try {
      const url = URL.createObjectURL(await transport.blob(`/public/quotes/${token}/pdf`));
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), REVOKE_MS);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className={styles.page} data-testid="pq-page">
      <div className={styles.wrap}>
        {q.isLoading ? null : !v ? (
          <div className={styles.card} data-testid="pq-invalid">
            <div className={styles.h1}>{t('invalidTitle')}</div>
            <div className={styles.muted}>{t('invalidSub')}</div>
          </div>
        ) : (
          <>
            <div className={styles.card}>
              <div className={styles.biz}>{v.business.name}</div>
              <div className={styles.muted}>{t('bizMeta', { tax: v.business.tax_code || '—', address: v.business.address || '—' })}</div>
              <div className={styles.h1} data-testid="pq-title">
                {t('title', { code: v.code, n: v.version })}
              </div>
              <div className={styles.muted}>{t('to', { name: v.customer })}</div>
              {v.expired ? <div className={styles.warn} data-testid="pq-expired">{t('expired')}</div> : null}
            </div>
            <div className={styles.card}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{t('item')}</th>
                    <th>{t('qty')}</th>
                    <th>{t('price')}</th>
                    <th>{t('disc')}</th>
                    <th>{t('tax')}</th>
                    <th>{t('amount')}</th>
                  </tr>
                </thead>
                <tbody>
                  {v.items.map((l, i) => (
                    <tr key={`${l.name}-${i}`}>
                      <td>{l.variant ? `${l.name} (${l.variant})` : l.name}</td>
                      <td>{l.qty}</td>
                      <td>{l.unit_price}</td>
                      <td>{l.discount || '—'}</td>
                      <td>{t('pct', { n: l.tax_rate })}</td>
                      <td>{l.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className={styles.sum}>
                <span>{t('subtotal')}</span>
                <b>{v.subtotal}</b>
              </div>
              <div className={styles.sum}>
                <span>{t('discount')}</span>
                <b>{v.discount_total}</b>
              </div>
              <div className={styles.sum}>
                <span>{t('vat')}</span>
                <b>{v.tax_total}</b>
              </div>
              <div className={styles.total} data-testid="pq-total">
                <span>{t('total')}</span>
                <span>{v.total}</span>
              </div>
              <div className={styles.words}>{v.total_words}</div>
            </div>
            <div className={styles.card}>
              {v.valid_until ? <div className={styles.kv}>{t('validUntil', { d: v.valid_until })}</div> : null}
              {v.payment_terms ? <div className={styles.kv}>{t('terms', { v: v.payment_terms })}</div> : null}
              {v.gift ? <div className={styles.kv}>{t('gift', { v: v.gift })}</div> : null}
              <div className={styles.kv}>{t('contact')}</div>
            </div>
            {v.pdf ? (
              <button type="button" className={styles.pdf} disabled={busy} onClick={() => void pdf()} data-testid="pq-pdf">
                <Icon name="ic-dl" size={14} color={color.text2} />
                {t('pdf')}
              </button>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
