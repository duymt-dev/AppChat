// Hộp thanh toán hoá đơn gói AppChat — prototype L939–962: VietQR (Napas 247) + số tiền / ngân hàng / STK / chủ TK / nội dung CK;
// "Tôi đã chuyển khoản" → billing.report_transfer; hoá đơn đã thanh toán → màn "Thanh toán thành công". Chỉ VietQR / chuyển khoản
// (COMMERCE §10); QR hết hạn 15 phút (REQ-L04). Đọc hoá đơn từ danh sách đã tải (billing.invoices).
'use client';
import { useQuery } from '@tanstack/react-query';
import { QRCode } from 'antd';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useFmt } from '@/shared/i18n/useFmt';
import { useAction } from '@/shared/actions/useAction';
import { useBillingModalStyles } from '../styles/billing-modals.styles';
import { billInvoicesQuery } from '../api';
import { useBillingUi } from '../billing-store';

export function CheckoutModal() {
  const t = useTranslations('settings.billing.checkout');
  const fmt = useFmt();
  const { styles, cx } = useBillingModalStyles();
  const { invoiceId, set } = useBillingUi();
  const q = useQuery({ ...billInvoicesQuery({ status: 'all', q: '' }), enabled: !!invoiceId });
  const report = useAction('billing.report_transfer');
  const inv = q.data?.data.find((i) => i.id === invoiceId);
  if (!invoiceId || !inv) return null;
  const close = () => set({ invoiceId: null });
  const paid = inv.status === 'paid';
  return (
    <div className={styles.veil} onClick={close} data-testid="checkout-modal">
      <div className={cx(styles.box, styles.wide)} role="dialog" aria-modal="true" aria-label={inv.desc} onClick={(e) => e.stopPropagation()}>
        {paid ? (
          <div className={styles.done} data-testid="checkout-done">
            <div className={styles.doneIc}>
              <Icon name="ic-check" size={30} color={color.okStrong} strokeWidth={2.4} />
            </div>
            <div className={styles.doneT}>{t('doneT')}</div>
            <div className={styles.doneS}>{t.rich('doneS', { item: inv.desc, code: inv.code, b: (c) => <b>{c}</b> })}</div>
            <button type="button" className={styles.doneBtn} onClick={close}>
              {t('finish')}
            </button>
          </div>
        ) : (
          <>
            <div className={cx(styles.head, styles.headQr)}>
              <div className={styles.grow}>
                <div className={cx(styles.t, styles.tQr)}>{inv.desc}</div>
                <div className={cx(styles.s, styles.sQr)}>{t('sub')}</div>
              </div>
              <button type="button" className={styles.x} onClick={close} aria-label={t('close')}>
                <Icon name="ic-x" size={20} color={color.text4} />
              </button>
            </div>
            <div className={styles.qrWrap}>
              <div className={styles.qrCol}>
                <div className={styles.qrBox}>
                  <QRCode value={inv.qr?.payload ?? inv.code} size={172} bordered={false} color={color.forest} bgColor={color.white} />
                </div>
                <div className={styles.qrCap}>{t('napas')}</div>
              </div>
              <div className={styles.kv}>
                <div className={styles.kvRow}>
                  <span>{t('amount')}</span>
                  <b className={styles.amt} data-testid="checkout-amount">
                    {fmt.money(inv.amount)}
                  </b>
                </div>
                <div className={styles.kvRow}>
                  <span>{t('bank')}</span>
                  <b>{inv.qr?.bank}</b>
                </div>
                <div className={styles.kvRow}>
                  <span>{t('acc')}</span>
                  <b className={styles.mono}>{inv.qr?.account_no}</b>
                </div>
                <div className={styles.kvRow}>
                  <span>{t('holder')}</span>
                  <b>{inv.qr?.account_name}</b>
                </div>
                <div className={styles.kvRow}>
                  <span>{t('content')}</span>
                  <b className={styles.mono} data-testid="checkout-content">
                    {inv.qr?.content ?? inv.code}
                  </b>
                </div>
              </div>
            </div>
            <div className={styles.actions}>
              <button type="button" className={styles.paid} disabled={report.isPending} onClick={() => void report.run({ invoice_id: inv.id }, { silent: true })} data-testid="checkout-paid">
                <Icon name="ic-check" size={18} color={color.white} strokeWidth={2.4} />
                {t('paid')}
              </button>
              <button type="button" className={styles.close} onClick={close}>
                {t('close')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
