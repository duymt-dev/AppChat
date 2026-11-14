// Chuỗi chứng từ của cơ hội (TIP-026c §5.1) — prototype L2881–2884: 4 bước, mỗi bước là chứng từ THẬT (mã + trạng thái từ reader domain
// theo quyền; có mà không quyền → "Không có quyền xem", không lộ mã) + nút tạo nối tiếp qua action có sẵn. Mức 4 (trích luật): "Hóa đơn
// HD-" → "Đề nghị thanh toán TT-" (COMMERCE §5), "Khách duyệt" → "Khách chốt" (COMMERCE §3), báo giá tạo từ cơ hội ra NHÁP.
'use client';
import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { createStyles } from 'antd-style';
import { color, font, radius } from '@appchat/ui';
import { useFmt } from '../i18n/useFmt';
import { useCan } from '../authz/useCan';
import { useOpportunityChain } from './useOpportunityChain';
import { DOC_STATUS_NS, type OpportunityDetailDto } from './types';

const useStyles = createStyles(({ css }) => ({
  step: css`
    display: flex;
    gap: 12px;
    padding: 12px 0;
    border-bottom: 1px solid ${color.divider};
    &:last-child {
      border-bottom: none;
    }
  `,
  idle: css`
    opacity: 0.6;
  `,
  dot: css`
    width: 26px;
    height: 26px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.heavy};
    flex-shrink: 0;
    background: ${color.muteBg};
    color: ${color.text4};
  `,
  dotActive: css`
    background: ${color.brandBg};
    color: ${color.brandInk};
    box-shadow: inset 0 0 0 1.5px ${color.brand};
  `,
  dotDone: css`
    background: ${color.brand};
    color: ${color.white};
  `,
  main: css`
    flex: 1;
    min-width: 0;
  `,
  top: css`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    & b {
      font-size: ${font.scale.s14}px;
      color: ${color.text};
    }
  `,
  code: css`
    font-family: ${font.mono};
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    color: ${color.paidText};
    background: ${color.statusPotentialBg};
    border-radius: ${radius.r4}px;
    padding: 2px 6px;
  `,
  sub: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text3};
    margin-top: 2px;
  `,
  acts: css`
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    margin-top: 8px;
  `,
  btn: css`
    height: 32px;
    padding: 0 12px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    background: ${color.surface};
    color: ${color.text2};
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    cursor: pointer;
    font-family: inherit;
    &:disabled {
      opacity: 0.5;
      cursor: default;
    }
  `,
  primary: css`
    border: none;
    background: ${color.brand};
    color: ${color.white};
  `,
}));

type Act = { key: string; label: string; primary?: boolean; run: () => unknown };

export function OpportunityChain({ o, onReject }: { o: OpportunityDetailDto; onReject: () => void }) {
  const t = useTranslations('common.opportunity');
  const tAll = useTranslations();
  const fmt = useFmt();
  const { styles, cx } = useStyles();
  const c = useOpportunityChain(o);
  const can = { quote: useCan('quote.create'), send: useCan('quote.send'), contract: useCan('contract.draft'), order: useCan('order.manage'), invoice: useCan('invoice.manage') };
  const { quote, contract, order, invoice, paid } = o.chain;
  const live = o.stage !== 'lost' && o.can_edit;
  const latest = quote.docs[0];
  const accepted = quote.docs.find((d) => d.status === 'accepted');
  const firstOrder = order.docs.find((d) => d.status !== 'cancelled');
  const hasDeal = contract.docs.length > 0 || order.docs.length > 0;
  const codes = (step: OpportunityDetailDto['chain']['quote'], ns: keyof typeof DOC_STATUS_NS) => step.docs.map((d) => ({ code: d.code, status: tAll(`${DOC_STATUS_NS[ns]}.${d.status}`) }));
  const steps: { n: number; label: string; docs: { code: string; status: string }[]; hidden: boolean; sub: string; done: boolean; active: boolean; acts: Act[] }[] = [
    {
      n: 1,
      label: t('chain.quote'),
      docs: codes(quote, 'quote'),
      hidden: quote.hidden,
      sub: latest ? tAll(`${DOC_STATUS_NS.quote}.${latest.status}`) : t('chain.noQuote'),
      done: !!accepted,
      active: true,
      acts: !live
        ? []
        : !latest
          ? can.quote ? [{ key: 'new-quote', label: t('chain.newQuote'), primary: true, run: c.newQuote }] : []
          : (latest.status === 'sent' || latest.status === 'viewed') && can.send
            ? [
                { key: 'accept', label: t('chain.accept'), primary: true, run: () => c.accept(latest.id) },
                { key: 'reject', label: t('chain.reject'), run: onReject },
              ]
            : [],
    },
    {
      n: 2,
      label: t('chain.deal'),
      docs: [...codes(contract, 'contract'), ...codes(order, 'order')],
      hidden: contract.hidden || order.hidden,
      sub: hasDeal ? t('chain.dealFrom', { code: accepted?.code ?? latest?.code ?? '' }) : accepted ? t('chain.dealReady') : t('chain.dealNeedsQuote'),
      done: hasDeal,
      active: !!accepted || hasDeal,
      acts:
        live && accepted && !hasDeal
          ? [
              ...(can.contract ? [{ key: 'to-contract', label: t('chain.toContract'), primary: true, run: () => c.toContract(accepted.id) }] : []),
              ...(can.order ? [{ key: 'to-order', label: t('chain.toOrder'), run: () => c.toOrder(accepted.id) }] : []),
            ]
          : [],
    },
    {
      n: 3,
      label: t('chain.invoice'),
      docs: codes(invoice, 'invoice'),
      hidden: invoice.hidden,
      sub: invoice.docs.length ? t('chain.invoiceFrom') : firstOrder ? t('chain.invoiceReady', { code: firstOrder.code }) : t('chain.invoiceNeedsOrder'),
      done: invoice.docs.length > 0,
      active: !!firstOrder,
      acts: firstOrder && !invoice.docs.length && can.invoice && o.stage !== 'lost' ? [{ key: 'new-invoice', label: t('chain.newInvoice'), primary: true, run: () => c.newInvoice(firstOrder.id) }] : [],
    },
    {
      n: 4,
      label: t('chain.paid'),
      docs: [],
      hidden: false,
      sub: paid ? t('chain.paidSum', { paid: fmt.money(paid.paid_vnd), due: fmt.money(paid.due_vnd) }) : invoice.docs.length ? t('chain.paidTrack') : t('chain.paidNeedsInvoice'),
      done: !!paid && paid.due_vnd === '0' && paid.paid_vnd !== '0',
      active: invoice.docs.length > 0,
      acts: invoice.docs.length ? [{ key: 'finance', label: t('chain.finance'), run: c.finance }] : [],
    },
  ];
  return (
    <>
      {steps.map((s) => {
        let codesNode: ReactNode = null;
        if (s.hidden && !s.docs.length) codesNode = <span className={styles.sub}>{t('chain.hidden')}</span>;
        else if (s.docs.length) codesNode = s.docs.map((d) => <span key={d.code} className={styles.code} title={d.status}>{d.code}</span>);
        return (
          <div key={s.n} className={cx(styles.step, !s.active && !s.done && styles.idle)} data-testid={`opp-chain-${s.n}`}>
            <span className={cx(styles.dot, s.active && styles.dotActive, s.done && styles.dotDone)}>{s.done ? '✓' : s.n}</span>
            <div className={styles.main}>
              <div className={styles.top}>
                <b>{s.label}</b>
                {codesNode}
              </div>
              <div className={styles.sub}>{s.sub}</div>
              {s.acts.length ? (
                <div className={styles.acts}>
                  {s.acts.map((a) => (
                    <button key={a.key} type="button" className={cx(styles.btn, a.primary && styles.primary)} disabled={c.pending} onClick={() => void a.run()} data-testid={`opp-chain-${a.key}`}>
                      {a.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </>
  );
}
