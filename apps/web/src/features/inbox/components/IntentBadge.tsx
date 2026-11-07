// Nhãn ý định của lượt gần nhất (TIP-022b C) ở đầu khung chat — bộ đóng mua / hỏi / khiếu nại / đặt lịch / khác, chữ qua i18n (không
// hiển thị chữ thô của model). Chỉ tham khảo, không phải quyền đổi báo giá / đơn.
'use client';
import { useTranslations } from 'next-intl';
import { createStyles } from 'antd-style';
import type { AgentIntent } from '@appchat/shared';
import { color, font, radius } from '@appchat/ui';

const useStyles = createStyles(({ css }) => ({
  b: css`
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.bold};
    border-radius: ${radius.r6}px;
    padding: 2px 6px;
    background: ${color.violetBg};
    color: ${color.violetInk};
    white-space: nowrap;
  `,
  hot: css`
    background: ${color.dangerBg};
    color: ${color.hotText};
  `,
}));

export function IntentBadge({ intent }: { intent?: AgentIntent }) {
  const t = useTranslations('inbox.intent');
  const { styles, cx } = useStyles();
  if (!intent || intent === 'other') return null;
  return (
    <span
      className={cx(styles.b, intent === 'complaint' && styles.hot)}
      title={t('hint')}
      data-testid="intent-badge"
      data-intent={intent}
    >
      {t(intent)}
    </span>
  );
}
