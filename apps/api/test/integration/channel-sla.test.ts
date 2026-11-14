// TIP-014c AC2 + AC4 (Postgres 16 + Memurai):
// - GET /v1/sla-policies (seed Mặc định / VIP / Mạng xã hội)
// - ticket.create từ hội thoại thuộc tài khoản kênh có sla_policy / sla_override → snapshot đúng hạn FRT / TTR
// - GET /v1/conversations chiếu đồng hồ FRT (frt_due_at, frt_target_min, sla_state)
// - conversation.set_status với snoozed_until validation (> now) + tự mở lại khi đọc sau khi hết hạn
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { TenantContexts, TenantDbResolver, PrismaWorkspaceRegistry } from '@appchat/db';
import {
  DEFAULT_SLA_POLICY_ID,
  SOCIAL_SLA_POLICY_ID,
  VIP_SLA_POLICY_ID,
  conversationSchema,
  conversationsPageSchema,
  slaPolicyListSchema,
  ticketRowSchema,
} from '@appchat/shared';
import { uuidv7 } from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;

beforeAll(async () => {
  h = await startApi();
  await h.platform.workspace.update({ where: { id: h.ws }, data: { timezone: 'UTC' } });
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
}, 60_000);

afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const act = (id: string, input: unknown) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7() }).then(json);
const get = (path: string) => call(h, path).then(json);
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const ok = (r: { status: number; body: unknown }) => {
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  return (r.body as { data: { result: Record<string, any>; action_log_id: string } }).data; // eslint-disable-line @typescript-eslint/no-explicit-any
};

