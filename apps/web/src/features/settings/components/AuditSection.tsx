// Mục Audit log + AI Audit log — prototype L7024–7044: tiêu đề 15 + mô tả lưu trữ, nút "Xuất JSON" (tải tệp JSON các dòng đang hiện),
// bảng giờ (mono) · actor · hành động · IP | context · trạng thái (OK / Warn / Escalated). Chỉ đọc (audit.view).
'use client';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { PageStates, stateOf } from '@/shared/states/PageStates';
import { useAuditStyles } from '../styles/audit.styles';
import { aiAuditQuery, auditQuery } from '../api';
import type { AiAuditRow, AuditRow } from '../types';

const DASH = '—';
const JSON_TYPE = 'application/json';
const download = (name: string, rows: unknown) => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(rows, null, 2)], { type: JSON_TYPE }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
};

function Head({ kind, rows }: { kind: 'audit' | 'ai'; rows: unknown[] }) {
  const t = useTranslations('settings.audit');
  const { styles } = useAuditStyles();
  return (
    <div className={styles.head}>
      <div className={styles.t}>{t(`${kind}.title`)}</div>
      <span className={styles.s}>{t(`${kind}.sub`)}</span>
      <span className={styles.grow} />
      <button type="button" className={styles.exp} onClick={() => download(t(`${kind}.file`), rows)} data-testid="st-audit-export">
        <Icon name="ic-download" size={13} color={color.text3} />
        {t('export')}
      </button>
    </div>
  );
}

export function AuditSection() {
  const t = useTranslations('settings.audit');
  const tr = useTranslations('settings.roleName');
  const { styles, cx } = useAuditStyles();
  const q = useQuery(auditQuery());
  const rows = q.data ?? [];
  const actor = (a: AuditRow) => (a.name ? `${a.name} (${tr(a.role)})` : t(`actor.${a.role}`));
  return (
    <>
      <Head kind="audit" rows={rows} />
      <PageStates state={stateOf(q)} onRetry={() => void q.refetch()}>
        <div className={styles.table} data-testid="st-audit">
          <div className={cx(styles.th, styles.g4)}>
            <div>{t('col.time')}</div>
            <div>{t('col.actor')}</div>
            <div>{t('col.action')}</div>
            <div className={styles.hideM}>{t('col.ip')}</div>
          </div>
          {rows.map((a, i) => (
            <div key={i} className={cx(styles.tr, styles.g4)} data-audit>
              <div className={styles.mono}>{a.time}</div>
              <div className={styles.who}>{actor(a)}</div>
              <div className={styles.act}>{a.action}</div>
              <div className={cx(styles.ip, styles.hideM)}>{a.ip ?? DASH}</div>
            </div>
          ))}
        </div>
      </PageStates>
    </>
  );
}

export function AiAuditSection() {
  const t = useTranslations('settings.audit');
  const { styles, cx } = useAuditStyles();
  const q = useQuery(aiAuditQuery());
  const rows = q.data ?? [];
  const st: Record<AiAuditRow['status'], string> = { ok: styles.ok, warn: styles.warn, escalated: styles.esc };
  return (
    <>
      <Head kind="ai" rows={rows} />
      <PageStates state={stateOf(q)} onRetry={() => void q.refetch()}>
        <div className={styles.table} data-testid="st-ai-audit">
          <div className={cx(styles.th, styles.g5)}>
            <div>{t('col.time')}</div>
            <div>{t('col.actor')}</div>
            <div>{t('col.action')}</div>
            <div className={styles.hideM}>{t('col.context')}</div>
            <div>{t('col.status')}</div>
          </div>
          {rows.map((l, i) => (
            <div key={i} className={cx(styles.tr, styles.g5)} data-audit>
              <div className={styles.mono}>{l.time}</div>
              <div className={styles.who}>{t(`aiActor.${l.actor}`)}</div>
              <div className={styles.text}>{l.action}</div>
              <div className={cx(styles.act, styles.hideM)}>{l.context}</div>
              <div>
                <span className={st[l.status]}>{t(`status.${l.status}`)}</span>
              </div>
            </div>
          ))}
        </div>
      </PageStates>
    </>
  );
}
