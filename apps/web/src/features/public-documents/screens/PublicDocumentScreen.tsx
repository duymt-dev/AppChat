// Trang chứng từ công khai `/documents/[token]` (TIP-032b P2, DC-332) — khách mở link nhận qua webchat để xem thông tin chứng từ và tải
// đúng PDF đã gửi (báo giá, đề nghị thanh toán, hợp đồng, xác nhận đơn, phiếu thu). Không đăng nhập; link sửa / hết hạn / thu hồi / chứng
// từ đã huỷ → thẻ "không còn hiệu lực". Không có prototype (màn mới — như trang xem báo giá công khai).
'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useFmt } from '@/shared/i18n/useFmt';
import { publicDocumentPdf, publicDocumentQuery } from '../api';
import { usePublicDocumentStyles } from '../styles/public-document.styles';

const REVOKE_MS = 60_000;

export function PublicDocumentScreen({ token }: { token: string }) {
  const t = useTranslations('documents.public');
  const fmt = useFmt();
  const { styles } = usePublicDocumentStyles();
  const q = useQuery(publicDocumentQuery(token));
  const [busy, setBusy] = useState(false);
  const v = q.data;
  const pdf = async () => {
    setBusy(true);
    try {
      const url = URL.createObjectURL(await publicDocumentPdf(token));
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), REVOKE_MS);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className={styles.page} data-testid="pd-page">
      <div className={styles.wrap}>
        {q.isLoading ? null : !v ? (
          <div className={styles.card} data-testid="pd-invalid">
            <div className={styles.h1}>{t('invalidTitle')}</div>
            <div className={styles.muted}>{t('invalidSub')}</div>
          </div>
        ) : (
          <div className={styles.card}>
            <div className={styles.biz}>{v.business}</div>
            <div className={styles.h1} data-testid="pd-title">
              {t('title', { kind: t(`kind.${v.kind}`), code: v.code })}
            </div>
            <div className={styles.muted}>{v.file_name}</div>
            <div className={styles.muted}>{t('expires', { d: fmt.date(v.expires_at) })}</div>
            <div className={styles.muted}>{t('contact')}</div>
            <div className={styles.h1}>
              <button type="button" className={styles.pdf} disabled={busy} onClick={() => void pdf()} data-testid="pd-pdf">
                <Icon name="ic-dl" size={14} color={color.text2} />
                {t('pdf')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