describe('channel SLA + snooze (TIP-014c)', () => {
  it('GET /sla-policies trả 3 gói cài sẵn; tài khoản kênh SLA VIP + sla_override áp vào ticket & FRT inbox', async () => {
    const polRes = await get('/sla-policies');
    expect(polRes.status).toBe(200);
    const policies = slaPolicyListSchema.parse(polRes.body.data);
    expect(policies.map((p) => p.id)).toEqual(expect.arrayContaining([DEFAULT_SLA_POLICY_ID, VIP_SLA_POLICY_ID, SOCIAL_SLA_POLICY_ID]));
    const vip = policies.find((p) => p.id === VIP_SLA_POLICY_ID)!;
    expect([vip.frt_human, vip.ttr_human]).toEqual([2, 60]);
    const docs = (await (await fetch(`${h.base}/v1/docs`)).json()) as {
      paths?: Record<string, { get?: { 'x-untyped'?: boolean } }>;
    };
    expect(docs.paths?.['/v1/sla-policies']?.get).toBeDefined();
    expect(docs.paths?.['/v1/sla-policies']?.get?.['x-untyped']).toBeUndefined();

    const db = await tenant();
    const accId = uuidv7();
    await db.channelAccount.create({
      data: { id: accId, type: 'zalo_personal', name: 'Zalo VIP', externalId: 'z-vip-1', status: 'connected', settings: {} },
    });
    ok(await act('channel.update_settings', { channel_account_id: accId, patch: { sla_policy: VIP_SLA_POLICY_ID } }));

    const contactId = ok(await act('contact.create', { full_name: 'Khách VIP SLA', phone: '0909888001' })).result.contact_id as string;
    const convVipId = uuidv7();
    const msgVipId = uuidv7();
    const startAt = h.clock.now();
    await db.conversation.create({
      data: {
        id: convVipId,
        channelAccountId: accId,
        channelType: 'zalo_personal',
        contactId,
        externalThreadId: 'ext-vip-1',
        title: 'Khách VIP SLA',
        lastMessageAt: startAt,
        frtPendingSince: startAt,
      },
    });
    await db.message.create({
      data: {
        id: msgVipId,
        conversationId: convVipId,
        channelAccountId: accId,
        direction: 'in',
        senderType: 'contact',
        senderId: 'c1',
        kind: 'text',
        body: 'Hỏi gấp đơn VIP',
        externalMsgId: uuidv7(),
        status: 'delivered',
        createdAt: startAt,
      },
    });

    const page1 = conversationsPageSchema.parse((await get('/conversations')).body);
    const c1 = page1.data.find((x) => x.id === convVipId)!;
    expect(c1.frt_target_min).toBe(2);
    expect(new Date(c1.frt_due_at!).getTime()).toBe(startAt.getTime() + 2 * 60_000);
    expect(c1.sla_state).toBe('ok');

    const t1Res = ok(
      await act('ticket.create', {
        title: 'Ticket từ kênh VIP',
        channel: 'zalo_personal',
        category: 'Billing',
        priority: 'high',
        source_message_id: msgVipId,
      }),
    );
    const t1 = ticketRowSchema.parse((await get(`/tickets/${t1Res.result.ticket_id}`)).body.data);
    const t1Row = await db.ticket.findUniqueOrThrow({ where: { id: t1.id }, select: { slaPolicyId: true } });
    expect([t1Row.slaPolicyId, t1.sla_policy_name, t1.frt_target_min, t1.ttr_target_min]).toEqual([
      VIP_SLA_POLICY_ID,
      'VIP',
      2,
      60,
    ]);

    // Đổi giờ làm việc / SLA override riêng trên tài khoản kênh → ghi đè FRT/TTR của ticket và đồng hồ FRT hội thoại.
    ok(
      await act('channel.update_settings', {
        channel_account_id: accId,
        patch: { sla_override: { first_response_min: 5, resolution_min: 90 } },
      }),
    );
    const t2Res = ok(
      await act('ticket.create', {
        title: 'Ticket override SLA',
        channel: 'zalo_personal',
        category: 'Technical',
        priority: 'medium',
        source_message_id: msgVipId,
      }),
    );
    const t2 = ticketRowSchema.parse((await get(`/tickets/${t2Res.result.ticket_id}`)).body.data);
    const t2Row = await db.ticket.findUniqueOrThrow({ where: { id: t2.id }, select: { slaPolicyId: true } });
    expect([t2Row.slaPolicyId, t2.frt_target_min, t2.ttr_target_min]).toEqual([VIP_SLA_POLICY_ID, 5, 90]);

    // Xoá sla_override (null) → quay lại 2p của gói VIP; quá 2p → sla_state = breach.
    ok(await act('channel.update_settings', { channel_account_id: accId, patch: { sla_override: null } }));
    h.clock.advance(4 * 60_000);
    const single = conversationSchema.parse((await get(`/conversations/${convVipId}`)).body.data);
    expect([single.frt_target_min, single.sla_state]).toEqual([2, 'breach']);
  });

  it('snoozed_until: chặn mốc quá khứ, cho mốc tương lai và tự mở lại khi đọc sau khi hết hạn', async () => {
    const db = await tenant();
    const accId = uuidv7();
    await db.channelAccount.create({
      data: { id: accId, type: 'webchat', name: 'Widget SLA', externalId: 'w-snz-1', status: 'connected', settings: {} },
    });
    const convId = uuidv7();
    await db.conversation.create({
      data: {
        id: convId,
        channelAccountId: accId,
        channelType: 'webchat',
        externalThreadId: 'ext-snz-1',
        title: 'Khách hẹn sáng mai',
        lastMessageAt: h.clock.now(),
      },
    });

    const pastIso = new Date(h.clock.now().getTime() - 60_000).toISOString();
    const bad = await act('conversation.set_status', { conversation_id: convId, status: 'snoozed', snoozed_until: pastIso });
    expect([bad.status, bad.body?.error?.code]).toEqual([422, 'VALIDATION_FAILED']);

    const futureIso = new Date(h.clock.now().getTime() + 10 * 60_000).toISOString();
    ok(await act('conversation.set_status', { conversation_id: convId, status: 'snoozed', snoozed_until: futureIso }));
    expect((await get('/conversations')).body.data.map((c: { id: string }) => c.id)).not.toContain(convId);

    // Qua mốc hẹn → đọc tự chuẩn hoá thành open và hiện lại trong danh sách.
    h.clock.advance(15 * 60_000);
    const cAfter = conversationSchema.parse((await get(`/conversations/${convId}`)).body.data);
    expect(cAfter.status).toBe('open');
    expect((await get('/conversations')).body.data.map((c: { id: string }) => c.id)).toContain(convId);
  });
});
