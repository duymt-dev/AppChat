// TIP-042b (unit, DB giả) — chia lead mới: chọn người xác định (vòng tròn / ít việc nhất / cố định), ứng viên theo quyền HIỆN TẠI +
// membership active (không theo tên vai trò), rule áp đúng thứ tự (ghi đè → mặc định; ghi đè tắt không lùi về mặc định), bản nháp cấu hình
// kiểm đủ, apply chỉ nhận actor system đúng và không cấp chủ cho khách đã có chủ / tạo trước mốc bật. Tích hợp DB thật + 2 worker: apps/api.
import { describe, expect, it } from 'vitest';
import { AppError } from '@appchat/shared';
import { SYSTEM_ONLY } from '../src/ai/assistant/catalog';
import { tipOwnerOf } from '../src/kernel/actions/tip-owners';
import { eligibleUsers, leastBusy, nextAfter } from '../src/crm/routing/routing-selector';
import { assertDraft, poolUsers, ruleFor, type RuleDraft } from '../src/crm/routing/routing.repo';
import { LEAD_ROUTING_ACTOR, LeadRoutingApplyHandler } from '../src/crm/routing/routing-apply.handler';
import { leadRoutingConsumer, leadRoutingCtx } from '../src/crm/routing/routing-consumer';
import { domainVerifier, registerSystemVerifier, systemCapabilityOf } from '../src/kernel/actions/system';

const U = (n: number) => `0190f000-0000-7000-8000-00000000000${n}`;
const WS = '0190f000-0000-7000-8000-0000000000ee';
const ACC = '0190f000-0000-7000-8000-0000000000ac';
const code = async (p: Promise<unknown>) => p.then(() => 'ok', (e: AppError) => `${e.httpStatus} ${JSON.stringify(e.fields)}`);

describe('chọn người nhận lead', () => {
  const order = [U(1), U(2), U(3)];
  const all = new Set(order);

  it('vòng tròn: 9 lead cho 3 người → mỗi người 3, tiếp sau con trỏ, vòng lại; bỏ người không đủ điều kiện', () => {
    const got: string[] = [];
    let last: string | null = null;
    for (let i = 0; i < 9; i++) got.push((last = nextAfter(order, all, last))!);
    expect(order.map((u) => got.filter((g) => g === u).length)).toEqual([3, 3, 3]);
    expect(got.slice(0, 4)).toEqual([U(1), U(2), U(3), U(1)]);
    expect(nextAfter(order, new Set([U(1), U(3)]), U(1))).toBe(U(3));
    // Người cuối bị gỡ khỏi pool: con trỏ trỏ người không còn → người kế theo thứ tự id, không kẹt.
    expect(nextAfter([U(1), U(2)], all, U(3))).toBe(U(1));
    expect(nextAfter(order, new Set(), null)).toBeNull();
  });

  it('ít việc nhất: tải 3/1/2 → người tải 1; hoà → vòng tròn sau con trỏ', () => {
    expect(leastBusy(order, all, new Map([[U(1), 3], [U(2), 1], [U(3), 2]]), null)).toBe(U(2));
    const tie = new Map([[U(1), 0], [U(2), 0], [U(3), 5]]);
    expect(leastBusy(order, all, tie, U(1))).toBe(U(2));
    expect(leastBusy(order, all, tie, U(2))).toBe(U(1));
    expect(leastBusy(order, new Set(), tie, null)).toBeNull();
  });

  it('ứng viên = pool ∩ active ∩ đủ crm.view/edit + inbox.view/reply (Owner luôn đủ; uỷ quyền tính; vai trò tuỳ biến đã xoá → không)', async () => {
    const ms = [
      { userId: U(1), roleKey: 'sales', delegations: [] },
      { userId: U(2), roleKey: 'accountant', delegations: [] },
      { userId: U(3), roleKey: 'custom:0190f000-0000-7000-8000-0000000000c1', delegations: [] },
      { userId: U(4), roleKey: 'custom:0190f000-0000-7000-8000-0000000000c2', delegations: [] },
      { userId: U(5), roleKey: 'accountant', delegations: [] },
    ];
    const platform = {
      membership: { findMany: async ({ where }: { where: { userId: { in: string[] } } }) => ms.filter((m) => where.userId.in.includes(m.userId)) },
      workspace: { findUnique: async () => ({ ownerUserId: U(5) }) },
    };
    const tx = { role: { findMany: async () => [{ key: 'custom:0190f000-0000-7000-8000-0000000000c1', permissions: ['crm.view', 'crm.edit', 'inbox.view', 'inbox.reply'] }] } };
    const pool = [U(1), U(2), U(3), U(4), U(5), U(6)];
    // U(1) sales đủ; U(2) kế toán thiếu; U(3) tuỳ biến đủ; U(4) tuỳ biến đã xoá; U(5) Owner; U(6) không còn active.
    expect(await eligibleUsers(tx as never, platform as never, WS, pool)).toEqual([U(1), U(3), U(5)]);
  });
});

