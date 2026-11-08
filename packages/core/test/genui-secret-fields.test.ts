// TIP-023c AC1 (core): ô bí mật theo metadata server (ActionDef.secret + manifest connector) — che trong action_log / hash idempotency,
// bỏ khỏi canonical / thẻ; model gửi giá trị bí mật → call_action từ chối; vault mã hoá, gắn người / action / intent, ack sau commit.
import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { getAction } from '@appchat/actions';
import type { TenantDb } from '@appchat/db';
import { authzForRole, REDACT_CENSOR } from '@appchat/shared';
import { maskSecrets, maskToolInput, secretPaths, secretValuesPresent, stripSecrets } from '../src/kernel/actions/secret-fields';
import { mergeSecrets, SecretVault } from '../src/kernel/actions/secret-vault';
import { assistantTools, type AssistantTurnCtx } from '../src/ai/assistant/meta-tools';
import type { AiRunner } from '../src/ai/runs/runner';

const SENTINEL = 'SENTINEL-p@ss-7f3a';
const email = getAction('channel.email.connect')!;
const integ = getAction('integration.connect')!;
const bank = getAction('bank_feed.connect')!;

function memKv() {
  const m = new Map<string, string>();
  return {
    m,
    set: async (k: string, v: string) => (m.set(k, v), 'OK'),
    get: async (k: string) => m.get(k) ?? null,
    getdel: async (k: string) => {
      const v = m.get(k) ?? null;
      m.delete(k);
      return v;
    },
  };
}

describe('secretPaths', () => {
  it('đường dẫn cố định + theo manifest provider; provider lạ → chỉ đường cố định', () => {
    expect(secretPaths(email, {})).toEqual(['fields.password']);
    expect(secretPaths(integ, { provider: 'sepay' })).toEqual(['fields.api_key', 'fields.hmac_secret', 'fields.api_token']);
    expect(secretPaths(integ, { provider: 'smtp' })).toEqual(['fields.password']);
    expect(secretPaths(bank, { provider: 'casso' })).toEqual(['fields.webhook_secret', 'fields.api_key']);
    expect(secretPaths(integ, { provider: 'nope' })).toEqual([]);
    expect(secretPaths(getAction('contact.update')!, {})).toEqual([]);
  });

  it('mask / strip / present', () => {
    const i = { address: 'a@b.vn', fields: { imap_host: 'imap.b.vn', password: SENTINEL } };
    expect(maskSecrets(email, i)).toEqual({ address: 'a@b.vn', fields: { imap_host: 'imap.b.vn', password: '[redacted]' } });
    expect(stripSecrets(email, i)).toEqual({ address: 'a@b.vn', fields: { imap_host: 'imap.b.vn' } });
    expect(secretValuesPresent(email, i)).toEqual(['fields.password']);
    expect(secretValuesPresent(email, { fields: { password: '' } })).toEqual([]);
    expect(JSON.stringify(maskSecrets(integ, { provider: 'sepay', fields: { api_key: SENTINEL, account_number: '1' } }))).not.toContain(SENTINEL);
  });
});

describe('call_action chặn bí mật từ model', () => {
  it('model điền password → SECRET_FIELD, executor không được gọi', async () => {
    const calls: unknown[] = [];
    const t: AssistantTurnCtx = { ws: 'ws', runId: 'r', userId: 'u1', authz: authzForRole('owner', 'u1'), mode: 'cowork', locale: 'vi' };
    const executor = { isImplemented: () => true, execute: async (...a: unknown[]) => (calls.push(a), { status: 200, data: { result: {}, action_log_id: 'l' } }) as never };
    const call = assistantTools({ db: {} as TenantDb, executor, runner: {} as AiRunner, now: () => new Date() }, t).find((x) => x.name === 'call_action')!;
    const out = await call.execute({ action_id: 'channel.email.connect', input: { address: 'a@b.vn', fields: { imap_host: 'imap.b.vn', password: SENTINEL } } }, { stepIdx: 0, toolCallId: 'c' });
    expect(out).toMatchObject({ kind: 'error', code: 'SECRET_FIELD' });
    expect(JSON.stringify(out)).not.toContain(SENTINEL);
    expect(calls).toHaveLength(0);
  });

  it('có render trong danh sách tool', () => {
    const t: AssistantTurnCtx = { ws: 'ws', runId: 'r', userId: 'u1', authz: authzForRole('owner', 'u1'), mode: 'chat', locale: 'vi' };
    const names = assistantTools({ db: {} as TenantDb, executor: { execute: async () => ({}) as never }, runner: {} as AiRunner, now: () => new Date() }, t).map((x) => x.name);
    expect(names).toContain('render');
  });
});

