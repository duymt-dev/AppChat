// TIP-045b annex E — đối soát nền tảng ↔ tenant trên DB giả: ghế / hạn mức / ví ↔ sổ / trừ tiền AI ↔ biên nhận; lệch đã chốt → mismatch,
// thao tác gần mốc cắt / chỗ đặt còn mở → pending (không coi là sai tiền); chạy lại cùng mốc không ghi trùng; lỗi một workspace không chặn
// workspace khác; KHÔNG bao giờ ghi vào ví / sổ / thành viên / gói (chỉ bảng phát hiện + checkpoint).
import { describe, expect, it } from 'vitest';
import type { PlatformDb, TenantDb, TenantDbResolver } from '@appchat/db';
import { cutoffOf, reconcileAll, reconcileWorkspace } from '../src/billing/jobs/reconcile';
import { SETTLE_MS } from '../src/billing/jobs/reconcile-wallet';

const WS = '0190f000-0000-7000-8000-0000000000a1';
const WS2 = '0190f000-0000-7000-8000-0000000000a2';
const RUN = '0190f000-0000-7000-8000-0000000000b1';
const NOW = new Date('2026-11-05T10:20:00Z');
const CUT = cutoffOf(NOW);

interface World {
  limits: { maxUsers: number | null; maxChannels: number | null; maxAgents: number | null };
  members: number;
  invites: number;
  channels: number;
  agents: number;
  reserved: Record<string, number>;
  wallet: bigint;
  ledgerSum: bigint;
  charges: { refId: string; delta: bigint; createdAt: Date }[];
  steps: { run_id: string; llm_step: number; credits: number }[];
}

const world = (w: Partial<World> = {}): World => ({
  limits: { maxUsers: 3, maxChannels: 2, maxAgents: 2 },
  members: 2,
  invites: 0,
  channels: 1,
  agents: 1,
  reserved: {},
  wallet: 100n,
  ledgerSum: 100n,
  charges: [],
  steps: [],
  ...w,
});

/** DB nền tảng giả: chỉ những gì đối soát đọc + bảng phát hiện / checkpoint. Ghi vào bảng nghiệp vụ → ném (chứng minh không tự sửa). */
function fakePlatform(worlds: Record<string, World>, fail = new Set<string>()) {
  const findings: Record<string, unknown>[] = [];
  const checkpoints = new Map<string, unknown>();
  const forbidden = () => {
    throw new Error('đối soát không được ghi bảng nghiệp vụ');
  };
  const of = (where: { workspaceId: string }) => {
    if (fail.has(where.workspaceId)) throw new Error('boom');
    return worlds[where.workspaceId]!;
  };
  const db = {
    workspace: {
      findMany: async ({ where }: { where: { id?: { gt: string } } }) =>
        Object.keys(worlds)
          .sort()
          .filter((id) => !where.id || id > where.id.gt)
          .map((id) => ({ id })),
    },
    subscription: { findUnique: async ({ where }: { where: { workspaceId: string } }) => ({ planId: where.workspaceId }) },
    plan: { findUnique: async ({ where }: { where: { id: string } }) => ({ key: 'pro', ...worlds[where.id]!.limits }) },
    membership: { count: async ({ where }: { where: { workspaceId: string } }) => of(where).members, update: forbidden },
    invite: { count: async ({ where }: { where: { workspaceId: string } }) => of(where).invites },
    quotaReservation: { count: async ({ where }: { where: { workspaceId: string; resource: string } }) => of(where).reserved[where.resource] ?? 0 },
    subscriptionAddon: { groupBy: async () => [] },
    creditLedger: {
      findMany: async ({ where }: { where: { workspaceId: string; createdAt: { gt: Date; lte: Date } } }) =>
        of(where).charges.filter((c) => c.createdAt > where.createdAt.gt && c.createdAt <= where.createdAt.lte),
      create: forbidden,
    },
    creditWallet: { update: forbidden },
    $queryRaw: async (_s: TemplateStringsArray, ...vals: unknown[]) => {
      const w = of({ workspaceId: vals[0] as string });
      return [{ wallet: w.wallet, ledger: w.ledgerSum }];
    },
    reconcileFinding: {
      createMany: async ({ data }: { data: Record<string, unknown>[] }) => {
        const key = (f: Record<string, unknown>) => `${f.workspaceId}|${f.check}|${f.reference}|${(f.cutoff as Date).toISOString()}`;
        const have = new Set(findings.map(key));
        const fresh = data.filter((f) => !have.has(key(f)));
        findings.push(...fresh);
        return { count: fresh.length };
      },
    },
    reconcileCheckpoint: { upsert: async ({ where, create }: { where: { workspaceId: string }; create: unknown }) => void checkpoints.set(where.workspaceId, create) },
  };
  return { db: db as unknown as PlatformDb, findings, checkpoints };
}

const fakeTenant = (w: World) =>
  ({
    channelAccount: { count: async () => w.channels },
    aiAgent: { count: async () => w.agents },
    $queryRaw: async () => w.steps,
  }) as unknown as TenantDb;

