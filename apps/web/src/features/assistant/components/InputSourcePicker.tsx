// Hàng nguồn đầu vào của menu ＋ — prototype L640–676 (Chat / Cowork). TIP-023f §4.1, §4.3: "Thêm tệp" mở hộp chọn tệp; "Chụp ảnh màn
// hình" bắt đầu chụp NGAY trong cú bấm (mở menu không chụp). Mục điều hướng (kênh / nền tảng / agent) do ComposerPopovers xử lý qua `onPick`.
'use client';
import { useTranslations } from 'next-intl';
import { Icon, color, type IconName } from '@appchat/ui';
import { canCaptureScreen } from '@/shared/media/screen-capture';
import { useComposerStyles } from '../styles/composer.styles';
import { requestCapture } from '../hooks/attachment-store';
import { openAttachPicker } from './AttachmentTray';
import type { Mode } from '../types';

const CHAT_ITEMS: [IconName, string, boolean][] = [
  ['ic-doc', 'file', true],
  ['ic-grid', 'screenshot', false],
  ['ic-globe', 'channels', false],
  ['ic-cog', 'integrations', false],
  ['ic-search', 'research', false],
  ['ic-flow', 'search', false],
];
const COWORK_ITEMS: [IconName, string][] = [
  ['ic-doc', 'fileShort'],
  ['ic-globe', 'channels'],
  ['ic-cog', 'integrations'],
  ['ic-bot', 'pickAgent'],
  ['ic-plus', 'newAgent'],
];

export function InputSourcePicker({ mode, onPick }: { mode: Mode; onPick: (key: string) => void }) {
  const t = useTranslations('assistant');
  const { styles } = useComposerStyles();
  const pick = (key: string) => {
    onPick(key);
    if (key === 'file' || key === 'fileShort') openAttachPicker();
    // Trình duyệt không hỗ trợ (di động…) vẫn mở khung để báo thật + gợi ý chọn ảnh — không giả là đã chụp.
    else if (key === 'screenshot') requestCapture();
  };
  if (mode === 'cowork')
    return (
      <>
        <div className={styles.popHead}>{t('plus.coworkTitle')}</div>
        {COWORK_ITEMS.map(([ic, key]) => (
          <button key={key} type="button" role="menuitem" className={styles.popRow} onClick={() => pick(key)}>
            <Icon name={ic} size={16} color={color.text3} />
            <span className={styles.popLabel}>{t(`plus.${key}` as never)}</span>
          </button>
        ))}
      </>
    );
  return (
    <>
      {CHAT_ITEMS.map(([ic, key, kbd]) => (
        <button key={key} type="button" role="menuitem" className={styles.popRow} onClick={() => pick(key)} data-testid={`asst-plus-${key}`} data-supported={key === 'screenshot' ? String(canCaptureScreen()) : undefined}>
          <Icon name={ic} size={16} color={color.text3} />
          <span className={styles.popLabel}>{t(`plus.${key}` as never)}</span>
          {kbd ? <span className={styles.popKey}>{t('plus.fileKey')}</span> : null}
        </button>
      ))}
    </>
  );
}
