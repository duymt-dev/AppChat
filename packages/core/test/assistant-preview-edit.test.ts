// TIP-023b REQ-E03b: Sửa thẻ xem trước chỉ xem trước lại — token cũ (Trợ lý + executor) mất hiệu lực, snapshot input mới lưu cùng run,
// thẻ trong tin được thay; confirm sau đó chạy đúng input mới một lần. Lỗi quyền / validation giữa hai bước → thẻ cũ giữ nguyên, không thực
// thi. Ô bí mật ẩn khỏi thẻ không sửa được qua form (giữ giá trị cũ).
import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import type { PausedState } from '@appchat/ai';
import type { TenantDb } from '@appchat/db';
import { AppError, authzForRole } from '@appchat/shared';
import type { ActionContext, KeyValueStore, ToolExecutor } from '../src/kernel';
import { editPreview } from '../src/ai/assistant/edit-preview';
import { cfKey, presentInput } from '../src/ai/assistant/pending-action';
import { assistantConfirm } from '../src/ai/assistant/turn.service';
import type { AiRunner } from '../src/ai/runs/runner';

const owner = authzForRole('owner', 'u1');
const ID_A = '7c1e2b8a-0000-4000-8000-00000000000a';

function memKv() {
  const m = new Map<string, string>();
  const kv = {
    set: async (k: string, v: string) => (m.set(k, v), 'OK'),
    getdel: async (k: string) => {
      const v = m.get(k) ?? null;
      m.delete(k);
      return v;
    },
  } as unknown as KeyValueStore;
  return { kv, m };
}

function rig(input: Record<string, unknown>) {
  const state = {
    messages: [],
    stepIdx: 2,
    skipped: [],
    results: [],
    pendingToolCall: { toolCallId: 'call-1', toolName: 'call_action', input: { action_id: 'contact.update', input } },
    canonicalInput: input,
  } as unknown as PausedState;
  const run = { id: 'run1', kind: 'assistant', initiatedByUserId: 'u1', status: 'waiting_approval', state, input: { text: 'x', mode: 'cowork', session_id: 's1', locale: 'vi', user_name: 'A', role: 'owner' } };
  const card = { type: 'confirm', confirm_token: 'old', action_id: 'contact.update' };
  const msg = { id: 'm1', content: { parts: [{ type: 'card', card, status: 'pending' }] } };
  const db = {
    aiRun: {
      findUnique: async () => run,
      update: async ({ data }: { data: { state: PausedState } }) => (run.state = data.state, run),
    },
    aiRunStep: { findFirst: async () => ({ idx: 2 }) },
    assistantMessage: {
      findMany: async () => [msg],
      update: async ({ data }: { data: { content: typeof msg.content } }) => (msg.content = data.content, msg),
    },
    aiAgent: { findMany: async () => [] },
    contact: { findFirst: async () => ({ id: ID_A }), findUnique: async () => ({ id: ID_A, ownerUserId: 'u1', deletedAt: null }) },
    contactCollaborator: { findUnique: async () => null },
    customFieldDef: { findMany: async () => [] },
  } as unknown as TenantDb;
  const { kv, m } = memKv();
  m.set(cfKey('old'), 'run1');
  m.set('confirm:old', 'bound-old');
  return { db, kv, m, run, msg };
}

function recorder(respond: (ctx: ActionContext, input: unknown) => unknown) {
  const calls: { ctx: ActionContext; input: unknown }[] = [];
  const executor: ToolExecutor = {
    isImplemented: () => true,
    execute: async (ctx, _id, input) => {
      calls.push({ ctx, input });
      return respond(ctx, input) as never;
    },
  };
  return { executor, calls };
}

const previewed = { status: 202, data: { status: 'preview_required', preview: { summary: 'Lan · 0902', risk: 'write', changes: [{ entity: 'contact', id: ID_A, before: { phone: '0901' }, after: { phone: '0902' } }] }, confirm_token: 'new', expires_at: 'x' } };

