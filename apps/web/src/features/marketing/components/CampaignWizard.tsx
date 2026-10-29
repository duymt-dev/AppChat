// Wizard tạo chiến dịch (1140px) — prototype L3666–3797: đầu (tiêu đề · 4 bước), khung AI điền sẵn khi tạo từ đề xuất, thân theo bước,
// chân (tóm tắt · Quay lại · Lưu nháp · Gửi duyệt / Tiếp tục). Chiến dịch luôn qua duyệt (campaign.submit → campaign.approve).
'use client';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useWizardStyles } from '../styles/wizard.styles';
import { useMarketingUi } from '../marketing-store';
import { suggestionsQuery } from '../api';
import { useWizard } from '../hooks/useWizard';
import type { MarketingMeta, Suggestion } from '../types';
import { StepAudience, StepChannel, StepContent, StepSchedule } from './WizardSteps';

const STEPS = 4;

export function CampaignWizard({ meta }: { meta: MarketingMeta }) {
  const open = useMarketingUi((s) => s.wizard);
  const from = useMarketingUi((s) => s.fromSuggestion);
  const prefill = useMarketingUi((s) => s.prefill);
  const sugg = useQuery({ ...suggestionsQuery(), enabled: open && !!from });
  if (!open) return null;
  const s = from ? sugg.data?.data.find((x) => x.id === from) : undefined;
  if (from && !s) return null;
  return <Wizard key={`${from ?? ''}${JSON.stringify(prefill)}`} meta={meta} s={s} prefill={prefill ?? {}} />;
}

function AiPrefill({ s }: { s: Suggestion }) {
  const t = useTranslations('marketing');
  const { styles } = useWizardStyles();
  const rows: [string, string][] = [
    ['name', s.name],
    ['type', s.type],
    ['segment', `${s.segment} · ${s.count.toLocaleString('vi-VN')}`],
    ['exclude', t('wiz.excludeV')],
    ['channel', s.channels.map((c) => t(`chan.${c}`)).join(' · ')],
    ['time', s.time],
    ['subject', s.subject],
    ['body', s.body],
    ['cta', s.cta],
  ];
  return (
    <div className={styles.aiBox} data-testid="mk-wiz-ai">
      <div className={styles.aiH}>
        <Icon name="ic-spark" size={15} color={color.brandInk} strokeWidth={2} />
        {t('wiz.aiBox')}
      </div>
      <div className={styles.aiGrid}>
        {rows.map(([k, v]) => (
          <div key={k} className={styles.aiKv}>
            <span>{t(`wiz.aiK.${k}`)}</span>
            <span>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Wizard({ meta, s, prefill }: { meta: MarketingMeta; s: Suggestion | undefined; prefill: Record<string, unknown> }) {
  const t = useTranslations('marketing.wiz');
  const { styles, cx } = useWizardStyles();
  const w = useWizard(meta, s, prefill);
  const { d, patch } = w;
  const steps = t.raw('steps') as string[];
  return (
    <div className={styles.veil} onClick={w.close} data-testid="mk-wizard">
      <div className={styles.box} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className={styles.head}>
          <div className={styles.hRow}>
            <div className={styles.grow}>
              <div className={styles.hT}>{s ? t('titleAi') : t('titleNew')}</div>
              <div className={styles.hS}>{t('sub')}</div>
            </div>
            <button type="button" className={styles.x} onClick={w.close} aria-label={t('close')}>
              <Icon name="ic-x" size={18} color={color.text3} />
            </button>
          </div>
          <div className={styles.steps}>
            {steps.map((l, i) => {
              const n = i + 1;
              const cur = d.step === n;
              const done = d.step > n;
              return (
                <div key={l} className={cx(styles.step, done && styles.stepDone, cur && styles.stepOn)} data-testid={`mk-wiz-step-${n}`}>
                  <span className={cx(styles.num, done && styles.numDone, cur && styles.numOn)}>{done ? '✓' : n}</span>
                  {l}
                </div>
              );
            })}
          </div>
        </div>
        <div className={styles.body}>
          {d.step === 1 ? (
            <>
              {s ? <AiPrefill s={s} /> : null}
              <StepChannel d={d} patch={patch} />
            </>
          ) : null}
          {d.step === 2 ? <StepAudience meta={meta} d={d} patch={patch} visible={w.visible} toggle={w.toggle} selectAll={w.selectAll} /> : null}
          {d.step === 3 ? <StepContent d={d} patch={patch} /> : null}
          {d.step === 4 ? <StepSchedule d={d} patch={patch} audience={w.audience} /> : null}
        </div>
        <div className={styles.foot}>
          <div className={styles.sum}>
            {t.rich('footSum', { ch: t(`ch.${d.channel}.name`), n: w.audience.toLocaleString('vi-VN'), b: (c) => <b>{c}</b> })}
          </div>
          <span className={styles.grow} />
          {d.step > 1 ? (
            <button type="button" className={styles.ghost} onClick={() => patch({ step: d.step - 1 })} data-testid="mk-wiz-back">
              {t('back')}
            </button>
          ) : null}
          {d.step === STEPS ? (
            <>
              <button type="button" className={styles.ghost} disabled={w.pending} onClick={() => void w.save(false)} data-testid="mk-wiz-draft">
                {t('draft')}
              </button>
              <button type="button" className={styles.primary} disabled={w.pending} onClick={() => void w.save(true)} data-testid="mk-wiz-submit">
                <Icon name="ic-send" size={14} color={color.white} strokeWidth={2} />
                {t('submit')}
              </button>
            </>
          ) : (
            <button type="button" className={styles.primary} onClick={() => patch({ step: d.step + 1 })} data-testid="mk-wiz-next">
              {t('next')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
