// Khối "AI Agent phụ trách widget" — prototype L7206–7262: bật / tắt, chọn Agent, ngưỡng bàn giao (50–95%), phạm vi kiến thức,
// tông giọng, chế độ trả lời, nghiệp vụ AI được tạo bản ghi. "Agent mới" / "Bổ sung kiến thức" mở AI Agents / Dữ liệu RAG.
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useWidgetStyles } from '../styles/widget.styles';
import type { Widget } from '../types';
import { Switch } from './Switch';

const TONES = ['friendly', 'professional', 'brief'] as const;
const MODES = ['auto', 'human', 'hybrid'] as const;
const AGENTS_NEW = '/agents';
const RAG = '/settings/rag_data';

const toggle = (list: string[], k: string) => (list.includes(k) ? list.filter((x) => x !== k) : [...list, k]);

export function WidgetAiBox({ w, put }: { w: Widget; put: (patch: Record<string, unknown>) => void }) {
  const t = useTranslations('settings.widget.ai');
  const router = useRouter();
  const { styles, cx } = useWidgetStyles();
  const [conf, setConf] = useState(w.handoff);
  return (
    <div className={styles.aiBox} data-testid="st-wg-ai">
      <div className={styles.aiHead}>
        <span className={styles.aiIc}>
          <Icon name="ic-bot" size={15} color={color.white} />
        </span>
        <div className={styles.grow}>
          <div className={styles.aiT}>{t('title')}</div>
          <div className={styles.tS}>{t('sub')}</div>
        </div>
        <Switch on={w.ai_on} onChange={(v) => put({ ai_on: v })} label={t('title')} testId="st-wg-ai-on" />
      </div>
      {w.ai_on ? (
        <>
          <div className={styles.sLbl}>{t('agent')}</div>
          <div className={styles.chips}>
            {w.agents.map((a) => (
              <button key={a} type="button" className={cx(styles.chip, a === w.agent && styles.chipOn)} onClick={() => put({ agent_id: a })} data-testid="st-wg-agent">
                {a}
              </button>
            ))}
            <button type="button" className={styles.chipNew} onClick={() => router.push(AGENTS_NEW)}>
              <Icon name="ic-plus" size={13} color="currentColor" strokeWidth={2.2} />
              {t('newAgent')}
            </button>
          </div>
          <div className={styles.note}>
            <Icon name="ic-globe" size={14} color={color.brandInk} />
            {t('global')}
          </div>
          <div className={styles.sLbl}>{t('handoff', { n: conf })}</div>
          <input
            type="range"
            min={50}
            max={95}
            step={5}
            value={conf}
            onChange={(e) => setConf(Number(e.target.value))}
            onMouseUp={() => put({ handoff: conf })}
            onTouchEnd={() => put({ handoff: conf })}
            onKeyUp={() => put({ handoff: conf })}
            className={styles.range}
            aria-label={t('handoff', { n: conf })}
            data-testid="st-wg-handoff"
          />
          <div className={styles.rowHead}>
            <div className={styles.sLbl}>{t('know')}</div>
            <span className={styles.grow} />
            <button type="button" className={styles.linkSm} onClick={() => router.push(RAG)}>
              {t('addKnow')}
            </button>
          </div>
          <div className={styles.hint}>{t('knowD', { n: w.knowledge_on.length })}</div>
          <div className={styles.chips}>
            {w.knowledge.map((k) => (
              <button key={k} type="button" className={cx(styles.tag, w.knowledge_on.includes(k) && styles.tagViolet)} onClick={() => put({ knowledge_on: toggle(w.knowledge_on, k) })}>
                {t(`k.${k}`)}
              </button>
            ))}
          </div>
          <div className={styles.sLbl}>{t('tone')}</div>
          <div className={styles.chips}>
            {TONES.map((k) => (
              <button key={k} type="button" className={cx(styles.chip, w.tone === k && styles.chipOn)} onClick={() => put({ tone: k })}>
                {t(`tones.${k}`)}
              </button>
            ))}
          </div>
          <div className={styles.sLbl}>{t('mode')}</div>
          <div className={styles.modes}>
            {MODES.map((k) => (
              <button key={k} type="button" className={cx(styles.chip, styles.mode, w.mode === k && styles.chipOn)} onClick={() => put({ mode: k })} data-testid={`st-wg-mode-${k}`}>
                {t(`modes.${k}`)}
              </button>
            ))}
          </div>
          <div className={styles.sLbl}>{t('collect')}</div>
          <div className={styles.hint}>{t('collectD', { n: w.collect_on.length })}</div>
          <div className={styles.chips}>
            {w.collect.map((k) => (
              <button key={k} type="button" className={cx(styles.tag, w.collect_on.includes(k) && styles.tagBlue)} onClick={() => put({ collect_on: toggle(w.collect_on, k) })}>
                {t(`c.${k}`)}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
