// Dòng bản dịch tự động dưới tin khách (TIP-025b §F.2) — chữ thường (không HTML), nguyên văn vẫn ở bong bóng.
'use client';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useAssistStyles } from '../styles/assist.styles';

export function AutoTranslated({ text }: { text: string }) {
  const t = useTranslations('inbox.composer.xl');
  const { styles } = useAssistStyles();
  return (
    <div className={styles.inXl} title={t('autoLabel')} data-testid="msg-auto-translated">
      <Icon name="ic-globe" size={12} color={color.info} />
      {text}
    </div>
  );
}
