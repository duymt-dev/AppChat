// Modal "Tạo hợp đồng" — crmForm 720 (prototype L5189–5228) với crmSpec.contracts L8407: một nhóm "Thông tin hợp đồng" 2 cột.
// Lưu = contract.create (luôn là Nháp — COMMERCE §9); "Trạng thái" chỉ hiển thị Nháp, chuyển trạng thái qua luồng duyệt & ký.
'use client';
import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { ModalShell, color } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { contactsQuery, membersQuery } from '@/features/customers';
import { quotesQuery } from '@/features/quotes';
import { useContractFormStyles } from '../styles/form.styles';
import { useContractsUi } from '../contracts-store';
import { initialContractDraft, useContractForm } from '../hooks/useContractForm';
import { contractQuery } from '../api';
import type { Contract, ContractKind } from '../types';

const toPrefill = (c: Contract): Record<string, unknown> => ({
  contact_id: c.contact_id,
  quote_id: c.quote_id ?? '',
  number: c.number,
  kind: c.kind,
  title: c.title,
  value: c.value,
  signed_date: c.signed_date,
  start_date: c.start_date ?? '',
  end_date: c.end_date ?? '',
  owner_user_id: c.owner_user_id,
  file_name: c.file_name,
  note: c.note,
});

const ALL_CONTACTS = {
  stage: 'all',
  q: '',
  mine: false,
  status: '',
  owner_id: '',
  group: '',
  source: '',
} as const;
const ALL_QUOTES = { status: 'all', owner_id: 'all', returning: 'all', q: '' } as const;
const KINDS: ContractKind[] = ['service', 'sale', 'framework'];
const DATES = ['signed_date', 'start_date', 'end_date'] as const;
/** Ngày mock cố định của parity (prototype-parity §4). */
const TODAY = '2026-06-24';

export function ContractFormModal() {
  const ui = useContractsUi();
  if (!ui.form) return null;
  if (ui.form === 'edit' && ui.editId) return <ContractEditLoader id={ui.editId} />;
  return <ContractForm key={JSON.stringify(ui.prefill)} mode="create" />;
}

/** Nạp hợp đồng hiện có trước khi mở form sửa (REQ-F11: Nháp → Cập nhật tại chỗ). */
function ContractEditLoader({ id }: { id: string }) {
  const c = useQuery(contractQuery(id)).data;
  if (!c) return null;
  return <ContractForm key={id} mode="edit" editId={id} editCode={c.code} editPrefill={toPrefill(c)} />;
}

