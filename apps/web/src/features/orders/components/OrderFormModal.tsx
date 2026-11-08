// Modal "Tạo đơn bán hàng" — nút thật mở crmForm 720 (prototype L5189–5228, crmSpec.orders L8409): Thông tin chung · Chi tiết sản phẩm · Giao hàng.
// Theo COMMERCE §4: dòng hàng từ catalog (giá catalog, thuế theo dòng), cọc tuỳ chọn (bật deposit_required), "Trạng thái" luôn Mới
// (xác nhận / hoàn tất qua thao tác của đơn), vận chuyển nhập tay. Lưu = order.create.
'use client';
import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Icon, ModalShell, color } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useFmt } from '@/shared/i18n/useFmt';
import { contactsQuery, membersQuery } from '@/features/customers';
import { productsQuery } from '@/features/products';
import { useOrderFormStyles } from '../styles/form.styles';
import { useOrdersUi } from '../orders-store';
import { initialOrderDraft, useOrderForm } from '../hooks/useOrderForm';
import { CustomFieldInputs, useCustomDraft } from '@/shared/custom-fields';
import { todayIso } from '@/shared/time/today';

const SHIP = [
  ['address', 'addr'],
  ['receiver', 'receiver'],
  ['receiver_phone', 'rphone'],
  ['eta', 'eta'],
] as const;
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
/** Hôm nay — mock: ngày cố định của parity (prototype-parity §4); http: ngày thật. */
const TODAY = todayIso();

export function OrderFormModal() {
  const ui = useOrdersUi();
  if (ui.form !== 'create') return null;
  return <OrderForm key={JSON.stringify(ui.prefill)} />;
}

function OrderForm() {
  const t = useTranslations('orders');
  const fmt = useFmt();
  const { styles, cx } = useOrderFormStyles();
  const ui = useOrdersUi();
  const contacts = useQuery(contactsQuery(ALL_CONTACTS)).data?.data ?? [];
  const members = useQuery(membersQuery()).data ?? [];
  const products = useQuery(productsQuery({ category: 'all', q: '' })).data?.data ?? [];
  const f = useOrderForm(initialOrderDraft(ui.prefill));
  const create = useAction<{ order_id: string }>('order.create');
  const [err, setErr] = useState('');
  const cf = useCustomDraft('order');
  const close = () => ui.set({ form: null, prefill: null, editId: null });

  const save = async () => {
    if (!f.valid) return setErr(t('form.required'));
    if (f.depositOver) return setErr(t('form.depositOver'));
    const c = cf.collect('create');
    if (!c.ok) return;
    const res = await create.run(
      { ...f.input, ...(c.custom ? { custom: c.custom } : {}) },
      { onError: (e) => cf.absorb(e.error.fields) },
    );
    if (res) ui.set({ form: null, prefill: null, detail: res.result.order_id, tab: 'overview' });
  };
  const pick = (id: string) => {
    const p = products.find((x) => x.id === id);
    if (p) f.lines.add({ product_id: p.id, name: p.name, qty: 1, unit_price: p.price, tax_rate: p.tax_rate });
  };
  const field = (label: string, node: ReactNode, wide?: boolean) => (
    <div className={cx(styles.field, wide && styles.wide)}>
      <label className={styles.label}>{label}</label>
      {node}
    </div>
  );
  const ship = (k: (typeof SHIP)[number][0], label: string) => (
    <div key={k} className={styles.field}>
      <label className={styles.label}>{label}</label>
      <input
        className={styles.input}
        type={k === 'eta' ? 'date' : k === 'receiver_phone' ? 'tel' : 'text'}
        value={f.d.shipping[k]}
        onChange={(e) => f.setShip(k, e.target.value)}
      />
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
      testId="od-form"
      footer={
        <>
          <button type="button" className={styles.btn} onClick={close}>
            {t('form.cancel')}
          </button>
          <button
            type="button"
            className={cx(styles.btn, styles.primary)}
            onClick={() => void save()}
            data-testid="od-save"
          >
            {t('form.save')}
          </button>
        </>
      }
    >
      {err ? (
        <div className={styles.err} data-testid="od-form-err">
          {err}
        </div>
      ) : null}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>{t('form.general')}</div>
        <div className={styles.grid}>
          {field(t('form.codeL'), <input className={styles.input} placeholder={t('form.codePh')} disabled />)}
          {field(
            t('form.contact'),
            <select
              className={cx(styles.input, styles.select)}
              value={f.d.contact_id}
              onChange={(e) => f.set('contact_id', e.target.value)}
              data-testid="od-contact"
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
            t('form.contract'),
            <input className={styles.input} placeholder={t('form.lookup')} disabled />,
          )}
          {field(t('form.date'), <input type="date" className={styles.input} value={TODAY} disabled />)}
          {field(
            t('form.deposit'),
            <input
              className={styles.input}
              inputMode="numeric"
              placeholder={t('form.depositHint')}
              value={f.d.deposit}
              onChange={(e) => f.set('deposit', f.money(e.target.value))}
              data-testid="od-deposit"
            />,
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
        </div>
      </div>
      <div className={styles.section}>
        <div className={styles.sectionTitle}>{t('form.linesT')}</div>
        <div className={styles.box} data-testid="od-lines">
          <div className={styles.boxHint}>{t('form.linesHint')}</div>
          {f.d.items.length ? (
            <div className={styles.lines}>
              {f.d.items.map((it, i) => (
                <div key={i} className={styles.line}>
                  <span>{it.name}</span>
                  {t('form.lineQty', { n: it.qty })}
                  <b>{fmt.money(String(it.qty * Number(it.unit_price)))}</b>
                  <button type="button" onClick={() => f.lines.del(i)} aria-label={t('form.remove')}>
                    <Icon name="ic-x" size={14} color={color.text4} />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          <div className={styles.boxFoot}>
            <select
              className={cx(styles.input, styles.select, styles.pick)}
              value=""
              onChange={(e) => pick(e.target.value)}
              aria-label={t('form.addLine')}
              data-testid="od-pick"
            >
              <option value="">{t('form.addLine')}</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {`${p.name} · ${fmt.money(p.price)}`}
                </option>
              ))}
            </select>
            <span className={styles.totalL}>{t('form.total')}</span>
            <b className={styles.totalV} data-testid="od-total">
              {fmt.money(f.totals.total)}
            </b>
          </div>
        </div>
      </div>
      <div className={styles.section}>
        <div className={styles.sectionTitle}>{t('form.ship')}</div>
        <div className={styles.grid}>
          {SHIP.map(([k, l]) => ship(k, t(`form.${l}`)))}
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
      <CustomFieldInputs draft={cf} />
    </ModalShell>
  );
}
