// agent.search · ai_task.search (TIP-023b R2 · DC-224 · SPEC A): Trợ lý đọc cấu hình AI theo tên để có id cho action
// quản trị. Quyền giữ như màn quản trị (agents.manage / kb.manage / ai_task.manage); tác vụ của người khác chỉ thấy khi data scope
// insights = all (như GET /ai-tasks). Không trả prompt / persona / nội dung tài liệu / URL / tệp. ≤ 20 dòng.
import { Injectable } from '@nestjs/common';
import { foldText } from '@appchat/shared';
import type { ActionInput, agentSearch, aiTaskSearch } from '@appchat/actions';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';

/** Danh mục cấu hình nhỏ (≤ vài trăm dòng / workspace) — lọc bỏ dấu sau khi đọc trang giới hạn, như các màn quản trị. */
const MAX_SCAN = 500;
const has = (needle: string, ...xs: (string | null | undefined)[]) => !needle || xs.some((x) => !!x && foldText(x).includes(needle));

type AgentOut = { agents: { id: string; name: string; role: string; status: string; published_version: number }[] };

@Injectable()
@ActionHandler('agent.search')
export class AgentSearchHandler implements Handler<ActionInput<typeof agentSearch>, AgentOut> {
  async execute(_ctx: ActionContext, i: ActionInput<typeof agentSearch>, tx: TenantTx): Promise<HandlerOutcome<AgentOut>> {
    const f = foldText(i.q ?? '');
    const rows = await tx.aiAgent.findMany({
      where: { deletedAt: null, ...(i.status ? { status: i.status } : {}) },
      orderBy: { updatedAt: 'desc' },
      take: MAX_SCAN,
      select: { id: true, name: true, role: true, roleLabel: true, status: true, publishedVersion: true },
    });
    const agents = rows.filter((a) => has(f, a.name, a.role, a.roleLabel)).slice(0, i.limit ?? 10);
    return { result: { agents: agents.map((a) => ({ id: a.id, name: a.name, role: a.role, status: a.status, published_version: a.publishedVersion })) } };
  }
}

type TaskOut = { tasks: { id: string; name: string; status: string; trigger: string; last_run_at: string | null; last_run_status: string | null }[] };

@Injectable()
@ActionHandler('ai_task.search')
export class AiTaskSearchHandler implements Handler<ActionInput<typeof aiTaskSearch>, TaskOut> {
  async execute(ctx: ActionContext, i: ActionInput<typeof aiTaskSearch>, tx: TenantTx): Promise<HandlerOutcome<TaskOut>> {
    const a = ctx.authz;
    const all = a.isOwner || a.scope.insights === 'all';
    const f = foldText(i.q ?? '');
    const rows = await tx.aiTask.findMany({
      where: { deletedAt: null, ...(all ? {} : { createdByUserId: a.userId }) },
      orderBy: { createdAt: 'desc' },
      take: MAX_SCAN,
      select: { id: true, name: true, status: true, trigger: true, lastRunAt: true, lastRunStatus: true },
    });
    const tasks = rows.filter((t) => has(f, t.name)).slice(0, i.limit ?? 10);
    return { result: { tasks: tasks.map((t) => ({ id: t.id, name: t.name, status: t.status, trigger: t.trigger, last_run_at: t.lastRunAt ? t.lastRunAt.toISOString() : null, last_run_status: t.lastRunStatus })) } };
  }
}
