// Sức khoẻ + bằng chứng kết nối (TIP-012b P3 §1.3): pill theo `health` thật (đã lưu khoá ≠ đã xác minh), chế độ, khả năng (webhook /
// thăm dò / kéo), thăm dò gần nhất (cho khoá hiện tại hay cũ), lần đồng bộ / webhook gần nhất, lỗi đã làm sạch, feed tài chính (tài
// khoản che). Không bí mật.
'use client';
import { useTranslations } from 'next-intl';
import { useFmt } from '@/shared/i18n/useFmt';
import { useIntegDetailStyles } from '../styles/integration-detail.styles';
import type { ConnectionDetail, ConnectionHealth } from '../integration-types';

const TONE: Record<ConnectionHealth, 'ok' | 'warn' | 'bad' | 'idle'> = {
  verified: 'ok',
  probing: 'warn',
  configured_unverified: 'warn',
  degraded: 'bad',
  disconnected: 'idle',
  sandbox: 'idle',
};

export function HealthPill({ health }: { health: ConnectionHealth }) {
  const t = useTranslations('settings.integrations.detail');
  const { styles, cx } = useIntegDetailStyles();
  return (
    <span className={cx(styles.pill, styles[TONE[health]])} data-testid="st-int-health" data-health={health}>
      {t(`health.${health}`)}
    </span>
  );
}

export function IntegrationHealth({ d }: { d: ConnectionDetail }) {
  const t = useTranslations('settings.integrations.detail');
  const fmt = useFmt();
  const { styles } = useIntegDetailStyles();
  const when = (v: string | null) => (v ? `${fmt.date(v)} ${fmt.time(v)}` : t('never'));
  const caps = (['webhook', 'probe', 'pull'] as const).filter((k) => d.capabilities[k]).map((k) => t(`cap.${k}`));
  const probe = d.probe.status ? `${t(`probe.${d.probe.status}`)}${d.probe.reason ? ` · ${t(`reason.${d.probe.reason}`)}` : ''}${d.probe.current ? '' : ` · ${t('probe.stale')}`}` : t('never');
  const items: [string, string][] = [
    [t('mode'), t(`modeV.${d.mode}`)],
    [t('caps'), caps.length ? caps.join(' · ') : t('none')],
    [t('probeAt'), `${probe}${d.probe.at ? ` — ${when(d.probe.at)}` : ''}`],
    [t('lastSync'), when(d.last_sync_at)],
    [t('lastEvent'), when(d.last_event_at)],
    [t('binding'), d.bank_binding ? `${t(d.bank_binding.active ? 'bindingOn' : 'bindingOff')} ${d.bank_binding.account_masked}` : t('none')],
  ];
  return (
    <div>
      <div className={styles.grid} data-testid="st-int-evidence">
        {items.map(([k, v]) => (
          <div key={k}>
            <div className={styles.k}>{k}</div>
            <div className={styles.v}>{v}</div>
          </div>
        ))}
      </div>
      {d.last_error ? (
        <div className={styles.note} role="status" data-testid="st-int-error">
          {t('lastError', { reason: t(`reason.${d.last_error}`) })}
        </div>
      ) : null}
    </div>
  );
}
