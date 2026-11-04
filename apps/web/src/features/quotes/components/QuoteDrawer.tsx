// Drawer chi tiết báo giá — prototype L5032–5160 (392px, nền xám): đầu tuỳ biến + 4 tab + chân thao tác theo trạng thái (COMMERCE §3).
// "Gửi ZBS / Gửi SMS" là kênh OUT (prototype-parity §6) → Gửi Zalo · Gửi Email · Tải PDF.
// "→ Hợp đồng / → Đơn hàng" chỉ cho báo giá đã chốt (bấm khi đã gửi = ghi nhận khách chốt trước); màn đích tạo bản ghi từ `from_quote`.
'use client';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { QUOTE_FLOW, nextState } from '@appchat/shared';
import { EntityDrawer, Icon, color } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useCan } from '@/shared/authz/useCan';
import { useFmt } from '@/shared/i18n/useFmt';
import { useQuoteDetailStyles } from '../styles/detail.styles';
import { useQuotesUi } from '../quotes-store';
import { quoteQuery, quotesMetaQuery } from '../api';
import { useQuotePdf } from '../hooks/useQuotePdf';
import { useQuoteSend } from '../hooks/useQuoteSend';
import { useStamp } from '../columns';
import { STATUS_TONE } from '../status';
import { OverviewTab } from './OverviewTab';
import { AiTab, CrmTab, HistoryTab } from './DetailTabs';
import { CustType, avColor, initial } from './parts';
import type { Quote, QuotesMeta } from '../types';

const TABS = ['overview', 'crm', 'ai', 'history'] as const;
/** Nút chân drawer bật theo bảng QUOTE_FLOW chung (DC-171) — cùng luật với server / mock. */
const can = (q: Quote, action: string) => nextState(QUOTE_FLOW, q.status, action) !== null;

function Footer({ q }: { q: Quote }) {
  const t = useTranslations('quotes.detail');
  const { styles, cx } = useQuoteDetailStyles();
  const router = useRouter();
  const canApprove = useCan('quote.approve');
  const canCreate = useCan('quote.create');
  const approve = useAction('quote.approve');
  const rejectInternal = useAction('quote.reject_internal');
  const revision = useAction<{ quote_id: string }>('quote.request_revision');
  const reject = useAction('quote.mark_rejected');
  const accept = useAction('quote.mark_accepted');
  const set = useQuotesUi((s) => s.set);
  const pending = q.status === 'pending_approval';
  const convert = async (kind: 'contracts' | 'orders') => {
    if (q.status !== 'accepted' && !(await accept.run({ quote_id: q.id }, { silent: true }))) return;
    set({ detail: null });
    router.push(`/${kind}?from_quote=${q.id}`);
  };
  const canConvert = q.status === 'accepted' || can(q, 'quote.mark_accepted');
  // Một báo giá → một HĐ HOẶC một đơn (TIP-032b): đã sinh loại này thì nút loại kia tắt (server trả QUOTE_ALREADY_CONVERTED).
  const toContract = canConvert && q.converted !== 'order';
  const toOrder = canConvert && q.converted !== 'contract';
  return (
    <div className={styles.foot}>
      <button
        type="button"
        className={styles.act}
        disabled={!canApprove || !pending}
        onClick={() => void approve.run({ quote_id: q.id })}
        data-testid="q-approve"
      >
        <Icon name="ic-check" size={14} color={color.text} />
        {t('approve')}
      </button>
      <button
        type="button"
        className={cx(styles.act, styles.actRev)}
        disabled={!canCreate || !can(q, 'quote.request_revision')}
        onClick={async () => {
          const r = await revision.run({ quote_id: q.id });
          if (r) set({ detail: r.result.quote_id, tab: 'overview' });
        }}
        data-testid="q-revision"
      >
        <Icon name="ic-doc" size={14} color={color.amberText} />
        {t('revision')}
      </button>
      <button
        type="button"
        className={cx(styles.act, styles.actRej)}
        disabled={pending ? !canApprove : !can(q, 'quote.mark_rejected')}
        onClick={() =>
          void (pending ? rejectInternal.run({ quote_id: q.id }) : reject.run({ quote_id: q.id }))
        }
        data-testid="q-reject"
      >
        <Icon name="ic-x" size={14} color={color.rejectText} />
        {t('reject')}
      </button>
      <span className={styles.grow} />
      <button
        type="button"
        className={cx(styles.act, styles.actContract)}
        disabled={!toContract}
        onClick={() => void convert('contracts')}
        data-testid="q-to-contract"
      >
        {t('toContract')}
      </button>
      <button
        type="button"
        className={cx(styles.act, styles.actOrder)}
        disabled={!toOrder}
        onClick={() => void convert('orders')}
        data-testid="q-to-order"
      >
        {t('toOrder')}
      </button>
    </div>
  );
}

