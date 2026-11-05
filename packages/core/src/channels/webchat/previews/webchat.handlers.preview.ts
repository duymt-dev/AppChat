// Preview widget chat website (TIP-023b R2.8, risk config): lần đầu / bật lại tài khoản đã ngắt → widget mới (+ tính hạn mức kênh ở execute);
// còn lại → trước / sau chỉ trường đổi (bật / tắt, tên, lời chào, màu, domain, agent, form trước chat, cấu hình AI). Agent lạ → 404 như
// execute. Chỉ đọc.
import { serverMessages } from '@appchat/shared';
import type { ActionInput, ActionPreview, webchatUpdateWidget } from '@appchat/actions';
import type { TenantTx } from '../../../kernel/actions/action-context';
import { created, preview, updated } from '../../../kernel/actions/preview-kit';
import { assertAgentAssignable } from '../../../ai/agents/agent-names';
import { colorOf, configOf, prechatOf } from '../widget.service';

export async function widgetPreview(tx: TenantTx, i: ActionInput<typeof webchatUpdateWidget>): Promise<ActionPreview> {
  await assertAgentAssignable(tx, i.agent_id);
  const w = await tx.webchatWidget.findFirst({ orderBy: { createdAt: 'asc' } });
  const acc = w ? await tx.channelAccount.findUnique({ where: { id: w.channelAccountId } }) : null;
  const live = !!acc && acc.status !== 'disconnected';
  const name = i.name?.trim();
  if (!live) {
    if (i.enabled === false) return preview('config', w?.name ?? '', { changes: [] });
    const n = name || w?.name || serverMessages('vi').channels.widget.name;
    return preview('config', n, { changes: [created('webchat_widget', { name: n, enabled: true })], warnings: ['new_channel_account'] });
  }
  const cfg = configOf(w!);
  const cur = {
    enabled: acc!.status === 'connected' && !acc!.pausedAt,
    name: w!.name,
    greeting: w!.greeting,
    color: colorOf(w!),
    allowed_domains: w!.allowedDomains,
    agent_id: w!.agentId,
    prechat: prechatOf(w!).enabled,
    ...cfg,
  };
  const patch = {
    enabled: i.enabled,
    name: name || undefined,
    greeting: i.greeting,
    color: i.color?.toUpperCase(),
    allowed_domains: i.allowed_domains ? [...new Set(i.allowed_domains)] : undefined,
    agent_id: i.agent_id === undefined ? undefined : i.agent_id || null,
    prechat: i.prechat,
    ai_chat: i.ai_chat,
    ai_on: i.ai_on,
    handoff: i.handoff,
    tone: i.tone,
    mode: i.mode,
    knowledge_on: i.knowledge_on,
    collect_on: i.collect_on,
    actions: i.actions ? i.actions.flatMap((a) => cfg.actions.filter((x) => x.key === a.key).map((x) => ({ ...x, on: a.on }))) : undefined,
  };
  return preview('config', w!.name, { changes: updated('webchat_widget', w!.id, cur, patch) });
}
