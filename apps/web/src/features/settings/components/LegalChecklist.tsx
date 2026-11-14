// LegalChecklistPanel (Blueprint §7.3, templates.md §6): bảng kiểm theo loại — hợp đồng theo Điều 398 BLDS 2015, báo giá, đề nghị
// thanh toán / phiếu thu (dòng "không thay thế hoá đơn GTGT" luôn có). Chỉ cảnh báo, không chặn lưu.
'use client';
import { useTranslations } from 'next-intl';
import { LEGAL_CHECKLIST } from '@appchat/shared';
import { Icon, color } from '@appchat/ui';
import { useDocModalStyles } from '../styles/doc-modal.styles';
import type { DocKindKey } from '../types';

export function LegalChecklist({ kind, missing }: { kind: DocKindKey; missing: readonly string[] }) {
  const t = useTranslations('settings.doctpl.check');
  const { styles, cx } = useDocModalStyles();
  const items = LEGAL_CHECKLIST[kind];
  const miss = items.filter((k) => missing.includes(k)).length;
  return (
    <div className={styles.check} data-testid="doc-checklist">
      <div className={styles.checkT}>
        {t(`title.${kind}`)}
        <span className={cx(styles.checkN, miss > 0 && styles.checkWarn)}>{miss ? t('missing', { n: miss }) : t('allOk')}</span>
      </div>
      {items.map((k) => {
        const ok = !missing.includes(k);
        return (
          <div key={k} className={styles.checkRow} data-check={k} data-ok={ok ? '1' : '0'}>
            <Icon name={ok ? 'ic-check' : 'ic-help'} size={13} color={ok ? color.okStrong : color.amberText} strokeWidth={2.2} />
            <span>{t(`item.${k}`)}</span>
          </div>
        );
      })}
      <div className={styles.checkHint}>{t('hint')}</div>
    </div>
  );
}
