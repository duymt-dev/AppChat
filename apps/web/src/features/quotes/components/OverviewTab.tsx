// Tab "Tổng quan" của drawer báo giá — prototype L5056–5128.
'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useCan } from '@/shared/authz/useCan';
import { useQuoteTabStyles } from '../styles/tabs.styles';
import { useQuoteDetailStyles } from '../styles/detail.styles';
import { QuoteLines } from './QuoteLines';
import { Comments, closeChance, CustType, Ring, avColor, initial } from './parts';
import { useStamp } from '../columns';
import type { Quote, QuotesMeta } from '../types';
import { useApprovalPolicy } from '../hooks/useApprovalPolicy';
import { CustomFieldList } from '@/shared/custom-fields';

const STAGE_KEYS = ['accepted', 'approved', 'sent', 'viewed', 'rejected'];
const HINT_KEYS = ['sent', 'viewed', 'approved', 'accepted'];

export function OverviewTab({ q, meta }: { q: Quote; meta: QuotesMeta }) {
  const t = useTranslations('quotes.detail');
  const ap = useApprovalPolicy();
  const { styles, cx } = useQuoteTabStyles();
  const d = useQuoteDetailStyles().styles;
  const stamp = useStamp();
  const canCreate = useCan('quote.create');
  const submit = useAction('quote.submit_for_approval');
  const update = useAction('quote.update');
  const [note, setNote] = useState(q.note);
  const chance = closeChance(q);
  const stage = STAGE_KEYS.includes(q.status) ? q.status : 'other';
  const hint = HINT_KEYS.includes(q.status) ? q.status : 'other';
  const blocked = q.approval_reasons.length > 0 && ['draft', 'revision_requested'].includes(q.status);
  const BULLETS: [string, string][] = [
    [t('bullets.value'), q.approval_reasons.length ? t('bullets.valueHigh') : t('bullets.valueOk')],
    [t('bullets.cust'), q.returning ? t('bullets.custOld') : t('bullets.custNew')],
    [t('bullets.next'), t('bullets.nextV')],
    [t('bullets.chance'), t('pct', { n: chance })],
  ];

  return (
    <>
      <div className={styles.card}>
        <div className={styles.head}>
          <span className={styles.h}>{t('journey')}</span>
          <span className={styles.pill} style={{ color: color.amberGold, background: color.amberGoldBg }}>
            {t(`stage.${stage}` as never)}
          </span>
        </div>
        <div className={styles.hint}>
          <span className={styles.spark}>{t('spark')}</span>
          <div>
            <b>{t('aiHint')}</b> <span className={styles.muted}>{t(`hint.${hint}` as never)}</span>
          </div>
        </div>
      </div>
      <div className={styles.card}>
        <div className={cx(styles.head, styles.gap12)}>
          <span className={styles.h}>{t('aiSummary')}</span>
          <span className={styles.pill} style={{ color: color.brandInk, background: color.brandBg }}>
            {t('closeChance', { n: chance })}
          </span>
        </div>
        <div className={styles.ringRow}>
          <Ring pct={chance} label={t('pct', { n: chance })} />
          <div className={styles.bullets}>
            {BULLETS.map(([l, v]) => (
              <div key={l}>
                <div className={styles.bL}>{l}</div>
                <div className={styles.bV}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className={styles.card}>
        <div className={cx(styles.h, styles.gap12)}>{t('custInfo')}</div>
        <div className={styles.custRow}>
          <span className={cx(d.av, d.avLg)} style={{ background: avColor(q.contact_name) }}>
            {initial(q.contact_name)}
          </span>
          <div className={d.grow}>
            <div className={d.name}>{q.contact_name}</div>
            <div className={d.phone}>{q.phone}</div>
          </div>
          <CustType returning={q.returning} />
        </div>
        <div className={styles.kv}>
          <div>
            <span>{t('byLabel')}</span>
            <b>{q.owner_name}</b>
          </div>
          {q.assigned_user_id !== q.owner_user_id && (
            <div data-testid="q-assigned">
              <span>{t('assignedLabel')}</span>
              <b>{q.assigned_name || t('unassigned')}</b>
            </div>
          )}
          <div>
            <span>{t('dateLabel')}</span>
            <b>{stamp(q.created_at)}</b>
          </div>
          {q.gift ? (
            <div className={styles.full}>
              <span>{t('giftLabel')}</span>
              <b>{q.gift}</b>
            </div>
          ) : null}
        </div>
      </div>
      <div className={cx(styles.h, styles.hMuted)}>{t('quoteInfo')}</div>
      {blocked ? (
        <div className={styles.warn} data-testid="q-approval-banner">
          <Icon name="ic-shield" size={16} color={color.amberGold} />
          <div className={d.grow}>
            {t('needApproval', { reasons: q.approval_reasons.map(ap.label).join(', ') })}
          </div>
          {canCreate ? (
            <button
              type="button"
              className={styles.warnBtn}
              onClick={() => void submit.run({ quote_id: q.id })}
              data-testid="q-submit"
            >
              {t('submit')}
            </button>
          ) : null}
        </div>
      ) : null}
      {q.status === 'pending_approval' ? <div className={styles.warn}>{t('pending')}</div> : null}
      <div className={cx(styles.card, styles.flush)}>
        <QuoteLines key={`${q.id}:${q.total}`} q={q} />
      </div>
      <div className={cx(styles.card, styles.cardPad)}>
        <div className={styles.head}>
          <span className={d.name}>{t('custType')}</span>
          <CustType returning={q.returning} />
        </div>
        {q.returning ? <div className={styles.note}>{t('oldHint')}</div> : null}
      </div>
      <div className={cx(styles.card, styles.cardPad)}>
        <div className={styles.t13}>{t('noteTitle')}</div>
        <textarea
          className={styles.textarea}
          rows={2}
          value={note}
          placeholder={t('notePh')}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() =>
            note !== q.note &&
            canCreate &&
            ['draft', 'revision_requested'].includes(q.status) &&
            void update.run({ quote_id: q.id, patch: { note } }, { silent: true })
          }
        />
      </div>
      <div className={cx(styles.card, styles.cardPad)}>
        <div className={cx(styles.h, styles.head)}>{t('activity')}</div>
        {meta.timeline.map(([k, at, c, ic]) => (
          <div key={k} className={styles.tl}>
            <span className={styles.tlIc}>
              <Icon name={ic as never} size={12} color={c} strokeWidth={1.9} />
            </span>
            <div className={d.grow}>
              <div className={styles.tlT}>{t(`act.${k}` as never)}</div>
              <div className={styles.tlM}>{stamp(at)}</div>
            </div>
          </div>
        ))}
      </div>
      <div className={cx(styles.card, styles.cardPad)}>
        <div className={styles.head}>
          <span className={styles.h}>{t('todos')}</span>
          <span className={styles.link}>{t('todoAdd')}</span>
        </div>
        {meta.todos.map(([k, done, when]) => (
          <div key={k} className={styles.todo}>
            <span className={cx(styles.box, done && styles.boxOn)}>
              {done ? <Icon name="ic-check" size={11} color={color.white} strokeWidth={3} /> : null}
            </span>
            <span className={cx(styles.todoT, done && styles.done)}>{t(`todo.${k}` as never)}</span>
            <span className={styles.when}>{t(`when.${when}` as never)}</span>
          </div>
        ))}
      </div>
      <CustomFieldList entity="quote" values={q.custom} />
      <Comments q={q} />
    </>
  );
}
