// Khối "Khách hàng 360°" + "Lịch sử" của drawer cơ hội (TIP-026c §5.1) — prototype L2893–2911. Số thật theo quyền người xem: Đã mua
// (tổng) = thu ròng đã xác nhận (`insights.ltv`, null = không quyền → "Ẩn theo quyền"); công nợ = `insights.debt` (customerDebt — cùng
// công thức hợp đồng / đề nghị); cơ hội đang mở + cơ hội khác đọc danh sách cơ hội thật của khách; lịch sử = `contact_opportunity_event`.
'use client';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useFmt } from '../i18n/useFmt';
import { opportunitiesQuery, opportunityContactQuery } from './api';
import { useOpportunityUi } from './opportunity-store';
import { useDrawerStyles } from './opportunity-drawer.styles';
import { stageColor, stageTint, statusOf, type OpportunityDetailDto } from './types';

export function OpportunityCustomer360({ o }: { o: OpportunityDetailDto }) {
  const t = useTranslations('common.opportunity');
  const fmt = useFmt();
  const { styles, cx } = useDrawerStyles();
  const open = useOpportunityUi((s) => s.open);
  const contact = useQuery(opportunityContactQuery(o.contact_id)).data;
  const list = useInfiniteQuery(opportunitiesQuery(o.contact_id)).data?.pages.flatMap((p) => p.data) ?? [];
  const ins = contact?.insights;
  const others = list.filter((x) => x.id !== o.id);
  const nOpen = list.filter((x) => statusOf(x.stage) === 'open').length;
  const debt = ins?.debt;
  const event = (e: OpportunityDetailDto['events'][number]) => {
    const p = { from: e.from_stage ? t(`stage.${e.from_stage}`) : '', to: e.to_stage ? t(`stage.${e.to_stage}`) : '', reason: typeof e.params.reason === 'string' && t.has(`lostReason.${e.params.reason}`) ? t(`lostReason.${e.params.reason}`) : '' };
    return t.has(`event.${e.kind}`) ? t(`event.${e.kind}`, p) : e.kind;
  };
  return (
    <div>
      <div className={styles.card} data-testid="opp-customer">
        <div className={styles.cap}>{t('customer360')}</div>
        <div className={styles.stats2}>
          <div>
            <div className={styles.statL}>{t('wonSum')}</div>
            <div className={cx(styles.statV, styles.green)}>{ins === undefined ? t('none') : ins.ltv === null ? t('hidden') : fmt.money(ins.ltv)}</div>
          </div>
          <div>
            <div className={styles.statL}>{t('openCount')}</div>
            <div className={styles.statV}>{nOpen}</div>
          </div>
        </div>
        <div className={styles.debt}>
          {t('debt')}{' '}
          {ins === undefined ? (
            <b>{t('none')}</b>
          ) : debt === null || debt === undefined ? (
            <b>{t('hidden')}</b>
          ) : debt.due !== '0' ? (
            <b className={styles.debtWarn}>{t('debtDue', { amount: fmt.money(debt.due), n: debt.open })}</b>
          ) : (
            <b className={styles.debtOk}>{t('debtNone')}</b>
          )}
        </div>
        {others.length ? (
          <>
            <div className={styles.otherCap}>{t('others')}</div>
            {others.map((x) => (
              <button key={x.id} type="button" className={styles.other} onClick={() => open(x.id)} data-testid={`opp-other-${x.id}`}>
                <div className={styles.otherName}>
                  <div>{x.title}</div>
                  {x.lost_reason ? <div>{t('lostReasonLabel', { reason: t(`lostReason.${x.lost_reason}`) })}</div> : null}
                </div>
                <b>{x.amount_hidden ? t('hidden') : x.amount_vnd ? fmt.moneyShort(x.amount_vnd) : t('none')}</b>
                <span className={styles.pill} style={{ color: stageColor(x.stage), background: stageTint(x.stage) }}>
                  {t(`stage.${x.stage}`)}
                </span>
              </button>
            ))}
          </>
        ) : null}
      </div>
      <div className={styles.card} data-testid="opp-events">
        <div className={styles.cap}>{t('events')}</div>
        {o.events.map((e) => (
          <div key={e.id} className={styles.histRow}>
            <span className={styles.histDot} />
            <div>
              <div className={styles.histT}>{event(e)}</div>
              <div className={styles.histD}>
                {fmt.date(e.created_at)} · {e.actor.name}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
