// TIP-023c AC hợp đồng 4: intent GenUI do server ký — gắn workspace / người / run / node / action / input (nút) hoặc ô (form); sửa
// node / dùng chéo người / đổi input → 403. runGenUiAction đặt nguồn assistant (bắt preview) dù trình duyệt gửi nguồn ui; form có
// bí mật: preview trả vault handle, confirm_token gắn input KHÔNG có bí mật, xác nhận ghép lại từ vault và ack sau 200.
import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { authzForRole } from '@appchat/shared';
import type { ActionContext, ToolExecutor } from '../src/kernel';
import { GenUiIntents } from '../src/kernel/actions/genui-intent';
import { SecretVault } from '../src/kernel/actions/secret-vault';
import { runGenUiAction } from '../src/ai/assistant/genui/submit';

const SENTINEL = 'SENTINEL-p@ss-91b2';

function memKv() {
  const m = new Map<string, string>();
  return { m, set: async (k: string, v: string) => (m.set(k, v), 'OK'), get: async (k: string) => m.get(k) ?? null, getdel: async (k: string) => (m.get(k) ?? null, m.delete(k), null) };
}
const base = (userId = 'u1'): ActionContext => ({ workspaceId: 'ws', source: 'ui', actor: { type: 'user', id: userId }, authz: authzForRole('owner', userId) });

