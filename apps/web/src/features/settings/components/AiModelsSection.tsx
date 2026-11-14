// Mục AI Models — prototype L6878–6903, đổi theo D29: thẻ là **mức AI** (Tiêu chuẩn / Nâng cao / Tối đa, credit / 1K token) thay tên model;
// "Phân bổ theo task" chọn mức; "Giới hạn sử dụng": ngân sách tháng (cảnh báo ≥80%) + giới hạn token / phút mỗi agent. Bỏ "Tự động chuyển
// model rẻ khi hết hạn mức" (prototype-parity §6). Mức bị khoá theo gói → "Nâng cấp để mở khoá" mở Gói & thanh toán. Ghi: ai_settings.update.
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Icon } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { PageStates, stateOf } from '@/shared/states/PageStates';
import { useRowsStyles } from '../styles/rows.styles';
import { useAiModelsStyles } from '../styles/ai-models.styles';
import { aiSettingsQuery } from '../api';
import type { AiSettings, AiTier } from '../types';

const BILLING = '/settings/billing';
const THOUSANDS = /\B(?=(\d{3})+(?!\d))/g;
const COMMA = ',';
const VND = '₫';
const num = (s: string) => Number(s.replace(/\D/g, '')) || 0;
const group = (n: number) => String(n).replace(THOUSANDS, COMMA);

function Body({ a }: { a: AiSettings }) {
  const t = useTranslations('settings.aiModels');
  const tt = useTranslations('agents.tier');
  const router = useRouter();
  const r = useRowsStyles().styles;
  const { styles, cx } = useAiModelsStyles();
  const save = useAction('ai_settings.update');
  const [budget, setBudget] = useState(group(a.budget));
  const [rate, setRate] = useState(group(a.rate_limit));
  const put = (p: Parameters<typeof save.run>[0]) => void save.run(p, { silent: true });
  const usable = a.tiers.filter((x) => !x.locked).map((x) => x.key);
  return (
    <>
      <div className={r.h}>{t('defaultT')}</div>
      <div className={r.hs}>{t('defaultS')}</div>
      <div className={styles.cards}>
        {a.tiers.map((x) => {
          const on = a.default_tier === x.key;
          return (
            <div key={x.key} className={cx(styles.card, on && styles.cardOn)} data-tier={x.key}>
              <div className={styles.top}>
                <span className={cx(styles.ic, on && styles.icOn)}>
                  <Icon name="ic-spark" size={18} color="currentColor" />
                </span>
                <div className={r.grow}>
                  <div className={styles.nameRow}>
                    <span className={styles.name}>{tt(x.key)}</span>
                    {on ? <span className={styles.badge}>{t('badge.using')}</span> : x.badge === 'hot' ? <span className={styles.badge}>{t('badge.hot')}</span> : null}
                  </div>
                  <div className={styles.desc}>{t(`desc.${x.key}`)}</div>
                  <div className={styles.price}>{t('price', { n: x.credits })}</div>
                </div>
              </div>
              <button
                type="button"
                className={cx(styles.btn, !on && !x.locked && styles.btnPrimary)}
                onClick={() => (x.locked ? router.push(BILLING) : on ? undefined : put({ default_tier: x.key }))}
                disabled={on}
                data-testid={`st-ai-tier-${x.key}`}
              >
                {t(x.locked ? 'unlock' : on ? 'current' : 'use')}
              </button>
            </div>
          );
        })}
      </div>
      <div className={r.h}>{t('tasksT')}</div>
      <div className={r.hs}>{t('tasksS')}</div>
      <div className={r.card}>
        {a.tasks.map((x) => (
          <div key={x.key} className={r.row}>
            <div className={cx(r.grow, r.l, r.lMed)}>{t(`task.${x.key}`)}</div>
            <select className={r.select} value={x.tier} onChange={(e) => put({ tasks: { [x.key]: e.target.value as AiTier } })} aria-label={t(`task.${x.key}`)} data-testid={`st-ai-task-${x.key}`}>
              {usable.map((k) => (
                <option key={k} value={k}>
                  {tt(k)}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
      <div className={cx(r.h, r.hOnly)}>{t('limitsT')}</div>
      <div className={r.card}>
        <div className={r.row}>
          <div className={r.grow}>
            <div className={r.l}>{t('budget')}</div>
            <div className={r.d}>{t('budgetD')}</div>
          </div>
          <div className={r.pair}>
            <input
              className={cx(r.input, r.right)}
              value={budget}
              inputMode="numeric"
              onChange={(e) => setBudget(group(num(e.target.value)))}
              onBlur={() => num(budget) !== a.budget && put({ budget: num(budget) })}
              aria-label={t('budget')}
              data-testid="st-ai-budget"
            />
            <span className={r.unit}>{VND}</span>
          </div>
        </div>
        <div className={r.row}>
          <div className={r.grow}>
            <div className={r.l}>{t('rate')}</div>
            <div className={r.d}>{t('rateD')}</div>
          </div>
          <input
            className={r.input}
            value={rate}
            inputMode="numeric"
            onChange={(e) => setRate(group(num(e.target.value)))}
            onBlur={() => num(rate) !== a.rate_limit && put({ rate_limit: Math.min(Math.max(num(rate), 1), 100_000) })}
            aria-label={t('rate')}
          />
        </div>
      </div>
    </>
  );
}

export function AiModelsSection() {
  const q = useQuery(aiSettingsQuery());
  return (
    <PageStates state={stateOf(q)} onRetry={() => void q.refetch()}>
      {q.data ? <Body a={q.data} /> : null}
    </PageStates>
  );
}