describe('rule + bản nháp', () => {
  const rows = [
    { id: 'd', channelAccountId: null, enabled: true, mode: 'round_robin' },
    { id: 'o', channelAccountId: ACC, enabled: false, mode: 'manual' },
  ];
  const tx = { leadRoutingRule: { findFirst: async ({ where }: { where: { channelAccountId: string | null } }) => rows.find((r) => r.channelAccountId === where.channelAccountId) ?? null } };

  it('ghi đè (kể cả tắt) thắng mặc định; không ghi đè → mặc định', async () => {
    expect((await ruleFor(tx as never, ACC))?.id).toBe('o');
    expect((await ruleFor(tx as never, '0190f000-0000-7000-8000-0000000000ad'))?.id).toBe('d');
    expect((await ruleFor(tx as never, null))?.id).toBe('d');
  });

  it('pool theo nhóm sắp theo id, không trùng; by_channel chỉ người cố định', async () => {
    const t = { teamMember: { findMany: async () => [{ userId: U(3) }, { userId: U(1) }, { userId: U(3) }] } };
    expect(await poolUsers(t as never, { userIds: [], teamId: 't', fixedUserId: null, mode: 'round_robin' })).toEqual([U(1), U(3)]);
    expect(await poolUsers(t as never, { userIds: [U(2)], teamId: null, fixedUserId: U(2), mode: 'by_channel' })).toEqual([U(2)]);
  });

  it('bản nháp: trùng / pool rỗng khi bật / by_channel thiếu tài khoản hoặc người / người không còn active → 422', async () => {
    const d = (o: Partial<RuleDraft>): RuleDraft => ({ channelAccountId: null, enabled: true, mode: 'round_robin', userIds: [U(1)], teamId: null, fixedUserId: null, ...o });
    const t = { channelAccount: { findUnique: async () => ({ id: ACC }) }, team: { findUnique: async () => null }, teamMember: { findUnique: async () => null } };
    const p = { membership: { findMany: async ({ where }: { where: { userId: { in: string[] } } }) => where.userId.in.filter((u) => u !== U(9)).map((userId) => ({ userId })) } };
    const run = (o: Partial<RuleDraft>) => code(assertDraft(t as never, p as never, WS, d(o)));
    expect(await run({ userIds: [U(1), U(1)] })).toBe('422 {"user_ids":"duplicate"}');
    expect(await run({ userIds: [] })).toBe('422 {"user_ids":"empty_pool"}');
    expect(await run({ userIds: [], enabled: false })).toBe('ok');
    expect(await run({ userIds: [U(9)] })).toBe(`422 {"user_ids":"not_member:${U(9)}"}`);
    expect(await run({ mode: 'by_channel', fixedUserId: U(1) })).toBe('422 {"mode":"by_channel_needs_account"}');
    expect(await run({ mode: 'by_channel', channelAccountId: ACC })).toBe('422 {"fixed_user_id":"required"}');
    expect(await run({ mode: 'by_channel', channelAccountId: ACC, fixedUserId: U(2) })).toBe('422 {"fixed_user_id":"not_in_pool"}');
    expect(await run({ fixedUserId: U(1) })).toBe('422 {"fixed_user_id":"only_by_channel"}');
    expect(await run({ teamId: '0190f000-0000-7000-8000-0000000000f1', userIds: [] })).toBe('404 {"team_id":"not_found"}');
    expect(await run({ teamId: 'x', userIds: [U(1)] })).toBe('422 {"team_id":"exclusive"}');
  });
});

