// TIP-045b annex D — người tiếp quản: chỉ người thật (UI / API người, Trợ lý thay người) chuyển auto → copilot + tăng epoch + huỷ tin agent
// còn pending (giữ làm nháp, không ghi đè nháp người); tin agent đã đặt chỗ → báo agent_in_flight (không huỷ). Agent / tác vụ / hệ thống
// gửi không mạo danh người. Đặt chỗ gửi: epoch lệch / không còn auto / có tin người mới hơn → từ chối; tin người → not_agent.
import { describe, expect, it } from 'vitest';
import { isHumanOperator, takeOverForHuman } from '../src/inbox/services/human-takeover';
import { reserveDispatch } from '../src/ai/reply/send-fence';

type Conv = { id: string; aiMode: string; aiState: string; aiEpoch: number; aiDraft: string | null };
type Ob = { id: string; status: string; message_id: string; payload: { text?: string }; turnFence: number | null; aiEpoch: number | null; messageId: string };

function fake(conv: Conv, obs: Ob[], humanAfter = false) {
  const updates: Record<string, unknown>[] = [];
  const tx = {
    $queryRaw: async (strings: TemplateStringsArray) => {
      const sql = strings.join(' ');
      if (sql.includes('FROM outbox_message')) return obs.filter((o) => o.turnFence !== null && ['pending', 'dispatch_reserved', 'sending'].includes(o.status));
      if (sql.includes('ai_mode::text')) return [{ ai_mode: conv.aiMode, ai_epoch: conv.aiEpoch }];
      return [];
    },
    conversation: {
      findUnique: async () => ({ ...conv }),
      update: async ({ data }: { data: Record<string, unknown> }) => {
        updates.push(data);
        const inc = (data.aiEpoch as { increment?: number } | undefined)?.increment;
        Object.assign(conv, { ...data, aiEpoch: inc ? conv.aiEpoch + inc : conv.aiEpoch });
        return { ...conv };
      },
    },
    outboxMessage: {
      findUnique: async ({ where }: { where: { id: string } }) => obs.find((o) => o.id === where.id) ?? null,
      update: async ({ where, data }: { where: { id: string }; data: Partial<Ob> }) => Object.assign(obs.find((o) => o.id === where.id)!, data),
    },
    message: {
      update: async () => ({}),
      findUnique: async () => ({ conversationId: conv.id, createdAt: new Date(0) }),
      findFirst: async () => (humanAfter ? { id: 'h' } : null),
    },
  };
  return { tx: tx as never, db: { $transaction: (fn: (t: typeof tx) => unknown) => fn(tx) } as never, conv, obs, updates };
}

const ob = (id: string, status: string, fence: number | null, text = 'nháp agent'): Ob => ({ id, status, message_id: `m-${id}`, messageId: `m-${id}`, payload: { text }, turnFence: fence, aiEpoch: 0 });
const user = { actor: { type: 'user' as const, id: 'u' }, source: 'ui' as const };

describe('isHumanOperator', () => {
  it('người (UI / API) + Trợ lý thay người; agent / tác vụ / hệ thống không', () => {
    expect(isHumanOperator(user)).toBe(true);
    expect(isHumanOperator({ actor: { type: 'assistant', id: 'u' }, source: 'assistant' })).toBe(true);
    expect(isHumanOperator({ actor: { type: 'agent', id: 'a' }, source: 'agent' })).toBe(false);
    expect(isHumanOperator({ actor: { type: 'system', id: 's' }, source: 'system' })).toBe(false);
    expect(isHumanOperator({ actor: { type: 'assistant', id: 'u' }, source: 'task' })).toBe(false);
  });
});

describe('takeOverForHuman', () => {
  it('auto → copilot + epoch + 1; tin agent pending huỷ, nội dung làm nháp; đặt chỗ sau đó từ chối', async () => {
    const f = fake({ id: 'c', aiMode: 'auto', aiState: 'running', aiEpoch: 0, aiDraft: null }, [ob('o1', 'pending', 3)]);
    const r = await takeOverForHuman(f.tx, user, f.conv as never);
    expect(r).toMatchObject({ switched: true, agentInFlight: false });
    expect(f.conv).toMatchObject({ aiMode: 'copilot', aiState: 'idle', aiEpoch: 1, aiDraft: 'nháp agent' });
    expect(f.obs[0]).toMatchObject({ status: 'dead', lastError: 'human_takeover' });
    expect(await reserveDispatch(f.db, 'o1', new Date())).toBe('rejected');
  });

  it('tin agent đã đặt chỗ → agent_in_flight (không huỷ); nháp người có sẵn không bị ghi đè', async () => {
    const f = fake({ id: 'c', aiMode: 'auto', aiState: 'idle', aiEpoch: 2, aiDraft: 'nháp người' }, [ob('o1', 'dispatch_reserved', 1), ob('o2', 'pending', 1, 'agent khác')]);
    const r = await takeOverForHuman(f.tx, user, f.conv as never);
    expect(r.agentInFlight).toBe(true);
    expect(f.obs[0]!.status).toBe('dispatch_reserved');
    expect(f.conv.aiDraft).toBe('nháp người');
  });

  it('agent gửi → không đổi chế độ, không khoá / không epoch', async () => {
    const f = fake({ id: 'c', aiMode: 'auto', aiState: 'running', aiEpoch: 0, aiDraft: null }, []);
    const r = await takeOverForHuman(f.tx, { actor: { type: 'agent', id: 'a' }, source: 'agent' }, f.conv as never);
    expect(r.switched).toBe(false);
    expect(f.updates).toHaveLength(0);
  });

  it('copilot sẵn: không "switched" nhưng vẫn tăng epoch (lượt đang chạy mất quyền)', async () => {
    const f = fake({ id: 'c', aiMode: 'copilot', aiState: 'idle', aiEpoch: 5, aiDraft: null }, []);
    const r = await takeOverForHuman(f.tx, user, f.conv as never);
    expect(r.switched).toBe(false);
    expect(f.conv.aiEpoch).toBe(6);
  });
});

describe('reserveDispatch', () => {
  it('đúng epoch + auto + không có tin người mới → reserved; lần hai → already; tin người → not_agent', async () => {
    const f = fake({ id: 'c', aiMode: 'auto', aiState: 'idle', aiEpoch: 0, aiDraft: null }, [ob('o1', 'pending', 1), ob('o2', 'pending', null)]);
    expect(await reserveDispatch(f.db, 'o1', new Date())).toBe('reserved');
    expect(await reserveDispatch(f.db, 'o1', new Date())).toBe('already');
    expect(await reserveDispatch(f.db, 'o2', new Date())).toBe('not_agent');
    expect(await reserveDispatch(f.db, 'nope', new Date())).toBe('missing');
  });

  it('có tin người mới hơn / đã sang copilot / epoch lệch → rejected', async () => {
    expect(await reserveDispatch(fake({ id: 'c', aiMode: 'auto', aiState: 'idle', aiEpoch: 0, aiDraft: null }, [ob('o1', 'pending', 1)], true).db, 'o1', new Date())).toBe('rejected');
    expect(await reserveDispatch(fake({ id: 'c', aiMode: 'copilot', aiState: 'idle', aiEpoch: 0, aiDraft: null }, [ob('o1', 'pending', 1)]).db, 'o1', new Date())).toBe('rejected');
    expect(await reserveDispatch(fake({ id: 'c', aiMode: 'auto', aiState: 'idle', aiEpoch: 3, aiDraft: null }, [ob('o1', 'pending', 1)]).db, 'o1', new Date())).toBe('rejected');
  });
});
