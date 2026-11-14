// Thẻ trạng thái chỉ mục embedding trong Dữ liệu RAG (TIP-020e §4.2): model embedding đã đổi → "chỉ mục cũ" + nút "Tạo lại chỉ mục"
// (useAction('kb.reindex') — server luôn xem trước: thẻ xác nhận có số đoạn / token / Credit / dung lượng); đang tạo lại → tiến độ THẬT
// `done / expected` (không thanh giả) + Huỷ; lần gần nhất lỗi / huỷ → lý do; model của khe đang phục vụ đã gỡ → suy giảm (chỉ tìm theo từ
// khoá). Chỉ hiện với người có `kb.manage`; chỉ mục hiện hành, không lỗi → không hiện gì. Nhãn model chỉ `nhà cung cấp · model`.
'use client';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import type { KbIndexStatus as Status } from '@appchat/shared';
import { useKbIndexStyles } from '../styles/kb-index.styles';

type Tone = 'stale' | 'running' | 'bad';

/** Lý do đã biết có bản dịch; lý do lạ → nhãn chung (không in mã thô). */
const REASONS = ['credit_exhausted', 'usage_unknown', 'budget', 'space_retired', 'price_missing', 'provider_unavailable', 'catch_up_exhausted', 'cancelled_by_user'];

function viewOf(s: Status): { tone: Tone; key: string } | null {
  if (s.phase === 'building' || s.phase === 'catching_up') return { tone: 'running', key: s.phase };
  if (s.degraded) return { tone: 'bad', key: s.degraded };
  if (s.phase === 'failed') return { tone: 'bad', key: 'failed' };
  if (s.phase === 'cancelled') return { tone: 'stale', key: 'cancelled' };
  if (s.state === 'stale') return { tone: 'stale', key: 'stale' };
  return null;
}

export interface KbIndexStatusProps {
  status: Status | null;
  busy: boolean;
  onReindex: () => void;
  onCancel: () => void;
}

export function KbIndexStatus({ status, busy, onReindex, onCancel }: KbIndexStatusProps) {
  const t = useTranslations('settings.rag.index');
  const { styles, cx } = useKbIndexStyles();
  const v = status ? viewOf(status) : null;
  if (!status || !v) return null;
  const running = v.tone === 'running';
  const pct = status.expected > 0 ? Math.min(100, Math.round((status.done / status.expected) * 100)) : 0;
  const reason = status.reason ? (REASONS.includes(status.reason) ? t(`reason.${status.reason}`) : t('reason.other')) : null;
  // Có route embed hiện hành khác khe → tạo lại được; chưa cấu hình route (no_model_route) → không có đích để tạo.
  const canReindex = !running && status.degraded !== 'no_model_route' && (status.state === 'stale' || v.key === 'failed' || v.key === 'cancelled');
  return (
    <div className={cx(styles.card, styles[v.tone])} role="status" aria-live="polite" data-testid="st-rag-index" data-state={v.key}>
      <Icon name={running ? 'ic-refresh' : v.tone === 'bad' ? 'ic-shield' : 'ic-spark'} size={18} color={running ? color.info : v.tone === 'bad' ? color.danger : color.warn} />
      <div className={styles.body}>
        <div className={styles.title}>{t(`title.${v.key}`)}</div>
        <div className={styles.text}>
          {t(`text.${v.key}`, { from: status.active_space_label ?? '—', to: status.target_space_label ?? status.active_space_label ?? '—' })}
          {reason ? ` ${t('reasonLabel', { r: reason })}` : null}
        </div>
        {running ? (
          <>
            <div className={styles.bar} role="progressbar" aria-valuemin={0} aria-valuemax={status.expected} aria-valuenow={status.done} aria-label={t('progress', { done: status.done, total: status.expected })}>
              <div className={styles.fill} style={{ width: `${pct}%` }} />
            </div>
            <div className={styles.text} data-testid="st-rag-index-progress">
              {t('progress', { done: status.done, total: status.expected })}
            </div>
          </>
        ) : null}
      </div>
      <div className={styles.acts}>
        {running ? (
          <button type="button" className={styles.ghost} disabled={busy} onClick={onCancel} data-testid="st-rag-index-cancel">
            {t('cancel')}
          </button>
        ) : canReindex ? (
          <button type="button" className={styles.primary} disabled={busy} onClick={onReindex} data-testid="st-rag-index-reindex">
            <Icon name="ic-refresh" size={13} color={color.white} strokeWidth={1.9} />
            {t('reindex')}
          </button>
        ) : null}
      </div>
    </div>
  );
}
