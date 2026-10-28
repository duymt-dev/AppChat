// Lịch sử phiên bản agent (D29, màn mới — khung drawer 392px của AI Agents): mỗi lần xuất bản là một phiên bản; quay lại = agent.rollback.
'use client';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useFmt } from '@/shared/i18n/useFmt';
import { useSideStyles } from '../styles/side.styles';
import { useAgentsUi } from '../agents-store';
import { versionsQuery } from '../api';
import type { Agent } from '../types';

export function VersionsDrawer({ agents }: { agents: Agent[] }) {
  const t = useTranslations('agents');
  const fmt = useFmt();
  const { styles } = useSideStyles();
  const id = useAgentsUi((s) => s.versionsFor);
  const set = useAgentsUi((s) => s.set);
  const agent = agents.find((a) => a.id === id);
  const q = useQuery({ ...versionsQuery(id ?? ''), enabled: !!id });
  const rollback = useAction('agent.rollback');
  if (!id || !agent) return null;
  const close = () => set({ versionsFor: null });
  const rows = q.data?.data ?? [];

  return (
    <>
      <div className={styles.veil} onClick={close} />
      <aside className={styles.panel} role="dialog" aria-modal="true" aria-label={t('v.title', { name: agent.name })} data-testid="ag-versions-drawer">
        <div className={styles.head}>
          <span className={styles.logo}>
            <Icon name="ic-clock" size={17} color={color.white} strokeWidth={1.9} />
          </span>
          <div className={styles.grow}>
            <div className={styles.title}>{t('v.title', { name: agent.name })}</div>
          </div>
          <button type="button" className={styles.x} onClick={close} aria-label={t('v.close')}>
            <Icon name="ic-x" size={18} color={color.text3} strokeWidth={2} />
          </button>
        </div>
        <div className={styles.body}>
          {rows.length ? (
            <div className={styles.list}>
              {rows.map((v) => (
                <div key={v.version} className={styles.ver} data-version={v.version} data-testid="ag-ver">
                  <div className={styles.verHead}>
                    <span className={styles.verNo}>{t('mine.version', { n: v.version })}</span>
                    {v.version === agent.version ? <span className={styles.cur}>{t('v.current')}</span> : null}
                    <span className={styles.grow} />
                    {v.version !== agent.version ? (
                      <button
                        type="button"
                        className={styles.ghost}
                        onClick={() => void rollback.run({ agent_id: agent.id, version: v.version })}
                        data-testid="ag-rollback"
                      >
                        {t('v.rollback')}
                      </button>
                    ) : null}
                  </div>
                  <div className={styles.verNote}>{v.note}</div>
                  <div className={styles.verBy}>{t('v.by', { by: v.published_by, at: `${fmt.date(v.published_at)} ${fmt.time(v.published_at)}` })}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.sugDesc}>{t('v.empty')}</div>
          )}
        </div>
      </aside>
    </>
  );
}
