// Bảng "AI đã học — chờ duyệt" trong Dữ liệu RAG (TIP-043, rag §9, PD-013): tab Chờ duyệt / Đã duyệt / Đã từ chối, thẻ hỏi–đáp đã che
// dữ liệu khách, bấm mở drawer duyệt. Đề xuất chờ duyệt KHÔNG gắn nhãn "Đã học"; đã duyệt hiện trạng thái nạp thật (đang học / đã học /
// lỗi). Tải thêm theo cursor. Chỉ người có `kb.manage` thấy (RagSection không hiện mục khi thiếu quyền; server vẫn chặn).
'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { KbSuggestionDto } from '@appchat/shared';
import { PageStates, stateOf } from '@/shared/states/PageStates';
import { useFmt } from '@/shared/i18n/useFmt';
import { useRagStyles } from '../styles/rag.styles';
import { useRagReviewStyles } from '../styles/rag-review.styles';
import { useKbSuggestions } from '../hooks/useKbSuggestions';
import type { KbSuggestionStatus } from '../api/kb-suggestions';
import type { KbFolder } from '../types';
import { KbSuggestionReview } from './KbSuggestionReview';

const TABS: KbSuggestionStatus[] = ['pending', 'approved', 'rejected'];

function chip(s: KbSuggestionDto): string {
  if (s.status !== 'approved') return s.status;
  return s.source_status === 'ready' ? 'learned' : s.source_status === 'failed' ? 'failed' : 'learning';
}

export function KbSuggestionsPanel({ folders }: { folders: KbFolder[] }) {
  const t = useTranslations('settings.rag.review');
  const fmt = useFmt();
  const rag = useRagStyles().styles;
  const { styles: r, cx } = useRagReviewStyles();
  const [tab, setTab] = useState<KbSuggestionStatus>('pending');
  const [open, setOpen] = useState<KbSuggestionDto | null>(null);
  const q = useKbSuggestions(tab);
  return (
    <div className={rag.table} data-testid="st-kbsug">
      <div className={rag.tHead}>
        <div className={rag.tT}>{t('heading')}</div>
      </div>
      <div className={r.tabs} role="tablist" aria-label={t('heading')}>
        {TABS.map((k) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} className={cx(r.tab, tab === k && r.tabOn)} onClick={() => setTab(k)} data-testid={`st-kbsug-tab-${k}`}>
            {t(`tab.${k}`)}
          </button>
        ))}
      </div>
      <PageStates state={stateOf(q)} onRetry={() => void q.refetch()}>
        {q.items.map((s) => (
          <button key={s.id} type="button" className={r.item} onClick={() => setOpen(s)} data-sug={s.id}>
            <div className={r.body}>
              <div className={r.q}>{s.question}</div>
              <div className={r.a}>{s.answer}</div>
              <div className={r.meta}>{fmt.date(s.created_at)}</div>
            </div>
            <span className={cx(r.chip, chip(s) === 'learned' && r.chipOk)} data-testid="st-kbsug-chip">
              {t(`chip.${chip(s)}`)}
            </span>
          </button>
        ))}
        {q.items.length === 0 && !q.isLoading ? <div className={rag.empty}>{t(`empty.${tab}`)}</div> : null}
        {q.hasNextPage ? (
          <button type="button" className={r.more} onClick={() => void q.fetchNextPage()} disabled={q.isFetchingNextPage} data-testid="st-kbsug-more">
            {t('more')}
          </button>
        ) : null}
      </PageStates>
      {open ? <KbSuggestionReview key={`${open.id}:${open.version}`} s={open} folders={folders} onClose={() => setOpen(null)} /> : null}
    </div>
  );
}
