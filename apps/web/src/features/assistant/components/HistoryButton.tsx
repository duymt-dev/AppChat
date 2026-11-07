// Nút "Lịch sử" trên thanh Trợ lý (TIP-023c G2.8a, PD-009) — mở trình duyệt phiên; nút chữ gọn để thanh giữ chiều cao prototype.
'use client';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useSessionStyles } from '../styles/sessions.styles';

export function HistoryButton({ onClick }: { onClick: () => void }) {
  const t = useTranslations('assistant.sessions');
  const { styles } = useSessionStyles();
  return (
    <button type="button" className={styles.open} onClick={onClick} data-testid="asst-history">
      <Icon name="ic-clock" size={14} color={color.text3} />
      {t('open')}
    </button>
  );
}
