// TIP-023b R1.6: mã hiển thị → id chỉ một lần lúc xem trước; token gắn input đã chuẩn hoá; xác nhận chạy đúng input đó (không tra
// lại mã, không lấy input thô của model) với Idempotency-Key ổn định theo run + bước + lời gọi tool.
import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import type { PausedState, ToolSpec } from '@appchat/ai';
import type { TenantDb } from '@appchat/db';
import { authzForRole } from '@appchat/shared';
import type { ActionContext, KeyValueStore, ToolExecutor } from '../src/kernel';
import { assistantIdemKey, assistantTools, type AssistantTurnCtx } from '../src/ai/assistant/meta-tools';
import { assistantConfirm } from '../src/ai/assistant/turn.service';
import type { AiRunner } from '../src/ai/runs/runner';

const owner = authzForRole('owner', 'u1');
const t: AssistantTurnCtx = { ws: 'ws', runId: 'run1', userId: 'u1', authz: owner, mode: 'cowork', locale: 'vi' };
const ID_A = '7c1e2b8a-0000-4000-8000-00000000000a';
const ID_B = '7c1e2b8a-0000-4000-8000-00000000000b';

function recorder(respond: (ctx: ActionContext) => unknown) {
  const calls: { ctx: ActionContext; actionId: string; input: unknown }[] = [];
  const executor: ToolExecutor = {
    isImplemented: () => true,
    execute: async (ctx, actionId, input) => {
      calls.push({ ctx, actionId, input });
      return respond(ctx) as never;
    },
  };
  return { executor, calls };
}

/** DB giả: KH-1016 → ID_A, phụ trách bởi `owner`; scope crm của sales (own) chỉ thấy khách mình phụ trách. */
const contactDb = (owner: string) =>
  ({
    contact: {
      findFirst: async ({ where }: { where: { code: string } }) => (where.code === 'KH-1016' ? { id: ID_A } : null),
      findUnique: async ({ where }: { where: { id: string } }) => (where.id === ID_A ? { id: ID_A, ownerUserId: owner, deletedAt: null } : null),
    },
    contactCollaborator: { findUnique: async () => null },
    // TIP-023d §2.1: lời gọi ghi tra kế hoạch gắn run — không có kế hoạch → chạy như thường.
    assistantPlan: { findUnique: async () => null },
  }) as unknown as TenantDb;

describe('call_action → preview mang input chuẩn hoá', () => {
  it('KH-1016 đổi sang id một lần; needs_confirmation.canonicalInput = input đã gửi executor; khoá idem theo lời gọi', async () => {
    const db = contactDb('u9');
    const { executor, calls } = recorder(() => ({ status: 202, data: { status: 'preview_required', preview: { summary: 'Sửa SĐT', risk: 'write' }, confirm_token: 'tok' } }));
    const tools: ToolSpec[] = assistantTools({ db, executor, runner: {} as AiRunner, now: () => new Date() }, t);
    const call = tools.find((x) => x.name === 'call_action')!;
    const out = await call.execute({ action_id: 'contact.update', input: { contact_id: 'KH-1016', patch: { phone: '0901111222' } } }, { stepIdx: 3, toolCallId: 'call-9' });
    expect(calls).toHaveLength(1);
    expect(calls[0]!.input).toEqual({ contact_id: ID_A, patch: { phone: '0901111222' } });
    expect(calls[0]!.ctx.idempotencyKey).toBe(assistantIdemKey('run1', 3, 'call-9'));
    expect(out).toEqual({ kind: 'needs_confirmation', preview: { summary: 'Sửa SĐT', risk: 'write' }, confirmToken: 'tok', canonicalInput: calls[0]!.input });
  });

  it('mã của khách ngoài scope → giữ nguyên mã (không lộ id / sự tồn tại); executor tự trả 404 như mã sai', async () => {
    const { executor, calls } = recorder(() => ({ status: 200, data: { result: {}, action_log_id: 'l' } }));
    const sales: AssistantTurnCtx = { ...t, userId: 'u2', authz: authzForRole('sales', 'u2') };
    const call = assistantTools({ db: contactDb('u9'), executor, runner: {} as AiRunner, now: () => new Date() }, sales).find((x) => x.name === 'call_action')!;
    await call.execute({ action_id: 'contact.get', input: { contact_id: 'KH-1016' } }, { stepIdx: 0, toolCallId: 'c' });
    expect(calls[0]!.input).toEqual({ contact_id: 'KH-1016' });
  });

  it('mã lồng trong mảng (`items[].product_id`) đổi theo đường dẫn schema; ghi chú giống mã không đổi', async () => {
    const db = { ...contactDb('u1'), product: { findFirst: async ({ where }: { where: { code: string } }) => (where.code === 'SP-0007' ? { id: ID_B } : null) } } as unknown as TenantDb;
    const { executor, calls } = recorder(() => ({ status: 202, data: { status: 'preview_required', preview: { summary: '', risk: 'write' }, confirm_token: 'tok' } }));
    const call = assistantTools({ db, executor, runner: {} as AiRunner, now: () => new Date() }, t).find((x) => x.name === 'call_action')!;
    await call.execute({ action_id: 'quote.create', input: { contact_id: 'KH-1016', note: 'KH-1016', items: [{ product_id: 'SP-0007', name: 'A', qty: 1, unit_price: '1000', tax_rate: 8 }] } }, { stepIdx: 0, toolCallId: 'c' });
    expect(calls[0]!.input).toMatchObject({ contact_id: ID_A, note: 'KH-1016', items: [{ product_id: ID_B }] });
  });

  it('mảng mã `<thực thể>_ids` (stock.get.product_ids) đổi từng phần tử; mã lạ giữ nguyên', async () => {
    const db = { product: { findFirst: async ({ where }: { where: { code: string } }) => (where.code === 'SP-0007' ? { id: ID_B } : null) } } as unknown as TenantDb;
    const { executor, calls } = recorder(() => ({ status: 200, data: { result: { items: [] }, action_log_id: 'l' } }));
    const call = assistantTools({ db, executor, runner: {} as AiRunner, now: () => new Date() }, t).find((x) => x.name === 'call_action')!;
    await call.execute({ action_id: 'stock.get', input: { product_ids: ['SP-0007', 'SP-9999'] } }, { stepIdx: 0, toolCallId: 'c' });
    expect(calls[0]!.input).toEqual({ product_ids: [ID_B, 'SP-9999'] });
  });
});

