// Hàng chờ duyệt tri thức (TIP-043): danh sách theo trạng thái (cursor), số chờ duyệt cho nav, duyệt / từ chối qua useAction. Lỗi nghiệp
// vụ: 409 (người khác vừa duyệt / version lệch) → báo + tải lại hàng chờ; 422 sensitive_data → báo trường còn dữ liệu riêng (form giữ nguyên).
'use client';
import { App } from 'antd';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import type { ApiRequestError } from '@appchat/shared';
import { useAction } from '@/shared/actions/useAction';
import { useCan } from '@/shared/authz/useCan';
import { kbPendingCountQuery, kbSuggestionsQuery, type KbSuggestionStatus } from '../api/kb-suggestions';

export function useKbSuggestions(status: KbSuggestionStatus, enabled = true) {
  const q = useInfiniteQuery({ ...kbSuggestionsQuery(status), enabled });
  return { ...q, items: q.data?.pages.flatMap((p) => p.data) ?? [] };
}

export function useKbPendingCount() {
  const can = useCan('kb.manage');
  return useQuery({ ...kbPendingCountQuery(), enabled: can }).data ?? 0;
}

export interface ReviewInput {
  suggestion_id: string;
  if_version: number;
  question?: string;
  answer?: string;
  folder_id?: string;
  visibility?: 'public' | 'internal';
}

export function useKbReview(onField: (field: 'question' | 'answer', code: string) => void) {
  const t = useTranslations('settings.rag.review');
  const { message } = App.useApp();
  const qc = useQueryClient();
  const approve = useAction('kb.suggestion.approve');
  const reject = useAction('kb.suggestion.reject');
  const onError = (e: ApiRequestError) => {
    const f = e.error.fields ?? {};
    if (e.error.code === 'STALE_VERSION' || e.error.code === 'CONFLICT') {
      message.warning(t('conflict'));
      void qc.invalidateQueries({ queryKey: ['kb_suggestions'] });
      return true;
    }
    const field = (['question', 'answer'] as const).find((k) => f[k]);
    if (field) {
      onField(field, String(f[field]));
      return true;
    }
    return false;
  };
  return {
    busy: approve.isPending || reject.isPending,
    approve: (i: ReviewInput) => approve.run(i, { onError }),
    reject: (i: { suggestion_id: string; if_version: number; reason?: string }) => reject.run(i, { onError }),
  };
}
