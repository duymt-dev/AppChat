// TIP-023c AC1 (core): `render` sai zod / ref sai bước / action ngoài quyền → lỗi để model sửa MỘT lần → lần sau khối lỗi; form đánh dấu
// ô bí mật theo server, bỏ giá trị model điền; refs chỉ cho chủ run, chỉ bước action đọc trong quyền HIỆN HÀNH, chỉ đúng giá trị trỏ tới.
import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import type { TenantDb } from '@appchat/db';
import { authzForRole, type UiTree } from '@appchat/shared';
import { markSecretFields, renderTool } from '../src/ai/assistant/genui/render';
import { REF_UNAVAILABLE, resolveRefs } from '../src/ai/assistant/genui/refs';
import type { AssistantTurnCtx } from '../src/ai/assistant/types';

const owner = authzForRole('owner', 'u1');
const t = (o: Partial<AssistantTurnCtx> = {}): AssistantTurnCtx => ({ ws: 'ws', runId: 'r1', userId: 'u1', authz: owner, mode: 'cowork', locale: 'vi', ...o });
const step = (idx: number, action_id: string, output: unknown) => ({ idx, actionId: 'call_action', input: { action_id, input: {} }, output: { kind: 'ok', output }, status: 'ok' });
const STEPS = [step(2, 'quote.search', { items: [{ code: 'BG-1', total: '1000', phone: '0901' }], total: 1 }), step(4, 'contact.update', { contact_id: 'c1' })];

function db(steps = STEPS, run = { kind: 'assistant', initiatedByUserId: 'u1' }) {
  return {
    aiRun: { findUnique: async () => run },
    aiRunStep: { findMany: async ({ where }: { where: { idx?: { in: number[] } } }) => steps.filter((s) => !where.idx || where.idx.in.includes(s.idx)) },
  } as unknown as TenantDb;
}
const tree = (root: unknown) => ({ version: 1, root });

describe('render', () => {
  const tool = (o: Partial<AssistantTurnCtx> = {}) => renderTool({ db: db(), implemented: () => true }, t(o));

  it('cây hợp lệ, ref trỏ bước đọc có thật → ok { ui }', async () => {
    const out = await tool().execute({ tree: tree({ type: 'stat', label: 'Tổng', value: { $ref: 'step:2.total' } }) }, { stepIdx: 5, toolCallId: 'c' });
    expect(out).toMatchObject({ kind: 'ok', output: { ui: { version: 1, root: { type: 'stat' } } } });
  });

  it('sai → lỗi cho model sửa; lần 2 sai → cây text cảnh báo', async () => {
    const r = tool();
    const bad = { tree: tree({ type: 'stat', label: 'Tổng', value: 1000 }) };
    expect(await r.execute(bad, { stepIdx: 5, toolCallId: 'a' })).toMatchObject({ kind: 'error', code: 'VALIDATION_FAILED' });
    const second = await r.execute(bad, { stepIdx: 6, toolCallId: 'b' });
    expect(second).toMatchObject({ kind: 'ok', output: { ui: { root: { type: 'text', tone: 'warning' } } } });
  });

  it('ref tới bước không tồn tại → lỗi nêu bước hợp lệ', async () => {
    const out = await tool().execute({ tree: tree({ type: 'stat', label: 'x', value: { $ref: 'step:9.total' } }) }, { stepIdx: 5, toolCallId: 'c' });
    expect(out).toMatchObject({ kind: 'error', message: expect.stringContaining('valid: 2, 4') });
  });

  it('nút action ngoài quyền / chế độ Chat → lỗi', async () => {
    const btn = { type: 'button', label: 'Xoá', on: { kind: 'action', action_id: 'contact.delete', input: { contact_id: 'c1' } } };
    expect(await tool({ authz: authzForRole('cs', 'u1') }).execute({ tree: tree(btn) }, { stepIdx: 5, toolCallId: 'c' })).toMatchObject({ kind: 'error', message: expect.stringContaining('not available') });
    expect(await tool({ mode: 'chat' }).execute({ tree: tree(btn) }, { stepIdx: 5, toolCallId: 'c' })).toMatchObject({ kind: 'error' });
  });

  it('form điền sẵn mật khẩu → lỗi; form hợp lệ → ô password đánh dấu secret', async () => {
    const form = (pw?: string) => ({ type: 'form', action_id: 'channel.email.connect', fields: [{ name: 'address', value: 'a@b.vn' }, { name: 'fields.imap_host' }, { name: 'fields.password', ...(pw ? { value: pw } : {}) }] });
    expect(await tool().execute({ tree: tree(form('SENTINEL')) }, { stepIdx: 5, toolCallId: 'c' })).toMatchObject({ kind: 'error', message: expect.stringContaining('secret') });
    const ok = await tool().execute({ tree: tree(form()) }, { stepIdx: 5, toolCallId: 'd' });
    const fields = (ok as { output: { ui: UiTree } }).output.ui.root as { fields: { name: string; secret?: boolean }[] };
    expect(fields.fields.find((f) => f.name === 'fields.password')).toEqual({ name: 'fields.password', secret: true });
    expect(fields.fields.find((f) => f.name === 'address')!.secret).toBe(false);
  });

  it('markSecretFields: connector theo provider điền sẵn; model gắn secret:false cho api_key không có tác dụng', () => {
    const t1: UiTree = { version: 1, root: { type: 'form', action_id: 'integration.connect', fields: [{ name: 'provider', value: 'sepay' }, { name: 'fields.api_key', secret: false, value: 'x' }] } };
    expect((markSecretFields(t1).root as { fields: unknown[] }).fields[1]).toEqual({ name: 'fields.api_key', secret: true });
  });
});

describe('resolveRefs', () => {
  it('chủ run: đúng giá trị trỏ tới, bỏ ô bí mật; bước ghi không làm nguồn số', async () => {
    const r = await resolveRefs(db(), { runId: 'r1', userId: 'u1', authz: owner, refs: ['step:2.total', 'step:2.items', 'step:4.contact_id', 'step:7.x'] });
    expect(r['step:2.total']).toBe(1);
    expect(r['step:2.items']).toEqual([{ code: 'BG-1', total: '1000', phone: '0901' }]);
    expect(r['step:4.contact_id']).toEqual(REF_UNAVAILABLE);
    expect(r['step:7.x']).toEqual(REF_UNAVAILABLE);
  });

  it('người khác / run không phải assistant → mọi ref unavailable', async () => {
    expect(Object.values(await resolveRefs(db(), { runId: 'r1', userId: 'u2', authz: owner, refs: ['step:2.total'] }))).toEqual([REF_UNAVAILABLE]);
    expect(Object.values(await resolveRefs(db(STEPS, { kind: 'agent', initiatedByUserId: 'u1' }), { runId: 'r1', userId: 'u1', authz: owner, refs: ['step:2.total'] }))).toEqual([REF_UNAVAILABLE]);
  });

  it('thu hồi quyền sau khi tạo cây → ref unavailable (không xoá lịch sử)', async () => {
    const noSales = { ...owner, isOwner: false, permissions: new Set<never>() };
    expect(await resolveRefs(db(), { runId: 'r1', userId: 'u1', authz: noSales, refs: ['step:2.total'] })).toEqual({ 'step:2.total': REF_UNAVAILABLE });
  });
});