describe('assistantConfirm chạy đúng snapshot', () => {
  const state = (canonical?: unknown): PausedState =>
    ({
      messages: [],
      stepIdx: 4,
      skipped: [],
      pendingToolCall: { toolCallId: 'call-9', toolName: 'call_action', input: { action_id: 'contact.update', input: { contact_id: 'KH-1016', patch: { phone: '0901111222' } } } },
      ...(canonical === undefined ? {} : { canonicalInput: canonical }),
    }) as unknown as PausedState;

  function setup(s: PausedState) {
    const run = { id: 'run1', kind: 'assistant', initiatedByUserId: 'u1', status: 'waiting_approval', state: s, input: { text: 'x', mode: 'cowork', session_id: 's1', locale: 'vi', user_name: 'A', role: 'owner' } };
    // Mã KH-1016 giữa hai bước đã trỏ sang khách khác — confirm không được tra lại.
    const db = {
      aiRun: { findUnique: async () => run },
      aiRunStep: { findFirst: async () => ({ idx: 4 }) },
      assistantMessage: { findMany: async () => [], update: async () => ({}) },
      aiAgent: { findMany: async () => [] },
      contact: { findFirst: async () => ({ id: ID_B }) },
    } as unknown as TenantDb;
    const kv = { getdel: async () => 'run1', set: async () => 'OK' } as unknown as KeyValueStore;
    const { executor, calls } = recorder(() => ({ status: 200, data: { result: { contact_id: ID_A }, action_log_id: 'log1' } }));
    const runner = { resume: async () => null } as unknown as AiRunner;
    return { db, kv, executor, calls, runner };
  }

  it('dùng state.canonicalInput (id đã chốt), confirm_token + khoá idem trùng lúc xem trước', async () => {
    const canonical = { contact_id: ID_A, patch: { phone: '0901111222' } };
    const s = setup(state(canonical));
    const r = await assistantConfirm({ executor: s.executor, runner: s.runner, kv: s.kv, now: () => new Date(), planKey: async () => 'pro' }, s.db, { ws: 'ws', userId: 'u1', authz: owner, token: 'tok', decision: 'confirm' });
    expect(r.status).toBe('done');
    expect(s.calls).toHaveLength(1);
    expect(s.calls[0]!.input).toEqual(canonical);
    expect(s.calls[0]!.ctx).toMatchObject({ confirmToken: 'tok', idempotencyKey: assistantIdemKey('run1', 3, 'call-9'), source: 'assistant', onBehalfOfUserId: 'u1' });
  });

  it('huỷ → không gọi executor', async () => {
    const s = setup(state({ contact_id: ID_A, patch: {} }));
    const r = await assistantConfirm({ executor: s.executor, runner: s.runner, kv: s.kv, now: () => new Date(), planKey: async () => 'pro' }, s.db, { ws: 'ws', userId: 'u1', authz: owner, token: 'tok', decision: 'cancel' });
    expect(r.status).toBe('cancelled');
    expect(s.calls).toHaveLength(0);
  });
});
