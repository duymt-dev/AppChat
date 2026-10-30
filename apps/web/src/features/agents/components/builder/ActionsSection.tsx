// Tools — danh sách quyền agent (D51, D16): nhóm theo module + nhóm "Kỹ năng AI" (action đọc, `skill`), n/tổng mỗi nhóm,
// badge "Cần kết nối X" / "Sắp có" khi action cần connector (D51 §3.3b). Đây là NƠI DUY NHẤT bật/tắt quyền agent.
// + AI Governance + Nguồn kiến thức — prototype L2364–2398.
'use client';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { channelsQuery, connectorsQuery } from '@/features/settings';
import { connectorStatus, connectorBadge, groupToolsByModule, AGENT_GRANTABLE, MODULE_ACTIONS, SKILL_ACTIONS } from '@/shared/ai/agent-tools';
import { useBuilderStyles } from '../../styles/builder.styles';
import { useSectionStyles } from '../../styles/sections.styles';
import type { Handoff } from '../../types';
import type { SectionProps } from './BasicsSection';
import { Switch } from './Switch';

const GOV = ['grounding', 'pii', 'override', 'audit'] as const;
const HANDOFF: Handoff[] = ['staff', 'team', 'lead'];

export function ActionsSection({ cfg, patch, toggleTool }: SectionProps & { toggleTool: (k: string) => void }) {
  const t = useTranslations('agents.b');
  const tc = useTranslations('common');
  const router = useRouter();
  const { styles: bs } = useBuilderStyles();
  const { styles } = useSectionStyles();
  const pair = (k: string) => t.raw(k) as [string, string];
  const channels = useQuery(channelsQuery('all')).data ?? [];
  const connectors = useQuery(connectorsQuery()).data ?? [];
  const { known, connected } = connectorStatus({ channels, connectors });
  const groups = groupToolsByModule(MODULE_ACTIONS, cfg.tools);
  const skillGroup = groupToolsByModule(SKILL_ACTIONS, cfg.tools)[0];

  const toolRow = (a: (typeof AGENT_GRANTABLE)[number]) => {
    const badge = connectorBadge(a, connected, known);
    const on = cfg.tools.includes(a.id);
    return (
      <div key={a.id} className={styles.row} data-tool={a.id}>
        <div className={styles.rowGrow}>
          <div className={styles.rowT}>{t(a.title as never)}</div>
          <div className={styles.rowD}>{a.description}</div>
        </div>
        {badge ? (
          <span className={styles.rowBadge} data-testid={`agb-badge-${badge}`}>
            {badge === 'needs_connector' ? t('needsConnector', { name: a.requiresConnector ?? '' }) : t('comingSoon')}
          </span>
        ) : (
          <Switch on={on} label={t('toolOn', { name: t(a.title as never) })} onToggle={() => toggleTool(a.id)} />
        )}
      </div>
    );
  };

  return (
    <>
      <div className={bs.sec}>
        <div className={bs.h}>{t('actions')}</div>
        <div className={bs.hSub}>{t('actionsSub')}</div>
        <div className={styles.toolGroups} data-testid="agb-tools">
          {groups.map((g) => (
            <div key={g.key} className={styles.toolGroup}>
              <div className={styles.toolGroupHead}>
                <span className={styles.toolGroupTitle}>{tc(`modules.${g.key}` as never)}</span>
                <span className={styles.toolGroupCount}>{t('toolCount', { on: g.grantedCount, total: g.actions.length })}</span>
              </div>
              <div className={styles.stack}>{g.actions.map(toolRow)}</div>
            </div>
          ))}
          {skillGroup ? (
            <div className={styles.toolGroup} data-testid="agb-skill-group">
              <div className={styles.toolGroupHead}>
                <span className={styles.toolGroupTitle}>{t('skillGroup')}</span>
                <span className={styles.toolGroupCount}>{t('toolCount', { on: skillGroup.grantedCount, total: skillGroup.actions.length })}</span>
              </div>
              <div className={styles.stack}>{skillGroup.actions.map(toolRow)}</div>
            </div>
          ) : null}
        </div>
      </div>
      <div className={bs.sec}>
        <div className={bs.h}>
          {t('gov')} <span className={bs.hMuted}>{t('govTag')}</span>
        </div>
        <div className={bs.hSub}>{t('govSub')}</div>
        <div className={styles.box}>
          <div className={styles.thText}>{t.rich('threshold', { n: cfg.threshold, b: (c) => <b>{c}</b> })}</div>
          <input
            type="range"
            min={50}
            max={95}
            step={5}
            value={cfg.threshold}
            onChange={(e) => patch({ threshold: Number(e.target.value) })}
            className={styles.range}
            aria-label={t('thresholdAria')}
            data-testid="agb-threshold"
          />
          <div className={styles.thScale}>
            <span>{t('thLow')}</span>
            <span>{t('thHigh')}</span>
          </div>
        </div>
        <div className={styles.gap12}>
          <div className={bs.label}>{t('handoff')}</div>
          <select className={bs.field} value={cfg.handoff_to} onChange={(e) => patch({ handoff_to: e.target.value as Handoff })} aria-label={t('handoff')}>
            {HANDOFF.map((k) => (
              <option key={k} value={k}>
                {t(`handoffOpt.${k}`)}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.stack}>
          {GOV.map((k) => {
            const [title, desc] = pair(`govItem.${k}`);
            const on = cfg.governance[k] !== false;
            return (
              <div key={k} className={styles.row}>
                <div className={styles.rowGrow}>
                  <div className={styles.rowT}>{title}</div>
                  <div className={styles.rowD}>{desc}</div>
                </div>
                <Switch on={on} label={title} onToggle={() => patch({ governance: { ...cfg.governance, [k]: !on } })} />
              </div>
            );
          })}
        </div>
      </div>
      <div className={bs.sec}>
        <div className={bs.h} style={{ marginBottom: 8 }}>
          {t('kb')}
        </div>
        <div className={styles.notice}>
          <b>{t('kbNoticeB')}</b>
          <br />
          {t('kbNotice')}
        </div>
        <div className={styles.kb}>
          <span className={styles.kbIcon}>
            <Icon name="ic-doc" size={20} color={color.brand} strokeWidth={1.7} />
          </span>
          <div className={styles.kbTitle}>{t('kbTitle')}</div>
          <div className={styles.kbSub}>{t('kbSub')}</div>
          <button type="button" className={styles.kbBtn} onClick={() => router.push('/settings/rag_data')}>
            <Icon name="ic-plus" size={14} color={color.white} strokeWidth={2} />
            {t('kbAdd')}
          </button>
        </div>
      </div>
    </>
  );
}
