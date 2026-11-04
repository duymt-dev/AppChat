// Bảng AI Audit log — prototype L7024–7044: giờ · actor (Trợ lý AI / tên agent — không tên model, D29) · tác vụ · ngữ cảnh (nơi chạy +
// credit / token) · trạng thái OK / Warn / Escalated. Chỉ metadata run, không prompt / nội dung khách.
'use client';
import { useTranslations } from 'next-intl';
import { useFmt } from '@/shared/i18n/useFmt';
import { useAuditStyles } from '../../styles/audit.styles';
import type { AiAuditRow } from '../../types';

export function AiAuditTable({ rows }: { rows: AiAuditRow[] }) {
  const t = useTranslations('settings.audit');
  const fmt = useFmt();
  const { styles, cx } = useAuditStyles();
  const st: Record<AiAuditRow['status'], string> = { ok: styles.ok, warn: styles.warn, escalated: styles.esc };
  const actor = (l: AiAuditRow) => l.agent_name ?? (t.has(`aiActor.${l.actor}` as never) ? t(`aiActor.${l.actor}` as never) : t('aiActor.agent'));
  const ctx = (l: AiAuditRow) => t.has(`ctx.${l.context}` as never) ? t(`ctx.${l.context}` as never) : l.context;
  return (
    <div className={styles.table} data-testid="st-ai-audit">
      <div className={cx(styles.th, styles.g5)}>
        <div>{t('col.time')}</div>
        <div>{t('col.actor')}</div>
        <div>{t('col.action')}</div>
        <div className={styles.hideM}>{t('col.context')}</div>
        <div>{t('col.status')}</div>
      </div>
      {rows.map((l) => (
        <div key={l.id} className={cx(styles.tr, styles.g5)} data-audit>
          <div className={styles.mono} title={fmt.date(l.time)}>
            {fmt.time(l.time)}
          </div>
          <div className={styles.who}>{actor(l)}</div>
          <div className={styles.text}>{l.action}</div>
          <div className={cx(styles.act, styles.hideM)}>{l.tokens || l.credits ? t('ctxLine', { ctx: ctx(l), credits: l.credits, tokens: fmt.number(l.tokens) }) : ctx(l)}</div>
          <div>
            <span className={st[l.status]}>{t(`status.${l.status}`)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
