// Ngữ cảnh màn AI Agents cho Trợ lý (REQ-E06, TIP-023c G2.6): danh sách → chỉ route; builder đang sửa → agent id. Server kiểm lại bằng
// action get của thực thể — `agent` chưa có `agent.get` nên server chỉ giữ route (genui/context.ts), id không vào prompt khi chưa kiểm được.
'use client';
import { useRegisterScreenContext } from '@/shared/assistant/screen-context';

export function useAssistantContext(agentId?: string | null) {
  useRegisterScreenContext({ module: 'agents', route: agentId ? `/agents/${agentId}` : '/agents', entity: 'agent', id: agentId ?? null, selection: [] });
}
