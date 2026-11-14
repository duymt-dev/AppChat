// TIP-036 — logic sổ điểm không cần DB: action system-only ẩn khỏi mọi khám phá (Trợ lý, tool agent), mốc xét hạng đầu quý theo giờ
// workspace (cửa sổ 12 tháng), căn cứ tích theo thực thu lúc hoàn tất (DC-297 c), đảo theo tỉ lệ luỹ kế từ căn cứ snapshot.
import { describe, expect, it } from 'vitest';
import { registry } from '@appchat/actions';
import { authzForRole, earnBase } from '@appchat/shared';
import { SYSTEM_ONLY, allowedFor, findActions } from '../src/ai/assistant/catalog';
import { groupTools, runToolIds } from '../src/ai/agents/agent-tools';
import { reviewWindow } from '../src/loyalty/jobs/loyalty.scheduler';
import { refundShare } from '../src/loyalty/services/order-points';

const SYSTEM = ['loyalty.earn', 'loyalty.reverse', 'loyalty.expire', 'loyalty.review_tier'];
const owner = authzForRole('owner', 'u1');
const all = () => true;

describe('action system-only của loyalty', () => {
  it('self + không agentGrantable + SYSTEM_ONLY; Owner không thấy qua Trợ lý / tool agent', () => {
    for (const id of SYSTEM) {
      const d = registry.find((a) => a.id === id)!;
      expect(d).toMatchObject({ permission: 'self', agentGrantable: false });
      expect(SYSTEM_ONLY.has(id)).toBe(true);
      expect(allowedFor(d, owner)).toBe(false);
    }
    const found = new Set<string>();
    for (const q of ['tích điểm đơn', 'đảo điểm', 'hết hạn điểm', 'xét hạng', 'loyalty earn reverse expire review tier'])
      for (const mode of ['cowork', 'chat'] as const) for (const f of findActions(owner, mode, q, undefined, 50, all)) found.add(f.id);
    expect(SYSTEM.filter((id) => found.has(id))).toEqual([]);
    expect(groupTools([], new Set()).flatMap((g) => g.tools.map((t) => t.id)).filter((id) => SYSTEM.includes(id))).toEqual([]);
    expect(runToolIds(SYSTEM, new Set())).toEqual([]);
  });

  it('payment.redeem_points: risk money, payment.record, không agentGrantable, hoàn tác 24h', () => {
    expect(registry.find((a) => a.id === 'payment.redeem_points')).toMatchObject({ risk: 'money', permission: 'payment.record', agentGrantable: false, undo: { windowSec: 86_400 } });
  });
});

describe('reviewWindow (giờ workspace)', () => {
  it('đầu quý Asia/Ho_Chi_Minh: 2026-10-01 00:00 +07 → cửa sổ từ 2025-10-01 00:00 +07', () => {
    const w = reviewWindow(new Date('2026-11-04T08:00:00Z'), 'Asia/Ho_Chi_Minh');
    expect(w.quarter).toBe('2026-10-01');
    expect(w.to.toISOString()).toBe('2026-09-30T17:00:00.000Z');
    expect(w.from.toISOString()).toBe('2025-09-30T17:00:00.000Z');
  });
  it('rạng sáng 01/01 giờ VN (vẫn 31/12 UTC) đã sang quý mới', () => {
    expect(reviewWindow(new Date('2026-12-31T18:30:00Z'), 'Asia/Ho_Chi_Minh').quarter).toBe('2027-01-01');
    expect(reviewWindow(new Date('2026-12-31T18:30:00Z'), 'UTC').quarter).toBe('2026-10-01');
  });
});

describe('căn cứ tích + đảo theo tỉ lệ', () => {
  it('thu đủ → nguyên net; thu một nửa tiền mặt → nửa net; trả một phần bằng điểm không tính là tiền mặt', () => {
    expect(earnBase({ net: 1_000_000n, total: 1_100_000n, paidTotal: 1_100_000n, refundedTotal: 0n, pointsUsed: 0n }).net).toBe(1_000_000n);
    expect(earnBase({ net: 1_000_000n, total: 1_100_000n, paidTotal: 550_000n, refundedTotal: 0n, pointsUsed: 0n }).net).toBe(500_000n);
    // 1.100.000đ, 1.000 điểm (100.000đ) + 1.000.000đ tiền mặt = thu đủ.
    expect(earnBase({ net: 900_000n, total: 1_100_000n, paidTotal: 1_100_000n, refundedTotal: 0n, pointsUsed: 1000n })).toEqual({ net: 900_000n, paid: 1_000_000n, due: 1_000_000n });
    expect(earnBase({ net: 900_000n, total: 1_100_000n, paidTotal: 0n, refundedTotal: 0n, pointsUsed: 0n }).net).toBe(0n);
  });

  it('refundShare: hai lần hoàn một phần cộng lại không vượt điểm gốc; hoàn trước khi hoàn tất không tính lại', () => {
    const earn = { delta: 101n, basis: { paid: '1000000', refunded: '0' } } as never;
    const first = refundShare(earn, 0n, 300_000n);
    expect(first).toBe(30n);
    const second = refundShare(earn, first, 1_000_000n);
    expect(first + second).toBe(101n);
    expect(refundShare(earn, 101n, 1_000_000n)).toBe(0n);
    const late = { delta: 50n, basis: { paid: '500000', refunded: '200000' } } as never;
    expect(refundShare(late, 0n, 200_000n)).toBe(0n);
    expect(refundShare(late, 0n, 450_000n)).toBe(25n);
  });
});
