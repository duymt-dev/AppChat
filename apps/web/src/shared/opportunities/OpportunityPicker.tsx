// Ô "Thuộc cơ hội" (TIP-026c §5.2, D60 #11 — không bắt buộc) — form Báo giá (prototype L5993–6006: khung brand, "+ Tạo cơ hội mới", khi
// gửi: giai đoạn → Báo giá 70%, hai cờ cập nhật giá trị / việc theo dõi +2 ngày, cảnh báo "không gắn") và form Lịch hẹn (L4528 + ghi chú
// demo hoàn thành → gợi ý). Chỉ cơ hội chưa Thua của đúng khách (server kiểm lại họ khách → 422). "Không gắn" = null.
'use client';
import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { createStyles } from 'antd-style';
import { color, font, radius } from '@appchat/ui';
import { OPPORTUNITY_PROBABILITY } from '@appchat/shared';
import { useCan } from '../authz/useCan';
import { opportunitiesQuery } from './api';
import { OpportunityQuickAdd } from './OpportunityQuickAdd';
import { stageColor, stageTint } from './types';

const useStyles = createStyles(({ css }) => ({
  box: css`
    margin-bottom: 16px;
    border: 1.5px solid ${color.brand};
    border-radius: ${radius.r12}px;
    padding: 12px;
    background: ${color.oppAddBg};
  `,
  boxSoft: css`
    border: 1px solid ${color.oppLinkLine};
    background: ${color.oppLinkBg};
  `,
  head: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
    & label {
      font-size: ${font.scale.s13}px;
      font-weight: ${font.weight.bold};
      color: ${color.text2};
    }
  `,
  add: css`
    margin-left: auto;
    border: none;
    background: none;
    padding: 0;
    font-family: inherit;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.semibold};
    color: ${color.brandInk};
    cursor: pointer;
  `,
  select: css`
    width: 100%;
    height: 38px;
    border: 1px solid ${color.oppPickLine};
    border-radius: ${radius.r8}px;
    padding: 0 8px;
    font-size: ${font.scale.s14}px;
    font-family: inherit;
    background: ${color.surface};
    box-sizing: border-box;
  `,
  flow: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 8px;
    font-size: ${font.scale.s13}px;
    color: ${color.text2};
    flex-wrap: wrap;
    & > span:first-child {
      font-weight: ${font.weight.bold};
      color: ${color.text3};
    }
  `,
  chip: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    border-radius: ${radius.r6}px;
    padding: 2px 8px;
  `,
  check: css`
    display: flex;
    gap: 8px;
    align-items: center;
    margin-top: 8px;
    font-size: ${font.scale.s13}px;
    color: ${color.text};
    cursor: pointer;
    & input {
      accent-color: ${color.brand};
    }
  `,
  note: css`
    margin-top: 8px;
    font-size: ${font.scale.s12}px;
    line-height: 1.5;
    color: ${color.pillText};
  `,
  warn: css`
    margin-top: 8px;
    font-size: ${font.scale.s13}px;
    color: ${color.amberText};
    background: ${color.oppNextWarnBg};
    border-radius: ${radius.r8}px;
    padding: 6px 8px;
  `,
}));

export interface QuoteOppFlags {
  sync: boolean;
  follow: boolean;
}

interface Props {
  contactId: string;
  value: string | null;
  onChange: (id: string | null) => void;
  variant: 'quote' | 'appointment';
  flags?: QuoteOppFlags;
  onFlags?: (f: QuoteOppFlags) => void;
}

export function OpportunityPicker({ contactId, value, onChange, variant, flags, onFlags }: Props) {
  const t = useTranslations('common.opportunity');
  const { styles, cx } = useStyles();
  const canAdd = useCan('crm.edit');
  const [adding, setAdding] = useState(false);
  const q = useInfiniteQuery({ ...opportunitiesQuery(contactId), enabled: !!contactId });
  const opts = (q.data?.pages.flatMap((p) => p.data) ?? []).filter((o) => o.stage !== 'lost');
  const cur = opts.find((o) => o.id === value);
  const quote = variant === 'quote';
  return (
    <div className={cx(styles.box, !quote && styles.boxSoft)} data-testid="opp-picker">
      <div className={styles.head}>
        <label htmlFor={`opp-pick-${variant}`}>{t('belongs')}</label>
        {canAdd && contactId ? (
          <button type="button" className={styles.add} onClick={() => setAdding(true)} data-testid="opp-picker-add">
            {t('createNew')}
          </button>
        ) : null}
      </div>
      {adding ? (
        <OpportunityQuickAdd
          contactId={contactId}
          onDone={(id) => {
            setAdding(false);
            if (id) onChange(id);
          }}
        />
      ) : null}
      <select id={`opp-pick-${variant}`} className={styles.select} value={value ?? ''} disabled={!contactId} onChange={(e) => onChange(e.target.value || null)} data-testid="opp-picker-select">
        <option value="">{t('noLink')}</option>
        {opts.map((o) => (
          <option key={o.id} value={o.id}>
            {`${o.title} · ${t(`stage.${o.stage}`)} · ${OPPORTUNITY_PROBABILITY[o.stage]}%`}
          </option>
        ))}
      </select>
      {quote && cur && flags && onFlags ? (
        <div>
          <div className={styles.flow}>
            <span>{t('onSend')}</span>
            <span className={styles.chip} style={{ color: stageColor(cur.stage), background: stageTint(cur.stage) }}>
              {`${t(`stage.${cur.stage}`)} · ${OPPORTUNITY_PROBABILITY[cur.stage]}%`}
            </span>
            <span aria-hidden="true">→</span>
            <span className={styles.chip} style={{ color: stageColor('quote'), background: stageTint('quote') }}>
              {`${t('stage.quote')} · ${OPPORTUNITY_PROBABILITY.quote}%`}
            </span>
          </div>
          <label className={styles.check}>
            <input type="checkbox" checked={flags.sync} onChange={(e) => onFlags({ ...flags, sync: e.target.checked })} data-testid="opp-flag-sync" />
            {t('flagSync')}
          </label>
          <label className={styles.check}>
            <input type="checkbox" checked={flags.follow} onChange={(e) => onFlags({ ...flags, follow: e.target.checked })} data-testid="opp-flag-follow" />
            {t('flagFollow')}
          </label>
          <div className={styles.note}>{t.rich('quoteRule', { b: (c) => <b>{c}</b> })}</div>
        </div>
      ) : null}
      {quote && !value ? <div className={styles.warn} data-testid="opp-picker-warn">{t('noLinkWarn')}</div> : null}
      {!quote && value ? <div className={styles.note}>{t('demoNote')}</div> : null}
    </div>
  );
}
