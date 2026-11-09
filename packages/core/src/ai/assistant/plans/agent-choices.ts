// assistant.agent_choices (TIP-023d §5.2): trang AI Agent đang hoạt động / đã xuất bản để chọn làm chuyên viên Cowork — chỉ metadata
// an toàn (tên, vai trò, mức AI) từ cấu hình ĐÃ XUẤT BẢN, không prompt/persona/tier nháp. Không cấp quyền agent.manage/view mới —
// dùng được bởi mọi người có assistant.use (mirror session-list.ts keyset `(updated_at DESC, id DESC)`). `agentChoicesPage` dùng
// chung bởi action handler và GET /v1/assistant/agent-choices (route + read action cùng service — action-registry.md mục 6).
import { Injectable } from '@nestjs/common';
import type { ActionInput, assistantAgentChoices } from '@appchat/actions';
import type { TenantDb } from '@appchat/db';
import { AppError } from '@appchat/shared';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../../kernel/actions/handler';

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Choice = { id: string; name: string; role: string; role_label: string; model_tier: string };
export type AgentChoicesPage = { data: Choice[]; next_cursor: string | null };

const encodeCursor = (r: { id: string; updatedAt: Date }) => Buffer.from(`${r.updatedAt.toISOString()}|${r.id}`).toString('base64url');

function decodeCursor(cursor: string): { at: Date; id: string } {
  const [iso, id] = Buffer.from(cursor, 'base64url').toString().split('|');
  const at = new Date(iso ?? '');
  if (!id || !UUID.test(id) || Number.isNaN(at.getTime())) throw new AppError('VALIDATION_FAILED', 422, { cursor: 'invalid' });
  return { at, id };
}

export async function agentChoicesPage(db: Pick<TenantDb, 'aiAgent'>, opts: { cursor?: string; limit?: number } = {}): Promise<AgentChoicesPage> {
  const take = Math.min(Math.max(opts.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
  const after = opts.cursor ? decodeCursor(opts.cursor) : null;
  const rows = await db.aiAgent.findMany({
    where: {
      deletedAt: null,
      status: 'active',
      publishedVersion: { gt: 0 },
      ...(after ? { OR: [{ updatedAt: { lt: after.at } }, { updatedAt: after.at, id: { lt: after.id } }] } : {}),
    },
    orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    take: take + 1,
    select: { id: true, name: true, role: true, roleLabel: true, modelTier: true, updatedAt: true },
  });
  const page = rows.slice(0, take);
  return {
    data: page.map((a) => ({ id: a.id, name: a.name, role: a.role, role_label: a.roleLabel, model_tier: a.modelTier })),
    next_cursor: rows.length > take ? encodeCursor(page.at(-1)!) : null,
  };
}

@Injectable()
@ActionHandler('assistant.agent_choices')
export class AssistantAgentChoicesHandler implements Handler<ActionInput<typeof assistantAgentChoices>, AgentChoicesPage> {
  async execute(_ctx: ActionContext, i: ActionInput<typeof assistantAgentChoices>, tx: TenantTx): Promise<HandlerOutcome<AgentChoicesPage>> {
    return { result: await agentChoicesPage(tx, { cursor: i.cursor, limit: i.limit }) };
  }
}
