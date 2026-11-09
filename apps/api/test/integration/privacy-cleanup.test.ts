// TIP-015c pha 2 trên Postgres thật: contact.forget → sweep (privacy.cleanup_step lặp lại qua ActionExecutor nguồn system, như
// scheduler thật) tiến accepted→fencing→inventory→erasing→verifying→completed_with_exceptions, xoá thật các artifact `exclusive`
// của CRM (contact_tag, contact_task — EXCLUSIVE_DELETE ở crm/privacy/cleanup.ts) ngay ở bước erasing (auto erase_exclusive, không
// cần review). privacy.review_resolve: Owner quyết một mục quarantine (ownership=shared chưa có domain nào tạo ở pha 1/2 — dựng thủ
// công một artifact "shared" bằng cách gọi lại preview sau khi thêm quan hệ participant nhóm ở inbox, rồi xác nhận flow needs_review
// → review_resolve(proven_unrelated) → erasing tiếp → completed_with_exceptions).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ActionExecutor, privacyCleanupCtx, uuidv7 } from '@appchat/core';
import { call as http } from './setup';
import { matrix, type Matrix } from './helpers/action-matrix';

let m: Matrix;

beforeAll(async () => {
  m = await matrix('contact.forget');
}, 120_000);
afterAll(() => m?.close());

type Res = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any
const asHeader = (who?: { token: string }): Record<string, string> => (who ? { authorization: `Bearer ${who.token}` } : {});
const call = (id: string, input: unknown, who?: { token: string }): Promise<Res> => http(m.h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7(), ...asHeader(who) }).then(async (r) => ({ status: r.status, body: await r.json() }));
const confirm = (id: string, input: unknown, token: string, who?: { token: string }): Promise<Res> => http(m.h, `/actions/${id}`, { input, confirm_token: token }, { 'idempotency-key': uuidv7(), ...asHeader(who) }).then(async (r) => ({ status: r.status, body: await r.json() }));
const create = async (name: string, phone: string) => (await m.seed('contact.create', { full_name: name, phone })).contact_id as string;
const versionOf = async (id: string) => {
  const db = await m.db();
  return (await db.contact.findUniqueOrThrow({ where: { id } })).version;
};

/** Chạy phase() lặp lại tới khi ổn định (idempotent — gọi thêm không đổi gì) hoặc đạt giới hạn bước an toàn. */
async function driveToStable(executor: ActionExecutor, operationId: string, maxSteps = 20): Promise<string> {
  let phase = '';
  for (let i = 0; i < maxSteps; i++) {
    const r = await executor.execute<{ phase: string; advanced: boolean }>(privacyCleanupCtx(m.h.ws), 'privacy.cleanup_step', { operation_id: operationId });
    const data = (r.data as { result: { phase: string; advanced: boolean } }).result;
    phase = data.phase;
    if (!data.advanced) break;
  }
  return phase;
}

describe('cleanup_step — sweep thật đưa operation tới completed_with_exceptions', () => {
  it('khách chỉ có artifact exclusive (tag) → erasing tự xoá luôn, không cần review, kết thúc completed_with_exceptions', async () => {
    const id = await create('Chị Dọn Dẹp', '0909891001');
    await call('contact.tag', { contact_id: id, tag: 'VIP', op: 'add' });
    const v = await versionOf(id);
    const pv = await call('contact.privacy_preview', { contact_id: id });
    expect(pv.status).toBe(200);
    const input = { contact_id: id, if_version: v, inventory_revision: pv.body.data.result.inventory_revision };
    const forgetPv = await call('contact.forget', input);
    expect(forgetPv.status).toBe(202);
    const accepted = await confirm('contact.forget', input, forgetPv.body.data.confirm_token);
    expect(accepted.status, JSON.stringify(accepted.body)).toBe(200);
    const operationId = accepted.body.data.result.operation_id as string;

    const executor = m.h.app.get(ActionExecutor, { strict: false }) as ActionExecutor;
    const finalPhase = await driveToStable(executor, operationId);
    expect(finalPhase).toBe('completed_with_exceptions');

    const db = await m.db();
    expect(await db.contactTag.count({ where: { contactId: id } })).toBe(0);
    const st = await call('contact.privacy_status', { operation_id: operationId });
    expect(st.body.data.result.phase).toBe('completed_with_exceptions');
    expect(st.body.data.result.counts.resolved).toBeGreaterThan(0);
  });
});

