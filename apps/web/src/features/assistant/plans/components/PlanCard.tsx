// Thẻ kế hoạch Cowork trong hội thoại (TIP-023d §6.1): revision, tiến độ THẬT (biên nhận server), từng bước + lý do chờ. Nút:
// "Sửa kế hoạch" (plan_request_edit → chờ xả tới `paused`), "Lưu" (chỉ bước chưa chạy), "Tiếp tục" (plan_resume, riêng), "Dừng" (run.cancel).
// Không có nút "hoàn tác" việc đã gửi đi — việc đã làm giữ nguyên.
'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from 'antd';
import { usePlanStyles } from '../plan.styles';
import { usePlan } from '../hooks/usePlan';
import { RUNNING_PHASES } from '../types';
import { PlanEditor } from './PlanEditor';
import { PlanStep } from './PlanStep';

export function PlanCard({ sessionId }: { sessionId: string | undefined }) {
  const t = useTranslations('assistant.plan');
  const { styles } = usePlanStyles();
  const p = usePlan(sessionId);
  const [editing, setEditing] = useState(false);
  const plan = p.plan;
  if (!plan || plan.phase === 'draft') return null;
  const done = plan.steps.filter((s) => s.state === 'succeeded').length;
  const paused = plan.phase === 'paused' || plan.phase === 'editing';

  return (
    <section className={styles.card} data-testid="plan-card" data-phase={plan.phase} aria-label={t('title')}>
      <div className={styles.head}>
        <span className={styles.title}>{t('title')}</span>
        <span className={styles.meta}>{t('revision', { n: plan.revision })}</span>
        <span className={styles.meta} data-testid="plan-phase">
          {t(`phase.${plan.phase}`)}
        </span>
      </div>
      <div className={styles.bar} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(plan.progress * 100)}>
        <span style={{ width: `${Math.round(plan.progress * 100)}%` }} />
      </div>
      <div className={styles.meta} data-testid="plan-progress">
        {t('progress', { done, total: plan.steps.length })}
      </div>
      {editing && paused ? (
        <PlanEditor plan={plan} busy={p.busy} onSave={(ops) => p.save(plan, ops)} onClose={() => setEditing(false)} />
      ) : (
        <>
          <ul className={styles.steps}>
            {plan.steps.map((s) => (
              <PlanStep key={s.id} step={s} />
            ))}
          </ul>
          {plan.phase === 'pause_requested' ? <div className={styles.note}>{t('draining')}</div> : null}
          <div className={styles.actions}>
            {RUNNING_PHASES.has(plan.phase) ? (
              <Button loading={p.busy} data-testid="plan-request-edit" onClick={() => p.requestEdit(plan)}>
                {t('requestEdit')}
              </Button>
            ) : null}
            {paused ? (
              <>
                <Button data-testid="plan-edit" onClick={() => setEditing(true)}>
                  {t('edit')}
                </Button>
                <Button type="primary" loading={p.busy} data-testid="plan-resume" onClick={() => p.resume(plan)}>
                  {t('resume')}
                </Button>
              </>
            ) : null}
            {plan.root_run_id && (RUNNING_PHASES.has(plan.phase) || p.held) ? (
              <Button danger loading={p.busy} data-testid="plan-stop" onClick={() => p.stop(plan)}>
                {t('stop')}
              </Button>
            ) : null}
          </div>
          <div className={styles.note}>{t('noRollback')}</div>
        </>
      )}
    </section>
  );
}
