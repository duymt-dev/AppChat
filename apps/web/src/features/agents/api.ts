// Đọc AI Agents (Blueprint §4.4 ai). Ghi qua useAction (agent.*).
import { queryOptions } from '@tanstack/react-query';
import { transport } from '@/shared/api/client';
import type { ChannelBindingPreviewDto } from '@appchat/shared';
import type { Agent, AgentTemplate, AgentVersion, AgentsMeta, TemplateFilter } from './types';

export const agentsQuery = () =>
  queryOptions({ queryKey: ['agents', 'list'], queryFn: () => transport.get<{ data: Agent[] }>('/agents') });

export const agentQuery = (id: string) =>
  queryOptions({ queryKey: ['agents', 'one', id], queryFn: () => transport.get<Agent>(`/agents/${id}`) });

export const versionsQuery = (id: string) =>
  queryOptions({ queryKey: ['agents', 'versions', id], queryFn: () => transport.get<{ data: AgentVersion[] }>(`/agents/${id}/versions`) });

/** Meta Builder: danh mục tĩnh + gợi ý Trợ lý tính từ agent thật — khoá dưới `agents` để mọi action `agent.*` làm mới. */
export const metaQuery = () => queryOptions({ queryKey: ['agents', 'meta'], queryFn: () => transport.get<AgentsMeta>('/agents/meta') });

export const templatesQuery = (f: TemplateFilter) =>
  queryOptions({
    queryKey: ['agent-templates', f],
    queryFn: () =>
      transport.get<{ data: AgentTemplate[]; total: number }>('/agent-templates', Object.fromEntries(Object.entries(f).filter(([, v]) => v && v !== 'all'))),
    placeholderData: (prev) => prev,
  });

/** Gán tài khoản kênh hiện tại theo loại kênh của agent (TIP-022b E) — cảnh báo trước khi xuất bản; xuất bản KHÔNG đổi gán. */
export const bindingPreviewQuery = (types: readonly string[]) =>
  queryOptions({
    queryKey: ['agents', 'binding-preview', [...types].sort().join(',')],
    queryFn: () => transport.get<ChannelBindingPreviewDto>('/agents/channel-binding-preview', { types: [...types].sort().join(',') }),
    enabled: types.length > 0,
  });