function ContractForm({
  mode,
  editId,
  editCode,
  editPrefill,
}: {
  mode: 'create' | 'edit';
  editId?: string;
  editCode?: string;
  editPrefill?: Record<string, unknown>;
}) {
  const t = useTranslations('contracts');
  const { styles, cx } = useContractFormStyles();
  const ui = useContractsUi();
  const contacts = useQuery(contactsQuery(ALL_CONTACTS)).data?.data ?? [];
  const members = useQuery(membersQuery()).data ?? [];
  const quotes = useQuery(quotesQuery(ALL_QUOTES)).data?.data ?? [];
  const f = useContractForm(initialContractDraft(TODAY, mode === 'edit' ? editPrefill : ui.prefill));
  const create = useAction<{ contract_id: string }>('contract.create');
  const update = useAction<{ contract_id: string }>('contract.update');
  const [err, setErr] = useState('');
  const close = () => ui.set({ form: null, prefill: null, editId: null });

  const save = async () => {
    if (f.missing.length) {
      const names = {
        contact: t('form.fieldContact'),
        signed: t('form.fieldSigned'),
        value: t('form.fieldValue'),
      };
      return setErr(t('form.required', { fields: f.missing.map((m) => names[m]).join(', ') }));
    }
    if (f.badRange) return setErr(t('form.endBefore'));
    const res =
      mode === 'edit' && editId
        ? await update.run({ contract_id: editId, patch: f.input })
        : await create.run(f.input);
    if (res) ui.set({ form: null, prefill: null, editId: null, detail: res.result.contract_id, tab: 'overview' });
  };

  const field = (label: string, node: ReactNode, wide?: boolean) => (
    <div className={cx(styles.field, wide && styles.wide)}>
      <label className={styles.label}>{label}</label>
      {node}
    </div>
  );
  type DateKey = 'signed_date' | 'start_date' | 'end_date';
  const date = (k: DateKey) => (
    <input
      type="date"
      className={styles.input}
      value={f.d[k]}
      onChange={(e) => f.set(k, e.target.value)}
      data-testid={`ct-${k}`}
    />
  );

  return (
    <ModalShell
      open
      onClose={close}
      width={720}
      title={mode === 'edit' ? t('form.editTitle') : t('form.title')}
      icon="ic-plus"
      iconColor={color.brandDeep}
      iconBg={color.brandBg}
      closeLabel={t('form.close')}
      testId="ct-form"
      footer={
        <>
          <button type="button" className={styles.btn} onClick={close}>
            {t('form.cancel')}
          </button>
          <button
            type="button"
            className={cx(styles.btn, styles.primary)}
            onClick={() => void save()}
            data-testid="ct-save"
          >
            {t('form.save')}
          </button>
        </>
      }
    >
      {err ? (
        <div className={styles.err} data-testid="ct-form-err">
          {err}
        </div>
      ) : null}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>{t('form.section')}</div>
        <div className={styles.grid}>
          {field(t('form.code'), <input className={styles.input} value={editCode ?? ''} placeholder={t('form.codePh')} disabled />)}
          {field(
            t('form.number'),
            <input
              className={styles.input}
              value={f.d.number}
              onChange={(e) => f.set('number', e.target.value)}
            />,
          )}
          {field(
            t('form.contact'),
            <select
              className={cx(styles.input, styles.select)}
              value={f.d.contact_id}
              onChange={(e) => f.set('contact_id', e.target.value)}
              data-testid="ct-contact"
            >
              <option value="">{t('form.lookup')}</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name}
                </option>
              ))}
            </select>,
          )}
          {field(
            t('form.quote'),
            <select
              className={cx(styles.input, styles.select)}
              value={f.d.quote_id}
              onChange={(e) => f.set('quote_id', e.target.value)}
            >
              <option value="">{t('form.lookup')}</option>
              {quotes.map((q) => (
                <option key={q.id} value={q.id}>
                  {`${q.code} · ${q.contact_name}`}
                </option>
              ))}
            </select>,
          )}
          {field(t('form.signed'), date(DATES[0]))}
          {field(t('form.start'), date(DATES[1]))}
          {field(t('form.end'), date(DATES[2]))}
          {field(
            t('form.value'),
            <input
              className={styles.input}
              inputMode="numeric"
              placeholder="0"
              value={f.d.value}
              onChange={(e) => f.set('value', f.money(e.target.value))}
              data-testid="ct-value"
            />,
          )}
          {field(
            t('form.kind'),
            <select
              className={cx(styles.input, styles.select)}
              value={f.d.kind}
              onChange={(e) => f.set('kind', e.target.value as ContractKind)}
              data-testid="ct-kind"
            >
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {t(`kind.${k}`)}
                </option>
              ))}
            </select>,
          )}
          {field(
            t('form.status'),
            <select className={cx(styles.input, styles.select)} value="draft" disabled>
              <option value="draft">{t('status.draft')}</option>
            </select>,
          )}
          {field(
            t('form.owner'),
            <select
              className={cx(styles.input, styles.select)}
              value={f.d.owner_user_id}
              onChange={(e) => f.set('owner_user_id', e.target.value)}
            >
              <option value="">{t('form.lookup')}</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>,
          )}
          {field(
            t('form.file'),
            <input
              type="file"
              accept="application/pdf"
              className={cx(styles.input, styles.file)}
              onChange={(e) => f.set('file_name', e.target.files?.[0]?.name ?? '')}
            />,
          )}
          {field(
            t('form.note'),
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
