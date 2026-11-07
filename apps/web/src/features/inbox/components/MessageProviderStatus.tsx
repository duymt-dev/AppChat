// Trạng thái thao tác kênh trên tin (TIP-014b A): thu hồi / cảm xúc trên Zalo chờ nhà cung cấp xác nhận — "Đang thu hồi…", "Chưa rõ đã
// thu hồi", "Thu hồi không thành công", "Đã thu hồi một phần"; cảm xúc "đang gửi / chưa rõ / lỗi". Không hiện gì khi không có lệnh mở. Nội
// dung tin giữ nguyên tới khi xác nhận (không giả thu hồi thành công). Gửi tin (TIP-014b B): "chỉ gửi được một phần" / "chưa rõ đã tới
// khách" — không giả là đã gửi, không giả là lỗi (gửi lại có thể trùng). Prototype không có — lệch ghi PD-015.
'use client';
import { useTranslations } from 'next-intl';
import { createStyles } from 'antd-style';
import { color, font } from '@appchat/ui';
import type { Message } from '../types';

const useStyles = createStyles(({ css }) => ({
  line: css`
    display: block;
    margin-top: 4px;
    font-size: ${font.scale.s11}px;
    line-height: 1.3;
    color: ${color.text3};
  `,
  warn: css`
    color: ${color.amberText};
  `,
  bad: css`
    color: ${color.danger};
  `,
}));

export function MessageProviderStatus({ op, status }: { op: Message['provider_op']; status?: string }) {
  const t = useTranslations('inbox.providerOp');
  const { styles, cx } = useStyles();
  const send = status === 'partial' || status === 'unknown' ? status : null;
  if (!send && (!op || (!op.recall && !op.react))) return null;
  const lines: [string, string, 'muted' | 'warn' | 'bad'][] = [];
  if (send) lines.push(['send', t(`send.${send}` as never), 'warn']);
  if (op?.recall) lines.push(['recall', t(`recall.${op.recall}` as never), op.recall === 'pending' ? 'muted' : op.recall === 'failed' ? 'bad' : 'warn']);
  if (op?.react) lines.push(['react', t(`react.${op.react}` as never), op.react === 'pending' ? 'muted' : op.react === 'failed' ? 'bad' : 'warn']);
  return (
    <>
      {lines.map(([k, text, tone]) => (
        <span key={k} className={cx(styles.line, tone === 'warn' && styles.warn, tone === 'bad' && styles.bad)} data-testid={`provider-op-${k}`} role="status">
          {text}
        </span>
      ))}
    </>
  );
}
