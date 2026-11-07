// Popover "Dịch tự động" của ô soạn (prototype L1849–1868; TIP-025b §F.2): bật / tắt tự dịch 2 chiều CHO HỘI THOẠI NÀY (mặc định tắt,
// lưu theo người + workspace + hội thoại) và chọn rõ ngôn ngữ dịch tin soạn. Tin khách luôn dịch sang tiếng Việt.
'use client';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useComposerStyles } from '../styles/composer.styles';
import { usePopStyles } from '../styles/popover.styles';
import type { XlPref } from '../hooks/useInboxTranslation';

const LANGS: [XlPref['to'], string][] = [
  ['en', 'English'],
  ['zh', '中文'],
  ['ko', '한국어'],
  ['ja', '日本語'],
];

export function TranslationPopover({ pref, onChange }: { pref: XlPref; onChange: (p: Partial<XlPref>) => void }) {
  const t = useTranslations('inbox.composer.xl');
  const { styles, cx } = useComposerStyles();
  const { styles: ps } = usePopStyles();
  return (
    <div className={cx(ps.pop, ps.popRight)} data-testid="xl-pop">
      <div className={ps.popHead}>
        <Icon name="ic-globe" size={16} color={color.blue} />
        {t('title')}
      </div>
      <div className={ps.popBody}>
        <button type="button" className={cx(ps.slot, pref.auto && ps.slotOn)} aria-pressed={pref.auto} onClick={() => onChange({ auto: !pref.auto })} data-testid="xl-auto">
          <span className={styles.grow}>
            <div className={ps.qrTitle}>{t('auto')}</div>
            <div className={ps.qrPreview}>{t('autoHint')}</div>
          </span>
        </button>
        <div className={ps.popHint}>{t('to')}</div>
        <div className={styles.actions}>
          {LANGS.map(([k, l]) => (
            <button key={k} type="button" className={cx(ps.lang, pref.to === k && ps.langOn)} aria-pressed={pref.to === k} onClick={() => onChange({ to: k })} data-testid={`xl-to-${k}`}>
              {l}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
