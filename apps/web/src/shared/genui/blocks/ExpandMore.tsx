// "Mở rộng" (standard §9): khối bị cắt ở compact → modal full cùng cây (không gọi LLM). Không có onExpand (đang full) → không hiện.
'use client';
import { Button } from 'antd';
import { useTranslations } from 'next-intl';
import { useGenUi } from '../context';
import { useGenUiStyles } from '../genui.styles';

export function ExpandMore({ hidden }: { hidden: number }) {
  const t = useTranslations('common.genui');
  const { styles } = useGenUiStyles();
  const { mode, onExpand } = useGenUi();
  if (mode !== 'compact' || hidden <= 0 || !onExpand) return null;
  return (
    <Button size="small" type="link" className={styles.more} onClick={onExpand} data-testid="genui-expand">
      {t('expandMore', { n: hidden })}
    </Button>
  );
}
