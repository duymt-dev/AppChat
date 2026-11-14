// Preview agent.test / agent.draft_from_description / agent.optimize_prompt (TIP-023b R2.8): các action read chạy model — preview chỉ đọc
// (không gọi model, không trừ credit): agent / đoạn văn sẽ dùng + cảnh báo `uses_credit`. agent.test luôn chạy thử (dry_run) → `dry_run`.
import type { ActionInput, ActionPreview, agentDraftFromDescription, agentOptimizePrompt, agentTest } from '@appchat/actions';
import type { TenantTx } from '../../../kernel/actions/action-context';
import { line, preview } from '../../../kernel/actions/preview-kit';
import { liveAgent } from '../agent.store';

export async function testPreview(tx: TenantTx, i: ActionInput<typeof agentTest>): Promise<ActionPreview> {
  const a = i.agent_id ? await liveAgent(tx, i.agent_id) : null;
  return preview('read', line(a?.name ?? i.config?.name, i.channel, i.text.slice(0, 80)), { warnings: ['dry_run', 'uses_credit'] });
}

export const draftPreview = (i: ActionInput<typeof agentDraftFromDescription>): ActionPreview => preview('read', i.description.slice(0, 120), { warnings: ['uses_credit'] });

export const optimizePreview = (i: ActionInput<typeof agentOptimizePrompt>): ActionPreview => preview('read', (i.prompt || '').slice(0, 120), { warnings: ['uses_credit'] });
