// Nguồn đã kiểm của nháp AI hội thoại (TIP-020d §3.2): chỉ chi tiết hội thoại (GET /conversations/:id) chiếu `ai_draft_citations` — danh
// sách không mang (tránh phình payload / chiếu quyền nguồn cho cả trang). Chỉ tải khi hội thoại đang có nháp AI kèm tham chiếu run.
'use client';
import { useQuery } from '@tanstack/react-query';
import { conversationQuery } from '../api';
import type { Conversation } from '../types';

export function useDraftCitations(conv: Conversation) {
  const has = !!conv.ai_draft && !!conv.ai_draft_ref;
  const q = useQuery({ ...conversationQuery(conv.id), enabled: has && !conv.ai_draft_citations });
  if (!has) return undefined;
  const d = conv.ai_draft_citations ?? q.data?.ai_draft_citations;
  // Nháp ở chi tiết khác nháp đang hiện (thế hệ mới) → không gắn nguồn của nháp cũ.
  return d && (!q.data?.ai_draft_ref || q.data.ai_draft_ref.generation === conv.ai_draft_ref!.generation) ? d : undefined;
}
