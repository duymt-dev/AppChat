// Drawer "Cơ hội · Sales Pipeline 360°" (TIP-026c §5.1) — prototype L2852–2915, orchestrator: đầu (tên, khách, giai đoạn, Nhắn tin / Đặt
// lịch demo / Hồ sơ khách), trái = giai đoạn + chuỗi chứng từ + Đánh dấu Thua, phải = Khách hàng 360° + lịch sử. Mount MỘT lần (ActivityFormHost).
// Ghi chỉ khi `can_edit`; mọi đổi qua useOpportunityActions (CAS 409 → làm mới, giữ lựa chọn). Esc / nền tối đóng; mobile 390 toàn màn.
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { OPPORTUNITY_PROBABILITY } from '@appchat/shared';
import { useFmt } from '../i18n/useFmt';
import { dispatchUiCommand } from '../assistant/ui-command-bus';
import { opportunityContactQuery, opportunityQuery } from './api';
import { LostReasonPicker } from './LostReasonPicker';
import { OpportunityChain } from './OpportunityChain';
import { OpportunityCustomer360 } from './OpportunityCustomer360';
import { StageBar } from './StageBar';
import { useOpportunityActions } from './useOpportunityActions';
import { useOpportunityUi } from './opportunity-store';
import { useDrawerStyles } from './opportunity-drawer.styles';
import { stageColor, stageTint, statusOf, type OpportunityDetailDto } from './types';

