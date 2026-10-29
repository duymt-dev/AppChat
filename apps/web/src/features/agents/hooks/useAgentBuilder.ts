// Trạng thái builder (prototype agbInit L8251): tạo mới / từ mẫu / từ bản nháp Trợ lý / sửa agent có sẵn; xuất bản qua action.
// useBuilderSeed chọn cấu hình ban đầu (chờ dữ liệu); useAgentBuilder giữ form, mount lại khi seed sẵn sàng.
'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAction } from '@/shared/actions/useAction';
import { agentQuery, templatesQuery } from '../api';
import { useAgentsUi } from '../agents-store';
import type { AgentConfig } from '../types';

export const blankConfig = (): AgentConfig => ({
  name: '',
  emoji: '🤖',
  language: 'vi',
  prompt: '',
  intents: [0, 2],
  model_tier: 'advanced',
  tools: ['end_conversation', 'assign', 'ticket', 'booking'],
  channels: ['zalo_personal', 'webchat'],
  threshold: 70,
  handoff_to: 'staff',
  governance: { grounding: true, pii: true, override: true, audit: true },
});

const CONFIG_KEYS = Object.keys(blankConfig()) as (keyof AgentConfig)[];
const withConfig = (src: Partial<AgentConfig>): AgentConfig => ({
  ...blankConfig(),
  ...Object.fromEntries(CONFIG_KEYS.filter((k) => src[k] !== undefined).map((k) => [k, src[k]])),
});

/** Cấu hình ban đầu của builder; null khi còn chờ agent / mẫu. */
export function useBuilderSeed(agentId?: string): { seed: AgentConfig | null; edit: boolean } {
  const params = useSearchParams();
  const templateId = params.get('template');
  const fromAi = params.get('from') === 'ai';
  const [handoff] = useState(() => (fromAi ? useAgentsUi.getState().handoff : null));
  const existing = useQuery({ ...agentQuery(agentId ?? ''), enabled: !!agentId });
  const templates = useQuery({ ...templatesQuery({ q: '', group: 'all', industry: 'all', name: 'all' }), enabled: !!templateId });
  const edit = !!agentId || !!templateId;
  if (agentId) return { seed: existing.data ? withConfig(existing.data) : null, edit };
  if (templateId) {
    const tpl = templates.data?.data.find((x) => x.id === templateId);
    return { seed: tpl ? withConfig({ name: tpl.name, template_id: tpl.id }) : null, edit };
  }
  return { seed: handoff ? withConfig(handoff) : blankConfig(), edit };
}

export function useAgentBuilder(seed: AgentConfig, agentId?: string) {
  const router = useRouter();
  const [cfg, setCfg] = useState<AgentConfig>(seed);
  const create = useAction<{ agent_id: string; version: number }>('agent.create_and_publish');
  const update = useAction('agent.update');
  const publish = useAction('agent.publish');

  const patch = (p: Partial<AgentConfig>) => setCfg((c) => ({ ...c, ...p }));
  const toggleIn = <K extends 'intents' | 'tools' | 'channels'>(k: K, v: AgentConfig[K][number]) =>
    setCfg((c) => {
      const arr = c[k] as (typeof v)[];
      return { ...c, [k]: arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v] };
    });

  const close = () => {
    useAgentsUi.getState().set({ handoff: null });
    router.push('/agents');
  };
  const save = async () => {
    if (!cfg.name.trim()) return;
    if (agentId) {
      const ok = await update.run({ agent_id: agentId, patch: cfg }, { silent: true });
      if (!ok || !(await publish.run({ agent_id: agentId }))) return;
    } else if (!(await create.run(cfg))) return;
    close();
  };

  return { cfg, patch, toggleIn, save, close, saving: create.isPending || update.isPending || publish.isPending };
}
