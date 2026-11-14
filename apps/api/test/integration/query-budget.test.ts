// TIP-003g AC4 (standards/database/indexing.md §8–9, standards/code/testing.md §4b):
// Xác minh ngân sách SQL O(1) trên DB tenant thật cho 5 API danh sách (contacts, quotes, orders, tickets, ai-tasks):
// số câu SQL khi có 100 bản ghi (kèm quan hệ con) phải bằng lúc có 10 bản ghi, và không phát sinh SELECT * / alias.*.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { TENANT_RESOLVER, uuidv7 } from '@appchat/core';
import { TenantContexts, type TenantDb, type TenantDbResolver } from '@appchat/db';
import { countQueries } from '../../../../packages/core/test/support/count-queries';
import { call, startApi, type Harness } from './setup';

interface EndpointCase {
  name: string;
  path: string;
  countItems: (body: Record<string, unknown>) => number;
}

const ENDPOINTS: EndpointCase[] = [
  { name: 'contacts', path: '/contacts?page=1&limit=100', countItems: (b) => (b.data as unknown[]).length },
  { name: 'quotes', path: '/quotes?page=1&limit=100', countItems: (b) => (b.data as unknown[]).length },
  { name: 'orders', path: '/orders?page=1&limit=100', countItems: (b) => (b.data as unknown[]).length },
  { name: 'tickets', path: '/tickets?page=1&limit=100', countItems: (b) => (b.data as unknown[]).length },
  { name: 'ai-tasks', path: '/ai-tasks', countItems: (b) => ((b.data as { tasks: unknown[] }).tasks).length },
];

