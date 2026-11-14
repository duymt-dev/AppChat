// Chọn agent Cowork (TIP-023d §5.1, §6.3): danh tính là UUID; danh sách lấy từ agent_choices (phân trang, chỉ agent đang chạy + đã xuất
// bản). Chọn / bỏ chọn đi qua store của composer — đổi phiên / sang Chat bỏ chọn (assistant-store). API vẫn kiểm lại lúc gửi lượt.
'use client';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useAssistantUi } from '../../assistant-store';
import { agentChoicesQuery } from '../api';
import type { AgentChoice } from '../types';

export function useSelectedAgent(enabled = true) {
  const q = useInfiniteQuery({ ...agentChoicesQuery(), enabled });
  const agent = useAssistantUi((s) => s.agent);
  const set = useAssistantUi((s) => s.set);
  return {
    choices: q.data?.pages.flatMap((p) => p.data) ?? [],
    loading: q.isLoading,
    error: q.isError,
    more: q.hasNextPage ? () => void q.fetchNextPage() : null,
    selected: agent,
    pick: (a: AgentChoice) => set({ agent: { id: a.id, name: a.name }, pop: null }),
    clear: () => set({ agent: null, pop: null }),
  };
}
