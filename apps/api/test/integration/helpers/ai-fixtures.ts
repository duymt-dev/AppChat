// Dựng dữ liệu cho ma trận action AI (TIP-023b): agent qua executor (create / create_and_publish), run và yêu cầu duyệt ở DB tenant
// (runtime agent / Cowork đã kiểm ở agents / ai-tasks test).
import { uuidv7 } from '@appchat/core';
import type { Matrix } from './action-matrix';

export async function agent(m: Matrix, name: string, publish = true): Promise<string> {
  return (await m.seed(publish ? 'agent.create_and_publish' : 'agent.create', { name, role: 'cs', threshold: 70 })).agent_id;
}

export async function run(m: Matrix, title: string, o: { parent?: { id: string; root: string }; status?: 'queued' | 'running' | 'completed' } = {}): Promise<{ id: string; root: string }> {
  const id = uuidv7();
  const root = o.parent?.root ?? id;
  m.h.clock.advance(1000);
  await (await m.db()).aiRun.create({ data: { id, kind: 'task', rootRunId: root, parentRunId: o.parent?.id ?? null, depth: o.parent ? 1 : 0, status: o.status ?? 'running', title, initiatedByUserId: m.h.user } });
  return { id, root };
}

/** Yêu cầu duyệt `tag.create` (permission inbox.manage) đang chờ, hết hạn sau 1 giờ. */
export async function approval(m: Matrix, input: Record<string, string> = { name: 'VIP' }): Promise<string> {
  const id = uuidv7();
  const now = m.h.clock.now();
  await (await m.db()).approvalRequest.create({
    data: { id, actionId: 'tag.create', input, inputHash: 'h', risk: 'write', permission: 'inbox.manage', title: 'Tạo thẻ', source: 'agent', requestedAt: now, expiresAt: new Date(now.getTime() + 3_600_000) },
  });
  return id;
}
