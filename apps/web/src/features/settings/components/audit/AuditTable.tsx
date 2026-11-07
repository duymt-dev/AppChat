// Bảng Audit log — prototype L7024–7044: giờ (mono) · người làm (tên + vai trò hiện tại / Hệ thống / Trợ lý AI) · hành động (tên action
// theo i18n, không có dữ liệu input) · IP. Hàng sự kiện bảo mật có nhãn. Chỉ đọc.
'use client';
import { useTranslations } from 'next-intl';
import { useFmt } from '@/shared/i18n/useFmt';
import { useAuditStyles } from '../../styles/audit.styles';
import type { AuditRow } from '../../types';

const DASH = '—';

export function AuditTable({ rows }: { rows: AuditRow[] }) {
  const t = useTranslations('settings.audit');
  const tr = useTranslations('settings.roleName');
  const ta = useTranslations('actions');
  const fmt = useFmt();
  const { styles, cx } = useAuditStyles();
  const actor = (a: AuditRow) => (a.name ? `${a.name} (${a.role === 'removed' ? t('removed') : tr(a.role as never)})` : t(`actor.${a.role === 'system' ? 'system' : 'ai'}`));
  const label = (id: string) => (ta.has(`${id}.title` as never) ? ta(`${id}.title` as never) : t.has(`event.${id.replace(/\./g, '__')}` as never) ? t(`event.${id.replace(/\./g, '__')}` as never) : id);
  return (
    <div className={styles.table} data-testid="st-audit">
      <div className={cx(styles.th, styles.g4)}>
        <div>{t('col.time')}</div>
        <div>{t('col.actor')}</div>
        <div>{t('col.action')}</div>
        <div className={styles.hideM}>{t('col.ip')}</div>
      </div>
      {rows.map((a) => (
        <div key={a.id} className={cx(styles.tr, styles.g4)} data-audit data-status={a.status}>
          <div className={styles.mono} title={fmt.date(a.time)}>
            {fmt.time(a.time)}
          </div>
          <div className={styles.who}>{actor(a)}</div>
          <div className={styles.act}>
            {a.action !== a.action_id ? a.action : label(a.action_id)}
            {a.status === 'warn' ? <span className={styles.warn}>{t('status.warn')}</span> : null}
          </div>
          <div className={cx(styles.ip, styles.hideM)}>{a.ip ?? DASH}</div>
        </div>
      ))}
    </div>
  );
}
