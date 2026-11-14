// Thẻ "Cơ hội / Sales Pipeline" của Hồ sơ 360° (TIP-026c §5.1) — prototype L2386–2417, dữ liệu thật (PD-901): bỏ tên pipeline (một
// pipeline — D60 #8); bước tiếp theo theo luật server (`source: rule`), gợi ý AI chỉ khi có event `ai_suggested` còn hiệu lực, không dựng
// số lần mở báo giá; lịch sử = các cơ hội thật của khách. Không quyền quote.view → "Ẩn theo quyền" (không 0). Ghi chỉ khi sửa được khách.
'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { OPPORTUNITY_PROBABILITY, nextOpportunityStage } from '@appchat/shared';
import { useFmt } from '../i18n/useFmt';
import { useActivityUi } from '../contact-activities/activity-store';
import { OpportunityQuickAdd } from './OpportunityQuickAdd';
import { OpportunityHistory } from './OpportunityHistory';
import { StageBar } from './StageBar';
import { useOpportunityActions } from './useOpportunityActions';
import { useOpportunityUi } from './opportunity-store';
import { useQuickAddUi } from './quick-add-store';
import { useOpportunityStyles } from './opportunity.styles';
import { DOC_STATUS_NS, STATUS_TONE, stageColor, stageTint, statusOf, type OpportunityCardDto, type OpportunityItemDto } from './types';

export interface OpportunityPanelProps {
  contactId: string;
  current: OpportunityCardDto | null;
  history: OpportunityItemDto[];
  /** Tổng số cơ hội chưa lưu trữ (lịch sử chỉ trang đầu) — > history.length thì hiện "Xem tất cả". */
  total?: number;
  canEdit: boolean;
}

