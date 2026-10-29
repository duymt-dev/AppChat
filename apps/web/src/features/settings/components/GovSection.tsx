// Mục AI Governance — prototype L6991–7021: banner vàng "đang áp dụng N/M chính sách", phạm vi dữ liệu AI được truy cập (⚠ Nhạy cảm),
// ranh giới hành vi (Rủi ro cao), từ khoá cấm (thêm / bỏ) + mức lọc + duyệt câu trả lời dài, lưu trữ & chia sẻ (thời gian lưu, không
// train ngoài, ẩn PII, vị trí dữ liệu). Mỗi thao tác ghi một lần qua governance.update (Blueprint §5 guardrails).
'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { PageStates, stateOf } from '@/shared/states/PageStates';
import { useRowsStyles } from '../styles/rows.styles';
import { useGovStyles } from '../styles/gov.styles';
import { governanceQuery } from '../api';
import type { Governance } from '../types';
import { Switch } from './Switch';

const FILTERS = ['strict', 'balanced', 'relaxed'] as const;
const RETENTION = ['30', '90', '180', '365'] as const;
const RESIDENCY = ['sg', 'vn', 'us', 'eu'] as const;
const X = '✕';
const WARN = '⚠';

function Body({ g }: { g: Governance }) {
  const t = useTranslations('settings.gov');
  const r = useRowsStyles().styles;
  const { styles, cx } = useGovStyles();
  const save = useAction('governance.update');
  const [kw, setKw] = useState('');
  const put = (p: Parameters<typeof save.run>[0]) => void save.run(p, { silent: true });
  const addKw = () => {
    const k = kw.trim();
    if (k && !g.keywords.includes(k)) put({ keywords: [...g.keywords, k] });
    setKw('');
  };
  const toggleRow = (l: string, d: string | null, on: boolean, flip: (v: boolean) => void, badge?: 'warn' | 'risk', testId?: string) => (
    <div key={l} className={r.row}>
      <div className={r.grow}>
        <div className={r.l}>
          {l}
          {badge === 'warn' ? <span className={r.warn}>{`${WARN} ${t('sensitive')}`}</span> : badge === 'risk' ? <span className={r.risk}>{t('risky')}</span> : null}
        </div>
        {d ? <div className={r.d}>{d}</div> : null}
      </div>
      <Switch large on={on} onChange={flip} label={l} testId={testId} />
    </div>
  );
  return (
    <>
      <div className={styles.hero}>
        <Icon name="ic-shield" size={24} color={color.govIcon} />
        <div>
          <div className={styles.heroT}>{t('heroT')}</div>
          <div className={styles.heroS}>
            {t('heroS', { n: g.applied, m: g.total })} <span className={styles.gap}>{t('gap')}</span>
          </div>
        </div>
      </div>
      <div className={cx(r.h, r.hOnly)}>{t('scopeT')}</div>
      <div className={r.card} data-testid="st-gov-scopes">
        {g.scopes.map((s) =>
          toggleRow(t(`scope.${s.key}`), t(`scopeD.${s.key}`), s.on, (v) => put({ scopes: { [s.key]: v } }), s.sensitive ? 'warn' : undefined, `st-gov-scope-${s.key}`),
        )}
      </div>
      <div className={r.h}>{t('boundT')}</div>
      <div className={r.hs}>{t('boundS')}</div>
      <div className={r.card} data-testid="st-gov-bounds">
        {g.bounds.map((b) => toggleRow(t(`bound.${b.key}`), null, b.on, (v) => put({ bounds: { [b.key]: v } }), b.risky ? 'risk' : undefined, `st-gov-bound-${b.key}`))}
      </div>
      <div className={r.h}>{t('kwT')}</div>
      <div className={r.hs}>{t('kwS')}</div>
      <div className={cx(r.card, r.cardPad)}>
        <div className={styles.kws} data-testid="st-gov-keywords">
          {g.keywords.map((k) => (
            <button key={k} type="button" className={styles.kw} onClick={() => put({ keywords: g.keywords.filter((x) => x !== k) })} aria-label={t('kwRemove', { k })}>
              {k} {X}
            </button>
          ))}
          <span className={styles.kwAdd}>
            <input value={kw} onChange={(e) => setKw(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addKw()} placeholder={t('kwAdd')} aria-label={t('kwAdd')} data-testid="st-gov-kw-input" />
          </span>
        </div>
        <div className={cx(r.row, r.rowTop)}>
          <div className={cx(r.grow, r.l)}>{t('filter')}</div>
          <select className={r.select} value={g.filter} onChange={(e) => put({ filter: e.target.value as Governance['filter'] })} aria-label={t('filter')}>
            {FILTERS.map((k) => (
              <option key={k} value={k}>
                {t(`filters.${k}`)}
              </option>
            ))}
          </select>
        </div>
        <div className={cx(r.row, r.rowTop)}>
          <div className={cx(r.grow, r.l)}>{t('longReview')}</div>
          <Switch large on={g.long_review} onChange={(v) => put({ long_review: v })} label={t('longReview')} />
        </div>
      </div>
      <div className={r.h}>{t('retT')}</div>
      <div className={r.hs}>{t('retS')}</div>
      <div className={r.card}>
        <div className={r.row}>
          <div className={r.grow}>
            <div className={r.l}>{t('retention')}</div>
            <div className={r.d}>{t('retentionD')}</div>
          </div>
          <select className={r.select} value={g.retention} onChange={(e) => put({ retention: e.target.value as Governance['retention'] })} aria-label={t('retention')}>
            {RETENTION.map((k) => (
              <option key={k} value={k}>
                {t(`ret.${k}`)}
              </option>
            ))}
          </select>
        </div>
        {toggleRow(t('noTrain'), null, g.no_external_train, (v) => put({ no_external_train: v }))}
        {toggleRow(t('anonymize'), null, g.anonymize_pii, (v) => put({ anonymize_pii: v }))}
        <div className={r.row}>
          <div className={r.grow}>
            <div className={r.l}>{t('residency')}</div>
            <div className={r.d}>{t('residencyD')}</div>
          </div>
          <select className={r.select} value={g.residency} onChange={(e) => put({ residency: e.target.value as Governance['residency'] })} aria-label={t('residency')}>
            {RESIDENCY.map((k) => (
              <option key={k} value={k}>
                {t(`res.${k}`)}
              </option>
            ))}
          </select>
        </div>
      </div>
    </>
  );
}

export function GovSection() {
  const q = useQuery(governanceQuery());
  return (
    <PageStates state={stateOf(q)} onRetry={() => void q.refetch()}>
      {q.data ? <Body g={q.data} /> : null}
    </PageStates>
  );
}