describe('lead_routing.apply — biên system', () => {
  const clock = { now: () => new Date('2026-11-06T03:00:00Z') };
  const h = new LeadRoutingApplyHandler(clock as never, undefined);
  const ev = { id: '0190f000-0000-7000-8000-0000000000e1', topic: 'lead.routing_requested', payload: { ws: WS, contact_id: U(7), conversation_id: null, channel_account_id: ACC, occurred_at: '2026-11-06T02:00:00Z' } };

  it('nguồn khác system / actor khác → 403 (kể cả Owner, kể cả Trợ lý); action không có trong catalog Trợ lý', async () => {
    const tx = {} as never;
    for (const ctx of [
      { workspaceId: WS, source: 'ui', actor: { type: 'user', id: U(1) }, authz: { isOwner: true } },
      { workspaceId: WS, source: 'assistant', actor: { type: 'user', id: U(1) }, authz: { isOwner: true } },
      { workspaceId: WS, source: 'system', actor: { type: 'system', id: 'loyalty' }, authz: { isOwner: true } },
    ]) {
      expect(await code(h.execute(ctx as never, { event_id: ev.id }, tx))).toMatch(/^403/);
    }
    expect(SYSTEM_ONLY.has('lead_routing.apply')).toBe(true);
    expect(tipOwnerOf('lead_routing.update')).toBe('042b');
  });

  const sys = leadRoutingCtx(WS, ev.id);
  const decisions: unknown[] = [];
  const base = (o: { event?: unknown; prior?: unknown; rule?: unknown; contact?: unknown }) => ({
    outboxEvent: { findUnique: async () => o.event ?? null },
    leadRoutingDecision: { findFirst: async () => o.prior ?? null, create: async ({ data }: { data: unknown }) => void decisions.push(data) },
    leadRoutingRule: { findFirst: async ({ where }: { where: { channelAccountId: string | null } }) => (where.channelAccountId === null ? (o.rule ?? null) : null) },
    $executeRaw: async () => 1,
    $queryRaw: async (s: TemplateStringsArray) => (s.join('?').includes('lead_routing_cursor') ? [{ last_user_id: null }] : o.contact ? [o.contact] : []),
  });

  it('event lạ / sai topic / sai workspace → 404; quyết định đã có → trả lại, không ghi lần hai', async () => {
    expect(await code(h.execute(sys, { event_id: ev.id }, base({}) as never))).toBe('404 {"event_id":"not_found"}');
    expect(await code(h.execute(sys, { event_id: ev.id }, base({ event: { ...ev, topic: 'contact.created' } }) as never))).toBe('404 {"event_id":"not_found"}');
    expect(await code(h.execute(sys, { event_id: ev.id }, base({ event: { ...ev, payload: { ...ev.payload, ws: U(1) } } }) as never))).toBe('404 {"event_id":"not_found"}');
    decisions.length = 0;
    const r = await h.execute(sys, { event_id: ev.id }, base({ event: ev, prior: { contactId: U(7), selectedUserId: U(1), originatingEventId: ev.id, reason: 'round_robin' } }) as never);
    expect(r.result).toEqual({ contact_id: U(7), selected_user_id: U(1), reason: 'round_robin' });
    expect(decisions).toHaveLength(0);
  });

  it('không rule → manual; khách đã có chủ → giữ; khách tạo trước mốc bật → không hồi tố', async () => {
    const rule = { id: 'r', channelAccountId: null, enabled: true, enabledAt: new Date('2026-11-06T01:00:00Z'), mode: 'round_robin', userIds: [U(1)], teamId: null, fixedUserId: null, version: 1 };
    const contact = { name: 'A', owner_user_id: null, stage: 'lead', deleted_at: null, created_at: new Date('2026-11-06T02:00:00Z') };
    const reason = async (o: Parameters<typeof base>[0]) => ((await h.execute(sys, { event_id: ev.id }, base({ event: ev, ...o }) as never)).result as { reason: string }).reason;
    expect(await reason({})).toBe('manual');
    expect(await reason({ rule: { ...rule, enabled: false } })).toBe('manual');
    expect(await reason({ rule, contact: { ...contact, owner_user_id: U(2) } })).toBe('has_owner');
    expect(await reason({ rule, contact: { ...contact, stage: 'potential' } })).toBe('not_lead');
    expect(await reason({ rule: { ...rule, enabledAt: new Date('2026-11-06T02:30:00Z') }, contact })).toBe('before_enabled');
    expect(await reason({ rule, contact: { ...contact, deleted_at: new Date() } })).toBe('contact_gone');
  });

  it('consumer gọi đúng action với actor system + Idempotency-Key theo event', async () => {
    // TIP-003c: action riêng — consumer gọi qua capability gắn event (verifier domain đăng ký ở CrmModule).
    registerSystemVerifier('lead_routing.apply', domainVerifier(LEAD_ROUTING_ACTOR, ['event']), { receipt: 'domain', db: false });
    const calls: unknown[][] = [];
    const caps: unknown[] = [];
    await leadRoutingConsumer({ execute: async (...a: unknown[]) => void (calls.push(a), caps.push(systemCapabilityOf(a[0] as never))) } as never).handle({ id: ev.id, workspaceId: WS, topic: ev.topic, payload: ev.payload } as never, {} as never);
    expect(calls).toHaveLength(1);
    const [ctx, id, input] = calls[0] as [{ source: string; actor: { id: string }; idempotencyKey: string }, string, unknown];
    expect([ctx.source, ctx.actor.id, ctx.idempotencyKey, id, input]).toEqual(['system', LEAD_ROUTING_ACTOR, `${ev.id}:lead-routing`, 'lead_routing.apply', { event_id: ev.id }]);
    expect(caps[0]).toMatchObject({ actionId: 'lead_routing.apply', sourceKind: 'event', sourceRef: ev.id, receipt: 'domain' });
  });
});