describe('GenUiIntents', () => {
  it('nút: đúng input → ok; đổi input / action / người / workspace → 403', async () => {
    const it2 = new GenUiIntents(memKv(), 's');
    const h = await it2.issue({ workspaceId: 'ws', userId: 'u1', runId: 'r1', node: '0.1', actionId: 'contact.tag', input: { contact_ids: ['a'], tags: ['VIP'] } });
    expect(await it2.resolve(h, { workspaceId: 'ws', userId: 'u1', actionId: 'contact.tag', input: { tags: ['VIP'], contact_ids: ['a'] } })).toEqual({ runId: 'r1', node: '0.1', actionId: 'contact.tag' });
    for (const q of [
      { workspaceId: 'ws', userId: 'u1', actionId: 'contact.tag', input: { contact_ids: ['a', 'b'], tags: ['VIP'] } },
      { workspaceId: 'ws', userId: 'u1', actionId: 'contact.delete', input: { contact_ids: ['a'], tags: ['VIP'] } },
      { workspaceId: 'ws', userId: 'u2', actionId: 'contact.tag', input: { contact_ids: ['a'], tags: ['VIP'] } },
      { workspaceId: 'ws2', userId: 'u1', actionId: 'contact.tag', input: { contact_ids: ['a'], tags: ['VIP'] } },
    ])
      await expect(it2.resolve(h, q)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(it2.resolve('short', { workspaceId: 'ws', userId: 'u1', actionId: 'x', input: {} })).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('form: chỉ ô được phép; bản ghi bị sửa trong Redis (mac sai) → 403', async () => {
    const kv = memKv();
    const it2 = new GenUiIntents(kv, 's');
    const h = await it2.issue({ workspaceId: 'ws', userId: 'u1', runId: 'r1', node: '0', actionId: 'channel.email.connect', fields: ['address', 'fields'] });
    await expect(it2.resolve(h, { workspaceId: 'ws', userId: 'u1', actionId: 'channel.email.connect', input: { address: 'a@b.vn', fields: {} } })).resolves.toBeTruthy();
    await expect(it2.resolve(h, { workspaceId: 'ws', userId: 'u1', actionId: 'channel.email.connect', input: { address: 'a@b.vn', name: 'x' } })).rejects.toMatchObject({ code: 'FORBIDDEN' });
    const k = [...kv.m.keys()][0]!;
    kv.m.set(k, JSON.stringify({ ...JSON.parse(kv.m.get(k)!), userId: 'u2' }));
    await expect(it2.resolve(h, { workspaceId: 'ws', userId: 'u2', actionId: 'channel.email.connect', input: {} })).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});

describe('runGenUiAction', () => {
  function rig() {
    const kv = memKv();
    const intents = new GenUiIntents(kv, 's');
    const vault = new SecretVault(kv, Buffer.alloc(32, 3));
    const seen: { ctx: ActionContext; input: unknown }[] = [];
    let confirmInput: unknown;
    const executor: ToolExecutor = {
      isImplemented: () => true,
      execute: (async (ctx: ActionContext, _id: string, input: unknown) => {
        seen.push({ ctx, input });
        if (!ctx.confirmToken) {
          confirmInput = input;
          return { status: 202, data: { status: 'preview_required', preview: { summary: 'x', risk: 'config' }, confirm_token: 'tok', expires_at: '' } };
        }
        return { status: 200, data: { result: { channel_account_id: 'ch1' }, action_log_id: 'l1' } };
      }) as ToolExecutor['execute'],
    };
    return { kv, intents, vault, executor, seen, confirmInput: () => confirmInput };
  }

  it('nguồn assistant do server đặt (trình duyệt gửi ui) → preview; run = run của cây', async () => {
    const r = rig();
    const h = await r.intents.issue({ workspaceId: 'ws', userId: 'u1', runId: 'run-9', node: '0', actionId: 'contact.tag', input: { contact_ids: ['a'], tags: ['VIP'] } });
    const out = await runGenUiAction(r, base(), 'contact.tag', { handle: h, input: { contact_ids: ['a'], tags: ['VIP'] } });
    expect(out.status).toBe(202);
    expect(r.seen[0]!.ctx).toMatchObject({ source: 'assistant', actor: { type: 'assistant', id: 'u1' }, onBehalfOfUserId: 'u1', runId: 'run-9' });
  });

  it('intent của người khác → 403 trước executor', async () => {
    const r = rig();
    const h = await r.intents.issue({ workspaceId: 'ws', userId: 'u1', runId: 'run-9', node: '0', actionId: 'contact.tag', input: { contact_ids: ['a'], tags: ['VIP'] } });
    await expect(runGenUiAction(r, base('u2'), 'contact.tag', { handle: h, input: { contact_ids: ['a'], tags: ['VIP'] } })).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(r.seen).toHaveLength(0);
  });

  it('form bí mật: preview → vault handle; xác nhận chỉ gửi vault; bí mật không nằm trong Redis rõ chữ', async () => {
    const r = rig();
    const h = await r.intents.issue({ workspaceId: 'ws', userId: 'u1', runId: 'run-9', node: '0', actionId: 'channel.email.connect', fields: ['address', 'fields'] });
    const input = { address: 'a@b.vn', fields: { imap_host: 'imap.b.vn', password: SENTINEL } };
    const pre = await runGenUiAction(r, base(), 'channel.email.connect', { handle: h, input });
    expect(pre.status).toBe(202);
    const vaultHandle = (pre.data as { secret_vault?: string }).secret_vault!;
    expect(vaultHandle).toBeTruthy();
    expect([...r.kv.m.values()].join('')).not.toContain(SENTINEL);
    // Xác nhận gửi lại bí mật → bị chặn (chỉ được dùng vault).
    await expect(runGenUiAction(r, { ...base(), confirmToken: 'tok' }, 'channel.email.connect', { handle: h, input, vault: vaultHandle })).rejects.toMatchObject({ fields: { secret: 'use_vault_only' } });
    const plain = { address: 'a@b.vn', fields: { imap_host: 'imap.b.vn' } };
    const done = await runGenUiAction(r, { ...base(), confirmToken: 'tok' }, 'channel.email.connect', { handle: h, input: plain, vault: vaultHandle });
    expect(done.status).toBe(200);
    expect(r.seen.at(-1)!.input).toEqual(input);
    // Đã ack → dùng lại vault → phải nhập lại.
    await expect(runGenUiAction(r, { ...base(), confirmToken: 'tok' }, 'channel.email.connect', { handle: h, input: plain, vault: vaultHandle })).rejects.toMatchObject({ fields: { secret: 're_entry_required' } });
  });
});
