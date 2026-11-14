// Drawer chi tiết hợp đồng — prototype L5432–5486 (392px, nền xám): đầu tuỳ biến + 5 tab (+ Phụ lục — TIP-030b F3) + chân thao tác theo trạng thái (COMMERCE §9).
// Nút theo CONTRACT_FLOW chung với server: draft → Trình duyệt · pending_approval → Duyệt & ký (Owner) / Yêu cầu sửa ·
// pending_signature → Nhắc ký / Gia hạn link (cần đã gửi ký) · signed → "→ Đơn hàng" / Chấm dứt (lý do bắt buộc) ·
// expired → Gia hạn (tạo HĐ mới, đi lại luồng duyệt & ký). Thẻ CRM / AI / Tệp đọc meta theo hợp đồng đang mở.
'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { CONTRACT_FLOW, nextState } from '@appchat/shared';
import { EntityDrawer, Icon, ModalShell, color } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useCan } from '@/shared/authz/useCan';
import { useContractDetailStyles } from '../styles/detail.styles';
import { useContractFormStyles } from '../styles/form.styles';
import { useContractsUi } from '../contracts-store';
import { contractQuery, contractsMetaQuery } from '../api';
import { Avatar, useTr } from '../columns';
import { STATUS_TONE } from '../status';
import { AiTab, CrmTab, FilesTab, HistoryTab, OverviewTab } from './DetailTabs';
import { AppendixTab } from './appendix/AppendixTab';
import { AiSuggestions } from './draft/AiSuggestions';
import type { Contract, ContractsMeta } from '../types';

const TABS = ['overview', 'crm', 'ai', 'files', 'appendix', 'history'] as const;

function TerminateModal({ c, onClose }: { c: Contract; onClose: () => void }) {
  const t = useTranslations('contracts');
  const { styles, cx } = useContractFormStyles();
  const [reason, setReason] = useState('');
  const terminate = useAction('contract.terminate');
  return (
    <ModalShell
      open
      stacked
      onClose={onClose}
      width={440}
      title={`${t('detail.terminate')} · ${c.code}`}
      icon="ic-x"
      iconColor={color.dangerDeep}
      iconBg={color.roseBg}
      closeLabel={t('detail.close')}
      testId="ct-terminate"
      footer={
        <>
          <button type="button" className={styles.btn} onClick={onClose}>
            {t('form.cancel')}
          </button>
          <button
            type="button"
            className={cx(styles.btn, styles.primary)}
            disabled={!reason.trim()}
            onClick={async () => {
              if (await terminate.run({ contract_id: c.id, reason: reason.trim() })) onClose();
            }}
            data-testid="ct-terminate-ok"
          >
            {t('detail.terminate')}
          </button>
        </>
      }
    >
      <label className={styles.label}>{t('detail.terminateReason')}</label>
      <textarea
        className={cx(styles.input, styles.area)}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        data-testid="ct-terminate-reason"
      />
    </ModalShell>
  );
}

function Footer({ c }: { c: Contract }) {
  const t = useTranslations('contracts.detail');
  const { styles, cx } = useContractDetailStyles();
  const router = useRouter();
  const set = useContractsUi((s) => s.set);
  const canDraft = useCan('contract.draft');
  const canSign = useCan('contract.sign');
  const canReview = useCan('contract.review');
  const submit = useAction('contract.submit');
  const changes = useAction('contract.request_changes');
  const remind = useAction('contract.remind_signer');
  const extend = useAction('contract.extend_sign_link');
  const renew = useAction<{ contract_id: string }>('contract.renew');
  const [ending, setEnding] = useState(false);
  const btn = (key: string, label: string, onClick: () => void, cls?: string, disabled?: boolean) => (
    <button
      key={key}
      type="button"
      className={cx(styles.act, cls)}
      disabled={disabled}
      onClick={onClick}
      data-testid={`ct-${key}`}
    >
      {label}
    </button>
  );
  const can = (action: string) => nextState(CONTRACT_FLOW, c.status, action) !== null;
  const sent = !!c.sent_at;
  const acts = [
    // Sửa nháp (TIP-032c): form sửa đúng hợp đồng này kèm version đã mở.
    can('contract.update') && btn('edit', t('edit'), () => set({ form: 'edit', editId: c.id, prefill: null }), undefined, !canDraft),
    // Còn điều khoản AI chờ Giữ / Bỏ → chưa trình duyệt được (server cũng chặn — TIP-030b spec 11).
    can('contract.submit') && btn('submit', t('submit'), () => void submit.run({ contract_id: c.id }), styles.actPrimary, !canDraft || (c.ai_suggestions ?? []).some((x) => x.status === 'pending')),
    can('contract.request_changes') &&
      btn('changes', t('changes'), () => void changes.run({ contract_id: c.id }), styles.actWarn, !canReview),
    can('contract.approve_and_sign') &&
      btn('approve-sign', t('approveSign'), () => set({ signFor: c.id }), styles.actPrimary, !canSign),
    can('contract.remind_signer') &&
      btn('remind', t('remind'), () => void remind.run({ contract_id: c.id }), undefined, !canDraft || !sent),
    can('contract.extend_sign_link') &&
      btn('extend', t('extend'), () => void extend.run({ contract_id: c.id }), undefined, !canDraft || !sent),
    can('contract.terminate') && btn('terminate', t('terminate'), () => setEnding(true), styles.actDanger, !canSign),
    c.status === 'signed' &&
      btn(
        'to-order',
        t('toOrder'),
        () => (set({ detail: null }), router.push(`/orders?from_contract=${c.id}`)),
        styles.actPrimary,
      ),
    c.status === 'expired' &&
      btn(
        'renew',
        t('renew'),
        async () => {
          const r = await renew.run({ contract_id: c.id });
          if (r) set({ detail: r.result.contract_id, tab: 'overview' });
        },
        styles.actPrimary,
        !canDraft,
      ),
  ].filter(Boolean);
  if (!acts.length) return null;
  return (
    <div className={styles.foot}>
      {acts}
      {ending ? <TerminateModal c={c} onClose={() => setEnding(false)} /> : null}
    </div>
  );
}

