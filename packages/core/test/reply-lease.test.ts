// TIP-045b annex D — lease lượt agent bền (fence + chủ + hạn): một chủ còn hạn tại một thời điểm, giành lại khi hết hạn tăng fence, gia
// hạn / nhả chỉ đúng chủ + fence + epoch, gia hạn không vượt TURN_MAX_MS; người tiếp quản tăng epoch → lượt cũ mất quyền.
import { describe, expect, it } from 'vitest';
import { TURN_LEASE_MS, TURN_MAX_MS, acquireTurn, releaseTurn, renewTurn, stillOwns } from '../src/ai/reply/turn-lease';

type Row = { aiTurnOwner: string | null; aiTurnUntil: Date | null; aiTurnFence: number; aiEpoch: number };

function fake(row: Row) {
  const match = (w: Record<string, unknown>) =>
    (w.aiTurnOwner === undefined || w.aiTurnOwner === row.aiTurnOwner) && (w.aiTurnFence === undefined || w.aiTurnFence === row.aiTurnFence) && (w.aiEpoch === undefined || w.aiEpoch === row.aiEpoch);
  const conversation = {
    findUnique: async () => ({ ...row }),
    update: async ({ data }: { data: Partial<Row> }) => Object.assign(row, data),
    updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Partial<Row> }) => (match(where) ? (Object.assign(row, data), { count: 1 }) : { count: 0 }),
  };
  const tx = {
    $queryRaw: async () => [{ ai_turn_owner: row.aiTurnOwner, ai_turn_until: row.aiTurnUntil, ai_turn_fence: row.aiTurnFence, ai_epoch: row.aiEpoch }],
    conversation,
  };
  return { db: { $transaction: (fn: (t: typeof tx) => unknown) => fn(tx), conversation } as never, row };
}

const T0 = new Date('2026-11-05T00:00:00Z');
const at = (ms: number) => new Date(T0.getTime() + ms);

describe('turn lease', () => {
  it('một chủ còn hạn; chủ khác bị từ chối; hết hạn → giành lại, fence + 1', async () => {
    const { db } = fake({ aiTurnOwner: null, aiTurnUntil: null, aiTurnFence: 4, aiEpoch: 2 });
    const a = await acquireTurn(db, 'c', 'A', T0);
    expect(a).toMatchObject({ fence: 5, epoch: 2, owner: 'A' });
    expect(await acquireTurn(db, 'c', 'B', at(1000))).toBeNull();
    const b = await acquireTurn(db, 'c', 'B', at(TURN_LEASE_MS + 1));
    expect(b!.fence).toBe(6);
    expect(await stillOwns(db, a!, at(TURN_LEASE_MS + 2))).toBe(false);
  });

  it('gia hạn chỉ đúng chủ + fence + epoch; không quá TURN_MAX_MS; epoch đổi (người tiếp quản) → mất quyền', async () => {
    const { db, row } = fake({ aiTurnOwner: null, aiTurnUntil: null, aiTurnFence: 0, aiEpoch: 0 });
    const l = (await acquireTurn(db, 'c', 'A', T0))!;
    expect(await renewTurn(db, l, at(30_000))).toBe(true);
    expect(await renewTurn(db, l, at(TURN_MAX_MS + 1))).toBe(false);
    row.aiEpoch = 1;
    expect(await renewTurn(db, l, at(60_000))).toBe(false);
    expect(await stillOwns(db, l, at(60_000))).toBe(false);
  });

  it('nhả đúng chủ + fence: lượt cũ không xoá lease lượt mới', async () => {
    const { db, row } = fake({ aiTurnOwner: null, aiTurnUntil: null, aiTurnFence: 0, aiEpoch: 0 });
    const old = (await acquireTurn(db, 'c', 'A', T0))!;
    const cur = (await acquireTurn(db, 'c', 'B', at(TURN_LEASE_MS + 1)))!;
    await releaseTurn(db, old);
    expect(row.aiTurnOwner).toBe('B');
    await releaseTurn(db, cur);
    expect(row.aiTurnOwner).toBeNull();
  });
});
