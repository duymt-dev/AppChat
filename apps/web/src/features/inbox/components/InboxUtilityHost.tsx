// Host kỹ năng tiện ích AI của Hộp thư (TIP-019c §4.2): gắn dưới ô soạn, ngoài popover ＋ — đóng menu không mất form. Gắn ngữ cảnh hội
// thoại + khách đang mở; đổi hội thoại → UtilityHost tự đóng và bỏ kết quả cũ.
'use client';
import { useCallback } from 'react';
import { UtilityHost } from '@/shared/ai-utilities';
import { useInboxUi } from '../inbox-store';
import type { Conversation } from '../types';

export function InboxUtilityHost({ conv }: { conv: Conversation }) {
  const selected = useInboxUi((s) => s.utility);
  const close = useCallback(() => useInboxUi.getState().set({ utility: null }), []);
  return <UtilityHost selected={selected} ctx={{ conversationId: conv.id, contactId: conv.contact_id }} onClose={close} />;
}
