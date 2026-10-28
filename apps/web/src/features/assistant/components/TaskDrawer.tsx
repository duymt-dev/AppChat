// Drawer cấu hình tác vụ — prototype L1386–1421 (520px, nền xám): Tính cách & Prompt · Kiến thức · Công cụ & Quyền · Nhật ký & Chi phí.
'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Icon, color, gradient } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useDrawerStyles } from '../styles/drawer.styles';
import { useAssistantUi } from '../assistant-store';
import type { AiTasksPayload } from '../types';

const TABS = ['prompt', 'knowledge', 'tools', 'logs'] as const;
type Tab = (typeof TABS)[number];
const TONES = ['friendly', 'pro', 'brief'] as const;
const LANGS = ['vi', 'en', 'zh'] as const;

function Switch({ on, label }: { on: boolean; label: string }) {
  const { styles } = useDrawerStyles();
  return (
    <span role="switch" aria-checked={on} aria-label={label} className={styles.sw} style={{ background: on ? color.brand : color.border }}>
      <span style={{ left: on ? 20 : 2 }} />
    </span>
  );
}

export function TaskDrawer({ data }: { data: AiTasksPayload }) {
  const t = useTranslations('assistant.cw.drawer');
  const tt = useTranslations('assistant');
  const { styles, cx } = useDrawerStyles();
  const ui = useAssistantUi();
  const update = useAction('ai_task.update');
  const [tab, setTab] = useState<Tab>('prompt');
  const [prompt, setPrompt] = useState<string | null>(null);
  const task = data.tasks.find((x) => x.id === ui.taskOpen);
  if (!task) return null;
  const close = () => {
    ui.set({ taskOpen: null });
    setTab('prompt');
    setPrompt(null);
  };
  const save = async () => {
    if (prompt !== null) await update.run({ task_id: task.id, patch: { prompt } });
    close();
  };
  const d = data.drawer;

  return (
    <div className={styles.veil} onClick={close} data-testid="cw-drawer">
      <div className={styles.panel} role="dialog" aria-modal="true" aria-label={task.name} onClick={(e) => e.stopPropagation()}>
        <div className={styles.head}>
          <span className={styles.icon} style={{ background: gradient.ai }}>
            <Icon name="ic-bot" size={22} color={color.white} />
          </span>
          <div className={styles.grow}>
            <div className={styles.title}>{task.name}</div>
            <div className={styles.sub}>{t('sub', { role: task.role, tier: tt(`tier.${task.model_tier}`) })}</div>
          </div>
          <button type="button" className={styles.x} onClick={close} aria-label={t('close')}>
            <Icon name="ic-x" size={16} strokeWidth={2.2} />
          </button>
        </div>
        <div className={styles.tabs} role="tablist">
          {TABS.map((k) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} className={cx(styles.tab, tab === k && styles.tabOn)} onClick={() => setTab(k)}>
              {t(`tabs.${k}`)}
            </button>
          ))}
        </div>
        <div className={styles.body}>
          {tab === 'prompt' ? (
            <div className={styles.stack}>
              <div>
                <div className={styles.label}>{t('tone')}</div>
                <div className={styles.tones}>
                  {TONES.map((k, i) => (
                    <span key={k} className={cx(styles.tone, i === 0 && styles.toneOn)}>
                      {t(`tones.${k}`)}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <label className={styles.label} htmlFor="cw-lang">
                  {t('lang')}
                </label>
                <select id="cw-lang" className={styles.select} defaultValue="vi">
                  {LANGS.map((k) => (
                    <option key={k} value={k}>
                      {t(`langs.${k}`)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={styles.label} htmlFor="cw-prompt">
                  {t('prompt')}
                </label>
                <textarea id="cw-prompt" className={styles.prompt} value={prompt ?? task.prompt ?? d.prompt} onChange={(e) => setPrompt(e.target.value)} />
              </div>
            </div>
          ) : null}
          {tab === 'knowledge' ? (
            <>
              <div className={styles.hint}>{t('knowHint')}</div>
              <div className={styles.list}>
                {d.knowledge.map((k) => (
                  <div key={k.label} className={styles.item}>
                    <span className={styles.folder}>
                      <Icon name="ic-folder" size={16} color={color.text3} />
                    </span>
                    <div className={styles.grow}>
                      <div className={styles.itemTitle}>{k.label}</div>
                      <div className={styles.itemMeta}>{k.meta}</div>
                    </div>
                    <Switch on={k.on} label={k.label} />
                  </div>
                ))}
              </div>
            </>
          ) : null}
          {tab === 'tools' ? (
            <>
              <div className={styles.hint}>{t.rich('toolsHint', { b: (c) => <b className={styles.link}>{c}</b> })}</div>
              <div className={styles.list}>
                {d.tools.map((x) => (
                  <div key={x.label} className={styles.item}>
                    <span className={cx(styles.grow, styles.toolLabel)}>{x.label}</span>
                    <Switch on={x.on} label={x.label} />
                  </div>
                ))}
              </div>
            </>
          ) : null}
          {tab === 'logs' ? (
            <>
              <div className={styles.kpis}>
                <div className={styles.kpi}>
                  <div className={styles.kpiLabel}>{t('tokens')}</div>
                  <div className={styles.kpiVal}>{d.tokens}</div>
                </div>
                <div className={styles.kpi}>
                  <div className={styles.kpiLabel}>{t('costToday')}</div>
                  <div className={styles.kpiVal}>{task.cost}</div>
                </div>
              </div>
              <div className={styles.label}>{t('log')}</div>
              <div className={styles.logs}>
                {d.logs.map((g) => (
                  <div key={g.time} className={styles.log}>
                    <span className={styles.logTime}>{g.time}</span>
                    <span className={styles.logDot} style={{ background: g.color }} />
                    <span className={styles.logText}>{g.text}</span>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>
        <div className={styles.foot}>
          <button type="button" className={styles.btn} onClick={close}>
            {t('close')}
          </button>
          <button type="button" className={styles.primary} onClick={() => void save()} data-testid="cw-drawer-save">
            {t('save')}
          </button>
        </div>
      </div>
    </div>
  );
}
