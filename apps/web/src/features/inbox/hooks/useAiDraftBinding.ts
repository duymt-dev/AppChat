// Tham chiếu nháp AI trong ô soạn (TIP-020c §3.8): dùng nháp bàn giao / gợi ý copilot → giữ `ai_draft_ref` (mờ, server kiểm) để `message.send`
// mang theo; sửa chữ VẪN giữ (nội dung còn phụ thuộc nguồn) cho tới khi người bỏ nháp (xoá trắng ô soạn) hoặc gửi xong; đổi hội thoại / workspace
// xoá (store `select`). Không phải trích dẫn / không cấp quyền — chỉ để nguồn bị thu hồi thì gửi bị từ chối an toàn (409).
'use client';
import { App } from 'antd';
import { useTranslations } from 'next-intl';
import type { ApiRequestError } from '@appchat/shared';
import { useInboxUi } from '../inbox-store';
import type { AiDraftRef } from '../types';

export function useAiDraftBinding() {
  const ref = useInboxUi((s) => s.draftRef);
  const t = useTranslations('inbox.chat.aiDraftRef');
  const { message } = App.useApp();
  return {
    ref,
    /** Đưa nháp AI vào ô soạn kèm tham chiếu (không ref → nháp tay thường). */
    use: (text: string, r: AiDraftRef | null | undefined) => useInboxUi.getState().set({ draft: text, draftRef: r ?? null }),
    /** Sửa chữ: ô soạn trống = bỏ nháp AI (tin tay mới); còn chữ = giữ phụ thuộc. */
    edit: (text: string) => useInboxUi.getState().set(text.trim() ? { draft: text } : { draft: text, draftRef: null }),
    clear: () => useInboxUi.getState().set({ draftRef: null }),
    /** Input gửi kèm tham chiếu khi có. */
    withRef: <T extends object>(input: T, r: AiDraftRef | null = ref): T & { ai_draft_ref?: AiDraftRef } => (r ? { ...input, ai_draft_ref: r } : input),
    /** 409 `ai_draft` (nháp cũ / nguồn đã thu hồi): báo lý do an toàn, bỏ tham chiếu — chữ trong ô soạn giữ nguyên để người tự sửa. */
    onError: (e: ApiRequestError): boolean => {
      const why = e.error.fields?.ai_draft;
      if (!why) return false;
      useInboxUi.getState().set({ draftRef: null });
      void message.error(t(why === 'knowledge_revoked' ? 'revoked' : 'stale'));
      return true;
    },
  };
}
