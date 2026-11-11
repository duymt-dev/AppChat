// Một bộ giải restriction DUY NHẤT cho mọi đường truy hồi (TIP-020c §2.1): action `kb.search` (Trợ lý / agent / Builder / tác vụ) và
// ngữ cảnh đầu lượt trả lời kênh đều qua đây — không còn đường tìm thẳng nào nới quyền. Có run (runtime đặt `ActionContext.runId`) →
// binding của run; không run (gọi trực tiếp từ UI / API) → Trợ lý theo người hiệu lực của request.
import type { TenantDb } from '@appchat/db';
import type { ActionContext } from '../../../kernel/actions/action-context';
import { admit, type Admission } from './authority';
import { assistantKnowledge, knowledgeOfRun } from './context';
import type { KnowledgeContext } from './types';

type Db = Pick<TenantDb, 'aiRun' | 'aiAgent' | 'aiAgentVersion'>;
type Ctx = Pick<ActionContext, 'runId' | 'authz' | 'onBehalfOfUserId' | 'actor' | 'source' | 'knowledgeAuthz'>;

export interface Resolved {
  admission: Admission;
  /** Run giữ binding (nguồn đã dùng ghi kèm id này). null = gọi trực tiếp. */
  bindingRunId: string | null;
}

/**
 * Người hiệu lực cho quyền đọc nguồn: agent làm cho người → `knowledgeAuthz` (người ra lệnh hiện hành do runtime đọc lại); Trợ lý / UI →
 * `authz` của chính người đó. Agent trực kênh → không người (chỉ public).
 */
const whoOf = (ctx: Pick<ActionContext, 'authz' | 'onBehalfOfUserId' | 'actor' | 'knowledgeAuthz'>) =>
  ctx.knowledgeAuthz ?? (ctx.actor.type === 'user' || ctx.actor.type === 'assistant' ? ctx.authz : null);

/** Binding Trợ lý / làm cho người phải đúng người của lời gọi — khác người → không ai (commander_lost). */
function principalFor(k: KnowledgeContext, ctx: Pick<ActionContext, 'authz' | 'onBehalfOfUserId' | 'actor' | 'knowledgeAuthz'>) {
  const who = whoOf(ctx);
  if (!who) return null;
  if (k.kind === 'assistant_unscoped') return k.user_id === who.userId ? who : null;
  if (k.mode === 'commander') return k.commander_id === who.userId ? who : null;
  return who;
}

export async function resolveFor(db: Db, ctx: Ctx): Promise<Resolved> {
  if (!ctx.runId) {
    // Agent / tác vụ luôn chạy trong run; không run mà nguồn là agent → không có binding tin cậy.
    if (ctx.source === 'agent' || ctx.source === 'task') return { admission: { ok: false, reason: 'scope_unavailable' }, bindingRunId: null };
    const who = whoOf(ctx);
    return { admission: who ? await admit(db, assistantKnowledge(who.userId), who) : { ok: false, reason: 'commander_lost' }, bindingRunId: null };
  }
  const b = await knowledgeOfRun(db, ctx.runId);
  if (!b.found || !b.k) return { admission: { ok: false, reason: 'scope_unavailable' }, bindingRunId: b.runId };
  return { admission: await admit(db, b.k, principalFor(b.k, ctx)), bindingRunId: b.runId };
}
