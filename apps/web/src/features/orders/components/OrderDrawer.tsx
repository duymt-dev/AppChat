// Drawer chi tiết đơn hàng — prototype L5575–5618 (392px, nền xám): đầu tuỳ biến + 5 tab + chân thao tác theo tiến độ (COMMERCE §4).
// new → Xác nhận đơn (trừ kho) · processing → Hoàn tất (cộng điểm 10.000đ = 1 điểm) · new / processing → Huỷ (lý do; đã thu → yêu cầu hoàn tiền).
'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { ORDER_FLOW, nextState } from '@appchat/shared';
import { EntityDrawer, Icon, ModalShell, color } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useCan } from '@/shared/authz/useCan';
import { useFmt } from '@/shared/i18n/useFmt';
import { useOrderDetailStyles } from '../styles/detail.styles';
import { useOrderFormStyles } from '../styles/form.styles';
import { useOrdersUi } from '../orders-store';
import { orderQuery, ordersMetaQuery } from '../api';
import { Avatar, SourceBadge, useTr } from '../columns';
import { STATUS_TONE } from '../status';
import { AiTab, CrmTab, FilesTab, HistoryTab, OverviewTab } from './DetailTabs';
import type { Order, OrdersMeta } from '../types';

const TABS = ['overview', 'crm', 'ai', 'files', 'history'] as const;

export function CancelOrderModal() {
  const id = useOrdersUi((s) => s.cancelFor);
  const o = useQuery({ ...orderQuery(id ?? ''), enabled: !!id }).data;
  if (!id || !o) return null;
  return <CancelOrder key={id} o={o} />;
}

function CancelOrder({ o }: { o: Order }) {
  const t = useTranslations('orders');
  const fmt = useFmt();
  const { styles, cx } = useOrderFormStyles();
  const set = useOrdersUi((s) => s.set);
  const [reason, setReason] = useState('');
  const cancel = useAction('order.cancel');
  const close = () => set({ cancelFor: null });
  return (
    <ModalShell
      open
      stacked
      onClose={close}
      width={440}
      title={`${t('detail.cancel')} · ${o.code}`}
      icon="ic-x"
      iconColor={color.dangerDeep}
      iconBg={color.roseBg}
      closeLabel={t('detail.close')}
      testId="od-cancel"
      footer={
        <>
          <button type="button" className={styles.btn} onClick={close}>
            {t('form.cancel')}
          </button>
          <button
            type="button"
            className={cx(styles.btn, styles.primary)}
            disabled={!reason.trim()}
            onClick={async () => {
              if (await cancel.run({ order_id: o.id, reason: reason.trim() })) close();
            }}
            data-testid="od-cancel-ok"
          >
            {t('detail.cancel')}
          </button>
        </>
      }
    >
      {Number(o.paid_total) > 0 ? (
        <div className={styles.err}>{t('detail.cancelRefund', { paid: fmt.money(o.paid_total) })}</div>
      ) : null}
      <label className={styles.label}>{t('detail.cancelReason')}</label>
      <textarea
        className={cx(styles.input, styles.area)}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        data-testid="od-cancel-reason"
      />
    </ModalShell>
  );
}