function Header({ q }: { q: Quote }) {
  const t = useTranslations('quotes');
  const fmt = useFmt();
  const stamp = useStamp();
  const pdf = useQuotePdf();
  const { styles } = useQuoteDetailStyles();
  const canSend = useCan('quote.send');
  const send = useQuoteSend();
  const [fg, bg] = STATUS_TONE[q.status];
  return (
    <>
      <div className={styles.top}>
        <span className={styles.icon}>
          <Icon name="ic-doc" size={26} color={color.white} strokeWidth={1.6} />
        </span>
        <div className={styles.grow}>
          <div className={styles.chips}>
            <span className={styles.code}>{q.code}</span>
            <span className={styles.rev}>{t('detail.rev', { n: q.version })}</span>
            <span className={styles.st} style={{ color: fg, background: bg }}>
              {t(`status.${q.status}`)}
            </span>
          </div>
          <div className={styles.total}>{fmt.money(q.total)}</div>
        </div>
      </div>
      <div className={styles.cust}>
        <span className={styles.av} style={{ background: avColor(q.contact_name) }}>
          {initial(q.contact_name)}
        </span>
        <div className={styles.grow}>
          <div className={styles.name}>
            {q.contact_name} <CustType returning={q.returning} />
          </div>
          <div className={styles.phone}>{q.phone}</div>
        </div>
        <div>
          <div className={styles.byL}>{t('detail.by')}</div>
          <div className={styles.byV}>{t('detail.byAt', { by: q.owner_name, at: stamp(q.created_at) })}</div>
        </div>
      </div>
      <div className={styles.sends}>
        <button
          type="button"
          className={styles.send}
          disabled={!canSend}
          onClick={() => void send.run(q.id, 'zalo_personal')}
          data-testid="q-send-zalo"
        >
          <span className={styles.dot} />
          {t('detail.sendZalo')}
        </button>
        <button
          type="button"
          className={styles.send}
          disabled={!canSend}
          onClick={() => void send.run(q.id, 'email')}
        >
          <Icon name="ic-mail" size={14} color={color.text2} />
          {t('detail.sendEmail')}
        </button>
        <button type="button" className={styles.send} disabled={pdf.busy} onClick={() => void pdf.open(q.id)} data-testid="q-pdf">
          <Icon name="ic-dl" size={14} color={color.text2} />
          {t('detail.sendPdf')}
        </button>
      </div>
    </>
  );
}

export function QuoteDrawer({ meta: listMeta }: { meta: QuotesMeta }) {
  const t = useTranslations('quotes.detail');
  const { styles } = useQuoteDetailStyles();
  const ui = useQuotesUi();
  const q = useQuery({ ...quoteQuery(ui.detail ?? ''), enabled: !!ui.detail }).data;
  // Số liệu riêng của báo giá đang mở (thẻ CRM, hoạt động, việc cần làm, lịch sử); chưa có thì dùng meta của trang.
  const meta = useQuery({ ...quotesMetaQuery(ui.detail ?? undefined), enabled: !!ui.detail, placeholderData: listMeta }).data ?? listMeta;
  return (
    <EntityDrawer
      open={!!ui.detail}
      onClose={() => ui.set({ detail: null, tab: 'overview' })}
      title={q?.code ?? ''}
      closeLabel={t('close')}
      testId="q-drawer"
      muted
      wideTabs
      tabs={TABS.map((k) => ({ key: k, label: t(`tabs.${k}`) }))}
      tab={ui.tab}
      onTab={(k) => ui.set({ tab: k })}
      header={q ? <Header q={q} /> : null}
      footer={q ? <Footer q={q} /> : null}
    >
      <div className={styles.body}>
        {q && ui.tab === 'overview' ? <OverviewTab q={q} meta={meta} /> : null}
        {q && ui.tab === 'crm' ? <CrmTab q={q} meta={meta} /> : null}
        {q && ui.tab === 'ai' ? <AiTab q={q} /> : null}
        {q && ui.tab === 'history' ? <HistoryTab q={q} meta={meta} /> : null}
      </div>
    </EntityDrawer>
  );
}
