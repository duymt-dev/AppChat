// Một dòng liệu trình (TIP-033b §4.2): tên, đã dùng / tổng, còn lại (KHÔNG phải "còn đặt được"), trạng thái tường minh (hết buổi / hết hạn /
// đã hoàn), hạn dùng. Không số tiền.
'use client';
import { useTranslations } from 'next-intl';
import { createStyles } from 'antd-style';
import { color, font, radius } from '@appchat/ui';
import { useFmt } from '../../i18n/useFmt';
import type { CustomerPackage } from '../types';

const TONE: Record<CustomerPackage['status'], [string, string]> = {
  active: [color.brandInk, color.brandBg],
  exhausted: [color.text3, color.muteBg],
  expired: [color.amberText, color.amberBg],
  refunded: [color.text4, color.muteBg],
};

const useStyles = createStyles(({ css }) => ({
  row: css`
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 8px 0;
    border-top: 1px solid ${color.divider};
    &:first-of-type {
      border-top: none;
    }
  `,
  top: css`
    display: flex;
    align-items: center;
    gap: 8px;
  `,
  name: css`
    flex: 1;
    min-width: 0;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
  `,
  st: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    padding: 2px 8px;
    border-radius: ${radius.r10}px;
  `,
  sub: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text3};
  `,
}));

export function PackageRow({ p }: { p: CustomerPackage }) {
  const t = useTranslations('common.packages');
  const fmt = useFmt();
  const { styles } = useStyles();
  const [fg, bg] = TONE[p.status];
  return (
    <div className={styles.row} data-package={p.id}>
      <div className={styles.top}>
        <span className={styles.name}>{p.name}</span>
        <span className={styles.st} style={{ color: fg, background: bg }}>
          {t(`status.${p.status}`)}
        </span>
      </div>
      <div className={styles.sub}>
        {t('usage', { used: p.used, total: p.total, remaining: p.remaining })}
        {p.expires_at ? ` · ${t('expires', { date: fmt.date(p.expires_at) })}` : ''}
      </div>
    </div>
  );
}
