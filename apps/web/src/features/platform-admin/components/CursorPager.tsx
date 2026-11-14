// Trang trước / sau theo cursor cho danh sách /admin (TIP-040) — không cắt dữ liệu, không đếm tổng (keyset).
'use client';
import { Button } from 'antd';
import { useTranslations } from 'next-intl';
import { useAdminStyles } from '../styles/admin.styles';

export function CursorPager(p: { page: number; hasNext: boolean; onPrev: () => void; onNext: () => void; testId: string }) {
  const t = useTranslations('platformAdmin.pager');
  const { styles } = useAdminStyles();
  return (
    <div className={styles.pager} data-testid={p.testId}>
      <span className={styles.muted}>{t('page', { n: p.page })}</span>
      <Button size="small" disabled={p.page <= 1} onClick={p.onPrev}>
        {t('prev')}
      </Button>
      <Button size="small" disabled={!p.hasNext} onClick={p.onNext} data-testid={`${p.testId}-next`}>
        {t('next')}
      </Button>
    </div>
  );
}
