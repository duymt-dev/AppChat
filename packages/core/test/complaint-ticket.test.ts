// TIP-022b AC5 — một ticket khiếu nại mỗi tin nguồn: nguồn từ run phía server (không từ JSON model), tin của hội thoại khác bị từ chối,
// receipt đã có ticket → trả lại ticket đó (model + consumer chạy song song), phát lại khác danh mục → CONFLICT; consumer: không grant
// hiện hành → denied, không ticket; người tạo ticket độc lập không bị ràng.
import { describe, expect, it } from 'vitest';
import { agentTicketBinding, claimComplaint, intentHash } from '../src/support/services/complaint-receipt';
import { aiComplaintConsumer } from '../src/support/events/ai-complaint.consumer';

const SRC = '00000000-0000-7000-8000-0000000000e1';
const CONV = '00000000-0000-7000-8000-0000000000c1';

const runTx = (input: unknown, msgConv = CONV) =>
  ({
    aiRun: { findUnique: async () => ({ id: 'r1', kind: 'agent_reply', input, conversationId: CONV, rootRunId: 'r1' }) },
    message: { findUnique: async () => ({ conversationId: msgConv }) },
  }) as never;
const agentCtx = { actor: { type: 'agent' as const, id: 'ag' }, runId: 'r1', servedConversationId: CONV };

describe('ràng nguồn ticket khiếu nại', () => {
  it('nguồn = tin khách của run; người / ngoài lượt → không ràng', async () => {
    expect(await agentTicketBinding(runTx({ source_message_id: SRC }), agentCtx, undefined)).toEqual({ sourceMessageId: SRC, conversationId: CONV, runId: 'r1', agentId: 'ag' });
    expect(await agentTicketBinding(runTx({ source_message_id: SRC }), { ...agentCtx, actor: { type: 'user', id: 'u' } }, undefined)).toBeNull();
    expect(await agentTicketBinding(runTx({ source_message_id: SRC }), { ...agentCtx, servedConversationId: undefined }, undefined)).toBeNull();
  });

  it('model đưa tin của hội thoại khác → 403; tin cùng hội thoại vẫn ràng về tin nguồn của run', async () => {
    await expect(agentTicketBinding(runTx({ source_message_id: SRC }, 'other'), agentCtx, 'foreign')).rejects.toThrow();
    expect((await agentTicketBinding(runTx({ source_message_id: SRC }), agentCtx, 'same-conv-msg'))!.sourceMessageId).toBe(SRC);
  });

  it('claim: receipt đã có ticket → trả ticket đó; khác danh mục → CONFLICT', async () => {
    const h = intentHash('Khiếu nại');
    const tx = (row: unknown) => ({ $executeRaw: async () => 0, $queryRaw: async () => [row] }) as never;
    const b = { sourceMessageId: SRC, conversationId: CONV, runId: 'r1', agentId: 'ag' };
    expect(await claimComplaint(tx({ ticket_id: null, status: 'pending', intent_hash: h }), b, h, new Date())).toEqual({ ticketId: null, status: 'pending' });
    expect(await claimComplaint(tx({ ticket_id: 't1', status: 'created', intent_hash: h }), b, h, new Date())).toEqual({ ticketId: 't1', status: 'created' });
    await expect(claimComplaint(tx({ ticket_id: 't1', status: 'created', intent_hash: h }), b, intentHash('Đổi trả'), new Date())).rejects.toThrow();
    expect(intentHash(' khiếu NẠI ')).toBe(h);
  });
});

describe('consumer ai.complaint_detected', () => {
  const event = { id: 'e1', workspaceId: 'ws', topic: 'ai.complaint_detected', payload: { conversation_id: CONV, source_message_id: SRC, run_id: '00000000-0000-7000-8000-0000000000f1', agent_id: 'ag', fence: 2 } };

  function db(o: { tools: string[]; receipt?: unknown }) {
    const writes: unknown[] = [];
    return {
      writes,
      db: {
        aiComplaintReceipt: { findUnique: async () => o.receipt ?? null, upsert: async (x: unknown) => writes.push(x), updateMany: async (x: unknown) => writes.push(x) },
        aiAgent: { findUnique: async () => ({ id: 'ag', status: 'active', deletedAt: null, publishedVersion: 1 }) },
        aiAgentVersion: { findUnique: async () => ({ config: { tools: o.tools } }) },
        conversation: { findUnique: async () => ({ channelType: 'webchat', handoffSummary: { request: 'Hàng giao bị vỡ, em muốn khiếu nại' }, contactId: null }) },
        message: { findUnique: async () => ({ body: 'Hàng giao bị vỡ', conversationId: CONV }) },
      } as never,
    };
  }
  const authz = (a: { toolIds: string[] }) => ({ permissions: new Set(a.toolIds.includes('ticket.create') ? ['ticket.manage'] : []) }) as never;

  it('có grant → ticket.create với actor agent (không system), khoá tất định theo tin nguồn', async () => {
    const calls: { ctx: { actor: unknown; source: string; idempotencyKey?: string }; id: string; input: { source_message_id: string; title: string } }[] = [];
    const exec = { execute: async (ctx: never, id: string, input: never) => (calls.push({ ctx, id, input }), { status: 200, data: { result: { ticket_id: 't' } } }) };
    const { db: d } = db({ tools: ['ticket.create'] });
    await aiComplaintConsumer(exec as never, authz).handle(event as never, d);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.ctx.actor).toEqual({ type: 'agent', id: 'ag' });
    expect(calls[0]!.ctx.source).toBe('agent');
    expect(calls[0]!.ctx.idempotencyKey).toBe(`agent-ticket:${SRC}`);
    expect(calls[0]!.input.source_message_id).toBe(SRC);
    expect(calls[0]!.input.title).toBe('Hàng giao bị vỡ, em muốn khiếu nại');
  });

  it('không grant hiện hành → denied, không gọi executor; receipt đã xong → bỏ qua', async () => {
    const exec = { execute: async () => Promise.reject(new Error('không được gọi')) };
    const a = db({ tools: ['conversation.handoff'] });
    await aiComplaintConsumer(exec as never, authz).handle(event as never, a.db);
    expect(JSON.stringify(a.writes)).toContain('missing_ticket_grant');
    const b = db({ tools: ['ticket.create'], receipt: { status: 'created' } });
    await aiComplaintConsumer(exec as never, authz).handle(event as never, b.db);
    expect(b.writes).toEqual([]);
  });
});