function Header({ c }: { c: Contract }) {
  const t = useTranslations('contracts');
  const { styles } = useContractDetailStyles();
  const tr = useTr();
  const [fg, bg] = STATUS_TONE[c.status];
  return (
    <>
      <div className={styles.top}>
        <span className={styles.icon}>
          <Icon name="ic-doc" size={24} color={color.white} strokeWidth={1.8} />
        </span>
        <div className={styles.grow}>
          <div className={styles.chips}>
            <span className={styles.code}>{c.code}</span>
            <span className={styles.st} style={{ color: fg, background: bg }} data-testid="ct-status">
              {t(`status.${c.status}`)}
            </span>
          </div>
          <div className={styles.value}>{tr(c.value)}</div>
        </div>
      </div>
      <div className={styles.cust}>
        <Avatar name={c.contact_name} className={styles.av} />
        <div className={styles.grow}>
          <div className={styles.name}>{c.contact_name}</div>
          <div className={styles.phone}>{c.phone}</div>
        </div>
        <div>
          <div className={styles.byL}>{t('detail.by')}</div>
          <div className={styles.byV}>{c.owner_name}</div>
          {c.assigned_name && c.assigned_user_id !== c.owner_user_id ? (
            <div className={styles.byV} data-testid="ct-assigned">
              {`${t('form.assigned')}: ${c.assigned_name}`}
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}

export function ContractDrawer({ meta: base }: { meta: ContractsMeta }) {
  const t = useTranslations('contracts.detail');
  const { styles } = useContractDetailStyles();
  const ui = useContractsUi();
  const c = useQuery({ ...contractQuery(ui.detail ?? ''), enabled: !!ui.detail }).data;
  const meta = useQuery({ ...contractsMetaQuery(ui.detail ?? ''), enabled: !!ui.detail }).data ?? base;
  return (
    <EntityDrawer
      open={!!ui.detail}
      onClose={() => ui.set({ detail: null, tab: 'overview' })}
      title={c?.code ?? ''}
      closeLabel={t('close')}
      testId="ct-drawer"
      muted
      tabs={TABS.map((k) => ({ key: k, label: t(`tabs.${k}`) }))}
      tab={ui.tab}
      onTab={(k) => ui.set({ tab: k })}
      header={c ? <Header c={c} /> : null}
      footer={c ? <Footer c={c} /> : null}
    >
      <div className={styles.body}>
        {c && ui.tab === 'overview' ? <OverviewTab c={c} /> : null}
        {c && ui.tab === 'overview' ? <AiSuggestions c={c} /> : null}
        {c && ui.tab === 'crm' ? <CrmTab meta={meta} /> : null}
        {c && ui.tab === 'ai' ? <AiTab meta={meta} /> : null}
        {c && ui.tab === 'files' ? <FilesTab c={c} meta={meta} /> : null}
        {c && ui.tab === 'appendix' ? <AppendixTab c={c} /> : null}
        {c && ui.tab === 'history' ? <HistoryTab c={c} /> : null}
      </div>
    </EntityDrawer>
  );
}