describe('editPreview', () => {
  it('xem trước lại với input mới (mã → id), token cũ bị thu hồi, thẻ mới thay thẻ cũ, snapshot run = input mới', async () => {
    const r = rig({ contact_id: ID_A, patch: { phone: '0901' } });
    const { executor, calls } = recorder(() => previewed);
    const out = await editPreview({ executor, kv: r.kv, now: () => new Date() }, r.db, { ws: 'ws', userId: 'u1', authz: owner, token: 'old', input: { contact_id: 'KH-1016', patch: { phone: '0902' } } });
    expect(calls).toHaveLength(1);
    expect(calls[0]!.input).toEqual({ contact_id: ID_A, patch: { phone: '0902' } });
    expect(calls[0]!.ctx.confirmToken).toBeUndefined();
    expect(out.card).toMatchObject({ confirm_token: 'new', preview: { changes: [{ before: { phone: '0901' }, after: { phone: '0902' } }] }, input: { patch: { phone: '0902' } } });
    expect(out.card.schema).toMatchObject({ contact_id: 'string' });
    expect(r.m.has(cfKey('old'))).toBe(false);
    expect(r.m.has('confirm:old')).toBe(false);
    expect(r.m.get(cfKey('new'))).toBe('run1');
    expect(r.run.state.canonicalInput).toEqual({ contact_id: ID_A, patch: { phone: '0902' } });
    expect((r.msg.content.parts[0] as { card: { confirm_token: string } }).card.confirm_token).toBe('new');
  });

  it('confirm token cũ sau khi Sửa → 409; confirm token mới chạy đúng input mới một lần', async () => {
    const r = rig({ contact_id: ID_A, patch: { phone: '0901' } });
    const ed = recorder(() => previewed);
    await editPreview({ executor: ed.executor, kv: r.kv, now: () => new Date() }, r.db, { ws: 'ws', userId: 'u1', authz: owner, token: 'old', input: { contact_id: ID_A, patch: { phone: '0902' } } });
    const run = recorder(() => ({ status: 200, data: { result: {}, action_log_id: 'log1' } }));
    const deps = { executor: run.executor, runner: { resume: async () => null } as unknown as AiRunner, kv: r.kv, now: () => new Date(), planKey: async () => 'pro' };
    await expect(assistantConfirm(deps, r.db, { ws: 'ws', userId: 'u1', authz: owner, token: 'old', decision: 'confirm' })).rejects.toMatchObject({ httpStatus: 409 });
    expect(run.calls).toHaveLength(0);
    const res = await assistantConfirm(deps, r.db, { ws: 'ws', userId: 'u1', authz: owner, token: 'new', decision: 'confirm' });
    expect(res.status).toBe('done');
    expect(run.calls).toHaveLength(1);
    expect(run.calls[0]!.input).toEqual({ contact_id: ID_A, patch: { phone: '0902' } });
    expect(run.calls[0]!.ctx.confirmToken).toBe('new');
    await expect(assistantConfirm(deps, r.db, { ws: 'ws', userId: 'u1', authz: owner, token: 'new', decision: 'confirm' })).rejects.toMatchObject({ httpStatus: 409 });
    expect(run.calls).toHaveLength(1);
  });

  it('quyền bị thu hồi / bản ghi đổi giữa hai bước → lỗi executor trả nguyên, thẻ cũ vẫn chờ (token trả lại), không thực thi', async () => {
    const r = rig({ contact_id: ID_A, patch: { phone: '0901' } });
    const { executor } = recorder(() => {
      throw new AppError('FORBIDDEN', 403, { permission: 'crm.edit' });
    });
    await expect(editPreview({ executor, kv: r.kv, now: () => new Date() }, r.db, { ws: 'ws', userId: 'u1', authz: owner, token: 'old', input: { contact_id: ID_A, patch: { phone: '0902' } } })).rejects.toMatchObject({ httpStatus: 403 });
    expect(r.m.get(cfKey('old'))).toBe('run1');
    expect(r.run.state.canonicalInput).toEqual({ contact_id: ID_A, patch: { phone: '0901' } });
  });

  it('người khác sửa thẻ → 404, token giữ cho chủ', async () => {
    const r = rig({ contact_id: ID_A, patch: { phone: '0901' } });
    const { executor, calls } = recorder(() => previewed);
    await expect(editPreview({ executor, kv: r.kv, now: () => new Date() }, r.db, { ws: 'ws', userId: 'u9', authz: authzForRole('owner', 'u9'), token: 'old', input: {} })).rejects.toMatchObject({ httpStatus: 404 });
    expect(calls).toHaveLength(0);
    expect(r.m.get(cfKey('old'))).toBe('run1');
  });

  it('ô bí mật ẩn khỏi thẻ, form không đổi được — giữ giá trị cũ', async () => {
    expect(presentInput({ name: 'a', api_key: 'k', nested: { password: 'p', ok: 1 } })).toEqual({ name: 'a', nested: { ok: 1 } });
    const r = rig({ contact_id: ID_A, patch: { phone: '0901' }, api_key: 'k-old' });
    const { executor, calls } = recorder(() => previewed);
    await editPreview({ executor, kv: r.kv, now: () => new Date() }, r.db, { ws: 'ws', userId: 'u1', authz: owner, token: 'old', input: { contact_id: ID_A, patch: { phone: '0902' }, api_key: 'k-new' } });
    expect((calls[0]!.input as { api_key: string }).api_key).toBe('k-old');
  });
});