describe('SecretVault', () => {
  const key = Buffer.alloc(32, 7);
  const b = { workspaceId: 'ws', userId: 'u1', actionId: 'channel.email.connect', intent: 'i'.repeat(24) };

  it('lưu mã hoá (không có chữ rõ trong Redis), claim đúng binding, ack xoá', async () => {
    const kv = memKv();
    const v = new SecretVault(kv, key, () => 1000);
    const h = await v.put(b, { 'fields.password': SENTINEL });
    expect([...kv.m.values()].join('')).not.toContain(SENTINEL);
    expect(await v.claim(h, b)).toEqual({ 'fields.password': SENTINEL });
    await v.ack(h);
    await expect(v.claim(h, b)).rejects.toMatchObject({ code: 'CONFLICT', fields: { secret: 're_entry_required' } });
  });

  it('sai người / action / intent → nhập lại; đang giữ lease → in_progress; release → claim lại được', async () => {
    const kv = memKv();
    let now = 1000;
    const v = new SecretVault(kv, key, () => now);
    const h = await v.put(b, { 'fields.password': SENTINEL });
    for (const x of [{ ...b, userId: 'u2' }, { ...b, actionId: 'integration.connect' }, { ...b, intent: 'j'.repeat(24) }]) await expect(v.claim(h, x)).rejects.toMatchObject({ fields: { secret: 're_entry_required' } });
    await v.claim(h, b);
    await expect(v.claim(h, b)).rejects.toMatchObject({ fields: { secret: 'in_progress' } });
    await v.release(h);
    expect(await v.claim(h, b)).toEqual({ 'fields.password': SENTINEL });
    now += 60_000;
    expect(await v.claim(h, b)).toEqual({ 'fields.password': SENTINEL });
  });

  it('mergeSecrets ghép theo đường dẫn; chặn __proto__', () => {
    expect(mergeSecrets({ fields: { imap_host: 'x' } }, { 'fields.password': 'p' })).toEqual({ fields: { imap_host: 'x', password: 'p' } });
    expect(() => mergeSecrets({}, { '__proto__.polluted': 'x' })).toThrow();
  });
});

describe('maskToolInput (ai_run_step.input)', () => {
  it('call_action → che ô bí mật của action bên trong; tool action trực tiếp → che; meta-tool khác giữ nguyên', () => {
    const viaMeta = maskToolInput('call_action', { action_id: 'channel.email.connect', input: { address: 'a@b.vn', fields: { imap_host: 'h', password: SENTINEL } } }, getAction);
    expect(JSON.stringify(viaMeta)).not.toContain(SENTINEL);
    expect(viaMeta).toMatchObject({ action_id: 'channel.email.connect', input: { address: 'a@b.vn', fields: { imap_host: 'h', password: REDACT_CENSOR } } });
    expect(JSON.stringify(maskToolInput('channel.email.connect', { address: 'a@b.vn', fields: { password: SENTINEL } }, getAction))).not.toContain(SENTINEL);
    expect(maskToolInput('find_actions', { query: 'x' }, getAction)).toEqual({ query: 'x' });
    expect(maskToolInput('call_action', { action_id: 'contact.search', input: { q: 'Lan' } }, getAction)).toEqual({ action_id: 'contact.search', input: { q: 'Lan' } });
  });
});
