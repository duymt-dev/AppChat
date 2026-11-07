// Popup khai báo bắt buộc sau đăng ký — prototype L739–790. Không đóng được (không nút X, không đóng khi bấm nền / Esc).
'use client';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useOnbStyles } from '../onboarding.styles';
import { useDeclareForm } from '../hooks/useDeclareForm';
import { DeclareStepInfo } from './DeclareStepInfo';

export function DeclareBusinessModal() {
  const t = useTranslations('onboarding.declare');
  const { styles, cx } = useOnbStyles();
  const form = useDeclareForm();

  return (
    <div className={styles.veil} data-testid="declare-modal" role="dialog" aria-modal="true">
      <div className={styles.card} data-testid="onb-card">
        <div className={styles.pad}>
          <div className={styles.prog}>
            {[1, 2].map((i) => (
              <div key={i} className={cx(styles.progBar, form.step >= i && styles.progOn)} />
            ))}
          </div>
          {form.step === 1 ? <DeclareStepInfo form={form} /> : null}
          {form.step === 2 ? (
            <div data-testid="declare-step-2">
              <button type="button" className={styles.back} onClick={() => form.setStep(1)}>
                {t('back')}
              </button>
              <div className={styles.title}>{t('fieldTitle')}</div>
              <div className={cx(styles.sub, styles.subLoose)}>{t('fieldSub')}</div>
              <div className={styles.label}>{t('fieldLabel')}</div>
              <textarea
                className={cx(styles.input, styles.textarea)}
                value={form.field}
                placeholder={t('fieldPlaceholder')}
                onChange={(e) => form.setField(e.target.value)}
                data-testid="declare-field"
              />
              <button
                type="button"
                className={styles.btn}
                disabled={!form.field.trim() || form.isPending}
                onClick={() => void form.submit()}
                data-testid="declare-submit"
              >
                {t('submit')}
                <Icon name="ic-arrow" size={16} strokeWidth={2.2} color={color.white} />
              </button>
              <div className={styles.note}>{t('required')}</div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
