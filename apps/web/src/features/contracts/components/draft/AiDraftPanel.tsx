// "AI soạn" trong form tạo hợp đồng (TIP-030b spec 18 — nút AI soạn trong drawer tạo; prototype không có → khung tối thiểu theo pattern sẵn
// có, gap-filling §2). Hai bước rõ ràng: "Soạn đề xuất" (một lượt AI, có tính credit) → xem đề xuất (giá theo danh mục, dòng ngoài danh mục
// đánh dấu, điều khoản gợi ý) → "Tạo nháp từ đề xuất" (không gọi AI). Nháp tạo xong mở chi tiết; gợi ý phải Giữ / Bỏ trước khi trình duyệt.
'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useFmt } from '@/shared/i18n/useFmt';
import { useDraftStyles } from '../../styles/draft.styles';
import { useContractFormStyles } from '../../styles/form.styles';
import { useContractDraft } from '../../hooks/useContractDraft';
import type { ContractKind } from '../../types';

export function AiDraftPanel({ contactId, kind, quoteId, onCreated }: { contactId: string; kind: ContractKind; quoteId?: string; onCreated: (id: string) => void }) {
  const t = useTranslations('contracts.draft');
  const fmt = useFmt();
  const { styles, cx } = useDraftStyles();
  const { styles: f } = useContractFormStyles();
  const [brief, setBrief] = useState('');
  const x = useContractDraft();
  const p = x.proposal;
  const ready = !!contactId && brief.trim().length > 0;
  return (
    <div className={styles.panel} data-testid="ct-ai-draft">
      <div className={styles.head}>
        <span>{t('title')}</span>
      </div>
      <div className={styles.hint}>{t('hint')}</div>
      <textarea
        className={cx(f.input, f.area)}
        value={brief}
        maxLength={12_000}
        placeholder={t('briefPh')}
        onChange={(e) => {
          setBrief(e.target.value);
          if (p) x.reset();
        }}
        data-testid="ct-ai-brief"
      />
      <div className={styles.row}>
        <button type="button" className={styles.btn} disabled={!ready || x.preparing} onClick={() => void x.ask({ contact_id: contactId, kind, brief, quote_id: quoteId })} data-testid="ct-ai-prepare">
          {x.preparing ? t('preparing') : t('prepare')}
        </button>
        {!contactId ? <span className={styles.hint}>{t('needContact')}</span> : null}
      </div>
      {x.error ? (
        <div className={styles.err} data-testid="ct-ai-err">
          {t(x.error === 'credit' ? 'err.credit' : x.error === 'not_found' ? 'err.not_found' : 'err.failed')}
        </div>
      ) : null}
      {p ? (
        <div data-testid="ct-ai-proposal">
          <ul className={styles.lines}>
            <li>
              <span>{t('fTitle')}</span>
              <b>{p.title}</b>
            </li>
            {p.lines.map((l, i) => (
              <li key={i} data-testid="ct-ai-line">
                <span>
                  {`${l.name} × ${l.qty}`}
                  {l.off_catalog ? <span className={styles.off}>{` · ${t('offCatalog')}`}</span> : null}
                </span>
                <b>{fmt.money(l.unit_price)}</b>
              </li>
            ))}
            <li>
              <span>{t('fValue')}</span>
              <b data-testid="ct-ai-value">{fmt.money(p.value)}</b>
            </li>
            {p.start_date && p.end_date ? (
              <li>
                <span>{t('fTerm')}</span>
                <b>{`${fmt.date(p.start_date)} → ${fmt.date(p.end_date)}`}</b>
              </li>
            ) : null}
          </ul>
          {p.suggestions.length ? <div className={styles.hint}>{t('suggestions', { n: p.suggestions.length })}</div> : null}
          <div className={styles.row}>
            <button
              type="button"
              className={cx(styles.btn, styles.primary)}
              disabled={x.creating}
              onClick={() => void x.accept().then((r) => r && onCreated(r.result.contract_id))}
              data-testid="ct-ai-create"
            >
              {t('create')}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
