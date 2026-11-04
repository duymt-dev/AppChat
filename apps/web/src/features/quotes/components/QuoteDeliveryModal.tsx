// "Gửi báo giá" (TIP-032b P2, COMMERCE §3 "gửi PDF hoặc ảnh qua kênh hội thoại"): chọn kênh (Zalo cá nhân / Email / Website chat) +
// định dạng (PDF / ảnh từng trang từ cùng PDF đã duyệt) rồi gửi qua `quote.send` (risk send — useQuoteSend báo đúng lỗi kênh). Dùng chung
// cho nút gửi ở đầu drawer và tab Tổng quan; màn mới không có trong prototype — khung ModalShell + nút phân đoạn sẵn có.
'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ModalShell, color } from '@appchat/ui';
import { useQuoteFormStyles } from '../styles/form.styles';
import { useDeliveryStyles } from '../styles/delivery.styles';
import { useQuoteSend, type QuoteChannel, type QuoteFormat } from '../hooks/useQuoteSend';

const CHANNELS: QuoteChannel[] = ['zalo_personal', 'email', 'webchat'];
const FORMATS: QuoteFormat[] = ['pdf', 'image'];

export function QuoteDeliveryModal({ quoteId, initial, onClose }: { quoteId: string; initial: QuoteChannel; onClose: () => void }) {
  const t = useTranslations('quotes.delivery');
  const f = useQuoteFormStyles();
  const { styles, cx } = useDeliveryStyles();
  const send = useQuoteSend();
  const [channel, setChannel] = useState<QuoteChannel>(initial);
  const [format, setFormat] = useState<QuoteFormat>('pdf');
  const submit = async () => {
    if (await send.run(quoteId, channel, format)) onClose();
  };
  return (
    <ModalShell
      open
      onClose={onClose}
      width={480}
      title={t('title')}
      icon="ic-send"
      iconColor={color.brand}
      iconBg={color.brandBgSoft}
      closeLabel={t('cancel')}
      testId="q-delivery"
      roomy
      stacked
      footer={
        <>
          <button type="button" className={f.styles.btn} onClick={onClose}>
            {t('cancel')}
          </button>
          <button type="button" className={cx(f.styles.btn, f.styles.primary)} disabled={send.isPending} onClick={() => void submit()} data-testid="q-delivery-send">
            {t('send')}
          </button>
        </>
      }
    >
      <div className={styles.group}>
        <label className={f.styles.label}>{t('channel')}</label>
        <div className={styles.seg} role="radiogroup" aria-label={t('channel')}>
          {CHANNELS.map((c) => (
            <button key={c} type="button" role="radio" aria-checked={channel === c} className={cx(styles.opt, channel === c && styles.on)} onClick={() => setChannel(c)} data-testid={`q-delivery-${c}`}>
              {t(`channels.${c}`)}
            </button>
          ))}
        </div>
        <div className={styles.note}>{t(`channelNote.${channel}`)}</div>
      </div>
      <div className={styles.group}>
        <label className={f.styles.label}>{t('format')}</label>
        <div className={styles.seg} role="radiogroup" aria-label={t('format')}>
          {FORMATS.map((x) => (
            <button key={x} type="button" role="radio" aria-checked={format === x} className={cx(styles.opt, format === x && styles.on)} onClick={() => setFormat(x)} data-testid={`q-delivery-${x}`}>
              {t(`formats.${x}`)}
            </button>
          ))}
        </div>
        <div className={styles.note}>{t(`formatNote.${format}`)}</div>
      </div>
    </ModalShell>
  );
}
