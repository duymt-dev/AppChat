// Bước 1 popup khai báo — prototype L745–783: loại DN / Cá nhân, MST + Tra cứu, thông tin tự điền (ô xám = chỉ đọc).
'use client';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useOnbStyles } from '../onboarding.styles';
import type { useDeclareForm } from '../hooks/useDeclareForm';

export interface DeclareStepInfoProps {
  form: ReturnType<typeof useDeclareForm>;
}

interface FieldInputProps {
  form: DeclareStepInfoProps['form'];
  name: keyof DeclareStepInfoProps['form']['fields'];
  readOnly?: boolean;
  placeholder?: string;
  bare?: boolean;
  testId?: string;
}

/** Ô thông tin (ô xám = lấy từ tra cứu MST, chỉ đọc theo prototype). */
function FieldInput({ form, name, readOnly, placeholder, bare, testId }: FieldInputProps) {
  const { styles, cx } = useOnbStyles();
  return (
    <input
      className={cx(styles.input, bare && styles.inputBare, readOnly && styles.readOnly)}
      value={form.fields[name]}
      placeholder={placeholder}
      onChange={(e) => form.set(name, e.target.value)}
      data-testid={testId}
    />
  );
}

export function DeclareStepInfo({ form }: DeclareStepInfoProps) {
  const t = useTranslations('onboarding.declare');
  const { styles, cx } = useOnbStyles();
  const biz = form.kind === 'business';
  const ro = biz && form.lookup === 'found';
  return (
    <div data-testid="declare-step-1">
      <div className={styles.title}>{biz ? t('bizTitle') : t('indivTitle')}</div>
      <div className={styles.sub}>{t('sub')}</div>
      <div className={styles.types} role="radiogroup">
        <button type="button" role="radio" aria-checked={biz} className={cx(styles.type, biz && styles.typeOn)} onClick={() => form.setKind('business')} data-testid="declare-type-business">
          <div className={styles.typeName}>{t('typeBiz')}</div>
          <div className={styles.typeSub}>{t('typeBizSub')}</div>
        </button>
        <button type="button" role="radio" aria-checked={!biz} className={cx(styles.type, !biz && styles.typeOn)} onClick={() => form.setKind('individual')} data-testid="declare-type-individual">
          <div className={styles.typeName}>{t('typeIndiv')}</div>
          <div className={styles.typeSub}>{t('typeIndivSub')}</div>
        </button>
      </div>

      <div className={styles.label}>{biz ? t('taxLabel') : t('idLabel')}</div>
      <div className={styles.lookupRow}>
        <input
          className={cx(styles.input, styles.inputBare)}
          value={form.idNumber}
          inputMode="numeric"
          placeholder={biz ? t('taxPlaceholder') : t('idPlaceholder')}
          onChange={(e) => form.setIdNumber(e.target.value)}
          data-testid="declare-id"
        />
        {biz ? (
          <button type="button" className={styles.lookup} disabled={form.looking} onClick={() => void form.doLookup()} data-testid="declare-lookup">
            {t('lookup')}
          </button>
        ) : null}
      </div>

      {form.showFields ? (
        <>
          <div className={cx(styles.found, biz && form.lookup === 'not_found' && styles.notFound)} data-testid="declare-lookup-result">
            <Icon name={biz && form.lookup === 'not_found' ? 'ic-help' : 'ic-check'} size={15} strokeWidth={2.2} color={biz && form.lookup === 'not_found' ? color.warn : color.brand} />
            {!biz ? t('indivHint') : form.lookup === 'found' ? t('found') : t('notFound')}
          </div>
          <div className={styles.label}>{biz ? t('nameBiz') : t('nameIndiv')}</div>
          <FieldInput form={form} name="name" placeholder={biz ? undefined : t('namePlaceholder')} testId="declare-name" readOnly={ro} />
          <div className={styles.label}>{t('address')}</div>
          <FieldInput form={form} name="address" placeholder={t('addressPlaceholder')} readOnly={ro} />
          {biz ? (
            <>
              <div className={styles.pair}>
                <div>
                  <div className={styles.label}>{t('rep')}</div>
                  <FieldInput form={form} name="representative" readOnly={biz} bare />
                </div>
                <div>
                  <div className={styles.label}>{t('phone')}</div>
                  <FieldInput form={form} name="phone" placeholder={t('phonePlaceholder')} bare readOnly={ro} />
                </div>
              </div>
              <div className={cx(styles.pair, styles.pairLast)}>
                <div>
                  <div className={styles.label}>{t('founded')}</div>
                  <FieldInput form={form} name="founded_on" readOnly={biz} bare />
                </div>
                <div>
                  <div className={styles.label}>{t('status')}</div>
                  <FieldInput form={form} name="legal_status" readOnly={biz} bare />
                </div>
              </div>
            </>
          ) : (
            <div className={cx(styles.pair, styles.pairLast)}>
              <div>
                <div className={styles.label}>{t('phone')}</div>
                <FieldInput form={form} name="phone" placeholder={t('phonePlaceholder')} bare readOnly={false} />
              </div>
            </div>
          )}
        </>
      ) : null}

      <button type="button" className={styles.btn} disabled={!form.canNext} onClick={() => form.setStep(2)} data-testid="declare-next">
        {t('next')}
        <Icon name="ic-arrow" size={16} strokeWidth={2.2} color={color.white} />
      </button>
    </div>
  );
}
