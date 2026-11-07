// Modal "Tạo tác vụ tự chủ" — prototype L1317–1350. Ghi qua `ai_task.create`; "Model thực thi" → mức AI (D29). TIP-035: chip dữ liệu /
// công cụ là key (dịch), mẫu chủ động, agent thực hiện + lịch (cron) / sự kiện (TaskTriggerFields).
'use client';
import { useTranslations } from 'next-intl';
import { Icon, color, gradient } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useTaskFormStyles } from '../styles/task-form.styles';
import { useAssistantUi } from '../assistant-store';
import { useTaskForm, type Trigger } from '../hooks/useTaskForm';
import type { AiTasksPayload, Tier } from '../types';
import { TriggerFields } from './TaskTriggerFields';

const TIERS: Tier[] = ['standard', 'advanced', 'max'];
const TRIGGERS: Trigger[] = ['manual', 'schedule', 'event'];
const DATA = 'data';
const TOOLS = 'tools';

export function TaskCreateModal({ data }: { data: AiTasksPayload }) {
  const open = useAssistantUi((s) => s.taskNew);
  if (!open) return null;
  return <TaskCreateForm data={data} />;
}

function TaskCreateForm({ data }: { data: AiTasksPayload }) {
  const t = useTranslations('assistant');
  const { styles, cx } = useTaskFormStyles();
  const ui = useAssistantUi();
  const create = useAction<{ task_id: string }>('ai_task.create');
  const { f, set, toggle, pick, input, ok } = useTaskForm(ui.taskPrefill);
  const close = () => ui.set({ taskNew: false, taskPrefill: null });
  const save = async () => {
    if (!ok) return;
    if (await create.run(input())) close();
  };
  const chips = (k: 'data' | 'tools', opts: string[]) => (
    <div className={styles.opts}>
      {opts.map((v) => (
        <button key={v} type="button" aria-pressed={f[k].includes(v)} className={cx(styles.opt, f[k].includes(v) && styles.optOn)} onClick={() => toggle(k, v)} data-chip={v}>
          {t(`cw.new.${k}Opt.${v}` as never)}
        </button>
      ))}
    </div>
  );

  return (
    <div className={styles.veil} onClick={close} data-testid="cw-new">
      <div className={styles.box} role="dialog" aria-modal="true" aria-label={t('cw.new.title')} onClick={(e) => e.stopPropagation()}>
        <div className={styles.head}>
          <span className={styles.icon} style={{ background: gradient.ai }}>
            <Icon name="ic-bot" size={19} color={color.white} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className={styles.title}>{t('cw.new.title')}</div>
            <div className={styles.sub}>{t('cw.new.sub')}</div>
          </div>
          <button type="button" className={styles.x} onClick={close} aria-label={t('cw.new.cancel')}>
            <Icon name="ic-x" size={16} strokeWidth={2.2} />
          </button>
        </div>
        <div className={styles.body}>
          <div>
            <label className={styles.label} htmlFor="cw-name">
              {t('cw.new.name')}
            </label>
            <input id="cw-name" className={styles.input} value={f.name} placeholder={t('cw.new.namePh')} onChange={(e) => set({ name: e.target.value })} />
          </div>
          <div>
            <label className={styles.label} htmlFor="cw-goal">
              {t('cw.new.goal')}
            </label>
            <textarea id="cw-goal" className={cx(styles.input, styles.area)} value={f.goal} placeholder={t('cw.new.goalPh')} onChange={(e) => set({ goal: e.target.value })} />
            <div className={styles.quick}>
              <span className={styles.quickLabel}>{t('cw.new.quick')}</span>
              {data.templates.map((tp) => (
                <button key={tp.label} type="button" className={styles.quickChip} onClick={() => pick(tp)}>
                  {tp.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className={styles.label}>{t('cw.new.dept')}</div>
            <div className={styles.opts}>
              {data.departments.map((d) => (
                <button key={d.key} type="button" aria-pressed={f.department === d.key} className={cx(styles.opt, f.department === d.key && styles.optOn)} onClick={() => set({ department: d.key })}>
                  {d.key}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className={styles.label}>{t('cw.new.data')}</div>
            {chips(DATA, data.data_options)}
            <div className={styles.hint}>{t('cw.new.dataHint')}</div>
          </div>
          <div>
            <div className={styles.label}>{t('cw.new.tools')}</div>
            {chips(TOOLS, data.tool_options)}
          </div>
          <div className={styles.two}>
            <div>
              <div className={styles.label}>{t('cw.new.run')}</div>
              <div className={styles.seg} role="radiogroup">
                {TRIGGERS.map((k) => (
                  <button key={k} type="button" role="radio" aria-checked={f.trigger === k} className={cx(styles.segBtn, f.trigger === k && styles.segOn)} onClick={() => set({ trigger: k })}>
                    {t(`cw.new.runs.${k}`)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={styles.label} htmlFor="cw-tier">
                {t('cw.new.tier')}
              </label>
              <select id="cw-tier" className={styles.input} value={f.tier} onChange={(e) => set({ tier: e.target.value as Tier })}>
                {TIERS.map((k) => (
                  <option key={k} value={k}>
                    {t('cw.new.tierOpt', { tier: t(`tier.${k}`), desc: t(`tier.${k}Desc`) })}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <TriggerFields f={f} set={set} agents={data.agents} />
          <div className={styles.safety}>
            <div className={styles.safeRow}>
              <Icon name="ic-shield" size={15} color={color.brandInk} strokeWidth={2} />
              <span className={styles.safeLabel}>{t('cw.new.askDelete')}</span>
              <span className={styles.always}>{t('cw.new.always')}</span>
            </div>
            <div className={styles.safeRow}>
              <Icon name="ic-send" size={15} color={color.text3} strokeWidth={2} />
              <span className={styles.safeLabel}>{t('cw.new.askSend')}</span>
              <button type="button" role="switch" aria-checked={f.askSend} aria-label={t('cw.new.askSend')} className={styles.sw} style={{ background: f.askSend ? color.brand : color.checkLine }} onClick={() => set({ askSend: !f.askSend })}>
                <span style={{ left: f.askSend ? 18 : 2 }} />
              </button>
            </div>
            <div className={styles.safeRow}>
              <Icon name="ic-gift" size={15} color={color.text3} strokeWidth={2} />
              <span className={styles.safeLabel}>{t('cw.new.budget')}</span>
              <input className={styles.budget} value={f.budget} aria-label={t('cw.new.budget')} onChange={(e) => set({ budget: e.target.value })} />
            </div>
          </div>
        </div>
        <div className={styles.foot}>
          <span className={styles.footHint}>{ok ? t('cw.new.hint', { tier: t(`tier.${f.tier}`), budget: f.budget || '0' }) : t('cw.new.hintEmpty')}</span>
          <button type="button" className={styles.cancel} onClick={close}>
            {t('cw.new.cancel')}
          </button>
          <button type="button" className={styles.save} disabled={!ok || create.isPending} onClick={() => void save()} data-testid="cw-save">
            {f.trigger === 'manual' ? t('cw.new.createRun') : t('cw.new.createOnly')}
          </button>
        </div>
      </div>
    </div>
  );
}