describe('needs_review — artifact shared (nhóm) chờ review_resolve, không tự xoá', () => {
  it('khách là thành viên nhóm → erasing dừng ở needs_review; review_resolve(proven_unrelated) → erasing tiếp → completed_with_exceptions', async () => {
    const id = await create('Chị Thành Viên Nhóm', '0909891003');
    const db = await m.db();
    const accountId = uuidv7();
    await db.channelAccount.create({ data: { id: accountId, type: 'zalo_personal', name: 'zalo', status: 'connected' } });
    const convId = uuidv7();
    await db.conversation.create({ data: { id: convId, channelAccountId: accountId, channelType: 'zalo_personal', kind: 'group', externalThreadId: `g-${convId}`, title: 'Nhóm khách', unreadCount: 0 } });
    await db.conversationParticipant.create({ data: { conversationId: convId, externalId: `ext-${id}`, contactId: id } });

    const v = await versionOf(id);
    const pv = await call('contact.privacy_preview', { contact_id: id });
    expect(pv.status).toBe(200);
    expect(pv.body.data.result.shared_count).toBeGreaterThan(0);
    const input = { contact_id: id, if_version: v, inventory_revision: pv.body.data.result.inventory_revision };
    const forgetPv = await call('contact.forget', input);
    expect(forgetPv.status).toBe(202);
    const accepted = await confirm('contact.forget', input, forgetPv.body.data.confirm_token);
    expect(accepted.status, JSON.stringify(accepted.body)).toBe(200);
    const operationId = accepted.body.data.result.operation_id as string;

    const executor = m.h.app.get(ActionExecutor, { strict: false }) as ActionExecutor;
    const phaseAfterNeedsReview = await driveToStable(executor, operationId);
    expect(phaseAfterNeedsReview).toBe('needs_review');

    const st = await call('contact.privacy_status', { operation_id: operationId });
    expect(st.body.data.result.phase).toBe('needs_review');
    const itemId = st.body.data.result.unresolved_item_ids[0] as string;
    expect(itemId).toBeTruthy();

    const reviewPv = await call('privacy.review_resolve', { operation_id: operationId, item_id: itemId, if_version: 1, disposition: 'proven_unrelated' });
    expect(reviewPv.status, JSON.stringify(reviewPv.body)).toBe(202);
    const reviewDone = await confirm('privacy.review_resolve', { operation_id: operationId, item_id: itemId, if_version: 1, disposition: 'proven_unrelated' }, reviewPv.body.data.confirm_token);
    expect(reviewDone.status, JSON.stringify(reviewDone.body)).toBe(200);

    const finalPhase = await driveToStable(executor, operationId);
    expect(finalPhase).toBe('completed_with_exceptions');
    const stDone = await call('contact.privacy_status', { operation_id: operationId });
    expect(stDone.body.data.result.unresolved_item_ids).toEqual([]);
  });
});

describe('privacy.review_resolve — chỉ Chủ sở hữu, xem trước bắt buộc như contact.forget', () => {
  it('sales không có privacy.erase → 403; item lệch version → 409 STALE_VERSION', async () => {
    const id = await create('Chị Review Quyền', '0909891004');
    const db = await m.db();
    const accountId = uuidv7();
    await db.channelAccount.create({ data: { id: accountId, type: 'zalo_personal', name: 'zalo2', status: 'connected' } });
    const convId = uuidv7();
    await db.conversation.create({ data: { id: convId, channelAccountId: accountId, channelType: 'zalo_personal', kind: 'group', externalThreadId: `g-${convId}`, title: 'Nhóm 2', unreadCount: 0 } });
    await db.conversationParticipant.create({ data: { conversationId: convId, externalId: `ext2-${id}`, contactId: id } });
    const v = await versionOf(id);
    const pv = await call('contact.privacy_preview', { contact_id: id });
    const input = { contact_id: id, if_version: v, inventory_revision: pv.body.data.result.inventory_revision };
    const forgetPv = await call('contact.forget', input);
    const accepted = await confirm('contact.forget', input, forgetPv.body.data.confirm_token);
    const operationId = accepted.body.data.result.operation_id as string;
    const executor = m.h.app.get(ActionExecutor, { strict: false }) as ActionExecutor;
    await driveToStable(executor, operationId);
    const st = await call('contact.privacy_status', { operation_id: operationId });
    const itemId = st.body.data.result.unresolved_item_ids[0] as string;
    expect(itemId).toBeTruthy();

    const salesCall = await call('privacy.review_resolve', { operation_id: operationId, item_id: itemId, if_version: 1, disposition: 'proven_unrelated' }, m.sales);
    expect(salesCall.status).toBe(403);

    const stalePv = await call('privacy.review_resolve', { operation_id: operationId, item_id: itemId, if_version: 99, disposition: 'proven_unrelated' });
    expect(stalePv.status).toBe(202);
    const staleDone = await confirm('privacy.review_resolve', { operation_id: operationId, item_id: itemId, if_version: 99, disposition: 'proven_unrelated' }, stalePv.body.data.confirm_token);
    expect(staleDone.status).toBe(409);
    expect(staleDone.body.error.code).toBe('STALE_VERSION');
  });
});

describe('privacy.cleanup_step — system-only guard trong luồng thật', () => {
  it('actor system khác id bị chặn (không phải chỉ test qua HTTP) — chỉ privacy-cleanup mới chạy được', async () => {
    const id = await create('Chị Tên Khác', '0909891002');
    const v = await versionOf(id);
    const pv = await call('contact.privacy_preview', { contact_id: id });
    const input = { contact_id: id, if_version: v, inventory_revision: pv.body.data.result.inventory_revision };
    const forgetPv = await call('contact.forget', input);
    const accepted = await confirm('contact.forget', input, forgetPv.body.data.confirm_token);
    const operationId = accepted.body.data.result.operation_id as string;
    const executor = m.h.app.get(ActionExecutor, { strict: false }) as ActionExecutor;
    const wrongCtx = { workspaceId: m.h.ws, source: 'system' as const, actor: { type: 'system' as const, id: 'someone-else' }, authz: { isOwner: true } as never };
    await expect(executor.execute(wrongCtx, 'privacy.cleanup_step', { operation_id: operationId })).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});
