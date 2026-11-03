// Luồng hội thoại Trợ lý trong drawer theo màn (TIP-023c G2.7): tin người dùng / Trợ lý, thẻ xác nhận gọn (tiêu đề + mô tả + số bản ghi
// + Xác nhận / Huỷ; chờ duyệt ≠ đã xong), cây GenUI chế độ compact ("Mở rộng" → modal full), "đang soạn", lỗi gửi. Không có câu trả
// lời soạn sẵn — mọi nội dung từ lượt thật.
'use client';
import { useTranslations } from 'next-intl';
import { createStyles } from 'antd-style';
import { Icon, color, font, radius } from '@appchat/ui';
import { GenUiRenderer } from '../genui';
import type { ScreenMsg } from './useScreenAssistant';
import type { UiCommand } from '@appchat/shared';

const useStyles = createStyles(({ css }) => ({
  list: css`
    display: flex;
    flex-direction: column;
    gap: 12px;
  `,
  user: css`
    align-self: flex-end;
    max-width: 85%;
    padding: 8px 12px;
    border-radius: ${radius.r12}px ${radius.r12}px ${radius.r4}px ${radius.r12}px;
    background: ${color.brand};
    color: ${color.white};
    font-size: ${font.size.small}px;
    line-height: 1.5;
    white-space: pre-wrap;
  `,
  ai: css`
    font-size: ${font.size.small}px;
    line-height: 1.55;
    color: ${color.text2};
    white-space: pre-wrap;
  `,
  card: css`
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 12px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    background: ${color.surface};
  `,
  cardTitle: css`
    font-size: ${font.size.small}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
  `,
  cardDesc: css`
    font-size: ${font.size.caption}px;
    color: ${color.text3};
  `,
  row: css`
    display: flex;
    gap: 8px;
  `,
  ok: css`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 12px;
    border: 0;
    border-radius: ${radius.r8}px;
    background: ${color.brand};
    color: ${color.white};
    font-weight: ${font.weight.semibold};
    cursor: pointer;
  `,
  no: css`
    padding: 4px 12px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    background: ${color.surface};
    color: ${color.text2};
    cursor: pointer;
  `,
  status: css`
    font-size: ${font.size.caption}px;
    font-weight: ${font.weight.semibold};
  `,
  muted: css`
    font-size: ${font.size.caption}px;
    color: ${color.text4};
  `,
}));

export interface ScreenAssistantThreadProps {
  msgs: readonly ScreenMsg[];
  typing: boolean;
  onDecide: (m: ScreenMsg, d: 'confirm' | 'cancel') => void;
  onUi: (cmd: UiCommand) => void;
  testId?: string;
}

export function ScreenAssistantThread({ msgs, typing, onDecide, onUi, testId }: ScreenAssistantThreadProps) {
  const t = useTranslations('common.screenAi');
  const { styles } = useStyles();
  if (!msgs.length && !typing) return null;
  return (
    <div className={styles.list} data-testid={testId ?? 'screen-ai-thread'}>
      {msgs.map((m) => {
        if (m.role === 'user')
          return (
            <div key={m.id} className={styles.user} data-testid="screen-ai-user">
              {m.text}
            </div>
          );
        if (m.ui) return <GenUiRenderer key={m.id} part={m.ui} mode="compact" onUi={onUi} />;
        if (m.card) return <Card key={m.id} m={m} onDecide={onDecide} />;
        return (
          <div key={m.id} className={styles.ai} data-testid="screen-ai-msg" style={m.error ? { color: color.danger } : undefined}>
            {m.error ? t('error') : m.text}
          </div>
        );
      })}
      {typing ? (
        <div className={styles.muted} data-testid="screen-ai-typing">
          {t('thinking')}
        </div>
      ) : null}
    </div>
  );
}

function Card({ m, onDecide }: { m: ScreenMsg; onDecide: ScreenAssistantThreadProps['onDecide'] }) {
  const t = useTranslations('common.screenAi');
  const { styles } = useStyles();
  const c = m.card!;
  const tone = m.status === 'done' ? color.brandDeep : m.status === 'cancelled' ? color.text3 : color.warn;
  return (
    <div className={styles.card} data-testid="screen-ai-card" data-status={m.status}>
      <div className={styles.cardDesc}>{t('confirmLead')}</div>
      <div className={styles.cardTitle}>{c.title}</div>
      {c.desc ? <div className={styles.cardDesc}>{c.desc}</div> : null}
      {c.preview?.count ? <div className={styles.cardDesc}>{t('count', { n: c.preview.count })}</div> : null}
      {m.status === 'pending' ? (
        <div className={styles.row}>
          <button type="button" className={styles.ok} onClick={() => onDecide(m, 'confirm')}>
            <Icon name="ic-check" size={13} color={color.white} strokeWidth={2.4} />
            {t('confirm')}
          </button>
          <button type="button" className={styles.no} onClick={() => onDecide(m, 'cancel')}>
            {t('cancel')}
          </button>
        </div>
      ) : (
        <div className={styles.status} style={{ color: tone }}>
          {t(m.status === 'done' ? 'done' : m.status === 'approval' ? 'approval' : 'cancelled')}
        </div>
      )}
    </div>
  );
}