export function OpportunityPanel({ contactId, current: o, history, total, canEdit }: OpportunityPanelProps) {
  const t = useTranslations('common.opportunity');
  const tAll = useTranslations();
  const fmt = useFmt();
  const { styles, cx } = useOpportunityStyles();
  const act = useOpportunityActions();
  const openDrawer = useOpportunityUi((s) => s.open);
  const openList = useActivityUi((s) => s.openList);
  const adding = useQuickAddUi((s) => (s.contactId === contactId ? s.values : null));
  const startAdd = useQuickAddUi((s) => s.start);
  const stopAdd = useQuickAddUi((s) => s.stop);
  // "Bỏ qua" gợi ý chỉ ẩn trong phiên (gợi ý hết hiệu lực ở server khi giai đoạn đổi).
  const [skipped, setSkipped] = useState<string | null>(null);
  const st = o ? statusOf(o.stage) : 'open';
  const next = o ? nextOpportunityStage(o.stage) : null;
  const editable = canEdit && !!o && st === 'open';
  const sug = o?.suggestion && o.suggestion.id !== skipped ? o.suggestion : null;
  const money = (v: string | null | undefined, hidden?: boolean) => (hidden ? t('hidden') : v ? fmt.money(v) : t('none'));
  return (
    <div className={styles.card} data-testid="p360-opportunity">
      <div className={styles.head}>
        <span className={styles.eyebrow}>{t('title')}</span>
        {canEdit ? (
          <button type="button" className={styles.link} onClick={() => startAdd(contactId)} data-testid="opp-add">
            {t('add')}
          </button>
        ) : null}
      </div>
      {adding ? <OpportunityQuickAdd contactId={contactId} values={adding} onDone={stopAdd} /> : null}
      {o ? (
        <>
          <div className={styles.titleRow}>
            <span className={styles.title}>{o.title}</span>
            <span className={styles.chip} style={STATUS_TONE[st]} data-testid="opp-status">
              {t(`status.${st}`)}
            </span>
          </div>
          <div className={styles.label}>
            {t('stageLabel')} {editable ? <span>· {t('stageHint')}</span> : null}
          </div>
          <StageBar stage={o.stage} disabled={!editable || act.pending} onPick={(s) => void act.setStage(o, s)} />
          <div className={styles.stageRow}>
            <span className={styles.chip} style={{ color: stageColor(o.stage), background: stageTint(o.stage) }} data-testid="opp-stage">
              {t(`stage.${o.stage}`)}
            </span>
            <span className={styles.prob}>
              {t('probability')} <b data-testid="opp-prob">{OPPORTUNITY_PROBABILITY[o.stage]}%</b>
            </span>
          </div>
          <div className={styles.kv}>
            <span>{t('value')}</span>
            <b data-testid="opp-amount">{money(o.amount_vnd, o.amount_hidden)}</b>
          </div>
          <div className={styles.kv}>
            <span>{t('forecast')}</span>
            <b className={styles.fc} data-testid="opp-forecast">
              {o.amount_hidden ? t('hidden') : o.forecast_vnd ? t('approx', { v: fmt.moneyShort(o.forecast_vnd) }) : t('none')}
            </b>
          </div>
          <div className={styles.kv}>
            <span>{t('closeDate')}</span>
            <b>{o.expected_close_date ? fmt.date(`${o.expected_close_date}T00:00:00`) : t('none')}</b>
          </div>
          <div className={styles.kv}>
            <span>{t('owner')}</span>
            {o.owner ? (
              <span className={styles.owner}>
                <span className={styles.ownerAv}>{(o.owner.name[0] ?? '?').toUpperCase()}</span>
                {o.owner.name}
              </span>
            ) : (
              <b>{t('none')}</b>
            )}
          </div>
          <div className={styles.kv}>
            <span>{t('products')}</span>
            <b>{o.items.length ? o.items.map((x) => `${x.name} × ${x.qty}`).join(' · ') : t('none')}</b>
          </div>
          {o.quote ? (
            <div className={styles.kv}>
              <span>{t('quote')}</span>
              <span>
                <b>{o.quote.code}</b> <span className={styles.quoteState}>· {tAll(`${DOC_STATUS_NS.quote}.${o.quote.status}`)}</span>
              </span>
            </div>
          ) : null}
          {o.next_step && st === 'open' ? (
            <div className={cx(styles.next, o.stage === 'quote' && styles.nextWarn)} data-testid="opp-next">
              <span>
                <b>{t('nextLabel')}</b> {t(`next.${o.next_step.key}`, o.next_step.params)}
              </span>
            </div>
          ) : null}
          {sug ? (
            <div className={styles.ai} data-testid="opp-ai">
              <Icon name="ic-spark" size={15} color={color.brandInk} />
              <div>
                <b>{t('aiLabel')}</b>{' '}
                <span className={styles.aiText}>
                  {t.rich('aiText', { reason: t.has(`reason.${sug.reason_key}`) ? t(`reason.${sug.reason_key}`) : t('reason.ai'), stage: t(`stage.${sug.to_stage}`), b: (c) => <b>{c}</b> })}
                </span>
                {editable ? (
                  <div className={styles.aiBtns}>
                    <button type="button" className={styles.aiApply} disabled={act.pending} onClick={() => void act.setStage(o, sug.to_stage, sug.id)} data-testid="opp-ai-apply">
                      {t('apply')}
                    </button>
                    <button type="button" className={styles.aiSkip} onClick={() => setSkipped(sug.id)}>
                      {t('skip')}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.primary}
              disabled={!editable || !next || act.pending}
              title={o.stage === 'negotiation' ? t('wonNeedsDoc') : undefined}
              onClick={() => next && void act.setStage(o, next)}
              data-testid="opp-move-next"
            >
              {t('moveNext')}
            </button>
            <button type="button" className={styles.outline} onClick={() => openDrawer(o.id)} data-testid="opp-open">
              {t('openDeal')}
            </button>
          </div>
        </>
      ) : (
        <div className={styles.empty} data-testid="opp-empty">
          {t('empty')}
        </div>
      )}
      {history.length ? <OpportunityHistory items={history} total={total ?? history.length} onOpen={openDrawer} onAll={() => openList(contactId, 'opportunities')} /> : null}
    </div>
  );
}
