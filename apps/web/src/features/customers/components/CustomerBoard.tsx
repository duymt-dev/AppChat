// Chân cột Kanban Khách hàng (TIP-026b §4.2): "Tải thêm" khi cột còn trang (đếm thật > thẻ đang có), trạng thái đang tải / lỗi thử lại.
'use client';
import { useTranslations } from 'next-intl';
import { createStyles } from 'antd-style';
import { color, font, layout, radius } from '@appchat/ui';

const useStyles = createStyles(({ css, responsive }) => ({
  more: css`
    width: 100%;
    padding: 8px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r10}px;
    background: ${color.surface};
    color: ${color.brandInk};
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.semibold};
    font-family: inherit;
    cursor: pointer;
    &:disabled {
      cursor: default;
      opacity: 0.6;
    }
    ${responsive.md} {
      min-height: ${layout.touch}px;
    }
  `,
  err: css`
    color: ${color.danger};
  `,
}));

interface Col {
  key: string;
  total: number;
  rows: unknown[];
  next_cursor: string | null;
  loading: boolean;
  error: boolean;
}

export function BoardMore({ col, onMore }: { col?: Col; onMore: () => void }) {
  const t = useTranslations('customers.kanban');
  const { styles, cx } = useStyles();
  if (!col?.next_cursor) return null;
  return (
    <button type="button" className={cx(styles.more, col.error && styles.err)} disabled={col.loading} onClick={onMore} data-testid={`kanban-more-${col.key}`}>
      {col.loading ? t('loading') : col.error ? t('retry') : t('more', { n: col.total - col.rows.length })}
    </button>
  );
}
