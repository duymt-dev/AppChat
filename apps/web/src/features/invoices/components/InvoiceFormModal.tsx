// Modal "Tạo đề nghị thanh toán" — nút thật mở crmForm 720 (prototype openFormInvoices → openCrmForm('invoices'), crmSpec.invoices L8413):
// một nhóm 2 cột. Theo COMMERCE §5: thêm Loại (cọc / đợt / toàn bộ) + Hạn (+7 ngày); "Đã thanh toán / Còn phải thu / Trạng thái" không nhập tay
// (thu qua Ghi nhận thanh toán / đối soát) → hiển thị Nháp. Lưu = invoice.create. Đơn sàn / đơn huỷ không có trong danh sách đơn (D31).
'use client';
import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { ModalShell, color } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useFmt } from '@/shared/i18n/useFmt';
import { contactsQuery } from '@/features/customers/api';
import { ordersQuery } from '@/features/orders/api';
import { useInvoiceFormStyles } from '../styles/form.styles';
import { useInvoicesUi } from '../invoices-store';
import { initialInvoiceDraft, useInvoiceForm, type OrderPick } from '../hooks/useInvoiceForm';
import type { InvoiceKind } from '../types';
import { useToday } from '@/shared/time/today';

const ALL_CONTACTS = {
  stage: 'all',
  q: '',
  mine: false,
  status: '',
  owner_id: '',
  group: '',
  source: '',
  tag_id: '',
  sort: 'recent',
} as const;
const ALL_ORDERS = { chip: 'all', owner_id: 'all', value: 'all', source: 'all', q: '' } as const;
const KINDS: InvoiceKind[] = ['full', 'deposit', 'installment'];
export function InvoiceFormModal() {
  const ui = useInvoicesUi();
  const orders = useQuery(ordersQuery(ALL_ORDERS));
  if (ui.form !== 'create' || !orders.data) return null;
  const picks: OrderPick[] = orders.data.data
    .filter((o) => o.source !== 'marketplace' && o.status !== 'cancelled')
    .map((o) => ({
      id: o.id,
      code: o.code,
      contact_id: o.contact_id,
      contact_name: o.contact_name,
      left: Number(o.total) - Number(o.paid_total),
      title: o.items[0]?.name ?? '',
    }))
    .filter((o) => o.left > 0);
  return <InvoiceForm key={JSON.stringify(ui.prefill)} orders={picks} />;
}

function InvoiceForm({ orders }: { orders: OrderPick[] }) {
  const t = useTranslations('invoices');
  const today = useToday();
  const fmt = useFmt();
  const { styles, cx } = useInvoiceFormStyles();
  const ui = useInvoicesUi();
  const list = useQuery(contactsQuery(ALL_CONTACTS)).data?.data ?? [];
  // Khách của các đơn có thể nằm ngoài trang danh bạ đầu → ghép vào lựa chọn (không trùng).
  const contacts = [
    ...list.map((c) => ({ id: c.id, full_name: c.full_name })),
    ...orders
      .filter(
        (o, n, a) =>
          !list.some((c) => c.id === o.contact_id) && a.findIndex((x) => x.contact_id === o.contact_id) === n,
      )
      .map((o) => ({ id: o.contact_id, full_name: o.contact_name })),
  ];
  const f = useInvoiceForm(initialInvoiceDraft(today, ui.prefill, orders), orders);
  const create = useAction<{ invoice_id: string }>('invoice.create');
  const [err, setErr] = useState('');
  const close = () => ui.set({ form: null, prefill: null });

  const save = async () => {
    if (!f.valid) return setErr(t('form.required'));
    if (f.over) return setErr(t('form.over'));
    const res = await create.run(f.input);
    if (res) ui.set({ form: null, prefill: null, detail: res.result.invoice_id, tab: 'overview' });
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
      title={t('form.title')}
      icon="ic-plus"
      iconColor={color.brandDeep}
      iconBg={color.brandBg}
      closeLabel={t('form.close')}
      testId="iv-form"
      footer={
        <>
          <button type="button" className={styles.btn} onClick={close}>
            {t('form.cancel')}
          </button>
          <button
            type="button"
            className={cx(styles.btn, styles.primary)}
            onClick={() => void save()}
            data-testid="iv-save"
          >
            {t('form.save')}
          </button>
        </>
      }
    >
      {err ? (
        <div className={styles.err} data-testid="iv-form-err">
          {err}
        </div>
      ) : null}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>{t('form.section')}</div>
        <div className={styles.grid}>
          {field(t('form.codeL'), <input className={styles.input} placeholder={t('form.codePh')} disabled />)}
          {field(
            t('form.contact'),
            <select
              className={cx(styles.input, styles.select)}
              value={f.d.contact_id}
              onChange={(e) => f.set('contact_id', e.target.value)}
              data-testid="iv-contact"
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
            t('form.order'),
            <select
              className={cx(styles.input, styles.select)}
              value={f.d.order_id}
              onChange={(e) => f.pickOrder(e.target.value)}
              data-testid="iv-order"
            >
              <option value="">{t('form.lookup')}</option>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {`${o.code} · ${o.title}`}
                </option>
              ))}
            </select>,
          )}
          {field(t('form.date'), <input type="date" className={styles.input} value={today} disabled />)}
          {field(
            t('form.kind'),
            <select
              className={cx(styles.input, styles.select)}
              value={f.d.kind}
              onChange={(e) => f.set('kind', e.target.value as InvoiceKind)}
              data-testid="iv-kind"
            >
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {t(`kind.${k}`)}
                </option>
              ))}
            </select>,
          )}
          {field(
            t('form.amount'),
            <>
              <input
                className={styles.input}
                inputMode="numeric"
                value={f.d.amount}
                onChange={(e) => f.set('amount', f.money(e.target.value))}
                data-testid="iv-amount"
              />
              {f.order ? (
                <span className={styles.hintSm} data-testid="iv-order-left">
                  {t('form.orderLeft', { v: fmt.money(String(f.order.left)) })}
                </span>
              ) : null}
            </>,
          )}
          {field(
            t('form.due'),
            <input
              type="date"
              className={styles.input}
              value={f.d.due_date}
              min={today}
              title={t('form.dueHint')}
              onChange={(e) => f.set('due_date', e.target.value)}
              data-testid="iv-due"
            />,
          )}
          {field(
            t('form.status'),
            <select className={cx(styles.input, styles.select)} value="draft" disabled>
              <option value="draft">{t('form.statusDraft')}</option>
            </select>,
          )}
          {field(
            t('form.titleL'),
            <input
              className={styles.input}
              value={f.d.title}
              onChange={(e) => f.set('title', e.target.value)}
            />,
            true,
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
      <div className={styles.legal}>{t('notVat')}</div>
    </ModalShell>
  );
}
