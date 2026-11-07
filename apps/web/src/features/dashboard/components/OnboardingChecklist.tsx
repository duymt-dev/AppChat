// "Bắt đầu với AppChat" — 5 bước, thu gọn / mở rộng (prototype L1089–1129). Ghi qua onboarding.toggle_step.
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useChecklistStyles } from './checklist.styles';
import type { OnboardingStep } from '../types';

const CTA_ROUTE: Record<OnboardingStep['key'], string> = {
  channel: '/settings/channels',
  ai: '/agents',
  team: '/settings/members',
  template: '/settings/canned-replies',
  sla: '/settings/sla',
};

export interface OnboardingChecklistProps {
  steps: OnboardingStep[];
  doneCount: number;
}

export function OnboardingChecklist({ steps, doneCount }: OnboardingChecklistProps) {
  const t = useTranslations('dashboard.onboarding');
  const router = useRouter();
  const { styles, cx } = useChecklistStyles();
  const toggle = useAction('onboarding.toggle_step');
  const [collapsed, setCollapsed] = useState(false);
  const pct = Math.round((doneCount / steps.length) * 100);
  // độ rộng thanh tiến độ là giá trị động
  const bar = <div className={styles.barFill} style={{ width: `${pct}%` }} />;

  if (collapsed) {
    return (
      <button type="button" className={styles.mini} onClick={() => setCollapsed(false)} data-testid="onb-checklist-mini">
        <span className={styles.miniIcon}>
          <Icon name="ic-spark" size={16} color={color.white} />
        </span>
        <span className={styles.grow}>
          <span className={styles.miniTitle}>{t('title')}</span>
          <span className={styles.miniSub}>{t('collapsedSub', { done: doneCount, pct })}</span>
        </span>
        <span className={styles.miniBar}>{bar}</span>
        <span className={styles.miniOpen}>{t('expand')}</span>
      </button>
    );
  }

  return (
    <section className={styles.card} data-testid="onb-checklist">
      <div className={styles.head}>
        <span className={styles.icon}>
          <Icon name="ic-spark" size={20} color={color.white} />
        </span>
        <div className={styles.grow}>
          <div className={styles.title}>{t('title')}</div>
          <div className={styles.sub}>{t('sub')}</div>
        </div>
        <button type="button" className={styles.collapse} onClick={() => setCollapsed(true)}>
          {t('collapse')}
        </button>
      </div>
      <div className={styles.progress}>
        <div className={styles.count}>
          <span className={styles.countOn}>{t('progress', { done: doneCount })}</span>
          <span className={styles.countPct}>{t('pct', { pct })}</span>
        </div>
        <div className={styles.bar}>{bar}</div>
      </div>
      <div className={styles.list}>
        {steps.map((s) => (
          <div key={s.key} className={styles.step} data-testid={`onb-step-${s.key}`}>
            <button
              type="button"
              className={cx(styles.circle, s.done && styles.circleOn)}
              aria-pressed={s.done}
              aria-label={t('toggle')}
              onClick={() => void toggle.run({ step: s.key, done: !s.done }, { silent: true })}
            >
              <Icon name="ic-check" size={14} strokeWidth={2.6} color={color.white} />
            </button>
            <span className={cx(styles.chipIcon, s.done && styles.chipOn)}>
              <Icon name="ic-spark" size={16} />
            </span>
            <div className={styles.grow}>
              <div className={cx(styles.stepTitle, s.done && styles.stepDone)}>{s.title}</div>
              <div className={styles.stepDesc}>{s.desc}</div>
            </div>
            <button type="button" className={cx(styles.stepCta, s.done && styles.stepCtaDone)} onClick={() => router.push(CTA_ROUTE[s.key])}>
              {s.done ? t('reopen') : s.cta}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
