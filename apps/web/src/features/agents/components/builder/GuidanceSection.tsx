// Hướng dẫn (prompt) — prototype L2321–2337: textarea mono, thanh công cụ, "Thêm mẫu lời nhắc ▾" (4 mẫu), "Tối ưu hóa" (agent.optimize_prompt).
'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Icon, color, type IconName } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useBuilderStyles } from '../../styles/builder.styles';
import { useSectionStyles } from '../../styles/sections.styles';
import type { AgentsMeta } from '../../types';
import type { SectionProps } from './BasicsSection';

const TOOL_ICONS: IconName[] = ['ic-users', 'ic-inbox', 'ic-gift', 'ic-flow'];

export function GuidanceSection({ cfg, patch, templates }: SectionProps & { templates: AgentsMeta['prompt_templates'] }) {
  const t = useTranslations('agents.b');
  const { styles: bs } = useBuilderStyles();
  const { styles } = useSectionStyles();
  const [open, setOpen] = useState(false);
  const optimize = useAction<{ prompt: string }>('agent.optimize_prompt');
  const runOptimize = async () => {
    const res = await optimize.run({ prompt: cfg.prompt }, { silent: true });
    if (res) patch({ prompt: res.result.prompt });
  };

  return (
    <div className={styles.guide}>
      <div className={styles.guideTitle}>{t('guide')}</div>
      <div className={styles.guideSub}>{t('guideSub')}</div>
      <div className={styles.editor}>
        <textarea
          rows={6}
          className={styles.area}
          value={cfg.prompt}
          onChange={(e) => patch({ prompt: e.target.value })}
          placeholder={t('promptPh')}
          aria-label={t('guide')}
          data-testid="agb-prompt"
        />
        <div className={styles.tools}>
          <span className={styles.toolIcons}>
            {TOOL_ICONS.map((ic) => (
              <Icon key={ic} name={ic} size={15} color={color.text4} strokeWidth={1.8} />
            ))}
          </span>
          <span className={bs.grow} />
          <button type="button" className={styles.tplBtn} onClick={() => setOpen((v) => !v)} aria-expanded={open} data-testid="agb-tpl">
            {t('addTpl')}
          </button>
          <button type="button" className={styles.optimize} onClick={() => void runOptimize()} disabled={optimize.isPending} data-testid="agb-optimize">
            <Icon name="ic-spark" size={13} color={color.white} strokeWidth={1.9} />
            {t('optimize')}
          </button>
          {open ? (
            <div className={styles.tplPop} role="menu" data-testid="agb-tpl-pop">
              {templates.map((tp) => (
                <button
                  key={tp.label}
                  type="button"
                  role="menuitem"
                  className={styles.tplOpt}
                  onClick={() => {
                    patch({ prompt: tp.text });
                    setOpen(false);
                  }}
                >
                  <Icon name="ic-doc" size={13} color={color.brand} strokeWidth={1.8} />
                  {tp.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      <span className={`${bs.link} ${styles.learn}`}>
        <Icon name="ic-doc" size={14} color={color.brand} strokeWidth={1.8} />
        {t('learn')}
      </span>
    </div>
  );
}