const resolver = (worlds: Record<string, World>) => ({ get: async (ctx: { workspaceId: string }) => fakeTenant(worlds[ctx.workspaceId]!) }) as unknown as TenantDbResolver;

const run = async (w: World) => reconcileWorkspace(fakePlatform({ [WS]: w }).db, fakeTenant(w), WS, CUT);

describe('reconcileWorkspace', () => {
  it('khớp hết → không phát hiện', async () => {
    expect(await run(world())).toEqual([]);
  });

  it('ghế: thành viên + lời mời còn hạn vượt max_users → mismatch; không giới hạn → bỏ qua', async () => {
    expect(await run(world({ members: 3, invites: 1 }))).toEqual([
      { check: 'membership_seats', reference: 'users', severity: 'mismatch', detail: { members: 3, invites: 1, limit: 3 } },
    ]);
    expect(await run(world({ members: 9, limits: { maxUsers: null, maxChannels: 2, maxAgents: 2 } }))).toEqual([]);
  });

  it('hạn mức: đang dùng vượt → mismatch; chỉ vượt khi cộng chỗ đặt còn mở → pending', async () => {
    const f = await run(world({ channels: 3, agents: 2, reserved: { agents: 1 } }));
    expect(f).toEqual([
      { check: 'quota_channels', reference: 'channels', severity: 'mismatch', detail: { used: 3, reserved: 0, limit: 2 } },
      { check: 'quota_agents', reference: 'agents', severity: 'pending', detail: { used: 2, reserved: 1, limit: 2 } },
    ]);
  });

  it('ví ≠ tổng sổ → mismatch (số dạng chuỗi, không mất chính xác)', async () => {
    expect(await run(world({ wallet: 90n, ledgerSum: 100n }))).toEqual([
      { check: 'wallet_ledger', reference: 'wallet', severity: 'mismatch', detail: { wallet: '90', ledger: '100' } },
    ]);
  });

  it('trừ tiền AI: biên nhận khớp → ok; lệch credit → mismatch; thiếu biên nhận đã chốt → mismatch; thiếu nhưng gần mốc → pending', async () => {
    const old = new Date(CUT.getTime() - 30 * 60_000);
    const fresh = new Date(CUT.getTime() - SETTLE_MS / 2);
    const f = await run(
      world({
        charges: [
          { refId: `${RUN}:0`, delta: -5n, createdAt: old },
          { refId: `${RUN}:1`, delta: -7n, createdAt: old },
          { refId: `${RUN}:2`, delta: -3n, createdAt: old },
          { refId: `${RUN}:3`, delta: -2n, createdAt: fresh },
          { refId: `${RUN}:4`, delta: -1n, createdAt: new Date(CUT.getTime() + 60_000) },
        ],
        steps: [
          { run_id: RUN, llm_step: 0, credits: 5 },
          { run_id: RUN, llm_step: 1, credits: 6 },
        ],
      }),
    );
    expect(f).toEqual([
      { check: 'wallet_usage', reference: `run:${RUN}:1`, severity: 'mismatch', detail: { charged: 7, recorded: 6 } },
      { check: 'wallet_usage', reference: `run:${RUN}:2`, severity: 'mismatch', detail: { charged: 3, recorded: null } },
      { check: 'wallet_usage', reference: `run:${RUN}:3`, severity: 'pending', detail: { charged: 2, recorded: null } },
    ]);
  });
});

describe('reconcileAll', () => {
  it('mốc cắt = giờ tròn; ghi phát hiện + checkpoint; chạy lại cùng mốc không ghi trùng; lỗi một workspace không chặn workspace khác', async () => {
    const worlds = { [WS]: world({ wallet: 1n }), [WS2]: world() };
    const p = fakePlatform(worlds);
    const errors: string[] = [];
    const r1 = await reconcileAll({ platform: p.db, tenants: resolver(worlds), now: () => NOW, onError: (ws) => errors.push(ws) });
    expect(r1).toEqual({ cutoff: new Date('2026-11-05T10:00:00Z'), workspaces: 2, findings: 1, failed: 0 });
    expect(p.findings).toHaveLength(1);
    expect(p.findings[0]).toMatchObject({ workspaceId: WS, check: 'wallet_ledger', severity: 'mismatch' });
    expect(p.checkpoints.size).toBe(2);
    const r2 = await reconcileAll({ platform: p.db, tenants: resolver(worlds), now: () => new Date(NOW.getTime() + 60_000) });
    expect(r2.findings).toBe(0);
    expect(p.findings).toHaveLength(1);

    const broken = fakePlatform(worlds, new Set([WS]));
    const r3 = await reconcileAll({ platform: broken.db, tenants: resolver(worlds), now: () => NOW, onError: (ws) => errors.push(ws) });
    expect(r3).toMatchObject({ workspaces: 1, failed: 1 });
    expect(errors).toEqual([WS]);
    expect(broken.checkpoints.has(WS2)).toBe(true);
  });
});
