// "Không có dữ liệu" — ref thiếu / mất quyền (standard §3: không đoán số).
'use client';
import { useTranslations } from 'next-intl';
import { useGenUiStyles } from '../genui.styles';

export function NoData() {
  const t = useTranslations('common.genui');
  const { styles } = useGenUiStyles();
  return (
    <span className={styles.empty} data-testid="genui-nodata">
      {t('noData')}
    </span>
  );
}
