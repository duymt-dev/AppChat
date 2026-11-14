// Trạng thái builder (prototype agbInit L8251): tạo mới / từ mẫu / từ bản nháp Trợ lý / sửa agent có sẵn; xuất bản qua action.
// useBuilderSeed chọn cấu hình ban đầu (chờ dữ liệu); useAgentBuilder giữ form, mount lại khi seed sẵn sàng.
'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAction } from '@/shared/actions/useAction';
import { usePinnedVersion } from '@/shared/actions/StaleVersionModal';
import { agentQuery, templatesQuery } from '../api';
import { useAgentsUi } from '../agents-store';
import { useAuthz } from '@/shared/authz/useCan';
import { useToolAllowed } from './useToolAllowed';
import type { AgentConfig, AgentTemplate } from '../types';

export const blankConfig = (): AgentConfig => ({
  name: '',
  emoji: '🤖',
  role: 'custom',
  role_label: '',
  persona: '',
  keywords: [],
  working_hours: 'always',
  weekly_schedule: null,
  language: 'vi',
  prompt: '',
  intents: [0, 2],
  model_tier: 'advanced',
  tools: ['conversation.set_status', 'conversation.assign', 'ticket.create', 'appointment.create'],
  channels: ['zalo_personal', 'webchat'],
  threshold: 70,
  handoff_to: 'staff',
  governance: { grounding: true, pii: true, override: true, audit: true },
  kb_scope: { folder_ids: [], tags: [] },
});

const CONFIG_KEYS = [...Object.keys(blankConfig()), 'template_id'] as (keyof AgentConfig)[];
const withConfig = (src: Partial<AgentConfig>): AgentConfig => ({
  ...blankConfig(),
  ...Object.fromEntries(CONFIG_KEYS.filter((k) => src[k] !== undefined).map((k) => [k, src[k]])),
});

/** Bản nháp "Từ mẫu" (D15): tên, vai trò, tool / ý định / mức AI / ngưỡng / prompt mặc định — tool ngoài quyền người tạo bị bỏ. */
export function fromTemplate(tpl: AgentTemplate, allowed: (actionId: string) => boolean): AgentConfig {
  const d = tpl.defaults;
  return withConfig({ name: tpl.name, role: tpl.role, role_label: tpl.tag, template_id: tpl.id, tools: d.tools.filter(allowed), intents: d.intents, model_tier: d.model_tier, threshold: d.threshold, prompt: d.prompt });
}

/** Cấu hình ban đầu của builder; null khi còn chờ agent / mẫu. `rowVersion` = version dòng lúc mở (sửa agent có sẵn — TIP-003e). */
export function useBuilderSeed(agentId?: string): { seed: AgentConfig | null; edit: boolean; rowVersion?: number } {
  const params = useSearchParams();
  const templateId = params.get('template');
  const fromAi = params.get('from') === 'ai';
  const [handoff] = useState(() => (fromAi ? useAgentsUi.getState().handoff : null));
  const existing = useQuery({ ...agentQuery(agentId ?? ''), enabled: !!agentId });
  const authz = useAuthz();
  const allowed = useToolAllowed();
  const templates = useQuery({ ...templatesQuery({ q: '', group: 'all', industry: 'all', name: 'all' }), enabled: !!templateId });
  const edit = !!agentId || !!templateId;
  if (agentId) return { seed: existing.data ? withConfig(existing.data) : null, edit, rowVersion: existing.data?.row_version };
  if (templateId) {
    const tpl = templates.data?.data.find((x) => x.id === templateId);
    return { seed: tpl && authz.data ? fromTemplate(tpl, allowed) : null, edit };
  }
  return { seed: handoff ? withConfig(handoff) : blankConfig(), edit };
}

/** `rowVersion` chốt lúc mở (TIP-003e); 409 STALE_VERSION → hộp xung đột chung, "Tải lại" lấy row_version mới, cấu hình đang sửa giữ nguyên. */
export function useAgentBuilder(seed: AgentConfig, agentId?: string, rowVersion?: number) {
  const router = useRouter();
  const [cfg, setCfg] = useState<AgentConfig>(seed);
  const ver = usePinnedVersion(rowVersion, agentQuery(agentId ?? '').queryKey, (d) => (d as { row_version?: number } | undefined)?.row_version);
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
      const ok = await update.run({ agent_id: agentId, patch: cfg, if_version: ver.ifVersion }, { silent: true, onStaleReload: ver.onStaleReload });
      if (!ok || !(await publish.run({ agent_id: agentId }))) return;
    } else if (!(await create.run(cfg))) return;
    close();
  };

  return { cfg, patch, toggleIn, save, close, saving: create.isPending || update.isPending || publish.isPending };
}