const HAS_SELECT_STAR = /\bSELECT\s+(?:["`\w]+\.)?\*/i;

describe('query-budget O(1) list APIs (TIP-003g)', () => {
  let h: Harness;
  let db: TenantDb;
  let salesId: string;
  let teamId: string;
  let tagAId: string;
  let tagBId: string;
  let slaId: string;
  let agentId: string;

  async function seedBatch(startIdx: number, count: number): Promise<void> {
    const baseTime = new Date('2026-11-10T08:00:00.000Z').getTime();
    const contacts = [];
    const contactTags = [];
    const collabs = [];
    const quotes = [];
    const quoteItems = [];
    const quoteComments = [];
    const orders = [];
    const orderItems = [];
    const orderEvents = [];
    const tickets = [];
    const ticketComments = [];
    const ticketEvents = [];
    const aiTasks = [];
    const aiRuns = [];
    const aiSteps = [];

    for (let k = 0; k < count; k += 1) {
      const idx = startIdx + k;
      const pad = String(idx + 1).padStart(4, '0');
      const at = new Date(baseTime + idx * 60_000);
      const future = new Date(baseTime + (idx + 7200) * 60_000);
      const contactId = uuidv7();
      const quoteId = uuidv7();
      const orderId = uuidv7();
      const ticketId = uuidv7();
      const taskId = uuidv7();
      const runId = uuidv7();

      contacts.push({
        id: contactId,
        code: `KH-QB-${pad}`,
        name: `Khách QB ${pad}`,
        phone: `090100${pad}`,
        phoneNorm: `8490100${pad}`,
        ownerUserId: h.user,
        teamId,
        stage: 'quote' as const,
        createdAt: at,
      });
      contactTags.push({ contactId, tagId: tagAId }, { contactId, tagId: tagBId });
      collabs.push({ contactId, userId: salesId, role: 'collaborator' as const, addedBy: h.user });

      quotes.push({
        id: quoteId,
        rootQuoteId: quoteId,
        code: `BG-QB-${pad}`,
        version: 1,
        contactId,
        ownerUserId: h.user,
        assignedUserId: salesId,
        teamId,
        status: 'sent' as const,
        subtotal: 100_000n,
        total: 100_000n,
        validUntil: future,
        createdAt: at,
      });
      quoteItems.push(
        { id: uuidv7(), quoteId, name: `SP A ${pad}`, qty: 1, unitPrice: 50_000n, taxRate: 0, lineTotal: 50_000n, sort: 0 },
        { id: uuidv7(), quoteId, name: `SP B ${pad}`, qty: 1, unitPrice: 50_000n, taxRate: 0, lineTotal: 50_000n, sort: 1 },
      );
      quoteComments.push({ id: uuidv7(), quoteId, authorId: h.user, body: `Trao đổi ${pad}` });

      orders.push({
        id: orderId,
        code: `DH-QB-${pad}`,
        contactId,
        ownerUserId: h.user,
        assignedUserId: salesId,
        teamId,
        status: 'processing' as const,
        payStatus: 'unpaid' as const,
        subtotal: 200_000n,
        total: 200_000n,
        createdAt: at,
      });
      orderItems.push(
        { id: uuidv7(), orderId, name: `Đơn A ${pad}`, qty: 1, unitPrice: 100_000n, taxRate: 0, lineTotal: 100_000n, sort: 0 },
        { id: uuidv7(), orderId, name: `Đơn B ${pad}`, qty: 1, unitPrice: 100_000n, taxRate: 0, lineTotal: 100_000n, sort: 1 },
      );
      orderEvents.push({ id: uuidv7(), orderId, type: 'created', actorType: 'user', actorId: h.user });

      const byAgent = idx % 2 === 0;
      tickets.push({
        id: ticketId,
        code: `TKT-QB-${pad}`,
        contactId,
        title: `Ticket QB ${pad}`,
        category: 'general',
        priority: 'medium' as const,
        status: 'open' as const,
        assigneeUserId: byAgent ? null : salesId,
        assigneeAgentId: byAgent ? agentId : null,
        teamId,
        slaPolicyId: slaId,
        slaPolicyName: 'QB SLA',
        frtDueAt: future,
        ttrStartAt: at,
        ttrDueAt: future,
        createdAt: at,
      });
      ticketComments.push({ id: uuidv7(), ticketId, authorType: 'user', authorId: h.user, body: `Ghi chú ${pad}` });
      ticketEvents.push({ id: uuidv7(), ticketId, type: 'created', actorType: 'user', actorId: h.user });

      aiTasks.push({
        id: taskId,
        name: `Task QB ${pad}`,
        goal: `Goal QB ${pad}`,
        prompt: `Prompt QB ${pad}`,
        department: 'Kinh doanh',
        agentId,
        trigger: 'manual' as const,
        dataScope: ['crm'],
        toolIds: ['message'],
        status: 'active' as const,
        createdByUserId: h.user,
        createdAt: at,
      });
      aiRuns.push({
        id: runId,
        rootRunId: runId,
        kind: 'task' as const,
        taskId,
        agentId,
        initiatedByUserId: h.user,
        status: 'completed' as const,
        title: `Run ${pad}`,
        creditsUsed: 5,
        startedAt: at,
      });
      aiSteps.push({ id: uuidv7(), runId, idx: 0, type: 'llm' as const, agentId, tokensIn: 100, tokensOut: 50, credits: 5 });
    }

    await db.contact.createMany({ data: contacts });
    await db.contactTag.createMany({ data: contactTags });
    await db.contactCollaborator.createMany({ data: collabs });
    await db.quote.createMany({ data: quotes });
    await db.quoteItem.createMany({ data: quoteItems });
    await db.quoteComment.createMany({ data: quoteComments });
    await db.order.createMany({ data: orders });
    await db.orderItem.createMany({ data: orderItems });
    await db.orderEvent.createMany({ data: orderEvents });
    await db.ticket.createMany({ data: tickets });
    await db.ticketComment.createMany({ data: ticketComments });
    await db.ticketEvent.createMany({ data: ticketEvents });
    await db.aiTask.createMany({ data: aiTasks });
    await db.aiRun.createMany({ data: aiRuns });
    await db.aiRunStep.createMany({ data: aiSteps });
  }

  async function fetchJson(path: string): Promise<{ status: number; body: Record<string, unknown> }> {
    const res = await call(h, path);
    return { status: res.status, body: (await res.json()) as Record<string, unknown> };
  }

  beforeAll(async () => {
    h = await startApi();
    salesId = (await h.member('sales')).id;
    const resolver = h.app.get<TenantDbResolver>(TENANT_RESOLVER);
    db = await resolver.get(TenantContexts.system(h.ws, 'query-budget'));
    tagAId = uuidv7();
    tagBId = uuidv7();
    teamId = uuidv7();
    slaId = uuidv7();
    agentId = uuidv7();
    await db.tag.createMany({
      data: [
        { id: tagAId, name: 'VIP QB', color: '#2563EB' },
        { id: tagBId, name: 'Mới QB', color: '#16A34A' },
      ],
    });
    await db.team.create({ data: { id: teamId, name: 'QB Team' } });
    await db.slaPolicy.create({ data: { id: slaId, name: 'QB SLA', isDefault: false, active: true } });
    await db.aiAgent.create({ data: { id: agentId, name: 'QB Agent', status: 'active', publishedVersion: 1, toolIds: ['message'] } });
  }, 60_000);

  afterAll(async () => {
    await h?.close();
  });

  it('giữ số câu SQL O(1) khi tăng dữ liệu 10 → 100 dòng có quan hệ con và không SELECT *', async () => {
    await seedBatch(0, 10);

    // Làm nóng cache một lần cho từng endpoint trước khi đo mốc 10.
    for (const ep of ENDPOINTS) {
      const warm = await fetchJson(ep.path);
      expect(warm.status, `${ep.name} warmup`).toBe(200);
    }

    const budget10 = new Map<string, number>();
    for (const ep of ENDPOINTS) {
      const q10 = await countQueries(db, () => fetchJson(ep.path));
      expect(q10.result.status, `${ep.name} @10`).toBe(200);
      expect(ep.countItems(q10.result.body), `${ep.name} rows @10`).toBeGreaterThanOrEqual(10);
      expect(q10.count, `${ep.name} queries @10`).toBeGreaterThan(0);
      expect(q10.queries.filter((q) => HAS_SELECT_STAR.test(q)), `${ep.name} SELECT * @10`).toEqual([]);
      budget10.set(ep.name, q10.count);
    }

    await seedBatch(10, 90);

    const summary: Record<string, { q10: number; q100: number }> = {};
    for (const ep of ENDPOINTS) {
      const q100 = await countQueries(db, () => fetchJson(ep.path));
      expect(q100.result.status, `${ep.name} @100`).toBe(200);
      expect(ep.countItems(q100.result.body), `${ep.name} rows @100`).toBeGreaterThanOrEqual(100);
      expect(q100.queries.filter((q) => HAS_SELECT_STAR.test(q)), `${ep.name} SELECT * @100`).toEqual([]);
      const q10Count = budget10.get(ep.name)!;
      summary[ep.name] = { q10: q10Count, q100: q100.count };
      expect(q100.count, `${ep.name} query count 100 vs 10\n@100 SQL:\n${q100.queries.join('\n')}`).toBe(q10Count);
    }

    process.stdout.write(`[query-budget] ${JSON.stringify(summary)}\n`);
    expect(Object.keys(summary)).toEqual(['contacts', 'quotes', 'orders', 'tickets', 'ai-tasks']);
  }, 60_000);
});
