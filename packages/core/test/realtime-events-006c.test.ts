// TIP-006c (unit): `credits.changed` — ví đổi số dư (ghi sổ thật) → listener luôn được gọi → event; WS chia hai gói: số dư chỉ cho người
// có `billing.manage`, người khác nhận tín hiệu không số (bộ lọc `require.without`). `ui.command` — tool `ui` hợp lệ ghi outbox
// `ui.command_issued` khi lượt có tab; luật gửi tới phòng `tab:{user}:{tab}`; không tab / lệnh sai → không ghi.
import { describe, expect, it } from 'vitest';
import { EVENT_SCHEMAS, authzForRole } from '@appchat/shared';
import '../src/billing/events/billing.rules';
import '../src/ai/events/ui-command.rules';
import { realtimeEnvelopes, realtimeTopics } from '../src/notify/rules';
import { allowedFor } from '../src/notify/realtime/filter';
import { rooms } from '../src/notify/realtime/envelope';
import { walletThresholdListener } from '../src/billing/events/billing.events';
import { assistantTools } from '../src/ai/assistant/meta-tools';
import { tabCtx, tabIdOf } from '../src/ai/assistant/ui-command';

const WS = '0190f000-0000-7000-8000-000000000061';
const U = '0190f000-0000-7000-8000-000000000062';
const RUN = '0190f000-0000-7000-8000-000000000063';
const TAB = 'tab_0123456789abcdef';
const base = { ws: WS, occurred_at: '2026-11-14T00:00:00.000Z' };
const ev = (topic: string, payload: Record<string, unknown>) => ({ id: 'e1', topic, workspaceId: WS, traceId: null, payload: { ...base, ...payload } });
const sock = (role: 'owner' | 'sales' | 'accountant', userId = U) => ({ workspaceId: WS, userId, authz: authzForRole(role, userId) });

describe('credits.changed', () => {
  it('listener ví: số dư đổi (không chạm mốc) → chỉ credits.changed; chạm mốc → kèm credits.low', async () => {
    const sent: { topic: string; payload: Record<string, unknown> }[][] = [];
    const sink = { emit: async (_ws: string, e: { topic: string; payload: Record<string, unknown> }[]) => void sent.push(e) };
    const l = walletThresholdListener({ workspace: { findUnique: async () => ({ ownerUserId: U }) } } as never, sink);
    const change = { workspaceId: WS, before: { plan: 100, topup: 10, total: 110 }, after: { plan: 90, topup: 10, total: 100 }, applied: true, creditsMonth: 1000, ledgerId: 'L1' };
    await l(change, { lowAlert: true, changed: true, warned: null, exhausted: false, restored: false });
    expect(sent[0]).toEqual([{ topic: 'credits.changed', payload: { balance_plan: 90, balance_topup: 10, ledger_id: 'L1' } }]);
    await l(change, { lowAlert: false, changed: true, warned: 95, exhausted: false, restored: false });
    expect(sent[1]!.map((e) => e.topic)).toEqual(['credits.changed', 'credits.low']);
  });

  it('WS: người có billing.manage nhận số dư; người khác chỉ tín hiệu không số; không ai nhận cả hai', () => {
    expect(realtimeTopics()).toContain('credits.changed');
    const env = realtimeEnvelopes(ev('credits.changed', { balance_plan: 90, balance_topup: 10, ledger_id: 'L1' }));
    expect(env).toHaveLength(2);
    const [full, bare] = env;
    expect(full).toMatchObject({ event: 'credits.changed', rooms: [rooms.ws(WS)], data: { balance_plan: 90, balance_topup: 10 }, require: { permission: 'billing.manage' } });
    expect(bare!.data).toEqual({ event_id: 'e1' });
    for (const role of ['owner', 'sales', 'accountant'] as const) {
      const s = sock(role);
      const got = env.filter((x) => allowedFor(s, x));
      expect(got).toHaveLength(1);
      expect('balance_plan' in (got[0]!.data as object)).toBe(role === 'owner');
    }
  });

  it('schema: thiếu số dư / ledger → không hợp lệ', () => {
    expect(EVENT_SCHEMAS['credits.changed'].safeParse({ ...base, balance_plan: 1 }).success).toBe(false);
  });
});

describe('ui.command', () => {
  it('luật: chỉ phòng tab của người ra lệnh, cần assistant.use; payload = lệnh + run', () => {
    const env = realtimeEnvelopes(ev('ui.command_issued', { run_id: RUN, user_id: U, tab_id: TAB, command: { type: 'navigate', route: '/tickets' } }));
    expect(env).toEqual([expect.objectContaining({ rooms: [rooms.tab(U, TAB)], event: 'ui.command', data: { run_id: RUN, command: { type: 'navigate', route: '/tickets' }, event_id: 'e1' }, require: { permission: 'assistant.use' } })]);
    expect(EVENT_SCHEMAS['ui.command_issued'].safeParse({ ...base, run_id: RUN, user_id: U, tab_id: 'x y', command: { type: 'navigate', route: '/a' } }).success).toBe(false);
  });

  it('tab id: chỉ dạng an toàn; ai_run.input cũ không có tab → ctx không có tab', () => {
    expect(tabIdOf(TAB)).toBe(TAB);
    expect(tabIdOf('tab:evil')).toBeUndefined();
    expect(tabIdOf('short')).toBeUndefined();
    expect(tabCtx({})).toEqual({});
    expect(tabCtx({ tab_id: TAB })).toEqual({ tabId: TAB });
  });

  it('tool ui: lệnh hợp lệ + có tab → ghi outbox ui.command_issued + đánh dấu bẩn; không tab / lệnh sai → không ghi', async () => {
    const outbox: { topic: string; payload: Record<string, unknown> }[] = [];
    const dirty: string[] = [];
    const db = { $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn({ $queryRaw: async () => [], outboxEvent: { createMany: async ({ data }: { data: typeof outbox }) => void outbox.push(...data) } }) };
    const tool = (tabId?: string) =>
      assistantTools({ db: db as never, executor: {} as never, runner: {} as never, now: () => new Date('2026-11-14T00:00:00Z'), kv: { sadd: async (_k: string, w: string) => (dirty.push(w), 1) } }, { ws: WS, runId: RUN, userId: U, authz: authzForRole('owner', U), mode: 'cowork', locale: 'vi', ...(tabId ? { tabId } : {}) }).find((t) => t.name === 'ui')!;
    const meta = { stepIdx: 0, toolCallId: 'c1' };
    expect(await tool(TAB).execute({ command: { type: 'navigate', route: '/tickets' } }, meta)).toMatchObject({ kind: 'ok', output: { ui_command: { type: 'navigate', route: '/tickets' } } });
    expect(outbox).toHaveLength(1);
    expect(outbox[0]).toMatchObject({ topic: 'ui.command_issued', payload: { run_id: RUN, user_id: U, tab_id: TAB, command: { type: 'navigate', route: '/tickets' }, ws: WS } });
    expect(dirty).toEqual([WS]);
    expect(await tool().execute({ command: { type: 'navigate', route: '/tickets' } }, meta)).toMatchObject({ kind: 'ok' });
    expect(await tool(TAB).execute({ command: { type: 'boom' } }, meta)).toMatchObject({ kind: 'error', code: 'VALIDATION_FAILED' });
    expect(outbox).toHaveLength(1);
  });
});
