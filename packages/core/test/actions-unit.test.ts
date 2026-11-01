// TIP-003 AC4 (bảng policy), AC8 (boot registry), confirm token một lần + gắn input, redact action_log.
import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { registry, type Risk } from '@appchat/actions';
import {
  ActionHandler,
  ActionHandlerRegistry,
  ConfirmTokens,
  NotImplementedHandler,
  decidePolicy,
  redactDeep,
  requiresIdempotencyKey,
  tipOwnerOf,
  type ActionContext,
  type ActionSource,
  type KeyValueStore,
} from '../src/kernel';

const RISKS: Risk[] = ['read', 'write', 'send', 'money', 'delete', 'config'];
const EXPECT: Record<ActionSource, string> = {
  ui: 'run run run run run run',
  api: 'run run run run run run',
  system: 'run run run run run run',
  assistant: 'run preview preview preview preview preview',
  agent: 'run run approval approval forbidden forbidden',
  task: 'run run approval approval approval forbidden',
};

describe('policy nguồn × rủi ro (Blueprint §3.3)', () => {
  it.each(Object.keys(EXPECT) as ActionSource[])('%s', (source) => {
    expect(RISKS.map((risk) => decidePolicy({ source, risk })).join(' ')).toBe(EXPECT[source]);
  });

  it('bulk luôn preview kể cả ui; không đổi read / system / forbidden / approval', () => {
    expect(decidePolicy({ source: 'ui', risk: 'write', bulk: true })).toBe('preview');
    expect(decidePolicy({ source: 'ui', risk: 'read', bulk: true })).toBe('run');
    expect(decidePolicy({ source: 'system', risk: 'write', bulk: true })).toBe('run');
    expect(decidePolicy({ source: 'agent', risk: 'delete', bulk: true })).toBe('forbidden');
    expect(decidePolicy({ source: 'agent', risk: 'send', bulk: true })).toBe('approval');
  });

  it('agent gửi trong hội thoại đang phục vụ → chạy; nơi khác / bulk / nguồn khác / risk khác không đổi (TIP-022)', () => {
    expect(decidePolicy({ source: 'agent', risk: 'send', servedConversation: true })).toBe('run');
    expect(decidePolicy({ source: 'agent', risk: 'send', servedConversation: false })).toBe('approval');
    expect(decidePolicy({ source: 'agent', risk: 'send', servedConversation: true, bulk: true })).toBe('approval');
    expect(decidePolicy({ source: 'agent', risk: 'money', servedConversation: true })).toBe('approval');
    expect(decidePolicy({ source: 'task', risk: 'send', servedConversation: true })).toBe('approval');
  });

  it('tác vụ tắt "hỏi trước khi gửi" → send chạy; delete / money / bulk / nguồn khác vẫn như bảng (TIP-035)', () => {
    expect(decidePolicy({ source: 'task', risk: 'send', autoSend: true })).toBe('run');
    expect(decidePolicy({ source: 'task', risk: 'delete', autoSend: true })).toBe('approval');
    expect(decidePolicy({ source: 'task', risk: 'money', autoSend: true })).toBe('approval');
    expect(decidePolicy({ source: 'task', risk: 'send', autoSend: true, bulk: true })).toBe('approval');
    expect(decidePolicy({ source: 'agent', risk: 'send', autoSend: true })).toBe('approval');
  });

  it('Idempotency-Key bắt buộc với send / money / *.create', () => {
    expect(requiresIdempotencyKey('quote.send', 'send')).toBe(true);
    expect(requiresIdempotencyKey('invoice.record_payment', 'money')).toBe(true);
    expect(requiresIdempotencyKey('contact.create', 'write')).toBe(true);
    expect(requiresIdempotencyKey('contact.update', 'write')).toBe(false);
  });
});