export function OpportunityDrawer() {
  const id = useOpportunityUi((s) => s.drawer);
  const close = useOpportunityUi((s) => s.close);
  useEffect(() => {
    if (!id) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [id, close]);
  return id ? <DrawerFrame key={id} id={id} onClose={close} /> : null;
}

function DrawerFrame({ id, onClose }: { id: string; onClose: () => void }) {
  const t = useTranslations('common.opportunity');
  const { styles } = useDrawerStyles();
  const q = useQuery(opportunityQuery(id));
  return (
    <div className={styles.veil} onClick={onClose} data-testid="opp-drawer">
      <div className={styles.box} role="dialog" aria-modal="true" aria-label={t('drawerTitle')} onClick={(e) => e.stopPropagation()}>
        {q.data ? (
          <DrawerBody o={q.data} onClose={onClose} />
        ) : (
          <div className={styles.head}>
            <button type="button" className={styles.x} onClick={onClose} aria-label={t('close')}>
              <Icon name="ic-x" size={16} color={color.text3} />
            </button>
            <div className={styles.kicker}>{t('drawerTitle')}</div>
            <div className={styles.state}>{q.isError ? t('loadError') : t('loading')}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function DrawerBody({ o, onClose }: { o: OpportunityDetailDto; onClose: () => void }) {
  const t = useTranslations('common.opportunity');
  const fmt = useFmt();
  const router = useRouter();
  const { styles, cx } = useDrawerStyles();
  const act = useOpportunityActions();
  const askLost = useOpportunityUi((s) => s.askLost);
  const setAskLost = useOpportunityUi((s) => s.setAskLost);
  const contact = useQuery(opportunityContactQuery(o.contact_id)).data;
  const st = statusOf(o.stage);
  const editable = o.can_edit && st === 'open';
  const go = (route: string) => {
    onClose();
    router.push(route);
  };
  const toProfile = () => {
    onClose();
    if (!dispatchUiCommand({ type: 'open', entity: 'contact', id: o.contact_id })) router.push(`/customers?c=${encodeURIComponent(o.contact_id)}`);
  };
  const bookDemo = () => {
    onClose();
    dispatchUiCommand({ type: 'prefill', form: 'appointment.form', values: { contact_id: o.contact_id, opportunity_id: o.id, title: o.title } });
  };
  const lose = async (reason: Parameters<typeof act.markLost>[1]) => {
    if (await act.markLost(o, reason)) setAskLost(false);
  };
  return (
    <>
      <div className={styles.head}>
        <button type="button" className={styles.x} onClick={onClose} aria-label={t('close')}>
          <Icon name="ic-x" size={16} color={color.text3} />
        </button>
        <div className={styles.kicker}>{t('drawerTitle')}</div>
        <div className={styles.titleRow}>
          <div className={styles.spacer}>
            <div className={styles.name} data-testid="opp-drawer-name">
              {o.title}
            </div>
            <div className={styles.sub}>{contact?.name ?? ''}</div>
          </div>
          <span className={styles.pill} style={{ color: stageColor(o.stage), background: stageTint(o.stage) }} data-testid="opp-drawer-stage">
            {t(`stage.${o.stage}`)}
          </span>
        </div>
        <div className={styles.headBtns}>
          <button type="button" className={styles.ghost} onClick={() => go('/inbox')}>
            {t('message')}
          </button>
          <button type="button" className={styles.ghost} disabled={!o.can_edit} onClick={bookDemo} data-testid="opp-book-demo">
            {t('bookDemo')}
          </button>
          <button type="button" className={styles.ghost} onClick={toProfile}>
            {t('profile')}
          </button>
        </div>
      </div>
      <div className={styles.body}>
        <div className={styles.grid}>
          <div>
            <div className={styles.card}>
              <div className={styles.cap}>{t('stageLabel')}</div>
              {o.stage === 'lost' ? (
                <div className={styles.lostBox} data-testid="opp-lost-box">
                  {t('lostBox', { reason: o.lost_reason ? t(`lostReason.${o.lost_reason}`) : t('none') })}
                  <span className={styles.spacer} />
                  {o.can_edit ? (
                    <button type="button" className={styles.danger} disabled={act.pending} onClick={() => void act.reopen(o)} data-testid="opp-reopen">
                      {t('reopen')}
                    </button>
                  ) : null}
                </div>
              ) : (
                <StageBar labeled stage={o.stage} disabled={!editable || act.pending} onPick={(s) => void act.setStage(o, s)} />
              )}
              <div className={styles.stats}>
                <div>
                  <div className={styles.statL}>{t('value')}</div>
                  <div className={styles.statV}>{o.amount_hidden ? t('hidden') : o.amount_vnd ? fmt.moneyShort(o.amount_vnd) : t('none')}</div>
                </div>
                <div>
                  <div className={styles.statL}>{t('probForecast')}</div>
                  <div className={cx(styles.statV, styles.violet)}>
                    {OPPORTUNITY_PROBABILITY[o.stage]}% {o.forecast_vnd && !o.amount_hidden ? <span>{t('approx', { v: fmt.moneyShort(o.forecast_vnd) })}</span> : null}
                  </div>
                </div>
                <div>
                  <div className={styles.statL}>{t('closeDateShort')}</div>
                  <div className={styles.statV}>{o.expected_close_date ? fmt.date(`${o.expected_close_date}T00:00:00`) : t('none')}</div>
                </div>
              </div>
              <div className={styles.meta}>
                {t('owner')}: <b>{o.owner?.name ?? t('none')}</b> · {t('sourceLabel')}: {t(`source.${o.source_kind}`)}
              </div>
            </div>
            <div className={cx(styles.card, styles.cardTight)}>
              <div className={cx(styles.cap, styles.capTight)}>{t('chainTitle')}</div>
              <OpportunityChain o={o} onReject={() => setAskLost(true)} />
              {askLost ? <LostReasonPicker busy={act.pending} onPick={(r) => void lose(r)} onCancel={() => setAskLost(false)} /> : null}
            </div>
            {editable && !askLost ? (
              <button type="button" className={styles.loseBtn} onClick={() => setAskLost(true)} data-testid="opp-lose">
                {t('markLost')}
              </button>
            ) : null}
          </div>
          <OpportunityCustomer360 o={o} />
        </div>
      </div>
    </>
  );
}
