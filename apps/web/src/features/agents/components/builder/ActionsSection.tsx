// Hành động (tool → action id trong registry; bỏ các mục OUT: ZNS/SMS, workflow, gọi điện, HTTP) + AI Governance + Nguồn kiến thức
// — prototype L2364–2398.
'use client';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useBuilderStyles } from '../../styles/builder.styles';
import { useSectionStyles } from '../../styles/sections.styles';
import type { AgentsMeta, Handoff } from '../../types';
import type { SectionProps } from './BasicsSection';
import { Switch } from './Switch';

const GOV = ['grounding', 'pii', 'override', 'audit'] as const;
const HANDOFF: Handoff[] = ['staff', 'team', 'lead'];

export function ActionsSection({ cfg, patch, toggleTool, meta }: SectionProps & { meta: AgentsMeta; toggleTool: (k: string) => void }) {
  const t = useTranslations('agents.b');
  const router = useRouter();
  const { styles: bs } = useBuilderStyles();
  const { styles } = useSectionStyles();
  const pair = (k: string) => t.raw(k) as [string, string];

  return (
    <>
      <div className={bs.sec}>
        <div className={bs.h}>{t('actions')}</div>
        <div className={bs.hSub}>{t('actionsSub')}</div>
        <div className={styles.stack} data-testid="agb-tools">
          {meta.tools.map((tool) => {
            const [title, desc] = pair(`tool.${tool.key}`);
            return (
              <div key={tool.key} className={styles.row} data-tool={tool.key} data-action-id={tool.action_id}>
                <div className={styles.rowGrow}>
                  <div className={styles.rowT}>{title}</div>
                  <div className={styles.rowD}>{desc}</div>
                </div>
                <Switch on={cfg.tools.includes(tool.key)} label={t('toolOn', { name: title })} onToggle={() => toggleTool(tool.key)} />
              </div>
            );
          })}
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
