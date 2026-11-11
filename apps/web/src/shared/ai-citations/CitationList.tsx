// Khối "Nguồn" của câu trả lời AI (TIP-020d §3) — dùng chung cho nháp / gợi ý Hộp thư và chi tiết run (nhật ký AI). Chỉ chữ (không HTML /
// không link do model tạo); nhãn không phải quyền tải. `original_draft` = nguồn của bản nháp AI GỐC (chữ đang sửa không được xác nhận là có
// nguồn); `unavailable` = nguồn đã thay đổi / không còn quyền — không đoán tên. Không gọi model / không ghi khi mở.
'use client';
import { useTranslations } from 'next-intl';
import { createStyles } from 'antd-style';
import { color, font, radius } from '@appchat/ui';
import type { AiCitations } from './types';

const useStyles = createStyles(({ css }) => ({
  box: css`
    margin-top: 8px;
    padding: 8px 12px;
    border-radius: ${radius.r8}px;
    background: ${color.brandBgSoft};
    font-size: ${font.scale.s12}px;
    color: ${color.text3};
  `,
  head: css`
    font-weight: ${font.weight.bold};
    color: ${color.text};
    margin-bottom: 4px;
  `,
  list: css`
    margin: 0;
    padding-left: 16px;
  `,
  item: css`
    overflow-wrap: anywhere;
  `,
  quote: css`
    color: ${color.text4};
  `,
}));

/** Đoạn câu trả lời được nguồn chống đỡ (theo điểm mã — khớp vị trí server). */
const claimOf = (text: string | undefined, s: number, e: number) => (text ? Array.from(text).slice(s, e).join('') : '');

export function CitationList({ citations, text, testId = 'ai-citations' }: { citations: AiCitations | null | undefined; text?: string; testId?: string }) {
  const t = useTranslations('common.citations');
  const { styles } = useStyles();
  if (!citations || citations.state === 'none') return null;
  const head = citations.state === 'original_draft' ? t('originalDraft') : citations.state === 'unavailable' ? t('unavailable') : t('title');
  return (
    <section className={styles.box} data-testid={testId} data-state={citations.state} aria-label={head}>
      <div className={styles.head}>{head}</div>
      {citations.state === 'unavailable' ? null : (
        <ol className={styles.list}>
          {citations.entries.map((c, i) => (
            <li key={`${c.source_id}:${c.claim_start}:${i}`} className={styles.item} data-testid="ai-citation">
              {c.name ?? t('restricted')}
              {c.heading ? ` › ${c.heading}` : ''}
              {citations.state === 'validated' && text ? <span className={styles.quote}>{` — “${claimOf(text, c.claim_start, c.claim_end)}”`}</span> : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