describe('ActionHandlerRegistry (boot)', () => {
  @ActionHandler('notification.mark_read')
  class Ok {
    execute = async () => ({ result: { updated: 0 } });
  }
  @ActionHandler('no.such_action')
  class Unknown {}
  class Plain {}

  it('mọi action trong registry có TIP chủ (NOT_IMPLEMENTED) hoặc handler thật', () => {
    for (const a of registry) expect([a.id, tipOwnerOf(a.id)]).toEqual([a.id, expect.stringMatching(/^\d{3}$/)]);
    const r = new ActionHandlerRegistry(registry).load([new Ok()]);
    expect(r.implemented).toEqual(['notification.mark_read']);
    expect(r.get('quote.send')).toBeInstanceOf(NotImplementedHandler);
    expect((r.get('quote.send') as NotImplementedHandler).tip).toBe('029');
    const pending = r.pendingByTip();
    expect(Object.values(pending).flat()).toHaveLength(registry.length - 1);
    expect(pending['003']).toBeUndefined();
  });

  it('handler id lạ / trùng / thiếu decorator → boot fail', () => {
    expect(() => new ActionHandlerRegistry(registry).load([new Unknown()])).toThrow(/không có trong registry/);
    expect(() => new ActionHandlerRegistry(registry).load([new Ok(), new Ok()])).toThrow(/Trùng/);
    expect(() => new ActionHandlerRegistry(registry).load([new Plain()])).toThrow(/thiếu @ActionHandler/);
  });

  it('NotImplementedHandler → 501 NOT_IMPLEMENTED kèm tip', async () => {
    await expect(new NotImplementedHandler('quote.send', '029').execute()).rejects.toMatchObject({
      code: 'NOT_IMPLEMENTED',
      httpStatus: 501,
      fields: { tip: '029' },
    });
  });
});

class MemKv implements KeyValueStore {
  m = new Map<string, string>();
  sets = new Map<string, Set<string>>();
  async set(k: string, v: string) {
    this.m.set(k, v);
    return 'OK';
  }
  async getdel(k: string) {
    const v = this.m.get(k) ?? null;
    this.m.delete(k);
    return v;
  }
  async sadd(k: string, ...ms: string[]) {
    const s = this.sets.get(k) ?? new Set();
    ms.forEach((x) => s.add(x));
    this.sets.set(k, s);
    return ms.length;
  }
  async spop(k: string, n: number) {
    const s = [...(this.sets.get(k) ?? [])].slice(0, n);
    s.forEach((x) => this.sets.get(k)!.delete(x));
    return s;
  }
}

const ctx = (actor = 'u1'): ActionContext =>
  ({ workspaceId: 'w1', source: 'assistant', actor: { type: 'user', id: actor }, authz: {} }) as unknown as ActionContext;

describe('ConfirmTokens', () => {
  it('đúng input → dùng được một lần; input / actor / action khác → từ chối', async () => {
    const t = new ConfirmTokens(new MemKv(), 'secret-xxxxxxxxxxxxxxxxxxxxxxxxxxxx');
    const a = await t.issue(ctx(), 'tag.create', { name: 'VIP', color: 'red' }, 0);
    expect(a.expiresAt.getTime()).toBe(600_000);
    expect(await t.consume(ctx(), 'tag.create', { color: 'red', name: 'VIP' }, a.token)).toBe(true);
    expect(await t.consume(ctx(), 'tag.create', { name: 'VIP', color: 'red' }, a.token)).toBe(false);
    const b = await t.issue(ctx(), 'tag.create', { name: 'VIP' }, 0);
    expect(await t.consume(ctx(), 'tag.create', { name: 'VIP2' }, b.token)).toBe(false);
    const c = await t.issue(ctx(), 'tag.create', { name: 'VIP' }, 0);
    expect(await t.consume(ctx('u2'), 'tag.create', { name: 'VIP' }, c.token)).toBe(false);
    const d = await t.issue(ctx(), 'tag.create', { name: 'VIP' }, 0);
    expect(await t.consume(ctx(), 'tag.delete', { name: 'VIP' }, d.token)).toBe(false);
    expect(await t.consume(ctx(), 'tag.create', {}, undefined)).toBe(false);
  });
});

describe('redactDeep', () => {
  it('che khoá PII ở mọi độ sâu, giữ phần còn lại', () => {
    expect(redactDeep({ name: 'A', phone: '0907', items: [{ email: 'a@b', qty: 1 }], nested: { token: 't' } })).toEqual({
      name: 'A',
      phone: '[redacted]',
      items: [{ email: '[redacted]', qty: 1 }],
      nested: { token: '[redacted]' },
    });
  });
});
