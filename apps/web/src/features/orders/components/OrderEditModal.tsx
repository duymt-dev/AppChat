// Modal "Sửa đơn" (TIP-032c §4.1) — tách khỏi form tạo (OrderFormModal chỉ tạo). Nạp đúng đơn đang mở (`editId`) + `version`, hiện người tạo
// (doanh số) chỉ đọc, sửa người phụ trách / ghi chú / cọc / giao hàng theo luật trạng thái (đơn sàn hoặc đang xử lý đã thu → chỉ người phụ
// trách + ghi chú). Gửi order.update với đúng các khoá đã đổi + `if_version`; 409 → giữ nội dung, "Tải lại" chủ động.
'use client';
import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { ModalShell, color } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { membersQuery } from '@/features/customers/api';
import { useOrderFormStyles } from '../styles/form.styles';
import { useOrdersUi } from '../orders-store';
import { orderQuery } from '../api';
import { useOrderEditVersion } from '../hooks/useOrderEditVersion';
import { OrderEditConflict } from './OrderEditConflict';
import type { Order } from '../types';

const SHIP = [
  ['address', 'addr'],
  ['receiver', 'receiver'],
  ['receiver_phone', 'rphone'],
] as const;
const DEPOSIT = 'deposit';

export function OrderEditModal() {
  const id = useOrdersUi((s) => (s.form === 'edit' ? s.editId : null));
  const o = useQuery({ ...orderQuery(id ?? ''), enabled: !!id }).data;
  const [nonce, setNonce] = useState(0);
  if (!id || !o) return null;
  // Khoá theo đơn + lần "Tải lại" — refetch nền không mở lại form (không mất nội dung đang nhập).
  return <OrderEdit key={`${o.id}:${nonce}`} o={o} onReloaded={() => setNonce((n) => n + 1)} />;
}

function OrderEdit({ o, onReloaded }: { o: Order; onReloaded: () => void }) {
  const t = useTranslations('orders');
  const { styles, cx } = useOrderFormStyles();
  const set = useOrdersUi((s) => s.set);
  const members = useQuery(membersQuery()).data ?? [];
  const update = useAction<{ order_id: string; version: number }>('order.update');
  const ver = useOrderEditVersion(o.id, o.version, onReloaded);
  // Tiền / giao hàng khoá khi đơn sàn hoặc đang xử lý đã thu (COMMERCE §4 / §4b) — server kiểm lại.
  const moneyLocked = o.locked_lines || (o.status === 'processing' && Number(o.paid_total) > 0);
  const base: Record<string, string> = {
    assigned: o.assigned_user_id,
    note: o.note,
    [DEPOSIT]: o.deposit_amount,
    ...Object.fromEntries(SHIP.map(([k]) => [k, o.shipping[k]])),
  };
  const [init] = useState(base);
  const [d, setD] = useState(init);
  const close = () => set({ form: null, editId: null });

  const patch = () => {
    const p: Record<string, unknown> = {};
    if (d.assigned !== init.assigned) p.assigned_user_id = d.assigned || null;
    if (d.note !== init.note) p.note = d.note;
    if (!moneyLocked && d[DEPOSIT] !== init[DEPOSIT]) p.deposit_amount = d[DEPOSIT] || '0';
    const ship = Object.fromEntries(SHIP.filter(([k]) => d[k] !== init[k]).map(([k]) => [k, d[k]]));
    if (!moneyLocked && Object.keys(ship).length) p.shipping = ship;
    return p;
  };
  const save = async () => {
    const p = patch();
    if (!Object.keys(p).length) return close();
    const r = await update.run({ order_id: o.id, if_version: ver.ifVersion, patch: p }, { onError: ver.onError });
    if (r) close();
  };
  const field = (label: string, node: ReactNode, wide?: boolean) => (
    <div className={cx(styles.field, wide && styles.wide)}>
      <label className={styles.label}>{label}</label>
      {node}
    </div>
  );
  const input = (k: string, disabled = false) => (
    <input
      className={styles.input}
      value={d[k]}
      disabled={disabled}
      onChange={(e) => setD((s) => ({ ...s, [k]: k === DEPOSIT ? e.target.value.replace(/\D/g, '') : e.target.value }))}
      data-testid={`od-edit-${k}`}
    />
  );

  return (
    <ModalShell
      open
      stacked
      onClose={close}
      width={560}
      title={`${t('form.editTitle')} · ${o.code}`}
      icon="ic-edit"
      iconColor={color.brandDeep}
      iconBg={color.brandBg}
      closeLabel={t('form.close')}
      testId="od-edit"
      footer={
        <>
          <button type="button" className={styles.btn} onClick={close}>
            {t('form.cancel')}
          </button>
          <button
            type="button"
            className={cx(styles.btn, styles.primary)}
            disabled={update.isPending || ver.conflict}
            onClick={() => void save()}
            data-testid="od-edit-save"
          >
            {t('form.save')}
          </button>
        </>
      }
    >
      {ver.conflict ? <OrderEditConflict onReload={() => void ver.reload()} /> : null}
      <div className={styles.grid}>
        {field(t('form.createdBy'), <input className={styles.input} value={o.owner_name} disabled data-testid="od-edit-owner" />)}
        {field(
          t('form.assigned'),
          <select
            className={cx(styles.input, styles.select)}
            value={d.assigned}
            onChange={(e) => setD((s) => ({ ...s, assigned: e.target.value }))}
            data-testid="od-edit-assigned"
          >
            <option value="">{t('form.lookup')}</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>,
        )}
        {field(t('form.deposit'), input(DEPOSIT, moneyLocked))}
        {SHIP.map(([k, l]) => (
          <div key={k} className={styles.field}>
            <label className={styles.label}>{t(`form.${l}`)}</label>
            {input(k, moneyLocked)}
          </div>
        ))}
        {field(
          t('form.note'),
          <textarea
            className={cx(styles.input, styles.area)}
            value={d.note}
            onChange={(e) => setD((s) => ({ ...s, note: e.target.value }))}
            data-testid="od-edit-note"
          />,
          true,
        )}
      </div>
    </ModalShell>
  );
}
