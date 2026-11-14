// /admin › Chuyển khoản (TIP-040 pha 3, DC-372): hoá đơn chờ duyệt (duyệt tay cần lý do + bằng chứng) và giao dịch ngân hàng chưa khớp
// (gắn vào đúng một hoá đơn — số tiền phải bằng đúng; thừa / thiếu server từ chối, giữ chưa khớp). Liên hệ bán hàng ở InquiriesList.
'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Input, Modal, Segmented, Table } from 'antd';
import { useTranslations } from 'next-intl';
import { useAction } from '@/shared/actions/useAction';
import { useFmt } from '@/shared/i18n/useFmt';
import { PageStates, stateOf } from '@/shared/states/PageStates';
import { adminBankTxQuery, adminTransfersQuery } from '../api';
import { useCursorPage } from '../hooks/useAdminQueries';
import { useAdminStyles } from '../styles/admin.styles';
import { CursorPager } from './CursorPager';
import { InquiriesList } from './InquiriesList';
import type { AdminBankTx, AdminTransfer } from '../types';

type View = 'invoices' | 'bank' | 'inquiries';

export function TransfersPanel() {
  const t = useTranslations('platformAdmin.transfers');
  const fmt = useFmt();
  const { styles } = useAdminStyles();
  const [view, setView] = useState<View>('invoices');
  const inv = useCursorPage<{ q?: string }>({});
  const bank = useCursorPage<{ q?: string }>({});
  const iq = useQuery({ ...adminTransfersQuery(inv.params), enabled: view === 'invoices' });
  const bq = useQuery({ ...adminBankTxQuery(bank.params), enabled: view === 'bank' });
  const confirm = useAction('admin.invoice.confirm_transfer');
  const match = useAction('admin.bank_transaction.match');
  const [manual, setManual] = useState<AdminTransfer | null>(null);
  const [pairing, setPairing] = useState<AdminBankTx | null>(null);
  const [f, setF] = useState({ note: '', evidence: '', invoice: '', reason: '' });
  const ok3 = (s: string) => s.trim().length >= 3;
  const doConfirm = async () => {
    if (manual && (await confirm.run({ invoice_id: manual.id, note: f.note.trim(), evidence: f.evidence.trim() }))) setManual(null);
  };
  const doMatch = async () => {
    if (pairing && (await match.run({ bank_transaction_id: pairing.id, invoice_id: f.invoice.trim(), reason: f.reason.trim() }))) setPairing(null);
  };
  const open = (fn: () => void) => (setF({ note: '', evidence: '', invoice: '', reason: '' }), fn());
  return (
    <div className={styles.card}>
      <div className={styles.bar}>
        <Segmented<View> value={view} onChange={setView} options={(['invoices', 'bank', 'inquiries'] as const).map((v) => ({ value: v, label: t(`view.${v}`) }))} data-testid="adm-tr-view" />
        <span className={styles.grow} />
        {view !== 'inquiries' && (
          <Input.Search allowClear placeholder={t(view === 'bank' ? 'searchBank' : 'search')} aria-label={t('search')} onSearch={(v) => (view === 'bank' ? bank : inv).setFilter({ q: v || undefined })} style={{ maxWidth: 280 }} />
        )}
      </div>
      {view === 'invoices' && (
        <PageStates state={stateOf(iq)} onRetry={() => void iq.refetch()}>
          <Table<AdminTransfer>
            rowKey="id"
            size="middle"
            pagination={false}
            dataSource={iq.data?.data ?? []}
            scroll={{ x: 900 }}
            data-testid="adm-tr-invoices"
            locale={{ emptyText: t('emptyInvoices') }}
            columns={[
              { title: t('code'), render: (_, r) => <><div>{r.code}</div><div className={styles.muted}>{r.transfer_code}</div></> },
              { title: t('workspace'), dataIndex: 'workspace_name' },
              { title: t('amount'), render: (_, r) => fmt.money(r.amount) },
              { title: t('reported'), render: (_, r) => (r.reported_at ? fmt.date(r.reported_at) : '—') },
              { title: '', render: (_, r) => <Button size="small" onClick={() => open(() => setManual(r))} data-testid={`adm-tr-confirm-${r.id}`}>{t('confirm')}</Button> },
            ]}
          />
          <CursorPager page={inv.page} hasNext={!!iq.data?.next_cursor} onPrev={inv.prev} onNext={() => inv.next(iq.data?.next_cursor)} testId="adm-tr-inv-pager" />
        </PageStates>
      )}
      {view === 'bank' && (
        <PageStates state={stateOf(bq)} onRetry={() => void bq.refetch()}>
          <Table<AdminBankTx>
            rowKey="id"
            size="middle"
            pagination={false}
            dataSource={bq.data?.data ?? []}
            scroll={{ x: 900 }}
            data-testid="adm-tr-bank"
            locale={{ emptyText: t('emptyBank') }}
            columns={[
              { title: t('occurred'), render: (_, r) => fmt.date(r.occurred_at) },
              { title: t('amount'), render: (_, r) => fmt.money(r.amount) },
              { title: t('content'), dataIndex: 'content' },
              { title: t('provider'), dataIndex: 'provider' },
              { title: '', render: (_, r) => <Button size="small" onClick={() => open(() => setPairing(r))} data-testid={`adm-tr-match-${r.id}`}>{t('match')}</Button> },
            ]}
          />
          <CursorPager page={bank.page} hasNext={!!bq.data?.next_cursor} onPrev={bank.prev} onNext={() => bank.next(bq.data?.next_cursor)} testId="adm-tr-bank-pager" />
        </PageStates>
      )}
      {view === 'inquiries' && <InquiriesList />}
      <Modal open={!!manual} title={t('confirmTitle', { code: manual?.code ?? '' })} onCancel={() => setManual(null)} onOk={() => void doConfirm()} okButtonProps={{ disabled: !ok3(f.note) || !ok3(f.evidence), loading: confirm.isPending, 'data-testid': 'adm-tr-confirm-ok' } as never} destroyOnHidden>
        <p className={styles.muted}>{t('confirmHint', { amount: manual ? fmt.money(manual.amount) : '' })}</p>
        <div className={styles.group}>
          <Input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} maxLength={300} placeholder={t('note')} aria-label={t('note')} data-testid="adm-tr-note" />
        </div>
        <Input value={f.evidence} onChange={(e) => setF({ ...f, evidence: e.target.value })} maxLength={300} placeholder={t('evidence')} aria-label={t('evidence')} data-testid="adm-tr-evidence" />
      </Modal>
      <Modal open={!!pairing} title={t('matchTitle', { amount: pairing ? fmt.money(pairing.amount) : '' })} onCancel={() => setPairing(null)} onOk={() => void doMatch()} okButtonProps={{ disabled: !/^[0-9a-f-]{36}$/i.test(f.invoice.trim()) || !ok3(f.reason), loading: match.isPending, 'data-testid': 'adm-tr-match-ok' } as never} destroyOnHidden>
        <p className={styles.muted}>{t('matchHint')}</p>
        <div className={styles.group}>
          <Input value={f.invoice} onChange={(e) => setF({ ...f, invoice: e.target.value })} placeholder={t('invoiceId')} aria-label={t('invoiceId')} data-testid="adm-tr-invoice" />
        </div>
        <Input value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} maxLength={300} placeholder={t('reason')} aria-label={t('reason')} data-testid="adm-tr-reason" />
      </Modal>
    </div>
  );
}
