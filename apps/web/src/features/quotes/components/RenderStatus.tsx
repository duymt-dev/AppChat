// Trạng thái PDF báo giá đã gửi (TIP-028b §1): job doc-render đang tạo PDF → "Đang tạo PDF…" (WS `document.render` làm mới khi xong);
// lỗi hết 3 lượt → lý do + "Thử lại" (`quote.retry_render`, cần quyền gửi báo giá). Xong / chưa phát hành → không hiện gì.
'use client';
import { Spin } from 'antd';
import { useTranslations } from 'next-intl';
import { useAction } from '@/shared/actions/useAction';
import { useCan } from '@/shared/authz/useCan';
import { useRenderStyles } from '../styles/render.styles';
import type { Quote } from '../types';

export function RenderStatus({ q }: { q: Quote }) {
  const t = useTranslations('quotes.detail.render');
  const { styles, cx } = useRenderStyles();
  const canSend = useCan('quote.send');
  const retry = useAction('quote.retry_render');
  const st = q.render?.status;
  if (st === 'pending_render')
    return (
      <div className={cx(styles.bar, styles.pending)} role="status" data-testid="q-render" data-render="pending_render">
        <Spin size="small" />
        <span className={styles.grow}>{t('pending')}</span>
      </div>
    );
  if (st !== 'render_failed') return null;
  return (
    <div className={cx(styles.bar, styles.failed)} role="alert" data-testid="q-render" data-render="render_failed">
      <span className={styles.grow}>{t('failed')}</span>
      <button type="button" className={styles.retry} disabled={!canSend || retry.isPending} onClick={() => void retry.run({ quote_id: q.id })} data-testid="q-render-retry">
        {t('retry')}
      </button>
    </div>
  );
}
