// Hộp "Sửa chính sách" SLA mặc định — prototype L7601–7621 (540px), P0 chỉ sửa ngưỡng: FRT / TTR (phút) cho AI và con người;
// 0 = tức thì / không áp dụng (FRT / TTR người ≥ 1). Tên / loại / hạng / phạm vi của chính sách mặc định cố định. Lưu → sla.update_default.
'use client';
import { useState } from 'react';
import { App } from 'antd';
import { useTranslations } from 'next-intl';
import { useAction } from '@/shared/actions/useAction';
import { useSectionStyles } from '../styles/section.styles';
import { useSlaStyles } from '../styles/sla.styles';
import type { SlaData } from '../types';
import { FormModal } from './FormModal';

type Mins = Pick<SlaData['policy'], 'frt_ai' | 'frt_human' | 'ttr_ai' | 'ttr_human'>;
const KEYS: (keyof Mins)[] = ['frt_ai', 'frt_human', 'ttr_ai', 'ttr_human'];
const HUMAN = ['frt_human', 'ttr_human'];

export function SlaPolicyModal({ p, onClose }: { p: SlaData['policy']; onClose: () => void }) {
  const t = useTranslations('settings.sla.modal');
  const { message } = App.useApp();
  const s = useSectionStyles().styles;
  const { styles, cx } = useSlaStyles();
  const [v, setV] = useState<Record<keyof Mins, string>>({
    frt_ai: String(p.frt_ai),
    frt_human: String(p.frt_human),
    ttr_ai: String(p.ttr_ai),
    ttr_human: String(p.ttr_human),
  });
  const upd = useAction('sla.update_default');
  const save = async () => {
    const n = Object.fromEntries(KEYS.map((k) => [k, Number(v[k])])) as Mins;
    if (KEYS.some((k) => !Number.isInteger(n[k]) || n[k] < (HUMAN.includes(k) ? 1 : 0))) return void message.error(t('err'));
    if (await upd.run(n)) onClose();
  };
  return (
    <FormModal
      open
      wide
      title={t('title')}
      onClose={onClose}
      onSave={() => void save()}
      saveLabel={t('save')}
      cancelLabel={t('cancel')}
      closeLabel={t('close')}
      pending={upd.isPending}
      testId="st-sla-modal"
    >
      <div>
        <div className={s.label}>{t('name')}</div>
        <input className={s.input} value={t('defaultName')} disabled />
      </div>
      <div className={styles.mHead}>{t.rich('thresholds', { ai: (c) => <span className={styles.ai}>{c}</span> })}</div>
      <div className={styles.mGrid}>
        {KEYS.map((k) => (
          <div key={k}>
            <div className={cx(styles.mL, k.endsWith('_ai') && styles.ai)}>{t(`f.${k}`)}</div>
            <input
              className={s.input}
              type="number"
              min={HUMAN.includes(k) ? 1 : 0}
              value={v[k]}
              onChange={(e) => setV({ ...v, [k]: e.target.value })}
              data-testid={`st-sla-${k}`}
            />
          </div>
        ))}
      </div>
      <div className={s.muted}>{t('hint')}</div>
    </FormModal>
  );
}
