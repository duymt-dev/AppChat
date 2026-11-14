// Thêm nhanh cơ hội (TIP-026c §5.1) — prototype L2389–2393: tên + giá trị (triệu) → `contact_opportunity.create` vào Lead mới. Không có
// quote.create → ẩn ô giá trị (server 403 khi ghi tiền). Trợ lý `prefill:opportunity.form` điền sẵn; người dùng vẫn bấm Lưu.
'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { createStyles } from 'antd-style';
import { color, font, radius } from '@appchat/ui';
import { useCan } from '../authz/useCan';
import { useOpportunityActions } from './useOpportunityActions';
import { millionsToVnd } from './types';

const input = `height: 34px; border: 1px solid ${color.border}; border-radius: ${radius.r8}px; padding: 0 8px; font-size: ${font.scale.s14}px; font-family: inherit; box-sizing: border-box; outline: none; width: 100%;`;
const useStyles = createStyles(({ css }) => ({
  box: css`
    margin: 8px 0 4px;
    border: 1px dashed ${color.oppAddLine};
    background: ${color.oppAddBg};
    border-radius: ${radius.r10}px;
    padding: 8px;
  `,
  head: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    color: ${color.text2};
    margin-bottom: 6px;
  `,
  input: css`
    ${input}
  `,
  grow: css`
    flex: 1;
  `,
  row: css`
    display: flex;
    gap: 6px;
    margin-top: 6px;
  `,
  save: css`
    font-family: inherit;
    height: 34px;
    padding: 0 12px;
    border: none;
    border-radius: ${radius.r8}px;
    background: ${color.brand};
    color: ${color.white};
    font-weight: ${font.weight.bold};
    font-size: ${font.scale.s13}px;
    cursor: pointer;
    &:disabled {
      opacity: 0.5;
      cursor: default;
    }
  `,
  cancel: css`
    font-family: inherit;
    height: 34px;
    padding: 0 8px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    background: ${color.surface};
    font-weight: ${font.weight.semibold};
    font-size: ${font.scale.s13}px;
    cursor: pointer;
  `,
  hint: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text3};
    margin-top: 6px;
  `,
  err: css`
    font-size: ${font.scale.s12}px;
    color: ${color.hotText};
    margin-top: 4px;
  `,
}));

const vndToMillions = (v: unknown) => (typeof v === 'string' && /^\d+$/.test(v) ? String(Number(v) / 1_000_000).replace('.', ',') : '');

export function OpportunityQuickAdd({ contactId, values, onDone }: { contactId: string; values?: Record<string, unknown>; onDone: (id?: string) => void }) {
  const t = useTranslations('common.opportunity');
  const { styles } = useStyles();
  const canMoney = useCan('quote.create');
  const act = useOpportunityActions();
  const [title, setTitle] = useState(typeof values?.title === 'string' ? values.title : '');
  const [amount, setAmount] = useState(vndToMillions(values?.amount_vnd));
  const vnd = canMoney ? millionsToVnd(amount) : null;
  const ok = !!title.trim() && vnd !== undefined;
  const save = async () => {
    if (!ok) return;
    const res = await act.create(contactId, title, vnd ?? null);
    if (res) onDone((res.result as { opportunity_id?: string } | undefined)?.opportunity_id);
  };
  return (
    <div className={styles.box} data-testid="opp-quick-add">
      <div className={styles.head}>{t('addTitle')}</div>
      <input className={styles.input} maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('namePh')} aria-label={t('name')} autoFocus data-testid="opp-new-name" />
      <div className={styles.row}>
        {canMoney ? <input className={styles.input} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={t('valuePh')} aria-label={t('valuePh')} data-testid="opp-new-value" /> : <span className={styles.grow} />}
        <button type="button" className={styles.save} disabled={!ok || act.pending} onClick={() => void save()} data-testid="opp-new-save">
          {t('save')}
        </button>
        <button type="button" className={styles.cancel} onClick={() => onDone()}>
          {t('cancel')}
        </button>
      </div>
      {vnd === undefined ? <div className={styles.err}>{t('valueInvalid')}</div> : null}
      <div className={styles.hint}>{t.rich('addHint', { b: (c) => <b>{c}</b> })}</div>
    </div>
  );
}
