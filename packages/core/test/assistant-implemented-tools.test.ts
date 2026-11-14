// TIP-023b R1.2: Trợ lý / agent chỉ thấy và gọi được action có handler thật. Registry chưa load → fail closed; action còn
// NotImplementedHandler (stub có TIP chủ) không lộ ở find_actions / tool agent và gọi thẳng call_action bị chặn trước executor.
import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { registry } from '@appchat/actions';
import type { ToolSpec } from '@appchat/ai';
import type { TenantDb } from '@appchat/db';
import { authzForRole } from '@appchat/shared';
import { ActionHandler, ActionHandlerRegistry, implementedBy, type ToolExecutor } from '../src/kernel';
import { findActions } from '../src/ai/assistant/catalog';
import { assistantTools, type AssistantTurnCtx } from '../src/ai/assistant/meta-tools';
import { agentToolSpecs } from '../src/ai/agents/agent.runtime';
import type { AiRunner } from '../src/ai/runs/runner';

@ActionHandler('contact.search')
class Search {
  execute = async () => ({ result: { items: [] } });
}

const owner = authzForRole('owner', 'u1');
const t: AssistantTurnCtx = { ws: 'ws', runId: 'run1', userId: 'u1', authz: owner, mode: 'cowork', locale: 'vi' };
const meta = { stepIdx: 1, toolCallId: 'c1' };

function fakeExecutor(handlers: ActionHandlerRegistry) {
  const calls: { actionId: string; input: unknown }[] = [];
  const executor: ToolExecutor = {
    isImplemented: (id) => handlers.isImplemented(id),
    execute: async (_ctx, actionId, input) => {
      calls.push({ actionId, input });
      return { status: 200, data: { result: { ok: true }, action_log_id: 'log1' } } as never;
    },
  };
  return { executor, calls };
}

const tool = (tools: ToolSpec[], name: string) => tools.find((x) => x.name === name)!;
const metaTools = (h: ActionHandlerRegistry) => {
  const f = fakeExecutor(h);
  return { ...f, tools: assistantTools({ db: {} as TenantDb, executor: f.executor, runner: {} as AiRunner, now: () => new Date() }, t) };
};

describe('ActionHandlerRegistry.isImplemented', () => {
  it('chưa load → false; stub NotImplemented → false; handler thật → true', () => {
    const h = new ActionHandlerRegistry(registry);
    expect(h.isImplemented('contact.search')).toBe(false);
    h.load([new Search()]);
    expect(h.isImplemented('contact.search')).toBe(true);
    expect(h.get('contact.update')).toBeDefined();
    expect(h.isImplemented('contact.update')).toBe(false);
    expect(h.isImplemented('no.such')).toBe(false);
  });

  it('executor thiếu isImplemented → coi như chưa cài (fail closed)', () => {
    expect(implementedBy({ execute: async () => ({}) as never })('contact.search')).toBe(false);
  });
});

describe('find_actions / call_action chỉ action có handler thật', () => {
  const h = new ActionHandlerRegistry(registry).load([new Search()]);

  it('findActions mặc định (không truyền implemented) → rỗng', () => {
    expect(findActions(owner, 'cowork', 'khách hàng')).toEqual([]);
  });

  it('find_actions chỉ trả action có handler', async () => {
    const { tools } = metaTools(h);
    const out = (await tool(tools, 'find_actions').execute({ query: 'khách hàng' }, meta)) as { output: { actions: { id: string }[] } };
    expect(out.output.actions.map((a) => a.id)).toEqual(['contact.search']);
  });

  it('call_action action stub → FORBIDDEN, executor không được gọi', async () => {
    const { tools, calls } = metaTools(h);
    const out = await tool(tools, 'call_action').execute({ action_id: 'contact.update', input: { contact_id: '7c1e2b8a-0000-4000-8000-000000000001', patch: {} } }, meta);
    expect(out).toMatchObject({ kind: 'error', code: 'FORBIDDEN' });
    expect(calls).toHaveLength(0);
  });

  it('call_action tên sai → FORBIDDEN kèm action gần nhất model được dùng (không gợi ý action stub / ngoài quyền)', async () => {
    const { tools, calls } = metaTools(h);
    const out = (await tool(tools, 'call_action').execute({ action_id: 'contact.find', input: { q: 'Lan' } }, meta)) as { code: string; message: string };
    expect(out.code).toBe('FORBIDDEN');
    expect(out.message).toContain('contact.search');
    expect(out.message).not.toContain('contact.update');
    const none = (await tool(tools, 'call_action').execute({ action_id: 'zzz.qqq', input: {} }, meta)) as { message: string };
    expect(none.message).toContain('find_actions');
    expect(calls).toHaveLength(0);
  });

  it('registry chưa load → find_actions rỗng, call_action bị chặn', async () => {
    const { tools, calls } = metaTools(new ActionHandlerRegistry(registry));
    const found = (await tool(tools, 'find_actions').execute({ query: 'khách hàng' }, meta)) as { output: { actions: unknown[] } };
    expect(found.output.actions).toEqual([]);
    expect(await tool(tools, 'call_action').execute({ action_id: 'contact.search', input: {} }, meta)).toMatchObject({ kind: 'error', code: 'FORBIDDEN' });
    expect(calls).toHaveLength(0);
  });
});

describe('tool agent chỉ action có handler thật', () => {
  it('agentToolSpecs bỏ action stub, giữ action có handler', () => {
    const h = new ActionHandlerRegistry(registry).load([new Search()]);
    const { executor } = fakeExecutor(h);
    const ids = ['contact.search', 'contact.update', 'quote.send'];
    const specs = agentToolSpecs(executor, ids, { workspaceId: 'ws', agent: { id: 'a1', toolIds: ids }, runId: 'r1', source: 'agent' });
    expect(specs.map((s) => s.name)).toEqual(['contact__search']);
  });
});
