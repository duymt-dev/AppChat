// Thẻ một agent: biểu tượng, tên, vai trò, bật / tạm dừng (agent.pause), mức AI (D29), phiên bản, thống kê (AgentStatsPanel), thao tác.
'use client';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useMineStyles } from '../styles/mine.styles';
import type { Agent } from '../types';
import { AgentStatsPanel } from './AgentStatsPanel';

const STATUS = {
  active: [color.doneBg, color.statusActive],
  paused: [color.mutedBg, color.text3],
  draft: [color.pendingBg, color.amberText],
} as const;

export interface AgentCardProps {
  agent: Agent;
  canManage: boolean;
  onEdit: () => void;
  onToggle: () => void;
  onVersions: () => void;
  onDelete: () => void;
}

export function AgentCard({ agent: a, canManage, onEdit, onToggle, onVersions, onDelete }: AgentCardProps) {
  const t = useTranslations('agents');
  const { styles, cx } = useMineStyles();
  const on = a.status === 'active';
  const [bg, fg] = STATUS[a.status];

  return (
    <div className={styles.card} data-agent={a.id} data-testid="ag-card">
      <div className={styles.head}>
        <span className={styles.face}>{a.emoji}</span>
        <div className={styles.grow}>
          <div className={styles.name}>{a.name}</div>
          <div className={styles.role}>{a.role_label}</div>
        </div>
        {a.status !== 'draft' ? (
          <button
            type="button"
            role="switch"
            aria-checked={on}
            aria-label={t('mine.toggle', { name: a.name })}
            className={styles.swHit}
            disabled={!canManage}
            onClick={onToggle}
            data-testid="ag-toggle"
          >
            <span className={styles.sw} style={{ background: on ? color.brand : color.border }}>
              <span style={{ left: on ? 20 : 2 }} />
            </span>
          </button>
        ) : null}
      </div>
      <div className={styles.pills}>
        <span className={styles.pill} style={{ background: bg, color: fg }} data-testid="ag-status">
          {t(`mine.status.${a.status}`)}
        </span>
        <span className={styles.pill} style={{ background: color.agentPickBg, color: color.agentPickText }}>
          {t('mine.tier', { tier: t(`tier.${a.model_tier}`) })}
        </span>
        {a.version ? (
          <span className={styles.pill} style={{ background: color.pillBg, color: color.text2 }} data-testid="ag-version">
            {t('mine.version', { n: a.version })}
          </span>
        ) : null}
        {a.dirty ? (
          <span className={styles.pill} style={{ background: color.noticeBg, color: color.noticeText }}>
            {t('b.draftDirty')}
          </span>
        ) : null}
      </div>
      <AgentStatsPanel agentId={a.id} initial={a.stats} />
      {canManage ? (
        <div className={styles.foot}>
          <button type="button" className={styles.act} onClick={onEdit} data-testid="ag-edit">
            <Icon name="ic-cog" size={13} color={color.text3} />
            {t('mine.edit')}
          </button>
          <button type="button" className={styles.act} onClick={onVersions} data-testid="ag-versions">
            <Icon name="ic-clock" size={13} color={color.text3} />
            {t('mine.versions')}
          </button>
          <button type="button" className={cx(styles.act, styles.danger)} onClick={onDelete} aria-label={t('mine.delete')} data-testid="ag-delete">
            <Icon name="ic-trash" size={13} color={color.danger} />
          </button>
        </div>
      ) : null}
    </div>
  );
}
