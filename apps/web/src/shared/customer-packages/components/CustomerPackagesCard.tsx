// Thẻ "Liệu trình" của Hồ sơ 360° (TIP-033b §4.4, COM-6-10): dùng chung CRM drawer + Hộp thư (qua Profile360Content — không import chéo
// feature). Tải khi thẻ hiển thị; trạng thái trung thực: đang tải / lỗi (thử lại) / không còn quyền / chưa có liệu trình / danh sách + Tải
// thêm. `bare` = chỉ phần thân (khối tuỳ biến đã có khung + tiêu đề của Blocks360).
'use client';
import { useTranslations } from 'next-intl';
import { createStyles } from 'antd-style';
import { color, font, radius } from '@appchat/ui';
import { useCustomerPackages } from '../hooks/useCustomerPackages';
import { PackageRow } from './PackageRow';

const useStyles = createStyles(({ css }) => ({
  card: css`
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    background: ${color.surface};
    padding: 12px;
    margin-bottom: 12px;
  `,
  head: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.heavy};
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${color.text};
    margin-bottom: 8px;
  `,
  small: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
  `,
  btn: css`
    margin-top: 8px;
    border: none;
    background: none;
    padding: 0;
    font: inherit;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.semibold};
    color: ${color.brandInk};
    cursor: pointer;
  `,
}));

export function CustomerPackagesCard({ contactId, bare = false }: { contactId: string; bare?: boolean }) {
  const t = useTranslations('common.packages');
  const { styles } = useStyles();
  const f = useCustomerPackages(contactId);
  const body =
    f.state === 'loading' ? (
      <div className={styles.small}>{t('loading')}</div>
    ) : f.state === 'error' ? (
      <div className={styles.small}>
        {t('error')}{' '}
        <button type="button" className={styles.btn} onClick={f.retry} data-testid="pk-retry">
          {t('retry')}
        </button>
      </div>
    ) : f.state === 'denied' ? (
      <div className={styles.small}>{t('denied')}</div>
    ) : f.state === 'empty' ? (
      <div className={styles.small}>{t('empty')}</div>
    ) : (
      <>
        {f.items.map((p) => (
          <PackageRow key={p.id} p={p} />
        ))}
        {f.more ? (
          <button type="button" className={styles.btn} disabled={f.loadingMore} onClick={f.loadMore} data-testid="pk-more">
            {t('more')}
          </button>
        ) : null}
        <div className={styles.small}>{t('remainingNote')}</div>
      </>
    );
  if (bare) return <div data-testid="pk-card">{body}</div>;
  return (
    <div className={styles.card} data-testid="pk-card">
      <div className={styles.head}>{t('title')}</div>
      {body}
    </div>
  );
}
