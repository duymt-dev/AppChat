// TIP-023b SPEC A.1–2: quyền hiện hành mỗi lần agent gọi tool — agent tạm dừng / xoá, tool bị thu hồi khỏi bản xuất bản, connector mất,
// người ra lệnh rời workspace → chặn ngay lời gọi kế; tool mới thêm giữa run không tự có (giao với snapshot); run trực kênh (không người ra
// lệnh) khác run mất người ra lệnh; agentToolSpecs dùng authz đọc lại cho đúng lời gọi đó.
import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { authzForRole, type AuthzContext } from '@appchat/shared';
import { currentAuthority } from '../src/ai/agents/current-authority';
import { agentToolSpecs } from '../src/ai/agents/agent.runtime';
import type { ActionContext, ToolExecutor } from '../src/kernel';

const AG = '7c1e2b8a-0000-4000-8000-0000000000a1';
const U1 = '7c1e2b8a-0000-4000-8000-0000000000b1';

function rig(o: { status?: string; deleted?: boolean; published?: string[]; draft?: string[]; connected?: string[] } = {}) {
  const st = { status: o.status ?? 'active', deletedAt: o.deleted ? new Date() : null, published: o.published ?? ['contact.search', 'ticket.create'], connected: o.connected ?? [] };
  const db = {
    aiAgent: { findUnique: async () => ({ id: AG, status: st.status, deletedAt: st.deletedAt, publishedVersion: 1, toolIds: o.draft ?? st.published }) },
    aiAgentVersion: { findUnique: async () => ({ config: { tools: st.published } }) },
    channelAccount: { findMany: async () => st.connected.map((type) => ({ type })) },
    integrationConnection: { findMany: async () => [] },
  };
  return { db: db as never, st };
}
const def = (id: string, requiresConnector?: string) => ({ id, ...(requiresConnector ? { requiresConnector } : {}) });
const SNAP = ['contact.search', 'ticket.create'];

describe('currentAuthority', () => {
  it('agent đang chạy + tool còn cấp → ok, quyền = tool hiện hành', async () => {
    const r = await currentAuthority({ db: rig().db, ws: 'ws', agentId: AG, def: def('ticket.create'), snapshot: SNAP });
    expect(r.ok).toBe(true);
    expect(r.ok && [...r.authz.permissions].sort()).toEqual(['crm.view', 'ticket.manage']);
  });

  it('tạm dừng / xoá → agent_inactive', async () => {
    for (const o of [{ status: 'paused' }, { deleted: true }]) {
      expect(await currentAuthority({ db: rig(o).db, ws: 'ws', agentId: AG, def: def('contact.search'), snapshot: SNAP })).toEqual({ ok: false, code: 'FORBIDDEN', reason: 'agent_inactive' });
    }
  });

  it('thu hồi tool khỏi bản xuất bản → chặn lời gọi kế; tool mới giữa run không có trong snapshot → chặn', async () => {
    const { db, st } = rig();
    expect((await currentAuthority({ db, ws: 'ws', agentId: AG, def: def('ticket.create'), snapshot: SNAP })).ok).toBe(true);
    st.published = ['contact.search', 'quote.create'];
    expect(await currentAuthority({ db, ws: 'ws', agentId: AG, def: def('ticket.create'), snapshot: SNAP })).toMatchObject({ reason: 'tool_revoked' });
    expect(await currentAuthority({ db, ws: 'ws', agentId: AG, def: def('quote.create'), snapshot: SNAP })).toMatchObject({ reason: 'tool_revoked' });
  });

  it('connector cần mà không kết nối → connector_missing', async () => {
    const snap = [...SNAP, 'contact.send_email'];
    const r = await currentAuthority({ db: rig({ published: snap }).db, ws: 'ws', agentId: AG, def: def('contact.send_email', 'email'), snapshot: snap });
    expect(r).toMatchObject({ reason: 'connector_missing' });
    expect((await currentAuthority({ db: rig({ published: snap, connected: ['email'] }).db, ws: 'ws', agentId: AG, def: def('contact.send_email', 'email'), snapshot: snap })).ok).toBe(true);
  });

  it('người ra lệnh rời workspace → commander_lost (không rơi về quyền agent); run trực kênh không có người ra lệnh vẫn chạy', async () => {
    const lost = await currentAuthority({ db: rig().db, ws: 'ws', agentId: AG, def: def('contact.search'), snapshot: SNAP, commanderId: U1, commander: async () => null });
    expect(lost).toMatchObject({ reason: 'commander_lost' });
    expect((await currentAuthority({ db: rig().db, ws: 'ws', agentId: AG, def: def('contact.search'), snapshot: SNAP })).ok).toBe(true);
  });

  it('người ra lệnh còn quyền → giao quyền agent ∩ người đó', async () => {
    const cs = authzForRole('cs', U1);
    const r = await currentAuthority({ db: rig().db, ws: 'ws', agentId: AG, def: def('ticket.create'), snapshot: SNAP, commanderId: U1, commander: async () => cs });
    expect(r.ok && r.authz.userId).toBe(U1);
    expect(r.ok && [...r.authz.permissions].every((p) => cs.permissions.has(p))).toBe(true);
  });
});

describe('agentToolSpecs — authz đọc lại mỗi lời gọi', () => {
  it('lần 1 chạy với quyền hiện hành; thu hồi → lần 2 bị chặn, executor không được gọi', async () => {
    const { db, st } = rig();
    const seen: AuthzContext[] = [];
    const executor: ToolExecutor = {
      isImplemented: () => true,
      execute: async (ctx: ActionContext) => {
        seen.push(ctx.authz);
        return { status: 200, data: { result: { ok: true }, action_log_id: 'l' } } as never;
      },
    };
    const [tool] = agentToolSpecs(executor, ['ticket.create'], { workspaceId: 'ws', agent: { id: AG, toolIds: SNAP }, runId: 'r', source: 'agent', db });
    expect(await tool!.execute({ title: 'x' }, { stepIdx: 0, toolCallId: 'c1' })).toMatchObject({ kind: 'ok' });
    expect(seen[0]!.permissions.has('ticket.manage')).toBe(true);
    st.published = ['contact.search'];
    expect(await tool!.execute({ title: 'x' }, { stepIdx: 1, toolCallId: 'c2' })).toEqual({ kind: 'error', code: 'FORBIDDEN', message: 'tool_revoked' });
    expect(seen).toHaveLength(1);
  });

  it('AC3: tool agent nhận mã KH → executor nhận id (cùng resolveCodes với Trợ lý)', async () => {
    const CT = '7c1e2b8a-0000-4000-8000-0000000000c1';
    const { db } = rig();
    const withContact = { ...(db as object), contact: { findFirst: async ({ where }: { where: { code: string } }) => (where.code === 'KH-1016' ? { id: CT } : null) } } as never;
    const inputs: unknown[] = [];
    const executor: ToolExecutor = {
      isImplemented: () => true,
      execute: async (_ctx: ActionContext, _id: string, input: unknown) => {
        inputs.push(input);
        return { status: 200, data: { result: { ok: true }, action_log_id: 'l' } } as never;
      },
    };
    const [tool] = agentToolSpecs(executor, ['ticket.create'], { workspaceId: 'ws', agent: { id: AG, toolIds: SNAP }, runId: 'r', source: 'agent', db: withContact });
    await tool!.execute({ title: 'x', contact_id: 'KH-1016' }, { stepIdx: 0, toolCallId: 'c1' });
    expect(inputs[0]).toMatchObject({ contact_id: CT });
  });
});