function Footer({ o }: { o: Order }) {
  const t = useTranslations('orders.detail');
  const { styles, cx } = useOrderDetailStyles();
  const set = useOrdersUi((s) => s.set);
  const canManage = useCan('order.manage');
  const canCancel = useCan('order.cancel');
  const confirm = useAction('order.confirm');
  const complete = useAction('order.complete');
  // Nút theo bảng ORDER_FLOW dùng chung với server (trạng thái cuối → không còn thao tác).
  const can = (a: string) => nextState(ORDER_FLOW, o.status, a) !== null;
  const [canConfirm, canComplete, canCancelNow] = [can('order.confirm'), can('order.complete'), can('order.cancel')];
  // Sửa (TIP-032c): mở form sửa đúng đơn này (editId) — người phụ trách / ghi chú vẫn sửa được ở đơn sàn; hết quyền → không có nút.
  const canEdit = canManage && can('order.update');
  if (!canCancelNow && !canConfirm && !canComplete && !canEdit) return null;
  return (
    <div className={styles.foot}>
      {canEdit ? (
        <button type="button" className={styles.act} onClick={() => set({ form: 'edit', editId: o.id, prefill: null })} data-testid="od-edit-open">
          {t('edit')}
        </button>
      ) : null}
      <button
        type="button"
        className={cx(styles.act, styles.actDanger)}
        disabled={!canCancel || !canCancelNow}
        onClick={() => set({ cancelFor: o.id })}
        data-testid="od-cancel-open"
      >
        {t('cancel')}
      </button>
      {canConfirm ? (
        <button
          type="button"
          className={cx(styles.act, styles.actPrimary)}
          disabled={!canManage}
          onClick={() => void confirm.run({ order_id: o.id })}
          data-testid="od-confirm"
        >
          {t('confirm')}
        </button>
      ) : canComplete ? (
        <button
          type="button"
          className={cx(styles.act, styles.actPrimary)}
          disabled={!canManage}
          onClick={() => void complete.run({ order_id: o.id })}
          data-testid="od-complete"
        >
          {t('complete')}
        </button>
      ) : null}
    </div>
  );
}

function Header({ o }: { o: Order }) {
  const t = useTranslations('orders');
  const { styles } = useOrderDetailStyles();
  const tr = useTr();
  const [fg, bg] = STATUS_TONE[o.status];
  return (
    <>
      <div className={styles.top}>
        <span className={styles.icon}>
          <Icon name="ic-box" size={24} color={color.white} strokeWidth={1.8} />
        </span>
        <div className={styles.grow}>
          <div className={styles.chips}>
            <span className={styles.code}>{o.code}</span>
            <span className={styles.st} style={{ color: fg, background: bg }} data-testid="od-status">
              {t(`status.${o.status}`)}
            </span>
            <SourceBadge o={o} />
          </div>
          <div className={styles.value}>{tr(o.total)}</div>
        </div>
      </div>
      <div className={styles.cust}>
        <Avatar name={o.contact_name} className={styles.av} />
        <div className={styles.grow}>
          <div className={styles.name}>{o.contact_name}</div>
          <div className={styles.phone}>{o.phone}</div>
        </div>
        <div>
          <div className={styles.byL}>{t('detail.by')}</div>
          <div className={styles.byV}>{o.owner_name}</div>
          {o.assigned_name && o.assigned_user_id !== o.owner_user_id ? (
            <div className={styles.byV} data-testid="od-assigned">
              {`${t('form.assigned')}: ${o.assigned_name}`}
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}

export function OrderDrawer({ meta: base }: { meta: OrdersMeta }) {
  const t = useTranslations('orders.detail');
  const { styles } = useOrderDetailStyles();
  const ui = useOrdersUi();
  const o = useQuery({ ...orderQuery(ui.detail ?? ''), enabled: !!ui.detail }).data;
  // Thẻ CRM / nhận định / tệp theo đơn đang mở.
  const meta = useQuery({ ...ordersMetaQuery(ui.detail ?? ''), enabled: !!ui.detail }).data ?? base;
  return (
    <EntityDrawer
      open={!!ui.detail}
      onClose={() => ui.set({ detail: null, tab: 'overview' })}
      title={o?.code ?? ''}
      closeLabel={t('close')}
      testId="od-drawer"
      muted
      tabs={TABS.map((k) => ({ key: k, label: t(`tabs.${k}`) }))}
      tab={ui.tab}
      onTab={(k) => ui.set({ tab: k })}
      header={o ? <Header o={o} /> : null}
      footer={o ? <Footer o={o} /> : null}
    >
      <div className={styles.body}>
        {o && ui.tab === 'overview' ? <OverviewTab key={o.id} o={o} /> : null}
        {o && ui.tab === 'crm' ? <CrmTab meta={meta} /> : null}
        {o && ui.tab === 'ai' ? <AiTab meta={meta} /> : null}
        {o && ui.tab === 'files' ? <FilesTab meta={meta} /> : null}
        {o && ui.tab === 'history' ? <HistoryTab o={o} /> : null}
      </div>
    </EntityDrawer>
  );
}
