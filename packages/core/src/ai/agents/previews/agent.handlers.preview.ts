// Preview cấu hình AI Agent (TIP-023b R2.8, risk config / delete): tạo → agent mới (tên · kênh · tool · ngưỡng) — tool không cấp được →
// 422 / thiếu quyền → 403 như execute; sửa → trước / sau chỉ trường đổi; xuất bản / quay lại → phiên bản kế tiếp; tạm dừng → trạng thái;
// xoá → đang phụ trách kênh / hội thoại → 409 HAS_DEPENDENCIES. Hạn mức `max_agents` vẫn kiểm ở execute (khoá DB nền tảng). Chỉ đọc.
import { AppError } from '@appchat/shared';
import type { ActionInput, ActionPreview, agentCreate, agentDelete, agentPause, agentPublish, agentRollback, agentUpdate } from '@appchat/actions';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import { created, line, preview, removed, updated } from '../../../kernel/actions/preview-kit';
import { assertTools, blankConfig, configOf, liveAgent, merge, type AgentConfig } from '../agent.store';

export function createPreview(ctx: ActionContext, i: ActionInput<typeof agentCreate>): ActionPreview {
  const cfg = merge(blankConfig(), i as Partial<AgentConfig>);
  assertTools(cfg.tools, ctx.authz);
  return preview('config', cfg.name, { count: 1, changes: [created('ai_agent', { name: cfg.name, channels: cfg.channels, tools: cfg.tools, threshold: cfg.threshold })] });
}

/** Tạo + xuất bản ngay: như tạo, agent vào hoạt động ở v1 (nhận hội thoại kênh đã gắn) — cảnh báo `goes_live`. */
export function createAndPublishPreview(ctx: ActionContext, i: ActionInput<typeof agentCreate>): ActionPreview {
  const p = createPreview(ctx, i);
  const [c] = p.changes!;
  return { ...p, summary: line(p.summary, 'v1'), changes: [{ ...c!, after: { ...c!.after, status: 'active', version: 1 } }], warnings: ['goes_live'] };
}

export async function updatePreview(ctx: ActionContext, tx: TenantTx, i: ActionInput<typeof agentUpdate>): Promise<ActionPreview> {
  const a = await liveAgent(tx, i.agent_id);
  const cur = configOf(a);
  const next = merge(cur, i.patch as Partial<AgentConfig>);
  assertTools(next.tools.filter((t) => !cur.tools.includes(t)), ctx.authz);
  return preview('config', a.name, { changes: updated('ai_agent', a.id, cur as unknown as Record<string, unknown>, i.patch as Record<string, unknown>), ...(a.publishedVersion ? { warnings: ['draft_until_publish'] } : {}) });
}

export async function publishPreview(tx: TenantTx, i: ActionInput<typeof agentPublish>): Promise<ActionPreview> {
  const a = await liveAgent(tx, i.agent_id);
  return preview('config', line(a.name, `v${a.publishedVersion + 1}`), { changes: updated('ai_agent', a.id, { version: a.publishedVersion, status: a.status }, { version: a.publishedVersion + 1, status: 'active' }) });
}

export async function rollbackPreview(tx: TenantTx, i: ActionInput<typeof agentRollback>): Promise<ActionPreview> {
  const a = await liveAgent(tx, i.agent_id);
  if (!(await tx.aiAgentVersion.findUnique({ where: { agentId_version: { agentId: a.id, version: i.version } }, select: { id: true } }))) throw new AppError('NOT_FOUND', 404, { version: 'not_found' });
  return preview('config', line(a.name, `v${i.version}`), {
    changes: updated('ai_agent', a.id, { version: a.publishedVersion, from: null }, { version: a.publishedVersion + 1, from: i.version }),
    ...(a.draftDirty ? { warnings: ['draft_overwritten'] } : {}),
  });
}

export async function pausePreview(tx: TenantTx, i: ActionInput<typeof agentPause>): Promise<ActionPreview> {
  const a = await liveAgent(tx, i.agent_id);
  if (a.publishedVersion === 0) throw new AppError('INVALID_TRANSITION', 409, { status: a.status });
  return preview('config', a.name, { changes: updated('ai_agent', a.id, { status: a.status }, { status: i.paused ? 'paused' : 'active' }) });
}

export async function deletePreview(tx: TenantTx, i: ActionInput<typeof agentDelete>, assertNoDependencies: (tx: TenantTx, id: string) => Promise<void>): Promise<ActionPreview> {
  const a = await liveAgent(tx, i.agent_id);
  await assertNoDependencies(tx, a.id);
  return preview('delete', a.name, { changes: [removed('ai_agent', a.id, { name: a.name, status: a.status, version: a.publishedVersion })] });
}
