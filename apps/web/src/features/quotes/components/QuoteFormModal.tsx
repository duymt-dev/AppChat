// Modal "Tạo báo giá" — prototype L5189–5228 (crmSpec.quotes L8403): Thông tin chung · Chi tiết sản phẩm · Tổng hợp.
// Luật COMMERCE §3: hiệu lực 15 ngày tính từ lúc gửi; vượt ngưỡng thì báo trước sẽ phải gửi duyệt. Lưu = quote.create (nháp).
'use client';
import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { ModalShell, Icon, color } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useFmt } from '@/shared/i18n/useFmt';
import { contactsQuery, membersQuery } from '@/features/customers';
import { useQuoteFormStyles } from '../styles/form.styles';
import { useQuotesUi } from '../quotes-store';
import { initialQuoteDraft, useQuoteDraft } from '../hooks/useQuoteDraft';
import { LineEditor } from './LineEditor';

const ALL_CONTACTS = {
  stage: 'all',
  q: '',
  mine: false,
  status: '',
  owner_id: '',
  group: '',
  source: '',
} as const;

export function QuoteFormModal() {
  const ui = useQuotesUi();
  if (ui.form !== 'create') return null;
  return <QuoteForm key={JSON.stringify(ui.prefill)} />;
}

function QuoteForm() {
  const t = useTranslations('quotes.form');
  const fmt = useFmt();
  const { styles, cx } = useQuoteFormStyles();
  const ui = useQuotesUi();
  const contacts = useQuery(contactsQuery(ALL_CONTACTS)).data?.data ?? [];
  const members = useQuery(membersQuery()).data ?? [];
  const f = useQuoteDraft(initialQuoteDraft(ui.prefill));
  const create = useAction<{ quote_id: string }>('quote.create');
  const [err, setErr] = useState('');
  const [today] = useState(() => Date.now());
  const close = () => ui.set({ form: null, prefill: null });

  const save = async () => {
    if (!f.valid) return setErr(t('required'));
    const res = await create.run(f.input);
    if (res) ui.set({ form: null, prefill: null, detail: res.result.quote_id, tab: 'overview' });
  };

  const field = (label: string, node: ReactNode, wide?: boolean) => (
    <div className={cx(styles.field, wide && styles.wide)}>
      <label className={styles.label}>{label}</label>
      {node}
    </div>
  );

  return (
    <ModalShell
      open
      onClose={close}
      width={720}
      title={t('title')}
      icon="ic-plus"
      iconColor={color.brandDeep}
      iconBg={color.brandBg}
      closeLabel={t('close')}
      testId="q-form"
      footer={
        <>
          <button type="button" className={styles.btn} onClick={close}>
            {t('cancel')}
          </button>
          <button
            type="button"
            className={cx(styles.btn, styles.primary)}
            onClick={() => void save()}
            data-testid="q-save"
          >
            {t('save')}
          </button>
        </>
      }
    >
      {err ? <div className={styles.err}>{err}</div> : null}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>{t('general')}</div>
        <div className={styles.grid}>
          {field(t('code'), <input className={styles.input} placeholder={t('codePh')} disabled />)}
          {field(
            t('contact'),
            <select
              className={styles.input}
              value={f.d.contact_id}
              onChange={(e) => f.set('contact_id', e.target.value)}
              data-testid="q-contact"
            >
              <option value="">{t('contactPh')}</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name}
                </option>
              ))}
            </select>,
          )}
          {field(t('date'), <input className={styles.input} value={fmt.date(today)} disabled />)}
          {field(
            t('validDays'),
            <input
              className={styles.input}
              inputMode="numeric"
              value={f.d.valid_days}
              onChange={(e) =>
                f.set('valid_days', Math.max(1, Number(e.target.value.replace(/\D/g, '')) || 1))
              }
              data-testid="q-valid"
            />,
          )}
          {field(
            t('owner'),
            <select
              className={styles.input}
              value={f.d.owner_user_id}
              onChange={(e) => f.set('owner_user_id', e.target.value)}
            >
              <option value="">{t('contactPh')}</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>,
          )}
          {field(t('status'), <input className={styles.input} value={t('statusDraft')} disabled />)}
        </div>
      </div>
      <div className={styles.section}>
        <div className={styles.sectionTitle}>{t('lines')}</div>
        <LineEditor f={f} />
      </div>
      <div className={styles.section}>
        <div className={styles.sectionTitle}>{t('summary')}</div>
        {f.reasons.length ? (
          <div className={styles.warn} data-testid="q-needs-approval">
            <Icon name="ic-shield" size={15} color={color.amberGold} />
            {t('needApproval', { reasons: f.reasons.map((r) => t(`reasons.${r}`)).join(', ') })}
          </div>
        ) : null}
        <div className={styles.grid}>
          {field(
            t('subtotal'),
            <input className={styles.input} value={fmt.money(f.totals.subtotal)} disabled />,
          )}
          {field(
            t('headerDisc'),
            <input
              className={styles.input}
              inputMode="numeric"
              value={f.d.header_pct}
              onChange={(e) =>
                f.set('header_pct', Math.min(100, Number(e.target.value.replace(/\D/g, '')) || 0))
              }
              data-testid="q-header-disc"
            />,
          )}
          {field(
            t('taxTotal'),
            <input className={styles.input} value={fmt.money(f.totals.tax_total)} disabled />,
          )}
          {field(
            t('total'),
            <input
              className={styles.input}
              value={fmt.money(f.totals.total)}
              disabled
              data-testid="q-total"
            />,
          )}
          {field(
            t('terms'),
            <textarea
              className={cx(styles.input, styles.area)}
              value={f.d.payment_terms}
              onChange={(e) => f.set('payment_terms', e.target.value)}
            />,
            true,
          )}
          {field(
            t('note'),
            <textarea
              className={cx(styles.input, styles.area)}
              value={f.d.note}
              onChange={(e) => f.set('note', e.target.value)}
            />,
            true,
          )}
        </div>
      </div>
    </ModalShell>
  );
}
